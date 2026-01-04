/**
 * AutoBookkeeping v3.0 - Supabase Service
 * Cloud synchronization engine for COA and Vendor Dictionary
 */

class SupabaseService {
    constructor() {
        // Aligned with the correct Supabase project
        this.url = 'https://qygddrggoywhvlwhuzil.supabase.co';
        // Correct publishable key provided by user
        this.defaultKey = 'sb_publishable_7IouLxlc9zPMCpiV2K81mQ_Rj0XysYm';
        this.client = null;
        this.isOnline = false;
        this.tableCache = {}; // Cache found table names

        // Initialize immediately
        this.init();
    }

    async init() {
        if (!window.supabase || !window.supabase.createClient) {
            console.error('❌ Supabase SDK not found. Ensure CDN is loaded.');
            return;
        }

        try {
            // Priority: Load from Settings (localStorage)
            const storedKey = localStorage.getItem('supabase_anon_key');
            const activeKey = storedKey || this.defaultKey;

            this.client = window.supabase.createClient(this.url, activeKey);
            this.isOnline = true;
            console.log(`☁️ Supabase Service initialized (URL: ...${this.url.slice(-12)})`);

            // Background discovery
            this.checkConnection();
        } catch (error) {
            console.error('❌ Supabase initialization failed:', error);
            this.isOnline = false;
        }
    }

    /**
     * Helper to get a table reference
     */
    from(table) {
        if (!this.isOnline || !this.client) throw new Error('Supabase is offline');
        return this.client.from(table);
    }

    /**
     * Finds the first existing table from a list of candidates.
     * Caches the result to avoid redundant 404s.
     */
    async discoverTable(candidates, cacheKey) {
        if (!this.isOnline || !this.client) return candidates[0];
        if (this.tableCache[cacheKey]) return this.tableCache[cacheKey];

        for (const name of candidates) {
            try {
                // Use HEAD request to check existence without fetching data or depending on 'id' column
                // .select('*', { count: 'exact', head: true }) sends a method: HEAD request
                const { error, status } = await this.client.from(name).select('*', { count: 'exact', head: true });

                // Status 200-299 means success.
                if (status >= 200 && status < 300) {
                    console.log(`☁️ Supabase: Discovered active table "${name}" for ${cacheKey}`);
                    this.tableCache[cacheKey] = name;
                    return name;
                }

                // If specialized column error (shouldn't happen with HEAD/select(*)) or RLS
                if (status !== 404 && error && error.code !== 'PGRST116') {
                    console.log(`☁️ Supabase: Probable table found "${name}" (Status ${status})`);
                    this.tableCache[cacheKey] = name;
                    return name;
                }
            } catch (e) {
                // Silent skip
            }
        }

        // Fallback
        console.warn(`☁️ Supabase: No table found for ${cacheKey}. Defaulting to "${candidates[0]}".`);
        return candidates[0];
    }

    /**
     * Diagnostic: Check if a table exists (legacy support)
     */
    async tableExists(tableName) {
        if (!this.isOnline || !this.client) return false;
        try {
            const { status } = await this.client.from(tableName).select('*', { count: 'exact', head: true });
            return (status !== 404);
        } catch (e) {
            return false;
        }
    }

    async checkConnection() {
        if (!this.client) return false;
        try {
            // Quick check against common anchors in schema.sql
            const candidates = ['vendors', 'chart_of_accounts', 'bank_accounts', 'transactions'];
            for (const name of candidates) {
                const { status } = await this.client.from(name).select('*', { count: 'exact', head: true });
                if (status !== 404) {
                    this.isOnline = true;
                    return true;
                }
            }
            return false;
        } catch (e) {
            this.isOnline = false;
            return false;
        }
    }

    // Get or Create Persistent User ID
    getUserId() {
        let userId = localStorage.getItem('supabase_user_id');
        if (!userId) {
            // Generate a random UUID-like string if none exists
            userId = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
                return v.toString(16);
            });
            localStorage.setItem('supabase_user_id', userId);
        }
        return userId;
    }
}

// Global Singleton
window.supabaseService = new SupabaseService();
console.log('☁️ Supabase Service Loaded (Discovery v4)');
