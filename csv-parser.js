// CSV Parser for bank statement files

window.CSVParser = {

    // Parse a CSV file
    async parseFile(file, targetAccount = null) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: false });

                    // Now awaited because pipeline might be async
                    const transactions = await this.parseTransactions(jsonData, targetAccount);

                    if (transactions.length === 0) {
                        reject(new Error('No valid transactions found in CSV'));
                        return;
                    }
                    resolve(transactions);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = (error) => reject(error);
            reader.readAsArrayBuffer(file);
        });
    },

    // Store identified column headers
    _columnMap: {},

    // Find the header row in a CSV
    findHeaderRow(rows) {
        const keywords = ['date', 'amount', 'payee', 'description', 'debit', 'credit', 'balance', 'transaction date'];
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            if (Array.isArray(row) && row.some(cell => typeof cell === 'string' && keywords.some(kw => cell.toLowerCase().includes(kw)))) {
                return i;
            }
        }
        return -1; // No header row found
    },

    // Identify columns based on header row
    identifyColumns(headerCells) {
        this._columnMap = {};
        const possibleNames = {
            'ref': ['ref#', 'ref', 'reference', 'transaction id', 'trans id', 'id', 'txn id', 'cheque', 'check'],
            'date': ['date', 'transaction date', 'trans date', 'posted date', 'post date'],
            'payee': ['payee', 'description', 'memo', 'vendor', 'name', 'transaction', 'details'],
            'account': ['account', 'account number', 'acct', 'account #', 'account#'],
            'balance': ['balance', 'running balance', 'account balance', 'current balance'],
            'debits': ['debits', 'debit', 'withdrawals', 'withdrawal', 'out'],
            'credits': ['credits', 'credit', 'deposits', 'deposit', 'in'],
            'amount': ['amount', 'transaction amount', 'amt', 'value']
        };

        headerCells.forEach((cell, index) => {
            if (typeof cell === 'string') {
                const lowerCell = cell.toLowerCase().trim();
                for (const key in possibleNames) {
                    if (possibleNames[key].includes(lowerCell) || possibleNames[key].some(name => lowerCell.includes(name))) {
                        if (!this._columnMap[key]) { // Only map the first match
                            this._columnMap[key] = index;
                        }
                    }
                }
            }
        });
    },

    // Detect Account Type based on transaction patterns 🕵️‍♂️
    detectAccountLogic(rows, headerRowIndex) {
        let creditCardVotes = 0;
        let checkingVotes = 0;

        // Keywords that strongly imply an expense (Money OUT)
        const expenseKeywords = ['starbucks', 'mcdonald', 'tim horton', 'uber', 'gas', 'shell', 'petro', 'walmart', 'amzn', 'amazon', 'restaurant', 'cafe', 'coffee', 'taxi', 'lyft'];
        // Keywords that strongly imply income/deposit (Money IN)
        const incomeKeywords = ['deposit', 'payroll', 'canada', 'transfer in', 'interest', 'refund', 'gst', 'cra', 'tax return'];

        // Sample up to 20 rows
        const limit = Math.min(rows.length, headerRowIndex + 20);

        for (let i = headerRowIndex + 1; i < limit; i++) {
            const row = rows[i];

            // Get columns using current map
            const payee = this.getColValue(row, 'payee')?.toString().toLowerCase() || '';
            const creditVal = this.getColValue(row, 'credits'); // Or Amount
            const amountVal = this.getColValue(row, 'amount');

            let positiveAmount = false;

            // Check if there is a positive number in Credit column or Amount column
            if (creditVal) {
                const val = Utils.parseCurrency(creditVal);
                if (val > 0) positiveAmount = true;
            } else if (amountVal) {
                const val = Utils.parseCurrency(amountVal);
                if (val > 0) positiveAmount = true;
            }

            if (positiveAmount && payee) {
                // If we see a Positive Amount (Credit), check what it is

                // If it matches an EXPENSE -> It's a Credit Card (Positive = Charge)
                if (expenseKeywords.some(kw => payee.includes(kw))) {
                    creditCardVotes++;
                }
                // If it matches INCOME -> It's a Checking Account (Positive = Deposit)
                else if (incomeKeywords.some(kw => payee.includes(kw))) {
                    checkingVotes++;
                }
            }
        }

        console.log(`🕵️‍♂️ Logic Detection: CC Votes=${creditCardVotes}, Checking Votes=${checkingVotes}`);
        return creditCardVotes > checkingVotes;
    },

    getColValue(row, key) {
        const index = this._columnMap[key];
        return index !== undefined && row[index] !== undefined ? row[index] : null;
    },

    // Parse transaction data from JSON array
    async parseTransactions(rows, targetAccount = null) {
        const transactions = [];
        if (!rows || rows.length < 2) return [];

        const headerRowIndex = this.findHeaderRow(rows);
        if (headerRowIndex === -1) {
            console.warn("No header row found in CSV. Attempting to parse without explicit headers.");
            return [];
        }

        // Identify columns based on header
        this.identifyColumns(rows[headerRowIndex]);

        // 🧠 Smart Logic Detection
        // If the data looks like a Credit Card (Positive Expenses), treat it as such
        // regardless of what the user selected (or if they selected nothing).
        // This handles the "Expenses on Credit Side" use case.
        const looksLikeCreditCard = this.detectAccountLogic(rows, headerRowIndex);

        // Determine effective logic
        let effectiveIsReversed = false;

        if (targetAccount) {
            // Default to account setting
            effectiveIsReversed = targetAccount.isReversedLogic ? targetAccount.isReversedLogic() : false;

            // OVERRIDE if data strongly suggests otherwise?
            // User request: "system should be smart enough... then it must be a credit card"
            if (looksLikeCreditCard && !effectiveIsReversed) {
                console.log("⚠️ OVERRIDE: Data detected as Credit Card. Flipping logic.");
                effectiveIsReversed = true;
            }
        } else {
            // No account detected, use heuristic
            effectiveIsReversed = looksLikeCreditCard;
            if (effectiveIsReversed) {
                console.log("ℹ️ Auto-detected Credit Card format (no account selected).");
            }
        }

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
            const row = rows[i];
            try {
                // Pass the effective logic decision explicitly
                const transaction = this.parseRow(row, targetAccount, effectiveIsReversed);
                if (transaction) {
                    transactions.push(transaction);
                }
            } catch (error) {
                console.warn(`Error parsing row ${i + 1}:`, error);
            }
        }

        // Process through Pipeline (Async)
        return Promise.all(transactions.map(async (tx) => {
            return await TransactionPipeline.process(tx);
        }));
    },

    // Parse a single row into a Transaction object
    parseRow(row, targetAccount = null, forceReversedLogic = null) {
        if (!row || row.length === 0) return null;

        // Use the identified column map
        const getColValue = (key) => {
            const index = this._columnMap[key];
            return index !== undefined && row[index] !== undefined ? row[index] : null;
        };

        const refVal = getColValue('ref');
        const dateVal = getColValue('date');
        const payeeVal = getColValue('payee');
        const accountVal = getColValue('account');
        const balanceVal = getColValue('balance');

        let debits = 0;
        let credits = 0;

        let rawDebit = 0;
        let rawCredit = 0;

        // Try to find separate debit/credit columns first (Standard Banking Format)
        const debitsColVal = getColValue('debits');
        const creditsColVal = getColValue('credits');
        const amountColVal = getColValue('amount');

        if (debitsColVal !== null) {
            rawDebit = Math.abs(Utils.parseCurrency(debitsColVal));
        }
        if (creditsColVal !== null) {
            rawCredit = Math.abs(Utils.parseCurrency(creditsColVal));
        }

        // --- ACCOUNT TYPE LOGIC FLIP 🧠 ---
        // Use forced logic if valid boolean passed, otherwise check account object via Manager
        let isLiability = false;

        if (forceReversedLogic !== null) {
            isLiability = forceReversedLogic;
        } else if (targetAccount && targetAccount.type && window.BankAccountManager) {
            isLiability = BankAccountManager.isLiability(targetAccount.type);
            console.log(`🏦 Account Type Check: ${targetAccount.name} (${targetAccount.type}) -> isLiability=${isLiability}`);
        }

        // Handle Single Column "Amount" if separate columns weren't found
        if (rawDebit === 0 && rawCredit === 0 && amountColVal !== null) {
            const signedAmount = Utils.parseCurrency(amountColVal);
            console.log(`💰 Parsing Amount: ${signedAmount} (isLiability: ${isLiability})`);

            if (isLiability) {
                // CREDIT CARD Logic
                // Positive = Purchase (Expense/Debit)
                // Negative = Payment (Credit)
                if (signedAmount > 0) {
                    rawDebit = signedAmount;
                } else {
                    rawCredit = Math.abs(signedAmount);
                }
            } else {
                // CHECKING Account Logic (Standard)
                // Positive = Deposit (Credit/Income)
                // Negative = Withdrawal (Expense/Debit)
                if (signedAmount < 0) {
                    rawDebit = Math.abs(signedAmount);
                } else {
                    rawCredit = signedAmount;
                }
            }
        }

        // Final Assignment safely
        debits = rawDebit;
        credits = rawCredit;

        // Required fields
        if (!dateVal || !payeeVal) {
            return null;
        }

        const date = Utils.parseDate(dateVal);
        if (!date) {
            console.warn('Invalid date:', dateVal);
            return null;
        }

        const balance = balanceVal ? Utils.parseCurrency(balanceVal) : 0;

        if (debits === 0 && credits === 0) {
            return null;
        }

        const transaction = new Transaction({
            ref: refVal || '',
            date: date,
            payee: payeeVal || '',
            debits: debits,
            amount: credits,  // amount field stores credits (Money In)
            balance: balance,
            account: accountVal || '',
            accountId: targetAccount ? targetAccount.id : null // Link to BankAccount
        });

        // 🧠 Auto-Code Payments for Credit Cards
        if (isLiability && transaction.isCredit) {
            transaction.category = 'Transfer';
            transaction.account = '2701';
            transaction.allocatedAccount = '2701';
            transaction.allocatedAccountName = 'Credit Card Payable';
            transaction.status = 'matched';
            transaction.notes = 'Auto-coded Payment';
        }

        return transaction;
    },

    // Legacy helper kept for safety
    findColumn(row, possibleNames) {
        return null; // Not used anymore as we rely on identifyColumns
    },

    // Validate CSV format
    validateFormat(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    if (jsonData.length === 0) {
                        resolve({ isValid: false, error: 'CSV file is empty' });
                        return;
                    }

                    // Check for required columns using the new helper if we wanted, 
                    // but keeping it simple for now:
                    const firstRow = jsonData[0];
                    // Simply return valid if we have data, let parser handle column mapping
                    resolve({
                        isValid: true,
                        rowCount: jsonData.length,
                        columns: Object.keys(firstRow)
                    });

                } catch (error) {
                    resolve({ isValid: false, error: error.message });
                }
            };
            reader.onerror = () => resolve({ isValid: false, error: 'Failed to read file' });
            reader.readAsBinaryString(file);
        });
    }
};
