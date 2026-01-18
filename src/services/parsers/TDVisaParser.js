import { BaseBankParser } from './BaseBankParser.js';

export class TDVisaParser extends BaseBankParser {
    constructor() {
        const formatRules = `
TD VISA FORMAT:
- Column headers: "TRANSACTION | POSTING | DATE | DATE | ACTIVITY DESCRIPTION | AMOUNT($)"
- Date format: MMMDD (e.g., OCT21, NOV05)
- Payment line: "PAYMENT - THANK YOU" with negative amount (e.g., -$263.19)
- Charges shown as positive → debit
- Payments/Credits shown as NEGATIVE → credit
- Cash Back summary may be present
- "ANNUAL CASHBACK CREDIT" is a credit

KNOWN PATTERNS:
- "PAYMENT - THANK YOU" with negative → credit
- "ANNUAL CASHBACK CREDIT" with negative → credit (reward)
- Merchant purchases → debit
        `;
        super('TD', 'Visa', formatRules);
    }
}

export const tdVisaParser = new TDVisaParser();
