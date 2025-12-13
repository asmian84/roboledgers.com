// Vendor Matching Engine

// Vendor Matching Engine

window.VendorMatcher = {
    vendors: [],

    async initialize() {
        console.log('🔄 VendorMatcher: Initializing...');

        // 1. Try to load from Supabase first
        if (window.SupabaseClient && await SupabaseClient.initialize()) {
            const cloudVendors = await SupabaseClient.fetchVendors();
            if (cloudVendors && cloudVendors.length > 0) {
                console.log(`☁️ Loaded ${cloudVendors.length} vendors from Supabase`);
                this.vendors = cloudVendors;
                // Update local cache as backup
                this.saveVendors();
                return;
            }
        }

        // 2. Fallback to Local Storage
        console.log('📂 Loading vendors from Local Storage...');
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
            if (vendor.patterns && vendor.patterns.some(p => Utils.normalizeString(p) === normalizedPayee)) {
                return { vendor: vendor, confidence: 1.0, matchType: 'pattern' };
            }
            // Fallback for objects that might have matches() method from old class
            if (typeof vendor.matches === 'function' && vendor.matches(payee)) {
                return { vendor: vendor, confidence: 1.0, matchType: 'pattern' };
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

    /**
     * Bulk match transactions
     * @param {Array} transactions 
     */
    matchTransactions(transactions) {
        if (!transactions || !Array.isArray(transactions)) return { transactions: [] };

        const matchedTransactions = transactions.map(tx => {
            const match = this.matchPayee(tx.payee);
            if (match && match.vendor) {
                tx.vendor = match.vendor.name;
                tx.vendorId = match.vendor.id;
                tx.category = match.vendor.category;
                tx.allocatedAccount = match.vendor.defaultAccount;
                tx.allocatedAccountName = match.vendor.defaultAccountName;
            }
            return tx;
        });

        return { transactions: matchedTransactions };
    },

    // ... (matchTransactions remains the same) ...

    // Add vendor
    async addVendor(vendorData) {
        // Check for duplicate
        const existingVendor = this.vendors.find(v =>
            v.name.toLowerCase() === vendorData.name.toLowerCase()
        );

        if (existingVendor) {
            console.warn(`Vendor "${vendorData.name}" exists. Updating.`);
            return this.updateVendor(existingVendor.id, vendorData);
        }

        // Create new vendor
        const vendor = {
            id: crypto.randomUUID(), // Generate local ID
            ...vendorData,
            matchCount: 0,
            lastMatched: new Date(),
            patterns: vendorData.patterns || [vendorData.name]
        };

        // Ensure default account
        if (!vendor.defaultAccount) {
            vendor.defaultAccount = '9970';
            vendor.defaultAccountName = 'To Be Sorted';
        }

        // Update In-Memory
        this.vendors.push(vendor);
        this.saveVendors(); // Local Cache

        // Sync to Cloud
        if (window.SupabaseClient) {
            await SupabaseClient.upsertVendor(vendor);
        }

        return vendor;
    },

    // Update vendor
    async updateVendor(vendorId, updates) {
        const vendor = this.vendors.find(v => v.id === vendorId);
        if (vendor) {
            Object.assign(vendor, updates);
            this.saveVendors(); // Local Cache

            // Sync to Cloud
            if (window.SupabaseClient) {
                await SupabaseClient.upsertVendor(vendor);
            }
            return vendor;
        }
        return null;
    },

    // Delete vendor
    async deleteVendor(vendorId) {
        const index = this.vendors.findIndex(v => v.id === vendorId);
        if (index !== -1) {
            this.vendors.splice(index, 1);
            this.saveVendors(); // Local Cache

            // Sync to Cloud
            if (window.SupabaseClient) {
                await SupabaseClient.deleteVendor(vendorId);
            }
            return true;
        }
        return false;
    },

    // Get all vendors
    getAllVendors() {
        return this.vendors;
    },

    /**
     * Add a new vendor to the dictionary
     * @param {Object} vendor - Vendor object
     */
    addVendor(vendor) {
        this.vendors.push(vendor);
        Storage.saveVendors(this.vendors);
    },

    /**
     * Update an existing vendor
     * @param {Object} updatedVendor - Updated vendor object
     */
    updateVendor(updatedVendor) {
        const index = this.vendors.findIndex(v => v.id === updatedVendor.id);
        if (index !== -1) {
            this.vendors[index] = updatedVendor;
            Storage.saveVendors(this.vendors);
        }
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
