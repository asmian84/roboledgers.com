/**
 * Chart of Accounts - Simple Table Format
 * Account #, Account Description, Delete
 */

window.renderAccounts = function () {
  return `
    <div class="accounts-page">
      <!-- Page Header -->
      <div class="page-header">
        <h1>💰 Chart of Accounts</h1>
        <button class="btn-primary" onclick="addNewAccount()">
          ➕ Add Account
        </button>
      </div>

      <!-- Accounts Grid -->
      <div id="accounts-grid" class="ag-theme-alpine grid-container"></div>
    </div>
    
    <script>
      if (typeof initAccountsPage === 'function') {
        setTimeout(initAccountsPage, 100);
      }
    </script>
  `;
};

// ==================================================
// CHART OF ACCOUNTS DATA
// ==================================================

const DEFAULT_CHART_OF_ACCOUNTS = [
  { accountNumber: '1000', description: 'ASSETS' },
  { accountNumber: '1100', description: 'Current Assets' },
  { accountNumber: '1110', description: 'Cash - Checking' },
  { accountNumber: '1120', description: 'Cash - Savings' },
  { accountNumber: '1130', description: 'Petty Cash' },
  { accountNumber: '1200', description: 'Accounts Receivable' },
  { accountNumber: '1300', description: 'Inventory' },
  { accountNumber: '1400', description: 'Prepaid Expenses' },
  { accountNumber: '1500', description: 'Fixed Assets' },
  { accountNumber: '1510', description: 'Equipment' },
  { accountNumber: '1520', description: 'Accumulated Depreciation - Equipment' },
  { accountNumber: '1530', description: 'Furniture & Fixtures' },
  { accountNumber: '1540', description: 'Vehicles' },
  { accountNumber: '2000', description: 'LIABILITIES' },
  { accountNumber: '2100', description: 'Current Liabilities' },
  { accountNumber: '2110', description: 'Accounts Payable' },
  { accountNumber: '2120', description: 'Credit Card - Business' },
  { accountNumber: '2130', description: 'Sales Tax Payable' },
  { accountNumber: '2140', description: 'Payroll Liabilities' },
  { accountNumber: '2200', description: 'Long-term Liabilities' },
  { accountNumber: '2210', description: 'Bank Loan' },
  { accountNumber: '2220', description: 'Equipment Loan' },
  { accountNumber: '3000', description: 'EQUITY' },
  { accountNumber: '3100', description: 'Owner Capital' },
  { accountNumber: '3200', description: 'Retained Earnings' },
  { accountNumber: '3300', description: 'Owner Draws' },
  { accountNumber: '4000', description: 'REVENUE' },
  { accountNumber: '4100', description: 'Sales Revenue' },
  { accountNumber: '4200', description: 'Service Revenue' },
  { accountNumber: '4300', description: 'Interest Income' },
  { accountNumber: '4400', description: 'Other Income' },
  { accountNumber: '5000', description: 'EXPENSES' },
  { accountNumber: '5100', description: 'Operating Expenses' },
  { accountNumber: '5110', description: 'Rent Expense' },
  { accountNumber: '5120', description: 'Utilities' },
  { accountNumber: '5130', description: 'Telephone & Internet' },
  { accountNumber: '5140', description: 'Office Supplies' },
  { accountNumber: '5150', description: 'Insurance' },
  { accountNumber: '5200', description: 'Payroll Expenses' },
  { accountNumber: '5210', description: 'Salaries & Wages' },
  { accountNumber: '5220', description: 'Payroll Taxes' },
  { accountNumber: '5230', description: 'Employee Benefits' },
  { accountNumber: '5300', description: 'Marketing & Advertising' },
  { accountNumber: '5400', description: 'Professional Fees' },
  { accountNumber: '5500', description: 'Depreciation Expense' },
  { accountNumber: '5600', description: 'Bank Fees & Charges' },
  { accountNumber: '5700', description: 'Meals & Entertainment' },
  { accountNumber: '5800', description: 'Travel Expenses' },
  { accountNumber: '5900', description: 'Miscellaneous Expenses' }
];

// ==================================================
// ACCOUNTS PAGE LOGIC
// ==================================================

let accountsGrid = null;
let allAccounts = [];

async function initAccountsPage() {
  console.log('🚀 Initializing Chart of Accounts...');

  // Load accounts from storage or use defaults
  allAccounts = await loadAccounts();

  // Initialize AG Grid
  initializeAccountsGrid();
}

async function loadAccounts() {
  try {
    const stored = await window.storage.getAccounts();
    if (stored && stored.length > 0) {
      return stored.map(a => ({
        accountNumber: a.accountNumber || a.id,
        description: a.name || a.description
      }));
    }
  } catch (error) {
    console.log('Using default COA');
  }

  return [...DEFAULT_CHART_OF_ACCOUNTS];
}

function initializeAccountsGrid() {
  const gridDiv = document.getElementById('accounts-grid');
  if (!gridDiv) return;

  const columnDefs = [
    {
      headerName: 'Account #',
      field: 'accountNumber',
      width: 140,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Account Description',
      field: 'description',
      flex: 1,
      sortable: true,
      filter: true
    },
    {
      headerName: 'Delete',
      width: 100,
      cellRenderer: params => {
        return `<button class="btn-delete" onclick="deleteAccount('${params.data.accountNumber}')">🗑️</button>`;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: allAccounts,
    pagination: true,
    paginationPageSize: 50,
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true
    }
  };

  accountsGrid = agGrid.createGrid(gridDiv, gridOptions);
  console.log(`✅ Loaded ${allAccounts.length} accounts`);
}

// ==================================================
// ACCOUNT ACTIONS
// ==================================================

function addNewAccount() {
  const accountNumber = prompt('Enter Account Number:');
  if (!accountNumber) return;

  const description = prompt('Enter Account Description:');
  if (!description) return;

  // Add to array
  allAccounts.push({ accountNumber, description });

  // Refresh grid
  accountsGrid.setGridOption('rowData', allAccounts);

  // Save to storage
  saveAccounts();

  console.log('✅ Account added');
}

async function deleteAccount(accountNumber) {
  if (!confirm(`Delete account ${accountNumber}?`)) return;

  // Remove from array
  allAccounts = allAccounts.filter(a => a.accountNumber !== accountNumber);

  // Refresh grid
  accountsGrid.setGridOption('rowData', allAccounts);

  // Save to storage
  saveAccounts();

  console.log('✅ Account deleted');
}

async function saveAccounts() {
  try {
    // Convert to storage format and save
    const toSave = allAccounts.map(a => ({
      id: a.accountNumber,
      accountNumber: a.accountNumber,
      name: a.description,
      type: getAccountType(a.accountNumber),
      isActive: true,
      currentBalance: 0
    }));

    localStorage.setItem('ab3_accounts', JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save accounts:', error);
  }
}

function getAccountType(accountNumber) {
  const num = parseInt(accountNumber);
  if (num >= 1000 && num < 2000) return 'Asset';
  if (num >= 2000 && num < 3000) return 'Liability';
  if (num >= 3000 && num < 4000) return 'Equity';
  if (num >= 4000 && num < 5000) return 'Revenue';
  if (num >= 5000) return 'Expense';
  return 'Other';
}

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
