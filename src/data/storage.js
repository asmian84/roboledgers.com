/**
 * AutoBookkeeping v3.0 - Storage Service
 * Offline-first data storage using localStorage
 * Full CRUD operations for all data entities
 */

class StorageService {
    constructor() {
        this.keys = {
            transactions: 'ab3_transactions',
            vendors: 'ab3_vendors',
            accounts: 'ab3_accounts',
            bankAccounts: 'ab3_bank_accounts',
            settings: 'ab3_settings'
        };
    }

    // ====================================
    // GENERIC STORAGE METHODS
    // ====================================

    _get(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error(`Failed to get ${key}:`, error);
            return [];
        }
    }

    _set(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error(`Failed to set ${key}:`, error);
            return false;
        }
    }

    _generateId() {
        return window.DataUtils ? window.DataUtils.generateId() : Date.now().toString();
    }

    _now() {
        return new Date().toISOString();
    }

    // ====================================
    // TRANSACTIONS
    // ====================================

    async getTransactions(filters = {}) {
        const transactions = this._get(this.keys.transactions);

        let result = transactions;

        // Apply filters
        if (filters.vendorId) {
            result = result.filter(t => t.vendorId === filters.vendorId);
        }

        if (filters.accountId) {
            result = result.filter(t => t.accountId === filters.accountId);
        }

        if (filters.bankAccountId) {
            result = result.filter(t => t.bankAccountId === filters.bankAccountId);
        }

        if (filters.type) {
            result = result.filter(t => t.type === filters.type);
        }

        if (filters.reconciled !== undefined) {
            result = result.filter(t => t.reconciled === filters.reconciled);
        }

        if (filters.startDate) {
            const start = new Date(filters.startDate);
            result = result.filter(t => new Date(t.date) >= start);
        }

        if (filters.endDate) {
            const end = new Date(filters.endDate);
            result = result.filter(t => new Date(t.date) <= end);
        }

        return result;
    }

    async getTransaction(id) {
        const transactions = this._get(this.keys.transactions);
        return transactions.find(t => t.id === id) || null;
    }

    async createTransaction(data) {
        // Validate
        const validation = window.DataUtils.validateTransaction(data);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const transactions = this._get(this.keys.transactions);

        const transaction = {
            id: this._generateId(),
            date: data.date || new Date().toISOString(),
            description: data.description,
            amount: data.amount,
            type: data.type,
            vendorId: data.vendorId || null,
            accountId: data.accountId,
            category: data.category || '',
            bankAccountId: data.bankAccountId || null,
            reconciled: data.reconciled || false,
            notes: data.notes || '',
            createdAt: this._now(),
            updatedAt: this._now()
        };

        transactions.push(transaction);
        this._set(this.keys.transactions, transactions);

        console.log('💾 Transaction created:', transaction.id);
        return transaction;
    }

    async updateTransaction(id, updates) {
        const transactions = this._get(this.keys.transactions);
        const index = transactions.findIndex(t => t.id === id);

        if (index === -1) {
            throw new Error(`Transaction ${id} not found`);
        }

        const updated = {
            ...transactions[index],
            ...updates,
            id, // Prevent ID change
            updatedAt: this._now()
        };

        transactions[index] = updated;
        this._set(this.keys.transactions, transactions);

        console.log('💾 Transaction updated:', id);
        return updated;
    }

    async deleteTransaction(id) {
        const transactions = this._get(this.keys.transactions);
        const filtered = transactions.filter(t => t.id !== id);

        if (filtered.length === transactions.length) {
            throw new Error(`Transaction ${id} not found`);
        }

        this._set(this.keys.transactions, filtered);
        console.log('💾 Transaction deleted:', id);
        return true;
    }

    // ====================================
    // VENDORS
    // ====================================

    async getVendors() {
        const vendors = this._get(this.keys.vendors);
        const transactions = this._get(this.keys.transactions);

        // Compute totalSpent, transactionCount, lastTransaction
        return vendors.map(vendor => {
            const vendorTxns = transactions.filter(t => t.vendorId === vendor.id);
            const totalSpent = vendorTxns.reduce((sum, t) => sum + (t.type === 'debit' ? t.amount : 0), 0);
            const lastTxn = vendorTxns.sort((a, b) => new Date(b.date) - new Date(a.date))[0];

            return {
                ...vendor,
                totalSpent,
                transactionCount: vendorTxns.length,
                lastTransaction: lastTxn ? lastTxn.date : null
            };
        });
    }

    async getVendor(id) {
        const vendors = await this.getVendors();
        return vendors.find(v => v.id === id) || null;
    }

    async createVendor(data) {
        // Validate
        const validation = window.DataUtils.validateVendor(data);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const vendors = this._get(this.keys.vendors);

        const vendor = {
            id: this._generateId(),
            name: data.name,
            category: data.category || '',
            defaultAccountId: data.defaultAccountId || null,
            notes: data.notes || '',
            createdAt: this._now(),
            updatedAt: this._now()
        };

        vendors.push(vendor);
        this._set(this.keys.vendors, vendors);

        console.log('💾 Vendor created:', vendor.id);
        return vendor;
    }

    async updateVendor(id, updates) {
        const vendors = this._get(this.keys.vendors);
        const index = vendors.findIndex(v => v.id === id);

        if (index === -1) {
            throw new Error(`Vendor ${id} not found`);
        }

        const updated = {
            ...vendors[index],
            ...updates,
            id,
            updatedAt: this._now()
        };

        vendors[index] = updated;
        this._set(this.keys.vendors, vendors);

        console.log('💾 Vendor updated:', id);
        return updated;
    }

    async deleteVendor(id) {
        const vendors = this._get(this.keys.vendors);
        const filtered = vendors.filter(v => v.id !== id);

        if (filtered.length === vendors.length) {
            throw new Error(`Vendor ${id} not found`);
        }

        this._set(this.keys.vendors, filtered);
        console.log('💾 Vendor deleted:', id);
        return true;
    }

    async getVendorTransactions(vendorId) {
        return this.getTransactions({ vendorId });
    }

    // ====================================
    // ACCOUNTS
    // ====================================

    async getAccounts() {
        const accounts = this._get(this.keys.accounts);
        const transactions = this._get(this.keys.transactions);

        // Compute currentBalance
        return accounts.map(account => {
            const accountTxns = transactions.filter(t => t.accountId === account.id);
            const balance = account.openingBalance + accountTxns.reduce((sum, t) => {
                return sum + (t.type === 'credit' ? t.amount : -t.amount);
            }, 0);

            return {
                ...account,
                currentBalance: balance
            };
        });
    }

    async getAccount(id) {
        const accounts = await this.getAccounts();
        return accounts.find(a => a.id === id) || null;
    }

    async createAccount(data) {
        // Validate
        const validation = window.DataUtils.validateAccount(data);
        if (!validation.valid) {
            throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }

        const accounts = this._get(this.keys.accounts);

        const account = {
            id: this._generateId(),
            name: data.name,
            accountNumber: data.accountNumber || '',
            type: data.type,
            parentId: data.parentId || null,
            openingBalance: data.openingBalance || 0,
            active: data.active !== undefined ? data.active : true,
            createdAt: this._now(),
            updatedAt: this._now()
        };

        accounts.push(account);
        this._set(this.keys.accounts, accounts);

        console.log('💾 Account created:', account.id);
        return account;
    }

    async updateAccount(id, updates) {
        const accounts = this._get(this.keys.accounts);
        const index = accounts.findIndex(a => a.id === id);

        if (index === -1) {
            throw new Error(`Account ${id} not found`);
        }

        const updated = {
            ...accounts[index],
            ...updates,
            id,
            updatedAt: this._now()
        };

        accounts[index] = updated;
        this._set(this.keys.accounts, accounts);

        console.log('💾 Account updated:', id);
        return updated;
    }

    async deleteAccount(id) {
        const accounts = this._get(this.keys.accounts);
        const filtered = accounts.filter(a => a.id !== id);

        if (filtered.length === accounts.length) {
            throw new Error(`Account ${id} not found`);
        }

        this._set(this.keys.accounts, filtered);
        console.log('💾 Account deleted:', id);
        return true;
    }

    async getAccountHierarchy() {
        const accounts = await this.getAccounts();

        // Build tree structure
        const buildTree = (parentId = null) => {
            return accounts
                .filter(a => a.parentId === parentId)
                .map(account => ({
                    ...account,
                    children: buildTree(account.id)
                }));
        };

        return buildTree();
    }

    // ====================================
    // BANK ACCOUNTS
    // ====================================

    async getBankAccounts() {
        return this._get(this.keys.bankAccounts);
    }

    async getBankAccount(id) {
        const accounts = this._get(this.keys.bankAccounts);
        return accounts.find(a => a.id === id) || null;
    }

    async createBankAccount(data) {
        const accounts = this._get(this.keys.bankAccounts);

        const account = {
            id: this._generateId(),
            name: data.name,
            accountNumber: data.accountNumber || '',
            type: data.type,
            balance: data.balance || 0,
            lastReconciled: data.lastReconciled || null,
            active: data.active !== undefined ? data.active : true,
            createdAt: this._now(),
            updatedAt: this._now()
        };

        accounts.push(account);
        this._set(this.keys.bankAccounts, accounts);

        console.log('💾 Bank account created:', account.id);
        return account;
    }

    async updateBankAccount(id, updates) {
        const accounts = this._get(this.keys.bankAccounts);
        const index = accounts.findIndex(a => a.id === id);

        if (index === -1) {
            throw new Error(`Bank account ${id} not found`);
        }

        const updated = {
            ...accounts[index],
            ...updates,
            id,
            updatedAt: this._now()
        };

        accounts[index] = updated;
        this._set(this.keys.bankAccounts, accounts);

        console.log('💾 Bank account updated:', id);
        return updated;
    }

    async deleteBankAccount(id) {
        const accounts = this._get(this.keys.bankAccounts);
        const filtered = accounts.filter(a => a.id !== id);

        if (filtered.length === accounts.length) {
            throw new Error(`Bank account ${id} not found`);
        }

        this._set(this.keys.bankAccounts, filtered);
        console.log('💾 Bank account deleted:', id);
        return true;
    }

    // ====================================
    // SETTINGS
    // ====================================

    async getSettings() {
        const settings = this._get(this.keys.settings);

        // Return default settings if none exist
        if (!settings || settings.length === 0) {
            return {
                companyName: 'My Business Inc',
                fiscalYearEnd: '12-31',
                currency: 'USD',
                theme: 'light',
                fontSize: 16,
                locale: 'en-US'
            };
        }

        return settings[0] || {};
    }

    async updateSettings(updates) {
        let settings = this._get(this.keys.settings);

        if (!settings || settings.length === 0) {
            settings = [await this.getSettings()];
        }

        const updated = {
            ...settings[0],
            ...updates
        };

        this._set(this.keys.settings, [updated]);
        console.log('💾 Settings updated');
        return updated;
    }

    // ====================================
    // UTILITY METHODS
    // ====================================

    async clearAllData() {
        Object.values(this.keys).forEach(key => {
            localStorage.removeItem(key);
        });
        console.log('💾 All data cleared');
        return true;
    }

    async exportAll() {
        return {
            transactions: this._get(this.keys.transactions),
            vendors: this._get(this.keys.vendors),
            accounts: this._get(this.keys.accounts),
            bankAccounts: this._get(this.keys.bankAccounts),
            settings: await this.getSettings(),
            exportedAt: this._now()
        };
    }

    async importAll(data) {
        if (data.transactions) {
            this._set(this.keys.transactions, data.transactions);
        }
        if (data.vendors) {
            this._set(this.keys.vendors, data.vendors);
        }
        if (data.accounts) {
            this._set(this.keys.accounts, data.accounts);
        }
        if (data.bankAccounts) {
            this._set(this.keys.bankAccounts, data.bankAccounts);
        }
        if (data.settings) {
            this._set(this.keys.settings, [data.settings]);
        }

        console.log('💾 Data imported successfully');
        return true;
    }
}

// Create global storage instance
if (typeof window !== 'undefined') {
    window.storage = new StorageService();
}

console.log('💾 Storage service loaded');
