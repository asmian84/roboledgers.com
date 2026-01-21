/**
 * TD Chequing Parser
 * Regex-based parser for TD Bank Chequing statements
 */
class TDChequingParser extends BaseBankParser {
    constructor() {
        const formatRules = `
TD CHEQUING FORMAT:
- Date: MMM DD (often concatenated like "AUG02")
- Columns: DESCRIPTION | CHEQUE/DEBIT | DEPOSIT/CREDIT | DATE | BALANCE

SMART PARSING RULES:
1. Date location: Often inside the description block or in its own tight column.
2. Polarity: "OD" suffix on balance indicates overdraft.
3. Cleanup: Remove "CHQ#XXXXX-XXXXXXXXXX" and "MSP" codes from descriptions.
4. Merchant Focus: Keep ONLY the merchant name (e.g., "BIG BUCKET CAR").
    `;
        super('TD', 'Chequing', formatRules);
    }

    /**
     * Parse TD Chequing statement using regex
     */
    async parse(statementText) {
        console.log('⚡ TD Chequing: Starting regex-based parsing...');

        const lines = statementText.split('\n');
        const transactions = [];

        // Extract year from statement (usually at top)
        const yearMatch = statementText.match(/20\d{2}/);
        this.currentYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();
        console.log(`[TD] Extracted year: ${this.currentYear}`);

        let currentDate = null;
        let pendingDescription = '';
        let lastMonth = null;

        // Date regex: "JAN 15", "FEB02", etc.
        const dateRegex = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*(\d{1,2})/i;

        console.log(`[TD] Starting parse with ${lines.length} lines, year: ${this.currentYear}`);

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.length < 5) continue;

            // Check if line starts with a date
            const dateMatch = trimmed.match(dateRegex);
            if (dateMatch) {
                const monthName = dateMatch[1];
                const day = dateMatch[2];

                // Year rollover detection
                const monthIndex = this.getMonthIndex(monthName);
                if (lastMonth !== null && monthIndex < lastMonth && monthIndex <= 1) {
                    this.currentYear++;
                    console.log(`[TD] Year rollover detected: ${this.currentYear}`);
                }
                lastMonth = monthIndex;

                currentDate = this.formatDate(day, monthName, this.currentYear);

                // Remove date from line to get description
                const lineAfterDate = trimmed.substring(dateMatch[0].length).trim();

                // Try to extract transaction
                const extracted = this.extractTransaction(lineAfterDate, currentDate);
                if (extracted) {
                    transactions.push(extracted);
                } else if (lineAfterDate) {
                    pendingDescription = lineAfterDate;
                }
            } else if (currentDate) {
                // No date - could be continuation or new transaction for same date
                const extracted = this.extractTransaction(trimmed, currentDate);
                if (extracted) {
                    // Merge pending description if exists
                    if (pendingDescription) {
                        extracted.description = pendingDescription + ' ' + extracted.description;
                        // CRITICAL: Re-clean concatenated description
                        extracted.description = this.cleanTDDescription(extracted.description);
                        pendingDescription = '';
                    }
                    transactions.push(extracted);
                } else {
                    // Accumulate multi-line description
                    if (pendingDescription) {
                        pendingDescription += ' ' + trimmed;
                    } else {
                        pendingDescription = trimmed;
                    }
                }
            }
        }

        console.log(`[TD] Parsing complete. Found ${transactions.length} transactions.`);
        return { transactions };
    }

    /**
     * Extract transaction from line with amounts
     */
    extractTransaction(text, dateStr) {
        if (!text) return null;

        // Pattern: Description | Debit | Credit | Balance
        // Amounts: 1,234.56 or 1234.56
        const amountRegex = /([\d,]+\.\d{2})/g;
        const amounts = [];
        let match;

        while ((match = amountRegex.exec(text)) !== null) {
            amounts.push(parseFloat(match[1].replace(/,/g, '')));
        }

        if (amounts.length === 0) return null;

        // Extract description (everything before first amount)
        const firstAmountIndex = text.search(amountRegex);
        let description = text.substring(0, firstAmountIndex).trim();

        // Clean the description
        description = this.cleanTDDescription(description);

        // Determine amounts based on count
        let debit = 0, credit = 0, balance = 0;

        if (amounts.length >= 3) {
            // Format: Debit | Credit | Balance
            debit = amounts[0];
            credit = amounts[1];
            balance = amounts[2];
        } else if (amounts.length === 2) {
            // Format: Single amount | Balance
            const amt = amounts[0];
            balance = amounts[1];

            // Heuristic: If balance increased, it's a credit
            if (balance > amt) {
                credit = amt;
            } else {
                debit = amt;
            }
        } else {
            // Single amount - assume it's the balance
            balance = amounts[0];
        }

        // Handle OD (overdraft) indicator
        if (text.toUpperCase().includes('OD')) {
            balance = -Math.abs(balance);
        }

        return {
            date: dateStr,
            description: description,
            amount: debit || credit,
            debit: debit,
            credit: credit,
            balance: balance
        };
    }

    /**
     * Clean TD description with prefix matching
     */
    cleanTDDescription(desc) {
        // 1. Normalize whitespace
        desc = desc.replace(/\s+/g, ' ').trim();

        // 2. Remove TD-specific noise
        desc = desc.replace(/CHQ#\d+-\d+/gi, '');  // Cheque numbers
        desc = desc.replace(/\bMSP\b/gi, '');       // MSP codes
        desc = desc.replace(/\b\d{6,}\b/gi, '');    // Long tracking numbers
        desc = desc.replace(/[a-f0-9]{16,}/gi, ''); // Hex codes

        // 3. TD-specific transaction type prefixes
        const typePrefixes = [
            "ONLINE BILL PAYMENT",
            "BILL PAYMENT",
            "INTERAC E-TRANSFER",
            "E-TRANSFER",
            "DIRECT DEPOSIT",
            "ATM WITHDRAWAL",
            "DEBIT CARD PURCHASE",
            "DEBIT PURCHASE",
            "POINT OF SALE",
            "POS PURCHASE",
            "MONTHLY FEE",
            "SERVICE CHARGE",
            "NSF FEE",
            "OVERDRAFT FEE",
            "TRANSFER"
        ];

        // 4. Prefix matching with simple string comparison
        const descUpper = desc.toUpperCase();

        for (const type of typePrefixes) {
            const searchStr = type + ' ';
            if (descUpper.startsWith(searchStr)) {
                // Extract name after prefix
                const name = desc.substring(type.length).trim();
                if (name) {
                    // Format as "Name, Type" for 2-line display
                    const formattedType = type.charAt(0).toUpperCase() + type.slice(1).toLowerCase();
                    desc = `${name}, ${formattedType}`;
                }
                break;
            }
        }

        // 5. Fallback: Split on dash if exists
        if (!desc.includes(',') && desc.includes(' - ')) {
            const parts = desc.split(' - ');
            if (parts.length === 2) {
                desc = `${parts[1].trim()}, ${parts[0].trim()}`;
            }
        }

        // 6. Final cleanup
        desc = desc.replace(/,\s*,/g, ',').trim();
        desc = desc.replace(/^[,\s]+|[,\s]+$/g, '');
        desc = desc.replace(/\s+/g, ' ');

        return desc;
    }

    /**
     * Format date as YYYY-MM-DD
     */
    formatDate(day, monthName, year) {
        const monthIndex = this.getMonthIndex(monthName);
        const month = String(monthIndex + 1).padStart(2, '0');
        const dayPadded = String(day).padStart(2, '0');
        return `${year}-${month}-${dayPadded}`;
    }

    /**
     * Get month index from month name
     */
    getMonthIndex(monthName) {
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        return months.indexOf(monthName.toLowerCase().substring(0, 3));
    }

    /**
     * Determine if transaction is credit (increases balance)
     */
    isCredit(description) {
        const creditKeywords = [
            'deposit', 'credit', 'transfer in', 'refund', 'reversal',
            'interest earned', 'payment received'
        ];

        const descLower = description.toLowerCase();
        return creditKeywords.some(kw => descLower.includes(kw));
    }
}

// Expose to window for file:// compatibility
window.TDChequingParser = TDChequingParser;
window.tdChequingParser = new TDChequingParser();
