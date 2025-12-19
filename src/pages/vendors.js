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
let vendorData = [
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

async function initVendorsGrid() {
  console.log('🔷 Initializing Vendor Dictionary Grid...');

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
      resizable: true
    },
    animateRows: true,
    onGridReady: (event) => {
      console.log('✅ Vendor Dictionary grid ready');
      vendorsGridApi = event.api;
      event.api.sizeColumnsToFit();
    },
    onFirstDataRendered: (event) => {
      event.api.sizeColumnsToFit();
    }
  };

  const gridDiv = document.querySelector('#vendorsGrid');
  if (gridDiv) {
    gridDiv.innerHTML = ''; // Clear previous if any
    vendorsGridApi = agGrid.createGrid(gridDiv, gridOptions);
  }
}

// Watch for grid container
const vendorObserver = new MutationObserver(() => {
  const gridDiv = document.getElementById('vendorsGrid');

  // Check if present AND not already initialized this session
  if (gridDiv && !gridDiv.classList.contains('js-initialized')) {
    console.log('📍 Vendors grid container detected, initializing...');

    // Mark as initialized
    gridDiv.classList.add('js-initialized');

    initVendorsGrid();

    // DO NOT disconnect! Keep watching for navigation events.
    // vendorObserver.disconnect();
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
