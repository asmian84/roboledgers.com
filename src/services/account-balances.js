/**
 * Account Balances Service
 * Aggregates transaction data into Chart of Accounts balances
 * Similar to QuickBooks pattern: Transactions -> Account Balances -> Reports
 */

window.AccountBalances = {
    /**
     * Calculate balances for all accounts from transaction data
     * @returns {Object} Map of account name -> balance object
     */
    calculateBalances() {
        const transactions = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
        const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');

        // Initialize balance map for all accounts
        const balanceMap = {};

        // Initialize all accounts with zero balances
        coa.forEach(account => {
            const accountName = account.name || account.accountName;
            if (accountName) {
                balanceMap[accountName] = {
                    debit: 0,
                    credit: 0,
                    balance: 0,
                    transactionCount: 0
                };
            }
        });

        // Aggregate transaction amounts by account
        transactions.forEach(txn => {
            // Get account name from transaction (try multiple fields for compatibility)
            const accountName = txn.accountDescription || txn.category || txn.account;

            if (!accountName || accountName === 'Uncategorized') {
                return; // Skip uncategorized transactions
            }

            // Initialize if this is a new account (ad-hoc)
            if (!balanceMap[accountName]) {
                balanceMap[accountName] = {
                    debit: 0,
                    credit: 0,
                    balance: 0,
                    transactionCount: 0
                };
            }

            // Get debit/credit amounts
            let debit = parseFloat(txn.debit) || 0;
            let credit = parseFloat(txn.credit) || 0;

            // Fallback to amount field if debit/credit are zero
            if (debit === 0 && credit === 0 && txn.amount) {
                const amount = parseFloat(txn.amount) || 0;
                if (txn.type === 'debit') {
                    debit = amount;
                } else if (txn.type === 'credit') {
                    credit = amount;
                }
            }

            // Aggregate to account
            balanceMap[accountName].debit += debit;
            balanceMap[accountName].credit += credit;
            balanceMap[accountName].transactionCount++;
        });

        // Calculate net balance for each account
        Object.keys(balanceMap).forEach(accountName => {
            const account = balanceMap[accountName];
            // Net balance = Total Debits - Total Credits
            account.balance = account.debit - account.credit;
        });


        return balanceMap;
    },

    /**
     * Update the Chart of Accounts with calculated balances
     * Modifies the COA in localStorage to include balance data
     */
    updateCoABalances() {
        const balanceMap = this.calculateBalances();
        const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');

        // Update each account with its balance
        coa.forEach(account => {
            const accountName = account.name || account.accountName;

            if (accountName && balanceMap[accountName]) {
                const balanceData = balanceMap[accountName];
                account.totalDebit = balanceData.debit;
                account.totalCredit = balanceData.credit;
                account.balance = balanceData.balance;
                account.transactionCount = balanceData.transactionCount;
                account.lastUpdated = new Date().toISOString();
            } else {
                // Zero out accounts with no transactions
                account.totalDebit = account.totalDebit || 0;
                account.totalCredit = account.totalCredit || 0;
                account.balance = account.balance || 0;
                account.transactionCount = account.transactionCount || 0;
            }
        });

        // Save updated COA back to localStorage
        localStorage.setItem('ab3_coa', JSON.stringify(coa));



        // Trigger COA grid refresh if it exists
        if (window.accountsGridApi) {

        }

        return coa;
    },

    /**
     * Get balance for a specific account
     * @param {string} accountName - Name of the account
     * @returns {Object|null} Balance object or null if not found
     */
    getAccountBalance(accountName) {
        const balanceMap = this.calculateBalances();
        return balanceMap[accountName] || null;
    },

    /**
     * Get total balances by account type (Asset, Liability, Equity, Revenue, Expense)
     * @returns {Object} Map of type -> total balance
     */
    getBalancesByType() {
        const balanceMap = this.calculateBalances();
        const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');

        const typeBalances = {
            'Asset': 0,
            'Liability': 0,
            'Equity': 0,
            'Revenue': 0,
            'Expense': 0
        };

        coa.forEach(account => {
            const accountName = account.name || account.accountName;
            const accountType = account.type;

            if (accountName && balanceMap[accountName] && typeBalances.hasOwnProperty(accountType)) {
                typeBalances[accountType] += balanceMap[accountName].balance;
            }
        });

        return typeBalances;
    },

    /**
     * Get a summary report of all account balances
     * Useful for debugging or displaying in reports
     */
    getSummaryReport() {
        const balanceMap = this.calculateBalances();
        const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');
        const typeBalances = this.getBalancesByType();

        const report = {
            byAccount: balanceMap,
            byType: typeBalances,
            metadata: {
                totalAccounts: coa.length,
                accountsWithActivity: Object.keys(balanceMap).filter(k => balanceMap[k].transactionCount > 0).length,
                lastCalculated: new Date().toISOString()
            }
        };


        return report;
    },

    /**
     * Format a number as currency
     * @param {number} amount - Amount to format
     * @returns {string} Formatted currency string
     */
    formatCurrency(amount) {
        const isNegative = amount < 0;
        const absAmount = Math.abs(amount);
        const formatted = new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(absAmount);

        return isNegative ? `(${formatted})` : formatted;
    }
};

// Auto-refresh balances when transactions change
// This creates a hook that other modules can call
window.refreshAccountBalances = function () {

    return window.AccountBalances.updateCoABalances();
};


