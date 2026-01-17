/**
 * Google AI Categorizer with MCC Codes
 * Uses MCC (Merchant Category Codes) + Gemini API for categorization
 */

class GoogleAICategorizer {
    constructor() {
        this.mccCodes = null; // Lazy-loaded MCC codes
        this.apiKey = null;
        this.initialized = false;
    }

    /**
     * Initialize with API key and MCC codes
     */
    async init() {
        if (this.initialized) return;

        // Load API key from settings
        const settings = await window.storage.getSettings();
        this.apiKey = settings.googleAiApiKey || null;

        // Load MCC codes
        await this.loadMCCCodes();

        this.initialized = true;
    }

    /**
     * Load Merchant Category Codes from embedded data
     * Data source: https://github.com/greggles/mcc-codes
   */
    async loadMCCCodes() {
        // MCC Code mapping (abbreviated - full list would be ~500 entries)
        // Format: MCC Code -> { category, description }
        this.mccCodes = {
            // Airlines
            '3000-3299': { category: 'Travel:Airfare', description: 'Airlines' },
            '4511': { category: 'Travel:Airfare', description: 'Airlines' },

            // Automotive
            '5511': { category: 'Transportation:Auto', description: 'Automotive Dealers' },
            '5541': { category: 'Transportation:Fuel', description: 'Service Stations' },
            '5542': { category: 'Transportation:Fuel', description: 'Automated Fuel Dispensers' },

            // Restaurants & Dining
            '5812': { category: 'Food & Dining:Restaurants', description: 'Eating Places' },
            '5814': { category: 'Food & Dining:Fast Food', description: 'Fast Food Restaurants' },

            // Grocery
            '5411': { category: 'Food & Dining:Groceries', description: 'Grocery Stores' },
            '5422': { category: 'Food & Dining:Groceries', description: 'Meat Markets' },

            // Utilities
            '4900': { category: 'Utilities:Electric', description: 'Utilities - Electric' },
            '4814': { category: 'Utilities:Phone', description: 'Telecommunication' },
            '4899': { category: 'Utilities:Internet', description: 'Cable/Internet' },

            // Healthcare
            '8011': { category: 'Healthcare:Medical', description: 'Doctors' },
            '8021': { category: 'Healthcare:Dental', description: 'Dentists' },
            '8062': { category: 'Healthcare:Medical', description: 'Hospitals' },

            // Entertainment
            '7832': { category: 'Entertainment:Movies', description: 'Motion Pictures' },
            '7929': { category: 'Entertainment:Music', description: 'Bands/Orchestras' },
            '7991': { category: 'Entertainment:Sports', description: 'Tourist Attractions' },

            // Retail
            '5311': { category: 'Shopping:Department Stores', description: 'Department Stores' },
            '5399': { category: 'Shopping:General', description: 'Miscellaneous General Merchandise' },
            '5661': { category: 'Shopping:Clothing', description: 'Shoe Stores' },
            '5941': { category: 'Shopping:Sporting Goods', description: 'Sporting Goods' },

            // Professional Services
            '8111': { category: 'Services:Legal', description: 'Legal Services' },
            '8931': { category: 'Services:Accounting', description: 'Accounting Services' },

            // Add more as needed...
        };
    }

    /**
     * Categorize transaction using MCC or AI
     * @param {object} transaction
     * @returns {Promise<object>} { category, account, confidence }
     */
    /**
     * Sanitize vendor string (Remove noise, locations, dates)
     */
    sanitizeVendorString(rawDescription) {
        if (!rawDescription) return "";
        let clean = rawDescription.toUpperCase();

        // 1. Remove Junk Words (Inc, LLC, Corp, etc.)
        clean = clean.replace(/\b(INC|LLC|LTD|CORP|CORPORATION|CO|NV|SA|GMBH)\b/g, '');

        // 2. Remove Common Locations (State Codes, Countries)
        // Note: This is "Surgical" - only remove if it looks like a location suffix
        const locations = [
            'UNITED STATES', 'USA', 'CANADA', 'CAN', 'UK', 'LONDON', 'TORONTO', 'VANCOUVER',
            'NY', 'CA', 'TX', 'FL', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'
        ];
        const locationRegex = new RegExp(`\\b(${locations.join('|')})\\b`, 'g');
        clean = clean.replace(locationRegex, '');

        // 3. Remove Store Numbers (e.g. #1234, Store 55)
        clean = clean.replace(/#\s*\d+/g, '').replace(/STORE\s*\d+/g, '');

        // 4. Remove Dates (MM/DD, DD/MM/YY)
        clean = clean.replace(/\d{2}\/\d{2}/g, '').replace(/\d{2}\/\d{2}\/\d{2,4}/g, '');

        // 5. Cleanup whitespace
        return clean.replace(/\s+/g, ' ').trim();
    }

    /**
     * Categorize transaction using MCC or AI
     * @param {object} transaction
     * @returns {Promise<object>} { category, account, confidence }
     */
    async categorize(transaction) {
        await this.init();

        // V2: Sanitize First
        const cleanDescription = this.sanitizeVendorString(transaction.description);

        // Step 1: Try MCC code lookup if available
        if (transaction.mccCode) {
            const mccResult = this.lookupMCC(transaction.mccCode);
            if (mccResult) {
                return {
                    category: mccResult.category,
                    account: this._mapCategoryToAccount(mccResult.category),
                    confidence: 0.95,
                    method: 'MCC Code'
                };
            }
        }

        // Step 2: Try pattern matching (STRICT V2 MODE)
        const merchantResult = this._matchMerchantKeywords(cleanDescription);
        if (merchantResult) {
            return {
                category: merchantResult.category,
                account: this._mapCategoryToAccount(merchantResult.category),
                confidence: 0.85,
                method: 'MCC Merchant Pattern (Strict)'
            };
        }

        // Step 3: Fall back to Google AI API
        if (this.apiKey) {
            return await this._callGeminiAPI(transaction);
        }

        return null; // No categorization possible
    }

    /**
     * Batch Categorize (Turbo Mode)
     * Processes multiple vendors in a single API call for massive speed gains.
     */
    async categorizeBatch(vendors) {
        await this.init();
        if (!this.apiKey) {
            console.error('❌ AI Turbo: API Key missing from settings!');
            throw new Error('MISSING_API_KEY');
        }

        console.log(`🚀 AI Turbo: Processing batch of ${vendors.length} vendors...`);

        // 1. Get Chart of Accounts for context
        const coa = await this._getCOAContext();

        // 2. Prepare the batch prompt
        const vendorList = vendors.map((v, i) => `${i + 1}. Description: "${v.description}"`).join('\n');

        const prompt = `You are an expert bookkeeping AI for a Canadian/US business. 
Categorize the following list of transactions into the provided Chart of Accounts.

### CHART OF ACCOUNTS (Source of Truth):
${coa}

### TRANSACTIONS TO CATEGORIZE:
${vendorList}

### INSTRUCTIONS:
1. Identify the VENDOR (who got paid) vs the LOCATION.
2. Select the BEST account code and name from the Chart of Accounts provided above.
3. If unsure, use "8500 - Miscellaneous" or "9970 - Unusual item".
4. Respond ONLY with a JSON array of objects.

### RESPONSE FORMAT:
[
  { "id": 1, "account": "CODE", "category": "NAME", "confidence": 0.95, "reasoning": "Brief explanation" },
  { "id": 2, "account": "CODE", "category": "NAME", "confidence": 0.85, "reasoning": "Brief explanation" }
]`;

        try {
            console.log('📡 Sending request to Gemini prompt length:', prompt.length);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-goog-api-key': this.apiKey },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                const errText = await response.text();
                console.error(`❌ AI Batch Call Failed: HTTP ${response.status}`, errText);
                throw new Error(`API failed: ${response.status}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            console.log('📥 Raw Response from Gemini:', text.substring(0, 500), '...');

            // Better JSON extraction to handle code blocks
            const jsonMatch = text.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                const results = JSON.parse(jsonMatch[0]);
                console.log('✅ Parsed Batch results:', results.length);
                // Map results back to vendor order
                return vendors.map((v, i) => {
                    const match = results.find(r => r.id === (i + 1));
                    return match ? { ...match, method: 'Turbo Gemini Batch' } : null;
                });
            } else {
                console.warn('⚠️ No JSON array found in Gemini response.');
            }
        } catch (err) {
            console.error('❌ AI Batch Call Failure Error:', err);
        }

        return vendors.map(v => null);
    }

    async _getCOAContext() {
        const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
        let rawCustom = [];
        try { rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }

        const fullCOA = [...rawDefault, ...rawCustom].filter(a => a.type === 'Expense' || a.type === 'Revenue');
        return fullCOA.map(a => `${a.code} - ${a.name} (${a.category})`).join('\n');
    }

    /**
     * Helper to call fetch with exponential backoff on 429 errors
     */
    async _fetchWithRetry(url, options, maxRetries = 3) {
        let lastError;
        for (let i = 0; i < maxRetries; i++) {
            try {
                const response = await fetch(url, options);

                // If it's a rate limit error (429) or server error (500+), retry
                if (response.status === 429 || response.status >= 500) {
                    const delay = Math.pow(2, i) * 1000 + Math.random() * 500;
                    console.warn(`⚠️ Gemini API ${response.status}: Retrying in ${delay.toFixed(0)}ms... (Attempt ${i + 1}/${maxRetries})`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }

                return response;
            } catch (err) {
                lastError = err;
                if (i === maxRetries - 1) throw err;
                const delay = Math.pow(2, i) * 1000;
                await new Promise(r => setTimeout(r, delay));
            }
        }
        throw lastError;
    }

    /**
     * Batch Categorize (Turbo Mode)
     * Processes multiple vendors with SMART DEDUPLICATION.
     */
    async categorizeBatch(vendors) {
        await this.init();
        if (!this.apiKey) throw new Error('MISSING_API_KEY');

        // 1. SMART DEDUPLICATION: Only ask for unique vendor descriptions
        const uniqueMap = new Map();
        vendors.forEach((v, i) => {
            const clean = this.sanitizeVendorString(v.description);
            if (!uniqueMap.has(clean)) {
                uniqueMap.set(clean, { description: clean, originalIndices: [] });
            }
            uniqueMap.get(clean).originalIndices.push(i);
        });

        const uniqueVendors = Array.from(uniqueMap.values());
        console.log(`🚀 AI Turbo: Deduplicated ${vendors.length} vendors into ${uniqueVendors.length} unique prompts.`);

        // 2. Get Chart of Accounts for context
        const coa = await this._getCOAContext();

        // 3. Prepare the batch prompt (using unique vendors)
        const vendorList = uniqueVendors.map((v, i) => `${i + 1}. Description: "${v.description}"`).join('\n');

        const prompt = `You are an expert bookkeeping AI for a Canadian/US business. 
Categorize the following list of transactions into the provided Chart of Accounts.

### CHART OF ACCOUNTS (Source of Truth):
${coa}

### TRANSACTIONS TO CATEGORIZE:
${vendorList}

### INSTRUCTIONS:
1. Identify the VENDOR (who got paid) vs the LOCATION.
2. Select the BEST account code and name from the Chart of Accounts provided above.
3. If unsure, use "8500 - Miscellaneous" or "9970 - Unusual item".
4. Respond ONLY with a JSON array of objects.

### RESPONSE FORMAT:
[
  { "id": 1, "account": "CODE", "category": "NAME", "confidence": 0.95, "reasoning": "Brief explanation" },
  { "id": 2, "account": "CODE", "category": "NAME", "confidence": 0.85, "reasoning": "Brief explanation" }
]`;

        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent`;
            const response = await this._fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-goog-api-key': this.apiKey },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`API failed: ${response.status} - ${errText}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                const uniqueResults = JSON.parse(jsonMatch[0]);
                const finalResults = new Array(vendors.length).fill(null);

                // Map results back to all original occurrences
                uniqueResults.forEach(r => {
                    const uniqueIndex = r.id - 1;
                    if (uniqueVendors[uniqueIndex]) {
                        uniqueVendors[uniqueIndex].originalIndices.forEach(origIdx => {
                            finalResults[origIdx] = { ...r, method: 'Turbo Gemini 2.0 Batch' };
                        });
                    }
                });
                return finalResults;
            }
        } catch (err) {
            console.error('❌ AI Batch Call Failure:', err);
        }

        return vendors.map(v => null);
    }

    /**
     * Test connection with Gemini 2.0 Flash
     */
    async testConnection(testKey) {
        const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent`;
        const prompt = "Reply with 'Success' in JSON format: {\"status\": \"Success\"}";

        try {
            const response = await this._fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-goog-api-key': testKey },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, message: `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}` };
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            return text.toLowerCase().includes('success')
                ? { success: true, message: 'Gemini 2.0 Flash: Connected!' }
                : { success: false, message: 'Invalid response from API' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    lookupMCC(mccCode) {
        return this.mccCodes[mccCode] || null;
    }

    _matchMerchantKeywords(description) {
        const desc = description.toLowerCase();
        if (desc.match(/airlines|airways|united air|delta air|southwest air|jetblue|lufthansa|british air|air canada/))
            return { category: 'Travel:Airfare', description: 'Airlines' };
        if (desc.match(/shell oil|exxon|chevron|bp gas|mobil gas|valero|circle k|7-eleven|wawa/))
            return { category: 'Transportation:Fuel', description: 'Gas Station' };
        if (desc.match(/walmart|target|safeway|kroger|publix|whole foods|trader joe|loblaws|metro/))
            return { category: 'Food & Dining:Groceries', description: 'Grocery Store' };
        if (desc.match(/starbucks|dunkin|mcdonald|burger king|pizza hut|domino|tim hortons/))
            return { category: 'Food & Dining:Restaurants', description: 'Restaurant' };
        if (desc.match(/pacific gas|con edison|duke energy|hydro/))
            return { category: 'Utilities:Electric', description: 'Electric Utility' };
        if (desc.match(/verizon|t-mobile|sprint|rogers|bell|telus/))
            return { category: 'Utilities:Phone', description: 'Phone/Internet' };
        if (desc.match(/netflix|hulu|disney|spotify|apple music|youtube premium|amazon prime/))
            return { category: 'Entertainment:Streaming', description: 'Streaming Service' };
        if (desc.match(/amazon|amzn/))
            return { category: 'Shopping:Online', description: 'Amazon' };
        return null;
    }

    async _callGeminiAPI(transaction) {
        if (!this.apiKey) return null;

        const prompt = `You are an expert bookkeeping AI. Categorize: "${transaction.description}"
        Respond with exact JSON: { "category": "Category", "account": "Code", "confidence": 0.95, "reasoning": "..." }`;

        try {
            const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent`;
            const response = await this._fetchWithRetry(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-goog-api-key': this.apiKey },
                body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
            });

            if (!response.ok) return null;
            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) return { ...JSON.parse(jsonMatch[0]), method: 'Google AI 2.0' };
        } catch (error) {
            console.error('Single gemini call failed:', error);
        }
        return null;
    }

    _mapCategoryToAccount(category) {
        const categoryMap = {
            'Food & Dining:Restaurants': '6300',
            'Food & Dining:Groceries': '6100',
            'Food & Dining:Fast Food': '6300',
            'Transportation:Fuel': '6400',
            'Transportation:Auto': '6400',
            'Shopping:Clothing': '6700',
            'Shopping:General': '6700',
            'Utilities:Electric': '6800',
            'Utilities:Phone': '6800',
            'Utilities:Internet': '6800',
            'Healthcare:Medical': '6500',
            'Entertainment:Streaming': '6900',
            'Travel:Airfare': '6600',
            'Services:Legal': '6900',
            'Business Income': '4000'
        };
        return categoryMap[category] || '6900';
    }
}

window.GoogleAICategorizer = new GoogleAICategorizer();
