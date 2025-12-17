// Account Allocation Engine

// Account Allocator

window.AccountAllocator = {
    accounts: [],

    async initialize() {
        // 1. Load Local first (Instant UI)
        this.accounts = Storage.loadAccounts();

        // 2. Cloud Sync ☁️
        if (window.SupabaseClient) {
            const isConnected = await SupabaseClient.initialize();
            if (isConnected) {
                const cloudAccounts = await SupabaseClient.fetchAccounts();

                if (cloudAccounts && cloudAccounts.length > 0) {
                    console.log(`☁️ Synced ${cloudAccounts.length} accounts from cloud.`);
                    this.accounts = cloudAccounts;
                    Storage.saveAccounts(this.accounts); // Update local cache
                } else {
                    // 3. SEEDING: Cloud is empty, push local defaults
                    console.log('🌱 Cloud is empty. Seeding with default Chart of Accounts...');
                    if (this.accounts.length > 0) {
                        for (const acc of this.accounts) {
                            await SupabaseClient.upsertAccount(acc);
                        }
                        console.log('✅ Seeding Complete.');
                    }
                }

                // 4. Real-time Updates 📡
                SupabaseClient.subscribeToAccounts(async (payload) => {
                    console.log('🔄 Received Real-Time Account Update');
                    // Simple Strategy: Refetch all to be safe and consistent
                    const fresh = await SupabaseClient.fetchAccounts();
                    if (fresh.length > 0) {
                        this.accounts = fresh;
                        Storage.saveAccounts(fresh);
                        // Optional: Trigger UI refresh if we had a global event bus
                        if (window.ChartManager && ChartManager.renderList) {
                            ChartManager.renderList();
                        }
                    }
                });
            }
        }
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

    // Delete account by code
    async deleteAccount(code) {
        // 1. Check if used in transactions
        const transactions = Storage.loadTransactions();
        const isUsed = transactions.some(t => t.allocatedAccount === code);

        if (isUsed) {
            alert('Cannot delete this account because it is used in transactions. Please reassign the transactions first.');
            return false;
        }

        // 2. Check if it's a critical system account (optional, but good safety)
        const systemAccounts = ['1000', '4001', '9970']; // Example: Bank, Sales, Suspense
        if (systemAccounts.includes(code)) {
            if (!confirm('This is a core system account. Are you sure you want to delete it?')) return false;
        }

        // 3. Remove
        const index = this.accounts.findIndex(a => a.code === code);
        if (index > -1) {
            this.accounts.splice(index, 1);
            Storage.saveAccounts(this.accounts);

            // ☁️ Cloud Delete
            if (window.SupabaseClient) {
                SupabaseClient.deleteAccount(code);
            }
            return true;
        }
        return false;
    },

    // Get account options for dropdown
    getAccountOptions() {
        // Calculate usage dynamically
        const transactions = Storage.loadTransactions();
        const usedCodes = new Set();

        if (transactions && transactions.length > 0) {
            transactions.forEach(t => {
                if (t.allocatedAccount) usedCodes.add(t.allocatedAccount);
            });
        }

        // Get all accounts
        const allAccounts = this.accounts.filter(a => a.isActive);

        // Split lists (Cash Basis: Deprioritize AR/AP)
        const usedAccounts = [];
        const unusedStandard = [];
        const unusedLowPriority = [];

        // Definition of Low Priority (Accrual) Account Ranges (Cash Basis Logic)
        const isLowPriority = (code) => {
            const c = parseInt(code);
            // 1200-1299 (Receivables) and 2100-2199 (Payables/Accruals)
            return (c >= 1200 && c <= 1299) || (c >= 2100 && c <= 2199);
        };

        allAccounts.forEach(a => {
            if (usedCodes.has(a.code)) {
                usedAccounts.push(a);
            } else {
                if (isLowPriority(a.code)) {
                    unusedLowPriority.push(a);
                } else {
                    unusedStandard.push(a);
                }
            }
        });

        // specific override for Bank (1000) and Sales (4001) - always show as used
        const ensureUsed = (code) => {
            if (!usedCodes.has(code)) {
                // Try to find in standard or low priority
                let list = unusedStandard;
                let item = list.find(a => a.code === code);

                if (!item) {
                    list = unusedLowPriority;
                    item = list.find(a => a.code === code);
                }

                if (item) {
                    list.splice(list.indexOf(item), 1);
                    usedAccounts.push(item);
                }
            }
        };

        ensureUsed('1000');
        ensureUsed('4001');

        // Sort lists by code
        usedAccounts.sort((a, b) => a.code.localeCompare(b.code));
        unusedStandard.sort((a, b) => a.code.localeCompare(b.code));
        unusedLowPriority.sort((a, b) => a.code.localeCompare(b.code));

        // Format options
        const options = [];

        // 1. Add Used Accounts (clean)
        usedAccounts.forEach(a => options.push(a.fullName));

        // 2. Add Separator if needed
        if (usedAccounts.length > 0 && (unusedStandard.length > 0 || unusedLowPriority.length > 0)) {
            options.push('──────────');
        }

        // 3. Add Unused Standard Accounts (marked)
        unusedStandard.forEach(a => options.push(`${a.fullName} (Unused)`));

        // 4. Add Low Priority (Accruals) at the bottom
        if (unusedLowPriority.length > 0) {
            if (unusedStandard.length > 0 || usedAccounts.length > 0) {
                options.push('────────── (Accruals)');
            }
            unusedLowPriority.forEach(a => options.push(`${a.fullName} (Low Priority)`));
        }

        return options;
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

        // Collect all potential matches first
        const matches = [];
        for (const mapping of industryMap) {
            if (mapping.keywords.some(k => normalized.includes(k))) {
                const account = this.getAccountByCode(mapping.account);
                if (account) matches.push(account);
            }
        }

        if (matches.length > 0) {
            // 🧠 Smart Filter: Favor P&L (Expenses 5000+ / Revenue 4000+) over Balance Sheet
            // This prevents "Amazon Payment" from going to Liability (2100) instead of Expense (8600).
            const pnlAccounts = matches.filter(a => parseInt(a.code) >= 4000);

            if (pnlAccounts.length > 0) {
                // If we have P&L matches, prefer them. 
                // If multiple P&L, take the first one (usually most specific based on map order)
                return pnlAccounts[0];
            }

            // Fallback: If only Balance Sheet matches found (e.g. "Transfer"), use that.
            return matches[0];
        }

        // Generic fallback based on debit/credit
        if (isDebit) {
            return null; // Leave as 'Unmatched' (Red) for user review
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
