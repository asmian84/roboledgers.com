/**
 * GoogleSearchService
 * Handles integration with Google Custom Search API to enrich vendor data.
 */
const GoogleSearchService = {
    cacheKey: 'google_search_cache',
    lastRequestTime: 0,
    minDelay: 2500, // 2.5 seconds strict delay
    isRateLimited: false,

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
            console.warn('Cache write failed (likely quota exceeded):', e);
        }
    },

    async searchVendor(query) {
        if (!query) return null;
        if (!window.Settings) {
            // console.error('Settings not loaded yet'); 
            return null;
        }

        // 1. Check Cache
        const cache = this.getCache();
        if (cache[query]) {
            // console.log(`🎯 Cache Hit: ${query}`);
            return cache[query].result;
        }

        // 2. Check Global Rate Limit Flag
        if (this.isRateLimited) {
            console.warn('⚠️ Google Search API Rate Limit Reached. Enrichment paused.');
            return null;
        }

        // 3. Rate Limiting Logic (Throttle)
        const now = Date.now();
        const timeSinceLast = now - this.lastRequestTime;
        if (timeSinceLast < this.minDelay) {
            const waitTime = this.minDelay - timeSinceLast;
            await new Promise(resolve => setTimeout(resolve, waitTime));
        }

        const apiKey = Settings.get('googleApiKey');
        const cx = Settings.get('googleSearchCx');

        if (!apiKey || !cx) {
            // console.warn('Google Search API not configured.');
            return null;
        }

        this.lastRequestTime = Date.now();
        const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cx}&q=${encodeURIComponent(query)}`;

        try {
            console.log(`🔍 Google Search: ${query}`);
            const response = await fetch(url);

            if (response.status === 429) {
                console.error('⛔ API Rate Limit Hit (429). Stopping all searches for this session.');
                this.isRateLimited = true;
                return null;
            }

            if (!response.ok) {
                // Other errors (403, 500)
                console.warn(`Google API Error: ${response.status}`);
                return null;
            }

            const data = await response.json();

            if (!data.items || data.items.length === 0) {
                this.setCache(query, null); // Cache "no result" to avoid re-searching
                return null;
            }

            const topResult = data.items[0];
            const result = {
                title: topResult.title,
                snippet: topResult.snippet,
                link: topResult.link,
                displayLink: topResult.displayLink,
                pagemap: topResult.pagemap || {}
            };

            this.setCache(query, result);
            return result;

        } catch (error) {
            console.error('Google Search Exception:', error);
            return null;
        }
    },

    suggestName(searchResult) {
        if (!searchResult) return null;
        let title = searchResult.title;
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
