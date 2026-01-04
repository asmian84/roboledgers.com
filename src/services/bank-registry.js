/**
 * Bank Registry (RoboLedgers V4)
 * Centralized repository for all bank-specific REGEX and metadata extraction rules.
 * Consolidates logic from mpurdon, Riebart, and Teller repositories.
 */

window.BankRegistry = {
    banks: {
        rbc_bank: {
            id: 'rbc_bank',
            name: 'Royal Bank (Personal)',
            identifier: /Royal Bank/i,
            patterns: {
                transaction: /([A-Za-z]{3}\s+\d{1,2})\s+([A-Za-z]{3}\s+\d{1,2})\s+(.+?)\s+(-?[\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g,
                opening_balance: /Opening balance.*?\$\s*([\d,]+\.\d{2})/i,
                closing_balance: /Closing balance.*?\$\s*([\d,]+\.\d{2})/i
            }
        },
        bmo_bank: {
            id: 'bmo_bank',
            name: 'BMO (Chequing/Savings)',
            identifier: /Bank of Montreal|BMO/i,
            patterns: {
                // Std Account: MMM DD   DESCRIPTION   AMOUNT   BALANCE
                standard: /^([A-Za-z]{3}\.?)\s+(\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2})\s+([-]?\$?[\d,]+\.?\d{2})$/,
                // Credit Card: MMM DD   MMM DD   DESC   [REF]   AMOUNT
                credit_card: /^([A-Za-z]{3}\.?)\s+(\d{1,2})\s+([A-Za-z]{3}\.?)\s+(\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2})$/,
                // NEW: Personal Line of Credit (Riebart Logic)
                ploc: /^([A-Za-z]{3}\.?)\s+(\d{1,2})\s+(.+?)\s+([-]?\$?[\d,]+\.?\d{2})$/
            }
        },
        td_bank: {
            id: 'td_bank',
            name: 'TD Canada Trust',
            identifier: /TD Canada Trust/i,
            patterns: {
                transaction: /([A-Za-z]{3}\s+\d{1,2})\s+(.+?)\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{2})/g
            }
        }
    },

    identify(text) {
        for (const [key, config] of Object.entries(this.banks)) {
            if (config.identifier.test(text)) {
                return config;
            }
        }
        return null;
    }
};
