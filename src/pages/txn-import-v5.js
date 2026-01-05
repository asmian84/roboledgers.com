/**
 * Txn Import V5 - Unified Transaction Import Page
 * Combines: InlineImport Zone + AG Grid + 7-Method Categorization + Background Processing
 */

console.log('🚀 Loading Txn Import V5...');

// ============================================
// STATE MANAGEMENT
// ============================================

const V5State = {
  importZoneExpanded: true,
  gridData: [],
  importHistory: [],
  selectedFiles: [],
  gridApi: null,
  undoStack: [],
  isProcessing: false,
  currentProgress: { current: 0, total: 0, message: '' },
  openingBalance: 0.00
};

const V5_MAX_UNDO_STEPS = 10;

// ============================================
// COA HELPERS (5-Tier Compressed)
// ============================================

function get5TierCoAAccounts() {
  if (!window.storage) return [];

  const accounts = window.storage.getAccountsSync ?
    window.storage.getAccountsSync() :
    JSON.parse(localStorage.getItem('ab_accounts') || '[]');

  // Group into 5 tiers based on account code ranges
  const tiers = {
    ASSETS: [],
    LIABILITIES: [],
    EQUITY: [],
    REVENUE: [],
    EXPENSES: []
  };

  accounts.forEach(acc => {
    const code = parseInt(acc.code);
    if (code >= 1000 && code < 2000) tiers.ASSETS.push(acc);
    else if (code >= 2000 && code < 3000) tiers.LIABILITIES.push(acc);
    else if (code >= 3000 && code < 4000) tiers.EQUITY.push(acc);
    else if (code >= 4000 && code < 5000) tiers.REVENUE.push(acc);
    else if (code >= 5000 && code < 10000) tiers.EXPENSES.push(acc);
  });

  return tiers;
}

function resolveAccountName(val) {
  if (!val) return 'Uncategorized';
  const accounts = window.storage?.getAccountsSync?.() || [];
  const found = accounts.find(a => a.code === val || a.name === val);
  return found ? `${found.code} - ${found.name}` : val;
}

// ============================================
// UNDO SYSTEM
// ============================================

function captureState() {
  const state = {
    gridData: V5State.gridData.map(row => ({ ...row })),
    timestamp: Date.now()
  };

  V5State.undoStack.push(state);
  if (V5State.undoStack.length > V5_MAX_UNDO_STEPS) {
    V5State.undoStack.shift();
  }

  updateUndoButton();
}

function undoLastAction() {
  if (V5State.undoStack.length === 0) return;

  const previousState = V5State.undoStack.pop();
  V5State.gridData = previousState.gridData;

  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }

  updateUndoButton();
  saveData();
}

function updateUndoButton() {
  // Update menu text
  const menuText = document.getElementById('v5-undo-menu-text');
  if (menuText) {
    menuText.textContent = `Undo (${V5State.undoStack.length})`;
  }
}

// ============================================
// RECONCILIATION CARD HELPERS
// ============================================

function updateReconciliationCard() {
  if (V5State.gridData.length === 0) {
    document.getElementById('v5-recon-card').style.display = 'none';
    return;
  }

  // Show card
  document.getElementById('v5-recon-card').style.display = 'flex';

  // Calculate values
  let totalIn = 0;
  let totalOut = 0;
  let debitCount = 0;
  let creditCount = 0;

  V5State.gridData.forEach(txn => {
    const amount = parseFloat(txn.amount) || 0;
    if (amount > 0) {
      totalIn += amount;
      debitCount++;
    } else if (amount < 0) {
      totalOut += Math.abs(amount);
      creditCount++;
    }
  });

  // Get opening balance from first transaction or metadata
  const openingBal = V5State.openingBalance || 0.00;
  const endingBal = openingBal + totalIn - totalOut;

  // Update DOM
  document.getElementById('v5-opening-bal').textContent = `$${openingBal.toFixed(2)}`;
  document.getElementById('v5-total-in').textContent = `+${totalIn.toFixed(2)}`;
  document.getElementById('v5-debit-count').textContent = debitCount;
  document.getElementById('v5-total-out').textContent = `-${totalOut.toFixed(2)}`;
  document.getElementById('v5-credit-count').textContent = creditCount;
  document.getElementById('v5-ending-bal').textContent = `$${endingBal.toFixed(2)}`;
}

// ============================================
// SEARCH/FILTER FUNCTION
// ============================================

window.filterV5Grid = function (searchText) {
  if (!V5State.gridApi) return;

  V5State.gridApi.setQuickFilter(searchText);
}

// ============================================
// CUSTOM 5-TIER COA EDITOR
// ============================================

class FiveTierAccountEditor {
  init(params) {
    this.value = params.value;
    this.params = params;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'five-tier-editor';
    this.container.style.cssText = `
      position: absolute;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
    `;

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search accounts...';
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 8px;
      margin-bottom: 8px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
    `;
    this.searchInput.addEventListener('input', (e) => {
      this.renderList(e.target.value);
    });

    // List container
    this.listContainer = document.createElement('div');
    this.listContainer.className = 'tier-list';

    this.container.appendChild(this.searchInput);
    this.container.appendChild(this.listContainer);

    this.renderList();
  }

  renderList(filterText = '') {
    const tiers = get5TierCoAAccounts();
    this.listContainer.innerHTML = '';

    // Add "Uncategorized" option
    if (!filterText || 'uncategorized'.includes(filterText.toLowerCase())) {
      const uncatItem = document.createElement('div');
      uncatItem.className = 'tier-item uncategorized';
      uncatItem.textContent = '🔹 Uncategorized';
      uncatItem.style.cssText = `
        padding: 8px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
        color: #f59e0b;
        font-weight: 600;
      `;
      uncatItem.onclick = () => {
        this.value = 'Uncategorized';
        this.params.stopEditing();
      };
      this.listContainer.appendChild(uncatItem);
    }

    // Render each tier
    Object.entries(tiers).forEach(([tierName, accounts]) => {
      if (accounts.length === 0) return;

      // Filter accounts if search active
      const filtered = filterText ?
        accounts.filter(a =>
          a.name.toLowerCase().includes(filterText.toLowerCase()) ||
          a.code.includes(filterText)
        ) : accounts;

      if (filtered.length === 0) return;

      // Tier header
      const header = document.createElement('div');
      header.className = 'tier-header';
      header.textContent = `▶️ ${tierName}`;
      header.style.cssText = `
        padding: 8px;
        font-weight: 700;
        background: var(--bg-secondary);
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
      `;

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'tier-items';
      itemsContainer.style.display = filterText ? 'block' : 'none'; // Expand if searching

      header.onclick = () => {
        itemsContainer.style.display =
          itemsContainer.style.display === 'none' ? 'block' : 'none';
        header.textContent =
          itemsContainer.style.display === 'none' ?
            `▶️ ${tierName}` : `▼ ${tierName}`;
      };

      // Tier items
      filtered.forEach(account => {
        const item = document.createElement('div');
        item.className = 'tier-account';
        item.textContent = `${account.code} - ${account.name}`;
        item.style.cssText = `
          padding: 6px 8px 6px 20px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        `;
        item.onmouseenter = () => item.style.background = 'var(--bg-tertiary)';
        item.onmouseleave = () => item.style.background = 'transparent';
        item.onclick = () => {
          this.value = account.code;
          this.params.stopEditing();
        };

        itemsContainer.appendChild(item);
      });

      this.listContainer.appendChild(header);
      this.listContainer.appendChild(itemsContainer);
    });
  }

  getGui() {
    return this.container;
  }

  getValue() {
    return this.value;
  }

  isPopup() {
    return true;
  }

  destroy() {
    // Cleanup if needed
  }
}

// ====================================================================================
// MAIN RENDER FUNCTION
// ============================================

window.renderTxnImportV5Page = function () {
  return `
    <div class="txn-import-v5-container">
      
      <!-- Header - Single Line Design -->
      <div class="v5-header-unified">
        <!-- Left: Icon + Title -->
        <div class="v5-title-section">
          <div class="v5-page-icon">
            <i class="ph ph-arrow-square-down"></i>
          </div>
          <div class="v5-title-text">
            <h1>Transactions Import</h1>
            <p>Unified Staging & Ledger</p>
          </div>
        </div>
        
        <!-- Center: Search/Filter Box -->
        <div class="v5-search-box">
          <input type="text" 
                 id="v5-search-input" 
                 placeholder="Search transactions..." 
                 oninput="filterV5Grid(this.value)">
        </div>
        
        <!-- Right: Action Buttons -->
        <div class="v5-header-actions-inline">
          <button id="v5-start-over-btn" class="btn-secondary-sm" onclick="startOverV5()" title="Start Over">
            <i class="ph ph-arrows-counter-clockwise"></i>
            Start Over
          </button>
          
          <button id="v5-history-btn" class="btn-secondary-sm" onclick="toggleV5History()" title="Toggle History">
            <i class="ph ph-clock-counter-clockwise"></i>
            History
          </button>
          
          <button id="v5-popout-btn" class="btn-secondary-sm" onclick="popOutV5Grid()" title="Pop Out">
            <i class="ph ph-arrow-square-out"></i>
            Popout
          </button>
          
          <div class="dropdown">
            <button class="btn-secondary-sm" onclick="toggleV5Menu()" title="More Options">
              <i class="ph ph-dots-three"></i>
            </button>
            <div id="v5-dropdown-menu" class="dropdown-menu" style="display: none;">
              <button onclick="exportV5Excel()">
                <i class="ph ph-file-xls"></i>
                Export Excel
              </button>
              <button onclick="printV5Preview()">
                <i class="ph ph-printer"></i>
                PDF Print Preview
              </button>
              <button onclick="undoLastAction()">
                <i class="ph ph-arrow-counter-clockwise"></i>
                <span id="v5-undo-menu-text">Undo (0)</span>
              </button>
              <hr>
              <button onclick="showV5Appearance()">
                <i class="ph ph-palette"></i>
                Appearance
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Reconciliation Card -->
      <div class="v5-reconciliation-card" id="v5-recon-card" style="display: none;">
        <div class="v5-recon-item">
          <div class="v5-recon-label">OPENING BAL</div>
          <div class="v5-recon-value" id="v5-opening-bal">$0.00</div>
        </div>
        
        <div class="v5-recon-divider"></div>
        
        <div class="v5-recon-item">
          <div class="v5-recon-label">TOTAL IN</div>
          <div class="v5-recon-value positive">
            <span id="v5-total-in">+0.00</span>
            <sup id="v5-debit-count" class="v5-count-badge">0</sup>
          </div>
        </div>
        
        <div class="v5-recon-divider"></div>
        
        <div class="v5-recon-item">
          <div class="v5-recon-label">TOTAL OUT</div>
          <div class="v5-recon-value negative">
            <span id="v5-total-out">-0.00</span>
            <sup id="v5-credit-count" class="v5-count-badge">0</sup>
          </div>
        </div>
        
        <div class="v5-recon-divider"></div>
        
        <div class="v5-recon-item">
          <div class="v5-recon-label">ENDING BAL</div>
          <div class="v5-recon-value ending" id="v5-ending-bal">$0.00</div>
        </div>
      </div>
      
      <!-- Inline Import Zone (Collapsible) -->
      <div id="v5-import-zone" class="v5-import-zone collapsed">
        <div id="v5-import-content">
          <!-- Drag and Drop Area -->
          <div id="v5-drop-zone" class="v5-drop-zone" 
               ondragover="handleV5DragOver(event)" 
               ondrop="handleV5Drop(event)"
               ondragleave="handleV5DragLeave(event)">
            <i class="ph ph-cloud-arrow-down" style="font-size: 3rem; color: var(--primary-color);"></i>
            <h3>Drop PDF or CSV files here</h3>
            <p style="color: var(--text-secondary); margin: 8px 0;">or click to browse</p>
            <input type="file" id="v5-file-input" multiple 
                   accept=".pdf,.csv" 
                   style="display: none;" 
                   onchange="handleV5FileSelect(event)">
            <button class="btn-primary" onclick="document.getElementById('v5-file-input').click()">
              Browse Files
            </button>
          </div>
          
          <!-- Selected Files List -->
          <div id="v5-files-list" style="margin-top: 1rem; display: none;">
            <h4>Selected Files:</h4>
            <ul id="v5-files-ul" style="list-style: none; padding: 0;"></ul>
            <button class="btn-primary" onclick="parseV5Files()" id="v5-parse-btn">
              Parse Files
            </button>
            <button class="btn-secondary" onclick="clearV5Files()">
              Clear
            </button>
          </div>
          
          <!-- Progress Bar -->
          <div id="v5-progress-container" style="margin-top: 1rem; display: none;">
            <p id="v5-progress-message">Processing...</p>
            <div class="v5-progress-bar">
              <div id="v5-progress-fill" class="v5-progress-fill" style="width: 0%;"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State (shown when no data) -->
      <div id="v5-empty-state" class="v5-empty-state" style="display: none;">
        <div class="v5-empty-icon">
          <i class="ph ph-book-open-text" style="font-size: 8rem; color: var(--text-tertiary);"></i>
        </div>
        <h2>No transactions yet.</h2>
        <p style="color: var(--text-secondary);">
          Import your bank statement or add your first entry manually to get started.
        </p>
      </div>
      
      <!-- AG Grid -->
      <div id="v5-grid-container" class="v5-grid-container ag-theme-quartz" style="display: none;">
        <!-- Grid will be initialized here -->
      </div>
      
    </div>
  `;
};

// ============================================
// FILE UPLOAD HANDLERS
// ============================================

window.handleV5DragOver = function (e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
};

window.handleV5DragLeave = function (e) {
  e.currentTarget.classList.remove('drag-over');
};

window.handleV5Drop = function (e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drag-over');

  const files = Array.from(e.dataTransfer.files).filter(f =>
    f.name.endsWith('.pdf') || f.name.endsWith('.csv')
  );

  if (files.length > 0) {
    V5State.selectedFiles = files;
    displayV5SelectedFiles();
  }
};

window.handleV5FileSelect = function (e) {
  const files = Array.from(e.target.files);
  V5State.selectedFiles = files;
  displayV5SelectedFiles();
};

function displayV5SelectedFiles() {
  const filesList = document.getElementById('v5-files-list');
  const filesUl = document.getElementById('v5-files-ul');

  filesUl.innerHTML = '';
  V5State.selectedFiles.forEach(file => {
    const li = document.createElement('li');
    li.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    li.style.padding = '4px 0';
    filesUl.appendChild(li);
  });

  filesList.style.display = 'block';
}

window.clearV5Files = function () {
  V5State.selectedFiles = [];
  document.getElementById('v5-files-list').style.display = 'none';
  document.getElementById('v5-file-input').value = '';
};

// ============================================
// PARSE FILES (BACKGROUND PROCESSING)
// ============================================

window.parseV5Files = async function () {
  if (V5State.selectedFiles.length === 0) return;

  V5State.isProcessing = true;
  document.getElementById('v5-parse-btn').disabled = true;
  document.getElementById('v5-progress-container').style.display = 'block';

  try {
    // Use ProcessingEngine for background parsing
    const transactions = await window.ProcessingEngine.parseFiles(
      V5State.selectedFiles,
      updateV5Progress
    );

    // Categorize using all 7 methods
    updateV5Progress(0, 1, 'Categorizing transactions...');
    const categorized = await window.ProcessingEngine.categorizeTransactions(
      transactions,
      (progress, message) => {
        updateV5Progress(progress, 100, message);
      }
    );

    // Load into grid
    V5State.gridData = categorized;
    initV5Grid();

    // Save to cache
    await window.CacheManager.saveTransactions(categorized);

    // Add to history
    const historyEntry = {
      id: Date.now(),
      files: V5State.selectedFiles.map(f => f.name),
      count: categorized.length,
      timestamp: new Date().toISOString()
    };
    await window.CacheManager.saveImportHistoryEntry(historyEntry);

    // Clear files and hide import zone
    clearV5Files();
    document.getElementById('v5-import-zone').classList.remove('expanded');
    document.getElementById('v5-import-zone').classList.add('collapsed');
    V5State.importZoneExpanded = false;

    // Show success
    if (window.showToast) {
      window.showToast('success', `Imported ${categorized.length} transactions`);
    }

  } catch (error) {
    console.error('Parse failed:', error);
    if (window.showToast) {
      window.showToast('error', 'Failed to parse files');
    }
  } finally {
    V5State.isProcessing = false;
    document.getElementById('v5-parse-btn').disabled = false;
    document.getElementById('v5-progress-container').style.display = 'none';
  }
};

function updateV5Progress(current, total, message) {
  const fill = document.getElementById('v5-progress-fill');
  const msg = document.getElementById('v5-progress-message');

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  fill.style.width = `${percentage}%`;
  msg.textContent = message || `Processing (${current}/${total})...`;


  V5State.currentProgress = { current, total, message };
}

// ============================================
// AG GRID INITIALIZATION WITH KEYBOARD SHORTCUTS
// ============================================

window.initV5Grid = function () {
  const container = document.getElementById('v5-grid-container');
  if (!container) return;

  // Hide empty state, show grid
  document.getElementById('v5-empty-state').style.display = 'none';
  container.style.display = 'block';

  const columnDefs = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50,
      pinned: 'left'
    },
    {
      headerName: 'Date',
      field: 'date',
      width: 120,
      editable: true,
      valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString() : ''
    },
    {
      headerName: 'Description',
      field: 'description',
      width: 250,
      editable: true
    },
    {
      headerName: 'Merchant',
      field: 'merchant',
      width: 180,
      editable: true
    },
    {
      headerName: 'Amount',
      field: 'amount',
      width: 120,
      editable: true,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return '$' + val.toFixed(2);
      }
    },
    {
      headerName: 'Category',
      field: 'category',
      width: 200,
      editable: true
    },
    {
      headerName: 'Account',
      field: 'account',
      width: 250,
      editable: true,
      cellEditor: FiveTierAccountEditor,
      valueFormatter: params => resolveAccountName(params.value)
    },
    {
      headerName: 'Notes',
      field: 'notes',
      width: 300,
      editable: true
    }
  ];

  const gridOptions = {
    columnDefs,
    rowData: V5State.gridData,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    rowSelection: 'multiple',
    onCellValueChanged: (params) => {
      captureState();
      saveData();

      // Machine learning
      if (params.colDef.field === 'category') {
        window.ProcessingEngine.learnFromUserAction('category_change', {
          description: params.data.description,
          newCategory: params.newValue
        });
      }
    },
    onSelectionChanged: () => {
      updateSelectionCount();
    },
    onGridReady: (params) => {
      V5State.gridApi = params.api;
      params.api.sizeColumnsToFit();
    }
  };

  // Initialize grid
  agGrid.createGrid(container, gridOptions);

  // Add keyboard shortcut listeners
  setupV5KeyboardShortcuts();

  // Update reconciliation card
  updateReconciliationCard();
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupV5KeyboardShortcuts() {
  document.addEventListener('keydown', handleV5KeyboardShortcut);
}

function handleV5KeyboardShortcut(e) {
  const isCtrl = e.ctrlKey || e.metaKey;

  // Only active if grid is visible
  if (document.getElementById('v5-grid-container').style.display === 'none') return;

  // Ctrl+Z: Undo
  if (isCtrl && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undoLastAction();
  }

  // Ctrl+S: Save
  if (isCtrl && e.key === 's') {
    e.preventDefault();
    saveData();
    if (window.showToast) {
      window.showToast('success', 'Data saved');
    }
  }

  // Delete: Delete selected rows
  if (e.key === 'Delete' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    deleteV5SelectedRows();
  }
}

// ============================================
// ACTION HANDLERS
// ============================================

window.toggleV5History = function () {
  const zone = document.getElementById('v5-import-zone');
  const chevron = document.getElementById('v5-history-chevron');

  V5State.importZoneExpanded = !V5State.importZoneExpanded;

  if (V5State.importZoneExpanded) {
    zone.classList.remove('collapsed');
    zone.classList.add('expanded');
    chevron.classList.remove('ph-caret-down');
    chevron.classList.add('ph-caret-up');
  } else {
    zone.classList.remove('expanded');
    zone.classList.add('collapsed');
    chevron.classList.remove('ph-caret-up');
    chevron.classList.add('ph-caret-down');
  }
};

window.startOverV5 = async function () {
  if (!confirm('This will clear all transactions and history. Are you sure?')) return;

  V5State.gridData = [];
  V5State.importHistory = [];
  V5State.undoStack = [];

  await window.CacheManager.clearAll();

  // Hide grid, show empty state
  document.getElementById('v5-grid-container').style.display = 'none';
  document.getElementById('v5-empty-state').style.display = 'flex';

  // Reset UI
  updateUndoButton();

  if (window.showToast) {
    window.showToast('success', 'All data cleared');
  }
};

window.popOutV5Grid = function () {
  const popOutWindow = window.open('', 'V5GridPopOut', 'width=1200,height=800');

  if (!popOutWindow) {
    alert('Popup blocked! Please allow popups for this site.');
    return;
  }

  popOutWindow.document.write(`
    <html>
      <head>
        <title>Transaction Grid - Pop Out</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-grid.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-theme-quartz.css">
        <style>
          body { margin: 0; padding: 16px; background: #f8fafc; }
          #popout-grid { width: 100%; height: calc(100vh - 32px); }
        </style>
      </head>
      <body>
        <div id="popout-grid" class="ag-theme-quartz"></div>
        <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/dist/ag-grid-community.min.js"><\/script>
        <script>
          const gridData = ${JSON.stringify(V5State.gridData)};
          const columnDefs = [
            { headerName: 'Date', field: 'date', width: 120 },
            { headerName: 'Description', field: 'description', width: 250 },
            { headerName: 'Merchant', field: 'merchant', width: 180 },
            { headerName: 'Amount', field: 'amount', width: 120 },
            { headerName: 'Category', field: 'category', width: 200 },
            { headerName: 'Account', field: 'account', width: 250 },
            { headerName: 'Notes', field: 'notes', width: 300 }
          ];
          
          const gridOptions = {
            columnDefs,
            rowData: gridData,
            defaultColDef: { sortable: true, filter: true, resizable: true }
          };
          
          agGrid.createGrid(document.getElementById('popout-grid'), gridOptions);
        <\/script>
      </body>
    </html>
  `);
};

window.toggleV5Menu = function () {
  const menu = document.getElementById('v5-dropdown-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

window.exportV5Excel = function () {
  if (!V5State.gridApi) return;
  V5State.gridApi.exportDataAsExcel({
    fileName: `transactions_${new Date().toISOString().split('T')[0]}.xlsx`
  });

  if (window.showToast) {
    window.showToast('success', 'Excel file downloaded');
  }
};

window.printV5Preview = function () {
  window.print();
};

window.showV5Appearance = function () {
  alert('Appearance settings: Redirect to Settings > Appearance');
};

function deleteV5SelectedRows() {
  if (!V5State.gridApi) return;

  const selectedRows = V5State.gridApi.getSelectedRows();
  if (selectedRows.length === 0) return;

  if (!confirm(`Delete ${selectedRows.length} selected transaction(s)?`)) return;

  captureState();

  const selectedIds = selectedRows.map(r => r.id);
  V5State.gridData = V5State.gridData.filter(r => !selectedIds.includes(r.id));

  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  saveData();

  if (window.showToast) {
    window.showToast('success', `Deleted ${selectedRows.length} transaction(s)`);
  }
}

function updateSelectionCount() {
  if (!V5State.gridApi) return;
  const count = V5State.gridApi.getSelectedRows().length;
}

// ============================================
// DATA PERSISTENCE
// ============================================

async function saveData() {
  await window.CacheManager.saveTransactions(V5State.gridData);

  // Background sync to Supabase
  if (window.CacheManager.syncToSupabase) {
    window.CacheManager.syncToSupabase(V5State.gridData);
  }
}

async function loadData() {
  const cached = await window.CacheManager.getTransactions();

  if (cached && cached.length > 0) {
    V5State.gridData = cached;
    initV5Grid();
  } else {
    // Show empty state
    document.getElementById('v5-empty-state').style.display = 'flex';
  }
}

// ============================================
// AUTO-INITIALIZE
// ============================================

window.initTxnImportV5Grid = async function () {
  // Load cached data on page load
  await loadData();
};

console.log('✅ Txn Import V5 loaded successfully');

