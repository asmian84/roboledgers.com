/**
 * MANUAL CLEANUP SCRIPT - v14
 * Copy and paste this entire script into your browser console (F12)
 * to immediately clean all "Invalid Number" entries from your data.
 */

(function () {
    console.log('%c🔧 MANUAL DATA CLEANUP STARTING...', 'background: #dc2626; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

    let totalFixed = 0;

    // 1. CLEAN CHART OF ACCOUNTS
    try {
        const rawCOA = localStorage.getItem('ab3_custom_coa');
        if (rawCOA) {
            let coa = JSON.parse(rawCOA);
            const before = coa.length;
            coa = coa.filter(a => !a.name?.toLowerCase().includes('invalid'));
            localStorage.setItem('ab3_custom_coa', JSON.stringify(coa));
            console.log(`✅ COA: Removed ${before - coa.length} invalid entries`);
            totalFixed += (before - coa.length);
        }
    } catch (e) {
        console.error('❌ COA cleanup failed:', e);
    }

    // 2. CLEAN TRANSACTION DATA
    try {
        const rawTxn = localStorage.getItem('ab3_transactions');
        if (rawTxn) {
            let txns = JSON.parse(rawTxn);
            let fixed = 0;

            txns = txns.map(t => {
                const hasInvalid =
                    t.accountDescription?.toLowerCase().includes('invalid') ||
                    t.category?.toLowerCase().includes('invalid');

                if (hasInvalid) {
                    console.log(`🧹 Fixing: ${t.description}`);
                    fixed++;
                    return {
                        ...t,
                        accountDescription: 'Uncategorized',
                        category: 'Uncategorized'
                    };
                }
                return t;
            });

            localStorage.setItem('ab3_transactions', JSON.stringify(txns));
            console.log(`✅ Transactions: Fixed ${fixed} entries`);
            totalFixed += fixed;
        }
    } catch (e) {
        console.error('❌ Transaction cleanup failed:', e);
    }

    console.log(`\n%c🎉 CLEANUP COMPLETE! Fixed ${totalFixed} total entries`, 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log('%c⚠️ Now refresh the page (F5) to see the changes', 'background: #f59e0b; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
})();
