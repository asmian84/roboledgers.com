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
  parseWithRegex(text, metadata = null, lineMetadata = []) {
    const lines = text.split('\n');
    const transactions = [];

    // [PHASE 4] Store lineMetadata for audit lookups
    this.lastLineMetadata = lineMetadata;

    // EXTRACT METADATA (Institution, Transit, Account)
    // RBC variation from screenshot: "Account number:     01259 100-244-3"
    let transitAcctMatch = text.match(/Account\s+number:?\s+(\d{5})\s+([\d-]{7,})/i);

    // EXTREME FALLBACK: If standard match fails, use a proximity search
    if (!transitAcctMatch) {
      console.warn('⚠️ [RBC] Standard label match failed. Starting proximity search...');
      const labelIndex = text.search(/Account\s+number/i);
      if (labelIndex !== -1) {
        const probeString = text.substring(labelIndex, labelIndex + 200);
        console.log(`🔍 [RBC] Probing text near label: "${probeString.replace(/\n/g, ' ')}"`);
        const m = probeString.match(/(\d{5})\s+([\d-]{7,})/i) || probeString.match(/(\d{5})[\s\n]+([\d-]{7,})/i);
        if (m) {
          console.error('✅ [RBC] Recovered metadata via proximity match:', m[0]);
          transitAcctMatch = m;
        }
      }
    }

    // ULTIMATE AGGRESSIVE SCAN: Scan first 5000 chars for ANY "5-digit [space] 7+digit/dash" pattern
    if (!transitAcctMatch) {
      console.warn('⚠️ [RBC] Proximity match failed. Scanning first 5000 chars for raw patterns...');
      const patterns = [
        /(\d{5})\s+([\d-]{7,})/i,
        /(\d{5})[\r\n\s]+([\d-]{7,})/i,
        /Transit\s+(\d{5})/i
      ];
      for (const p of patterns) {
        const m = text.substring(0, 5000).match(p);
        if (m) {
          console.error('✅ [RBC] Raw pattern match found:', m[0]);
          transitAcctMatch = m;
          break;
        }
      }
    }

    // FILENAME FALLBACK: If text extraction fails, look at the filename (e.g., ...-2443...)
    let fallbackAcct = '-----';
    if (!transitAcctMatch) {
      console.error('❌ [RBC] ALL text-based metadata extraction failed. Checking filename fallback...');
      const filenameMatch = text.match(/Filename:\s*.*?-(\d{4})/i) || text.match(/(\d{4})\s*20\d{2}\.pdf/i);
      if (filenameMatch) fallbackAcct = `...${filenameMatch[1]}`;
    }

    // Extract opening balance
    let openingBalance = null;
    const openingMatch = text.match(/Opening Balance.*?\$?([\d,]+\.\d{2})/i);
    if (openingMatch) {
      openingBalance = parseFloat(openingMatch[1].replace(/,/g, ''));
      console.log(`[RBC] Extracted opening balance: ${openingBalance}`);
    }

    this.metadata = {
      _inst: '003', // RBC Institution Code
      _transit: transitAcctMatch ? transitAcctMatch[1] : '-----',
      _acct: transitAcctMatch ? (transitAcctMatch[2] ? transitAcctMatch[2].replace(/[-\s]/g, '') : fallbackAcct) : fallbackAcct,
      institutionCode: '003',
      transit: transitAcctMatch ? transitAcctMatch[1] : '-----',
      accountNumber: transitAcctMatch ? (transitAcctMatch[2] || fallbackAcct) : fallbackAcct,
      _brand: 'RBC',
      _bank: 'RBC',
      _tag: 'Chequing',
      openingBalance: openingBalance
    };
    console.warn('🏁 [RBC] Extraction Phase Complete. Transit:', this.metadata.transit, 'Acct:', this.metadata.accountNumber);

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
    let pendingRawLines = [];
    let pendingAuditLines = [];
    let pendingLineCount = 0;
    const pageCounts = {}; // Track transaction index per page for Smart Popper

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

        // Try to extract transaction from this line (pass full line for rawText)
        const extracted = this.extractTransaction(lineAfterDate, currentDate, line);
        if (extracted) {
          // Assign lineIndex
          if (extracted.audit && extracted.audit.page) {
            const p = extracted.audit.page;
            pageCounts[p] = (pageCounts[p] || 0) + 1;
            extracted.audit.lineIndex = pageCounts[p];
          }
          transactions.push(extracted);
        } else if (lineAfterDate) {
          // No amount found - start accumulating for multi-line description
          pendingDescription = lineAfterDate;
          pendingRawLines = [line]; // Include the full line with date

          // Capture audit for this first line
          const firstLineAudit = this.getSpatialMetadata(line);
          pendingAuditLines = firstLineAudit ? [firstLineAudit] : [];

          pendingLineCount = 1;
        }
      } else if (currentDate) {
        // No date at start - could be:
        // 1. Continuation of previous description
        // 2. A new transaction for the same date

        // Check if this line has an amount (marks transaction boundary)
        const extracted = this.extractTransaction(line, currentDate, line);
        if (extracted) {
          // If we have pending description, prepend it
          if (pendingDescription) {
            extracted.description = pendingDescription + ' ' + extracted.description;
            // CRITICAL: Re-clean the concatenated description to ensure proper formatting
            extracted.description = this.cleanRBCDescription(extracted.description);

            // Prepend accumulated raw lines
            const combinedRaw = [...pendingRawLines, extracted.rawText].join('\n');
            extracted.rawText = combinedRaw;

            // Merge Audit data for multi-line using base helper
            if (extracted.audit) {
              const allAudit = [...pendingAuditLines, extracted.audit];
              extracted.audit = this.mergeAuditMetadata(allAudit);
            }

            pendingDescription = '';
            pendingRawLines = [];
            pendingAuditLines = [];
            pendingLineCount = 0;
          }

          // Assign lineIndex
          if (extracted.audit && extracted.audit.page) {
            const p = extracted.audit.page;
            pageCounts[p] = (pageCounts[p] || 0) + 1;
            extracted.audit.lineIndex = pageCounts[p];
          }

          transactions.push(extracted);
        } else {
          // Accumulate description (but limit to prevent runaway)
          if (pendingDescription && pendingDescription.length < 200) {
            pendingDescription += ' ' + line;
            pendingRawLines.push(line);

            const lineAudit = this.getSpatialMetadata(line);
            if (lineAudit) pendingAuditLines.push(lineAudit);

            pendingLineCount++;
          } else if (!pendingDescription) {
            pendingDescription = line;
            pendingRawLines = [line];

            const lineAudit = this.getSpatialMetadata(line);
            if (lineAudit) pendingAuditLines.push(lineAudit);

            pendingLineCount = 1;
          }
        }
      }
    }

    console.log(`[RBC] Parsing complete. Found ${transactions.length} transactions.`);
    return {
      transactions,
      metadata: this.metadata,
      openingBalance: this.metadata.openingBalance || 0
    };
  }

  /**
   * Extract a transaction from a line if it has an amount
   */
  extractTransaction(text, dateStr, fullLine = null, meta) {
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

    // [PHASE 4] Spatial Metadata Lookup
    let auditData = null;

    // Use the RAW line text (fullLine or text) to find the matching lineMetadata
    // This is the original PDF line before any reformatting
    const searchLine = fullLine || text;

    if (this.lastLineMetadata && this.lastLineMetadata.length > 0 && searchLine) {
      // Extract key parts of the line for fuzzy matching
      // Remove extra whitespace but keep the structure
      const normalizedSearch = searchLine.replace(/\s+/g, ' ').trim();

      // Try exact match first (with whitespace normalization)
      for (const lineMeta of this.lastLineMetadata) {
        if (!lineMeta.text) continue;

        const normalizedMeta = lineMeta.text.replace(/\s+/g, ' ').trim();

        // Check if the search line is contained in (or contains) the metadata line
        // This handles cases where lines might be split differently
        if (normalizedMeta.includes(normalizedSearch) || normalizedSearch.includes(normalizedMeta)) {
          console.log(`🎯 [RBC-AUDIT] Exact match found for "${description.substring(0, 30)}...":`);
          console.log(`   Search: "${normalizedSearch.substring(0, 50)}"`);
          console.log(`   Found:  "${normalizedMeta.substring(0, 50)}"`);
          console.log(`   Y: ${lineMeta.y}, Page: ${lineMeta.page}`);
          auditData = {
            page: lineMeta.page,
            y: lineMeta.y,
            height: lineMeta.height || 12
          };
          break;
        }
      }

      // If no exact match, try partial match using distinctive parts
      if (!auditData) {
        // Extract the most distinctive part: the description (before any amount)
        const descPart = searchLine.replace(/[\d,]+\.?\d*\s*$/g, '').trim();

        if (descPart.length > 10) { // Only try if we have meaningful text
          for (const lineMeta of this.lastLineMetadata) {
            if (!lineMeta.text) continue;

            // Look for the description part in the metadata
            if (lineMeta.text.includes(descPart.substring(0, Math.min(30, descPart.length)))) {
              auditData = {
                page: lineMeta.page,
                y: lineMeta.y,
                height: lineMeta.height || 12
              };
              break;
            }
          }
        }
      }

      // Last resort: try matching by amount only if it's a distinctive amount
      if (!auditData && amount && amount > 10) { // Avoid matching common small amounts
        const amountStr = amount.toFixed(2).replace(/\.00$/, '');
        for (const lineMeta of this.lastLineMetadata) {
          if (lineMeta.text && lineMeta.text.includes(amountStr)) {
            auditData = {
              page: lineMeta.page,
              y: lineMeta.y,
              height: lineMeta.height || 12
            };
            break;
          }
        }
      }
    }

    // [PHASE 5] Multi-line Height Calculation
    // If we have audit data, check if the transaction spans multiple lines
    if (auditData) {
      // Estimate line count from raw text
      const lineCount = (fullLine || text).split('\n').length;

      // Store lineCount for Smart Popper cropping
      auditData.lineCount = lineCount;

      if (lineCount > 1) {
        // Expand height to cover multiple lines (approx 12-14px per line)
        auditData.height = Math.max(auditData.height, lineCount * 14);
      }
      // Also check description length as a backup (RBC descriptions can be long)
      else if (description.length > 80) {
        auditData.height = Math.max(auditData.height, 28); // Assume 2 lines
        if (auditData.lineCount < 2) auditData.lineCount = 2;
      }
    }

    const finalTxn = {
      date: dateStr,
      description: description,
      amount: amount,
      debit: isCredit ? 0 : amount,
      credit: isCredit ? amount : 0,
      balance: balance,
      _inst: this.metadata?.institutionCode || '003',
      _transit: this.metadata?.transit || '-----',
      _acct: this.metadata?.accountNumber || '-----',
      _brand: 'RBC',
      _bank: 'RBC',
      _tag: 'Chequing',
      rawText: (() => {
        // Get the line without balance
        const lineWithoutBalance = fullLine ? fullLine.replace(/\s+[\d,]+\.\d{2}$/, '').trim() : text;

        // If line already starts with date, use as-is
        if (lineWithoutBalance.match(/^\d{1,2}\s+\w{3}/)) {
          return lineWithoutBalance;
        }

        // Otherwise prepend formatted date from dateStr (YYYY-MM-DD format)
        const dateParts = dateStr.split('-');
        if (dateParts.length === 3) {
          const day = parseInt(dateParts[2]);
          const monthIndex = parseInt(dateParts[1]) - 1;
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          const formattedDate = `${day.toString().padStart(2, '0')} ${monthNames[monthIndex]}`;
          return `${formattedDate}   ${lineWithoutBalance}`;
        }

        return lineWithoutBalance;
      })(),
      audit: auditData
    };

    // DEBUG: Log audit data for inspection
    console.log(`[RBC-AUDIT] Final Audit for "${description.substring(0, 15)}...":`, auditData);

    return finalTxn;
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
        let name = desc.substring(type.length).trim();

        // [USER FIX] Clean the extracted name (remove "- 1234 ", "1234 ", etc.)
        // This handles "Online Banking payment - 4891 AMEX" -> "AMEX"
        name = name.replace(/^[\s-]*\d{4,}\s+/, '');
        name = name.replace(/^[\s-]+/, ''); // Remove leading dashes/spaces

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
