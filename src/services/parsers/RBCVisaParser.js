/**
 * RBC Visa Parser
 */
class RBCVisaParser extends BaseBankParser {
    constructor() {
        const formatRules = `
RBC VISA FORMAT:
- Columns: Transaction Date | Posting Date | Description | Amount ($)
- Amounts: Purchases are positive, payments are negative with "-" prefix.
- Cleanup: Remove merchant IDs and truncated merchant names.
        `;
        super('RBC', 'Visa', formatRules);
    }
}

// Expose to window for file:// compatibility
window.RBCVisaParser = RBCVisaParser;
window.rbcVisaParser = new RBCVisaParser();
