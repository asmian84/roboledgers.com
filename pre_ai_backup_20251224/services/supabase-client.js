/**
 * RoboLedger v2.0 - Supabase Client
 * Unified database access layer
 */

import { createClient } from '@supabase/supabase-js';

// Configuration (replace with your values)
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'your-anon-key';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
    },
    realtime: {
        params: {
            eventsPerSecond: 10
        }
    }
});

// ============================================
// AUTHENTICATION
// ============================================

export const auth = {
    /**
     * Sign up new user
     */
    async signUp(email, password, metadata = {}) {
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: metadata
            }
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sign in existing user
     */
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;
        return data;
    },

    /**
     * Sign out
     */
    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    /**
     * Get current user
     */
    async getUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    /**
     * Get current session
     */
    async getSession() {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        return session;
    }
};

// ============================================
// BANK ACCOUNTS
// ============================================

export const bankAccounts = {
    /**
     * Get all bank accounts for current user
     */
    async getAll() {
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    /**
     * Get single bank account
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('bank_accounts')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create new bank account
     */
    async create(accountData) {
        const user = await auth.getUser();

        const { data, error } = await supabase
            .from('bank_accounts')
            .insert({
                user_id: user.id,
                ...accountData
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update bank account
     */
    async update(id, updates) {
        const { data, error } = await supabase
            .from('bank_accounts')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete bank account (soft delete)
     */
    async delete(id) {
        const { error } = await supabase
            .from('bank_accounts')
            .update({ active: false })
            .eq('id', id);

        if (error) throw error;
    }
};

// ============================================
// TRANSACTIONS
// ============================================

export const transactions = {
    /**
     * Get transactions with filters
     */
    async getAll(filters = {}) {
        let query = supabase
            .from('transactions')
            .select(`
        *,
        bank_account:bank_accounts(account_name, account_type),
        vendor:vendors(canonical_name, category),
        account:chart_of_accounts(account_name, account_type)
      `)
            .order('posting_date', { ascending: false });

        // Apply filters
        if (filters.bankAccountId) {
            query = query.eq('bank_account_id', filters.bankAccountId);
        }
        if (filters.vendorId) {
            query = query.eq('vendor_id', filters.vendorId);
        }
        if (filters.accountNumber) {
            query = query.eq('account_number', filters.accountNumber);
        }
        if (filters.startDate) {
            query = query.gte('posting_date', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('posting_date', filters.endDate);
        }
        if (filters.reconciled !== undefined) {
            query = query.eq('reconciled', filters.reconciled);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
    },

    /**
     * Create transaction
     */
    async create(transactionData) {
        const { data, error } = await supabase
            .from('transactions')
            .insert(transactionData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Bulk create transactions
     */
    async createBulk(transactionsArray) {
        const { data, error } = await supabase
            .from('transactions')
            .insert(transactionsArray)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Update transaction
     */
    async update(id, updates) {
        const { data, error } = await supabase
            .from('transactions')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Delete transaction
     */
    async delete(id) {
        const { error } = await supabase
            .from('transactions')
            .delete()
            .eq('id', id);

        if (error) throw error;
    },

    /**
     * Reconcile transaction
     */
    async reconcile(id) {
        const user = await auth.getUser();

        const { data, error } = await supabase
            .from('transactions')
            .update({
                reconciled: true,
                reconciled_at: new Date().toISOString(),
                reconciled_by: user.id
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// ============================================
// VENDORS
// ============================================

export const vendors = {
    /**
     * Search vendors
     */
    async search(query) {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .or(`canonical_name.ilike.%${query}%,legal_name.ilike.%${query}%`)
            .limit(20);

        if (error) throw error;
        return data;
    },

    /**
     * Get all vendors
     */
    async getAll() {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .order('canonical_name');

        if (error) throw error;
        return data;
    },

    /**
     * Get vendor by ID
     */
    async getById(id) {
        const { data, error } = await supabase
            .from('vendors')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Create vendor
     */
    async create(vendorData) {
        const { data, error } = await supabase
            .from('vendors')
            .insert(vendorData)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update vendor
     */
    async update(id, updates) {
        const { data, error } = await supabase
            .from('vendors')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    }
};

// ============================================
// CHART OF ACCOUNTS
// ============================================

export const chartOfAccounts = {
    /**
     * Get all accounts
     */
    async getAll() {
        const { data, error } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('active', true)
            .order('account_number');

        if (error) throw error;
        return data;
    },

    /**
     * Get account by number
     */
    async getByNumber(accountNumber) {
        const { data, error } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('account_number', accountNumber)
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get accounts by type
     */
    async getByType(accountType) {
        const { data, error } = await supabase
            .from('chart_of_accounts')
            .select('*')
            .eq('account_type', accountType)
            .eq('active', true)
            .order('account_number');

        if (error) throw error;
        return data;
    }
};

// ============================================
// UPLOAD BATCHES
// ============================================

export const uploadBatches = {
    /**
     * Create upload batch
     */
    async create(batchData) {
        const user = await auth.getUser();

        const { data, error } = await supabase
            .from('upload_batches')
            .insert({
                user_id: user.id,
                ...batchData
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Update batch status
     */
    async updateStatus(id, status, errorMessage = null) {
        const updates = { status };
        if (status === 'COMPLETED') {
            updates.completed_at = new Date().toISOString();
        }
        if (errorMessage) {
            updates.error_message = errorMessage;
        }

        const { data, error } = await supabase
            .from('upload_batches')
            .update(updates)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get user's upload history
     */
    async getHistory(limit = 50) {
        const { data, error } = await supabase
            .from('upload_batches')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

// ============================================
// RAW TRANSACTIONS
// ============================================

export const rawTransactions = {
    /**
     * Bulk insert raw transactions
     */
    async createBulk(rawTransactionsArray) {
        const { data, error } = await supabase
            .from('raw_transactions')
            .insert(rawTransactionsArray)
            .select();

        if (error) throw error;
        return data;
    },

    /**
     * Get raw transactions by batch
     */
    async getByBatch(batchId) {
        const { data, error } = await supabase
            .from('raw_transactions')
            .select('*')
            .eq('upload_batch_id', batchId)
            .order('line_number');

        if (error) throw error;
        return data;
    }
};

// ============================================
// REAL-TIME SUBSCRIPTIONS
// ============================================

export const realtime = {
    /**
     * Subscribe to transaction changes
     */
    subscribeToTransactions(callback) {
        return supabase
            .channel('transactions')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'transactions'
            }, callback)
            .subscribe();
    },

    /**
     * Subscribe to bank account changes
     */
    subscribeToBankAccounts(callback) {
        return supabase
            .channel('bank_accounts')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'bank_accounts'
            }, callback)
            .subscribe();
    },

    /**
     * Unsubscribe from channel
     */
    unsubscribe(channel) {
        return supabase.removeChannel(channel);
    }
};

// ============================================
// AI TRAINING DATA
// ============================================

export const aiTraining = {
    /**
     * Record user correction for AI learning
     */
    async recordCorrection(correctionData) {
        const user = await auth.getUser();

        const { data, error } = await supabase
            .from('ai_training_data')
            .insert({
                user_id: user.id,
                ...correctionData
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    },

    /**
     * Get training data for model improvement
     */
    async getTrainingData(limit = 1000) {
        const { data, error } = await supabase
            .from('ai_training_data')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(limit);

        if (error) throw error;
        return data;
    }
};

// Export default client
export default supabase;
