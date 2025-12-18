/**
 * Transactions Page - AG Grid with Full Features
 */

window.renderTransactions = function () {
  return `
    <div class="transactions-page">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="btn-primary" onclick="addNewTransaction()">
            ➕ Add Transaction
          </button>
          <button class="btn-secondary" id="bulk-delete-btn" onclick="bulkDelete()" disabled>
            🗑️ Delete Selected
          </button>
          <span id="selection-count" class="selection-count"></span>
        </div>
        
        <div class="toolbar-right">
          <input 
            type="search" 
            id="search-input" 
            class="search-input" 
            placeholder="Search transactions..." 
            oninput="onQuickFilterChange(this.value)"
          >
          <button class="btn-secondary" onclick="exportToExcel()">📊 Export Excel</button>
          <button class="btn-secondary" onclick="exportToCSV()">📄 Export CSV</button>
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

// Custom Cell Renderers
class VendorCellRenderer {
  init(params) {
    this.eGui = document.createElement('div');
    this.eGui.className = 'vendor-cell-content';

    if (params.value) {
      this.eGui.innerHTML = `<span class="vendor-name clickable">\ud83c\udfe2 ${params.value}</span>`;
      this.eGui.querySelector('.vendor-name').addEventListener('click', (e) => {
        e.stopPropagation();
        console.log('Navigate to vendor:', params.value);
      });
    } else {
      this.eGui.innerHTML = '<span class="no-vendor">No vendor</span>';
    }
  }

  getGui() {
    return this.eGui;
  }

  refresh() {
    return false;
  }
}

class AmountCellRenderer {
  init(params) {
    this.eGui = document.createElement('div');
    this.eGui.className = 'amount-cell-content';

    const amount = params.value || 0;
    const type = params.data.type;
    const isExpense = type === 'debit';

    const className = isExpense ? 'amount-expense' : 'amount-income';
    const formatted = window.DataUtils ? window.DataUtils.formatCurrency(amount) : `$${amount.toFixed(2)}`;

    this.eGui.innerHTML = `<span class="${className}">${formatted}</span>`;
  }

  getGui() {
    return this.eGui;
  }

  refresh() {
    return false;
  }
}

class ActionsCellRenderer {
  init(params) {
    this.eGui = document.createElement('div');
    this.eGui.className = 'actions-cell-content';

    this.eGui.innerHTML = `
      <button class="btn-icon btn-edit" title="Edit">\u270f\ufe0f</button>
      <button class="btn-icon btn-delete" title="Delete">\ud83d\uddd1\ufe0f</button>
    `;

    this.eGui.querySelector('.btn-edit').addEventListener('click', () => {
      params.api.startEditingCell({
        rowIndex: params.rowIndex,
        colKey: 'description'
      });
    });

    this.eGui.querySelector('.btn-delete').addEventListener('click', async () => {
      if (confirm('Delete this transaction?')) {
        params.api.applyTransaction({ remove: [params.data] });
        console.log('Deleted transaction:', params.data.id);
      }
    });
  }

  getGui() {
    return this.eGui;
  }

  refresh() {
    return false;
  }
}

async function initTransactionsGrid() {
  console.log('\ud83d\udd37 Initializing Transactions Grid...');

  const columnDefs = [
    {
      headerName: '',
      field: 'selected',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left',
      lockPosition: true,
      suppressMenu: true,
      sortable: false,
      filter: false
    },
    {
      headerName: 'Date',
      field: 'date',
      width: 120,
      filter: 'agDateColumnFilter',
      editable: true,
      sort: 'desc',
      pinned: 'left',
      valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString() : ''
    },
    {
      headerName: 'Description',
      field: 'description',
      width: 250,
      filter: 'agTextColumnFilter',
      editable: true,
      tooltipField: 'description'
    },
    {
      headerName: 'Vendor',
      field: 'vendor',
      width: 180,
      filter: 'agTextColumnFilter',
      cellRenderer: VendorCellRenderer
    },
    {
      headerName: 'Account',
      field: 'accountName',
      width: 200,
      filter: 'agSetColumnFilter',
      editable: true
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 150,
      filter: 'agSetColumnFilter',
      editable: true
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 130,
      filter: 'agNumberColumnFilter',
      editable: true,
      cellRenderer: AmountCellRenderer,
      type: 'numericColumn',
      aggFunc: 'sum'
    },
    {
      headerName: 'Type',
      field: 'type',
      width: 100,
      filter: 'agSetColumnFilter',
      editable: true,
      cellRenderer: params => {
        const badge = params.value === 'debit'
          ? '<span class="badge badge-expense">Expense</span>'
          : '<span class="badge badge-income">Income</span>';
        return badge;
      }
    },
    {
      headerName: 'Reconciled',
      field: 'reconciled',
      width: 120,
      filter: 'agSetColumnFilter',
      cellRenderer: params => {
        return params.value
          ? '<span class="status-reconciled">\u2713 Reconciled</span>'
          : '<span class="status-unreconciled">Unreconciled</span>';
      }
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 100,
      pinned: 'right',
      lockPosition: true,
      suppressMenu: true,
      cellRenderer: ActionsCellRenderer,
      sortable: false,
      filter: false
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: [],

    rowSelection: 'multiple',
    suppressRowClickSelection: true,

    editType: 'fullRow',
    stopEditingWhenCellsLoseFocus: true,

    onCellValueChanged: async event => {
      console.log('Cell changed:', event);
    },

    pagination: true,
    paginationPageSize: 50,
    paginationPageSizeSelector: [25, 50, 100, 200],

    animateRows: true,

    onRowSelected: event => {
      updateBulkActionsToolbar();
    },

    onGridReady: event => {
      console.log('\u2705 Transactions grid ready');
      loadTransactions();
    },

    onFirstDataRendered: event => {
      event.api.sizeColumnsToFit();
    },

    statusBar: {
      statusPanels: [
        { statusPanel: 'agTotalRowCountComponent', align: 'left' },
        { statusPanel: 'agFilteredRowCountComponent' },
        { statusPanel: 'agSelectedRowCountComponent' },
        {
          statusPanel: 'agAggregationComponent',
          statusPanelParams: { aggFuncs: ['sum', 'avg', 'min', 'max'] }
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
  }
}

async function loadTransactions() {
  try {
    const transactions = await window.storage.getTransactions();
    if (transactionsGridApi) {
      transactionsGridApi.setGridOption('rowData', transactions);
    }
  } catch (error) {
    console.error('Failed to load transactions:', error);
  }
}

function updateBulkActionsToolbar() {
  if (!transactionsGridApi) return;

  const selectedRows = transactionsGridApi.getSelectedRows();
  const count = selectedRows.length;

  const bulkBtn = document.getElementById('bulk-delete-btn');
  const countSpan = document.getElementById('selection-count');

  if (bulkBtn) {
    bulkBtn.disabled = count === 0;
  }

  if (countSpan) {
    countSpan.textContent = count > 0 ? `${count} selected` : '';
  }
}

function addNewTransaction() {
  const newTxn = {
    id: Date.now(),
    date: new Date().toISOString().split('T')[0],
    description: 'New Transaction',
    vendor: '',
    accountName: '',
    category: '',
    amount: 0,
    type: 'debit',
    reconciled: false
  };

  if (transactionsGridApi) {
    transactionsGridApi.applyTransaction({ add: [newTxn], addIndex: 0 });
    transactionsGridApi.startEditingCell({
      rowIndex: 0,
      colKey: 'description'
    });
  }
}

function bulkDelete() {
  if (!transactionsGridApi) return;

  const selectedRows = transactionsGridApi.getSelectedRows();
  if (selectedRows.length === 0) return;

  if (confirm(`Delete ${selectedRows.length} transactions?`)) {
    transactionsGridApi.applyTransaction({ remove: selectedRows });
    updateBulkActionsToolbar();
  }
}

function onQuickFilterChange(searchText) {
  if (transactionsGridApi) {
    transactionsGridApi.setGridOption('quickFilterText', searchText);
  }
}

function exportToExcel() {
  if (transactionsGridApi) {
    transactionsGridApi.exportDataAsExcel({
      fileName: 'transactions.xlsx',
      sheetName: 'Transactions'
    });
  }
}

function exportToCSV() {
  if (transactionsGridApi) {
    transactionsGridApi.exportDataAsCsv({
      fileName: 'transactions.csv'
    });
  }
}
