/**
 * BankAccountManager
 * Handles UI for creating and managing multiple bank accounts.
 */
const BankAccountManager = {
    accounts: [],

    initialize() {
        console.log('🏦 Initializing BankAccountManager...');
        this.loadAccounts();
        this.renderAccountsList();
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

    // --- UI Rendering ---

    renderAccountsList() {
        const listContainer = document.getElementById('bankAccountsList');
        if (!listContainer) return;

        listContainer.innerHTML = this.accounts.map(acc => `
            <div class="account-card" style="border-left: 4px solid ${acc.color || '#ccc'}">
                <div class="account-info">
                    <div class="account-name">${acc.name}</div>
                    <div class="account-details">
                        <span class="badge badge-sm">${acc.currency}</span>
                        <span class="badge badge-sm badge-outline">${acc.getTypeLabel()}</span>
                    </div>
                </div>
                <div class="account-actions">
                    <button onclick="BankAccountManager.editAccount('${acc.id}')" class="btn-icon" title="Edit">✏️</button>
                    ${this.accounts.length > 1 ? `<button onclick="BankAccountManager.deleteAccount('${acc.id}')" class="btn-icon text-red" title="Delete">🗑️</button>` : ''}
                </div>
            </div>
        `).join('');
    },

    updateUploadSelector() {
        const selector = document.getElementById('uploadAccountSelect');
        if (!selector) return;

        selector.innerHTML = this.accounts.map(acc => `
            <option value="${acc.id}">${acc.icon} ${acc.name} (${acc.currency})</option>
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
