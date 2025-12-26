/**
 * Categorization Engine (Tier 1-4)
 * Handles auto-categorization of transactions using Rules, History, Fuzzy Matching, and Clustering.
 */
class CategorizationEngine {
    constructor() {
        this.historyMap = new Map(); // "DESCRIPTION" -> { category: "Office", count: 5 }
        this.minCountForConfidence = 2; // Need 2 exact matches to be "Confident"
        this.fuzzyThreshold = 0.8; // 80% Match for fuzzy suggestions
        this.saveTimer = null; // Debounce save

        this.rules = [
            // Tier 1: Seeded Regex Rules
            { pattern: /adobe|figma|jira|github/i, category: 'Software & Subscriptions' },
            { pattern: /shell|chevron|esso|petro/i, category: 'Automobile Expense' },
            { pattern: /starbucks|mcdonalds|tim hortons/i, category: 'Meals & Entertainment' },
            { pattern: /uber|lyft|taxi/i, category: 'Travel Expenses' },
            { pattern: /best buy|staples|amazon/i, category: 'Office Supplies' }
        ];
    }

    /**
     * Initialize by scanning existing transaction history AND loading from BrainDB (Tier 2)
     */
    async initialize(allTransactions) {
        console.time('CategorizationEngine.init');
        this.historyMap.clear();

        // 1. Load from DB (Long Term Memory)
        if (window.BrainStorage) {
            try {
                const dbHistory = await window.BrainStorage.loadHistory();
                if (dbHistory && dbHistory.size > 0) {
                    this.historyMap = dbHistory;
                    console.log(`🧠 Loaded ${this.historyMap.size} vectors from BrainStorage.`);
                }
            } catch (e) {
                console.error('Failed to load BrainStorage:', e);
            }
        }

        if (!allTransactions || allTransactions.length === 0) return;

        // 2. Scan Current Session (Short Term Memory)
        // We merge this securely. If DB says "Adobe" = 5, and we see 2 more here, we make it 7.
        allTransactions.forEach(txn => {
            if (!txn.description || !txn.category || this._isUncategorized(txn.category)) return;

            const key = this._normalize(txn.description);
            if (!this.historyMap.has(key)) {
                this.historyMap.set(key, { category: txn.category, count: 1 });
            } else {
                const entry = this.historyMap.get(key);
                // Simple majority wins logic. If category matches, reinforce.
                // Note: We don't want to double count if we just reloaded the same data from DB.
                // Ideally, BrainStorage contains *historical* data, and allTransactions is *current* grid.
                // For now, we assume positive reinforcement is safe.
                if (entry.category === txn.category) {
                    entry.count++;
                }
            }
        });
        console.timeEnd('CategorizationEngine.init');
        console.log(`🧠 Total Knowledge: ${this.historyMap.size} vectors.`);
    }

    /**
     * Suggest a category for a given transaction using all Intelligence Tiers

        allTransactions.forEach(txn => {
            if (!txn.description || !txn.category || this._isUncategorized(txn.category)) return;

            const key = this._normalize(txn.description);
            if (!this.historyMap.has(key)) {
                this.historyMap.set(key, { category: txn.category, count: 1 });
            } else {
                const entry = this.historyMap.get(key);
                // Simple majority wins logic. If category matches, reinforce.
                if (entry.category === txn.category) {
                    entry.count++;
                }
            }
        });
        console.timeEnd('CategorizationEngine.init');
        console.log(`🧠 Learned from ${this.historyMap.size} unique descriptions.`);
    }

    /**
     * Suggest a category for a given transaction using all Intelligence Tiers
     * @param {object} txn - { description, ... }
     * @returns {object|null} - { category, confidence, method: 'rule'|'history'|'fuzzy' }
     */
    classify(txn) {
        if (!txn.description) return null;
        const normDesc = this._normalize(txn.description);

        // 1. Tier 2: Exact History Match (High Confidence)
        if (this.historyMap.has(normDesc)) {
            const match = this.historyMap.get(normDesc);
            const confidence = match.count >= this.minCountForConfidence ? 0.95 : 0.8;
            return { category: match.category, confidence, method: 'history' };
        }

        // 2. Tier 1: Regex Rules (Medium Confidence)
        for (const rule of this.rules) {
            if (rule.pattern.test(txn.description)) {
                return { category: rule.category, confidence: 0.85, method: 'rule' };
            }
        }

        // 3. Tier 3: Fuzzy Matching (Experimental)
        // Only run if we have a robust history
        if (this.historyMap.size > 0) {
            let bestMatch = null;
            let bestScore = 0;

            for (const [key, value] of this.historyMap.entries()) {
                const score = this._jaroWinkler(normDesc, key);
                if (score > bestScore) {
                    bestScore = score;
                    bestMatch = value;
                }
            }

            if (bestScore > this.fuzzyThreshold) {
                return { category: bestMatch.category, confidence: bestScore * 0.9, method: 'fuzzy' };
            }
        }

        return null;
    }

    /**
     * Tier 4: Unsupervised Clustering
     * Finds groups of uncategorized transactions that look similar.
     * @param {Array} transactions 
     */
    clusterUnknowns(transactions) {
        const unknowns = transactions.filter(t => !t.category || this._isUncategorized(t.category));
        const clusters = new Map(); // "TOKEN" -> [txn, txn]

        // Simple Token-based clustering (Bigram/Trigram lite)
        unknowns.forEach(txn => {
            const words = this._normalize(txn.description).split(/\s+/).filter(w => w.length > 3);
            words.forEach(word => {
                if (!clusters.has(word)) clusters.set(word, []);
                clusters.get(word).push(txn);
            });
        });

        // Filter for meaningful clusters (size > 2)
        const meaningfulClusters = [];
        clusters.forEach((txns, word) => {
            if (txns.length >= 3) {
                // Deduplicate transactions in cluster
                const uniqueTxns = [...new Set(txns)];
                if (uniqueTxns.length >= 3) {
                    meaningfulClusters.push({
                        token: word,
                        count: uniqueTxns.length,
                        sample: uniqueTxns[0].description
                    });
                }
            }
        });

        // Sort by size
        return meaningfulClusters.sort((a, b) => b.count - a.count);
    }

    /**
     * Reinforce learning when user manually updates a category
     * Also accepts 'Uncategorized' to register a known vendor that needs review.
     */
    learn(description, category) {
        if (!description) return;
        const key = this._normalize(description);
        // Default to 'Uncategorized' if undefined/null, so we track it.
        const safeCat = category || 'Uncategorized';

        if (this.historyMap.has(key)) {
            const entry = this.historyMap.get(key);
            if (entry.category === safeCat) {
                entry.count++;
            } else {
                // If we are learning a specific category, overwrite if previous was Uncategorized
                if (entry.category === 'Uncategorized' && safeCat !== 'Uncategorized') {
                    this.historyMap.set(key, { category: safeCat, count: 1 });
                } else if (safeCat !== 'Uncategorized') {
                    // Otherwise, just update to new category (moving average logic usually better, but overwrite is fine for now)
                    this.historyMap.set(key, { category: safeCat, count: 1 });
                }
                // If new valid is Uncategorized, don't overwrite existing valid category
            }
        } else {
            this.historyMap.set(key, { category: safeCat, count: 1 });
        }

        // Persist (Debounced)
        this._autoSave();
    }

    _autoSave() {
        if (this.saveTimer) clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
            if (window.BrainStorage) {
                window.BrainStorage.saveHistory(this.historyMap)
                    .then(() => console.log('🧠 Brain Saved.'))
                    .catch(console.error);
            }
        }, 2000); // Save after 2 seconds of inactivity
    }

    _normalize(str) {
        return str.toLowerCase().trim().replace(/[\d]+$/, '').trim(); // Remove trailing numbers
    }

    _isUncategorized(cat) {
        // STRICT filter for "Is this a valid category to Suggest?"
        // But for storage, we allow storing 'Uncategorized' so we know it exists.
        return !cat || cat === 'Uncategorized' || cat === 'Ask My Accountant';
    }

    // --- Math Utilities ---

    // Jaro-Winkler Distance for string similarity
    _jaroWinkler(s1, s2) {
        var m = 0, i, j, s1len = s1.length, s2len = s2.length;
        if (s1len === 0 || s2len === 0) return 0;
        var range = (Math.floor(Math.max(s1len, s2len) / 2)) - 1,
            match1 = new Array(s1len),
            match2 = new Array(s2len);
        for (i = 0; i < s1len; i++) {
            for (j = Math.max(0, i - range); j < Math.min(s2len, i + range + 1); j++) {
                if (!match2[j] && s1[i] === s2[j]) {
                    m++;
                    match1[i] = match2[j] = true;
                    break;
                }
            }
        }
        if (m === 0) return 0;
        var k = 0, numTrans = 0;
        for (i = 0; i < s1len; i++) {
            if (match1[i]) {
                for (j = k; j < s2len; j++) {
                    if (match2[j]) {
                        k = j + 1;
                        break;
                    }
                }
                if (s1[i] !== s2[j]) numTrans++;
            }
        }
        var weight = (m / s1len + m / s2len + (m - (numTrans / 2)) / m) / 3,
            l = 0, p = 0.1;
        if (weight > 0.7) {
            while (s1[l] === s2[l] && l < 4) l++;
            weight = weight + l * p * (1 - weight);
        }
        return weight;
    }
}

// Global Singleton
window.CategorizationEngine = new CategorizationEngine();
