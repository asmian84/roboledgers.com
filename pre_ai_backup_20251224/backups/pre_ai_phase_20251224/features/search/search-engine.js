/**
 * Global Search Engine
 * Fuzzy search across transactions, vendors, and accounts
 */

class SearchEngine {
    constructor() {
        this.minScore = 0.3; // Minimum relevance score (0-1)
    }

    /**
     * Search across all data types
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Object} Categorized results
     */
    async search(query, options = {}) {
        if (!query || query.length < 2) {
            return { transactions: [], vendors: [], accounts: [] };
        }

        const normalizedQuery = query.toLowerCase().trim();
        const limit = options.limit || 10;

        // Get data from storage
        const [transactions, vendors, accounts] = await Promise.all([
            this.getTransactions(),
            this.getVendors(),
            this.getAccounts()
        ]);

        return {
            transactions: this.searchTransactions(transactions, normalizedQuery, limit),
            vendors: this.searchVendors(vendors, normalizedQuery, limit),
            accounts: this.searchAccounts(accounts, normalizedQuery, limit),
            query: query
        };
    }

    /**
     * Search transactions
     */
    searchTransactions(transactions, query, limit) {
        const results = transactions
            .map(txn => ({
                ...txn,
                score: this.scoreTransaction(txn, query)
            }))
            .filter(txn => txn.score > this.minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return results;
    }

    /**
     * Search vendors
     */
    searchVendors(vendors, query, limit) {
        const results = vendors
            .map(vendor => ({
                ...vendor,
                score: this.scoreVendor(vendor, query)
            }))
            .filter(v => v.score > this.minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return results;
    }

    /**
     * Search accounts
     */
    searchAccounts(accounts, query, limit) {
        const results = accounts
            .map(account => ({
                ...account,
                score: this.scoreAccount(account, query)
            }))
            .filter(a => a.score > this.minScore)
            .sort((a, b) => b.score - a.score)
            .slice(0, limit);

        return results;
    }

    /**
     * Score a transaction's relevance to query
     */
    scoreTransaction(txn, query) {
        let score = 0;

        // Description match (highest weight)
        if (txn.description) {
            const descLower = txn.description.toLowerCase();
            if (descLower === query) score += 1.0; // Exact match
            else if (descLower.startsWith(query)) score += 0.8; // Starts with
            else if (descLower.includes(query)) score += 0.6; // Contains
            else score += this.fuzzyMatch(descLower, query) * 0.4; // Fuzzy
        }

        // Vendor match
        if (txn.vendor) {
            const vendorLower = txn.vendor.toLowerCase();
            if (vendorLower.includes(query)) score += 0.3;
        }

        // Category/Account match
        if (txn.category && txn.category.toLowerCase().includes(query)) {
            score += 0.2;
        }

        // Amount match (if query is numeric)
        if (!isNaN(query) && txn.amount) {
            const amountStr = String(txn.amount);
            if (amountStr.includes(query)) score += 0.2;
        }

        return Math.min(score, 1.0); // Cap at 1.0
    }

    /**
     * Score a vendor's relevance to query
     */
    scoreVendor(vendor, query) {
        let score = 0;

        // Name/description match
        const name = (vendor.description || vendor.name || '').toLowerCase();
        if (name === query) score += 1.0;
        else if (name.startsWith(query)) score += 0.8;
        else if (name.includes(query)) score += 0.6;
        else score += this.fuzzyMatch(name, query) * 0.4;

        // Account number match
        if (vendor.accountNumber && vendor.accountNumber.includes(query)) {
            score += 0.3;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Score an account's relevance to query
     */
    scoreAccount(account, query) {
        let score = 0;

        // Account name match
        if (account.name) {
            const nameLower = account.name.toLowerCase();
            if (nameLower === query) score += 1.0;
            else if (nameLower.startsWith(query)) score += 0.8;
            else if (nameLower.includes(query)) score += 0.6;
            else score += this.fuzzyMatch(nameLower, query) * 0.4;
        }

        // Account code/number match
        if (account.code && account.code.toLowerCase().includes(query)) {
            score += 0.5;
        }
        if (account.accountNumber && account.accountNumber.includes(query)) {
            score += 0.5;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Simple fuzzy matching algorithm
     * Returns score 0-1 based on how many characters match in order
     */
    fuzzyMatch(text, query) {
        let queryIndex = 0;
        let matches = 0;

        for (let i = 0; i < text.length && queryIndex < query.length; i++) {
            if (text[i] === query[queryIndex]) {
                matches++;
                queryIndex++;
            }
        }

        return matches / query.length;
    }

    /**
     * Get transactions from storage
     */
    async getTransactions() {
        if (window.storage && window.storage.getTransactions) {
            return await window.storage.getTransactions();
        }
        return [];
    }

    /**
     * Get vendors from storage
     */
    async getVendors() {
        if (window.storage && window.storage.getVendors) {
            return await window.storage.getVendors();
        }
        return [];
    }

    /**
     * Get accounts from storage
     */
    async getAccounts() {
        if (window.storage && window.storage.getAccounts) {
            return await window.storage.getAccounts();
        }
        return [];
    }
}

// Create global instance
window.searchEngine = new SearchEngine();

console.log('🔍 Search Engine loaded');
