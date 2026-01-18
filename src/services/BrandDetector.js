/**
 * Brand Detector
 * Identifies the bank brand from statement text
 */
class BrandDetector {
    constructor() {
        const apiKey = window.VITE_GEMINI_API_KEY;
        this.statementKeywords = {
            'RBC': ['royal bank', 'rbc', 'royal trust'],
            'TD': ['td canada trust', 'td bank', 'toronto-dominion'],
            'Scotiabank': ['scotiabank', 'bank of nova scotia'],
            'BMO': ['bank of montreal', 'bmo'],
            'CIBC': ['cibc', 'canadian imperial bank of commerce'],
            'Amex': ['american express', 'amex']
        };
    }

    async detectBrand(text) {
        const lowerText = text.toLowerCase();
        let detectedBrand = 'Unknown';
        let fullBrandName = 'Unknown Bank';

        for (const [brand, keywords] of Object.entries(this.statementKeywords)) {
            if (keywords.some(k => lowerText.includes(k))) {
                detectedBrand = brand;
                fullBrandName = brand; // Simplify for now
                break;
            }
        }

        // Detect account type
        let accountType = 'Chequing';
        if (lowerText.includes('visa') || lowerText.includes('mastercard') || lowerText.includes('credit card')) {
            accountType = 'CreditCard';
        }

        return {
            brand: detectedBrand,
            fullBrandName,
            accountType,
            confidence: 0.9,
            parserName: `${detectedBrand}${accountType}`
        };
    }
}

// Expose to window for file:// compatibility
window.BrandDetector = BrandDetector;
window.brandDetector = new BrandDetector();
