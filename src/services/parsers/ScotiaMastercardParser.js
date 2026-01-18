import { BaseBankParser } from './BaseBankParser.js';

export class ScotiaMastercardParser extends BaseBankParser {
    constructor() {
        const formatRules = `
SCOTIABANK MASTERCARD FORMAT:
- Column headers: "TRANS. | POST | REF.# | DATE | DATE | DETAILS | AMOUNT($)"
- Date format: Mmm D (e.g., Mar 2, Mar 7)
- Payment line: "MB-CREDIT CARD/LOC PAY. FROM" with negative amount (e.g., - 79.00-)
- Charges shown as positive → debit
- Payments shown with "- XX.XX-" (negative) → credit
- Scene+/Momentum cash back summary may be present
- Multi-line with account last 4 digits

KNOWN PATTERNS:
- "MB-CREDIT CARD/LOC PAY" → credit (payment)
- Restaurant, merchant names → debit (charges)
- Scene+ points or Cash Back rewards mentioned
        `;
        super('Scotiabank', 'Mastercard', formatRules);
    }
}

export const scotiaMastercardParser = new ScotiaMastercardParser();
