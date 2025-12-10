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
        const accountMappings = [
            // Revenue Accounts (4xxx)
            { keywords: ['revenue', 'sales', 'income', 'client payment', 'invoice', 'billing'], code: '4000' },
            { keywords: ['service revenue', 'consulting', 'professional service'], code: '4100' },
            { keywords: ['product sales', 'merchandise', 'goods sold'], code: '4200' },
            { keywords: ['interest income', 'dividend', 'investment income'], code: '4500' },

            // Current Assets (1xxx)
            { keywords: ['petty cash', 'cash on hand'], code: '1010' },
            { keywords: ['bank', 'checking', 'chequing'], code: '1020' },
            { keywords: ['savings account'], code: '1030' },
            { keywords: ['accounts receivable', 'ar', 'receivables'], code: '1200' },
            { keywords: ['inventory', 'stock'], code: '1300' },
            { keywords: ['prepaid expense', 'prepaid'], code: '1400' },

            // Fixed Assets (1xxx)
            { keywords: ['equipment', 'machinery', 'furniture', 'fixtures'], code: '1600' },
            { keywords: ['vehicle', 'car', 'truck', 'auto purchase'], code: '1620' },
            { keywords: ['building', 'property', 'real estate'], code: '1640' },
            { keywords: ['computer', 'laptop', 'hardware'], code: '1660' },

            // Liabilities (2xxx)
            { keywords: ['accounts payable', 'ap', 'payables'], code: '2000' },
            { keywords: ['credit card', 'mastercard', 'visa', 'amex'], code: '2100' },
            { keywords: ['loan', 'mortgage', 'line of credit'], code: '2300' },
            { keywords: ['payroll tax', 'withholding', 'cpp', 'ei'], code: '2400' },

            // Operating Expenses (7xxx)
            { keywords: ['advertising', 'marketing', 'promotion', 'ads'], code: '7100' },
            { keywords: ['bad debt', 'uncollectible'], code: '7200' },
            { keywords: ['commission', 'referral fee'], code: '7300' },
            { keywords: ['delivery', 'courier', 'shipping', 'freight'], code: '7400' },
            { keywords: ['dues', 'membership', 'subscription', 'association'], code: '7500' },
            { keywords: ['license', 'permit', 'registration'], code: '7600' },
            { keywords: ['office supplies', 'stationery', 'supplies', 'staples', 'depot'], code: '7710' },
            { keywords: ['computer supplies', 'software', 'tech', 'saas', 'cloud'], code: '7700' },
            { keywords: ['postage', 'mail', 'stamp'], code: '7800' },
            { keywords: ['rent', 'lease'], code: '7900' },

            // Professional Expenses (8xxx)
            { keywords: ['accounting', 'bookkeeping', 'accountant'], code: '8000' },
            { keywords: ['legal', 'lawyer', 'attorney'], code: '8010' },
            { keywords: ['consulting', 'consultant', 'advisor'], code: '8020' },
            { keywords: ['insurance', 'liability insurance', 'policy'], code: '8100' },
            { keywords: ['bank fee', 'service charge', 'transaction fee'], code: '8390' },
            { keywords: ['interest expense', 'finance charge'], code: '8400' },
            { keywords: ['depreciation'], code: '8500' },
            { keywords: ['telephone', 'phone', 'mobile', 'cell'], code: '8510' },
            { keywords: ['utilities', 'electric', 'gas', 'water', 'power', 'hydro'], code: '8520' },
            { keywords: ['internet', 'wifi', 'broadband', 'isp'], code: '8530' },
            { keywords: ['meals', 'restaurant', 'coffee', 'lunch', 'dinner', 'starbucks'], code: '8600' },
            { keywords: ['entertainment', 'event', 'conference'], code: '8610' },
            { keywords: ['fuel', 'gas', 'gasoline', 'diesel', 'shell', 'chevron'], code: '8620' },
            { keywords: ['vehicle maintenance', 'auto repair', 'oil change', 'tire'], code: '8630' },
            { keywords: ['parking', 'toll'], code: '8640' },
            { keywords: ['training', 'education', 'course', 'seminar'], code: '8700' },
            { keywords: ['travel', 'hotel', 'airfare', 'flight', 'accommodation'], code: '8710' },
            { keywords: ['wages', 'salary', 'payroll'], code: '8800' },
            { keywords: ['contract labor', 'contractor', 'freelancer'], code: '8810' },
            { keywords: ['employee benefit', 'health insurance', 'dental'], code: '8820' },

            // Other Expenses (9xxx)
            { keywords: ['donation', 'charity', 'contribution'], code: '9100' },
            { keywords: ['income tax', 'corporate tax'], code: '9200' },
            { keywords: ['penalty', 'fine', 'late fee'], code: '9300' },
            { keywords: ['miscellaneous', 'other', 'general'], code: '9970' }
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
                'Office Supplies': '7710',
                'Meals & Entertainment': '8600',
                'Technology': '7700',
                'Utilities': '8520',
                'Auto & Fuel': '8620',
                'Insurance': '8100',
                'Bank Fees': '8390',
                'Professional Services': '8000',
                'Travel': '8710'
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
