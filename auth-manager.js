// Auth Manager - Handles Login, Signup, and Session State
window.AuthManager = {
    user: null,
    session: null,

    async initialize() {
        if (!window.SupabaseClient || !SupabaseClient.client) {
            console.warn('AuthManager: Supabase not initialized.');
            return;
        }

        // 1. Check current session
        const { data: { session } } = await SupabaseClient.client.auth.getSession();
        this.handleSession(session);

        // 2. Listen for changes
        SupabaseClient.client.auth.onAuthStateChange((_event, session) => {
            this.handleSession(session);
        });

        this.setupUI();
    },

    handleSession(session) {
        this.session = session;
        this.user = session ? session.user : null;
        window.CurrentUser = this.user;

        this.updateUI();

        if (this.user) {
            console.log('👤 User Logged In:', this.user.email);
            // Trigger Data Load for User
            if (window.AccountAllocator) AccountAllocator.initialize();
            if (window.VendorMatcher) VendorMatcher.loadVendors();
        } else {
            console.log('👤 User Logged Out (Guest Mode)');
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
        const { error } = await SupabaseClient.client.auth.signOut();
        if (!error) {
            window.location.reload(); // Clean state
        }
    },

    // UI Handling
    setupUI() {
        // Wiring up the Login Modal
        const loginBtn = document.getElementById('btnLogin');
        const loginModal = document.getElementById('loginModal');
        const closeBtn = document.getElementById('closeLoginModal');

        // Form Elements
        const form = document.getElementById('authForm');
        const emailInput = document.getElementById('authEmail');
        const passInput = document.getElementById('authPassword');
        const submitBtn = document.getElementById('authSubmit');
        const toggleLink = document.getElementById('authToggle');
        const msgBox = document.getElementById('authMessage');

        let isSignUp = false;

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (this.user) {
                    // If logged in, this button acts as Logout
                    if (confirm('Log out?')) this.signOut();
                } else {
                    loginModal.style.display = 'block';
                }
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', () => loginModal.style.display = 'none');

        if (toggleLink) {
            toggleLink.addEventListener('click', (e) => {
                e.preventDefault();
                isSignUp = !isSignUp;
                document.getElementById('authTitle').innerText = isSignUp ? 'Create Account' : 'Welcome Back';
                submitBtn.innerText = isSignUp ? 'Sign Up' : 'Sign In';
                toggleLink.innerHTML = isSignUp ? 'Already have an account? <b>Sign In</b>' : 'New here? <b>Create Account</b>';
                msgBox.innerText = '';
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                submitBtn.disabled = true;
                msgBox.innerText = 'Processing...';

                const email = emailInput.value;
                const pass = passInput.value;
                let result;

                if (isSignUp) {
                    result = await this.signUp(email, pass);
                    if (!result.error) {
                        msgBox.style.color = 'green';
                        msgBox.innerText = 'Account created! Please check your email to confirm.';
                    }
                } else {
                    result = await this.signIn(email, pass);
                    if (!result.error) {
                        loginModal.style.display = 'none'; // Close on success
                    }
                }

                if (result.error) {
                    msgBox.style.color = 'red';
                    msgBox.innerText = result.error.message;
                    submitBtn.disabled = false;
                }
            });
        }
    },

    updateUI() {
        const loginBtn = document.getElementById('btnLogin');
        if (loginBtn) {
            if (this.user) {
                loginBtn.innerHTML = `<span>${this.user.email}</span>`;
                loginBtn.title = "Click to Logout";
                loginBtn.classList.add('logged-in');
            } else {
                loginBtn.innerText = 'Sign In';
                loginBtn.classList.remove('logged-in');
            }
        }
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase
    setTimeout(() => AuthManager.initialize(), 500);
});
