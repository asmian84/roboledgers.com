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

    if (values.length >= 5) {
      const transaction = {
        refNumber: values[0] || `REF${Date.now()}-${i}`,
        date: values[1] || new Date().toISOString().split('T')[0],
        description: values[2] || '',
        debit: parseFloat(values[3]) || 0,
        credit: parseFloat(values[4]) || 0,
        accountNumber: values[5] || '',
        accountDescription: values[6] || ''
      };

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

  transactionData.splice(rowIndex, 1);

  if (transactionsGridApi) {
    transactionsGridApi.setGridOption('rowData', transactionData);
  }

  saveTransactions();
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

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactionData));
}

function loadSavedTransactions() {
  const saved = localStorage.getItem('transactions');
  if (saved) {
    transactionData = JSON.parse(saved);
    if (transactionsGridApi) {
      transactionsGridApi.setGridOption('rowData', transactionData);
    }
    console.log(`📂 Loaded ${transactionData.length} saved transactions`);
  }
}
