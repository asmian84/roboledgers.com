/**
 * DATA JUNKIE - Complete Smart Scanner System
 * 
 * Purpose: Scan PDFs, identify bank statements, extract merchants,
 *          detect duplicates, and build merchant dictionary
 * 
 * Flow: PDF Upload → Bank Statement Detection → Smart Extraction → 
 *       Duplicate Detection → Dictionary Learning
 */

class DataJunkie {
    constructor() {
        // Bank statement detection patterns
        this.statementKeywords = [
            'account statement', 'bank statement', 'credit card statement',
            'transaction history', 'cibc', 'rbc', 'td', 'scotiabank', 'bmo',
            'opening balance', 'closing balance', 'purchases', 'payments'
        ];

        // Exclusion patterns (NOT bank statements)
        this.exclusionKeywords = [
            'invoice', 'receipt', 'quote', 'cra', 'canada revenue',
            'tax return', 't4', 'notice of assessment', 'audit',
            'contract', 'agreement', 'client data'
        ];


    }

    /**
     * STEP 1: Scan PDF and determine if it's a bank statement
     */
    async isBankStatement(file) {
        try {
            // Quick text extraction (first 2 pages)
            const text = await this.extractQuickText(file);
            const lowerText = text.toLowerCase();

            // Check for exclusion keywords first
            for (const keyword of this.exclusionKeywords) {
                if (lowerText.includes(keyword)) {

                    return false;
                }
            }

            // Check for statement keywords
            let keywordCount = 0;
            for (const keyword of this.statementKeywords) {
                if (lowerText.includes(keyword)) {
                    keywordCount++;
                }
            }

            // Need at least 3 statement keywords
            const isStatement = keywordCount >= 3;



            return isStatement;

        } catch (error) {

            return false;
        }
    }

    /**
     * STEP 2: Extract text from PDF (fast scan)
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
     * STEP 3: Create smart transaction hash (ignores formatting)
     */
    createSmartHash(date, amount, description) {
        // Normalize date
        let normalizedDate = '';
        try {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                normalizedDate = d.toISOString().split('T')[0];
            }
        } catch (e) {
            normalizedDate = String(date).trim();
        }

        // Normalize amount
        let normalizedAmount = parseFloat(String(amount).replace(/[$,]/g, ''));
        if (isNaN(normalizedAmount)) normalizedAmount = 0;
        normalizedAmount = normalizedAmount.toFixed(2);

        // Smart description normalization
        let desc = String(description).trim()
            // Remove card numbers
            .replace(/\b\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\b/g, '')
            // Remove reference numbers
            .replace(/\b(ref|reference)[\s:#]*\d+/gi, '')
            // Remove dates
            .replace(/\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/g, '')
            // Remove phone numbers
            .replace(/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/g, '')
            // Remove "Q" prefix
            .replace(/^Q\s+/i, '')
            // Normalize spaces
            .replace(/\s+/g, ' ')
            .trim();

        // Extract merchant part (before location)
        const parts = desc.split(/\s{2,}|\t/);
        const merchantPart = parts[0] || desc;

        // Normalize for matching
        const normalizedDesc = merchantPart
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .substring(0, 100);

        return `${normalizedDate}-${normalizedAmount}-${normalizedDesc}`;
    }

    /**
     * STEP 4: Detect duplicates using smart hashing
     */
    async detectDuplicates(transactions) {


        const existingTxns = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
        const existingHashes = new Set(existingTxns.map(t =>
            this.createSmartHash(
                t.date || t.Date,
                t.amount || t.Amount,
                t.description || t.Description
            )
        ));

        let duplicateCount = 0;
        let learnedCount = 0;

        const unique = transactions.filter(t => {
            const hash = this.createSmartHash(t.Date, t.Amount, t.Description);

            if (existingHashes.has(hash)) {
                duplicateCount++;


                // LEARN FROM DUPLICATE (it's a confirmed pattern!)
                this.learnFromDuplicate(t);
                learnedCount++;

                return false;
            }

            // Add to set for intra-file deduplication
            existingHashes.add(hash);
            return true;
        });



        return unique;
    }

    /**
     * STEP 5: Learn from duplicate (reinforces pattern)
     */
    async learnFromDuplicate(transaction) {
        if (!window.merchantDictionary) return;

        try {
            // Let the dictionary handle canonicalization, extraction, and purging
            await window.merchantDictionary.learnFromTransaction({
                raw_description: transaction.Description,
                source: 'Data Junkie - Duplicate'
            });


        } catch (error) {

        }
    }

    /**
     * STEP 6: Extract merchant name (smart pattern recognition)
     */
    extractMerchantName(description) {
        if (!description) return null;

        // Filter junk
        const junkPatterns = [
            /^Your new charges/i,
            /^Page \d+ of \d+/i,
            /^MR [A-Z\s]+ CIBC/i,
            /^Information about/i
        ];

        for (const pattern of junkPatterns) {
            if (pattern.test(description)) return null;
        }

        // Extract from structured format
        const structuredMatch = description.match(/^([A-Z0-9\s&'*.-]+?)\s{2,}([A-Z\s]+?)\s{2,}([A-Z]{2})\s{2,}(.+)$/i);
        if (structuredMatch) {
            let name = structuredMatch[1].trim().replace(/^Q\s+/i, '');
            return this.formatMerchantName(name);
        }

        // Extract from phone format
        const phoneMatch = description.match(/^([A-Z0-9\s&'*.-]+?)\s+\d{3}-\d{3}-\d{4}/i);
        if (phoneMatch) {
            return this.formatMerchantName(phoneMatch[1].trim());
        }

        // Take first part
        const parts = description.split(/\s{2,}|\t/);
        if (parts.length > 0) {
            let name = parts[0].trim().replace(/^Q\s+/i, '');
            return this.formatMerchantName(name);
        }

        return null;
    }

    /**
     * Format merchant name (title case, clean)
     */
    formatMerchantName(name) {
        if (!name || name.length < 3) return null;

        name = name
            .replace(/\s*\*\d+$/i, '')
            .replace(/\s*#\d+$/i, '')
            .trim();

        return name.split(/\s+/)
            .map(word => {
                if (word.length <= 3 && /^[A-Z]+$/.test(word)) return word;
                return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
            })
            .join(' ');
    }

    /**
     * LEARN NEGATIVE PATTERN (from user deletions)
     * When user deletes a merchant, mark those patterns as "not merchants"
     */
    async learnNegativePattern(pattern, metadata = {}) {
        try {
            // Store in localStorage for persistence
            const negativePatterns = JSON.parse(localStorage.getItem('ab3_negative_patterns') || '[]');

            const entry = {
                pattern: pattern,
                normalized: pattern.toLowerCase().replace(/[^a-z0-9]/g, ''),
                reason: metadata.reason || 'user_deleted',
                merchant_name: metadata.merchant_name || 'Unknown',
                timestamp: metadata.timestamp || new Date().toISOString(),
                learned_from: 'user_action'
            };

            // Avoid duplicates
            const exists = negativePatterns.some(p => p.normalized === entry.normalized);
            if (!exists) {
                negativePatterns.push(entry);
                localStorage.setItem('ab3_negative_patterns', JSON.stringify(negativePatterns));

            }

        } catch (error) {

        }
    }

    /**
     * CHECK IF PATTERN IS NEGATIVE (should be excluded)
     */
    isNegativePattern(description) {
        try {
            const negativePatterns = JSON.parse(localStorage.getItem('ab3_negative_patterns') || '[]');
            const normalized = description.toLowerCase().replace(/[^a-z0-9]/g, '');

            return negativePatterns.some(p => {
                // Exact match
                if (p.normalized === normalized) return true;

                // Partial match (pattern is substring)
                if (normalized.includes(p.normalized) && p.normalized.length > 10) return true;

                return false;
            });
        } catch (error) {
            return false;
        }
    }

    /**
     * COMPLETE SCAN: Process file through all steps
     */
    async scanAndProcess(file) {
        // Step 1: Check if bank statement
        const isStatement = await this.isBankStatement(file);
        if (!isStatement) {
            return { skipped: true, reason: 'Not a bank statement' };
        }

        // Step 2: Parse PDF (existing parser)
        const parsed = await window.pdfParser.parsePDF(file);

        // Step 3: Detect duplicates
        const unique = await this.detectDuplicates(parsed.transactions);

        // Step 4: Return clean data
        return {
            skipped: false,
            transactions: unique,
            duplicatesRemoved: parsed.transactions.length - unique.length,
            bank: parsed.bank
        };
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.dataJunkie = new DataJunkie();

}
