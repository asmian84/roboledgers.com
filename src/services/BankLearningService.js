/**
 * Bank Learning Service
 * Learns and persists user's manual bank selections for future auto-detection
 * 
 * Features:
 * - Statement fingerprinting (SHA-256 + text signature)
 * - Fuzzy matching (85% similarity threshold)
 * - localStorage persistence
 * - Upload count tracking
 */
class BankLearningService {
    constructor() {
        this.storageKey = 'ab_bank_learning';
        this.version = 2;
        this.data = this.load();
    }

    /**
     * Load learned associations from localStorage
     */
    load() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.version === this.version) {
                    console.log(`[LEARNING] Loaded ${parsed.statements?.length || 0} learned associations`);
                    return parsed;
                }
            }
        } catch (err) {
            console.warn('[LEARNING] Failed to load:', err);
        }

        return {
            version: this.version,
            statements: []
        };
    }

    /**
     * Save to localStorage
     */
    save() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
            console.log(`[LEARNING] Saved ${this.data.statements.length} associations`);
        } catch (err) {
            console.error('[LEARNING] Failed to save:', err);
        }
    }

    /**
     * Generate fingerprint from statement text
     */
    async generateFingerprint(text, filename) {
        // 1. Header signature (first 500 chars, normalized)
        const header = text.substring(0, 500).toLowerCase().replace(/\s+/g, ' ').trim();

        // 2. Line count (range bucket for fuzzy matching)
        const lineCount = text.split('\n').length;
        const linePattern = `${Math.floor(lineCount / 50) * 50}-${Math.ceil(lineCount / 50) * 50}`;

        // 3. Detect date format pattern
        let dateFormat = 'unknown';
        if (/jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov\s+\d{1,2}/i.test(text)) {
            dateFormat = 'MMM DD';
        } else if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) {
            dateFormat = 'MM/DD/YYYY';
        } else if (/\d{4}-\d{2}-\d{2}/.test(text)) {
            dateFormat = 'YYYY-MM-DD';
        }

        // 4. Simple hash of header (no crypto needed, just consistency)
        const headerHash = this.simpleHash(header);

        return {
            headerHash: headerHash,
            textSignature: header.substring(0, 200), // First 200 chars for fuzzy matching
            linePattern: linePattern,
            dateFormat: dateFormat,
            filename: filename ? filename.toLowerCase() : ''
        };
    }

    /**
     * Simple string hash (not cryptographic, just for consistency)
     */
    simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(36);
    }

    /**
     * Calculate similarity between two fingerprints (0-100)
     */
    calculateSimilarity(fp1, fp2) {
        let score = 0;

        // Header hash exact match = 50 points
        if (fp1.headerHash === fp2.headerHash) {
            score += 50;
        }

        // Text signature similarity (Levenshtein distance)
        const distance = this.levenshteinDistance(fp1.textSignature, fp2.textSignature);
        const maxLen = Math.max(fp1.textSignature.length, fp2.textSignature.length);
        const similarity = 1 - (distance / maxLen);
        score += similarity * 30; // Up to 30 points

        // Line pattern match = 10 points
        if (fp1.linePattern === fp2.linePattern) {
            score += 10;
        }

        // Date format match = 10 points
        if (fp1.dateFormat === fp2.dateFormat) {
            score += 10;
        }

        return Math.round(score);
    }

    /**
     * Levenshtein distance (edit distance between strings)
     */
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

    /**
     * Learn a new association
     */
    learn(fingerprint, userChoice) {
        // Check if similar fingerprint already exists
        for (const statement of this.data.statements) {
            const similarity = this.calculateSimilarity(fingerprint, statement.fingerprint);
            if (similarity >= 85) {
                // Update existing
                statement.userChoice = userChoice;
                statement.uploadCount++;
                statement.lastUpdated = new Date().toISOString();
                console.log(`[LEARNING] Updated existing association (${similarity}% match), upload count: ${statement.uploadCount}`);
                this.save();
                return;
            }
        }

        // Create new association
        this.data.statements.push({
            fingerprint: fingerprint,
            userChoice: userChoice,
            uploadCount: 1,
            learned: new Date().toISOString(),
            lastUpdated: new Date().toISOString()
        });

        console.log(`[LEARNING] Learned new association: ${userChoice.brand} ${userChoice.accountType}`);
        this.save();
    }

    /**
     * Recall a learned association
     */
    recall(fingerprint) {
        let bestMatch = null;
        let bestScore = 0;

        for (const statement of this.data.statements) {
            const similarity = this.calculateSimilarity(fingerprint, statement.fingerprint);
            if (similarity >= 85 && similarity > bestScore) {
                bestScore = similarity;
                bestMatch = statement;
            }
        }

        if (bestMatch) {
            console.log(`[LEARNING] Recalled association: ${bestMatch.userChoice.brand} ${bestMatch.userChoice.accountType} (${bestScore}% match)`);
            return {
                ...bestMatch.userChoice,
                uploadCount: bestMatch.uploadCount,
                similarity: bestScore
            };
        }

        return null;
    }

    /**
     * Forget a learned association
     */
    forget(fingerprint) {
        const initialLength = this.data.statements.length;
        this.data.statements = this.data.statements.filter(stmt => {
            const similarity = this.calculateSimilarity(fingerprint, stmt.fingerprint);
            return similarity < 85;
        });

        if (this.data.statements.length < initialLength) {
            console.log('[LEARNING] Forgot association');
            this.save();
            return true;
        }

        return false;
    }

    /**
     * Clear all learned associations
     */
    clear() {
        this.data.statements = [];
        this.save();
        console.log('[LEARNING] Cleared all associations');
    }

    /**
     * Get statistics
     */
    getStats() {
        const brands = {};
        for (const stmt of this.data.statements) {
            const key = stmt.userChoice.brand;
            brands[key] = (brands[key] || 0) + 1;
        }

        return {
            totalLearned: this.data.statements.length,
            byBrand: brands,
            averageUploads: this.data.statements.reduce((sum, s) => sum + s.uploadCount, 0) / this.data.statements.length || 0
        };
    }
}

// Expose to window for file:// compatibility
window.BankLearningService = BankLearningService;
window.bankLearningService = new BankLearningService();
