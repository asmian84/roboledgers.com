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
        // LOUD DIAGNOSTIC
        console.warn('⚡ [EXTREME-TD-VISA] Starting metadata extraction for TD Visa...');
        console.error('📄 [DEBUG-TD-VISA] First 1000 characters (RED for visibility):');
        console.log(statementText.substring(0, 1000));

        const lines = statementText.split('\n');
        const transactions = [];

        // EXTRACT METADATA (Institution, Transit, Account)
        const acctMatch = statementText.match(/(?:Account)[:#]?\s*([\d-]{7,})/i);

        // Extract opening balance (Previous Balance for credit cards)
        let openingBalance = null;
        const openingMatch = statementText.match(/(Opening|Previous) Balance.*?\$?([\d,]+\.\d{2})/i);
        if (openingMatch) {
            openingBalance = parseFloat(openingMatch[2].replace(/,/g, ''));
            console.log(`[TD-VISA] Extracted opening balance: ${openingBalance}`);
        }

        const metadata = {
            _inst: '004', // TD Institution Code
            _transit: '-----',
            _acct: acctMatch ? acctMatch[1].replace(/[-\s]/g, '') : '-----',
            institutionCode: '004',
            transit: '-----',
            accountNumber: acctMatch ? acctMatch[1].replace(/[-\s]/g, '') : '-----',
            _brand: 'TD',
            _bank: 'TD Visa',
            _tag: 'CreditCard',
            openingBalance: openingBalance
        };
        console.warn('🏁 [TD-VISA] Extraction Phase Complete. Transit:', metadata.transit, 'Acct:', metadata.accountNumber);

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
                balance,
                rawText: this.cleanRawText(line)
            });
        }

        console.log(`[TD-VISA] Parsed ${transactions.length} transactions`);
        return { transactions, metadata };
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
