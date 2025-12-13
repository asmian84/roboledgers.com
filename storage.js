// LocalStorage management for AutoBookkeeping

const Storage = {
    KEYS: {
        VENDORS: 'autobookkeeping_vendors',
        ACCOUNTS: 'autobookkeeping_accounts',
        TRANSACTIONS: 'autobookkeeping_transactions',
        SETTINGS: 'autobookkeeping_settings'
    },

    // Vendor Dictionary
    saveVendors(vendors) {
        try {
            const data = vendors.map(v => ({
                id: v.id,
                name: v.name,
                patterns: v.patterns,
                defaultAccount: v.defaultAccount,
                defaultAccountName: v.defaultAccountName,
                category: v.category,
                notes: v.notes,
                matchCount: v.matchCount,
                lastMatched: v.lastMatched
            }));
            const jsonData = JSON.stringify(data);

            // Save to both keys for backward compatibility
            localStorage.setItem(this.KEYS.VENDORS, jsonData);
            localStorage.setItem('vendors', jsonData);  // Old key

            return true;
        } catch (error) {
            console.error('Error saving vendors:', error);
            return false;
        }
    },

    loadVendors() {
        try {
            // Check if data exists in new key
            let data = localStorage.getItem(this.KEYS.VENDORS);

            // MIGRATION: Check old key if new key is empty
            if (!data) {
                const oldData = localStorage.getItem('vendors');
                if (oldData) {
                    console.log('Migrating vendors from old storage key...');
                    // Copy to new key
                    localStorage.setItem(this.KEYS.VENDORS, oldData);
                    data = oldData;
                    // Keep old key for backward compatibility
                }
            }

            // Vendors are learned from data, not seeded
            if (!data) return [];
            const parsed = JSON.parse(data);
            return parsed.map(v => new Vendor(v));
        } catch (error) {
            console.error('Error loading vendors:', error);
            return [];
        }
    },

    // Chart of Accounts
    saveAccounts(accounts) {
        try {
            const data = accounts.map(a => ({
                code: a.code,
                name: a.name,
                type: a.type,
                category: a.category,
                isActive: a.isActive
            }));
            localStorage.setItem(this.KEYS.ACCOUNTS, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving accounts:', error);
            return false;
        }
    },

    loadAccounts() {
        try {
            const data = localStorage.getItem(this.KEYS.ACCOUNTS);
            if (!data) {
                // Load default chart of accounts
                return DEFAULT_CHART_OF_ACCOUNTS.map(a => new Account(a));
            }
            const parsed = JSON.parse(data);
            return parsed.map(a => new Account(a));
        } catch (error) {
            console.error('Error loading accounts:', error);
            return DEFAULT_CHART_OF_ACCOUNTS.map(a => new Account(a));
        }
    },

    // Transactions (for session persistence)
    saveTransactions(transactions) {
        try {
            const data = transactions.map(t => ({
                id: t.id,
                ref: t.ref,
                date: t.date,
                payee: t.payee,
                debits: t.debits,
                amount: t.amount,
                balance: t.balance,
                account: t.account,
                vendor: t.vendor,
                vendorId: t.vendorId,
                allocatedAccount: t.allocatedAccount,
                allocatedAccountName: t.allocatedAccountName,
                category: t.category,
                notes: t.notes,
                status: t.status,
                accountId: t.accountId // 🆕 Multi-Account Support
            }));
            localStorage.setItem(this.KEYS.TRANSACTIONS, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving transactions:', error);
            return false;
        }
    },

    loadTransactions() {
        try {
            const data = localStorage.getItem(this.KEYS.TRANSACTIONS);
            if (!data) return [];
            const parsed = JSON.parse(data);
            return parsed.map(t => new Transaction(t));
        } catch (error) {
            console.error('Error loading transactions:', error);
            return [];
        }
    },

    clearTransactions() {
        localStorage.removeItem(this.KEYS.TRANSACTIONS);
    },

    // 🏦 Bank Accounts Persistence (New for v1.3)
    saveBankAccounts(accounts) {
        try {
            const data = accounts.map(a => ({
                id: a.id,
                name: a.name,
                type: a.type,
                description: a.description || '',
                openingBalance: a.openingBalance,
                currency: a.currency || 'CAD',
                color: a.color,
                isActive: a.isActive,
                createdAt: a.createdAt
            }));
            localStorage.setItem('autobookkeeping_bank_accounts', JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving bank accounts:', error);
            return false;
        }
    },

    loadBankAccounts() {
        try {
            const data = localStorage.getItem('autobookkeeping_bank_accounts');
            if (!data) return [];
            const parsed = JSON.parse(data);
            if (window.BankAccount) {
                return parsed.map(a => new BankAccount(a));
            }
            return parsed;
        } catch (error) {
            console.error('Error loading bank accounts:', error);
            return [];
        }
    },

    // Settings
    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    },

    loadSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            if (!data) return this.getDefaultSettings();
            return { ...this.getDefaultSettings(), ...JSON.parse(data) };
        } catch (error) {
            console.error('Error loading settings:', error);
            return this.getDefaultSettings();
        }
    },

    getDefaultSettings() {
        return {
            autoMatch: true,
            fuzzyMatchThreshold: 0.7,
            autoSave: true,
            showHints: true,
            dateFormat: 'MM/DD/YYYY'
        };
    },

    // Export/Import functionality
    exportVendorDictionary() {
        const vendors = this.loadVendors();
        const data = vendors.map(v => ({
            id: v.id,
            name: v.name,
            patterns: v.patterns,
            defaultAccount: v.defaultAccount,
            defaultAccountName: v.defaultAccountName,
            category: v.category,
            notes: v.notes,
            matchCount: v.matchCount,
            lastMatched: v.lastMatched
        }));

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'vendor-dictionary.json';  // Standard filename for Git
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return data.length;  // Return count for UI feedback
    },

    importVendorDictionary(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    const vendors = data.map(v => new Vendor(v));
                    this.saveVendors(vendors);
                    resolve(vendors);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // Clear all data
    clearAll() {
        Object.values(this.KEYS).forEach(key => {
            localStorage.removeItem(key);
        });
    }
};
