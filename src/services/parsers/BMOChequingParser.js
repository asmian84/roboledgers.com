import { BaseBankParser } from './BaseBankParser.js';

/**
 * BMO Chequing Parser
 * Handles: BMO Business Chequing, BMO Personal Chequing
 */
export class BMOChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
BMO CHEQUING FORMAT:
- Date: MmmDD (e.g., "Jul11", "Aug02")
- Columns: Date | Description | Deducted | Added | Balance

SMART PARSING RULES:
1. Date year: Usually found in the "For the period ending [Month Day, Year]" header.
2. Multi-line descriptions: Descriptions like "INTERAC e-Transfer Sent" or "Debit Card Purchase" often wrap.
3. Account Number: Found in header as "#XXXXX-XXX".
4. Polarity: "Deducted" = money out, "Added" = money in.
        `;

        super('BMO', 'Chequing', formatRules);
    }
}

export const bmoChequingParser = new BMOChequingParser();

// Expose to window for file:// compatibility
window.BMOChequingParser = BMOChequingParser;
window.bmoChequingParser = bmoChequingParser;
