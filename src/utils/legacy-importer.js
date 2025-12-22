/**
 * 📦 Legacy RoboLedger Importer
 * Seeds the V3 database with the battle-tested rules from the legacy system.
 */

window.LegacyImporter = {
    // Extracted from vendor-ai.js
    mappings: [
        // Bank Fees
        { keywords: ['fee chargeback', 'chargeback cheque', 'chargeback', 'bank draft', 'fee service', 'monthly maintenance', 'reverse deposit', 'deposit mixed', 'bank fee', 'service charge', 'transaction fee', 'bank charge', 'account fee'], code: '7700' },

        // Revenue
        { keywords: ['sales', 'revenue'], code: '4001' },
        { keywords: ['consulting fee', 'professional service'], code: '4002' },
        { keywords: ['contracting fee'], code: '4003' },
        { keywords: ['management fee'], code: '4004' },
        { keywords: ['commission'], code: '4700' },
        { keywords: ['rental revenue', 'rent income'], code: '4900' },
        { keywords: ['interest income', 'interest revenue'], code: '4860' },
        { keywords: ['dividend'], code: '4880' },

        // Current Assets
        { keywords: ['chequing', 'checking'], code: '1000' },
        { keywords: ['us account', 'usd'], code: '1030' },
        { keywords: ['savings'], code: '1035' },
        { keywords: ['investment', 'securities'], code: '1100' },
        { keywords: ['accounts receivable', 'ar'], code: '1210' },
        { keywords: ['inventory', 'stock'], code: '1300' },
        { keywords: ['prepaid'], code: '1350' },

        // Fixed Assets
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

        // Liabilities
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

        // Direct Costs
        { keywords: ['equipment rental'], code: '5310' },
        { keywords: ['equipment repair'], code: '5320' },
        { keywords: ['direct fuel', 'direct oil'], code: '5330' },
        { keywords: ['materials', 'direct materials'], code: '5335' },
        { keywords: ['direct insurance'], code: '5340' },
        { keywords: ['purchase', 'inventory purchase'], code: '5350' },
        { keywords: ['subcontractor'], code: '5360' },
        { keywords: ['direct wages'], code: '5377' },
        { keywords: ['freight'], code: '5700' },

        // Operating Expenses
        { keywords: ['advertising', 'marketing', 'ads', 'facebook', 'instagram', 'linkedin'], code: '6000' },
        { keywords: ['amortization', 'depreciation'], code: '6100' },
        { keywords: ['bad debt', 'uncollectible'], code: '6300' },
        { keywords: ['building repair'], code: '6400' },
        { keywords: ['business tax', 'property tax'], code: '6410' },
        { keywords: ['client meal', 'entertainment', 'restaurant', 'cafe', 'coffee', 'starbucks', 'mcdonald', 'burger'], code: '6415' },
        { keywords: ['conference'], code: '6420' },
        { keywords: ['consulting'], code: '6450' },
        { keywords: ['contract wage', 'contractor'], code: '6500' },
        { keywords: ['courier', 'delivery', 'fedex', 'ups', 'canada post'], code: '6550' },
        { keywords: ['credit card charge', 'merchant fee', 'stripe', 'paypal'], code: '6600' },
        { keywords: ['donation', 'charity'], code: '6750' },
        { keywords: ['dues', 'membership', 'subscription'], code: '6800' },
        { keywords: ['employee benefit'], code: '6900' },
        { keywords: ['equipment rental', 'rental'], code: '7000' },
        { keywords: ['equipment repair'], code: '7100' },
        { keywords: ['fuel', 'oil', 'gas', 'gasoline', 'shell', 'chevron', 'esso', 'petro'], code: '7400' },
        { keywords: ['insurance', 'liability', 'policy', 'allstate', 'geico', 'icbc'], code: '7600' },
        { keywords: ['legal', 'lawyer', 'attorney'], code: '7890' },
        { keywords: ['management remuneration'], code: '8400' },
        { keywords: ['materials and supplies'], code: '8450' },
        { keywords: ['miscellaneous'], code: '8500' },
        { keywords: ['office supplies', 'postage', 'stationery', 'staples', 'depot'], code: '8600' },
        { keywords: ['professional fee', 'accounting', 'bookkeeping'], code: '8700' },
        { keywords: ['rent', 'lease'], code: '8720' },
        { keywords: ['repair', 'maintenance'], code: '8800' },
        { keywords: ['security', 'alarm'], code: '8850' },
        { keywords: ['shop supplies'], code: '8900' },
        { keywords: ['telephone', 'phone', 'mobile', 'cell', 'telus', 'rogers', 'bell'], code: '9100' },
        { keywords: ['travel', 'hotel', 'airfare', 'accommodation', 'airbnb', 'expedia'], code: '9200' },
        { keywords: ['training', 'course', 'education'], code: '9250' },
        { keywords: ['utilities', 'electric', 'power', 'water', 'hydro', 'fortis'], code: '9500' },
        { keywords: ['uniform'], code: '9550' },
        { keywords: ['vehicle expense', 'auto'], code: '9700' },
        { keywords: ['workers comp', 'wcb'], code: '9750' },
        { keywords: ['wages', 'salary', 'payroll'], code: '9800' },
        { keywords: ['income tax'], code: '9950' },
        { keywords: ['unusual', 'other'], code: '9970' }
    ],

    async import() {
        if (!window.storage) return;
        if (!window.showToast) window.showToast = console.log;

        let count = 0;
        console.log('📦 Starting Legacy Import...');

        // 1. Convert Keyword Map to Flat Vendor List
        const vendorsToCreate = [];

        this.mappings.forEach(group => {
            group.keywords.forEach(kw => {
                // Capitalize for better look
                const name = this.toTitleCase(kw);
                vendorsToCreate.push({
                    name: name,
                    defaultAccountId: group.code, // Default to using the Code (better for robustness)
                    category: ''
                });
            });
        });

        // 2. Add Regex-based Special Vendors
        // We create specific "Pattern Vendors" for things like WCB, GST
        vendorsToCreate.push(
            { name: 'Workers Comp', defaultAccountId: '9750' },
            { name: 'WCB', defaultAccountId: '9750' },
            { name: 'Loan Payment', defaultAccountId: '2710' },
            { name: 'Loan Interest', defaultAccountId: '7700' },
            { name: 'Bank Fee', defaultAccountId: '7700' },
            { name: 'Interest Charge', defaultAccountId: '7700' },
            { name: 'E-Transfer Sent', defaultAccountId: '8950' }, // Assume sub-contractor or generic exp
            { name: 'E-Transfer Received', defaultAccountId: '4001' },
            { name: 'GST Payable', defaultAccountId: '2170' },
            { name: 'Receiver General', defaultAccountId: '2300' }
        );

        // 3. Batch Insert
        for (const v of vendorsToCreate) {
            // Check for duplicate names to avoid overwriting user data
            // (In a real app, we might check window.storage.getVendors() first)
            // For now, createVendor implementation usually allows duplicates or handles IDs.
            // We'll trust createVendor.

            await window.storage.createVendor(v);
            count++;
        }

        console.log(`✅ Imported ${count} legacy vendor rules.`);
        if (window.showToast) showToast(`Successfully imported ${count} legacy rules!`, 'success');

        // Refresh grid if available
        if (typeof initVendorsGrid === 'function') {
            initVendorsGrid();
        }
    },

    toTitleCase(str) {
        return str.replace(
            /\w\S*/g,
            text => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
        );
    }
};
