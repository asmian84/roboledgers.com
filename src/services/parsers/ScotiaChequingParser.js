/**
 * Scotiabank Chequing Parser
 */
class ScotiaChequingParser extends BaseBankParser {
  constructor() {
    const formatRules = `
SCOTIABANK CHEQUING FORMAT:
- Date: MMM DD (e.g., "JAN 15")
- Columns: Date | Description | Withdrawal | Deposit | Balance
- Amount Polarity: Parentheses (100.00) or a trailing "-" indicate a debit/withdrawal.

SMART PARSING RULES:
1. Skip lines containing "Opening Balance" or "Balance Forward".
2. Multi-line descriptions: If a line has no date and no amount, it is a continuation of the previous description.
3. Reference Codes: Remove codes like "70599 04513 20" from the description.
4. Final Balance check: The last transaction's balance should match the statement period's ending balance.
        `;
    super('Scotiabank', 'Chequing', formatRules);
  }
}

// Expose to window for file:// compatibility
window.ScotiaChequingParser = ScotiaChequingParser;
window.scotiaChequingParser = new ScotiaChequingParser();
