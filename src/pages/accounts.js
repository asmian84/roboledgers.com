/**
 * Chart of Accounts Page - Route-based rendering with AG Grid
 */

// Route function - returns page HTML
window.renderAccounts = function () {
  return `
    <style>
      .coa-wrapper {
        width: 100%;
        height: 100vh;
        overflow: hidden;
        background: var(--bg-secondary, #f8fafc);
        font-family: var(--font-family, sans-serif);
        display: flex;
        flex-direction: column;
        padding: 1.5rem;
      }

      .coa-header {
        margin-bottom: 1rem;
        flex-shrink: 0;
      }

      .coa-scroll-container {
        flex: 1;
        overflow-y: auto;
        padding-bottom: 1rem;
      }

      /* ACCORDION ROW */
      .coa-row {
        background: var(--bg-surface, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        margin-bottom: 0.5rem;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.4s cubic-bezier(0.25, 0.8, 0.25, 1);
        box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        
        /* Contracted State: "Card" Look */
        width: 50%;
        margin-left: auto;
        margin-right: auto;
      }

      .coa-row.active {
        box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
        border-color: var(--primary, #3b82f6);
        margin-bottom: 1rem;
        margin-top: 0.5rem;
        
        /* Expanded State: Full Width */
        width: 100%;
      }

      /* ROW HEADER - Snug & Sleek */
      .coa-row-header {
        display: flex;
        align-items: center;
        padding: 0.5rem 1.25rem;
        cursor: pointer;
        user-select: none;
        height: 48px; /* Slightly taller than 42px for better touch targets, still snug */
      }

      .coa-row-header:hover {
        background: var(--bg-subtle, #f8fafc);
      }

      /* Icons removed as requested */
      .row-info { flex: 1; }

      .row-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--text-primary, #1e293b);
        margin-bottom: 0;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .row-subtitle { display: none; } /* Hide subtitle for cleaner look if present */

      .row-count-badge {
        font-size: 0.75rem;
        background: var(--bg-tertiary, #f1f5f9);
        color: var(--text-secondary, #64748b);
        padding: 2px 8px;
        border-radius: 12px;
        font-weight: 500;
      }

      .row-desc-preview {
        font-size: 0.85rem; /* Slightly larger for readability */
        color: var(--text-tertiary, #94a3b8);
        margin-left: 1rem;
        font-weight: 400;
        opacity: 0.8;
      }

      .row-chevron {
        font-size: 1rem;
        color: var(--text-tertiary, #94a3b8);
        transition: transform 0.3s;
      }

      .coa-row.active .row-chevron {
        transform: rotate(180deg);
        color: var(--primary, #3b82f6);
      }

      /* ROW CONTENT (Expandable) */
      .coa-row-content {
        height: 0;
        overflow: hidden;
        transition: height 0.4s cubic-bezier(0.33, 1, 0.68, 1);
        background: var(--bg-surface, #ffffff); /* Match row bg for seamless look */
        border-top: 1px solid var(--border-color, #e2e8f0);
      }
      
      .coa-grid-placeholder {
        height: 100%; 
        width: 100%; 
        padding: 0; /* No padding for snug fit */
        display: flex; 
        flex-direction: column;
      }

      /* Category Indicating Left Borders */
      .theme-asset { border-left: 4px solid #10b981; }
      .theme-liability { border-left: 4px solid #ef4444; } /* Fixed typo */
      .theme-equity { border-left: 4px solid #8b5cf6; }
      .theme-revenue { border-left: 4px solid #3b82f6; }
      .theme-expense { border-left: 4px solid #f59e0b; }

    </style>

    <div class="coa-wrapper">
      <div class="coa-header">
        <h1 style="font-size: 1.5rem; font-weight: 700; color: var(--text-primary); margin: 0;">Chart of Accounts</h1>
      </div>

      <div class="coa-scroll-container">
        
        <!-- ASSETS -->
        <div class="coa-row theme-asset" id="row-asset">
          <div class="coa-row-header" onclick="window.toggleCoARow('asset')">
            <div class="row-info">
              <div class="row-title">
                Assets 
                <!-- <span class="row-count-badge">--</span> -->
                <span class="row-desc-preview">Cash, Inventory, Equipment</span>
              </div>
            </div>
            <i class="ph ph-caret-down row-chevron"></i>
          </div>
          <div class="coa-row-content" id="content-asset">
             <!-- Grid will be moved here -->
          </div>
        </div>

        <!-- LIABILITIES -->
        <div class="coa-row theme-liability" id="row-liability">
          <div class="coa-row-header" onclick="window.toggleCoARow('liability')">
            <div class="row-info">
               <div class="row-title">
                Liabilities
                <span class="row-desc-preview">Loans, Payables, Credit Cards</span>
              </div>
            </div>
            <i class="ph ph-caret-down row-chevron"></i>
          </div>
          <div class="coa-row-content" id="content-liability"></div>
        </div>

        <!-- EQUITY -->
        <div class="coa-row theme-equity" id="row-equity">
          <div class="coa-row-header" onclick="window.toggleCoARow('equity')">
            <div class="row-info">
               <div class="row-title">
                Equity
                <span class="row-desc-preview">Owner's Capital, Retained Earnings</span>
              </div>
            </div>
            <i class="ph ph-caret-down row-chevron"></i>
          </div>
          <div class="coa-row-content" id="content-equity"></div>
        </div>

        <!-- REVENUE -->
        <div class="coa-row theme-revenue" id="row-revenue">
          <div class="coa-row-header" onclick="window.toggleCoARow('revenue')">
            <div class="row-info">
               <div class="row-title">
                Revenue
                <span class="row-desc-preview">Sales, Services, Income</span>
              </div>
            </div>
            <i class="ph ph-caret-down row-chevron"></i>
          </div>
          <div class="coa-row-content" id="content-revenue"></div>
        </div>

        <!-- EXPENSES -->
        <div class="coa-row theme-expense" id="row-expense">
          <div class="coa-row-header" onclick="window.toggleCoARow('expense')">
            <div class="row-info">
               <div class="row-title">
                Expenses
                <span class="row-desc-preview">Advertising, Office, Travel</span>
              </div>
            </div>
            <i class="ph ph-caret-down row-chevron"></i>
          </div>
          <div class="coa-row-content" id="content-expense"></div>
        </div>

      </div>

      <!-- Hidden Container for the Single Grid Instance -->
      <div id="hiddenGridContainer" style="display:none;">
          <div id="sharedAccountsGrid" class="ag-theme-quartz" style="height: 100%; width: 100%;"></div>
      </div>

    </div>
  `;
};

// ----------------------------------------------------
// GLOBAL LOGIC (Defined Outside Render Function)
// ----------------------------------------------------

let currentActiveRow = null;

window.toggleCoARow = function (type) {
  const rowId = 'row-' + type;
  const contentId = 'content-' + type;
  const row = document.getElementById(rowId);
  const content = document.getElementById(contentId);
  const container = document.querySelector('.coa-scroll-container');

  // If clicking already active row, collapse it
  if (currentActiveRow === type) {
    collapseAllRows();
    currentActiveRow = null;
    return;
  }

  // 1. Collapse others
  collapseAllRows();

  // 2. Expand this one
  if (row && content && container) {
    row.classList.add('active');

    // Dynamic Height Calculation:
    // Available Height = Container Height - (Header Heights * 5) - Margins
    // Roughly fill 70-80% of remaining space or at least 500px
    const containerHeight = container.clientHeight || 800;
    const reservedHeight = (5 * 60) + 100; // Headers + margins
    const targetHeight = Math.max(500, containerHeight - reservedHeight);

    content.style.height = targetHeight + 'px';

    // 3. Move Grid into this content
    const gridEl = document.getElementById('sharedAccountsGrid');

    // Ensure grid takes up space
    const gridContainer = document.createElement('div');
    gridContainer.className = 'coa-grid-placeholder';
    gridContainer.appendChild(gridEl);

    // Clear current content and append grid
    content.innerHTML = '';
    content.appendChild(gridContainer);

    currentActiveRow = type;

    // 4. Initialize/Filter Grid
    setTimeout(() => {
      if (!window.accountsGridApi) {
        // First init needs to target the shared ID
        initAccountsGrid(type); // Pass filter
      } else {
        window.applyCoAFilter(type);
        // Force layout refresh since it moved in DOM
        window.accountsGridApi.sizeColumnsToFit();
      }
    }, 450); // Wait for transition (slightly longer than CSS transition)
  }
};

function collapseAllRows() {
  ['asset', 'liability', 'equity', 'revenue', 'expense'].forEach(t => {
    const r = document.getElementById('row-' + t);
    const c = document.getElementById('content-' + t);
    if (r) r.classList.remove('active');
    if (c) {
      c.style.height = '0';
      // Don't remove innerHTML immediately to allow transition
    }
  });
}

window.applyCoAFilter = function (type) {
  if (!window.accountsGridApi) return;

  if (!type) {
    window.accountsGridApi.setFilterModel(null);
  } else {
    window.accountsGridApi.setFilterModel({
      type: {
        filterType: 'text',
        type: 'equals',
        filter: type
      }
    });
  }
  window.accountsGridApi.onFilterChanged();
};

let accountsGridApi;

// Initialize the grid with data from storage
async function initAccountsGrid(initialFilterType = null) {
  console.log('🔷 Initializing Chart of Accounts Grid (Shared Instance)...');

  // TARGET THE SHARED GRID ELEMENT
  const gridDiv = document.querySelector('#sharedAccountsGrid');
  if (!gridDiv) {
    console.warn('⚠️ Accounts grid container not found during init');
    return;
  }

  // Destroy previous instance if exists
  if (accountsGridApi) {
    console.log('♻️ Destroying previous grid instance...');
    accountsGridApi.destroy();
    accountsGridApi = null;
  }

  gridDiv.innerHTML = '';

  // Load from Storage (Default + Custom)
  const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
  let rawCustom = [];
  try {
    rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
  } catch (e) { }

  let accountData = [...rawDefault, ...rawCustom]
    .filter(a => a.name && !a.name.toString().toLowerCase().includes("invalid"));

  // Sort by code
  accountData.sort((a, b) => (parseInt(a.code) || 0) - (parseInt(b.code) || 0));

  if (accountData.length === 0) {
    gridDiv.innerHTML = '<p style="text-align:center; padding:20px; color:#64748b;">No accounts found.</p>';
    return;
  }

  const columnDefs = [
    {
      headerName: 'Account #',
      field: 'code',
      sortable: true,
      filter: true,
      width: 120,
      suppressSizeToFit: true,
      sort: 'asc', // Default sort
      comparator: (valueA, valueB) => {
        return (parseInt(valueA) || 0) - (parseInt(valueB) || 0);
      }
    },
    {
      headerName: 'Account Name',
      field: 'name',
      sortable: true,
      filter: true,
      flex: 1
    },
    {
      headerName: 'Type',
      field: 'type',
      sortable: true,
      filter: true,
      width: 150,
      valueFormatter: params => {
        if (!params.value) return '';
        // Capitalize first letter (asset -> Asset)
        return params.value.charAt(0).toUpperCase() + params.value.slice(1);
      }
    },
    {
      headerName: 'Balance',
      field: 'currentBalance',
      width: 150,
      valueFormatter: (params) => {
        return params.value ? '$' + parseFloat(params.value).toFixed(2) : '-';
      }
    },
    {
      headerName: '',
      field: 'actions',
      width: 70,
      cellRenderer: params => {
        return `<button class="btn-icon-delete" style="border:none; background:none; cursor:pointer;">❌</button>`;
      },
      cellStyle: { 'text-align': 'center', 'display': 'flex', 'align-items': 'center', 'justify-content': 'center' }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: accountData,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      editable: false // Disable edit by default, enable specific columns if needed
    },
    animateRows: true,
    suppressHorizontalScroll: false,
    headerHeight: 48,
    onGridReady: (event) => {
      console.log('✅ Chart of Accounts grid ready');
      accountsGridApi = event.api;
      window.accountsGridApi = event.api;
      event.api.sizeColumnsToFit();

      // Apply initial filter if requested
      if (initialFilterType) {
        window.applyCoAFilter(initialFilterType);
      }

      // Auto-resize when window changes
      const resizeHandler = () => {
        if (event.api) {
          event.api.sizeColumnsToFit();
        }
      };

      // Remove old listener if exists
      if (window._accountsGridResizeHandler) {
        window.removeEventListener('resize', window._accountsGridResizeHandler);
      }

      window.addEventListener('resize', resizeHandler);
      window._accountsGridResizeHandler = resizeHandler;
    },
    onCellValueChanged: async (event) => {
      if (window.storage) {
        // Use updateAccount method
        const updated = await window.storage.updateAccount(event.data.id, {
          name: event.data.name,
          accountNumber: event.data.accountNumber,
          type: event.data.type
        });
        console.log('💾 Account updated:', updated.accountNumber);
      }
    },
    onCellClicked: (event) => {
      if (event.colDef.field === 'actions') {
        const acc = event.data;

        if (!window.ModalService) return;

        window.ModalService.confirm(
          'Delete Account',
          `Are you sure you want to permanently delete <b>${acc.code} - ${acc.name}</b>?`,
          () => {
            // Try to delete from Custom List
            let custom = [];
            try { custom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }

            const initialLen = custom.length;
            custom = custom.filter(a => a.code !== acc.code);

            if (custom.length < initialLen) {
              // It was a custom account
              localStorage.setItem('ab3_custom_coa', JSON.stringify(custom));
              // Refresh
              if (window.showToast) window.showToast('Account deleted.', 'success');
              initAccountsGrid();
            } else {
              // It was likely a default account
              if (window.ModalService.alert) {
                window.ModalService.alert('Cannot Delete', 'System default accounts cannot be deleted.');
              } else {
                alert("Cannot delete system default accounts.");
              }
            }
          },
          'danger'
        );
      }
    }
  };

  accountsGridApi = agGrid.createGrid(gridDiv, gridOptions);
}

// Stub for future feature
window.importCOA = function () {
  if (window.showToast) {
    showToast('Import COA feature coming soon!', 'info');
  } else {
    alert('Import COA feature coming soon!');
  }
};

/**
 * EXPORT COA TO EXCEL (CSV)
 */
window.exportCoaToExcel = function () {
  if (!window.accountsGridApi) {
    console.error('❌ Accounts Grid API not found');
    return;
  }
  const params = {
    fileName: `Pristine_Accounts_${new Date().toISOString().split('T')[0]}.csv`,
    allColumns: true
  };
  window.accountsGridApi.exportDataAsCsv(params);
};

// Watch for grid container with MutationObserver
let isInitializingAccounts = false;
const accountObserver = new MutationObserver(() => {
  const gridDiv = document.getElementById('accountsGrid');

  const hasGrid = gridDiv?.querySelector('.ag-root-wrapper');
  if (gridDiv && !isInitializingAccounts && !hasGrid) {
    console.log('📍 Accounts grid container detected, initializing...');
    isInitializingAccounts = true;
    initAccountsGrid();
    setTimeout(() => { isInitializingAccounts = false; }, 500);
  }
});

if (document.body) {
  accountObserver.observe(document.body, { childList: true, subtree: true });
}

// --- Add New Account (Ad-Hoc) ---
function addNewAccount() {
  if (!window.ModalService) {
    console.error('ModalService missing');
    return;
  }

  // HTML form for the modal body
  const formHtml = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
         <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Account Code (e.g., 6050)</label>
            <input type="text" id="new-acc-code" class="modal-input" placeholder="####">
         </div>
         <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Account Name</label>
            <input type="text" id="new-acc-name" class="modal-input" placeholder="e.g., Office Supplies">
         </div>
         <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Type</label>
            <select id="new-acc-type" class="modal-input" style="background:white;">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
         </div>
      </div>
    `;

  // Use ModalService
  window.ModalService.confirm(
    'Add New Account',
    formHtml,
    async () => {
      // On Confirm Logic
      const code = document.getElementById('new-acc-code').value.trim();
      const name = document.getElementById('new-acc-name').value.trim();
      const type = document.getElementById('new-acc-type').value;

      if (!code || !name) {
        window.toast.error('Code and Name are required.');
        return;
      }

      // 1. Save to Storage Service (Source of Truth)
      if (window.storage) {
        try {
          await window.storage.createAccount({
            accountNumber: code,
            name: name,
            type: type, // Now sending 'expense' etc.
            active: true
          });
          if (window.showToast) window.showToast(`Account ${code} created successfully.`, 'success');
        } catch (e) {
          console.error('Storage create failed', e);
          if (window.showToast) window.showToast('Validation Failed: ' + e.message, 'error');
          return;
        }
      }

      // 2. Also save to Custom List for Dropdown Helper (Legacy support for transactions.js)
      const newAcc = { code, name, type, category: type };

      let custom = [];
      try {
        custom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
      } catch (e) { }

      // Check duplicates in custom list
      if (!custom.find(a => a.code === code)) {
        custom.push(newAcc);
        localStorage.setItem('ab3_custom_coa', JSON.stringify(custom));
      }

      // Refresh Page Grid if we are on Accounts page
      if (typeof initAccountsGrid === 'function') {
        initAccountsGrid();
      }
    },
    'primary'
  );

  // Hack: Change the "Confirm" button text to "Create Account"
  setTimeout(() => {
    const btn = document.getElementById('global-modal-confirm-btn');
    if (btn) btn.innerText = 'Create Account';
  }, 50);
}

// Local definition removed. Using window.DEFAULT_CHART_OF_ACCOUNTS from src/data/default-coa.js

// 📊 Chart Manager UI
window.ChartManager = {
  modal: null,
  listContainer: null,
  searchOutput: null,
  resizeObserver: null, // ⚡ NEW: For resize persistence
  saveTimer: null,

  initialize() {
    if (document.getElementById('chartOfAccountsModal')) {
      this.modal = document.getElementById('chartOfAccountsModal');
      this.listContainer = document.getElementById('accountsList');
      this.searchInput = document.getElementById('accountSearch');
      // Re-bind listeners just in case
      this.attachListeners();
      return;
    }

    // Create Modal Structure (Standardized WOW Layout)
    const modalHtml = `
            <div id="chartOfAccountsModal" class="modal large-modal" style="z-index: 1000000004;">
                <div class="modal-content" style="width: 900px; max-width: 95vw; height: 80vh; display: flex; flex-direction: column; resize: both; overflow: hidden;">
                    
                    <!-- HEADER -->
                    <div class="modal-header">
                        <div class="header-title-group">
                            <h2>Chart of Accounts</h2>
                            <span class="header-subtitle">Manage your financial categories</span>
                        </div>
                        <span class="modal-close">&times;</span>
                    </div>

                    <!-- Toolbar (The WOW Standard) -->
                    <div class="modal-toolbar"
                        style="flex-shrink: 0; padding: 1rem 1.5rem; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0;">

                        <!-- LEFT: Search -->
                        <div class="search-wrapper" style="position: relative; flex: 1; max-width: 400px;">
                            <span
                                style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">🔍</span>
                            <input type="text" id="coaSearchInput" placeholder="Search accounts..."
                                style="width: 100%; padding: 0.6rem 1rem 0.6rem 2.5rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        </div>

                        <!-- RIGHT: Actions -->
                        <div class="account-actions" style="display: flex; gap: 0.75rem; align-items: center;">
                            <button id="addAccountBtn" class="btn-primary"
                                style="display: flex; align-items: center; gap: 6px; padding: 0.6rem 1.2rem; font-weight: 500; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);">
                                <i class="fas fa-plus"></i>
                                <span>Add Account</span>
                            </button>
                        </div>
                    </div>

                    <!-- BODY (Grid) -->
                    <div class="modal-body" id="coaGridWrapper">
                        <div id="coaGrid" class="ag-theme-alpine" style="width: 100%; height: 100%;"></div>
                    </div>

                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    this.modal = document.getElementById('chartOfAccountsModal');
    this.listContainer = document.getElementById('coaGrid');
    this.searchInput = document.getElementById('coaSearchInput');

    this.attachListeners();
  },

  attachListeners() {
    const closeBtn = this.modal.querySelector('.modal-close');
    const addBtn = document.getElementById('addAccountBtn');
    const refreshBtn = document.getElementById('refreshAccountsBtn');

    // Close logic
    if (closeBtn) {
      closeBtn.onclick = () => this.close();
    }

    // Modal Overlay Close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) this.close();
    });

    // Add Account logic
    if (addBtn) {
      addBtn.addEventListener('click', () => {
        // Ensure AccountUI exists or show simple prompt for now
        if (window.AccountUI && AccountUI.openAccountForm) {
          AccountUI.openAccountForm();
        } else {
          alert('Account Form logic pending implementation in AccountUI.');
        }
      });
    }

    // Search logic
    if (this.searchInput) {
      this.searchInput.addEventListener('input', (e) => {
        if (this.gridApi) {
          this.gridApi.setGridOption('quickFilterText', e.target.value);
        }
      });
    }

    // Refresh logic
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => this.renderList());
    }
  },

  // ⚡ NEW: Show page (route-based, replaces showModal)
  showPage() {
    if (!this.gridApi) {  // First time initialization
      this.initialize();
    }

    // Show the page
    const page = document.getElementById('accountsPage');
    if (!page) {
      console.error('❌ accountsPage not found!');
      return;
    }

    // Re-fetch references
    this.listContainer = document.getElementById('coaGrid');
    this.searchInput = document.getElementById('coaSearchInput');

    // Reset Search
    if (this.searchInput) this.searchInput.value = '';

    // Show breadcrumb
    const breadcrumb = document.getElementById('breadcrumbNav');
    if (breadcrumb) breadcrumb.style.display = 'flex';

    // Render grid if needed
    if (this.listContainer && !this.gridApi) {
      console.log(`✅ Creating CoA grid for route...`);
      setTimeout(() => this.renderList(), 100);
    } else if (this.gridApi) {
      // Grid already exists, just refresh
      console.log('🔄 CoA grid already initialized, refreshing...');
    }
  },

  // DEPRECATED: Old modal method (keep for backward compatibility during migration)
  showModal() {
    console.warn('⚠️ showModal() is deprecated, redirecting to route...');
    if (window.AppRouter) {
      window.AppRouter.navigate('/accounts');
    }
  },

  close() {
    if (this.modal) {
      // PERSIST STATE: Forget this modal
      localStorage.removeItem('activeModal');

      // ⚡ NEW: Cleanup resize observer
      this.cleanup();

      this.modal.classList.remove('active');
      setTimeout(() => {
        this.modal.style.display = 'none';
      }, 300);
    }
  },

  // ⚡ NEW: Setup resize listener to save dimensions
  setupResizeListener() {
    const modalContent = this.modal.querySelector('.modal-content');
    if (!modalContent) return;

    // Cleanup old observer if exists
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }

    this.resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        clearTimeout(this.saveTimer);
        this.saveTimer = setTimeout(() => {
          const w = entry.target.style.width;
          const h = entry.target.style.height;
          if (w && h && parseInt(w) > 300) {
            if (!window.Settings) return;
            if (!Settings.current) Settings.current = {};

            Settings.current.modalSize_COA = { width: w, height: h };
            if (Settings.save) {
              Settings.save();
              console.log('✅ Saved Chart of Accounts size:', w, h);
            }
          }
        }, 500);
      }
    });

    this.resizeObserver.observe(modalContent);
  },

  // ⚡ NEW: Cleanup method
  cleanup() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
  },

  // ⚡ NEW: Auto-size columns to fit content (no wrapping)
  autoSizeAllColumns() {
    if (!this.gridApi) return;

    // Get all column IDs
    const allColumnIds = [];
    this.gridApi.getColumns().forEach(column => {
      allColumnIds.push(column.getColId());
    });

    // Auto-size all columns based on content
    this.gridApi.autoSizeColumns(allColumnIds, false);

    // Fit modal to grid width
    setTimeout(() => this.fitModalToGrid(), 100);
  },

  // ⚡ NEW: Fit modal width to grid content
  fitModalToGrid() {
    if (!this.gridApi || !this.modal) return;

    const modalContent = this.modal.querySelector('.modal-content');
    if (!modalContent) return;

    // Calculate total grid width
    let totalWidth = 0;
    this.gridApi.getColumns().forEach(col => {
      totalWidth += col.getActualWidth();
    });

    // Add padding/scrollbar space (80px)
    const optimalWidth = totalWidth + 80;

    // Apply min/max constraints
    const finalWidth = Math.max(600, Math.min(optimalWidth, window.innerWidth * 0.95));

    modalContent.style.width = `${finalWidth}px`;
    console.log(`📐 Auto-sized Chart of Accounts modal: ${finalWidth}px (grid: ${totalWidth}px)`);
  },

  renderList() {
    if (!this.listContainer) return;

    // Clear previous content
    this.listContainer.innerHTML = '';

    // 1. Theme Logic (Dynamic from Settings)
    const scheme = (window.Settings && Settings.current && Settings.current.gridColorScheme) || 'classic';
    const schemes = (window.TransactionGrid && TransactionGrid.colorSchemes) || {
      rainbow: ['#FFD1DC', '#D1F2FF', '#D1FFD1', '#FFFACD', '#FFDAB9', '#E6E6FA'],
      classic: ['#FFFFFF', '#F5F5F5']
    };
    const activeColors = schemes[scheme] || schemes.classic;

    // 2. Data Source
    let sourceAccounts = [];
    if (window.AccountAllocator && AccountAllocator.getAllAccounts) {
      sourceAccounts = AccountAllocator.getAllAccounts();
    }

    // Fallback to DEFAULT if empty (Critical for viewing grid when no data exists yet)
    if (!sourceAccounts || sourceAccounts.length === 0) {
      console.warn("⚠️ ChartManager: No accounts found in Allocator, using DEFAULTS.");
      sourceAccounts = (typeof DEFAULT_CHART_OF_ACCOUNTS !== 'undefined') ? DEFAULT_CHART_OF_ACCOUNTS : [];
    }

    console.log(`📊 Rendering CoA with ${sourceAccounts.length} accounts.`);

    // Clear container
    this.listContainer.innerHTML = '';

    // Container already has width/height from CSS, just ensure theme class
    this.listContainer.className = 'ag-theme-alpine';

    const gridOptions = {
      rowData: sourceAccounts,
      columnDefs: [
        {
          headerName: 'Account#',
          field: 'code',
          sortable: true,
          filter: true,
          width: 135,
          suppressSizeToFit: true,
          cellStyle: { fontWeight: '600', color: '#1e293b' }
        },
        {
          headerName: 'Account Name',
          field: 'name',
          sortable: true,
          filter: true,
          flex: 1,
          minWidth: 200,
          cellStyle: { fontWeight: '400' }
        },
        {
          headerName: '',
          width: 60,
          maxWidth: 60,
          pinned: 'right', // 🔒 Pinned to match Vendor Dictionary
          lockPosition: true,
          suppressSizeToFit: true,
          cellRenderer: (params) => {
            const btn = document.createElement('button');
            btn.innerHTML = '<i class="fas fa-trash" style="font-size: 0.85rem;"></i>';
            btn.title = "Delete Account";
            btn.style.cssText = 'padding: 6px 8px; border: none; background: transparent; cursor: pointer; color: #64748b; border-radius: 4px; transition: all 0.2s;';

            btn.onmouseover = () => {
              btn.style.background = '#fee2e2';
              btn.style.color = '#dc2626';
            };
            btn.onmouseout = () => {
              btn.style.background = 'transparent';
              btn.style.color = '#64748b';
            };

            btn.addEventListener('click', async (e) => {
              e.stopPropagation();
              const accountName = params.data.name;
              const accountCode = params.data.code;

              if (confirm(`Are you sure you want to delete "${accountName}" (${accountCode})?`)) {
                if (window.AccountAllocator && AccountAllocator.deleteAccount) {
                  const success = await AccountAllocator.deleteAccount(accountCode);
                  if (success) {
                    params.api.applyTransaction({ remove: [params.data] });
                    console.log(`Deleted account: ${accountCode}`);
                  }
                } else {
                  alert('Account deletion logic not found (AccountAllocator).');
                }
              }
            });
            return btn;
          },
          cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }
        }
      ],
      defaultColDef: {
        resizable: true,
        sortable: true
      },
      animateRows: true,

      onGridReady: (params) => {
        this.gridApi = params.api;
        // Auto-size columns to content (eliminates text wrapping)
        this.autoSizeAllColumns();
      },



      // Native AG Grid event: actively refits columns when container resizes
      // Native AG Grid event: actively refits columns when container resizes
      onGridSizeChanged: (params) => {
        // If we are resizing based on column drag, don't auto-fit back!
        if (this.blockAutofit) return;

        params.api.sizeColumnsToFit();
      },

      // Bi-directional resize: when columns are resized, resize modal
      onColumnResized: (params) => {
        // React to user dragging OR double-clicking (autosize)
        if (!params.finished || (params.source !== 'uiColumnDragged' && params.source !== 'autosizeColumns')) return;

        const modalContent = this.modal?.querySelector('.modal-content');
        if (!modalContent || !this.gridApi) return;

        this.blockAutofit = true;

        // Calculate total width needed for all columns
        const columnState = this.gridApi.getColumnState();
        const totalWidth = columnState.reduce((sum, col) => sum + (col.width || 0), 0);

        // Enforce a healthy minimum width (800px) so it doesn't look anorexic
        const newWidth = Math.max(totalWidth + 50, 800);

        // Cap at window width
        const finalWidth = Math.min(newWidth, window.innerWidth * 0.95);

        // Configure modal to match
        modalContent.style.width = `${finalWidth}px`;

        setTimeout(() => { this.blockAutofit = false; }, 200);
      },

      // UI MATCH: Dynamic Theme
      getRowStyle: (params) => {
        const index = params.node.rowIndex % activeColors.length;
        return { background: activeColors[index] };
      }
    };

    // Create grid and save API reference (CRITICAL: must save return value!)
    this.gridApi = agGrid.createGrid(this.listContainer, gridOptions);
  },

  filterList(text) {
    if (this.gridApi) {
      this.gridApi.setGridOption('quickFilterText', text);
    }
  }
};
