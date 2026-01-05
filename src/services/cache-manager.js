/**
 * Cache Manager
 * Local-first caching with IndexedDB for performance
 */

class CacheManager {
    constructor() {
        this.db = null;
        this.dbName = 'AutoBookkeepingV5Cache';
        this.dbVersion = 1;
        this.memoryCache = {
            coaAccounts: null,
            vendorDictionary: null,
            userPreferences: null
        };
    }

    /**
     * Initialize IndexedDB
     */
    async init() {
        if (this.db) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Create object stores
                if (!db.objectStoreNames.contains('transactions')) {
                    db.createObjectStore('transactions', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('importHistory')) {
                    db.createObjectStore('importHistory', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('categories')) {
                    db.createObjectStore('categories', { keyPath: 'key' });
                }
                if (!db.objectStoreNames.contains('metadata')) {
                    db.createObjectStore('metadata', { keyPath: 'key' });
                }
            };
        });
    }

    /**
     * Get transactions from cache
     * @returns {Promise<Array>}
     */
    async getTransactions() {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save transactions to cache
     * @param {Array} transactions
     */
    async saveTransactions(transactions) {
        await this.init();

        const transaction = this.db.transaction(['transactions'], 'readwrite');
        const store = transaction.objectStore('transactions');

        // Clear existing
        await store.clear();

        // Add all transactions
        for (let txn of transactions) {
            store.put(txn);
        }

        // Update metadata
        await this.setMetadata('txn_cache_timestamp', Date.now());
        await this.setMetadata('txn_cache_count', transactions.length);
    }

    /**
     * Get import history
     */
    async getImportHistory() {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['importHistory'], 'readonly');
            const store = transaction.objectStore('importHistory');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save import history entry
     */
    async saveImportHistoryEntry(entry) {
        await this.init();

        const transaction = this.db.transaction(['importHistory'], 'readwrite');
        const store = transaction.objectStore('importHistory');
        store.put(entry);
    }

    /**
     * Clear import history
     */
    async clearImportHistory() {
        await this.init();

        const transaction = this.db.transaction(['importHistory'], 'readwrite');
        const store = transaction.objectStore('importHistory');
        await store.clear();
    }

    /**
     * Get metadata value
     */
    async getMetadata(key) {
        await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['metadata'], 'readonly');
            const store = transaction.objectStore('metadata');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result?.value || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Set metadata value
     */
    async setMetadata(key, value) {
        await this.init();

        const transaction = this.db.transaction(['metadata'], 'readwrite');
        const store = transaction.objectStore('metadata');
        store.put({ key, value });
    }

    /**
     * Load Chart of Accounts (memory cache)
     */
    async getCoAAccounts() {
        if (this.memoryCache.coaAccounts) {
            return this.memoryCache.coaAccounts;
        }

        // Load from main storage
        if (window.storage && window.storage.getAccounts) {
            this.memoryCache.coaAccounts = await window.storage.getAccounts();
            return this.memoryCache.coaAccounts;
        }

        return [];
    }

    /**
     * Check if cache is fresh (< 5 minutes old)
     */
    async isCacheFresh() {
        const timestamp = await this.getMetadata('txn_cache_timestamp');
        if (!timestamp) return false;

        const ageMs = Date.now() - timestamp;
        const maxAgeMs = 5 * 60 * 1000; // 5 minutes

        return ageMs < maxAgeMs;
    }

    /**
     * Sync to Supabase in background
     * @param {Array} transactions
     */
    async syncToSupabase(transactions) {
        if (!window.SupabaseService) return;

        try {
            // Queue for background sync
            for (let txn of transactions) {
                if (!txn.synced) {
                    await window.SupabaseService.upsertTransaction(txn);
                    txn.synced = true;
                }
            }

            // Update cache
            await this.saveTransactions(transactions);
        } catch (error) {
            console.warn('Supabase sync failed (silent):', error.message);
        }
    }

    /**
     * Clear all caches
     */
    async clearAll() {
        await this.init();

        const transaction = this.db.transaction(
            ['transactions', 'importHistory', 'categories', 'metadata'],
            'readwrite'
        );

        await Promise.all([
            transaction.objectStore('transactions').clear(),
            transaction.objectStore('importHistory').clear(),
            transaction.objectStore('categories').clear(),
            transaction.objectStore('metadata').clear()
        ]);

        this.memoryCache = {
            coaAccounts: null,
            vendorDictionary: null,
            userPreferences: null
        };
    }
}

// Export as global singleton
window.CacheManager = new CacheManager();
