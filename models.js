// Data Models for AutoBookkeeping

// BankAccount class for multi-account support
class BankAccount {
    constructor(data = {}) {
        this.id = data.id || `acc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        this.name = data.name || '';
        this.type = data.type || 'CHECKING'; // CHECKING, SAVINGS, CREDIT_CARD, LINE_OF_CREDIT
        this.description = data.description || '';
        this.openingBalance = parseFloat(data.openingBalance) || 0;
        this.currency = data.currency || 'CAD';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
        this.createdAt = data.createdAt || new Date().toISOString();
        this.lastModified = new Date().toISOString();

        // Display preferences
        this.color = data.color || null;
        this.icon = data.icon || this.getDefaultIcon();
    }

    getDefaultIcon() {
        const icons = {
            'CHECKING': '🏦',
            'SAVINGS': '💰',
            'CREDIT_CARD': '💳',
            'LINE_OF_CREDIT': '📊'
        };
        return icons[this.type] || '🏦';
    }

    getTypeLabel() {
        const labels = {
            'CHECKING': 'Checking Account',
            'SAVINGS': 'Savings Account',
            'CREDIT_CARD': 'Credit Card',
            'LINE_OF_CREDIT': 'Line of Credit'
        };
        return labels[this.type] || this.type;
    }

    // Check if debit/credit logic is reversed for this account type
    isReversedLogic() {
        return this.type === 'CREDIT_CARD' || this.type === 'LINE_OF_CREDIT';
    }
}

class Transaction {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.ref = data.ref || '';
        this.date = data.date || new Date();
        this.payee = data.payee || '';
        this.debits = parseFloat(data.debits) || 0;
        this.amount = parseFloat(data.amount) || 0;
        this.balance = parseFloat(data.balance) || 0;
        this.account = data.account || '';

        // Categorization fields
        this.vendor = data.vendor || null;
        this.vendorId = data.vendorId || null;
        this.allocatedAccount = data.allocatedAccount || null;
        this.allocatedAccountName = data.allocatedAccountName || '';
        this.category = data.category || '';
        this.notes = data.notes || '';
        this.status = data.status || 'unmatched'; // unmatched, matched, manual, reviewed

        // NEW: Multi-account support
        this.accountId = data.accountId || null; // Links to BankAccount.id
    }

    generateId() {
        return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    get netAmount() {
        // If debits is positive, it's a debit transaction
        // If amount is positive, it's a credit transaction
        return this.debits > 0 ? this.debits : -this.amount;
    }

    get isDebit() {
        return this.debits > 0;
    }

    get isCredit() {
        return this.amount > 0;
    }
}

class Vendor {
    constructor(data) {
        this.id = data.id || this.generateId();
        this.name = data.name || '';
        this.patterns = data.patterns || []; // Array of patterns to match
        this.defaultAccount = data.defaultAccount || null;
        this.defaultAccountName = data.defaultAccountName || '';
        this.category = data.category || '';
        this.notes = data.notes || '';
        this.matchCount = data.matchCount || 0;
        this.lastMatched = data.lastMatched || null;
    }

    generateId() {
        return 'vnd_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    addPattern(pattern) {
        if (!this.patterns.includes(pattern)) {
            this.patterns.push(pattern);
        }
    }

    removePattern(pattern) {
        this.patterns = this.patterns.filter(p => p !== pattern);
    }

    matches(payeeName) {
        const normalizedPayee = payeeName.toLowerCase().trim();
        return this.patterns.some(pattern => {
            const normalizedPattern = pattern.toLowerCase().trim();

            // Exact match
            if (normalizedPayee === normalizedPattern) return true;

            // Contains match
            if (normalizedPayee.includes(normalizedPattern)) return true;

            // Pattern with wildcard (simple implementation)
            if (normalizedPattern.includes('*')) {
                const regex = new RegExp(
                    normalizedPattern.replace(/\*/g, '.*'),
                    'i'
                );
                return regex.test(payeeName);
            }

            return false;
        });
    }
}

class Account {
    constructor(data) {
        this.code = data.code || '';
        this.name = data.name || '';
        this.type = data.type || this.deriveType(data.code);
        this.category = data.category || '';
        this.isActive = data.isActive !== undefined ? data.isActive : true;
    }

    deriveType(code) {
        const codeNum = parseInt(code);
        if (codeNum >= 1000 && codeNum < 2000) return 'Asset';
        if (codeNum >= 2000 && codeNum < 3000) return 'Liability';
        if (codeNum >= 3000 && codeNum < 4000) return 'Equity';
        if (codeNum >= 4000 && codeNum < 5000) return 'Revenue';
        if (codeNum >= 5000 && codeNum < 10000) return 'Expense';
        return 'Other';
    }

    get fullName() {
        return `${this.code} - ${this.name}`;
    }

    get normalBalance() {
        // Assets, Expenses = Debit
        // Liabilities, Equity, Revenue = Credit
        if (this.type === 'Asset' || this.type === 'Expense') return 'Debit';
        return 'Credit';
    }
}

class TrialBalance {
    constructor() {
        this.entries = new Map(); // Account code -> {debits, credits, balance}
    }

    addTransaction(transaction, accountCode) {
        if (!accountCode) return;

        if (!this.entries.has(accountCode)) {
            this.entries.set(accountCode, {
                debits: 0,
                credits: 0,
                balance: 0
            });
        }

        const entry = this.entries.get(accountCode);

        if (transaction.isDebit) {
            entry.debits += transaction.debits;
        } else {
            entry.credits += transaction.amount;
        }

        entry.balance = entry.debits - entry.credits;
    }

    getTotals() {
        let totalDebits = 0;
        let totalCredits = 0;

        for (const entry of this.entries.values()) {
            totalDebits += entry.debits;
            totalCredits += entry.credits;
        }

        return {
            debits: totalDebits,
            credits: totalCredits,
            difference: totalDebits - totalCredits,
            isBalanced: Math.abs(totalDebits - totalCredits) < 0.01
        };
    }

    getAccountSummary(accountCode) {
        return this.entries.get(accountCode) || { debits: 0, credits: 0, balance: 0 };
    }

    getAllEntries() {
        return Array.from(this.entries.entries()).map(([code, entry]) => ({
            accountCode: code,
            ...entry
        }));
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BankAccount, Transaction, Vendor, Account, TrialBalance };
}
