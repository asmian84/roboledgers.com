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
    // RBC E-TRANSFER AGGRESSIVE CLEANUP
    // Remove ALL encrypted confirmation codes and gibberish
    // =====================================================

    // 1. Remove ALL patterns starting with C1A (e-transfer codes)
    // Examples: C1AHPXxct6rG, C1AcEMz4CvEh, C1AZV6bP5EPg
    desc = desc.replace(/\bC1A[a-zA-Z0-9]{4,}\b/gi, '');

    // 2. Remove ALL patterns starting with CA + capital + mixed (e-transfer codes)
    // Examples: CAjQuCUn, CA7W2uNJ, CAAmuJNk, CARA36w6, CAJYE68E
    desc = desc.replace(/\bCA[A-Z][a-zA-Z0-9]{3,}\b/g, '');

    // 3. Remove hex-like strings (16+ chars of hex)
    // Examples: 2ed20c5be4c14d3ba079fb3d1cba34c9, 0cfd400b58e84493b7ad8fa072eac546
    desc = desc.replace(/\b[a-f0-9]{16,}\b/gi, '');

    // 4. Remove mixed case gibberish (upper followed by lower/numbers, 6+ chars)
    // Examples: CANWGJn5, EMLAdv001
    desc = desc.replace(/\b[A-Z]{2,}[a-z0-9]{3,}[A-Za-z0-9]*\b/g, (match) => {
      // Keep known patterns
      const keepPatterns = ['PAYroll', 'PAYROLL', 'FLEETCOR'];
      if (keepPatterns.some(p => match.toUpperCase().includes(p.toUpperCase()))) return match;
      // If it contains mixed case after uppercase prefix, likely gibberish
      if (match.match(/[A-Z]{2,}[a-z][0-9]/)) return '';
      return match;
    });

    // 5. Remove "@ + something" patterns (EMLAdv001@)
    desc = desc.replace(/\b[\w]+@[\w]*\b/g, '');

    // 6. Remove isolated number sequences (6+ digits)
    desc = desc.replace(/\b\d{6,}\b/g, '');

    // 7. Remove duplicate number patterns (513722 513722)
    desc = desc.replace(/\b(\d{5,})\s+\1\b/g, '');

    // 8. Remove trailing short mixed codes (Nk, 1, etc.)
    desc = desc.replace(/\s+[A-Z][a-z]?\d*$/g, '');

    // 9. Clean up "Autodeposit" formatting
    desc = desc.replace(/e-?Transfer\s*-?\s*Autodeposit/gi, 'e-Transfer, Autodeposit');
    desc = desc.replace(/-\s*Autodeposit/gi, ', Autodeposit');

    // 10. Remove Reference numbers
    desc = desc.replace(/Reference\s+[\dX]+/gi, '');

    // 11. Remove duplicate company names
    desc = desc.replace(/(\b\w+\s+\w+\s+\w+)\s+.*?\1/gi, '$1');

    // 12. Clean up leading date patterns that leaked through
    desc = desc.replace(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*/i, '');

    // 13. Clean up multiple spaces, hyphens, commas
    desc = desc.replace(/\s+/g, ' ');
    desc = desc.replace(/\s*-\s*-\s*/g, ' - ');
    desc = desc.replace(/,\s*,/g, ',');
    desc = desc.replace(/^[\s,\-]+|[\s,\-]+$/g, '');
    desc = desc.trim();

    // Add comma after transaction type for UI formatting
    const types = ['E-TRANSFER', 'INTERAC', 'BILL PAYMENT', 'SERVICE CHARGE', 'POINT OF SALE', 'ABM', 'CHEQUE', 'MISC PAYMENT', 'ONLINE BANKING', 'BUSINESS PAD', 'DIRECT DEPOSITS'];
    for (const type of types) {
      const upper = desc.toUpperCase();
      if (upper.startsWith(type) && desc.length > type.length && desc[type.length] !== ',') {
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
