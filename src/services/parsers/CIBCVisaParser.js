import { BaseBankParser } from './BaseBankParser.js';

export class CIBCVisaParser extends BaseBankParser {
    constructor() {
        const formatRules = `
CIBC VISA FORMAT:
- Column headers: "Trans date | Post date | Description | Spend Categories | Amount($)"
- Date format: Mmm DD (e.g., Jul 27, Aug 11)
- Spend categories shown (e.g., "Retail and Grocery", "Transportation", "Restaurants")
- Payment line: "PAYMENT THANK YOU/PAIEMENT MERCI" with amount shown as positive but is actually a payment
- All charges are positive → debit
- Payments labeled "PAYMENT" → credit (even if shown as positive, convert based on keyword)
- Aeroplan points summary may be present

KNOWN PATTERNS:
- "PAYMENT THANK YOU" → credit (payment to card)
- "DOORDASH", "UBER", merchant names → debit (charges)
- Look for "Q" symbol indicating bonus points  
        `;
        super('CIBC', 'Visa', formatRules);
    }
}

export const cibcVisaParser = new CIBCVisaParser();
