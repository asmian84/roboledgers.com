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

        // Only log to console in dev mode (check localStorage flag)
        if (localStorage.getItem('ab_dev_mode') === 'true') {
            console.log(`[ProcessingEngine:${level}]`, message, data || '');
        }
    }

    /**
     * Parse files (PDF/CSV) with progress tracking
     * @param {FileList|Array} files - Files to parse
     * @param {Function} progressCallback - (current, total, message) => void
     * @returns {Promise<Array>} Parsed transactions
     */
    async parseFiles(files, progressCallback) {
        this.log('log', 'Starting file parsing', { fileCount: files.length });
        const allTransactions = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const current = i + 1;
            const total = files.length;

            progressCallback(current, total, `Processing ${file.name}...`);
            this.log('log', `Parsing file ${current}/${total}`, { filename: file.name });

            try {
                const transactions = await this._parseFile(file, (progress) => {
                    progressCallback(current, total, `${file.name}: ${progress}%`);
                });

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
        return allTransactions;
    }

    /**
     * Parse single file
     * @private
     */
    async _parseFile(file, progressCallback) {
        const ext = file.name.split('.').pop().toLowerCase();

        if (ext === 'pdf') {
            if (!window.parsePdfStatementAndActivate) {
                throw new Error('PDF parser not available');
            }
            return await window.parsePdfStatementAndActivate(file, progressCallback);

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
        this.log('log', 'Starting categorization', { count: transactions.length });

        let completed = 0;
        const total = transactions.length;

        for (let transaction of transactions) {
            // Try all 7 methods in order
            if (!transaction.category || transaction.category === 'Uncategorized') {
                transaction = await this._applyCategorization(transaction);
            }

            completed++;
            const progress = Math.round((completed / total) * 100);
            progressCallback(progress, `Categorizing... ${completed}/${total}`);
        }

        this.log('log', 'Categorization complete', {
            total: transactions.length,
            categorized: transactions.filter(t => t.category && t.category !== 'Uncategorized').length
        });

        return transactions;
    }

    /**
     * Apply all categorization methods to a single transaction
     * @private
     */
    async _applyCategorization(transaction) {
        const methods = [
            { name: 'Merchant Dictionary', fn: this._tryMerchantDictionary },
            { name: 'Pattern Detector', fn: this._tryPatternDetector },
            { name: 'Bayesian Matcher', fn: this._tryBayesianMatcher },
            { name: 'Global Vendor DB', fn: this._tryGlobalVendorDB },
            { name: 'Keyword Clusters', fn: this._tryKeywordClusters },
            { name: 'Categorization Engine', fn: this._tryCategorizationEngine },
            { name: 'Google AI + MCC', fn: this._tryGoogleAI }
        ];

        for (let method of methods) {
            try {
                const result = await method.fn.call(this, transaction);
                if (result && result.category) {
                    this.log('log', `Categorized via ${method.name}`, {
                        description: transaction.description,
                        category: result.category
                    });
                    return { ...transaction, ...result };
                }
            } catch (error) {
                this.log('warn', `Method ${method.name} failed`, { error: error.message });
            }
        }

        // No method succeeded
        this.log('warn', 'Transaction remains uncategorized', {
            description: transaction.description
        });
        return transaction;
    }

    _tryMerchantDictionary(transaction) {
        if (!window.merchantDictionary) return null;
        return window.merchantDictionary.categorize(transaction);
    }

    _tryPatternDetector(transaction) {
        if (!window.PatternDetector) return null;
        return window.PatternDetector.categorize(transaction);
    }

    _tryBayesianMatcher(transaction) {
        if (!window.BayesianMatcher) return null;
        return window.BayesianMatcher.categorize(transaction);
    }

    _tryGlobalVendorDB(transaction) {
        if (!window.globalVendorDB) return null;
        return window.globalVendorDB.lookup(transaction.description);
    }

    _tryKeywordClusters(transaction) {
        if (!window.keywordClusters) return null;
        return window.keywordClusters.match(transaction.description);
    }

    _tryCategorizationEngine(transaction) {
        if (!window.CategorizationEngine) return null;
        return window.CategorizationEngine.categorize(transaction);
    }

    async _tryGoogleAI(transaction) {
        if (!window.GoogleAICategorizer) return null;
        return await window.GoogleAICategorizer.categorize(transaction);
    }

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
window.ProcessingEngine = new ProcessingEngine();
