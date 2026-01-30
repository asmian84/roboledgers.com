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
     * @param {string} filename - Original filename for learning matching
     * @param {Array} lineMetadata - Spatial info per line
     * @param {Object} originalFile - The original File object (optional, for Smart Parser fallback)
     * @returns {Promise<Object>} Parsed transactions + metadata
     */
    async parseStatement(statementText, filename = '', lineMetadata = [], originalFile = null) {
        console.log('🔍 Step 1: Detecting bank brand...');

        // Step 1: Detect brand (with Learning System)
        const detection = await window.brandDetector.detectWithLearning(statementText, filename);

        console.log(`✅ Detected: ${detection.brand} ${detection.accountType} (${detection.confidence})`);
        console.log(`📍 Routing to: ${detection.parserName}`);

        // Step 2: Get the specific parser
        const parserKey = detection.parserName;
        let parser = this.parsers[parserKey];

        if (!parser) {
            console.warn(`⚠️ No specific parser for ${parserKey}, falling back to Smart Parser`);
            // CRITICAL FIX: Ensure we have the window.pdfParser AND the original File object to avoid recursion/exception
            if (window.pdfParser && originalFile) {
                console.log('🤖 Falling back to window.pdfParser (line scan heuristic)...');
                // Use a dedicated flag or check to ensure pdfParser.parsePDF doesn't just call back into ParserRouter
                const smartResult = await window.pdfParser.parsePDF(originalFile, { skipRouter: true });

                // Adapt smartResult if needed
                return {
                    transactions: smartResult.transactions,
                    brandDetection: {
                        ...detection,
                        institutionCode: smartResult.metadata?.institutionCode || detection.institutionCode || '---',
                        transit: smartResult.metadata?.transit || detection.transit || '-----',
                        accountNumber: smartResult.metadata?.accountNumber || detection.accountNumber || '-----'
                    }
                };
            } else if (window.pdfParser && !originalFile) {
                console.error('❌ Cannot fallback to Smart Parser: originalFile not provided to ParserRouter.');
            }
            throw new Error(`No parser found for ${parserKey} and cannot perform Smart Parser fallback.`);
        }

        // Step 3: Parse with brand-specific parser
        console.log(`🤖 Step 2: Parsing with ${parserKey} parser...`);
        let result = await parser.parse(statementText, detection, lineMetadata);

        // Step 4: Add brand info to result
        const firstTxn = result.transactions[0] || {};
        const pInst = (firstTxn._inst && firstTxn._inst !== '---') ? firstTxn._inst : (detection.institutionCode || '---');
        const pTransit = (firstTxn._transit && firstTxn._transit !== '-----') ? firstTxn._transit : (detection.transit || '-----');
        const pAcctNum = (firstTxn._acct && firstTxn._acct !== '-----') ? firstTxn._acct : (detection.accountNumber || '-----');

        result.brandDetection = {
            brand: detection.brand,
            fullBrandName: detection.fullBrandName,
            accountType: detection.accountType,
            subType: detection.subType || detection.accountType,
            prefix: detection.prefix || 'TXN',
            tag: detection.tag || detection.accountType,
            confidence: detection.confidence,
            institutionCode: pInst,
            transit: pTransit,
            accountNumber: pAcctNum
        };

        // Standardize opening balance promotion
        result.openingBalance = result.openingBalance || (result.metadata && result.metadata.openingBalance) || 0;

        // Inject brand into EACH transaction
        result.transactions.forEach(tx => {
            tx._bank = detection.fullBrandName;
            tx._brand = detection.brand;
            tx._accountType = detection.accountType;
            tx._prefix = detection.prefix || 'TXN';
            tx._tag = detection.tag || detection.accountType;

            if (!tx._inst || tx._inst === '---') tx._inst = result.brandDetection.institutionCode;
            if (!tx._transit || tx._transit === '-----') tx._transit = result.brandDetection.transit;
            if (!tx._acct || tx._acct === '-----') tx._acct = result.brandDetection.accountNumber;

            if (detection.fingerprint) tx._fingerprint = detection.fingerprint;
        });

        // Step 5: Run Validation Engine (silent auto-fix)
        if (window.validationEngine) {
            try {
                const progressContainer = document.getElementById('v5-progress-container');
                const progressFill = document.getElementById('v5-progress-fill');

                if (progressContainer && progressContainer.style.display !== 'flex') {
                    progressContainer.style.display = 'flex';
                    progressContainer.dataset.showTime = Date.now();
                }

                result = window.validationEngine.validate(result, (current, total) => {
                    if (progressFill) {
                        const percent = Math.round((current / total) * 100);
                        progressFill.style.width = `${percent}%`;
                    }
                });

                setTimeout(() => {
                    const gridVisible = document.getElementById('v5-grid-container')?.offsetHeight > 0;
                    if (gridVisible && progressContainer) {
                        const showTime = parseInt(progressContainer.dataset.showTime || '0');
                        const elapsed = Date.now() - showTime;
                        const minDisplayTime = 1000;

                        if (elapsed >= minDisplayTime) {
                            progressContainer.style.display = 'none';
                        } else {
                            setTimeout(() => {
                                progressContainer.style.display = 'none';
                            }, minDisplayTime - elapsed);
                        }
                    }
                }, 800);
            } catch (vErr) {
                console.warn('⚠️ Validation Engine failed, but returning original parse results:', vErr);
            }
        }

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
