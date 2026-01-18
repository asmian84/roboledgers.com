/**
 * Amex Parser
 */
class AmexParser extends BaseBankParser {
    constructor() {
        const formatRules = `
AMEX FORMAT:
- Date: MMM DD (e.g., "JAN 15")
- Description: Merchant Name + Location
- Amounts: Single column with minus sign for credits or separate columns.
- Columns: Date | Description | Amount

SMART PARSING RULES:
1. Multi-line descriptions: Indented text under a merchant name is usually part of the description.
2. Polarity: Purchases are positive, payments/refunds are negative (or in a credit column).
        `;
        super('Amex', 'Amex', formatRules);
    }
}

// Expose to window for file:// compatibility
window.AmexParser = AmexParser;
window.amexParser = new AmexParser();
