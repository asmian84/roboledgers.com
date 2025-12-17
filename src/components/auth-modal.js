/**
 * Authentication Modal
 * THE ONLY MODAL ALLOWED IN THE ENTIRE APPLICATION
 * Handles: Login, Signup, Forgot Password flows
 */

let authModalMode = 'login'; // 'login', 'signup', 'forgot', 'reset', 'check-email'
let authModalElement = null;

// Show auth modal
function showAuthModal(mode = 'login') {
  authModalMode = mode;

  if (!authModalElement) {
    createAuthModal();
  }

  renderAuthModalContent();
  authModalElement.style.display = 'flex';

  // Focus first input
  setTimeout(() => {
    const firstInput = authModalElement.querySelector('input');
    if (firstInput) firstInput.focus();
  }, 100);
}

// Create auth modal container
function createAuthModal() {
  authModalElement = document.createElement('div');
  authModalElement.id = 'auth-modal';
  authModalElement.className = 'auth-modal';

  // Cannot be dismissed by clicking outside or ESC
  authModalElement.addEventListener('click', (e) => {
    if (e.target === authModalElement) {
      // Do nothing - modal cannot be dismissed
    }
  });

  document.body.appendChild(authModalElement);
}

// Render modal content based on mode
function renderAuthModalContent() {
  if (!authModalElement) return;

  let content = '';

  if (authModalMode === 'login') {
    content = renderLoginForm();
  } else if (authModalMode === 'signup') {
    content = renderSignupForm();
  } else if (authModalMode === 'forgot') {
    content = renderForgotPasswordForm();
  } else if (authModalMode === 'check-email') {
    content = renderCheckEmailMessage();
  } else if (authModalMode === 'reset') {
    content = renderResetPasswordForm();
  }

  authModalElement.innerHTML = `
    <div class="auth-modal-content">
      ${content}
    </div>
  `;
}

// Login Form
function renderLoginForm() {
  const isDev = window.Session?.isDevelopment;

  return `
    <div class="auth-header">
      <h2>AutoBookkeeping</h2>
      <p>Welcome Back</p>
      <p class="auth-subtitle">Sign in to your account</p>
    </div>
    
    <form id="login-form" class="auth-form" onsubmit="handleLogin(event)">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="login-email" required placeholder="your@email.com" ${isDev ? 'value="demo@autobookkeeping.com"' : ''}>
      </div>
      
      <div class="form-group">
        <label>Password</label>
        <div class="password-input-wrapper">
          <input type="password" id="login-password" required placeholder="••••••••" ${isDev ? 'value="demo123"' : ''}>
          <button type="button" class="toggle-password" onclick="togglePasswordVisibility('login-password')">
            👁️
          </button>
        </div>
      </div>
      
      <div class="form-options">
        <label class="checkbox-label">
          <input type="checkbox" id="remember-me">
          <span>Remember me</span>
        </label>
        <a href="#" onclick="showAuthModal('forgot'); return false;">Forgot password?</a>
      </div>
      
      <div id="login-error" class="auth-error" style="display: none;"></div>
      
      <button type="submit" class="btn-primary btn-block" id="login-btn">
        Sign In
      </button>
      
      ${isDev ? `
        <button type="button" class="btn-secondary btn-block" onclick="devLogin()">
          🚀 Dev Login (Auto-fill)
        </button>
      ` : ''}
      
      <div class="auth-divider">
        <span>OR</span>
      </div>
      
      <button type="button" class="btn-oauth google" onclick="signInWithGoogle()">
        <span class="oauth-icon">G</span>
        Sign in with Google
      </button>
      
      <button type="button" class="btn-oauth microsoft" onclick="signInWithMicrosoft()">
        <span class="oauth-icon">M</span>
        Sign in with Microsoft
      </button>
      
      <div class="auth-footer">
        Don't have an account? 
        <a href="#" onclick="showAuthModal('signup'); return false;">Sign Up</a>
      </div>
    </form>
  `;
}

// Signup Form
function renderSignupForm() {
  return `
    <div class="auth-header">
      <h2>Create Account</h2>
      <p class="auth-subtitle">Get started with AutoBookkeeping</p>
    </div>
    
    <form id="signup-form" class="auth-form" onsubmit="handleSignup(event)">
      <div class="form-group">
        <label>Full Name</label>
        <input type="text" id="signup-name" required placeholder="John Doe">
      </div>
      
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="signup-email" required placeholder="your@email.com">
      </div>
      
      <div class="form-group">
        <label>Password</label>
        <div class="password-input-wrapper">
          <input type="password" id="signup-password" required placeholder="••••••••" oninput="checkPasswordStrength()">
          <button type="button" class="toggle-password" onclick="togglePasswordVisibility('signup-password')">
            👁️
          </button>
        </div>
        <div class="password-requirements">
          <small>• At least 8 characters</small>
          <small>• Include uppercase & lowercase</small>
          <small>• Include numbers</small>
        </div>
        <div id="password-strength" class="password-strength"></div>
      </div>
      
      <div class="form-group">
        <label>Confirm Password</label>
        <div class="password-input-wrapper">
          <input type="password" id="signup-confirm" required placeholder="••••••••">
          <button type="button" class="toggle-password" onclick="togglePasswordVisibility('signup-confirm')">
            👁️
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label class="checkbox-label">
          <input type="checkbox" id="agree-terms" required>
          <span>I agree to <a href="/terms" target="_blank">Terms</a> & <a href="/privacy" target="_blank">Privacy</a></span>
        </label>
      </div>
      
      <div id="signup-error" class="auth-error" style="display: none;"></div>
      
      <button type="submit" class="btn-primary btn-block">
        Create Account
      </button>
      
      <div class="auth-footer">
        Already have an account? 
        <a href="#" onclick="showAuthModal('login'); return false;">Sign In</a>
      </div>
    </form>
  `;
}

// Forgot Password Form
function renderForgotPasswordForm() {
  return `
    <div class="auth-header">
      <h2>Reset Password</h2>
      <p class="auth-subtitle">Enter your email to receive password reset instructions</p>
    </div>
    
    <form id="forgot-form" class="auth-form" onsubmit="handleForgotPassword(event)">
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="forgot-email" required placeholder="your@email.com">
      </div>
      
      <div id="forgot-error" class="auth-error" style="display: none;"></div>
      
      <button type="submit" class="btn-primary btn-block">
        Send Reset Link
      </button>
      
      <div class="auth-footer">
        <a href="#" onclick="showAuthModal('login'); return false;">← Back to Sign In</a>
      </div>
    </form>
  `;
}

// Check Email Message
function renderCheckEmailMessage() {
  const email = document.getElementById('forgot-email')?.value || 'your email';

  return `
    <div class="auth-header">
      <h2>Check Your Email</h2>
      <div class="email-icon">📧</div>
      <p class="auth-subtitle">We sent a password reset link to</p>
      <p><strong>${email}</strong></p>
    </div>
    
    <div class="auth-form">
      <p>Didn't receive the email?</p>
      <button type="button" class="btn-secondary btn-block" onclick="showAuthModal('forgot')">
        Resend Link
      </button>
      
      <div class="auth-footer">
        <a href="#" onclick="showAuthModal('login'); return false;">← Back to Sign In</a>
      </div>
    </div>
  `;
}

// Reset Password Form (from email link)
function renderResetPasswordForm() {
  return `
    <div class="auth-header">
      <h2>Set New Password</h2>
      <p class="auth-subtitle">Choose a strong password for your account</p>
    </div>
    
    <form id="reset-form" class="auth-form" onsubmit="handleResetPassword(event)">
      <div class="form-group">
        <label>New Password</label>
        <div class="password-input-wrapper">
          <input type="password" id="reset-password" required placeholder="••••••••">
          <button type="button" class="toggle-password" onclick="togglePasswordVisibility('reset-password')">
            👁️
          </button>
        </div>
      </div>
      
      <div class="form-group">
        <label>Confirm Password</label>
        <div class="password-input-wrapper">
          <input type="password" id="reset-confirm" required placeholder="••••••••">
          <button type="button" class="toggle-password" onclick="togglePasswordVisibility('reset-confirm')">
            👁️
          </button>
        </div>
      </div>
      
      <div id="reset-error" class="auth-error" style="display: none;"></div>
      
      <button type="submit" class="btn-primary btn-block">
        Reset Password
      </button>
    </form>
  `;
}

// ==================================================
// EVENT HANDLERS
// ==================================================

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const rememberMe = document.getElementById('remember-me').checked;

  const btn = document.getElementById('login-btn');
  const errorEl = document.getElementById('login-error');

  btn.disabled = true;
  btn.textContent = 'Signing in...';
  errorEl.style.display = 'none';

  const result = await window.Session.login(email, password, rememberMe);

  if (result.success) {
    onLoginSuccess();
  } else {
    errorEl.textContent = result.error;
    errorEl.style.display = 'block';
    btn.disabled = false;
    btn.textContent = 'Sign In';
  }
}

async function handleSignup(event) {
  event.preventDefault();

  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const confirm = document.getElementById('signup-confirm').value;

  const errorEl = document.getElementById('signup-error');

  // Validate passwords match
  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    errorEl.style.display = 'block';
    return;
  }

  // Validate password strength
  if (password.length < 8) {
    errorEl.textContent = 'Password must be at least 8 characters';
    errorEl.style.display = 'block';
    return;
  }

  errorEl.style.display = 'none';

  const result = await window.Session.signup(name, email, password);

  if (result.success) {
    onLoginSuccess();
  } else {
    errorEl.textContent = result.error;
    errorEl.style.display = 'block';
  }
}

async function handleForgotPassword(event) {
  event.preventDefault();

  const email = document.getElementById('forgot-email').value;
  const errorEl = document.getElementById('forgot-error');

  const result = await window.Session.requestPasswordReset(email);

  if (result.success) {
    showAuthModal('check-email');
  } else {
    errorEl.textContent = result.message;
    errorEl.style.display = 'block';
  }
}

async function handleResetPassword(event) {
  event.preventDefault();

  const password = document.getElementById('reset-password').value;
  const confirm = document.getElementById('reset-confirm').value;
  const errorEl = document.getElementById('reset-error');

  if (password !== confirm) {
    errorEl.textContent = 'Passwords do not match';
    errorEl.style.display = 'block';
    return;
  }

  // Get token from URL
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const result = await window.Session.resetPassword(token, password);

  if (result.success) {
    alert('Password reset successfully!');
    showAuthModal('login');
  } else {
    errorEl.textContent = result.message;
    errorEl.style.display = 'block';
  }
}

// OAuth Handlers
async function signInWithGoogle() {
  const result = await window.Session.signInWithProvider('google');
  if (result.success) {
    onLoginSuccess();
  } else {
    alert('Google sign-in failed: ' + (result.error || 'Unknown error'));
  }
}

async function signInWithMicrosoft() {
  const result = await window.Session.signInWithProvider('microsoft');
  if (result.success) {
    onLoginSuccess();
  } else {
    alert('Microsoft sign-in failed: ' + (result.error || 'Unknown error'));
  }
}

// Dev Mode Quick Login
function devLogin() {
  document.getElementById('login-form').dispatchEvent(new Event('submit', { cancelable: true }));
}

// Password Utilities
function togglePasswordVisibility(inputId) {
  const input = document.getElementById(inputId);
  if (input.type === 'password') {
    input.type = 'text';
  } else {
    input.type = 'password';
  }
}

function checkPasswordStrength() {
  const password = document.getElementById('signup-password').value;
  const strengthEl = document.getElementById('password-strength');

  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
  if (/\d/.test(password)) strength++;
  if (/[^a-zA-Z\d]/.test(password)) strength++;

  const labels = ['Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['#ef4444', '#f59e0b', '#10b981', '#10b981'];

  if (password.length > 0) {
    strengthEl.textContent = labels[strength - 1] || 'Weak';
    strengthEl.style.color = colors[strength - 1] || '#ef4444';
    strengthEl.style.display = 'block';
  } else {
    strengthEl.style.display = 'none';
  }
}

// On Login Success
function onLoginSuccess() {
  closeAuthModal();

  // Redirect to intended route or home
  const intended = sessionStorage.getItem('intended_route') || '/';
  sessionStorage.removeItem('intended_route');

  // ALWAYS use router.navigate, never reload after login
  if (typeof router !== 'undefined' && router.navigate) {
    console.log('✅ Login successful, navigating to:', intended);
    router.navigate(intended);
  } else {
    // Fallback: set hash without reload
    console.log('⚠️ Router not found, using hash navigation');
    window.location.hash = intended;
  }
}

// Close Modal
function closeAuthModal() {
  if (authModalElement) {
    authModalElement.style.display = 'none';
  }
}

// Expose globally
window.showAuthModal = showAuthModal;
window.closeAuthModal = closeAuthModal;
