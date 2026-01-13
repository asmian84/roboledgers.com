/**
 * Transactions Grid (Ag Grid Version)
 * Replaces transactions-fixed.js with High-Performance Grid
 */

// --- 1. DATA & HELPERS ---
// console.log('%c🚀 AUTOBOOKKEEPING v4.0 ACTIVE', 'background: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

// UNDO SYSTEM STATE
window.txnUndoStack = [];
const GRID_MAX_UNDO_STEPS = 10;

function getGridCoANames() {
    const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
    let rawCustom = [];
    try {
        rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
    } catch (e) { console.error('Failed to load custom COA', e); }

    const all = [...rawDefault, ...rawCustom];
    return all
        .map(a => a.name)
        .filter(name => name && !name.toString().toLowerCase().includes("invalid"));
}

window.captureState = function () {
    if (!window.transactionData) return;

    // Deep clone current state
    const snapshot = JSON.parse(JSON.stringify(window.transactionData));

    window.txnUndoStack.push(snapshot);
    if (window.txnUndoStack.length > GRID_MAX_UNDO_STEPS) {
        window.txnUndoStack.shift(); // Remove oldest
    }

    window.updateUndoButton();
};

window.undoLastAction = function () {
    if (window.txnUndoStack.length === 0) {
        if (window.showToast) window.showToast('Nothing to undo', 'info');
        return;
    }

    const prevState = window.txnUndoStack.pop();
    window.transactionData = prevState;

    if (window.gridApi) {
        window.gridApi.setGridOption('rowData', window.transactionData);
        window.gridApi.refreshCells({ force: true });
    }

    saveGridData();
    window.updateHeaderStats();
    window.updateUndoButton();

    if (window.showToast) window.showToast('Action undone', 'success');
};

window.updateUndoButton = function () {
    const btn = document.getElementById('btn-undo-action');
    if (!btn) return;

    const count = window.txnUndoStack.length;
    if (count > 0) {
        btn.style.display = 'flex';
        btn.querySelector('span').innerText = `Undo (${count})`;
        btn.disabled = false;
        btn.style.opacity = '1';
    } else {
        btn.style.display = 'none';
    }
};

function getGroupedCoA() {
    const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
    let rawCustom = [];
    try { rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
    const all = [...rawDefault, ...rawCustom];

    // 5 Main Categories
    const groups = {
        'Assets': [],
        'Liabilities': [],
        'Equity': [],
        'Revenue': [],
        'Expenses': []
    };

    // Fallback 'Other' for unmapped
    const other = [];

    all.forEach(acc => {
        if (!acc.name || acc.name.toString().toLowerCase().includes("invalid")) return;

        const type = (acc.type || '').toLowerCase();
        const cat = (acc.category || '').toLowerCase();

        // Format: "CODE - Name" for better visibility
        const displayName = acc.code ? `${acc.code} - ${acc.name}` : acc.name;

        if (type.includes('asset') || cat.includes('asset')) groups['Assets'].push(displayName);
        else if (type.includes('liabil') || cat.includes('liabil')) groups['Liabilities'].push(displayName);
        else if (type.includes('equity') || cat.includes('equity')) groups['Equity'].push(displayName);
        else if (type.includes('revenue') || type.includes('income') || cat.includes('revenue')) groups['Revenue'].push(displayName);
        else if (type.includes('expense') || cat.includes('expense')) groups['Expenses'].push(displayName);
        else other.push(displayName);
    });

    // If 'Other' has items, maybe append to Expenses or a separate group? 
    // For now, let's put them in Expenses if we can't tell, or just ignore if weird.
    // Actually, let's stick to the requested 5. 'Other' usually fits in Expenses/Revenue.
    if (other.length > 0) groups['Expenses'].push(...other);

    return groups;
}

function resolveAccountName(val) {
    if (!val) return 'Uncategorized';
    val = val.toString().trim();
    if (val.toLowerCase().includes("invalid")) return 'Uncategorized';

    // 4-digit lookup
    if (val.match(/^\d{4}$/)) {
        const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
        let rawCustom = [];
        try { rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
        const all = [...rawDefault, ...rawCustom];
        const match = all.find(a => a.code === val);
        if (match && match.name && !match.name.toLowerCase().includes("invalid")) return match.name;
    }
    if (val.match(/^\d{4}\b\s+.+/)) {
        return val.replace(/^\d{4}\b\s*/, '');
    }
    return val;
}

function getGridRowData() {
    // FORCE SYNC: Trusted Source is LocalStorage
    if (window.storage) {
        try {
            const stored = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
            if (!window.transactionData || window.transactionData.length !== stored.length) {
                console.log(`🔄 Grid: Syncing memory (${(window.transactionData || []).length}) with storage (${stored.length})...`);
                window.transactionData = stored;
            }
        } catch (e) {
            console.error('Grid Sync Error', e);
        }
    }
    return window.transactionData || [];
}

function saveGridData() {
    localStorage.setItem('ab3_transactions', JSON.stringify(window.transactionData));
    if (window.updateAnalysisStatus) window.updateAnalysisStatus();

    // Auto-refresh account balances when transactions change
    if (window.refreshAccountBalances) {
        window.refreshAccountBalances();
    }
}

// --- 2. CUSTOM EDITORS ---

class GridGroupedAccountEditor {
    init(params) {
        this.params = params;
        this.value = params.value || 'Uncategorized';
        this.groupedData = getGroupedCoA();

        this.container = document.createElement('div');
        this.container.className = 'custom-coa-dropdown';
        this.container.tabIndex = 0; // Allow focus

        // Search Box
        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search accounts...';
        searchBox.className = 'coa-search-box';
        searchBox.value = '';
        // Focus handler
        setTimeout(() => searchBox.focus(), 0);

        searchBox.addEventListener('input', (e) => this.filterList(e.target.value));
        this.container.appendChild(searchBox);

        // List Container
        this.listContainer = document.createElement('div');
        this.listContainer.className = 'coa-list-container';
        this.container.appendChild(this.listContainer);

        this.renderList();

        // Styles
        this.addStyles();
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

    renderList(filterText = '') {
        this.listContainer.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();

        // Always show 'Uncategorized' at top if no filter or matches filter
        if ('uncategorized'.includes(lowerFilter)) {
            this.createItem('Uncategorized', null);
        }

        Object.keys(this.groupedData).forEach(groupName => {
            const items = this.groupedData[groupName];
            const filteredItems = items.filter(item => item.toLowerCase().includes(lowerFilter));

            if (filteredItems.length > 0) {
                // Group Header
                const groupHeader = document.createElement('div');
                groupHeader.className = 'coa-group-header';

                // Toggle Icon
                const icon = document.createElement('span');
                icon.innerHTML = '▼'; // Default open
                icon.style.fontSize = '10px';
                icon.style.marginRight = '6px';

                groupHeader.appendChild(icon);
                groupHeader.appendChild(document.createTextNode(groupName));

                this.listContainer.appendChild(groupHeader);

                // Group Items Container
                const itemsDiv = document.createElement('div');
                itemsDiv.className = 'coa-group-items';

                // Click to toggle
                groupHeader.onclick = () => {
                    const isClosed = itemsDiv.style.display === 'none';
                    itemsDiv.style.display = isClosed ? 'block' : 'none';
                    icon.innerHTML = isClosed ? '▼' : '▶';
                };

                filteredItems.forEach(item => {
                    const itemDiv = document.createElement('div');
                    itemDiv.className = 'coa-item';
                    itemDiv.innerText = item;
                    if (item === this.value) itemDiv.classList.add('selected');

                    itemDiv.onclick = () => {
                        this.value = item;
                        this.params.stopEditing();
                    };
                    itemsDiv.appendChild(itemDiv);
                });

                this.listContainer.appendChild(itemsDiv);
            }
        });
    }

    filterList(text) {
        this.renderList(text);
    }

    createItem(text, parent) {
        const div = document.createElement('div');
        div.className = 'coa-item';
        div.innerText = text;
        div.onclick = () => {
            this.value = text;
            this.params.stopEditing();
        };
        (parent || this.listContainer).appendChild(div);
    }

    addStyles() {
        if (document.getElementById('coa-editor-styles')) return;
        const style = document.createElement('style');
        style.id = 'coa-editor-styles';
        style.textContent = `
            .custom-coa-dropdown {
                background: white; border: 1px solid #cbd5e1; border-radius: 8px;
                box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 280px;
                display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', sans-serif;
            }
            .coa-search-box {
                padding: 10px; border: none; border-bottom: 1px solid #e2e8f0;
                outline: none; font-size: 13px; width: 100%; box-sizing: border-box;
            }
            .coa-list-container {
                max-height: 300px; overflow-y: auto;
            }
            .coa-group-header {
                padding: 8px 12px; background: #f8fafc; font-weight: 600; font-size: 11px;
                color: #64748b; text-transform: uppercase; cursor: pointer; display: flex; align-items: center;
                user-select: none;
            }
            .coa-group-header:hover { background: #f1f5f9; }
            .coa-item {
                padding: 8px 16px; font-size: 13px; color: #334155; cursor: pointer;
            }
            .coa-item:hover { background: #eff6ff; color: #3b82f6; }
            .coa-item.selected { background: #eff6ff; color: #2563eb; font-weight: 500; }
        `;
        document.head.appendChild(style);
    }
}


// --- 3. RENDER (SHELL) ---

window.renderTransactions = function () {
    if (!window.transactionState) {
        window.transactionState = {
            openingBalance: parseFloat(localStorage.getItem('txn_openingBalance')) || 0
        };
    }

    const data = getGridRowData();
    const openingBal = window.transactionState.openingBalance || 0;

    const totalIn = data.reduce((acc, t) => {
        const val = parseFloat(t.credit) || (t.type === 'credit' ? parseFloat(t.amount) : 0) || 0;
        return acc + val;
    }, 0);
    const totalOut = data.reduce((acc, t) => {
        const val = parseFloat(t.debit) || (t.type === 'debit' ? parseFloat(t.amount) : 0) || 0;
        return acc + val;
    }, 0);
    const ending = parseFloat(openingBal) + totalIn - totalOut;
    const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

    return `
    <div class="page snug-page transaction-page">
       <style>
         .transaction-page { background: #f8fafc; }
         .ag-theme-alpine { --ag-font-family: 'Inter', sans-serif; --ag-font-size: 13px; }
         .ag-header-cell-label { font-weight: 600; color: #64748b; }
         
         .fixed-top-section { flex-shrink: 0; }
         .txn-grid-container { flex: 1; padding: 0; background: #f1f5f9; min-height: 0; }
         
         /* DROPDOWN SYSTEM for Toolbar */
         .dropdown-container { position: relative; }
         .btn-icon-menu { 
             background: white; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; 
             padding: 6px; cursor: pointer; transition: all 0.2s; height: 32px; width: 32px; 
             display: flex; align-items: center; justify-content: center; 
         }
         .btn-icon-menu:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
         .dropdown-menu {
             position: absolute; top: 100%; right: 0; left: auto; margin-top: 4px;
             background: white; border: 1px solid #e2e8f0; border-radius: 8px;
             box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 160px; z-index: 1000;
             padding: 4px; display: flex; flex-direction: column;
         }
         .dropdown-menu.hidden { display: none; }
         .dropdown-item { 
             display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: none; 
             background: none; width: 100%; text-align: left; font-size: 0.85rem; font-weight: 500; 
             color: #334155; cursor: pointer; border-radius: 6px; transition: background 0.1s; 
         }
         .dropdown-item:hover { background: #f1f5f9; }
         .dropdown-item.danger { color: #ef4444; }
         .dropdown-item.danger:hover { background: #fee2e2; }
         .dropdown-divider { height: 1px; background: #e2e8f0; margin: 4px 0; }

          /* FIX: CONTROL BAR LAYOUT */
          .control-bar-grid {
              display: flex; justify-content: space-between; align-items: center;
              padding: 12px 24px; background: white; border-bottom: 1px solid #e2e8f0;
              flex-wrap: nowrap; gap: 12px;
              overflow-x: auto; /* Allow scrolling for the entire bar */
              -ms-overflow-style: none; /* IE and Edge */
              scrollbar-width: none; /* Firefox */
          }
          .control-bar-grid::-webkit-scrollbar { display: none; } /* Chrome, Safari, Opera */

          .control-left-grid {
              display: flex; align-items: center; gap: 10px; flex: 1;
              min-width: 0; /* Allow shrinking */
              overflow-x: auto; /* Scroll if too many buttons */
              padding-right: 16px; /* Space before search */
              scrollbar-width: none; /* Firefox hide scrollbar */
          }
          .control-left-grid::-webkit-scrollbar { display: none; } /* Chrome hide scrollbar */
          
          /* FIX: Allow menu to overflow */
          .control-bar-grid {
              overflow-x: visible !important; 
          }
          /* Scroll only the left part if needed */
          .control-left-grid {
              overflow-x: auto;
              overflow-y: hidden;
              flex: 1; /* Take available space */
              margin-right: 12px; /* Space for menu */
              padding-right: 4px;
          }
          
          .search-wrapper-grid {
              margin-left: auto; position: relative;
              /* Don't shrink search too much */
              width: 220px; 
              flex-shrink: 0;
          }
       </style>

       <div class="fixed-top-section">
          <header class="dashboard-header-modern">
            <div class="header-brand">
                <div class="icon-box">🏦</div>
                <div class="header-info">
                    <h2>Imported Transactions (Grid)</h2>
                    <div class="meta">
                        <span class="badge-account">CHECKING</span>
                        <span>•</span>
                        <span>Ready for Review</span>
                    </div>
                </div>
            </div>

            <div class="header-stats-container">
                <div class="stat-unit">
                    <label>Opening Bal</label>
                    <div class="val">$<input type="number" value="${openingBal}" onchange="updateOpeningBalance(this.value)" class="invisible-input"></div>
                </div>
                <div class="stat-divider-v"></div>
                <div class="stat-unit">
                    <label>Total In</label>
                    <div id="stat-total-in" class="val val-positive">+${fmt(totalIn)}</div>
                </div>
                <div class="stat-unit">
                    <label>Total Out</label>
                    <div id="stat-total-out" class="val">-${fmt(totalOut)}</div>
                </div>
                <div class="stat-divider-v"></div>
                <div class="stat-unit">
                    <label>Ending Bal</label>
                    <div id="stat-ending-bal" class="val val-bold">$${fmt(ending)}</div>
                </div>
            </div>
          </header>
          
           <div class="control-bar-grid">
                <!-- SCROLLABLE LEFT SECTION -->
                <div class="control-left-grid" style="min-width: 0;">
                  <div id="bulk-actions-area" class="bulk-actions-pill" style="display: none;">
                    <span id="selection-count">0 selected</span>
                    <button onclick="window.bulkCategorize()" class="btn-bulk-action" id="btn-bulk-cat">✨ Bulk Categorize</button>
                    <button onclick="window.bulkRename()" class="btn-bulk-action" id="btn-bulk-rename">✏️ Bulk Rename</button>
                    <button onclick="window.deselectGrid()" class="btn-clear-selection">✕ Clear</button>
                  </div>

                  <!-- UNDO BUTTON -->
                  <button id="btn-undo-action" onclick="window.undoLastAction()" class="btn-secondary" style="display: none; margin-right: 8px; padding: 6px 12px; font-size: 13px; align-items: center; gap: 6px; background:white; border:1px solid #e2e8f0; color:#475569; border-radius:6px; cursor:pointer;">
                    <span style="font-size: 14px;">⎌</span>
                    <span>Undo</span>
                  </button>

                  <!-- NEW: Auto-Categorize Button -->
                  <button onclick="window.categorizeLedger()" class="btn-primary" style="padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                    <span>🪄 Auto-Categorize</span>
                  </button>

                  <button onclick="window.runMatchScan()" class="btn-secondary" style="margin-left:8px; padding: 6px 12px; font-size: 13px; display: flex; align-items: center; gap: 6px; background:white; border:1px solid #e2e8f0; color:#475569; border-radius:6px; cursor:pointer;">
                    <span>🔗 Review Matches</span>
                  </button>

                  <!-- REF PREFIX INPUT -->
                  <div class="ref-prefix-wrapper" style="margin-left: 8px; display: flex; align-items: center;">
                    <input type="text" id="ref-prefix-input" placeholder="Ref Prefix" 
                           style="width: 80px; padding: 6px 10px; font-size: 13px; border: 1px solid #e2e8f0; border-radius: 6px; outline: none;"
                           oninput="if(window.gridApi) window.gridApi.refreshCells({ force: true, columns: ['refNumber'] })">
                  </div>

                  <div class="search-wrapper-grid">
                    <input type="text" placeholder="Search transactions..." onkeyup="if(window.gridApi) window.gridApi.setGridOption('quickFilterText', this.value)" class="grid-search-input">
                  </div>
               </div>
               
               <div class="dropdown-container">
                    <button class="btn-icon-menu" onclick="window.toggleTxnMenu(event)" title="More Options">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                    </button>
                     <div id="txn-dropdown-menu" class="dropdown-menu hidden">
                        <button onclick="window.exportGrid()" class="dropdown-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                            <span>Export CSV</span>
                        </button>
                        <button onclick="window.trainFromGrid()" class="dropdown-item">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2a10 10 0 1 0 10 10 4 4 0 0 1-5-5 4 4 0 0 1-5-5"></path><path d="M8.5 8.5v.01"></path><path d="M16 12v.01"></path><path d="M12 16v.01"></path><path d="M12 2v4"></path><path d="M12 18v4"></path><path d="M4.93 4.93l2.83 2.83"></path><path d="M16.24 16.24l2.83 2.83"></path></svg>
                            <span>Train from Grid</span>
                        </button>
                        <div class="dropdown-divider"></div>
                        <button onclick="window.clearGrid()" class="dropdown-item danger">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            <span>Clear All</span>
                        </button>
                    </div>
               </div>
           </div>
       </div>

       <div class="txn-grid-container">
          <div id="txnGrid" class="ag-theme-alpine" style="height: 100%; width: 100%;"></div>
       </div>
    </div>
    
    <script>
       setTimeout(() => window.initTransactionsGrid(), 50);
    </script>
    `;
};


// --- 3. GRID INITIALIZATION ---

// --- 3. GRID INITIALIZATION ---

window.initTransactionsGrid = function () {
    const gridDiv = document.querySelector('#txnGrid');
    if (!gridDiv) return;

    // Show loading overlay
    if (window.LoadingOverlay) {
        window.LoadingOverlay.show('Loading transactions...', gridDiv);
    }

    const data = getGridRowData();
    if (!data || data.length === 0) {
        if (window.LoadingOverlay) window.LoadingOverlay.hide();
        gridDiv.innerHTML = `
            <div class="grid-empty-state">
                <img src="src/assets/empty-state.png" alt="No transactions">
                <h3>No transactions yet</h3>
                <p>Import your bank statement or add your first entry manually to get started.</p>
            </div>
        `;
        return;
    }

    const columnDefs = [
        {
            headerName: "",
            width: 50,
            checkboxSelection: true,
            headerCheckboxSelection: true,
            headerCheckboxSelectionFilteredOnly: true, // FIX: Only select filtered rows
            suppressMenu: true,
            pinned: 'left'
        },
        {
            headerName: "Ref#",
            colId: "refNumber",
            width: 100,
            suppressMenu: true,
            valueGetter: params => {
                const prefixInput = document.getElementById('ref-prefix-input');
                const prefix = prefixInput ? prefixInput.value.trim() : '';
                // rowIndex is 0-based
                const index = params.node.rowIndex + 1;
                const indexStr = index.toString().padStart(3, '0');
                return prefix ? `${prefix}-${indexStr}` : indexStr;
            },
            cellStyle: { color: '#64748b', fontWeight: '500' }
        },
        {
            field: "date",
            headerName: "Date",
            flex: 1,
            minWidth: 110,
            sortable: true,
            filter: 'agDateColumnFilter'
        },
        // ... (rest of columns unchanged, but context requires them for match)
        {
            field: "description",
            headerName: "Payee / Description",
            flex: 3,
            minWidth: 250,
            editable: true,
            filter: true,
            valueFormatter: params => (params.value || '').toUpperCase(),
            cellStyle: { fontWeight: 500 }
        },
        {
            field: "accountDescription",
            headerName: "Account",
            flex: 2,
            minWidth: 180,
            autoHeight: true,
            editable: true,
            cellEditor: GridGroupedAccountEditor,
            cellRenderer: params => {
                let displayVal = resolveAccountName(params.value);

                if (!params.value || displayVal === 'Uncategorized')
                    return '<span style="color:#cbd5e1; font-style:italic;">Uncategorized</span>';
                return `<span style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:12px; font-weight:600; font-size:12px;">${displayVal}</span>`;
            }
        },
        // ...
    ];

    // ... (rest of function)
    columnDefs.push({
        headerName: "Status",
        flex: 1,
        minWidth: 100,
        valueGetter: params => {
            const rawVal = params.data.accountDescription || params.data.category;
            const clean = resolveAccountName(rawVal);
            return (clean && clean !== 'Uncategorized' && clean !== '') ? 'Matched' : 'Unmatched';
        },
        cellRenderer: params => {
            const color = params.value === 'Matched' ? '#10b981' : '#f59e0b';
            return `<div style="text-align: center;"><span style="font-size: 11px; font-weight: 700; color: ${color}; background: ${color}15; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">${params.value}</span></div>`;
        },
    });

    columnDefs.push({
        headerName: "Actions",
        flex: 0.8,
        minWidth: 80,
        maxWidth: 100,
        cellRenderer: params => {
            return `
                  <div style="display:flex; gap: 8px; align-items: center; height: 100%;">
                    <button title="Swap" onclick="window.gridSwap(${params.rowIndex})" style="border:none; background:#f1f5f9; cursor:pointer; padding: 2px 6px; border-radius: 4px;">⇄</button>
                    <button title="Delete" onclick="window.gridDelete(${params.rowIndex})" style="border:none; background:#fef2f2; color:#ef4444; cursor:pointer; padding: 2px 6px; border-radius: 4px;">✕</button>
                  </div>
                `;
        }
    });

    // Add debit/credit columns
    columnDefs.splice(4, 0,
        {
            headerName: "Debit",
            editable: true,
            // ... (keeping implementation)
            flex: 1,
            minWidth: 90,
            valueGetter: params => {
                let val = parseFloat(params.data.debit) || 0;
                if (val === 0 && params.data.type === 'debit') {
                    val = parseFloat(params.data.amount) || 0;
                }
                return val > 0 ? val : null;
            },
            valueSetter: params => {
                const newVal = parseFloat(params.newValue);
                if (isNaN(newVal) || newVal === 0) {
                    params.data.debit = 0;
                } else {
                    params.data.debit = Math.abs(newVal);
                    params.data.credit = 0;
                    params.data.type = 'debit';
                    params.data.amount = params.data.debit;
                }
                return true;
            },
            valueFormatter: params => {
                if (!params.value) return '';
                return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(params.value);
            },
            cellClass: 'editable-cell-amount',
            cellStyle: { color: '#334155', textAlign: 'right', fontWeight: '500' }
        },
        {
            headerName: "Credit",
            editable: true,
            // ...
            flex: 1,
            minWidth: 90,
            valueGetter: params => {
                let val = parseFloat(params.data.credit) || 0;
                if (val === 0 && params.data.type === 'credit') {
                    val = parseFloat(params.data.amount) || 0;
                }
                return val > 0 ? val : null;
            },
            valueSetter: params => {
                const newVal = parseFloat(params.newValue);
                if (isNaN(newVal) || newVal === 0) {
                    params.data.credit = 0;
                } else {
                    params.data.credit = Math.abs(newVal);
                    params.data.debit = 0;
                    params.data.type = 'credit';
                    params.data.amount = params.data.credit;
                }
                return true;
            },
            valueFormatter: params => {
                if (!params.value) return '';
                return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(params.value);
            },
            cellClass: 'editable-cell-amount',
            cellStyle: { color: '#10b981', fontWeight: 'bold', textAlign: 'right' }
        }
    );

    const gridOptions = {
        columnDefs: columnDefs,
        rowData: getGridRowData(),
        rowSelection: 'multiple',
        rowHeight: 48,
        headerHeight: 40,
        animateRows: true,
        enableCellTextSelection: true,
        onSelectionChanged: () => {
            // ...
            if (!window.gridApi) return;
            const nodes = window.gridApi.getSelectedNodes();
            const count = nodes.length;
            const bulkArea = document.getElementById('bulk-actions-area');
            const countLabel = document.getElementById('selection-count');
            if (bulkArea) {
                bulkArea.style.display = count > 0 ? 'flex' : 'none';
                if (countLabel) countLabel.innerText = `${count} selected`;
            }
        },
        onCellValueChanged: async (params) => {
            const colId = params.column.getColId();

            // If Account/Category changed
            if (colId === 'accountDescription' || colId === 'category') {
                const newCat = params.newValue;
                const payee = params.data.description;

                // If valid category and payee exists
                if (newCat && newCat !== 'Uncategorized' && payee) {
                    // Normalize
                    params.data.category = newCat;
                    params.data.accountDescription = newCat;

                    // LEARN IT!
                    if (window.merchantDictionary) {
                        try {
                            await window.merchantDictionary.confirmCategorization(payee, newCat);
                            if (window.showToast) window.showToast(`Learned rule: "${payee}" -> ${newCat}`, 'success');
                        } catch (e) {
                            console.error('Failed to learn rule:', e);
                        }
                    }
                }
            }
            saveGridData();
            window.updateHeaderStats();
        },
        onGridReady: (params) => {
            console.log("📈 Transactions Grid: Ready & Adjusted");
            // Hide loading overlay once grid is ready
            if (window.LoadingOverlay) {
                window.LoadingOverlay.hide();
            }
        }
    };

    window.gridApi = agGrid.createGrid(gridDiv, gridOptions);

    // Initial Undo Button State
    window.updateUndoButton();
};

// ... (Rest of file) ...

// --- 5. BULK ACTIONS & INTELLIGENCE ---

// ... (bulkRename unchanged) ...
window.bulkRename = function () {
    if (!window.gridApi) return;
    const selectedNodes = window.gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    // Use current description of first item as default
    const firstDesc = selectedNodes[0].data.description || '';
    const newDesc = prompt(`Rename ${selectedNodes.length} transactions to:`, firstDesc);

    if (newDesc !== null && newDesc !== '') {
        selectedNodes.forEach(node => {
            node.data.description = newDesc;
        });
        window.gridApi.refreshCells({ force: true });
        saveGridData();
        if (window.showToast) window.showToast(`Renamed ${selectedNodes.length} items`, 'success');
    }
};

window.bulkCategorize = function () {
    if (!window.gridApi) return;
    const selectedNodes = window.gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    // Create Modal for Category Selection
    const existing = document.getElementById('bulk-cat-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'bulk-cat-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Inter', sans-serif;
    `;

    const groups = getGroupedCoA(); // Reuse existing helper
    let listHtml = '';

    // Build collapsible list
    let groupIndex = 0;
    Object.keys(groups).forEach(grp => {
        if (groups[grp].length > 0) {
            // FIX: Collapse all groups by default
            listHtml += `
                <div class="bulk-group-header" onclick="toggleBulkGroup('bg-${groupIndex}', this)">
                    <span style="font-size: 10px; margin-right: 6px; width: 12px; display:inline-block;">▶</span>
                    ${grp} 
                    <span style="margin-left:auto; font-weight:normal; color:#94a3b8; font-size:10px;">${groups[grp].length}</span>
                </div>
                <div id="bg-${groupIndex}" class="bulk-group-items" style="display: none;">
            `;

            groups[grp].forEach(acc => {
                listHtml += `<div class="bulk-cat-item" onclick="window.confirmBulkCat('${acc.replace(/'/g, "\\'")}')">${acc}</div>`;
            });
            listHtml += `</div>`;
            groupIndex++;
        }
    });

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 400px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                <h3 style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 600;">Categorize ${selectedNodes.length} Transactions</h3>
                <button onclick="document.getElementById('bulk-cat-modal').remove()" style="border:none; background:none; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
            </div>
            
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0; background: #fff;">
                <input type="text" id="bulk-cat-search" placeholder="Search accounts..." 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 14px;">
                       
                <div style="margin-top: 10px; display: flex; align-items: center; gap: 16px; font-size: 13px; color: #334155;">
                     <div style="display:flex; align-items:center;">
                        <input type="checkbox" id="chk-overwrite-cats" checked style="margin-right: 6px;">
                        <label for="chk-overwrite-cats" style="cursor: pointer;">Overwrite existing</label>
                     </div>
                     <div style="display:flex; align-items:center;" title="Add these descriptions to the dictionary for future auto-categorization">
                        <input type="checkbox" id="chk-learn-rule" style="margin-right: 6px;">
                        <label for="chk-learn-rule" style="cursor: pointer;">Learn Rule (Permanent)</label>
                     </div>
                </div>
            </div>

            <div id="bulk-cat-list" style="flex: 1; overflow-y: auto; padding-bottom: 10px;">
                ${listHtml}
            </div>
            <style>
                 .bulk-group-header { 
                    padding: 10px 16px; background: #f1f5f9; font-weight: 700; color: #475569; 
                    font-size: 11px; text-transform: uppercase; cursor: pointer; border-bottom: 1px solid #e2e8f0;
                    display: flex; align-items: center; user-select: none;
                }
                .bulk-group-header:hover { background: #e2e8f0; }
                .bulk-cat-item { padding: 10px 16px 10px 34px; font-size: 13px; color: #334155; cursor: pointer; border-bottom: 1px solid #f8fafc; }
                .bulk-cat-item:hover { background: #eff6ff; color: #2563eb; }
            </style>
        </div>
    `;

    document.body.appendChild(modal);

    // ... (Helpers and Listeners) ...
    // Add global toggle helper if not exists
    if (!window.toggleBulkGroup) {
        window.toggleBulkGroup = function (id, header) {
            const el = document.getElementById(id);
            const icon = header.querySelector('span');
            if (el.style.display === 'none') {
                el.style.display = 'block';
                if (icon) icon.innerText = '▼';
            } else {
                el.style.display = 'none';
                if (icon) icon.innerText = '▶';
            }
        };
    }

    const searchInput = document.getElementById('bulk-cat-search');
    const listContainer = document.getElementById('bulk-cat-list');

    searchInput.focus();
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        if (!term) {
            window.renderBulkList(listContainer, groups, term);
            return;
        }
        window.renderBulkList(listContainer, groups, term);
    });
};

window.renderBulkList = function (container, groups, term) {
    let html = '';
    let groupIndex = 0;
    const isSearch = term && term.length > 0;

    Object.keys(groups).forEach(grp => {
        const matches = groups[grp].filter(a => !isSearch || a.toLowerCase().includes(term));

        if (matches.length > 0) {
            const displayStyle = isSearch ? 'block' : 'none';
            const icon = isSearch ? '▼' : '▶';

            html += `
                <div class="bulk-group-header" onclick="toggleBulkGroup('bg-${groupIndex}', this)">
                    <span style="font-size: 10px; margin-right: 6px; width: 12px; display:inline-block;">${icon}</span>
                    ${grp} 
                    <span style="margin-left:auto; font-weight:normal; color:#94a3b8; font-size:10px;">${matches.length}</span>
                </div>
                <div id="bg-${groupIndex}" class="bulk-group-items" style="display: ${displayStyle};">
            `;
            matches.forEach(acc => {
                html += `<div class="bulk-cat-item" onclick="window.confirmBulkCat('${acc.replace(/'/g, "\\'")}')">${acc}</div>`;
            });
            html += `</div>`;
            groupIndex++;
        }
    });

    if (html === '') html = '<div style="padding: 20px; text-align: center; color: #94a3b8;">No accounts found</div>';
    container.innerHTML = html;
}

window.confirmBulkCat = async function (category) {
    if (!window.gridApi) return;
    const selectedNodes = window.gridApi.getSelectedNodes();

    // CHECK OVERWRITE FLAG
    const overwriteChk = document.getElementById('chk-overwrite-cats');
    const learnChk = document.getElementById('chk-learn-rule');

    const overwrite = overwriteChk ? overwriteChk.checked : true; // Default true if missing
    const shouldLearn = learnChk ? learnChk.checked : false;

    let updatedCount = 0;
    const descriptionsToLearn = new Set();

    // CAPTURE STATE BEFORE CHANGES
    if (selectedNodes.length > 0) window.captureState();

    selectedNodes.forEach(node => {
        // Condition: Overwrite ON OR Item is currently empty/uncategorized
        const currentCat = node.data.category || node.data.accountDescription; // Normalize
        const isUncategorized = !currentCat || currentCat === 'Uncategorized';

        if (overwrite || isUncategorized) {
            node.data.accountDescription = category;
            node.data.category = category;
            updatedCount++;

            // Collect for learning if enabled
            if (shouldLearn && node.data.description) {
                descriptionsToLearn.add(node.data.description);
            }
        }
    });

    // Execute Learning if requested
    if (shouldLearn && descriptionsToLearn.size > 0 && window.merchantDictionary) {
        console.log(`🧠 Learning rules for ${descriptionsToLearn.size} descriptions...`);
        for (const desc of descriptionsToLearn) {
            // Learn async but don't block UI refresh
            await window.merchantDictionary.learn(desc, category);
        }
        if (window.showToast) window.showToast(`Learned ${descriptionsToLearn.size} new rules`, 'info');
    }

    window.gridApi.refreshCells({ force: true });
    window.gridApi.deselectAll();
    saveGridData();

    const modal = document.getElementById('bulk-cat-modal');
    if (modal) modal.remove();

    if (window.showToast) window.showToast(`Categorized ${updatedCount} items to "${category}"`, 'success');
};


// --- 4. ACTIONS & INTELLIGENCE ---

window.gridSwap = function (index) {
    window.captureState(); // CAPTURE
    const data = window.transactionData[index];
    if (!data) return;

    let deb = parseFloat(data.debit) || 0;
    let cred = parseFloat(data.credit) || 0;

    if (deb === 0 && cred === 0 && data.amount > 0) {
        if (data.type === 'debit') { deb = data.amount; }
        else { cred = data.amount; }
    }

    const temp = deb;
    deb = cred;
    cred = temp;

    data.debit = deb;
    data.credit = cred;
    data.amount = deb > 0 ? deb : cred;
    data.type = deb > 0 ? 'debit' : 'credit';

    window.gridApi.setRowData(window.transactionData);
    saveGridData();
    window.updateHeaderStats();
};

window.gridDelete = function (index) {
    if (!confirm('Delete this transaction?')) return;
    window.captureState(); // CAPTURE
    window.transactionData.splice(index, 1);
    window.gridApi.setGridOption('rowData', window.transactionData);
    saveGridData();
    window.updateHeaderStats();
};

window.deselectGrid = function () {
    if (window.gridApi) window.gridApi.deselectAll();
};

window.exportGrid = function () {
    if (window.gridApi) window.gridApi.exportDataAsCsv();
    else alert('Grid is still loading or empty.');
};

window.updateOpeningBalance = function (val) {
    window.transactionState.openingBalance = parseFloat(val) || 0;
    localStorage.setItem('txn_openingBalance', window.transactionState.openingBalance);
    window.updateHeaderStats();
};

window.updateHeaderStats = function () {
    const data = window.transactionData || [];
    const openingBal = window.transactionState.openingBalance || 0;

    const totalIn = data.reduce((acc, t) => {
        const val = parseFloat(t.credit) || (t.type === 'credit' ? parseFloat(t.amount) : 0) || 0;
        return acc + val;
    }, 0);
    const totalOut = data.reduce((acc, t) => {
        const val = parseFloat(t.debit) || (t.type === 'debit' ? parseFloat(t.amount) : 0) || 0;
        return acc + val;
    }, 0);
    const ending = parseFloat(openingBal) + totalIn - totalOut;

    const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(n));

    const elIn = document.getElementById('stat-total-in');
    const elOut = document.getElementById('stat-total-out');
    const elEnd = document.getElementById('stat-ending-bal');

    if (elIn) elIn.innerText = '+' + fmt(totalIn);
    if (elOut) {
        elOut.innerText = '-' + fmt(totalOut);
        elOut.style.color = '#334155';
    }
    if (elEnd) elEnd.innerText = '$' + fmt(ending);
};

window.clearGrid = function () {
    if (!confirm('Clear ALL transactions?')) return;
    window.transactionData = [];
    window.gridApi.setGridOption('rowData', []);
    saveGridData();
    window.updateHeaderStats();
}

// --- 5. BULK ACTIONS & INTELLIGENCE ---

// --- 5. BULK ACTIONS & INTELLIGENCE ---

window.bulkRename = function () {
    if (!window.gridApi) return;
    const selectedNodes = window.gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    // Use current description of first item as default
    const firstDesc = selectedNodes[0].data.description || '';
    const newDesc = prompt(`Rename ${selectedNodes.length} transactions to:`, firstDesc);

    if (newDesc !== null && newDesc !== '') {
        window.captureState(); // CAPTURE
        selectedNodes.forEach(node => {
            node.data.description = newDesc;
        });
        window.gridApi.refreshCells({ force: true });
        saveGridData();
        if (window.showToast) window.showToast(`Renamed ${selectedNodes.length} items`, 'success');
    }
};

window.bulkCategorize = function () {
    if (!window.gridApi) return;
    const selectedNodes = window.gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    // Create Modal for Category Selection
    const existing = document.getElementById('bulk-cat-modal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'bulk-cat-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
        display: flex; align-items: center; justify-content: center; z-index: 10000;
        font-family: 'Inter', sans-serif;
    `;

    const groups = getGroupedCoA(); // Reuse existing helper
    let listHtml = '';

    // Build collapsible list
    let groupIndex = 0;
    Object.keys(groups).forEach(grp => {
        if (groups[grp].length > 0) {
            const isFirst = false; // Collapse all by default as requested "compressed"
            const displayStyle = isFirst ? 'block' : 'none';
            const icon = isFirst ? '▶' : '▼'; // Actually ▼ is usually open, ▶ closed. Let's stick to standard.
            // Wait, standard is ▶ for closed (pointing right), ▼ for open (pointing down).

            listHtml += `
                <div class="bulk-group-header" onclick="toggleBulkGroup('bg-${groupIndex}', this)">
                    <span style="font-size: 10px; margin-right: 6px; width: 12px; display:inline-block;">▶</span>
                    ${grp} 
                    <span style="margin-left:auto; font-weight:normal; color:#94a3b8; font-size:10px;">${groups[grp].length}</span>
                </div>
                <div id="bg-${groupIndex}" class="bulk-group-items" style="display: none;">
            `;

            groups[grp].forEach(acc => {
                listHtml += `<div class="bulk-cat-item" onclick="window.confirmBulkCat('${acc.replace(/'/g, "\\'")}')">${acc}</div>`;
            });

            listHtml += `</div>`;
            groupIndex++;
        }
    });

    modal.innerHTML = `
        <div style="background: white; border-radius: 12px; width: 400px; max-height: 80vh; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
            <div style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
                <h3 style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 600;">Categorize ${selectedNodes.length} Transactions</h3>
                <button onclick="document.getElementById('bulk-cat-modal').remove()" style="border:none; background:none; font-size: 20px; cursor: pointer; color: #64748b;">&times;</button>
            </div>
            <div style="padding: 12px; border-bottom: 1px solid #e2e8f0;">
                <input type="text" id="bulk-cat-search" placeholder="Search accounts..." 
                       style="width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; outline: none; font-size: 14px;">
            </div>
            <div id="bulk-cat-list" style="flex: 1; overflow-y: auto; padding-bottom: 10px;">
                ${listHtml}
            </div>
            <style>
                .bulk-group-header { 
                    padding: 10px 16px; background: #f1f5f9; font-weight: 700; color: #475569; 
                    font-size: 11px; text-transform: uppercase; cursor: pointer; border-bottom: 1px solid #e2e8f0;
                    display: flex; align-items: center; user-select: none;
                }
                .bulk-group-header:hover { background: #e2e8f0; }
                .bulk-cat-item { padding: 10px 16px 10px 34px; font-size: 13px; color: #334155; cursor: pointer; border-bottom: 1px solid #f8fafc; }
                .bulk-cat-item:hover { background: #eff6ff; color: #2563eb; }
            </style>
        </div>
    `;

    document.body.appendChild(modal);

    // Add global toggle helper if not exists
    if (!window.toggleBulkGroup) {
        window.toggleBulkGroup = function (id, header) {
            const el = document.getElementById(id);
            const icon = header.querySelector('span');
            if (el.style.display === 'none') {
                el.style.display = 'block';
                if (icon) icon.innerText = '▼';
            } else {
                el.style.display = 'none';
                if (icon) icon.innerText = '▶';
            }
        };
    }

    // Search Handler
    const searchInput = document.getElementById('bulk-cat-search');
    const listContainer = document.getElementById('bulk-cat-list');

    searchInput.focus();
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();

        // If searching, show flat list or expand all? 
        // Better UX: Show flat list of matches for easier scanning
        if (!term) {
            // Reset to grouped view (simple re-call function? No, let's just rebuild HTML quickly here or simplistic approach)
            // We can't access listHtml easily unless we rebuild.
            // Let's just recreate logic.
            // Actually, we can just hide/show items. But groups make it tricky.
            // Simplest: Re-render groups but expanded if match found?
            // Let's just re-render the whole innerHTML.
            window.renderBulkList(listContainer, groups, term);
            return;
        }
        window.renderBulkList(listContainer, groups, term);
    });
};

window.renderBulkList = function (container, groups, term) {
    let html = '';
    let groupIndex = 0;
    const isSearch = term && term.length > 0;

    Object.keys(groups).forEach(grp => {
        const matches = groups[grp].filter(a => !isSearch || a.toLowerCase().includes(term));

        if (matches.length > 0) {
            // If searching, keep expanded. If not, collapsed.
            const displayStyle = isSearch ? 'block' : 'none';
            const icon = isSearch ? '▼' : '▶';

            html += `
                <div class="bulk-group-header" onclick="toggleBulkGroup('bg-${groupIndex}', this)">
                    <span style="font-size: 10px; margin-right: 6px; width: 12px; display:inline-block;">${icon}</span>
                    ${grp} 
                    <span style="margin-left:auto; font-weight:normal; color:#94a3b8; font-size:10px;">${matches.length}</span>
                </div>
                <div id="bg-${groupIndex}" class="bulk-group-items" style="display: ${displayStyle};">
            `;
            matches.forEach(acc => {
                html += `<div class="bulk-cat-item" onclick="window.confirmBulkCat('${acc.replace(/'/g, "\\'")}')">${acc}</div>`;
            });
            html += `</div>`;
            groupIndex++;
        }
    });

    if (html === '') html = '<div style="padding: 20px; text-align: center; color: #94a3b8;">No accounts found</div>';
    container.innerHTML = html;
}

window.confirmBulkCat = async function (category) {
    if (!window.gridApi) return;
    const selectedNodes = window.gridApi.getSelectedNodes();

    // CHECK FLAGS
    const overwriteChk = document.getElementById('chk-overwrite-cats');
    const learnChk = document.getElementById('chk-learn-rule');

    const overwrite = overwriteChk ? overwriteChk.checked : true;
    const shouldLearn = learnChk ? learnChk.checked : false;

    let updatedCount = 0;
    const descriptionsToLearn = new Set();

    // CAPTURE STATE
    if (selectedNodes.length > 0) window.captureState();

    selectedNodes.forEach(node => {
        // Condition: Overwrite ON OR Item is currently empty/uncategorized
        const currentCat = node.data.category || node.data.accountDescription; // Normalize
        const isUncategorized = !currentCat || currentCat === 'Uncategorized';

        if (overwrite || isUncategorized) {
            node.data.accountDescription = category;
            node.data.category = category;
            updatedCount++;

            // Collect for learning if enabled
            if (shouldLearn && node.data.description) {
                descriptionsToLearn.add(node.data.description);
            }
        }
    });

    // Execute Learning if requested
    if (shouldLearn && descriptionsToLearn.size > 0 && window.merchantDictionary) {
        console.log(`🧠 Learning rules for ${descriptionsToLearn.size} descriptions...`);
        for (const desc of descriptionsToLearn) {
            // Learn async but don't block UI refresh
            await window.merchantDictionary.learn(desc, category);
        }
        if (window.showToast) window.showToast(`Learned ${descriptionsToLearn.size} new rules`, 'info');
    }

    window.gridApi.refreshCells({ force: true });
    window.gridApi.deselectAll();
    saveGridData();

    const modal = document.getElementById('bulk-cat-modal');
    if (modal) modal.remove();

    if (window.showToast) window.showToast(`Categorized ${updatedCount} items to "${category}"`, 'success');
};

/**
 * INTELLIGENCE ENGINE v4.0
 * Uses MerchantCategorizer (if avail) or internal Dictionary
 */
window.runMatchScan = function () {
    if (!window.gridApi) return;
    // Filter to show only items with 'Matched' status (which means valid account/category but not confirmed?)
    // Actually, 'Review Matches' usually implies filtering to see what the AI found.
    // Based on status column getter: 'Matched' if (clean && clean !== 'Uncategorized')

    // Let's set a filter model? Or just quick filter?
    // Quick filter "Matched" might work if "Status" column is filterable text.
    // Better: Use Filter API to show items where Status is 'Matched'.

    // Simple version: Quick filter for now since status text is in the grid
    // window.gridApi.setGridOption('quickFilterText', 'Matched');

    // Robust version: Filter by Account Column where value is not empty/uncategorized?
    // Let's stick to user intent: "Review Matches". 
    // If I use quick filter 'Matched', it might match 'Matched' in description too.

    window.gridApi.setFilterModel({
        'accountDescription': {
            filterType: 'text',
            type: 'notEqual',
            filter: 'Uncategorized'
        }
    });
    window.gridApi.onFilterChanged();
    if (window.showToast) window.showToast('Showing potential matches', 'info');
};

window.trainFromGrid = async function () {
    if (!window.gridApi || !window.merchantDictionary) return;

    if (window.showToast) window.showToast('🧠 Training brain from current grid...', 'info');

    let learnedCount = 0;

    // Iterate all rows (not just filtered)
    window.gridApi.forEachNode(async (node) => {
        const txn = node.data;
        const cat = txn.category || txn.accountDescription; // Normalize
        const payee = txn.description;

        // Condition: Must have valid category and payee
        if (cat && cat !== 'Uncategorized' && payee) {
            // We can fire these off without awaiting each individually for speed, 
            // but IDB might choke if thousands. Let's await to be safe? 
            // Actually, merchantDictionary probably handles async queue or transactions.
            // For UI responsiveness, maybe just do it.
            // Let's await to ensure we count correctly.
            try {
                // Not awaiting inside foreach strictly, but for simple counting it's okay.
                // Wait, forEachNode is synchronous. We can't await inside easily to block.
                // We'll just fire and forget, but counting might be off if we report immediately.
                // Better approach: collect promises.
            } catch (e) { }
        }
    });

    // Better implementation: Gather data first
    const tasks = [];
    window.gridApi.forEachNode((node) => {
        const txn = node.data;
        const cat = txn.category || txn.accountDescription;
        const payee = txn.description;
        if (cat && cat !== 'Uncategorized' && payee) {
            tasks.push({ payee, cat });
        }
    });

    if (tasks.length === 0) {
        if (window.showToast) window.showToast('No categorized items found to learn.', 'warning');
        return;
    }

    // Process chunked?
    for (const task of tasks) {
        await window.merchantDictionary.confirmCategorization(task.payee, task.cat);
        learnedCount++;
    }

    if (window.showToast) window.showToast(`✅ Training Complete! Learned ${learnedCount} rules from grid.`, 'success');
};

window.categorizeLedger = async function () {
    console.log('🔮 Transactions: Starting Ledger Intelligence scan (7-Step Engine)...');

    // SAFETY CHECK: Ensure grid is visible and ready
    if (!window.gridApi) {
        console.warn('⚠️ Grid API not initialized, categorization cancelled');
        if (window.showToast) window.showToast('Grid not ready. Please try again.', 'warning');
        return;
    }

    if (!window.ProcessingEngine) {
        console.error('ProcessingEngine not loaded');
        if (window.showToast) window.showToast('Categorization engine not fully loaded', 'error');
        return;
    }

    // Show loading overlay
    const gridDiv = document.getElementById('txnGrid');
    if (window.LoadingOverlay) {
        window.LoadingOverlay.show('Running AI Categorization (7-Step Engine)...', gridDiv);
    }

    // Capture Undo State
    window.captureState();

    try {
        const data = window.transactionData || [];
        const startCount = data.filter(t => !t.accountId || t.accountId === 'Uncategorized' || t.accountId === '9970').length;
        console.log(`Starting categorization for ${startCount} items (including Suspense)...`);

        // Use the centralized engine directly
        await window.ProcessingEngine.categorizeTransactions(
            data,
            (progress, message) => {
                // Optional: Update loading text if supported
                if (window.LoadingOverlay && window.LoadingOverlay.updateMessage) {
                    window.LoadingOverlay.updateMessage(message);
                }
            }
        );

        // Refresh Grid
        if (window.gridApi) {
            window.gridApi.setGridOption('rowData', window.transactionData);
            window.gridApi.refreshCells({ force: true });
        }
        saveGridData();

        const endCount = window.transactionData.filter(t => !t.accountId || t.accountId === 'Uncategorized' || t.accountId === '9970').length;
        const categorizedCount = startCount - endCount;

        if (categorizedCount > 0) {
            if (window.showToast) window.showToast(`✅ Successfully categorized ${categorizedCount} new transactions!`, 'success');
        } else {
            if (window.showToast) window.showToast('No new detailed matches found.', 'info');
        }

    } catch (e) {
        console.error('Auto-Categorization Failed:', e);
        if (window.showToast) window.showToast('Categorization failed: ' + e.message, 'error');
    } finally {
        if (window.LoadingOverlay) window.LoadingOverlay.hide();
    }
};

window.toggleTxnMenu = function (e) {
    e.stopPropagation();
    const menu = document.getElementById('txn-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
    const menu = document.getElementById('txn-dropdown-menu');
    if (menu && !menu.classList.contains('hidden')) {
        if (!e.target.closest('.dropdown-container')) {
            menu.classList.add('hidden');
        }
    }
});
