import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Base Bank Parser
 * Template for brand-specific parsers
 */
export class BaseBankParser {
    constructor(bankName, accountType, formatRules) {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY; // Vite environment variable
        if (!apiKey) {
            throw new Error('VITE_GEMINI_API_KEY not found');
        }

        this.bankName = bankName;
        this.accountType = accountType;
        this.formatRules = formatRules;

        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash', // Stable model
            generationConfig: {
                temperature: 0.1
            }
        });
    }

    /**
     * Build bank-specific prompt
     */
    buildPrompt(statementText) {
        return `You are parsing a ${this.bankName} ${this.accountType} statement SPECIFICALLY.

BANK-SPECIFIC FORMAT:
${this.formatRules}

CRITICAL RULES:
1. Parse ONLY: date, description, debit, credit
2. DO NOT parse balance (we calculate it)
3. Debit = money OUT (${this.accountType === 'Chequing' ? 'withdrawals, fees, transfers sent' : 'charges, purchases'})
4. Credit = money IN (${this.accountType === 'Chequing' ? 'deposits, transfers received' : 'payments, refunds'})
5. Both amounts are POSITIVE numbers
6. NEVER put values in BOTH debit AND credit for same transaction

DESCRIPTION CLEANING (VERY IMPORTANT):
Clean ALL junk from descriptions:
- Remove leading dates (e.g., "01 Oct", "03 Apr", "14 Feb")
- Remove trailing reference codes (e.g., "- S", "- 8", "A", "F")
- Remove transaction IDs and numbers after description
- Remove multiple spaces
- Keep ONLY the core merchant/transaction name
- Examples:
  * "01 Oct Misc Payment AMEX BILL F" → "Misc Payment AMEX BILL"
  * "03 Apr Online Banking transfer - S" → "Online Banking transfer"
  * "04 Jul e-Transfer sent Jonathan A" → "e-Transfer sent Jonathan"
  * "08 Jun Online Banking transfer - 8" → "Online Banking transfer"
  * "13 Mar Misc Payment UNIRECO CI" → "Misc Payment UNIRECO CI"

${this.accountType !== 'Chequing' ? `
CREDIT CARD SPECIFIC:
- Charges/Purchases shown as positive amounts → debit
- Payments/Credits shown as negative or labeled "Payment" → credit
` : ''}

Return ONLY valid JSON (no markdown):
{
  "accountHolder": "business or person name from statement",
  "accountNumber": "last 4 digits if visible",
  "statementPeriod": "date range",
  "openingBalance": number,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "CLEAN merchant name (no dates, no codes)",
      "debit": number or null,
      "credit": number or null
    }
  ]
}

STATEMENT TEXT:
${statementText}`;
    }

    /**
     * Parse statement
     */
    async parse(statementText) {
        const prompt = this.buildPrompt(statementText);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Strip markdown code blocks if present
            text = text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();

            // Parse JSON response
            const parsed = JSON.parse(text);

            this.validate(parsed);

            // Add metadata
            parsed.brand = this.bankName;
            parsed.accountType = this.accountType;

            console.log(`✅ ${this.bankName} ${this.accountType}: Parsed ${parsed.transactions.length} transactions`);
            return parsed;

        } catch (error) {
            console.error(`${this.bankName} ${this.accountType} parser failed:`, error);
            throw error;
        }
    }

    /**
     * Validate output
     */
    validate(parsed) {
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
            throw new Error('Missing transactions array');
        }

        parsed.transactions.forEach((tx, idx) => {
            if (!tx.date) throw new Error(`Transaction ${idx}: missing date`);
            if (!tx.description) throw new Error(`Transaction ${idx}: missing description`);

            // Critical: debit/credit mutual exclusivity
            if (tx.debit !== null && tx.credit !== null) {
                throw new Error(`Transaction ${idx}: both debit AND credit filled!`);
            }
            if (tx.debit === null && tx.credit === null) {
                throw new Error(`Transaction ${idx}: both debit AND credit are null!`);
            }

            // Amounts must be positive
            if (tx.debit !== null && tx.debit < 0) {
                throw new Error(`Transaction ${idx}: debit is negative`);
            }
            if (tx.credit !== null && tx.credit < 0) {
                throw new Error(`Transaction ${idx}: credit is negative`);
            }
        });
    }
}
