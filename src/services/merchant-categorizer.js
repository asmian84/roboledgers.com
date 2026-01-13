/**
 * Advanced Financial Data Cleaning Engine v4
 * 3-PHASE EXECUTION PROTOCOL: PURGE -> STRIP -> MERGE
 * Specialized for Canadian market & Banking noise reduction
 */

class MerchantCategorizer {
    constructor() {
        // Master Brand Mappings (The "Canonicalizer")
        // Master Brand Mappings (STRICT COA v18.0)
        this.masterBrands = [
            { name: "MARK'S", patterns: [/MARK'?S/i, /L['E]QUIPEUR/i, /WORK\s*WEARHOUSE/i], account: '8900', coa: 'CLOTHING', industry: 'Retail & Shopping' },
            { name: "AMAZON", patterns: [/amzn/i, /amazon/i, /kindle/i, /primevideo/i, /audible/i, /aws/i], account: '8600', coa: 'OFFICE SUPPLIES', industry: 'Retail & Shopping' },
            { name: "MAC'S CONVENIENCE", patterns: [/MAC'?S\b/i, /WINK'?S\b/i, /MAC.?SCONV/i], account: '7400', coa: 'FUEL/OIL', industry: 'Retail & Shopping' },
            { name: "7-ELEVEN", patterns: [/\b7-?ELEVEN\b/i, /7\s+ELEVEN\b/i, /7ELEVEN/i], account: '7400', coa: 'FUEL/OIL', industry: 'Retail & Shopping' },
            { name: "PIZZA PIZZA", patterns: [/PIZZA\s*PIZZA/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "A&W", patterns: [/A\s*&\s*W/i, /A\s*AND\s*W/i, /A8W/i, /\bAW\b/i, /\bA\s*&\s*W\b/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "TIM HORTONS", patterns: [/tim\s*hortons/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "MCDONALD'S", patterns: [/mcdonald/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "STARBUCKS", patterns: [/starbucks/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "SUBWAY", patterns: [/subway/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "CANADIAN TIRE", patterns: [/(cdn|canadian)\s*tire/i], account: '8800', coa: 'REPAIRS', industry: 'Retail & Shopping' },
            { name: "SHOPPERS DRUG MART", patterns: [/SHOPPERS\s*DRUG\s*(MART|M\b)/i, /SDM\b/i], account: '8600', coa: 'OFFICE SUPPLIES', industry: 'Retail & Shopping' },
            { name: "SHELL", patterns: [/shell/i], account: '7400', coa: 'FUEL/OIL', industry: 'Travel & Transport' },
            { name: "PETRO-CANADA", patterns: [/petro/i], account: '7400', coa: 'FUEL/OIL', industry: 'Travel & Transport' },
            { name: "ESSO", patterns: [/esso/i], account: '7400', coa: 'FUEL/OIL', industry: 'Travel & Transport' },
            { name: "HUSKY", patterns: [/husky/i], account: '7400', coa: 'FUEL/OIL', industry: 'Travel & Transport' },
            { name: "MOBIL", patterns: [/mobil/i], account: '7400', coa: 'FUEL/OIL', industry: 'Travel & Transport' },
            { name: "ROGERS", patterns: [/rogers/i], account: '9100', coa: 'TELEPHONE', industry: 'Tech & Software' },
            { name: "BELL", patterns: [/bell/i], account: '9100', coa: 'TELEPHONE', industry: 'Tech & Software' },
            { name: "TELUS", patterns: [/telus/i], account: '9100', coa: 'TELEPHONE', industry: 'Tech & Software' },
            { name: "SHAW", patterns: [/shaw/i], account: '9100', coa: 'TELEPHONE', industry: 'Tech & Software' },
            { name: "FREEDOM MOBILE", patterns: [/freedom/i], account: '9100', coa: 'TELEPHONE', industry: 'Tech & Software' },
            { name: "WALMART", patterns: [/walmart/i], account: '8600', coa: 'OFFICE SUPPLIES', industry: 'Retail & Shopping' },
            { name: "STAPLES", patterns: [/staples/i], account: '8600', coa: 'OFFICE SUPPLIES', industry: 'Retail & Shopping' },
            { name: "BEST BUY", patterns: [/best\s*buy/i], account: '8600', coa: 'OFFICE SUPPLIES', industry: 'Retail & Shopping' },
            { name: "APPLE", patterns: [/apple/i], account: '8600', coa: 'OFFICE SUPPLIES', industry: 'Retail & Shopping' },
            { name: "HOME DEPOT", patterns: [/home\s*depot/i], account: '8800', coa: 'REPAIRS', industry: 'Home & Office' },
            { name: "RONA", patterns: [/rona/i], account: '8800', coa: 'REPAIRS', industry: 'Home & Office' },
            { name: "LOWE'S", patterns: [/lowe'?s/i], account: '8800', coa: 'REPAIRS', industry: 'Home & Office' },
            { name: "ADOBE", patterns: [/adobe/i], account: '6800', coa: 'SUBSCRIPTIONS', industry: 'Tech & Software' },
            { name: "GOOGLE", patterns: [/google/i], account: '6800', coa: 'SUBSCRIPTIONS', industry: 'Tech & Software' },
            { name: "MICROSOFT", patterns: [/microsoft/i], account: '6800', coa: 'SUBSCRIPTIONS', industry: 'Tech & Software' },
            { name: "ENMAX", patterns: [/enmax/i], account: '9500', coa: 'UTILITIES', industry: 'Home & Office' },
            { name: "EPCOR", patterns: [/epcor/i], account: '9500', coa: 'UTILITIES', industry: 'Home & Office' },
            { name: "DIRECT ENERGY", patterns: [/direct\s*energy/i], account: '9500', coa: 'UTILITIES', industry: 'Home & Office' },
            { name: "RBC", patterns: [/rbc|royal\s*bank/i], account: '7700', coa: 'BANK CHARGES', industry: 'Financial Services' },
            { name: "TD", patterns: [/td\s*bank|td\s*canada/i], account: '7700', coa: 'BANK CHARGES', industry: 'Financial Services' },
            { name: "BMO", patterns: [/bmo|bank\s*of\s*montreal/i], account: '7700', coa: 'BANK CHARGES', industry: 'Financial Services' },
            { name: "AIR CANADA", patterns: [/air\s*canada/i], account: '9200', coa: 'TRAVEL', industry: 'Travel & Transport' },
            { name: "WESTJET", patterns: [/westjet/i], account: '9200', coa: 'TRAVEL', industry: 'Travel & Transport' },
            { name: "DELTA AIR", patterns: [/\bDELTA\b\s*AIR/i, /\bDELTA\b\s*ATL/i, /\bDELTA\b(?!\s*PAY)/i], account: '9200', coa: 'TRAVEL', industry: 'Travel & Transport' },
            { name: "DAIRY QUEEN", patterns: [/DAIRY\s*QUEEN/i, /DAIRY\s*Q\b/i, /DAIR\b/i, /\bDQ\b/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "DAYS INN", patterns: [/DAYS\s*INN/i, /DAYSINN/i, /DAYS\s*STOP/i, /DAYS\s*INNS/i], account: '9200', coa: 'TRAVEL', industry: 'Travel & Transport' },
            { name: "BOSTON PIZZA", patterns: [/BOSTON\s*PIZZA/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "CACTUS CLUB", patterns: [/CACTUS\s*CLUB/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' },
            { name: "BEST WESTERN", patterns: [/BEST\s*WESTERN/i], account: '9200', coa: 'TRAVEL', industry: 'Travel & Transport' },
            { name: "BIG BEAR", patterns: [/BIG\s*BEAR/i], account: '8500', coa: 'MISCELLANEOUS', industry: 'Miscellaneous' },
            { name: "BIG HORN", patterns: [/BIG\s*HORN/i], account: '6415', coa: 'MEALS', industry: 'Dining & Drinks' }
        ];

        // Root Brand Extractor (PHASE 0) - Consolidated Merging
        this.rootBrands = [
            { id: 'apple', name: 'APPLE', patterns: [/APPLE/i] },
            { id: 'airbnb', name: 'AIRBNB', patterns: [/AIRBNB/i] },
            { id: 'air_canada', name: 'AIR CANADA', patterns: [/AIR\s*CANADA/i] },
            { id: 'aw', name: 'A&W', patterns: [/A&W|A\s+&\s+W|A8W/i] },
            { id: 'marks', name: 'MARK\'S', patterns: [/MARK'?S|L['E]QUIPEUR/i] },
            { id: 'cash_money', name: 'CASH MONEY', patterns: [/CASH\s*MONEY/i] },
            { id: 'walmart', name: 'WALMART', patterns: [/WALMART|WAL-MART/i] },
            { id: 'amazon', name: 'AMAZON', patterns: [/AMZN|AMAZON/i] },
            { id: 'boston_pizza', name: 'BOSTON PIZZA', patterns: [/BOSTON\s*PIZZA/i] },
            { id: 'cactus_club', name: 'CACTUS CLUB', patterns: [/CACTUS\s*CLUB/i] },
            { id: 'best_western', name: 'BEST WESTERN', patterns: [/BEST\s*WESTERN/i] },
            { id: 'big_bear', name: 'BIG BEAR', patterns: [/BIG\s*BEAR/i] },
            { id: 'big_horn', name: 'BIG HORN', patterns: [/BIG\s*HORN/i] },
            { id: 'cafe', name: 'CAFE', patterns: [/^\s*CAFE\s*$/i] }
        ];

        // bank junk patterns (PHASE 1) - Nuclear Purge (Global Search)
        this.purgePatterns = [
            /^6WW\d+/i,
            /deposit|withdrawal|transfer|credit memo|plan fee|nsf|overdraft|cheque|check|pymt received|payment received/i,
            /stmt credit|stmt pmt|stmt py|foreign currency|intl pos|activity fee|account fee|adj - rgn/i,
            /amort|accum|acc\s*fee|acc\s*receivable|acc\s+payable|accrual|equity|suspense|accounting|balante|opening|acct\b|accounts\s*(payable|receivable)/i,
            /^\s*(COST|CREDIT|DUES|OPENING|YEAR|BAL|PMT|VR|CP|R|RETRAIT|GAB|CAD|USD|ABCA|IDN|FOREIGN)\s*$/i,
            /^\d{1,3}([ ,]\d{3})*[.,]\d{2}$/i, // Financial Fragments (e.g., 10,226.85)
            /^\d+\s*$/i, // Pure number fragments
            /^#?\d+\s*$/i, // Pure ID fragments
            /^\.?(CA|COM|ORG|NET|BIZ|INFO|EDU|GOV|US|UK|ME|MOBILE|CODE)\s*$/i // Pure TLD Purge
        ];

        // Cleaning rules (PHASE 2) - Precision Vortex Strip
        this.stripRules = [
            // 0. Preliminary Prefix/Suffix Cleanup (Extreme Compression v21.0)
            { pattern: /^[\/\s\\\-&+|:*]+/ }, // Strip leading noise
            { pattern: /[\/\s\\\-&+|:*]+$/ }, // Strip trailing noise
            { pattern: /^[$€£¥]\s*/ }, // Strip leading currency symbols
            { pattern: /^\b[A-Z]\b\s+/i }, // Strip single-letter prefixes
            { pattern: /^#?\d{2,10}\b\s*/ }, // Leading Hash/Numeric IDs (e.g., "#012 ", "00115 ")
            { pattern: /^[A-Z]+\d+[A-Z]*\s+/i }, // Complex Alpha-Numeric Prefixes (e.g., "1410pepven...")
            { pattern: /^0?EBIT\s*CARD\s*(F?URCHASE|PURCHASE|PUR)(,\s*)?/i }, // Bank Noise Prefixes
            { pattern: /^PURCHASE\s+BY\s+DEBIT(,\s*)?/i }, // Bank Noise Prefixes
            { pattern: /\b\d{4,8}\b/g }, // Deep ID Stripping (anywhere in string)
            { pattern: /\b\d{2,4}\b\s+/ }, // Aggressive leading ID stripping

            // 1. Numbers & IDs (Extreme)
            { pattern: /\d{7,}/g }, // Remove any string of 7+ digits
            { pattern: /0EBITCARD\s+F?'?URCHASE/i }, // Catch 0ebitcard F'urchase typos
            { pattern: /0EBITCARD\s+PURCHASE/i },
            { pattern: /PURCHASE\s+BY\s+DEBIT/i },
            { pattern: /WWW\..+?\.(CODE|COM|NET|ORG|CA)/i },
            { pattern: /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+\d{1,2}.*$/gi }, // Date stripping

            // 2. Locations (STEP 1: Strip Locations)
            { pattern: /\b(CALGARY|EDMONTON|TORONTO|VANCOUVER|MONTREAL|OTTAWA|WINNIPEG|KELOWNA|MISSISSAUGA|COCHRANE|AIRDRIE|BANFF|HALIFAX|VICTORIA|REGINA|SASKATOON|RED DEER|LAKE COUNTRY|SASKATCHEWAN|ALBERTA|ONTARIO|QUEBEC|MANITOBA|BRITISH COLUMBIA|CANADA|USA|UK|ABCA|IDN|FOREIGN|RADIUM|OKOTOKS|OSOYOOS|FERNIE|NANAIMO|STEPHEN|MACLEOD)\b/gi },
            { pattern: /\b(BC|AB|ON|QC|NS|NB|MB|SK|PE|NL|YT|NT|NU)\b\.?/gi },
            { pattern: /\b(CALGA|COUN|OLM|ST|RAD|OKO|OSO|FER|NAN)\b/gi }, // Truncated Location Variants

            // 3. Structural Trailing
            { pattern: /\b(INC|LTD|CORP|CO|LIMITED|INCORPORATED|LLC|LLP)\b\.?/gi },
            { pattern: /\b(STORE|LOC|BRANCH|UNIT|#)\s*#?\d+/i },
            { pattern: /\s+#?\d{3,}$/ },
            { pattern: /[#\*:,]/g },

            // Bank Prefixes (Debit/POS variations)
            { pattern: /^(debit|credit)\s*(card)?\s*(purchase|transaction|payment|pos)[,\s]*/i },
            { pattern: /^int'l\s*pos\s*pur\s*\d+[a-z]+\d+[,\s]*/i },
            { pattern: /^debitcard\s*purchase[,\s]*/i },
            { pattern: /^interac\s*(purchase|e-?transfer|payment)[,\s]*/i },
            { pattern: /^(pos|point\s*of\s*sale)\s*(purchase|transaction)?[,\s]*/i },
            { pattern: /^(visa|mastercard|amex)\s*(debit|credit)?\s*(purchase)?[,\s]*/i },
            { pattern: /^0ebitcard\s*purchase[,\s]*/i },
            { pattern: /^\d+\s*purchase/i },

            // FX Rates (USD 12.50 @ 1.35)
            { pattern: /[A-Z]{3}\s*\d+(\.\d+)?\s*@\s*\d+(\.\d+)?[,\s]*/gi },

            // Processor Junk
            { pattern: /^SQ\s*\*/i },
            { pattern: /^TST[-*\s]/i },
            { pattern: /^SumUp\s*\*/i },
            { pattern: /^PAYPAL\s*\*/i },
            { pattern: /^Fh\*/i },
            { pattern: /^STRIPE\s*\*/i },

            // Locations at end
            { pattern: /\s+(calgary|edmonton|toronto|vancouver|montreal|ottawa|winnipeg|banff|ab|bc|on|qc|mb|sk|ns|nb)\s*$/gi },

            // Trailing ID Strip (e.g. "WALMART 1234" -> "WALMART")
            { pattern: /\s+#?\d{3,}$/ },
            { pattern: /\s+(STORE|LOC|BRANCH|UNIT|#)\s*#?\d+/i },

            // Branch/Location Suffixes (Cleanly strip city/province at end)
            { pattern: /\s+(CALGARY|EDMONTON|TORONTO|VANCOUVER|MONTREAL|OTTAWA|WINNIPEG|HALIFAX|VICTORIA|REGINA|SASKATOON)\b.*$/i },
            { pattern: /\s+(AB|BC|ON|QC|NS|NB|MB|SK|PE|NL|YT|NT|NU)\b.*$/i },

            // Store IDs and long numbers
            { pattern: /#\s*\d+/g },
            { pattern: /\b\d{4,6}[A-Z]*\b/g },
            { pattern: /\*[A-Z0-9]{6,}/gi },
            { pattern: /store\s*#?\d+/gi },
            { pattern: /location\s*#?\d+/gi }
        ];
    }

    /**
     * STAGE 1: VORTEX SANITZE
     * Just cleans the name using strip rules and title case. No deletions.
     */
    vortexSanitize(name) {
        if (!name) return "";
        let cleaned = name.trim().toUpperCase();

        // Apply rules
        for (const rule of this.stripRules) {
            cleaned = cleaned.replace(rule.pattern, '');
        }

        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // Deduplicate words
        const words = cleaned.split(' ');
        cleaned = words.filter((word, index) => words.indexOf(word) === index).join(' ');

        return cleaned.toUpperCase();
    }

    /**
     * STAGE 3: NUCLEAR PURGE CHECK
     * Returns true if the merchant name is absolute garbage.
     */
    isNuclearWaste(name) {
        if (!name || name.length < 2) return true;
        const n = name.toUpperCase().trim();

        // 1. Known Purge Patterns
        for (const pattern of this.purgePatterns) {
            if (pattern.test(n)) return true;
        }

        // 2. Fragment List (Nuclear refinement)
        const fragments = ['OPENING', 'RETRAIT', 'GAB', 'CAD', 'USD', 'TOTAL', 'DEBIT', 'CREDIT', 'F\'URCHASE', 'PURCHASE'];
        if (fragments.includes(n)) return true;

        // 3. Amount/Number logic (Strict: If numbers > letters, it's garbage)
        const digits = (n.match(/\d/g) || []).length;
        const letters = (n.match(/[A-Z]/g) || []).length;
        if (digits > letters && digits > 0) return true;

        // 4. Just Symbols
        const isJustSymbols = /^[^\w\s]+$/.test(n);
        if (isJustSymbols) return true;

        // 5. Common Junk
        if (n === '.CA' || n === '.COM' || n === 'WWW.' || n === 'TOTAL') return true;

        return false;
    }

    /**
     * Clean raw bank transaction description
     */
    cleanTransaction(rawString) {
        if (!rawString) return { original: '', clean_name: '[UNKNOWN]', status: 'ignore' };

        const original = rawString;
        let cleaned = rawString.trim().toUpperCase();

        // PHASE 0: Root Brand Extraction (Consolidation)
        for (const brand of this.rootBrands) {
            if (brand.patterns.some(p => p.test(cleaned))) {
                return {
                    original,
                    clean_name: brand.name,
                    status: 'valid',
                    confidence: 0.99,
                    default_category: this.masterBrands.find(mb => mb.patterns.some(p => p.test(brand.name)))?.coa || 'Miscellaneous',
                    industry: this.masterBrands.find(mb => mb.patterns.some(p => p.test(brand.name)))?.industry || 'Miscellaneous'
                };
            }
        }

        // PHASE 1: PURGE (Immediate deletion of known junk)
        for (const pattern of this.purgePatterns) {
            if (pattern.test(cleaned)) {
                return {
                    original,
                    clean_name: '[IGNORE]',
                    status: 'ignore',
                    industry: 'Miscellaneous',
                    default_category: 'Misc',
                    confidence: 1.0
                };
            }
        }

        // PHASE 2: STRIP (Remove Garbage Text)
        for (const rule of this.stripRules) {
            cleaned = cleaned.replace(rule.pattern, '');
        }

        // Remove extra spaces
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        // PHASE 2.5: Word De-duplication (Remove repeated words)
        const words = cleaned.split(' ');
        cleaned = words.filter((word, index) => words.indexOf(word) === index).join(' ');

        // PHASE 3: MERGE (Canonicalize)
        for (const brand of this.masterBrands) {
            if (brand.patterns.some(p => p.test(cleaned))) {
                return {
                    original,
                    clean_name: brand.name,
                    status: 'valid',
                    industry: brand.industry,
                    default_account: brand.account,
                    default_category: brand.coa,
                    confidence: 0.95
                };
            }
        }

        // Final cleanup for unknown merchants
        if (cleaned.length < 3) {
            return { original, clean_name: '[IGNORE - Too Short]', status: 'ignore', confidence: 0 };
        }

        const guessed = this.guessIndustry(cleaned);

        return {
            original,
            clean_name: this.toTitleCase(cleaned),
            status: 'valid',
            industry: guessed.coa, // Using coa as industry label for UI consistency
            default_account: guessed.account,
            default_category: guessed.coa,
            confidence: 0.5
        };
    }

    /**
     * ASYNC: Clean and Enrich Transaction (v25.0 - THE OUTSOURCE)
     * Triggers external lookups if internal confidence < 80%
     */
    async cleanAndEnrichTransaction(rawString) {
        // 1. Run internal protocol
        let result = this.cleanTransaction(rawString);

        // 2. Trigger Condition: Confidence below 80%
        if (result.confidence < 0.8 && window.outsourceService) {
            // console.log(`📡 Fallback Triggered for: "${result.clean_name}" (Confidence: ${Math.round(result.confidence * 100)}%)`);

            // Try to enrich using Clean Name or Original Name (minus bank noise)
            const queryName = result.clean_name;
            const enriched = await window.outsourceService.outsourceEnrich(queryName);

            if (enriched && enriched.name) {
                // console.log(`✅ Fallback Success: Found "${enriched.name}" via ${enriched.source}`);

                // Get richer context for guessing (Clearbit domain or Wikidata description)
                const context = enriched.description || enriched.domain || '';

                // Re-run internal matching with context
                const guessed = this.guessIndustry(enriched.name, context);

                return {
                    original: result.original,
                    clean_name: enriched.name.toUpperCase(),
                    industry: guessed.coa,
                    default_account: guessed.account,
                    default_category: guessed.coa,
                    notes: (result.notes || '') + ` [Outsourced: ${enriched.source}]`,
                    confidence: 0.90
                };
            } else {
                // HANDLING FAILURE: Both APIs returned empty or error
                // console.warn(`❌ Fallback Failed for: "${queryName}". Flagging for review.`);
                return {
                    ...result,
                    clean_name: result.clean_name || result.original,
                    status: 'review_needed',
                    industry: 'Miscellaneous',
                    default_account: '8500',
                    default_category: 'MISCELLANEOUS',
                    notes: (result.notes || '') + ' [REVIEW NEEDED: Fallback failed]',
                    confidence: 0.1 // Lowest confidence
                };
            }
        }

        return result;
    }

    /**
     * Guess industry and account based on name and optional description
     * @param {string} name - The vendor name
     * @param {string} description - Optional descriptive text (from Wiki/Clearbit)
     */
    guessIndustry(name, description = '') {
        const text = (name + ' ' + description).toUpperCase();

        // 7400: Fuel/Oil
        if (/\b(SHELL|ESSO|PETRO|HUSKY|CENTEX|MOBIL|GAS|FUEL|OIL|GASOLINE|PETROLEUM)\b/i.test(text)) {
            return { account: '7400', coa: 'FUEL/OIL' };
        }

        // 6415: Meals
        if (/\b(RESTAURANT|CAFE|BAR|GRILL|KITCHEN|PIZZA|SUSHI|BURGER|DINER|BAKERY|PUB|SUBWAY|COFFEE|TEA|CATERING|FOOD|DELIVERY|MEAL|BREW|EATERY|BISTRO|STEAKHOUSE)\b/i.test(text)) {
            return { account: '6415', coa: 'MEALS' };
        }

        // 9200: Travel
        if (/\b(HOTEL|MOTEL|INN|SUITES|RESORT|TRAVEL|VACATION|AIR|FLY|WESTJET|UBER|TAXI|LIMO|PARK|TRANSIT|AIRLINE|AIRLINES|AIRPORT|BOOKING|ACCOMMODATION|LODGING)\b/i.test(text)) {
            return { account: '9200', coa: 'TRAVEL' };
        }

        // 8600: Office Supplies
        if (/\b(STAPLES|AMAZON|WALMART|DOLLAR|BEST\s*BUY|APPLE|STORE|MART|MARKET|SHOP|OFFICE|SUPPLY|STATIONERY|COPY|PRINT|STATIONER|BOOKSTORE|BOOKS)\b/i.test(text)) {
            return { account: '8600', coa: 'OFFICE SUPPLIES' };
        }

        // 9100: Telephone
        if (/\b(ROGERS|BELL|TELUS|SHAW|FREEDOM|MOBILE|CELL|WIRELESS|INTERNET|TV|MEDIA|TELEPHONE|COMMUNICATIONS|NETWORK)\b/i.test(text)) {
            return { account: '9100', coa: 'TELEPHONE' };
        }

        // 8800: Repairs
        if (/\b(HOME\s*DEPOT|RONA|LOWE|TIRE|HARDWARE|HOME|RENOVATION|REPAIR|MAINTENANCE|CONSTRUCTION|LUMBER|TOOLS)\b/i.test(text)) {
            return { account: '8800', coa: 'REPAIRS' };
        }

        // 6800: Subscriptions
        if (/\b(ADOBE|GOOGLE|MICROSOFT|SOFTWARE|APP|CLOUD|HOST|ONLINE|SUBSCRIPTION|WEB|DESIGN|SYSTEMS|IT|SAAS|TECH|TECHNOLOGY)\b/i.test(text)) {
            return { account: '6800', coa: 'SUBSCRIPTIONS' };
        }

        // 9500: Utilities
        if (/\b(ENMAX|EPCOR|ENERGY|ELECTRIC|POWER|WATER|HYDRO|UTILITY|RENT|LEASE|HEATING)\b/i.test(text)) {
            return { account: '9500', coa: 'UTILITIES' };
        }

        // 7700: Bank Charges
        if (/\b(BANK|CREDIT|INSURANCE|ACCOUNTING|TAX|FINANCE|INVEST|WEALTH|CRA|GOVERNMENT|REVENUE|FEE|INTEREST|SERVICE\s*CHARGE|LEGAL|SOLICITOR|LAWYER)\b/i.test(text)) {
            return { account: '7700', coa: 'BANK CHARGES' };
        }

        // 8900: Clothing (Added for 25.1)
        if (/\b(CLOTHING|CLOTHES|APPAREL|FASHION|SHOES|FOOTWEAR|JEANS|DEPARTMENT\s*STORE)\b/i.test(text)) {
            return { account: '8900', coa: 'CLOTHING' };
        }

        // 8500: Misc
        return { account: '8500', coa: 'MISCELLANEOUS' };
    }

    bulkCategorizeMerchants(merchants, progressCallback) {
        let updated = 0;
        for (let i = 0; i < merchants.length; i++) {
            const m = merchants[i];
            const result = this.cleanTransaction(m.display_name);

            // Only update if not manually overridden or specifically requested
            m.display_name = (result.status === 'ignore') ? m.display_name : result.clean_name;
            m.industry = result.industry || 'Miscellaneous';
            m.default_account = result.default_account || '5718';
            m.default_category = result.default_category || 'Miscellaneous';
            m.categorization_confidence = result.confidence;
            m.clean_status = result.status;

            updated++;
            if (progressCallback && i % 100 === 0) progressCallback(i, merchants.length);
        }
        return updated;
    }

    toTitleCase(str) {
        if (!str) return '';
        return str.toUpperCase();
    }
}

// Global instance
window.merchantCategorizer = new MerchantCategorizer();
// console.log('🏭 Merchant Categorizer v4 (3-Phase Protocol) Loaded');
