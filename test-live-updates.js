/**
 * TEST SCRIPT: Simulate Live AI Updates
 * Run this in the console to verify GridStream and Pop-Out syncing.
 */
(function () {
    console.log('🚀 Starting Live Update Simulation...');

    const transactions = TransactionGrid.getTransactions();
    if (transactions.length === 0) {
        console.warn('⚠️ No transactions found. Load data first.');
        return;
    }

    let count = 0;
    const maxUpdates = 5;

    const interval = setInterval(() => {
        if (count >= maxUpdates) {
            clearInterval(interval);
            console.log('✅ Simulation Complete.');
            return;
        }

        // Pick a random transaction
        const randomIndex = Math.floor(Math.random() * transactions.length);
        const original = transactions[randomIndex];

        // Clone and modify
        const updated = { ...original };

        // Simulate AI categorization
        const accounts = AccountAllocator.getAllAccounts();
        const distinctAccounts = accounts.filter(a => a.code !== original.allocatedAccount);
        const randomAccount = distinctAccounts[Math.floor(Math.random() * distinctAccounts.length)];

        updated.allocatedAccount = randomAccount.code;
        updated.allocatedAccountName = randomAccount.name;
        updated.status = 'ai_match'; // Change status to show AI did it

        console.log(`🤖 AI Update [${count + 1}/${maxUpdates}]: Transaction #${updated.ref} -> ${updated.allocatedAccountName}`);

        // Push to Stream
        if (window.GridStream) {
            GridStream.pushUpdate(updated);
        } else {
            console.error('❌ GridStream not found!');
        }

        count++;
    }, 2000); // Update every 2 seconds

    console.log('👀 Watch the grid for GREEN flashes!');
})();
