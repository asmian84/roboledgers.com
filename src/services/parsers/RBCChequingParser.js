import { BaseBankParser } from './BaseBankParser.js';

export class RBCChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
RBC CHEQUING FORMAT:
- Column headers: "Date | Description | Cheques & Debits($) | Deposits & Credits($) | Balance($)"
- Date format: DDMmm (e.g., 28Feb, 01Mar)
- Multi-line transactions common
- "Opening balance" shown at top
- Account format: "Account number: XXXXX XXX-XXX-X"

KNOWN PATTERNS:
- "Deposit" → credit
- "INTERAC e-Transfer-XXXX" → could be debit (sent) or credit (received)
- "Funds transfer credit", "BRTOBR-CreditMemo" → credit
- "BRTOBR-XXXX", "Funds transfer" (without credit) → debit
- "INTERAC e-Transfer fee" → debit
        `;
        super('RBC', 'Chequing', formatRules);
    }
}

export const rbcChequingParser = new RBCChequingParser();
