/**
 * Vendors List Page - AG Grid with stats and filtering
 */

window.renderVendors = function () {
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
