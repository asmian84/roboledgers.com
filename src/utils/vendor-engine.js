/**
 * Vendor Logic Engine
 * Handles normalization of transaction descriptions and auto-allocation of accounts.
 */

class VendorEngine {
    constructor() {
        this.vendors = [];
        this.commonStopWords = ['inc', 'incorporated', 'corp', 'corporation', 'ltd', 'limited', 'co', 'company', 'the'];
    }

    /**
     * Initialize the engine with latest data from storage
     */
    async init() {
        if (window.storage) {
            this.vendors = await window.storage.getVendors();
            console.log(`🧠 VendorEngine: Loaded ${this.vendors.length} vendors.`);
            this.trainBayes(); // Build the probabilistic brain
        } else {
            console.warn('⚠️ VendorEngine: Storage not available.');
        }
    }

    /**
     * CLEAN & NORMALIZE
     * Turns "UBER *TRIP 2845" -> "Uber"
     */
    normalize(rawName) {
        if (!rawName) return '';
        let cleaned = rawName.toLowerCase().trim();

        // 1. Remove ID numbers / store numbers (e.g. #1234, 123-456)
        cleaned = cleaned.replace(/#\d+/g, '');
        cleaned = cleaned.replace(/\d{3,}/g, ''); // Remove long sequences of digits

        // 2. Remove transaction junk (e.g. "POS PURCHASE", "PRE-AUTH")
        const junkPhrases = [
            'pos purchase', 'pre-auth', 'withdrawal', 'deposit',
            'bill payment', 'transfer to', 'transfer from', 'visa debit'
        ];
        junkPhrases.forEach(junk => {
            cleaned = cleaned.replace(junk, '');
        });

        // 3. Remove common separators
        cleaned = cleaned.replace(/[\*\-\_]/g, ' ');

        // 4. City/State removal (Simple heuristic: 2 letter codes at end)
        cleaned = cleaned.replace(/\s[a-z]{2}\s*$/i, '');

        // 5. Compress spaces
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // 6. Title Case for display
        return this.toTitleCase(cleaned);
    }

    /**
     * MATCH
     * Returns the matching known vendor or null
     */
    match(rawDescription) {
        if (!this.vendors.length) return null;

        const cleanDesc = this.normalize(rawDescription);
        if (!cleanDesc) return null;

        // Strategy 1: Exact Match (Case insensitive) against Vendor Name
        const exactMatch = this.vendors.find(v => v.name.toLowerCase() === cleanDesc.toLowerCase());
        if (exactMatch) return exactMatch;

        // Strategy 2: Contains Match (if Vendor Name is inside the Description)
        // e.g. Vendor "Starbucks" matches "Starbucks #2425"
        // We prioritize longer vendor names to avoid matching "Ice" to "Service"
        const containsMatch = this.vendors
            .filter(v => cleanDesc.toLowerCase().includes(v.name.toLowerCase()))
            .sort((a, b) => b.name.length - a.name.length)[0];

        if (containsMatch) return containsMatch;

        // Strategy 3: Token Match (Word Order Independence)
        // e.g. "Home Depot CA" matches "CA Home Depot"
        // Threshold: 0.8 (Very high confidence required)
        const tokenMatch = this.vendors.find(v => this.calculateTokenSimilarity(cleanDesc, v.name) > 0.8);
        if (tokenMatch) {
            console.log(`🧩 Token Match: '${cleanDesc}' matched '${tokenMatch.name}'`);
            return tokenMatch;
        }

        // Strategy 4: Fuzzy Match (Levenshtein Distance) - "The Typo Catcher"
        // e.g. "Walmrt" matches "Walmart"
        // Threshold: 0.85 (Conservative to avoid false positives)
        // We iterate and find the BEST match above threshold
        let bestFuzzyMatch = null;
        let bestScore = 0;

        for (const v of this.vendors) {
            const score = this.calculateSimilarity(cleanDesc, v.name);
            if (score > 0.85 && score > bestScore) {
                bestScore = score;
                bestFuzzyMatch = v;
            }
        }

        if (bestFuzzyMatch) {
            console.log(`🌫️ Fuzzy Match: '${cleanDesc}' matched '${bestFuzzyMatch.name}' (${Math.round(bestScore * 100)}%)`);
            return bestFuzzyMatch;
        }

        // Strategy 5: Phonetic Match (Double Metaphone) - "The Sound-Alike"
        // e.g. "Cinthia" matches "Cynthia", "Lyft" matches "Lift"
        const cleanMetaphone = this.doubleMetaphone(cleanDesc);
        if (cleanMetaphone && cleanMetaphone.length > 3) { // Min length to avoid noise
            const phoneticMatch = this.vendors.find(v => {
                const vMeta = this.doubleMetaphone(v.name);
                return vMeta && vMeta === cleanMetaphone;
            });

            if (phoneticMatch) {
                console.log(`🗣️ Phonetic Match: '${cleanDesc}' (${cleanMetaphone}) matched '${phoneticMatch.name}'`);
                return phoneticMatch;
            }
        }

        // Strategy 6: Bayesian Probabilistic Match - "The Educated Guess"
        // e.g. "Shell Station" -> "Auto & Fuel" because 'Shell' usually maps to that.
        const bayesPrediction = this.predictBayes(cleanDesc);
        if (bayesPrediction && bayesPrediction.confidence > 0.4) {
            console.log(`🔮 Bayesian Guess: '${cleanDesc}' -> ${bayesPrediction.account} (${Math.round(bayesPrediction.confidence * 100)}%)`);
            // We return a mock vendor object to fit the flow
            return {
                id: 'bayes-ghost',
                name: cleanDesc,
                defaultAccountId: bayesPrediction.account
            };
        }

        return null;
    }

    /**
     * BAYESIAN TRAINING (Layer 8)
     * Maps "Coffee" -> { "Meals": 5, "Office": 1 }
     */
    trainBayes() {
        this.bayesModel = {};
        this.categoryCounts = {};

        this.vendors.forEach(v => {
            if (!v.defaultAccountId) return;
            const category = v.defaultAccountId;

            // Count category frequency
            this.categoryCounts[category] = (this.categoryCounts[category] || 0) + 1;

            // Tokenize
            const tokens = this.normalize(v.name).split(/\s+/);
            tokens.forEach(token => {
                if (token.length < 3) return;
                if (!this.bayesModel[token]) this.bayesModel[token] = {};
                this.bayesModel[token][category] = (this.bayesModel[token][category] || 0) + 1;
            });
        });
    }

    predictBayes(text) {
        if (!this.bayesModel) return null;
        const tokens = this.normalize(text).split(/\s+/);
        const scores = {};

        tokens.forEach(token => {
            if (this.bayesModel[token]) {
                for (const [cat, count] of Object.entries(this.bayesModel[token])) {
                    // Simple probability weight
                    scores[cat] = (scores[cat] || 0) + (count * 2);
                }
            }
        });

        // Find winner
        let bestCat = null;
        let bestScore = 0;
        for (const [cat, score] of Object.entries(scores)) {
            if (score > bestScore) {
                bestScore = score;
                bestCat = cat;
            }
        }

        return bestCat ? { account: bestCat, confidence: Math.min(bestScore / 10, 0.9) } : null;
    }

    /**
     * LEVENSHTEIN DISTANCE (Fuzzy Logic)
     * Returns similarity score 0.0 to 1.0
     */
    calculateSimilarity(s1, s2) {
        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;
        if (longer.length === 0) return 1.0;
        const editDistance = this.levenshtein(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    }

    levenshtein(a, b) {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
        return matrix[b.length][a.length];
    }

    /**
     * TOKEN SIMILARITY (Word Order Logic)
     * Jaccard Index for words
     */
    calculateTokenSimilarity(s1, s2) {
        const set1 = new Set(s1.split(/\s+/));
        const set2 = new Set(s2.split(/\s+/));

        let intersection = 0;
        set1.forEach(item => { if (set2.has(item)) intersection++; });

        const union = new Set([...set1, ...set2]).size;
        return intersection / union;
    }

    /**
     * DOUBLE METAPHONE (Simplified for JS)
     */
    doubleMetaphone(str) {
        if (!str) return '';
        let s = str.toUpperCase().replace(/[^A-Z]/g, '');
        if (s.length < 1) return '';

        const firstChar = s[0];
        s = firstChar + s.slice(1).replace(/[AEIOUY]/g, ''); // Drop non-initial vowels

        // Classic Soundex/Metaphone simplifications
        s = s.replace(/PH/g, 'F').replace(/GHT/g, 'T').replace(/CK/g, 'K');
        s = s.replace(/[CZ]/g, 'S').replace(/DG/g, 'J').replace(/KN/g, 'N');
        s = s.replace(/(.)\1+/g, '$1'); // Dedupe

        return s;
    }

    /**
     * BATCH PROCESS
     * Scan an array of transactions and apply assignments
     */
    processTransactions(transactions) {
        let matchCount = 0;
        const processed = transactions.map(txn => {
            // If already categorized, skip
            if (txn.accountDescription && txn.accountDescription !== 'Uncategorized') {
                return txn;
            }

            // 1. Check Local Dictionary (User Rules) - HIGHEST PRIORITY
            const match = this.match(txn.description);
            if (match && match.defaultAccountId) {
                // Find account name from ID (using global cache or lookup?)
                // For now, we assume the vendor stores the Account Name or ID.
                matchCount++;
                return {
                    ...txn,
                    accountDescription: match.defaultAccountId, // Using standard property for Category
                    vendorId: match.id,
                    _isAutoCategorized: true
                };
            }

            // 2. Check Smart Matcher (Regex/AI Patterns) - FALLBACK
            if (window.SmartMatcher) {
                const prediction = window.SmartMatcher.predict(txn.description);
                if (prediction && prediction.accountName) {
                    console.log(`🤖 SmartMatcher: Assigned '${txn.description}' -> ${prediction.accountName} (${prediction.rule})`);
                    matchCount++;
                    // Optional: Normalization
                    // txn.description = prediction.name; 
                    return {
                        ...txn,
                        accountDescription: prediction.accountName,
                        _isAutoCategorized: true // Trigger Magic Wand
                    };
                }
            }

            return txn;
        });

        console.log(`✨ VendorEngine: Auto-categorized ${matchCount} transactions.`);
        return processed;
    }

    toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    }

    /**
     * LEARN
     * Saves a rule: "When I see [Vendor], categorize as [Account]"
     */
    async learn(rawDescription, accountId) {
        if (!window.storage) return;

        const cleanName = this.normalize(rawDescription);
        if (!cleanName) return;

        // Check if vendor exists
        let vendor = this.match(rawDescription);

        if (vendor) {
            // Update existing vendor
            // Only update if defaultAccountId is different (to avoid redundant writes)
            if (vendor.defaultAccountId !== accountId) {
                await window.storage.updateVendor(vendor.id, { defaultAccountId: accountId });
                console.log(`🧠 VendorEngine: Updated rule for '${vendor.name}' -> ${accountId}`);
            }
        } else {
            // Create new vendor
            // We assume 'category' (Merchant Category Code) is unknown for now.
            const newVendor = {
                name: cleanName,
                defaultAccountId: accountId,
                category: ''
            };
            await window.storage.createVendor(newVendor);
            console.log(`🧠 VendorEngine: Learned new vendor '${cleanName}' -> ${accountId}`);
        }

        // Refresh local cache
        await this.init();
    }
    /**
     * CLUSTERING (Layer 7 - Unsupervised)
     * Groups unknown transactions into "Clusters" to find patterns.
     * Uses a simple "Leader Algorithm" with Token Similarity.
     */
    clusterUncategorized(transactions) {
        const clusters = [];
        const threshold = 0.7; // Lower threshold for discovery

        transactions.forEach(txn => {
            if (txn.accountDescription && txn.accountDescription !== 'Uncategorized') return;
            const clean = this.normalize(txn.description);
            if (!clean) return;

            // Try to fit into an existing cluster
            let matched = false;
            for (const cluster of clusters) {
                // Check similarity with the "Leader" (first item)
                const score = this.calculateTokenSimilarity(clean, cluster.leader);
                if (score > threshold) {
                    cluster.members.push(txn);
                    cluster.count++;
                    matched = true;
                    break;
                }
            }

            // If no fit, create new cluster
            if (!matched) {
                clusters.push({
                    leader: clean,
                    count: 1,
                    members: [txn]
                });
            }
        });

        // Return only significant clusters, sorted by size
        return clusters
            .filter(c => c.count > 1)
            .sort((a, b) => b.count - a.count);
    }
}

// Export singleton
window.VendorEngine = new VendorEngine();
