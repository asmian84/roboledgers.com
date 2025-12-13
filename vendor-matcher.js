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

        // 🛡️ RE-OPTIMIZATION CHECK
        // Check if vendors need optimization (e.g. loaded from old data)
        if (window.VendorAI) {
            let changeCount = 0;
            // Add a small delay so UI can render and user can see the ticker start
            setTimeout(async () => {
                for (const vendor of this.vendors) {
                    // If name is all lowercase or looks raw, force optimize
                    if (vendor.name && (vendor.name === vendor.name.toLowerCase() || !vendor.category || vendor.defaultAccount === '9970')) {
                        // FORCE RE-SEARCH for the ticker effect
                        vendor._googleSearched = false;

                        await VendorAI.optimizeVendor(vendor);
                        changeCount++;

                        // Visual "Flipper" Effect 🎰
                        const api = window.VendorGrid?.gridApi || window.VendorGrid?.gridOptions?.api;
                        if (api) {
                            const rowNode = api.getRowNode(vendor.id);
                            if (rowNode) {
                                // 1. Update data
                                rowNode.setData(vendor);
                                // 2. Flash the row (The "Flipper" visual)
                                api.flashCells({
                                    rowNodes: [rowNode],
                                    flashDelay: 500,
                                    fadeDelay: 300
                                });
                            }
                        }

                        // 🔄 TRIGGER TRANSACTION SYNC (The "Grid" User Cares About)
                        if (window.App && App.updateTransactionsForVendor) {
                            // Run this slightly offset to not block the visual flash
                            setTimeout(() => App.updateTransactionsForVendor(vendor), 50);
                        }

                        // Small delay for the visual cadence
                        await new Promise(r => setTimeout(r, 600));
                    }
                }
                if (changeCount > 0) {
                    console.log(`✨ Re-optimized ${changeCount} legacy vendors`);
                    this.saveVendors();
                }
            }, 2000); // Start 2 seconds after load
        }
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
    async updateVendor(vendorId, updates) {
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
                    console.log(`🔀 Auto-Consolidating duplicate "${vendor.name}"...`);
                    // Merge THIS vendor (source) into the DUPLICATE (target)
                    // We return the result of the merge (the target)
                    return this.mergeVendors(vendor, duplicate);
                }
            }

            this.saveVendors(); // Local Cache

            // Sync to Cloud
            if (window.SupabaseClient) {
                await SupabaseClient.upsertVendor(vendor);
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
        // 🗑️ GARBAGE FILTER: Hide internal transfer logic from UI
        const garbagePattern = /(tfrto|tfrfr|pyt|mtg|direct transfer|direct debit|global payment|bill payment|pre-authorized debit)/i;
        return this.vendors.filter(v => !garbagePattern.test(v.name));
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
