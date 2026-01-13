/**
 * Data Integrity & Sanitization Utility (RoboLedgers v13)
 * Automatically scrubs corrupted or "Invalid" entries from local storage
 * to ensure application stability and UI cleanliness.
 */

(function () {
    'use strict';

    // console.log('%c🛡️ DATA INTEGRITY SHIELD ACTIVE', 'background: #059669; color: white; padding: 2px 6px; border-radius: 4px; font-weight: bold;');

    const STORAGE_KEY = 'ab3_custom_coa';

    /**
     * Deep Scrub: Identifies and removes corrupted account entries
     */
    function performDeepScrub() {
        try {
            let cleaned = false;

            // 1. SCRUB CHART OF ACCOUNTS
            const rawCOA = localStorage.getItem(STORAGE_KEY);
            if (rawCOA && rawCOA !== 'undefined') {
                let customCoa = JSON.parse(rawCOA);
                if (Array.isArray(customCoa)) {
                    const originalCount = customCoa.length;

                    customCoa = customCoa.filter(acc => {
                        const name = (acc.name || '').toString().toLowerCase();
                        const code = (acc.code || '').toString().toLowerCase();

                        const isInvalid = name.includes('invalid') || code.includes('invalid');

                        if (isInvalid) {
                            console.warn(`🧹 Purging corrupted COA entry:`, acc);
                        }

                        return !isInvalid;
                    });

                    if (customCoa.length !== originalCount) {
                        console.log(`✅ Cleaned ${originalCount - customCoa.length} corrupted COA entries`);
                        localStorage.setItem(STORAGE_KEY, JSON.stringify(customCoa));
                        cleaned = true;
                    }
                }
            }

            // 2. SCRUB TRANSACTION DATA (Critical Fix!)
            const txnKey = 'ab3_transactions';
            const rawTxn = localStorage.getItem(txnKey);
            if (rawTxn && rawTxn !== 'undefined') {
                let transactions = JSON.parse(rawTxn);
                if (Array.isArray(transactions)) {
                    const originalCount = transactions.length;
                    let fixedCount = 0;

                    transactions = transactions.map(txn => {
                        // Check accountDescription and category fields
                        const accountDesc = (txn.accountDescription || '').toString().toLowerCase();
                        const category = (txn.category || '').toString().toLowerCase();

                        if (accountDesc.includes('invalid') || category.includes('invalid')) {
                            console.warn(`🧹 Sanitizing transaction:`, txn.description, '- Setting account to Uncategorized');
                            fixedCount++;
                            return {
                                ...txn,
                                accountDescription: 'Uncategorized',
                                category: 'Uncategorized'
                            };
                        }
                        return txn;
                    });

                    if (fixedCount > 0) {
                        // console.log(`✅ Sanitized ${fixedCount} transactions with invalid account data`);
                        localStorage.setItem(txnKey, JSON.stringify(transactions));
                        cleaned = true;
                    }
                }
            }

            // Trigger a refresh if the grid API is available
            if (cleaned) {
                // console.log('🔄 Data cleaned! Refreshing grids...');

                if (window.accountsGridApi && typeof initAccountsGrid === 'function') {
                    initAccountsGrid();
                }

                if (window.transactionsGridApi && typeof initTransactionsGrid === 'function') {
                    initTransactionsGrid();
                }
            }
        } catch (e) {
            console.error('❌ Data integrity scrub failed:', e);
        }
    }

    // Run immediately on script load
    performDeepScrub();

    // Export as global for manual trigger if needed
    window.DataIntegrity = {
        scrub: performDeepScrub
    };
})();
