import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Bank Brand Detector
 * Identifies which bank and account type from PDF text
 */
export class BrandDetector {
    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Vite environment variable
        if (!apiKey) {
            throw new Error('VITE_GEMINI_API_KEY not found');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: {
                temperature: 0.0
            }
        });
    }

    /**
     * Detect bank brand and account type from statement text
     * @param {string} statementText - First page of PDF
     * @returns {Promise<Object>} { brand, accountType, fullBrandName, parserName }
     */
    async detectBrand(statementText) {
        const prompt = `You are a bank statement brand detector. Identify the exact bank and account type.

IMPORTANT: Be EXTREMELY specific. Look for exact brand names, logos, and headers.

Banks to detect:
- BMO (Bank of Montreal, BMO Bank of Montreal)
- CIBC (Canadian Imperial Bank of Commerce)
- RBC (Royal Bank of Canada, RBC Royal Bank)
- Scotiabank (Scotia, Bank of Nova Scotia)
- TD (Toronto-Dominion Bank, TD Canada Trust)
- Amex (American Express)

Account types:
- Chequing (Business Chequing, Personal Chequing, Checking)
- Savings
- Visa (Visa Card, Visa Infinite, etc.)
- Mastercard (MC, MasterCard)
- Amex (American Express card)

Return ONLY this JSON structure:
{
  "brand": "BMO" | "CIBC" | "RBC" | "Scotiabank" | "TD" | "Amex",
  "accountType": "Chequing" | "Savings" | "Visa" | "Mastercard" | "Amex",
  "fullBrandName": "Bank of Montreal" | "CIBC" | "Royal Bank of Canada" | "Scotiabank" | "TD Canada Trust" | "American Express",
  "confidence": 0.0 to 1.0
}

STATEMENT TEXT:
${statementText.substring(0, 2000)}`;

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Strip markdown code blocks if present (```json ... ```)
            text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // Parse JSON response
            const parsed = JSON.parse(text);
            // Add parser name based on detection
            parsed.parserName = `${parsed.brand}${parsed.accountType}Parser`;

            console.log(`✅ Brand detected: ${parsed.brand} ${parsed.accountType} (${parsed.confidence})`);
            return parsed;

        } catch (error) {
            console.error('Brand detection failed:', error);
            throw new Error(`Failed to detect brand: ${error.message}`);
        }
    }
}

export const brandDetector = new BrandDetector();

// Expose to window for file:// compatibility
window.BrandDetector = BrandDetector;
window.brandDetector = brandDetector;
