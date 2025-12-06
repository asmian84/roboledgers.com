// AI-Powered Vendor Optimizer

const VendorAI = {
    // AI-powered vendor re-categorization and optimization with progress feedback
    async rethinkVendors(progressCallback = null) {
        const vendors = VendorMatcher.getAllVendors();

        if (vendors.length === 0) {
            return {
                success: false,
                message: 'No vendors to optimize'
            };
        }

        const results = {
            categorized: 0,
            merged: 0,
            allocated: 0,
            suggestions: []
        };

        // Progress helper
        const updateProgress = (message, percent) => {
            if (progressCallback) {
                progressCallback(message, percent);
            }
        };

        updateProgress('🔍 Analyzing vendors...', 10);
        await this.delay(300);

        // Step 1: Auto-categorize vendors
        updateProgress('📋 Categorizing vendors...', 30);
        for (let i = 0; i < vendors.length; i++) {
            const vendor = vendors[i];
            const category = this.suggestCategory(vendor.name);
            if (category && (!vendor.category || vendor.category.trim() === '')) {
                vendor.category = category;
                results.categorized++;
            }

            if (i % 10 === 0) {
                const progress = 30 + (i / vendors.length) * 20;
                updateProgress(`📋 Categorizing vendors... (${i}/${vendors.length})`, progress);
                await this.delay(10);
            }
        }

        // Step 2: Smart account allocation
        updateProgress('💰 Allocating account numbers...', 60);
        for (let i = 0; i < vendors.length; i++) {
            const vendor = vendors[i];
            if (!vendor.defaultAccount || vendor.defaultAccount === '9970') {
                const suggestedAccount = this.suggestAccount(vendor.name, vendor.category);
                if (suggestedAccount) {
                    vendor.defaultAccount = suggestedAccount.code;
                    vendor.defaultAccountName = suggestedAccount.name;
                    results.allocated++;
                }
            }

            if (i % 10 === 0) {
                const progress = 60 + (i / vendors.length) * 15;
                updateProgress(`💰 Allocating accounts... (${i}/${vendors.length})`, progress);
                await this.delay(10);
            }
        }

        // Step 3: Find similar vendors
        updateProgress('🔎 Finding similar vendors...', 80);
        const merges = this.findSimilarVendors(vendors);
        for (const merge of merges) {
            results.suggestions.push({
                type: 'merge',
                vendor1: merge.vendor1.name,
                vendor2: merge.vendor2.name,
                similarity: merge.similarity,
                action: () => this.mergeVendors(merge.vendor1, merge.vendor2)
            });
        }
        results.merged = merges.length;

        updateProgress('💾 Saving changes...', 95);
        VendorMatcher.saveVendors();

        updateProgress('✅ Complete!', 100);

        return {
            success: true,
            results: results
        };
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    suggestCategory(vendorName) {
        const name = vendorName.toLowerCase();

        if (name.includes('office') || name.includes('staples') || name.includes('depot')) {
            return 'Office Supplies';
        }
        if (name.includes('restaurant') || name.includes('cafe') || name.includes('coffee') ||
            name.includes('starbucks') || name.includes('mcdonald') || name.includes('burger')) {
            return 'Meals & Entertainment';
        }
        if (name.includes('apple') || name.includes('microsoft') || name.includes('google') ||
            name.includes('amazon') || name.includes('software') || name.includes('tech')) {
            return 'Technology';
        }
        if (name.includes('electric') || name.includes('power') || name.includes('gas') ||
            name.includes('water') || name.includes('internet') || name.includes('telecom') ||
            name.includes('verizon') || name.includes('at&t') || name.includes('comcast')) {
            return 'Utilities';
        }
        if (name.includes('shell') || name.includes('chevron') || name.includes('exxon') ||
            name.includes('mobil') || name.includes('gas') || name.includes('fuel')) {
            return 'Auto & Fuel';
        }
        if (name.includes('walmart') || name.includes('target') || name.includes('costco') ||
            name.includes('sam\'s') || name.includes('store')) {
            return 'General Merchandise';
        }
        if (name.includes('insurance') || name.includes('allstate') || name.includes('geico')) {
            return 'Insurance';
        }
        if (name.includes('bank') || name.includes('fee') || name.includes('charge')) {
            return 'Bank Fees';
        }

        return null;
    },

    suggestAccount(vendorName, category) {
        const accounts = AccountAllocator.getAllAccounts();
        const name = vendorName.toLowerCase();

        if (category === 'Office Supplies' || name.includes('office')) {
            return accounts.find(a => a.code === '7710');
        }
        if (category === 'Meals & Entertainment' || name.includes('restaurant') || name.includes('coffee')) {
            return accounts.find(a => a.code === '8600');
        }
        if (category === 'Technology' || name.includes('software') || name.includes('tech')) {
            return accounts.find(a => a.code === '7700');
        }
        if (category === 'Utilities' || name.includes('electric') || name.includes('internet')) {
            return accounts.find(a => a.code === '8520');
        }
        if (category === 'Auto & Fuel' || name.includes('gas') || name.includes('fuel')) {
            return accounts.find(a => a.code === '8610');
        }
        if (category === 'General Merchandise') {
            return accounts.find(a => a.code === '7700');
        }
        if (category === 'Insurance' || name.includes('insurance')) {
            return accounts.find(a => a.code === '8100');
        }
        if (category === 'Bank Fees' || name.includes('fee')) {
            return accounts.find(a => a.code === '8390');
        }

        return accounts.find(a => a.code === '7700');
    },

    findSimilarVendors(vendors) {
        const merges = [];

        for (let i = 0; i < vendors.length; i++) {
            for (let j = i + 1; j < vendors.length; j++) {
                const similarity = this.calculateSimilarity(vendors[i].name, vendors[j].name);

                if (similarity > 0.7) {
                    merges.push({
                        vendor1: vendors[i],
                        vendor2: vendors[j],
                        similarity: similarity
                    });
                }
            }
        }

        return merges;
    },

    calculateSimilarity(name1, name2) {
        const s1 = name1.toLowerCase().trim();
        const s2 = name2.toLowerCase().trim();

        if (s1 === s2) return 1.0;

        if (s1.includes(s2) || s2.includes(s1)) {
            return 0.85;
        }

        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        if (longer.length === 0) return 1.0;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longer.length - editDistance) / longer.length;
    },

    levenshteinDistance(str1, str2) {
        const matrix = [];

        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }

        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }

        return matrix[str2.length][str1.length];
    },

    mergeVendors(vendor1, vendor2) {
        const keeper = vendor1.matchCount > vendor2.matchCount ? vendor1 : vendor2;
        const remove = vendor1.matchCount > vendor2.matchCount ? vendor2 : vendor1;

        const allPatterns = [...new Set([...keeper.patterns, ...remove.patterns])];
        keeper.patterns = allPatterns;

        keeper.matchCount += remove.matchCount;

        if (keeper.defaultAccount === '9970' && remove.defaultAccount !== '9970') {
            keeper.defaultAccount = remove.defaultAccount;
            keeper.defaultAccountName = remove.defaultAccountName;
        }

        if (!keeper.category && remove.category) {
            keeper.category = remove.category;
        }

        VendorMatcher.deleteVendor(remove.id);

        return keeper;
    }
};
