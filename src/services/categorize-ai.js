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
     * Batch Analysis (Memory-Optimized)
     * Processes multiple vendors efficiently without freezing the browser
     * @param {Array} vendors - Array of vendor objects with {id, display_name, mcc_code}
     * @param {Function} progressCallback - Optional callback(processed, total, currentVendor)
     * @returns {Promise<Object>} { results: Array, successCount: number, errorCount: number }
     */
    async analyzeBatch(vendors, progressCallback = null) {
        const BATCH_SIZE = 50;
        const BATCH_DELAY = 50;

        const results = [];
        let successCount = 0;
        let errorCount = 0;
        let processed = 0;

        // Process in batches
        for (let batchStart = 0; batchStart < vendors.length; batchStart += BATCH_SIZE) {
            const batchEnd = Math.min(batchStart + BATCH_SIZE, vendors.length);
            const batch = vendors.slice(batchStart, batchEnd);

            for (const vendor of batch) {
                processed++;

                try {
                    const analysis = await this.analyze({
                        description: vendor.display_name,
                        mcc: vendor.mcc_code
                    });

                    // Check if analysis succeeded
                    if (analysis && analysis.category && analysis.gl_account) {
                        results.push({
                            id: vendor.id,
                            ...vendor,
                            industry: analysis.category.split(':')[0],
                            default_account: analysis.gl_account,
                            default_category: analysis.category,
                            categorization_confidence: analysis.confidence,
                            source: analysis.source
                        });
                        successCount++;
                    } else {
                        // Keep original vendor data if analysis failed
                        results.push(vendor);
                        errorCount++;
                        if (processed <= 5) { // Only log first 5 to avoid spam
                            console.warn(`⚠️ Analysis failed for "${vendor.display_name}":`, analysis);
                        }
                    }

                    // Progress callback (throttled every 10 items)
                    if (progressCallback && (processed % 10 === 0 || processed === vendors.length)) {
                        progressCallback(processed, vendors.length, vendor.display_name);
                    }

                } catch (err) {
                    // Keep original vendor data on error
                    results.push(vendor);
                    errorCount++;
                    console.error(`Batch error for "${vendor.display_name}":`, err.message);
                    this.logger.log('BATCH_ERROR', { vendor: vendor.display_name, error: err.message });
                }
            }

            // Breathe between batches
            if (batchEnd < vendors.length) {
                await new Promise(r => setTimeout(r, BATCH_DELAY));
            }
        }

        return { results, successCount, errorCount };
    }
}

// export const CategorizeAI = new CategorizeAI();
// export const CategorizeAI = new CategorizeAI();
window.CategorizeAI = new CategorizeAI(); // Instantiate and Expose globally
