/**
 * Parser Router
 * Detects bank brand and routes to specific parser
 * ZERO GENERALIZATION - each bank gets its own parser
 */
class ParserRouter {
    constructor() {
        // ARCHITECTURE: Each bank gets exactly 2 parsers:
        // 1. Bank Account (Chequing/Savings) - Asset logic
        // 2. Credit Card (Visa/MC/Amex) - Liability logic

        this.parsers = {
            // ===== BMO =====
            'BMOChequing': window.bmoChequingParser,
            'BMOSavings': window.bmoChequingParser,
            'BMOCreditCard': window.bmoCreditCardParser || window.bmoChequingParser,
            'BMOMastercard': window.bmoCreditCardParser || window.bmoChequingParser,
            'BMOVisa': window.bmoCreditCardParser || window.bmoChequingParser,

            // ===== SCOTIABANK =====
            'ScotiabankChequing': window.scotiaChequingParser,
            'ScotiabankSavings': window.scotiaChequingParser,
            'ScotiabankCreditCard': window.scotiaCreditCardParser || window.scotiaMastercardParser,
            'ScotiabankMastercard': window.scotiaCreditCardParser || window.scotiaMastercardParser,
            'ScotiabankVisa': window.scotiaCreditCardParser || window.scotiaMastercardParser,

            // ===== TD =====
            'TDChequing': window.tdChequingParser,
            'TDSavings': window.tdChequingParser,
            'TDCreditCard': window.tdCreditCardParser || window.tdVisaParser,
            'TDVisa': window.tdCreditCardParser || window.tdVisaParser,

            // ===== RBC =====
            'RBCChequing': window.rbcChequingParser,
            'RBCSavings': window.rbcChequingParser,
            'RBCCreditCard': window.rbcCreditCardParser || window.rbcVisaParser,
            'RBCVisa': window.rbcCreditCardParser || window.rbcVisaParser,

            // ===== CIBC =====
            'CIBCChequing': window.cibcChequingParser,
            'CIBCSavings': window.cibcChequingParser,
            'CIBCCreditCard': window.cibcCreditCardParser || window.cibcVisaParser,
            'CIBCVisa': window.cibcCreditCardParser || window.cibcVisaParser,

            // ===== AMEX (Credit Card only) =====
            'AmexCreditCard': window.amexParser,
            'AmexAmex': window.amexParser
        };
    }

    /**
     * Parse a bank statement by detecting brand and routing
     * @param {string} statementText - Full PDF text
     * @returns {Promise<Object>} Parsed transactions + metadata
     */
    async parseStatement(statementText) {
        console.log('🔍 Step 1: Detecting bank brand...');

        // Step 1: Detect brand
        const detection = await window.brandDetector.detectBrand(statementText);

        console.log(`✅ Detected: ${detection.brand} ${detection.accountType} (${detection.confidence})`);
        console.log(`📍 Routing to: ${detection.parserName}`);

        // Step 2: Get the specific parser
        const parserKey = `${detection.brand}${detection.accountType}`;
        const parser = this.parsers[parserKey];

        if (!parser) {
            throw new Error(`No parser found for ${parserKey}. Available: ${Object.keys(this.parsers).join(', ')}`);
        }

        // Step 3: Parse with brand-specific parser
        console.log(`🤖 Step 2: Parsing with ${parserKey} parser...`);
        const result = await parser.parse(statementText);

        // Step 4: Add brand info to result
        result.brandDetection = {
            brand: detection.brand,
            fullBrandName: detection.fullBrandName,
            accountType: detection.accountType,
            subType: detection.subType || detection.accountType,
            prefix: detection.prefix || 'TXN',
            tag: detection.tag || detection.accountType,
            confidence: detection.confidence
        };

        // CRITICAL FIX: Inject brand into EACH transaction so it survives array flattening
        result.transactions.forEach(tx => {
            tx._bank = detection.fullBrandName; // e.g. "Scotiabank"
            tx._brand = detection.brand;        // e.g. "Scotiabank"
            tx._accountType = detection.accountType; // e.g. "Chequing"
            tx._prefix = detection.prefix || 'TXN'; // e.g. "CHQ"
            tx._tag = detection.tag || detection.accountType; // e.g. "Chequing"
        });

        console.log(`✅ Successfully parsed ${result.transactions.length} transactions from ${detection.fullBrandName}`);

        return result;
    }

    /**
     * List all available parsers
     */
    listParsers() {
        return Object.keys(this.parsers);
    }
}

const parserRouter = new ParserRouter();

// Expose to window for file:// compatibility
window.ParserRouter = ParserRouter;
window.parserRouter = parserRouter;
