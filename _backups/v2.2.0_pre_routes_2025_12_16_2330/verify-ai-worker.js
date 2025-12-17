/**
 * VERIFICATION SCRIPT: Test Always-On AI
 * 1. Finds an 'Unusual item' transaction.
 * 2. Adds a new Vendor Rule for it.
 * 3. Waits for AI Worker to pick it up (max 5s).
 */
(async function verifyAI() {
    console.log('🧪 Starting AI Worker Verification...');

    // 1. Find a target
    const targetTx = TransactionGrid.transactions.find(t => t.allocatedAccount === '9970');
    if (!targetTx) {
        console.warn('⚠️ No "Unusual item" (9970) transactions found to test with.');
        return;
    }

    console.log(`🎯 Target Transaction: "${targetTx.payee}" (Currently: ${targetTx.allocatedAccountName})`);

    // 2. Add a new rule
    // We mock the VendorMatcher.matchPayee to return a new vendor for this payee
    // In a real scenario, the user would add this via the Vendor Dictionary UI
    const newVendor = {
        id: 'test-vendor-' + Date.now(),
        name: 'TEST VENDOR - ' + targetTx.payee,
        defaultAccount: '2101', // Visa Payable (just for test)
        defaultAccountName: 'Visa Payable',
        category: 'Test Category'
    };

    // Inject into VendorMatcher (Simulating a user adding a vendor)
    VendorMatcher.vendors.push(newVendor);

    // Force simple match for this verification script
    // (We are patching the matcher for the test, usually AIWorker uses the patterns)
    // But AIWorker calls matchPayee. Let's ensure matchPayee finds it.
    // VendorMatcher.matchPayee usually does fuzzy matching. 
    // If we add the EXACT name as vendor name, it should hit.

    console.log(`➕ Added Vendor Rule: "${newVendor.name}" -> Account 2101`);
    console.log('⏳ Waiting for AI Worker (approx 3-4s)...');

    // 3. Monitor for change
    const checkInterval = setInterval(() => {
        const currentTx = TransactionGrid.transactions.find(t => t.id === targetTx.id);

        if (currentTx.allocatedAccount === '2101') {
            console.log(`✅ SUCCESS! AI Worker updated transaction #${currentTx.ref}`);
            console.log(`   Old: 9970 (Unusual item)`);
            console.log(`   New: ${currentTx.allocatedAccount} (${currentTx.allocatedAccountName})`);
            console.log('   🎉 The Grid should have flashed GREEN!');
            clearInterval(checkInterval);
        }
    }, 500);

    // Timeout after 10s
    setTimeout(() => {
        clearInterval(checkInterval);
        const currentTx = TransactionGrid.transactions.find(t => t.id === targetTx.id);
        if (currentTx.allocatedAccount !== '2101') {
            console.error('❌ TIMEOUT: AI Worker did not update the transaction.');
        }
    }, 10000);

})();
