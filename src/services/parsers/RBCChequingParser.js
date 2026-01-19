/**
 * RBC Chequing Parser
 * Regex-based parser for RBC Chequing statements
 */
class RBCChequingParser extends BaseBankParser {
  constructor() {
    const formatRules = `
RBC CHEQUING FORMAT:
- Date: D MMM (e.g., "7 May", "15 Jan")
- Column Anchors: A gap of 2 or more spaces separation usually indicates a column boundary.
- Fields: Date | Description | Cheques&Debits | Deposits&Credits | Balance

SMART PARSING RULES:
1. Date year is not in transaction rows; extract it from the statement header.
2. If "Jan" appears after "Dec", increment the year (year rollover).
3. Skip lines containing "Opening Balance" or "Closing Balance".
4. Cleanup: Remove "Reference XXXXXXXXX" from descriptions.
        `;
    super('RBC', 'Chequing', formatRules);
    this.currentYear = new Date().getFullYear();
  }

  /**
   * REGEX PARSER for RBC Chequing
   * Format: Date (D Mon) | Description | Debit | Credit | Balance
   */
  parseWithRegex(text) {
    const lines = text.split('\n');
    const transactions = [];

    // Try to extract year from statement header
    const yearMatch = text.match(/Statement\s+(?:From|Period)[:\s]+[A-Za-z]+\s+\d{1,2},?\s+(\d{4})/i) ||
      text.match(/(\d{4})/);
    if (yearMatch) {
      this.currentYear = parseInt(yearMatch[1]);
    }
    let lastMonth = null;

    // RBC Date pattern: "7 May" or "15 Jan" (day space month)
    const dateRegex = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i;

    // Amount pattern: number with commas and 2 decimals, optionally negative
    // RBC typically has Amount + Balance at end of line
    const amountPattern = /([\d,]+\.\d{2})\s+([\d,]+\.\d{2}(?:\s*CR|\s*DR)?)$/i;
    const singleAmountPattern = /([\d,]+\.\d{2}(?:\s*CR|\s*DR)?)$/i;

    console.log(`[RBC] Starting parse with ${lines.length} lines, year: ${this.currentYear}`);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip headers and summary lines
      if (line.match(/Opening Balance|Closing Balance|Balance Forward|Statement|Account Number/i)) continue;
      if (line.match(/^Date\s+Description/i)) continue;

      // Check if line starts with RBC date format
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        const day = dateMatch[1];
        const monthName = dateMatch[2];

        // Year rollover detection
        const monthIndex = this.getMonthIndex(monthName);
        if (lastMonth !== null && monthIndex < lastMonth && monthIndex <= 1) {
          // Rolled over to new year (e.g., Dec -> Jan)
          this.currentYear++;
          console.log(`[RBC] Year rollover detected: ${this.currentYear}`);
        }
        lastMonth = monthIndex;

        const isoDate = this.formatDate(day, monthName, this.currentYear);

        // Try to find amounts on this line
        let fullLine = line;
        let amountMatch = fullLine.match(amountPattern);

        // Multi-line: Look ahead if no amounts found
        if (!amountMatch) {
          let lookAhead = 1;
          while (i + lookAhead < lines.length && lookAhead <= 3) {
            const nextLine = lines[i + lookAhead].trim();
            if (!nextLine || nextLine.match(dateRegex)) break;

            fullLine += ' ' + nextLine;
            amountMatch = fullLine.match(amountPattern);
            if (amountMatch) {
              i += lookAhead; // Skip consumed lines
              break;
            }
            lookAhead++;
          }
        }

        if (amountMatch) {
          this.processTransaction(isoDate, fullLine, dateMatch[0], amountMatch, transactions);
        } else {
          // Try single amount (might be a simplified format)
          const singleMatch = fullLine.match(singleAmountPattern);
          if (singleMatch) {
            this.processSimpleTransaction(isoDate, fullLine, dateMatch[0], singleMatch, transactions);
          } else {
            console.log(`[RBC] ✗ No amount found for: "${line}"`);
          }
        }
      }
    }

    console.log(`[RBC] Parsing complete. Found ${transactions.length} transactions.`);
    return { transactions };
  }

  getMonthIndex(monthName) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months.indexOf(monthName.toLowerCase().substring(0, 3));
  }

  formatDate(day, monthName, year) {
    const month = this.getMonthIndex(monthName) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  processTransaction(isoDate, fullLine, dateStr, amountMatch, transactions) {
    // amountMatch[1] = Transaction Amount
    // amountMatch[2] = Balance (may have CR/DR suffix)
    let rawAmount = amountMatch[1].replace(/,/g, '');
    let rawBalance = amountMatch[2].replace(/,/g, '').replace(/\s*(CR|DR)/i, '');

    let amount = parseFloat(rawAmount);
    let balance = parseFloat(rawBalance);

    // Handle CR/DR suffix
    if (amountMatch[2].match(/CR/i)) balance = balance; // Credit is positive
    if (amountMatch[2].match(/DR/i)) balance = -balance;

    // Extract description (between date and amounts)
    let description = fullLine.substring(dateStr.length);
    description = description.replace(amountMatch[0], '').trim();

    // Clean description
    description = this.cleanRBCDescription(description);

    // Determine if debit or credit based on keywords
    let isCredit = this.isCredit(description);

    const tx = {
      date: isoDate,
      description: description,
      amount: amount,
      debit: isCredit ? 0 : amount,
      credit: isCredit ? amount : 0,
      balance: balance
    };

    transactions.push(tx);
    console.log(`[RBC] ✓ Parsed: ${isoDate} | ${description.substring(0, 40)}... | D:${tx.debit} C:${tx.credit}`);
  }

  processSimpleTransaction(isoDate, fullLine, dateStr, amountMatch, transactions) {
    let rawAmount = amountMatch[1].replace(/,/g, '').replace(/\s*(CR|DR)/i, '');
    let amount = parseFloat(rawAmount);

    // Extract description
    let description = fullLine.substring(dateStr.length);
    description = description.replace(amountMatch[0], '').trim();
    description = this.cleanRBCDescription(description);

    let isCredit = amountMatch[1].match(/CR/i) || this.isCredit(description);

    const tx = {
      date: isoDate,
      description: description,
      amount: amount,
      debit: isCredit ? 0 : amount,
      credit: isCredit ? amount : 0,
      balance: 0
    };

    transactions.push(tx);
    console.log(`[RBC] ✓ Simple: ${isoDate} | ${description.substring(0, 40)}... | D:${tx.debit} C:${tx.credit}`);
  }

  isCredit(description) {
    const creditKeywords = /DEPOSIT|CREDIT|REFUND|PAYROLL|TRANSFER\s+FROM|E-TRANSFER.*RECEIVED|INTERAC.*REC|DIRECT\s+DEPOSIT/i;
    return creditKeywords.test(description);
  }

  cleanRBCDescription(desc) {
    // =====================================================
    // RBC E-TRANSFER CLEANUP - Remove encrypted confirmation codes
    // Examples: "CAESnsaJ", "c8bf83a55b4fa1e2a25e12ecdf6f0bo5", "C1AavajMbjum"
    // =====================================================

    // Remove e-transfer encrypted confirmation codes (mixed alphanumeric, 8+ chars)
    // Pattern: Capital letter followed by mixed case/numbers that looks like gibberish
    desc = desc.replace(/\b[A-Z0-9][a-zA-Z0-9]{7,}\b/g, (match) => {
      // Keep known words, remove garbage-looking strings
      const knownWords = ['AUTODEPOSIT', 'TRANSFER', 'ETRANSFER', 'INTERAC', 'RECEIVED', 'DEPOSIT', 'PAYMENT',
        'INSURANCE', 'ALBERTA', 'ONTARIO', 'QUEBEC', 'BRITISH', 'COLUMBIA', 'MANITOBA',
        'SASKATCHEWAN', 'BUSINESS', 'SERVICES', 'CANMORE', 'PROPERTIES', 'RETREATS',
        'PAYROLL', 'SANDBOX', 'REGISTR', 'SERVICE', 'BANKING', 'EMPLOYEE', 'VENDOR'];
      if (knownWords.some(w => match.toUpperCase().includes(w))) return match;

      // If it looks like a hex/encoded string (lots of lowercase or mixed), remove it
      if (match.match(/[a-z]{3,}/) && match.match(/[0-9]/)) return '';
      // If it has too many consonants together (gibberish), remove it
      if (match.match(/[^aeiou]{5,}/i)) return '';

      return match;
    });

    // Remove standalone encrypted codes (e.g., "CA7W2uNJ", "CA8YAt56")
    desc = desc.replace(/\bCA[A-Z0-9][a-zA-Z0-9]{4,}\b/g, '');

    // Remove hex-like strings (e.g., "c8bf83a55b4fa1e2a25e12ecdf6f0bo5")
    desc = desc.replace(/\b[a-f0-9]{20,}\b/gi, '');

    // Remove "Autodeposit" prefix redundancy after e-Transfer
    desc = desc.replace(/e-Transfer\s*-?\s*Autodeposit/gi, 'e-Transfer, Autodeposit');

    // Remove reference numbers
    desc = desc.replace(/Reference\s+[\dX]+/gi, '');

    // Remove long digit sequences (8+ digits)
    desc = desc.replace(/\b\d{8,}\b/g, '');

    // Remove trailing garbage after company names (short random codes)
    desc = desc.replace(/\s+[A-Z][a-z0-9]{2,6}$/g, '');

    // Clean up multiple spaces and trim
    desc = desc.replace(/\s+/g, ' ').trim();

    // Remove trailing/leading hyphens and commas
    desc = desc.replace(/^[\s,\-]+|[\s,\-]+$/g, '').trim();

    // Add comma after transaction type for UI formatting
    const types = ['E-TRANSFER', 'INTERAC', 'BILL PAYMENT', 'SERVICE CHARGE', 'POINT OF SALE', 'ABM', 'CHEQUE', 'MISC PAYMENT'];
    for (const type of types) {
      if (desc.toUpperCase().startsWith(type) && desc.length > type.length && desc[type.length] !== ',') {
        desc = desc.substring(0, type.length) + ',' + desc.substring(type.length);
        break;
      }
    }

    return desc;
  }
}

// Expose to window for file:// compatibility
window.RBCChequingParser = RBCChequingParser;
window.rbcChequingParser = new RBCChequingParser();
