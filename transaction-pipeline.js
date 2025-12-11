// Transaction Pipeline - Real-time Intelligent Processing
// Processes each transaction during CSV parse for immediate categorization

window.TransactionPipeline = {
    /**
     * Process a transaction through the AI pipeline
     * @param {Transaction} transaction - Raw transaction object
     * @returns {Transaction} Fully categorized transaction
     */
    async process(transaction) {
        try {
            // Step 1: Match or create vendor
            const vendor = await this.matchOrCreateVendor(transaction.payee);

            // Step 2: Assign vendor to transaction
            transaction.vendor = vendor.name;
            transaction.vendorId = vendor.id;
            transaction.category = vendor.category;
            transaction.status = 'matched';

            // Step 3: AI categorization (use existing vendor-ai logic)
            const account = VendorAI.suggestAccount(
                vendor.name,
                vendor.category,
                'chequing'
            );

            // Step 4: Assign account to transaction
            if (account) {
                transaction.account = account.code;
                transaction.allocatedAccount = account.code;
                transaction.allocatedAccountName = account.name;

                // Step 5: Update vendor's default account
                vendor.defaultAccount = account.code;
                vendor.defaultAccountName = account.name;
            } else {
                // Fallback to unusual item
                transaction.account = '9970';
                transaction.allocatedAccount = '9970';
                transaction.allocatedAccountName = 'Unusual item';

                vendor.defaultAccount = '9970';
                vendor.defaultAccountName = 'Unusual item';
            }

            // Step 6: Update vendor in dictionary
            vendor.matchCount = (vendor.matchCount || 0) + 1;
            VendorMatcher.updateVendor(vendor);

            return transaction;

        } catch (error) {
            console.error('❌ Transaction pipeline error:', error, transaction);
            // Return transaction with minimal categorization
            transaction.account = '9970';
            transaction.allocatedAccount = '9970';
            transaction.allocatedAccountName = 'Unusual item';
            transaction.status = 'error';
            return transaction;
        }
    },

    /**
     * Match existing vendor or create new one
     * @param {string} payee - Transaction description
     * @returns {Object} Vendor object
     */
    async matchOrCreateVendor(payee) {
        // Try to match existing vendor
        const match = VendorMatcher.matchPayee(payee);

        if (match && match.vendor) {
            return match.vendor;
        }

        // No match found - auto-create new vendor
        const vendorName = VendorNameUtils.extractVendorName(payee);
        const normalizedName = VendorNameUtils.normalizeVendorName(vendorName);

        const newVendor = {
            id: Utils.generateId('vnd'),
            name: normalizedName,
            originalName: vendorName,
            patterns: [normalizedName.toLowerCase()],
            matchCount: 0,
            category: VendorAI.categorizeVendor(normalizedName),
            defaultAccount: null,
            defaultAccountName: null
        };

        // Add to vendor dictionary
        VendorMatcher.addVendor(newVendor);

        console.log(`✨ Auto-created vendor: "${normalizedName}"`);

        return newVendor;
    }
};

console.log('✅ Transaction Pipeline loaded');
