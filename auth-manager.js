const AuthManager = {
    user: null,
    profile: null,

    async initialize() {
        console.log('🔒 Initializing AuthManager...');

        if (!window.SupabaseClient || !SupabaseClient.client) {
            console.warn('⚠️ Supabase not initialized, skipping auth check.');
            return;
        }

        const { data: { session } } = await SupabaseClient.client.auth.getSession();

        if (session) {
            this.user = session.user;
            await this.checkApprovalStatus();
        } else {
            this.redirectToLogin();
        }

        // Listen for auth changes
        SupabaseClient.client.auth.onAuthStateChange(async (event, session) => {
            if (event === 'SIGNED_IN') {
                this.user = session.user;
                await this.checkApprovalStatus();
            } else if (event === 'SIGNED_OUT') {
                this.user = null;
                this.profile = null;
                this.redirectToLogin();
            }
        });
    },

    async checkApprovalStatus() {
        if (!this.user) return;

        console.log('🔍 Checking approval status for:', this.user.email);

        const { data: profile, error } = await SupabaseClient.client
            .from('profiles')
            .select('approval_status')
            .eq('id', this.user.id)
            .single();

        if (error) {
            console.error('❌ Error fetching profile:', error);
            // Fallback: If no profile exists, create one? Or just block?
            // tailored for MVP: Assume trigger created it.
            return;
        }

        this.profile = profile;
        console.log('👤 Profile Status:', profile.approval_status);

        if (profile.approval_status === 'approved') {
            console.log('✅ User approved. Access granted.');
            // Stop redirect loop if already on index
            if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('pending.html')) {
                window.location.href = 'index.html';
            }
        } else {
            console.warn('⛔ User NOT approved. Redirecting to pending...');
            if (!window.location.pathname.endsWith('pending.html')) {
                window.location.href = 'pending.html';
            }
        }
    },

    async signUp(email, password) {
        const { data, error } = await SupabaseClient.client.auth.signUp({
            email,
            password
        });
        return { data, error };
    },

    async signIn(email, password) {
        const { data, error } = await SupabaseClient.client.auth.signInWithPassword({
            email,
            password
        });
        return { data, error };
    },

    async signOut() {
        await SupabaseClient.client.auth.signOut();
        window.location.href = 'login.html';
    },

    redirectToLogin() {
        const path = window.location.pathname;
        if (!path.endsWith('login.html') && !path.endsWith('signup.html')) {
            window.location.href = 'login.html';
        }
    }
};

// Auto-init if client is ready (handled in app.js usually, but good for standalone pages)
if (window.SupabaseClient) {
    // AuthManager.initialize(); // Let app.js call this to avoid race conditions
}
