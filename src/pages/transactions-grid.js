/**
 * Transactions Grid (Ag Grid Version)
 * Replaces transactions-fixed.js with High-Performance Grid
 */

// --- 1. DATA & HELPERS ---

function getChartOfAccounts() {
    const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
    let rawCustom = [];
    try {
        rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
    } catch (e) { console.error('Failed to load custom COA', e); }

    // Return flat list for AG Grid Select Editor
    return [...rawDefault, ...rawCustom].map(a => a.name);
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

    const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

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
       </style>

       <!-- FIXED HEADER (MATCHING EXISTING) -->
       <div class="fixed-top-section">
          <header class="dashboard-header-modern" style="background: white; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div class="header-brand" style="display: flex; align-items: center; gap: 12px;">
                <div class="icon-box" style="width: 40px; height: 40px; background: linear-gradient(135deg, #3b82f6, #2563eb); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">🏦</div>
                <div class="header-info">
                    <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Imported Transactions (Grid)</h2>
                    <div class="meta" style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 6px;">
                        <span style="background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 0.7rem;">CHECKING</span>
                        <span>•</span>
                        <span>Ready for Review</span>
                    </div>
                </div>
            </div>

            <div class="header-stats" style="display: flex; gap: 24px; background: #f8fafc; padding: 8px 16px; border-radius: 12px; border: 1px solid #f1f5f9;">
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Opening Bal</label>
                    <div class="val">$<input type="number" value="${openingBal}" onchange="updateOpeningBalance(this.value)" style="border:none; bg:transparent; width:80px;"></div>
                </div>
                <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Total In</label>
                    <div id="stat-total-in" class="val" style="color:#10b981; font-weight:600;">+${fmt(totalIn).replace('$', '')}</div>
                </div>
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Total Out</label>
                    <div id="stat-total-out" class="val" style="color:#ef4444; font-weight:600;">-${fmt(totalOut).replace('$', '')}</div>
                </div>
                <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Ending Bal</label>
                    <div id="stat-ending-bal" class="val" style="color:#2563eb; font-weight:700;">${fmt(ending)}</div>
                </div>
            </div>
          </header>
          
          <!-- TOOLBAR -->
           <div class="control-bar" style="padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; background: #fdfdfd;">
               <div style="display:flex; gap: 10px;">
                  <button onclick="window.gridApi.exportDataAsCsv()" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; font-size: 13px;">📥 Export CSV</button>
                  <button onclick="window.clearGrid()" style="padding: 6px 12px; border: 1px solid #ef4444; color: #ef4444; border-radius: 6px; background: white; font-size: 13px;">🗑️ Clear All</button>
               </div>
               <input type="text" placeholder="Search transactions..." onkeyup="window.gridApi.setQuickFilter(this.value)" 
                      style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; width: 250px;">
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

    // Accounts for Dropdown
    const accountNames = getChartOfAccounts();

    const columnDefs = [
        {
            field: "date",
            headerName: "Date",
            width: 110,
            editable: true,
            sortable: true,
            cellEditor: 'agDateCellEditor'
        },
        {
            field: "description",
            headerName: "Payee / Description",
            flex: 2,
            editable: true,
            filter: true
        },
        {
            field: "accountDescription",
            headerName: "Account",
            flex: 1.5,
            editable: true,
            cellEditor: 'agSelectCellEditor',
            cellEditorParams: {
                values: ['Uncategorized', ...accountNames]
            },
            cellRenderer: params => {
                if (!params.value || params.value === 'Uncategorized')
                    return '<span style="color:#cbd5e1; font-style:italic;">Uncategorized</span>';
                return `<span style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:12px; font-weight:600; font-size:12px;">${params.value}</span>`;
            }
        },
        // DISPLAY DEBIT (if net < 0)
        {
            headerName: "Debit",
            width: 100,
            valueGetter: params => {
                const debit = parseFloat(params.data.debit) || 0;
                const credit = parseFloat(params.data.credit) || 0;
                const amount = parseFloat(params.data.amount) || 0;
                const type = params.data.type;

                // Logic: if stored as deb/cred, use that. else use amount/type
                let val = debit;
                if (debit === 0 && credit === 0 && amount !== 0) {
                    if (type === 'debit') val = amount;
                }

                // If it's effectively a debit (leaving account)
                return val > 0 ? val : null;
            },
            valueFormatter: params => params.value ? '$' + params.value.toFixed(2) : '',
            cellStyle: { color: '#334155' }
        },
        // DISPLAY CREDIT (if net > 0)
        {
            headerName: "Credit",
            width: 100,
            valueGetter: params => {
                const debit = parseFloat(params.data.debit) || 0;
                const credit = parseFloat(params.data.credit) || 0;
                const amount = parseFloat(params.data.amount) || 0;
                const type = params.data.type;

                let val = credit;
                if (debit === 0 && credit === 0 && amount !== 0) {
                    if (type === 'credit') val = amount;
                }

                return val > 0 ? val : null;
            },
            valueFormatter: params => params.value ? '$' + params.value.toFixed(2) : '',
            cellStyle: { color: '#10b981', fontWeight: 'bold' }
        },
        // ACTIONS
        {
            headerName: "Actions",
            width: 100,
            cellRenderer: params => {
                return `
                  <button title="Swap" onclick="window.gridSwap(${params.rowIndex})" style="border:none; bg:none; cursor:pointer;">⇄</button>
                  <button title="Delete" onclick="window.gridDelete(${params.rowIndex})" style="border:none; bg:none; color:red; cursor:pointer;">×</button>
                `;
            }
        }
    ];

    const gridOptions = {
        columnDefs: columnDefs,
        rowData: getGridRowData(),
        rowHeight: 40,
        headerHeight: 40,
        animateRows: true,
        enableCellTextSelection: true,

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
            window.gridApi = params.api;

            // RESPONSIVE LOGIC
            const sizeToFit = () => {
                const width = document.body.clientWidth;
                if (width > 768) {
                    params.api.sizeColumnsToFit();
                }
            };

            sizeToFit();
            window.addEventListener('resize', sizeToFit);
        }
    };

    new agGrid.Grid(gridDiv, gridOptions);
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
    window.gridApi.setRowData(window.transactionData);
    saveGridData();
    window.updateHeaderStats();
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

    const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' }).replace('$', '');

    // Update DOM
    const elIn = document.getElementById('stat-total-in');
    const elOut = document.getElementById('stat-total-out');
    const elEnd = document.getElementById('stat-ending-bal');

    if (elIn) elIn.innerText = '+' + fmt(totalIn);
    if (elOut) elOut.innerText = '-' + fmt(totalOut);
    if (elEnd) elEnd.innerText = '$' + fmt(ending);
};

window.clearGrid = function () {
    if (!confirm('Clear ALL transactions?')) return;
    window.transactionData = [];
    window.gridApi.setRowData([]);
    saveGridData();
    window.updateHeaderStats();
}
