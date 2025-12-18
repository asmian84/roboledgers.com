/**
 * Chart of Accounts Page - Simple AG Grid Table
 */

// Seed Data
const CHART_OF_ACCOUNTS = [
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

window.renderAccounts = function () {
  return `
    <div class="accounts-page">
      <div class="page-header">
        <h1>💰 Chart of Accounts</h1>
        <button class="btn-primary" onclick="addNewAccount()">➕ Add Account</button>
      </div>
      
      <div class="content-area">
        <div id="accountsGrid" class="ag-theme-alpine grid-container"></div>
      </div>
    </div>
    
    <script>
      if (typeof initAccountsGrid === 'function') {
        setTimeout(initAccountsGrid, 100);
      }
    </script>
  `;
};

let accountsGridApi;

async function initAccountsGrid() {
  console.log('🔷 Initializing Chart of Accounts Grid...');

  const columnDefs = [
    {
      headerName: 'Account #',
      field: 'accountNumber',
      width: 130,
      filter: 'agTextColumnFilter',
      sort: 'asc'
    },
    {
      headerName: 'Account Description',
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
        return `<button class="btn-icon btn-delete" onclick="deleteAccount('${params.data.accountNumber}')" title="Delete Account">🗑️</button>`;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: CHART_OF_ACCOUNTS,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    animateRows: true,
    onGridReady: (event) => {
      console.log('✅ Chart of Accounts grid ready');
      event.api.sizeColumnsToFit();
    },
    onFirstDataRendered: (event) => {
      event.api.sizeColumnsToFit();
    }
  };

  const gridDiv = document.querySelector('#accountsGrid');
  if (gridDiv) {
    accountsGridApi = agGrid.createGrid(gridDiv, gridOptions);
  }
}

function addNewAccount() {
  const accountNumber = prompt('Enter Account Number:');
  if (!accountNumber) return;

  const description = prompt('Enter Account Description:');
  if (!description) return;

  const newAccount = { accountNumber, description };
  CHART_OF_ACCOUNTS.push(newAccount);

  if (accountsGridApi) {
    accountsGridApi.setGridOption('rowData', CHART_OF_ACCOUNTS);
  }

  console.log('✅ Added account:', newAccount);
}

function deleteAccount(accountNumber) {
  if (!confirm(`Delete account ${accountNumber}?`)) return;

  const index = CHART_OF_ACCOUNTS.findIndex(a => a.accountNumber === accountNumber);
  if (index !== -1) {
    CHART_OF_ACCOUNTS.splice(index, 1);

    if (accountsGridApi) {
      accountsGridApi.setGridOption('rowData', CHART_OF_ACCOUNTS);
    }

    console.log('✅ Deleted account:', accountNumber);
  }
}
