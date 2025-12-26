/**
 * Smart CSV Parser 3.0 (Paranoid Mode)
 * "Eyes Open" Import: Scans, Validates, and Rejects bad maps before processing.
 */

window.SmartCSV = {

    parse(rawText) {
        console.log('🧠 SmartCSV 3.0: Starting paranoid analysis...');

        const allLines = rawText.split(/\r\n|\n|\r/).map(l => l.trim()).filter(l => l);
        if (allLines.length === 0) throw new Error("File is empty");

        // Phase 1: Header Hunter with STRICT Validation
        const { headerRowIndex, headerMap } = this.findHeaderRow(allLines);

        if (headerRowIndex === -1) {
            throw new Error("CSV Parsing Failed: Could not identify valid columns. Please ensure your CSV has 'Date', 'Description', and 'Amount' headers.");
        }

        console.log(`🎯 Validated Header at row ${headerRowIndex + 1}:`, allLines[headerRowIndex]);
        console.log('🗺️ Strict Column Mapping:', headerMap);

        // Phase 2: Extraction (only if map is trusted)
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

            // STRICT ROW VALIDATION
            if (this.isValidTransaction(txn)) {
                transactions.push(txn);
            } else {
                // If a row is invalid, we skip it. 
                // But if TOO many are invalid, the map might be wrong? 
                // (We rely on Phase 1 validation to prevent this, this loop just cleans edge cases)
            }
        }

        if (transactions.length === 0) {
            throw new Error("No valid transactions found. The file format might be incompatible.");
        }

        console.log(`✅ Extracted ${transactions.length} valid transactions. Skipped ${garbageCount} garbage lines.`);
        return transactions;
    },

    findHeaderRow(lines) {
        const KEYWORDS = ['date', 'time', 'description', 'payee', 'merchant', 'debit', 'withdrawal', 'credit', 'deposit', 'amount', 'balance', 'reference', 'ref'];

        let bestScore = -Infinity;
        let bestIndex = -1;
        let bestMap = null;

        const scanLimit = Math.min(lines.length, 30); // Scan deeper

        for (let i = 0; i < scanLimit; i++) {
            const cols = this.splitCSVLine(lines[i]);
            if (cols.length < 2) continue;

            // 1. Keyword Score
            const lowerCols = cols.map(c => c.toLowerCase().trim());
            let keywordMatches = 0;
            KEYWORDS.forEach(k => {
                if (lowerCols.some(c => c === k || c.includes(k))) keywordMatches++;
            });

            if (keywordMatches < 1) continue;

            // 2. Map Generation
            const map = this.generateColumnMap(lowerCols);

            // 3. PARANOID MAP VALIDATION (The "Appropiation" Scan)
            // We test this specific map against the next 5 rows of data.
            // If the data doesn't match the map types, this header candidate is REJECTED.
            const validationScore = this.validateMapAgainstData(map, lines, i + 1);

            if (validationScore === -1) {
                // Map failed validation (e.g. Description column contained numbers)
                continue;
            }

            const totalScore = keywordMatches + validationScore;

            if (totalScore > bestScore) {
                bestScore = totalScore;
                bestIndex = i;
                bestMap = map;
            }
        }

        if (bestScore <= 0) return { headerRowIndex: -1, headerMap: null };

        return { headerRowIndex: bestIndex, headerMap: bestMap };
    },

    /**
     * Scans a slice of data rows to verify if they match the proposed map.
     * Returns a positive score if good, -1 if FATAL mismatch.
     */
    validateMapAgainstData(map, lines, startIdx) {
        let score = 0;
        let rowsCheck = 0;
        let validRows = 0;

        for (let j = 0; j < 5; j++) {
            if (startIdx + j >= lines.length) break;
            const line = lines[startIdx + j];
            if (this.isGarbageLine(line)) continue;

            const cols = this.splitCSVLine(line);
            if (cols.length < 2) continue;

            rowsCheck++;

            // TEST 1: DATE COLUMN
            if (map.date > -1 && cols[map.date]) {
                if (this.isLikelyDate(cols[map.date])) {
                    score += 2;
                } else {
                    // If mapped "Date" is NOT a date, this map is trash.
                    // Only forgive if it's empty
                    if (cols[map.date].trim() !== "") return -1;
                }
            }

            // TEST 2: DESCRIPTION COLUMN
            // Description should NOT be a number (like "-10.14")
            if (map.desc > -1 && cols[map.desc]) {
                const val = cols[map.desc].trim();
                if (this.isLikelyMoney(val) && val.length < 15) {
                    // If "Description" looks like a number, Reject.
                    return -1;
                }
                score += 1;
            }

            // TEST 3: AMOUNT/DEBIT/CREDIT
            const moneyIdx = map.amount > -1 ? map.amount : (map.debit > -1 ? map.debit : map.credit);
            if (moneyIdx > -1 && cols[moneyIdx]) {
                if (this.isLikelyMoney(cols[moneyIdx])) {
                    score += 2;
                    validRows++;
                }
            }
        }

        // If we checked rows but found NO valid money data, map is weak
        if (rowsCheck > 0 && validRows === 0) return 0; // penalize but don't kill (maybe 0 value rows?)

        return score;
    },

    generateColumnMap(headers) {
        const map = { date: -1, desc: -1, debit: -1, credit: -1, amount: -1 };

        headers.forEach((h, i) => {
            if (['date', 'posting', 'effective'].some(k => h.includes(k)) && !h.includes('due')) {
                if (map.date === -1) map.date = i;
            }
            else if (['description', 'payee', 'merchant', 'narrative', 'memo', 'details', 'particulars'].some(k => h.includes(k))) {
                if (map.desc === -1) map.desc = i;
            }
            else if (['debit', 'withdrawal', 'out'].some(k => h === k || (h.includes(k) && !h.includes('card')))) {
                if (map.debit === -1) map.debit = i;
            }
            else if (['credit', 'deposit', 'in'].some(k => h === k || (h.includes(k) && !h.includes('card')))) {
                if (map.credit === -1) map.credit = i;
            }
            else if (['amount', 'value', 'turnover', 'amt'].some(k => h === k || h.includes(k))) {
                if (map.amount === -1) map.amount = i;
            }
        });
        return map;
    },

    isGarbageLine(line) {
        const lower = line.toLowerCase();
        if (lower.includes('opening balance') || lower.includes('closing balance') || lower.includes('total') || lower.includes('page ')) return true;
        // If line structure is too simple (no commas), it's garbage
        if ((line.match(/,/g) || []).length < 2) return true;
        return false;
    },

    isLikelyDate(val) {
        if (!val) return false;
        const clean = val.trim();
        // Must contain numbers and separators
        if (!/[0-9]/.test(clean)) return false;
        if (!/[\/\-\.]/.test(clean)) return false;
        return !isNaN(Date.parse(clean));
    },

    isLikelyMoney(val) {
        if (!val) return false;
        const clean = val.replace(/[$,\s()\-]/g, '');
        if (clean === '') return false;
        // Must be numeric
        return !isNaN(parseFloat(clean)) && isFinite(clean);
    },

    mapRowToTransaction(cols, map) {
        const getVal = (idx) => (idx > -1 && idx < cols.length) ? cols[idx] : '';

        const rawDate = getVal(map.date);
        const rawDesc = getVal(map.desc);
        let debit = 0;
        let credit = 0;

        if (map.amount > -1 && map.debit === -1 && map.credit === -1) {
            const val = this.cleanCurrency(getVal(map.amount));
            if (val < 0) debit = Math.abs(val);
            else credit = val;
        } else {
            const dVal = this.cleanCurrency(getVal(map.debit));
            const cVal = this.cleanCurrency(getVal(map.credit));
            if (dVal !== 0) debit = Math.abs(dVal);
            if (cVal !== 0) credit = Math.abs(cVal);
        }

        return {
            date: this.parseDate(rawDate),
            description: rawDesc ? rawDesc.replace(/^"|"$/g, '').trim() : '',
            debit,
            credit,
            accountDescription: '',
            reconciled: false
        };
    },

    isValidTransaction(txn) {
        if (!txn.date) return false;
        if (txn.debit === 0 && txn.credit === 0) return false;
        // Description must be meaningful text, not just a number (double check)
        if (this.isLikelyMoney(txn.description)) return false;
        if (txn.description.length < 2) return false;
        return true;
    },

    cleanCurrency(val) {
        if (!val) return 0;
        let s = String(val);
        if (s.includes('(') && s.includes(')')) s = '-' + s.replace(/[()]/g, '');
        return parseFloat(s.replace(/[^0-9.\-]/g, '')) || 0;
    },

    parseDate(dateStr) {
        if (!dateStr) return null;
        dateStr = dateStr.trim();
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return null;
        return d.toISOString().split('T')[0];
    },

    splitCSVLine(text) {
        const re_value = /(?!\s*$)\s*(?:'([^'\\]*(?:\\[\S\s][^'\\]*)*)'|"([^"\\]*(?:\\[\S\s][^"\\]*)*)"|([^,'"\s\\]*(?:\s+[^,'"\s\\]+)*))\s*(?:,|$)/g;
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
};
