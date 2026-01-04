/**
 * RoboLedgers 4.0 - Outsource Service
 * Fallback Protocol for high-accuracy vendor enrichment
 */

class OutsourceService {
    constructor() {
        this.clearbitUrl = 'https://autocomplete.clearbit.com/v1/companies/suggest?query=';
        this.wikidataUrl = 'https://www.wikidata.org/w/api.php';
        this.cache = new Map();
    }

    /**
     * Primary Fallback: Clearbit Brand Cleaner
     */
    async clearbitLookup(query) {
        if (!query) return null;
        const cacheKey = `clearbit_${query.toUpperCase()}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        try {
            const response = await fetch(`${this.clearbitUrl}${encodeURIComponent(query)}`);
            const data = await response.json();

            if (data && data.length > 0) {
                const result = {
                    name: data[0].name,
                    domain: data[0].domain,
                    logo: data[0].logo,
                    source: 'Clearbit'
                };
                this.cache.set(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.warn('📡 Outsource: Clearbit lookup failed', error);
        }
        return null;
    }

    /**
     * Secondary Fallback: Wikidata Entity Verifier
     */
    async wikidataLookup(query) {
        if (!query) return null;
        const cacheKey = `wikidata_${query.toUpperCase()}`;
        if (this.cache.has(cacheKey)) return this.cache.get(cacheKey);

        try {
            const params = new URLSearchParams({
                action: 'wbsearchentities',
                language: 'en',
                format: 'json',
                search: query,
                origin: '*'
            });

            const response = await fetch(`${this.wikidataUrl}?${params.toString()}`);
            const data = await response.json();

            if (data.search && data.search.length > 0) {
                const item = data.search[0];
                const result = {
                    name: item.label,
                    description: item.description,
                    id: item.id,
                    source: 'Wikidata'
                };
                this.cache.set(cacheKey, result);
                return result;
            }
        } catch (error) {
            console.warn('📡 Outsource: Wikidata lookup failed', error);
        }
        return null;
    }

    /**
     * Full Outsource Protocol
     */
    async outsourceEnrich(rawName) {
        // 1. Try Clearbit
        let result = await this.clearbitLookup(rawName);

        // 2. Try Wikidata if Clearbit fails
        if (!result) {
            result = await this.wikidataLookup(rawName);
        }

        return result;
    }
}

// Global Singleton
window.outsourceService = new OutsourceService();
console.log('📡 Outsource Service (v25.0) Loaded');
