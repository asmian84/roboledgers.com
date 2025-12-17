/* 
   New Method for TransactionGrid: reprocessAllTransactions()
   Purpose: Iterate all UNMATCHED transactions and try to match them against the loaded dictionary.
   Trigger: Call this after VendorMatcher.initialize() completes.
*/

reprocessAllTransactions() {
    console.log('🔄 Reprocessing Grid Rules against Dictionary...');
    const allTransactions = this.transactions;
    let updateCount = 0;
    const updates = [];

    allTransactions.forEach(t => {
        // Only re-check if not already manually set
        if (t.status !== 'manual' && (!t.allocatedAccount || t.status === 'unmatched')) {
            const match = VendorMatcher.matchPayee(t.payee || t.description);
            if (match && match.vendor) {
                t.allocatedAccount = match.vendor.defaultAccount;
                t.allocatedAccountName = match.vendor.defaultAccountName;
                t.vendorId = match.vendor.id;
                t.confidence = match.confidence; // 1.0
                t.status = 'auto'; // Matched!
                t.decisionReason = `Matched rule: ${match.vendor.name}`;
                updates.push(t);
                updateCount++;
            }
        }
    });

    if (updates.length > 0) {
        console.log(`✅ matched ${updateCount} transactions from dictionary.`);
        this.gridApi.applyTransaction({ update: updates });
        this.recalculateAllBalances();
    }
}
