/**
 * Vendor Dictionary - Simple Table Format
 * Account #, Vendor Name/Description, # of Occurrences, Delete
 */

window.renderVendors = function () {
  return `
    <div class="vendors-page">
      <!-- Page Header -->
      <div class="page-header">
        <h1>🏢 Vendor Dictionary</h1>
        <button class="btn-primary" onclick="addNewVendor()">
          ➕ Add Vendor
        </button>
      </div>

      <!-- Vendors Grid -->
      <div id="vendors-grid" class="ag-theme-alpine grid-container"></div>
    </div>
    
    <script>
      if (typeof initVendorsPage === 'function') {
        setTimeout(initVendorsPage, 100);
      }
    </script>
  `;
};

// ==================================================
// VENDOR DICTIONARY DATA
// ==================================================

const DEFAULT_VENDOR_DICTIONARY = [
  { accountNumber: '5140', description: 'Office Depot' },
  { accountNumber: '5140', description: 'Staples' },
  { accountNumber: '5140', description: 'Amazon Business' },
  { accountNumber: '5130', description: 'Verizon' },
  { accountNumber: '5120', description: 'Pacific Gas & Electric' },
  { accountNumber: '5120', description: 'City Water Department' },
  { accountNumber: '5110', description: 'ABC Property Management' },
  { accountNumber: '5400', description: 'Smith & Associates CPA' },
  { accountNumber: '5400', description: 'Johnson Legal Group' },
  { accountNumber: '5140', description: 'Microsoft' },
  { accountNumber: '5140', description: 'Adobe' },
  { accountNumber: '5140', description: 'Salesforce' },
  { accountNumber: '5300', description: 'Google Ads' },
  { accountNumber: '5300', description: 'Facebook Ads' },
  { accountNumber: '5150', description: 'State Farm Insurance' },
  { accountNumber: '5600', description: 'Wells Fargo' },
  { accountNumber: '5700', description: 'Starbucks' },
  { accountNumber: '5700', description: 'The Capital Grille' },
  { accountNumber: '5140', description: 'FedEx' },
  { accountNumber: '5140', description: 'UPS' },
  { accountNumber: '5800', description: 'United Airlines' },
  { accountNumber: '5800', description: 'Marriott Hotels' },
  { accountNumber: '5800', description: 'Hertz Rent-A-Car' },
  { accountNumber: '1510', description: 'Dell' },
  { accountNumber: '1510', description: 'HP' }
];

// ==================================================
// VENDORS PAGE LOGIC
// ==================================================

let vendorsGrid = null;
let allVendors = [];
let allTransactions = [];

async function initVendorsPage() {
  console.log('🚀 Initializing Vendor Dictionary...');

  // Load vendors and transactions
  allVendors = await loadVendors();
  allTransactions = await loadTransactions();

  // Calculate occurrences
  calculateOccurrences();

  // Initialize AG Grid
  initializeVendorsGrid();
}

async function loadVendors() {
  try {
    const stored = await window.storage.getVendors();
    if (stored && stored.length > 0) {
      return stored.map(v => ({
        accountNumber: v.defaultAccountId || v.accountNumber || '5000',
        description: v.name || v.description,
        occurrences: 0
      }));
    }
  } catch (error) {
    console.log('Using default vendor dictionary');
  }

  return DEFAULT_VENDOR_DICTIONARY.map(v => ({ ...v, occurrences: 0 }));
}

async function loadTransactions() {
  try {
    return await window.storage.getTransactions() || [];
  } catch (error) {
    return [];
  }
}

function calculateOccurrences() {
  // Count how many times each vendor appears in transactions
  allVendors.forEach(vendor => {
    vendor.occurrences = allTransactions.filter(t =>
      t.vendorId === vendor.description ||
      (t.vendor && t.vendor.toLowerCase() === vendor.description.toLowerCase())
    ).length;
  });
}

function initializeVendorsGrid() {
  const gridDiv = document.getElementById('vendors-grid');
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
      headerName: 'Vendor Name/Description',
      field: 'description',
      flex: 1,
      sortable: true,
      filter: true
    },
    {
      headerName: '# of Occurrences',
      field: 'occurrences',
      width: 160,
      sortable: true,
      filter: true,
      cellStyle: params => {
        return params.value > 0 ? { fontWeight: 'bold', color: '#10b981' } : {};
      }
    },
    {
      headerName: 'Delete',
      width: 100,
      cellRenderer: params => {
        return `<button class="btn-delete" onclick="deleteVendor('${params.data.description}')">🗑️</button>`;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: allVendors,
    pagination: true,
    paginationPageSize: 50,
    defaultColDef: {
      resizable: true,
      sortable: true,
      filter: true
    }
  };

  vendorsGrid = agGrid.createGrid(gridDiv, gridOptions);
  console.log(`✅ Loaded ${allVendors.length} vendors`);
}

// ==================================================
// VENDOR ACTIONS
// ==================================================

function addNewVendor() {
  const accountNumber = prompt('Enter Account Number (default):');
  if (!accountNumber) return;

  const description = prompt('Enter Vendor Name:');
  if (!description) return;

  // Add to array
  allVendors.push({ accountNumber, description, occurrences: 0 });

  // Refresh grid
  vendorsGrid.setGridOption('rowData', allVendors);

  // Save to storage
  saveVendors();

  console.log('✅ Vendor added');
}

async function deleteVendor(vendorName) {
  if (!confirm(`Delete vendor "${vendorName}"?`)) return;

  // Remove from array
  allVendors = allVendors.filter(v => v.description !== vendorName);

  // Refresh grid
  vendorsGrid.setGridOption('rowData', allVendors);

  // Save to storage
  saveVendors();

  console.log('✅ Vendor deleted');
}

async function saveVendors() {
  try {
    // Convert to storage format and save
    const toSave = allVendors.map(v => ({
      id: v.description.replace(/\s+/g, '-').toLowerCase(),
      name: v.description,
      defaultAccountId: v.accountNumber,
      category: getVendorCategory(v.accountNumber),
      totalSpent: 0,
      transactionCount: v.occurrences,
      lastTransaction: null
    }));

    localStorage.setItem('ab3_vendors', JSON.stringify(toSave));
  } catch (error) {
    console.error('Failed to save vendors:', error);
  }
}

function getVendorCategory(accountNumber) {
  const categories = {
    '5110': 'Rent',
    '5120': 'Utilities',
    '5130': 'Telecommunications',
    '5140': 'Office Supplies',
    '5150': 'Insurance',
    '5300': 'Marketing',
    '5400': 'Professional Services',
    '5600': 'Banking',
    '5700': 'Meals & Entertainment',
    '5800': 'Travel'
  };
  return categories[accountNumber] || 'Other';
}

return `
    <div class="vendors-page">
      <!-- Page Header -->
      <div class="page-header-section">
        <div>
          <h1 class="page-title">🏢 Vendors</h1>
          <p class="page-subtitle">Manage your suppliers and service providers</p>
        </div>
        <button class="btn-primary" onclick="router.navigate('/vendors/new')">
          ➕ Add Vendor
        </button>
      </div>

      <!-- Quick Stats -->
      <div class="vendor-stats">
        <div class="stat-card">
          <div class="stat-icon">🏢</div>
          <div class="stat-value" id="total-vendors">0</div>
          <div class="stat-label">Total Vendors</div>
        </div>
        
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-value" id="active-vendors">0</div>
          <div class="stat-label">Active This Month</div>
        </div>
        
        <div class="stat-card top-vendor">
          <div class="stat-icon">👑</div>
          <div class="stat-value" id="top-vendor-name">-</div>
          <div class="stat-label">Top Vendor</div>
          <div class="stat-sublabel" id="top-vendor-amount">$0.00</div>
        </div>
      </div>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <input 
            type="search" 
            id="vendor-search" 
            class="search-input" 
            placeholder="Search vendors..." 
            oninput="filterVendorGrid()"
          >
          <select id="category-filter" class="filter-select" onchange="filterVendorGrid()">
            <option value="">All Categories</option>
          </select>
        </div>
        
        <div class="toolbar-right">
          <button class="btn-secondary" onclick="importVendors()">
            📥 Import
          </button>
          <button class="btn-secondary" onclick="exportVendors()">
            📤 Export
          </button>
        </div>
      </div>

      <!-- Vendor Grid -->
      <div id="vendors-grid-container" class="ag-theme-alpine grid-container"></div>
    </div>
    
    <script>
      if (typeof initVendorsPage === 'function') {
        setTimeout(initVendorsPage, 100);
      }
    </script>
  `;
};

// ==================================================
// VENDORS LIST PAGE LOGIC
// ==================================================

let vendorsGrid = null;
let allVendors = [];
// Vendors page transactions (moved to module scope below) = [];

async function initVendorsPage() {
  console.log('🚀 Initializing Vendors Page...');

  try {
    // Load data
    allVendors = await window.storage.getVendors();
    allTransactions = await window.storage.getTransactions();

    console.log(`Loaded ${allVendors.length} vendors`);

    // Initialize grid
    initializeVendorGrid();

    // Update stats
    updateVendorStats();

    // Populate category filter
    populateCategoryFilter();

  } catch (error) {
    console.error('Failed to initialize vendors page:', error);
  }
}

function initializeVendorGrid() {
  const gridDiv = document.getElementById('vendors-grid-container');
  if (!gridDiv) return;

  const columnDefs = [
    {
      headerName: 'Vendor Name',
      field: 'name',
      width: 250,
      cellRenderer: params => {
        return `<a href="#/vendors/${params.data.id}" class="vendor-link">${params.value}</a>`;
      }
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 180
    },
    {
      headerName: 'Total Spent',
      field: 'totalSpent',
      width: 150,
      type: 'numericColumn',
      cellStyle: { fontWeight: 'bold', color: '#ef4444' },
      valueFormatter: params => {
        return window.DataUtils.formatCurrency(params.value || 0);
      }
    },
    {
      headerName: 'Transactions',
      field: 'transactionCount',
      width: 130,
      type: 'numericColumn'
    },
    {
      headerName: 'Last Transaction',
      field: 'lastTransaction',
      width: 150,
      valueFormatter: params => {
        if (!params.value) return 'Never';
        return new Date(params.value).toLocaleDateString();
      }
    },
    {
      headerName: 'Actions',
      width: 120,
      pinned: 'right',
      cellRenderer: params => {
        return `
          <button class="icon-btn" onclick="editVendor('${params.data.id}')" title="Edit">✏️</button>
          <button class="icon-btn" onclick="deleteVendor('${params.data.id}')" title="Delete">🗑️</button>
        `;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: allVendors,
    rowSelection: 'single',
    animateRows: true,
    pagination: true,
    paginationPageSize: 25,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    onRowClicked: (event) => {
      router.navigate(`/vendors/${event.data.id}`);
    },
    getRowStyle: (params) => {
      // Highlight high-spending vendors
      if (params.data.totalSpent > 10000) {
        return { background: 'rgba(255, 215, 0, 0.1)' };
      }
      return null;
    }
  };

  vendorsGrid = agGrid.createGrid(gridDiv, gridOptions);
  console.log('✅ Vendor grid initialized');
}

function updateVendorStats() {
  // Total vendors
  document.getElementById('total-vendors').textContent = allVendors.length;

  // Active this month
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const activeVendors = allVendors.filter(v =>
    v.lastTransaction && new Date(v.lastTransaction) >= firstOfMonth
  );
  document.getElementById('active-vendors').textContent = activeVendors.length;

  // Top vendor
  const topVendor = allVendors.reduce((top, v) =>
    v.totalSpent > (top?.totalSpent || 0) ? v : top
    , null);

  if (topVendor) {
    document.getElementById('top-vendor-name').textContent = topVendor.name;
    document.getElementById('top-vendor-amount').textContent =
      window.DataUtils.formatCurrency(topVendor.totalSpent);
  }
}

function populateCategoryFilter() {
  const categories = [...new Set(allVendors.map(v => v.category).filter(Boolean))];
  const select = document.getElementById('category-filter');

  categories.forEach(cat => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    select.appendChild(option);
  });
}

function filterVendorGrid() {
  const searchTerm = document.getElementById('vendor-search').value.toLowerCase();
  const category = document.getElementById('category-filter').value;

  let filtered = allVendors;

  if (searchTerm) {
    filtered = filtered.filter(v =>
      v.name.toLowerCase().includes(searchTerm)
    );
  }

  if (category) {
    filtered = filtered.filter(v => v.category === category);
  }

  vendorsGrid.setGridOption('rowData', filtered);
}

function editVendor(id) {
  router.navigate(`/vendors/${id}/settings`);
}

async function deleteVendor(id) {
  const vendor = allVendors.find(v => v.id === id);
  if (!vendor) return;

  if (!confirm(`Delete vendor "${vendor.name}"?\n\nThis will NOT delete associated transactions, but will unlink them from this vendor.`)) {
    return;
  }

  try {
    await window.storage.deleteVendor(id);
    allVendors = allVendors.filter(v => v.id !== id);
    vendorsGrid.setGridOption('rowData', allVendors);
    updateVendorStats();
    console.log('✅ Vendor deleted');
  } catch (error) {
    console.error('Failed to delete vendor:', error);
    alert('Failed to delete vendor');
  }
}

function importVendors() {
  alert('Import vendors feature coming soon!');
}

function exportVendors() {
  const json = JSON.stringify(allVendors, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'vendors_export.json';
  a.click();
  console.log('✅ Vendors exported');
}
