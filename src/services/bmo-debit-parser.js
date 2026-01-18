/**
 * BMO Business Debit Account Parser
 * Format: Date  Description  Debit($)  Credit($)  Balance($)
 * Example: Jan03  INTERAC e-Transfer Sent  1,323.00    223,076.32
 */
export function extractBMODebitTransactions(text) {
    const transactions = [];

    // Detect year from statement date
    let year = new Date().getFullYear();
    const dateMatch = text.match(/(\w{3})(\d{1,2}),(\d{4})/);
    if (dateMatch) {
        year = parseInt(dateMatch[3]);
    }

    // Extract metadata
    const metadata = {
        accountHolder: null,
        accountNumber: null,
        statementPeriod: null,
        openingBalance: null,
        closingBalance: null,
        accountType: 'BMO Business Debit'
    };

    // Extract business name
    const nameMatch = text.match(/Businessname:\s*(.+)/i);
    if (nameMatch) {
        metadata.accountHolder = nameMatch[1].trim();
    }

    // Extract account number
    const accountMatch = text.match(/BusinessAccount\s*#(\d+-\d+)/);
    if (accountMatch) {
        metadata.accountNumber = accountMatch[1];
    }

    // Extract opening balance
    const openingMatch = text.match(/Openingbalance\s+([\d,]+\.\d{2})/);
    if (openingMatch) {
        metadata.openingBalance = parseFloat(openingMatch[1].replace(/,/g, ''));
    }

    const months = {
        Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
        Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12'
    };

    // Pattern: Date(MmmDD) Description [Debit] [Credit] Balance
    // The key insight: amounts are right-aligned, so we look for patterns
    const lines = text.split('\n');

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Match transaction lines: Date(MmmDD) followed by description and amounts
        // Pattern: Jan03 Description... 1,323.00 223,076.32
        // OR: Jan30 Description... 11,156.25 227,222.68 (credit)
        const match = line.match(/^([A-Z][a-z]{2})(\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})?\s*([\d,]+\.\d{2})?\s+([\d,]+\.\d{2})$/);

        if (match) {
            const [, month, day, description, amount1, amount2, balance] = match;

            // Normalize whitespace in description
            const cleanDesc = description.trim().replace(/\s+/g, ' ');

            // Determine which column has data
            // If amount1 exists but not amount2: it's a debit
            // If amount2 exists: it's a credit
            let debit = null;
            let credit = null;

            if (amount1 && !amount2) {
                // Debit only
                debit = parseFloat(amount1.replace(/,/g, ''));
            } else if (amount2) {
                // Credit (amount1 was empty, amount2 is the credit)
                credit = parseFloat(amount2.replace(/,/g, ''));
            }

            const monthNum = months[month];
            const dayPadded = day.padStart(2, '0');
            const isoDate = `${year}-${monthNum}-${dayPadded}`;

            transactions.push({
                date: isoDate,
                description: cleanDesc,
                debit: debit,
                credit: credit,
                balance: parseFloat(balance.replace(/,/g, '')),
                type: debit ? 'debit' : 'credit',
                amount: debit || credit,
                originalDate: `${month} ${day}, ${year}`
            });
        }
    }

    console.log(`🎯 BMO Debit Parser: Extracted ${transactions.length} transactions`);
    return { transactions, metadata };
}
