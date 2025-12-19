/**
 * Chart of Accounts Page - Simple AG Grid Table
 */

window.renderAccounts = function () {
  return `
    <style>
      #accountsGrid {
          width: 100%;
          height: calc(100vh - 220px);
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          border: 1px solid #e2e8f0;
          overflow: hidden;
      }
      .accounts-page {
          width: 100%;
          height: 100%;
          padding: 30px;
          box-sizing: border-box;
          background-color: #f8fafc;
      }
      .page-header {
          margin-bottom: 25px;
          padding-bottom: 15px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #cbd5e1;
      }
    </style>
    <div class="accounts-page">
      <div class="page-header">
        <h1>💰 Chart of Accounts</h1>
        <button class="btn-primary" onclick="addNewAccount()">➕ Add Account</button>
      </div>
      
      <div class="content-area">
        <!-- Explicit Inline Height as Failsafe -->
        <div id="accountsGrid" class="ag-theme-alpine grid-container" style="height: calc(100vh - 220px); width: 100%;"></div>
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

// Local account data - Initialize from Global Default if available
let accountData = [];

function loadAccountData() {
  if (typeof window.DEFAULT_CHART_OF_ACCOUNTS !== 'undefined') {
    // Map global format (code, name) to grid format (accountNumber, description)
    accountData = window.DEFAULT_CHART_OF_ACCOUNTS.map(acc => ({
      accountNumber: acc.code || acc.accountNumber,
      description: acc.name || acc.description
    }));
  } else {
    // Fallback if needed
    accountData = [];
  }
}

async function initAccountsGrid() {
  console.log('🔷 Initializing Chart of Accounts Grid...');

  const gridDiv = document.querySelector('#accountsGrid');
  if (!gridDiv) {
    console.warn('⚠️ Accounts grid container not found during init');
    return;
  }

  // 1. CLEANUP existing instance if present
  if (accountsGridApi) {
    console.log('♻️ Destroying previous grid instance...');
    try {
      // If API exists, try to destroy. 
      // Note: AG Grid API doesn't always have a clean destroy, usually clearing innerHTML or calling gridOptions.api.destroy() if available.
      if (typeof accountsGridApi.destroy === 'function') {
        accountsGridApi.destroy();
      }
    } catch (e) { console.warn('Hazardous destroy:', e); }
    accountsGridApi = null;
  }

  // 2. Clear Container Forcefully
  gridDiv.innerHTML = '';

  loadAccountData(); // Load latest data

  // (CSS Injection is now handled by renderAccounts template)

  const columnDefs = [
    {
      headerName: 'Account #',
      field: 'accountNumber',
      width: 130,
      filter: 'agTextColumnFilter',
      sort: 'asc',
      pinned: 'left' // Optional: Pin account number
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
    rowData: accountData,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    headerHeight: 48, // Taller header
    animateRows: true,
    onGridReady: (event) => {
      console.log('✅ Chart of Accounts grid ready');
      accountsGridApi = event.api;
      event.api.sizeColumnsToFit();
    }
  };

  // 3. CREATE Grid
  try {
    accountsGridApi = agGrid.createGrid(gridDiv, gridOptions);
  } catch (err) {
    console.error('❌ Failed to create accounts grid:', err);
  }
}

// Watch for grid container
const accountObserver = new MutationObserver(() => {
  const gridDiv = document.getElementById('accountsGrid');

  // Check if gridDiv exists AND not initialized
  if (gridDiv && !gridDiv.classList.contains('js-initialized')) {
    console.log('📍 Accounts grid container detected, initializing...');

    // Mark as initialized
    gridDiv.classList.add('js-initialized');

    initAccountsGrid();
    // Do NOT disconnect!
  }
});

if (document.body) {
  accountObserver.observe(document.body, { childList: true, subtree: true });
}

function addNewAccount() {
  const accountNumber = prompt('Enter Account Number:');
  if (!accountNumber) return;

  const description = prompt('Enter Account Description:');
  if (!description) return;

  const newAccount = { accountNumber, description };
  accountData.push(newAccount);

  if (accountsGridApi) {
    accountsGridApi.setGridOption('rowData', accountData);
  }

  console.log('✅ Added account:', newAccount);
}

function deleteAccount(accountNumber) {
  if (!confirm(`Delete account ${accountNumber}?`)) return;

  const index = accountData.findIndex(a => a.accountNumber === accountNumber);
  if (index !== -1) {
    accountData.splice(index, 1);

    if (accountsGridApi) {
      accountsGridApi.setGridOption('rowData', accountData);
    }

    console.log('✅ Deleted account:', accountNumber);
  }
}
