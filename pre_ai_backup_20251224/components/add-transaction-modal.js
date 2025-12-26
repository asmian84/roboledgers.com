/**
 * Add Transaction Modal - Manual Entry
 */

let addTransactionModal = null;

// Show Add Transaction Modal
window.showAddTransactionModal = function () {
    if (!addTransactionModal) {
        createAddTransactionModal();
    }

    addTransactionModal.style.display = 'flex';
    resetAddTransactionForm();
};

// Create Modal
function createAddTransactionModal() {
    const modalHTML = `
    <div id="add-transaction-modal" class="auth-modal" style="display: none;">
      <div class="auth-modal-content" style="max-width: 600px;">
        <div class="auth-header">
          <h2>➕ Add Transaction</h2>
          <p>Enter transaction details manually</p>
          <button class="modal-close-btn" onclick="closeAddTransactionModal()">×</button>
        </div>

        <form id="add-transaction-form" class="transaction-form" onsubmit="handleAddTransaction(event)">
          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label>Date *</label>
              <input type="date" id="txn-date" required value="${new Date().toISOString().split('T')[0]}">
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label>Type *</label>
              <select id="txn-type" required>
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Description *</label>
            <input type="text" id="txn-description" required placeholder="What was this transaction for?">
          </div>

          <div class="form-row">
            <div class="form-group" style="flex: 1;">
              <label>Amount *</label>
              <input type="number" id="txn-amount" required step="0.01" min="0" placeholder="0.00">
            </div>
            
            <div class="form-group" style="flex: 1;">
              <label>Category</label>
              <select id="txn-category">
                <option value="">Select category...</option>
                <option value="Office Supplies">Office Supplies</option>
                <option value="Utilities">Utilities</option>
                <option value="Meals & Entertainment">Meals & Entertainment</option>
                <option value="Travel">Travel</option>
                <option value="Vehicle">Vehicle</option>
                <option value="Professional Services">Professional Services</option>
                <option value="Marketing">Marketing</option>
                <option value="Software">Software</option>
                <option value="Rent">Rent</option>
                <option value="Payroll">Payroll</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Vendor</label>
            <input type="text" id="txn-vendor" list="vendor-suggestions" placeholder="Who did you pay?">
            <datalist id="vendor-suggestions">
              <!-- Will be populated dynamically -->
            </datalist>
          </div>

          <div class="form-group">
            <label>Account</label>
            <select id="txn-account">
              <option value="">Select account...</option>
              <!-- Will be populated dynamically -->
            </select>
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea id="txn-notes" rows="3" placeholder="Additional details..."></textarea>
          </div>

          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="txn-reconciled">
              <span>Mark as reconciled</span>
            </label>
          </div>

          <div class="form-actions">
            <button type="button" class="btn-secondary" onclick="closeAddTransactionModal()">
              Cancel
            </button>
            <button type="submit" class="btn-primary" id="save-transaction-btn">
              💾 Save Transaction
            </button>
          </div>
        </form>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    addTransactionModal = document.getElementById('add-transaction-modal');

    // Load vendors and accounts
    loadVendorsForSuggestions();
    loadAccountsForDropdown();
}

// Load vendors for autocomplete
async function loadVendorsForSuggestions() {
    try {
        const vendors = await window.storage.getVendors();
        const datalist = document.getElementById('vendor-suggestions');

        if (datalist) {
            datalist.innerHTML = vendors.map(v =>
                `<option value="${v.name}">`
            ).join('');
        }
    } catch (error) {
        console.error('Failed to load vendors:', error);
    }
}

// Load accounts for dropdown
async function loadAccountsForDropdown() {
    try {
        const accounts = await window.storage.getAccounts();
        const select = document.getElementById('txn-account');

        if (select) {
            select.innerHTML = '<option value="">Select account...</option>' +
                accounts.filter(a => a.isActive).map(a =>
                    `<option value="${a.id}">${a.accountNumber} - ${a.name}</option>`
                ).join('');
        }
    } catch (error) {
        console.error('Failed to load accounts:', error);
    }
}

// Handle form submission
async function handleAddTransaction(event) {
    event.preventDefault();

    const btn = document.getElementById('save-transaction-btn');
    btn.disabled = true;
    btn.textContent = 'Saving...';

    try {
        const transaction = {
            date: document.getElementById('txn-date').value,
            description: document.getElementById('txn-description').value,
            amount: parseFloat(document.getElementById('txn-amount').value),
            type: document.getElementById('txn-type').value,
            category: document.getElementById('txn-category').value || 'Uncategorized',
            vendorId: null, // Will link vendor if exists
            accountId: document.getElementById('txn-account').value || null,
            notes: document.getElementById('txn-notes').value,
            reconciled: document.getElementById('txn-reconciled').checked
        };

        // Create vendor if new
        const vendorName = document.getElementById('txn-vendor').value;
        if (vendorName) {
            const vendors = await window.storage.getVendors();
            let vendor = vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase());

            if (!vendor) {
                vendor = await window.storage.createVendor({
                    name: vendorName,
                    category: transaction.category
                });
            }

            transaction.vendorId = vendor.id;
        }

        await window.storage.createTransaction(transaction);

        // Success feedback
        btn.textContent = '✅ Saved!';
        setTimeout(() => {
            closeAddTransactionModal();

            // Refresh transactions page if we're on it
            if (window.location.hash.includes('/transactions')) {
                if (typeof initTransactionsPage === 'function') {
                    initTransactionsPage();
                }
            }
        }, 500);

    } catch (error) {
        console.error('Failed to add transaction:', error);
        alert('Failed to add transaction: ' + error.message);
        btn.disabled = false;
        btn.textContent = '💾 Save Transaction';
    }
}

// Reset form
function resetAddTransactionForm() {
    const form = document.getElementById('add-transaction-form');
    if (form) {
        form.reset();
        document.getElementById('txn-date').value = new Date().toISOString().split('T')[0];
    }
}

// Close modal
window.closeAddTransactionModal = function () {
    if (addTransactionModal) {
        addTransactionModal.style.display = 'none';
    }
};

console.log('➕ Add Transaction Modal loaded');
