/**
 * PDF Import Service (Advanced)
 * "MoneyThumb-Lite" Logic: Visual Layout Analysis + Heuristic Data Extraction.
 * 
 * Features:
 * - Layout Detection: Scans page for header keywords to map column X-coordinates.
 * - Spatial Bucketing: Assigns text to fields based on nearest header alignment.
 * - Merge Logic: Combines Debit/Credit columns into signed Amount.
 * - Vendor Enrichment: Uses VendorEngine to clean descriptions and auto-categorize.
 */

window.PdfImportService = {

    /**
     * Parse a PDF file and return tabular transaction data
     * @param {File} file - The PDF file object
     * @returns {Promise<Array>} - Array of transaction objects
     */
    parse: async function (file) {
        if (!window.pdfjsLib) {
            throw new Error('PDF.js library not loaded. Please allow CDN scripts.');
        }

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;

        let allTransactions = [];

        // Iterate through all pages
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();

                // 1. Group Items by visual Row (Y-coordinate clustering)
                const rows = this._groupTextByRows(textContent.items);

                // 2. Analyze Layout & Extract
                const pageTransactions = this._extractTransactionsFromRows(rows);
                allTransactions = allTransactions.concat(pageTransactions);
            } catch (e) {
                console.warn(`Error parsing page ${i}:`, e);
            }
        }

        return allTransactions;
    },

    /**
     * Groups text items into rows based on Y-coordinate proximity.
     * PDF coordinates: (0,0) is usually bottom-left. 
     * transform[5] is Y. transform[4] is X.
     */
    _groupTextByRows: function (items) {
        // 1. Sort by Y (Top-to-Bottom = Descending Y), then X (Left-to-Right = Ascending X)
        items.sort((a, b) => {
            const yA = a.transform[5];
            const yB = b.transform[5];
            // Threshold for "Same Line" = 4px (handles minor font baseline shifts)
            if (Math.abs(yA - yB) > 4) {
                return yB - yA;
            }
            return a.transform[4] - b.transform[4];
        });

        // 2. Cluster into Row Objects
        const rows = [];
        let currentRow = null;
        let currentY = -9999;

        items.forEach(item => {
            const str = item.str.trim();
            if (!str) return; // Skip empty whitespace chunks

            const y = item.transform[5];

            // If within threshold, add to current row
            if (currentRow && Math.abs(y - currentY) <= 4) {
                currentRow.items.push(item);
            } else {
                // Start new row
                if (currentRow) rows.push(currentRow);
                currentRow = { items: [item], y: y };
                currentY = y;
            }
        });
        if (currentRow) rows.push(currentRow);

        // 3. Reconstruct Text for pattern matching
        rows.forEach(row => {
            // Join with triple-space to simulate visual separation
            row.text = row.items.map(i => i.str).join('   ');
            // Also keep raw array for column mapping
            row.columns = row.items.map(i => i.str.trim());
        });

        return rows;
    },

    /**
     * Heuristic Extraction Engine
     */
    _extractTransactionsFromRows: function (rows) {
        const transactions = [];

        // --- STEP A: DETECT LAYOUT ---
        // Scan for a "Header Row" to learn where columns are.
        let layout = this._detectLayout(rows);

        console.log('PDF Layout Detected:', layout ? layout.headers : 'Fallback Mode');

        // Regex helpers
        const dateRegex = /(\d{1,2}[\/\-\.\s]\d{1,2}[\/\-\.\s]\d{2,4})|([A-Za-z]{3}\s\d{1,2},?\s\d{4})|(\d{1,2}\s[A-Za-z]{3})/;

        // Fallback Logic (if no headers found)
        if (!layout) {
            return this._fallbackExtraction(rows);
        }

        // --- STEP B: EXTRACTION USING LAYOUT ---
        rows.forEach(row => {
            if (row.isHeader || this._isGarbage(row.text)) return;

            let rowData = {
                date: '',
                descChunks: [],
                debit: null,
                credit: null,
                amount: null
            };

            // Bucket items into fields based on X-coordinate
            row.items.forEach(item => {
                const x = item.transform[4]; // X position
                const text = item.str.trim();

                if (!text) return;

                const columnType = this._getClosestColumn(x, layout.headers);

                if (columnType === 'date') rowData.date += text + ' ';
                else if (columnType === 'desc') rowData.descChunks.push(text);
                else if (columnType === 'debit') rowData.debit = this._parseMoney(text);
                else if (columnType === 'credit') rowData.credit = this._parseMoney(text);
                else if (columnType === 'amount') rowData.amount = this._parseMoney(text);
            });

            // --- STEP C: FINALIZE ROW ---

            // 1. Check Validity (Must have Date)
            let finalDate = rowData.date.trim();
            if (!dateRegex.test(finalDate)) {
                // Advanced: Could be a multi-line description continuation?
                // For now, robustly skip non-transaction lines.
                return;
            }

            // 2. Resolve Amount
            let finalAmount = 0;
            if (rowData.amount !== null) {
                // Single amount column (often signed, or needs heuristic)
                finalAmount = rowData.amount;
                // Heuristic: If "Credit/Deposit" keyword in desc? 
                // Usually banks use signs.
            } else {
                // Split columns: Credit - Debit
                const cr = rowData.credit || 0;
                const dr = rowData.debit || 0;

                // If line has date but no money, likely reference info. Skip.
                if (rowData.credit === null && rowData.debit === null) return;

                finalAmount = cr - dr;
                // e.g. Credit $100 (In) - Debit $0 = 100
                // e.g. Credit $0 - Debit $50 (Out) = -50
            }

            // 3. Construct Description
            let finalDesc = rowData.descChunks.join(' ');
            let originalDesc = finalDesc;

            // 4. Enrich (Data Dictionary)
            let category = '';
            if (window.VendorEngine && window.VendorEngine.match) {
                const match = window.VendorEngine.match(finalDesc);
                if (match) {
                    finalDesc = match.name;
                    category = match.category;
                }
            }

            // Push Result
            transactions.push({
                'Date': finalDate,
                'Description': finalDesc,
                'Original Description': originalDesc,
                'Amount': finalAmount,
                'Category': category || ''
            });
        });

        return transactions;
    },

    /**
     * Scan rows for common Bank Statement Headers
     */
    _detectLayout: function (rows) {
        const SCORES = {
            'date': 5,
            'amount': 5,
            'balance': 1,
            'debit': 5,
            'credit': 5,
            'description': 3,
            'particulars': 3,
            'details': 3,
            'cheque': 4,
            'withdraw': 4,
            'deposit': 4
        };

        let bestRow = null;
        let maxScore = 0;
        let bestMap = null; // { date: x, desc: x, ... }

        rows.forEach(row => {
            let score = 0;
            // Temporary map for THIS row
            let map = {};

            row.items.forEach(item => {
                const txt = item.str.toLowerCase().replace(/[^a-z]/g, ''); // strict header check
                const x = item.transform[4];

                // Header Keyword Matching
                if (txt === 'date' || txt === 'postingdate') { map.date = x; score += SCORES.date; }
                else if (txt.includes('desc') || txt.includes('particular') || txt.includes('detail')) { map.desc = x; score += SCORES.description; }
                else if (txt.includes('debit') || txt.includes('withdraw') || txt === 'dr' || txt.includes('cheque')) { map.debit = x; score += SCORES.debit; }
                else if (txt.includes('credit') || txt.includes('deposit') || txt === 'cr') { map.credit = x; score += SCORES.credit; }
                else if (txt === 'amount' || txt === 'amt') { map.amount = x; score += SCORES.amount; }
            });

            if (score > maxScore) {
                maxScore = score;
                bestRow = row;
                bestMap = map;
            }
        });

        // Threshold: Must recognize at least "Date" and "Amount" or "Debit/Credit"
        // Score > 8 implies 2+ strong matches
        if (maxScore >= 8 && bestRow) {
            bestRow.isHeader = true; // Mark to skip processing this row

            // Format into list for Nearest Neighbor
            const headers = [];
            Object.keys(bestMap).forEach(key => {
                headers.push({ type: key, x: bestMap[key] });
            });
            headers.sort((a, b) => a.x - b.x);

            return { headers: headers };
        }
        return null;
    },

    /**
     * Nearest Neighbor Logic
     * Returns the 'type' of the column header closest to itemX
     */
    _getClosestColumn: function (itemX, headerList) {
        if (!headerList || headerList.length === 0) return null;

        let minDiff = Infinity;
        let closestType = null;

        headerList.forEach(h => {
            const diff = Math.abs(itemX - h.x);
            if (diff < minDiff) {
                minDiff = diff;
                closestType = h.type;
            }
        });

        // Threshold: If item is SUPER far from any column (e.g. > 200px?), maybe ignore?
        // For now, assume strict columnar layout.
        return closestType;
    },

    _parseMoney: function (str) {
        if (!str) return 0;
        // Remove known non-numeric chars but keep Dot and Minus
        let clean = str.replace(/[^0-9.-]/g, '');
        return parseFloat(clean) || 0;
    },

    _isGarbage: function (text) {
        const t = text.toLowerCase();
        return t.includes('opening balance') || t.includes('total ') || t.includes('closing balance') || t.includes('forward') || t.includes('page ') || t.trim().length < 3;
    },

    /**
     * Fallback to "Left=Date, Right=Money" for non-standard PDFs
     */
    _fallbackExtraction: function (rows) {
        const transactions = [];
        const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})|([A-Za-z]{3}\s\d{1,2},?\s\d{4})/;
        const moneyRegex = /[\$]?\-?[\d,]+\.\d{2}(\-?)/;

        rows.forEach(row => {
            const fullText = row.text;
            const dateMatch = fullText.match(dateRegex);
            const moneyMatches = fullText.match(moneyRegex);

            if (dateMatch && moneyMatches && !this._isGarbage(fullText)) {
                // Simple logic: First date, Last money
                const props = row.items.filter(i => i.str.trim().length > 0);

                // Find Date Index
                const dateIdx = props.findIndex(i => dateRegex.test(i.str));
                if (dateIdx === -1) return;

                // Find Money Index (Last one usually)
                let moneyIdx = -1;
                for (let k = props.length - 1; k > dateIdx; k--) {
                    if (moneyRegex.test(props[k].str)) {
                        moneyIdx = k;
                        break;
                    }
                }
                if (moneyIdx === -1) return;

                const dateStr = props[dateIdx].str;
                const amtStr = props[moneyIdx].str;

                // Desc is in between
                const descParts = props.slice(dateIdx + 1, moneyIdx).map(i => i.str);
                let desc = descParts.join(' ');

                let amount = this._parseMoney(amtStr);
                if (amtStr.toLowerCase().includes('cr')) amount = -amount; // Heuristic invert

                transactions.push({
                    'Date': dateStr,
                    'Description': desc,
                    'Original Description': desc,
                    'Amount': amount,
                    'Category': ''
                });
            }
        });
        return transactions;
    }

};
