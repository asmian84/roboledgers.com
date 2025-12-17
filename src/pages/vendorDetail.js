/**
 * Vendor Detail Page - Comprehensive vendor view with tabs
 */

window.renderVendorDetail = function (params) {
  const vendorId = params.vendorId || 'unknown';
  const tab = params.tab || 'transactions';

  return `
    <div class="vendor-detail-page">
      <!-- Vendor Header -->
      <div class="vendor-header" id="vendor-header">
        <div class="vendor-header-content">
          <button class="btn-back" onclick="router.navigate('/vendors')">
            ← Back to Vendors
          </button>
          
          <div class="vendor-title-row">
            <h1 class="vendor-name" id="vendor-name">Loading...</h1>
            <span class="category-badge" id="category-badge"></span>
          </div>
          
          <div class="vendor-stats-row">
            <div class="vendor-stat">
              <span class="stat-label">Total Spent</span>
              <span class="stat-value" id="total-spent">$0.00</span>
            </div>
            <div class="vendor-stat">
              <span class="stat-label">Avg Transaction</span>
              <span class="stat-value" id="avg-transaction">$0.00</span>
            </div>
            <div class="vendor-stat">
              <span class="stat-label">Transactions</span>
              <span class="stat-value" id="txn-count">0</span>
            </div>
            <div class="vendor-stat">
              <span class="stat-label">First Transaction</span>
              <span class="stat-value" id="first-txn">Never</span>
            </div>
          </div>
          
          <div class="vendor-actions">
            <button class="btn-secondary" onclick="editVendorDetails()">
              ✏️ Edit Details
            </button>
            <button class="btn-secondary" onclick="mergeVendor()">
              🔀 Merge
            </button>
            <button class="btn-danger" onclick="deleteVendorFromDetail()">
              🗑️ Delete
            </button>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <a href="#/vendors/${vendorId}/transactions" class="tab-link ${tab === 'transactions' ? 'active' : ''}">
          💰 Transactions
        </a>
        <a href="#/vendors/${vendorId}/analytics" class="tab-link ${tab === 'analytics' ? 'active' : ''}">
          📊 Analytics
        </a>
        <a href="#/vendors/${vendorId}/settings" class="tab-link ${tab === 'settings' ? 'active' : ''}">
          ⚙️ Settings
        </a>
      </div>

      <!-- Tab Content -->
      <div class="tab-content">
        <div id="tab-${tab}" class="tab-pane active">
          ${renderTabContent(tab)}
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initVendorDetailPage === 'function') {
        setTimeout(() => initVendorDetailPage('${vendorId}', '${tab}'), 100);
      }
    </script>
  `;
};

function renderTabContent(tab) {
  if (tab === 'transactions') {
    return `
      <div class="transactions-tab">
        <div class="tab-toolbar">
          <h2>Transactions</h2>
          <button class="btn-primary" onclick="addVendorTransaction()">
            ➕ Add Transaction
          </button>
        </div>
        <div id="vendor-transactions-grid" class="ag-theme-alpine grid-container-small"></div>
        <div class="transactions-summary" id="transactions-summary"></div>
      </div>
    `;
  } else if (tab === 'analytics') {
    return `
      <div class="analytics-tab">
        <h2>Analytics & Insights</h2>
        
        <div class="analytics-cards">
          <div class="analytics-card">
            <h3>Highest Transaction</h3>
            <div class="big-stat" id="highest-txn">$0.00</div>
          </div>
          <div class="analytics-card">
            <h3>Average Monthly</h3>
            <div class="big-stat" id="avg-monthly">$0.00</div>
          </div>
          <div class="analytics-card">
            <h3>Spending Trend</h3>
            <div class="big-stat" id="spending-trend">—</div>
          </div>
        </div>
        
        <div class="charts-container">
          <div class="chart-card">
            <h3>Spending Over Time</h3>
            <canvas id="spending-chart"></canvas>
          </div>
          
          <div class="chart-card">
            <h3>Category Breakdown</h3>
            <canvas id="category-chart"></canvas>
          </div>
        </div>
      </div>
    `;
  } else if (tab === 'settings') {
    return `
      <div class="settings-tab">
        <h2>Vendor Settings</h2>
        
        <form id="vendor-settings-form" onsubmit="saveVendorSettings(event)">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <div class="form-group">
              <label>Vendor Name *</label>
              <input type="text" id="vendor-name-input" required>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <input type="text" id="vendor-category-input" list="category-suggestions">
                <datalist id="category-suggestions">
                  <option value="Office Supplies">
                  <option value="Utilities">
                  <option value="Professional Services">
                  <option value="Meals & Entertainment">
                  <option value="Travel">
                  <option value="Vehicle">
                </datalist>
              </div>
              
              <div class="form-group">
                <label>Default Account</label>
                <select id="default-account-select">
                  <option value="">None</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Contact Information</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="vendor-email">
              </div>
              
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="vendor-phone">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Additional Details</h3>
            
            <div class="form-group">
              <label>Notes</label>
              <textarea id="vendor-notes" rows="4"></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">💾 Save Changes</button>
            <button type="button" class="btn-secondary" onclick="router.navigate('/vendors')">Cancel</button>
          </div>
        </form>
      </div>
    `;
  }

  return '<p>Tab content not found</p>';
}

// ==================================================
// VENDOR DETAIL PAGE LOGIC
// ==================================================

let currentVendor = null;
let vendorTransactions = [];
let vendorTransactionsGrid = null;

async function initVendorDetailPage(vendorId, tab) {
  console.log(`🚀 Initializing Vendor Detail Page: ${vendorId}, tab: ${tab}`);

  try {
    // Load vendor data
    currentVendor = await window.storage.getVendor(vendorId);

    if (!currentVendor) {
      alert('Vendor not found');
      router.navigate('/vendors');
      return;
    }

    // Load vendor transactions
    vendorTransactions = await window.storage.getVendorTransactions(vendorId);

    // Update header
    updateVendorHeader(currentVendor, vendorTransactions);

    // Initialize tab-specific content
    if (tab === 'transactions') {
      initTransactionsTab();
    } else if (tab === 'analytics') {
      initAnalyticsTab();
    } else if (tab === 'settings') {
      initSettingsTab();
    }

  } catch (error) {
    console.error('Failed to load vendor details:', error);
  }
}

function updateVendorHeader(vendor, transactions) {
  document.getElementById('vendor-name').textContent = vendor.name;

  const categoryBadge = document.getElementById('category-badge');
  categoryBadge.textContent = vendor.category || 'Uncategorized';
  categoryBadge.className = 'category-badge';

  document.getElementById('total-spent').textContent =
    window.DataUtils.formatCurrency(vendor.totalSpent || 0);

  const avgTxn = transactions.length > 0 ?
    vendor.totalSpent / transactions.length : 0;
  document.getElementById('avg-transaction').textContent =
    window.DataUtils.formatCurrency(avgTxn);

  document.getElementById('txn-count').textContent = transactions.length;

  if (transactions.length > 0) {
    const sorted = transactions.sort((a, b) => new Date(a.date) - new Date(b.date));
    document.getElementById('first-txn').textContent =
      new Date(sorted[0].date).toLocaleDateString();
  }
}

// ==================================================
// TRANSACTIONS TAB
// ==================================================

function initTransactionsTab() {
  const gridDiv = document.getElementById('vendor-transactions-grid');
  if (!gridDiv) return;

  const columnDefs = [
    {
      headerName: 'Date',
      field: 'date',
      width: 120,
      valueFormatter: params => new Date(params.value).toLocaleDateString()
    },
    {
      headerName: 'Description',
      field: 'description',
      width: 300
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 150
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 120,
      type: 'numericColumn',
      cellStyle: { fontWeight: 'bold', color: '#ef4444' },
      valueFormatter: params => window.DataUtils.formatCurrency(params.value)
    },
    {
      headerName: 'Actions',
      width: 100,
      cellRenderer: params => {
        return `<button class="icon-btn" onclick="router.navigate('/transactions')">View</button>`;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: vendorTransactions,
    animateRows: true,
    pagination: true,
    paginationPageSize: 20,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    }
  };

  vendorTransactionsGrid = agGrid.createGrid(gridDiv, gridOptions);

  // Update summary
  const total = vendorTransactions.reduce((sum, t) => sum + t.amount, 0);
  document.getElementById('transactions-summary').innerHTML = `
    <strong>Total:</strong> ${window.DataUtils.formatCurrency(total)} 
    (${vendorTransactions.length} transactions)
  `;
}

// ==================================================
// ANALYTICS TAB
// ==================================================

function initAnalyticsTab() {
  // Calculate analytics
  if (vendorTransactions.length === 0) {
    document.getElementById('highest-txn').textContent = '$0.00';
    document.getElementById('avg-monthly').textContent = '$0.00';
    document.getElementById('spending-trend').textContent = 'No data';
    return;
  }

  const highest = Math.max(...vendorTransactions.map(t => t.amount));
  document.getElementById('highest-txn').textContent =
    window.DataUtils.formatCurrency(highest);

  // Calculate average monthly
  const monthlyTotals = {};
  vendorTransactions.forEach(t => {
    const month = new Date(t.date).toISOString().slice(0, 7);
    monthlyTotals[month] = (monthlyTotals[month] || 0) + t.amount;
  });

  const avgMonthly = Object.values(monthlyTotals).reduce((a, b) => a + b, 0) /
    Object.keys(monthlyTotals).length;
  document.getElementById('avg-monthly').textContent =
    window.DataUtils.formatCurrency(avgMonthly);

  // Trend
  const months = Object.keys(monthlyTotals).sort();
  if (months.length >= 2) {
    const recent = monthlyTotals[months[months.length - 1]];
    const previous = monthlyTotals[months[months.length - 2]];
    const trend = recent > previous ? '↗️ Increasing' : '↘️ Decreasing';
    document.getElementById('spending-trend').textContent = trend;
  }

  // Render charts (if Chart.js is loaded)
  if (typeof Chart !== 'undefined') {
    renderSpendingChart(monthlyTotals);
    renderCategoryChart();
  }
}

function renderSpendingChart(monthlyTotals) {
  const ctx = document.getElementById('spending-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: Object.keys(monthlyTotals),
      datasets: [{
        label: 'Monthly Spending',
        data: Object.values(monthlyTotals),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

function renderCategoryChart() {
  const categoryTotals = {};
  vendorTransactions.forEach(t => {
    const cat = t.category || 'Uncategorized';
    categoryTotals[cat] = (categoryTotals[cat] || 0) + t.amount;
  });

  const ctx = document.getElementById('category-chart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: Object.keys(categoryTotals),
      datasets: [{
        data: Object.values(categoryTotals),
        backgroundColor: [
          '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'
        ]
      }]
    },
    options: {
      responsive: true
    }
  });
}

// ==================================================
// SETTINGS TAB
// ==================================================

async function initSettingsTab() {
  // Populate form with vendor data
  document.getElementById('vendor-name-input').value = currentVendor.name;
  document.getElementById('vendor-category-input').value = currentVendor.category || '';

  // Load accounts for dropdown
  const accounts = await window.storage.getAccounts();
  const select = document.getElementById('default-account-select');
  accounts.forEach(a => {
    const option = document.createElement('option');
    option.value = a.id;
    option.textContent = a.name;
    if (a.id === currentVendor.defaultAccountId) {
      option.selected = true;
    }
    select.appendChild(option);
  });

  // Load other fields if they exist
  document.getElementById('vendor-email').value = currentVendor.email || '';
  document.getElementById('vendor-phone').value = currentVendor.phone || '';
  document.getElementById('vendor-notes').value = currentVendor.notes || '';
}

async function saveVendorSettings(event) {
  event.preventDefault();

  try {
    const updates = {
      name: document.getElementById('vendor-name-input').value,
      category: document.getElementById('vendor-category-input').value,
      defaultAccountId: document.getElementById('default-account-select').value || null,
      email: document.getElementById('vendor-email').value,
      phone: document.getElementById('vendor-phone').value,
      notes: document.getElementById('vendor-notes').value
    };

    await window.storage.updateVendor(currentVendor.id, updates);

    alert('Vendor updated successfully!');
    router.navigate(`/vendors/${currentVendor.id}`);

  } catch (error) {
    console.error('Failed to update vendor:', error);
    alert('Failed to save changes');
  }
}

// ==================================================
// ACTIONS
// ==================================================

function editVendorDetails() {
  router.navigate(`/vendors/${currentVendor.id}/settings`);
}

function mergeVendor() {
  alert('Merge vendor feature coming soon!');
}

async function deleteVendorFromDetail() {
  if (!confirm(`Delete vendor "${currentVendor.name}"?`)) return;

  try {
    await window.storage.deleteVendor(currentVendor.id);
    router.navigate('/vendors');
  } catch (error) {
    console.error('Failed to delete vendor:', error);
    alert('Failed to delete vendor');
  }
}

function addVendorTransaction() {
  // Navigate to transactions page and open add modal with vendor pre-filled
  router.navigate('/transactions');
  // TODO: Pre-fill vendor in add transaction form
}
