
// Supabase Client for AutoBookkeeping
// Handles connection and data sync

console.log('☁️ Loading Supabase Client...');

// Dynamic Configuration
const creds = window.AppConfig ? AppConfig.getSupabaseCreds() : null;
const SUPABASE_URL = creds ? creds.URL : null;
const SUPABASE_ANON_KEY = creds ? creds.KEY : null;

window.SupabaseClient = {
    client: null,
    isConnected: false,

    async initialize() {
        if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
            console.error('❌ Critical: Supabase credentials missing via config.js');
            return false;
        }

        if (this.client) return true; // Already initialized
        if (this.isConnected) return true;

        if (typeof supabase === 'undefined') {
            console.warn('⚠️ Supabase SDK not loaded.');
            return false;
        }

        try {
            console.log('☁️ Loading Supabase Client...');
            this.client = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
                lastMatched: row.updated_at,
                _synced: true // Mark as from cloud
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

                // Check for UUID/Text mismatch (22P02)
                if (error.code === '22P02') {
                    if (!this._schemaErrorLogged) {
                        console.error('🚨 CRITICAL DATABASE ERROR: Type mismatch. You MUST run the SQL update script in Supabase.');
                        console.error('The database expects UUIDs but we are sending Text IDs. Please run: ALTER TABLE public.vendors ALTER COLUMN id TYPE text;');
                        alert('Database Error: Column type mismatch. Please run the provided SQL script to change "id" and "default_account_id" columns to TEXT in Supabase.');
                        this._schemaErrorLogged = true; // Log only once
                    }
                    return null;
                }

                // Check for RLS Policy violation (42501)
                if (error.code === '42501') {
                    if (!this._schemaErrorLogged) {
                        console.error('🚨 CRITICAL DATABASE ERROR: RLS Policy Violation. You MUST configure database permissions.');
                        console.error('Row Level Security is blocking updates. Please run: ALTER TABLE public.vendors DISABLE ROW LEVEL SECURITY;');
                        alert('Database Permissions Error: The database is blocking this text. Please run the provided SQL script to disable Row Level Security (RLS) or add a policy.');
                        this._schemaErrorLogged = true; // Log only once
                    }
                    return null;
                }

                // Check for Not Null Violation on user_id (23502)
                if (error.code === '23502' && error.message.includes('user_id')) {
                    if (!this._schemaErrorLogged) {
                        console.error('🚨 CRITICAL DATABASE ERROR: Schema constraint violation. "user_id" is required but we are anonymous.');
                        console.error('Please run: ALTER TABLE public.vendors ALTER COLUMN user_id DROP NOT NULL;');
                        alert('Database Schema Error: The "user_id" column is required but you are not logged in. Please run the provided SQL script to make this column optional.');
                        this._schemaErrorLogged = true;
                    }
                    return null;
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
    },

    /**
     * Subscribe to Real-Time Vendor Updates
     * @param {Function} onUpdate - Callback function (payload) => void
     */
    subscribeToVendors(onUpdate) {
        if (!this.isConnected) return;

        console.log('📡 Subscribing to real-time vendor updates...');

        this.client
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time subscription active');
                }
            });
    },

    // --- ACCOUNT OPERATIONS (Chart of Accounts) ---

    /**
     * Fetch all accounts from Supabase
     */
    async fetchAccounts() {
        if (!this.isConnected || !this.client) return [];

        try {
            const { data, error } = await this.client
                .from('accounts')
                .select('*')
                .order('code');

            if (error) throw error;

            return data.map(row => ({
                code: row.code,
                name: row.name,
                type: row.type || 'expense', // Fallback
                category: row.category,
                isActive: row.is_active !== false,
                permission: 'read-write', // Default
                _synced: true
            }));
        } catch (err) {
            console.error('❌ Failed to fetch accounts:', err);
            return [];
        }
    },

    /**
     * Upsert an account (Live Sync)
     */
    async upsertAccount(account) {
        if (!this.isConnected || !this.client) return null;

        const row = {
            code: account.code,
            name: account.name,
            type: account.type || 'expense',
            category: account.category,
            is_active: account.isActive,
            updated_at: new Date().toISOString()
            // company_id is handled by RLS or default
        };

        try {
            const { data, error } = await this.client
                .from('accounts')
                .upsert(row, { onConflict: 'code' })
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('❌ Failed to upsert account:', err);
            return null;
        }
    },

    /**
     * Delete an account
     */
    async deleteAccount(code) {
        if (!this.isConnected || !this.client) return false;

        try {
            const { error } = await this.client
                .from('accounts')
                .delete()
                .match({ code: code });

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('❌ Failed to delete account:', err);
            return false;
        }
    },

    /**
     * Subscribe to Real-Time Account Updates
     */
    subscribeToAccounts(onUpdate) {
        if (!this.isConnected) return;

        console.log('accounts-live: Subscribing to updates...');
        this.client
            .channel('public:accounts')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'accounts' }, (payload) => {
                console.log('accounts-live: Update received:', payload);
                if (onUpdate) onUpdate(payload);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ accounts-live: Connected');
                }
            });
    }
};
