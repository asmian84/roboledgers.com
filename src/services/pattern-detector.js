/**
 * Pattern Detection Engine
 * ========================
 * Sophisticated pattern matching for transaction classification and merchant extraction.
 * 
 * Features:
 * - Tiered detection (Regex → Dictionary → ML)
 * - E-Transfer/Interac name extraction
 * - Transaction type classification
 * - Confidence scoring
 * - Learning hooks for dictionary integration
 * 
 * @module PatternDetector
 */

// ============================================
// PATTERN DEFINITIONS
// ============================================

const PATTERNS = {
    // E-Transfer Patterns (High Priority)
    etransfer: {
        patterns: [
            // E-TRANSFER#10152052664 Adnan Dalekoriy 4506********188
            /E-TRANSFER[#\s]*(\d+)\s+(.+?)\s+\d{4}\*+\d+/i,
            // E TRANSFER 10152052664 Name Here
            /E[\s\-]?TRANSFER[#\s]*(\d+)\s+(.+?)(?:\s+\d{4}|\s*$)/i,
            // INTERAC E-TRANSFER Name
            /INTERAC\s+E[\s\-]?TRANSFER\s+(?:FROM\s+|TO\s+)?(.+)/i,
            // INTERAC e-Transfer - Name
            /INTERAC\s+(.+?)(?:\s+\d{4}|\s*$)/i,
        ],
        type: 'etransfer',
        extractName: true,
        defaultCategory: 'E-Transfer'
    },

    // Pre-Authorized Debit
    pad: {
        patterns: [
            /PAD\s+(.+)/i,
            /PRE[\s\-]?AUTH(?:ORIZED)?\s+(?:DEBIT\s+)?(.+)/i,
            /PREAUTHORIZED\s+(.+)/i,
        ],
        type: 'pad',
        extractName: true,
        defaultCategory: 'Pre-Authorized Debit'
    },

    // Wire Transfer
    wire: {
        patterns: [
            /WIRE\s+(?:TRANSFER\s+)?(.+)/i,
            /SWIFT\s+(.+)/i,
            /TELEGRAPHIC\s+TRANSFER\s+(.+)/i,
        ],
        type: 'wire',
        extractName: true,
        defaultCategory: 'Wire Transfer'
    },

    // Cheque
    cheque: {
        patterns: [
            /CH(?:E)?QUE?[#\s]*(\d+)/i,
            /CHQ[#\s]*(\d+)/i,
            /CHECK[#\s]*(\d+)/i,
        ],
        type: 'cheque',
        extractName: false, // Cheques don't have merchant names
        defaultCategory: 'Cheque'
    },

    // Point of Sale
    pos: {
        patterns: [
            /POS\s+(.+)/i,
            /PURCHASE\s+(.+)/i,
            /RETAIL\s+PURCHASE\s+(.+)/i,
        ],
        type: 'pos',
        extractName: true,
        defaultCategory: 'Purchase'
    },

    // ATM / ABM
    atm: {
        patterns: [
            /ATM\s+(?:WITHDRAWAL\s+)?(.+)/i,
            /ABM\s+(?:WITHDRAWAL\s+)?(.+)/i,
            /CASH\s+WITHDRAWAL\s+(.+)/i,
        ],
        type: 'atm',
        extractName: true,
        defaultCategory: 'ATM Withdrawal'
    },

    // Service Fee
    fee: {
        patterns: [
            /SERVICE\s+(?:FEE|CHARGE)/i,
            /MONTHLY\s+FEE/i,
            /ACCOUNT\s+FEE/i,
            /NSF\s+FEE/i,
            /OVERDRAFT\s+FEE/i,
        ],
        type: 'fee',
        extractName: false,
        defaultCategory: 'Bank Fees'
    }
};

// ============================================
// CLEANING PATTERNS
// ============================================

const CLEANING_PATTERNS = {
    // Card masks: 4506********188, XXXX1234
    cardMask: /\d{4}[\*X]+\d{2,4}/gi,

    // Reference numbers: #12345, REF:12345
    refNumber: /(?:#|REF[:\s]*|ID[:\s]*|INV[:\s]*)\d{5,}/gi,

    // Phone numbers: 1-800-123-4567, (800) 123-4567
    phoneNumber: /(?:1[\-\s]?)?\(?\d{3}\)?[\-\s]?\d{3}[\-\s]?\d{4}/g,

    // Dates: 12/25/23, DEC 25, 25 DEC
    dates: /\b(?:\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s*\d{1,2}|\d{1,2}\s*(?:JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*)\b/gi,

    // Times: 12:45, 12:45:00
    times: /\b\d{1,2}:\d{2}(?::\d{2})?\b/g,

    // Currency amounts: $123.45, 1,234.56
    amounts: /[$€£¥]?\s*\d{1,3}(?:,\d{3})*\.?\d*\b/g,

    // Currency codes with amounts: USD14.95, CAD10.00
    currencyCodes: /\b(?:USD|CAD|EUR|GBP|AUD|NZD|CHF|JPY)\s*\d+\.?\d*/gi,

    // Exchange rates: @1.234567
    exchangeRates: /@?\s*\d+\.\d{4,}/g,

    // Store/location numbers: #123, STORE 456
    storeNumbers: /(?:#\d{1,5}\b|\bSTORE\s*\d+)/gi,

    // Legal suffixes: Inc, Ltd, Corp
    legalSuffixes: /\b(?:INC|LTD|CORP|LLC|CO|COMPANY|LIMITED|INCORPORATED)\.?\b/gi,

    // Location codes: AB, BC, ON, CA, US
    locationCodes: /\s+(?:AB|BC|MB|NB|NL|NS|NT|NU|ON|PE|QC|SK|YT|AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY|DC|USA?|CAN?)(?:\s|$)/gi,

    // Trailing suffixes from PDFs: _F, _P (from dictionary analysis - 833 occurrences)
    trailingSuffix: /\s+_[A-Z]$/gi
};

// ============================================
// GARBAGE WORDS (From Dictionary Analysis)
// ============================================
// These are common words that appear as "merchants" but are actually garbage

const GARBAGE_WORDS = [
    'brwsr',          // 1817 occurrences - browser artifact
    'send',           // 466 occurrences - incomplete transfer
    'internet',       // 392 occurrences - too generic
    'exchange rate',  // 301 occurrences - not a merchant
    'type',           // 163 occurrences - PDF artifact
    'email',          // 147 occurrences - too generic
    'cap',            // 82 occurrences - incomplete capture
    'sq',             // 76 occurrences - Square prefix (needs full)
    'mb-trans',       // 69 occurrences - bank code
    'pc-trans',       // 78 occurrences - bank code
    'pre-authorized', // 70 occurrences - classification not name
    'trsf from/de',   // 63 occurrences - transfer code
    'pc - payment',   // 67 occurrences - bank code
    'www'             // Common web prefix
];

// ============================================
// TD BANK SPECIFIC PATTERNS (From Dictionary)
// ============================================

const TD_PATTERNS = {
    atmWithdrawal: {
        pattern: /TD\s+ATM\s+W\/D\s*(.*)?/i,
        type: 'atm',
        extractLocation: true,
        defaultName: 'TD ATM Withdrawal'
    },
    atmDeposit: {
        pattern: /TD\s+ATM\s+DEP\s*(.*)?/i,
        type: 'deposit',
        extractLocation: true,
        defaultName: 'TD ATM Deposit'
    },
    transfer: {
        pattern: /TRSF\s+(?:FROM|DE)\s+ACCT\/CPT/i,
        type: 'transfer',
        defaultName: 'TD Internal Transfer'
    }
};

// ============================================
// PATTERN DETECTOR CLASS
// ============================================

class PatternDetector {
    constructor() {
        this.patterns = PATTERNS;
        this.cleaningPatterns = CLEANING_PATTERNS;
        this.stats = {
            detected: 0,
            etransfers: 0,
            purchases: 0,
            fees: 0,
            unclassified: 0
        };
    }

    /**
     * Detect transaction type and extract merchant/person name
     * @param {string} description - Raw transaction description
     * @returns {Object} Detection result with type, name, confidence
     */
    detect(description) {
        if (!description || typeof description !== 'string') {
            return this._createResult('unknown', '', 0);
        }

        const cleanDesc = description.trim();

        // Try each pattern category
        for (const [category, config] of Object.entries(this.patterns)) {
            for (const pattern of config.patterns) {
                const match = cleanDesc.match(pattern);
                if (match) {
                    this.stats.detected++;

                    // Extract name if pattern supports it
                    let extractedName = '';
                    if (config.extractName && match.length > 1) {
                        // Get the last capture group (usually the name)
                        extractedName = match[match.length - 1] || match[1];
                        extractedName = this.cleanMerchantName(extractedName);
                    }

                    // Update stats
                    if (category === 'etransfer') this.stats.etransfers++;
                    else if (category === 'fee') this.stats.fees++;
                    else this.stats.purchases++;

                    return this._createResult(
                        config.type,
                        extractedName,
                        0.9, // High confidence for regex match
                        config.defaultCategory,
                        {
                            pattern: category,
                            matchedText: match[0],
                            referenceNumber: category === 'etransfer' ? match[1] : null
                        }
                    );
                }
            }
        }

        // No pattern matched - extract merchant name and classify as unknown
        this.stats.unclassified++;
        const merchantName = this.cleanMerchantName(cleanDesc);

        return this._createResult(
            'unknown',
            merchantName,
            0.5, // Low confidence for unclassified
            'Uncategorized'
        );
    }

    /**
     * Clean merchant name by removing garbage patterns
     * @param {string} name - Raw merchant name
     * @returns {string} Cleaned merchant name
     */
    cleanMerchantName(name) {
        if (!name) return '';

        let clean = name;

        // Apply all cleaning patterns
        for (const pattern of Object.values(this.cleaningPatterns)) {
            clean = clean.replace(pattern, ' ');
        }

        // Remove leading/trailing garbage
        clean = clean.replace(/^[\s\-\*\#\@\!\.\,\:\;\'\"]+/, '');
        clean = clean.replace(/[\s\-\*\#\@\!\.\,\:\;\'\"]+$/, '');

        // Collapse multiple spaces
        clean = clean.replace(/\s+/g, ' ').trim();

        // Check if result is a garbage word
        if (this.isGarbageWord(clean)) {
            return ''; // Return empty to signal garbage
        }

        // Title case if all caps
        if (clean === clean.toUpperCase() && clean.length > 2) {
            clean = clean.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
        }

        // Length check - real names are rarely > 45 chars
        if (clean.length > 45) {
            // Try to extract first meaningful part
            const parts = clean.split(/\s+/);
            clean = parts.slice(0, 3).join(' ');
        }

        return clean;
    }

    /**
     * Check if a merchant name is a known garbage word
     * @param {string} name - Merchant name to check
     * @returns {boolean} True if garbage
     */
    isGarbageWord(name) {
        if (!name || name.length < 2) return true;
        const lower = name.toLowerCase().trim();
        return GARBAGE_WORDS.some(g => lower === g || lower.startsWith(g + ' '));
    }

    /**
     * Batch detect multiple transactions
     * @param {Array<string>} descriptions - Array of transaction descriptions
     * @returns {Array<Object>} Array of detection results
     */
    detectBatch(descriptions) {
        return descriptions.map(desc => this.detect(desc));
    }

    /**
     * Get detection statistics
     * @returns {Object} Statistics object
     */
    getStats() {
        return { ...this.stats };
    }

    /**
     * Reset statistics
     */
    resetStats() {
        this.stats = {
            detected: 0,
            etransfers: 0,
            purchases: 0,
            fees: 0,
            unclassified: 0
        };
    }

    /**
     * Create standardized result object
     * @private
     */
    _createResult(type, name, confidence, category = 'Unknown', metadata = {}) {
        return {
            type,
            merchantName: name,
            confidence,
            category,
            metadata,
            timestamp: new Date().toISOString()
        };
    }

    /**
     * Add custom pattern
     * @param {string} category - Pattern category name
     * @param {Object} config - Pattern configuration
     */
    addPattern(category, config) {
        this.patterns[category] = {
            patterns: config.patterns || [],
            type: config.type || category,
            extractName: config.extractName !== false,
            defaultCategory: config.defaultCategory || category
        };
    }

    /**
     * Test a specific pattern against description
     * @param {string} description - Transaction description
     * @param {string} category - Pattern category to test
     * @returns {Object|null} Match result or null
     */
    testPattern(description, category) {
        const config = this.patterns[category];
        if (!config) return null;

        for (const pattern of config.patterns) {
            const match = description.match(pattern);
            if (match) {
                return {
                    matched: true,
                    pattern: pattern.toString(),
                    groups: match.slice(1),
                    fullMatch: match[0]
                };
            }
        }
        return { matched: false };
    }
}

// ============================================
// SINGLETON & EXPORTS
// ============================================

// Create singleton instance
const patternDetector = new PatternDetector();

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { PatternDetector, patternDetector };
}

// Export for browser/ES6
if (typeof window !== 'undefined') {
    window.PatternDetector = PatternDetector;
    window.patternDetector = patternDetector;
}

// Export for ES Modules
export { PatternDetector, patternDetector };
