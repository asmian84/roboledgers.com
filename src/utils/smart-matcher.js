/**
 * Smart Matcher Utility
 * Ported and refined from legacy RoboLedger logic.
 * Provides heuristic and pattern-based categorization.
 */
class SmartMatcher {
    constructor() {
        // Map common account codes to "Intents"
        // We will resolve these codes to actual Account Names using the global COA.
        this.patterns = [
            // --- HIGH CONFIDENCE PATTERNS ---
            { regex: /wcb|workers comp/i, code: '9750' },
            { regex: /pay[-\s]?file|file\s*fee/i, code: '7700' }, // Bank Charges
            { regex: /loan\s*(payment|credit|pmt)/i, code: '2710' }, // Bank Loan
            { regex: /loan\s*interest/i, code: '7700' },
            { regex: /account\s*fee|service\s*charge|bank\s*fee/i, code: '7700' },
            { regex: /e-transfer.*sent/i, code: '8950' }, // Subcontractor (Default for sent)
            { regex: /gst.*(payable|remittance)/i, code: '2170' },
            { regex: /receiver\s*general/i, code: '2170' }, // GST/Tax usually

            // --- KEYWORD HEURISTICS ---
            { regex: /starbucks|tim horton|mcdonald|coffee|cafe|restaurant|burger/i, code: '6415' }, // Meals
            { regex: /shell|chevron|esso|petro|gas|fuel/i, code: '7400' }, // Auto Fuel
            { regex: /staples|office depot|best buy/i, code: '8600' }, // Office Supplies
            { regex: /adobe|microsoft|google.*storage|apple.*service/i, code: '1857' }, // Software/Subs
            { regex: /uber|lyft|taxi/i, code: '9200' }, // Travel
            { regex: /hotel|airbnb|booking\.com/i, code: '9200' }, // Travel
            { regex: /insurance|allstate|geico/i, code: '7600' }, // Insurance
            { regex: /hydro|fortis|enmax|epcor|utilities/i, code: '9500' }, // Utilities
            { regex: /telus|rogers|bell|shaw/i, code: '9100' }, // Telecom
            { regex: /homedepot|lowes|rona/i, code: '8800' }, // Repairs & Maint (Assumption)
        ];

        this.aliases = {
            'amzn': 'Amazon',
            'amz': 'Amazon',
            'mcd': 'McDonalds',
            'tims': 'Tim Hortons',
            'cdn tire': 'Canadian Tire',
            'wal-mart': 'Walmart',
            'costco whse': 'Costco'
        };
    }

    /**
     * CLEAN & EXPAND
     */
    clean(rawName) {
        if (!rawName) return '';
        let n = rawName.toLowerCase().trim();

        // 1. Remove Garbage
        // Store IDs, "Mktp", dates
        n = n.replace(/\b(store|shop|mktp|marketplace|xx+|#)\d*\b/g, '');
        n = n.replace(/\d{4}-\d{2}-\d{2}/g, ''); // Dates

        // 2. Expand Aliases
        for (const [alias, full] of Object.entries(this.aliases)) {
            if (n.startsWith(alias) || n === alias) {
                n = n.replace(alias, full.toLowerCase());
            }
        }

        return window.VendorEngine ? window.VendorEngine.toTitleCase(n) : n;
    }

    /**
     * PREDICT
     * Returns { accountName, confidence, rule }
     */
    predict(rawName) {
        const cleanName = this.clean(rawName);

        // Match against patterns
        for (const p of this.patterns) {
            if (p.regex.test(cleanName)) {
                const account = this.findAccountByCode(p.code);
                if (account) {
                    return {
                        name: cleanName,
                        accountName: account.name, // The user-friendly name from COA
                        accountId: account.name,   // In v3, we use Name as ID for the grid
                        confidence: 0.8,
                        rule: `Matched pattern: ${p.regex.toString()}`
                    };
                }
            }
        }

        return null;
    }

    findAccountByCode(code) {
        if (!window.DEFAULT_CHART_OF_ACCOUNTS) return null;
        // Search the flat list (or grouped list if structure changed, but default-coa.js is flat array)
        return window.DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === code);
    }
}

window.SmartMatcher = new SmartMatcher();
