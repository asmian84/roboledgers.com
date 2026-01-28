/**
 * American Express Parser
 * Regex-based parser for Amex credit card statements
 */
class AmexParser extends BaseBankParser {
    constructor() {
        const formatRules = `
AMEX FORMAT:
- Date format: MM/DD or MMM DD
- Credit card: Debit = charges, Credit = payments
- Transaction types: PAYMENT THANK YOU, PURCHASE, CASH ADVANCE, INTEREST CHARGE, MEMBERSHIP FEE
    `;
        super('American Express', 'Amex', formatRules);
    }

    async parse(statementText) {
        // LOUD DIAGNOSTIC
        console.warn('⚡ [EXTREME-AMEX] Starting metadata extraction for Amex...');
        console.error('📄 [DEBUG-AMEX] First 1000 characters (RED for visibility):');
        console.log(statementText.substring(0, 1000));

        // EXTRACT METADATA (Institution, Transit, Account)
        // Amex format often: XXXX XXXXX6 91001 or Account Number: 1234-567890-12345
        const acctMatch = statementText.match(/(?:Account Number|Credit Card)[:#]?\s*(?:XXXX\s*XXXXXX\d?\s*|[\d-]{7,})(\d{5,6})/i)
            || statementText.match(/(?:Account)[:#]?\s*([\d-]{7,})/i);

        const metadata = {
            _inst: '303', // Amex Institution Code
            _transit: '-----',
            _acct: acctMatch ? acctMatch[1].replace(/[-\s]/g, '') : '-----',
            institutionCode: '303',
            transit: '-----',
            accountNumber: acctMatch ? acctMatch[1].replace(/[-\s]/g, '') : '-----',
            _brand: 'Amex',
            _bank: 'American Express',
            _tag: 'Amex'
        };
        console.warn('🏁 [AMEX] Extraction Phase Complete. Transit:', metadata.transit, 'Acct:', metadata.accountNumber);

        // YEAR DETECTION: Look for Statement Period or Closing Date year
        const yearRegex = /(?:Statement\s+Period|Closing\s+Date|Ending\s+in|20[23]\d)/gi;
        let currentYear = new Date().getFullYear();
        const yearMatches = statementText.match(yearRegex);
        if (yearMatches) {
            // Find the first 4-digit year in the matches
            const fullYearMatch = statementText.match(/20\d{2}/);
            if (fullYearMatch) currentYear = parseInt(fullYearMatch[0]);
        }
        console.warn(`[AMEX] Detected Year: ${currentYear}`);

        const lines = statementText.split('\n');
        const transactions = [];
        let inTransactionBlock = false;
        let txnCounter = 1;

        const dateRegex1 = /^(\d{1,2})\/(\d{1,2})/;
        const dateRegex2 = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i;
        const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // TRACK BLOCK STATE
            // Trigger: "Your Transactions" or "New Transactions for"
            if (line.match(/Your Transactions|New Transactions for/i)) {
                console.log(`[AMEX] Triggering transaction block at line ${i}: "${line}"`);
                inTransactionBlock = true;
                continue;
            }

            // Stopper: "Total of New Transactions" or "Total of Payment Activity"
            if (inTransactionBlock && line.match(/Total of (?:New Transactions|Payment Activity|Activity)/i)) {
                console.log(`[AMEX] Stopping transaction block at line ${i}: "${line}"`);
                // Note: We don't break immediately because there might be another block (e.g. Charges vs Payments)
                inTransactionBlock = false;
                continue;
            }

            if (!inTransactionBlock) continue;

            // SKIP HEADERS
            if (line.match(/Transaction\s+Posting\s+Details\s+Amount/i)) continue;

            let isoDate = null;
            let dateMatch = line.match(dateRegex1);
            if (dateMatch) {
                isoDate = `${currentYear}-${dateMatch[1].padStart(2, '0')}-${dateMatch[2].padStart(2, '0')}`;
            } else {
                dateMatch = line.match(dateRegex2);
                if (dateMatch) {
                    isoDate = `${currentYear}-${monthMap[dateMatch[1].toLowerCase()]}-${dateMatch[2].padStart(2, '0')}`;
                }
            }
            if (!isoDate) continue;

            const remainder = line.substring(dateMatch[0].length).trim();

            // AMEX AMOUNTS: Often at the end of the line, can be negative with minus sign
            // Match numbers with commas/dots and optional trailing minus
            const amountsAtEnd = remainder.match(/(-?[\d,]+\.\d{2})|([\d,]+\.\d{2}-?)$/);
            if (!amountsAtEnd) continue;

            const rawAmt = amountsAtEnd[0];
            const amount = parseFloat(rawAmt.replace(/[,]/g, ''));

            // Description is everything between date and amount
            const descEndIdx = remainder.lastIndexOf(rawAmt);
            let description = remainder.substring(0, descEndIdx).trim();

            // CLEAN DESCRIPTION
            description = this.cleanCreditDescription(description, [
                "PAYMENT THANK YOU", "PURCHASE", "CASH ADVANCE",
                "INTEREST CHARGE", "MEMBERSHIP FEE", "LATE FEE", "FOREIGN TRANSACTION FEE"
            ]);

            const isPayment = amount < 0 || /payment|credit|thank you/i.test(description);
            const absAmount = Math.abs(amount);

            transactions.push({
                refNum: `AMEX ${String(txnCounter++).padStart(3, '0')}`,
                date: isoDate,
                description,
                amount: absAmount,
                debit: isPayment ? 0 : absAmount,
                credit: isPayment ? absAmount : 0,
                balance: 0, // Amex statements don't usually have line-by-line balance
                _inst: '303',
                _brand: 'Amex',
                _bank: 'American Express',
                _tag: 'Amex'
            });
        }

        console.log(`[AMEX] Parsed ${transactions.length} transactions`);
        return { transactions, metadata };
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

window.AmexParser = AmexParser;
window.amexParser = new AmexParser();
