// Account Allocation Engine

// Account Allocator

window.AccountAllocator = {
    accounts: [],

    initialize() {
        this.accounts = Storage.loadAccounts();
    },

    // Get all accounts
    getAllAccounts() {
        return this.accounts;
    },

    // Find account by code
    getAccountByCode(code) {
        return this.accounts.find(a => a.code === code);
    },

    // Find account by name
    getAccountByName(name) {
        return this.accounts.find(a =>
            Utils.normalizeString(a.name) === Utils.normalizeString(name)
        );
    },

    // Get account options for dropdown
    getAccountOptions() {
        return this.accounts
            .filter(a => a.isActive)
            .map(a => ({
                value: a.code,
                label: a.fullName,
                type: a.type
            }));
    },

    // Get accounts by type
    getAccountsByType(type) {
        return this.accounts.filter(a => a.type === type);
    },

    // Allocate transactions to accounts
    allocateTransactions(transactions) {
        for (const transaction of transactions) {
            // If already allocated, skip
            if (transaction.allocatedAccount) {
                const account = this.getAccountByCode(transaction.allocatedAccount);
                if (account) {
                    transaction.allocatedAccountName = account.name;
                }
                continue;
            }

            // Try to auto-allocate based on patterns
            const suggested = this.suggestAccount(transaction);
            if (suggested) {
                transaction.allocatedAccount = suggested.code;
                transaction.allocatedAccountName = suggested.name;
                transaction.status = 'auto-allocated';
            }
        }

        return transactions;
    },

    // Suggest account based on transaction details
    suggestAccount(transaction) {
        const payee = Utils.normalizeString(transaction.payee);

        // Common patterns for auto-allocation
        const patterns = [
            // Bank fees
            { keywords: ['monthly fee', 'service charge', 'bank fee'], account: '7700' },
            // Interest
            { keywords: ['interest income', 'interest earned'], account: '4860' },
            { keywords: ['interest charge', 'interest on'], account: '7700' },
            // Payroll
            { keywords: ['wages', 'salary', 'payroll'], account: '9800' },
            // Rent
            { keywords: ['rent payment', 'lease payment'], account: '8720' },
            // Utilities
            { keywords: ['electric', 'gas', 'water', 'utility', 'hydro'], account: '9500' },
            // Insurance
            { keywords: ['insurance'], account: '7600' },
            // Telephone
            { keywords: ['phone', 'telephone', 'mobile', 'cell'], account: '9100' },
            // Vehicle
            { keywords: ['fuel', 'gas station', 'auto', 'vehicle'], account: '9700' },
            // Office
            { keywords: ['office', 'staples', 'supplies'], account: '8600' },
            // Professional fees
            { keywords: ['legal', 'accounting', 'consultant'], account: '8700' }
        ];

        for (const pattern of patterns) {
            if (pattern.keywords.some(keyword => payee.includes(keyword))) {
                return this.getAccountByCode(pattern.account);
            }
        }

        // Default suggestions based on transaction type
        if (transaction.isDebit) {
            // Debits are typically expenses from a bank account
            return this.getAccountByCode('8500'); // Miscellaneous
        } else {
            // Credits are deposits/revenues
            return this.getAccountByCode('4001'); // Sales
        }

        return null;
    },

    // Calculate trial balance
    calculateTrialBalance(transactions) {
        const trialBalance = new TrialBalance();

        for (const transaction of transactions) {
            if (transaction.allocatedAccount) {
                trialBalance.addTransaction(transaction, transaction.allocatedAccount);
            }
        }

        return trialBalance;
    },

    // Generate account summary
    generateSummary(transactions) {
        const summary = new Map();

        for (const transaction of transactions) {
            if (!transaction.allocatedAccount) continue;

            const code = transaction.allocatedAccount;
            if (!summary.has(code)) {
                const account = this.getAccountByCode(code);
                summary.set(code, {
                    code: code,
                    name: account ? account.name : 'Unknown',
                    type: account ? account.type : 'Unknown',
                    debits: 0,
                    credits: 0,
                    count: 0,
                    transactions: []
                });
            }

            const entry = summary.get(code);
            if (transaction.isDebit) {
                entry.debits += transaction.debits;
            } else {
                entry.credits += transaction.amount;
            }
            entry.count++;
            entry.transactions.push(transaction);
        }

        return Array.from(summary.values()).sort((a, b) =>
            a.code.localeCompare(b.code)
        );
    },

    // Generate journal entries
    generateJournalEntries(transactions) {
        const entries = [];

        for (const transaction of transactions) {
            if (!transaction.allocatedAccount) continue;

            const entry = {
                date: transaction.date,
                ref: transaction.ref,
                description: transaction.payee,
                debitAccount: null,
                debitAmount: 0,
                creditAccount: null,
                creditAmount: 0
            };

            if (transaction.isDebit) {
                // Money leaving the bank account
                entry.debitAccount = transaction.allocatedAccount; // Expense/Asset
                entry.debitAmount = transaction.debits;
                entry.creditAccount = transaction.account || '1000'; // Bank account
                entry.creditAmount = transaction.debits;
            } else {
                // Money entering the bank account
                entry.debitAccount = transaction.account || '1000'; // Bank account
                entry.debitAmount = transaction.amount;
                entry.creditAccount = transaction.allocatedAccount; // Revenue/Liability
                entry.creditAmount = transaction.amount;
            }

            entries.push(entry);
        }

        return entries;
    },

    // Validate allocations
    validateAllocations(transactions) {
        const errors = [];
        const warnings = [];

        for (let i = 0; i < transactions.length; i++) {
            const transaction = transactions[i];

            if (!transaction.allocatedAccount) {
                errors.push({
                    row: i + 1,
                    transaction: transaction,
                    message: 'No account allocated'
                });
                continue;
            }

            const account = this.getAccountByCode(transaction.allocatedAccount);
            if (!account) {
                errors.push({
                    row: i + 1,
                    transaction: transaction,
                    message: `Invalid account code: ${transaction.allocatedAccount}`
                });
            }
        }

        return { errors, warnings };
    },

    // Get statistics
    getStats(transactions) {
        const allocated = transactions.filter(t => t.allocatedAccount).length;
        const unallocated = transactions.length - allocated;
        const summary = this.generateSummary(transactions);
        const trialBalance = this.calculateTrialBalance(transactions);
        const totals = trialBalance.getTotals();

        return {
            total: transactions.length,
            allocated: allocated,
            unallocated: unallocated,
            allocationRate: (allocated / transactions.length * 100).toFixed(1),
            accountsUsed: summary.length,
            totalDebits: totals.debits,
            totalCredits: totals.credits,
            isBalanced: totals.isBalanced,
            difference: totals.difference
        };
    }
};
