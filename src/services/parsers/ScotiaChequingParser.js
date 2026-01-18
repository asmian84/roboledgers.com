import { BaseBankParser } from './BaseBankParser.js';

export class ScotiaChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
SCOTIABANK CHEQUING FORMAT (Online Banking Statement):
- Column headers: "Date | Description | Withdrawals | Deposits | Balance"
- Date format: "Day, Mon. DD, YYYY" (e.g., "Wed, Jan. 31, 2024")
- Descriptions are lowercase (e.g., "service charge", "customer transfer dr.")
- Reference codes like "PCTO 705990451320" may appear after description
- Multi-line descriptions common

KNOWN PATTERNS:
- "customer transfer dr." (with PCTO code) → debit (sent)
- "customer transfer cr." → credit (received)  
- "service charge" → debit
- "insurance" + "CO" → debit
- "interac e-transfer" → debit/credit depending on context
- Description cleaning: Remove reference codes like "PCTO XXXXXXXXXX", "CO"
        `;
        super('Scotiabank', 'Chequing', formatRules);
    }
}

export const scotiaChequingParser = new ScotiaChequingParser();
