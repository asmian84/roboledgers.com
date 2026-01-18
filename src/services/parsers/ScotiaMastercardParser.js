/**
 * Scotia Mastercard Parser
 */
class ScotiaMastercardParser extends BaseBankParser {
    constructor() {
        const formatRules = `
SCOTIA MASTERCARD FORMAT:
- Date: MMM DD (e.g., "JAN 15")
- Columns: Date | Description | Amount ($)
- Polarity: Purchases are positive, payments/refunds followed by "CR".
        `;
        super('Scotiabank', 'Mastercard', formatRules);
    }
}

// Expose to window for file:// compatibility
window.ScotiaMastercardParser = ScotiaMastercardParser;
window.scotiaMastercardParser = new ScotiaMastercardParser();
