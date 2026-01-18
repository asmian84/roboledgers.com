/**
 * Scotiabank Chequing Parser
 * Refined for multi-line transaction support based on BankStatementWizard reference
 */
class ScotiaChequingParser extends BaseBankParser {
  constructor() {
    const formatRules = `
SCOTIABANK CHEQUING FORMAT:
- Date: MM/DD/YYYY (e.g., "12/04/2018") or MMM DD (e.g., "JAN 15")
- Columns: Date | Description | Withdrawal | Deposit | Balance
- Balance has trailing "-" for negative (e.g., "40,091.53-")

SMART PARSING RULES:
1. Skip "BALANCE FORWARD" lines (only have balance, no transaction amount)
2. Real transactions have TWO numbers at end: Amount + Balance
3. Multi-line descriptions: Accumulate lines until we find Amount + Balance
        `;
    super('Scotiabank', 'Chequing', formatRules);
  }

  /**
   * STRICT REGEX PARSER for Scotiabank Chequing
   * Based on actual PDF text structure from user's statements
   */
  parseWithRegex(text) {
    const lines = text.split('\n');
    const transactions = [];

    // Date patterns
    const dateRegex1 = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)[a-z]*\s+\d{1,2}/i;
    const dateRegex2 = /^(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/;

    // Amount pattern: TWO numbers at line end (Amount + Balance)
    // This distinguishes real transactions from "BALANCE FORWARD" lines (which have only 1 number)
    // Examples: "393.30   41,580.68-" or "1,450.00 37,835.92-"
    const twoAmountPattern = /([\d,]+\.\d{2}-?)\s+([\d,]+\.\d{2}-?)$/;

    // Single amount pattern (for BALANCE FORWARD detection - skip these)
    const singleAmountPattern = /^([\d,]+\.\d{2}-?)$/;

    console.log(`[SCOTIA] Starting parse with ${lines.length} lines`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip known headers
      if (line.match(/Statement Period|Account Details|No\. of Debits|Total Amount/i)) continue;
      if (line.match(/^Date\s+Description/i)) continue;

      // Check if line starts with a Date
      let dateMatch = line.match(dateRegex1) || line.match(dateRegex2);

      if (dateMatch) {
        const dateStr = dateMatch[0];

        // Skip BALANCE FORWARD lines (they only show balance, not a transaction)
        if (line.match(/BALANCE\s+FORWARD/i)) {
          console.log(`[SCOTIA] Skipping BALANCE FORWARD: "${line}"`);
          continue;
        }

        // Check if this line already has TWO amounts (complete transaction on one line)
        const amountMatch = line.match(twoAmountPattern);
        if (amountMatch) {
          console.log(`[SCOTIA] ✓ Single-line match: "${line}"`);
          this.processTransaction(dateStr, line, amountMatch, transactions);
          continue;
        }

        // MULTI-LINE: Accumulate lines until we find TWO amounts
        let combinedLine = line;
        let lookAheadIndex = 1;
        let foundAmount = false;

        // Look ahead up to 4 lines (for multi-line descriptions)
        while (i + lookAheadIndex < lines.length && lookAheadIndex <= 4) {
          const nextLine = lines[i + lookAheadIndex].trim();
          if (!nextLine) {
            lookAheadIndex++;
            continue;
          }

          // If next line starts with a date, we've hit the next transaction
          if (nextLine.match(dateRegex1) || nextLine.match(dateRegex2)) {
            break;
          }

          // Append the next line
          combinedLine += " " + nextLine;

          // Check if we NOW have two amounts
          const combinedMatch = combinedLine.match(twoAmountPattern);
          if (combinedMatch) {
            console.log(`[SCOTIA] ✓ Multi-line match (${lookAheadIndex + 1} lines): "${combinedLine.substring(0, 80)}..."`);
            this.processTransaction(dateStr, combinedLine, combinedMatch, transactions);
            i += lookAheadIndex; // Skip consumed lines
            foundAmount = true;
            break;
          }

          lookAheadIndex++;
        }

        if (!foundAmount) {
          console.log(`[SCOTIA] ✗ No amount found for date line: "${line}"`);
        }
      }
    }

    console.log(`[SCOTIA] Parsing complete. Found ${transactions.length} transactions.`);

    return {
      transactions: transactions
    };
  }

  processTransaction(dateStr, fullLine, amountMatch, transactions) {
    // amountMatch[1] = Transaction Amount
    // amountMatch[2] = Balance
    let rawAmount = amountMatch[1].replace(/,/g, '');
    let rawBalance = amountMatch[2].replace(/,/g, '');

    let amount = parseFloat(rawAmount.replace(/-$/, ''));
    let balance = parseFloat(rawBalance.replace(/-$/, ''));

    // Handle trailing negative sign for balance
    if (rawBalance.endsWith('-')) balance = -balance;

    // Extract description (everything between date and amounts)
    let description = fullLine.substring(dateStr.length);
    description = description.replace(amountMatch[0], '').trim();

    // Normalize Date to YYYY-MM-DD
    let isoDate = dateStr;
    if (dateStr.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
      const parts = dateStr.split('/');
      isoDate = `${parts[2]}-${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}`;
    }

    // Determine Debit vs Credit based on keywords
    let isCredit = false;
    const creditKeywords = /DEPOSIT|CREDIT\s+MEMO|REFUND|PAYROLL|EMAIL\s+MONEY\s+TRF|E-TRANSFER.*RECEIVED|ACCOUNTS\s+PAYABLE\s+DEPOSIT/i;
    if (description.match(creditKeywords)) {
      isCredit = true;
    }

    // UI FORMATTING: Insert comma after known transaction types
    // This triggers the "Gray Type / Bold Merchant" display in the grid
    const typePrefixes = [
      "BILL PAYMENT", "INSURANCE", "SERVICE CHARGE", "POINT OF SALE PURCHASE",
      "TRANSFER TO", "TRANSFER FROM", "ABM WITHDRAWAL", "CASH WITHDRAWAL",
      "SHARED ABM WITHDRAWAL", "DEBIT MEMO", "CREDIT MEMO", "MISC PAYMENT",
      "INTERAC ABM FEE", "OVERDRAFT PROTECTION FEE", "RETURNED NSF CHEQUE",
      "NSF SERVICE CHARGE", "BUSINESS PAD", "MB BILL PAYMENT", "PC BILL PAYMENT"
    ];

    for (const type of typePrefixes) {
      if (description.toUpperCase().startsWith(type)) {
        // Only insert if not already present and followed by space or end
        // We verify the next char isn't already a comma
        if (description.length > type.length && description[type.length] !== ',') {
          description = description.substring(0, type.length) + ',' + description.substring(type.length);
        }
        break;
      }
    }

    // Special handling for CHQ # (e.g., "CHQ 45 ...")
    if (description.match(/^CHQ\s+\d+/i)) {
      description = description.replace(/^(CHQ\s+\d+)(\s+)/i, '$1,$2');
    }

    const tx = {
      date: isoDate,
      description: description,
      amount: amount,
      debit: isCredit ? 0 : amount,
      credit: isCredit ? amount : 0,
      balance: balance
    };

    transactions.push(tx);

    console.log('✅ Parsed:', {
      date: isoDate,
      desc: description.substring(0, 40) + (description.length > 40 ? '...' : ''),
      debit: tx.debit,
      credit: tx.credit,
      balance: balance
    });
  }
}

// Expose to window for file:// compatibility
window.ScotiaChequingParser = ScotiaChequingParser;
window.scotiaChequingParser = new ScotiaChequingParser();
