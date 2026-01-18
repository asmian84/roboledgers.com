/**
 * CIBC Chequing Parser
 */
class CIBCChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
CIBC CHEQUING FORMAT:
- Column headers: "Date | Description | Withdrawals ($) | Deposits ($) | Balance ($)"
- Date format: Mmm D (e.g., Apr 1, Apr 5)
- Multi-line descriptions common
- "DEBIT MEMO" and "E-TRANSFER" transactions are common
        `;
        super('CIBC', 'Chequing', formatRules);
    }
}

// Expose to window for file:// compatibility
window.CIBCChequingParser = CIBCChequingParser;
window.cibcChequingParser = new CIBCChequingParser();
