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
   * KEY INSIGHT: Multiple transactions can occur on the same date
   * A new transaction starts when we see an AMOUNT (not a new date)
   */
  parseWithRegex(text) {
    const lines = text.split('\n');
    const transactions = [];

    // EXTRACT METADATA (Institution, Transit, Account)
    // RBC format from screenshot: Account number: 06498 100-231-0
    const transitAcctMatch = text.match(/Account number:?\s*(\d{5})\s+([\d-]{7,})/i);
    const fileMetadata = {
      _inst: '003', // RBC Institution Code
      _transit: transitAcctMatch ? transitAcctMatch[1] : '-----',
      _acct: transitAcctMatch ? transitAcctMatch[2].replace(/[-\s]/g, '') : '-----',
      _brand: 'RBC',
      _bank: 'RBC',
      _tag: 'Chequing'
    };
    console.log('[RBC] Extracted Metadata:', fileMetadata);

    // Extract year from statement - look for "January 1, 2024" or "February 5, 2024" patterns
    // CRITICAL: Be specific to avoid matching random 4-digit numbers
    const yearPatterns = [
      /(\w+)\s+\d{1,2},?\s+(20\d{2})\s+to\s+\w+\s+\d{1,2},?\s+(20\d{2})/i, // "January 1, 2024 to February 5, 2024"
      /Statement\s+Period.*?(20\d{2})/i,
      /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{1,2},?\s+(20\d{2})/i,
      /(20\d{2})-\d{2}-\d{2}/ // ISO date
    ];

    for (const pattern of yearPatterns) {
      const match = text.match(pattern);
      if (match) {
        // Use the last year found in case of date range
        const year = match[match.length - 1] || match[1];
        if (year && year.match(/^20\d{2}$/)) {
          this.currentYear = parseInt(year);
          console.log(`[RBC] Extracted year: ${this.currentYear}`);
          break;
        }
      }
    }
    let lastMonth = null;
    let currentDate = null; // Track the current date for multi-transaction days

    // RBC Date pattern: "06 Feb" or "7 May" (day space month)
    const dateRegex = /^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/i;

    // Amount pattern: ends with Amount + Balance
    // RBC format: "Description  Amount  Balance" with spacing
    const amountPattern = /([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/;

    // Single amount pattern (some transactions only have one amount)
    const singleAmountPattern = /([\d,]+\.\d{2})$/;

    console.log(`[RBC] Starting parse with ${lines.length} lines, year: ${this.currentYear}`);

    let pendingDescription = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Skip headers and summary lines
      if (line.match(/Opening Balance|Closing Balance|Balance Forward|Statement|Account Number|Account Activity|Cheques.*Debits|Deposits.*Credits/i)) continue;
      if (line.match(/^Date\s+Description/i)) continue;
      if (line.match(/^Page\s+\d+/i)) continue;

      // Check if line starts with a date
      const dateMatch = line.match(dateRegex);
      if (dateMatch) {
        const day = dateMatch[1];
        const monthName = dateMatch[2];

        // Year rollover detection
        const monthIndex = this.getMonthIndex(monthName);
        if (lastMonth !== null && monthIndex < lastMonth && monthIndex <= 1) {
          this.currentYear++;
          console.log(`[RBC] Year rollover detected: ${this.currentYear}`);
        }
        lastMonth = monthIndex;

        currentDate = this.formatDate(day, monthName, this.currentYear);

        // Remove the date from the line to get description part
        const lineAfterDate = line.substring(dateMatch[0].length).trim();

        // Try to extract transaction from this line
        const extracted = this.extractTransaction(lineAfterDate, currentDate);
        if (extracted) {
          transactions.push(extracted);
        } else if (lineAfterDate) {
          // No amount found - start accumulating for multi-line description
          pendingDescription = lineAfterDate;
        }
      } else if (currentDate) {
        // No date at start - could be:
        // 1. Continuation of previous description
        // 2. A new transaction for the same date

        // Check if this line has an amount (marks transaction boundary)
        const extracted = this.extractTransaction(line, currentDate);
        if (extracted) {
          // If we have pending description, prepend it
          if (pendingDescription) {
            extracted.description = pendingDescription + ' ' + extracted.description;
            // CRITICAL: Re-clean the concatenated description to ensure proper formatting
            extracted.description = this.cleanRBCDescription(extracted.description);
            pendingDescription = '';
          }
          transactions.push(extracted);
        } else {
          // Accumulate description (but limit to prevent runaway)
          if (pendingDescription && pendingDescription.length < 200) {
            pendingDescription += ' ' + line;
          } else if (!pendingDescription) {
            pendingDescription = line;
          }
        }
      }
    }

    console.log(`[RBC] Parsing complete. Found ${transactions.length} transactions.`);
    return { transactions };
  }

  /**
   * Extract a transaction from a line if it has an amount
   */
  extractTransaction(text, dateStr) {
    if (!text) return null;

    // Pattern: Description ending with Amount Balance
    // Example: "e-Transfer - Autodeposit COMPANY   1,234.56   67,890.12"
    const twoAmountMatch = text.match(/([\d,]+\.\d{2})\s+([\d,]+\.\d{2})$/);
    const singleAmountMatch = text.match(/([\d,]+\.\d{2})$/);

    let amount = 0;
    let balance = 0;
    let description = text;

    if (twoAmountMatch) {
      amount = parseFloat(twoAmountMatch[1].replace(/,/g, ''));
      balance = parseFloat(twoAmountMatch[2].replace(/,/g, ''));
      description = text.replace(twoAmountMatch[0], '').trim();
    } else if (singleAmountMatch) {
      amount = parseFloat(singleAmountMatch[1].replace(/,/g, ''));
      description = text.replace(singleAmountMatch[0], '').trim();
    } else {
      return null; // No amount found
    }

    // Clean the description
    description = this.cleanRBCDescription(description);

    // Determine debit vs credit
    const isCredit = this.isCredit(description);

    return {
      date: dateStr,
      description: description,
      amount: amount,
      debit: isCredit ? 0 : amount,
      credit: isCredit ? amount : 0,
      balance: balance,
      _inst: '003',
      _brand: 'RBC',
      _bank: 'RBC',
      _tag: 'Chequing'
    };
  }

  getMonthIndex(monthName) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    return months.indexOf(monthName.toLowerCase().substring(0, 3));
  }

  formatDate(day, monthName, year) {
    const month = this.getMonthIndex(monthName) + 1;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }

  isCredit(description) {
    const creditKeywords = /DEPOSIT|CREDIT|REFUND|PAYROLL|TRANSFER\s+FROM|E-TRANSFER.*RECEIVED|INTERAC.*REC|DIRECT\s+DEPOSIT|AUTODEPOSIT/i;
    return creditKeywords.test(description);
  }

  cleanRBCDescription(desc) {
    // console.log('[RBC] cleanRBCDescription CALLED with:', JSON.stringify(desc));
    // =====================================================
    // RBC DESCRIPTION CLEANUP & REFORMATTING
    // Goal: Convert "Type Name Garbage" → "Name, Type"
    // Uses Scotia-inspired prefix matching for consistency
    // =====================================================

    // 0. EARLY NORMALIZATION: Collapse all whitespace/newlines into single spaces
    desc = desc.replace(/\s+/g, ' ').trim();

    // 1. REMOVE DATES - "10 Jan", "February 5, 2024", "2 of 3", page refs
    desc = desc.replace(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*/i, '');
    desc = desc.replace(/\b\d{1,2}\s+of\s+\d+\b/gi, ''); // "2 of 3"
    desc = desc.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}\b/gi, '');
    desc = desc.replace(/\bto\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}\b/gi, '');
    desc = desc.replace(/\b20\d{2}\b/g, ''); // Standalone years

    // 2. REMOVE GIBBERISH CODES (Aggressive & Case-Insensitive)
    desc = desc.replace(/C1A[a-zA-Z0-9]{4,}/gi, '');
    desc = desc.replace(/CA[a-zA-Z0-9]{5,}/gi, ''); // Broadened and case-insensitive
    desc = desc.replace(/[a-f0-9]{16,}/gi, '');
    desc = desc.replace(/[\w.-]+@[\w.-]+\b/g, ''); // Email fix
    desc = desc.replace(/\b\d{6,}\b/gi, ''); // Long numbers
    desc = desc.replace(/\b(\d{5,})\s+\1\b/gi, ''); // Duplicate numbers

    // 2.2. SYSTEMATIC GARBAGE REMOVAL
    // Removes the long bank address prefix found in many RBC transactions
    const bagServiceRegex = /ROYAL\s+BANK\s+OF\s+CANADA\s+P\.O\.\s+BAG\s+SERVICE\s+\d+\s+AB\s+T2P\s+2M7\s+to\s+/gi;
    if (bagServiceRegex.test(desc)) {
      desc = desc.replace(bagServiceRegex, 'RBC ').trim();
    }

    // 2.5. SPECIFIC OVERRIDES (High Priority)
    const descUpper = desc.toUpperCase();

    // Rule for Debit Memo: "Debit Memo Client request [details]" -> "[details], Debit Memo - Client request"
    if (descUpper.startsWith('DEBIT MEMO CLIENT REQUEST')) {
      const details = desc.substring('DEBIT MEMO CLIENT REQUEST'.length).trim();
      if (details) {
        return `${details}, Debit Memo - Client request`;
      }
    }

    // Rule for Account Fees: "ROYAL BANK OF CANADA ... to Account Fees: $" -> "RBC Account Fees: $"
    if (descUpper.includes('TO ACCOUNT FEES: $')) {
      return `RBC Account Fees: $`;
    }

    // 3. PREFIX MATCHING (RBC Format: "Name, Type")
    // RBC-specific transaction type prefixes
    // NOTE: Unlike Scotia which uses "Type, Name", RBC uses "Name, Type"
    const typePrefixes = [
      "E-TRANSFER - AUTODEPOSIT", "E-TRANSFER SENT", "E-TRANSFER",
      "AUTODEPOSIT", "ONLINE BANKING PAYMENT", "ONLINE BANKING TRANSFER",
      "MISC PAYMENT", "BUSINESS PAD", "MOBILE CHEQUE DEPOSIT",
      "RBCINS LIFE", "REQUEST FULFILLED FEE", "MONTHLY FEE", "ACCOUNT FEES",
      "CONTACTLESS INTERAC PURCHASE", "DIRECT DEPOSITS (PDS) SERVICE TOTAL"
    ];

    // Check for prefix match and reformat to "Name, Type"
    // Use simple string matching instead of regex for reliability
    let matched = false;

    // DEBUG: Show what we're trying to match
    if (descUpper.includes('TRANSFER') || descUpper.includes('AUTODEPOSIT')) {
      // console.log('[DEBUG] Checking desc:', descUpper.substring(0, 60));
    }

    for (const type of typePrefixes) {
      const searchStr = type + ' ';
      if (descUpper.startsWith(searchStr)) {
        // DEBUG: Show successful match
        // console.log('[DEBUG] ✓ MATCHED:', type);

        // Found a match - extract everything after the prefix
        const name = desc.substring(type.length).trim();
        if (name) {
          // Format as "Name, Type" (RBC style)
          const formattedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
          desc = `${name}, ${formattedType}`;
          // console.log('[DEBUG] Result:', desc.substring(0, 60));
          matched = true;
        }
        break;
      }
    }

    // 4. FALLBACK: Split on dash if no prefix matched but dash exists
    if (!desc.includes(',') && desc.includes(' - ')) {
      const parts = desc.split(' - ');
      if (parts.length === 2) {
        // Format: "Type - Name" → "Name, Type"
        desc = `${parts[1].trim()}, ${parts[0].trim()}`;
      }
    }

    // 5. Final cleanup
    desc = desc.replace(/,\s*,/g, ','); // Remove double commas
    desc = desc.replace(/\s+/g, ' ').trim();
    desc = desc.replace(/^[,\s]+|[,\s]+$/g, ''); // Trim leading/trailing commas and spaces

    return desc;
  }
}

// Expose to window for file:// compatibility
window.RBCChequingParser = RBCChequingParser;
window.rbcChequingParser = new RBCChequingParser();
