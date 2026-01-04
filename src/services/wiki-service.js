/**
 * AutoBookkeeping v3.0 - Wiki Service
 * External knowledge layer for vendor identification and categorization
 */

class WikiService {
    constructor() {
        this.apiUrl = 'https://en.wikipedia.org/w/api.php';
        this.cache = new Map();
    }

    /**
     * Search for a vendor on Wikipedia
     * @param {string} name - The vendor name to search for
     * @returns {Promise<Object|null>} - Best match info or null
     */
    async searchVendor(name) {
        if (!name) return null;

        // Check cache first
        const cacheKey = `search_${name.toUpperCase()}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        try {
            const params = new URLSearchParams({
                action: 'opensearch',
                search: name,
                limit: '1',
                namespace: '0',
                format: 'json',
                origin: '*'
            });

            const response = await fetch(`${this.apiUrl}?${params.toString()}`);
            const data = await response.json();

            // data format: [query, [titles], [extracts], [links]]
            if (data[1] && data[1].length > 0) {
                const result = {
                    title: data[1][0],
                    extract: data[2][0],
                    link: data[3][0]
                };
                this.cache.set(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.error('🌐 WikiService: Search failed', error);
        }

        return null;
    }

    /**
     * Get detailed info for a specific Wikipedia page
     * @param {string} title - The Wikipedia page title
     * @returns {Promise<Object|null>} - Detailed vendor info
     */
    async getVendorInfo(title) {
        const cacheKey = `info_${title}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        try {
            const params = new URLSearchParams({
                action: 'query',
                prop: 'extracts|categories',
                exintro: '1',
                explaintext: '1',
                titles: title,
                format: 'json',
                origin: '*'
            });

            const response = await fetch(`${this.apiUrl}?${params.toString()}`);
            const data = await response.json();
            const pages = data.query.pages;
            const pageId = Object.keys(pages)[0];
            const page = pages[pageId];

            if (pageId !== '-1') {
                const info = {
                    title: page.title,
                    extract: page.extract,
                    categories: (page.categories || []).map(cat => cat.title)
                };
                this.cache.set(cacheKey, info);
                return info;
            }
        } catch (error) {
            console.error('🌐 WikiService: Info fetch failed', error);
        }

        return null;
    }

    /**
     * Suggest an industry based on Wiki categories and extract
     * @param {Object} wikiInfo - The info returned by getVendorInfo
     * @returns {string|null} - Suggested industry or null
     */
    guessIndustry(wikiInfo) {
        if (!wikiInfo) return null;

        const text = (wikiInfo.extract + ' ' + wikiInfo.categories.join(' ')).toLowerCase();

        // Keywords from categorize-engine.js logic
        const industryKeywords = {
            'Dining & Drinks': ['restaurant', 'cafe', 'coffee', 'bakery', 'pub', 'food', 'fast food'],
            'Groceries': ['supermarket', 'grocery', 'produce', 'fruit', 'vegetable'],
            'Transportation & Fuel': ['airline', 'airline', 'transit', 'bus', 'train', 'fuel', 'gas station', 'petroleum'],
            'Shopping': ['retail', 'retailer', 'department store', 'clothing', 'fashion', 'electronics', 'furniture'],
            'Travel & Lodging': ['hotel', 'resort', 'tourism', 'inn', 'lodging', 'accommodation'],
            'Automotive': ['car', 'automobile', 'vehicle', 'automotive', 'dealer', 'garage', 'mechanic'],
            'Health & Beauty': ['pharmacy', 'drugstore', 'healthcare', 'medical', 'spa', 'gym', 'fitness', 'salon'],
            'Professional Services': ['bank', 'financial', 'insurance', 'law', 'legal', 'accounting', 'consulting'],
            'Utilities & Housing': ['utility', 'electricity', 'water', 'gas', 'property', 'real estate', 'apartment'],
            'Entertainment': ['cinema', 'theatre', 'movie', 'concert', 'museum', 'park', 'attraction']
        };

        for (const [industry, keywords] of Object.entries(industryKeywords)) {
            if (keywords.some(kw => text.includes(kw))) {
                return industry;
            }
        }

        return null;
    }
}

// Global Singleton
window.wikiService = new WikiService();
console.log('🌐 Wiki Service Loaded');
