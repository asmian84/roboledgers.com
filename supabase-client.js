
// Supabase Client for AutoBookkeeping
// Handles connection and data sync

console.log('☁️ Loading Supabase Client...');

const SUPABASE_URL = 'https://tjpafbkpmowlttrgjqhw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqcGFmYmtwbW93bHR0cmdqcWh3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzODE3OTYsImV4cCI6MjA4MDk1Nzc5Nn0.YxarQZiZInt_Ntgpo1hGaeBRWTkyHDHpz-_06Lmkve0';

window.SupabaseClient = {
    client: null,
    isConnected: false,

    async initialize() {
        if (this.client) return true; // Already initialized
        if (this.isConnected) return true;

        if (typeof supabase === 'undefined') {
            console.warn('⚠️ Supabase SDK not loaded.');
            return false;
        }

        if (SUPABASE_URL === 'YOUR_SUPABASE_URL') {
            console.warn('⚠️ Supabase credentials not set');
            return false;
        }

        try {
            console.log('☁️ Loading Supabase Client...');
            this.client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            // The original code had a select to verify connection, but the instruction removes it.
            // For now, we'll assume creation implies connection for this simplified init.
            this.isConnected = true;
            console.log('✅ Supabase Connected');
            return true;
        } catch (error) {
            console.error('❌ Supabase Connection Failed:', error);
            return false;
        }
    },

    // --- VENDOR OPERATIONS ---

    /**
     * Fetch all vendors from Supabase
     * @returns {Promise<Array>} List of vendor objects
     */
    async fetchVendors() {
        if (!this.isConnected || !this.client) return [];

        try {
            const { data, error } = await this.client
                .from('vendors')
                .select('*')
                .order('name');

            if (error) throw error;

            // Transform SQL rows to App objects
            return data.map(row => ({
                id: row.id,
                name: row.name,
                normalizedName: row.normalized_name,
                category: row.category,
                defaultAccount: row.sources?.default_account_code || '9970', // Fallback strategy
                defaultAccountName: row.sources?.default_account_name || 'To Be Sorted',
                patterns: row.patterns || [],
                matchCount: row.times_referenced || 0,
                lastMatched: row.updated_at
            }));
        } catch (err) {
            console.error('❌ Failed to fetch vendors:', err);
            return [];
        }
    },

    /**
     * Upsert a vendor (Insert or Update)
     * @param {Object} vendor - Application vendor object
     */
    async upsertVendor(vendor) {
        if (!this.isConnected || !this.client) return null;

        // Transform App object to SQL row
        const row = {
            id: vendor.id, // If exists, update; else undefined (let DB generate?) 
            // actually, for sync we might want to ensure UUID consistency.
            // For now, let's rely on name/normalized_name if ID is missing.
            name: vendor.name,
            normalized_name: vendor.normalizedName || vendor.name.toLowerCase().trim(),
            category: vendor.category,
            patterns: vendor.patterns,
            times_referenced: vendor.matchCount,
            // Store app-specific codes in JSONB 'sources' since we might not have 'accounts' table fully linked yet
            sources: {
                default_account_code: vendor.defaultAccount,
                default_account_name: vendor.defaultAccountName,
                ...vendor.sources
            },
            updated_at: new Date().toISOString()
        };

        try {
            const { data, error } = await this.client
                .from('vendors')
                .upsert(row, { onConflict: 'normalized_name' }) // Match by normalized name
                .select()
                .single();

            if (error) {
                // Check for schema mismatch (missing columns)
                if (error.code === 'PGRST204' && error.message.includes('normalized_name')) {
                    if (!this._schemaErrorLogged) {
                        console.error('🚨 CRITICAL DATABASE ERROR: Schema mismatch. You MUST run the SQL update script in Supabase.');
                        console.error('Missing column "normalized_name". Operations using this column will fail.');
                        alert('Database Error: Your Supabase database is missing required columns. Please run the provided SQL script to update the schema.');
                        this._schemaErrorLogged = true; // Log only once
                    }
                    return null; // Fail silently after first alert
                }
                throw error;
            }
            return data;
        } catch (err) {
            if (err.code !== 'PGRST204') { // Don't re-log known schema errors
                console.error('❌ Failed to upsert vendor:', err);
            }
            return null;
        }
    },

    /**
     * Delete a vendor
     * @param {string} vendorId 
     */
    async deleteVendor(vendorId) {
        if (!this.isConnected || !this.client) return false;

        try {
            const { error } = await this.client
                .from('vendors')
                .delete()
                .match({ id: vendorId });

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('❌ Failed to delete vendor:', err);
            return false;
        }
    },

    /**
     * Sync local vendors to cloud (One-way push for MVP)
     */
    async syncVendors(vendors) {
        if (!this.isConnected) {
            alert('Supabase not connected. Please configure credentials.');
            return false;
        }

        console.log(`☁️ Syncing ${vendors.length} vendors to cloud...`);

        let successCount = 0;
        // Process in chunks to avoid rate limits
        const CHUNK_SIZE = 50;

        for (let i = 0; i < vendors.length; i += CHUNK_SIZE) {
            const chunk = vendors.slice(i, i + CHUNK_SIZE);
            const promises = chunk.map(v => this.upsertVendor(v));

            const results = await Promise.all(promises);
            successCount += results.filter(r => r !== null).length;

            console.log(`   Synced ${Math.min(i + CHUNK_SIZE, vendors.length)} / ${vendors.length}`);
        }

        console.log(`✅ Sync Complete: ${successCount} vendors synced.`);
        return true;
    },

    /**
     * Get exact count of vendors in Supabase
     */
    async getVendorCount() {
        if (!this.isConnected) return 0;

        try {
            const { count, error } = await this.client
                .from('vendors')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            return count;
        } catch (err) {
            console.error('Error fetching vendor count:', err);
            return 0;
        }
    }
};
