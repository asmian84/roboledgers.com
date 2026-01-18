/**
 * Base Bank Parser
 * Template for brand-specific parsers
 */
class BaseBankParser {
    constructor(bankName, accountType, formatRules) {
        this.bankName = bankName;
        this.accountType = accountType;
        this.formatRules = formatRules;
    }

    /**
     * Parse statement text using Gemini AI
     * @param {string} statementText 
     * @returns {Promise<Object>}
     */
    async parse(statementText) {
        const prompt = this.buildPrompt(statementText);
        const apiKey = window.VITE_GEMINI_API_KEY;

        if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY') {
            throw new Error('VITE_GEMINI_API_KEY not found or not set');
        }

        try {
            console.log(`🤖 BaseBankParser: Sending request to Gemini for ${this.bankName} ${this.accountType}...`);

            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{ text: prompt }]
                    }],
                    generationConfig: {
                        temperature: 0.1,
                        responseMimeType: 'application/json'
                    }
                })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error?.message || `API error: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;

            // Parse JSON response
            const parsed = JSON.parse(text);

            // Post-process descriptions with regex cleaning
            parsed.transactions = parsed.transactions.map(tx => ({
                ...tx,
                description: this.cleanDescription(tx.description)
            }));

            // Validate and return
            this.validateOutput(parsed);
            return parsed;

        } catch (error) {
            console.error(`${this.bankName} parser failed:`, error);
            throw error;
        }
    }

    buildPrompt(statementText) {
        return `You are parsing a ${this.bankName} ${this.accountType} statement SPECIFICALLY.
            
BANK-SPECIFIC FORMAT:
${this.formatRules}

SPATIAL LAYOUT INSTRUCTIONS:
- The text below preserves relative spacing. 
- Use 2 or more spaces as a strong indicator of a column boundary.
- If a line has no date and no amount, but is indented near a description, it is a continuation of that description.

CRITICAL RULES:
1. Parse ONLY: date, description, debit, credit
2. DO NOT parse balance (we calculate it)
3. Debit = money OUT (${this.accountType === 'Chequing' ? 'withdrawals, fees, transfers sent' : 'charges, purchases'})
4. Credit = money IN (${this.accountType === 'Chequing' ? 'deposits, transfers received' : 'payments, refunds'})
5. Both amounts are POSITIVE numbers
6. NEVER put values in BOTH debit AND credit for same transaction
7. EXCLUDE header/footer text like "Opening Balance", "Balance Forward", "Page X of Y".

DESCRIPTION CLEANING (CRITICAL):
This is the MOST IMPORTANT rule. Clean ALL junk from descriptions:
1. **Remove ALL leading dates** (e.g., "01 Oct", "JAN 15", "14/02").
2. **Remove reference codes** (e.g., "70599 04513 20", "59351291").
3. **Remove merchant IDs** (e.g., "SQ *", "TST*").
4. **Remove trailing codes** (e.g., "- S", "- 8").
5. **Combine multi-line descriptions** into a single readable string.

Return ONLY valid JSON:
{
  "accountHolder": "name",
  "accountNumber": "last 4",
  "statementPeriod": "range",
  "openingBalance": number,
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "CLEAN merchant name",
      "debit": number or null,
      "credit": number or null
    }
  ]
}

STATEMENT TEXT:
${statementText}`;
    }

    /**
     * Clean description using regex (fallback/enhancement to AI)
     */
    cleanDescription(description) {
        if (!description) return '';

        let cleaned = description.trim();

        // 1. Remove leading date patterns (various formats)
        // MMDD or DDMM numeric
        cleaned = cleaned.replace(/^\d{1,2}[\/\-]\d{1,2}\s+/g, '');
        // "01 Oct", "14 Feb", "23 Apr"
        cleaned = cleaned.replace(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+/i, '');
        // "Oct 01", "Feb 14"
        cleaned = cleaned.replace(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+/i, '');
        // "Wed, Jan. 31,"
        cleaned = cleaned.replace(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun),?\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\.?\s+\d{1,2},?\s*/i, '');

        // 2. Remove common merchant ID prefixes/noise
        cleaned = cleaned.replace(/^(SQ\s*\*|TST\s*\*|PY\s*\*|INC\s*\*)/i, '');

        // 3. Remove reference numbers and long digit strings (6+ digits)
        cleaned = cleaned.replace(/\b\d{6,}\b/g, '');

        // 4. Remove trailing single character codes or small numbers
        cleaned = cleaned.replace(/\s+-\s+[A-Z0-9]$/i, '');
        cleaned = cleaned.replace(/\s+[A-Z\d]{1,2}$/, '');

        // 5. Cleanup whitespace
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned;
    }

    validateOutput(parsed) {
        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
            throw new Error('Invalid AI response: missing transactions array');
        }

        parsed.transactions.forEach((tx, idx) => {
            if (!tx.date || !tx.description) {
                console.warn(`Transaction ${idx} is incomplete:`, tx);
            }
        });
    }
}

// Expose to window for file:// compatibility
window.BaseBankParser = BaseBankParser;
