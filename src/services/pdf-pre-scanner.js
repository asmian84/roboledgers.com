/**
 * Smart PDF Pre-Scanner
 * Intelligently detects bank statements by analyzing content patterns
 * No filename conventions required!
 */

class PDFPreScanner {
    constructor() {
        this.statementKeywords = [
            // Headers
            'account statement', 'bank statement', 'credit card statement',
            'transaction history', 'activity summary', 'monthly statement',

            // Canadian Banks
            'cibc', 'rbc', 'royal bank', 'td bank', 'scotiabank', 'bmo',
            'bank of montreal', 'tangerine', 'simplii', 'pc financial',
            'desjardins', 'national bank', 'hsbc', 'laurentian bank',

            // Fields
            'opening balance', 'closing balance', 'statement period',
            'account number', 'card number', 'previous balance',
            'new balance', 'current balance', 'available credit',

            // Transaction types
            'purchases', 'payments', 'credits', 'debits',
            'withdrawals', 'deposits', 'transfers', 'fees'
        ];

        this.exclusionKeywords = [
            'invoice', 'receipt', 'quote', 'estimate', 'proposal',
            'contract', 'agreement', 'policy', 'insurance',
            'tax return', 'w2', 'w-2', 't4', 't4a',
            'resume', 'cv', 'cover letter', 'application',
            'bill of lading', 'packing slip', 'shipping label'
        ];

        this.bankPatterns = {
            'CIBC': /cibc|canadian imperial bank/i,
            'RBC': /rbc|royal bank/i,
            'TD': /td bank|toronto.?dominion/i,
            'Scotiabank': /scotiabank|bank of nova scotia/i,
            'BMO': /bmo|bank of montreal/i,
            'Tangerine': /tangerine/i,
            'Simplii': /simplii/i,
            'PC Financial': /pc financial|president'?s choice/i,
            'Desjardins': /desjardins/i,
            'National Bank': /national bank|banque nationale/i
        };
    }

    /**
     * Quick scan of PDF to determine if it's a bank statement
     */
    async scanPDF(file) {
        try {
            // console.log(`🔍 Pre-scanning: ${file.name}`);

            // Extract text from first 3 pages only (fast)
            const text = await this.extractQuickText(file);

            // Calculate confidence
            const confidence = this.calculateConfidence(text);

            // Detect bank
            const bank = this.detectBank(text);

            // Detect statement type
            const type = this.detectStatementType(text);

            const result = {
                filename: file.name,
                filesize: file.size,
                isStatement: confidence >= 70,
                confidence: confidence,
                bank: bank,
                type: type,
                reason: this.getConfidenceReason(text, confidence)
            };

            // console.log(`${result.isStatement ? '✅' : '❌'} ${file.name}: ${confidence}% confidence`);

            return result;

        } catch (error) {
            console.error(`Failed to scan ${file.name}:`, error);
            return {
                filename: file.name,
                isStatement: false,
                confidence: 0,
                error: error.message
            };
        }
    }

    /**
     * Batch scan multiple PDFs
     */
    async scanBatch(files) {
        // console.log(`🔍 Batch scanning ${files.length} files...`);

        const results = [];
        const pdfFiles = Array.from(files).filter(f =>
            f.name.toLowerCase().endsWith('.pdf')
        );

        for (const file of pdfFiles) {
            const result = await this.scanPDF(file);
            results.push(result);
        }

        return this.categorizeResults(results);
    }

    /**
     * Extract text from first 3 pages (fast scan)
     */
    async extractQuickText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = async (e) => {
                try {
                    const typedArray = new Uint8Array(e.target.result);
                    const pdf = await pdfjsLib.getDocument(typedArray).promise;

                    // Only read first 3 pages for speed
                    const maxPages = Math.min(3, pdf.numPages);
                    let fullText = '';

                    for (let i = 1; i <= maxPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        const pageText = textContent.items.map(item => item.str).join(' ');
                        fullText += pageText + '\n';
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
     * Calculate confidence score (0-100)
     */
    calculateConfidence(text) {
        let score = 0;
        const lowerText = text.toLowerCase();

        // Transaction table detected (+40 points)
        if (this.hasTransactionTable(text)) score += 40;

        // Bank name found (+20 points)
        if (this.detectBank(text)) score += 20;

        // Account number pattern (+15 points)
        if (this.hasAccountNumber(text)) score += 15;

        // Date range found (+10 points)
        if (this.hasDateRange(text)) score += 10;

        // Balance keywords (+10 points)
        if (this.hasBalanceKeywords(lowerText)) score += 10;

        // Currency amounts (+5 points)
        if (this.hasCurrencyAmounts(text)) score += 5;

        // Statement keywords (+5 points each, max 10)
        let keywordCount = 0;
        for (const keyword of this.statementKeywords) {
            if (lowerText.includes(keyword)) {
                keywordCount++;
                if (keywordCount >= 2) break;
            }
        }
        score += keywordCount * 5;

        // Exclusion keywords (-50 points)
        if (this.hasExclusionKeywords(lowerText)) score -= 50;

        return Math.max(0, Math.min(100, score));
    }

    /**
     * Detect if text contains transaction table
     */
    hasTransactionTable(text) {
        // Look for multiple date patterns
        const datePattern = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g;
        const dates = text.match(datePattern);

        // Look for currency amounts
        const currencyPattern = /\$\s*\d+[,.]?\d*\.?\d{2}/g;
        const amounts = text.match(currencyPattern);

        // If we have multiple dates and amounts, likely a transaction table
        return dates && dates.length >= 5 && amounts && amounts.length >= 5;
    }

    /**
     * Detect bank from text
     */
    detectBank(text) {
        for (const [bank, pattern] of Object.entries(this.bankPatterns)) {
            if (pattern.test(text)) {
                return bank;
            }
        }
        return null;
    }

    /**
     * Detect statement type
     */
    detectStatementType(text) {
        const lower = text.toLowerCase();

        if (lower.includes('credit card') || lower.includes('visa') || lower.includes('mastercard')) {
            return 'CREDIT_CARD';
        }
        if (lower.includes('checking') || lower.includes('chequing') || lower.includes('savings')) {
            return 'BANK_ACCOUNT';
        }
        if (lower.includes('line of credit') || lower.includes('loc')) {
            return 'LINE_OF_CREDIT';
        }

        return 'UNKNOWN';
    }

    /**
     * Check for account number patterns
     */
    hasAccountNumber(text) {
        // Masked account: XXXX XXXX XXXX 1234
        const maskedPattern = /[X*]{4}\s*[X*]{4}\s*[X*]{4}\s*\d{4}/;

        // Full account: 1234 5678 9012 3456
        const fullPattern = /\b\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\b/;

        // Account number label
        const labelPattern = /account\s*number|card\s*number|compte/i;

        return maskedPattern.test(text) ||
            (fullPattern.test(text) && labelPattern.test(text));
    }

    /**
     * Check for date range
     */
    hasDateRange(text) {
        const rangePattern = /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{1,2}\s*[-–to]\s*(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s*\d{1,2}/i;
        const periodPattern = /statement\s*period|billing\s*period|période/i;

        return rangePattern.test(text) || periodPattern.test(text);
    }

    /**
     * Check for balance keywords
     */
    hasBalanceKeywords(lowerText) {
        const balanceKeywords = [
            'opening balance', 'closing balance', 'previous balance',
            'new balance', 'current balance', 'available credit'
        ];

        return balanceKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Check for currency amounts
     */
    hasCurrencyAmounts(text) {
        const currencyPattern = /\$\s*\d+[,.]?\d*\.?\d{2}/g;
        const amounts = text.match(currencyPattern);
        return amounts && amounts.length >= 3;
    }

    /**
     * Check for exclusion keywords
     */
    hasExclusionKeywords(lowerText) {
        return this.exclusionKeywords.some(keyword => lowerText.includes(keyword));
    }

    /**
     * Get human-readable reason for confidence score
     */
    getConfidenceReason(text, confidence) {
        const reasons = [];

        if (this.hasTransactionTable(text)) reasons.push('Transaction table detected');
        if (this.detectBank(text)) reasons.push(`Bank: ${this.detectBank(text)}`);
        if (this.hasAccountNumber(text)) reasons.push('Account number found');
        if (this.hasDateRange(text)) reasons.push('Date range found');
        if (this.hasBalanceKeywords(text.toLowerCase())) reasons.push('Balance keywords found');
        if (this.hasExclusionKeywords(text.toLowerCase())) reasons.push('⚠️ Exclusion keywords detected');

        return reasons.join(', ') || 'No clear indicators';
    }

    /**
     * Categorize scan results
     */
    categorizeResults(results) {
        const confirmed = results.filter(r => r.confidence >= 90);
        const likely = results.filter(r => r.confidence >= 70 && r.confidence < 90);
        const uncertain = results.filter(r => r.confidence >= 50 && r.confidence < 70);
        const rejected = results.filter(r => r.confidence < 50);

        return {
            total: results.length,
            confirmed: confirmed,
            likely: likely,
            uncertain: uncertain,
            rejected: rejected,
            summary: {
                confirmed: confirmed.length,
                likely: likely.length,
                uncertain: uncertain.length,
                rejected: rejected.length
            }
        };
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.pdfPreScanner = new PDFPreScanner();
    // console.log('🔍 PDF Pre-Scanner loaded');
}
