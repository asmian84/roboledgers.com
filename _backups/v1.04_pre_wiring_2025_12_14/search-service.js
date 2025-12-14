/**
 * SearchService
 * Hybrid Search Engine for Vendor Enrichment
 * Priority: 1. Wikipedia (Free) -> 2. Google Custom Search (Paid/Key)
 */
const SearchService = {
    cacheKey: 'search_service_cache',
    lastRequestTime: 0,
    minDelay: 1500, // 1.5s delay to be polite to APIs

    getCache() {
        try {
            return JSON.parse(localStorage.getItem(this.cacheKey)) || {};
        } catch (e) {
            return {};
        }
    },

    setCache(query, result) {
        try {
            const cache = this.getCache();
            cache[query] = {
                result,
                timestamp: Date.now()
            };
            localStorage.setItem(this.cacheKey, JSON.stringify(cache));
        } catch (e) {
            console.warn('Cache write failed:', e);
        }
    },

    /**
     * Main Entry Point
     * @param {string} query - Vendor name to search
     */
    async searchVendor(query) {
        if (!query) return null;

        // 1. Check Cache
        const cache = this.getCache();
        if (cache[query]) {
            console.log(`🎯 Cache Hit for: "${query}"`);
            return cache[query].result;
        }

        // 2. Throttle
        await this.throttle();

        // 3. Try Wikipedia (Free)
        console.log(`🌍 Querying Wikipedia for: "${query}"...`);
        let result = await this.searchWikipedia(query);

        // 4. Fallback to Google (if configured)
        if (!result) {
            if (this.hasGoogleConfig()) {
                console.log(`🔍 Wikipedia miss. Falling back to Google for: "${query}"...`);
                result = await this.searchGoogle(query);
            } else {
                console.log(`❌ Wikipedia miss and no Google Key found. Giving up on: "${query}"`);
            }
        }

        // 5. Cache result (even if null, to avoid re-searching empty voids)
        this.setCache(query, result);
        return result;
    },

    /**
     * Wikipedia API (Free, No Key)
     */
    async searchWikipedia(query) {
        try {
            // "srsearch" sends the query, "origin=*" allows CORS
            const endpoint = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&format=json&origin=*`;

            const response = await fetch(endpoint);
            const data = await response.json();

            if (data.query && data.query.search && data.query.search.length > 0) {
                const best = data.query.search[0];

                // Quality Check: Is this likely a company/business?
                // Wikipedia snippets usually contain "American multinational...", "Canadian corporation...", etc.
                // We'll trust the top result for now.

                return {
                    source: 'Wikipedia',
                    title: best.title,
                    snippet: this.cleanWikiSnippet(best.snippet),
                    link: `https://en.wikipedia.org/wiki/${encodeURIComponent(best.title)}`
                };
            }
            return null;

        } catch (error) {
            console.warn('Wikipedia API Error:', error);
            return null;
        }
    },

    /**
     * Google Custom Search API (Requires Key)
     * Copied from original GoogleSearchService
     */
    async searchGoogle(query) {
        const apiKey = Settings.get('googleApiKey');
        const cx = Settings.get('googleSearchCx');

        if (!apiKey || !cx) return null;

        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

        try {
            const response = await fetch(url);
            if (!response.ok) return null;

            const data = await response.json();
            if (!data.items || data.items.length === 0) return null;

            const topResult = data.items[0];
            return {
                source: 'Google',
                title: topResult.title,
                snippet: topResult.snippet,
                link: topResult.link
            };

        } catch (error) {
            console.error('Google API Error:', error);
            return null;
        }
    },

    // --- Helpers ---

    async throttle() {
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        if (timeSinceLast < this.minDelay) {
            await new Promise(resolve => setTimeout(resolve, this.minDelay - timeSinceLast));
        }
        this.lastRequestTime = Date.now();
    },

    hasGoogleConfig() {
        return window.Settings && Settings.get('googleApiKey') && Settings.get('googleSearchCx');
    },

    cleanWikiSnippet(htmlSnippet) {
        // Wiki returns HTML spans like <span class="searchmatch">Starbucks</span>
        // We strip tags for clean text
        const tmp = document.createElement('div');
        tmp.innerHTML = htmlSnippet;
        return tmp.textContent || tmp.innerText || "";
    },

    /**
     * Extract the clean name from a result
     * e.g. "Starbucks Corporation - Wikipedia" -> "Starbucks"
     */
    suggestName(result) {
        if (!result) return null;
        let title = result.title;

        // Clean up title
        title = title.replace(/ - Wikipedia$/, '');
        title = title.replace(/ Corporation$/, '');
        title = title.replace(/ Inc\.$/, '');
        title = title.replace(/ Ltd\.$/, '');
        title = title.replace(/ \(company\)$/, '');

        return title;
    }
};
