/**
 * Brand Detector
 * Identifies the bank brand AND account type from statement text
 * 
 * CRITICAL: Must correctly distinguish Bank Account vs Credit Card statements
 */
class BrandDetector {
    constructor() {
        // Bank brand keywords
        this.brandKeywords = {
            'RBC': ['royal bank', 'rbc', 'royal trust'],
            'TD': ['td canada trust', 'td bank', 'toronto-dominion'],
            'Scotiabank': ['scotiabank', 'bank of nova scotia', 'scotia'],
            'BMO': ['bank of montreal', 'bmo'],
            'CIBC': ['cibc', 'canadian imperial bank of commerce'],
            'Amex': ['american express', 'amex']
        };

        // Keywords that STRONGLY indicate BANK ACCOUNT (Chequing/Savings)
        this.bankAccountKeywords = [
            'chequing account',
            'savings account',
            'deposit account',
            'plan deposit account',
            'value assist',
            'amounts debited from your account',
            'amounts credited to your account',
            'opening balance',
            'closing balance',
            'direct deposit',
            'interac e-transfer',
            'abm withdrawal',
            'debit card purchase'
        ];

        // Keywords that STRONGLY indicate CREDIT CARD statement
        this.creditCardKeywords = [
            'credit card statement',
            'statement of account',
            'minimum payment',
            'credit limit',
            'available credit',
            'payment due date',
            'previous balance',
            'new charges',
            'annual fee',
            'interest charged',
            'cash advance',
            'credit card number',
            'account ending in'
        ];
    }

    async detectBrand(text) {
        const lowerText = text.toLowerCase();

        // 1. Detect Bank Brand
        let detectedBrand = 'Unknown';
        for (const [brand, keywords] of Object.entries(this.brandKeywords)) {
            if (keywords.some(k => lowerText.includes(k))) {
                detectedBrand = brand;
                break;
            }
        }

        // 2. Detect Account Type with weighted scoring
        let bankScore = 0;
        let ccScore = 0;

        // Check bank account keywords
        for (const kw of this.bankAccountKeywords) {
            if (lowerText.includes(kw)) {
                bankScore += 2;
                console.log(`[DETECT] Bank keyword found: "${kw}"`);
            }
        }

        // Check credit card keywords
        for (const kw of this.creditCardKeywords) {
            if (lowerText.includes(kw)) {
                ccScore += 2;
                console.log(`[DETECT] CC keyword found: "${kw}"`);
            }
        }

        // Light checks for generic terms (less weight)
        if (lowerText.includes('visa') || lowerText.includes('mastercard')) {
            ccScore += 1;
        }
        if (lowerText.includes('chequing') || lowerText.includes('savings')) {
            bankScore += 1;
        }

        // Amex is ALWAYS a credit card
        if (detectedBrand === 'Amex') {
            ccScore += 10;
        }

        // 3. Determine account type
        let accountType = 'Chequing'; // Default to bank account
        if (ccScore > bankScore) {
            accountType = 'CreditCard';
        }

        // 4. Detect sub-type for more specific tagging
        let subType = accountType;
        if (accountType === 'Chequing' && lowerText.includes('savings')) {
            subType = 'Savings';
        } else if (accountType === 'CreditCard') {
            if (detectedBrand === 'Amex') {
                subType = 'Amex';
            } else if (lowerText.includes('visa')) {
                subType = 'Visa';
            } else if (lowerText.includes('mastercard')) {
                subType = 'Mastercard';
            }
        }

        // 5. Get prefix for Ref# column
        const prefix = this.getPrefix(subType);

        console.log(`[DETECT] Brand: ${detectedBrand}, Bank Score: ${bankScore}, CC Score: ${ccScore} → ${accountType} (${subType}), Prefix: ${prefix}`);

        return {
            brand: detectedBrand,
            fullBrandName: detectedBrand,
            accountType,
            subType,
            prefix,
            tag: subType, // Display tag (e.g., "Chequing", "Visa", "Mastercard")
            confidence: Math.max(bankScore, ccScore) > 4 ? 0.95 : 0.7,
            parserName: `${detectedBrand}${accountType}`
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
            'CreditCard': 'CC' // Fallback
        };
        return prefixMap[subType] || 'TXN';
    }
}

// Expose to window for file:// compatibility
window.BrandDetector = BrandDetector;
window.brandDetector = new BrandDetector();
