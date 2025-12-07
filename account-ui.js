// Account UI Manager - Handles account selector and account management UI

const AccountUI = {
    // Initialize account UI
    initialize() {
        this.populateAccountSelector();
        this.setupEventListeners();
        AccountManager.initialize();
        console.log('✅ Account UI initialized');
    },

    // Populate account dropdown
    populateAccountSelector() {
        const select = document.getElementById('accountSelect');
        if (!select) return;

        const accounts = AccountManager.getActiveAccounts();
        select.innerHTML = '';

        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.id;
            option.textContent = `${account.name} (${AccountManager.accountTypes[account.type]})`;

            if (account.id === AccountManager.currentAccountId) {
                option.selected = true;
            }

            select.appendChild(option);
        });
    },

    // Setup event listeners
    setupEventListeners() {
        // Account selector change
        const accountSelect = document.getElementById('accountSelect');
        if (accountSelect) {
            accountSelect.addEventListener('change', (e) => {
                this.handleAccountSwitch(e.target.value);
            });
        }

        // Manage Accounts button
        const manageBtn = document.getElementById('manageAccountsBtn');
        if (manageBtn) {
            manageBtn.addEventListener('click', () => {
                this.showManageAccountsModal();
            });
        }

        // Close Manage Accounts modal
        const closeManageModal = document.getElementById('closeManageAccountsModal');
        if (closeManageModal) {
            closeManageModal.addEventListener('click', () => {
                this.hideManageAccountsModal();
            });
        }

        // Add Account button
        const addAccountBtn = document.getElementById('addAccountBtn');
        if (addAccountBtn) {
            addAccountBtn.addEventListener('click', () => {
                this.showAccountForm();
            });
        }

        // Close Account Form modal
        const closeFormModal = document.getElementById('closeAccountFormModal');
        if (closeFormModal) {
            closeFormModal.addEventListener('click', () => {
                this.hideAccountForm();
            });
        }

        const cancelFormBtn = document.getElementById('cancelAccountForm');
        if (cancelFormBtn) {
            cancelFormBtn.addEventListener('click', () => {
                this.hideAccountForm();
            });
        }

        // Account Form submit
        const accountForm = document.getElementById('accountForm');
        if (accountForm) {
            accountForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAccountFormSubmit();
            });
        }
    },

    // Handle account switch
    handleAccountSwitch(accountId) {
        if (AccountManager.switchAccount(accountId)) {
            // Reload transactions for new account
            if (typeof App !== 'undefined' && App.loadReviewSection) {
                App.loadReviewSection();
            }
            console.log('✅ Switched to account:', AccountManager.getCurrentAccount().name);
        }
    },

    // Show Manage Accounts modal
    showManageAccountsModal() {
        const modal = document.getElementById('manageAccountsModal');
        if (!modal) return;

        this.renderAccountsList();
        modal.classList.add('active');
        modal.style.display = 'flex';
    },

    // Hide Manage Accounts modal
    hideManageAccountsModal() {
        const modal = document.getElementById('manageAccountsModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    },

    // Render accounts list
    renderAccountsList() {
        const container = document.getElementById('accountsList');
        if (!container) return;

        const accounts = AccountManager.getAllAccounts();
        container.innerHTML = '';

        if (accounts.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">No accounts yet. Create one to get started!</p>';
            return;
        }

        accounts.forEach(account => {
            const item = document.createElement('div');
            item.className = 'account-item';

            const balance = AccountManager.getAccountBalance(account.id);
            const txCount = AccountManager.getTransactionCount(account.id);

            item.innerHTML = `
                <div class="account-item-info">
                    <div class="account-item-name">
                        ${account.name}
                        ${account.isDefault ? '<span style="font-size: 0.75rem; color: var(--primary); margin-left: 0.5rem;">DEFAULT</span>' : ''}
                    </div>
                    <div class="account-item-details">
                        ${AccountManager.accountTypes[account.type]} • ${txCount} transactions • Balance: $${balance.toFixed(2)}
                    </div>
                </div>
                <div class="account-item-actions">
                    <button class="btn-icon" onclick="AccountUI.editAccount('${account.id}')" title="Edit Account">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon" onclick="AccountUI.deleteAccount('${account.id}')" title="Delete Account" ${accounts.length === 1 ? 'disabled' : ''}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            `;

            container.appendChild(item);
        });
    },

    // Show account form (add or edit)
    showAccountForm(accountId = null) {
        const modal = document.getElementById('accountFormModal');
        const form = document.getElementById('accountForm');
        const title = document.getElementById('accountFormTitle');

        if (!modal || !form) return;

        // Reset form
        form.reset();
        document.getElementById('accountFormId').value = '';

        if (accountId) {
            // Edit mode
            const account = AccountManager.getAccount(accountId);
            if (!account) return;

            title.textContent = 'Edit Account';
            document.getElementById('accountFormId').value = account.id;
            document.getElementById('accountName').value = account.name;
            document.getElementById('accountType').value = account.type;
            document.getElementById('accountOpeningBalance').value = account.openingBalance;
            document.getElementById('accountIsDefault').checked = account.isDefault;
        } else {
            // Add mode
            title.textContent = 'Add Account';
        }

        modal.classList.add('active');
        modal.style.display = 'flex';
    },

    // Hide account form
    hideAccountForm() {
        const modal = document.getElementById('accountFormModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    },

    // Handle account form submit
    handleAccountFormSubmit() {
        const accountId = document.getElementById('accountFormId').value;
        const name = document.getElementById('accountName').value.trim();
        const type = document.getElementById('accountType').value;
        const openingBalance = parseFloat(document.getElementById('accountOpeningBalance').value) || 0;
        const isDefault = document.getElementById('accountIsDefault').checked;

        if (!name) {
            alert('Please enter account name');
            return;
        }

        if (accountId) {
            // Update existing account
            AccountManager.updateAccount(accountId, {
                name,
                type,
                openingBalance,
                isDefault
            });
        } else {
            // Create new account
            AccountManager.addAccount({
                name,
                type,
                openingBalance,
                isDefault
            });
        }

        // Update UI
        this.populateAccountSelector();
        this.renderAccountsList();
        this.hideAccountForm();
    },

    // Edit account
    editAccount(accountId) {
        this.showAccountForm(accountId);
    },

    // Delete account
    deleteAccount(accountId) {
        if (AccountManager.deleteAccount(accountId)) {
            this.populateAccountSelector();
            this.renderAccountsList();
        }
    }
};
