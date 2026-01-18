import { BaseBankParser } from './BaseBankParser.js';

export class AmexParser extends BaseBankParser {
    constructor() {
        const formatRules = `
AMERICAN EXPRESS FORMAT:
- Column headers: "Transaction | Posting | Details | Amount ($) | Date | Date"
- Date format: MmmDD (e.g., Jul19, Jun26)
- Payment line: "PAYMENT RECEIVED - THANK YOU" with NEGATIVE amount (e.g., -918.62)
- Charges shown as positive → debit
- Payments shown as NEGATIVE → credit  
- Reference numbers shown below descriptions
- "Flexible Payment Option" and minimum payment info present
- Account format: "XXXX XXXXX8 XXXXX"

KNOWN PATTERNS:
- "PAYMENT RECEIVED - THANK YOU" → credit
- "SHELL", "TIM HORTONS", merchants → debit (purchases)
- Multiple cards may be listed (primary + supplementary)
        `;
        super('Amex', 'Amex', formatRules);
    }
}

export const amexParser = new AmexParser();
