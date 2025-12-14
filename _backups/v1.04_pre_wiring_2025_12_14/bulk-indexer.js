// Bulk Dictionary Indexing Module

const BulkIndexer = {
    // Process multiple CSV files and build vendor dictionary
    async processFiles(files) {
        const results = {
            filesProcessed: 0,
            totalTransactions: 0,
            vendorsCreated: 0,
            vendorsUpdated: 0,
            errors: []
        };

        const vendorMap = new Map(); // Normalized name -> vendor data

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            try {
                // Parse CSV file
                const transactions = await CSVParser.parseFile(file);
                results.filesProcessed++;
                results.totalTransactions += transactions.length;

                // Extract vendors from transactions
                for (const txn of transactions) {
                    if (!txn.payee) continue;

                    // Extract and normalize vendor name
                    const vendorName = Utils.extractVendorName(txn.payee);
                    const normalizedName = Utils.normalizeVendorName(vendorName);

                    if (!normalizedName || normalizedName.length < 2) continue;

                    // Check if vendor already exists in map
                    if (!vendorMap.has(normalizedName)) {
                        vendorMap.set(normalizedName, {
                            name: vendorName,
                            patterns: new Set(),
                            accounts: new Map(), // account code -> count
                            categories: new Set(),
                            transactionCount: 0
                        });
                    }

                    const vendorData = vendorMap.get(normalizedName);

                    // Add pattern (original payee)
                    vendorData.patterns.add(txn.payee);

                    // CRITICAL: Use the Account column from CSV (contains account number)
                    // This is the key fix - we learn from the account# in the CSV
                    if (txn.account) {
                        const currentCount = vendorData.accounts.get(txn.account) || 0;
                        vendorData.accounts.set(txn.account, currentCount + 1);
                    }

                    // Also check allocatedAccount if present (for already processed files)
                    if (txn.allocatedAccount && txn.allocatedAccount !== txn.account) {
                        const currentCount = vendorData.accounts.get(txn.allocatedAccount) || 0;
                        vendorData.accounts.set(txn.allocatedAccount, currentCount + 1);
                    }

                    // Track category
                    if (txn.category) {
                        vendorData.categories.add(txn.category);
                    }

                    vendorData.transactionCount++;
                }

            } catch (error) {
                results.errors.push({
                    file: file.name,
                    error: error.message
                });
            }
        }

        // Create or update vendors in the dictionary
        for (const [normalizedName, vendorData] of vendorMap.entries()) {
            const existingVendor = VendorMatcher.getVendorByName(vendorData.name);

            // Get most common account
            let defaultAccount = null;
            let defaultAccountName = '';
            let maxCount = 0;

            for (const [accountCode, count] of vendorData.accounts.entries()) {
                if (count > maxCount) {
                    maxCount = count;
                    defaultAccount = accountCode;
                    const account = AccountAllocator.getAccountByCode(accountCode);
                    defaultAccountName = account ? account.name : '';
                }
            }

            // Get most common category
            const category = Array.from(vendorData.categories)[0] || '';

            if (existingVendor) {
                // Update existing vendor
                const newPatterns = Array.from(vendorData.patterns);
                for (const pattern of newPatterns) {
                    if (!existingVendor.patterns.includes(pattern)) {
                        existingVendor.addPattern(pattern);
                    }
                }

                // Update account if we have more confidence
                if (defaultAccount && maxCount > 3) {
                    existingVendor.defaultAccount = defaultAccount;
                    existingVendor.defaultAccountName = defaultAccountName;
                }

                if (category) {
                    existingVendor.category = category;
                }

                existingVendor.matchCount += vendorData.transactionCount;

                VendorMatcher.updateVendor(existingVendor.id, existingVendor);
                results.vendorsUpdated++;

            } else {
                // Create new vendor
                const newVendor = new Vendor({
                    name: vendorData.name,
                    patterns: Array.from(vendorData.patterns),
                    defaultAccount: defaultAccount,
                    defaultAccountName: defaultAccountName,
                    category: category,
                    matchCount: vendorData.transactionCount,
                    notes: `Auto-indexed from ${vendorData.transactionCount} transactions`
                });

                VendorMatcher.addVendor(newVendor);
                results.vendorsCreated++;
            }
        }

        return results;
    },

    // Consolidate similar vendors (deduplication)
    consolidateDuplicates() {
        const vendors = VendorMatcher.getAllVendors();
        const consolidated = [];
        const threshold = 0.85; // Similarity threshold for merging

        for (let i = 0; i < vendors.length; i++) {
            let isDuplicate = false;

            for (let j = 0; j < consolidated.length; j++) {
                const similarity = Utils.similarity(vendors[i].name, consolidated[j].name);

                if (similarity >= threshold) {
                    // Merge into existing vendor
                    for (const pattern of vendors[i].patterns) {
                        if (!consolidated[j].patterns.includes(pattern)) {
                            consolidated[j].patterns.push(pattern);
                        }
                    }

                    consolidated[j].matchCount += vendors[i].matchCount;

                    // Delete the duplicate
                    VendorMatcher.deleteVendor(vendors[i].id);
                    isDuplicate = true;
                    break;
                }
            }

            if (!isDuplicate) {
                consolidated.push(vendors[i]);
            }
        }

        // Update all consolidated vendors
        for (const vendor of consolidated) {
            VendorMatcher.updateVendor(vendor.id, vendor);
        }

        return {
            originalCount: vendors.length,
            consolidatedCount: consolidated.length,
            duplicatesRemoved: vendors.length - consolidated.length
        };
    },

    // Clean vendor patterns (remove redundant patterns)
    cleanPatterns() {
        const vendors = VendorMatcher.getAllVendors();
        let patternsRemoved = 0;

        for (const vendor of vendors) {
            const uniqueNormalized = new Set();
            const cleanedPatterns = [];

            for (const pattern of vendor.patterns) {
                const normalized = Utils.normalizeVendorName(pattern);

                if (!uniqueNormalized.has(normalized)) {
                    uniqueNormalized.add(normalized);
                    cleanedPatterns.push(pattern);
                } else {
                    patternsRemoved++;
                }
            }

            if (cleanedPatterns.length !== vendor.patterns.length) {
                vendor.patterns = cleanedPatterns;
                VendorMatcher.updateVendor(vendor.id, vendor);
            }
        }

        return { patternsRemoved };
    }
};
