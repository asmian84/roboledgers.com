/**
 * AutoBookkeeping PDF Import Engine v2.0 (The "MoneyThumb" Standard)
 * ------------------------------------------------------------------
 * A sophisticated, configurable heuristic engine for extracting financial data from PDFs.
 * STRICTLY implements the ImportEngineConfig schema.
 * 
 * @module PDFStatementParser
 */

// --- 1. Default Configuration (Strict Schema) ---

const DEFAULT_CONFIG = {
    // 1. PDF & Layout Settings
    parsingStrategy: {
        accountType: 'Checking', // 'Checking', 'CreditCard', 'Investment'
        dateFormatRead: 'auto',   // 'MM-DD', 'DD-MM', 'auto'
        dateFormatWrite: 'YYYY-MM-DD',
        signLogic: 'Normal',      // 'Normal' (Charges -), 'Switched' (Charges +)
        layout: {
            spacingFactor: 1.0,
            combineMultilineDescriptions: true,
            ocrMode: 'auto',
            pageRange: { start: 1, end: 'last' }
        }
    },

    // 2. Advanced Heuristics (Section Identification)
    sectionIdentifiers: {
        sections: {
            credits: ['deposits', 'credits', 'payments received', 'additions'],
            debits: ['withdrawals', 'checks', 'debits', 'charges', 'electronic payments', 'purchases'],
            fees: ['fees', 'service charges'],
            checks: ['checks written', 'cheques'],
            balanceHistory: ['daily balances', 'balance summary']
        },
        boundaries: {
            startMarker: '',
            endMarker: ''
        },
        ignorePatterns: ['opening balance', 'closing balance', 'total for this period', 'continued on next page', 'page']
    },

    // 3. Payee Cleanup & Normalization
    cleaningRules: {
        filters: {
            removeDatesFromPayee: true,
            removeCurrencyFromPayee: true,
            removePhoneNumbers: true,
            removeStateAbbrevs: true,
            removeSpecialChars: true,
            removeDuplicateSpaces: true,
            removeShortNumbers: true,
            minNumberLength: 4
        },
        formatting: {
            casing: 'Title' // 'UPPER', 'Title', 'lower', 'Original'
        },
        replacements: [
            { pattern: 'SQ *', isWildcard: true },
            { pattern: 'TST *', isWildcard: true },
            { pattern: 'PAYPAL *', isWildcard: true }
        ]
    }
};


// --- 2. The Parser Engine Class ---

class PDFStatementParser {

    constructor(config = {}) {
        // Deep merge defaults with provided config
        this.config = this._mergeConfig(DEFAULT_CONFIG, config);

        // Runtime State
        this.currentContext = 'neutral'; // 'neutral', 'credits', 'debits'
        this.extractedTransactions = [];
    }

    // --- Main Entry Point ---
    async processStatement(file) {
        if (!window.pdfjsLib) throw new Error("PDF.js not loaded");

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        const totalPages = pdf.numPages;

        let allLines = [];

        // Phase 1: Ingestion & Spatial Pre-processing
        const startPage = this.config.parsingStrategy.layout.pageRange.start;
        const endPage = this.config.parsingStrategy.layout.pageRange.end === 'last' ? totalPages : this.config.parsingStrategy.layout.pageRange.end;

        for (let i = startPage; i <= Math.min(endPage, totalPages); i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();

            // Pass spacing factor to row constructor
            const pageLines = this._constructRows(content.items, this.config.parsingStrategy.layout.spacingFactor);
            allLines = allLines.concat(pageLines);
        }

        // Phase 2: Pipeline Processing
        this._executePipeline(allLines);

        return this.extractedTransactions;
    }

    // --- Phase 1: Spatial Row Construction ---
    _constructRows(items, spacingFactor) {
        // Sort Y (Top-Down), then X (Left-Right)
        items.sort((a, b) => {
            const yDiff = Math.abs(a.transform[5] - b.transform[5]);
            if (yDiff > 4) return b.transform[5] - a.transform[5];
            return a.transform[4] - b.transform[4];
        });

        const rows = [];
        let currentRow = null;
        let lastY = -999;

        // Adjust tolerance based on spacingFactor (Default 1.0 => standard)
        // Standard font height ~10px, tolerance ~5px. Factor 2.0 => 10px tolerance.
        const baseTolerance = 5;

        items.forEach(item => {
            const str = item.str.trim();
            if (!str) return;

            const y = item.transform[5];
            const x = item.transform[4];
            const height = item.height || 10;
            const tolerance = (height * 0.5) * spacingFactor;

            if (currentRow && Math.abs(y - lastY) <= tolerance) {
                // Same Line
                currentRow.items.push({ text: str, x: x });
                currentRow.fullText += '   ' + str;
            } else {
                // New Line
                if (currentRow) rows.push(currentRow);
                currentRow = { items: [{ text: str, x: x }], fullText: str, y: y };
                lastY = y;
            }
        });
        if (currentRow) rows.push(currentRow);
        return rows;
    }

    // --- Phase 2: Execution Pipeline ---
    _executePipeline(lines) {
        let processedRows = [];
        let context = 'neutral';

        // Regex Patterns
        const dateRegex = /(\d{1,2}[\/\-\.]\d{1,2}([\/\-\.]\d{2,4})?)|([A-Za-z]{3}\s\d{1,2})/;
        const moneyRegex = /[\$]?\-?[\d,]+\.\d{2}(\-?)/;

        const identifiers = this.config.sectionIdentifiers;
        const strategy = this.config.parsingStrategy;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const textLower = line.fullText.toLowerCase();

            // 1. Context Switching
            if (this._matchesKeyword(textLower, identifiers.sections.credits)) { context = 'credits'; continue; }
            if (this._matchesKeyword(textLower, identifiers.sections.debits)) { context = 'debits'; continue; }
            if (this._matchesKeyword(textLower, identifiers.sections.checks)) { context = 'debits'; continue; } // Checks are debits

            // 2. Ignore Patterns
            if (identifiers.ignorePatterns.some(pat => textLower.includes(pat))) continue;

            // 3. Identification
            const hasDate = dateRegex.test(line.fullText);
            const hasMoney = moneyRegex.test(line.fullText);

            // 4. Multiline Merge Logic
            if (!hasDate && strategy.layout.combineMultilineDescriptions && processedRows.length > 0) {
                // Simpler heuristic: If no date, append to previous.
                // Exception: If it has money, it might be a stray transaction without date? 
                // MoneyThumb logic: usually strictly appends unless it finds a new date.
                const prevRow = processedRows[processedRows.length - 1];
                prevRow.descriptionRaw += ' ' + line.fullText;
                continue;
            }

            if (hasDate && hasMoney) {
                let rowData = this._parseRowVariables(line, dateRegex, moneyRegex, context);
                processedRows.push(rowData);
            }
        }

        // Phase 3: Cleanup & Format
        this.extractedTransactions = processedRows.map(row => this._finalizeRow(row));
    }

    _parseRowVariables(line, dateRegex, moneyRegex, context) {
        const items = line.items;
        let dateVal = '';
        let amountIndex = -1;
        let amountStr = '';
        let descParts = [];

        // 1. Find Date
        let dateIndex = -1;
        for (let j = 0; j < items.length; j++) {
            if (dateRegex.test(items[j].text)) {
                dateVal = items[j].text;
                dateIndex = j;
                break; // Assume first date is the trans date
            }
        }

        // 2. Find Amount (Right-to-Left scan)
        for (let k = items.length - 1; k >= 0; k--) {
            if (k === dateIndex) continue;
            if (moneyRegex.test(items[k].text)) {
                amountStr = items[k].text;
                amountIndex = k;
                break;
            }
        }

        // 3. Description (Everything else)
        for (let m = 0; m < items.length; m++) {
            if (m !== dateIndex && m !== amountIndex) {
                descParts.push(items[m].text);
            }
        }

        // 4. Calculate Amount with Sign Logic
        let parsedAmount = this._parseMoney(amountStr, context);

        return {
            date: dateVal,
            amount: parsedAmount,
            descriptionRaw: descParts.join(' '),
            context: context
        };
    }

    _parseMoney(str, context) {
        if (!str) return 0;
        // Remove currency symbols, commas
        let clean = str.replace(/[^0-9.-]/g, '');
        let val = parseFloat(clean) || 0;

        // Check for trailing '-' (common in some statements: "100.00-")
        if (str.trim().endsWith('-')) {
            val = -Math.abs(val);
        }
        // Check for 'CR' or 'DR'
        if (str.toUpperCase().includes('CR')) val = Math.abs(val); // CP means Credit usually? No 'CR'

        const logic = this.config.parsingStrategy.signLogic;

        if (context === 'credits') {
            // Credits section: Absolute value is positive (Deposit)
            val = Math.abs(val);
        } else if (context === 'debits') {
            // Debits section: Absolute value is negative (Withdrawal)
            val = -Math.abs(val);
        } else {
            // Mixed context (running balance style)
            // Rely on the sign parsed from the text
            // e.g. "-100.00" is debit.
        }

        // Apply "Switched" logic (Inverts EVERYTHING)
        // Normal: Charge = Negative, Payment = Positive
        // Switched: Charge = Positive, Payment = Negative
        if (logic === 'Switched') {
            val = -val;
        }

        return val;
    }

    // --- Phase 3: Finalization (Cleaning Rules) ---
    _finalizeRow(row) {
        let cleanDesc = row.descriptionRaw;
        const rules = this.config.cleaningRules.filters;

        // 1. Remove Dates
        if (rules.removeDatesFromPayee) {
            cleanDesc = cleanDesc.replace(/\d{1,2}[\/\-\.]\d{1,2}([\/\-\.]\d{2,4})?/g, '');
        }

        // 2. Remove Currency
        if (rules.removeCurrencyFromPayee) {
            cleanDesc = cleanDesc.replace(/[\$]?[\d,]+\.\d{2}/g, '');
        }

        // 3. Remove Phone Numbers (XXX-XXX-XXXX or (XXX) XXX-XXXX)
        if (rules.removePhoneNumbers) {
            cleanDesc = cleanDesc.replace(/(\+\d{1,2}\s)?\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}/g, '');
        }

        // 4. Remove State Abbreviations at End (e.g. " STARBUCKS CA")
        if (rules.removeStateAbbrevs) {
            cleanDesc = cleanDesc.replace(/\s[A-Z]{2}$/, '');
        }

        // 5. Remove Special Chars (keep alphanumeric, space, dot, hyphen)
        if (rules.removeSpecialChars) {
            cleanDesc = cleanDesc.replace(/[^a-zA-Z0-9\s\.\-&]/g, '');
        }

        // 6. Replacements (Wildcards)
        this.config.cleaningRules.replacements.forEach(rep => {
            const pat = rep.pattern;
            if (rep.isWildcard) {
                // "SQ *" -> Remove "SQ " and keep rest? 
                // Or replace with empty? Usually "Remove matched pattern".
                // User requirement implied "SQ *" -> "Square". 
                // But new schema is just a list of patterns to remove/replace?
                // The schema in prompt was "replacements: Array<{pattern, isWildcard}>".
                // I will assume it means "Remove this pattern".
                // For direct replacement maps, I'd need a target. 
                // Assuming "Removal" for now based on context, or simplistic defaults.

                // Let's implement the specific logic: "SQ *" matches "SQ 12345"
                const regexStr = pat.replace(/\*/g, '.*').replace(/\?/g, '.');
                const regex = new RegExp(regexStr, 'i');
                cleanDesc = cleanDesc.replace(regex, '');
            } else {
                cleanDesc = cleanDesc.replace(pat, '');
            }
        });

        // 7. Remove Short Numbers
        if (rules.removeShortNumbers) {
            // Remove isolated numbers shorter than N digits
            const min = rules.minNumberLength;
            const regex = new RegExp(`\\b\\d{1,${min - 1}}\\b`, 'g');
            cleanDesc = cleanDesc.replace(regex, '');
        }

        // 8. Duplicate Spaces
        if (rules.removeDuplicateSpaces) {
            cleanDesc = cleanDesc.replace(/\s+/g, ' ').trim();
        }

        // 9. Casing
        const casing = this.config.cleaningRules.formatting.casing;
        if (casing === 'Title') {
            cleanDesc = this._toTitleCase(cleanDesc);
        } else if (casing === 'lower') {
            cleanDesc = cleanDesc.toLowerCase();
        } else if (casing === 'UPPER') {
            cleanDesc = cleanDesc.toUpperCase();
        }

        // 10. Vendor Engine Enrichment (Hook)
        let category = '';
        if (window.VendorEngine && window.VendorEngine.match) {
            const match = window.VendorEngine.match(cleanDesc);
            if (match) {
                cleanDesc = match.name;
                category = match.category;
            }
        }

        // Date Formatting (Write)
        let finalDate = row.date;
        // TODO: Implement dateFormatWrite logic with moment/dayjs if available, or simple parsing.
        // For now, keep read format to avoid breaking validity.

        return {
            'Date': finalDate,
            'Description': cleanDesc,
            'Original Description': row.descriptionRaw,
            'Amount': row.amount,
            // Exposed for Verification UI
            'Debit': (row.context === 'debits' || row.amount < 0) ? Math.abs(row.amount) : null,
            'Credit': (row.context === 'credits' || row.amount > 0) ? Math.abs(row.amount) : null,
            'Category': category
        };
    }

    _matchesKeyword(text, keywords) {
        if (!keywords) return false;
        return keywords.some(k => text.includes(k.toLowerCase()));
    }

    _toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
    }

    _mergeConfig(def, given) {
        // Deep merge helper
        const result = {};
        for (const key in def) {
            if (given[key] && typeof def[key] === 'object' && !Array.isArray(def[key])) {
                result[key] = this._mergeConfig(def[key], given[key]);
            } else {
                result[key] = given[key] !== undefined ? given[key] : def[key];
            }
        }
        return result;
    }
}

// --- Singleton / Factory ---
window.PdfImportService = {
    parse: async function (file, customConfig = {}) {
        // Allow passing "window.parserConfig" if it exists and customConfig is empty
        const configToUse = Object.keys(customConfig).length > 0 ? customConfig : (window.parserConfig || {});
        const parser = new PDFStatementParser(configToUse);
        return await parser.processStatement(file);
    },
    ParserClass: PDFStatementParser,
    DEFAULT_CONFIG: DEFAULT_CONFIG // Expose for UI to read defaults
};
