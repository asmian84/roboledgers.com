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
            }
        ];

        // Account type keywords (unchanged from v1)
        this.bankAccountKeywords = [
            'chequing account', 'savings account', 'deposit account',
            'plan deposit account', 'value assist',
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
    async detectBrand(text) {
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
                console.log(`[DETECT] Bank keyword found: "${kw}"`);
            }
        }

        for (const kw of this.creditCardKeywords) {
            if (regions.full.includes(kw)) {
                ccScore += 2;
                console.log(`[DETECT] CC keyword found: "${kw}"`);
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

        let accountType = 'Chequing';
        if (ccScore > bankScore) {
            accountType = 'CreditCard';
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

        // Calculate normalized confidence (0-1 scale)
        const confidence = Math.min(maxScore / 30, 1.0); // 30 points = 100% confidence

        console.log(`[DETECT] Brand: ${detectedBrand}, Bank Score: ${bankScore}, CC Score: ${ccScore} → ${accountType} (${subType}), Prefix: ${prefix}`);
        console.log(`[DETECT] Confidence: ${(confidence * 100).toFixed(0)}% (${maxScore.toFixed(1)} points)`);

        return {
            brand: detectedBrand,
            fullBrandName: detectedBrand,
            legalName: winnerSignature?.legalName || detectedBrand,
            institutionCode: winnerSignature?.institutionCode || null,
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
