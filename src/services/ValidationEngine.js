/**
 * ValidationEngine.js
 * Silent, self-healing validation engine for parsed transactions
 * 
 * DESIGN PRINCIPLES:
 * 1. Auto-fix everything possible - no user prompts
 * 2. Learn from patterns (ML-ready structure)
 * 3. Fast and quiet - minimal console output
 * 4. Bank statements are predictable - rules are reliable
 */

class ValidationEngine {
    constructor() {
        // Configuration
        this.config = {
            minYear: 2015,
            maxYear: new Date().getFullYear() + 1,
            maxDescriptionLength: 150,
            minDescriptionLength: 3,
            maxReasonableAmount: 500000,
            debugMode: false // Set true for verbose logging
        };

        // Stats for learning/reporting
        this.stats = {
            processed: 0,
            datesFix: 0,
            descriptionsFix: 0,
            classificationsFix: 0,
            amountsFix: 0
        };
    }

    /**
     * Main entry point - validate and fix all transactions
     * @param {Object} parseResult - Result from parser { transactions: [], bank, accountType, etc }
     * @returns {Object} - Cleaned parseResult with fixed transactions
     */
    validate(parseResult) {
        if (!parseResult || !parseResult.transactions) {
            return parseResult;
        }

        const startTime = performance.now();
        this.stats.processed = parseResult.transactions.length;

        // Run all validators
        parseResult.transactions = parseResult.transactions.map((tx, index) => {
            tx = this.validateDate(tx, parseResult);
            tx = this.validateAmount(tx);
            tx = this.validateDescription(tx);
            tx = this.validateClassification(tx);
            return tx;
        });

        // Run transaction-level validators
        parseResult.transactions = this.validateTransactionSet(parseResult.transactions);

        const elapsed = (performance.now() - startTime).toFixed(1);

        if (this.config.debugMode) {
            console.log(`⚡ ValidationEngine: ${this.stats.processed} txns in ${elapsed}ms | Fixes: D:${this.stats.datesFix} Desc:${this.stats.descriptionsFix} Class:${this.stats.classificationsFix}`);
        }

        return parseResult;
    }

    // ==========================================
    // DATE VALIDATION
    // ==========================================
    validateDate(tx, parseResult) {
        if (!tx.date) return tx;

        // Parse the date
        const date = new Date(tx.date);
        const year = date.getFullYear();

        // Fix: Year out of range
        if (year < this.config.minYear || year > this.config.maxYear) {
            // Try to extract correct year from context
            const fixedYear = this.inferCorrectYear(parseResult);
            if (fixedYear) {
                tx.date = tx.date.replace(/\d{4}/, String(fixedYear));
                this.stats.datesFix++;
            }
        }

        // Fix: Future date (more than 7 days ahead)
        const today = new Date();
        const futureLimit = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
        if (date > futureLimit) {
            // Likely wrong year - try current year
            const corrected = new Date(tx.date);
            corrected.setFullYear(today.getFullYear());
            if (corrected <= futureLimit) {
                tx.date = corrected.toISOString().split('T')[0];
                this.stats.datesFix++;
            }
        }

        return tx;
    }

    inferCorrectYear(parseResult) {
        // Try to get year from statement metadata
        if (parseResult.statementPeriod) {
            const match = parseResult.statementPeriod.match(/20\d{2}/);
            if (match) return parseInt(match[0]);
        }
        // Default to current year
        return new Date().getFullYear();
    }

    // ==========================================
    // AMOUNT VALIDATION
    // ==========================================
    validateAmount(tx) {
        // Fix: Negative amounts (should always be positive, debit/credit determines direction)
        if (tx.debit < 0) {
            tx.debit = Math.abs(tx.debit);
            this.stats.amountsFix++;
        }
        if (tx.credit < 0) {
            tx.credit = Math.abs(tx.credit);
            this.stats.amountsFix++;
        }

        // Fix: Both debit AND credit set (should be one or other)
        if (tx.debit > 0 && tx.credit > 0) {
            // Use description to determine correct classification
            if (this.isLikelyCredit(tx.description)) {
                tx.credit = tx.debit + tx.credit;
                tx.debit = 0;
            } else {
                tx.debit = tx.debit + tx.credit;
                tx.credit = 0;
            }
            this.stats.classificationsFix++;
        }

        // Fix: Round to 2 decimal places
        tx.debit = Math.round((tx.debit || 0) * 100) / 100;
        tx.credit = Math.round((tx.credit || 0) * 100) / 100;

        return tx;
    }

    // ==========================================
    // DESCRIPTION VALIDATION
    // ==========================================
    validateDescription(tx) {
        if (!tx.description) {
            tx.description = 'Unknown Transaction';
            this.stats.descriptionsFix++;
            return tx;
        }

        let desc = tx.description;
        const originalLength = desc.length;

        // Remove gibberish patterns (e-transfer codes)
        desc = desc.replace(/\bC1A[a-zA-Z0-9]{4,}\b/gi, '');
        desc = desc.replace(/\bCA[A-Z][a-zA-Z0-9]{3,}\b/g, '');
        desc = desc.replace(/\b[a-f0-9]{16,}\b/gi, '');

        // Remove leaked dates
        desc = desc.replace(/^\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*/i, '');
        desc = desc.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+20\d{2}\b/gi, '');
        desc = desc.replace(/\b\d{1,2}\s+of\s+\d+\b/gi, '');
        desc = desc.replace(/\b20\d{2}\b/g, '');

        // Remove page references
        desc = desc.replace(/\bPage\s+\d+/gi, '');

        // Remove email patterns
        desc = desc.replace(/\b[\w]+@[\w]*\b/g, '');

        // Remove long number sequences
        desc = desc.replace(/\b\d{6,}\b/g, '');

        // Clean up extra whitespace
        desc = desc.replace(/\s+/g, ' ').trim();
        desc = desc.replace(/^[\s,\-]+|[\s,\-]+$/g, '');

        if (desc.length !== originalLength) {
            this.stats.descriptionsFix++;
        }

        tx.description = desc || 'Unknown Transaction';
        return tx;
    }

    // ==========================================
    // DEBIT/CREDIT CLASSIFICATION
    // ==========================================
    validateClassification(tx) {
        // Skip if both are zero (invalid transaction)
        if (tx.debit === 0 && tx.credit === 0 && tx.amount > 0) {
            // Use amount and description to classify
            if (this.isLikelyCredit(tx.description)) {
                tx.credit = tx.amount;
            } else {
                tx.debit = tx.amount;
            }
            this.stats.classificationsFix++;
        }

        // Verify classification makes sense
        if (tx.debit > 0 && this.isLikelyCredit(tx.description)) {
            // Swap to credit
            tx.credit = tx.debit;
            tx.debit = 0;
            this.stats.classificationsFix++;
        } else if (tx.credit > 0 && this.isLikelyDebit(tx.description)) {
            // Swap to debit
            tx.debit = tx.credit;
            tx.credit = 0;
            this.stats.classificationsFix++;
        }

        return tx;
    }

    isLikelyCredit(description) {
        if (!description) return false;
        const creditKeywords = /\b(DEPOSIT|REFUND|CREDIT|PAYROLL|RECEIVED|TRANSFER\s+FROM|INTERAC.*REC)\b/i;
        return creditKeywords.test(description);
    }

    isLikelyDebit(description) {
        if (!description) return false;
        const debitKeywords = /\b(PURCHASE|PAYMENT|WITHDRAWAL|FEE|CHARGE|SENT|TRANSFER\s+TO|SERVICE\s+CHARGE)\b/i;
        return debitKeywords.test(description);
    }

    // ==========================================
    // TRANSACTION SET VALIDATION
    // ==========================================
    validateTransactionSet(transactions) {
        // Remove exact duplicates
        const seen = new Set();
        const unique = transactions.filter(tx => {
            const key = `${tx.date}|${tx.debit}|${tx.credit}|${tx.description}`;
            if (seen.has(key)) {
                this.stats.descriptionsFix++;
                return false;
            }
            seen.add(key);
            return true;
        });

        return unique;
    }

    // ==========================================
    // STATS RESET
    // ==========================================
    resetStats() {
        this.stats = {
            processed: 0,
            datesFix: 0,
            descriptionsFix: 0,
            classificationsFix: 0,
            amountsFix: 0
        };
    }
}

// Singleton instance
window.ValidationEngine = ValidationEngine;
window.validationEngine = new ValidationEngine();
