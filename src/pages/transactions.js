/**
 * Transactions Page - CSV Import to Grid
 */

window.renderTransactions = function () {
  return `
    <div class="transactions-page">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="btn-primary" onclick="showCSVImport()">
            📥 Import CSV
          </button>
          <button class="btn-primary" onclick="addNewTransaction()">
            ➕ Add Transaction
          </button>
        </div>
        
        <div class="toolbar-right">
          <input 
            type="search" 
            id="search-input" 
            class="search-input" 
            placeholder="Search transactions..." 
            oninput="onQuickFilterChange(this.value)"
          >
          <button class="btn-secondary" onclick="exportToCSV()">📄 Export CSV</button>
        </div>
      </div>

      <!-- CSV Import Dropzone (hidden by default) -->
      <div id="csv-dropzone" class="csv-dropzone" style="display: none;">
        <div class="dropzone-content">
          <div class="dropzone-icon">📂</div>
          <h3>Drop CSV file here or click to browse</h3>
          <p>Supported format: Ref#, Date, Description, Debit, Credit, Account#</p>
          <input type="file" id="csv-file-input" accept=".csv" style="display: none;" onchange="handleFileSelect(event)">
          <button class="btn-primary" onclick="document.getElementById('csv-file-input').click()">
            Choose File
          </button>
          <button class="btn-secondary" onclick="hideCSVImport()">Cancel</button>
        </div>
      </div>

      <!-- AG Grid Container -->
      <div class="content-area">
        <div id="transactionsGrid" class="ag-theme-alpine grid-container"></div>
      </div>
    </div>
    
    <script>
      if (typeof initTransactionsGrid === 'function') {
        setTimeout(initTransactionsGrid, 100);
      }
    </script>
  `;
};

let transactionsGridApi;
let transactionData = [];

async function initTransactionsGrid() {
  console.log('🔷 Initializing Transactions Grid...');

  const columnDefs = [
    {
      headerName: 'Ref#',
      field: 'refNumber',
      width: 100,
      filter: 'agTextColumnFilter',
      pinned: 'left'
    },
    {
      headerName: 'Date',
      field: 'date',
      width: 120,
      filter: 'agDateColumnFilter',
      editable: true,
      sort: 'desc',
      valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString() : ''
    },
    {
      headerName: 'Description',
      field: 'description',
      width: 300,
      filter: 'agTextColumnFilter',
      editable: true,
      flex: 1
    },
    {
      headerName: 'Debit',
      field: 'debit',
      width: 120,
      filter: 'agNumberColumnFilter',
      editable: true,
      type: 'numericColumn',
      valueFormatter: params => params.value ? `$${parseFloat(params.value).toFixed(2)}` : '',
      cellStyle: { color: '#ef4444', fontWeight: '600' },
      aggFunc: 'sum'
    },
    {
      headerName: 'Credit',
      field: 'credit',
      width: 120,
      filter: 'agNumberColumnFilter',
      editable: true,
      type: 'numericColumn',
      valueFormatter: params => params.value ? `$${parseFloat(params.value).toFixed(2)}` : '',
      cellStyle: { color: '#10b981', fontWeight: '600' },
      aggFunc: 'sum'
    },
    {
      headerName: 'Account#',
      field: 'accountNumber',
      width: 100,
      filter: 'agTextColumnFilter',
      editable: true
    },
    {
      headerName: 'Account Description',
      field: 'accountDescription',
      width: 250,
      filter: 'agTextColumnFilter',
      editable: true
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 100,
      pinned: 'right',
      sortable: false,
      filter: false,
      cellRenderer: params => {
        return `
          <div class="actions-cell">
            <button class="btn-icon btn-edit" onclick="editTransaction(${params.rowIndex})" title="Edit">✏️</button>
            <button class="btn-icon btn-delete" onclick="deleteTransaction(${params.rowIndex})" title="Delete">🗑️</button>
          </div>
        `;
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: transactionData,

    editType: 'fullRow',
    stopEditingWhenCellsLoseFocus: true,

    onCellValueChanged: event => {
      console.log('Transaction updated:', event.data);
      saveTransactions();
    },

    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],

    animateRows: true,

    onGridReady: event => {
      console.log('✅ Transactions grid ready');
      loadSavedTransactions();
    },

    onFirstDataRendered: event => {
      event.api.sizeColumnsToFit();
    },

    statusBar: {
      statusPanels: [
        { statusPanel: 'agTotalRowCountComponent', align: 'left' },
        { statusPanel: 'agFilteredRowCountComponent' },
        {
          statusPanel: 'agAggregationComponent',
          statusPanelParams: { aggFuncs: ['sum'] }
        }
      ]
    },

    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      editable: false
    }
  };

  const gridDiv = document.querySelector('#transactionsGrid');
  if (gridDiv) {
    transactionsGridApi = agGrid.createGrid(gridDiv, gridOptions);

    // Setup drag and drop
    setupDragAndDrop();
  }
}

function setupDragAndDrop() {
  const dropzone = document.getElementById('csv-dropzone');
  if (!dropzone) return;

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
      handleFile(files[0]);
    } else {
      alert('Please drop a CSV file');
    }
  });
}

function showCSVImport() {
  const dropzone = document.getElementById('csv-dropzone');
  if (dropzone) {
    dropzone.style.display = 'flex';
  }
}

function hideCSVImport() {
  const dropzone = document.getElementById('csv-dropzone');
  if (dropzone) {
    dropzone.style.display = 'none';
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const csv = e.target.result;
    parseCSV(csv);
    hideCSVImport();
  };

  reader.readAsText(file);
}

function parseCSV(csv) {
  const lines = csv.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  console.log('CSV Headers:', headers);

  const newTransactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());

    if (values.length >= 3) {
      const transaction = {
        refNumber: values[0] || `REF${Date.now()}-${i}`,
        date: values[1] || new Date().toISOString().split('T')[0],
        description: values[2] || '',
        debit: parseFloat(values[3]) || 0,
        credit: parseFloat(values[4]) || 0,
        accountNumber: values[5] || '',
        accountDescription: values[6] || ''
      };

      // Auto-match vendor and populate account if not provided
      if (!transaction.accountNumber) {
        matchVendor(transaction);
      }

      // Normalize debit/credit for credit cards (reverse them)
      normalizeDebitCredit(transaction);

      newTransactions.push(transaction);
    }
  }

  // Add to existing data
  transactionData = [...transactionData, ...newTransactions];

  if (transactionsGridApi) {
    transactionsGridApi.setGridOption('rowData', transactionData);
  }

  saveTransactions();

  console.log(`✅ Imported ${newTransactions.length} transactions`);
  alert(`Successfully imported ${newTransactions.length} transactions`);
}

// Vendor Dictionary (from vendors.js)
const VENDOR_DICTIONARY = [
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

// Chart of Accounts (from accounts.js)
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

/**
 * Match transaction description against Vendor Dictionary
 * Auto-populate Account# and Account Description
 */
function matchVendor(transaction) {
  if (!transaction.description) return;

  const desc = transaction.description.toLowerCase();

  // Try to find exact or partial match
  for (const vendor of VENDOR_DICTIONARY) {
    const vendorName = vendor.description.toLowerCase();

    // Check if vendor name appears in transaction description
    if (desc.includes(vendorName) || vendorName.includes(desc)) {
      const account = CHART_OF_ACCOUNTS.find(a => a.accountNumber === vendor.accountNumber);

      if (account) {
        transaction.accountNumber = account.accountNumber;
        transaction.accountDescription = account.description;
        console.log(`✅ Matched "${transaction.description}" → ${vendor.description} → ${account.accountNumber} ${account.description}`);
        return;
      }
    }
  }

  // Also try fuzzy matching by checking if any word matches
  const descWords = desc.split(/\s+/);
  for (const vendor of VENDOR_DICTIONARY) {
    const vendorWords = vendor.description.toLowerCase().split(/\s+/);

    for (const word of descWords) {
      if (word.length > 3 && vendorWords.some(vw => vw.includes(word) || word.includes(vw))) {
        const account = CHART_OF_ACCOUNTS.find(a => a.accountNumber === vendor.accountNumber);

        if (account) {
          transaction.accountNumber = account.accountNumber;
          transaction.accountDescription = account.description;
          console.log(`✅ Fuzzy matched "${transaction.description}" → ${vendor.description} → ${account.accountNumber} ${account.description}`);
          return;
        }
      }
    }
  }

  console.log(`⚠️ No vendor match found for: "${transaction.description}"`);
}

function addNewTransaction() {
  const newTxn = {
    refNumber: `REF${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    description: '',
    debit: 0,
    credit: 0,
    accountNumber: '',
    accountDescription: ''
  };

  transactionData.unshift(newTxn);

  if (transactionsGridApi) {
    transactionsGridApi.setGridOption('rowData', transactionData);
    transactionsGridApi.startEditingCell({
      rowIndex: 0,
      colKey: 'description'
    });
  }
}

function editTransaction(rowIndex) {
  if (transactionsGridApi) {
    transactionsGridApi.startEditingCell({
      rowIndex: rowIndex,
      colKey: 'description'
    });
  }
}

function deleteTransaction(rowIndex) {
  if (!confirm('Delete this transaction?')) return;

  const transaction = transactionData[rowIndex];
  transactionData.splice(rowIndex, 1);

  if (transactionsGridApi) {
    transactionsGridApi.setGridOption('rowData', transactionData);
  }

  saveTransactions();

  // Also delete from Supabase
  if (transaction.id && window.supabase) {
    window.supabase.deleteTransaction(transaction.id);
  }

  console.log('✅ Deleted transaction at index', rowIndex);
}

function onQuickFilterChange(searchText) {
  if (transactionsGridApi) {
    transactionsGridApi.setGridOption('quickFilterText', searchText);
  }
}

function exportToCSV() {
  if (transactionsGridApi) {
    transactionsGridApi.exportDataAsCsv({
      fileName: 'transactions.csv',
      columnKeys: ['refNumber', 'date', 'description', 'debit', 'credit', 'accountNumber', 'accountDescription']
    });
  }
}

/**
 * Detect if this is a credit card transaction based on description or account
 * Credit cards: Visa, Mastercard, MC, Amex, Discover, etc.
 */
function isCreditCardTransaction(transaction) {
  const desc = transaction.description.toLowerCase();
  const keywords = ['visa', 'mastercard', 'mc', 'amex', 'discover', 'credit card', 'cc'];

  // Check description
  if (keywords.some(kw => desc.includes(kw))) {
    return true;
  }

  // Check if account number matches credit card account (2120 = Credit Card - Business)
  if (transaction.accountNumber === '2120') {
    return true;
  }

  return false;
}

/**
 * Reverse debit/credit for credit card transactions
 * Bank: Debit = expense, Credit = income
 * Credit Card: Debit = income (payment towards card), Credit = expense (charge on card)
 */
function normalizeDebitCredit(transaction) {
  if (isCreditCardTransaction(transaction)) {
    // Swap debit and credit for credit cards
    const temp = transaction.debit;
    transaction.debit = transaction.credit;
    transaction.credit = temp;

    console.log(`🔄 Reversed debit/credit for credit card: ${transaction.description}`);
  }
}

/**
 * Save transactions to both localStorage and Supabase
 */
async function saveTransactions() {
  // Save to localStorage as backup
  localStorage.setItem('transactions', JSON.stringify(transactionData));

  // Save to Supabase
  if (window.supabase && typeof window.supabase.saveTransactions === 'function') {
    try {
      await window.supabase.saveTransactions(transactionData);
      console.log('✅ Transactions saved to Supabase');
    } catch (error) {
      console.error('❌ Failed to save to Supabase:', error);
    }
  } else {
    console.log('ℹ️ Supabase not available, saved to localStorage only');
  }
}

/**
 * Load transactions from Supabase or localStorage
 */
async function loadSavedTransactions() {
  // Try Supabase first
  if (window.supabase && typeof window.supabase.getTransactions === 'function') {
    try {
      const data = await window.supabase.getTransactions();
      if (data && data.length > 0) {
        transactionData = data;
        if (transactionsGridApi) {
          transactionsGridApi.setGridOption('rowData', transactionData);
        }
        console.log(`📂 Loaded ${transactionData.length} transactions from Supabase`);
        return;
      }
    } catch (error) {
      console.error('❌ Failed to load from Supabase:', error);
    }
  }

  // Fallback to localStorage
  const saved = localStorage.getItem('transactions');
  if (saved) {
    transactionData = JSON.parse(saved);
    if (transactionsGridApi) {
      transactionsGridApi.setGridOption('rowData', transactionData);
    }
    console.log(`📂 Loaded ${transactionData.length} transactions from localStorage`);
  }
}
