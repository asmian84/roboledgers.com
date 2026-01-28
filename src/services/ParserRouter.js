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
     * @returns {Promise<Object>} Parsed transactions + metadata
     */
    async parseStatement(statementText, filename = '') {
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
            if (window.pdfParser) {
                const smartResult = await window.pdfParser.parsePDF({
                    arrayBuffer: async () => new TextEncoder().encode(statementText).buffer,
                    name: filename
                });
                // Adapt smartResult to expected format
                return {
                    transactions: smartResult.transactions,
                    brandDetection: {
                        ...detection,
                        institutionCode: smartResult.metadata?.institutionCode || detection.institutionCode || '---',
                        transit: smartResult.metadata?.transit || detection.transit || '-----',
                        accountNumber: smartResult.metadata?.accountNumber || detection.accountNumber || '-----'
                    }
                };
            }
            throw new Error(`No parser found for ${parserKey} and no Smart Parser fallback.`);
        }

        // Step 3: Parse with brand-specific parser
        console.log(`🤖 Step 2: Parsing with ${parserKey} parser...`);
        let result = await parser.parse(statementText, detection);

        // Step 4: Add brand info to result
        // CRITICAL: Prefer metadata from the specific parser result if it exists and isn't a placeholder
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

        console.log('🔍 [ParserRouter] Brand Metadata Result:');
        console.table(result.brandDetection);

        // CRITICAL FIX: Inject brand into EACH transaction so it survives array flattening
        result.transactions.forEach(tx => {
            tx._bank = detection.fullBrandName; // e.g. "Scotiabank"
            tx._brand = detection.brand;        // e.g. "Scotiabank"
            tx._accountType = detection.accountType; // e.g. "Chequing"
            tx._prefix = detection.prefix || 'TXN'; // e.g. "CHQ"
            tx._tag = detection.tag || detection.accountType; // e.g. "Chequing"

            // Injection logic: Use detected metadata if transaction-level data is missing or just placeholders
            if (!tx._inst || tx._inst === '---') tx._inst = result.brandDetection.institutionCode;
            if (!tx._transit || tx._transit === '-----') tx._transit = result.brandDetection.transit;
            if (!tx._acct || tx._acct === '-----') tx._acct = result.brandDetection.accountNumber;

            // Attach fingerprint for learning
            if (detection.fingerprint) tx._fingerprint = detection.fingerprint;
        });

        // Step 5: Run Validation Engine (silent auto-fix)
        if (window.validationEngine) {
            try {
                // Update status text in UI
                const statusEl = document.getElementById('v5-status-text');
                const progressContainer = document.getElementById('v5-progress-container');
                const progressFill = document.getElementById('v5-progress-fill');
                const progressMsg = document.getElementById('v5-progress-message');

                // Removed "Validating data..." text per user request
                // if (statusEl) statusEl.textContent = 'Validating data...';

                // Only show progress bar if not already visible (prevent flicker during batch uploads)
                if (progressContainer && progressContainer.style.display !== 'flex') {
                    progressContainer.style.display = 'flex';
                    // Track when we showed it
                    progressContainer.dataset.showTime = Date.now();
                }

                // Removed validation message per user request
                // if (progressMsg) progressMsg.textContent = 'Validating and auto-fixing transaction data...';

                result = window.validationEngine.validate(result, (current, total) => {
                    if (progressFill) {
                        const percent = Math.round((current / total) * 100);
                        progressFill.style.width = `${percent}%`;
                    }
                });

                // Hide progress bar after validation, but only if it's been visible for at least 1 second
                // to prevent flicker during batch uploads
                setTimeout(() => {
                    const gridVisible = document.getElementById('v5-grid-container')?.offsetHeight > 0;
                    if (gridVisible && progressContainer) {
                        const showTime = parseInt(progressContainer.dataset.showTime || '0');
                        const elapsed = Date.now() - showTime;
                        const minDisplayTime = 1000; // 1 second minimum

                        if (elapsed >= minDisplayTime) {
                            progressContainer.style.display = 'none';
                        } else {
                            // Wait for remaining time before hiding
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

        // DEBUG: Log first 3 transactions to see field names
        if (result.transactions.length > 0) {
            console.log('🔍 PARSER OUTPUT - First 3 transactions:');
            result.transactions.slice(0, 3).forEach((txn, idx) => {
                const debugInfo = {
                    description: txn.description,
                    Description: txn.Description,
                    date: txn.date,
                    Date: txn.Date
                };
                console.log(`  Transaction ${idx + 1}:`, JSON.stringify(debugInfo, null, 2));
            });
        }

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
