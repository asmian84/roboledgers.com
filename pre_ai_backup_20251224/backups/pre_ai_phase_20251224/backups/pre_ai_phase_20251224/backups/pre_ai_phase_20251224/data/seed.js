/**
 * AutoBookkeeping v3.0 - Seed Data Generator
 * Generate realistic sample data for development and testing
 */

async function seedDatabase() {
    // Check if data already exists
    const existingTransactions = await window.storage.getTransactions();
    if (existingTransactions.length > 0) {
        console.log('🌱 Database already seeded, skipping...');
        return {
            accounts: 0,
            vendors: 0,
            transactions: 0,
            bankAccounts: 0,
            settings: 0
        };
    }

    console.log('🌱 Seeding database with sample data...');

    let counts = {
        accounts: 0,
        vendors: 0,
        transactions: 0,
        bankAccounts: 0,
        settings: 0
    };

    // ====================================
    // CHART OF ACCOUNTS
    // ====================================

    const accounts = [
        // ASSETS
        { name: 'Assets', type: 'asset', parentId: null, number: '1000' },
        { name: 'Current Assets', type: 'asset', parentNumber: '1000', number: '1100' },
        { name: 'Cash - Operating', type: 'asset', parentNumber: '1100', number: '1110', opening: 50000 },
        { name: 'Cash - Savings', type: 'asset', parentNumber: '1100', number: '1120', opening: 25000 },
        { name: 'Accounts Receivable', type: 'asset', parentNumber: '1100', number: '1200', opening: 15000 },
        { name: 'Prepaid Expenses', type: 'asset', parentNumber: '1100', number: '1300', opening: 2000 },

        { name: 'Fixed Assets', type: 'asset', parentNumber: '1000', number: '1400' },
        { name: 'Equipment', type: 'asset', parentNumber: '1400', number: '1410', opening: 35000 },
        { name: 'Furniture & Fixtures', type: 'asset', parentNumber: '1400', number: '1420', opening: 15000 },
        { name: 'Accumulated Depreciation', type: 'asset', parentNumber: '1400', number: '1490', opening: -10000 },

        // LIABILITIES
        { name: 'Liabilities', type: 'liability', parentId: null, number: '2000' },
        { name: 'Current Liabilities', type: 'liability', parentNumber: '2000', number: '2100' },
        { name: 'Accounts Payable', type: 'liability', parentNumber: '2100', number: '2110', opening: 8000 },
        { name: 'Credit Card Payable', type: 'liability', parentNumber: '2100', number: '2120', opening: 3500 },
        { name: 'Payroll Liabilities', type: 'liability', parentNumber: '2100', number: '2130', opening: 2000 },

        { name: 'Long-term Liabilities', type: 'liability', parentNumber: '2000', number: '2200' },
        { name: 'Bank Loan', type: 'liability', parentNumber: '2200', number: '2210', opening: 50000 },

        // EQUITY
        { name: 'Equity', type: 'equity', parentId: null, number: '3000' },
        { name: 'Owner\'s Equity', type: 'equity', parentNumber: '3000', number: '3100', opening: 100000 },
        { name: 'Retained Earnings', type: 'equity', parentNumber: '3000', number: '3200', opening: 20000 },

        // REVENUE
        { name: 'Revenue', type: 'revenue', parentId: null, number: '4000' },
        { name: 'Sales Revenue', type: 'revenue', parentNumber: '4000', number: '4100' },
        { name: 'Service Revenue', type: 'revenue', parentNumber: '4000', number: '4200' },
        { name: 'Interest Income', type: 'revenue', parentNumber: '4000', number: '4300' },

        // EXPENSES
        { name: 'Expenses', type: 'expense', parentId: null, number: '5000' },

        { name: 'Operating Expenses', type: 'expense', parentNumber: '5000', number: '5100' },
        { name: 'Rent Expense', type: 'expense', parentNumber: '5100', number: '5110' },
        { name: 'Utilities - Electric', type: 'expense', parentNumber: '5100', number: '5121' },
        { name: 'Utilities - Water', type: 'expense', parentNumber: '5100', number: '5122' },
        { name: 'Utilities - Internet', type: 'expense', parentNumber: '5100', number: '5123' },
        { name: 'Utilities - Phone', type: 'expense', parentNumber: '5100', number: '5124' },
        { name: 'Office Supplies', type: 'expense', parentNumber: '5100', number: '5130' },
        { name: 'Insurance', type: 'expense', parentNumber: '5100', number: '5140' },

        { name: 'Payroll Expenses', type: 'expense', parentNumber: '5000', number: '5200' },
        { name: 'Salaries & Wages', type: 'expense', parentNumber: '5200', number: '5210' },
        { name: 'Payroll Taxes', type: 'expense', parentNumber: '5200', number: '5220' },
        { name: 'Employee Benefits', type: 'expense', parentNumber: '5200', number: '5230' },

        { name: 'Marketing & Advertising', type: 'expense', parentNumber: '5000', number: '5300' },
        { name: 'Professional Services', type: 'expense', parentNumber: '5000', number: '5400' },
        { name: 'Legal Fees', type: 'expense', parentNumber: '5400', number: '5410' },
        { name: 'Accounting Fees', type: 'expense', parentNumber: '5400', number: '5420' },

        { name: 'Travel & Entertainment', type: 'expense', parentNumber: '5000', number: '5500' },
        { name: 'Meals & Entertainment', type: 'expense', parentNumber: '5500', number: '5510' },
        { name: 'Travel Expenses', type: 'expense', parentNumber: '5500', number: '5520' },

        { name: 'Vehicle Expenses', type: 'expense', parentNumber: '5000', number: '5600' },
        { name: 'Gas & Fuel', type: 'expense', parentNumber: '5600', number: '5610' },
        { name: 'Vehicle Maintenance', type: 'expense', parentNumber: '5600', number: '5620' },

        { name: 'Depreciation Expense', type: 'expense', parentNumber: '5000', number: '5700' },
        { name: 'Interest Expense', type: 'expense', parentNumber: '5000', number: '5800' },
        { name: 'Bank Fees', type: 'expense', parentNumber: '5000', number: '5900' },
        { name: 'Miscellaneous Expense', type: 'expense', parentNumber: '5000', number: '5990' }
    ];

    // Create account hierarchy
    const accountMap = {};

    for (const acc of accounts) {
        const parent = acc.parentNumber ?
            Object.values(accountMap).find(a => a.accountNumber === acc.parentNumber) :
            null;

        const account = await window.storage.createAccount({
            name: acc.name,
            accountNumber: acc.number,
            type: acc.type,
            parentId: parent ? parent.id : null,
            openingBalance: acc.opening || 0,
            active: true
        });

        accountMap[acc.number] = account;
        counts.accounts++;
    }

    // ====================================
    // VENDORS
    // ====================================

    const vendors = [
        { name: 'Office Depot', category: 'Office Supplies' },
        { name: 'Staples', category: 'Office Supplies' },
        { name: 'Amazon Business', category: 'General' },
        { name: 'Pacific Gas & Electric', category: 'Utilities' },
        { name: 'Water Department', category: 'Utilities' },
        { name: 'Comcast Business', category: 'Utilities' },
        { name: 'Verizon Wireless', category: 'Utilities' },
        { name: 'Property Management Co', category: 'Rent' },
        { name: 'Starbucks', category: 'Meals & Entertainment' },
        { name: 'Joe\'s Diner', category: 'Meals & Entertainment' },
        { name: 'Delta Airlines', category: 'Travel' },
        { name: 'Hilton Hotels', category: 'Travel' },
        { name: 'Shell Gas Station', category: 'Vehicle' },
        { name: 'AutoZone', category: 'Vehicle' },
        { name: 'State Farm Insurance', category: 'Insurance' },
        { name: 'Smith & Associates Law', category: 'Professional Services' },
        { name: 'Johnson CPA Firm', category: 'Professional Services' },
        { name: 'Google Ads', category: 'Marketing' },
        { name: 'Facebook Ads', category: 'Marketing' },
        { name: 'Client ABC Corp', category: 'Customer' },
        { name: 'Client XYZ LLC', category: 'Customer' },
        { name: 'Best Bank', category: 'Banking' },
        { name: 'FirstCard Credit', category: 'Banking' }
    ];

    const vendorMap = {};
    for (const v of vendors) {
        const vendor = await window.storage.createVendor(v);
        vendorMap[v.name] = vendor;
        counts.vendors++;
    }

    // ====================================
    // BANK ACCOUNTS
    // ====================================

    const bankAccounts = [
        { name: 'Business Checking', accountNumber: '****1234', type: 'checking', balance: 50000 },
        { name: 'Business Savings', accountNumber: '****5678', type: 'savings', balance: 25000 },
        { name: 'Business Credit Card', accountNumber: '****9012', type: 'credit', balance: -3500 }
    ];

    const bankAccountMap = {};
    for (const ba of bankAccounts) {
        const account = await window.storage.createBankAccount(ba);
        bankAccountMap[ba.name] = account;
        counts.bankAccounts++;
    }

    // ====================================
    // TRANSACTIONS
    // ====================================

    const now = new Date();
    const threeMonthsAgo = new Date(now);
    threeMonthsAgo.setMonth(now.getMonth() - 3);

    const sampleTransactions = [
        // Monthly recurring - Rent
        ...Array.from({ length: 3 }, (_, i) => ({
            date: new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 1),
            description: 'Monthly Rent Payment',
            amount: 3500,
            type: 'debit',
            vendor: 'Property Management Co',
            account: '5110',
            category: 'Rent'
        })),

        // Monthly recurring - Utilities
        ...Array.from({ length: 3 }, (_, i) => ({
            date: new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 5),
            description: 'Electric Bill',
            amount: 250 + Math.random() * 100,
            type: 'debit',
            vendor: 'Pacific Gas & Electric',
            account: '5121',
            category: 'Utilities'
        })),

        ...Array.from({ length: 3 }, (_, i) => ({
            date: new Date(threeMonthsAgo.getFullYear(), threeMonthsAgo.getMonth() + i, 10),
            description: 'Internet Service',
            amount: 99.99,
            type: 'debit',
            vendor: 'Comcast Business',
            account: '5123',
            category: 'Utilities'
        })),

        // Office supplies
        { date: new Date(2024, 9, 15), description: 'Office supplies - pens, paper, folders', amount: 127.50, type: 'debit', vendor: 'Office Depot', account: '5130', category: 'Office Supplies' },
        { date: new Date(2024, 10, 5), description: 'Printer cartridges', amount: 89.99, type: 'debit', vendor: 'Staples', account: '5130', category: 'Office Supplies' },
        { date: new Date(2024, 11, 12), description: 'Office furniture - desk chair', amount: 349.00, type: 'debit', vendor: 'Amazon Business', account: '5130', category: 'Office Supplies' },

        // Client payments (revenue)
        { date: new Date(2024, 9, 20), description: 'October services - Invoice #1001', amount: 5000, type: 'credit', vendor: 'Client ABC Corp', account: '4200', category: 'Service Revenue' },
        { date: new Date(2024, 10, 15), description: 'November services - Invoice #1002', amount: 4500, type: 'credit', vendor: 'Client XYZ LLC', account: '4200', category: 'Service Revenue' },
        { date: new Date(2024, 11, 10), description: 'December services - Invoice #1003', amount: 6200, type: 'credit', vendor: 'Client ABC Corp', account: '4200', category: 'Service Revenue' },

        // Meals & Entertainment
        { date: new Date(2024, 9, 12), description: 'Client lunch meeting', amount: 87.50, type: 'debit', vendor: 'Joe\'s Diner', account: '5510', category: 'Meals' },
        { date: new Date(2024, 10, 8), description: 'Team coffee', amount: 32.50, type: 'debit', vendor: 'Starbucks', account: '5510', category: 'Meals' },
        { date: new Date(2024, 11, 18), description: 'Holiday party', amount: 450.00, type: 'debit', vendor: 'Joe\'s Diner', account: '5510', category: 'Meals' },

        // Travel
        { date: new Date(2024, 10, 3), description: 'Round trip to NYC - Conference', amount: 487.00, type: 'debit', vendor: 'Delta Airlines', account: '5520', category: 'Travel' },
        { date: new Date(2024, 10, 3), description: 'Hotel Nov 3-5', amount: 580.00, type: 'debit', vendor: 'Hilton Hotels', account: '5520', category: 'Travel' },

        // Vehicle
        { date: new Date(2024, 9, 8), description: 'Fuel', amount: 65.00, type: 'debit', vendor: 'Shell Gas Station', account: '5610', category: 'Vehicle' },
        { date: new Date(2024, 10, 12), description: 'Fuel', amount: 72.50, type: 'debit', vendor: 'Shell Gas Station', account: '5610', category: 'Vehicle' },
        { date: new Date(2024, 11, 7), description: 'Fuel', amount: 68.00, type: 'debit', vendor: 'Shell Gas Station', account: '5610', category: 'Vehicle' },
        { date: new Date(2024, 10, 20), description: 'Oil change & tire rotation', amount: 89.99, type: 'debit', vendor: 'AutoZone', account: '5620', category: 'Vehicle' },

        // Insurance
        { date: new Date(2024, 9, 1), description: 'Q4 Business Insurance', amount: 1250, type: 'debit', vendor: 'State Farm Insurance', account: '5140', category: 'Insurance' },

        // Professional services
        { date: new Date(2024, 10, 30), description: 'Contract review', amount: 750, type: 'debit', vendor: 'Smith & Associates Law', account: '5410', category: 'Legal' },
        { date: new Date(2024, 11, 15), description: 'Q4 Tax preparation', amount: 1200, type: 'debit', vendor: 'Johnson CPA Firm', account: '5420', category: 'Accounting' },

        // Marketing
        { date: new Date(2024, 9, 1), description: 'October Google Ads', amount: 850, type: 'debit', vendor: 'Google Ads', account: '5300', category: 'Marketing' },
        { date: new Date(2024, 10, 1), description: 'November Google Ads', amount: 920, type: 'debit', vendor: 'Google Ads', account: '5300', category: 'Marketing' },
        { date: new Date(2024, 11, 1), description: 'December Google Ads', amount: 1100, type: 'debit', vendor: 'Google Ads', account: '5300', category: 'Marketing' },

        // Bank fees
        { date: new Date(2024, 9, 30), description: 'Monthly service fee', amount: 15, type: 'debit', vendor: 'Best Bank', account: '5900', category: 'Bank Fees' },
        { date: new Date(2024, 10, 30), description: 'Monthly service fee', amount: 15, type: 'debit', vendor: 'Best Bank', account: '5900', category: 'Bank Fees' },
        { date: new Date(2024, 11, 30), description: 'Monthly service fee', amount: 15, type: 'debit', vendor: 'Best Bank', account: '5900', category: 'Bank Fees' }
    ];

    for (const txn of sampleTransactions) {
        await window.storage.createTransaction({
            date: txn.date.toISOString(),
            description: txn.description,
            amount: Math.round(txn.amount * 100) / 100, // Round to 2 decimals
            type: txn.type,
            vendorId: vendorMap[txn.vendor]?.id || null,
            accountId: accountMap[txn.account]?.id || null,
            category: txn.category,
            bankAccountId: bankAccountMap['Business Checking']?.id || null,
            reconciled: false,
            notes: ''
        });
        counts.transactions++;
    }

    // ====================================
    // SETTINGS
    // ====================================

    await window.storage.updateSettings({
        companyName: 'My Business Inc',
        fiscalYearEnd: '12-31',
        currency: 'USD',
        theme: 'light',
        fontSize: 16,
        locale: 'en-US'
    });
    counts.settings = 1;

    console.log('🌱 Database seeded successfully:', counts);
    return counts;
}

// Export
if (typeof window !== 'undefined') {
    window.seedDatabase = seedDatabase;
}
