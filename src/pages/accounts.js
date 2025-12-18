/**
 * Chart of Accounts Page - Hierarchical Tree View
 */

window.renderAccounts = function () {
  return `
    <div class="accounts-page">
      <!-- Toolbar -->
      <div class="accounts-toolbar">
        <div class="toolbar-left">
          <h1 class="page-title">💰 Chart of Accounts</h1>
          <button class="btn-primary" onclick="addNewAccount()">
            ➕ Add Account
          </button>
        </div>
        
        <div class="toolbar-right">
          <input 
            type="search" 
            id="account-search" 
            class="search-input" 
            placeholder="Search accounts..." 
            oninput="filterAccountTree()"
          >
          <select id="account-type-filter" class="filter-select" onchange="filterAccountTree()">
            <option value="">All Types</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expenses</option>
          </select>
          <button class="btn-secondary" onclick="importCOA()">📥 Import</button>
          <button class="btn-secondary" onclick="exportCOA()">📤 Export</button>
        </div>
      </div>

      <!-- Two-Panel Layout -->
      <div class="accounts-layout">
        <!-- Left Panel: Account Tree -->
        <div class="account-tree-panel">
          <div id="account-tree" class="account-tree"></div>
        </div>

        <!-- Right Panel: Account Detail -->
        <div class="account-detail-panel">
          <div id="account-detail" class="account-detail-empty">
            <div class="empty-state">
              <div class="empty-icon">📊</div>
              <p>Select an account to view details</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initAccountsPage === 'function') {
        setTimeout(initAccountsPage, 100);
      }
    </script>
  `;
};

// ==================================================
// ACCOUNTS PAGE LOGIC
// ==================================================

let allAccounts = [];
let accountHierarchy = [];
let selectedAccountId = null;
let expandedNodeIds = new Set();

async function initAccountsPage() {
  console.log('🚀 Initializing Chart of Accounts Page...');

  try {
    // Load accounts
    allAccounts = await window.storage.getAccounts();
    accountHierarchy = await window.storage.getAccountHierarchy();

    console.log(`Loaded ${allAccounts.length} accounts`);

    // Expand top-level nodes by default
    accountHierarchy.forEach(node => expandedNodeIds.add(node.id));

    // Render tree
    renderAccountTree();

  } catch (error) {
    console.error('Failed to initialize accounts page:', error);
  }
}

// ==================================================
// TREE RENDERING
// ==================================================

function renderAccountTree() {
  const treeEl = document.getElementById('account-tree');
  if (!treeEl) return;

  // Apply filters
  const searchTerm = document.getElementById('account-search')?.value.toLowerCase() || '';
  const typeFilter = document.getElementById('account-type-filter')?.value || '';

  let filteredAccounts = allAccounts;

  if (searchTerm) {
    filteredAccounts = filteredAccounts.filter(a =>
      a.name.toLowerCase().includes(searchTerm) ||
      a.accountNumber.includes(searchTerm)
    );
  }

  if (typeFilter) {
    filteredAccounts = filteredAccounts.filter(a => a.type === typeFilter);
  }

  // Rebuild hierarchy with filtered accounts
  const hierarchy = buildHierarchy(filteredAccounts);

  // Render tree HTML
  treeEl.innerHTML = renderTreeNodes(hierarchy, 0);
}

function buildHierarchy(accounts, parentId = null) {
  return accounts
    .filter(a => a.parentId === parentId)
    .map(account => ({
      ...account,
      children: buildHierarchy(accounts, account.id)
    }));
}

function renderTreeNodes(nodes, level) {
  return nodes.map(node => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedNodeIds.has(node.id);
    const isSelected = node.id === selectedAccountId;

    const icon = getAccountTypeIcon(node.type);
    const expandIcon = hasChildren ? (isExpanded ? '▼' : '▶') : '·';

    return `
      <div class="tree-node" data-level="${level}">
        <div 
          class="node-content ${isSelected ? 'selected' : ''}" 
          data-id="${node.id}"
          onclick="selectAccount('${node.id}')"
        >
          <span class="expand-icon" onclick="toggleNode(event, '${node.id}')">${expandIcon}</span>
          <span class="account-icon">${icon}</span>
          <span class="account-number">${node.accountNumber}</span>
          <span class="account-name">${node.name}</span>
          <span class="account-balance">${window.DataUtils.formatCurrency(node.currentBalance || 0)}</span>
        </div>
        ${hasChildren && isExpanded ? `
          <div class="node-children">
            ${renderTreeNodes(node.children, level + 1)}
          </div>
        ` : ''}
      </div>
    `;
  }).join('');
}

function getAccountTypeIcon(type) {
  const icons = {
    'Asset': '💰',
    'Liability': '💳',
    'Equity': '📊',
    'Revenue': '💵',
    'Expense': '💸'
  };
  return icons[type] || '📁';
}

function toggleNode(event, nodeId) {
  event.stopPropagation();

  if (expandedNodeIds.has(nodeId)) {
    expandedNodeIds.delete(nodeId);
  } else {
    expandedNodeIds.add(nodeId);
  }

  renderAccountTree();
}

function filterAccountTree() {
  renderAccountTree();
}

// ==================================================
// ACCOUNT SELECTION & DETAIL
// ==================================================

async function selectAccount(accountId) {
  selectedAccountId = accountId;
  renderAccountTree(); // Re-render to show selection

  const account = allAccounts.find(a => a.id === accountId);
  if (!account) return;

  // Get account transactions
  const transactions = await window.storage.getTransactions({ accountId });

  // Render detail panel
  const detailEl = document.getElementById('account-detail');
  detailEl.innerHTML = `
    <div class="account-detail-content">
      <div class="account-header">
        <div class="account-header-top">
          <h2>${account.accountNumber} - ${account.name}</h2>
          <div class="account-actions">
            <button class="btn-secondary" onclick="editAccount('${account.id}')">✏️ Edit</button>
            <button class="btn-danger" onclick="deleteAccount('${account.id}')">🗑️ Delete</button>
          </div>
        </div>
        
        <div class="account-badges">
          <span class="badge badge-${account.type.toLowerCase()}">${account.type}</span>
          ${account.isActive ? '<span class="badge badge-success">Active</span>' : '<span class="badge badge-inactive">Inactive</span>'}
        </div>
        
        <div class="account-stats">
          <div class="stat">
            <span class="stat-label">Current Balance</span>
            <span class="stat-value">${window.DataUtils.formatCurrency(account.currentBalance || 0)}</span>
          </div>
          <div class="stat">
            <span class="stat-label">Transactions</span>
            <span class="stat-value">${transactions.length}</span>
          </div>
        </div>
      </div>
      
      <div class="account-transactions">
        <h3>Recent Transactions</h3>
        ${transactions.length > 0 ? `
          <div class="transaction-list">
            ${transactions.slice(0, 10).map(t => `
              <div class="transaction-item">
                <div class="transaction-date">${new Date(t.date).toLocaleDateString()}</div>
                <div class="transaction-desc">${t.description}</div>
                <div class="transaction-amount ${t.type === 'credit' ? 'credit' : 'debit'}">
                  ${window.DataUtils.formatCurrency(t.amount)}
                </div>
              </div>
            `).join('')}
          </div>
          ${transactions.length > 10 ? `
            <a href="#/transactions?accountId=${account.id}" class="view-all-link">
              View all ${transactions.length} transactions →
            </a>
          ` : ''}
        ` : '<p class="empty-message">No transactions yet</p>'}
      </div>
    </div>
  `;
}

// ==================================================
// ACCOUNT ACTIONS
// ==================================================

function addNewAccount() {
  const detailEl = document.getElementById('account-detail');
  detailEl.innerHTML = `
    <div class="account-form-container">
      <h2>Add New Account</h2>
      
      <form id="new-account-form" onsubmit="saveNewAccount(event)">
        <div class="form-group">
          <label>Account Number *</label>
          <input type="text" id="account-number" required placeholder="e.g. 1000">
        </div>
        
        <div class="form-group">
          <label>Account Name *</label>
          <input type="text" id="account-name" required placeholder="e.g. Cash">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Type *</label>
            <select id="account-type" required>
              <option value="">Select type...</option>
              <option value="Asset">Asset</option>
              <option value="Liability">Liability</option>
              <option value="Equity">Equity</option>
              <option value="Revenue">Revenue</option>
              <option value="Expense">Expense</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Parent Account</label>
            <select id="parent-account">
              <option value="">None (Top Level)</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="account-description" rows="3" placeholder="Optional description"></textarea>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn-primary">💾 Save Account</button>
          <button type="button" class="btn-secondary" onclick="cancelAccountForm()">Cancel</button>
        </div>
      </form>
    </div>
  `;

  // Populate parent account dropdown
  const parentSelect = document.getElementById('parent-account');
  allAccounts.forEach(a => {
    const option = document.createElement('option');
    option.value = a.id;
    option.textContent = `${a.accountNumber} - ${a.name}`;
    parentSelect.appendChild(option);
  });
}

async function saveNewAccount(event) {
  event.preventDefault();

  try {
    const accountData = {
      accountNumber: document.getElementById('account-number').value,
      name: document.getElementById('account-name').value,
      type: document.getElementById('account-type').value,
      parentId: document.getElementById('parent-account').value || null,
      description: document.getElementById('account-description').value || '',
      isActive: true,
      currentBalance: 0
    };

    const newAccount = await window.storage.createAccount(accountData);

    console.log('✅ Account created:', newAccount);

    // Reload and refresh
    await initAccountsPage();
    selectAccount(newAccount.id);

  } catch (error) {
    console.error('Failed to create account:', error);
    alert('Failed to create account: ' + error.message);
  }
}

function editAccount(accountId) {
  const account = allAccounts.find(a => a.id === accountId);
  if (!account) return;

  const detailEl = document.getElementById('account-detail');
  detailEl.innerHTML = `
    <div class="account-form-container">
      <h2>Edit Account</h2>
      
      <form id="edit-account-form" onsubmit="saveAccountEdits(event, '${accountId}')">
        <div class="form-group">
          <label>Account Number *</label>
          <input type="text" id="edit-account-number" required value="${account.accountNumber}">
        </div>
        
        <div class="form-group">
          <label>Account Name *</label>
          <input type="text" id="edit-account-name" required value="${account.name}">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label>Type *</label>
            <select id="edit-account-type" required>
              <option value="Asset" ${account.type === 'Asset' ? 'selected' : ''}>Asset</option>
              <option value="Liability" ${account.type === 'Liability' ? 'selected' : ''}>Liability</option>
              <option value="Equity" ${account.type === 'Equity' ? 'selected' : ''}>Equity</option>
              <option value="Revenue" ${account.type === 'Revenue' ? 'selected' : ''}>Revenue</option>
              <option value="Expense" ${account.type === 'Expense' ? 'selected' : ''}>Expense</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Status</label>
            <select id="edit-account-status">
              <option value="true" ${account.isActive ? 'selected' : ''}>Active</option>
              <option value="false" ${!account.isActive ? 'selected' : ''}>Inactive</option>
            </select>
          </div>
        </div>
        
        <div class="form-group">
          <label>Description</label>
          <textarea id="edit-account-description" rows="3">${account.description || ''}</textarea>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn-primary">💾 Save Changes</button>
          <button type="button" class="btn-secondary" onclick="selectAccount('${accountId}')">Cancel</button>
        </div>
      </form>
    </div>
  `;
}

async function saveAccountEdits(event, accountId) {
  event.preventDefault();

  try {
    const updates = {
      accountNumber: document.getElementById('edit-account-number').value,
      name: document.getElementById('edit-account-name').value,
      type: document.getElementById('edit-account-type').value,
      isActive: document.getElementById('edit-account-status').value === 'true',
      description: document.getElementById('edit-account-description').value
    };

    await window.storage.updateAccount(accountId, updates);

    console.log('✅ Account updated');

    // Reload and refresh
    await initAccountsPage();
    selectAccount(accountId);

  } catch (error) {
    console.error('Failed to update account:', error);
    alert('Failed to update account');
  }
}

async function deleteAccount(accountId) {
  const account = allAccounts.find(a => a.id === accountId);
  if (!account) return;

  if (!confirm(`Delete account "${account.name}"?\n\nWarning: This cannot be undone.`)) {
    return;
  }

  try {
    await window.storage.deleteAccount(accountId);

    console.log('✅ Account deleted');

    selectedAccountId = null;
    await initAccountsPage();

    document.getElementById('account-detail').innerHTML = `
      <div class="account-detail-empty">
        <div class="empty-state">
          <div class="empty-icon">📊</div>
          <p>Select an account to view details</p>
        </div>
      </div>
    `;

  } catch (error) {
    console.error('Failed to delete account:', error);
    alert('Failed to delete account');
  }
}

function cancelAccountForm() {
  selectedAccountId = null;
  document.getElementById('account-detail').innerHTML = `
    <div class="account-detail-empty">
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <p>Select an account to view details</p>
      </div>
    </div>
  `;
}

// ==================================================
// IMPORT/EXPORT
// ==================================================

function importCOA() {
  alert('Import COA feature coming soon!');
}

function exportCOA() {
  const json = JSON.stringify(allAccounts, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'chart_of_accounts.json';
  a.click();
  console.log('✅ Chart of Accounts exported');
}
