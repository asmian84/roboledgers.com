/**
 * BankAccountManager
 * Handles UI for creating and managing multiple bank accounts.
 */
const BankAccountManager = {
    accounts: [],

    initialize() {
        console.log('🏦 Initializing BankAccountManager...');
        this.loadAccounts();
        this.setupEventListeners();
    },

    loadAccounts() {
        // SAFETY: Ensure BankAccount class exists
        if (typeof BankAccount === 'undefined') {
            console.warn('⚠️ BankAccount class missing. defining fallback.');
            window.BankAccount = class BankAccount {
                constructor(data = {}) {
                    this.id = data.id || `acc_${Date.now()}`;
                    this.name = data.name || 'Unknown Account';
                    this.type = data.type || 'CHECKING';
                    this.currency = data.currency || 'CAD';
                    this.color = data.color || '#9ca3af';
                    this.isActive = true;
                    this.isReversedLogic = (this.type === 'CREDIT_CARD');
                }
            };
        }

        if (window.Storage) {
            const loaded = Storage.loadBankAccounts();
            if (Array.isArray(loaded)) {
                this.accounts = loaded;
            }
        }

        // Seed default if empty or invalid
        this.ensureDefaults();
    },

    ensureDefaults() {
        if (!this.accounts || this.accounts.length === 0) {
            console.log('🏦 No accounts found. Seeding defaults...');
            this.accounts = [
                new BankAccount({
                    id: 'default_checking',
                    name: 'Main Chequing',
                    type: 'CHECKING',
                    currency: 'CAD',
                    color: '#3b82f6',
                    isActive: true,
                    isReversedLogic: false
                }),
                new BankAccount({
                    id: 'default_visa',
                    name: 'Visa Infinite',
                    type: 'CREDIT_CARD',
                    currency: 'CAD',
                    color: '#ef4444',
                    isActive: true,
                    isReversedLogic: true
                })
            ];
            this.saveAccounts();
        } else {
            console.log(`🏦 ${this.accounts.length} accounts loaded.`);
        }
    },

    saveAccounts() {
        if (window.Storage) {
            Storage.saveBankAccounts(this.accounts);
        }
        this.renderAccountsList();
        this.updateUploadSelector(); // update dropdown in upload area

        // SYNC: Update the main header dropdown immediately
        if (window.App && App.updateBankAccountSelector) {
            App.updateBankAccountSelector();
        }
    },

    getAllAccounts() {
        return this.accounts;
    },

    getAccountById(id) {
        return this.accounts.find(a => a.id === id);
    },

    /**
     * Get account options for dropdown (Sorted by Usage)
     * @returns {Array<{value:string, label:string, disabled:boolean}>}
     */
    getAccountOptions() {
        const transactions = Storage.loadTransactions();
        const usedAccountIds = new Set();

        if (transactions && transactions.length > 0) {
            transactions.forEach(t => {
                if (t.accountId) usedAccountIds.add(t.accountId);
            });
        }

        const usedAccounts = [];
        const unusedAccounts = [];

        this.accounts.forEach(acc => {
            // Legacy support: undefined isActive means TRUE
            const isActive = acc.isActive !== false;

            if (isActive) {
                if (usedAccountIds.has(acc.id)) {
                    usedAccounts.push(acc);
                } else {
                    unusedAccounts.push(acc);
                }
            }
        });

        // Current account override (if any context exists)
        // ... (can be enhanced later)

        const options = [];

        // 1. Used Accounts
        usedAccounts.forEach(acc => {
            options.push({
                value: acc.id,
                label: `${acc.icon || '🏦'} ${acc.name} (${acc.currency})`
            });
        });

        // 2. Separator
        if (usedAccounts.length > 0 && unusedAccounts.length > 0) {
            options.push({
                value: 'separator',
                label: '──────────',
                disabled: true
            });
        }

        // 3. Unused Accounts
        unusedAccounts.forEach(acc => {
            options.push({
                value: acc.id,
                label: `${acc.icon || '🏦'} ${acc.name} (Unused)`,
                isUnused: true
            });
        });

        // 4. "Add New" Action
        options.push({
            value: 'action_new',
            label: '➕ Add New Account...',
            action: true
        });

        return options;
    },

    // --- Modal UI ---
    // Legacy render removed - using unified renderAccountsList below


    // --- UI Methods ---
    showModal() {
        const modal = document.getElementById('manageAccountsModal');
        if (modal) {
            modal.style.display = 'block';
            this.renderAccountsList();
        } else {
            console.error('BankAccountManager: #manageAccountsModal not found');
        }
    },


    setupEventListeners() {
        console.log('👂 Setting up Bank Account Manager Listeners...');
        // Add Button (Inside Modal)
        const addBtn = document.getElementById('addAccountBtn');
        if (addBtn) {
            // Remove old listeners to be safe (cloning)
            const newAddBtn = addBtn.cloneNode(true);
            addBtn.parentNode.replaceChild(newAddBtn, addBtn);

            newAddBtn.addEventListener('click', () => {
                this.addAccount('New Account', 'CHECKING');
            });
        }

        // Close Logic
        const modal = document.getElementById('manageAccountsModal');
        if (modal) {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
            window.addEventListener('click', (e) => {
                if (e.target === modal) modal.style.display = 'none';
            });
        }
    },

    // --- STRICT TYPE ASSIGNMENT ---
    isAsset(type) { return ['CHECKING', 'SAVINGS', 'CASH', 'INVESTMENT', 'OTHER_ASSET'].includes(type); },
    isLiability(type) { return ['CREDIT_CARD', 'LOAN', 'LINE_OF_CREDIT', 'OTHER_LIABILITY'].includes(type); },

    addAccount(name, accType = 'CHECKING') {
        const baseName = name.trim();
        let counter = 1;
        let finalName = baseName;

        // Prevent duplicates
        const exists = (n) => this.accounts.some(a => a.name.toLowerCase() === n.toLowerCase());
        while (exists(finalName)) {
            counter++;
            finalName = `${baseName} ${counter}`;
        }

        const newAccount = new BankAccount({
            id: crypto.randomUUID(),
            name: finalName,
            type: accType,
            currency: 'CAD',
            isActive: true,
            color: this.getRandomColor()
        });

        // Tag as NEW so we can delete if cancelled
        newAccount.isNew = true;

        this.accounts.push(newAccount);
        this.saveAccounts();
        this.renderAccountsList();

        // Auto-trigger edit mode
        setTimeout(() => {
            const rows = document.querySelectorAll('#accountsList tr');
            const lastRow = Array.from(rows).find(r => r.dataset.accountId === newAccount.id);
            if (lastRow) {
                const editBtn = lastRow.querySelector('.edit-btn');
                if (editBtn) editBtn.click();
            }
        }, 50);
    },

    getRandomColor() {
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    },

    // Unified Render Method
    renderAccountsList() {
        const listContainer = document.getElementById('accountsList');
        if (!listContainer) return;

        listContainer.innerHTML = '';
        if (this.accounts.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; color: var(--text-tertiary); padding: 2rem;">No accounts yet. Add one above!</div>';
            return;
        }

        // Sort: Assets first, then Liabilities, then by Name
        const sortedAccounts = [...this.accounts].sort((a, b) => {
            const aAsset = this.isAsset(a.type);
            const bAsset = this.isAsset(b.type);
            if (aAsset && !bAsset) return -1;
            if (!aAsset && bAsset) return 1;
            return a.name.localeCompare(b.name);
        });

        // Create Table Structure
        const table = document.createElement('table');
        table.className = 'grid-table';
        table.style.width = '100%';
        table.style.borderCollapse = 'collapse';

        // Header
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr style="background: var(--bg-secondary); text-align: left;">
                <th style="padding: 12px; border-bottom: 2px solid var(--border-color); width: 50px;"></th>
                <th style="padding: 12px; border-bottom: 2px solid var(--border-color);">Account Name</th>
                <th style="padding: 12px; border-bottom: 2px solid var(--border-color);">Type</th>
                 <th style="padding: 12px; border-bottom: 2px solid var(--border-color); width: 140px;">Action</th>
            </tr>
        `;
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        sortedAccounts.forEach(acc => {
            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid var(--border-color)';
            tr.dataset.accountId = acc.id;

            // Icon
            let icon = '🏦';
            if (this.isLiability(acc.type)) icon = '💳';
            if (acc.type === 'INVESTMENT') icon = '📈';

            const typeLabel = acc.type ? acc.type.replace('_', ' ') : 'Other';

            tr.innerHTML = `
                <td style="padding: 12px; text-align: center; font-size: 1.2em;">${icon}</td>
                <td style="padding: 12px;">
                     <span class="account-name-field" style="font-weight:500; font-size: 1.05em;">${acc.name}</span>
                </td>
                <td style="padding: 12px; color: var(--text-secondary); font-size: 0.9em;">
                    <span class="account-type-label">${typeLabel}</span>
                </td>
                <td style="padding: 12px; display: flex; gap: 8px; align-items: center;">
                    <button class="edit-btn btn-icon-small" title="Edit" style="color: var(--accent-color); background: none; border: none; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                    </button>
                    <button class="move-btn btn-icon-small" title="Move Transactions" style="color: var(--warning-color); background: none; border: none; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 17 4 12 9 7"></polyline><path d="M20 18v-2a4 4 0 0 0-4-4H4"></path></svg>
                    </button>
                    <button class="delete-btn btn-icon-small" title="Delete" style="color: var(--danger-color); background: none; border: none; cursor: pointer;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                    </button>
                </td>
            `;

            // Inline Edit Event
            const editBtn = tr.querySelector('.edit-btn');
            const moveBtn = tr.querySelector('.move-btn');
            const deleteBtn = tr.querySelector('.delete-btn');
            const nameField = tr.querySelector('.account-name-field');
            const typeLabelEl = tr.querySelector('.account-type-label');
            const actionCell = tr.lastElementChild;

            editBtn.addEventListener('click', () => {
                // Switch to Edit Mode
                nameField.innerHTML = `<input type="text" class="edit-input" value="${acc.name}" style="width: 100%; padding: 4px;">`;

                typeLabelEl.innerHTML = `
                    <select class="edit-select" style="width: 100%; padding: 4px;">
                        <optgroup label="Assets (Bank)">
                            <option value="CHECKING" ${acc.type === 'CHECKING' ? 'selected' : ''}>Chequing</option>
                            <option value="SAVINGS" ${acc.type === 'SAVINGS' ? 'selected' : ''}>Savings</option>
                            <option value="INVESTMENT" ${acc.type === 'INVESTMENT' ? 'selected' : ''}>Investment</option>
                        </optgroup>
                        <optgroup label="Liabilities (Credit)">
                            <option value="CREDIT_CARD" ${acc.type === 'CREDIT_CARD' ? 'selected' : ''}>Credit Card</option>
                            <option value="LOAN" ${acc.type === 'LOAN' ? 'selected' : ''}>Loan</option>
                            <option value="LINE_OF_CREDIT" ${acc.type === 'LINE_OF_CREDIT' ? 'selected' : ''}>Line of Credit</option>
                        </optgroup>
                    </select>
                `;

                // Replace Buttons with Save/Cancel
                actionCell.innerHTML = `
                    <button class="save-btn btn-primary-small" style="padding: 2px 8px; font-size: 0.8em;">Save</button>
                    <button class="cancel-btn btn-secondary-small" style="padding: 2px 8px; font-size: 0.8em;">Cancel</button>
                `;

                const saveBtn = actionCell.querySelector('.save-btn');
                const cancelBtn = actionCell.querySelector('.cancel-btn');
                const nameInput = nameField.querySelector('input');
                const typeSelect = typeLabelEl.querySelector('select');

                nameInput.focus();

                // Select text on focus
                nameInput.select();

                saveBtn.addEventListener('click', () => {
                    const newName = nameInput.value;
                    const newType = typeSelect.value;

                    if (newName && newName.trim() !== '') {
                        acc.name = newName.trim();
                        acc.type = newType;
                        delete acc.isNew; // Committed, no longer new
                        this.saveAccounts();
                        this.renderAccountsList();
                    }
                });

                cancelBtn.addEventListener('click', () => {
                    if (acc.isNew) {
                        // User Cancelled Creation -> Delete
                        this.deleteAccount(acc.id);
                    } else {
                        this.renderAccountsList(); // Revert
                    }
                });
            });

            // Move Data Event
            moveBtn.addEventListener('click', () => {
                // Determine Category
                const isSourceAsset = this.isAsset(acc.type);
                const isSourceLiability = this.isLiability(acc.type);
                const isSourceInvestment = acc.type === 'INVESTMENT';

                const targetAccounts = this.accounts.filter(a => {
                    if (a.id === acc.id) return false;

                    if (isSourceAsset) return this.isAsset(a.type);
                    if (isSourceLiability) return this.isLiability(a.type);
                    if (isSourceInvestment) return a.type === 'INVESTMENT';

                    return false; // Fallback: strict matching only
                });

                if (targetAccounts.length === 0) {
                    let typeName = isSourceAsset ? 'Asset (Bank)' : (isSourceLiability ? 'Liability (Credit)' : 'Investment');
                    alert(`No other ${typeName} accounts available to move data to.`);
                    return;
                }

                // Real dropdown implementation requires creating a select in the row
                actionCell.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:2px;">
                        <select class="move-select" style="max-width: 120px; font-size:0.8em; padding: 2px;">
                            <option value="">Move to...</option>
                            ${targetAccounts.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
                        </select>
                        <div style="display:flex; gap:2px;">
                            <button class="confirm-move-btn btn-primary-small" style="font-size:0.7em; padding: 2px 6px;">Confirm</button>
                            <button class="cancel-move-btn btn-secondary-small" style="font-size:0.7em; padding: 2px 6px;">Cancel</button>
                        </div>
                    </div>
                `;

                const select = actionCell.querySelector('.move-select');
                const confirmBtn = actionCell.querySelector('.confirm-move-btn');
                const cancelBtn = actionCell.querySelector('.cancel-move-btn');

                confirmBtn.addEventListener('click', () => {
                    const targetId = select.value;
                    if (targetId) {
                        const targetAcc = this.getAccountById(targetId);
                        if (confirm(`Move ALL transactions from ${acc.name} to ${targetAcc.name}?`)) {
                            // Perform Move
                            const transactions = Storage.loadTransactions();
                            let moveCount = 0;
                            transactions.forEach(t => {
                                if (t.accountId === acc.id) {
                                    t.accountId = targetId;
                                    moveCount++;
                                }
                            });
                            Storage.saveTransactions(transactions);
                            alert(`Moved ${moveCount} transactions.`);

                            if (confirm(`Delete empty account "${acc.name}" now?`)) {
                                this.deleteAccount(acc.id);
                            } else {
                                this.renderAccountsList();
                            }
                        }
                    }
                });

                cancelBtn.addEventListener('click', () => this.renderAccountsList());
            });

            // Delete Event
            deleteBtn.addEventListener('click', () => {
                if (confirm(`Delete account "${acc.name}"?`)) {
                    this.deleteAccount(acc.id);
                }
            });

            tbody.appendChild(tr);
        });

        table.appendChild(tbody);
        listContainer.appendChild(table);
    },

    updateAccountName(id, newName) {
        const acc = this.getAccountById(id);
        if (acc && newName && newName.trim() !== '') {
            acc.name = newName.trim();
            this.saveAccounts();
            if (window.App && App.updateBankAccountSelector) App.updateBankAccountSelector();
            console.log(`✏️ Renamed to: ${acc.name}`);
        } else {
            this.renderAccountsList(); // Revert
        }
    },

    updateUploadSelector() {
        const selector = document.getElementById('uploadAccountSelect');
        if (!selector) return;

        selector.innerHTML = this.accounts.map(acc => `
            <option value="${acc.id}">${acc.icon || '🏦'} ${acc.name} (${acc.currency})</option>
        `).join('');
    },

    deleteAccount(id) {
        // Find account to get name
        const acc = this.getAccountById(id);
        if (!acc) return;

        this.accounts = this.accounts.filter(a => a.id !== id);
        this.saveAccounts();
        this.renderAccountsList();
        console.log(`🗑️ Deleted account: ${acc.name}`);
    }
};
