// CSV Parser for bank statement files

// CSV Parser for bank statement files

window.CSVParser = {
    // Parse CSV file and return array of transactions
    parseFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = e.target.result;
                    const workbook = XLSX.read(data, { type: 'binary' });

                    // Get first sheet
                    const sheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[sheetName];

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        raw: false,
                        defval: ''
                    });

                    if (jsonData.length === 0) {
                        reject(new Error('CSV file is empty'));
                        return;
                    }

                    // Parse transactions
                    const transactions = this.parseTransactions(jsonData);

                    if (transactions.length === 0) {
                        reject(new Error('No valid transactions found in CSV'));
                        return;
                    }

                    resolve(transactions);
                } catch (error) {
                    reject(new Error('Failed to parse CSV: ' + error.message));
                }
            };

            reader.onerror = () => {
                reject(new Error('Failed to read file'));
            };

            reader.readAsBinaryString(file);
        });
    },

    // Parse transaction data from JSON array
    async parseTransactions(data) {
        const transactions = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];

            try {
                const transaction = this.parseRow(row);
                if (transaction) {
                    // Process through AI pipeline for immediate categorization
                    const processedTx = await TransactionPipeline.process(transaction);
                    transactions.push(processedTx);
                }
            } catch (error) {
                console.warn(`Error parsing row ${i + 1}:`, error);
                // Continue with next row
            }
        }

        return transactions;
    },

    // Parse a single row into a Transaction object
    parseRow(row) {
        // Detect column names (flexible to handle variations)
        const refCol = this.findColumn(row, ['ref#', 'ref', 'reference', 'transaction id', 'trans id', 'id']);
        const dateCol = this.findColumn(row, ['date', 'transaction date', 'trans date', 'posted date', 'post date']);
        const payeeCol = this.findColumn(row, ['payee', 'description', 'memo', 'vendor', 'name', 'transaction', 'details']);
        const accountCol = this.findColumn(row, ['account', 'account number', 'acct', 'account #', 'account#']);
        const balanceCol = this.findColumn(row, ['balance', 'running balance', 'account balance', 'current balance']);

        // Smart amount detection - handle various formats
        let debits = 0;
        let credits = 0;

        // Try to find separate debit/credit columns first
        const debitsCol = this.findColumn(row, ['debits', 'debit', 'withdrawals', 'withdrawal', 'out']);
        const creditsCol = this.findColumn(row, ['credits', 'credit', 'deposits', 'deposit', 'in', 'amount']);

        if (debitsCol && row[debitsCol]) {
            debits = Math.abs(Utils.parseCurrency(row[debitsCol]));
        }
        if (creditsCol && row[creditsCol]) {
            credits = Math.abs(Utils.parseCurrency(row[creditsCol]));
        }

        // If no separate columns, look for a single "Amount" column with +/- signs
        if (debits === 0 && credits === 0) {
            const amountCol = this.findColumn(row, ['amount', 'transaction amount', 'amt', 'value']);
            if (amountCol && row[amountCol]) {
                const signedAmount = Utils.parseCurrency(row[amountCol]);

                // IMPORTANT: Negative amounts are CREDITS, Positive amounts are DEBITS
                if (signedAmount < 0) {
                    credits = Math.abs(signedAmount);
                } else if (signedAmount > 0) {
                    debits = signedAmount;
                }
            }
        }

        // Required fields
        if (!dateCol || !payeeCol) {
            return null;
        }

        // Parse date
        const dateStr = row[dateCol];
        const date = Utils.parseDate(dateStr);
        if (!date) {
            console.warn('Invalid date:', dateStr);
            return null;
        }

        // Parse balance
        const balance = balanceCol ? Utils.parseCurrency(row[balanceCol]) : 0;

        // Skip if no amount
        if (debits === 0 && credits === 0) {
            return null;
        }

        const transaction = new Transaction({
            ref: refCol ? row[refCol] : '',
            date: date,
            payee: row[payeeCol] || '',
            debits: debits,
            amount: credits,  // amount field stores credits
            balance: balance,
            account: accountCol ? row[accountCol] : ''
        });

        return transaction;
    },

    // Find column name (case-insensitive)
    findColumn(row, possibleNames) {
        const keys = Object.keys(row);

        for (const possibleName of possibleNames) {
            const found = keys.find(key =>
                key.toLowerCase().trim() === possibleName.toLowerCase()
            );
            if (found) return found;
        }

        // Try partial match
        for (const possibleName of possibleNames) {
            const found = keys.find(key =>
                key.toLowerCase().includes(possibleName.toLowerCase())
            );
            if (found) return found;
        }

        return null;
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
                        resolve({
                            isValid: false,
                            error: 'CSV file is empty'
                        });
                        return;
                    }

                    // Check for required columns
                    const firstRow = jsonData[0];
                    const hasDate = this.findColumn(firstRow, ['date', 'transaction date']);
                    const hasPayee = this.findColumn(firstRow, ['payee', 'description', 'memo']);
                    const hasAmount = this.findColumn(firstRow, ['debits', 'amount', 'credit', 'debit']);

                    if (!hasDate || !hasPayee || !hasAmount) {
                        resolve({
                            isValid: false,
                            error: 'CSV is missing required columns (Date, Payee, Amount)',
                            columns: Object.keys(firstRow)
                        });
                        return;
                    }

                    resolve({
                        isValid: true,
                        rowCount: jsonData.length,
                        columns: Object.keys(firstRow)
                    });
                } catch (error) {
                    resolve({
                        isValid: false,
                        error: error.message
                    });
                }
            };

            reader.onerror = () => {
                resolve({
                    isValid: false,
                    error: 'Failed to read file'
                });
            };

            reader.readAsBinaryString(file);
        });
    }
};
