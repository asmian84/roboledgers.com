/**
 * TD Visa Parser
 * Regex-based parser for TD Visa credit card statements
 */
class TDVisaParser extends BaseBankParser {
    constructor() {
        const formatRules = `
TD VISA FORMAT:
- Date format: MMM DD (e.g., JAN 05, FEB 15)
- Credit card: Debit = charges (increase balance), Credit = payments (decrease balance)
- Common transactions: PAYMENT THANK YOU, PURCHASE, CASH ADVANCE, INTEREST CHARGE
    `;
        super('TD', 'Visa', formatRules);
    }

    /**
     * Parse TD Visa statement using regex
     */
    async parse(statementText) {
        console.log('⚡ TD Visa: Starting regex-based parsing...');

        const lines = statementText.split('\n');
        const transactions = [];

        // Extract year
        const yearMatch = statementText.match(/20\d{2}/);
        const currentYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

        const dateRegex = /^(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s+(\d{1,2})/i;
        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.match(/Opening|Balance|Page \d/i)) continue;

            const dateMatch = trimmed.match(dateRegex);
            if (!dateMatch) continue;

            const isoDate = `${currentYear}-${monthMap[dateMatch[1].toLowerCase()]}-${dateMatch[2].padStart(2, '0')}`;
            const remainder = trimmed.substring(dateMatch[0].length).trim();

            // Find amounts
            const amounts = remainder.match(/([\d,]+\.\d{2})/g);
            if (!amounts || amounts.length < 1) continue;

            // Extract description
            const firstAmtIdx = remainder.search(/[\d,]+\.\d{2}/);
            let description = remainder.substring(0, firstAmtIdx).trim();
            if (!description) continue;

            // Apply prefix matching for 2-line display
            description = this.cleanCreditDescription(description, [
                "PAYMENT THANK YOU", "PURCHASE", "CASH ADVANCE",
                "INTEREST CHARGE", "ANNUAL FEE", "FOREIGN TRANSACTION FEE"
            ]);

            const amount = parseFloat(amounts[0].replace(/,/g, ''));
            const balance = amounts.length > 1 ? parseFloat(amounts[amounts.length - 1].replace(/,/g, '')) : 0;

            // Credit card: payment/credit keywords = credit
            const isPayment = /payment|credit|refund/i.test(description);

            transactions.push({
                date: isoDate,
                description,
                amount,
                debit: isPayment ? 0 : amount,
                credit: isPayment ? amount : 0,
                balance
            });
        }

        console.log(`[TD-VISA] Parsed ${transactions.length} transactions`);
        return { transactions };
    }

    cleanCreditDescription(desc, prefixes) {
        desc = desc.replace(/\s+/g, ' ').trim();
        desc = desc.replace(/\b\d{6,}\b/gi, '');

        const descUpper = desc.toUpperCase();
        for (const type of prefixes) {
            if (descUpper.startsWith(type + ' ')) {
                const name = desc.substring(type.length).trim();
                if (name) {
                    desc = `${name}, ${type.charAt(0) + type.slice(1).toLowerCase()}`;
                }
                break;
            }
        }

        if (!desc.includes(',') && desc.includes(' - ')) {
            const parts = desc.split(' - ');
            desc = `${parts[1].trim()}, ${parts[0].trim()}`;
        }

        return desc.replace(/,\s*,/g, ',').trim();
    }
}

window.TDVisaParser = TDVisaParser;
window.tdVisaParser = new TDVisaParser();
