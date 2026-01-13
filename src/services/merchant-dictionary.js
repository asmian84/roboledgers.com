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
        this.isInitialized = false;
        this.cloudSchema = null; // Dynamically detected keys
        this.cloudBlocklist = new Set(); // Auto-learned bad columns
        this.isBulkMode = false;
        this.pendingUploads = new Set(); // Set of merchant IDs to sync
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        if (this.isInitialized) return;


        return new Promise((resolve, reject) => {

            // Bump version to 2 for 'backups' store
            const request = indexedDB.open('MerchantDictionaryDB', 2);

            request.onerror = (e) => {
                console.error('❌ Dictionary: IDB Open Error', e);
                reject(request.error);
            };

            // CHECKPOINT: Handle Version Upgrade Block (Multiple Tabs)
            request.onblocked = () => {
                console.warn('⚠️ Dictionary: IDB Blocked! Close other tabs.');
                const overlay = document.getElementById('v-loading-overlay');
                if (overlay) {
                    overlay.innerHTML = `
                        <div style="text-align:center; color:#dc2626; padding:20px; font-family:sans-serif;">
                            <div style="font-size:40px; margin-bottom:10px;">🛑</div>
                            <h3 style="margin:0 0 10px 0;">Database Update Blocked</h3>
                            <p style="margin:0 0 15px 0; line-height:1.5;">
                                A critical database upgrade (v2) is pending.<br>
                                <strong>You have other tabs open with the old version.</strong>
                            </p>
                            <div style="background:#fee2e2; border:1px solid #fca5a5; padding:10px; border-radius:8px; display:inline-block; font-weight:bold;">
                                1. Close ALL other tabs of this app.<br>
                                2. Then click Reload below.
                            </div>
                            <br><br>
                            <button onclick="location.reload()" style="padding:10px 20px; background:#dc2626; color:white; border:none; border-radius:6px; cursor:pointer; font-weight:bold; font-size:14px;">🔄 Reload Now</button>
                        </div>
                    `;
                } else {
                    alert('⚠️ Database Update Blocked!\n\nPlease close ALL other tabs of this app to allow the update to finish.');
                }
            };

            request.onsuccess = () => {

                this.db = request.result;
                this.loadMerchantsIntoMemory().then(() => {
                    // ✅ Local data loaded - UNBLOCK UI IMMEDIATELY
                    this.isInitialized = true;

                    resolve();

                    // ☁️ CLOUD SYNC: Run in background (fire & forget)
                    if (window.supabaseService && window.supabaseService.isOnline) {
                        this.syncWithCloud().catch(err => console.warn('Background Cloud Sync Error:', err));
                    }
                });
            };

            request.onupgradeneeded = (event) => {
                console.log('💾 Dictionary: Upgrading DB...');
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

                // NEW (v2): Backups Store
                if (!db.objectStoreNames.contains('backups')) {
                    const backupStore = db.createObjectStore('backups', { keyPath: 'id' });
                    backupStore.createIndex('timestamp', 'timestamp');
                    console.log('💾 DB Upgrade: Created "backups" store');
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

            transaction.onerror = (e) => {
                console.error('❌ Dictionary: Transaction Error', e);
                reject(transaction.error);
            };
        });
    }

    async syncWithCloud() {
        try {

            // Smart discovery of table name
            const candidates = ['vendors', 'vendor', 'merchants', 'merchant', 'Vendors', 'Merchants'];
            const table = await window.supabaseService.discoverTable(candidates, 'merchants');
            this.tableName = table; // STORE DISCOVERED NAME

            const { data, error } = await window.supabaseService.from(this.tableName).select('*');
            if (!error && data && data.length > 0) {
                // DETECT SCHEMA: Capture keys from the first record
                this.cloudSchema = Object.keys(data[0]);


                // Update IndexedDB & Memory
                const count = await this.importBackup(data);

                // Optional: Notify UI if significantly different?
                // For now just log it. If user is on grid, they might need a refresh to see new cloud items,
                // but this prevents the "Hang".


                // If on Vendors page, refresh grid gently? 
                // We'll leave that for now to avoid jumpiness.
            } else if (error) {
                console.warn(`☁️ Dictionary: Cloud sync fail on "${table}":`, error.message);
            }
        } catch (e) {
            console.warn('☁️ Dictionary: Background sync failed', e);
        }
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
        // Guard against undefined/null/non-string values
        if (!str1 || !str2 || typeof str1 !== 'string' || typeof str2 !== 'string') return 0;

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
            user_id: (window.SupabaseSync && window.SupabaseSync.getUserId) ? window.SupabaseSync.getUserId() : null,
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

    /**
     * Find merchant by transaction description
     * Used by AI categorization engine
     */
    async findByDescription(description) {
        if (!description) return null;

        const normalized = this.normalize(description);

        // Check pattern index first
        const merchantId = this.normalizedIndex.get(normalized);
        if (merchantId) {
            return this.merchants.get(merchantId);
        }

        // Try fuzzy matching
        const fuzzyResult = this.fuzzyMatch(description);
        if (fuzzyResult && fuzzyResult.confidence >= 0.75) {
            return fuzzyResult.merchant;
        }

        return null;
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
        await new Promise((resolve, reject) => {
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
                const { error } = await window.supabaseService.from(this.tableName).delete().eq('id', merchantId);
                if (error) console.error('☁️ Dictionary: Failed to delete merchant from cloud:', error);
            } catch (e) {
                console.warn('☁️ Dictionary: Supabase error during deleteMerchant', e);
            }
        }

        return true;
    }

    /**
     * Bulk Delete Merchants (v25.0)
     * Optimized batch deletion for cloud sync
     */
    async bulkDeleteMerchants(merchantIds) {
        if (!this.isInitialized) await this.init();
        if (!merchantIds || merchantIds.length === 0) return 0;

        // 🛡️ AUTO-BACKUP
        await this.createRestorePoint(`Before Bulk Delete (${merchantIds.length} items)`);

        console.log(`🗑️ Bulk Deleting ${merchantIds.length} merchants...`);

        // 1. Local Deletion
        for (const id of merchantIds) {
            this.merchants.delete(id);
        }

        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants', 'pattern_cache'], 'readwrite');
            const store = transaction.objectStore('merchants');
            const cacheStore = transaction.objectStore('pattern_cache');
            const cacheIndex = cacheStore.index('merchant_id');

            for (const id of merchantIds) {
                store.delete(id);
                // Also purge patterns
                const request = cacheIndex.openCursor(IDBKeyRange.only(id));
                request.onsuccess = (e) => {
                    const cursor = e.target.result;
                    if (cursor) { cursor.delete(); cursor.continue(); }
                };
            }

            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e);
        });

        // 2. Cloud Persistence (Batch Delete)
        if (window.supabaseService && window.supabaseService.isOnline) {
            try {
                const { error } = await window.supabaseService.from(this.tableName).delete().in('id', merchantIds);
                if (error) console.error('☁️ Dictionary: Failed to bulk delete from cloud:', error);
                else console.log('✅ Dictionary: Bulk cloud delete successful');
            } catch (e) {
                console.warn('☁️ Dictionary: Supabase error during bulkDeleteMerchants', e);
            }
        }

        return merchantIds.length;
    }

    /**
     * Bulk Find & Replace (v26.0)
     * Safely renames multiple merchants at once
     */
    async bulkFindAndReplace(merchantIds, findText, replaceText) {
        if (!this.isInitialized) await this.init();
        if (!merchantIds || merchantIds.length === 0) return 0;

        // 🛡️ AUTO-BACKUP
        await this.createRestorePoint(`Before Find/Replace: "${findText}" -> "${replaceText}"`);

        console.log(`🧹 Processing Find & Replace for ${merchantIds.length} items...`);
        const updates = [];

        // Prepare regex for case-insensitive global replacement
        // Escaping special characters in findText
        const escapedFind = findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escapedFind, 'gi');

        for (const id of merchantIds) {
            const m = this.merchants.get(id);
            if (m && m.display_name && regex.test(m.display_name)) {
                // Creates a new string with the replacement
                m.display_name = m.display_name.replace(regex, replaceText).trim();
                m.normalized_name = this.normalize(m.display_name); // Re-normalize!
                m.updated_at = new Date().toISOString();
                updates.push(m);
            }
        }

        if (updates.length > 0) {
            await this.bulkSaveMerchants(updates, null, false);
        }

        return updates.length;
    }

    /**
     * Consolidate Miscellaneous Accounts (v27.0)
     * Groups all vendors matching "Misc" variants into a single 9970 account
     */
    async consolidateMiscAccounts() {
        if (!this.isInitialized) await this.init();

        // 🛡️ AUTO-BACKUP
        await this.createRestorePoint('Before Misc Account Consolidation');

        console.log('🧹 Starting Miscellaneous Account Consolidation...');
        const updates = [];

        // Target account and category
        const TARGET_ACCOUNT = '9970';
        const TARGET_CATEGORY = 'Miscellaneous';

        // Variants to match (Case Insensitive)
        const miscPatterns = [
            /^MISCELLANEOUS$/i,
            /^Misc$/i,
            /^Uncategorized$/i,
            /^Unknown$/i,
            /^Pending$/i
        ];

        for (const [id, m] of this.merchants.entries()) {
            const currentCat = (m.default_category || '').trim();
            const currentAcc = (m.default_gl_account || m.default_account || '').toString().trim();

            const isMiscName = miscPatterns.some(p => p.test(currentCat));

            // If it matches a pattern OR is already 9970 (to ensure data consistency)
            // but we skip if it's already perfectly matched to our target
            if (isMiscName || currentAcc === '9970' || currentAcc === '1000' || currentAcc === '') {

                // Only update if something actually needs changing
                if (currentAcc !== TARGET_ACCOUNT || currentCat !== TARGET_CATEGORY) {
                    m.default_gl_account = TARGET_ACCOUNT; // Canonical field
                    m.default_account = TARGET_ACCOUNT;    // Legacy/Sync field
                    m.default_category = TARGET_CATEGORY;
                    m.updated_at = new Date().toISOString();
                    updates.push(m);
                }
            }
        }

        return updates.length;
    }

    /**
     * Consolidate All Accounts (v28.0)
     * Automatically unifies vendors sharing the same category name into 
     * a single canonical account code (the most frequently used one for that category).
     */
    async consolidateAllAccounts() {
        if (!this.isInitialized) await this.init();

        // 🛡️ AUTO-BACKUP
        await this.createRestorePoint('Before Global Account Consolidation');

        console.log('🧹 Starting Global Account Consolidation...');

        // Step 1: Group by category name and count account usage
        // categoryName -> { accountCode -> count }
        const categoryStats = new Map();

        for (const m of this.merchants.values()) {
            const cat = (m.default_category || 'Uncategorized').trim();
            const acc = (m.default_gl_account || m.default_account || '9970').toString().trim();

            if (!categoryStats.has(cat)) {
                categoryStats.set(cat, new Map());
            }

            const accMap = categoryStats.get(cat);
            accMap.set(acc, (accMap.get(acc) || 0) + 1);
        }

        // Step 2: Determine canonical account for each category
        // categoryName -> canonicalAccountCode
        const canonicals = new Map();
        for (const [cat, accMap] of categoryStats.entries()) {
            let winner = '9970';
            let maxCount = -1;

            for (const [acc, count] of accMap.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    winner = acc;
                }
            }
            canonicals.set(cat, winner);
        }

        // Step 3: Apply migrations
        const updates = [];
        for (const m of this.merchants.values()) {
            const cat = (m.default_category || 'Uncategorized').trim();
            const currentAcc = (m.default_gl_account || m.default_account || '9970').toString().trim();
            const targetAcc = canonicals.get(cat);

            if (targetAcc && currentAcc !== targetAcc) {
                console.log(`🪄 Migrating "${m.display_name}": ${cat} (${currentAcc} -> ${targetAcc})`);
                m.default_gl_account = targetAcc;
                m.default_account = targetAcc;
                m.updated_at = new Date().toISOString();
                updates.push(m);
            }
        }

        if (updates.length > 0) {
            console.log(`✅ Global Consolidation: Updating ${updates.length} vendors...`);
            await this.bulkSaveMerchants(updates, null, false);
        } else {
            console.log('✨ Global Consolidation: Everything already perfectly unified.');
        }

        return updates.length;
    }


    /**
     * Converts any string ID to a deterministic UUID for cloud compatibility
     * Keeps valid UUIDs as-is. Hashes other strings (like 'merchant_123') to UUID format.
     */
    ensureUUID(id) {
        // 1. If it's already a valid UUID, return it
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(id)) return id;

        // 2. Otherwise, hash it strictly to UUID format (v4-like structure)
        // Simple string hashing since we don't have crypto lib access here comfortably
        let hash = 0;
        for (let i = 0; i < id.length; i++) {
            hash = ((hash << 5) - hash) + id.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }

        // Seed a pseudo-random generator with the hash to be deterministic
        const seed = Math.abs(hash);
        const rng = (offset) => {
            const val = Math.sin(seed + offset) * 10000;
            return Math.floor((val - Math.floor(val)) * 256);
        }

        // Generate hex parts
        const hex = (offset, len) => {
            let s = '';
            for (let i = 0; i < len; i++) {
                s += rng(offset + i).toString(16).padStart(2, '0');
            }
            return s;
        };

        // Format: 8-4-4-4-12 (32 hex digits / 16 bytes)
        // UUID v4 structure: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        return `${hex(0, 4)}-${hex(4, 2)}-${hex(6, 2)}-${hex(8, 2)}-${hex(10, 6)}`;
    }

    /**
     * Sanitizes merchant object for cloud storage
     * Uses dynamic schema detection AND auto-learned blocklist
     */
    sanitizeForCloud(merchant) {
        let candidate = {};

        // OPTION A: Use detected schema if available AND valid (must have display_name)
        if (this.cloudSchema && this.cloudSchema.includes('display_name')) {
            this.cloudSchema.forEach(key => {
                if (merchant[key] !== undefined) candidate[key] = merchant[key];
            });
        }
        // OPTION B: Fallback (Dynamic Safe Set)
        else {
            if (this.cloudSchema) {
                console.warn('⚠️ Dictionary: Detected schema is too thin (missing display_name). Using loose mode.');
            }
            candidate = { ...merchant };

            // 1. Fix ID & Inject Owner
            candidate.id = this.ensureUUID(merchant.id);
            // FIXED: Use correct service instance
            if (window.supabaseService && window.supabaseService.getUserId) {
                const uid = window.supabaseService.getUserId();
                if (!candidate.user_id) candidate.user_id = uid;
                console.log(`🔧 Injecting user_id: ${uid} into merchant ${candidate.display_name}`);
            } else {
                console.warn('⚠️ SupabaseSync or getUserId missing during sanitization');
            }

            // 2. Remove Internal/Computed Fields
            const internalFields = ['stats', 'normalized_name', 'match_confidence', 'match_method', 'is_new', 'auto_categorized', 'categorized_at', 'is_subscription', 'notes', 'website'];
            internalFields.forEach(f => delete candidate[f]);

            // 3. Remove detected blocklisted fields (Auto-Healing)
            if (this.cloudBlocklist) {
                this.cloudBlocklist.forEach(blocked => delete candidate[blocked]);
            }
        }

        // Also ensure ID is UUID if we used Option A
        if (candidate.id) {
            candidate.id = this.ensureUUID(candidate.id);
        }

        // APPLY BLOCKLIST (Self-Healing)
        // Removes fields that previously caused PGRST204 errors
        if (this.cloudBlocklist.size > 0) {
            // CRITICAL FIX: Never block user_id, as it's required for RLS
            // (Previous logic removed: Do not force-restore user_id if it was blocked by auto-healing)

            this.cloudBlocklist.forEach(badKey => {
                delete candidate[badKey];
            });
        }

        return candidate;
    }

    /**
     * Create a Restore Point (Backup)
     * Saves entire dictionary state to 'backups' store
     */
    async createRestorePoint(reason = 'Auto-Backup') {
        if (!this.isInitialized) await this.init();

        try {
            const allMerchants = Array.from(this.merchants.values());
            const backup = {
                id: `backup_${Date.now()}`,
                timestamp: new Date().toISOString(),
                reason: reason,
                count: allMerchants.length,
                data: allMerchants // Deep snapshot
            };

            await new Promise((resolve, reject) => {
                // Open separate transaction for backups to avoid locking main stores too long if possible (though single db instance shares lock scope usually)
                const tx = this.db.transaction(['backups'], 'readwrite');
                const store = tx.objectStore('backups');

                // Save new backup
                store.add(backup);

                // Pruning: Keep only last 5 backups to save space
                // We'll just do a quick getAllKeys or Count check
                // For simplicity/perf in IndexedDB, listing keys is cheaper
                const keyRequest = store.getAllKeys();

                keyRequest.onsuccess = () => {
                    const keys = keyRequest.result;
                    if (keys.length > 5) {
                        // Sort keys (ids are timestamped)
                        keys.sort();
                        const toDelete = keys.slice(0, keys.length - 5);
                        toDelete.forEach(k => store.delete(k));
                        console.log(`🧹 Pruned ${toDelete.length} old backups`);
                    }
                };

                tx.oncomplete = () => resolve();
                tx.onerror = () => reject(tx.error);
            });

            console.log(`💾 Restore Point Created: "${reason}" (${allMerchants.length} items)`);
            return backup.id;
        } catch (e) {
            console.error('⚠️ Failed to create restore point:', e);
            return null;
        }
    }

    async saveMerchant(merchant) {
        // 1. Local Persistence
        await new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['merchants'], 'readwrite');
            const request = transaction.objectStore('merchants').put(merchant);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });

        // 2. Cloud Persistence with AUTO-HEALING
        // Retries if schema mismatch is detected
        if (this.isBulkMode) {
            this.pendingUploads.add(merchant.id);
            return;
        }

        if (window.supabaseService && window.supabaseService.isOnline) {
            let attempt = 0;
            const maxAttempts = 10;

            while (attempt < maxAttempts) {
                try {
                    const cloudSafe = this.sanitizeForCloud(merchant);
                    const { error } = await window.supabaseService.from(this.tableName).upsert(cloudSafe);

                    if (error) {
                        // DETECT SCHEMA ERROR (PGRST204)
                        // Example: "Could not find the 'description_patterns' column..."
                        if (error.code === 'PGRST204') {
                            const match = error.message.match(/Could not find the '(\w+)' column/);
                            if (match && match[1]) {
                                const badColumn = match[1];

                                // CRITICAL: Do not blocking essential columns
                                if (badColumn === 'user_id') {
                                    console.warn('⚠️ Dictionary: "user_id" column missing in DB. Removing it to allow sync.');
                                    // Allow fall-through to blocklist logic below
                                }

                                console.warn(`🩹 Dictionary: Auto-healing key '${badColumn}'. Removing from future syncs.`);
                                this.cloudBlocklist.add(badColumn);
                                attempt++; // Retry with new blocklist
                                continue;
                            }
                        }

                        console.error('☁️ Dictionary: Cloud sync failed:', error);
                        break; // Stop on non-recoverable error
                    }

                    // Success
                    return;

                } catch (e) {
                    console.warn('☁️ Dictionary: Supabase error during saveMerchant', e);
                    break;
                }
            }
        }
    }

    async savePatternCache(pattern) {
        if (!pattern || !pattern.pattern) {
            console.warn('⚠️ Dictionary: Skipping invalid pattern cache entry', pattern);
            return;
        }
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
                console.log(`☁️ Dictionary: Pushing ${merchants.length} merchants to cloud ("${this.tableName}")...`);
                const cloudSafeList = merchants.map(m => this.sanitizeForCloud(m));
                const { error } = await window.supabaseService.from(this.tableName).upsert(cloudSafeList);
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
            // NORMALIZATION: Handle legacy schema variations
            if (m.description_patterns && Array.isArray(m.description_patterns)) {
                m.description_patterns = m.description_patterns.map(p => {
                    if (typeof p === 'string') {
                        return {
                            pattern: p,
                            normalized_pattern: this.normalize(p),
                            match_count: 1,
                            last_seen: new Date().toISOString(),
                            raw_examples: []
                        };
                    }
                    return p;
                });
            }

            this.merchants.set(m.id, m);
            await this.saveMerchant(m);

            // Rebuild pattern indexes
            if (m.description_patterns && Array.isArray(m.description_patterns)) {
                for (const p of m.description_patterns) {
                    if (!p || !p.pattern) continue;

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

    /**
     * Batch Flush: Pushes all pending uploads to the cloud in chunks
     */
    async flushPendingSyncs() {
        if (!window.supabaseService || !window.supabaseService.isOnline) return;
        if (this.pendingUploads.size === 0) return;

        console.log(`☁️ Dictionary: Flushing ${this.pendingUploads.size} pending uploads...`);
        const ids = Array.from(this.pendingUploads);
        this.pendingUploads.clear();

        const chunks = [];
        for (let i = 0; i < ids.length; i += 50) {
            chunks.push(ids.slice(i, i + 50));
        }

        for (const chunk of chunks) {
            const merchantsToSync = chunk.map(id => this.merchants.get(id)).filter(m => !!m);
            const cloudSafeList = merchantsToSync.map(m => this.sanitizeForCloud(m));

            try {
                const { error } = await window.supabaseService.from(this.tableName).upsert(cloudSafeList);
                if (error) console.error('☁️ Dictionary: Batch flush failed:', error);
            } catch (e) {
                console.warn('☁️ Dictionary: Supabase error during batch flush', e);
            }
        }
        console.log('✅ Dictionary: Batch flush complete');
    }

    setBulkMode(enabled) {
        this.isBulkMode = enabled;
        if (!enabled) this.pendingUploads.clear();
    }
}

// Global Singleton
window.merchantDictionary = new MerchantDictionary();
console.log('📚 Merchant Dictionary v4 (Persistent Cleaning) Loaded');
