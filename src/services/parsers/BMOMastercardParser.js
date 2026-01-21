/**
 * BMO Mastercard Parser
 * Regex-based parser for BMO Mastercard statements
 */
class BMOMastercardParser extends BaseBankParser {
  constructor() {
    const formatRules = `
BMO MASTERCARD FORMAT:
- Date format: MMM DD (e.g., Apr 01, May 16)
- Credit card: Debit = charges, Credit = payments
- Transaction types: PAYMENT RECEIVED, PURCHASE, CASH ADVANCE, INTEREST, FEE
    `;
    super('BMO', 'Mastercard', formatRules);
  }

  async parse(statementText) {
    console.log('⚡ BMO Mastercard: Starting regex-based parsing...');

    const lines = statementText.split('\n');
    const transactions = [];

    const yearMatch = statementText.match(/20\d{2}/);
    const currentYear = yearMatch ? parseInt(yearMatch[0]) : new Date().getFullYear();

    const dateRegex = /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})/i;
    const monthMap = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.match(/Opening|Balance|Page \d/i)) continue;

      const dateMatch = trimmed.match(dateRegex);
      if (!dateMatch) continue;

      const isoDate = `${currentYear}-${monthMap[dateMatch[1].toLowerCase()]}-${dateMatch[2].padStart(2, '0')}`;
      const remainder = trimmed.substring(dateMatch[0].length).trim();

      const amounts = remainder.match(/([\d,]+\.\d{2})/g);
      if (!amounts || amounts.length < 1) continue;

      const firstAmtIdx = remainder.search(/[\d,]+\.\d{2}/);
      let description = remainder.substring(0, firstAmtIdx).trim();
      if (!description) continue;

      description = this.cleanCreditDescription(description, [
        "PAYMENT RECEIVED", "PURCHASE", "CASH ADVANCE",
        "INTEREST", "FEE", "SERVICE CHARGE"
      ]);

      const amount = parseFloat(amounts[0].replace(/,/g, ''));
      const balance = amounts.length > 1 ? parseFloat(amounts[amounts.length - 1].replace(/,/g, '')) : 0;
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

    console.log(`[BMO-MC] Parsed ${transactions.length} transactions`);
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

window.BMOMastercardParser = BMOMastercardParser;
window.bmoMastercardParser = new BMOMastercardParser();
