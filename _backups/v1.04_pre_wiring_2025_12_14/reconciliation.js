// Bank Reconciliation Manager

const ReconciliationManager = {
    openingBalance: 0,
    endingBalance: 0,
    openingDate: null,
    endingDate: null,

    // Calculate balances from transactions
    calculateBalances(transactions, userOpeningBalance = 0) {
        if (!transactions || transactions.length === 0) {
            return {
                openingBalance: userOpeningBalance,
                endingBalance: userOpeningBalance,
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

        // Start with user's opening balance
        let runningBalance = userOpeningBalance;

        // Calculate running balance through transactions
        // Formula: Balance = Opening + Credits - Debits
        const balances = sorted.map(t => {
            // Credits add to balance (money in)
            // Debits subtract from balance (money out)
            // IMPORTANT: Grid uses 'debits' (plural) and 'amount' for credit
            runningBalance += (t.amount || 0) - (t.debits || 0);

            return {
                date: t.date,
                balance: runningBalance,
                transaction: t
            };
        });

        // Opening balance is the starting balance
        // Ending balance is after last transaction
        const ending = sorted.length > 0 ? balances[balances.length - 1] : null;

        return {
            openingBalance: userOpeningBalance,
            endingBalance: ending ? ending.balance : userOpeningBalance,
            openingDate: sorted[0]?.date || null,
            endingDate: sorted[sorted.length - 1]?.date || null,
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
        // Use user's expected opening balance as the starting point
        const openingValue = expectedOpening !== null ? parseFloat(expectedOpening) : 0;
        const calculated = this.calculateBalances(transactions, openingValue);

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
            totalCredits: transactions.reduce((sum, t) => sum + (t.amount || 0), 0)
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
