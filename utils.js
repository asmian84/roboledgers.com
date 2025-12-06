// Utility functions for AutoBookkeeping

const Utils = {
    // Date parsing and formatting
    parseDate(dateString) {
        if (!dateString) return null;

        // Try various date formats
        const formats = [
            // MM/DD/YYYY
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
            // M/D/YYYY
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
            // YYYY-MM-DD
            /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
            // DD-MM-YYYY
            /^(\d{1,2})-(\d{1,2})-(\d{4})$/
        ];

        // Try ISO format first
        const isoDate = new Date(dateString);
        if (!isNaN(isoDate.getTime())) {
            return isoDate;
        }

        // Try MM/DD/YYYY format (most common for US banking)
        const parts = dateString.split('/');
        if (parts.length === 3) {
            const month = parseInt(parts[0]) - 1;
            const day = parseInt(parts[1]);
            const year = parseInt(parts[2]);
            return new Date(year, month, day);
        }

        return null;
    },

    formatDate(date, format = 'MM/DD/YYYY') {
        if (!date) return '';
        if (typeof date === 'string') {
            date = this.parseDate(date);
        }
        if (!date || isNaN(date.getTime())) return '';

        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const year = date.getFullYear();

        switch (format) {
            case 'MM/DD/YYYY':
                return `${month}/${day}/${year}`;
            case 'YYYY-MM-DD':
                return `${year}-${month}-${day}`;
            case 'DD/MM/YYYY':
                return `${day}/${month}/${year}`;
            default:
                return `${month}/${day}/${year}`;
        }
    },

    // Currency formatting
    formatCurrency(amount, decimals = 2) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$0.00';
        }

        const formatted = Math.abs(amount).toFixed(decimals);
        const parts = formatted.split('.');
        parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');

        const sign = amount < 0 ? '-' : '';
        return `${sign}$${parts.join('.')}`;
    },

    parseCurrency(currencyString) {
        if (!currencyString) return 0;

        // Remove currency symbols, commas, and spaces
        const cleaned = String(currencyString)
            .replace(/[$,\s]/g, '')
            .trim();

        // Handle parentheses as negative
        if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
            return -parseFloat(cleaned.slice(1, -1)) || 0;
        }

        return parseFloat(cleaned) || 0;
    },

    // String normalization
    normalizeString(str) {
        if (!str) return '';
        return str.toString().trim().toLowerCase();
    },

    // String similarity (for fuzzy matching)
    similarity(s1, s2) {
        s1 = this.normalizeString(s1);
        s2 = this.normalizeString(s2);

        if (s1 === s2) return 1.0;
        if (s1.length === 0 || s2.length === 0) return 0.0;

        // Check if one contains the other
        if (s1.includes(s2) || s2.includes(s1)) {
            return 0.8;
        }

        // Levenshtein distance
        const matrix = [];

        for (let i = 0; i <= s2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= s1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= s2.length; i++) {
            for (let j = 1; j <= s1.length; j++) {
                if (s2.charAt(i - 1) === s1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        const distance = matrix[s2.length][s1.length];
        const maxLength = Math.max(s1.length, s2.length);
        return 1 - (distance / maxLength);
    },

    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Generate unique ID
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },

    // Download file
    downloadFile(content, filename, mimeType = 'text/plain') {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    // Extract vendor name from payee field
    extractVendorName(payee) {
        if (!payee) return '';

        // Remove common banking prefixes
        let cleaned = payee
            .replace(/^(ONLINE BANKING TRANSFER|MONTHLY FEE|DEBIT CARD|POS|ATM)\s*-?\s*/i, '')
            .replace(/\s*-\s*\d+$/, '') // Remove trailing numbers like "- 6793"
            .replace(/\s*-\s*\d{4}$/, '') // Remove trailing 4-digit codes
            .trim();

        return cleaned;
    },

    // Account type helpers
    isAssetAccount(code) {
        const num = parseInt(code);
        return num >= 1000 && num < 2000;
    },

    isLiabilityAccount(code) {
        const num = parseInt(code);
        return num >= 2000 && num < 3000;
    },

    isEquityAccount(code) {
        const num = parseInt(code);
        return num >= 3000 && num < 4000;
    },

    isRevenueAccount(code) {
        const num = parseInt(code);
        return num >= 4000 && num < 5000;
    },

    isExpenseAccount(code) {
        const num = parseInt(code);
        return num >= 5000 && num < 10000;
    },

    getAccountType(code) {
        if (this.isAssetAccount(code)) return 'Asset';
        if (this.isLiabilityAccount(code)) return 'Liability';
        if (this.isEquityAccount(code)) return 'Equity';
        if (this.isRevenueAccount(code)) return 'Revenue';
        if (this.isExpenseAccount(code)) return 'Expense';
        return 'Other';
    },

    // Validate transaction
    validateTransaction(transaction) {
        const errors = [];

        if (!transaction.date) {
            errors.push('Missing date');
        }

        if (!transaction.payee) {
            errors.push('Missing payee');
        }

        if (transaction.debits === 0 && transaction.amount === 0) {
            errors.push('Missing amount');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
};
