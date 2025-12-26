/**
 * Multi-Account Report Helper
 * Aggregates transactions from all accounts for reporting
 */

class ReportDataManager {
    /**
     * Get all transactions across ALL accounts
     */
    static async getAllTransactions() {
        if (!window.accountManager) return [];

        // Get all accounts
        const accounts = window.accountManager.getAllAccounts();
        let allTransactions = [];

        // Loop through each account and get transactions
        for (const account of accounts) {
            const txns = window.accountManager.getAccountTransactions(account.id);

            // Tag transactions with account info
            const taggedTxns = txns.map(t => ({
                ...t,
                _accountId: account.id,
                _accountName: account.accountName,
                _accountType: account.type
            }));

            allTransactions = [...allTransactions, ...taggedTxns];
        }

        return allTransactions;
    }
}

// Override storage.getTransactions to use this aggregator when needed
// But only for reports - we can monkey-patch it in reports.js or provide a global utility

window.reportDataManager = ReportDataManager;
