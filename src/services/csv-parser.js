/**
 * AutoBookkeeping V4 - Smart CSV Parser
 * Ported from RoboLedger2
 * 
 * Key features:
 * - Header detection with validation against actual data
 * - Garbage line filtering (opening/closing balance, totals)
 * - Column mapping with confidence scoring
 * - Support for Canadian banks: TD, RBC, CIBC, BMO, Scotiabank
 */

(function () {

    class SmartCSVParser {
        constructor() {
            this.KEYWORDS = [
                'date', 'time', 'description', 'payee', 'merchant',
                'debit', 'withdrawal', 'credit', 'deposit', 'amount',
                'balance', 'reference', 'ref', 'posting', 'effective'
            ];
        }

        /**
         * Parse CSV text to transactions
         * @param {string} rawText - Raw CSV content
         * @returns {Array} List of normalized transaction objects
         */
        parse(rawText) {
            // console.log('🧠 SmartCSV: Starting paranoid analysis...');

            const allLines = rawText
                .split(/\r\n|\n|\r/)
                .map(l => l.trim())
                .filter(l => l);

            if (allLines.length === 0) {
                throw new Error('File is empty');
            }

            // Phase 1: Find and validate header row
            const { headerRowIndex, headerMap } = this.findHeaderRow(allLines);

            if (headerRowIndex === -1) {
                throw new Error(
                    'CSV Parsing Failed: Could not identify valid columns. ' +
                    'Please ensure your CSV has Date, Description, and Amount headers.'
                );
            }

            // console.log(`🎯 Validated Header at row ${headerRowIndex + 1}:`, allLines[headerRowIndex]);
            // console.log('🗺️ Column Mapping:', headerMap);

            // Phase 2: Extract transactions
            const transactions = [];
            const dataLines = allLines.slice(headerRowIndex + 1);
            let garbageCount = 0;

            for (const line of dataLines) {
                if (this.isGarbageLine(line)) {
                    garbageCount++;
                    continue;
                }

                const cols = this.splitCSVLine(line);
                const txn = this.mapRowToTransaction(cols, headerMap);

                if (this.isValidTransaction(txn)) {
                    transactions.push(txn);
                }
            }

            if (transactions.length === 0) {
                throw new Error('No valid transactions found. The file format might be incompatible.');
            }

            // console.log(`✅ Extracted ${transactions.length} valid transactions. Skipped ${garbageCount} garbage lines.`);
            return transactions;
        }

        /**
         * Find header row with validation
         */
        findHeaderRow(lines) {
            let bestScore = -Infinity;
            let bestIndex = -1;
            let bestMap = null;

            const scanLimit = Math.min(lines.length, 30); // Scan first 30 rows

            for (let i = 0; i < scanLimit; i++) {
                const cols = this.splitCSVLine(lines[i]);
                if (cols.length < 2) continue;

                // 1. Keyword matching
                const lowerCols = cols.map(c => c.toLowerCase().trim());
                let keywordMatches = 0;

                this.KEYWORDS.forEach(keyword => {
                    if (lowerCols.some(col => col === keyword || col.includes(keyword))) {
                        keywordMatches++;
                    }
                });

                if (keywordMatches < 1) continue;

                // 2. Generate column map
                const map = this.generateColumnMap(lowerCols);

                // 3. CRITICAL: Validate map against actual data
                const validationScore = this.validateMapAgainstData(map, lines, i + 1);

                if (validationScore === -1) {
                    // Map failed validation - skip this candidate
                    continue;
                }

                const totalScore = keywordMatches + validationScore;

                if (totalScore > bestScore) {
                    bestScore = totalScore;
                    bestIndex = i;
                    bestMap = map;
                }
            }

            if (bestScore <= 0) {
                return { headerRowIndex: -1, headerMap: null };
            }

            return { headerRowIndex: bestIndex, headerMap: bestMap };
        }

        /**
         * Validate column map against actual data rows
         * Returns positive score if valid, -1 if fatal mismatch
         */
        validateMapAgainstData(map, lines, startIdx) {
            let score = 0;
            let rowsChecked = 0;
            let validRows = 0;

            // Check next 5 data rows
            for (let j = 0; j < 5; j++) {
                if (startIdx + j >= lines.length) break;

                const line = lines[startIdx + j];
                if (this.isGarbageLine(line)) continue;

                const cols = this.splitCSVLine(line);
                if (cols.length < 2) continue;

                rowsChecked++;

                // TEST 1: Date column should contain dates
                if (map.date > -1 && cols[map.date]) {
                    if (this.isLikelyDate(cols[map.date])) {
                        score += 2;
                    } else if (cols[map.date].trim() !== '') {
                        // If "Date" column doesn't have dates, reject this map
                        return -1;
                    }
                }

                // TEST 2: Description should NOT be a number
                if (map.desc > -1 && cols[map.desc]) {
                    const val = cols[map.desc].trim();
                    if (this.isLikelyMoney(val) && val.length < 15) {
                        // Description looks like money - reject
                        return -1;
                    }
                    score += 1;
                }

                // TEST 3: Amount/Debit/Credit should be numbers
                const moneyIdx = map.amount > -1 ? map.amount :
                    (map.debit > -1 ? map.debit : map.credit);

                if (moneyIdx > -1 && cols[moneyIdx]) {
                    if (this.isLikelyMoney(cols[moneyIdx])) {
                        score += 2;
                        validRows++;
                    }
                }
            }

            // If we checked rows but found NO valid money data, map is weak
            if (rowsChecked > 0 && validRows === 0) return 0;

            return score;
        }

        /**
         * Generate column map from headers
         */
        generateColumnMap(headers) {
            const map = {
                date: -1,
                desc: -1,
                debit: -1,
                credit: -1,
                amount: -1
            };

            headers.forEach((h, i) => {
                // Date column
                if (['date', 'posting', 'effective'].some(k => h.includes(k)) && !h.includes('due')) {
                    if (map.date === -1) map.date = i;
                }
                // Description column
                else if (['description', 'payee', 'merchant', 'narrative', 'memo', 'details', 'particulars'].some(k => h.includes(k))) {
                    if (map.desc === -1) map.desc = i;
                }
                // Debit column
                else if (['debit', 'withdrawal', 'out'].some(k => h === k || (h.includes(k) && !h.includes('card')))) {
                    if (map.debit === -1) map.debit = i;
                }
                // Credit column
                else if (['credit', 'deposit', 'in'].some(k => h === k || (h.includes(k) && !h.includes('card')))) {
                    if (map.credit === -1) map.credit = i;
                }
                // Amount column
                else if (['amount', 'value', 'turnover', 'amt'].some(k => h === k || h.includes(k))) {
                    if (map.amount === -1) map.amount = i;
                }
            });

            return map;
        }

        /**
         * Check if line is garbage (totals, balances, etc.)
         */
        isGarbageLine(line) {
            const lower = line.toLowerCase();

            // Common garbage patterns
            if (lower.includes('opening balance') ||
                lower.includes('closing balance') ||
                lower.includes('total') ||
                lower.includes('page ')) {
                return true;
            }

            // Too few commas = not a data row
            if ((line.match(/,/g) || []).length < 2) {
                return true;
            }

            return false;
        }

        /**
         * Check if value looks like a date
         */
        isLikelyDate(val) {
            if (!val) return false;
            const clean = val.trim();

            // Must contain numbers and separators
            if (!/[0-9]/.test(clean)) return false;
            if (!/[\/\-\.]/.test(clean)) return false;

            return !isNaN(Date.parse(clean));
        }

        /**
         * Check if value looks like money
         */
        isLikelyMoney(val) {
            if (!val) return false;
            const clean = val.replace(/[$,\s()\-]/g, '');
            if (clean === '') return false;

            return !isNaN(parseFloat(clean)) && isFinite(clean);
        }

        /**
         * Map CSV row to transaction object
         */
        mapRowToTransaction(cols, map) {
            const getVal = (idx) => (idx > -1 && idx < cols.length) ? cols[idx] : '';

            const rawDate = getVal(map.date);
            const rawDesc = getVal(map.desc);
            let debit = 0;
            let credit = 0;

            // Handle amount vs debit/credit columns
            if (map.amount > -1 && map.debit === -1 && map.credit === -1) {
                const val = this.cleanCurrency(getVal(map.amount));
                if (val < 0) {
                    debit = Math.abs(val);
                } else {
                    credit = val;
                }
            } else {
                const dVal = this.cleanCurrency(getVal(map.debit));
                const cVal = this.cleanCurrency(getVal(map.credit));
                if (dVal !== 0) debit = Math.abs(dVal);
                if (cVal !== 0) credit = Math.abs(cVal);
            }

            return {
                date: this.parseDate(rawDate),
                description: rawDesc ? rawDesc.replace(/^"|"$/g, '').trim() : '',
                originalDescription: rawDesc || '', // Keep raw text
                debit,
                credit,
                amount: credit - debit, // Net amount (positive = income, negative = expense)
                accountDescription: '',
                reconciled: false
            };
        }

        /**
         * Validate transaction
         */
        isValidTransaction(txn) {
            if (!txn.date) return false;
            if (txn.debit === 0 && txn.credit === 0) return false;

            // Description must be meaningful text, not a number
            if (this.isLikelyMoney(txn.description)) return false;
            if (txn.description.length < 2) return false;

            return true;
        }

        /**
         * Clean currency string to number
         */
        cleanCurrency(val) {
            if (!val) return 0;
            let s = String(val);

            // Handle parentheses as negative
            if (s.includes('(') && s.includes(')')) {
                s = '-' + s.replace(/[()]/g, '');
            }

            return parseFloat(s.replace(/[^0-9.\-]/g, '')) || 0;
        }

        /**
         * Parse date string to ISO format
         */
        parseDate(dateStr) {
            if (!dateStr) return null;
            dateStr = dateStr.trim();

            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return null;

            return d.toISOString().split('T')[0]; // YYYY-MM-DD
        }

        /**
         * Split CSV line handling quotes and commas
         */
        splitCSVLine(text) {
            const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\\s]*(?:\s+[^,'"\\s]+)*))\s*(?:,|$)/g;
            const a = [];

            text.replace(re_value, function (m0, m1, m2, m3) {
                if (m1 !== undefined) a.push(m1.replace(/\\'/g, "'"));
                else if (m2 !== undefined) a.push(m2.replace(/\\"/g, '"'));
                else if (m3 !== undefined) a.push(m3);
                return '';
            });

            if (/,\s*$/.test(text)) a.push('');
            return a;
        }
    }

    // Expose to window
    window.SmartCSV = new SmartCSVParser();
    // console.log('🧠 SmartCSV Parser Initialized (V4 Port)');

})();
