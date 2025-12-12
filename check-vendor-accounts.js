// Check actual vendor data in localStorage
console.log('=== CHECKING STORED VENDOR ACCOUNTS ===\n');

const vendors = VendorManager.getAllVendors();

// Find WCB vendors
const wcbVendors = vendors.filter(v => v.name.toLowerCase().includes('wcb'));
console.log('📋 WCB Vendors:');
wcbVendors.forEach(v => {
    console.log(`  "${v.name}" → Account: ${v.defaultAccount} (${v.defaultAccountName || 'No name'})`);
});

// Find PAY-FILE vendors
const payfileVendors = vendors.filter(v => v.name.toLowerCase().includes('pay') && v.name.toLowerCase().includes('file'));
console.log('\n📋 PAY-FILE Vendors:');
payfileVendors.forEach(v => {
    console.log(`  "${v.name}" → Account: ${v.defaultAccount} (${v.defaultAccountName || 'No name'})`);
});

// Find SEC REG vendors
const secregVendors = vendors.filter(v => v.name.toLowerCase().includes('sec') && v.name.toLowerCase().includes('reg'));
console.log('\n📋 SEC REG Vendors:');
secregVendors.forEach(v => {
    console.log(`  "${v.name}" → Account: ${v.defaultAccount} (${v.defaultAccountName || 'No name'})`);
});

console.log('\n=== SOLUTION ===');
console.log('If these vendors have wrong accounts, you need to:');
console.log('1. Click "🧠 AI Re-think" button to recategorize all vendors');
console.log('2. This will apply the correct pattern matching to update vendor accounts');
console.log('3. Then reload your transactions');
