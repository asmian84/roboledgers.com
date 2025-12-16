// Auth Manager - Handles Login, Signup, and Session State
window.AuthManager = {
    user: null,
    session: null,

    async initialize() {
        // 0. Environment Check
        if (window.location.protocol === 'file:') {
            console.warn('⚠️ Running via file:// protocol. Standard Auth disabled.');
            const msgBox = document.getElementById('authMessage');
            if (msgBox) {
                msgBox.style.color = '#eab308'; // Yellow/Orange
                msgBox.innerHTML = '<b>Offline Mode Available:</b><br>You are opening this file directly.<br>Click <b>Work Offline</b> below to proceed.';
            }
            // We do NOT return here, so the rest of the init (like listeners) still runs!
        }

        // 0.5 Check for Dev Mode Persistence
        if (localStorage.getItem('devMode') === 'true') {
            console.log('🛠️ Restoring Offline Dev Session...');
            this.loginAsDev(true); // true = restore
            this.setupUI();
            return;
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

    loginAsDev(isRestore = false) {
        // Create Mock Session
        const devSession = {
            user: {
                id: 'dev-local-user',
                email: 'developer@offline.local',
                role: 'developer',
                aud: 'authenticated',
                created_at: new Date().toISOString()
            },
            access_token: 'mock-token',
            expires_at: 9999999999
        };

        localStorage.setItem('devMode', 'true');
        this.handleSession(devSession);

        if (!isRestore) {
            // If explicit login click, redirect immediately
            window.location.href = 'app.html';
        }
    },

    handleSession(session) {
        this.session = session;
        // ... rest of handleSession is fine, but let's make sure we don't break strict mode
        this.user = session ? session.user : null;
        window.CurrentUser = this.user;

        this.updateUI();

        if (this.user) {
            const isDev = localStorage.getItem('devMode') === 'true';
            console.log(isDev ? '🛠️ Dev Mode Active' : '👤 User Logged In:', this.user.email);

            // Trigger Data Load (if on app)
            if (window.AccountAllocator) AccountAllocator.initialize();
            if (window.VendorMatcher) VendorMatcher.initialize();
            if (window.VendorManager) VendorManager.initialize();

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
        // Clear Dev Mode
        if (localStorage.getItem('devMode') === 'true') {
            localStorage.removeItem('devMode');
            window.location.reload();
            return;
        }

        const { error } = await SupabaseClient.client.auth.signOut();
        if (!error) {
            window.location.reload(); // Clean state
        }
    },

    // UI Handling
    // UI Handling
    setupUI() {
        // Wiring up the Login UI
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
        const devBtn = document.getElementById('btnDevLogin');
        const googleBtn = document.getElementById('btnGoogleLogin');
        const forgotLink = document.getElementById('forgotPasswordLink');

        // --- Event Listeners ---

        if (devBtn) {
            devBtn.addEventListener('click', () => {
                console.log('🔨 Dev Mode Clicked');
                this.loginAsDev();
            });
        }

        if (googleBtn) {
            googleBtn.addEventListener('click', async () => {
                msgBox.innerText = 'Redirecting to Google...';
                const { error } = await this.signInWithGoogle();
                if (error) {
                    msgBox.style.color = '#ef4444';
                    msgBox.innerText = error.message;
                }
            });
        }

        if (forgotLink) {
            forgotLink.addEventListener('click', async (e) => {
                e.preventDefault();
                const email = emailInput.value;
                if (!email) {
                    msgBox.style.color = '#ef4444';
                    msgBox.innerText = 'Please enter your email address first.';
                    emailInput.focus();
                    return;
                }

                if (confirm(`Send password reset link to ${email}?`)) {
                    msgBox.innerText = 'Sending...';
                    const { error } = await this.resetPassword(email);
                    if (error) {
                        msgBox.style.color = '#ef4444';
                        msgBox.innerText = error.message;
                    } else {
                        msgBox.style.color = '#10b981';
                        msgBox.innerHTML = '<b>Sent!</b> Check your email for the reset link.';
                    }
                }
            });
        }

        if (loginBtn) {
            loginBtn.addEventListener('click', () => {
                if (this.user) {
                    if (confirm('Log out?')) this.signOut();
                } else {
                    if (loginModal) loginModal.style.display = 'block';
                }
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', () => loginModal.style.display = 'none');

        // Toggle Sign Up / Sign In
        let isSignUp = false;
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
                    toggleLink.innerHTML = isSignUp ? 'Already have an account? <b>Sign In</b>' : 'New here? <b>Create Account</b>';
                }

                if (msgBox) msgBox.innerText = '';
            });
        }

        // Form Submit
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
                        msgBox.style.color = '#10b981';
                        msgBox.innerHTML = '<b>Success!</b> Check your email to confirm your account.';
                    }
                } else {
                    result = await this.signIn(email, pass);
                    if (!result.error) {
                        msgBox.style.color = '#3b82f6';
                        msgBox.innerText = 'Success! Redirecting...';
                        if (loginModal) loginModal.style.display = 'none';
                    }
                }

                if (result.error) {
                    msgBox.style.color = '#ef4444';
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
    },
    // --- New Auth Methods ---

    async signInWithGoogle() {
        const { data, error } = await SupabaseClient.client.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin + '/app.html'
            }
        });
        return { data, error };
    },

    async resetPassword(email) {
        const { data, error } = await SupabaseClient.client.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + '/app.html',
        });
        return { data, error };
    }
};

// Auto-init
document.addEventListener('DOMContentLoaded', () => {
    // Wait for Supabase
    setTimeout(() => AuthManager.initialize(), 10);
});
