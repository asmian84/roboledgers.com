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
      event.api.sizeColumnsToFit();
    },
    onFirstDataRendered: (event) => {
      event.api.sizeColumnsToFit();
    }
  };

  const gridDiv = document.querySelector('#vendorsGrid');
  if (gridDiv) {
    vendorsGridApi = agGrid.createGrid(gridDiv, gridOptions);
  }
}

// Watch for grid container
const vendorObserver = new MutationObserver(() => {
  const gridDiv = document.getElementById('vendorsGrid');
  if (gridDiv && !vendorsGridApi) {
    console.log('📍 Vendors grid container detected, initializing...');
    initVendorsGrid();
    vendorObserver.disconnect();
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
