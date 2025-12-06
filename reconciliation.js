// Bank Reconciliation Manager

const ReconciliationManager = {
    openingBalance: 0,
    endingBalance: 0,
    openingDate: null,
    endingDate: null,

    // Calculate balances from transactions
    calculateBalances(transactions) {
        if (!transactions || transactions.length === 0) {
            return {
                openingBalance: 0,
                endingBalance: 0,
                openingDate: null,
                endingDate: null
            };
        }

        // Sort by date
        const sorted = [...transactions].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA - dateB;
        });

        // Calculate running balance through transactions
        let runningBalance = 0;
        const balances = sorted.map(t => {
            // Debits increase balance (money in)
            // Credits decrease balance (money out)
            runningBalance += (t.debits || 0) - (t.credits || 0);

            return {
                date: t.date,
                balance: runningBalance,
                transaction: t
            };
        });

        // Opening balance is before first transaction
        // Ending balance is after last transaction
        const opening = sorted.length > 0 ? balances[0] : null;
        const ending = sorted.length > 0 ? balances[balances.length - 1] : null;

        return {
            openingBalance: 0, // Starting point
            endingBalance: ending ? ending.balance : 0,
            openingDate: opening ? opening.date : null,
            endingDate: ending ? ending.date : null,
            runningBalances: balances
        };
    },

    // Validate reconciliation
    validateReconciliation(expected, calculated) {
        const discrepancy = calculated - expected;

        return {
            expected: expected,
            calculated: calculated,
            discrepancy: discrepancy,
            isBalanced: Math.abs(discrepancy) < 0.01, // Within 1 cent
            status: Math.abs(discrepancy) < 0.01 ? 'balanced' : 'discrepancy'
        };
    },

    // Get reconciliation summary
    getReconciliationData(transactions, expectedOpening = null, expectedEnding = null) {
        const calculated = this.calculateBalances(transactions);

        let openingValidation = null;
        let endingValidation = null;

        if (expectedOpening !== null) {
            openingValidation = this.validateReconciliation(expectedOpening, calculated.openingBalance);
        }

        if (expectedEnding !== null) {
            endingValidation = this.validateReconciliation(expectedEnding, calculated.endingBalance);
        }

        return {
            calculated: calculated,
            opening: openingValidation,
            ending: endingValidation,
            totalTransactions: transactions.length,
            totalDebits: transactions.reduce((sum, t) => sum + (t.debits || 0), 0),
            totalCredits: transactions.reduce((sum, t) => sum + (t.credits || 0), 0)
        };
    },

    // Format currency for display
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(amount);
    },

    // Format date for display
    formatDate(dateStr) {
        if (!dateStr) return 'N/A';
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
};
