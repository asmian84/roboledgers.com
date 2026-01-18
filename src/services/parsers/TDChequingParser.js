import { BaseBankParser } from './BaseBankParser.js';

export class TDChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
TD CHEQUING FORMAT:
- Date: MMM DD (often concatenated like "AUG02")
- Columns: DESCRIPTION | CHEQUE/DEBIT | DEPOSIT/CREDIT | DATE | BALANCE

SMART PARSING RULES:
1. Date location: Often inside the description block or in its own tight column.
2. Polarity: "OD" suffix on balance indicates overdraft.
3. Cleanup: Remove "CHQ#XXXXX-XXXXXXXXXX" and "MSP" codes from descriptions.
4. Merchant Focus: Keep ONLY the merchant name (e.g., "BIG BUCKET CAR").
        `;
        super('TD', 'Chequing', formatRules);
    }
}

export const tdChequingParser = new TDChequingParser();

// Expose to window for file:// compatibility
window.TDChequingParser = TDChequingParser;
window.tdChequingParser = tdChequingParser;
