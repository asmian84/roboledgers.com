/**
 * Transactions Page - Full AG Grid Integration
 * Comprehensive transaction management with inline editing, bulk actions, and CSV import
 */

window.renderTransactions = function () {
  return `
    <div class="transactions-page">

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="btn-primary" onclick="importCSV()">
            📥 Import CSV
          </button>
          <button class="btn-primary" onclick="showAddTransactionForm()">
            ➕ Add Transaction
          </button>
          <div class="dropdown">
            <button class="btn-secondary dropdown-toggle" id="bulk-actions-btn" disabled>
              📋 Bulk Actions
            </button>
            <div class="dropdown-menu" id="bulk-actions-menu">
              <a href="#" onclick="bulkDelete(); return false;">🗑️ Delete Selected</a>
              <a href="#" onclick="bulkCategorize(); return false;">🏷️ Categorize</a>
              <a href="#" onclick="bulkExport(); return false;">📤 Export Selected</a>
            </div>
          </div>
          <span id="selection-count" class="selection-count"></span>
        </div>
        
        <div class="toolbar-right">
          <input 
            type="search" 
            id="search-input" 
            class="search-input" 
            placeholder="Search transactions..." 
            oninput="filterTransactions()"
          >
          <select id="date-range" class="filter-select" onchange="filterByDateRange()">
            <option value="this-month">This Month</option>
            <option value="last-30">Last 30 Days</option>
            <option value="last-90">Last 90 Days</option>
            <option value="this-year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button class="btn-secondary" onclick="toggleFilters()">
            🔍 Filters
          </button>
        </div>
      </div>

      <!-- Main Content Area with Grid and Filters -->
      <div class="content-area">
        <!-- AG Grid Container -->
        <div id="ag-grid-container" class="ag-theme-alpine grid-container"></div>
        
        <!-- Filters Panel (Collapsible) -->
        <div id="filters-panel" class="filters-panel" style="display: none;">
          <div class="filters-header">
            <h3>Filters</h3>
            <button class="btn-text" onclick="toggleFilters()">✕</button>
          </div>
          
          <div class="filter-group">
            <label>Vendor</label>
            <div id="vendor-filter-list" class="checkbox-list"></div>
          </div>
          
          <div class="filter-group">
            <label>Account</label>
            <select id="account-filter" class="filter-select">
              <option value="">All Accounts</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Category</label>
            <input type="text" id="category-filter" class="filter-input" placeholder="Enter category">
          </div>
          
          <div class="filter-group">
            <label>Amount Range</label>
            <div class="range-inputs">
              <input type="number" id="amount-min" class="filter-input" placeholder="Min" step="0.01">
              <span>to</span>
              <input type="number" id="amount-max" class="filter-input" placeholder="Max" step="0.01">
            </div>
          </div>
          
          <div class="filter-group">
            <label>Type</label>
            <select id="type-filter" class="filter-select">
              <option value="">All Types</option>
              <option value="credit">Income (Credit)</option>
              <option value="debit">Expense (Debit)</option>
            </select>
          </div>
          
          <div class="filter-group">
            <label>Reconciled Status</label>
            <select id="reconciled-filter" class="filter-select">
              <option value="">All</option>
              <option value="true">Reconciled</option>
              <option value="false">Unreconciled</option>
            </select>
          </div>
          
          <div class="filter-actions">
            <button class="btn-primary" onclick="applyFilters()">Apply Filters</button>
            <button class="btn-secondary" onclick="clearFilters()">Clear All</button>
          </div>
        </div>
      </div>

      <!-- Add Transaction Modal -->
      <div id="add-transaction-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Add Transaction</h2>
            <button class="btn-text" onclick="hideAddTransactionForm()">✕</button>
          </div>
          
          <form id="add-transaction-form" onsubmit="saveNewTransaction(event)">
            <div class="form-row">
              <div class="form-group">
                <label>Date *</label>
                <input type="date" id="new-txn-date" required>
              </div>
              
              <div class="form-group">
                <label>Type *</label>
                <select id="new-txn-type" required>
                  <option value="debit">Expense (Debit)</option>
                  <option value="credit">Income (Credit)</option>
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label>Description *</label>
              <input type="text" id="new-txn-description" required placeholder="Enter description">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Amount *</label>
                <input type="number" id="new-txn-amount" required step="0.01" min="0.01" placeholder="0.00">
              </div>
              
              <div class="form-group">
                <label>Vendor</label>
                <input type="text" id="new-txn-vendor" list="vendor-list" placeholder="Select or type...">
                <datalist id="vendor-list"></datalist>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Account *</label>
                <select id="new-txn-account" required>
                  <option value="">Select account...</option>
                </select>
              </div>
              
              <div class="form-group">
                <label>Category</label>
                <input type="text" id="new-txn-category" placeholder="Optional">
              </div>
            </div>
            
            <div class="form-group">
              <label>Notes</label>
              <textarea id="new-txn-notes" rows="2" placeholder="Optional notes"></textarea>
            </div>
            
            <div class="form-actions">
              <button type="submit" class="btn-primary">💾 Save Transaction</button>
              <button type="button" class="btn-secondary" onclick="hideAddTransactionForm()">Cancel</button>
            </div>
          </form>
        </div>
      </div>

      <!-- CSV Import Modal -->
      <div id="csv-import-modal" class="modal" style="display: none;">
        <div class="modal-content">
          <div class="modal-header">
            <h2>Import CSV</h2>
            <button class="btn-text" onclick="hideCSVImport()">✕</button>
          </div>
          
          <div class="import-step" id="import-step-1">
            <p>Select a CSV file to import transactions:</p>
            <input type="file" id="csv-file-input" accept=".csv" onchange="previewCSV(event)">
          </div>
          
          <div class="import-step" id="import-step-2" style="display: none;">
            <p>Preview (first 10 rows):</p>
            <div id="csv-preview" class="csv-preview"></div>
            <button class="btn-primary" onclick="confirmImport()">Import Transactions</button>
            <button class="btn-secondary" onclick="cancelImport()">Cancel</button>
          </div>
        </div>
      </div>
    </div>
    
    <script>
      // Initialize on page load
      if (typeof initTransactionsPage === 'function') {
        setTimeout(initTransactionsPage, 100);
      }
    </script>
  `;
};

// ==================================================
// TRANSACTIONS PAGE LOGIC
// ==================================================

let transactionsGrid = null;
let allTransactions = [];
let filteredTransactions = [];
let selectedRows = [];
let vendors = [];
let accounts = [];

async function initTransactionsPage() {
  console.log('🚀 Initializing Transactions Page...');

  try {
    // Load data
    allTransactions = await window.storage.getTransactions();
    vendors = await window.storage.getVendors();
    accounts = await window.storage.getAccounts();

    console.log(`Loaded ${allTransactions.length} transactions`);

    // Initialize grid
    initializeGrid();

    // Populate filters
    populateFilters();

    // Calculate and display stats
    updateStats();

    // Set default date
    document.getElementById('new-txn-date').valueAsDate = new Date();

  } catch (error) {
    console.error('Failed to initialize transactions page:', error);
  }
}

function initializeGrid() {
  const gridDiv = document.getElementById('ag-grid-container');
  if (!gridDiv) return;

  const columnDefs = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left'
    },
    {
      headerName: 'Date',
      field: 'date',
      width: 120,
      editable: true,
      valueFormatter: params => {
        if (!params.value) return '';
        return new Date(params.value).toLocaleDateString();
      }
    },
    {
      headerName: 'Description',
      field: 'description',
      width: 250,
      editable: true
    },
    {
      headerName: 'Vendor',
      field: 'vendorId',
      width: 150,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: vendors.map(v => v.id)
      },
      valueFormatter: params => {
        if (!params.value) return '';
        const vendor = vendors.find(v => v.id === params.value);
        return vendor ? vendor.name : '';
      }
    },
    {
      headerName: 'Account',
      field: 'accountId',
      width: 200,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: accounts.map(a => a.id)
      },
      valueFormatter: params => {
        if (!params.value) return '';
        const account = accounts.find(a => a.id === params.value);
        return account ? account.name : '';
      }
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 150,
      editable: true
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 120,
      editable: true,
      type: 'numericColumn',
      cellStyle: params => ({
        color: params.data.type === 'credit' ? '#10b981' : '#ef4444',
        fontWeight: 'bold'
      }),
      valueFormatter: params => {
        if (!params.value) return '$0.00';
        return window.DataUtils.formatCurrency(params.value);
      }
    },
    {
      headerName: 'Type',
      field: 'type',
      width: 100,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: ['debit', 'credit']
      },
      valueFormatter: params => {
        return params.value === 'credit' ? 'Income' : 'Expense';
      }
    },
    {
      headerName: 'Reconciled',
      field: 'reconciled',
      width: 120,
      editable: true,
      cellRenderer: params => {
        return params.value ? '✅' : '';
      }
    },
    {
      headerName: 'Actions',
      width: 100,
      pinned: 'right',
      cellRenderer: params => {
        return `
          <button class="icon-btn" onclick="editTransaction('${params.data.id}')" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteTransaction('${params.data.id}')" title="Delete">🗑️</button>
        `;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: allTransactions,
    rowSelection: 'multiple',
    animateRows: true,
    pagination: true,
    paginationPageSize: 50,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    onCellValueChanged: async (event) => {
      console.log('Cell edited:', event.data);
      try {
        await window.storage.updateTransaction(event.data.id, event.data);
        updateStats();
        console.log('✅ Transaction updated');
      } catch (error) {
        console.error('Failed to update transaction:', error);
        alert('Failed to save changes');
      }
    },
    onRowSelected: (event) => {
      const selectedNodes = transactionsGrid.getSelectedRows();
      selectedRows = selectedNodes;
      updateBulkActionsToolbar();
    }
  };

  transactionsGrid = agGrid.createGrid(gridDiv, gridOptions);
  console.log('✅ Grid initialized');
}

function updateStats() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const thisMonthTxns = allTransactions.filter(t => new Date(t.date) >= firstOfMonth);

  const income = thisMonthTxns
    .filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const expenses = thisMonthTxns
    .filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const net = income - expenses;

  document.getElementById('stat-income').textContent = window.DataUtils.formatCurrency(income);
  document.getElementById('stat-expenses').textContent = window.DataUtils.formatCurrency(expenses);
  document.getElementById('stat-net').textContent = window.DataUtils.formatCurrency(net);
  document.getElementById('stat-net').style.color = net >= 0 ? '#10b981' : '#ef4444';
  document.getElementById('stat-count').textContent = thisMonthTxns.length;
}

function populateFilters() {
  // Populate vendor datalist
  const vendorList = document.getElementById('vendor-list');
  vendors.forEach(v => {
    const option = document.createElement('option');
    option.value = v.name;
    vendorList.appendChild(option);
  });

  // Populate account dropdown in form
  const accountSelect = document.getElementById('new-txn-account');
  accounts.forEach(a => {
    const option = document.createElement('option');
    option.value = a.id;
    option.textContent = a.name;
    accountSelect.appendChild(option);
  });

  // Populate account filter
  const accountFilter = document.getElementById('account-filter');
  accounts.forEach(a => {
    const option = document.createElement('option');
    option.value = a.id;
    option.textContent = a.name;
    accountFilter.appendChild(option);
  });
}

function updateBulkActionsToolbar() {
  const btn = document.getElementById('bulk-actions-btn');
  const count = document.getElementById('selection-count');

  if (selectedRows.length > 0) {
    btn.disabled = false;
    count.textContent = `${selectedRows.length} selected`;
    count.style.display = 'inline';
  } else {
    btn.disabled = true;
    count.style.display = 'none';
  }
}

// ==================================================
// ACTIONS
// ==================================================

function showAddTransactionForm() {
  document.getElementById('add-transaction-modal').style.display = 'flex';
}

function hideAddTransactionForm() {
  document.getElementById('add-transaction-modal').style.display = 'none';
  document.getElementById('add-transaction-form').reset();
}

async function saveNewTransaction(event) {
  event.preventDefault();

  try {
    // Get vendor ID or null
    const vendorName = document.getElementById('new-txn-vendor').value;
    let vendorId = null;

    if (vendorName) {
      const vendor = vendors.find(v => v.name === vendorName);
      vendorId = vendor ? vendor.id : null;

      // Create new vendor if not found
      if (!vendorId) {
        const newVendor = await window.storage.createVendor({ name: vendorName });
        vendorId = newVendor.id;
        vendors.push(newVendor);
      }
    }

    const txn = await window.storage.createTransaction({
      date: document.getElementById('new-txn-date').value,
      description: document.getElementById('new-txn-description').value,
      amount: parseFloat(document.getElementById('new-txn-amount').value),
      type: document.getElementById('new-txn-type').value,
      vendorId: vendorId,
      accountId: document.getElementById('new-txn-account').value,
      category: document.getElementById('new-txn-category').value || '',
      notes: document.getElementById('new-txn-notes').value || ''
    });

    allTransactions.push(txn);
    transactionsGrid.setGridOption('rowData', allTransactions);
    updateStats();
    hideAddTransactionForm();

    console.log('✅ Transaction created');
  } catch (error) {
    console.error('Failed to create transaction:', error);
    alert('Failed to create transaction: ' + error.message);
  }
}

async function deleteTransaction(id) {
  if (!confirm('Delete this transaction?')) return;

  try {
    await window.storage.deleteTransaction(id);
    allTransactions = allTransactions.filter(t => t.id !== id);
    transactionsGrid.setGridOption('rowData', allTransactions);
    updateStats();
    console.log('✅ Transaction deleted');
  } catch (error) {
    console.error('Failed to delete transaction:', error);
    alert('Failed to delete transaction');
  }
}

function editTransaction(id) {
  // Focus the row in grid for editing
  transactionsGrid.forEachNode(node => {
    if (node.data.id === id) {
      transactionsGrid.ensureIndexVisible(node.rowIndex);
      transactionsGrid.setFocusedCell(node.rowIndex, 'description');
      transactionsGrid.startEditingCell({
        rowIndex: node.rowIndex,
        colKey: 'description'
      });
    }
  });
}

async function bulkDelete() {
  if (selectedRows.length === 0) return;

  if (!confirm(`Delete ${selectedRows.length} transactions?`)) return;

  try {
    for (const txn of selectedRows) {
      await window.storage.deleteTransaction(txn.id);
    }

    allTransactions = allTransactions.filter(t => !selectedRows.find(s => s.id === t.id));
    transactionsGrid.setGridOption('rowData', allTransactions);
    transactionsGrid.deselectAll();
    updateStats();

    console.log(`✅ Deleted ${selectedRows.length} transactions`);
  } catch (error) {
    console.error('Bulk delete failed:', error);
    alert('Failed to delete transactions');
  }
}

function bulkCategorize() {
  const category = prompt('Enter category for selected transactions:');
  if (!category) return;

  selectedRows.forEach(async txn => {
    await window.storage.updateTransaction(txn.id, { category });
  });

  // Refresh grid
  initTransactionsPage();
}

function bulkExport() {
  const csv = window.DataUtils.exportToCSV(selectedRows);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions_export.csv';
  a.click();
}

// ==================================================
// FILTERS
// ==================================================

function toggleFilters() {
  const panel = document.getElementById('filters-panel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function filterTransactions() {
  const searchTerm = document.getElementById('search-input').value.toLowerCase();

  const filtered = allTransactions.filter(t => {
    return t.description.toLowerCase().includes(searchTerm) ||
      (t.category && t.category.toLowerCase().includes(searchTerm));
  });

  transactionsGrid.setGridOption('rowData', filtered);
}

function filterByDateRange() {
  const range = document.getElementById('date-range').value;
  const now = new Date();
  let start;

  switch (range) {
    case 'this-month':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last-30':
      start = new Date();
      start.setDate(start.getDate() - 30);
      break;
    case 'last-90':
      start = new Date();
      start.setDate(start.getDate() - 90);
      break;
    case 'this-year':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(0); // All time
  }

  const filtered = allTransactions.filter(t => new Date(t.date) >= start);
  transactionsGrid.setGridOption('rowData', filtered);
  updateStats();
}

function applyFilters() {
  let filtered = [...allTransactions];

  // Apply all filter criteria
  const accountId = document.getElementById('account-filter').value;
  const category = document.getElementById('category-filter').value;
  const minAmount = parseFloat(document.getElementById('amount-min').value);
  const maxAmount = parseFloat(document.getElementById('amount-max').value);
  const type = document.getElementById('type-filter').value;
  const reconciled = document.getElementById('reconciled-filter').value;

  if (accountId) {
    filtered = filtered.filter(t => t.accountId === accountId);
  }

  if (category) {
    filtered = filtered.filter(t => t.category && t.category.toLowerCase().includes(category.toLowerCase()));
  }

  if (minAmount) {
    filtered = filtered.filter(t => t.amount >= minAmount);
  }

  if (maxAmount) {
    filtered = filtered.filter(t => t.amount <= maxAmount);
  }

  if (type) {
    filtered = filtered.filter(t => t.type === type);
  }

  if (reconciled) {
    filtered = filtered.filter(t => t.reconciled === (reconciled === 'true'));
  }

  transactionsGrid.setGridOption('rowData', filtered);
}

function clearFilters() {
  document.getElementById('account-filter').value = '';
  document.getElementById('category-filter').value = '';
  document.getElementById('amount-min').value = '';
  document.getElementById('amount-max').value = '';
  document.getElementById('type-filter').value = '';
  document.getElementById('reconciled-filter').value = '';

  transactionsGrid.setGridOption('rowData', allTransactions);
}

// ==================================================
// CSV IMPORT
// ==================================================

function importCSV() {
  document.getElementById('csv-import-modal').style.display = 'flex';
}

function hideCSVImport() {
  document.getElementById('csv-import-modal').style.display = 'none';
  document.getElementById('import-step-1').style.display = 'block';
  document.getElementById('import-step-2').style.display = 'none';
}

function previewCSV(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const csv = e.target.result;
    const rows = window.DataUtils.parseCSV(csv).slice(0, 10);

    // Show preview
    document.getElementById('import-step-1').style.display = 'none';
    document.getElementById('import-step-2').style.display = 'block';

    const preview = document.getElementById('csv-preview');
    preview.innerHTML = `<p>Preview of ${rows.length} rows:</p>
      <pre>${JSON.stringify(rows, null, 2)}</pre>`;
  };
  reader.readAsText(file);
}

async function confirmImport() {
  // TODO: Implement actual CSV import with column mapping
  alert('CSV import feature coming soon!');
  hideCSVImport();
}

function cancelImport() {
  hideCSVImport();
}
