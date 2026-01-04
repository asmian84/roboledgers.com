/**
 * Supabase Cloud Sync Integration
 * Handles real-time sync with Supabase backend
 */

class SupabaseClient {
    constructor() {
        this.url = 'https://qygddrggoywhvlwhuzil.supabase.co';
        this.anonKey = null;
        this.client = null;
        this.isConnected = false;
    }

    // Initialize with stored credentials
    async init() {
        const storedKey = localStorage.getItem('supabase_anon_key');
        if (storedKey) {
            this.anonKey = storedKey;
            this.createClient();
            await this.testConnection();
        }
    }

    // Create Supabase client
    createClient() {
        if (!this.anonKey) {
            console.warn('No Supabase API key provided');
            return;
        }

        // In production, use: @supabase/supabase-js
        // For now, we'll use fetch API directly
        this.client = {
            url: this.url,
            key: this.anonKey,
            headers: {
                'apikey': this.anonKey,
                'Authorization': `Bearer ${this.anonKey}`,
                'Content-Type': 'application/json'
            }
        };

        console.log('✅ Supabase client created');
    }

    // Connect with credentials
    async connect(apiKey) {
        this.anonKey = apiKey;

        // Store securely in localStorage
        localStorage.setItem('supabase_anon_key', apiKey);

        this.createClient();

        const connected = await this.testConnection();

        if (connected) {
            this.isConnected = true;
            return { success: true, message: 'Connected to Supabase!' };
        } else {
            this.isConnected = false;
            return { success: false, message: 'Connection failed. Check your API key.' };
        }
    }

    // Test connection
    async testConnection() {
        try {
            const response = await fetch(`${this.url}/rest/v1/`, {
                method: 'GET',
                headers: this.client.headers
            });

            if (response.ok) {
                console.log('✅ Supabase connection successful');
                return true;
            } else {
                console.error('❌ Supabase connection failed:', response.status);
                return false;
            }
        } catch (error) {
            console.error('❌ Supabase connection error:', error);
            return false;
        }
    }

    // Disconnect
    disconnect() {
        localStorage.removeItem('supabase_anon_key');
        this.anonKey = null;
        this.client = null;
        this.isConnected = false;
        console.log('Disconnected from Supabase');
    }

    // Sync transactions to cloud
    async syncTransactions(transactions) {
        if (!this.isConnected) {
            return { success: false, message: 'Not connected to Supabase' };
        }

        try {
            const response = await fetch(`${this.url}/rest/v1/transactions`, {
                method: 'POST',
                headers: this.client.headers,
                body: JSON.stringify(transactions)
            });

            if (response.ok) {
                return { success: true, message: 'Transactions synced!' };
            } else {
                return { success: false, message: 'Sync failed' };
            }
        } catch (error) {
            console.error('Sync error:', error);
            return { success: false, message: error.message };
        }
    }

    // Pull data from cloud
    async pullData(table) {
        if (!this.isConnected) {
            return { success: false, data: null };
        }

        try {
            const response = await fetch(`${this.url}/rest/v1/${table}`, {
                method: 'GET',
                headers: this.client.headers
            });

            if (response.ok) {
                const data = await response.json();
                return { success: true, data };
            } else {
                return { success: false, data: null };
            }
        } catch (error) {
            console.error('Pull error:', error);
            return { success: false, data: null };
        }
    }

    // Get connection status
    getStatus() {
        return {
            connected: this.isConnected,
            url: this.url,
            hasKey: !!this.anonKey
        };
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

// Create global instance
window.SupabaseSync = new SupabaseClient();

// Auto-initialize on load
if (typeof window !== 'undefined') {
    window.addEventListener('DOMContentLoaded', () => {
        window.SupabaseSync.init();
    });
}
