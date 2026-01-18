/**
 * TD Visa Parser
 */
class TDVisaParser extends BaseBankParser {
    constructor() {
        const formatRules = `
TD VISA FORMAT:
- Date: MMM DD (e.g., "JAN 15")
- Columns: Transaction Date | Posting Date | Description | Amount ($)
- Polarity: Simple positive for debt, negative or credit column for money in.
        `;
        super('TD', 'Visa', formatRules);
    }
}

// Expose to window for file:// compatibility
window.TDVisaParser = TDVisaParser;
window.tdVisaParser = new TDVisaParser();
