// Standard Chart of Accounts for AutoBookkeeping v1.3
window.DEFAULT_CHART_OF_ACCOUNTS = [
    // --- ASSETS (1000-1999) ---
    { code: '1000', name: 'Checking Account', type: 'asset', category: 'Cash & Bank' },
    { code: '1050', name: 'Savings Account', type: 'asset', category: 'Cash & Bank' },
    { code: '1060', name: 'Petty Cash', type: 'asset', category: 'Cash & Bank' },
    { code: '1200', name: 'Accounts Receivable', type: 'asset', category: 'Current Assets' },
    { code: '1300', name: 'Inventory Asset', type: 'asset', category: 'Current Assets' },
    { code: '1400', name: 'Prepaid Expenses', type: 'asset', category: 'Current Assets' },
    { code: '1500', name: 'Furniture & Equipment', type: 'asset', category: 'Fixed Assets' },
    { code: '1550', name: 'Vehicles', type: 'asset', category: 'Fixed Assets' },
    { code: '1590', name: 'Accumulated Depreciation', type: 'asset', category: 'Fixed Assets' },

    // --- LIABILITIES (2000-2999) ---
    { code: '2000', name: 'Accounts Payable', type: 'liability', category: 'Current Liabilities' },
    { code: '2100', name: 'Credit Card Payable', type: 'liability', category: 'Current Liabilities' },
    { code: '2200', name: 'Sales Tax Payable (GST/HST)', type: 'liability', category: 'Current Liabilities' },
    { code: '2300', name: 'Payroll Liabilities', type: 'liability', category: 'Current Liabilities' },
    { code: '2400', name: 'Unearned Revenue', type: 'liability', category: 'Current Liabilities' },
    { code: '2700', name: 'Business Loan', type: 'liability', category: 'Long Term Liabilities' },

    // --- EQUITY (3000-3999) ---
    { code: '3000', name: 'Owner Equity', type: 'equity', category: 'Equity' },
    { code: '3100', name: 'Owner Draw', type: 'equity', category: 'Equity' },
    { code: '3200', name: 'Retained Earnings', type: 'equity', category: 'Equity' },
    { code: '3900', name: 'Opening Balance Equity', type: 'equity', category: 'Equity' },

    // --- REVENUE (4000-4999) ---
    { code: '4000', name: 'Sales Revenue', type: 'revenue', category: 'Revenue' },
    { code: '4100', name: 'Service Income', type: 'revenue', category: 'Revenue' },
    { code: '4200', name: 'Consulting Income', type: 'revenue', category: 'Revenue' },
    { code: '4300', name: 'Interest Income', type: 'revenue', category: 'Revenue' },
    { code: '4900', name: 'Other Income', type: 'revenue', category: 'Revenue' },

    // --- EXPENSES (5000-8999) ---
    { code: '5000', name: 'Cost of Goods Sold', type: 'expense', category: 'COGS' },
    { code: '5100', name: 'Merchant Processing Fees', type: 'expense', category: 'COGS' },

    { code: '6000', name: 'Advertising & Marketing', type: 'expense', category: 'Operating Expenses' },
    { code: '6050', name: 'Bank Fees & Charges', type: 'expense', category: 'Operating Expenses' },
    { code: '6100', name: 'Software & Subscriptions', type: 'expense', category: 'Operating Expenses' },
    { code: '6150', name: 'Office Supplies', type: 'expense', category: 'Operating Expenses' },
    { code: '6200', name: 'Rent or Lease', type: 'expense', category: 'Operating Expenses' },
    { code: '6250', name: 'Repairs & Maintenance', type: 'expense', category: 'Operating Expenses' },
    { code: '6300', name: 'Insurance', type: 'expense', category: 'Operating Expenses' },
    { code: '6350', name: 'Professional Fees', type: 'expense', category: 'Operating Expenses' },
    { code: '6400', name: 'Contractors Expenses', type: 'expense', category: 'Operating Expenses' },
    { code: '6500', name: 'Travel Expenses', type: 'expense', category: 'Operating Expenses' },
    { code: '6550', name: 'Meals & Entertainment', type: 'expense', category: 'Operating Expenses' },
    { code: '6600', name: 'Telephone & Internet', type: 'expense', category: 'Operating Expenses' },
    { code: '6700', name: 'Utilities', type: 'expense', category: 'Operating Expenses' },
    { code: '6800', name: 'Dues & Subscriptions', type: 'expense', category: 'Operating Expenses' },
    { code: '6900', name: 'Education & Training', type: 'expense', category: 'Operating Expenses' },
    { code: '9970', name: 'Ask My Accountant', type: 'expense', category: 'Uncategorized', description: 'Suspense account for uncategorized transactions' },

    // --- SYSTEM (9000-9999) ---
    { code: '9999', name: 'Transfer Clearing', type: 'equity', category: 'System', description: 'AI Transfer Agent Clearing Account' }
];

// Seed function for logic
window.seedDatabase = async function () {
    console.log('🌱 Database already seeded with defaults.');
    return { status: 'ready' };
};
