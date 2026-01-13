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
        // We use the CLEAN description for better matching
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
            // Pass the ORIGINAL string to Gemini, but also the CLEAN one if needed.
            // Actually, for V2, let's pass the ORIGINAL so it has full context,
            // but the Prompt will be smarter.
            return await this._callGeminiAPI(transaction);
        }

        return null; // No categorization possible
    }


    /**
     * Test connection with a dummy prompt
     */
    async testConnection(testKey) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`;
        const prompt = "Reply with 'Success' in JSON format: {\"status\": \"Success\"}";

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': testKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                return { success: false, message: `HTTP ${response.status}: ${errorData.error?.message || 'Unknown error'}` };
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;
            if (text.toLowerCase().includes('success')) {
                return { success: true, message: 'Connection established!' };
            }
            return { success: false, message: 'Invalid response from API' };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    lookupMCC(mccCode) {
        return this.mccCodes[mccCode] || null;
    }

    /**
     * Match merchant name against MCC code descriptions
     * V2 UPDATE: STRICT MODE. No single generic words (like "United" or "Delta").
     */
    _matchMerchantKeywords(description) {
        const desc = description.toLowerCase();

        // Airline keywords (STRICT: Must be explicit for generic words)
        // "United" -> Fail. "United Airlines" -> Pass.
        // "Delta" -> Fail. "Delta Air" -> Pass.
        if (desc.match(/airlines|airways|united air|delta air|southwest air|jetblue|lufthansa|british air|air canada/)) {
            return { category: 'Travel:Airfare', description: 'Airlines' };
        }

        // Gas stations (STRICT)
        if (desc.match(/shell oil|exxon|chevron|bp gas|mobil gas|valero|circle k|7-eleven|wawa/)) {
            return { category: 'Transportation:Fuel', description: 'Gas Station' };
        }

        // Grocery (STRICT)
        // Kroger, Safeway, Publix are distinct enough to not need "Store" suffix.
        if (desc.match(/walmart|target|safeway|kroger|publix|whole foods|trader joe|loblaws|metro/)) {
            return { category: 'Food & Dining:Groceries', description: 'Grocery Store' };
        }

        // Restaurants (STRICT)
        if (desc.match(/starbucks|dunkin|mcdonald|burger king|pizza hut|domino|tim hortons/)) {
            return { category: 'Food & Dining:Restaurants', description: 'Restaurant' };
        }

        // Utilities
        if (desc.match(/pacific gas|con edison|duke energy|hydro/)) {
            return { category: 'Utilities:Electric', description: 'Electric Utility' };
        }

        if (desc.match(/verizon|t-mobile|sprint|rogers|bell|telus/)) {
            return { category: 'Utilities:Phone', description: 'Phone/Internet' };
        }

        // Streaming services
        // Relaxed "Disney+" to "Disney" because "Disney" is rarely a Vendor unless it's the company.
        if (desc.match(/netflix|hulu|disney|spotify|apple music|youtube premium|amazon prime/)) {
            return { category: 'Entertainment:Streaming', description: 'Streaming Service' };
        }

        // Amazon
        // "Amazon" is distinct enough. "Amazon Mkt" was too strict.
        if (desc.match(/amazon|amzn/)) {
            return { category: 'Shopping:Online', description: 'Amazon' };
        }

        return null;
    }

    /**
     * Call Google Gemini API for categorization
     */
    async _callGeminiAPI(transaction) {
        if (!this.apiKey) return null;

        // V2 PROMPT: Context Aware
        const prompt = `You are an expert bookkeeping AI. Your job is to categorize financial transactions.
        
CRITICAL RULE: Distinguish between the VENDOR (who got paid) and the LOCATION.
Example: "Disney Plus United States" -> Vendor is "Disney Plus" (Streaming), Location is "United States". Do NOT categorize as "Travel/Airline" just because you see "United".

Transaction Description: "${transaction.description}"
Amount: $${Math.abs(transaction.amount)}
Type: ${transaction.amount < 0 ? 'Expense' : 'Income'}

Select the specific Category from this list:
- Food & Dining:Restaurants
- Food & Dining:Groceries
- Food & Dining:Fast Food
- Transportation:Fuel
- Transportation:Auto
- Transportation:Public Transit
- Shopping:Clothing
- Shopping:Electronics
- Shopping:General
- Utilities:Electric
- Utilities:Water
- Utilities:Phone
- Utilities:Internet
- Healthcare:Medical
- Healthcare:Dental
- Healthcare:Pharmacy
- Entertainment:Movies
- Entertainment:Sports
- Entertainment:Streaming
- Travel:Airfare
- Travel:Hotels
- Travel:Car Rental
- Services:Legal
- Services:Accounting
- Services:Professional
- Business Income
- Other Income

Respond with this exact JSON:
{
  "category": "Category:Subcategory",
  "account": "Account Name",
  "confidence": 0.95,
  "reasoning": "Identify the VENDOR first. Explain why."
}`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                const errorBody = await response.text();
                console.error(`Google AI API Error (${response.status}):`, errorBody);
                throw new Error(`API call failed: ${response.status} - ${errorBody}`);
            }

            const data = await response.json();
            const text = data.candidates[0].content.parts[0].text;

            // Extract JSON from response (might be wrapped in markdown)
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const result = JSON.parse(jsonMatch[0]);
                return {
                    ...result,
                    method: 'Google AI API'
                };
            }

        } catch (error) {
            console.error('Google AI API call failed:', error);
        }

        return null;
    }

    /**
     * Map category to account code
     */
    _mapCategoryToAccount(category) {
        const categoryMap = {
            'Food & Dining:Restaurants': '6300', // Meals & Entertainment
            'Food & Dining:Groceries': '6100', // Cost of Goods Sold
            'Food & Dining:Fast Food': '6300',
            'Transportation:Fuel': '6400', // Auto Expense
            'Transportation:Auto': '6400',
            'Shopping:Clothing': '6700', // Office Supplies
            'Shopping:General': '6700',
            'Utilities:Electric': '6800', // Utilities
            'Utilities:Phone': '6800',
            'Utilities:Internet': '6800',
            'Healthcare:Medical': '6500', // Insurance
            'Entertainment:Streaming': '6900', // Other Expenses
            'Travel:Airfare': '6600', // Travel
            'Services:Legal': '6900',
            'Business Income': '4000' // Revenue
        };

        return categoryMap[category] || '6900'; // Default to Other Expenses
    }
}

// Export as global singleton
window.GoogleAICategorizer = new GoogleAICategorizer();
