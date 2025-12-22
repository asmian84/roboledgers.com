/**
 * Session Management with JWT Tokens
 * Handles authentication, token refresh, and session persistence
 */

class SessionManager {
    constructor() {
        this.token = null;
        this.user = null;
        this.refreshTimer = null;
        this.isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '';
    }

    // Initialize session on app load
    async init() {
        console.log('🔐 Initializing session...');

        const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');

        if (token) {
            // In development, accept any token
            if (this.isDevelopment) {
                const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                this.setSession(token, user);
                return true;
            }

            // In production, validate token
            const valid = await this.validateToken(token);
            if (valid) {
                const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
                this.setSession(token, user);
                return true;
            }
        }

        return false;
    }

    // Login with email/password
    async login(email, password, rememberMe = false) {
        try {
            // In development mode, accept demo credentials
            if (this.isDevelopment && email === 'demo@autobookkeeping.com' && password === 'demo123') {
                const demoUser = {
                    id: 'demo-user-1',
                    email: 'demo@autobookkeeping.com',
                    name: 'Demo User',
                    avatar: '',
                    workspace: 'Demo Workspace'
                };

                const demoToken = 'demo-token-' + Date.now();
                this.setSession(demoToken, demoUser, rememberMe);

                return { success: true, user: demoUser };
            }

            // In production, call API
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.setSession(data.token, data.user, rememberMe);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.message || 'Login failed' };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    // Sign up new user
    async signup(name, email, password) {
        try {
            // In development mode, create demo account
            if (this.isDevelopment) {
                const newUser = {
                    id: 'user-' + Date.now(),
                    email: email,
                    name: name,
                    avatar: '',
                    workspace: name + "'s Workspace"
                };

                const token = 'token-' + Date.now();
                this.setSession(token, newUser, true);

                return { success: true, user: newUser };
            }

            // In production, call API
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.setSession(data.token, data.user, true);
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.message || 'Signup failed' };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { success: false, error: 'Network error. Please try again.' };
        }
    }

    // Set session data
    setSession(token, user, rememberMe = false) {
        this.token = token;
        this.user = user;

        // Save to localStorage if "Remember me"
        if (rememberMe) {
            localStorage.setItem('auth_token', token);
            localStorage.setItem('user', JSON.stringify(user));
        }

        // Always save to sessionStorage
        sessionStorage.setItem('auth_token', token);
        sessionStorage.setItem('user', JSON.stringify(user));

        // Schedule token refresh (every 50 minutes)
        this.scheduleRefresh();

        console.log('✅ Session established for:', user.email);
    }

    // Validate token with server
    async validateToken(token) {
        // In development, accept any token
        if (this.isDevelopment) {
            return true;
        }

        try {
            const response = await fetch('/api/validate', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            return response.ok;
        } catch {
            return false;
        }
    }

    // Refresh token
    async refreshToken() {
        if (!this.token) return false;

        // In development, just extend session
        if (this.isDevelopment) {
            this.scheduleRefresh();
            return true;
        }

        try {
            const response = await fetch('/api/refresh', {
                headers: { 'Authorization': `Bearer ${this.token}` }
            });

            const data = await response.json();

            if (response.ok) {
                this.token = data.token;
                sessionStorage.setItem('auth_token', data.token);
                if (localStorage.getItem('auth_token')) {
                    localStorage.setItem('auth_token', data.token);
                }
                this.scheduleRefresh();
                return true;
            } else {
                this.logout();
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            this.logout();
            return false;
        }
    }

    // Schedule token refresh
    scheduleRefresh() {
        clearTimeout(this.refreshTimer);

        // Refresh token 10 minutes before expiry (assuming 1 hour expiry)
        this.refreshTimer = setTimeout(() => {
            this.refreshToken();
        }, 50 * 60 * 1000); // 50 minutes
    }

    // Logout
    logout() {
        this.token = null;
        this.user = null;

        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('auth_token');
        sessionStorage.removeItem('user');

        clearTimeout(this.refreshTimer);

        console.log('🚪 User logged out');

        // Show login modal
        if (typeof showAuthModal === 'function') {
            showAuthModal('login');
        }
    }

    // Check if authenticated
    isAuthenticated() {
        return this.token !== null && this.user !== null;
    }

    // Get current user
    getUser() {
        return this.user;
    }

    // Get auth token
    getToken() {
        return this.token;
    }

    // Request password reset
    async requestPasswordReset(email) {
        // In development, just show success
        if (this.isDevelopment) {
            return { success: true, message: 'Password reset link sent to ' + email };
        }

        try {
            const response = await fetch('/api/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            return { success: false, message: 'Network error' };
        }
    }

    // Reset password with token
    async resetPassword(token, newPassword) {
        // In development, just show success
        if (this.isDevelopment) {
            return { success: true, message: 'Password reset successfully' };
        }

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token, password: newPassword })
            });

            const data = await response.json();
            return { success: response.ok, message: data.message };
        } catch (error) {
            return { success: false, message: 'Network error' };
        }
    }

    // OAuth sign in
    async signInWithProvider(provider) {
        // In development, simulate OAuth
        if (this.isDevelopment) {
            const demoUser = {
                id: 'oauth-user-' + Date.now(),
                email: `user@${provider}.com`,
                name: provider.charAt(0).toUpperCase() + provider.slice(1) + ' User',
                avatar: '',
                workspace: 'My Workspace',
                provider: provider
            };

            const token = 'oauth-token-' + Date.now();
            this.setSession(token, demoUser, true);

            return { success: true, user: demoUser };
        }

        // In production, open OAuth popup
        const width = 500;
        const height = 600;
        const left = (screen.width - width) / 2;
        const top = (screen.height - height) / 2;

        const popup = window.open(
            `/api/auth/${provider}`,
            `${provider} Sign In`,
            `width=${width},height=${height},left=${left},top=${top}`
        );

        return new Promise((resolve) => {
            const messageHandler = (event) => {
                if (event.origin !== window.location.origin) return;

                if (event.data.type === 'oauth_success') {
                    const { token, user } = event.data;
                    this.setSession(token, user, true);
                    popup.close();
                    window.removeEventListener('message', messageHandler);
                    resolve({ success: true, user });
                } else if (event.data.type === 'oauth_error') {
                    popup.close();
                    window.removeEventListener('message', messageHandler);
                    resolve({ success: false, error: event.data.message });
                }
            };

            window.addEventListener('message', messageHandler);
        });
    }
}

// Create global session instance
window.Session = new SessionManager();
