/**
 * Transactions Grid (Ag Grid Version)
 * Replaces transactions-fixed.js with High-Performance Grid
 */

// --- 1. DATA & HELPERS ---
console.log('%c🚀 AUTOBOOKKEEPING v4.0 ACTIVE', 'background: #2563eb; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

function getChartOfAccounts() {
    const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
    let rawCustom = [];
    try {
        rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
    } catch (e) { console.error('Failed to load custom COA', e); }

    const all = [...rawDefault, ...rawCustom];

    // DEBUG: Identify the source of "Invalid" strings
    const invalidEntries = all.filter(a => a.name && a.name.toString().toLowerCase().includes("invalid"));
    if (invalidEntries.length > 0) {
        console.warn('🚨 FOUND INVALID ENTRIES IN COA:', invalidEntries);
    }

    // Return flat list for AG Grid Select Editor, aggressively filtering variations of "Invalid Number"
    return all
        .map(a => a.name)
        .filter(name => name && !name.toString().toLowerCase().includes("invalid"));
}

function resolveAccountName(val) {
    if (!val) return 'Uncategorized';
    val = val.toString().trim();

    // DEFENSIVE SHIELD: If value is "Invalid Number" or contains "invalid", force Uncategorized
    if (val.toLowerCase().includes("invalid")) return 'Uncategorized';

    // If it's just a 4-digit code, look it up
    if (val.match(/^\d{4}$/)) {
        const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
        let rawCustom = [];
        try { rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
        const all = [...rawDefault, ...rawCustom];
        const match = all.find(a => a.code === val);
        if (match && match.name && !match.name.toLowerCase().includes("invalid")) return match.name;
    }

    // Smart Clean: Only strip 4-digit code if descriptive text follows
    if (val.match(/^\d{4}\b\s+.+/)) {
        return val.replace(/^\d{4}\b\s*/, '');
    }

    return val;
}

function getGridRowData() {
    // Safe load
    if (window.storage && (!window.transactionData || window.transactionData.length === 0)) {
        try {
            window.transactionData = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
        } catch (e) { }
    }
    return window.transactionData || [];
}

function saveGridData() {
    localStorage.setItem('ab3_transactions', JSON.stringify(window.transactionData));
    // Trigger any subscribers
    if (window.updateAnalysisStatus) window.updateAnalysisStatus();
}

// --- 2. RENDER (SHELL) ---

window.renderTransactions = function () {
    // 0. Ensure State Exists (Fixes Crash)
    if (!window.transactionState) {
        window.transactionState = {
            openingBalance: parseFloat(localStorage.getItem('txn_openingBalance')) || 0
        };
    }

    // 1. Calculate Totals (Initial)
    const data = getGridRowData();
    const openingBal = window.transactionState.openingBalance || 0;

    // Quick Calc
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

    // 2. Return HTML (Retaining Original Header Style)
    return `
    <div class="transaction-page">
       <!-- STYLE OVERRIDES FOR GRID -->
       <style>
         .ag-theme-alpine { --ag-font-family: 'Inter', sans-serif; --ag-font-size: 13px; }
         .ag-header-cell-label { font-weight: 600; color: #64748b; }
         .amount-positive { color: #10b981; font-weight: 500; }
         .amount-negative { color: #334155; } /* Standard color for debits */
         .cell-action-btn:hover { background-color: #f1f5f9; border-radius: 4px; }

         /* DROPDOWN SYSTEM */
         .dropdown-container { position: relative; }
         .btn-icon-menu { 
             background: white; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; 
             padding: 6px; cursor: pointer; transition: all 0.2s; height: 32px; width: 32px; 
             display: flex; align-items: center; justify-content: center; 
         }
         .btn-icon-menu:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
         .dropdown-menu {
             position: absolute; top: 100%; right: 0; margin-top: 4px;
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
       </style>

       <!-- FIXED HEADER (MATCHING EXISTING) -->
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
          
          <!-- TOOLBAR -->
           <div class="control-bar-grid">
                <div class="control-left-grid">
                  <div id="bulk-actions-area" class="bulk-actions-pill" style="display: none;">
                    <span id="selection-count">0 selected</span>
                    <button onclick="window.bulkCategorize()" class="btn-bulk-action" id="btn-bulk-cat">✨ Bulk Categorize</button>
                    <button onclick="window.deselectGrid()" class="btn-clear-selection">✕ Clear</button>
                  </div>
                  <div class="search-wrapper-grid">
                    <input type="text" placeholder="Search transactions..." onkeyup="window.gridApi.setQuickFilter(this.value)" class="grid-search-input">
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
                        <div class="dropdown-divider"></div>
                        <button onclick="window.clearGrid()" class="dropdown-item danger">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                            <span>Clear All</span>
                        </button>
                    </div>
               </div>
           </div>
       </div>

       <!-- THE GRID -->
       <div style="padding: 0; background: #f1f5f9; height: calc(100vh - 180px);">
          <div id="txnGrid" class="ag-theme-alpine" style="height: 100%; width: 100%;"></div>
       </div>
    </div>
    
    <script>
       setTimeout(() => window.initTransactionsGrid(), 50);
    </script>
    `;
};


// --- 3. GRID INITIALIZATION ---

window.initTransactionsGrid = function () {
    const gridDiv = document.querySelector('#txnGrid');
    if (!gridDiv) return;

    // Check if there's no data - show empty state
    const data = getGridRowData();
    if (data.length === 0) {
        gridDiv.innerHTML = `
            <div class="grid-empty-state">
                <img src="assets/empty-state.png" alt="No transactions">
                <h3>No transactions yet</h3>
                <p>Import your bank statement or add your first entry manually to get started.</p>
            </div>
        `;
        return;
    }

    // Accounts for Dropdown
    const accountNames = getChartOfAccounts();

    const columnDefs = [
        {
            headerName: "",
            width: 50,
            checkboxSelection: true,
            headerCheckboxSelection: true,
            suppressMenu: true,
            pinned: 'left'
        },
        {
            field: "date",
            headerName: "Date",
            width: 120,
            sortable: true,
            filter: 'agDateColumnFilter'
        },
        {
            field: "description",
            headerName: "Payee / Description",
            flex: 3,
            minWidth: 300,
            editable: true,
            filter: true,
            valueFormatter: params => (params.value || '').toUpperCase(),
            cellStyle: { fontWeight: 500 }
        },
        {
            field: "accountDescription",
            headerName: "Account",
            minWidth: 150,
            autoHeight: true,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['Uncategorized', ...accountNames]
            },
            cellRenderer: params => {
                let displayVal = resolveAccountName(params.value);

                if (!params.value || displayVal === 'Uncategorized')
                    return '<span style="color:#cbd5e1; font-style:italic;">Uncategorized</span>';
                return `<span style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:12px; font-weight:600; font-size:12px;">${displayVal}</span>`;
            }
        },
        {
            headerName: "Status",
            width: 110,
            valueGetter: params => {
                const rawVal = params.data.accountDescription || params.data.category;
                const clean = resolveAccountName(rawVal);
                return (clean && clean !== 'Uncategorized' && clean !== '') ? 'Matched' : 'Unmatched';
            },
            cellRenderer: params => {
                const color = params.value === 'Matched' ? '#10b981' : '#f59e0b';
                return `<div style="text-align: center;"><span style="font-size: 11px; font-weight: 700; color: ${color}; background: ${color}15; padding: 2px 8px; border-radius: 12px; text-transform: uppercase;">${params.value}</span></div>`;
            }
        },
        {
            headerName: "Actions",
            width: 80,
            cellRenderer: params => {
                return `
                  <div style="display:flex; gap: 8px; align-items: center; height: 100%;">
                    <button title="Swap" onclick="window.gridSwap(${params.rowIndex})" style="border:none; background:#f1f5f9; cursor:pointer; padding: 2px 6px; border-radius: 4px;">⇄</button>
                    <button title="Delete" onclick="window.gridDelete(${params.rowIndex})" style="border:none; background:#fef2f2; color:#ef4444; cursor:pointer; padding: 2px 6px; border-radius: 4px;">✕</button>
                  </div>
                `;
            }
        }
    ];

    // Restore Debit/Credit columns properly
    columnDefs.splice(4, 0,
        {
            headerName: "Debit",
            valueGetter: params => {
                const debit = parseFloat(params.data.debit) || 0;
                const credit = parseFloat(params.data.credit) || 0;
                const amount = parseFloat(params.data.amount) || 0;
                const type = params.data.type;
                let val = debit;
                if (debit === 0 && credit === 0 && amount !== 0 && type === 'debit') val = amount;
                return val > 0 ? val : null;
            },
            valueFormatter: params => {
                if (!params.value) return '';
                return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(params.value);
            },
            cellStyle: { color: '#334155', textAlign: 'right' }
        },
        {
            headerName: "Credit",
            width: 100,
            valueGetter: params => {
                const debit = parseFloat(params.data.debit) || 0;
                const credit = parseFloat(params.data.credit) || 0;
                const amount = parseFloat(params.data.amount) || 0;
                const type = params.data.type;
                let val = credit;
                if (debit === 0 && credit === 0 && amount !== 0 && type === 'credit') val = amount;
                return val > 0 ? val : null;
            },
            valueFormatter: params => {
                if (!params.value) return '';
                return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(params.value);
            },
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

        onCellValueChanged: (params) => {
            // Update Underlying Data
            // We are mutating the object reference directly which is fine for simple arrs
            // But we must ensure specific logic (like Amount update creates Debit/Credit sync)

            // Re-save
            saveGridData();

            // Re-calc Header Stats
            window.updateHeaderStats();
        },
        onGridReady: (params) => {
            console.log("📈 Transactions Grid: Ready & Adjusted");
        }
    };

    // Use createGrid (v31+ standard)
    window.gridApi = agGrid.createGrid(gridDiv, gridOptions);
};


// --- 4. GRID ACTIONS ---

window.gridSwap = function (index) {
    // Get Raw Data Item
    const data = window.transactionData[index];
    if (!data) return;

    // Swap Logic (Robust)
    let deb = parseFloat(data.debit) || 0;
    let cred = parseFloat(data.credit) || 0;

    // If using amount/type
    if (deb === 0 && cred === 0 && data.amount > 0) {
        if (data.type === 'debit') { deb = data.amount; }
        else { cred = data.amount; }
    }

    // Perform Swap
    const temp = deb;
    deb = cred;
    cred = temp;

    // Update State
    data.debit = deb;
    data.credit = cred;
    data.amount = deb > 0 ? deb : cred;
    data.type = deb > 0 ? 'debit' : 'credit';

    // Refresh Grid
    window.gridApi.setRowData(window.transactionData); // brute force refresh safest for now
    saveGridData();
    window.updateHeaderStats();
    if (window.showToast) window.showToast('Values Swapped', 'success');
};

window.gridDelete = function (index) {
    if (!confirm('Delete this transaction?')) return;

    window.transactionData.splice(index, 1);

    if (window.gridApi) {
        window.gridApi.setGridOption('rowData', window.transactionData);
    }

    saveGridData();
    window.updateHeaderStats();
};

window.deselectGrid = function () {
    if (window.gridApi) {
        window.gridApi.deselectAll();
    }
};

window.exportGrid = function () {
    if (window.gridApi) {
        window.gridApi.exportDataAsCsv();
    } else {
        alert('Grid is still loading or empty.');
    }
};

window.updateOpeningBalance = function (val) {
    window.transactionState.openingBalance = parseFloat(val) || 0;
    localStorage.setItem('txn_openingBalance', window.transactionState.openingBalance);
    window.updateHeaderStats();
};

window.updateHeaderStats = function () {
    // Re-calc based on window.transactionData
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

    // Update DOM
    const elIn = document.getElementById('stat-total-in');
    const elOut = document.getElementById('stat-total-out');
    const elEnd = document.getElementById('stat-ending-bal');

    if (elIn) elIn.innerText = '+' + fmt(totalIn);
    if (elOut) {
        elOut.innerText = '-' + fmt(totalOut);
        elOut.style.color = '#334155'; // Force black for debits
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

window.bulkCategorize = async function () {
    if (!window.gridApi) return;
    const selectedNodes = window.gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    const category = prompt(`Select category for ${selectedNodes.length} items:`);
    if (!category) return;

    selectedNodes.forEach(node => {
        node.data.accountDescription = category;
        node.data.category = category;
    });

    window.gridApi.refreshCells({ force: true });
    window.gridApi.deselectAll();
    saveGridData();
    if (window.showToast) window.showToast(`Updated ${selectedNodes.length} items`, 'success');
};

window.categorizeLedger = async function () {
    console.log('🔮 Transactions: Starting Ledger Intelligence scan...');
    const data = window.transactionData || [];
    let updatedCount = 0;

    for (const txn of data) {
        if (txn.accountDescription && txn.accountDescription !== 'Uncategorized') continue;

        let match = null;
        if (window.patternDetector) {
            const detection = window.patternDetector.detect(txn.description);
            if (detection && detection.confidence > 0.6) {
                match = { category: detection.category };
            }
        }

        if (window.merchantDictionary && !match) {
            const dictMatch = await window.merchantDictionary.matchTransaction(txn.description);
            if (dictMatch) {
                match = { category: dictMatch.merchant?.default_category || dictMatch.suggestedCategory };
            }
        }

        if (match) {
            txn.accountDescription = match.category;
            txn.category = match.category;
            updatedCount++;
        }
    }

    if (updatedCount > 0) {
        console.log(`✅ Ledger Intelligence: Matched ${updatedCount} transactions.`);
        if (window.gridApi) window.gridApi.setGridOption('rowData', window.transactionData);
        saveGridData();
    }
};

// --- 6. GLOBAL EVENT LISTENERS ---

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

// Start intelligence
setTimeout(() => {
    if (window.categorizeLedger) window.categorizeLedger();
}, 2000);
