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

DESCRIPTION CLEANING (CRITICAL - MUST FOLLOW):
This is the MOST IMPORTANT rule. Clean ALL junk from descriptions:

1. **Remove ALL leading dates** (any format):
   - "01 Oct" → REMOVE
   - "03 Apr" → REMOVE  
   - "14 Feb" → REMOVE
   - "Wed, Jan. 31," → REMOVE
   - Remove ANY date-like pattern at the start

2. **Remove trailing codes**:
   - "- S", "- 8", "- A", "- F" → REMOVE
   - Transaction IDs, reference numbers → REMOVE

3. **Remove extra formatting**:
   - Multiple spaces → single space
   - Trailing/leading whitespace → REMOVE

4. **Keep ONLY the core merchant/transaction name**

**EXAMPLES (YOU MUST DO THIS):**
- Input: "01 Oct Misc Payment AMEX BILL PYMT" → Output: "Misc Payment AMEX BILL PYMT"
- Input: "03 Apr Online Banking transfer - 3092" → Output: "Online Banking transfer"
- Input: "04 Jul e-Transfer sent Jonathan Applewood" → Output: "e-Transfer sent Jonathan Applewood"
- Input: "06 Jun Online Banking transfer - 8865" → Output: "Online Banking transfer"
- Input: "13 Mar Misc Payment UNIRECO COMMERC TELPAY INC" → Output: "Misc Payment UNIRECO COMMERC TELPAY INC"
- Input: "Wed, Jan. 31, service charge" → Output: "service charge"

**IF YOU SEE A LEADING DATE PATTERN, YOU MUST REMOVE IT!**

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
      "description": "CLEAN merchant name (NO leading dates, NO codes)",
      "debit": number or null,
      "credit": number or null
    }
  ]
}

STATEMENT TEXT:
${statementText}`;
    }

    /**
     * Parse bank statement
     */
    async parse(statementText) {
        const prompt = this.buildPrompt(statementText);

        try {
            const result = await this.model.generateContent(prompt);
            const responseText = result.response.text();

            // Strip markdown code blocks if present
            let jsonText = responseText.trim();
            if (jsonText.startsWith('```')) {
                jsonText = jsonText.replace(/^```json?\s*\n?/, '').replace(/\n?```\s*$/, '');
            }

            const parsed = JSON.parse(jsonText);

            // CRITICAL: Post-process descriptions to remove dates (AI often fails at this)
            if (parsed.transactions && Array.isArray(parsed.transactions)) {
                parsed.transactions = parsed.transactions.map(tx => ({
                    ...tx,
                    description: this.cleanDescription(tx.description || '')
                }));
            }

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
     * Forcibly clean description (fallback if AI fails)
     * Remove leading date patterns that AI misses
     */
    cleanDescription(description) {
        if (!description) return '';

        let cleaned = description.trim();

        // Remove leading date patterns (various formats)
        // Pattern 1: "01 Oct", "14 Feb", "23 Apr"
        cleaned = cleaned.replace(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+/i, '');

        // Pattern 2: "Wed, Jan. 31,", "Mon, Dec. 5,"
        cleaned = cleaned.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s*/i, '');

        // Pattern 3: Any "DD MMM" at start
        cleaned = cleaned.replace(/^\d{1,2}\s+[A-Z][a-z]{2}\s+/i, '');

        // Remove trailing reference codes: "- S", "- 8", "- 3092", etc.
        cleaned = cleaned.replace(/\s+-\s+[A-Z0-9]+$/i, '');

        // Remove extra whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
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
