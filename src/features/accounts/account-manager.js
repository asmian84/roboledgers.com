/**
 * Account Manager - Multi-Account Support
 * Handles CRUD operations for bank and credit card accounts
 */

class AccountManager {
    constructor() {
        this.STORAGE_KEY = 'ab3_active_accounts';
        this.CURRENT_ACCOUNT_KEY = 'ab3_current_account';
        this.MAX_ACCOUNTS = 10;

        // Initialize and migrate if needed
        this.initialize();
    }

    /**
     * Initialize account system and migrate existing data if needed
     */
    initialize() {
        const accounts = this.getAllAccounts();

        // First time setup - check for old transactions
        if (accounts.length === 0) {
            this.migrateExistingData();
        }
    }

    /**
     * Migrate old single-account data to multi-account structure
     */
    migrateExistingData() {
        const oldTransactions = localStorage.getItem('ab3_transactions');

        if (oldTransactions) {
            console.log('🔄 Migrating existing transactions to multi-account structure...');

            // Create default account
            const defaultAccount = this.createAccount({
                accountNumber: '1000',
                accountName: 'Imported Transactions',
                type: 'bank',
                openingBalance: parseFloat(localStorage.getItem('openingBalance') || 0)
            });

            // Move transactions to new key
            localStorage.setItem(`ab3_transactions_${defaultAccount.id}`, oldTransactions);

            // Remove old key
            localStorage.removeItem('ab3_transactions');

            console.log(`✅ Migration complete. Created account: ${defaultAccount.accountName}`);

            // Show notification
            if (window.toast) {
                window.toast.info('Your transactions have been migrated to multi-account storage');
            }
        }
    }

    /**
     * Generate unique account ID
     */
    generateAccountId() {
        return `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Create new account
     * @param {Object} data - { accountNumber, accountName, type, openingBalance }
     * @returns {Object} Created account
     */
    createAccount(data) {
        const accounts = this.getAllAccounts();

        // Check limit
        if (accounts.length >= this.MAX_ACCOUNTS) {
            throw new Error(`Maximum of ${this.MAX_ACCOUNTS} accounts allowed`);
        }

        const newAccount = {
            id: this.generateAccountId(),
            accountNumber: data.accountNumber || '1000',
            accountName: data.accountName || 'New Account',
            type: data.type || 'bank', // 'bank' or 'credit'
            active: true,
            openingBalance: parseFloat(data.openingBalance || 0),
            createdDate: new Date().toISOString(),
            lastModified: new Date().toISOString()
        };

        accounts.push(newAccount);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts));

        // Set as current account if first account
        if (accounts.length === 1) {
            this.setCurrentAccount(newAccount.id);
        }

        console.log('✅ Account created:', newAccount.accountName);
        return newAccount;
    }

    /**
     * Get all accounts
     * @returns {Array} All accounts
     */
    getAllAccounts() {
        try {
            const saved = localStorage.getItem(this.STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load accounts:', e);
            return [];
        }
    }

    /**
     * Get active accounts only
     * @returns {Array} Active accounts
     */
    getActiveAccounts() {
        return this.getAllAccounts().filter(acc => acc.active);
    }

    /**
     * Get account by ID
     * @param {string} accountId
     * @returns {Object|null} Account or null
     */
    getAccount(accountId) {
        const accounts = this.getAllAccounts();
        return accounts.find(acc => acc.id === accountId) || null;
    }

    /**
     * Update account
     * @param {string} accountId
     * @param {Object} updates - Fields to update
     */
    updateAccount(accountId, updates) {
        const accounts = this.getAllAccounts();
        const index = accounts.findIndex(acc => acc.id === accountId);

        if (index === -1) {
            throw new Error('Account not found');
        }

        accounts[index] = {
            ...accounts[index],
            ...updates,
            lastModified: new Date().toISOString()
        };

        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts));
        console.log('✅ Account updated:', accounts[index].accountName);

        return accounts[index];
    }

    /**
     * Delete account and its transactions
     * @param {string} accountId
     */
    deleteAccount(accountId) {
        const account = this.getAccount(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        // Delete account
        const accounts = this.getAllAccounts().filter(acc => acc.id !== accountId);
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(accounts));

        // Delete transactions
        localStorage.removeItem(`ab3_transactions_${accountId}`);

        // If this was current account, switch to first available
        if (this.getCurrentAccountId() === accountId) {
            const firstAccount = accounts[0];
            if (firstAccount) {
                this.setCurrentAccount(firstAccount.id);
            } else {
                localStorage.removeItem(this.CURRENT_ACCOUNT_KEY);
            }
        }

        console.log('✅ Account deleted:', account.accountName);
    }

    /**
     * Get current account ID
     * @returns {string|null}
     */
    getCurrentAccountId() {
        return localStorage.getItem(this.CURRENT_ACCOUNT_KEY);
    }

    /**
     * Get current account object
     * @returns {Object|null}
     */
    getCurrentAccount() {
        const accountId = this.getCurrentAccountId();
        return accountId ? this.getAccount(accountId) : null;
    }

    /**
     * Set current account
     * @param {string} accountId
     */
    setCurrentAccount(accountId) {
        const account = this.getAccount(accountId);
        if (!account) {
            throw new Error('Account not found');
        }

        localStorage.setItem(this.CURRENT_ACCOUNT_KEY, accountId);
        console.log('✅ Switched to account:', account.accountName);

        return account;
    }

    /**
     * Get account balance (opening + transactions)
     * @param {string} accountId
     * @returns {number}
     */
    getAccountBalance(accountId) {
        const account = this.getAccount(accountId);
        if (!account) return 0;

        // Get transactions for this account
        const transactions = this.getAccountTransactions(accountId);

        let balance = account.openingBalance;
        transactions.forEach(txn => {
            const debit = parseFloat(txn.debit || 0);
            const credit = parseFloat(txn.credit || 0);
            balance += debit - credit;
        });

        return balance;
    }

    /**
     * Get transactions for specific account
     * @param {string} accountId
     * @returns {Array}
     */
    getAccountTransactions(accountId) {
        try {
            const key = `ab3_transactions_${accountId}`;
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load transactions:', e);
            return [];
        }
    }

    /**
     * Set transactions for specific account
     * @param {string} accountId
     * @param {Array} transactions
     */
    setAccountTransactions(accountId, transactions) {
        const key = `ab3_transactions_${accountId}`;
        localStorage.setItem(key, JSON.stringify(transactions));
    }
}

// Create global instance
window.accountManager = new AccountManager();

console.log('💼 Account Manager loaded');
