import { BaseBankParser } from './BaseBankParser.js';

export class CIBCChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
CIBC CHEQUING FORMAT:
- Column headers: "Date | Description | Withdrawals ($) | Deposits ($) | Balance ($)"
- Date format: Mmm D (e.g., Apr 1, Apr 5)
- Multi-line descriptions common (e.g., "TAXES" on line 1, "CALGARY TIPP" on line 2)
- "DEBIT MEMO" and "E-TRANSFER" transactions are common
- Opening balance: "Opening balance on [Month D, Year] $X,XXX.XX"
- Account format: "Account number XX-XXXXX"

KNOWN PATTERNS:
- "TAXES", "DEBIT MEMO" → withdrawals (debit)
- "MISC PAYMENT", "E-TRANSFER" (deposit) → credit
- "GPFS-SERVICE CHARGE" → debit
        `;
        super('CIBC', 'Chequing', formatRules);
    }
}

export const cibcChequingParser = new CIBCChequingParser();
