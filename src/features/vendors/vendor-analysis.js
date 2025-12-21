
/**
 * Vendor Analysis Engine
 * Responsible for grouping vendors and determining "Smart Account Choices"
 */

window.VendorAnalysis = {

    /**
     * Groups transactions by Normalized Vendor Name
     * @param {Array} transactions 
     * @returns {Array} List of grouped vendor objects
     */
    groupTransactions: function (transactions) {
        if (!window.VendorEngine) {
            console.error("VendorEngine required for normalization");
            return [];
        }

        const groups = {};

        transactions.forEach(txn => {
            const rawName = txn.description;
            // Use VendorEngine to normalize (remove numbers, common suffixes)
            const cleanName = window.VendorEngine.normalize(rawName);

            if (!groups[cleanName]) {
                groups[cleanName] = {
                    name: cleanName,
                    count: 0,
                    accountIds: {}, // Map of accountId -> count
                    originalRows: []
                };
            }

            const g = groups[cleanName];
            g.count++;
            g.originalRows.push(txn);

            // Track account usage for this specific group/session
            if (txn.accountId) {
                g.accountIds[txn.accountId] = (g.accountIds[txn.accountId] || 0) + 1;
            }
        });

        // Convert to array and sort by count (desc) to show biggest impact first
        return Object.values(groups).sort((a, b) => b.count - a.count);
    },

    /**
     * Determines the "Best Match" account for a vendor group
     * based on current grid data + historical data (future)
     */
    getSuggestedAccount: function (group) {
        // 1. Check current breakdown
        let bestId = null;
        let maxCount = -1;

        for (const [accId, count] of Object.entries(group.accountIds)) {
            if (count > maxCount) {
                maxCount = count;
                bestId = accId;
            }
        }

        return bestId || ''; // Return ID or empty
    }
};
