import { BaseBankParser } from './BaseBankParser.js';

export class RBCVisaParser extends BaseBankParser {
    constructor() {
        const formatRules = `
RBC VISA FORMAT:
- Column headers: "TRANSACTION DATE | POSTING DATE | ACTIVITY DESCRIPTION | AMOUNT($)"
- Date format: DECDD (e.g., DEC18, JAN05)
- Payment line: "PAYMENT-THANK YOU/PAIEMENT-MERCI" with negative amount (e.g., -$1,000.00)
- Charges shown as positive → debit
- Payments shown as NEGATIVE → credit
- Avion points summary may be present
- Long transaction reference numbers shown below descriptions

KNOWN PATTERNS:
- "PAYMENT-THANK YOU" with negative amount → credit
- "THE HOME DEPOT", "SHELL", merchant names → debit
- "PURCHASE INTEREST" → debit (finance charge)
        `;
        super('RBC', 'Visa', formatRules);
    }
}

export const rbcVisaParser = new RBCVisaParser();
