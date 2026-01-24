/**
 * Brand Detector v2.0
 * Enhanced bank detection with weighted confidence scoring
 * 
 * Features:
 * - Header/Footer bias (reduces false positives from transaction descriptions)
 * - Canadian institution codes (001-010)
 * - Legal name matching
 * - Domain detection
 * - Evidence tracking for debugging
 */
class BrandDetector {
    constructor() {
        // Canadian Bank Signatures with institution codes
        this.bankSignatures = [
            {
                id: 'RBC',
                legalName: 'Royal Bank of Canada',
                marketingNames: ['RBC Royal Bank', 'RBC'],
                institutionCode: '003',
                domains: ['rbc.com', '@rbc.com'],
                addressKeywords: ['RBC WaterPark Place', 'Royal Bank Plaza']
            },
            {
                id: 'TD',
                legalName: 'Toronto-Dominion Bank',
                marketingNames: ['TD Canada Trust', 'TD Bank'],
                institutionCode: '004',
                domains: ['td.com', '@td.com'],
                addressKeywords: ['Toronto Dominion Centre', 'P.O. Box 1']
            },
            {
                id: 'Scotiabank',
                legalName: 'The Bank of Nova Scotia',
                marketingNames: ['Scotiabank', 'Scotia'],
                institutionCode: '002',
                domains: ['scotiabank.com', '@scotiabank.com'],
                addressKeywords: ['Scotia Plaza']
            },
            {
                id: 'BMO',
                legalName: 'Bank of Montreal',
                marketingNames: ['BMO', 'BMO Bank of Montreal'],
                institutionCode: '001',
                domains: ['bmo.com', '@bmo.com'],
                addressKeywords: ['First Canadian Place']
            },
            {
                id: 'CIBC',
                legalName: 'Canadian Imperial Bank of Commerce',
                marketingNames: ['CIBC'],
                institutionCode: '010',
                domains: ['cibc.com', '@cibc.com'],
                addressKeywords: ['Commerce Court']
            },
            {
                id: 'Tangerine',
                legalName: 'Tangerine Bank',
                marketingNames: ['Tangerine'],
                institutionCode: '614',
                domains: ['tangerine.ca', '@tangerine.ca'],
                addressKeywords: []
            },
            {
                id: 'Amex',
                legalName: 'American Express Bank of Canada',
                marketingNames: ['American Express', 'Amex'],
                institutionCode: null, // Not a traditional Canadian bank
                domains: ['americanexpress.com', '@aexp.com'],
                addressKeywords: []
            },
            {
                id: 'NBC',
                legalName: 'National Bank of Canada',
                marketingNames: ['National Bank', 'NBC'],
                institutionCode: '006',
                domains: ['nbc.ca', '@nbc.ca'],
                addressKeywords: []
            },
            {
                id: 'HSBC',
                legalName: 'HSBC Bank Canada',
                marketingNames: ['HSBC'],
                institutionCode: '016',
                domains: ['hsbc.ca', '@hsbc.ca'],
                addressKeywords: []
            },
            {
                id: 'EQBank',
                legalName: 'Equitable Bank',
                marketingNames: ['EQ Bank'],
                institutionCode: '623',
                domains: ['eqbank.ca'],
                addressKeywords: []
            },
            {
                id: 'Simplii',
                legalName: 'Simplii Financial',
                marketingNames: ['Simplii'],
                institutionCode: '010', // Share CIBC code
                domains: ['simplii.com'],
                addressKeywords: []
            },
            {
                id: 'Manulife',
                legalName: 'Manulife Bank of Canada',
                marketingNames: ['Manulife Bank', 'Manulife'],
                institutionCode: '540',
                domains: ['manulifebank.ca'],
                addressKeywords: []
            },
            {
                id: 'CWB',
                legalName: 'Canadian Western Bank',
                marketingNames: ['CWB', 'Canadian Western'],
                institutionCode: '030',
                domains: ['cwb.com'],
                addressKeywords: []
            },
            {
                id: 'Laurentian',
                legalName: 'Laurentian Bank of Canada',
                marketingNames: ['Laurentian Bank'],
                institutionCode: '039',
                domains: ['laurentianbank.ca'],
                addressKeywords: []
            },
            {
                id: 'Central1',
                legalName: 'Central 1 Credit Union',
                marketingNames: ['Central 1'],
                institutionCode: '809', // Also 828, 869
                domains: ['central1.com'],
                addressKeywords: []
            }
        ];

        // Account type keywords (unchanged from v1)
        this.bankAccountKeywords = [
            'chequing account', 'savings account', 'deposit account',
            'plan deposit account', 'value assist', 'business plan', 'community plan',
            'amounts debited from your account', 'amounts credited to your account',
            'opening balance', 'closing balance', 'direct deposit',
            'interac e-transfer', 'abm withdrawal', 'debit card purchase'
        ];

        this.creditCardKeywords = [
            'credit card statement', 'statement of account', 'minimum payment',
            'credit limit', 'available credit', 'payment due date',
            'previous balance', 'new charges', 'annual fee',
            'interest charged', 'cash advance', 'credit card number',
            'account ending in'
        ];
    }

    /**
     * Split text into weighted regions
     */
    splitRegions(text) {
        const lines = text.split('\n');
        const totalLines = lines.length;

        const headerLines = Math.min(20, Math.floor(totalLines * 0.15));
        const footerLines = Math.min(10, Math.floor(totalLines * 0.10));

        return {
            header: lines.slice(0, headerLines).join('\n').toLowerCase(),
            body: lines.slice(headerLines, totalLines - footerLines).join('\n').toLowerCase(),
            footer: lines.slice(totalLines - footerLines).join('\n').toLowerCase(),
            full: text.toLowerCase()
        };
    }

    /**
     * Score a bank signature against a text region
     */
    scoreRegion(regionText, bankSignature, weight) {
        let score = 0;
        const evidence = [];

        // 1. Legal name match (+5 points base)
        if (regionText.includes(bankSignature.legalName.toLowerCase())) {
            const points = 5 * weight;
            score += points;
            evidence.push(`Legal name "${bankSignature.legalName}" (${points.toFixed(1)})`);
        }

        // 2. Marketing names (+2 points base each)
        for (const name of bankSignature.marketingNames) {
            if (regionText.includes(name.toLowerCase())) {
                const points = 2 * weight;
                score += points;
                evidence.push(`Marketing name "${name}" (${points.toFixed(1)})`);
                break; // Only count once
            }
        }

        // 3. Institution code (+10 points base - very strong signal)
        if (bankSignature.institutionCode) {
            // Look for patterns like "003", "#003", "Institution 003"
            const codePatterns = [
                new RegExp(`\\b${bankSignature.institutionCode}\\b`),
                new RegExp(`#${bankSignature.institutionCode}\\b`),
                new RegExp(`institution\\s+${bankSignature.institutionCode}`, 'i')
            ];

            for (const pattern of codePatterns) {
                if (pattern.test(regionText)) {
                    const points = 10 * weight;
                    score += points;
                    evidence.push(`Institution code "${bankSignature.institutionCode}" (${points.toFixed(1)})`);
                    break;
                }
            }
        }

        // 4. Domain detection (+3 points base)
        for (const domain of bankSignature.domains) {
            if (regionText.includes(domain.toLowerCase())) {
                const points = 3 * weight;
                score += points;
                evidence.push(`Domain "${domain}" (${points.toFixed(1)})`);
                break;
            }
        }

        // 5. Address keywords (+1 point base)
        for (const addr of bankSignature.addressKeywords) {
            if (regionText.includes(addr.toLowerCase())) {
                const points = 1 * weight;
                score += points;
                evidence.push(`Address "${addr}" (${points.toFixed(1)})`);
                break;
            }
        }

        return { score, evidence };
    }

    /**
     * Main detection method with weighted scoring
     */
    async detectBrand(text, filename = '') {
        const regions = this.splitRegions(text);
        const scores = {};
        const allEvidence = {};

        // Score each bank across all regions
        for (const bank of this.bankSignatures) {
            let totalScore = 0;
            const evidenceList = [];

            // Header: 3x weight
            const headerResult = this.scoreRegion(regions.header, bank, 3.0);
            totalScore += headerResult.score;
            evidenceList.push(...headerResult.evidence.map(e => `[HEADER] ${e}`));

            // Footer: 2x weight
            const footerResult = this.scoreRegion(regions.footer, bank, 2.0);
            totalScore += footerResult.score;
            evidenceList.push(...footerResult.evidence.map(e => `[FOOTER] ${e}`));

            // Body: 0.5x weight (de-emphasize transaction mentions)
            const bodyResult = this.scoreRegion(regions.body, bank, 0.5);
            totalScore += bodyResult.score;
            evidenceList.push(...bodyResult.evidence.map(e => `[BODY] ${e}`));

            scores[bank.id] = totalScore;
            allEvidence[bank.id] = evidenceList;
        }

        // Find winner
        let detectedBrand = 'Unknown';
        let maxScore = 0;
        let winnerSignature = null;

        for (const [bankId, score] of Object.entries(scores)) {
            if (score > maxScore) {
                maxScore = score;
                detectedBrand = bankId;
                winnerSignature = this.bankSignatures.find(b => b.id === bankId);
            }
        }

        // --- Account Type Detection (unchanged logic) ---
        let bankScore = 0;
        let ccScore = 0;

        for (const kw of this.bankAccountKeywords) {
            if (regions.full.includes(kw)) {
                bankScore += 2;
                // console.log(`[DETECT] Bank keyword found: "${kw}"`);
            }
        }

        for (const kw of this.creditCardKeywords) {
            if (regions.full.includes(kw)) {
                ccScore += 2;
                // console.log(`[DETECT] CC keyword found: "${kw}"`);
            }
        }

        if (regions.full.includes('visa') || regions.full.includes('mastercard')) {
            ccScore += 1;
        }
        if (regions.full.includes('chequing') || regions.full.includes('savings')) {
            bankScore += 1;
        }
        if (detectedBrand === 'Amex') {
            ccScore += 10;
        }

        // --- FILENAME SIGNALS (High Confidence) ---
        // Override/boost based on explicit filename keywords
        const fn = filename.toLowerCase();
        let forcedType = null;

        // Flexible matching for filename (handles spaces, underscores, dashes)
        if (fn.includes('chequing') || /business[\s._-]*plan/.test(fn) || /community[\s._-]*plan/.test(fn) || fn.includes('saving')) {
            forcedType = 'Chequing';
            console.log('[DETECT] 🚨 FORCE OVERRIDE: Filename implies Chequing Account');
        } else if (fn.includes('visa') || fn.includes('mastercard') || fn.includes('credit_card')) {
            forcedType = 'CreditCard';
            console.log('[DETECT] 🚨 FORCE OVERRIDE: Filename implies Credit Card');
        }

        // --- TEXT CONTENT HARD OVERRIDES (Highest Confidence) ---
        // If the statement explicitly says "BUSINESS CHEQUING", it is one. 
        // This trumps filename and soft scoring.
        const fullText = regions.full;
        if (fullText.includes('business chequing') || fullText.includes('business checking')) {
            forcedType = 'Chequing';
            console.log('[DETECT] 🚨 FORCE OVERRIDE: Text explicitly says "BUSINESS CHEQUING"');
        }

        let accountType = forcedType || 'Chequing';

        if (!forcedType) {
            if (ccScore > bankScore) {
                accountType = 'CreditCard';
            }
        }

        // Detect sub-type
        let subType = accountType;
        if (accountType === 'Chequing' && regions.full.includes('savings')) {
            subType = 'Savings';
        } else if (accountType === 'CreditCard') {
            if (detectedBrand === 'Amex') {
                subType = 'Amex';
            } else if (regions.full.includes('visa')) {
                subType = 'Visa';
            } else if (regions.full.includes('mastercard')) {
                subType = 'Mastercard';
            }
        }

        const prefix = this.getPrefix(subType);

        // --- NEW: Metadata Extraction (Account, Transit, Inst) ---
        const metadata = this.extractAccountMetadata(regions.full, detectedBrand);

        // Calculate normalized confidence (0-1 scale)
        const confidence = Math.min(maxScore / 30, 1.0); // 30 points = 100% confidence

        // console.log(`[DETECT] Brand: ${detectedBrand}, Bank Score: ${bankScore}, CC Score: ${ccScore} → ${accountType} (${subType}), Prefix: ${prefix}`);
        // console.log(`[DETECT] Confidence: ${(confidence * 100).toFixed(0)}% (${maxScore.toFixed(1)} points)`);

        return {
            brand: detectedBrand,
            fullBrandName: detectedBrand,
            legalName: winnerSignature?.legalName || detectedBrand,
            institutionCode: metadata.institutionCode || winnerSignature?.institutionCode || null,
            transit: metadata.transit || null,
            accountNumber: metadata.accountNumber || null,
            accountType,
            subType,
            prefix,
            tag: subType,
            confidence: Math.max(confidence, 0.7), // Minimum 70% for backwards compat
            parserName: `${detectedBrand}${accountType}`,
            evidence: allEvidence[detectedBrand] || [],
            scores: scores // For debugging
        };
    }

    /**
     * Extract Transit and Account numbers using weighted regex
     */
    extractAccountMetadata(text, brand) {
        const metadata = {
            transit: null,
            accountNumber: null,
            institutionCode: null
        };

        // 1. Institution Code (If not already known)
        const instMap = {
            'RBC': '003', 'TD': '004', 'BMO': '001', 'CIBC': '010',
            'Scotiabank': '002', 'Tangerine': '614', 'NBC': '006',
            'HSBC': '016', 'EQBank': '623', 'Simplii': '010', 'Manulife': '540',
            'CWB': '030', 'Laurentian': '039', 'Central1': '809'
        };
        metadata.institutionCode = instMap[brand] || null;

        // 2. Transit Number (usually 5 digits)
        // Looking for "Transit 12345" or "Branch 12345"
        const transitRegex = /(?:transit|branch|br\.)\s*(?:no\.?|#)?\s*(\d{5})/i;
        const transitMatch = text.match(transitRegex);
        if (transitMatch) metadata.transit = transitMatch[1];

        // 3. Account Number
        // Looking for "Account 1234-567" or "Folio 1234567"
        // TD/RBC often use 7-digits. Amex/Credit cards use 15-16.
        const accRegexes = [
            /(?:account|folio|acct\.?)\s*(?:no\.?|#)?\s*(\d{4,16}[-\s]?\d{0,5})/i,
            /account\s+ending\s+in\s+(\d{4,5})/i
        ];

        for (const regex of accRegexes) {
            const match = text.match(regex);
            if (match) {
                metadata.accountNumber = match[1].replace(/\s/g, '');
                break;
            }
        }

        return metadata;
    }

    /**
     * Detect brand with learning system integration
     * Checks learned associations first, falls back to automated detection
     */
    async detectWithLearning(text, filename = '') {
        // Ensure learning service is available
        if (!window.bankLearningService) {
            console.warn('[DETECT] Learning service not available, using standard detection');
            return this.detectBrand(text, filename);
        }

        // 1. Generate fingerprint
        const fingerprint = await window.bankLearningService.generateFingerprint(text, filename);

        // 2. Check learned associations FIRST
        const learned = window.bankLearningService.recall(fingerprint);
        if (learned) {
            // console.log(`[DETECT] ✅ Using learned association: ${learned.brand} ${learned.accountType} (uploaded ${learned.uploadCount}x)`);

            // Return learned choice with full metadata
            return {
                brand: learned.brand,
                fullBrandName: learned.brand,
                legalName: this.bankSignatures.find(b => b.id === learned.brand)?.legalName || learned.brand,
                institutionCode: this.bankSignatures.find(b => b.id === learned.brand)?.institutionCode || null,
                accountType: learned.accountType,
                subType: learned.accountType,
                prefix: this.getPrefix(learned.accountType),
                tag: learned.accountType,
                confidence: 1.0,
                parserName: learned.parserName || `${learned.brand}${learned.accountType}`,
                evidence: [`Previously corrected by user (uploaded ${learned.uploadCount}x, ${learned.similarity}% match)`],
                source: 'user_learned',
                fingerprint: fingerprint // Store for later learning updates
            };
        }

        // 3. Fall back to automated detection
        const autoDetected = await this.detectBrand(text, filename);
        autoDetected.source = 'auto_detected';
        autoDetected.fingerprint = fingerprint; // Store for later learning

        // 4. Flag low confidence results for user review
        if (autoDetected.confidence < 0.8) {
            autoDetected.needsReview = true;
        }

        return autoDetected;
    }

    /**
     * Get the Ref# prefix based on account sub-type
     */
    getPrefix(subType) {
        const prefixMap = {
            'Chequing': 'CHQ',
            'Savings': 'SAV',
            'Visa': 'VISA',
            'Mastercard': 'MC',
            'Amex': 'AMEX',
            'CreditCard': 'CC'
        };
        return prefixMap[subType] || 'TXN';
    }
}

// Expose to window for file:// compatibility
window.BrandDetector = BrandDetector;
window.brandDetector = new BrandDetector();
