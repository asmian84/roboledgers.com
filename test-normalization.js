// TEST: What does normalization do to WCB?
console.log('=== NORMALIZATION TEST ===');

const testNames = [
    'Misc Payment WCB ALBERTA',
    'Misc Payment Sec Reg Fee',
    'Misc Payment PAY-FILE 1mm Srch'
];

if (typeof VendorAI !== 'undefined') {
    testNames.forEach(name => {
        const normalized = VendorAI.normalizeVendorName(name);
        const suggested = VendorAI.suggestAccount(normalized);
        console.log(`Original: "${name}"`);
        console.log(`  Normalized: "${normalized}"`);
        console.log(`  Account: ${suggested ? suggested.code + ' - ' + suggested.name : 'NULL'}`);
        console.log('');
    });
}
