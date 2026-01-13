/**
 * Account Switcher - Header Dropdown
 * Quick switch between accounts with balance display
 */

class AccountSwitcher {
  constructor() {
    this.accountManager = window.accountManager;
    this.render();

    // Re-render when accounts change
    window.addEventListener('accountChanged', () => this.render());
  }

  /**
   * Render account switcher in header
   */
  render() {
    const header = document.querySelector('.toolbar');
    if (!header) {
      // Retry after DOM loads
      setTimeout(() => this.render(), 500);
      return;
    }

    // Remove existing switcher
    const existing = document.getElementById('account-switcher');
    if (existing) existing.remove();

    const currentAccount = this.accountManager.getCurrentAccount();
    const allAccounts = this.accountManager.getActiveAccounts();

    // Create switcher HTML
    const switcherHTML = `
      <div id="account-switcher" class="account-switcher">
        <button class="account-switcher-btn" onclick="window.accountSwitcher.toggleDropdown()">
          <span class="account-icon">${currentAccount ? (currentAccount.type === 'bank' ? '🏦' : '💳') : '📁'}</span>
          <span class="account-name">${currentAccount ? currentAccount.accountName : 'No Account'}</span>
          ${currentAccount ? `<span class="account-balance">$${this.formatBalance(this.accountManager.getAccountBalance(currentAccount.id))}</span>` : ''}
          <span class="dropdown-arrow">▼</span>
        </button>
        
        <div class="account-dropdown" id="account-dropdown" style="display: none;">
          ${allAccounts.map(acc => `
            <div class="account-option ${acc.id === currentAccount?.id ? 'active' : ''}" 
                 onclick="window.accountSwitcher.switchAccount('${acc.id}')">
              <span class="account-icon">${acc.type === 'bank' ? '🏦' : '💳'}</span>
              <div class="account-info">
                <div class="account-name">${acc.accountName}</div>
                <div class="account-meta">${acc.accountNumber} • $${this.formatBalance(this.accountManager.getAccountBalance(acc.id))}</div>
              </div>
              ${acc.id === currentAccount?.id ? '<span class="check-icon">✓</span>' : ''}
            </div>
          `).join('')}
          
          ${allAccounts.length < this.accountManager.MAX_ACCOUNTS ? `
            <div class="account-divider"></div>
            <div class="account-option add-account" onclick="window.accountSwitcher.showAddAccountModal()">
              <span class="account-icon">➕</span>
              <div class="account-info">
                <div class="account-name">Add Account</div>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;

    // Inject CSS
    this.injectStyles();

    // Insert before search bar or at beginning
    const searchBar = header.querySelector('.search-container') || header.querySelector('button');
    if (searchBar) {
      searchBar.insertAdjacentHTML('beforebegin', switcherHTML);
    } else {
      header.insertAdjacentHTML('afterbegin', switcherHTML);
    }

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('account-dropdown');
      const switcher = document.getElementById('account-switcher');
      if (dropdown && switcher && !switcher.contains(e.target)) {
        dropdown.style.display = 'none';
      }
    });
  }

  /**
   * Toggle dropdown visibility
   */
  toggleDropdown() {
    const dropdown = document.getElementById('account-dropdown');
    if (dropdown) {
      dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
    }
  }

  /**
   * Switch to different account
   */
  switchAccount(accountId) {
    try {
      this.accountManager.setCurrentAccount(accountId);

      // Hide dropdown
      const dropdown = document.getElementById('account-dropdown');
      if (dropdown) dropdown.style.display = 'none';

      // Reload page to show new account data
      if (window.router && window.router.currentRoute) {
        window.router.navigate(window.router.currentRoute);
      }

      // Show notification
      const account = this.accountManager.getAccount(accountId);
      if (window.toast && account) {
        window.toast.success(`Switched to ${account.accountName}`);
      }

      // Trigger event
      window.dispatchEvent(new Event('accountChanged'));

    } catch (error) {
      console.error('Failed to switch account:', error);
      if (window.toast) {
        window.toast.error('Failed to switch account');
      }
    }
  }

  /**
   * Show add account modal
   */
  /**
   * Show add account modal
   */
  showAddAccountModal() {
    // Hide dropdown
    const dropdown = document.getElementById('account-dropdown');
    if (dropdown) dropdown.style.display = 'none';

    // Create Modal
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '3000';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 450px;">
            <div class="modal-header">
                <h3>Create New Account</h3>
                <button class="close-btn icon-btn">×</button>
            </div>
            <div class="modal-body">
                <form id="create-account-form" onsubmit="return false;">
                    <div class="form-group">
                        <label>Account Name</label>
                        <input type="text" id="new-account-name" class="form-control" placeholder="e.g., Chase Checking" required style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-top: 4px;">
                    </div>
                    
                    <div class="form-group" style="margin-top: 16px;">
                        <label>Account Type</label>
                        <div class="radio-group" style="display: flex; gap: 1rem; margin-top: 8px;">
                            <label class="radio-option" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; flex: 1; background: #f8fafc;">
                                <input type="radio" name="accountType" value="bank" checked>
                                <span>🏦 Bank Account</span>
                            </label>
                            <label class="radio-option" style="display: flex; align-items: center; gap: 8px; cursor: pointer; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; flex: 1; background: #f8fafc;">
                                <input type="radio" name="accountType" value="credit">
                                <span>💳 Credit Card</span>
                            </label>
                        </div>
                    </div>

                    <div class="form-row" style="display: flex; gap: 16px; margin-top: 16px;">
                        <div class="form-group" style="flex: 1;">
                            <label>Account Number (Last 4)</label>
                            <input type="text" id="new-account-number" class="form-control" placeholder="1234" maxlength="4" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-top: 4px;">
                        </div>
                        <div class="form-group" style="flex: 1;">
                            <label>Opening Balance</label>
                            <input type="number" id="new-account-balance" class="form-control" value="0.00" step="0.01" style="width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 4px; margin-top: 4px;">
                        </div>
                    </div>
                </form>
            </div>
            <div class="modal-footer" style="padding: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 8px;">
                <button class="btn-secondary close-btn" style="padding: 8px 16px; background: white; border: 1px solid #cbd5e1; border-radius: 4px; cursor: pointer;">Cancel</button>
                <button class="btn-primary" id="save-account-btn" style="padding: 8px 16px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;">Create Account</button>
            </div>
        </div>
        `;

    document.body.appendChild(modal);

    // Handlers
    const close = () => modal.remove();
    modal.querySelectorAll('.close-btn').forEach(btn => btn.onclick = close);

    // Radio styling highlight
    const radios = modal.querySelectorAll('input[name="accountType"]');
    radios.forEach(radio => {
      radio.addEventListener('change', () => {
        modal.querySelectorAll('.radio-option').forEach(opt => opt.style.borderColor = '#cbd5e1');
        radio.parentElement.style.borderColor = '#3b82f6';
      });
    });
    // Init active state
    modal.querySelector('input[checked]').parentElement.style.borderColor = '#3b82f6';

    // Save Action
    document.getElementById('save-account-btn').onclick = () => {
      const name = document.getElementById('new-account-name').value.trim();
      if (!name) {
        alert('Please enter an account name');
        return;
      }

      const type = document.querySelector('input[name="accountType"]:checked').value;
      const number = document.getElementById('new-account-number').value.trim() || (type === 'bank' ? '1000' : '2000');
      const balance = parseFloat(document.getElementById('new-account-balance').value) || 0;

      try {
        const newAccount = this.accountManager.createAccount({
          accountName: name,
          type: type,
          accountNumber: number,
          openingBalance: balance
        });

        // Switch to new account
        this.switchAccount(newAccount.id);

        if (window.toast) {
          window.toast.success(`Created account: ${name}`);
        }
        close();
      } catch (error) {
        alert(error.message);
      }
    };

    // Focus name
    setTimeout(() => document.getElementById('new-account-name').focus(), 100);
  }

  /**
   * Format balance with commas
   */
  formatBalance(balance) {
    return Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Inject styles
   */
  injectStyles() {
    if (document.getElementById('account-switcher-styles')) return;

    const style = document.createElement('style');
    style.id = 'account-switcher-styles';
    style.innerHTML = `
      .account-switcher {
        position: relative;
        margin-right: 16px;
      }

      .account-switcher-btn {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 16px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: all 0.2s;
      }

      .account-switcher-btn:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }

      .account-switcher .account-icon {
        font-size: 1.2rem;
      }

      .account-switcher .account-name {
        font-weight: 500;
        color: #1e293b;
      }

      .account-switcher .account-balance {
        color: #64748b;
        font-size: 0.85rem;
        padding-left: 8px;
        border-left: 1px solid #e2e8f0;
      }

      .account-switcher .dropdown-arrow {
        font-size: 0.7rem;
        color: #94a3b8;
      }

      .account-dropdown {
        position: absolute;
        top: calc(100% + 8px);
        left: 0;
        min-width: 280px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        z-index: 1000;
        overflow: hidden;
      }

      .account-option {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        cursor: pointer;
        transition: background 0.15s;
      }

      .account-option:hover {
        background: #f8fafc;
      }

      .account-option.active {
        background: #eff6ff;
      }

      .account-option .account-icon {
        font-size: 1.3rem;
      }

      .account-option .account-info {
        flex: 1;
      }

      .account-option .account-name {
        font-weight: 500;
        color: #1e293b;
        font-size: 0.9rem;
      }

      .account-option .account-meta {
        color: #64748b;
        font-size: 0.8rem;
        margin-top: 2px;
      }

      .account-option .check-icon {
        color: #3b82f6;
        font-weight: 600;
      }

      .account-divider {
        height: 1px;
        background: #e2e8f0;
        margin: 4px 0;
      }

      .account-option.add-account {
        border-top: 1px solid #e2e8f0;
      }

      .account-option.add-account .account-name {
        color: #3b82f6;
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.accountSwitcher = new AccountSwitcher();
  });
} else {
  window.accountSwitcher = new AccountSwitcher();
}

// console.log('💼 Account Switcher loaded');
