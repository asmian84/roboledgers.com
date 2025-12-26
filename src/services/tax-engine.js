/**
 * Tax Engine Service
 * Calculates estimated tax deductions based on expense categories.
 */
class TaxEngine {
    constructor() {
        // Deduction Rules (Simplified for North America)
        this.deductionRules = {
            'Meals & Entertainment': 0.50, // 50% Deductible
            'Travel Expenses': 1.00,       // 100% Deductible
            'Automobile Expense': 1.00,    // 100% (Simplified method)
            'Office Supplies': 1.00,
            'Software & Subscriptions': 1.00,
            'Advertising & Marketing': 1.00,
            'Bank Service Charges': 1.00,
            'Rent': 1.00,
            'Utilities': 1.00,
            'Professional Fees': 1.00
        };
        this.corporateTaxRate = 0.25; // Estimated 25% Tax Rate
    }

    /**
     * Calculate total deductible amount and estimated tax savings
     * @param {Array} transactions 
     */
    calculateTaxImpact(transactions) {
        let totalDeductible = 0;
        let potentialSavings = 0;

        // Group by category for detailed breakdown
        const breakdown = {};

        transactions.forEach(txn => {
            if (txn.type !== 'debit') return; // Only expenses

            const category = txn.category || 'Uncategorized';
            const amount = txn.amount;
            const deductiblePct = this.deductionRules[category] || 0;

            const deductibleAmount = amount * deductiblePct;
            totalDeductible += deductibleAmount;

            if (deductibleAmount > 0) {
                breakdown[category] = (breakdown[category] || 0) + deductibleAmount;
            }
        });

        potentialSavings = totalDeductible * this.corporateTaxRate;

        return {
            totalDeductible,
            potentialSavings,
            breakdown,
            effectiveRate: this.corporateTaxRate
        };
    }
}

// Global Singleton
window.TaxEngine = new TaxEngine();
