// Two-way sync helper methods for VendorGrid
// Add to end of transaction-grid.js before closing VendorGrid

VendorGrid.getCategoryFromAccount = function (accountCode, accountName) {
    const name = (accountName || '').toLowerCase();
    const code = accountCode || '';

    // Map account codes to categories
    if (code === '8600' || name.includes('office supplies') || name.includes('postage')) return 'Office Supplies';
    if (code === '6415' || name.includes('client meal') || name.includes('entertainment')) return 'Meals & Entertainment';
    if (code === '7700' || name.includes('bank') || name.includes('interest')) return 'Bank Fees';
    if (code === '1855' || code === '1857' || name.includes('software') || name.includes('computer')) return 'Technology';
    if (code === '9500' || name.includes('utilities') || name.includes('electric')) return 'Utilities';
    if (code === '7400' || name.includes('fuel') || name.includes('oil')) return 'Auto & Fuel';
    if (code === '7600' || name.includes('insurance')) return 'Insurance';
    if (code === '8700' || name.includes('professional') || name.includes('accounting')) return 'Professional Services';
    if (code === '9200' || name.includes('travel') || name.includes('accommodation')) return 'Travel';
    if (code === '6000' || name.includes('advertising') || name.includes('marketing')) return 'Advertising';
    if (code === '6800' || name.includes('dues') || name.includes('membership')) return 'Memberships';
    if (code === '9800' || name.includes('wages') || name.includes('salary')) return 'Payroll';
    if (code === '7890' || name.includes('legal')) return 'Legal';
    if (code === '9100' || name.includes('telephone') || name.includes('phone')) return 'Telephone';
    if (code === '8720' || name.includes('rent') || name.includes('lease')) return 'Rent';

    return 'General';
};

VendorGrid.getAccountFromCategory = function (category) {
    if (!category) return null;

    const categoryMap = {
        'Office Supplies': '8600',
        'Meals & Entertainment': '6415',
        'Bank Fees': '7700',
        'Technology': '7700',
        'Utilities': '9500',
        'Auto & Fuel': '7400',
        'Insurance': '7600',
        'Professional Services': '8700',
        'Travel': '9200',
        'Advertising': '6000',
        'Memberships': '6800',
        'Payroll': '9800',
        'Legal': '7890',
        'Telephone': '9100',
        'Rent': '8720',
        'General': '9970'
    };

    return categoryMap[category] || null;
};
