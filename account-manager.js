// Account Manager - Multi-Account Support
// Manages multiple bank accounts and their transactions

const AccountManager = {
    accounts: [],
    currentAccountId: null,

    // Account Types
    accountTypes: {
        CHEQUING: 'Chequing',
        SAVINGS: 'Savings',
        CREDIT_CARD: 'Credit Card',
        LINE_OF_CREDIT: 'Line of Credit',
        OTHER: 'Other'
    },

    initialize() {
        this.loadAccounts();

        // Create default account if none exist
        if (this.accounts.length === 0) {
            this.addAccount({
                name: 'Main Account',
                type: 'CHEQUING',
                openingBalance: 0,
                isDefault: true
            });
        }

        // Set current account to first or default
        const defaultAccount = this.accounts.find(a => a.isDefault) || this.accounts[0];
        this.currentAccountId = defaultAccount?.id;
    },

    // Generate unique account ID
    generateId() {
        return 'acc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    },

    // Add new account
    addAccount(accountData) {
        const account = {
            id: this.generateId(),
            name: accountData.name,
            type: accountData.type || 'CHEQUING',
            openingBalance: parseFloat(accountData.openingBalance) || 0,
            isDefault: accountData.isDefault || false,
            createdAt: new Date().toISOString(),
            active: true
        };

        this.accounts.push(account);
        this.saveAccounts();

        console.log('✅ Account created:', account.name);
        return account;
    },

    // Update existing account
    updateAccount(accountId, updates) {
        const account = this.accounts.find(a => a.id === accountId);
        if (!account) {
            console.error('Account not found:', accountId);
            return null;
        }

        Object.assign(account, updates);
        this.saveAccounts();

        console.log('✅ Account updated:', account.name);
        return account;
    },

    // Delete account
    deleteAccount(accountId) {
        const index = this.accounts.findIndex(a => a.id === accountId);
        if (index === -1) {
            console.error('Account not found:', accountId);
            return false;
        }

        // Don't allow deleting the last account
        if (this.accounts.length === 1) {
            alert('Cannot delete the last account. Please create another account first.');
            return false;
        }

        // Don't allow deleting default account
        if (this.accounts[index].isDefault) {
            alert('Cannot delete the default account. Please set another account as default first.');
            return false;
        }

        this.accounts.splice(index, 1);
        this.saveAccounts();

        // Switch to first account if current was deleted
        if (this.currentAccountId === accountId) {
            this.currentAccountId = this.accounts[0].id;
        }

        console.log('✅ Account deleted');
        return true;
    },

    // Get account by ID
    getAccount(accountId) {
        return this.accounts.find(a => a.id === accountId);
    },

    // Get current account
    getCurrentAccount() {
        return this.getAccount(this.currentAccountId);
    },

    // Switch to different account
    switchAccount(accountId) {
        const account = this.getAccount(accountId);
        if (!account) {
            console.error('Account not found:', accountId);
            return false;
        }

        this.currentAccountId = accountId;
        Storage.set('currentAccountId', accountId);

        console.log('✅ Switched to account:', account.name);
        return true;
    },

    // Get all accounts
    getAllAccounts() {
        return [...this.accounts];
    },

    // Get active accounts
    getActiveAccounts() {
        return this.accounts.filter(a => a.active);
    },

    // Set default account
    setDefaultAccount(accountId) {
        // Remove default from all accounts
        this.accounts.forEach(a => a.isDefault = false);

        // Set new default
        const account = this.getAccount(accountId);
        if (account) {
            account.isDefault = true;
            this.saveAccounts();
        }
    },

    // Save accounts to localStorage
    saveAccounts() {
        Storage.set('accounts', this.accounts);
    },

    // Load accounts from localStorage
    loadAccounts() {
        const saved = Storage.get('accounts');
        if (saved && Array.isArray(saved)) {
            this.accounts = saved;
        }

        // Load current account
        const currentId = Storage.get('currentAccountId');
        if (currentId && this.getAccount(currentId)) {
            this.currentAccountId = currentId;
        }
    },

    // Get transaction count per account
    getTransactionCount(accountId) {
        const transactions = Storage.loadTransactions();
        return transactions.filter(t => t.accountId === accountId).length;
    },

    // Get account balance
    getAccountBalance(accountId) {
        const transactions = Storage.loadTransactions();
        const accountTxns = transactions.filter(t => t.accountId === accountId);

        const account = this.getAccount(accountId);
        let balance = account?.openingBalance || 0;

        // Calculate running balance
        accountTxns
            .sort((a, b) => new Date(a.date) - new Date(b.date))
            .forEach(tx => {
                const debit = parseFloat(tx.debits) || 0;
                const credit = parseFloat(tx.amount) || 0;
                balance = balance - debit + credit;
            });

        return balance;
    }
};
