/**
 * BMO Mastercard Parser
 */
class BMOMastercardParser extends BaseBankParser {
  constructor() {
    const formatRules = `
BMO MASTERCARD FORMAT:
- Transaction dates: Two date columns "DATE | DATE | DESCRIPTION | REFERENCE NO. | AMOUNT($)"
  - First date: Transaction date (MmmDD format, e.g., Apr29)  
  - Second date: Posting date (MmmDD format, e.g., May2)
- Card number format: "Card Number: XXXXXXXXXXXX"
- All charges are POSITIVE numbers → debit
- Payments are NOT explicitly shown as negative (look for "Payment" keyword)
- Reference numbers: 12-digit codes

KNOWN PATTERNS:
- "TIMHORTONS", "Subway", "Amazon.ca" → charges (debit)
        `;

    super('BMO', 'Mastercard', formatRules);
  }
}

// Expose to window for file:// compatibility
window.BMOMastercardParser = BMOMastercardParser;
window.bmoMastercardParser = new BMOMastercardParser();
