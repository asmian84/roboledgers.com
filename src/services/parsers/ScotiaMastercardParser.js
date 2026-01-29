/**
 * Scotia Mastercard Parser
 * Regex-based parser for Scotiabank Mastercard statements
 */
class ScotiaMastercardParser extends BaseBankParser {
    constructor() {
        const formatRules = `
SCOTIA MASTERCARD FORMAT:
- Date format: MM/DD or MMM DD
- Credit card: Debit = charges, Credit = payments
- Transaction types: PAYMENT, PURCHASE, CASH ADVANCE, INTEREST CHARGE, ANNUAL FEE
    `;
        super('Scotiabank', 'Mastercard', formatRules);
    }

    async parse(statementText) {
        console.log('⚡ Scotia Mastercard: Starting regex-based parsing...');

        const lines = statementText.split('\n');
        const transactions = [];

        const yearMatch = statementText.match(/20\d{2}/);
        const currentYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

        const dateRegex1 = /^(\d{1,2})\/(\d{1,2})/;
        const dateRegex2 = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i;
        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.match(/Opening|Balance|Page \d/i)) continue;

            let isoDate = null;
            let dateMatch = trimmed.match(dateRegex1);
            if (dateMatch) {
                isoDate = `${currentYear}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
            } else {
                dateMatch = trimmed.match(dateRegex2);
                if (dateMatch) {
                    isoDate = `${currentYear}-${monthMap[dateMatch[1].toLowerCase()]}-${dateMatch[2].padStart(2, '0')}`;
                }
            }
            if (!isoDate) continue;

            const remainder = trimmed.substring(dateMatch[0].length).trim();
            const amounts = remainder.match(/([\d,]+\.\d{2}-?)/g);
            if (!amounts || amounts.length < 1) continue;

            const firstAmtIdx = remainder.search(/[\d,]+\.\d{2}/);
            let description = remainder.substring(0, firstAmtIdx).trim();
            if (!description) continue;

            description = this.cleanCreditDescription(description, [
                "PAYMENT", "PURCHASE", "CASH ADVANCE",
                "INTEREST CHARGE", "ANNUAL FEE", "SERVICE CHARGE"
            ]);

            let rawAmt = amounts[0];
            const isNegative = rawAmt.endsWith('-');
            const amount = parseFloat(rawAmt.replace(/[,-]/g, ''));
            const balance = amounts.length > 1 ? parseFloat(amounts[amounts.length - 1].replace(/[,-]/g, '')) : 0;
            const isPayment = isNegative || /payment|credit|refund/i.test(description);

            transactions.push({
                date: isoDate,
                description,
                amount,
                debit: isPayment ? 0 : amount,
                credit: isPayment ? amount : 0,
                balance,
                rawText: this.cleanRawText(line)
            });
        }

        console.log(`[SCOTIA-MC] Parsed ${transactions.length} transactions`);
        return { transactions };
    }

    cleanCreditDescription(desc, prefixes) {
        desc = desc.replace(/\s+/g, ' ').trim();
        desc = desc.replace(/\b\d{6,}\b/gi, '');

        const descUpper = desc.toUpperCase();
        for (const type of prefixes) {
            if (descUpper.startsWith(type + ' ')) {
                const name = desc.substring(type.length).trim();
                if (name) desc = `${name}, ${type.charAt(0) + type.slice(1).toLowerCase()}`;
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

window.ScotiaMastercardParser = ScotiaMastercardParser;
window.scotiaMastercardParser = new ScotiaMastercardParser();
