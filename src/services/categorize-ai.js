// import { MCC_GL_BRIDGE } from '../config/mcc_gl_bridge.js'; // REMOVED FOR FILE:// PROTOCOL COMPATIBILITY

/**
 * INTERNAL LOGGER
 * Keeps a circular buffer of recent actions for debugging without console spam.
 */
class ActionLogger {
    constructor(limit = 100) {
        this.limit = limit;
        this.logs = [];
    }

    log(action, details) {
        const entry = {
            timestamp: new Date().toISOString(),
            action,
            details
        };
        this.logs.unshift(entry);
        if (this.logs.length > this.limit) {
            this.logs.pop();
        }
    }

    getLogs() {
        return this.logs;
    }

    clear() {
        this.logs = [];
    }
}

/**
 * CategorizeAI Engine
 * The "Triangulated" logic pipeline.
 */
class CategorizeAI {
    constructor() {
        this.logger = new ActionLogger(200);
        this.mccData = null; // Will define on init
        this.initialized = false;
        this.bridge = window.MCC_GL_BRIDGE;
    }

    async init() {
        if (this.initialized) return;
        try {
            // Load MCC codes from global object (CORS workaround)
            if (window.MCC_DATA) {
                this.mccData = window.MCC_DATA;
                this.logger.log('INIT', 'MCC Data loaded from global window object');
                this.initialized = true;
            } else {
                throw new Error('window.MCC_DATA is missing. Ensure mcc_codes.js is loaded.');
            }
        } catch (e) {
            this.logger.log('ERROR', { msg: 'Failed to load MCC data', error: e.message });
            console.warn('CategorizeAI: Failed to load MCC definitions.');
        }
    }

    /**
     * The Main Brain (SELF-LEARNING)
     * @param {Object} txn - { description, amount, mcc (optional) }
     */
    async analyze(txn) {
        await this.init();
        const start = performance.now();
        const desc = txn.description || '';

        this.logger.log('START_ANALYSIS', { description: desc, provided_mcc: txn.mcc });

        // ============================================
        // PHASE 1: CHECK THE BRAIN (Free, Instant)
        // ============================================
        const learned = await window.merchantDictionary.findByDescription(desc);
        if (learned && learned.default_category && learned.default_category !== 'MISCELLANEOUS') {
            const elapsed = performance.now() - start;
            this.logger.log('BRAIN_HIT', {
                vendor: learned.display_name,
                category: learned.default_category,
                elapsed_ms: elapsed.toFixed(1)
            });
            return {
                gl_account: learned.default_gl_account || '9970',
                category: learned.default_category,
                confidence: learned.categorization_confidence || 0.9,
                source: '🧠 Brain (Learned)',
                mcc_code: null,
                vendor_name: learned.display_name
            };
        }

        // ============================================
        // PHASE 2: AI INFERENCE (Costs $, Learn Once)
        // ============================================
        if (window.GoogleAICategorizer) {
            try {
                this.logger.log('AI_INFERENCE_START', { prompt: desc });

                const aiResult = await window.GoogleAICategorizer.categorize({ description: desc });

                if (aiResult) {
                    this.logger.log('AI_SUCCESS', aiResult);

                    // ✨ AUTO-LEARN: Save to brain for next time
                    await window.merchantDictionary.learnFromAI(desc, aiResult);

                    const elapsed = performance.now() - start;
                    return {
                        gl_account: aiResult.account,
                        category: aiResult.category,
                        confidence: aiResult.confidence,
                        source: `🤖 AI (${aiResult.method || 'Google'}) + Learned`,
                        mcc_code: null,
                        elapsed_ms: elapsed.toFixed(1)
                    };
                }
            } catch (e) {
                this.logger.log('AI_ERROR', e.message);
            }
        }

        // ============================================
        // FALLBACK: Miscellaneous
        // ============================================
        this.logger.log('FALLBACK', { reason: 'No Brain match, No AI' });
        return this.packageResult('5718', 'Low', 'Fallback to Miscellaneous', null);
    }

    /**
     * Resolves GL Account from MCC Code using the Bridge
     */
    resolveGL(mccCode) {
        const code = String(mccCode);

        // 1. Exact Match
        if (this.bridge[code]) return this.bridge[code];

        // 2. Range Match
        const ranges = Object.keys(this.bridge).filter(k => k.includes('-'));
        for (const range of ranges) {
            const [start, end] = range.split('-').map(Number);
            const num = Number(code);
            if (num >= start && num <= end) {
                return this.bridge[range];
            }
        }

        return null; // No match
    }

    packageResult(gl, confidence, reasoning, mcc) {
        return {
            gl_account: gl,
            category: this.getCategoryName(gl), // Helper needed
            confidence: confidence === 'High' ? 0.95 : 0.5,
            source: reasoning,
            mcc_code: mcc
        };
    }

    getCategoryName(gl) {
        // Simple map for MVP
        const map = {
            '6415': 'Meals & Entertainment',
            '6600': 'Travel',
            '6100': 'COGS',
            '6400': 'Auto Expense',
            '6800': 'Utilities/Tech',
            '6700': 'Retail/Supplies'
        };
        return map[gl] || 'Miscellaneous';
    }
    async checkSuperVendors(description) {
        if (!this.ctfsData) {
            if (window.CTFS_MERCHANTS) {
                this.ctfsData = window.CTFS_MERCHANTS;
            } else {
                // Fallback or error if script not loaded
                this.ctfsData = {};
                console.warn('CategorizeAI: CTFS Merchants data not found in window.CTFS_MERCHANTS');
            }
        }

        const lowerDesc = description.toLowerCase();

        const catMap = {
            'grocery': '6100',
            'gas': '6400',
            'dining': '6415',
            'drug_store': '6700',
            'hardware': '7100',
            'transit': '6600'
        };

        for (const [cat, vendors] of Object.entries(this.ctfsData)) {
            if (vendors.some(v => lowerDesc.includes(v.toLowerCase()))) {
                return { category: cat, gl: catMap[cat] || '5718' };
            }
        }
        return null;
    }

    /**
     * Batch Analysis (PERFECTED TURBO MODE)
     * Processes vendors in parallel blocks with yielding to prevent UI freeze.
     * @param {Array} vendors - Array of vendor objects
     * @param {Function} progressCallback - Optional progress tracking
     */
    async analyzeBatch(vendors, progressCallback = null) {
        this.isAborted = false; // Reset abort flag
        const BATCH_SIZE = 25;
        const CONCURRENCY = 3; // Process 3 batches in parallel
        const results = [];
        let processed = 0;

        if (window.merchantDictionary) {
            await window.merchantDictionary.createRestorePoint('Turbo AI Audit Start');
        }

        console.log(`⚡ PERFECTED TURBO: Categorizing ${vendors.length} vendors (Concurrency: ${CONCURRENCY})...`);

        for (let i = 0; i < vendors.length; i += (BATCH_SIZE * CONCURRENCY)) {
            if (this.isAborted) {
                console.warn('🛑 Turbo Audit: Aborted by user.');
                break;
            }

            // Prepare parallel blocks
            const blocks = [];
            for (let c = 0; c < CONCURRENCY; c++) {
                const startIdx = i + (c * BATCH_SIZE);
                if (startIdx < vendors.length) {
                    blocks.push(vendors.slice(startIdx, startIdx + BATCH_SIZE));
                }
            }

            // Execute parallel batch requests
            const blockPromises = blocks.map(async (batch) => {
                if (this.isAborted) return;

                const batchInputs = batch.map(v => ({ description: v.display_name, id: v.id }));
                try {
                    let batchResults;
                    if (window.GoogleAICategorizer && window.GoogleAICategorizer.apiKey) {
                        batchResults = await window.GoogleAICategorizer.categorizeBatch(batchInputs);
                    } else {
                        // Sequential fallback (should not happen if key is set)
                        batchResults = await Promise.all(batch.map(v => this.analyze({ description: v.display_name })));
                    }

                    if (this.isAborted) return;

                    // Process results for this block
                    const blockUpdates = [];
                    batch.forEach((vendor, index) => {
                        processed++;
                        const res = batchResults[index];
                        if (res && res.account) {
                            const updated = {
                                ...vendor,
                                industry: res.category ? res.category.split(':')[0] : 'Other',
                                default_account: res.account,
                                default_category: res.category || 'Miscellaneous',
                                categorization_confidence: res.confidence || 0.8,
                                source: res.method || 'Turbo AI'
                            };
                            results.push(updated);
                            blockUpdates.push(updated);
                        } else {
                            results.push(vendor);
                        }
                    });

                    // ✨ INCREMENTAL SAVE (Non-Blocking)
                    if (blockUpdates.length > 0 && window.merchantDictionary) {
                        await window.merchantDictionary.bulkSaveMerchants(blockUpdates, null, false);

                        // SYNC UI (Using requestAnimationFrame for performance)
                        if (window.vendorsGridApi) {
                            requestAnimationFrame(() => {
                                window.vendorsGridApi.applyTransaction({ update: blockUpdates });
                            });
                        }
                    }

                    if (progressCallback && batch.length > 0) {
                        progressCallback(processed, vendors.length, batch[batch.length - 1].display_name);
                    }
                } catch (err) {
                    console.error('Batch block failed:', err);
                    batch.forEach(v => { results.push(v); processed++; });
                }
            });

            // Wait for this set of parallel blocks to finish
            await Promise.all(blockPromises);

            // 🛡️ EVENT LOOP YIELD: Take a tiny breather to let the UI paint and handle clicks
            await new Promise(resolve => setTimeout(resolve, 1));
        }

        return { results, successCount: results.filter(r => r.source?.includes('AI')).length, errorCount: vendors.length - results.length };
    }

    abort() {
        this.isAborted = true;
    }
}

// export const CategorizeAI = new CategorizeAI();
// export const CategorizeAI = new CategorizeAI();
window.CategorizeAI = new CategorizeAI(); // Instantiate and Expose globally
