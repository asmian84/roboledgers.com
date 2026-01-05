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
     * Categorize transaction using MCCor AI
     * @param {object} transaction
     * @returns {Promise<object>} { category, account, confidence }
     */
    async categorize(transaction) {
        await this.init();

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

        // Step 2: Try pattern matching against known merchant names
        const merchantResult = this._matchMerchantKeywords(transaction.description);
        if (merchantResult) {
            return {
                category: merchantResult.category,
                account: this._mapCategoryToAccount(merchantResult.category),
                confidence: 0.85,
                method: 'MCC Merchant Pattern'
            };
        }

        // Step 3: Fall back to Google AI API
        if (this.apiKey) {
            return await this._callGeminiAPI(transaction);
        }

        return null; // No categorization possible
    }

    /**
     * Look up MCC code
     */
    lookupMCC(mccCode) {
        return this.mccCodes[mccCode] || null;
    }

    /**
     * Match merchant name against MCC code descriptions
     */
    _matchMerchantKeywords(description) {
        const desc = description.toLowerCase();

        // Airline keywords
        if (desc.match(/airline|airways|united|delta|southwest|jetblue/)) {
            return { category: 'Travel:Airfare', description: 'Airlines' };
        }

        // Gas stations
        if (desc.match(/shell|exxon|chevron|bp|mobil|valero|circle k|7-eleven|wawa/)) {
            return { category: 'Transportation:Fuel', description: 'Gas Station' };
        }

        // Grocery
        if (desc.match(/walmart|target|safeway|kroger|publix|whole foods|trader joe/)) {
            return { category: 'Food & Dining:Groceries', description: 'Grocery Store' };
        }

        // Restaurants
        if (desc.match(/restaurant|cafe|coffee|starbucks|dunkin|mcdonald|burger|pizza/)) {
            return { category: 'Food & Dining:Restaurants', description: 'Restaurant' };
        }

        // Utilities
        if (desc.match(/electric|power|energy|pacific gas|con edison|duke energy/)) {
            return { category: 'Utilities:Electric', description: 'Electric Utility' };
        }

        if (desc.match(/verizon|att|t-mobile|sprint|phone|wireless/)) {
            return { category: 'Utilities:Phone', description: 'Phone/Internet' };
        }

        // Streaming services
        if (desc.match(/netflix|hulu|disney|spotify|apple music|youtube premium/)) {
            return { category: 'Entertainment:Streaming', description: 'Streaming Service' };
        }

        // Amazon
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

        const prompt = `Categorize this transaction into one of the standard bookkeeping categories:
    
Transaction: ${transaction.description}
Amount: $${Math.abs(transaction.amount)}
Type: ${transaction.amount < 0 ? 'Expense' : 'Income'}

Choose the most appropriate category from:
- Food & Dining (subcategories: Restaurants, Groceries, Fast Food)
- Transportation (subcategories: Fuel, Auto, Public Transit)
- Shopping (subcategories: Clothing, Electronics, General)
- Utilities (subcategories: Electric, Water, Phone, Internet)
- Healthcare (subcategories:Medical, Dental, Pharmacy)
- Entertainment (subcategories: Movies, Sports, Streaming)
- Travel (subcategories: Airfare, Hotels, Car Rental)
- Services (subcategories: Legal, Accounting, Professional)
- Business Income
- Other Income

Respond in JSON format:
{
  "category": "Category:Subcategory",
  "account": "Account Name",
  "confidence": 0.95,
  "reasoning": "Brief explanation"
}`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${this.apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            });

            if (!response.ok) {
                throw new Error(`API call failed: ${response.status}`);
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
            console.warn('Google AI API call failed:', error);
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
