/**
 * Parser Router
 * Detects bank brand and routes to specific parser
 * ZERO GENERALIZATION - each bank gets its own parser
 */
class ParserRouter {
    constructor() {
        this.parsers = {
            'BMOChequing': window.bmoChequingParser,
            'BMOMastercard': window.bmoMastercardParser,
            'CIBCChequing': window.cibcChequingParser,
            'CIBCVisa': window.cibcVisaParser,
            'RBCChequing': window.rbcChequingParser,
            'RBCVisa': window.rbcVisaParser,
            'ScotiabankChequing': window.scotiaChequingParser,
            'ScotiabankMastercard': window.scotiaMastercardParser,
            'TDChequing': window.tdChequingParser,
            'TDVisa': window.tdVisaParser,
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
            confidence: detection.confidence
        };

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

export const parserRouter = new ParserRouter();

// Expose to window for file:// compatibility
window.ParserRouter = ParserRouter;
window.parserRouter = parserRouter;
