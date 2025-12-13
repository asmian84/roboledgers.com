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
                this.startContinuousOptimization(); // 🧠 START BRAIN
                return;
            }
        }

        // 2. Fallback to Local Storage
        console.log('📂 Loading vendors from Local Storage...');
        this.vendors = Storage.loadVendors();

        this.startContinuousOptimization(); // 🧠 START BRAIN
    },

    // 🧠 CONTINUOUS AI LOOP: The "Heartbeat" of the System
    startContinuousOptimization() {
        if (this._optimizationInterval) {
            console.warn('⚠️ Optimization loop already running. Skipping start.');
            return;
        }

        console.log('🚀 Starting Turbo-Charged Optimization Loop (High Performance)...');

        // Run every 200ms: CPU-bound speed, skipping network latency
        this._optimizationInterval = setInterval(async () => {
            if (!this.vendors || this.vendors.length === 0) return;

            // BATCH PROCESSING: Grab 10 items that haven't been checked recently
            // Prioritize messy ones, but essentially check everyone round-robin
            const candidates = this.vendors
                .filter(v => (!v._lastChecked || Date.now() - v._lastChecked > 10000)) // Re-check every 10s
                .sort((a, b) => (a._lastChecked || 0) - (b._lastChecked || 0)) // Oldest first
                .slice(0, 10); // Process 10 at a time

            if (candidates.length === 0) return;

            // Process batch. Note: updateVendor now supports { skipCloud: true }
            for (const candidate of candidates) {
                await this.updateVendor(candidate.id, { _lastChecked: Date.now() }, { skipCloud: true });
            }
        }, 200);
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
        // 🗑️ GARBAGE FILTER: Block internal bank transfer codes
        const garbagePattern = /(tfrto|tfrfr|pyt|mtg|direct transfer|direct debit|global payment|bill payment|pre-authorized debit)/i;
        if (garbagePattern.test(vendorData.name)) {
            console.warn(`🛑 Blocked garbage vendor: "${vendorData.name}"`);
            return null; // Do NOT add to dictionary
        }

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
            id: vendorData.id || crypto.randomUUID(), // Use provided ID or generate
            ...vendorData,
            matchCount: 0,
            lastMatched: new Date().toISOString(),
            patterns: vendorData.patterns || [vendorData.name]
        };

        // Ensure default account
        if (!vendor.defaultAccount) {
            vendor.defaultAccount = '9970';
            vendor.defaultAccountName = 'To Be Sorted';
        }

        // 🟢 CONTINUOUS OPTIMIZATION ("The Ticker")
        if (window.VendorAI) {
            await VendorAI.optimizeVendor(vendor);
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
    async updateVendor(vendorId, updates, options = {}) {
        const { skipCloud = false } = options;
        let vendor = this.vendors.find(v => v.id === vendorId);
        if (vendor) {
            Object.assign(vendor, updates);
            vendor.updatedAt = new Date().toISOString();

            // 🟢 CONTINUOUS OPTIMIZATION ("The Ticker")
            if (window.VendorAI) {
                await VendorAI.optimizeVendor(vendor);

                // 🗑️ AUTO-PRUNE: If optimization stripped the name to nothing, delete it.
                if (!vendor.name || vendor.name.trim().length === 0) {
                    console.log(`🗑️ Pruning empty vendor ${vendor.id} (was "${vendor.originalName || 'unknown'}")`);
                    await this.deleteVendor(vendor.id);
                    return null;
                }

                // 🔄 AUTO-CONSOLIDATION HEADLESS LOGIC 🧠
                // Checks if the new name conflicts with an existing vendor
                const duplicate = this.vendors.find(v =>
                    v.id !== vendorId &&
                    Utils.normalizeString(v.name) === Utils.normalizeString(vendor.name)
                );

                if (duplicate) {
                    // console.log(`🔀 Auto-Consolidating duplicate "${vendor.name}"...`);
                    // Merge THIS vendor (source) into the DUPLICATE (target)
                    return this.mergeVendors(vendor, duplicate);
                }
            }

            // Local Save
            this.saveVendors();

            // ⚡ REAL-TIME UI UPDATE (Standard Optimization) ⚡
            // If we didn't delete or merge, we still improved the name/category. Show it!
            if (window.VendorGrid && window.VendorGrid.gridApi && !window.VendorGrid.gridApi.destroyCalled) {
                window.VendorGrid.gridApi.applyTransaction({ update: [vendor] });
            }

            // Sync to Cloud (unless skipped for speed)
            if (!skipCloud && window.SupabaseClient) {
                // Don't await this if we want UI to be snappy, but safe to await if not batching
                // In Turbo mode, we skip this.
                SupabaseClient.upsertVendor(vendor);
            }
            return vendor;
        }
        return null;
    },

    /**
     * Merge source vendor into target vendor to eliminate duplicates
     * @param {Object} source - The duplicate/garbage vendor to remove
     * @param {Object} target - The authoritative vendor to keep
     */
    async mergeVendors(source, target) {
        console.log(`✨ Merging ${source.name} (${source.id}) -> ${target.name} (${target.id})`);

        // 1. Merge Intelligence (Patterns, Stats)
        target.matchCount = (target.matchCount || 0) + (source.matchCount || 0);

        if (source.patterns && Array.isArray(source.patterns)) {
            if (!target.patterns) target.patterns = [];
            source.patterns.forEach(p => {
                const normalized = Utils.normalizeString(p);
                // Only add unique patterns
                if (!target.patterns.some(tp => Utils.normalizeString(tp) === normalized)) {
                    target.patterns.push(p);
                }
            });
        }

        // 2. Reassign Grid Transactions (The "Fix")
        // Updates the Transaction Grid in real-time to point to the new vendor
        if (window.TransactionGrid && window.TransactionGrid.gridApi) {
            const updates = [];
            window.TransactionGrid.gridApi.forEachNode(node => {
                if (node.data && (node.data.vendorId === source.id || node.data.vendor === source.name)) {
                    const tx = node.data;
                    tx.vendor = target.name;
                    tx.vendorId = target.id;
                    tx.category = target.category;
                    tx.allocatedAccount = target.defaultAccount;
                    tx.allocatedAccountName = target.defaultAccountName;
                    updates.push(tx);
                }
            });

            if (updates.length > 0) {
                window.TransactionGrid.gridApi.applyTransaction({ update: updates });
                console.log(`Updated ${updates.length} transactions to new vendor`);
            }
        }

        // 3. Delete the Source Vendor (Cleanup)
        // This removes it from the list AND Supabase
        await this.deleteVendor(source.id);

        // 4. Save/Sync the Target (Persist Merge)
        // We update the target with new stats/patterns
        await this.updateVendor(target.id, {
            matchCount: target.matchCount,
            patterns: target.patterns
        });

        return target;
    },

    /**
     * Handle incoming Real-Time Cloud Update
     * @param {Object} payload - Supabase payload { eventType, new, old }
     */
    async handleCloudUpdate(payload) {
        if (!payload || !payload.new) return;

        const incoming = payload.new;
        const local = this.vendors.find(v => v.id === incoming.id);

        // Transform SQL -> App Object
        const updatedVendor = {
            id: incoming.id,
            name: incoming.name,
            matchCount: incoming.times_referenced,
            category: incoming.category,
            defaultAccount: incoming.sources?.default_account_code || '9970',
            defaultAccountName: incoming.sources?.default_account_name || 'To Be Sorted',
            patterns: incoming.patterns || [],
            lastMatched: incoming.updated_at,
            _synced: true
        };

        // 🟢 CONTINUOUS OPTIMIZATION ("The Ticker")
        if (window.VendorAI) {
            await VendorAI.optimizeVendor(updatedVendor);
        }

        // Optimization: Only update if changed (prevents loops)
        if (local && JSON.stringify(local) === JSON.stringify(updatedVendor)) {
            return;
        }

        if (local) {
            // Update existing
            Object.assign(local, updatedVendor);
        } else {
            // Insert new
            this.vendors.push(updatedVendor);
        }

        // Save Local
        this.saveVendors();

        // 🔄 LIVE SYNC: Update active transactions immediately
        if (window.App && App.updateTransactionsForVendor) {
            console.log(`🔄 Triggering live transaction sync for ${updatedVendor.name}`);
            App.updateTransactionsForVendor(updatedVendor);
        }

        // Refresh Vendor Grid if available
        if (window.VendorGrid) {
            // Find row node
            if (VendorGrid.gridOptions && VendorGrid.gridOptions.api) {
                // Force refresh of specific row or all
                VendorGrid.gridOptions.api.redrawRows();
            }
        }
    },


    // Delete vendor
    async deleteVendor(vendorId) {
        const index = this.vendors.findIndex(v => v.id === vendorId);
        if (index !== -1) {
            const removed = this.vendors[index];
            this.vendors.splice(index, 1);
            this.saveVendors();

            // Cloud Sync
            if (window.SupabaseClient) {
                await SupabaseClient.deleteVendor(vendorId);
            }

            // ⚡ REAL-TIME UI UPDATE ⚡
            // Directly remove from grid without full reload
            if (window.VendorGrid && window.VendorGrid.gridApi && !window.VendorGrid.gridApi.destroyCalled) {
                // Find node by ID
                const rowNode = window.VendorGrid.gridApi.getRowNode(vendorId);
                // Or remove by data
                window.VendorGrid.gridApi.applyTransaction({ remove: [{ id: vendorId }] });
            }

            // Notify others
            window.dispatchEvent(new CustomEvent('vendor-deleted', { detail: { id: vendorId } }));
            return true;
        }
        return false;
    },

    // Get all vendors
    getAllVendors() {
        // 🗑️ GARBAGE FILTER: Hide internal transfer logic AND empty rows from UI
        const garbagePattern = /(tfrto|tfrfr|pyt|mtg|direct transfer|direct debit|global payment|bill payment|pre-authorized debit)/i;

        return this.vendors.filter(v => {
            if (!v.name) return false;

            // Check RAW name first for garbage patterns
            if (garbagePattern.test(v.name)) return false;

            // Check NORMALIZED name (what actually gets displayed)
            // If the cleaner strips it to empty, hide it!
            if (window.VendorAI) {
                const normalized = VendorAI.normalizeVendorName(v.name);
                return normalized && normalized.trim().length > 0;
            }

            // Fallback if AI not loaded
            return v.name.trim().length > 0;
        });
    },

    /**
     * Get vendor by ID (internal helper)
     */

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
