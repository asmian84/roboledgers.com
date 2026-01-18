/**
 * CIBC Visa Parser
 */
class CIBCVisaParser extends BaseBankParser {
    constructor() {
        const formatRules = `
CIBC VISA FORMAT:
- Columns: Transaction Date | Posting Date | Description | Amount ($)
- Date: MMM DD (e.g., "JAN 15")
- Payments: Prefix "PAYMENT - THANK YOU"

SMART PARSING RULES:
1. All charges are positive values.
2. Payments are indicated by specific description prefixes.
        `;
        super('CIBC', 'Visa', formatRules);
    }
}

// Expose to window for file:// compatibility
window.CIBCVisaParser = CIBCVisaParser;
window.cibcVisaParser = new CIBCVisaParser();
