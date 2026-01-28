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
        const globalTransactions = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
        const multiLedgerData = JSON.parse(localStorage.getItem('ab_v5_multi_ledger') || '{}');
        const coa = JSON.parse(localStorage.getItem('ab3_accounts') || localStorage.getItem('ab_chart_of_accounts') || localStorage.getItem('ab3_coa') || '[]');

        // Initialize balance map for all accounts
        const balanceMap = {};

        // 1. Initialize all accounts with zero balances from COA
        coa.forEach(account => {
            const accountCode = String(account.code || account.account_number || '');
            const accountName = account.name || account.accountName || '';
            if (accountCode) {
                balanceMap[accountCode] = {
                    code: accountCode,
                    name: accountName,
                    debit: 0,
                    credit: 0,
                    balance: 0,
                    transactionCount: 0
                };
            }
        });

        // 2. Process Global Transactions (Legacy support)
        globalTransactions.forEach(txn => {
            const acctCode = String(txn.accountId || txn.AccountId || txn.accountCode || '');
            if (!acctCode || acctCode === 'Uncategorized') return;

            if (!balanceMap[acctCode]) {
                balanceMap[acctCode] = { code: acctCode, name: txn.account || acctCode, debit: 0, credit: 0, balance: 0, transactionCount: 0 };
            }

            const debit = parseFloat(txn.debit) || (txn.type === 'debit' ? parseFloat(txn.amount) : 0) || 0;
            const credit = parseFloat(txn.credit) || (txn.type === 'credit' ? parseFloat(txn.amount) : 0) || 0;

            balanceMap[acctCode].debit += debit;
            balanceMap[acctCode].credit += credit;
            balanceMap[acctCode].transactionCount++;
        });

        // 3. Process Multi-Ledger Transactions (Double Entry Logic)
        // Each ledger key is the PARENT account (e.g. 1010 Cash)
        Object.keys(multiLedgerData).forEach(parentCode => {
            const rows = multiLedgerData[parentCode];
            rows.forEach(row => {
                // Determine target account (Categorized side)
                let targetCode = String(row.accountId || row.AccountId || row.account || '9970');
                if (targetCode === 'Uncategorized' || targetCode === 'undefined' || targetCode == 'null') targetCode = '9970';

                // Determine base account (Bank/Source side)
                const baseCode = String(parentCode);

                if (!balanceMap[targetCode]) {
                    balanceMap[targetCode] = { code: targetCode, name: 'Unusual/Suspense', debit: 0, credit: 0, balance: 0, transactionCount: 0 };
                }
                if (!balanceMap[baseCode]) {
                    balanceMap[baseCode] = { code: baseCode, name: 'Main Account', debit: 0, credit: 0, balance: 0, transactionCount: 0 };
                }

                const amt = parseFloat(row.Amount || row.amount || 0);

                // Trial Balance Math:
                // Credit in statement (Increase Bank) -> Dr Bank, Cr Income/Liability
                // Debit in statement (Decrease Bank) -> Cr Bank, Dr Expense/Asset
                if (amt > 0) {
                    balanceMap[baseCode].debit += amt;
                    balanceMap[targetCode].credit += amt;
                } else if (amt < 0) {
                    const absVal = Math.abs(amt);
                    balanceMap[baseCode].credit += absVal;
                    balanceMap[targetCode].debit += absVal;
                }

                balanceMap[targetCode].transactionCount++;
                balanceMap[baseCode].transactionCount++;
            });
        });

        // 4. Final Balance Calculation (Net = Dr - Cr)
        Object.keys(balanceMap).forEach(code => {
            const acc = balanceMap[code];
            acc.balance = acc.debit - acc.credit;
        });

        return balanceMap;
    },

    /**
     * Update the Chart of Accounts with calculated balances
     * Modifies the COA in localStorage to include balance data
     */
    updateCoABalances() {
        const balanceMap = this.calculateBalances();
        const coaKey = localStorage.getItem('ab3_accounts') ? 'ab3_accounts' : (localStorage.getItem('ab_chart_of_accounts') ? 'ab_chart_of_accounts' : 'ab3_coa');
        const coa = JSON.parse(localStorage.getItem(coaKey) || '[]');

        // Update each account with its balance using CODE as key
        coa.forEach(account => {
            const accountCode = String(account.code || account.account_number || '');

            if (accountCode && balanceMap[accountCode]) {
                const balanceData = balanceMap[accountCode];
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


