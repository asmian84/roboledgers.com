/**
 * Merchant Dictionary System
 * Hierarchical Merchant → Descriptions mapping
 * Raw descriptions are IMMUTABLE - never modified
 */

class MerchantDictionary {
    constructor() {
        this.merchants = new Map(); // id → merchant
        this.patternIndex = new Map(); // pattern → merchant_id
        this.normalizedIndex = new Map(); // normalized → merchant_id
        this.db = null;
        this.isInitialized = false;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MerchantDictionaryDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.loadMerchantsIntoMemory().then(async () => {
                    // 1. CLOUD SYNC: Try to fetch from Supabase if online
                    if (window.supabaseService && window.supabaseService.isOnline) {
                        try {
                            console.log('☁️ Dictionary: Syncing with Supabase...');
                            // Smart discovery of table name
                            const candidates = ['vendors', 'vendor', 'merchants', 'merchant', 'Vendors', 'Merchants'];
                            const table = await window.supabaseService.discoverTable(candidates, 'merchants');

                            const { data, error } = await window.supabaseService.from(table).select('*');
                            if (!error && data && data.length > 0) {
                                console.log(`☁️ Dictionary: Synced ${data.length} merchants from cloud ("${table}")`);
                                // Update IndexedDB in background
                                this.importBackup(data).then(() => {
                                    console.log('✅ Dictionary: Cloud sync merged into local cache');
                                });
                            } else if (error) {
                                console.warn(`☁️ Dictionary: Cloud sync fail on "${table}":`, error.message);
                            }
                        } catch (e) {
                            console.warn('☁️ Dictionary: Cloud sync failed, using local cache', e);
                        }
                    }

                    this.isInitialized = true;
                    console.log('✅ Merchant Dictionary initialized');
                    console.log(`📊 Loaded ${this.merchants.size} merchants`);
                    resolve();
                });
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Merchants store
                if (!db.objectStoreNames.contains('merchants')) {
                    const merchantStore = db.createObjectStore('merchants', {
                        keyPath: 'id'
                    });
                    merchantStore.createIndex('normalized_name', 'normalized_name', { unique: false });
                    merchantStore.createIndex('default_category', 'default_category', { unique: false });
                }

                // Pattern cache (for fast lookups)
                if (!db.objectStoreNames.contains('pattern_cache')) {
                    const cacheStore = db.createObjectStore('pattern_cache', {
                        keyPath: 'pattern'
                    });
                    cacheStore.createIndex('merchant_id', 'merchant_id', { unique: false });
                    cacheStore.createIndex('normalized', 'normalized', { unique: false });
                }
            };
        });
    }

    async loadMerchantsIntoMemory() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants', 'pattern_cache'], 'readonly');
            const merchantStore = transaction.objectStore('merchants');
            const cacheStore = transaction.objectStore('pattern_cache');

            const merchantRequest = merchantStore.getAll();
            const cacheRequest = cacheStore.getAll();

            transaction.oncomplete = () => {
                const merchants = merchantRequest.result;
                const patterns = cacheRequest.result;

                // Load merchants
                merchants.forEach(merchant => {
                    this.merchants.set(merchant.id, merchant);
                });

                // Build indexes
                patterns.forEach(pattern => {
                    this.patternIndex.set(pattern.pattern, pattern.merchant_id);
                    this.normalizedIndex.set(pattern.normalized, pattern.merchant_id);
                });

                resolve();
            };

            transaction.onerror = () => reject(transaction.error);
        });
    }

    // ============================================
    // PATTERN EXTRACTION (Legacy - used for fallback)
    // ============================================

    extractPattern(rawDescription) {
        if (!rawDescription) return '';

        return rawDescription
            .replace(/\*[A-Z0-9]{6,}/gi, '')
            .replace(/[#]?\d{6,}/g, '')
            .replace(/REF:\s*\d+/gi, '')
            .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '')
            .replace(/\d{1,2}:\d{2}(:\d{2})?/g, '')
            .replace(/XXXX\s*\d{4}/gi, '')
            .replace(/\*{4}\s*\d{4}/gi, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    normalize(text) {
        if (!text) return '';
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // ============================================
    // LEARNING FROM RAW DESCRIPTIONS
    // ============================================

    async learnFromTransaction(transaction) {
        if (!this.isInitialized) await this.init();

        let { raw_description, merchant_id, merchant_name, source, category } = transaction;

        if (!raw_description) {
            console.warn('⚠️ No raw_description provided');
            return null;
        }

        // 1. Resolve Merchant Info using Categorizer v4 (Persistent Cleaning)
        const cleanResult = window.merchantCategorizer.cleanTransaction(raw_description);

        // Phase 1: PURGE logic - don't learn garbage
        if (cleanResult.status === 'ignore') {
            console.log(`🗑️ Dictionary: Skipping learning for junk description: "${raw_description}"`);
            return null;
        }

        const canonicalName = cleanResult.clean_name;
        const normalizedCanonical = this.normalize(canonicalName);

        let merchant = null;

        if (merchant_id) {
            merchant = this.merchants.get(merchant_id);
        } else {
            // Try to find by canonical name!
            for (const m of this.merchants.values()) {
                if (m.normalized_name === normalizedCanonical) {
                    merchant = m;
                    break;
                }
            }

            // Still not found? Create it using the canonicalized name! 
            if (!merchant) {
                // Use categorizer hints if available
                let cleanCategory = cleanResult.default_category || category || 'Uncategorized';
                if (cleanCategory.toString().match(/^\d{4}\s+/)) {
                    cleanCategory = cleanCategory.replace(/^\d{4}\s+/, '');
                }

                console.log(`🆕 Dictionary: Learning NEW canonical merchant: "${canonicalName}" from "${raw_description}"`);
                merchant = await this.createMerchant({
                    display_name: canonicalName,
                    default_category: cleanCategory,
                    default_account: cleanResult.default_account,
                    industry: cleanResult.industry,
                    categorization_confidence: cleanResult.confidence,
                    source: 'Auto-Learner-v4'
                });
            }
        }

        if (!merchant) {
            console.warn(`⚠️ Merchant could not be resolved or created, cannot learn`);
            return null;
        }

        merchant_id = merchant.id;

        // Use v4 cleaned name for the pattern as well (STRIP logic)
        const pattern = canonicalName;
        const normalized = normalizedCanonical;

        // Initialize description_patterns if needed
        if (!merchant.description_patterns) {
            merchant.description_patterns = [];
        }

        // Find existing pattern or create new
        let patternObj = merchant.description_patterns.find(
            p => p.normalized_pattern === normalized
        );

        if (patternObj) {
            // Pattern exists - Always increment stats
            patternObj.match_count++;
            patternObj.last_seen = new Date().toISOString();

            // Add raw example only if unique
            if (!patternObj.raw_examples.includes(raw_description)) {
                patternObj.raw_examples.push(raw_description);
                console.log(`✅ Dictionary: Linked new variation: "${raw_description}" → ${merchant.display_name}`);
            }
        } else {
            // New variation - learn it!
            patternObj = {
                pattern: pattern,
                normalized_pattern: normalized,
                raw_examples: [raw_description],
                match_count: 1,
                first_seen: new Date().toISOString(),
                last_seen: new Date().toISOString(),
                learned_from_source: source || 'unknown',
                confidence: 1.0
            };
            merchant.description_patterns.push(patternObj);

            // Update indexes
            this.patternIndex.set(pattern, merchant_id);
            this.normalizedIndex.set(normalized, merchant_id);

            // Save to pattern cache
            await this.savePatternCache({
                pattern: pattern,
                normalized: normalized,
                merchant_id: merchant_id
            });

            console.log(`✅ Dictionary: Learned pattern variation: "${pattern}" → ${merchant.display_name}`);
        }

        // Update merchant stats
        merchant.stats = merchant.stats || {};
        merchant.stats.total_transactions = (merchant.stats.total_transactions || 0) + 1;
        merchant.stats.unique_patterns = merchant.description_patterns.length;
        merchant.stats.unique_raw_descriptions = merchant.description_patterns.reduce(
            (sum, p) => sum + p.raw_examples.length, 0
        );
        merchant.updated_at = new Date().toISOString();

        // Save merchant
        await this.saveMerchant(merchant);

        return {
            pattern: pattern,
            merchant: merchant.display_name,
            is_new_pattern: patternObj.match_count === 1
        };
    }

    async confirmCategorization(rawDescription, category, merchantName) {
        if (!this.isInitialized) await this.init();
        console.log(`🧠 Active Learning: Confirming "${rawDescription}" → ${category}`);
        return await this.learnFromTransaction({
            raw_description: rawDescription,
            merchant_name: merchantName || this.extractPattern(rawDescription),
            category: category,
            source: 'User-Confirmation'
        });
    }

    // ============================================
    // MATCHING TRANSACTIONS
    // ============================================

    async matchTransaction(rawDescription) {
        if (!this.isInitialized) await this.init();
        if (!rawDescription) return null;

        // Step 0: v4 Clean Check
        const cleanResult = window.merchantCategorizer.cleanTransaction(rawDescription);
        if (cleanResult.status === 'ignore') return null;

        // Step 1: Exact Match on cleaned name
        const normalized = this.normalize(cleanResult.clean_name);
        const exactMatch = this.normalizedIndex.get(normalized);
        if (exactMatch) {
            const merchant = this.merchants.get(exactMatch);
            return {
                merchant: merchant,
                matched_pattern: cleanResult.clean_name,
                confidence: 1.0,
                method: 'v4-exact'
            };
        }

        // Step 2: Pattern Detector Hook
        if (window.patternDetector) {
            const detection = window.patternDetector.detect(rawDescription);
            if (detection.confidence >= 0.85 && detection.type !== 'unknown') {
                const normDetect = this.normalize(detection.merchantName);
                const existingId = this.normalizedIndex.get(normDetect);
                if (existingId) {
                    return {
                        merchant: this.merchants.get(existingId),
                        matched_pattern: detection.merchantName,
                        confidence: detection.confidence,
                        method: 'pattern_detector'
                    };
                }
            }
        }

        // Step 3: Fuzzy match (Fallback)
        const fuzzyMatch = await this.fuzzyMatch(normalized);
        if (fuzzyMatch && fuzzyMatch.confidence > 0.8) {
            return {
                merchant: fuzzyMatch.merchant,
                matched_pattern: fuzzyMatch.pattern,
                confidence: fuzzyMatch.confidence,
                method: 'fuzzy'
            };
        }

        return null;
    }

    async fuzzyMatch(normalized) {
        const candidates = [];
        for (const [pattern, merchantId] of this.normalizedIndex) {
            const similarity = this.calculateSimilarity(normalized, pattern);
            if (similarity > 0.7) {
                candidates.push({
                    merchant: this.merchants.get(merchantId),
                    pattern: pattern,
                    confidence: similarity
                });
            }
        }
        return candidates.length > 0 ? candidates.sort((a, b) => b.confidence - a.confidence)[0] : null;
    }

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 1.0;
        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];
        for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
        for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) matrix[i][j] = matrix[i - 1][j - 1];
                else matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
            }
        }
        return matrix[str2.length][str1.length];
    }

    // ============================================
    // MERCHANT CRUD
    // ============================================

    async createMerchant(data) {
        if (!this.isInitialized) await this.init();
        const merchant = {
            id: data.id || `merchant_${Date.now()}`,
            display_name: data.display_name,
            normalized_name: this.normalize(data.display_name),
            default_category: data.default_category || null,
            default_account: data.default_account || null,
            categorization_confidence: data.categorization_confidence || 0.5,
            description_patterns: [],
            aliases: data.aliases || [],
            industry: data.industry || null,
            stats: { total_transactions: 0, unique_patterns: 0, unique_raw_descriptions: 0 },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        this.merchants.set(merchant.id, merchant);
        await this.saveMerchant(merchant);
        return merchant;
    }

    async getMerchant(merchantId) {
        if (!this.isInitialized) await this.init();
        return this.merchants.get(merchantId);
    }

    async getAllMerchants() {
        if (!this.isInitialized) await this.init();
        return Array.from(this.merchants.values());
    }

    async updateMerchant(merchantId, updates) {
        if (!this.isInitialized) await this.init();
        const merchant = this.merchants.get(merchantId);
        if (!merchant) return null;
        Object.assign(merchant, updates);
        merchant.updated_at = new Date().toISOString();
        await this.saveMerchant(merchant);
        return merchant;
    }

    async deleteMerchant(merchantId) {
        if (!this.isInitialized) await this.init();
        const merchant = this.merchants.get(merchantId);
        if (!merchant) return false;
        this.merchants.delete(merchantId);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants', 'pattern_cache'], 'readwrite');
            transaction.objectStore('merchants').delete(merchantId);
            const index = transaction.objectStore('pattern_cache').index('merchant_id');
            const request = index.openCursor(IDBKeyRange.only(merchantId));
            request.onsuccess = (e) => {
                const cursor = e.target.result;
                if (cursor) { cursor.delete(); cursor.continue(); }
            };
            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });

        // SYNC TO CLOUD
        if (window.supabaseService && window.supabaseService.isOnline) {
            try {
                const { error } = await window.supabaseService.from('merchants').delete().eq('id', merchantId);
                if (error) console.error('☁️ Dictionary: Failed to delete merchant from cloud:', error);
            } catch (e) {
                console.warn('☁️ Dictionary: Supabase error during deleteMerchant', e);
            }
        }

        return true;
    }

    async saveMerchant(merchant) {
        // 1. Local Persistence
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants'], 'readwrite');
            const request = transaction.objectStore('merchants').put(merchant);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 2. Cloud Persistence
        if (window.supabaseService && window.supabaseService.isOnline) {
            try {
                const { error } = await window.supabaseService.from('merchants').upsert(merchant);
                if (error) console.error('☁️ Dictionary: Failed to sync merchant to cloud:', error);
            } catch (e) {
                console.warn('☁️ Dictionary: Supabase error during saveMerchant', e);
            }
        }
    }

    async savePatternCache(pattern) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pattern_cache'], 'readwrite');
            const request = transaction.objectStore('pattern_cache').put(pattern);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Bulk save merchants using a single transaction for efficiency/atomicity
     */
    async bulkSaveMerchants(merchants, progressCallback, clearFirst = false) {
        if (!this.isInitialized) await this.init();
        if (!Array.isArray(merchants)) return 0;

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants', 'pattern_cache'], 'readwrite');
            const store = transaction.objectStore('merchants');
            const cacheStore = transaction.objectStore('pattern_cache');
            let saved = 0;

            if (clearFirst) {
                console.log('🗑️ Dictionary: Clearing before bulk save...');
                store.clear();
                cacheStore.clear();
                this.merchants.clear();
                this.patternIndex.clear();
                this.normalizedIndex.clear();
            }

            transaction.oncomplete = () => {
                // Update in-memory map AFTER transaction success
                merchants.forEach(m => this.merchants.set(m.id, m));
                console.log(`✅ Bulk save complete: ${saved} merchants persisted`);
                resolve(saved);
            };

            transaction.onerror = (e) => {
                console.error('❌ Bulk save transaction failed:', e);
                reject(e);
            };

            for (const merchant of merchants) {
                const request = store.put(merchant);
                request.onsuccess = () => {
                    saved++;
                    if (progressCallback && saved % 500 === 0) {
                        progressCallback(saved, merchants.length);
                    }
                };
            }
        });

        // SYNC TO CLOUD
        if (window.supabaseService && window.supabaseService.isOnline) {
            try {
                console.log(`☁️ Dictionary: Pushing ${merchants.length} merchants to cloud...`);
                const { error } = await window.supabaseService.from('merchants').upsert(merchants);
                if (error) console.error('☁️ Dictionary: Bulk cloud push failed:', error);
                else console.log('✅ Dictionary: Bulk cloud push successful');
            } catch (e) {
                console.warn('☁️ Dictionary: Supabase error during bulkSaveMerchants', e);
            }
        }

        return merchants.length;
    }

    async bulkCategorizeMerchants(progressCallback) {
        if (!this.isInitialized) await this.init();
        const merchants = Array.from(this.merchants.values());
        let updated = 0;
        for (let i = 0; i < merchants.length; i++) {
            const m = merchants[i];
            const result = window.merchantCategorizer.cleanTransaction(m.display_name);
            m.display_name = (result.status === 'ignore') ? m.display_name : result.clean_name;
            m.industry = result.industry || 'Miscellaneous';
            m.default_account = result.default_account || '5718';
            m.default_category = result.default_category || 'Miscellaneous';
            m.categorization_confidence = result.confidence;
            await this.saveMerchant(m);
            updated++;
            if (progressCallback) progressCallback(i, merchants.length, m);
        }
        return updated;
    }

    async clearDictionary() {
        if (!this.db) await this.init();

        console.log('🗑️ Dictionary: Clearing all entries...');
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants', 'pattern_cache'], 'readwrite');
            transaction.objectStore('merchants').clear();
            transaction.objectStore('pattern_cache').clear();

            transaction.oncomplete = () => {
                this.merchants.clear();
                this.patternIndex.clear();
                this.normalizedIndex.clear();
                console.log('✅ Dictionary cleared successfully');
                resolve();
            };
            transaction.onerror = (e) => {
                console.error('❌ Failed to clear dictionary:', e);
                reject(e);
            };
        });
    }

    async importBackup(backupData) {
        if (!backupData) {
            console.error('❌ No backup data provided');
            return;
        }

        const merchants = backupData.merchants || backupData; // Handle both wrapper and raw array
        if (!Array.isArray(merchants)) {
            console.error('❌ Invalid backup format - expected array of merchants');
            return;
        }

        console.log(`📥 Importing ${merchants.length} merchants...`);
        const total = merchants.length;
        let imported = 0;

        for (const m of merchants) {
            this.merchants.set(m.id, m);
            await this.saveMerchant(m);

            // Rebuild pattern indexes
            if (m.description_patterns) {
                for (const p of m.description_patterns) {
                    this.patternIndex.set(p.pattern, m.id);
                    this.normalizedIndex.set(p.normalized_pattern, m.id);
                    await this.savePatternCache({
                        pattern: p.pattern,
                        normalized: p.normalized_pattern,
                        merchant_id: m.id
                    });
                }
            }
            imported++;
            if (imported % 500 === 0) console.log(`   Progress: ${imported}/${total}...`);
        }

        console.log(`✅ Successfully imported ${imported} merchants`);
        return imported;
    }

    async rebuildPatternCache() {
        console.log('🔨 Rebuilding pattern cache...');

        // Clear existing pattern cache
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants', 'pattern_cache'], 'readwrite');
            const merchantStore = transaction.objectStore('merchants');
            const cacheStore = transaction.objectStore('pattern_cache');

            // Clear cache first
            cacheStore.clear();

            // Clear in-memory indexes
            this.patternIndex.clear();
            this.normalizedIndex.clear();

            let processed = 0;

            // Rebuild from all merchants
            merchantStore.openCursor().onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    const merchant = cursor.value;

                    // Rebuild from description_patterns
                    if (merchant.description_patterns) {
                        for (const p of merchant.description_patterns) {
                            this.patternIndex.set(p.pattern, merchant.id);
                            this.normalizedIndex.set(p.normalized_pattern, merchant.id);
                            cacheStore.put({
                                pattern: p.pattern,
                                normalized: p.normalized_pattern,
                                merchant_id: merchant.id
                            });
                        }
                    }

                    // Also index by merchant canonical/normalized name
                    if (merchant.canonical_name) {
                        const norm = this.normalize(merchant.canonical_name);
                        this.normalizedIndex.set(norm, merchant.id);
                        cacheStore.put({
                            pattern: merchant.canonical_name,
                            normalized: norm,
                            merchant_id: merchant.id
                        });
                    }

                    processed++;
                    cursor.continue();
                } else {
                    console.log(`✅ Rebuilt pattern cache for ${processed} merchants`);
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
}

// Global Singleton
window.merchantDictionary = new MerchantDictionary();
console.log('📚 Merchant Dictionary v4 (Persistent Cleaning) Loaded');
