// Pattern Testing Script - Paste this in console to debug categorization

console.log('========== PATTERN TEST ==========');

const testVendors = [
    'Misc Payment PAY-FILE FEES',
    'Misc Payment Pay File Fees',
    'Bill Payment PAY-FILE FEES',
    'Loan Interest NO.78783249 001',
    'LOAN INTEREST',
    'LOAN PAYMENT',
    'LOAN CREDIT',
    'Misc Payment WCB ALBERTA',
    'WCB',
    'Mobile cheque deposit - 8094',
    'ATB Mobile Deposit'
];

testVendors.forEach(vendorName => {
    const normalizedName = VendorNameUtils.normalizeVendorName(vendorName);
    const account = VendorAI.suggestAccount(normalizedName, '', 'chequing');

    console.log(`\n"${vendorName}"`);
    console.log(`  → Normalized: "${normalizedName}"`);
    console.log(`  → Account: ${account ? account.code + ' (' + account.name + ')' : 'NONE (9970)'}`);
    console.log(`  → Expected: ${/pay[-\s]?file/i.test(vendorName) ? '7700 (Interest)' :
            /loan.*interest/i.test(vendorName) ? '7700 (Interest)' :
                /loan\s*payment/i.test(vendorName) ? '2710 (Loan)' :
                    /wcb/i.test(vendorName) ? '9750 (WCB)' :
                        /mobile.*deposit/i.test(vendorName) ? '4001 (Sales)' : 'Unknown'
        }`);
});

console.log('\n========== END TEST ==========');
