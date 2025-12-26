/**
 * AutoBookkeeping v3.0 - Data Models
 * Type definitions and validation for all data entities
 */

// Transaction Model
const TransactionModel = {
    fields: {
        id: { type: 'string', required: true },
        date: { type: 'date', required: true },
        description: { type: 'string', required: true },
        originalDescription: { type: 'string', required: false }, // Preserves raw bank text
        amount: { type: 'number', required: true },
        type: { type: 'enum', values: ['debit', 'credit'], required: true },
        vendorId: { type: 'string', required: false },
        accountId: { type: 'string', required: true },
        category: { type: 'string', required: false },
        bankAccountId: { type: 'string', required: false },
        reconciled: { type: 'boolean', required: false, default: false },
        notes: { type: 'string', required: false },
        createdAt: { type: 'date', required: true },
        updatedAt: { type: 'date', required: true }
    },

    validate(data) {
        const errors = [];

        if (!data.description || data.description.trim() === '') {
            errors.push('Description is required');
        }

        if (typeof data.amount !== 'number' || data.amount === 0) {
            errors.push('Amount must be a non-zero number');
        }

        if (!['debit', 'credit'].includes(data.type)) {
            errors.push('Type must be either debit or credit');
        }

        if (!data.accountId) {
            errors.push('Account ID is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

// Vendor Model
const VendorModel = {
    fields: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        category: { type: 'string', required: false },
        defaultAccountId: { type: 'string', required: false },
        totalSpent: { type: 'number', computed: true },
        transactionCount: { type: 'number', computed: true },
        lastTransaction: { type: 'date', computed: true },
        notes: { type: 'string', required: false },
        createdAt: { type: 'date', required: true },
        updatedAt: { type: 'date', required: true }
    },

    validate(data) {
        const errors = [];

        if (!data.name || data.name.trim() === '') {
            errors.push('Vendor name is required');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

// Account Model
const AccountModel = {
    fields: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        accountNumber: { type: 'string', required: false },
        type: { type: 'enum', values: ['asset', 'liability', 'equity', 'revenue', 'expense'], required: true },
        parentId: { type: 'string', required: false },
        openingBalance: { type: 'number', required: false, default: 0 },
        currentBalance: { type: 'number', computed: true },
        active: { type: 'boolean', required: false, default: true },
        createdAt: { type: 'date', required: true },
        updatedAt: { type: 'date', required: true }
    },

    validate(data) {
        const errors = [];

        if (!data.name || data.name.trim() === '') {
            errors.push('Account name is required');
        }

        if (!['asset', 'liability', 'equity', 'revenue', 'expense'].includes(data.type)) {
            errors.push('Account type must be asset, liability, equity, revenue, or expense');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

// Bank Account Model
const BankAccountModel = {
    fields: {
        id: { type: 'string', required: true },
        name: { type: 'string', required: true },
        accountNumber: { type: 'string', required: false },
        type: { type: 'enum', values: ['checking', 'savings', 'credit'], required: true },
        balance: { type: 'number', required: false, default: 0 },
        lastReconciled: { type: 'date', required: false },
        active: { type: 'boolean', required: false, default: true },
        createdAt: { type: 'date', required: true },
        updatedAt: { type: 'date', required: true }
    },

    validate(data) {
        const errors = [];

        if (!data.name || data.name.trim() === '') {
            errors.push('Bank account name is required');
        }

        if (!['checking', 'savings', 'credit'].includes(data.type)) {
            errors.push('Bank account type must be checking, savings, or credit');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

// Settings Model
const SettingsModel = {
    fields: {
        companyName: { type: 'string', required: false },
        fiscalYearEnd: { type: 'string', required: false, default: '12-31' },
        currency: { type: 'string', required: false, default: 'USD' },
        theme: { type: 'string', required: false, default: 'light' },
        fontSize: { type: 'number', required: false, default: 16 },
        locale: { type: 'string', required: false, default: 'en-US' }
    },

    validate(data) {
        const errors = [];

        // Fiscal year end format: MM-DD
        if (data.fiscalYearEnd && !/^\d{2}-\d{2}$/.test(data.fiscalYearEnd)) {
            errors.push('Fiscal year end must be in MM-DD format');
        }

        if (data.fontSize && (data.fontSize < 12 || data.fontSize > 24)) {
            errors.push('Font size must be between 12 and 24');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }
};

// Export models
if (typeof window !== 'undefined') {
    window.Models = {
        Transaction: TransactionModel,
        Vendor: VendorModel,
        Account: AccountModel,
        BankAccount: BankAccountModel,
        Settings: SettingsModel
    };
}

console.log('📋 Data models loaded');
