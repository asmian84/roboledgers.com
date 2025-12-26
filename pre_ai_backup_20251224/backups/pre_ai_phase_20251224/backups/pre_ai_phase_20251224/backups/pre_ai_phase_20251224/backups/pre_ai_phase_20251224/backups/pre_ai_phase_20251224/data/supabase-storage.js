/**
 * AutoBookkeeping v4 - Supabase Storage Adapter
 * Drop-in replacement for localStorage storage.js
 * SAME API - different backend
 */

import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
    import.meta.env.VITE_SUPABASE_URL || '',
    import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

class SupabaseStorage {
    constructor() {
        this.keys = {
            transactions: 'transactions',
            vendors: 'vendors',
            accounts: 'chart_of_accounts',
            bankAccounts: 'bank_accounts',
            settings: 'user_settings'
        };
    }

    // ====================================
    // TRANSACTIONS - Same API as storage.js
    // ====================================

    async getTransactions(filters = {}) {
        try {
            let query = supabase
                .from(this.keys.transactions)
                .select(`
          *,
          vendor:vendors(id, name),
          account:chart_of_accounts(id, account_number, account_name)
        `)
                .order('date', { ascending: false });

            // Apply filters (SAME as v3 storage.js)
            if (filters.vendorId) {
                query = query.eq('vendor_id', filters.vendorId);
            }

            if (filters.accountId) {
                query = query.eq('account_id', filters.accountId);
            }

            if (filters.bankAccountId) {
                query = query.eq('bank_account_id', filters.bankAccountId);
            }

            if (filters.type) {
                query = query.eq('type', filters.type);
            }

            if (filters.reconciled !== undefined) {
                query = query.eq('reconciled', filters.reconciled);
            }

            if (filters.startDate) {
                query = query.gte('date', filters.startDate);
            }

            if (filters.endDate) {
                query = query.lte('date', filters.endDate);
            }

            const { data, error } = await query;

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            return [];
        }
    }

    async getTransaction(id) {
        try {
            const { data, error } = await supabase
                .from(this.keys.transactions)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching transaction:', error);
            return null;
        }
    }

    async createTransaction(data) {
        try {
            const transaction = {
                date: data.date || new Date().toISOString(),
                description: data.description,
                amount: data.amount,
                type: data.type,
                vendor_id: data.vendorId || null,
                account_id: data.accountId,
                category: data.category || '',
                bank_account_id: data.bankAccountId || null,
                reconciled: data.reconciled || false,
                notes: data.notes || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: created, error } = await supabase
                .from(this.keys.transactions)
                .insert([transaction])
                .select()
                .single();

            if (error) throw error;

            console.log('💾 Transaction created:', created.id);
            return created;
        } catch (error) {
            console.error('Error creating transaction:', error);
            throw error;
        }
    }

    async updateTransaction(id, updates) {
        try {
            const { data, error } = await supabase
                .from(this.keys.transactions)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            console.log('💾 Transaction updated:', id);
            return data;
        } catch (error) {
            console.error('Error updating transaction:', error);
            throw error;
        }
    }

    async deleteTransaction(id) {
        try {
            const { error } = await supabase
                .from(this.keys.transactions)
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('💾 Transaction deleted:', id);
            return true;
        } catch (error) {
            console.error('Error deleting transaction:', error);
            throw error;
        }
    }

    // Bulk save (compatibility with transactions-fixed.js)
    async saveTransactions(data) {
        try {
            const { error } = await supabase
                .from(this.keys.transactions)
                .upsert(data);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error saving transactions:', error);
            return false;
        }
    }

    // ====================================
    // VENDORS - Same API as storage.js
    // ====================================

    async getVendors() {
        try {
            const { data: vendors, error } = await supabase
                .from(this.keys.vendors)
                .select(`
          *,
          transactions(id, amount, type, date)
        `)
                .order('name');

            if (error) throw error;

            // Compute stats (SAME as v3)
            return vendors.map(vendor => {
                const vendorTxns = vendor.transactions || [];
                const totalSpent = vendorTxns
                    .filter(t => t.type === 'debit')
                    .reduce((sum, t) => sum + t.amount, 0);

                const lastTxn = vendorTxns.sort((a, b) =>
                    new Date(b.date) - new Date(a.date)
                )[0];

                return {
                    ...vendor,
                    totalSpent,
                    transactionCount: vendorTxns.length,
                    lastTransaction: lastTxn ? lastTxn.date : null,
                    transactions: undefined // Remove from response
                };
            });
        } catch (error) {
            console.error('Error fetching vendors:', error);
            return [];
        }
    }

    async getVendor(id) {
        try {
            const vendors = await this.getVendors();
            return vendors.find(v => v.id === id) || null;
        } catch (error) {
            console.error('Error fetching vendor:', error);
            return null;
        }
    }

    async createVendor(data) {
        try {
            const vendor = {
                name: data.name,
                category: data.category || '',
                default_account_id: data.defaultAccountId || null,
                notes: data.notes || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: created, error } = await supabase
                .from(this.keys.vendors)
                .insert([vendor])
                .select()
                .single();

            if (error) throw error;

            console.log('💾 Vendor created:', created.id);
            return created;
        } catch (error) {
            console.error('Error creating vendor:', error);
            throw error;
        }
    }

    async updateVendor(id, updates) {
        try {
            const { data, error } = await supabase
                .from(this.keys.vendors)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            console.log('💾 Vendor updated:', id);
            return data;
        } catch (error) {
            console.error('Error updating vendor:', error);
            throw error;
        }
    }

    async deleteVendor(id) {
        try {
            const { error } = await supabase
                .from(this.keys.vendors)
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('💾 Vendor deleted:', id);
            return true;
        } catch (error) {
            console.error('Error deleting vendor:', error);
            throw error;
        }
    }

    // ====================================
    // ACCOUNTS - Same API as storage.js
    // ====================================

    async getAccounts() {
        try {
            const { data, error } = await supabase
                .from(this.keys.accounts)
                .select('*')
                .order('account_number');

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching accounts:', error);
            return [];
        }
    }

    async getAccount(id) {
        try {
            const { data, error } = await supabase
                .from(this.keys.accounts)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching account:', error);
            return null;
        }
    }

    async createAccount(data) {
        try {
            const account = {
                account_number: data.accountNumber,
                account_name: data.accountName,
                account_type: data.accountType,
                parent_account_id: data.parentAccountId || null,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: created, error } = await supabase
                .from(this.keys.accounts)
                .insert([account])
                .select()
                .single();

            if (error) throw error;

            console.log('💾 Account created:', created.id);
            return created;
        } catch (error) {
            console.error('Error creating account:', error);
            throw error;
        }
    }

    async updateAccount(id, updates) {
        try {
            const { data, error } = await supabase
                .from(this.keys.accounts)
                .update({
                    ...updates,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;

            console.log('💾 Account updated:', id);
            return data;
        } catch (error) {
            console.error('Error updating account:', error);
            throw error;
        }
    }

    async deleteAccount(id) {
        try {
            const { error } = await supabase
                .from(this.keys.accounts)
                .delete()
                .eq('id', id);

            if (error) throw error;

            console.log('💾 Account deleted:', id);
            return true;
        } catch (error) {
            console.error('Error deleting account:', error);
            throw error;
        }
    }

    // ====================================
    // BANK ACCOUNTS
    // ====================================

    async getBankAccounts() {
        try {
            const { data, error } = await supabase
                .from(this.keys.bankAccounts)
                .select('*')
                .order('name');

            if (error) throw error;

            return data || [];
        } catch (error) {
            console.error('Error fetching bank accounts:', error);
            return [];
        }
    }

    async getBankAccount(id) {
        try {
            const { data, error } = await supabase
                .from(this.keys.bankAccounts)
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;

            return data;
        } catch (error) {
            console.error('Error fetching bank account:', error);
            return null;
        }
    }

    async createBankAccount(data) {
        try {
            const bankAccount = {
                name: data.name,
                type: data.type,
                currency: data.currency || 'CAD',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: created, error } = await supabase
                .from(this.keys.bankAccounts)
                .insert([bankAccount])
                .select()
                .single();

            if (error) throw error;

            console.log('💾 Bank account created:', created.id);
            return created;
        } catch (error) {
            console.error('Error creating bank account:', error);
            throw error;
        }
    }

    // ====================================
    // SETTINGS
    // ====================================

    async getSettings() {
        try {
            const { data, error } = await supabase
                .from(this.keys.settings)
                .select('*')
                .single();

            if (error) {
                // No settings yet, return defaults
                return {
                    theme: 'light',
                    currency: 'CAD',
                    dateFormat: 'YYYY-MM-DD'
                };
            }

            return data;
        } catch (error) {
            console.error('Error fetching settings:', error);
            return {};
        }
    }

    async saveSettings(settings) {
        try {
            const { error } = await supabase
                .from(this.keys.settings)
                .upsert([{
                    ...settings,
                    updated_at: new Date().toISOString()
                }]);

            if (error) throw error;

            return true;
        } catch (error) {
            console.error('Error saving settings:', error);
            return false;
        }
    }
}

// Create singleton instance
const supabaseStorage = new SupabaseStorage();

// Export both the instance and the client
export default supabaseStorage;
export { supabase };
