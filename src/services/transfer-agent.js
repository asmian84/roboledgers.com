/**
 * Transfer Agent v1.0
 * Automates the detection and reconciliation of internal transfers.
 */

window.TransferAgent = {
    // 1. Detection Rules
    keywords: [
        /transfer/i,
        /payment to/i,
        /payment from/i,
        /payment received/i,
        /tfr/i,
        /email transfer/i,
        /mb-transfer/i,
        /global transfer/i,
        /visa/i,
        /mastercard/i,
        /amex/i
    ],

    CLEARING_ACCOUNT: '9999',

    /**
     * Analyzes a single transaction to see if it looks like a transfer.
     * @param {Object} txn 
     * @returns {Object} result { isTransfer: boolean, confidence: number, type: 'out'|'in' }
     */
    detect(txn) {
        if (!txn || !txn.description) return { isTransfer: false, confidence: 0 };

        const text = txn.description.toLowerCase();
        // Check keywords
        const match = this.keywords.some(regex => regex.test(text));

        // High confidence if explicit 'transfer' keyword
        if (match) {
            return {
                isTransfer: true,
                confidence: 0.9,
                reason: 'Keyword Match'
            };
        }

        return { isTransfer: false, confidence: 0 };
    },

    /**
     * Scans all transactions to find:
     * 1. Uncategorized items that should be 'Transfer' -> '9999'
     * 2. Items already in '9999' that match each other (Zeroing out)
     */
    proposeActions(allTransactions) {
        const proposals = [];

        // 1. Find Uncategorized likely transfers
        const candidates = allTransactions.filter(t =>
            (!t.category || t.category === 'Uncategorized') &&
            this.detect(t).isTransfer
        );

        candidates.forEach(t => {
            proposals.push({
                type: 'CATEGORIZE_AS_TRANSFER',
                transaction: t,
                reason: `Matches transfer pattern: "${t.description}"`,
                action: { category: 'Transfer', accountId: this.CLEARING_ACCOUNT }
            });
        });

        return proposals;
    },

    /**
     * Check if the Clearing Account is balanced (Zero).
     * @param {Array} allTransactions 
     */
    getClearingStatus(allTransactions) {
        const clearingTxns = allTransactions.filter(t => t.category === 'Transfer' || t.accountId === this.CLEARING_ACCOUNT || t.toAccountId === this.CLEARING_ACCOUNT);

        let balance = 0;
        clearingTxns.forEach(t => {
            // Simply sum amounts (assuming signed values)
            balance += (parseFloat(t.amount) || 0);
        });

        // Use a small epsilon for float math
        const isBalanced = Math.abs(balance) < 0.01;

        return {
            balance: balance,
            isBalanced: isBalanced,
            count: clearingTxns.length
        };
    },
    /**
     * Executes the proposed transfer categorizations.
     * @param {Array} allTransactions 
     * @returns {number} count of modified transactions
     */
    executeProposals(allTransactions) {
        const proposals = this.proposeActions(allTransactions);
        if (proposals.length === 0) return 0;

        let modifiedCount = 0;
        const lookup = new Map(allTransactions.map(t => [t.id, t]));

        proposals.forEach(p => {
            const txn = lookup.get(p.transaction.id);
            if (txn) {
                // Apply the Transfer Categorization
                txn.category = 'Transfer';
                // Move it to the Clearing Account context technically, or just tag it?
                // For now, simpler: Just set Category = Transfer. 
                // The Logic in 'getClearingStatus' looks for category='Transfer' OR accountId='9999'.
                // To be robust, let's keep the source accountID but ensure category is 'Transfer'.
                // If we want to strictly move it to '9999', we change accountId.
                // Re-reading plan: "App categorizes as Transfer -> 9999 Transfer Clearing".
                // Let's stick to Category = 'Transfer' for now as that's safer than moving IDs.
                txn.category = 'Transfer';
                txn.notes = (txn.notes || '') + ' [Auto-Transfer]';
                modifiedCount++;
            }
        });

        // Save
        localStorage.setItem('ab3_transactions', JSON.stringify(allTransactions));
        return modifiedCount;
    }
};

// console.log('🕵️‍♀️ Transfer Agent Loaded');
