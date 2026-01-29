/**
 * DATA JUNKIE - Complete Smart Scanner System
 * 
 * Purpose: Scan PDFs, identify bank statements, extract merchants,
 *          detect duplicates, and build merchant dictionary
 */

class DataJunkie {
    constructor() {
        // Bank statement detection patterns
        this.statementKeywords = [
            'account statement', 'bank statement', 'credit card statement',
            'transaction history', 'cibc', 'rbc', 'td', 'scotiabank', 'bmo',
            'opening balance', 'closing balance', 'purchases', 'payments',
            'chequing', 'savings', 'visa', 'mastercard', 'amex', 'statement',
            'balance', 'debits', 'credits', 'details', 'activity'
        ];

        // Exclusion patterns (NOT bank statements)
        this.exclusionKeywords = [
            'tax return', 't4', 'notice of assessment', 'audit report',
            'lease agreement', 'employment contract'
        ];
    }

    /**
     * STEP 1: Fast scan to see if it's a bank statement (Asynchronous)
     */
    async isBankStatement(file) {
        const text = await this.extractQuickText(file);
        return this.isBankStatementSync(text, file.name);
    }

    /**
     * STEP 1.5: Synchronous check of text (Optimized)
     */
    isBankStatementSync(text, fileName = 'Unknown') {
        if (!text) return false;

        const lowerText = text.toLowerCase();

        // Check for exclusion keywords first
        for (const kw of this.exclusionKeywords) {
            if (lowerText.includes(kw.toLowerCase())) {
                console.log(`[DataJunkie] Exclusion keyword "${kw}" found in ${fileName}`);
                return false;
            }
        }

        // Count keyword matches
        let matches = 0;
        const matchedKeywords = [];
        for (const kw of this.statementKeywords) {
            if (lowerText.includes(kw.toLowerCase())) {
                matches++;
                matchedKeywords.push(kw);
            }
        }

        const isBank = matches >= 2;
        if (isBank) {
            console.log(`📋 ${fileName}: ${matches} bank keywords found (${matchedKeywords.join(', ')}) → DETECTED`);
        } else {
            console.warn(`📋 ${fileName}: Only ${matches} bank keywords found → SKIPPED`);
        }

        return isBank;
    }

    /**
     * STEP 2: Extract text from PDF (fast scan - first 2 pages)
     */
    async extractQuickText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;

                    // Only read first 2 pages for speed
                    const maxPages = Math.min(2, pdf.numPages);
                    let fullText = '';

                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';

                        // Yield to browser
                        await new Promise(r => setTimeout(r, 0));
                    }
                    resolve(fullText);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * FULL TEXT EXTRACTION (Optimized)
     * Returns { text, lineMetadata } with coordinates for on-demand cropping
     */
    async extractFullText(file) {
        console.time(`DataJunkie.extractFullText:${file.name}`);
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;

                    let fullText = '';
                    const lineMetadata = []; // Track PDF coordinates
                    const totalPages = pdf.numPages;

                    for (let i = 1; i <= totalPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const viewport = page.getViewport({ scale: 1.0 });

                        // Simple Y-coordinate based line reconstruction
                        let lastY = -1;
                        let pageText = '';
                        let currentLine = '';
                        let lineStartY = -1;

                        for (const item of textContent.items) {
                            const y = item.transform[5];

                            // New line detected
                            if (lastY !== -1 && Math.abs(y - lastY) > 5) {
                                // Save previous line metadata
                                if (currentLine.trim()) {
                                    lineMetadata.push({
                                        page: i,
                                        y: lineStartY,
                                        height: item.height || 12,
                                        text: currentLine.trim()
                                    });
                                }

                                pageText += '\n';
                                currentLine = item.str;
                                lineStartY = y;
                            } else {
                                if (pageText.length > 0 && !pageText.endsWith('\n')) {
                                    pageText += ' ';
                                    currentLine += ' ';
                                }
                                currentLine += item.str;
                                if (lineStartY === -1) lineStartY = y;
                            }

                            pageText += item.str;
                            lastY = y;
                        }

                        // Save last line
                        if (currentLine.trim()) {
                            lineMetadata.push({
                                page: i,
                                y: lineStartY,
                                height: 12,
                                text: currentLine.trim()
                            });
                        }

                        fullText += pageText + '\n';

                        // Yield to prevent UI hang on large PDFs
                        if (i % 5 === 0) {
                            await new Promise(r => setTimeout(r, 0));
                        }
                    }

                    console.timeEnd(`DataJunkie.extractFullText:${file.name}`);
                    console.log(`[DataJunkie] Extracted ${lineMetadata.length} lines with coordinates`);
                    resolve({ text: fullText, lineMetadata });
                } catch (error) {
                    console.timeEnd(`DataJunkie.extractFullText:${file.name}`);
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * COMPLETE SCAN: Process file through all steps (Optimized v33.0)
     */
    async scanAndProcess(file) {
        // Step 1: Extract full text ONCE (now returns { text, lineMetadata })
        const extraction = await this.extractFullText(file);
        const fullText = extraction.text;
        const lineMetadata = extraction.lineMetadata || [];

        // Step 2: Check if bank statement
        const isStatement = this.isBankStatementSync(fullText, file.name);
        if (!isStatement) {
            return { skipped: true, reason: 'Not a bank statement' };
        }

        // Step 3: Parse with AI/Regex via ParserRouter (now with lineMetadata!)
        let parsed;
        try {
            const router = window.parserRouter;
            if (!router) throw new Error('ParserRouter not found.');

            const result = await router.parseStatement(fullText, file.name, lineMetadata);

            parsed = {
                bank: result.brandDetection?.fullBrandName || 'Unknown Bank',
                accountType: result.brandDetection?.accountType || 'Unknown Account',
                accountHolder: result.accountHolder || 'Unknown',
                brandDetection: result.brandDetection,
                transactions: result.transactions.map(tx => ({
                    Date: tx.date,
                    Description: tx.description,
                    Amount: tx.debit || tx.credit,
                    Type: tx.debit ? 'Debit' : 'Credit',
                    Debit: tx.debit,
                    Credit: tx.credit,
                    _brand: tx._brand,
                    _bank: tx._bank,
                    _tag: tx._tag,
                    _accountType: tx._accountType,
                    _prefix: tx._prefix,
                    _inst: tx._inst,
                    _transit: tx._transit,
                    _acct: tx._acct,
                    _fingerprint: tx._fingerprint,
                    _refNum: tx.refNum,
                    rawText: tx.rawText,
                    audit: tx.audit,
                    refCode: tx.refCode
                })),
                openingBalance: result.openingBalance || 0
            };
        } catch (error) {
            console.error('DataJunkie: Parser failed, attempting fallback', error);
            if (window.pdfParser) {
                parsed = await window.pdfParser.parsePDF(file);
            } else {
                throw error;
            }
        }

        const unique = parsed.transactions;
        this.updateBrandUI(parsed.bank, parsed.accountType);

        return {
            skipped: false,
            transactions: unique,
            duplicatesRemoved: 0,
            bank: parsed.bank,
            accountType: parsed.accountType,
            accountHolder: parsed.accountHolder,
            brandDetection: parsed.brandDetection,
            openingBalance: parsed.openingBalance
        };
    }

    updateBrandUI(bank, accountType) {
        try {
            const accountTypeElement = document.getElementById('v5-account-type');
            if (accountTypeElement && bank && accountType) {
                accountTypeElement.textContent = `${bank} - ${accountType}`;
            }
        } catch (error) {
            console.error('Failed to update brand UI:', error);
        }
    }

    createSmartHash(date, amount, description) {
        let normalizedDate = '';
        try {
            const d = new Date(date);
            if (!isNaN(d.getTime())) normalizedDate = d.toISOString().split('T')[0];
        } catch (e) {
            normalizedDate = String(date).trim();
        }

        let normalizedAmount = parseFloat(String(amount).replace(/[$,]/g, ''));
        if (isNaN(normalizedAmount)) normalizedAmount = 0;
        normalizedAmount = normalizedAmount.toFixed(2);

        let desc = String(description).trim().toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 100);

        return `${normalizedDate}-${normalizedAmount}-${desc}`;
    }
}

// Global Singleton
if (typeof window !== 'undefined') {
    window.dataJunkie = new DataJunkie();
}
