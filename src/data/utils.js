/**
 * AutoBookkeeping v3.0 - Data Utilities
 * Helper functions for data manipulation and formatting
 */

// Generate UUID v4
function generateId() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

// Validate transaction data
function validateTransaction(data) {
    if (!window.Models || !window.Models.Transaction) {
        return { valid: false, errors: ['Models not loaded'] };
    }
    return window.Models.Transaction.validate(data);
}

// Validate vendor data
function validateVendor(data) {
    if (!window.Models || !window.Models.Vendor) {
        return { valid: false, errors: ['Models not loaded'] };
    }
    return window.Models.Vendor.validate(data);
}

// Validate account data
function validateAccount(data) {
    if (!window.Models || !window.Models.Account) {
        return { valid: false, errors: ['Models not loaded'] };
    }
    return window.Models.Account.validate(data);
}

// Format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Format date
function formatDate(date, format = 'short') {
    if (!(date instanceof Date)) {
        date = new Date(date);
    }

    if (format === 'short') {
        return date.toLocaleDateString('en-US');
    } else if (format === 'long') {
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    } else if (format === 'iso') {
        return date.toISOString();
    }

    return date.toLocaleDateString();
}

// Parse CSV text
function parseCSV(text) {
    const lines = text.trim().split('\n');
    if (lines.length === 0) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const row = {};

        headers.forEach((header, index) => {
            row[header] = values[index] || '';
        });

        data.push(row);
    }

    return data;
}

// Export to JSON
function exportToJSON(data) {
    return JSON.stringify(data, null, 2);
}

// Import from JSON
function importFromJSON(json) {
    try {
        return JSON.parse(json);
    } catch (error) {
        console.error('Failed to parse JSON:', error);
        return null;
    }
}

// Serialize date for storage
function serializeDate(date) {
    if (!date) return null;
    if (date instanceof Date) {
        return date.toISOString();
    }
    return new Date(date).toISOString();
}

// Deserialize date from storage
function deserializeDate(dateString) {
    if (!dateString) return null;
    return new Date(dateString);
}

// Deep clone object
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Calculate transaction totals
function calculateTransactionTotals(transactions) {
    return transactions.reduce((acc, txn) => {
        if (txn.type === 'debit') {
            acc.debits += txn.amount;
        } else {
            acc.credits += txn.amount;
        }
        acc.net = acc.credits - acc.debits;
        return acc;
    }, { debits: 0, credits: 0, net: 0 });
}

// Group transactions by category
function groupByCategory(transactions) {
    return transactions.reduce((acc, txn) => {
        const category = txn.category || 'Uncategorized';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(txn);
        return acc;
    }, {});
}

// Filter transactions by date range
function filterByDateRange(transactions, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    return transactions.filter(txn => {
        const txnDate = new Date(txn.date);
        return txnDate >= start && txnDate <= end;
    });
}

// Sort transactions
function sortTransactions(transactions, field = 'date', order = 'desc') {
    return transactions.slice().sort((a, b) => {
        let aVal = a[field];
        let bVal = b[field];

        // Handle dates
        if (field === 'date' || field === 'createdAt' || field === 'updatedAt') {
            aVal = new Date(aVal);
            bVal = new Date(bVal);
        }

        if (order === 'asc') {
            return aVal > bVal ? 1 : -1;
        } else {
            return aVal < bVal ? 1 : -1;
        }
    });
}

// Export utilities
if (typeof window !== 'undefined') {
    window.DataUtils = {
        generateId,
        validateTransaction,
        validateVendor,
        validateAccount,
        formatCurrency,
        formatDate,
        parseCSV,
        exportToJSON,
        importFromJSON,
        serializeDate,
        deserializeDate,
        deepClone,
        calculateTransactionTotals,
        groupByCategory,
        filterByDateRange,
        sortTransactions
    };
}

console.log('🔧 Data utilities loaded');
