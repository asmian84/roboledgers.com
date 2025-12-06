// Vendor Matching Engine

const VendorMatcher = {
    vendors: [],

    initialize() {
        this.vendors = Storage.loadVendors();
    },

    // Match a payee to a vendor
    matchPayee(payee) {
        if (!payee) return null;

        const normalizedPayee = Utils.normalizeString(payee);
        let bestMatch = null;
        let bestScore = 0;

        for (const vendor of this.vendors) {
            // Check exact pattern matches first
            if (vendor.matches(payee)) {
                return {
                    vendor: vendor,
                    confidence: 1.0,
                    matchType: 'pattern'
                };
            }

            // Check fuzzy match on vendor name
            const similarity = Utils.similarity(payee, vendor.name);
            if (similarity > bestScore && similarity >= 0.7) {
                bestScore = similarity;
                bestMatch = vendor;
            }
        }

        if (bestMatch) {
            return {
                vendor: bestMatch,
                confidence: bestScore,
                matchType: 'fuzzy'
            };
        }

        return null;
    },

    // Match all transactions
    matchTransactions(transactions) {
        const results = {
            matched: 0,
            unmatched: 0,
            transactions: []
        };

        for (const transaction of transactions) {
            const match = this.matchPayee(transaction.payee);

            if (match && match.confidence >= 0.7) {
                // Apply vendor and account
                transaction.vendor = match.vendor.name;
                transaction.vendorId = match.vendor.id;
                transaction.allocatedAccount = match.vendor.defaultAccount;
                transaction.allocatedAccountName = match.vendor.defaultAccountName;
                transaction.status = 'matched';
                transaction.category = match.vendor.category;

                // Update vendor match count
                match.vendor.matchCount++;
                match.vendor.lastMatched = new Date();

                results.matched++;
            } else {
                // Try to extract vendor name from payee
                transaction.vendor = Utils.extractVendorName(transaction.payee);
                transaction.status = 'unmatched';
                results.unmatched++;
            }

            results.transactions.push(transaction);
        }

        // Save updated vendor stats
        this.saveVendors();

        return results;
    },

    // Create vendor from transaction
    createVendorFromTransaction(transaction, accountCode, accountName) {
        const vendorName = Utils.extractVendorName(transaction.payee);
        const pattern = transaction.payee;

        const vendor = new Vendor({
            name: vendorName,
            patterns: [pattern],
            defaultAccount: accountCode,
            defaultAccountName: accountName,
            matchCount: 1,
            lastMatched: new Date()
        });

        this.vendors.push(vendor);
        this.saveVendors();

        return vendor;
    },

    // Add vendor
    addVendor(vendorData) {
        // Check for duplicate vendor name
        const existingVendor = this.vendors.find(v =>
            v.name.toLowerCase() === vendorData.name.toLowerCase()
        );

        if (existingVendor) {
            console.warn(`Vendor "${vendorData.name}" already exists. Updating existing vendor instead.`);
            this.updateVendor(existingVendor.id, vendorData);
            return existingVendor;
        }

        const vendor = new Vendor(vendorData);

        // Ensure vendor has an account - default to 9970 (To Be Sorted) if none
        if (!vendor.defaultAccount) {
            vendor.defaultAccount = '9970';
            vendor.defaultAccountName = 'To Be Sorted';
        }

        this.vendors.push(vendor);
        this.saveVendors();
        return vendor;
    },

    // Update vendor
    updateVendor(vendorId, updates) {
        const vendor = this.vendors.find(v => v.id === vendorId);
        if (vendor) {
            Object.assign(vendor, updates);
            this.saveVendors();
            return vendor;
        }
        return null;
    },

    // Delete vendor
    deleteVendor(vendorId) {
        const index = this.vendors.findIndex(v => v.id === vendorId);
        if (index !== -1) {
            this.vendors.splice(index, 1);
            this.saveVendors();
            return true;
        }
        return false;
    },

    // Get all vendors
    getAllVendors() {
        return this.vendors;
    },

    // Find vendor by ID
    getVendorById(id) {
        return this.vendors.find(v => v.id === id);
    },

    // Find vendor by name
    getVendorByName(name) {
        return this.vendors.find(v =>
            Utils.normalizeString(v.name) === Utils.normalizeString(name)
        );
    },

    // Save vendors
    saveVendors() {
        Storage.saveVendors(this.vendors);
    },

    // Import vendors
    importVendors(vendorsData) {
        const imported = vendorsData.map(v => new Vendor(v));
        this.vendors = [...this.vendors, ...imported];
        this.saveVendors();
        return imported.length;
    },

    // Export vendors
    exportVendors() {
        Storage.exportVendorDictionary();
    },

    // Learn from manual categorization
    learnFromTransaction(transaction) {
        if (!transaction.allocatedAccount) return;

        // Check if vendor exists
        let vendor = this.getVendorByName(transaction.vendor);

        if (vendor) {
            // Update existing vendor
            if (!vendor.patterns.includes(transaction.payee)) {
                vendor.addPattern(transaction.payee);
            }

            // Update default account if different
            if (vendor.defaultAccount !== transaction.allocatedAccount) {
                vendor.defaultAccount = transaction.allocatedAccount;
                vendor.defaultAccountName = transaction.allocatedAccountName;
            }

            vendor.matchCount++;
            vendor.lastMatched = new Date();
        } else {
            // Create new vendor
            vendor = this.createVendorFromTransaction(
                transaction,
                transaction.allocatedAccount,
                transaction.allocatedAccountName
            );
        }

        this.saveVendors();
        return vendor;
    },

    // Get statistics
    getStats() {
        return {
            totalVendors: this.vendors.length,
            totalPatterns: this.vendors.reduce((sum, v) => sum + v.patterns.length, 0),
            mostUsed: this.vendors
                .filter(v => v.matchCount > 0)
                .sort((a, b) => b.matchCount - a.matchCount)
                .slice(0, 10)
        };
    }
};
