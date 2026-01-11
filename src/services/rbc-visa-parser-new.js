// NEW RBC Visa Parser - uses matchAll instead of line splitting
// This fixes the issue where PDF.js joins all text into one line per page

class RBCVisaParser {
    extractRBCVisaTransactions(text) {
        const transactions = [];

        // 1. Detect Year
        let year = new Date().getFullYear();
        const yearMatch = text.match(/\b(20[2-3]\d)\b/);
        if (yearMatch) {
            year = parseInt(yearMatch[1]);
        }

        // 2. Extract Metadata
        const metadata = {
            accountHolder: null,
            accountNumber: null,
            statementPeriod: null,
            previousBalance: null,
            newBalance: null
        };

        const holderMatch = text.match(/([A-Z0-9\s]+LTD|[A-Z\s]+)\s+\d{4}\s+\d{2}\*\*/);
        if (holderMatch) metadata.accountHolder = holderMatch[1].trim();

        const accountMatch = text.match(/\d{4}\s+\d{2}\*\*\s+\*\*\*\*\s+(\d{4})/);
        if (accountMatch) metadata.accountNumber = `**** ${accountMatch[1]}`;

        const periodMatch = text.match(/STATEMENT FROM\s+(\w+\s+\d{1,2})\s+TO\s+(\w+\s+\d{1,2},?\s+\d{4})/i);
        if (periodMatch) metadata.statementPeriod = `${periodMatch[1]} to ${periodMatch[2]}`;

        const prevBalMatch = text.match(/PREVIOUS BALANCE[\s\S]*?\$?([\d,]+\.\d{2})/);
        if (prevBalMatch) metadata.previousBalance = parseFloat(prevBalMatch[1].replace(/,/g, ''));

        const newBalMatch = text.match(/NEW BALANCE[\s\S]*?\$?([\d,]+\.\d{2})/);
        if (newBalMatch) metadata.newBalance = parseFloat(newBalMatch[1].replace(/,/g, ''));

        // 3. Extract Transactions using matchAll
        // Pattern: MMM DD MMM DD DESCRIPTION AMOUNT
        const visaPattern = /([A-Z]{3})\s+(\d{1,2})\s+([A-Z]{3})\s+(\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2})/g;

        const months = {
            JAN: 0, FEB: 1, MAR: 2, APR: 3, MAY: 4, JUN: 5,
            JUL: 6, AUG: 7, SEP: 8, OCT: 9, NOV: 10, DEC: 11
        };

        let previousMonth = -1;
        let currentYear = year;

        // Use matchAll to find ALL transactions in the continuous text
        const matches = text.matchAll(visaPattern);

        for (const match of matches) {
            const [, transMonth, transDay, postMonth, postDay, description, amountStr] = match;

            // Use transaction date (first date)
            const monthNum = months[transMonth.toUpperCase()];

            // Handle year rollover
            if (previousMonth !== -1 && previousMonth === 11 && monthNum === 0) {
                currentYear++;
            }
            previousMonth = monthNum;

            // Parse amount - remove $ and commas
            let amount = parseFloat(amountStr.replace(/[$,]/g, ''));

            // Determine type
            const type = amount < 0 ? 'credit' : 'debit';
            amount = Math.abs(amount);

            // Format date
            const month = (monthNum + 1).toString().padStart(2, '0');
            const day = transDay.padStart(2, '0');
            const isoDate = `${currentYear}-${month}-${day}`;

            transactions.push({
                date: isoDate,
                description: description.trim(),
                amount: amount,
                type: type,
                originalDate: `${transMonth} ${transDay}, ${currentYear}`
            });
        }

        return { transactions, metadata };
    }
}

window.RBCVisaParser = new RBCVisaParser();
