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
                this.loadMerchantsIntoMemory().then(() => {
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
    // PATTERN EXTRACTION
    // ============================================

    extractPattern(rawDescription) {
        if (!rawDescription) return '';

        return rawDescription
            // Remove transaction IDs (e.g., *AB123CD, *XY789ZZ)
            .replace(/\*[A-Z0-9]{6,}/gi, '')
            // Remove reference numbers (e.g., #123456, REF:789012)
            .replace(/[#]?\d{6,}/g, '')
            .replace(/REF:\s*\d+/gi, '')
            // Remove dates (MM/DD/YY, DD/MM/YYYY, etc.)
            .replace(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g, '')
            // Remove times (HH:MM, HH:MM:SS)
            .replace(/\d{1,2}:\d{2}(:\d{2})?/g, '')
            // Remove card last 4 digits patterns
            .replace(/XXXX\s*\d{4}/gi, '')
            .replace(/\*{4}\s*\d{4}/gi, '')
            // Remove extra whitespace
            .replace(/\s+/g, ' ')
            .trim();
    }

    normalize(text) {
        if (!text) return '';

        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '') // Remove special chars
            .replace(/\s+/g, ' ') // Normalize spaces
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

        // Extract pattern from raw description
        const pattern = this.extractPattern(raw_description);
        const normalized = this.normalize(pattern);

        if (!pattern || !normalized) {
            console.warn('⚠️ Could not extract pattern from:', raw_description);
            return null;
        }

        // 1. Resolve Merchant ID
        let merchant = null;

        if (merchant_id) {
            merchant = this.merchants.get(merchant_id);
        } else if (merchant_name) {
            // Try to find by name
            const normalizedName = this.normalize(merchant_name);
            for (const m of this.merchants.values()) {
                if (m.normalized_name === normalizedName) {
                    merchant = m;
                    break;
                }
            }

            // Still not found? Create it! 
            if (!merchant) {
                console.log(`🆕 Auto-creating new merchant: "${merchant_name}"`);
                merchant = await this.createMerchant({
                    display_name: merchant_name,
                    default_category: category || 'Uncategorized',
                    source: 'Auto-Learner'
                });
            }
        }

        if (!merchant) {
            console.warn(`⚠️ Merchant ID/Name not provided or could not be created, cannot learn`);
            return null;
        }

        merchant_id = merchant.id;

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

            // Add raw example only if unique (to avoid bloating storage)
            if (!patternObj.raw_examples.includes(raw_description)) {
                patternObj.raw_examples.push(raw_description);
                console.log(`✅ Added new raw variation: "${raw_description}"`);
            } else {
                console.log(`✅ Incremented count for existing pattern: "${pattern}" (Count: ${patternObj.match_count})`);
            }
        } else {
            // New pattern - learn it!
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

            console.log(`✅ Learned NEW pattern: "${pattern}" → ${merchant.display_name}`);
        }

        // Update merchant stats
        merchant.stats = merchant.stats || {};
        merchant.stats.total_transactions = (merchant.stats.total_transactions || 0) + 1; // Increment total seen
        merchant.stats.unique_patterns = merchant.description_patterns.length;
        merchant.stats.unique_raw_descriptions = merchant.description_patterns.reduce(
            (sum, p) => sum + p.raw_examples.length, 0
        );
        merchant.updated_at = new Date().toISOString();

        // Save merchant
        await this.saveMerchant(merchant);

        // IMPORTANT: raw_description is NEVER modified!
        // console.log(`✅ Preserved raw: "${raw_description}"`); // Reduced log noise


        return {
            pattern: pattern,
            merchant: merchant.display_name,
            is_new_pattern: patternObj.match_count === 1
        };
    }

    // ============================================
    // MATCHING TRANSACTIONS
    // ============================================

    async matchTransaction(rawDescription) {
        if (!this.isInitialized) await this.init();

        if (!rawDescription) return null;

        // Step 1: Extract pattern
        const pattern = this.extractPattern(rawDescription);
        const normalized = this.normalize(pattern);

        // Step 2: Exact match on normalized pattern
        const exactMatch = this.normalizedIndex.get(normalized);
        if (exactMatch) {
            const merchant = this.merchants.get(exactMatch);
            return {
                merchant: merchant,
                matched_pattern: pattern,
                confidence: 1.0,
                method: 'exact'
            };
        }

        // Step 3: Fuzzy match
        const fuzzyMatch = await this.fuzzyMatch(normalized);
        if (fuzzyMatch && fuzzyMatch.confidence > 0.8) {
            return {
                merchant: fuzzyMatch.merchant,
                matched_pattern: fuzzyMatch.pattern,
                confidence: fuzzyMatch.confidence,
                method: 'fuzzy'
            };
        }

        // Step 4: Pattern match (check if starts with known pattern)
        const patternMatch = await this.patternMatch(normalized);
        if (patternMatch) {
            return {
                merchant: patternMatch.merchant,
                matched_pattern: patternMatch.pattern,
                confidence: patternMatch.confidence,
                method: 'pattern'
            };
        }

        // No match found
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

        if (candidates.length > 0) {
            return candidates.sort((a, b) => b.confidence - a.confidence)[0];
        }

        return null;
    }

    async patternMatch(normalized) {
        // Check if normalized starts with any known pattern
        for (const [pattern, merchantId] of this.normalizedIndex) {
            if (normalized.startsWith(pattern) || pattern.startsWith(normalized)) {
                const merchant = this.merchants.get(merchantId);
                const confidence = Math.min(pattern.length, normalized.length) /
                    Math.max(pattern.length, normalized.length);

                if (confidence > 0.7) {
                    return {
                        merchant: merchant,
                        pattern: pattern,
                        confidence: confidence
                    };
                }
            }
        }

        return null;
    }

    // ============================================
    // SIMILARITY CALCULATION (Levenshtein)
    // ============================================

    calculateSimilarity(str1, str2) {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;

        if (longer.length === 0) return 1.0;

        const distance = this.levenshteinDistance(longer, shorter);
        return (longer.length - distance) / longer.length;
    }

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
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
            website: data.website || null,
            industry: data.industry || null,
            stats: {
                total_transactions: 0,
                total_amount: 0,
                average_amount: 0,
                unique_patterns: 0,
                unique_raw_descriptions: 0
            },
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        this.merchants.set(merchant.id, merchant);
        await this.saveMerchant(merchant);

        console.log(`✅ Created merchant: ${merchant.display_name}`);
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

        // Remove from memory
        this.merchants.delete(merchantId);

        // Remove patterns from indexes
        if (merchant.description_patterns) {
            merchant.description_patterns.forEach(p => {
                this.patternIndex.delete(p.pattern);
                this.normalizedIndex.delete(p.normalized_pattern);
            });
        }

        // Remove from database
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants', 'pattern_cache'], 'readwrite');
            const merchantStore = transaction.objectStore('merchants');
            const cacheStore = transaction.objectStore('pattern_cache');

            merchantStore.delete(merchantId);

            // Delete all patterns for this merchant
            const index = cacheStore.index('merchant_id');
            const request = index.openCursor(IDBKeyRange.only(merchantId));

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve(true);
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // ============================================
    // BULK OPERATIONS
    // ============================================

    async bulkRecategorize(merchantId, newCategory, newAccount) {
        if (!this.isInitialized) await this.init();

        const merchant = this.merchants.get(merchantId);
        if (!merchant) {
            return { success: false, error: 'Merchant not found', count: 0 };
        }

        const oldCategory = merchant.default_category;
        const oldAccount = merchant.default_account;

        // Update merchant defaults
        merchant.default_category = newCategory;
        merchant.default_account = newAccount;
        merchant.updated_at = new Date().toISOString();

        await this.saveMerchant(merchant);

        console.log(`✅ Bulk recategorize: ${merchant.display_name}`);
        console.log(`   From: ${oldCategory} (${oldAccount})`);
        console.log(`   To: ${newCategory} (${newAccount})`);

        // Note: Actual transaction updates would happen in the transaction service
        // This just updates the merchant's defaults

        return {
            success: true,
            merchant: merchant.display_name,
            from: { category: oldCategory, account: oldAccount },
            to: { category: newCategory, account: newAccount }
        };
    }

    // ============================================
    // DATABASE OPERATIONS
    // ============================================

    async saveMerchant(merchant) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants'], 'readwrite');
            const store = transaction.objectStore('merchants');

            const request = store.put(merchant);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async savePatternCache(pattern) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['pattern_cache'], 'readwrite');
            const store = transaction.objectStore('pattern_cache');

            const request = store.put(pattern);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // ============================================
    // MERCHANT DETAILS / DRILL-DOWN
    // ============================================

    async getMerchantDetails(merchantId) {
        if (!this.isInitialized) await this.init();

        const merchant = this.merchants.get(merchantId);
        if (!merchant) return null;

        return {
            merchant: {
                id: merchant.id,
                display_name: merchant.display_name,
                default_category: merchant.default_category,
                default_account: merchant.default_account,
                industry: merchant.industry,
                website: merchant.website
            },
            patterns: (merchant.description_patterns || []).map(p => ({
                pattern: p.pattern,
                match_count: p.match_count,
                raw_examples: p.raw_examples.slice(0, 10), // First 10
                total_raw_examples: p.raw_examples.length,
                first_seen: p.first_seen,
                last_seen: p.last_seen,
                learned_from: p.learned_from_source
            })),
            stats: merchant.stats || {}
        };
    }

    // ============================================
    // STATISTICS
    // ============================================

    async getStats() {
        if (!this.isInitialized) await this.init();

        const merchants = Array.from(this.merchants.values());

        return {
            total_merchants: merchants.length,
            total_patterns: this.patternIndex.size,
            total_raw_descriptions: merchants.reduce((sum, m) =>
                sum + (m.stats?.unique_raw_descriptions || 0), 0
            ),
            merchants_by_category: this.groupByCategory(merchants),
            top_merchants: this.getTopMerchants(merchants, 10)
        };
    }

    groupByCategory(merchants) {
        const groups = {};
        merchants.forEach(m => {
            const cat = m.default_category || 'Uncategorized';
            groups[cat] = (groups[cat] || 0) + 1;
        });
        return groups;
    }

    getTopMerchants(merchants, limit) {
        return merchants
            .sort((a, b) => (b.stats?.total_transactions || 0) - (a.stats?.total_transactions || 0))
            .slice(0, limit)
            .map(m => ({
                name: m.display_name,
                transactions: m.stats?.total_transactions || 0,
                amount: m.stats?.total_amount || 0
            }));
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

window.merchantDictionary = new MerchantDictionary();

// Auto-initialize
window.addEventListener('DOMContentLoaded', async () => {
    await window.merchantDictionary.init();
    console.log('🏢 Merchant Dictionary ready!');
});

// Export
window.MerchantDictionary = MerchantDictionary;
