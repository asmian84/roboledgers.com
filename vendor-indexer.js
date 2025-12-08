// Vendor Indexing - Bulk import from multiple CSV files to build vendor dictionary

const VendorIndexer = {
    indexedVendors: new Map(), // vendorName -> {account, accountName, count, patterns}

    /**
     * Process multiple CSV files for vendor indexing
     */
    async indexFromFiles(files) {
        console.log(`📥 Starting vendor indexing from ${files.length} file(s)...`);

        this.indexedVendors.clear();
        let totalTransactions = 0;

        for (const file of files) {
            const transactions = await this.parseCSVFile(file);
            this.indexTransactions(transactions);
            totalTransactions += transactions.length;
        }

        console.log(`✅ Indexed ${totalTransactions} transactions`);
        console.log(`📊 Found ${this.indexedVendors.size} unique vendors`);

        return this.consolidateVendors();
    },

    /**
     * Parse a single CSV file
     */
    async parseCSVFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    const transactions = CSVParser.parseCSV(text);
                    resolve(transactions);
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    /**
     * Index transactions to extract vendor patterns
     */
    indexTransactions(transactions) {
        for (const txn of transactions) {
            // Skip if no payee or no allocated account
            if (!txn.payee || !txn.allocatedAccount) continue;

            // Extract clean vendor name (AI-assisted)
            const vendorName = this.extractVendorName(txn.payee);

            // Get or create vendor entry
            if (!this.indexedVendors.has(vendorName)) {
                this.indexedVendors.set(vendorName, {
                    name: vendorName,
                    account: txn.allocatedAccount,
                    accountName: txn.allocatedAccountName || '',
                    patterns: new Set(),
                    count: 0,
                    transactions: []
                });
            }

            const vendor = this.indexedVendors.get(vendorName);

            // Add pattern (original payee string)
            vendor.patterns.add(txn.payee);
            vendor.count++;
            vendor.transactions.push({
                payee: txn.payee,
                account: txn.allocatedAccount,
                accountName: txn.allocatedAccountName
            });

            // If account changes frequently, mark as inconsistent
            if (txn.allocatedAccount !== vendor.account) {
                vendor.hasInconsistentAccount = true;
                vendor.alternateAccounts = vendor.alternateAccounts || new Set();
                vendor.alternateAccounts.add(txn.allocatedAccount);
            }
        }
    },

    /**
     * Extract clean vendor name from payee string using AI/fuzzy logic
     */
    extractVendorName(payee) {
        if (!payee) return 'Unknown';

        // Use existing utility if available
        if (typeof Utils !== 'undefined' && Utils.extractVendorName) {
            return Utils.extractVendorName(payee);
        }

        // Fallback: Basic cleaning
        let name = payee
            .replace(/\d{2,}/g, '') // Remove long numbers
            .replace(/[#*\-_]/g, ' ') // Replace symbols with spaces
            .replace(/\s+/g, ' ') // Normalize spaces
            .trim();

        // Capitalize words
        return name.split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    },

    /**
     * Consolidate vendors using fuzzy matching to merge similar names
     */
    consolidateVendors() {
        const vendors = Array.from(this.indexedVendors.values());
        const consolidated = [];
        const merged = new Set();

        for (let i = 0; i < vendors.length; i++) {
            if (merged.has(vendors[i].name)) continue;

            const similar = [vendors[i]];

            // Find similar vendors
            for (let j = i + 1; j < vendors.length; j++) {
                if (merged.has(vendors[j].name)) continue;

                const similarity = this.calculateSimilarity(
                    vendors[i].name,
                    vendors[j].name
                );

                // If very similar (>85%), merge them
                if (similarity > 0.85) {
                    similar.push(vendors[j]);
                    merged.add(vendors[j].name);
                }
            }

            // Create consolidated vendor
            const consolidatedVendor = this.mergeVendors(similar);
            consolidated.push(consolidatedVendor);
        }

        console.log(`🔄 Consolidated ${vendors.length} vendors into ${consolidated.length}`);
        return consolidated;
    },

    /**
     * Calculate similarity between two vendor names
     */
    calculateSimilarity(name1, name2) {
        // Use existing utility if available
        if (typeof Utils !== 'undefined' && Utils.similarity) {
            return Utils.similarity(name1, name2);
        }

        // Fallback: Simple similarity
        const s1 = name1.toLowerCase();
        const s2 = name2.toLowerCase();

        if (s1 === s2) return 1.0;
        if (s1.includes(s2) || s2.includes(s1)) return 0.9;

        // Levenshtein distance
        const len1 = s1.length;
        const len2 = s2.length;
        const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

        for (let i = 0; i <= len1; i++) matrix[0][i] = i;
        for (let j = 0; j <= len2; j++) matrix[j][0] = j;

        for (let j = 1; j <= len2; j++) {
            for (let i = 1; i <= len1; i++) {
                const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + indicator
                );
            }
        }

        const distance = matrix[len2][len1];
        return 1 - (distance / Math.max(len1, len2));
    },

    /**
     * Merge similar vendors into one
     */
    mergeVendors(vendors) {
        // Use the most common name (by transaction count)
        vendors.sort((a, b) => b.count - a.count);
        const primary = vendors[0];

        // Merge all patterns
        const allPatterns = new Set();
        vendors.forEach(v => {
            v.patterns.forEach(p => allPatterns.add(p));
        });

        // Determine most common account
        const accountCounts = {};
        vendors.forEach(v => {
            v.transactions.forEach(t => {
                const key = `${t.account}|${t.accountName}`;
                accountCounts[key] = (accountCounts[key] || 0) + 1;
            });
        });

        const mostCommonAccount = Object.entries(accountCounts)
            .sort((a, b) => b[1] - a[1])[0];

        const [account, accountName] = mostCommonAccount[0].split('|');

        return {
            name: primary.name,
            account: account,
            accountName: accountName,
            patterns: Array.from(allPatterns),
            matchCount: vendors.reduce((sum, v) => sum + v.count, 0),
            mergedFrom: vendors.length > 1 ? vendors.map(v => v.name) : undefined
        };
    },

    /**
     * Add indexed vendors to VendorMatcher
     */
    async applyToVendorMatcher(consolidatedVendors) {
        let added = 0;
        let updated = 0;
        let skipped = 0;

        for (const vendorData of consolidatedVendors) {
            const existing = VendorMatcher.getVendorByName(vendorData.name);

            if (existing) {
                // Update existing vendor
                existing.defaultAccount = vendorData.account;
                existing.defaultAccountName = vendorData.accountName;

                // Add new patterns
                vendorData.patterns.forEach(pattern => {
                    if (!existing.patterns.includes(pattern)) {
                        existing.addPattern(pattern);
                    }
                });

                updated++;
            } else {
                // Add new vendor
                VendorMatcher.addVendor({
                    name: vendorData.name,
                    patterns: vendorData.patterns,
                    defaultAccount: vendorData.account,
                    defaultAccountName: vendorData.accountName,
                    matchCount: vendorData.matchCount
                });
                added++;
            }
        }

        VendorMatcher.saveVendors();

        console.log(`📊 Indexing complete:`);
        console.log(`   • Added: ${added} new vendors`);
        console.log(`   • Updated: ${updated} existing vendors`);
        console.log(`   • Total vendors: ${VendorMatcher.getAllVendors().length}`);

        return { added, updated, skipped };
    },

    /**
     * Show indexing modal dialog
     */
    showIndexingDialog() {
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-dialog" style="max-width: 600px;">
                <div class="modal-header">
                    <h2>📊 Vendor Indexing</h2>
                    <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
                </div>
                
                <div class="modal-body">
                    <p>Import multiple categorized CSV files to automatically build your vendor dictionary.</p>
                    
                    <div style="margin: 20px 0;">
                        <label class="settings-label">Select CSV Files</label>
                        <input type="file" id="vendorIndexFiles" multiple accept=".csv" 
                               style="display: block; margin: 10px 0; padding: 10px; border: 2px dashed var(--border); border-radius: 8px;">
                        <p class="settings-hint">
                            Select one or more CSV files with categorized transactions.<br>
                            Required columns: Payee/Description, Account (code or name)
                        </p>
                    </div>
                    
                    <div id="indexingProgress" style="display:none; margin: 20px 0;">
                        <div style="background: var(--bg-secondary); padding: 15px; border-radius: 8px;">
                            <div id="indexingStatus">Processing...</div>
                            <div style="margin-top: 10px; font-size: 0.9em; opacity: 0.8;" id="indexingDetails"></div>
                        </div>
                    </div>
                    
                    <div id="indexingResults" style="display:none; margin: 20px 0;">
                        <div style="background: var(--success); color: white; padding: 15px; border-radius: 8px;">
                            <strong>✅ Indexing Complete!</strong>
                            <div id="resultsSummary" style="margin-top: 10px;"></div>
                        </div>
                    </div>
                </div>
                
                <div class="modal-footer">
                    <button class="settings-btn settings-btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        Cancel
                    </button>
                    <button id="startIndexingBtn" class="settings-btn settings-btn-primary">
                        Start Indexing
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle indexing
        document.getElementById('startIndexingBtn').onclick = async () => {
            const fileInput = document.getElementById('vendorIndexFiles');
            const files = Array.from(fileInput.files);

            if (files.length === 0) {
                alert('Please select at least one CSV file');
                return;
            }

            const progressDiv = document.getElementById('indexingProgress');
            const resultsDiv = document.getElementById('indexingResults');
            const statusDiv = document.getElementById('indexingStatus');
            const detailsDiv = document.getElementById('indexingDetails');
            const summaryDiv = document.getElementById('resultsSummary');

            progressDiv.style.display = 'block';
            resultsDiv.style.display = 'none';

            try {
                statusDiv.textContent = 'Reading files...';
                const consolidated = await this.indexFromFiles(files);

                statusDiv.textContent = 'Consolidating vendors...';
                detailsDiv.textContent = `Found ${consolidated.length} unique vendors`;

                statusDiv.textContent = 'Applying to vendor dictionary...';
                const results = await this.applyToVendorMatcher(consolidated);

                progressDiv.style.display = 'none';
                resultsDiv.style.display = 'block';
                summaryDiv.innerHTML = `
                    <div>✅ ${results.added} new vendors added</div>
                    <div>🔄 ${results.updated} existing vendors updated</div>
                    <div>📚 Total vendors: ${VendorMatcher.getAllVendors().length}</div>
                `;

                setTimeout(() => modal.remove(), 3000);

            } catch (error) {
                console.error('Indexing error:', error);
                statusDiv.textContent = `Error: ${error.message}`;
                statusDiv.style.color = 'var(--error)';
            }
        };
    }
};
