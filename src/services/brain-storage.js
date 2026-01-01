/**
 * Brain Storage Service (IndexedDB)
 * Handles storage of massive datasets for Machine Learning (CategorizationEngine).
 * Replaces localStorage for the "Brain" to avoid 5MB limits.
 */
class BrainStorage {
    constructor(dbName = 'AutoBookkeeping_Brain', storeName = 'KnowledgeBase') {
        this.dbName = dbName;
        this.storeName = storeName;
        this.db = null;
    }

    async init() {
        if (this.db) return; // Already open

        return new Promise((resolve, reject) => {
            // Add timeout to prevent infinite hang
            const timeout = setTimeout(() => {
                console.warn('🧠 BrainStorage: Init timeout (5s) - possibly blocked by other tabs');
                this.db = null; // Mark as failed
                resolve(); // Resolve anyway to not block parsing
            }, 5000);

            const request = indexedDB.open(this.dbName, 3); // Upgrade to V3

            request.onblocked = () => {
                console.warn('🧠 BrainStorage: DB upgrade blocked by other tabs. Close other tabs and refresh.');
                clearTimeout(timeout);
                resolve(); // Don't hang, continue without DB
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                // V1: KnowledgeBase
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName);
                }
                // V2: ProcessedFiles
                if (!db.objectStoreNames.contains('ProcessedFiles')) {
                    db.createObjectStore('ProcessedFiles', { keyPath: 'hash' });
                }
                // V3: Vendors (Dictionary Database)
                if (!db.objectStoreNames.contains('Vendors')) {
                    const vendorStore = db.createObjectStore('Vendors', { keyPath: 'id' });
                    vendorStore.createIndex('name', 'name', { unique: false });
                }
            };

            request.onsuccess = (event) => {
                clearTimeout(timeout);
                this.db = event.target.result;
                console.log(`🧠 BrainStorage: Connected to ${this.dbName} (v${this.db.version})`);
                resolve();
            };

            request.onerror = (event) => {
                clearTimeout(timeout);
                console.error('🧠 BrainStorage: Error opening DB', event);
                resolve(); // Don't reject, allow parsing to continue without DB
            };
        });
    }

    /**
     * Save the entire history map
     * @param {Map} historyMap 
     */
    async saveHistory(historyMap) {
        if (!this.db) await this.init();

        // Convert Map to Array of arrays for storage (Maps don't serialize to JSON well by default, 
        // but IndexedDB can store structure cloneable data. Arrays are safest across browsers).
        const data = Array.from(historyMap.entries());

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.put(data, 'history_vectors');

            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    /**
     * Load the entire history map
     * @returns {Map}
     */
    async loadHistory() {
        if (!this.db) await this.init();

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction([this.storeName], 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get('history_vectors');

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    const map = new Map(result);
                    resolve(map);
                } else {
                    resolve(new Map()); // Empty
                }
            };
            request.onerror = (e) => reject(e);
        });
    }

    /**
     * Check if a file hash has been processed
     * @param {string} hash 
     */
    async hasParsedFile(hash) {
        if (!this.db) await this.init();
        if (!this.db) return false; // DB unavailable, allow import

        return new Promise((resolve) => {
            const tx = this.db.transaction(['ProcessedFiles'], 'readonly');
            const store = tx.objectStore('ProcessedFiles');
            const request = store.get(hash);
            request.onsuccess = () => resolve(!!request.result);
            request.onerror = () => resolve(false);
        });
    }

    /**
     * Mark a file hash as processed
     * @param {string} hash 
     */
    async markFileParsed(hash) {
        if (!this.db) await this.init();
        if (!this.db) return; // DB unavailable, skip silently

        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['ProcessedFiles'], 'readwrite');
            const store = tx.objectStore('ProcessedFiles');
            const request = store.put({ hash, timestamp: Date.now() });
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    /**
     * Get all processed file hashes (for backfilling upload history)
     */
    async getAllProcessedFiles() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['ProcessedFiles'], 'readonly');
            const store = tx.objectStore('ProcessedFiles');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e);
        });
    }

    /**
     * Remove a specific file hash (allows re-import)
     * @param {string} hash 
     */
    async removeFileHash(hash) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['ProcessedFiles'], 'readwrite');
            const store = tx.objectStore('ProcessedFiles');
            const request = store.delete(hash);
            request.onsuccess = () => {
                console.log(`🗑️ BrainStorage: Removed hash ${hash}`);
                resolve();
            };
            request.onerror = (e) => reject(e);
        });
    }

    /**
     * Clear all file hashes (allows re-importing all files)
     */
    async clearAllFileHashes() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['ProcessedFiles'], 'readwrite');
            const store = tx.objectStore('ProcessedFiles');
            const request = store.clear();
            request.onsuccess = () => {
                console.log('🗑️ BrainStorage: Cleared all file hashes');
                resolve();
            };
            request.onerror = (e) => reject(e);
        });
    }

    /**
     * Clear the brain (for reset/debug)
     */
    async clear() {
        if (!this.db) await this.init();
        const tx = this.db.transaction([this.storeName, 'ProcessedFiles', 'Vendors'], 'readwrite');
        tx.objectStore(this.storeName).clear();
        tx.objectStore('ProcessedFiles').clear();
        tx.objectStore('Vendors').clear();
    }

    // ==========================================
    // VENDOR DICTIONARY METHODS (V3)
    // ==========================================

    async getAllVendors() {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['Vendors'], 'readonly');
            const store = tx.objectStore('Vendors');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = (e) => reject(e);
        });
    }

    async saveVendor(vendor) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['Vendors'], 'readwrite');
            const store = tx.objectStore('Vendors');
            const request = store.put(vendor);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    async deleteVendor(id) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['Vendors'], 'readwrite');
            const store = tx.objectStore('Vendors');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (e) => reject(e);
        });
    }

    async bulkSaveVendors(vendors) {
        if (!this.db) await this.init();
        return new Promise((resolve, reject) => {
            const tx = this.db.transaction(['Vendors'], 'readwrite');
            const store = tx.objectStore('Vendors');

            vendors.forEach(v => store.put(v));

            tx.oncomplete = () => resolve();
            tx.onerror = (e) => reject(e);
        });
    }
}

// Global Singleton
window.BrainStorage = new BrainStorage();
