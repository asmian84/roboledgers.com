import { BaseBankParser } from './BaseBankParser.js';

export class RBCChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
RBC CHEQUING FORMAT (Business Account Statement):
- Header: "ROYAL BANK OF CANADA Business Account Statement"
- Columns: "Date | Description | Cheques&Debits($) | Deposits&Credits($) | Balance($)"
- Date format: "DDMon" (e.g., "27Dec", "02Jan", "03Jan") - No year in transaction rows
- Extract year from statement period header (e.g., "December 22, 2023 to January 24, 2024")
- Multi-line descriptions common (description continues on next line)

PARSING RULES:
- Combine DDMon with statement year
- Handle year rollover (Dec → Jan means new year)
- Descriptions may include:
  * Reference numbers (e.g., "Reference 091863637854190")
  * Check numbers (e.g., "Mobile cheque deposit - 5639")
  * Transfer codes (e.g., "OnlineBanking transfer-2760")
- Clean descriptions: Remove reference codes, keep merchant/transaction type

KNOWN PATTERNS:
- "e-Transfer sent" + merchant → debit
- "Mobile cheque deposit" → credit
- "Online Banking transfer" → could be debit or credit (check amount column)
- "Telephone Banking transfer" → credit
- "Misc Payment" + description → debit
- "Monthly fee" → debit
- "Regular transaction fee" → debit
- "Interac purchase" + merchant → debit 
- "Payroll Deposit" + company → credit
        `;
        super('RBC', 'Chequing', formatRules);
    }
}

export const rbcChequingParser = new RBCChequingParser();
