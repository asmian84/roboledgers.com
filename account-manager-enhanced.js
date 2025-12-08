// AccountManager - Central module for managing multiple financial accounts
// Handles account creation, switching, storage, and migration

const AccountManager = {
    accounts: [],
    activeAccountId: null,

    /**
     * Initialize the account manager
     * - Runs migration if needed
     * - Loads existing accounts
     * - Creates default account if none exist
     */
    initialize() {
        console.log('🏦 Initializing AccountManager...');

        // Run migration from single-account to multi-account
        this.migrateIfNeeded();

        // Load accounts from storage
        this.accounts = this.loadAccounts() || [];
        this.activeAccountId = this.loadActiveAccountId();

        // If no accounts exist, create default
        if (this.accounts.length === 0) {
            console.log('📝 No accounts found, creating default account');
            const defaultAccount = this.createDefaultAccount();
            this.accounts.push(defaultAccount);
            this.activeAccountId = defaultAccount.id;
            this.save();
        }

        console.log(`✅ AccountManager initialized with ${this.accounts.length} account(s)`);
        console.log(`📍 Active account: ${this.getActiveAccount()?.name}`);
    },

    /**
     * Create a default account for first-time users
     */
    createDefaultAccount() {
        return new BankAccount({
            name: 'My Account',
            type: 'CHECKING',
            openingBalance: 0,
            description: 'Default account'
        });
    },

    /**
     * Get the currently active account
     */
    getActiveAccount() {
        return this.accounts.find(acc => acc.id === this.activeAccountId);
    },

    /**
     * Get all active (non-deleted) accounts
     */
    getAllAccounts() {
        return this.accounts.filter(acc => acc.isActive);
    },

    /**
     * Get account by ID
     */
    getAccountById(accountId) {
        return this.accounts.find(acc => acc.id === accountId);
    },

    /**
     * Add a new account
     */
    addAccount(account) {
        if (!(account instanceof BankAccount)) {
            console.error('❌ Invalid account object');
            return null;
        }

        this.accounts.push(account);
        this.save();

        console.log(`✅ Account added: ${account.name} (${account.type})`);
        return account;
    },

    /**
     * Update an existing account
     */
    updateAccount(accountId, updates) {
        const account = this.getAccountById(accountId);
        if (!account) {
            console.error(`❌ Account not found: ${accountId}`);
            return false;
        }

        // Apply updates
        Object.assign(account, updates);
        account.lastModified = new Date().toISOString();

        this.save();
        console.log(`✅ Account updated: ${account.name}`);
        return true;
    },

    /**
     * Delete an account (soft delete - marks as inactive)
     */
    deleteAccount(accountId) {
        // Don't allow deleting last account
        if (this.getAllAccounts().length === 1) {
            console.error('❌ Cannot delete the last account');
            return false;
        }

        const account = this.getAccountById(accountId);
        if (!account) {
            console.error(`❌ Account not found: ${accountId}`);
            return false;
        }

        // Mark as inactive instead of deleting (preserve data)
        account.isActive = false;

        // If deleting active account, switch to another
        if (accountId === this.activeAccountId) {
            const nextAccount = this.getAllAccounts()[0];
            if (nextAccount) {
                this.setActiveAccount(nextAccount.id);
            }
        }

        this.save();
        console.log(`✅ Account deleted: ${account.name}`);
        return true;
    },

    /**
     * Switch to a different account
     */
    setActiveAccount(accountId) {
        const account = this.getAccountById(accountId);
        if (!account || !account.isActive) {
            console.error(`❌ Invalid or inactive account: ${accountId}`);
            return false;
        }

        this.activeAccountId = accountId;
        localStorage.setItem('autoBookkeeping_activeAccountId', accountId);

        console.log(`🔄 Switched to account: ${account.name}`);

        // Reload transactions for this account if grid is loaded
        if (typeof TransactionGrid !== 'undefined' && TransactionGrid.gridApi) {
            const transactions = this.loadTransactionsForAccount(accountId);
            TransactionGrid.loadTransactions(transactions);
        }

        return true;
    },

    /**
     * Check if multi-account mode is active (2+ accounts)
     */
    isMultiAccountMode() {
        return this.getAllAccounts().length > 1;
    },

    /**
     * Save all accounts to storage
     */
    save() {
        const accountsData = this.accounts.map(acc => ({
            ...acc,
            // Convert to plain object for storage
            createdAt: acc.createdAt,
            lastModified: acc.lastModified
        }));

        localStorage.setItem('autoBookkeeping_accounts', JSON.stringify(accountsData));

        if (this.activeAccountId) {
            localStorage.setItem('autoBookkeeping_activeAccountId', this.activeAccountId);
        }
    },

    /**
     * Load accounts from storage
     */
    loadAccounts() {
        const data = localStorage.getItem('autoBookkeeping_accounts');
        if (!data) return null;

        try {
            const accountsData = JSON.parse(data);
            return accountsData.map(acc => new BankAccount(acc));
        } catch (e) {
            console.error('❌ Error loading accounts:', e);
            return null;
        }
    },

    /**
     * Load active account ID from storage
     */
    loadActiveAccountId() {
        return localStorage.getItem('autoBookkeeping_activeAccountId');
    },

    /**
     * Load transactions for a specific account
     */
    loadTransactionsForAccount(accountId) {
        const key = `autoBookkeeping_transactions_${accountId}`;
        const data = localStorage.getItem(key);

        if (!data) return [];

        try {
            return JSON.parse(data);
        } catch (e) {
            console.error(`❌ Error loading transactions for account ${accountId}:`, e);
            return [];
        }
    },

    /**
     * Save transactions for a specific account
     */
    saveTransactionsForAccount(accountId, transactions) {
        const key = `autoBookkeeping_transactions_${accountId}`;
        localStorage.setItem(key, JSON.stringify(transactions));
        console.log(`💾 Saved ${transactions.length} transactions for account ${accountId}`);
    },

    /**
     * Migrate from old single-account structure to multi-account
     */
    migrateIfNeeded() {
        // Check if already migrated
        if (localStorage.getItem('autoBookkeeping_accounts')) {
            console.log('✅ Already using multi-account structure');
            return;
        }

        // Check for old single-account data
        const oldTransactions = localStorage.getItem('autoBookkeeping_transactions');
        const oldFilename = localStorage.getItem('autoBookkeeping_filename');

        if (!oldTransactions) {
            console.log('ℹ️ No existing data to migrate');
            return;
        }

        console.log('🔄 Migrating from single-account to multi-account...');

        // Create default account
        const defaultAccount = new BankAccount({
            id: 'acc_default',
            name: 'Default Account',
            type: 'CHECKING',
            openingBalance: 0,
            description: 'Migrated from single-account setup'
        });

        // Save as multi-account structure
        const accountsData = [{ ...defaultAccount }];
        localStorage.setItem('autoBookkeeping_accounts', JSON.stringify(accountsData));
        localStorage.setItem('autoBookkeeping_activeAccountId', 'acc_default');

        // Move transactions to new structure
        const key = `autoBookkeeping_transactions_acc_default`;
        localStorage.setItem(key, oldTransactions);

        // Preserve filename if it exists
        if (oldFilename) {
            localStorage.setItem('autoBookkeeping_filename_acc_default', oldFilename);
        }

        console.log('✅ Migration complete! Your data has been preserved.');
        console.log(`   • Created "Default Account"`);
        console.log(`   • Moved ${JSON.parse(oldTransactions).length} transactions`);
    },

    /**
     * Get account summary statistics
     */
    getAccountSummary(accountId) {
        const account = this.getAccountById(accountId);
        if (!account) return null;

        const transactions = this.loadTransactionsForAccount(accountId);
        const isReversed = account.isReversedLogic();

        let totalDebits = 0;
        let totalCredits = 0;

        transactions.forEach(txn => {
            totalDebits += parseFloat(txn.debits) || 0;
            totalCredits += parseFloat(txn.amount) || 0;
        });

        // Calculate balance based on account type
        let balance = account.openingBalance;
        if (isReversed) {
            // Credit card: debits are payments (add), credits are charges (subtract)
            balance += totalDebits - totalCredits;
        } else {
            // Bank: credits are deposits (add), debits are withdrawals (subtract)
            balance += totalCredits - totalDebits;
        }

        return {
            account: account,
            transactionCount: transactions.length,
            totalDebits,
            totalCredits,
            currentBalance: balance
        };
    },

    /**
     * Get all account summaries
     */
    getAllAccountSummaries() {
        return this.getAllAccounts().map(acc =>
            this.getAccountSummary(acc.id)
        ).filter(summary => summary !== null);
    }
};

// Auto-initialize when DOM is ready
if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => AccountManager.initialize());
    } else {
        AccountManager.initialize();
    }
}
