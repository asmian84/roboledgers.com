/**
 * Chart of Accounts Page - Route-based rendering with AG Grid
 */

// Route function - returns page HTML
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
      /* Ensure AG Grid headers stay fixed */
      #accountsGrid .ag-header {
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
          background: white !important;
      }
      #accountsGrid .ag-header-viewport {
          background: #f8fafc !important;
      }
    </style>
    <div class="accounts-page">
      <div class="page-header">
        <h1>💰 Chart of Accounts</h1>
        <div class="header-actions">
           <div class="action-menu">
                <button class="action-menu-btn" onclick="this.nextElementSibling.classList.toggle('show')">
                    ...
                </button>
                <div class="action-menu-content">
                    <button class="action-menu-item" onclick="addNewAccount()">➕ Add Account</button>
                    <button class="action-menu-item" onclick="importCOA()">📥 Import COA</button> 
                    <!-- Assuming importCOA exists or will be added, or just Add Account for now -->
                </div>
            </div>
        </div>
      </div>
      
      <div class="content-area">
        <div id="accountsGrid" class="ag-theme-alpine" style="height: calc(100vh - 220px); width: 100%;"></div>
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

// Initialize the grid with data from storage
// Initialize the grid with data from storage
async function initAccountsGrid() {
  console.log('🔷 Initializing Chart of Accounts Grid...');

  const gridDiv = document.querySelector('#accountsGrid');
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

  // Load from Storage (Single Source of Truth)
  let accountData = [];
  if (window.storage) {
    accountData = await window.storage.getAccounts();
  } else {
    // Fallback if storage not ready
    accountData = window.DEFAULT_CHART_OF_ACCOUNTS || [];
    // Map fallback to match storage schema for the grid
    accountData = accountData.map(a => ({ ...a, accountNumber: a.code }));
  }

  console.log(`📊 Loaded ${accountData.length} accounts from Storage.`);

  const columnDefs = [
    {
      headerName: 'Account #',
      field: 'accountNumber', // Changed from 'code'
      width: 130,
      filter: 'agTextColumnFilter',
      sort: 'asc'
    },
    {
      headerName: 'Account Name',
      field: 'name',
      flex: 1,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'Type',
      field: 'type',
      width: 150,
      filter: 'agTextColumnFilter'
    },
    {
      headerName: 'Balance',
      field: 'currentBalance',
      width: 150,
      valueFormatter: (params) => {
        return params.value ? '$' + parseFloat(params.value).toFixed(2) : '-';
      }
    }
  ];

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: accountData,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      editable: true
    },
    animateRows: true,
    suppressHorizontalScroll: false,
    headerHeight: 48,
    onGridReady: (event) => {
      console.log('✅ Chart of Accounts grid ready');
      accountsGridApi = event.api;
      event.api.sizeColumnsToFit();
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

function addNewAccount() {
  if (!window.ModalService) {
    console.error('ModalService missing');
    return;
  }

  ModalService.prompt('New Account', 'Enter Account Number:', '', (code) => {
    ModalService.prompt('New Account', 'Enter Account Name:', '', (name) => {
      ModalService.prompt('New Account', 'Enter Type (Asset, Liability, Equity, Revenue, Expense):', 'Expense', async (type) => {

        if (window.storage) {
          try {
            const newAccount = await window.storage.createAccount({
              accountNumber: code,
              name: name,
              type: type || 'Expense',
              active: true
            });

            if (accountsGridApi) {
              accountsGridApi.applyTransaction({ add: [newAccount] });
            }
            if (window.showToast) showToast(`Account ${code} created successfully.`, 'success');
          } catch (err) {
            console.error(err);
            if (window.showToast) showToast('Failed to create account: ' + err.message, 'error');
          }
        }

      });
    });
  });
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
