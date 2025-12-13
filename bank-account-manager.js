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
        if (window.Storage) {
            this.accounts = Storage.loadBankAccounts();
        }

        // Seed default if empty
        if (this.accounts.length === 0) {
            this.accounts = [
                new BankAccount({ name: 'Main Chequing', type: 'CHECKING', currency: 'CAD', color: '#3b82f6' }),
                new BankAccount({ name: 'Visa Infinite', type: 'CREDIT_CARD', currency: 'CAD', color: '#ef4444' })
            ];
            this.saveAccounts();
        }
    },

    saveAccounts() {
        if (window.Storage) {
            Storage.saveBankAccounts(this.accounts);
        }
        this.renderAccountsList();
        this.updateUploadSelector(); // update dropdown in upload area
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
            if (acc.isActive) {
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
    renderAccountsList() {
        const list = document.getElementById('accountsList');
        if (!list) return;

        list.innerHTML = '';
        this.accounts.forEach(acc => {
            const item = document.createElement('div');
            item.className = 'account-item';
            item.innerHTML = `
                <div class="account-info">
                    <span class="account-icon">${acc.icon || '🏦'}</span>
                    <div class="account-details">
                        <span class="account-name">${acc.name}</span>
                        <span class="account-meta">${acc.type} • ${acc.currency}</span>
                    </div>
                </div>
                <div class="account-actions">
                    <button class="btn-icon edit-btn" title="Edit">✏️</button>
                    <button class="btn-icon delete-btn" title="Delete">🗑️</button>
                </div>
            `;

            // Edit
            item.querySelector('.edit-btn').onclick = () => this.editAccount(acc.id);

            // Delete
            item.querySelector('.delete-btn').onclick = () => {
                if (confirm(`Delete ${acc.name}?`)) {
                    this.deleteAccount(acc.id);
                    this.renderAccountsList();
                }
            };

            list.appendChild(item);
        });
    },

    // --- Mini-Popover UI ---

    togglePopover(triggerBtn) {
        let popover = document.getElementById('accountManagerPopover');

        // Auto-inject if missing (fallback safetynet)
        if (!popover) {
            console.warn('⚠️ Popover not found in DOM, injecting...');
            // In a real app we might inject it here, but we added it to index.html
            return;
        }

        if (popover.style.display === 'block') {
            popover.style.display = 'none';
        } else {
            // Render list before showing
            this.renderMiniList();

            // Show and Position
            popover.style.display = 'block';

            // Safe positioning
            const rect = triggerBtn.getBoundingClientRect();
            // Align top-left of popover to bottom-left of button (plus offset)
            popover.style.top = (rect.bottom + window.scrollY + 10) + 'px';

            // Keep it on screen (horizontal)
            let left = rect.left + window.scrollX - 20;
            if (left + 250 > window.innerWidth) left = window.innerWidth - 260; // adjust if too far right
            popover.style.left = left + 'px';

            // Close logic listener (one-time)
            const closeBtn = document.getElementById('closePopoverBtn');
            if (closeBtn) closeBtn.onclick = () => popover.style.display = 'none';

            // Click outside to close
            const clickOutside = (e) => {
                if (!popover.contains(e.target) && e.target !== triggerBtn && !triggerBtn.contains(e.target)) {
                    popover.style.display = 'none';
                    document.removeEventListener('click', clickOutside);
                }
            };
            // Delay adding listener to avoid immediate trigger
            setTimeout(() => document.addEventListener('click', clickOutside), 100);

            // Quick Add Listeners
            const quickAddBtns = popover.querySelectorAll('.quick-add-btn');
            quickAddBtns.forEach(btn => {
                // Remove old listeners to avoid duplicates if re-opened
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.onclick = (e) => this.handleQuickAdd(e.target.dataset.type);
            });
        }
    },

    renderMiniList() {
        const list = document.getElementById('miniAccountList');
        if (!list) return;

        list.innerHTML = '';
        const accounts = this.accounts.filter(a => a.isActive);

        accounts.forEach(acc => {
            const item = document.createElement('div');
            item.className = 'account-item-mini';

            // Icon based on type
            let icon = '🏦';
            if (acc.type === 'credit') icon = '💳';
            if (acc.type === 'savings') icon = '💰';

            item.innerHTML = `
                <span>${icon}</span>
                <span class="editable-name" style="cursor:text;" title="Double-click to edit">${acc.name}</span>
                <span class="delete-btn" title="Delete">&times;</span>
            `;

            // Inline Edit Event
            const nameSpan = item.querySelector('.editable-name');
            nameSpan.addEventListener('dblclick', () => {
                nameSpan.contentEditable = true;
                nameSpan.focus();
                // Select all text
                document.execCommand('selectAll', false, null);
            });

            nameSpan.addEventListener('blur', () => {
                nameSpan.contentEditable = false;
                this.updateAccountName(acc.id, nameSpan.innerText);
            });

            nameSpan.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    nameSpan.blur();
                }
            });

            // Delete Event
            const delBtn = item.querySelector('.delete-btn');
            delBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Delete ${acc.name}?`)) {
                    this.deleteAccount(acc.id);
                    this.renderMiniList();
                    if (window.App && App.updateBankAccountSelector) App.updateBankAccountSelector();
                }
            });

            list.appendChild(item);
        });
    },

    handleQuickAdd(type) {
        let baseName = 'Chequing';
        let accType = 'CHECKING';

        if (type === 'savings') { baseName = 'Savings'; accType = 'SAVINGS'; }
        if (type === 'credit') { baseName = 'Credit Card'; accType = 'CREDIT_CARD'; }

        // Find unique name: Chequing, Chequing 2, Chequing 3...
        let name = baseName;
        let counter = 2;

        // Helper to check case-insensitive name usage
        const exists = (n) => this.accounts.some(a => a.name.toLowerCase() === n.toLowerCase());

        while (exists(name)) {
            name = `${baseName} ${counter}`;
            counter++;
        }

        const newAccount = new BankAccount({
            id: crypto.randomUUID(), // Ensure UUID
            name: name,
            type: accType,
            currency: 'CAD',
            isActive: true,
            color: this.getRandomColor()
        });

        this.accounts.push(newAccount);
        this.saveAccounts();

        console.log(`✅ Quick Added: ${name}`);
        this.renderMiniList();
        if (window.App && App.updateBankAccountSelector) App.updateBankAccountSelector();
    },

    updateAccountName(id, newName) {
        const acc = this.getAccountById(id);
        if (acc && newName && newName.trim() !== '') {
            acc.name = newName.trim();
            this.saveAccounts();
            if (window.App && App.updateBankAccountSelector) App.updateBankAccountSelector();
            console.log(`✏️ Renamed to: ${acc.name}`);
        } else {
            this.renderMiniList(); // Revert
        }
    },

    updateUploadSelector() {
        const selector = document.getElementById('uploadAccountSelect');
        if (!selector) return;

        selector.innerHTML = this.accounts.map(acc => `
            <option value="${acc.id}">${acc.icon || '🏦'} ${acc.name} (${acc.currency})</option>
        `).join('');
    },

    // --- Actions ---

    createAccount() {
        // Simple prompt for MVP, can upgrade to Modal later
        const name = prompt("Enter Account Name (e.g. 'RBC Savings'):");
        if (!name) return;

        const type = prompt("Type? (CHECKING, SAVINGS, CREDIT_CARD, LINE_OF_CREDIT)", "CHECKING");
        const currency = prompt("Currency? (CAD, USD)", "CAD");

        const newAccount = new BankAccount({
            name: name,
            type: type ? type.toUpperCase() : 'CHECKING',
            currency: currency ? currency.toUpperCase() : 'CAD',
            color: this.getRandomColor()
        });

        this.accounts.push(newAccount);
        this.saveAccounts();
    },

    editAccount(id) {
        const acc = this.getAccountById(id);
        if (!acc) return;

        const newName = prompt("Edit Account Name:", acc.name);
        if (newName) {
            acc.name = newName;
            this.saveAccounts();
        }
    },

    deleteAccount(id) {
        if (!confirm('Are you sure? Transactions linked to this account might lose their reference.')) return;
        this.accounts = this.accounts.filter(a => a.id !== id);
        this.saveAccounts();
    },

    setupEventListeners() {
        const addBtn = document.getElementById('btnAddAccount');
        if (addBtn) {
            addBtn.onclick = () => this.createAccount();
        }
    },

    getRandomColor() {
        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
};
