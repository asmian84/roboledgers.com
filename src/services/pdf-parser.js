/**
 * AutoBookkeeping V4 - PDF Parser
 * Adapted from StatementSensei/Monopoly
 * 
 * Supports Canadian banks: TD, RBC, CIBC, BMO, Scotiabank
 * Uses PDF.js for text extraction and bank-specific regex patterns
 */

(function () {
    'use strict';

    class PDFParser {
        constructor() {
            // Bank configurations adapted from Monopoly
            this.banks = {
                td: {
                    name: 'TD Canada Trust',
                    patterns: {
                        // TD format: MM/DD/YYYY Description Amount
                        date: /(\d{2}\/\d{2}\/\d{4})/,
                        transaction: /(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+([\d,]+\.\d{2})\s*([CR])?/,
                        debitCredit: /([CR])$/
                    },
                    identifier: /TD Canada Trust|TD Bank|TD CANADA/i,
                    dateFormat: 'MM/DD/YYYY'
                },
                rbc: {
                    name: 'RBC Royal Bank',
                    patterns: {
                        // RBC format: DD MMM   Description   Amount   Amount   Balance
                        // Example: 29 Feb   Loan interest   NO.78783249 001   221.33   -58.86
                        date: /(\d{1,2}\s+\w{3})/,
                        transaction: /(\d{1,2}\s+\w{3})\s+(.+?)\s+([\d,]+\.?\d{0,2})\s+([\d,]+\.?\d{0,2})?/,
                    },
                    identifier: /Royal Bank|RBC|ROYAL BANK OF CANADA/i,
                    dateFormat: 'DD MMM'
                },
                cibc: {
                    name: 'CIBC',
                    patterns: {
                        // CIBC format: MMM DD, YYYY Description Amount
                        date: /(\w{3}\s+\d{1,2},\s+\d{4})/,
                        transaction: /(\w{3}\s+\d{1,2},\s+\d{4})\s+(.+?)\s+([\d,]+\.\d{2})/,
                    },
                    identifier: /CIBC|Canadian Imperial Bank/i,
                    dateFormat: 'MMM DD, YYYY'
                },
                bmo: {
                    name: 'BMO Bank of Montreal',
                    patterns: {
                        // BMO format: MM/DD/YY Description Amount
                        date: /(\d{2}\/\d{2}\/\d{2})/,
                        transaction: /(\d{2}\/\d{2}\/\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/,
                    },
                    identifier: /Bank of Montreal|BMO|BMO BANK/i,
                    dateFormat: 'MM/DD/YY'
                },
                scotiabank: {
                    name: 'Scotiabank',
                    patterns: {
                        // Scotiabank format: YYYY-MM-DD Description Amount
                        date: /(\d{4}-\d{2}-\d{2})/,
                        transaction: /(\d{4}-\d{2}-\d{2})\s+(.+?)\s+([\d,]+\.\d{2})/,
                    },
                    identifier: /Scotiabank|Scotia|THE BANK OF NOVA SCOTIA/i,
                    dateFormat: 'YYYY-MM-DD'
                }
            };

            // Garbage line patterns (from Monopoly)
            this.garbagePatterns = [
                /opening balance/i,
                /closing balance/i,
                /beginning balance/i,
                /ending balance/i,
                /page \d+ of \d+/i,
                /statement period/i,
                /account number/i,
                /account summary/i,
                /transaction history/i,
                /^\s*$/,
                /^date\s+description\s+amount/i,
                /^total/i,
                /account activity/i,
                /continued/i,
                /description.+cheques.+debits/i,
                /deposits.+credits.+balance/i
            ];
        }

        /**
         * Parse PDF file and extract transactions
         */
        async parsePDF(file) {
            try {
                console.log('📄 Starting PDF parsing...');

                // 1. Load PDF
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

                console.log(`📄 PDF loaded: ${pdf.numPages} pages`);

                // 2. Extract text from all pages with Layout Preservation
                let fullText = '';
                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();

                    // Sort items by Y (descending) then X (ascending)
                    // Y is from bottom in PDF, so higher Y = top.
                    const items = textContent.items.map(item => ({
                        str: item.str,
                        x: item.transform[4],
                        y: item.transform[5],
                        hasEOL: item.hasEOL
                    }));

                    // Sort: Top to Bottom, Left to Right
                    items.sort((a, b) => {
                        // Tolerance for same line = 2 units (Tightened from 4)
                        if (Math.abs(a.y - b.y) < 2) {
                            return a.x - b.x;
                        }
                        return b.y - a.y; // Descending Y
                    });

                    let pageText = '';
                    let lastY = -1;

                    items.forEach((item, index) => {
                        if (index === 0) {
                            pageText += item.str;
                            lastY = item.y;
                            return;
                        }

                        // Determine if new line
                        if (Math.abs(item.y - lastY) > 2) {
                            pageText += '\n' + item.str;
                        } else {
                            // Same line, add space? (Check x distance?)
                            pageText += ' ' + item.str;
                        }
                        lastY = item.y;
                    });

                    fullText += pageText + '\n';
                }

                console.log(`📄 Extracted ${fullText.length} characters`);

                // 3. Identify bank
                const bank = this.identifyBank(fullText);
                if (!bank) {
                    throw new Error('Unable to identify bank from PDF. Supported: TD, RBC, CIBC, BMO, Scotiabank');
                }

                console.log(`🏦 Identified bank: ${bank.name}`);

                // 4. Extract transactions & metadata
                const result = this.extractTransactions(fullText, bank);
                let transactions = [];
                let metadata = {};

                if (Array.isArray(result)) {
                    transactions = result;
                } else {
                    transactions = result.transactions;
                    metadata = result.metadata;
                }

                console.log(`✅ Extracted ${transactions.length} transactions`);

                // 5. Calculate confidence
                const confidence = this.calculateConfidence(transactions);

                return {
                    bank: bank.name,
                    transactions,
                    metadata,
                    confidence,
                    rawText: fullText // For debugging
                };
            } catch (error) {
                console.error('❌ PDF parsing failed:', error);
                throw error;
            }
        }

        /**
         * Identify bank from PDF text
         */
        identifyBank(text) {
            for (const [key, bank] of Object.entries(this.banks)) {
                if (bank.identifier.test(text)) {
                    return bank;
                }
            }
            return null;
        }

        /**
         * Extract transactions using bank-specific patterns
         */
        extractTransactions(text, bank) {
            // Use custom parser for RBC
            if (bank.name === 'RBC Royal Bank') {
                console.log('🏦 Using custom RBC parser...');
                return this.extractRBCTransactions(text);
            }

            // Use regex-based parser for other banks
            const lines = text.split('\n');
            const transactions = [];
            let multilineDescription = '';

            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();

                // Skip garbage lines
                if (this.isGarbageLine(line)) {
                    multilineDescription = '';
                    continue;
                }

                // Try to match transaction pattern
                const match = line.match(bank.patterns.transaction);

                if (match) {
                    const [, dateStr, description, amountStr, debitCredit] = match;

                    // Determine if debit or credit
                    let amount = this.parseAmount(amountStr);
                    const type = this.determineType(line, debitCredit, amount);

                    // Make debits negative
                    if (type === 'debit') {
                        amount = -Math.abs(amount);
                    }

                    transactions.push({
                        date: this.normalizeDate(dateStr, bank.dateFormat),
                        description: (multilineDescription + ' ' + description).trim(),
                        amount,
                        type,
                        raw: line
                    });

                    multilineDescription = '';
                } else if (line.length > 0 && !this.isGarbageLine(line)) {
                    // Might be continuation of previous description
                    multilineDescription += ' ' + line;
                }
            }

            return transactions;
        }

        /**
         * Custom RBC parser for multi-column format
         * Format: Date   Description   Cheques & Debits ($)   Deposits & Credits ($)   Balance ($)
         */
        extractRBCTransactions(text) {
            const transactions = [];

            console.log(`🔍 RBC Parser: Starting extraction...`);
            console.log(`📝 Text length: ${text.length} characters`);

            // 1. Better Year Detection
            let startYear = new Date().getFullYear();
            const periodMatch = text.match(/from\s+\w+\s+\d{1,2},?\s+(\d{4})\s+to/i);
            if (periodMatch) {
                startYear = parseInt(periodMatch[1]);
                console.log(`📅 Detected Statement Start Year: ${startYear}`);
            } else {
                const yearMatch = text.match(/\b20[2-3]\d\b/);
                if (yearMatch) startYear = parseInt(yearMatch[0]);
                console.log(`📅 Estimated Year: ${startYear}`);
            }

            // 2. Line-by-Line Parsing State
            const lines = text.split('\n');
            let currentDateStr = null;
            let currentYear = startYear;
            const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
            let previousMonthVal = -1;
            let descriptionBuffer = ''; // Store orphan text lines
            let currentRunningBalance = null; // Track running balance for logic

            // Regex for Date at start of line: "29 Feb" or "02 Mar"
            // Handles both "29 Feb" and "Feb 29" formats potentially? RBC is usually "DD MMM"
            const lineDatePattern = /^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/;

            // Metadata extraction
            const metadata = {
                openingBalance: null,
                closingBalance: null,
                totalDeposits: null,
                totalDebits: null
            };

            for (let i = 0; i < lines.length; i++) {
                let line = lines[i].trim();

                if (!line) {
                    descriptionBuffer = ''; // Clear buffer on empty
                    continue;
                }

                // DEBUG: Log first few lines of Page 2 (approx line 40+)
                if (i > 40 && i < 60) {
                    console.log(`[Line ${i}] Raw: "${line}" | Garbage: ${this.isGarbageLine(line)}`);
                }

                const lowerLine = line.toLowerCase();

                // Metadata Parsing
                if (lowerLine.includes('opening balance')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) {
                        const val = parseFloat(match[0].replace(/[$,]/g, ''));
                        metadata.openingBalance = val;
                        // Initialize tracking for Delta Logic
                        // Note: Opening Balance line is BEFORE transactions usually.
                        if (previousBalance === null) previousBalance = val;
                    }
                }
                if (lowerLine.includes('closing balance')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) metadata.closingBalance = parseFloat(match[0].replace(/[$,]/g, ''));
                }
                if (lowerLine.includes('total deposits') && lowerLine.includes('credits')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) metadata.totalDeposits = parseFloat(match[0].replace(/[$,]/g, ''));
                }
                if (lowerLine.includes('total cheques') && lowerLine.includes('debits')) {
                    const match = line.match(/-?\$?[\d,]+\.\d{2}/);
                    if (match) metadata.totalDebits = parseFloat(match[0].replace(/[$,]/g, ''));
                }

                // Skip known headers/garbage AFTER checking for metadata
                if (this.isGarbageLine(line)) {
                    descriptionBuffer = ''; // Clear buffer on garbage
                    continue;
                }
                if (/statement period/i.test(line)) continue;
                if (/royal bank/i.test(line)) continue;
                if (/page \d+/i.test(line)) continue;

                // Also skip the specific summary lines we just parsed so they don't become transactions
                if (lowerLine.includes('opening balance') ||
                    lowerLine.includes('closing balance') ||
                    (lowerLine.includes('total deposits') && lowerLine.includes('credits')) ||
                    (lowerLine.includes('total cheques') && lowerLine.includes('debits'))) {
                    continue;
                }

                // Check for Date
                const dateMatch = line.match(lineDatePattern);
                if (dateMatch) {
                    currentDateStr = dateMatch[1];
                    // Remove date from line for processing
                    line = line.substring(dateMatch[0].length).trim();

                    // Year Logic
                    const monthStr = currentDateStr.split(' ')[1];
                    const monthVal = months[monthStr];

                    if (previousMonthVal !== -1) {
                        if (previousMonthVal === 11 && monthVal === 0) {
                            currentYear++; // Dec -> Jan
                        }
                    }
                    previousMonthVal = monthVal;
                }

                // If we don't have a date yet, skipping (header junk before first txn)
                if (!currentDateStr) continue;

                // Look for Amounts: "-1,234.56" or "1234.56"
                const amountPattern = /-?[\d,]+\.\d{2}/g;
                const matches = line.match(amountPattern);

                // --- CRITICAL FIX: ORPHAN HANDLING ---
                if (!matches) {
                    // This line has text (maybe a Date) but no amount.
                    // It is likely the START of a split transaction.
                    // Example: "23 Jan e-Transfer received..." (No dollars)

                    // If we just found a date on this line, we MUST separate this text 
                    // from the previous transaction. It belongs to this new date context.
                    if (dateMatch) {
                        // New date context, start fresh buffer
                        descriptionBuffer = line;
                    } else {
                        // No date, just text. 
                        // Check if it's junk numbers or meaningful text
                        if (!line.match(/^\d+$/)) {
                            // Append to buffer for NEXT transaction
                            descriptionBuffer += (descriptionBuffer ? ' ' : '') + line;
                        }
                    }
                    continue;
                }

                // We have amounts.
                const firstAmountStr = matches[0];
                const firstAmountIndex = line.indexOf(firstAmountStr);

                let description = line.substring(0, firstAmountIndex).trim();

                // If description is empty (or purely whitespace), use buffer
                if (!description && descriptionBuffer) {
                    description = descriptionBuffer;
                    descriptionBuffer = '';
                } else if (description) {
                    // We have a description inline.
                    // Check if we also have a buffer waiting (e.g. from previous line with Date)
                    if (descriptionBuffer) {
                        description = descriptionBuffer + ' ' + description;
                        descriptionBuffer = '';
                    }
                } else {
                    // No desc, no buffer.
                    description = "Transaction";
                }

                // Filter out totals/balances lines that mimic transactions
                if (description.toLowerCase().includes('balance') ||
                    description.toLowerCase().includes('total')) continue;

                // Parse Amounts
                const amounts = matches.map(s => parseFloat(s.replace(/,/g, '')));
                let amount = amounts[0];
                let type = 'debit'; // Default to debit if unsure

                // --- 1. KEYWORD HEURISTICS ---
                const lowerDesc = description.toLowerCase();
                const creditKeywords = [
                    'deposit', 'credit', 'redemption', 'received', 'rcvd', 'return',
                    'refund', 'interest', 'dividend', 'royalty'
                ];

                // Check keywords
                if (creditKeywords.some(kw => lowerDesc.includes(kw))) {
                    type = 'credit';
                }

                // --- 2. BALANCE DELTA LOGIC (The Truth) ---
                // We track 'previousBalance' (initialized at openingBalance)
                // If we can match the math, we force the type.

                // Initialize running balance for the loop if not set
                if (currentRunningBalance === null && metadata.openingBalance !== null) {
                    currentRunningBalance = metadata.openingBalance;
                }

                let lineBalance = null;

                if (amounts.length >= 1) {
                    // Try to identify Balance Column
                    // In RBC, Balance is the LAST column.
                    if (amounts.length >= 2) {
                        const candidateBalance = amounts[amounts.length - 1]; // Last number
                        lineBalance = candidateBalance;

                        // If we have a previous balance reference
                        if (currentRunningBalance !== null) {
                            const diff = candidateBalance - currentRunningBalance;

                            // Check if it matches the transaction amount
                            // Tolerance for floating point
                            if (Math.abs(diff - amount) < 0.05) {
                                // Bal increased by Amount -> Credit
                                type = 'credit';
                            } else if (Math.abs(diff + amount) < 0.05) {
                                // Bal decreased by Amount -> Debit
                                type = 'debit';
                            }
                        }

                        // Update tracking balance for next line
                        currentRunningBalance = candidateBalance;
                    }
                    else if (amounts.length === 1) {
                        // Only amount, no balance on this line.
                        // We keep currentRunningBalance as is (from previous line)
                        // But we can't display a specific "Balance" for this row from the PDF text.
                        // Optional: Use calculated balance?
                        // For now, let's leave lineBalance as null or use current logic.
                    }
                }

                // Finalize Value
                if (type === 'credit') {
                    amount = Math.abs(amount);
                } else {
                    amount = Math.abs(amount); // Debits stored as positive magnitude
                }

                // Construct Date
                const mStr = currentDateStr.split(' ')[1];
                const dStr = currentDateStr.split(' ')[0].padStart(2, '0');
                const mIdx = months[mStr] + 1;
                const mNum = mIdx.toString().padStart(2, '0');

                const isoDate = `${currentYear}-${mNum}-${dStr}`;

                transactions.push({
                    date: isoDate,
                    description: description,
                    amount: amount,
                    type: type,
                    originalDate: `${currentDateStr} ${currentYear}`,
                    Balance: lineBalance !== null ? lineBalance : '' // Add Balance for Grid
                });
            }

            console.log(`\n🎯 RBC Parser (Line-Mode): Extracted ${transactions.length} transactions`);
            return { transactions, metadata };
        }



        /**
         * Check if line is garbage (headers, footers, etc.)
         */
        isGarbageLine(line) {
            return this.garbagePatterns.some(pattern => pattern.test(line));
        }

        /**
         * Determine transaction type (debit/credit)
         */
        determineType(line, debitCreditMarker, amount) {
            // If explicit marker
            if (debitCreditMarker === 'D' || debitCreditMarker === 'C') {
                return debitCreditMarker === 'D' ? 'debit' : 'credit';
            }

            // Check for keywords
            const debitKeywords = /purchase|payment|withdrawal|fee|charge/i;
            const creditKeywords = /deposit|credit|refund|interest/i;

            if (debitKeywords.test(line)) return 'debit';
            if (creditKeywords.test(line)) return 'credit';

            // Default: negative = debit, positive = credit
            return amount < 0 ? 'debit' : 'credit';
        }

        /**
         * Normalize date to YYYY-MM-DD
         */
        normalizeDate(dateStr, format) {
            let date;

            try {
                if (format === 'YYYY-MM-DD') {
                    // Already in correct format
                    date = new Date(dateStr);
                } else if (format === 'MM/DD/YYYY') {
                    const [month, day, year] = dateStr.split('/');
                    date = new Date(year, month - 1, day);
                } else if (format === 'MM/DD/YY') {
                    const [month, day, year] = dateStr.split('/');
                    const fullYear = year.length === 2 ? '20' + year : year;
                    date = new Date(fullYear, month - 1, day);
                } else if (format === 'MMM DD, YYYY' || format === 'MMM DD YYYY') {
                    date = new Date(dateStr);
                }

                if (!date || isNaN(date.getTime())) {
                    throw new Error('Invalid Date');
                }

                return date.toISOString().split('T')[0];
            } catch (error) {
                console.error('Date parsing error:', dateStr, error);
                return dateStr; // Return original if parsing fails
            }
        }

        /**
         * Parse amount string to number
         */
        parseAmount(amountStr) {
            return parseFloat(amountStr.replace(/,/g, ''));
        }

        /**
         * Calculate confidence score based on data quality
         */
        calculateConfidence(transactions) {
            if (transactions.length === 0) return 0;

            let score = 0;
            const checks = [
                // All have valid dates
                transactions.every(t => !isNaN(new Date(t.date))),
                // All have valid amounts
                transactions.every(t => !isNaN(t.amount)),
                // All have descriptions
                transactions.every(t => t.description.length > 0),
                // Reasonable transaction count (not too few)
                transactions.length >= 5,
                // No duplicate transactions
                new Set(transactions.map(t => `${t.date}-${t.amount}`)).size === transactions.length
            ];

            score = checks.filter(Boolean).length / checks.length;

            return score;
        }

        /**
         * Get supported banks
         */
        getSupportedBanks() {
            return Object.values(this.banks).map(b => b.name);
        }
    }

    // Create singleton instance and expose globally
    window.pdfParser = new PDFParser();

    console.log('📄 PDF Parser loaded (supports 5 Canadian banks)');

})(); // End IIFE
