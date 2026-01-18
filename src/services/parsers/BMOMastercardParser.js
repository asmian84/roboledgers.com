import { BaseBankParser } from './BaseBankParser.js';

/**
 * BMO Mastercard Parser
 * Handles: BMO Mastercard credit cards
 */
export class BMOMastercardParser extends BaseBankParser {
    constructor() {
        const formatRules = `
BMO MASTERCARD FORMAT:
- Transaction dates: Two date columns "DATE | DATE | DESCRIPTION | REFERENCE NO. | AMOUNT($)"
  - First date: Transaction date (MmmDD format, e.g., Apr29)  
  - Second date: Posting date (MmmDD format, e.g., May2)
- Card number format: "Card Number: XXXXXXXXXXXX"
- All charges are POSITIVE numbers → debit
- Payments are NOT explicitly shown as negative (look for "Payment" keyword)
- Reference numbers: 12-digit codes
- Statement period: "PERIOD COVERED BY THIS STATEMENT [dates]"

KNOWN PATTERNS:
- "TIMHORTONS", "Subway", "Amazon.ca" → charges (debit)
- Any merchant transaction → debit (charge to card)
- Look for payment section separately (if exists)
        `;

        super('BMO', 'Mastercard', formatRules);
    }
}

export const bmoMastercardParser = new BMOMastercardParser();
