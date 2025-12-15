// Auth Manager - Handles Login, Signup, and Session State
window.AuthManager = {
    user: null,
    session: null,

    async initialize() {
        // 0. Environment Check
        if (window.location.protocol === 'file:') {
            console.error('❌ Error: Running via file:// protocol. Auth will not work.');
            const msgBox = document.getElementById('authMessage');
            if (msgBox) {
                msgBox.style.color = '#ef4444';
                msgBox.innerHTML = '<b>Setup Required:</b><br>You are opening this file directly.<br>Please use "Live Server" (localhost:3000) to log in.';
            }
            // Allow dev to proceed but warn
        }

        if (window.SupabaseClient) {
            await SupabaseClient.initialize();
        }

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
            // Trigger Data Load (if on app)
            if (window.AccountAllocator) AccountAllocator.initialize();

            // REDIRECT: If on landing page, go to App
            if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
                window.location.href = 'app.html';
            }
        } else {
            console.log('👤 User Logged Out (Guest Mode)');
            // REDIRECT: If on App page, go to Landing
            if (window.location.pathname.endsWith('app.html')) {
                window.location.href = 'index.html';
            }
        }
    },

    async signUp(email, password) {
        const { data, error } = await SupabaseClient.client.auth.signUp({
            email,
            password,
            options: {
                emailRedirectTo: window.location.origin + '/app.html'
            }
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
        const toggleText = document.getElementById('authToggleText');
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

                const title = document.getElementById('authTitle');
                if (title) title.innerText = isSignUp ? 'Create Account' : 'Welcome Back';

                submitBtn.innerText = isSignUp ? 'Sign Up' : 'Sign In';

                if (toggleText) {
                    toggleText.innerText = isSignUp ? 'Already have an account?' : 'New to RoboLedgers?';
                    toggleLink.innerText = isSignUp ? 'Sign In' : 'Create Account';
                } else {
                    // Fallback for old modal structure if ID missing
                    toggleLink.innerHTML = isSignUp ? 'Already have an account? <b>Sign In</b>' : 'New here? <b>Create Account</b>';
                }

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
                        msgBox.style.color = '#10b981'; // Green
                        msgBox.innerHTML = '<b>Success!</b> Check your email to confirm your account.';
                    }
                } else {
                    result = await this.signIn(email, pass);
                    if (!result.error) {
                        msgBox.style.color = '#3b82f6';
                        msgBox.innerText = 'Success! Redirecting...';
                        // Redirect logic is handled by onAuthStateChange, but we can force close modal
                        loginModal.style.display = 'none';
                    }
                }

                if (result.error) {
                    msgBox.style.color = '#ef4444'; // Red
                    console.error('Auth Error:', result.error);

                    if (result.error.message.includes('Email not confirmed')) {
                        msgBox.innerHTML = '<b>Email not confirmed.</b><br>Please check your inbox (and spam) for the confirmation link.';
                    } else if (result.error.message.includes('Invalid login credentials')) {
                        msgBox.innerText = 'Incorrect email or password.';
                    } else {
                        msgBox.innerText = result.error.message;
                    }
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
