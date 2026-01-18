import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Universal Bank Statement Parser
 * Uses Gemini AI to parse ANY bank statement format
 * Supports: BMO, CIBC, RBC, Scotiabank, TD, and more
 */
export class UniversalBankParser {
    constructor() {
        const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error('VITE_GEMINI_API_KEY not found in environment');
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: 'gemini-2.0-flash-exp',
            generationConfig: {
                temperature: 0.1, // Low temperature for consistent parsing
                responseMimeType: 'application/json'
            }
        });
    }

    /**
     * Parse a bank statement from text
     * @param {string} statementText - Raw text extracted from PDF
     * @returns {Promise<Object>} Structured transactions
     */
    async parseStatement(statementText) {
        const prompt = this.buildPrompt(statementText);

        try {
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Parse JSON response
            const parsed = JSON.parse(text);

            // Validate output
            this.validateOutput(parsed);

            return parsed;
        } catch (error) {
            console.error('Universal parser failed:', error);
            throw new Error(`Failed to parse statement: ${error.message}`);
        }
    }

    buildPrompt(statementText) {
        return `You are a bank statement parser. Extract ALL transactions from this statement.

CRITICAL RULES:
1. Parse ONLY: date, description, debit, credit (DO NOT parse balance - we calculate it)
2. Debit = money OUT (purchases, fees, withdrawals, transfers sent)
3. Credit = money IN (deposits, refunds, payments, transfers received)
4. Both amounts are POSITIVE numbers (never negative)
5. NEVER put values in BOTH debit AND credit for same transaction
6. One transaction must have EITHER debit OR credit, not both
7. Clean up descriptions (merge multi-line if needed, remove extra spaces)

ACCOUNT TYPE DETECTION:
- If statement mentions "Visa" → accountType: "Visa"
- If statement mentions "Mastercard" or "MC" → accountType: "Mastercard"
- If statement mentions "American Express" or "Amex" → accountType: "Amex"
- If statement mentions "Chequing" or "Checking" → accountType: "Chequing"
- If statement mentions "Savings" → accountType: "Savings"

Return ONLY valid JSON (no markdown):
{
  "accountType": "Chequing" | "Savings" | "Visa" | "Mastercard" | "Amex",
  "accountHolder": "business or person name from statement",
  "accountNumber": "last 4 digits if visible",
  "statementPeriod": "date range from statement",
  "openingBalance": number (from statement summary),
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "description": "clean merchant/transaction name",
      "debit": number or null,
      "credit": number or null
    }
  ]
}

STATEMENT TEXT:
${statementText}`;
    }

    validateOutput(parsed) {
        if (!parsed.accountType) {
            throw new Error('Missing accountType');
        }

        if (!parsed.transactions || !Array.isArray(parsed.transactions)) {
            throw new Error('Missing or invalid transactions array');
        }

        // Validate each transaction
        parsed.transactions.forEach((tx, idx) => {
            if (!tx.date) {
                throw new Error(`Transaction ${idx}: missing date`);
            }
            if (!tx.description) {
                throw new Error(`Transaction ${idx}: missing description`);
            }

            // Critical: ensure debit/credit mutual exclusivity
            if (tx.debit !== null && tx.credit !== null) {
                throw new Error(`Transaction ${idx}: both debit AND credit are filled! This violates the rule.`);
            }

            if (tx.debit === null && tx.credit === null) {
                throw new Error(`Transaction ${idx}: both debit AND credit are null! At least one must have a value.`);
            }

            // Ensure amounts are positive
            if (tx.debit !== null && tx.debit < 0) {
                throw new Error(`Transaction ${idx}: debit amount is negative. All amounts must be positive.`);
            }
            if (tx.credit !== null && tx.credit < 0) {
                throw new Error(`Transaction ${idx}: credit amount is negative. All amounts must be positive.`);
            }
        });

        console.log(`✅ Validation passed: ${parsed.transactions.length} transactions, accountType: ${parsed.accountType}`);
    }

    /**
     * Calculate running balance for transactions
     * @param {Array} transactions 
     * @param {number} openingBalance 
     */
    calculateBalances(transactions, openingBalance) {
        let balance = openingBalance;

        return transactions.map(tx => {
            balance = balance - (tx.debit || 0) + (tx.credit || 0);
            return {
                ...tx,
                balance: balance
            };
        });
    }
}

// Singleton instance
export const universalParser = new UniversalBankParser();
