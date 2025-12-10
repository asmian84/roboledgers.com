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

    suggestAccount(vendorName, category, accountType = 'chequing') {
        const accounts = AccountAllocator.getAllAccounts();
        const name = vendorName.toLowerCase();

        // Account type influences suggestions
        const isCreditCard = accountType === 'credit';
        const isIncome = accountType === 'savings' || accountType === 'investment';

        // Comprehensive account mapping based on keywords and categories
        // ALL CODES MATCH THE ACTUAL CHART OF ACCOUNTS
        const accountMappings = [
            // Revenue Accounts (4xxx)
            { keywords: ['sales', 'revenue'], code: '4001' },
            { keywords: ['consulting fee', 'professional service'], code: '4002' },
            { keywords: ['contracting fee'], code: '4003' },
            { keywords: ['management fee'], code: '4004' },
            { keywords: ['commission'], code: '4700' },
            { keywords: ['rental revenue', 'rent income'], code: '4900' },
            { keywords: ['interest income', 'interest revenue'], code: '4860' },
            { keywords: ['dividend'], code: '4880' },

            // Current Assets (1xxx)
            { keywords: ['chequing', 'checking'], code: '1000' },
            { keywords: ['us account', 'usd'], code: '1030' },
            { keywords: ['savings'], code: '1035' },
            { keywords: ['investment', 'securities'], code: '1100' },
            { keywords: ['accounts receivable', 'ar'], code: '1210' },
            { keywords: ['inventory', 'stock'], code: '1300' },
            { keywords: ['prepaid'], code: '1350' },

            // Fixed Assets (1xxx)
            { keywords: ['land', 'property purchase'], code: '1500' },
            { keywords: ['building'], code: '1600' },
            { keywords: ['office equipment'], code: '1760' },
            { keywords: ['office furniture', 'furnishings'], code: '1762' },
            { keywords: ['heavy equipment'], code: '1765' },
            { keywords: ['vehicle', 'car', 'truck'], code: '1800' },
            { keywords: ['leasehold improvement'], code: '1840' },
            { keywords: ['computer equipment', 'laptop', 'hardware'], code: '1855' },
            { keywords: ['computer software', 'software license'], code: '1857' },
            { keywords: ['goodwill'], code: '1950' },

            // Liabilities (2xxx)
            { keywords: ['demand loan'], code: '2010' },
            { keywords: ['accounts payable', 'ap'], code: '2100' },
            { keywords: ['visa', 'visa payable'], code: '2101' },
            { keywords: ['bonus payable'], code: '2103' },
            { keywords: ['unearned revenue', 'deferred revenue'], code: '2120' },
            { keywords: ['accrued'], code: '2140' },
            { keywords: ['gst'], code: '2160' },
            { keywords: ['income tax deduction', 'tax withholding'], code: '2300' },
            { keywords: ['cpp'], code: '2330' },
            { keywords: ['ei', 'employment insurance'], code: '2340' },
            { keywords: ['bank loan'], code: '2710' },
            { keywords: ['mortgage'], code: '2800' },

            // Direct Costs (5xxx)
            { keywords: ['equipment rental'], code: '5310' },
            { keywords: ['equipment repair'], code: '5320' },
            { keywords: ['direct fuel', 'direct oil'], code: '5330' },
            { keywords: ['materials', 'direct materials'], code: '5335' },
            { keywords: ['direct insurance'], code: '5340' },
            { keywords: ['purchase', 'inventory purchase'], code: '5350' },
            { keywords: ['subcontractor'], code: '5360' },
            { keywords: ['direct wages'], code: '5377' },
            { keywords: ['freight'], code: '5700' },

            // Operating Expenses (6xxx-9xxx)
            { keywords: ['advertising', 'marketing', 'ads'], code: '6000' },
            { keywords: ['amortization', 'depreciation'], code: '6100' },
            { keywords: ['bad debt', 'uncollectible'], code: '6300' },
            { keywords: ['building repair'], code: '6400' },
            { keywords: ['business tax', 'property tax'], code: '6410' },
            { keywords: ['client meal', 'entertainment'], code: '6415' },
            { keywords: ['conference'], code: '6420' },
            { keywords: ['consulting'], code: '6450' },
            { keywords: ['contract wage', 'contractor'], code: '6500' },
            { keywords: ['courier', 'delivery'], code: '6550' },
            { keywords: ['credit card charge', 'merchant fee'], code: '6600' },
            { keywords: ['donation', 'charity'], code: '6750' },
            { keywords: ['dues', 'membership', 'subscription'], code: '6800' },
            { keywords: ['employee benefit'], code: '6900' },
            { keywords: ['equipment rental', 'rental'], code: '7000' },
            { keywords: ['equipment repair'], code: '7100' },
            { keywords: ['fuel', 'oil', 'gas', 'gasoline', 'shell', 'chevron', 'esso'], code: '7400' },
            { keywords: ['insurance', 'liability', 'policy'], code: '7600' },
            { keywords: ['bank fee', 'service charge', 'transaction fee', 'bank charge', 'interest'], code: '7700' },
            { keywords: ['legal', 'lawyer', 'attorney'], code: '7890' },
            { keywords: ['management remuneration'], code: '8400' },
            { keywords: ['materials and supplies'], code: '8450' },
            { keywords: ['miscellaneous'], code: '8500' },
            { keywords: ['office supplies', 'postage', 'stationery', 'staples'], code: '8600' },
            { keywords: ['professional fee', 'accounting', 'bookkeeping'], code: '8700' },
            { keywords: ['property tax'], code: '8710' },
            { keywords: ['rent', 'lease'], code: '8720' },
            { keywords: ['repair', 'maintenance'], code: '8800' },
            { keywords: ['security'], code: '8850' },
            { keywords: ['shop supplies'], code: '8900' },
            { keywords: ['subcontracting'], code: '8950' },
            { keywords: ['telephone', 'phone', 'mobile', 'cell'], code: '9100' },
            { keywords: ['travel', 'hotel', 'airfare', 'accommodation'], code: '9200' },
            { keywords: ['training', 'course', 'education'], code: '9250' },
            { keywords: ['utilities', 'electric', 'power', 'water', 'hydro'], code: '9500' },
            { keywords: ['uniform'], code: '9550' },
            { keywords: ['vehicle expense', 'auto'], code: '9700' },
            { keywords: ['workers comp', 'wcb'], code: '9750' },
            { keywords: ['wages', 'salary', 'payroll'], code: '9800' },
            { keywords: ['income tax'], code: '9950' },
            { keywords: ['unusual', 'other'], code: '9970' }
        ];

        // Try to find best match based on vendor name and category
        for (const mapping of accountMappings) {
            for (const keyword of mapping.keywords) {
                if (name.includes(keyword) || (category && category.toLowerCase().includes(keyword))) {
                    const account = accounts.find(a => a.code === mapping.code);
                    if (account) return account;
                }
            }
        }

        // Category-based fallback
        if (category) {
            const categoryMap = {
                'Office Supplies': '8600',
                'Meals & Entertainment': '6415',
                'Technology': '7700',
                'Utilities': '9500',
                'Auto & Fuel': '7400',
                'Insurance': '7600',
                'Bank Fees': '7700',
                'Professional Services': '8700',
                'Travel': '9200'
            };

            if (categoryMap[category]) {
                const account = accounts.find(a => a.code === categoryMap[category]);
                if (account) return account;
            }
        }

        // Income detection
        if (name.includes('payment') || name.includes('deposit') || name.includes('client') || name.includes('revenue')) {
            return accounts.find(a => a.code === '4000') || accounts.find(a => a.code === '4100');
        }

        // Credit card default
        if (isCreditCard) {
            return accounts.find(a => a.code === '8000') || accounts.find(a => a.code === '7700');
        }

        // Final fallback
        return accounts.find(a => a.code === '7700') || accounts.find(a => a.code === '9970');
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
