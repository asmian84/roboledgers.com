/**
 * Processing Engine
 * Centralized background processing with zero console exposure
 */

class ProcessingEngine {
    constructor() {
        this.silent = true; // No console output to user
        this.logBuffer = []; // Internal log buffer for debugging
        this.progressCallbacks = new Map();
    }

    /**
     * Internal logging - silent to user
     * @param {string} level - log, warn, error
     * @param {string} message
     * @param {any} data
     */
    log(level, message, data = null) {
        const entry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            data
        };

        this.logBuffer.push(entry);

        // Keep buffer size reasonable (last 100 entries)
        if (this.logBuffer.length > 100) {
            this.logBuffer.shift();
        }

        // 1. Console Output (Dev Mode)
        if (localStorage.getItem('ab_dev_mode') === 'true') {
            console.log(`[ProcessingEngine:${level}]`, message, data || '');
        }

        // 2. Dispatch to Visual Debug Console
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ab-debug-log', { detail: entry }));
        }
    }

    /**
     * Parse files (PDF/CSV) with progress tracking
     * @param {FileList|Array} files - Files to parse
     * @param {Function} progressCallback - (current, total, message) => void
     * @returns {Promise<Array>} Parsed transactions
     */
    async parseFiles(files, progressCallback) {
        console.time('ProcessingEngine.parseFiles');
        this.log('log', 'Starting file parsing', { fileCount: files.length });
        const allTransactions = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const current = i + 1;
            const total = files.length;

            progressCallback(current, total, `Processing ${file.name}...`);
            this.log('log', `Parsing file ${current}/${total}`, { filename: file.name });

            try {
                const startTime = performance.now();
                const transactions = await this._parseFile(file, (progress) => {
                    progressCallback(current, total, `${file.name}: ${progress}%`);
                });
                const endTime = performance.now();
                console.log(`[ProcessingEngine] Parsed ${file.name} in ${(endTime - startTime).toFixed(2)}ms (${transactions.length} txns)`);

                allTransactions.push(...transactions);
                this.log('log', `File parsed successfully`, {
                    filename: file.name,
                    count: transactions.length
                });

            } catch (error) {
                this.log('error', `Failed to parse file`, {
                    filename: file.name,
                    error: error.message
                });
                // Don't throw - continue with other files
                progressCallback(current, total, `Error: ${file.name} (skipped)`);
            }
        }

        this.log('log', 'File parsing complete', { totalTransactions: allTransactions.length });
        console.timeEnd('ProcessingEngine.parseFiles');

        // Return structured result instead of just array
        return {
            transactions: allTransactions,
            openingBalance: allTransactions.openingBalance || 0
        };
    }

    /**
     * Parse single file
     * @private
     */
    async _parseFile(file, progressCallback) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'pdf') {
            // Use NEW AI-powered parser via DataJunkie
            if (!window.dataJunkie) {
                console.warn('⚠️ DataJunkie not available, falling back to old parser');
                if (!window.parsePdfStatementAndActivate) {
                    throw new Error('PDF parser not available');
                }
                return await window.parsePdfStatementAndActivate(file, progressCallback);
            }

            progressCallback(50);
            const result = await window.dataJunkie.scanAndProcess(file);
            progressCallback(100);

            // Adapt result format to expected structure
            if (result.skipped) {
                console.warn(`⚠️ File skipped: ${result.reason}`);
                return [];
            }

            // DEBUG: Check brand metadata from DataJunkie
            console.group('🔍 [ProcessingEngine] Brand Metadata Check');
            console.log('result.brandDetection:', result.brandDetection);
            console.log('First transaction:', result.transactions?.[0]);
            console.log('Opening Balance:', result.openingBalance);
            console.groupEnd();

            const txns = result.transactions || [];
            // Attach opening balance to the array as a hidden property to avoid breaking simpler logic
            txns.openingBalance = result.openingBalance || 0;
            return txns;

        } else if (ext === 'csv') {
            if (!window.SmartCsvParser) {
                throw new Error('CSV parser not available');
            }
            return await window.SmartCsvParser.parse(file, progressCallback);

        } else {
            throw new Error(`Unsupported file type: ${ext}`);
        }
    }

    /**
     * Categorize transactions using all 7 methods
     * @param {Array} transactions - Transactions to categorize
     * @param {Function} progressCallback - (progress, message) => void
     * @returns {Promise<Array>} Categorized transactions
     */
    async categorizeTransactions(transactions, progressCallback) {
        console.time('ProcessingEngine.categorizeTransactions');
        this.log('log', 'Starting categorization', { count: transactions.length });

        // Fetch vendors for the 7-step engine
        const vendors = await window.storage.getVendors();

        let completed = 0;
        const total = transactions.length;

        try {
            for (let transaction of transactions) {
                // Process if empty, Uncategorized, OR sitting in Suspense (9970)
                if (!transaction.accountId || transaction.accountId === 'Uncategorized' || transaction.accountId === '9970' || !transaction.vendorId) {
                    // 7-Step Smart Categorization Logic
                    // Now ASYNC to support AI calls
                    const startTime = performance.now();
                    const descToMatch = transaction.description || transaction.Description || '';

                    if (window.ProcessingEngine) {
                        window.ProcessingEngine.log('info', `[AutoCat] Starting for: "${descToMatch}"`);
                    }

                    // [DEBUG] Safety Guard
                    if (!descToMatch || descToMatch === 'undefined') {
                        if (window.ProcessingEngine) {
                            window.ProcessingEngine.log('error', '[AutoCat] Description Missing', transaction);
                        }
                    }

                    const result = await window.VendorMatcher.smartCategorize(descToMatch, vendors);

                    if (window.ProcessingEngine) {
                        window.ProcessingEngine.log('info', `[AutoCat] Match Result: ${result.vendorName}`, {
                            confidence: result.confidence,
                            method: result.method,
                            account: result.accountId
                        });
                    }

                    // [DEBUG] Live Logging Requested by User
                    console.log(`[AutoCat] Processing: "${transaction.description}"`);
                    console.log(`   -> Matched: "${result.vendorName}" (${result.confidence * 100}%)`);
                    console.log(`   -> Method: ${result.method}`);
                    console.log(`   -> Account: ${result.accountId}`);

                    const endTime = performance.now();

                    // Log individual transaction performance if it takes > 50ms
                    if (endTime - startTime > 50) {
                        console.warn(`[ProcessingEngine] Heavy categorization for "${transaction.description}": ${(endTime - startTime).toFixed(2)}ms`);
                    }

                    transaction.vendorId = result.vendorId;
                    transaction.vendorName = result.vendorName;
                    transaction.accountId = result.accountId;
                    transaction.confidence = result.confidence;
                    transaction.method = result.method;

                    // FIX: Map code to full name for Grid Display (e.g. "6300" -> "6300 - Meals")
                    const coa = JSON.parse(localStorage.getItem('ab_accounts') || '[]');
                    const match = coa.find(a => a.code === result.accountId);
                    if (match) {
                        transaction.account = `${match.code} - ${match.name}`;
                    } else if (result.accountId === '9970') {
                        transaction.account = '9970 - Suspense (Uncategorized)';
                    } else {
                        transaction.account = result.accountId;
                    }

                    // Log success
                    this.log('log', `Categorized: ${transaction.description} -> ${result.vendorName}`, {
                        method: result.method,
                        account: result.accountId
                    });
                }
            }

            completed++;
            const progress = Math.round((completed / total) * 100);

            // Frequency capping for UI updates to prevent UI thread flooding
            if (completed % 5 === 0 || completed === total) {
                progressCallback(progress, `Categorizing... ${completed}/${total}`);
                // Yield to browser periodically
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        } catch (err) {
            this.log('error', 'Categorization loop error', err);
        }

        this.log('log', 'Categorization complete', {
            total: transactions.length,
            categorized: transactions.filter(t => t.accountId).length
        });

        console.timeEnd('ProcessingEngine.categorizeTransactions');
        return transactions;
    }

    /**
     * Apply all categorization methods to a single transaction
     * @private
     * DEPRECATED: Now using unified smartCategorize in vendorMatcher.js
     */
    async _applyCategorization(transaction) {
        // Wrapper for legacy calls if any
        const vendors = await window.storage.getVendors();
        return await window.VendorMatcher.smartCategorize(transaction.description, vendors);
    }

    _tryMerchantDictionary(transaction) { return null; }
    _tryPatternDetector(transaction) { return null; }
    _tryBayesianMatcher(transaction) { return null; }
    _tryGlobalVendorDB(transaction) { return null; }
    _tryKeywordClusters(transaction) { return null; }
    _tryCategorizationEngine(transaction) { return null; }
    async _tryGoogleAI(transaction) { return null; }

    /**
     * Learn from user action (silent machine learning)
     * @param {string} action - 'category_change', 'merchant_rename', etc.
     * @param {object} data - Action-specific data
     */
    learnFromUserAction(action, data) {
        this.log('log', 'Learning from user action', { action, data });

        switch (action) {
            case 'category_change':
                if (window.BayesianMatcher && window.BayesianMatcher.train) {
                    window.BayesianMatcher.train(data.description, data.newCategory);
                }
                break;

            case 'merchant_rename':
                if (window.merchantDictionary && window.merchantDictionary.add) {
                    window.merchantDictionary.add(data.original, data.renamed);
                }
                break;

            case 'account_assignment':
                if (window.PatternDetector && window.PatternDetector.learn) {
                    window.PatternDetector.learn(data.pattern, data.account);
                }
                break;
        }
    }

    /**
     * Get internal logs (for dev/debugging)
     */
    getLogs() {
        return [...this.logBuffer];
    }

    /**
     * Clear internal logs
     */
    clearLogs() {
        this.logBuffer = [];
    }
}

// Export as global singleton
if (!window.ProcessingEngine) {
    window.ProcessingEngine = new ProcessingEngine();
}
