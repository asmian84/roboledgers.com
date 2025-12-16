// Account UI Manager for Multi-Account Support
const AccountUI = {
    // Initialize the UI modules
    init() {
        this.renderHeaderControl(); // Add the dropdown/button to header
        this.setupEventListeners();
        this.updateHeaderDisplay(); // Show current account
    },

    // Inject the Accounts button/dropdown into the header
    renderHeaderControl() {
        const headerActions = document.querySelector('.header-actions');
        if (!headerActions) return;

        // Create the container if it doesn't exist
        if (document.getElementById('accountHeaderControl')) return;

        const container = document.createElement('div');
        container.id = 'accountHeaderControl';
        container.className = 'account-header-control';
        container.style.display = 'inline-block';
        container.style.marginLeft = '10px';

        // Initial HTML
        container.innerHTML = `
            <button id="accountDropdownBtn" class="account-dropdown-btn btn-secondary" style="display: flex; align-items: center; gap: 8px;">
                <span id="currentAccountIcon">🏦</span>
                <span id="currentAccountName">Select Account</span>
                <span class="dropdown-arrow">▼</span>
            </button>
            <div id="accountDropdownMenu" class="account-dropdown-menu" style="display: none;"></div>
        `;

        // Insert before 'Reports' or append
        const reportsBtn = document.getElementById('reportsBtn');
        if (reportsBtn) {
            headerActions.insertBefore(container, reportsBtn);
        } else {
            headerActions.appendChild(container); // Fallback
        }

        // Add CSS for the dropdown
        this.addStyles();

        // Wire up click
        const btn = document.getElementById('accountDropdownBtn');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', () => {
            const menu = document.getElementById('accountDropdownMenu');
            if (menu) menu.style.display = 'none';
        });
    },

    setupEventListeners() {
        // Manage Accounts Modal
        const closeManageModal = document.querySelector('#manageAccountsModal .modal-close');
        const manageModal = document.getElementById('manageAccountsModal');
        const addAccountBtn = document.getElementById('addAccountBtn');

        if (closeManageModal) {
            closeManageModal.addEventListener('click', () => {
                manageModal.classList.remove('active');
            });
        }

        if (manageModal) {
            manageModal.addEventListener('click', (e) => {
                if (e.target === manageModal) {
                    manageModal.classList.remove('active');
                }
            });
        }

        if (addAccountBtn) {
            addAccountBtn.addEventListener('click', () => {
                this.openAccountForm();
            });
        }

        // Account Form Modal
        const closeFormModal = document.getElementById('closeAccountFormModal');
        const cancelFormBtn = document.getElementById('cancelAccountForm');
        const formModal = document.getElementById('accountFormModal');
        const accountForm = document.getElementById('accountForm');

        if (closeFormModal) {
            closeFormModal.addEventListener('click', () => {
                formModal.classList.remove('active');
            });
        }

        if (cancelFormBtn) {
            cancelFormBtn.addEventListener('click', () => {
                formModal.classList.remove('active');
            });
        }

        if (accountForm) {
            accountForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleFormSubmit();
            });
        }
    },

    addStyles() {
        const styleId = 'account-ui-styles';
        if (document.getElementById(styleId)) return;

        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
            .account-header-control {
                position: relative;
            }
            .account-dropdown-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 0.5rem 1rem;
                min-width: 160px;
                justify-content: space-between;
                border: 1px solid var(--border-color);
            }
            .account-dropdown-menu {
                position: absolute;
                top: 100%;
                right: 0;
                width: 250px;
                background: white;
                border: 1px solid var(--border-color);
                border-radius: 8px;
                box-shadow: 0 4px 6px rgba(0,0,0,0.1);
                z-index: 1000;
                padding: 5px 0;
                margin-top: 5px;
            }
            .account-item {
                padding: 10px 15px;
                display: flex;
                align-items: center;
                gap: 10px;
                cursor: pointer;
                transition: background 0.2s;
                color: var(--text-primary);
            }
            .account-item:hover {
                background: var(--surface-hover);
            }
            .account-item.active {
                background: var(--primary-color-dim);
                border-left: 3px solid var(--primary-color);
            }
            .account-name {
                font-weight: 500;
                flex: 1;
            }
            .account-balance {
                font-size: 0.85rem;
                color: var(--text-secondary);
            }
            .account-divider {
                height: 1px;
                background: var(--border-color);
                margin: 0;
            }
            .manage-accounts-btn {
                width: 100%;
                text-align: left;
                padding: 10px 15px;
                background: none;
                border: none;
                color: var(--primary-color);
                font-weight: 500;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .manage-accounts-btn:hover {
                background: var(--surface-hover);
            }
            /* Accounts List in Modal */
            .account-card {
                background: var(--surface-hover);
                border: 1px solid var(--border-color);
                border-radius: 8px;
                padding: 0.6rem 1rem; /* Compact */
                margin-bottom: 0.5rem; /* Compact */
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            .account-info h4 {
                margin: 0 0 5px 0;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .account-meta {
                font-size: 0.9rem;
                color: var(--text-secondary);
            }
            .account-actions {
                display: flex;
                gap: 8px;
            }
        `;
        document.head.appendChild(style);
    },

    toggleDropdown() {
        const menu = document.getElementById('accountDropdownMenu');
        if (!menu) return;

        const isVisible = menu.style.display === 'block';

        if (!isVisible) {
            this.renderDropdownContent(menu);
            menu.style.display = 'block';
        } else {
            menu.style.display = 'none';
        }
    },

    renderDropdownContent(menu) {
        const accounts = AccountManager.getAccounts();
        const currentId = AccountManager.currentAccount ? AccountManager.currentAccount.id : null;

        let html = '';

        if (accounts.length === 0) {
            html += `<div style="padding: 15px; text-align: center; color: var(--text-secondary);">No accounts yet</div>`;
        } else {
            accounts.forEach(acc => {
                const isActive = acc.id === currentId;
                html += `
                    <div class="account-item ${isActive ? 'active' : ''}" onclick="AccountUI.switchAccount('${acc.id}')">
                        <span>${acc.icon || '🏦'}</span>
                        <div class="account-name">${acc.name}</div>
                        <!-- Future: Balance -->
                    </div>
                `;
            });
        }

        html += `<div class="account-divider"></div>`;
        html += `
            <button class="manage-accounts-btn" onclick="event.stopPropagation(); AccountUI.openManageAccounts()">
                <span>⚙️</span> Manage Accounts
            </button>
        `;

        menu.innerHTML = html;
    },

    updateHeaderDisplay() {
        const iconEl = document.getElementById('currentAccountIcon');
        const nameEl = document.getElementById('currentAccountName');

        if (AccountManager.currentAccount) {
            if (iconEl) iconEl.textContent = AccountManager.currentAccount.icon || '🏦';
            if (nameEl) nameEl.textContent = AccountManager.currentAccount.name;
        } else {
            if (iconEl) iconEl.textContent = '🏦';
            if (nameEl) nameEl.textContent = 'Select Account';
        }
    },

    switchAccount(id) {
        if (AccountManager.setCurrentAccount(id)) {
            this.updateHeaderDisplay();
            // TODO: Trigger App refresh (reload transactions for this account)
            // App.loadTransactionForAccount(id) - future step
            console.log("Switched account, need to refresh grid...");
        }
        document.getElementById('accountDropdownMenu').style.display = 'none';
    },

    openManageAccounts() {
        const modal = document.getElementById('manageAccountsModal');
        if (modal) {
            this.renderAccountsList();
            modal.classList.add('active');

            // 🔧 Standard Modal Logic: Snug & Resizable
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                // Remove fixed height from class, allow auto-fit
                modalContent.style.height = 'auto';
                modalContent.style.maxHeight = '80vh';

                // Allow user resizing
                modalContent.style.resize = 'both';
                modalContent.style.overflow = 'auto'; // needed for resize to work effectively with content

                // Set snug width (smaller than valid large-modal ~1200px)
                modalContent.style.width = '600px';
                modalContent.style.minWidth = '400px';
                modalContent.style.minHeight = '300px';
            }
        }
        document.getElementById('accountDropdownMenu').style.display = 'none';
    },

    renderAccountsList() {
        const listContainer = document.getElementById('accountsList');
        if (!listContainer) return;

        const accounts = AccountManager.getAccounts();

        if (accounts.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--text-secondary);">
                    <p>No accounts configured yet.</p>
                    <p>Add your first bank account to get started.</p>
                </div>
            `;
            return;
        }

        let html = '';
        accounts.forEach(acc => {
            html += `
                <div class="account-card">
                    <div class="account-info">
                        <h4>${acc.icon || '🏦'} ${acc.name} ${acc.isActive ? '' : '(Inactive)'}</h4>
                        <div class="account-meta">${acc.getTypeLabel()} • ${acc.currency}</div>
                    </div>
                    <div class="account-actions">
                        <button class="btn-secondary btn-sm" onclick="AccountUI.openAccountForm('${acc.id}')">Edit</button>
                        <button class="btn-secondary btn-sm" style="color: var(--error-color);" onclick="AccountUI.deleteAccount('${acc.id}')">Delete</button>
                    </div>
                </div>
            `;
        });

        listContainer.innerHTML = html;
    },

    openAccountForm(id = null) {
        const modal = document.getElementById('accountFormModal');
        const form = document.getElementById('accountForm');
        const title = document.getElementById('accountFormTitle');
        const idInput = document.getElementById('accountFormId');

        if (!modal || !form) return;

        // Reset form
        form.reset();

        if (id) {
            // Edit mode
            const account = AccountManager.getAccountById(id);
            if (!account) return;

            title.textContent = 'Edit Account';
            idInput.value = account.id;
            document.getElementById('accountName').value = account.name;
            document.getElementById('accountType').value = account.type;
            document.getElementById('accountOpeningBalance').value = account.openingBalance;
            // document.getElementById('accountIsDefault').checked = ...
        } else {
            // Add mode
            title.textContent = 'Add Account';
            idInput.value = '';
        }

        modal.classList.add('active');
    },

    handleFormSubmit() {
        const id = document.getElementById('accountFormId').value;
        const name = document.getElementById('accountName').value;
        const type = document.getElementById('accountType').value;
        const openingBalance = document.getElementById('accountOpeningBalance').value;

        const data = {
            name,
            type,
            openingBalance: parseFloat(openingBalance) || 0
        };

        if (id) {
            AccountManager.updateAccount(id, data);
        } else {
            AccountManager.addAccount(data);
        }

        // Close form modal
        document.getElementById('accountFormModal').classList.remove('active');

        // Refresh list
        this.renderAccountsList();

        // Update header
        this.updateHeaderDisplay();
    },

    deleteAccount(id) {
        if (confirm('Are you sure you want to delete this account?')) {
            AccountManager.deleteAccount(id);
            this.renderAccountsList();
            this.updateHeaderDisplay();
        }
    }
};
