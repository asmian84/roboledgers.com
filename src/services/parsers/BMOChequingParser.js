import { BaseBankParser } from './BaseBankParser.js';

/**
 * BMO Chequing Parser
 * Handles: BMO Business Chequing, BMO Personal Chequing
 */
export class BMOChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
BMO CHEQUING FORMAT:
- Transaction dates: MmmDD format (e.g., Jul11, Aug02)
- Column headers: "Date | Description | Amounts deducted from your account($) | Amounts added to your account($) | Balance($)"
- Or: "Date | Description | Deducted | Added | Balance"
- Multi-line descriptions are common (e.g., "INTERAC e-Transfer Sent" or "Debit Card Purchase, INT'L POS PUR...")
- Opening balance labeled: "Opening balance" or "Opening balance($)"
- Statement period: "For the period ending [Month Day, Year]"
- Account number format: "#XXXXX-XXX"

KNOWN PATTERNS:
- "INTERAC e-Transfer Sent" → debit (money out)
- "INTERAC e-Transfer Received" → credit (money in)
- "Online Bill Payment" → debit
- "Direct Deposit" → credit
- "Debit Card Purchase" → debit
- "Plan Fee" or "Monthly Fee" → debit
        `;

        super('BMO', 'Chequing', formatRules);
    }
}

export const bmoChequingParser = new BMOChequingParser();
