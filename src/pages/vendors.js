/**
 * Vendor Dictionary Page - Simple AG Grid Table
 */

window.renderVendors = function () {
  return `
    <div class="vendors-page">
      <div class="page-header">
        <h1>🏢 Vendor Dictionary</h1>
        <button class="btn-primary" onclick="addNewVendor()">➕ Add Vendor</button>
      </div>
      
      <div class="content-area">
        <div id="vendorsGrid" class="ag-theme-alpine grid-container"></div>
      </div>
    </div>
    
    <script>
      if (typeof initVendorsGrid === 'function') {
        setTimeout(initVendorsGrid, 100);
      }
    </script>
  `;
};

let vendorsGridApi;

// Local vendor data
let vendorData = []; // Initialize as empty, will be loaded from storage

async function initVendorsGrid() {
  console.log('🔷 Initializing Vendor Dictionary Grid...');

  // LOAD FROM STORAGE instead of hardcoded data!
  if (window.storage) {
    const vendors = await window.storage.getVendors();
    // Map storage format to grid format
    vendorData = vendors.map(v => ({
      id: v.id,
      accountNumber: v.accountNumber || '',
      description: v.description || v.name
    }));
    console.log(`📊 Loaded ${vendorData.length} vendors from storage`);
  }

  // Inject CSS manually to ensure height is correct in SPA
  const style = document.createElement('style');
  style.innerHTML = `
      #vendorsGrid {
          width: 100%;
          height: calc(100vh - 200px); /* Adjusted for extra header spacing */
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          overflow: hidden; /* Ensure rounded corners clip content */
      }
      .vendors-page {
          width: 100%;
          height: 100%;
          padding: 30px; /* Increased padding */
          box-sizing: border-box;
          background-color: #f8fafc; /* Subtle background for contrast */
      }
      .page-header {
          margin-bottom: 25px;
          padding-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #cbd5e1; /* Visual separator line */
      }
      .page-header h1 {
          margin: 0;
          color: #1e293b;
      }
      /* Ensure AG Grid headers stay fixed */
      #vendorsGrid .ag-header {
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
          background: white !important;
      }
      #vendorsGrid .ag-header-viewport {
          background: #f8fafc !important;
      }
  `;
  document.head.appendChild(style);

  const columnDefs = [
    {
      headerName: 'Account #',
      field: 'accountNumber',
      width: 130,
      filter: 'agTextColumnFilter',
      sort: 'asc'
    },
    {
      headerName: 'Vendor Description',
      field: 'description',
      flex: 1,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'Delete',
      field: 'delete',
      width: 100,
      sortable: false,
      filter: false,
      cellRenderer: (params) => {
        const escapedDesc = params.data.description.replace(/'/g, "\\'");
        return `<button class="btn-icon btn-delete" onclick="deleteVendor('${escapedDesc}')" title="Delete Vendor">🗑️</button>`;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: vendorData,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      editable: true  // Make cells editable
    },
    animateRows: true,
    suppressHorizontalScroll: false,
    // Header will float above content when scrolling
    headerHeight: 48,
    floatingFiltersHeight: 0,
    onGridReady: (event) => {
      console.log('✅ Vendor Dictionary grid ready');
      vendorsGridApi = event.api;
      event.api.sizeColumnsToFit();
    },
    onFirstDataRendered: (event) => {
      event.api.sizeColumnsToFit();
    },
    onCellValueChanged: async (event) => {
      // Save to storage when cell is edited
      const updatedVendor = event.data;
      if (window.storage && updatedVendor.id) {
        await window.storage.updateVendor(updatedVendor.id, updatedVendor);
        console.log('💾 Vendor updated:', updatedVendor.description);
      }
    }
  };

  const gridDiv = document.querySelector('#vendorsGrid');
  if (gridDiv) {
    // Destroy previous grid instance if it exists
    if (vendorsGridApi) {
      console.log('♻️ Destroying previous grid instance...');
      vendorsGridApi.destroy();
      vendorsGridApi = null;
    }
    gridDiv.innerHTML = ''; // Clear previous if any
    vendorsGridApi = agGrid.createGrid(gridDiv, gridOptions);
  }
}

// Watch for grid container - with flag to prevent infinite loop
let isInitializingVendors = false;
const vendorObserver = new MutationObserver(() => {
  const gridDiv = document.getElementById('vendorsGrid');

  // Check if div exists, not initializing, AND no grid rendered inside
  const hasGrid = gridDiv?.querySelector('.ag-root-wrapper');
  if (gridDiv && !isInitializingVendors && !hasGrid) {
    console.log('📍 Vendors grid container detected, initializing...');
    isInitializingVendors = true;
    initVendorsGrid();
    // Reset flag after delay to allow next navigation
    setTimeout(() => { isInitializingVendors = false; }, 500);
  }
});

if (document.body) {
  vendorObserver.observe(document.body, { childList: true, subtree: true });
}

function addNewVendor() {
  const accountNumber = prompt('Enter Default Account Number:');
  if (!accountNumber) return;

  const description = prompt('Enter Vendor Name:');
  if (!description) return;

  const newVendor = { accountNumber, description };
  vendorData.push(newVendor);

  if (vendorsGridApi) {
    vendorsGridApi.setGridOption('rowData', vendorData);
  }

  console.log('✅ Added vendor:', newVendor);
}

function deleteVendor(description) {
  if (!confirm(`Delete vendor "${description}"?`)) return;

  const index = vendorData.findIndex(v => v.description === description);
  if (index !== -1) {
    vendorData.splice(index, 1);

    if (vendorsGridApi) {
      vendorsGridApi.setGridOption('rowData', vendorData);
    }

    console.log('✅ Deleted vendor:', description);
  }
}
