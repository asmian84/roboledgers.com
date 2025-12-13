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
        // Also check any available vendor category/notes if available
        const context = transaction.category ? `${payee} ${transaction.category}` : payee;

        return this.suggestAccountFromText(context, transaction.isDebit);
    },

    // 🧠 CORE LOGIC: Text-based Account Mapping (Internal Knowledge Base)
    suggestAccountFromText(text, isDebit = true) {
        if (!text) return null;
        const normalized = Utils.normalizeString(text);

        // Precise Industry Mappings - The "Common Sense" Layer
        const industryMap = [
            // 🍔 Meals & Entertainment
            { keywords: ['doughnut', 'donut', 'tim hortons', 'starbucks', 'coffee', 'cafe', 'mcdonalds', 'burger', 'pizza', 'subway', 'restaurant', 'bistro', 'grill', 'pub', 'bar', 'diner', 'wendys', 'kfc', 'taco', 'sushi', 'bakery', 'food', 'sweets', 'ice cream', 'dessert', 'catering', 'lilac festival', 'festival', 'anime milwaukee', '7-eleven', '7eleven', 'macs conv', 'convenience'], account: '8550' },

            // 🚗 Vehicles & Transport
            { keywords: ['gas station', 'fuel', 'petro', 'shell', 'esso', 'chevron', 'husky', 'oil change', 'lube', 'auto parts', 'mechanic', 'tire', 'parking', 'impark', 'indigo', 'co-op gas'], account: '9700' },
            { keywords: ['uber', 'lyft', 'taxi', 'cab', 'transit', 'bus', 'alaska air', 'air canada', 'westjet', 'fly', 'airline', 'flight', 'expedia', 'booking.com'], account: '9200' }, // Travel

            // 🛠️ Purchaes / Materials
            { keywords: ['home depot', 'lowes', 'rona', 'building supply', 'hardware', 'lumber', 'steel', 'concrete', 'tool', 'paint', 'alibaba'], account: '5000' },

            // 💡 Utilities
            { keywords: ['hydro', 'electricity', 'power', 'water', 'gas utility', 'enmax', 'epcor', 'fortis'], account: '9500' },
            { keywords: ['internet', 'telecom', 'bell', 'rogers', 'telus', 'shaw', 'mobile', 'phone', 'wireless', 'data'], account: '9100' },

            // ⚖️ Professional Services
            { keywords: ['law', 'legal', 'attorney', 'barrister', 'notary'], account: '8700' },
            { keywords: ['cpa', 'accountant', 'bookkeeping', 'tax', 'audit'], account: '8700' },
            { keywords: ['consulting', 'consultant', 'agency', 'marketing', 'design'], account: '8700' },

            // 📎 Office & Admin
            { keywords: ['staples', 'office depot', 'paper', 'supplies', 'stationery', 'printer', 'ink', 'ikea', 'amazon', 'amzn'], account: '8600' },
            { keywords: ['software', 'adobe', 'microsoft', 'google', 'aws', 'subscription', 'saas', 'hosting', 'domain'], account: '8600' },
            { keywords: ['post', 'shipping', 'courier', 'fedex', 'ups', 'dhl', 'canada post', 'purolator', 'shippo', 'cpc scp', 'cpc'], account: '8600' },

            // 🏢 Rent & Lease
            { keywords: ['property management', 'storage', 'rent', 'lease', 'tenant'], account: '8720' },

            // 🛡️ Insurance
            { keywords: ['insurance', 'assurance', 'underwriting', 'broker', 'policy'], account: '7600' },

            // 🏦 Bank Charges & Transfers
            { keywords: ['bank', 'credit union', 'finance', 'fee', 'charge', 'interest', 'overdraft', 'affirm', 'afterpay', 'klarna', 'sezzle'], account: '7700' },
            { keywords: ['payment - thank you', 'transfer', 'sent to', 'etransfer', 'rbc pyt', 'payment'], account: '2100' }, // Accounts Payable / Transfers
        ];

        for (const mapping of industryMap) {
            if (mapping.keywords.some(k => normalized.includes(k))) {
                return this.getAccountByCode(mapping.account);
            }
        }

        // Generic fallback based on debit/credit
        if (isDebit) {
            return null; // Don't guess 'Misc' too aggressively
        } else {
            return this.getAccountByCode('4001'); // Sales
        }
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
