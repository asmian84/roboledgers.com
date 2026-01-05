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
      
      <!-- Header - Icon + Title + Reconciliation Balances + Browse/Drop + Actions -->
      <div class="v5-header-unified">
        <!-- Left: Icon + Title -->
        <div class="v5-title-section">
          <div class="v5-page-icon">
            <i class="ph ph-arrow-square-down"></i>
          </div>
          <div class="v5-title-text">
            <h1>Imported Transactions (Grid)</h1>
            <p class="v5-subtitle">
              <span class="v5-account-type">CHECKING</span>
              <span class="v5-dot">•</span>
              <span class="v5-status">Ready for Review</span>
            </p>
          </div>
        </div>
        
        <!-- Center: Reconciliation Balances (shown when data loaded) -->
        <div class="v5-recon-inline" id="v5-recon-inline" style="display: none;">
          <div class="v5-recon-mini">
            <div class="v5-recon-mini-label">OPENING BAL</div>
            <div class="v5-recon-mini-value" id="v5-opening-bal-mini">$0</div>
          </div>
          <div class="v5-recon-mini">
            <div class="v5-recon-mini-label">TOTAL IN</div>
            <div class="v5-recon-mini-value positive" id="v5-total-in-mini">+0.00</div>
          </div>
          <div class="v5-recon-mini">
            <div class="v5-recon-mini-label">TOTAL OUT</div>
            <div class="v5-recon-mini-value negative" id="v5-total-out-mini">-0.00</div>
          </div>
          <div class="v5-recon-mini ending">
            <div class="v5-recon-mini-label">ENDING BAL</div>
            <div class="v5-recon-mini-value" id="v5-ending-bal-mini">$0.00</div>
          </div>
        </div>
        
        <!-- Center-Right: Browse/Drop Files (always visible) -->
        <div class="v5-browse-section">
          <button class="btn-browse" onclick="document.getElementById('v5-file-input').click()">
            <i class="ph ph-cloud-arrow-up"></i>
            Browse / Drop Files
          </button>
          <input type="file" id="v5-file-input" multiple accept=".pdf,.csv" 
                 style="display: none;" onchange="handleV5FileSelect(event)">
        </div>
        
        <!-- Right: Icon Actions + Help + Menu -->
        <div class="v5-header-actions-basic">
          <button class="btn-icon" onclick="startOverV5()" title="Start Over">
            <i class="ph ph-arrows-counter-clockwise"></i>
          </button>
          <button class="btn-icon" onclick="toggleV5History()" title="Toggle History" id="v5-history-toggle-btn">
            <i class="ph ph-clock-counter-clockwise"></i>
          </button>
          <button class="btn-icon" onclick="popOutV5Grid()" title="Pop Out">
            <i class="ph ph-arrow-square-out"></i>
          </button>
          <button class="btn-icon" onclick="showKeyboardShortcuts()" title="Keyboard Shortcuts">
            <i class="ph ph-question"></i>
          </button>
          <div class="v5-menu-wrapper">
            <button class="btn-icon" onclick="toggleV5HeaderMenu()" title="More" id="v5-header-menu-btn">
              <i class="ph ph-dots-three"></i>
            </button>
            <div id="v5-header-dropdown" class="v5-dropdown-menu" style="display: none;">
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
      
      <!-- Action Bar - Only shown when grid has data -->
      <div class="v5-action-bar" id="v5-action-bar" style="display: none;">
        <!-- Left: Selection Count (shown when selected) -->
        <div class="v5-selection-info" id="v5-selection-info" style="display: none;">
          <span id="v5-selection-count">0 selected</span>
        </div>
        
        <!-- Center: Bulk Actions (only shown when rows selected) -->
        <div class="v5-actions-center">
          <button class="btn-action" onclick="bulkCategorizeV5()" id="v5-bulk-categorize-btn" style="display: none;">
            <i class="ph ph-tag"></i>
            Bulk Categorize
          </button>
          
          <button class="btn-action" onclick="bulkRenameV5()" id="v5-bulk-rename-btn" style="display: none;">
            <i class="ph ph-pencil"></i>
            Bulk Rename
          </button>
          
          <button class="btn-action-secondary" onclick="clearV5Selection()" id="v5-clear-btn" style="display: none;">
            <i class="ph ph-x"></i>
            Clear
          </button>
          
          <button class="btn-action-blue" onclick="autoCategorizeV5()" id="v5-auto-categorize-btn">
            <i class="ph ph-magic-wand"></i>
            Auto-Categorize
          </button>
        </div>
        
        <!-- Right: Search + Menu -->
        <div class="v5-actions-right">
          <div class="v5-search-compact">
            <i class="ph ph-magnifying-glass"></i>
            <input type="text" 
                   id="v5-search-input" 
                   placeholder="Search transactions..." 
                   oninput="filterV5Grid(this.value)">
          </div>
          
          <div class="v5-menu-wrapper">
            <button class="btn-icon" onclick="toggleV5ActionMenu()" title="More Actions" id="v5-action-menu-btn">
              <i class="ph ph-dots-three-vertical"></i>
            </button>
            <div id="v5-action-dropdown" class="v5-dropdown-menu" style="display: none;">
              <button onclick="exportSelected()">
                <i class="ph ph-export"></i>
                Export Selected
              </button>
              <button onclick="deleteSelected()">
                <i class="ph ph-trash"></i>
                Delete Selected
              </button>
              <hr>
              <button onclick="selectAllV5()">
                <i class="ph ph-check-square"></i>
                Select All
              </button>
              <button onclick="deselectAllV5()">
                <i class="ph ph-square"></i>
                Deselect All
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Collapsible History Zone -->
      <div id="v5-history-zone" class="v5-history-zone collapsed">
        <div class="v5-history-content">
          <h3>Import History</h3>
          <div id="v5-history-list">
            <p style="color: var(--text-secondary); padding: 1rem;">No import history yet.</p>
          </div>
        </div>
      </div>
      
      <!-- Drag & Drop Overlay (shown when dragging files over entire page) -->
      <div id="v5-drop-overlay" class="v5-drop-overlay" style="display: none;"
           ondragover="handleV5DragOver(event)" 
           ondrop="handleV5Drop(event)"
           ondragleave="handleV5DragLeave(event)">
        <div class="v5-drop-overlay-content">
          <i class="ph ph-cloud-arrow-down" style="font-size: 4rem;"></i>
          <h2>Drop files here to import</h2>
          <p>PDF or CSV bank statements</p>
        </div>
      </div>
      
      <!-- Progress Indicator (shown during parsing) -->
      <div id="v5-progress-container" class="v5-progress-container" style="display: none;">
        <div class="v5-progress-content">
          <p id="v5-progress-message">Processing files...</p>
          <div class="v5-progress-bar">
            <div id="v5-progress-fill" class="v5-progress-fill" style="width: 0%;"></div>
          </div>
        </div>
      </div>
      
      <!-- Empty State (shown when no data) -->
      <div id="v5-empty-state" class="v5-empty-state">
        <div class="v5-empty-icon">
          <i class="ph ph-book-open-text" style="font-size: 8rem; color: var(--text-tertiary);"></i>
        </div>
        <h2>No transactions yet.</h2>
        <p style="color: var(--text-secondary);">
          Import your bank statement or add your first entry manually to get started.
        </p>
      </div>
      
      <!-- AG Grid -->
      <div id="v5-grid-container" class="v5-grid-container ag-theme-alpine" style="min-height: 500px;">
        <!-- Grid will be initialized here -->
      </div>
      
    </div>
  `;
};

// ============================================
// UI INTERACTION HANDLERS
// ============================================

window.toggleV5History = function () {
  const zone = document.getElementById('v5-history-zone');
  const btn = document.getElementById('v5-history-toggle-btn');

  if (zone.classList.contains('collapsed')) {
    zone.classList.remove('collapsed');
    zone.classList.add('expanded');
  } else {
    zone.classList.remove('expanded');
    zone.classList.add('collapsed');
  }
};

window.toggleV5HeaderMenu = function () {
  const menu = document.getElementById('v5-header-dropdown');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

  // Close on click outside
  if (menu.style.display === 'block') {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
};

window.toggleV5ActionMenu = function () {
  const menu = document.getElementById('v5-action-dropdown');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

  if (menu.style.display === 'block') {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
};

// ============================================
// ACCOUNT TYPE DETECTION
// ============================================

function detectAccountType(transactions) {
  if (!transactions || transactions.length === 0) return 'CHECKING';

  // Analyze transaction pattern
  let positiveCount = 0;
  let negativeCount = 0;
  let totalPositive = 0;
  let totalNegative = 0;

  transactions.forEach(txn => {
    const amount = parseFloat(txn.amount) || 0;
    if (amount > 0) {
      positiveCount++;
      totalPositive += amount;
    } else if (amount < 0) {
      negativeCount++;
      totalNegative += Math.abs(amount);
    }
  });

  // Credit Card Pattern: Mostly positive (charges), few large negatives (payments)
  // Bank Account Pattern: Mix or mostly negative (withdrawals more common)

  const positiveRatio = positiveCount / transactions.length;

  // If 70%+ transactions are positive AND average positive is small (typical purchases)
  // AND there are a few large negatives (payments) → Credit Card
  if (positiveRatio > 0.7 && positiveCount > 0) {
    const avgPositive = totalPositive / positiveCount;
    const avgNegative = negativeCount > 0 ? totalNegative / negativeCount : 0;

    // Credit cards: many small charges, few large payments
    if (avgNegative > avgPositive * 3) {
      return 'CREDIT_CARD';
    }
  }

  // Default to bank account
  return 'CHECKING';
}

// ============================================
// DEBIT/CREDIT/BALANCE HELPERS
// ============================================

function updateRowBalance(row) {
  // Balance is computed from running total
  // This should be recalculated for entire grid when any row changes
  recalculateAllBalances();
}

function recalculateAllBalances() {
  if (!V5State.gridData || V5State.gridData.length === 0) return;

  const isCreditCard = V5State.accountType === 'CREDIT_CARD';

  let runningBalance = V5State.openingBalance || 0;

  V5State.gridData.forEach(txn => {
    const debit = parseFloat(txn.debit) || 0;
    const credit = parseFloat(txn.credit) || 0;

    if (isCreditCard) {
      // Credit Card (Liability): Balance = Opening - Debit + Credit
      // Payments (debit) reduce what you owe, Purchases (credit) increase what you owe
      runningBalance = runningBalance - debit + credit;
    } else {
      // Bank Account (Asset): Balance = Opening + Debit - Credit
      // Deposits (debit) increase balance, Withdrawals (credit) decrease balance
      runningBalance = runningBalance + debit - credit;
    }

    txn.balance = runningBalance;
  });

  // Refresh grid to show updated balances
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }

  // Update reconciliation card
  updateReconciliationCard();
}

window.swapDebitCredit = function (rowId) {
  const row = V5State.gridData.find(r => r.id === rowId);
  if (!row) return;

  // Swap debit and credit
  const temp = row.debit;
  row.debit = row.credit;
  row.credit = temp;

  // Recalculate all balances
  recalculateAllBalances();
};

window.deleteRow = function (rowId) {
  const index = V5State.gridData.findIndex(r => r.id === rowId);
  if (index === -1) return;

  // Remove row
  V5State.gridData.splice(index, 1);

  // Recalculate all balances
  recalculateAllBalances();
};

// ============================================
// BULK ACTION FUNCTIONS
// ============================================

window.bulkCategorizeV5 = function () {
  const selected = V5State.gridApi?.getSelectedRows() || [];
  if (selected.length === 0) {
    // Toast removed
    return;
  }

  // Toast removed
  // TODO: Implement bulk categorization modal
};

window.bulkRenameV5 = function () {
  const selected = V5State.gridApi?.getSelectedRows() || [];
  if (selected.length === 0) {
    // Toast removed
    return;
  }

  // Toast removed
  // TODO: Implement bulk rename modal
};

window.clearV5Selection = function () {
  V5State.gridApi?.deselectAll();
  updateV5SelectionUI();
};

window.autoCategorizeV5 = async function () {
  if (V5State.gridData.length === 0) {
    // Toast removed
    return;
  }

  // Toast removed

  const categorized = await window.ProcessingEngine.categorizeTransactions(
    V5State.gridData,
    (progress, message) => {
      console.log(`Progress: ${progress}% - ${message}`);
    }
  );

  V5State.gridData = categorized;
  V5State.gridApi?.setRowData(categorized);
  updateReconciliationCard();

  // Toast removed
};

window.reviewMatchesV5 = function () {
  // TODO: Show review UI for matched transactions
  // Toast removed
};

// ============================================
// SELECTION UI UPDATE
// ============================================

function updateV5SelectionUI() {
  const selectedCount = V5State.gridApi?.getSelectedRows()?.length || 0;
  const selectionInfo = document.getElementById('v5-selection-info');
  const selectionCount = document.getElementById('v5-selection-count');
  const bulkCategorizeBtn = document.getElementById('v5-bulk-categorize-btn');
  const bulkRenameBtn = document.getElementById('v5-bulk-rename-btn');
  const clearBtn = document.getElementById('v5-clear-btn');

  if (selectedCount > 0) {
    selectionInfo.style.display = 'block';
    selectionCount.textContent = `${selectedCount} selected`;
    bulkCategorizeBtn.style.display = 'flex';
    bulkRenameBtn.style.display = 'flex';
    clearBtn.style.display = 'flex';
  } else {
    selectionInfo.style.display = 'none';
    bulkCategorizeBtn.style.display = 'none';
    bulkRenameBtn.style.display = 'none';
    clearBtn.style.display = 'none';
  }
}

// Grid selection helpers
window.selectAllV5 = function () {
  V5State.gridApi?.selectAll();
};

window.deselectAllV5 = function () {
  V5State.gridApi?.deselectAll();
};

// ============================================
// RECONCILIATION UPDATE (REVISED)
// ============================================

function updateReconciliationCard() {
  if (V5State.gridData.length === 0) {
    document.getElementById('v5-recon-inline').style.display = 'none';
    return;
  }

  // Show inline recon
  document.getElementById('v5-recon-inline').style.display = 'flex';

  // Calculate values
  let totalIn = 0;
  let totalOut = 0;

  V5State.gridData.forEach(txn => {
    const amount = parseFloat(txn.amount) || 0;
    if (amount > 0) {
      totalIn += amount;
    } else if (amount < 0) {
      totalOut += Math.abs(amount);
    }
  });

  const openingBal = V5State.openingBalance || 0.00;
  const endingBal = openingBal + totalIn - totalOut;

  // Update inline display
  document.getElementById('v5-opening-bal-mini').textContent = `$${openingBal.toFixed(0)}`;
  document.getElementById('v5-total-in-mini').textContent = `+${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('v5-total-out-mini').textContent = `-${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
  document.getElementById('v5-ending-bal-mini').textContent = `$${endingBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;
}

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

  // Hide overlay
  document.getElementById('v5-drop-overlay').style.display = 'none';

  const files = Array.from(e.dataTransfer.files).filter(f =>
    f.name.endsWith('.pdf') || f.name.endsWith('.csv')
  );

  if (files.length > 0) {
    V5State.selectedFiles = files;

    // Automatically start parsing
    parseV5Files();
  }
};

window.handleV5FileSelect = function (e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  V5State.selectedFiles = files;

  // Automatically start parsing
  parseV5Files();
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
  document.getElementById('v5-file-input').value = '';
};

// ============================================
// PARSE FILES (BACKGROUND PROCESSING)
// ============================================

window.parseV5Files = async function () {
  if (V5State.selectedFiles.length === 0) return;

  V5State.isProcessing = true;
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

    // AUTO-DETECT account type from transaction patterns
    V5State.accountType = detectAccountType(categorized);
    console.log(`📊 Detected account type: ${V5State.accountType}`);

    // Generate IDs and convert Amount to Debit/Credit
    const isCreditCard = V5State.accountType === 'CREDIT_CARD';

    let runningBalance = V5State.openingBalance || 0;
    categorized.forEach((txn, index) => {
      if (!txn.id) {
        txn.id = `txn_${Date.now()}_${index}`;
      }

      // Convert amount to debit/credit based on account type
      const amount = parseFloat(txn.amount) || 0;

      if (isCreditCard) {
        // Credit Card: Positive = Charge (Credit), Negative = Payment (Debit)
        if (amount > 0) {
          txn.credit = amount;  // Charges increase what you owe
          txn.debit = 0;
          runningBalance += amount;
        } else {
          txn.debit = Math.abs(amount);  // Payments reduce what you owe
          txn.credit = 0;
          runningBalance -= Math.abs(amount);
        }
      } else {
        // Bank Account: Positive = Deposit (Debit), Negative = Withdrawal (Credit)
        if (amount > 0) {
          txn.debit = amount;  // Deposits increase balance
          txn.credit = 0;
          runningBalance += amount;
        } else {
          txn.credit = Math.abs(amount);  // Withdrawals decrease balance
          txn.debit = 0;
          runningBalance -= Math.abs(amount);
        }
      }

      // Set balance
      txn.balance = runningBalance;
    });

    // Initialize or update grid
    if (!V5State.gridApi) {
      // Grid not initialized yet, call init
      initV5Grid();
    } else {
      // Grid exists, just update data
      V5State.gridApi.setGridOption('rowData', categorized);
    }

    // Force reconciliation update
    updateReconciliationCard();

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


    // Clear files
    clearV5Files();

    // Success - data loaded into grid

  } catch (error) {
    console.error('Parse failed:', error);

    // Check if ALL files were duplicates
    const isDuplicateError = error.message && error.message.includes('DUPLICATE_FILE');

    if (isDuplicateError) {
      // Friendly message with automatic fix option
      if (confirm('These files have already been imported.\n\nWould you like to clear the import history and re-import them?')) {
        try {
          // Clear duplicate cache
          await window.BrainStorage.clearAllFileHashes();

          console.log('Import history cleared');

          // Clear file selection so they can re-select
          clearV5Files();
        } catch (clearError) {
          console.error('Failed to clear cache:', clearError);
          console.error('Failed to clear cache');
        }
      } else {
        console.log('Import cancelled - files already imported');
      }
    } else {
      // Other parsing errors
      console.error('Failed to parse files');
    }
  } finally {
    V5State.isProcessing = false;
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
  if (!container) {
    console.error('Grid container not found!');
    return;
  }

  // IMPORTANT: Hide empty state, show grid
  const emptyState = document.getElementById('v5-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  container.style.display = 'block';

  console.log('✅ Initializing grid with', V5State.gridData.length, 'transactions');
  console.log('📊 First 3 transactions:', V5State.gridData.slice(0, 3));

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
      width: 300,
      editable: true
    },
    {
      headerName: 'Debit',
      field: 'debit',
      width: 120,
      editable: true,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return val > 0 ? '$' + val.toFixed(2) : '';
      },
      valueSetter: params => {
        const val = parseFloat(params.newValue) || 0;
        params.data.debit = val;
        params.data.credit = 0; // Clear credit when setting debit
        // Recalculate balance
        updateRowBalance(params.data);
        return true;
      }
    },
    {
      headerName: 'Credit',
      field: 'credit',
      width: 120,
      editable: true,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return val > 0 ? '$' + val.toFixed(2) : '';
      },
      valueSetter: params => {
        const val = parseFloat(params.newValue) || 0;
        params.data.credit = val;
        params.data.debit = 0; // Clear debit when setting credit
        // Recalculate balance
        updateRowBalance(params.data);
        return true;
      }
    },
    {
      headerName: 'Balance',
      field: 'balance',
      width: 130,
      editable: false,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      cellStyle: params => {
        const val = parseFloat(params.value) || 0;
        return val < 0 ? { color: '#ef4444' } : { color: '#10b981' };
      }
    },
    {
      headerName: 'Account',
      field: 'account',
      width: 280,
      editable: true,
      cellEditor: FiveTierAccountEditor,
      valueFormatter: params => resolveAccountName(params.value)
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 120,
      pinned: 'right',
      cellRenderer: params => {
        return `
          <div style="display: flex; gap: 8px; align-items: center; height: 100%;">
            <button 
              class="action-btn" 
              onclick="window.swapDebitCredit(${params.node.rowIndex})" 
              title="Swap Debit/Credit"
              style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;"
            >⇄</button>
            <button 
              class="action-btn delete-btn" 
              onclick="window.deleteV5Row(${params.node.rowIndex})" 
              title="Delete"
              style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;"
            >✕</button>
          </div>
        `;
      }
    }
  ];

  console.log('📋 Column Definitions:', columnDefs);
  console.log('📊 Total columns:', columnDefs.length);
  columnDefs.forEach((col, i) => {
    console.log(`  Column ${i}: "${col.headerName}" (field: ${col.field}, width: ${col.width})`);
  });

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
      updateV5SelectionUI();
    },
    onGridReady: (params) => {
      console.log('✅ AG Grid onGridReady fired');
      V5State.gridApi = params.api;
      params.api.sizeColumnsToFit();
      console.log('✅ Grid API stored and columns sized');

      // Log grid state
      const rect = container.getBoundingClientRect();
      console.log('📐 Grid container dimensions:', {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        visible: rect.height > 0 && rect.width > 0
      });
      console.log('🎯 Grid has', params.api.getDisplayedRowCount(), 'displayed rows');
    }
  };

  // Initialize grid
  console.log('🔧 Creating AG Grid instance...');
  console.log('Container element:', container);
  console.log('Container computed style:', window.getComputedStyle(container).display, window.getComputedStyle(container).height);
  console.log('Grid options:', gridOptions);

  try {
    const gridInstance = agGrid.createGrid(container, gridOptions);
    console.log('✅ AG Grid created successfully:', gridInstance);

    // FORCE container to be visible with explicit height!
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.position = 'relative';
    container.style.height = 'calc(100vh - 250px)'; // Fill viewport minus header/padding
    container.style.minHeight = '500px'; // Minimum height
    container.style.zIndex = '1';
    console.log('✅ Container forced to visible with height:', container.style.height);
  } catch (error) {
    console.error('❌ Failed to create AG Grid:', error);
  }

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

// Keyboard Shortcuts Legend
window.showKeyboardShortcuts = function () {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0; font-size: 1.25rem;">⌨️ Keyboard Shortcuts</h2>
        <button onclick="this.closest('div').parentElement.remove()" style="border: none; background: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
      </div>
      <div style="display: grid; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Save Data</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Ctrl + S</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Undo Last Change</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Ctrl + Z</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Delete Selected</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Delete</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
          <span style="color: #6b7280;">Edit Cell</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Double Click</kbd>
        </div>
      </div>
      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
        <strong>Actions:</strong><br>• Click <strong>⇄</strong> to swap Debit/Credit<br>• Click <strong>✕</strong> to delete row
      </div>
    </div>
  `;

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(modal);
};

window.toggleV5History = function () {
  // In the new layout, History button just shows/hides the collapsible history zone
  const historyZone = document.querySelector('.v5-history-collapsible');
  if (!historyZone) {
    console.warn('History zone not found');
    return;
  }

  const isExpanded = historyZone.classList.contains('expanded');

  if (isExpanded) {
    historyZone.classList.remove('expanded');
    historyZone.classList.add('collapsed');
  } else {
    historyZone.classList.remove('collapsed');
    historyZone.classList.add('expanded');
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
  // Hide in-page grid and show pop-in button
  const gridContainer = document.getElementById('v5-grid-container');
  gridContainer.style.display = 'none';

  // Show pop-in button
  let popInBtn = document.getElementById('v5-popin-btn');
  if (!popInBtn) {
    popInBtn = document.createElement('button');
    popInBtn.id = 'v5-popin-btn';
    popInBtn.className = 'btn-primary';
    popInBtn.onclick = () => window.popInV5Grid();
    popInBtn.style.cssText = 'margin: 2rem auto; display: block;';
    popInBtn.innerHTML = '<i class="ph ph-arrow-square-in"></i> Pop In Grid';
    document.getElementById('v5-grid-container').parentElement.appendChild(popInBtn);
  }
  popInBtn.style.display = 'block';

  // Open popout window
  const popOutWindow = window.open('', 'V5GridPopOut', 'width=1400,height=900');

  if (!popOutWindow) {
    alert('Popup blocked! Please allow popups for this site.');
    return;
  }

  // Store reference
  V5State.popoutWindow = popOutWindow;

  popOutWindow.document.write(`
    <html>
      <head>
        <title>Transaction Grid - Pop Out</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ag-grid-community/styles@31.0.0/ag-grid.css">
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ag-grid-community/styles@31.0.0/ag-theme-alpine.css">
        <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/regular/style.css">
        <style>
          body { margin: 0; padding: 1rem; font-family: system-ui; background: #f9fafb; }
          .popout-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
          .popout-actions { display: flex; gap: 0.5rem; }
          .btn { padding: 8px 16px; border-radius: 6px; border: 1px solid #d1d5db; background: white; cursor: pointer; }
          .btn:hover { background: #f3f4f6; }
          .btn-primary { background: #3b82f6; color: white; border-color: #3b82f6; }
          .btn-primary:hover { background: #2563eb; }
          #popout-grid { height: calc(100vh - 100px); }
        </style>
      </head>
      <body>
        <div class="popout-header">
          <h2>📊 Transaction Grid</h2>
          <div class="popout-actions">
            <button class="btn" onclick="selectAll()"><i class="ph ph-check-square"></i> Select All</button>
            <button class="btn" onclick="deselectAll()"><i class="ph ph-square"></i> Deselect All</button>
            <button class="btn" onclick="bulkDelete()"><i class="ph ph-trash"></i> Delete Selected</button>
            <button class="btn-primary" onclick="closePopout()"><i class="ph ph-arrow-square-in"></i> Pop In</button>
          </div>
        </div>
        <div id="popout-grid" class="ag-theme-alpine"></div>
        
        <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/dist/ag-grid-community.min.js"></script>
        <script>
          const gridData = ${JSON.stringify(V5State.gridData)};
          let gridApi;
          
          // Same column defs as main grid
          const columnDefs = ${JSON.stringify(getV5ColumnDefs())};
          
          const gridOptions = {
            columnDefs,
            rowData: gridData,
            defaultColDef: { sortable: true, filter: true, resizable: true },
            rowSelection: 'multiple',
            onCellValueChanged: (params) => {
              // Sync back to parent window
              window.opener.updateV5DataFromPopout(gridData);
            }
          };
          
          document.addEventListener('DOMContentLoaded', () => {
            gridApi = agGrid.createGrid(document.getElementById('popout-grid'), gridOptions);
          });
          
          function selectAll() { gridApi.selectAll(); }
          function deselectAll() { gridApi.deselectAll(); }
          function bulkDelete() {
            const selected = gridApi.getSelectedRows();
            if (selected.length === 0) return;
            if (!confirm(\`Delete \${selected.length} transaction(s)?\`)) return;
            
            const selectedIds = selected.map(r => r.id);
            const newData = gridData.filter(r => !selectedIds.includes(r.id));
            gridApi.setGridOption('rowData', newData);
            window.opener.updateV5DataFromPopout(newData);
          }
          function closePopout() {
            window.opener.popInV5Grid();
            window.close();
          }
        </script>
      </body>
    </html>
  `);
};

window.popInV5Grid = function () {
  // Close popout if open
  if (V5State.popoutWindow && !V5State.popoutWindow.closed) {
    V5State.popoutWindow.close();
  }

  // Show in-page grid
  document.getElementById('v5-grid-container').style.display = 'block';

  // Hide pop-in button
  const popInBtn = document.getElementById('v5-popin-btn');
  if (popInBtn) popInBtn.style.display = 'none';

  // Refresh grid
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }
};

window.updateV5DataFromPopout = function (newData) {
  V5State.gridData = newData;
  recalculateAllBalances();
  saveData();
};

function getV5ColumnDefs() {
  // Return same column defs used in main grid (without cellRenderer for actions)
  return [
    { headerName: '', checkboxSelection: true, headerCheckboxSelection: true, width: 50 },
    { headerName: 'Date', field: 'date', width: 120, editable: true },
    { headerName: 'Description', field: 'description', width: 300, editable: true },
    { headerName: 'Debit', field: 'debit', width: 120, editable: true },
    { headerName: 'Credit', field: 'credit', width: 120, editable: true },
    { headerName: 'Balance', field: 'balance', width: 130, editable: false },
    { headerName: 'Account', field: 'account', width: 280, editable: true }
  ];
}

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
// CACHE RESTORE HELPERS
// ============================================

window.restorePreviousImport = async function () {
  // Remove banner
  document.getElementById('v5-restore-banner')?.remove();

  // Load cached data
  await loadData();

  console.log('Previous import restored');
};

window.startFreshImport = async function () {
  // Remove banner
  document.getElementById('v5-restore-banner')?.remove();

  // Clear all caches
  await window.CacheManager.clearAll();
  await window.BrainStorage.clearAllFileHashes();

  // Reset grid
  V5State.gridData = [];
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', []);
  }

  console.log('Ready for new import');
};

// ============================================
// AUTO-INITIALIZE
// ============================================

window.initTxnImportV5Grid = async function () {
  // Auto-clear caches on page load for smooth UX
  console.log('🔄 Auto-clearing caches...');
  try {
    await window.BrainStorage.clearAllFileHashes();
    await window.CacheManager.clearAll();
  } catch (e) {
    console.warn('Could not clear caches:', e);
  }

  // Show empty state - no cache restore
  document.getElementById('v5-empty-state').style.display = 'flex';
};

console.log('✅ Txn Import V5 loaded successfully');

