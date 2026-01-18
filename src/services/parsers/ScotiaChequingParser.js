import { BaseBankParser } from './BaseBankParser.js';

export class ScotiaChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
SCOTIABANK CHEQUING FORMAT:
- Column headers: "Date | Description | Withdrawals/Debits ($) | Deposits/Credits ($) | Balance ($)"
- Date format: MM/DD/YYYY (e.g., 08/02/2023)
- Multi-line descriptions with transaction codes
- "BALANCE FORWARD" shown at top
- Account format: "XXXXXX XXXXX XX"

KNOWN PATTERNS:
- "TRANSFER TO" → debit (sent)
- "TRANSFER FROM" → credit (received)
- "DEBIT MEMO", "INTERAC E-TRANSFER" → debit
- "SERVICE CHARGE", "INTERAC E-TRANSFER FEE" → debit
- "MISC PAYMENT" → credit
- "BUSINESS PAD" (payroll) → debit
        `;
        super('Scotiabank', 'Chequing', formatRules);
    }
}

export const scotiaChequingParser = new ScotiaChequingParser();
