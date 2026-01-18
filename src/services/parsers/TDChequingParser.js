import { BaseBankParser } from './BaseBankParser.js';

export class TDChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
TD CHEQUING FORMAT:
- Column headers: "DESCRIPTION | CHEQUE/DEBIT | DEPOSIT/CREDIT | DATE | BALANCE"
- Date format: MMMDD (e.g., OCT01, NOV05)
- "BALANCE FORWARD" shown at top
- Deposits shown in DEPOSIT/CREDIT column
- Withdrawals shown in CHEQUE/DEBIT column
- Account format: "XXXX-XXXXXXX"

KNOWN PATTERNS:
- Company names (e.g., "Robert Half Can MSP") → credit (deposits)
- "SEND E-TFR" → debit (transfer sent)
- "SEND E-TFR FEE" → debit (fee)
- "MONTHLY PLAN FEE" → debit
        `;
        super('TD', 'Chequing', formatRules);
    }
}

export const tdChequingParser = new TDChequingParser();
