/**
 * Pattern Rules Database
 * ======================
 * Configurable pattern rules for transaction detection.
 * These rules can be extended or modified without changing core logic.
 * 
 * @module PatternRules
 */

// ============================================
// E-TRANSFER RULES
// ============================================

const ETRANSFER_RULES = {
    // Standard E-Transfer patterns
    standard: [
        {
            name: 'E-Transfer with Reference',
            pattern: /E-TRANSFER[#\s]*(\d+)\s+(.+?)\s+\d{4}\*+\d+/i,
            groups: ['referenceNumber', 'personName'],
            confidence: 0.95
        },
        {
            name: 'E-Transfer Simple',
            pattern: /E[\s\-]?TRANSFER[#\s]*(\d+)\s+(.+?)(?:\s+\d{4}|\s*$)/i,
            groups: ['referenceNumber', 'personName'],
            confidence: 0.90
        }
    ],

    // Interac-specific patterns
    interac: [
        {
            name: 'Interac E-Transfer From/To',
            pattern: /INTERAC\s+E[\s\-]?TRANSFER\s+(?:FROM\s+|TO\s+)(.+)/i,
            groups: ['personName'],
            confidence: 0.92
        },
        {
            name: 'Interac Generic',
            pattern: /INTERAC\s+(.+?)(?:\s+\d{4}|\s*$)/i,
            groups: ['personName'],
            confidence: 0.85
        }
    ],

    // Autodeposit patterns
    autodeposit: [
        {
            name: 'E-Transfer Autodeposit',
            pattern: /E[\s\-]?TRANSFER\s+AUTO[\s\-]?DEPOSIT\s+(.+)/i,
            groups: ['personName'],
            confidence: 0.88
        }
    ]
};

// ============================================
// BANK-SPECIFIC RULES
// ============================================

const BANK_RULES = {
    rbc: [
        {
            name: 'RBC E-Transfer Pattern',
            pattern: /INTERAC\s+E-TRF\s+(.+)/i,
            groups: ['personName'],
            type: 'etransfer',
            confidence: 0.90
        }
    ],
    td: [
        {
            name: 'TD E-Transfer Pattern',
            pattern: /INTERACeTransfer\s+(.+)/i,
            groups: ['personName'],
            type: 'etransfer',
            confidence: 0.90
        }
    ],
    bmo: [
        {
            name: 'BMO E-Transfer Pattern',
            pattern: /E-Transfer\s+(.+?)\s+Ref/i,
            groups: ['personName'],
            type: 'etransfer',
            confidence: 0.90
        }
    ],
    scotia: [
        {
            name: 'Scotia E-Transfer Pattern',
            pattern: /INTERAC\s+ETRANSFER\s+(.+)/i,
            groups: ['personName'],
            type: 'etransfer',
            confidence: 0.90
        }
    ],
    cibc: [
        {
            name: 'CIBC E-Transfer Pattern',
            pattern: /INTERAC\s+E-TRANSFER\s+(.+)/i,
            groups: ['personName'],
            type: 'etransfer',
            confidence: 0.90
        }
    ]
};

// ============================================
// PAYMENT TYPE RULES
// ============================================

const PAYMENT_TYPE_RULES = {
    pad: {
        keywords: ['PAD', 'PRE-AUTH', 'PREAUTHORIZED', 'PREAUTH'],
        patterns: [
            /PAD\s+(.+)/i,
            /PRE[\s\-]?AUTH(?:ORIZED)?\s+(?:DEBIT\s+)?(.+)/i
        ],
        category: 'Pre-Authorized Debit',
        confidence: 0.88
    },

    wire: {
        keywords: ['WIRE', 'SWIFT', 'TELEGRAPHIC'],
        patterns: [
            /WIRE\s+(?:TRANSFER\s+)?(.+)/i,
            /SWIFT\s+(.+)/i
        ],
        category: 'Wire Transfer',
        confidence: 0.90
    },

    cheque: {
        keywords: ['CHQ', 'CHK', 'CHEQUE', 'CHECK'],
        patterns: [
            /CH(?:E)?QUE?[#\s]*(\d+)/i,
            /CHQ[#\s]*(\d+)/i
        ],
        category: 'Cheque',
        confidence: 0.95
    },

    pos: {
        keywords: ['POS', 'PURCHASE', 'RETAIL'],
        patterns: [
            /POS\s+(.+)/i,
            /PURCHASE\s+(.+)/i
        ],
        category: 'Purchase',
        confidence: 0.75 // Lower confidence, common pattern
    },

    atm: {
        keywords: ['ATM', 'ABM', 'CASH WITHDRAWAL'],
        patterns: [
            /ATM\s+(?:WITHDRAWAL\s+)?(.+)/i,
            /ABM\s+(?:WITHDRAWAL\s+)?(.+)/i
        ],
        category: 'ATM Withdrawal',
        confidence: 0.92
    },

    fee: {
        keywords: ['FEE', 'CHARGE', 'MONTHLY FEE', 'SERVICE CHARGE'],
        patterns: [
            /SERVICE\s+(?:FEE|CHARGE)/i,
            /MONTHLY\s+FEE/i,
            /NSF\s+FEE/i
        ],
        category: 'Bank Fees',
        confidence: 0.95,
        noMerchant: true // Fees don't have merchants
    }
};

// ============================================
// GARBAGE PATTERNS (DELETE ROWS)
// ============================================

const GARBAGE_PATTERNS = {
    // Statement metadata
    statementGarbage: [
        /opening balance/i,
        /closing balance/i,
        /balance forward/i,
        /previous balance/i,
        /statement date/i,
        /account summary/i
    ],

    // Tax/legal disclaimers
    legalGarbage: [
        /taxation year/i,
        /return of capital/i,
        /foreign tax paid/i,
        /capital gain/i,
        /annual interest/i
    ],

    // Headers
    headerGarbage: [
        /^transaction date$/i,
        /^description$/i,
        /^amount$/i,
        /^balance$/i,
        /^debit$/i,
        /^credit$/i
    ]
};

// ============================================
// MERCHANT NAME NORMALIZATION
// ============================================

const NORMALIZATION_RULES = {
    // Common merchant aliases -> Normalized name
    aliases: {
        'AMZN': 'Amazon',
        'AMAZON.CA': 'Amazon',
        'AMAZON MKTPLACE': 'Amazon',
        'AMZN MKTP': 'Amazon',
        'MCDONALD': 'McDonalds',
        'MCDONALDS': 'McDonalds',
        'STARBUCKS': 'Starbucks',
        'SBUX': 'Starbucks',
        'TIMMIES': 'Tim Hortons',
        'TIM HORTON': 'Tim Hortons',
        'UBER EATS': 'Uber Eats',
        'UBER TRIP': 'Uber',
        'NETFLIX': 'Netflix',
        'SPOTIFY': 'Spotify',
        'APPLE': 'Apple',
        'GOOGLE': 'Google',
        'WALMART': 'Walmart',
        'COSTCO': 'Costco',
        'SHELL': 'Shell',
        'ESSO': 'Esso',
        'PETRO': 'Petro-Canada',
        'CDN TIRE': 'Canadian Tire'
    },

    // Suffixes to strip
    stripSuffixes: ['INC', 'LTD', 'CORP', 'LLC', 'CO', 'LIMITED', 'INCORPORATED'],

    // Common city names to strip
    stripCities: [
        'CALGARY', 'EDMONTON', 'VANCOUVER', 'TORONTO', 'MONTREAL',
        'OTTAWA', 'WINNIPEG', 'HALIFAX', 'VICTORIA', 'REGINA',
        'NEW YORK', 'LOS ANGELES', 'CHICAGO', 'SEATTLE', 'DENVER'
    ]
};

// ============================================
// EXPORTS
// ============================================

const PatternRules = {
    ETRANSFER_RULES,
    BANK_RULES,
    PAYMENT_TYPE_RULES,
    GARBAGE_PATTERNS,
    NORMALIZATION_RULES
};

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PatternRules;
}

// Export for browser
if (typeof window !== 'undefined') {
    window.PatternRules = PatternRules;
}

// Export for ES Modules
export default PatternRules;
export {
    ETRANSFER_RULES,
    BANK_RULES,
    PAYMENT_TYPE_RULES,
    GARBAGE_PATTERNS,
    NORMALIZATION_RULES
};
