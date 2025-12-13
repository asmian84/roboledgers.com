/**
 * GoogleSearchService
 * Handles integration with Google Custom Search API to enrich vendor data.
 */
const GoogleSearchService = {
    /**
     * Search for a vendor by name
     * @param {string} query - The search query (vendor name)
     * @returns {Promise<Object>} - Simplifed search result { title, snippet, link }
     */
    async searchVendor(query) {
        if (!window.Settings) {
            console.error('Settings not loaded');
            return null;
        }

        const apiKey = Settings.get('googleApiKey');
        const cx = Settings.get('googleSearchCx');

        if (!apiKey || !cx) {
            console.warn('Google Search API not configured. Missing API Key or CX.');
            return null;
        }

        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url);

            if (!response.ok) {
                console.error(`Google Search Error: ${response.status} ${response.statusText}`);
                return null;
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                return null; // No results
            }

            // Return the top result simplifed
            const topResult = data.items[0];
            return {
                title: topResult.title,
                snippet: topResult.snippet,
                link: topResult.link,
                displayLink: topResult.displayLink,
                pagemap: topResult.pagemap || {} // 🧠 The Brain: Contains Schema.org & Metatags
            };

        } catch (error) {
            console.error('Google Search Exception:', error);
            return null;
        }
    },

    /**
     * Suggest a better name based on search result
     * @param {Object} searchResult 
     * @returns {string|null}
     */
    suggestName(searchResult) {
        if (!searchResult) return null;

        let title = searchResult.title;

        // Clean up common SEO junk in titles
        // e.g. "Amazon.com: Online Shopping..." -> "Amazon.com"
        const separators = [':', '|', '-', '–', '—'];
        for (const sep of separators) {
            const index = title.indexOf(sep);
            if (index > 0) {
                title = title.substring(0, index).trim();
            }
        }

        return title;
    }
};

window.GoogleSearchService = GoogleSearchService;
