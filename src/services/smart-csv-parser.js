/**
 * SmartCSVParser
 * Universal parser for CSV, Excel, and PDF files.
 * Provides consistent output format for Data Import and Training modules.
 * 
 * Dependencies:
 * - XLSX (SheetJS)
 * - PDF.js (Optional, assumes window.pdfParser handles PDFs if loaded)
 */
window.SmartCSVParser = {
    /**
     * Parse a file (CSV, Excel, PDF) into a standardized transaction list.
     * @param {File} file 
     * @returns {Promise<{data: Array, metadata: Object}>}
     */
    async parse(file) {
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.pdf')) {
            if (window.pdfParser) {
                const pdfResult = await window.pdfParser.parsePDF(file);
                // Standardize PDF result
                return {
                    data: pdfResult.transactions.map(t => this._normalize(t)),
                    metadata: pdfResult.metadata
                };
            } else {
                throw new Error('PDF Parser is not loaded.');
            }
        }

        if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            return await this._parseSheet(file);
        }

        throw new Error('Unsupported file type');
    },

    /**
     * Internal: Parse spreadsheet using SheetJS
     */
    async _parseSheet(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array', cellDates: true });
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

                    // Normalize rows
                    const normalized = json.map(row => this._normalizeFromRaw(row));
                    resolve({ data: normalized, metadata: {} });
                } catch (err) {
                    reject(err);
                }
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    },

    /**
     * Normalize parsed row to standard format
     */
    _normalizeFromRaw(row) {
        // Helper to find key case-insensitively
        const getVal = (keys) => {
            for (const k of keys) {
                // Exact match
                if (row[k] !== undefined) return row[k];
                // Case insensitive scan
                const foundKey = Object.keys(row).find(rk => rk.toLowerCase() === k.toLowerCase());
                if (foundKey) return row[foundKey];
            }
            return null;
        };

        const date = getVal(['Date', 'Posted Date', 'Trans Date']);
        const desc = getVal(['Description', 'Memo', 'Transaction Description', 'Payee']);
        const amount = getVal(['Amount', 'Amt']);
        const debit = getVal(['Debit', 'Withdrawal', 'Out']);
        const credit = getVal(['Credit', 'Deposit', 'In']);
        const category = getVal(['Category', 'Spend Categories', 'Mapped Category']); // Added 'Spend Categories'

        // Determine Amount/Type
        let finalAmount = 0;
        let type = 'debit';

        if (debit) {
            finalAmount = parseFloat(String(debit).replace(/[^0-9.-]/g, ''));
            type = 'debit';
        } else if (credit) {
            finalAmount = parseFloat(String(credit).replace(/[^0-9.-]/g, ''));
            type = 'credit';
        } else if (amount) {
            const raw = parseFloat(String(amount).replace(/[^0-9.-]/g, ''));
            finalAmount = Math.abs(raw);
            type = raw >= 0 ? 'credit' : 'debit'; // Often positive = credit in simple exports, but banks vary.
            // Heuristic: If we don't know, assume negative is debit (money leaving).
            if (raw < 0) {
                finalAmount = Math.abs(raw);
                type = 'debit';
            }
        }

        return {
            Date: date,
            Description: desc,
            Amount: finalAmount,
            Debit: type === 'debit' ? finalAmount : null,
            Credit: type === 'credit' ? finalAmount : null,
            Category: category, // Keep original category for training
            type: type
        };
    },

    _normalize(t) {
        return {
            Date: t.date || t.Date,
            Description: t.description || t.Description,
            Amount: t.amount || t.Amount,
            Category: t.category || t.Category || t['Spend Categories'],
            type: t.type
        };
    }
};
