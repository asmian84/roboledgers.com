import { BaseBankParser } from './BaseBankParser.js';

export class ScotiaChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
SCOTIABANK CHEQUING FORMAT (Printed Business Statement):
- Header: "STATEMENT OF BUSINESS ACCOUNT"
- Columns: "DESCRIPTION | WITHDRAWALS/DEBITS | DEPOSITS/CREDITS | DATE | BALANCE"
- Date format: MMDD (e.g., "0430", "0502", "0531") - Month+Day only, year from statement period
- Multi-line descriptions (description on one line, reference codes on next line)
- Amount format: Numbers with spaces as thousands separator (e.g., "2000 00" = $2,000.00)

PARSING RULES:
- Extract year from "FROM TO" header (e.g., "APR 30 2024 MAY 31 2024")
- Combine MMDD date with year to create full date
- Description may span 2-3 lines:
  Line 1: Main description (e.g., "TRANSFER FROM", "PC BILL PAYMENT")
  Line 2: Reference codes (e.g., "70599 04513 20", "59351291")
  Line 3: Additional info (e.g., "PC-TRANSFER", "SCOTIA MOMENTUM FB")
- Clean description: Keep only line 1 and line 3, remove reference codes
- Remove trailing account numbers

KNOWN PATTERNS:
- "TRANSFER FROM" + "PC-TRANSFER" → credit (deposit)
- "TRANSFER TO" + "PC-TRANSFER" → debit (withdrawal)
- "PC BILL PAYMENT" + merchant name → debit
- "ABM DEPOSIT" + location → credit
- "LIFE INSURANCE" + "CO-OP LIFE/VIE" → debit
- "SERVICE CHARGE" → debit
- "INTERAC E-TRANSFER" → check if debit or credit
        `;
        super('Scotiabank', 'Chequing', formatRules);
    }
}

export const scotiaChequingParser = new ScotiaChequingParser();
