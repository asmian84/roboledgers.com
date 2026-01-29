/**
 * Scotiabank Credit Card Parser
 * LIABILITY account - Debit increases balance, Credit decreases balance
 */
class ScotiaCreditCardParser extends BaseBankParser {
    constructor() {
        super('Scotiabank', 'CreditCard', 'Scotiabank Credit Card - Liability account');
    }

    async parse(statementText) {
        // LOUD DIAGNOSTIC
        console.warn('⚡ [EXTREME-SCOTIA-CC] Starting metadata extraction for Scotiabank CC...');
        console.error('📄 [DEBUG-SCOTIA-CC] First 1000 characters (RED for visibility):');
        console.log(statementText.substring(0, 1000));

        const lines = statementText.split('\n');
        const transactions = [];

        // Extract opening balance (Previous Balance)
        let openingBalance = 0;
        const previousBalanceMatch = statementText.match(/Previous\s+Balance\s+.*?([\d,]+\.\d{2})/i);
        if (previousBalanceMatch) {
            openingBalance = parseFloat(previousBalanceMatch[1].replace(/,/g, ''));
            console.log(`[SCOTIA-CC] Extracted opening balance: ${openingBalance}`);
        }

        // EXTRACT METADATA (Institution, Transit, Account)
        const acctMatch = statementText.match(/(?:Account)[:#]?\s*([\d-]{7,})/i);
        const metadata = {
            _inst: '002', // Scotiabank Institution Code
            _transit: '-----',
            _acct: acctMatch ? acctMatch[1].replace(/[-\s]/g, '') : '-----',
            institutionCode: '002',
            transit: '-----',
            accountNumber: acctMatch ? acctMatch[1].replace(/[-\s]/g, '') : '-----',
            _brand: 'Scotiabank',
            _bank: 'Scotiabank',
            _tag: 'CreditCard'
        };
        console.warn('🏁 [SCOTIA-CC] Extraction Phase Complete. Transit:', metadata.transit, 'Acct:', metadata.accountNumber);

        let currentYear = new Date().getFullYear();

        // Extract year
        const yearMatch = statementText.match(/(\d{4})/);
        if (yearMatch) currentYear = parseInt(yearMatch[1]);

        // Date formats: "MM/DD/YYYY" or "MMM DD"
        const dateRegex1 = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/;
        const dateRegex2 = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{1,2})/i;
        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || line.match(/Opening|Balance forward|Page \d/i)) continue;

            let isoDate = null;
            let dateMatch = line.match(dateRegex1);
            if (dateMatch) {
                isoDate = `${dateMatch[3]}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
            } else {
                dateMatch = line.match(dateRegex2);
                if (dateMatch) {
                    isoDate = `${currentYear}-${monthMap[dateMatch[1].toLowerCase()]}-${dateMatch[2].padStart(2, '0')}`;
                }
            }
            if (!isoDate) continue;

            const remainder = line.substring(dateMatch[0].length).trim();
            const amounts = remainder.match(/([\d,]+\.\d{2}-?)/g);
            if (!amounts || amounts.length < 1) continue;

            const firstAmt = remainder.search(/[\d,]+\.\d{2}/);
            const description = remainder.substring(0, firstAmt).trim();
            if (!description) continue;

            // UI FORMATTING: Insert comma after known transaction types
            const typePrefixes = [
                "BILL PAYMENT", "INSURANCE", "SERVICE CHARGE", "POINT OF SALE PURCHASE",
                "TRANSFER TO", "TRANSFER FROM", "ABM WITHDRAWAL", "CASH WITHDRAWAL",
                "SHARED ABM WITHDRAWAL", "DEBIT MEMO", "CREDIT MEMO", "MISC PAYMENT",
                "INTERAC ABM FEE", "OVERDRAFT PROTECTION FEE", "RETURNED NSF CHEQUE",
                "NSF SERVICE CHARGE", "BUSINESS PAD", "MB BILL PAYMENT", "PC BILL PAYMENT"
            ];

            for (const type of typePrefixes) {
                if (description.toUpperCase().startsWith(type)) {
                    // Only insert if not already present and followed by space or end
                    if (description.length > type.length && description[type.length] !== ',') {
                        description = description.substring(0, type.length) + ',' + description.substring(type.length);
                    }
                    break;
                }
            }

            // Parse amount (may have trailing minus for credits)
            let rawAmt = amounts[0];
            const isNegative = rawAmt.endsWith('-');
            const amount = parseFloat(rawAmt.replace(/[,-]/g, ''));
            const balance = amounts.length > 1 ? parseFloat(amounts[amounts.length - 1].replace(/[,-]/g, '')) : 0;

            // Credit card: negative or payment keywords = credit
            const isPayment = isNegative || /payment|credit|refund/i.test(description);

            transactions.push({
                date: isoDate,
                description,
                amount,
                debit: isPayment ? 0 : amount,
                credit: isPayment ? amount : 0,
                balance,
                rawText: line,
                refCode: line.match(/\b([A-Z0-9]{15,})\b/)?.[1] || 'N/A'
            });
        }

        console.log(`[SCOTIA-CC] Parsed ${transactions.length} transactions`);
        return { transactions, metadata, openingBalance };
    }
}

window.ScotiaCreditCardParser = ScotiaCreditCardParser;
window.scotiaCreditCardParser = new ScotiaCreditCardParser();
