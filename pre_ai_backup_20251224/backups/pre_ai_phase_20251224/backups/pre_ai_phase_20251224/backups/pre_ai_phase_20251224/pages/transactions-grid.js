/**
 * Transactions Grid (Ag Grid Version)
 * Replaces transactions-fixed.js with High-Performance Grid
 */

// --- 0. STATE INITIALIZATION ---
if (!window.transactionState) {
    window.transactionState = {
        openingBalance: parseFloat(localStorage.getItem('txn_openingBalance') || 0),
        refPrefix: localStorage.getItem('txn_refPrefix') || 'TXN-',
        sortConfig: { key: 'date', direction: 'desc' }
    };
}

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
    // 1. Load Global Data
    let allData = [];
    if (window.storage && (!window.allTransactionData || window.allTransactionData.length === 0)) {
        try {
            allData = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
            window.allTransactionData = allData;
        } catch (e) { }
    } else {
        allData = window.allTransactionData || [];
    }

    // INTELLIGENCE: Initialize Engine with History
    if (window.CategorizationEngine) {
        window.CategorizationEngine.initialize(allData);
    }

    // 2. Identify Current Scope
    const currentAccountId = window.accountManager ? window.accountManager.getCurrentAccountId() : null;

    // 3. Filter Scope
    let viewData = allData;
    if (currentAccountId) {
        viewData = allData.filter(t => t.accountId === currentAccountId);
    }

    window.transactionData = viewData; // This is what the grid edits

    // ENHANCEMENT: Calculate Running Balances Chronologically
    return calculateRunningBalances(window.transactionData);
}

function calculateRunningBalances(data) {
    if (!data || data.length === 0) return [];

    // 2. Sort Chronologically (Oldest First)
    const sorted = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

    // 3. Iterate and Accumulate
    let currentBal = window.transactionState.openingBalance || 0;

    sorted.forEach(t => {
        const credit = parseFloat(t.credit) || (t.type === 'credit' ? parseFloat(t.amount) : 0) || 0;
        const debit = parseFloat(t.debit) || (t.type === 'debit' ? parseFloat(t.amount) : 0) || 0;

        currentBal = currentBal + credit - debit;
        t._balance = currentBal; // Tag the transaction
    });

    return data;
}

function saveGridData() {
    // CRITICAL: Merge View Data back into Global Data
    const currentAccountId = window.accountManager ? window.accountManager.getCurrentAccountId() : null;

    if (currentAccountId && window.allTransactionData) {
        // 1. Keep everyone else
        const others = window.allTransactionData.filter(t => t.accountId !== currentAccountId);
        // 2. Add current modified view
        const merged = [...others, ...window.transactionData];
        // 3. Save
        localStorage.setItem('ab3_transactions', JSON.stringify(merged));
        window.allTransactionData = merged; // Update cache
    } else {
        // Fallback for No Account Mode (Legacy)
        localStorage.setItem('ab3_transactions', JSON.stringify(window.transactionData));
    }

    // Trigger any subscribers
    if (window.updateAnalysisStatus) window.updateAnalysisStatus();
}

// --- 2. RENDER (SHELL) ---

window.renderTransactions = function () {
    console.log('🎨 renderTransactions called');

    // CACHE INVALIDATION: Force reload from storage on re-render
    // This fixes the issue where imports don't show up until hard refresh
    window.allTransactionData = null;

    // 1. Calculate Totals (Initial)
    const data = getGridRowData();
    const openingBal = window.transactionState ? window.transactionState.openingBalance : 0;

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

    // Dynamic Header Info
    const currentAccount = window.accountManager ? window.accountManager.getCurrentAccount() : null;
    const accountName = currentAccount ? currentAccount.accountName.toUpperCase() : 'ALL ACCOUNTS';
    const accountBadgeColor = currentAccount ? '#3b82f6' : '#64748b';

    // 2. Return HTML (Retaining Original Header Style)
    return `
    <div class="transaction-page">
       <!-- STYLE OVERRIDES FOR GRID -->
       <style>
         .ag-theme-quartz { --ag-font-family: 'Inter', sans-serif; --ag-font-size: 13px; --ag-header-background-color: #f8fafc; --ag-header-foreground-color: #64748b; }
         .ag-header-cell-label { font-weight: 600; color: #64748b; }
         .amount-positive { color: #10b981; font-weight: 500; }
         .amount-negative { color: #334155; } /* Standard color for debits */
         .action-menu { position: relative; display: inline-block; }
         .action-menu-btn { background: white; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 700; color: #475569; white-space: nowrap; display: flex; align-items: center; gap: 6px; }
         .action-menu-btn:hover { background: #f1f5f9; }
         .action-menu-content { display: none; position: absolute; right: 0; top: 100%; background-color: #fff; min-width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px; z-index: 1000; border: 1px solid #e2e8f0; margin-top: 4px; overflow: hidden; }
         .action-menu-item { color: #334155; padding: 10px 16px; text-decoration: none; display: block; font-size: 13px; text-align: left; background: none; border: none; width: 100%; cursor: pointer; }
         .action-menu-item:hover { background-color: #f8fafc; color: #2563eb; }
         .action-menu-item.danger { color: #ef4444; border-top: 1px solid #f1f5f9; }
         .action-menu-item.danger:hover { background-color: #fef2f2; }
         .show { display: block; }

         /* Detail Drawer - FIXED */
         .drawer-backdrop { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.3); z-index: 1040; opacity: 0; pointer-events: none; transition: opacity 0.3s; }
         .drawer-backdrop.open { opacity: 1; pointer-events: auto; }
         
         .detail-drawer { position: fixed; top: 0; right: -400px; width: 400px; height: 100%; background: white; box-shadow: -4px 0 16px rgba(0,0,0,0.1); z-index: 1050; transition: right 0.3s cubic-bezier(0.16, 1, 0.3, 1); display: flex; flex-direction: column; }
         .detail-drawer.open { right: 0; }
         
         .drawer-header { padding: 20px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; }
         .drawer-content { flex: 1; overflow-y: auto; padding: 24px; }
         .drawer-section { margin-bottom: 24px; }
         .drawer-label { font-size: 0.75rem; color: #64748b; font-weight: 600; text-transform: uppercase; margin-bottom: 6px; letter-spacing: 0.05em; }
         .drawer-value { font-size: 0.95rem; color: #334155; font-weight: 500; word-break: break-word; }
         .drawer-actions { padding: 20px 24px; border-top: 1px solid #e2e8f0; background: #f8fafc; display: flex; gap: 12px; }
       </style>

       <!-- FIXED HEADER (MATCHING EXISTING) -->
       <div class="fixed-top-section">
          <header class="dashboard-header-modern" style="background: white; padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
            <div class="header-brand" style="display: flex; align-items: center; gap: 12px;">
                <div class="icon-box" style="width: 40px; height: 40px; background: linear-gradient(135deg, ${accountBadgeColor}, #2563eb); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">🏦</div>
                <div class="header-info">
                    <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Transactions</h2>
                    <div class="meta" style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 6px;">
                        <span style="background: #eff6ff; color: ${accountBadgeColor}; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 0.7rem;">${accountName}</span>
                        <span>•</span>
                        <span>Manager</span>
                    </div>
                </div>
            </div>

            <div class="header-stats" style="display: flex; gap: 16px; background: #f8fafc; padding: 8px 16px; border-radius: 12px; border: 1px solid #f1f5f9; align-items: center;">
                
                <!-- SEARCH (Integrated) -->
                <div style="position: relative;">
                    <input type="text" placeholder="Search..." onkeyup="window.gridApi.setQuickFilter(this.value)" 
                       style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; width: 180px; font-size: 13px; background: white;">
                </div>

                <!-- POP OUT BUTTON -->
                <button onclick="window.popOutGrid()" title="Open Grid in New Window"
                   style="background: white; border: 1px solid #cbd5e1; padding: 6px 10px; border-radius: 6px; cursor: pointer; color: #475569; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                   <i class="ph ph-arrow-square-out" style="font-size: 16px;"></i>
                </button>

                <!-- REF PREFIX INPUT -->
                <div style="position: relative; margin-left: 8px;">
                   <input type="text" id="ref-prefix-input" 
                      value="${window.transactionState.refPrefix || ''}" 
                      placeholder="Ref#" 
                      title="Reference Prefix (e.g. CHQ, INV)"
                      onchange="window.updateRefPrefix(this.value)"
                      style="padding: 6px 8px; border: 1px solid #cbd5e1; border-radius: 6px; width: 60px; font-size: 13px; text-transform: uppercase; text-align: center; font-weight: 600; color: #475569;">
                </div>

                <!-- AI PROGRESS CARD -->
                <div id="ai-progress-card" style="display: none; align-items: center; gap: 12px; background: #eff6ff; border: 1px solid #bfdbfe; padding: 6px 16px; border-radius: 20px; margin-right: 12px;">
                    <span style="font-size: 0.85rem; font-weight: 600; color: #1e40af;">🤖 Auto-Cat</span>
                    <div style="width: 100px; height: 6px; background: #dbeafe; border-radius: 3px; overflow: hidden;"><div id="ai-progress-fill" style="height: 100%; width: 0%; background: linear-gradient(90deg, #3b82f6, #60a5fa); transition: width 0.2s ease-out;"></div></div>
                    <span id="ai-progress-text" style="font-size: 0.75rem; font-family: monospace; color: #1e40af;">0%</span>
                </div>

                <!-- ACTIONS MENU was here, moved to end -->

                <div style="flex: 1;"></div> <!-- Spacer to push stats to right -->

                <!-- SCAN 9970s BUTTON -->
                <button onclick="window.scanAndFix9970s()" style="margin-right: 24px; padding: 6px 16px; border: 1px solid #1e40af; background: #eff6ff; color: #1e40af; font-weight: 600; border-radius: 20px; font-size: 0.8rem; cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;">
                    <span>🕵️ Fix 9970s</span>
                </button>

                <!-- STATS GROUP -->
                <div style="display: flex; gap: 24px; align-items: center;">
                    
                    <!-- OPENING BAL (Click to Edit) -->
                    <div class="stat-unit" onclick="window.editOpBal()" style="cursor:pointer; position:relative;" title="Click to edit">
                        <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom:2px; display:block;">Opening Bal</label>
                        <div class="val" style="min-width: 80px; height: 24px; display: flex; align-items: center;">
                            <span id="op-bal-display" style="font-size: 1.1rem; font-weight: 700; color: #334155; white-space: nowrap;">
                                ${Number(openingBal).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                            </span>
                            <input id="op-bal-input" type="number" step="0.01" value="${openingBal}" 
                                onblur="window.saveOpBal(this.value)" 
                                onkeydown="if(event.key==='Enter') this.blur()"
                                onclick="event.stopPropagation()"
                                style="display:none; position:absolute; left:0; bottom:0; width: 100px; font-family: inherit; font-size: 1.1rem; font-weight: 700; color: #334155; border: 1px solid #cbd5e1; border-radius: 4px; padding: 0 4px; background: white; z-index: 10;">
                        </div>
                    </div>

                    <div style="width: 1px; height: 24px; background: #e2e8f0;"></div>

                    <div class="stat-unit">
                        <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom:2px; display:block;">CREDITS (${data.filter(t => (parseFloat(t.credit) || (t.type === 'credit' && t.amount)) > 0).length})</label>
                        <div id="stat-total-in" class="val" style="font-size: 1.1rem; color:#10b981; font-weight:600;">+${totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>

                    <div class="stat-unit">
                        <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom:2px; display:block;">DEBITS (${data.filter(t => (parseFloat(t.debit) || (t.type === 'debit' && t.amount)) > 0).length})</label>
                        <div id="stat-total-out" class="val" style="font-size: 1.1rem; color:#ef4444; font-weight:600;">-${totalOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>

                    <div style="width: 1px; height: 24px; background: #e2e8f0;"></div>

                    <div class="stat-unit">
                        <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700; margin-bottom:2px; display:block;">Ending Bal</label>
                        <div id="stat-ending-bal" class="val" style="font-size: 1.1rem; color:#2563eb; font-weight:700;">${ending.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</div>
                    </div>
                </div>

                <!-- ACTIONS MENU (Moved to Right) -->
                <div class="action-menu" style="margin-left: 16px;">
                   <button class="action-menu-btn" onclick="window.toggleMenu(this)" style="height: 32px; padding: 0 10px; justify-content: center; border-radius: 6px; font-size: 18px; line-height: 0.5;">...</button>
                   <div id="txn-menu" class="action-menu-content">
                       <button class="action-menu-item" onclick="window.gridApi.exportDataAsCsv()">📥 Export CSV</button>
                       <button class="action-menu-item" onclick="window.runCategorizationBatch()">⚡ Auto-Cat</button>
                       <button class="action-menu-item danger" onclick="window.clearGrid()">🗑️ Clear View</button>
                   </div>
               </div>
            </div>
          </header>
       </div>

       <!-- THE GRID -->
       <div style="padding: 0; background: #f1f5f9; height: calc(100vh - 85px);">
          <div id="txnGrid" class="ag-theme-quartz" style="height: 100%; width: 100%;"></div>
       </div>
     <!-- Detail Drawer -->
     <div class="drawer-backdrop" id="drawer-backdrop" onclick="window.closeDetailDrawer()"></div>
     <div class="detail-drawer" id="txn-detail-drawer">
        <div class="drawer-header">
            <h3 style="margin:0; font-size:1.1rem; color:#1e293b; font-weight: 700;">Transaction Details</h3>
            <button onclick="window.closeDetailDrawer()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#94a3b8; line-height: 1;">×</button>
        </div>
        <div class="drawer-content" id="drawer-content-body">
            <!-- Dynamic Content Injected Here -->
        </div>
        <div class="drawer-actions">
            <button class="btn-secondary" style="flex:1; justify-content: center;" onclick="alert('Split feature coming in Phase 4')">✂️ Split</button>
            <button class="btn-primary" style="flex:1; justify-content: center;" onclick="window.createRuleFromDrawer()">🤖 Make Rule</button>
        </div>
     </div>
    </div>`; // End of Page
};

// --- 5. UI ACTIONS ---

window.toggleDetailDrawer = function () {
    const drawer = document.getElementById('txn-detail-drawer'); // Corrected ID to match HTML
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer) return;

    const isOpen = drawer.classList.contains('open');
    if (isOpen) {
        drawer.classList.remove('open');
        backdrop.classList.remove('open');
    } else {
        drawer.classList.add('open');
        backdrop.classList.add('open');
    }
};

window.updateRefPrefix = function (val) {
    window.transactionState.refPrefix = val.toUpperCase();
    localStorage.setItem('txn_refPrefix', window.transactionState.refPrefix);
    if (window.gridApi) window.gridApi.refreshCells({ force: true });
};

window.popOutGrid = function () {
    if (!window.popoutService) {
        alert('Pop-out service not loaded.');
        return;
    }

    // Get Current Grid State
    // We pass the raw data and column defs
    const rowData = getGridRowData();

    // We need to access the column defs. 
    // Ideally we extract columnDefs creation to a shared function
    // For now, let's reuse the one we have, but we need to re-generate it to strip cellRenderers if needed
    // Actually, GridPopoutService copies JS so cellRenderers might work if they are globally available

    // Let's grab the colDefs from the current grid API if possible, or re-create
    // Grid API is cleaner
    const colDefs = window.gridApi ? window.gridApi.getColumnDefs() : [];

    const options = {
        columnDefs: colDefs,
        defaultColDef: { sortable: true, filter: true, resizable: true },
        checkGridSize: true // helpful for auto-size
    };

    window.popoutService.open('transactions-grid', 'Transactions Manager', options, rowData,
        // onOpen (Hide Local)
        () => {
            const gridDiv = document.querySelector('#txnGrid');
            if (gridDiv) {
                gridDiv.style.visibility = 'hidden';
                gridDiv.innerHTML = '<div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#64748b; font-size:1.2rem; font-weight:600;"><i class="ph ph-arrow-square-out" style="font-size:3rem; margin-bottom:16px;"></i>Grid is Popped Out<button onclick="window.location.reload()" style="margin-top:16px; font-size:0.9rem; padding:8px 16px; border:1px solid #cbd5e1; background:white; border-radius:6px; cursor:pointer;">Force Restore</button></div>';
            }
        },
        // onClose (Restore Local)
        () => {
            // Reload to ensure data sync
            window.renderTransactions();
            // Manually fix style if re-render didn't clear it (though innerHTML reload is safer)
            window.location.hash = '#/transactions'; // Force route routing re-check
            // Or just reload the page to be safe with sync? 
            // Better UX: Re-init
            if (window.renderTransactions) document.getElementById('app').innerHTML = window.renderTransactions();
            if (window.initTransactionsGrid) window.initTransactionsGrid();
        }
    );
};

window.toggleMenu = function (btn) {
    const menu = document.getElementById('txn-menu');
    if (!menu) return;

    // Toggle visibility
    const isShown = menu.classList.contains('show');

    // Close all other menus first
    document.querySelectorAll('.action-menu-content.show').forEach(el => el.classList.remove('show'));

    if (!isShown) {
        menu.classList.add('show');

        // Close on click outside
        const closeMenu = (e) => {
            if (!btn.contains(e.target) && !menu.contains(e.target)) {
                menu.classList.remove('show');
                document.removeEventListener('click', closeMenu);
            }
        };
        // Delay listener to prevent immediate close
        setTimeout(() => document.addEventListener('click', closeMenu), 0);
    }
};


// --- 3. GRID INITIALIZATION ---

// --- 2.5 SMART EDITOR COMPONENT ---

class SmartAccountEditor {
    init(params) {
        this.params = params;
        this.value = params.value || '';
        this.selectedIndex = -1;

        // 1. Get Accounts
        const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
        const custom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
        this.allAccounts = [...rawDefault, ...custom];

        // 2. GUI Setup
        this.eGui = document.createElement('div');
        this.eGui.className = 'smart-editor-container';
        this.eGui.style.cssText = 'background: white; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); border-radius: 8px; width: 280px; max-height: 300px; display: flex; flex-direction: column; overflow: hidden; font-family: Inter, sans-serif;';

        // Input
        this.eInput = document.createElement('input');
        this.eInput.type = 'text';
        this.eInput.value = this.value;
        this.eInput.placeholder = 'Search accounts...';
        this.eInput.style.cssText = 'padding: 8px 12px; border: none; border-bottom: 1px solid #f1f5f9; outline: none; font-size: 13px; width: 100%; box-sizing: border-box;';
        this.eGui.appendChild(this.eInput);

        // List Container
        this.eList = document.createElement('div');
        this.eList.style.cssText = 'flex: 1; overflow-y: auto; padding: 4px 0;';
        this.eGui.appendChild(this.eList);

        // Events
        this.eInput.addEventListener('input', () => this.filterList());
        this.eInput.addEventListener('keydown', (e) => this.onKeyDown(e));

        // Initial Render
        this.filterList();
    }

    getGui() { return this.eGui; }
    afterGuiAttached() { this.eInput.focus(); this.eInput.select(); }
    getValue() { return this.value; }
    isPopup() { return true; }

    filterList() {
        const term = this.eInput.value.toLowerCase();
        this.eList.innerHTML = '';

        // Grouping
        const groups = {};

        // Filter
        let matches = this.allAccounts.filter(a =>
            a.name.toLowerCase().includes(term) || a.code.includes(term)
        );

        // Add "Uncategorized" if matches
        if ('uncategorized'.includes(term)) matches.unshift({ name: 'Uncategorized', category: 'General' });

        if (matches.length === 0) {
            this.eList.innerHTML = '<div style="padding:8px 12px; color:#94a3b8; font-size:12px;">No accounts found</div>';
            return;
        }

        // Group Logic
        matches.forEach(a => {
            const cat = a.category || 'Other';
            if (!groups[cat]) groups[cat] = [];
            groups[cat].push(a);
        });

        // Render Groups
        let idx = 0;
        this.itemElements = []; // Store for keyboard nav

        Object.keys(groups).sort().forEach(cat => {
            // Header
            const header = document.createElement('div');
            header.innerText = cat.toUpperCase();
            header.style.cssText = 'padding: 6px 12px; font-size: 10px; font-weight: 700; color: #94a3b8; background: #f8fafc; letter-spacing: 0.5px;';
            this.eList.appendChild(header);

            // Items
            groups[cat].forEach(acc => {
                const el = document.createElement('div');
                el.innerText = acc.name;
                el.dataset.value = acc.name;
                el.dataset.index = idx++;
                el.style.cssText = 'padding: 6px 12px; font-size: 13px; color: #334155; cursor: pointer; border-left: 2px solid transparent;';

                // Highlight Selection
                if (acc.name === this.value) {
                    el.style.background = '#eff6ff';
                    el.style.color = '#2563eb';
                    el.style.borderLeft = '2px solid #2563eb';
                }

                el.addEventListener('click', () => {
                    this.value = acc.name;
                    this.params.stopEditing();
                });

                el.addEventListener('mouseenter', () => {
                    this.itemElements.forEach(i => i.style.background = 'transparent');
                    el.style.background = '#f1f5f9';
                });

                this.eList.appendChild(el);
                this.itemElements.push(el);
            });
        });
    }

    onKeyDown(e) {
        if (e.key === 'Enter') {
            // Select first filtered or highlighted
            if (this.itemElements.length > 0) {
                // Logic to pick selected index or first
                this.value = this.itemElements[0].dataset.value;
            }
            this.params.stopEditing();
            e.stopPropagation();
        }
        if (e.key === 'Escape') {
            this.params.stopEditing(true);
        }
    }
}

window.initTransactionsGrid = function () {
    const gridDiv = document.querySelector('#txnGrid');
    if (!gridDiv) return;

    // Accounts for Dropdown
    const accountNames = getChartOfAccounts();

    const columnDefs = [
        {
            field: "accountNumber",
            headerName: "Ref#",
            width: 95,
            editable: false,
            cellStyle: { color: '#64748b', fontStyle: 'italic', fontSize: '12px' },
            valueGetter: params => {
                // If data has a value, use it. Otherwise, use Row Index + 1 (padded)
                if (params.data.accountNumber) return params.data.accountNumber;
                return String(params.node.rowIndex + 1).padStart(3, '0');
            },
            valueFormatter: params => {
                const prefix = window.transactionState.refPrefix; // Allow empty string
                if (!prefix) return params.value;
                // Auto-hyphen: If user didn't type it, we add it.
                const separator = prefix.endsWith('-') ? '' : '-';
                return `${prefix}${separator}${params.value || ''}`;
            }
        },
        {
            field: "date",
            headerName: "Date",
            width: 120,
            editable: true,
            sortable: true,
            cellEditor: 'agDateCellEditor',
            // Date Editor Fix: Convert String <-> Date Object
            valueGetter: params => {
                if (!params.data.date) return null;
                // Create formatted date to avoid timezone issues (append T00:00:00 if simple date)
                const dateStr = params.data.date.includes('T') ? params.data.date : params.data.date + 'T00:00:00';
                return new Date(dateStr);
            },
            valueSetter: params => {
                if (!params.newValue) return false;
                // Save as YYYY-MM-DD string
                const d = new Date(params.newValue);
                // Adjust for timezone offset to keep date consistent
                const offset = d.getTimezoneOffset() * 60000;
                const localDate = new Date(d.getTime() - offset);
                params.data.date = localDate.toISOString().split('T')[0];
                return true;
            },
            valueFormatter: params => {
                if (!params.value) return '';
                // Value is Date object because of valueGetter
                if (params.value instanceof Date) {
                    return params.value.toLocaleDateString('en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
                }
                return params.value;
            }
        },
        {
            field: "description",
            headerName: "Payee / Description",
            flex: 2,
            editable: true,
            filter: true
        },
        {
            field: "account", // Changed from accountDescription to matched account field
            headerName: "Account",
            flex: 1.5,
            editable: true,
            cellEditor: 'SmartAccountEditor',
            cellRenderer: params => {
                if (!params.value || params.value === 'Uncategorized')
                    return '<span style="color:#cbd5e1; font-style:italic;">Uncategorized</span>';
                return `<span style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:12px; font-weight:600; font-size:12px;">${params.value}</span>`;
            }
        },
        // DISPLAY DEBIT (if net < 0)
        {
            headerName: "Debit",
            width: 110,
            editable: true,
            // USER REQUEST: Red Color, No Bold
            cellStyle: { color: '#ef4444' },
            valueGetter: params => {
                if (params.data.debit) return parseFloat(params.data.debit);
                if (params.data.type === 'debit') return parseFloat(params.data.amount);
                return null;
            },
            valueFormatter: params => params.value ? '$' + Number(params.value).toFixed(2) : ''
        },
        // DISPLAY CREDIT (if net > 0)
        {
            headerName: "Credit",
            width: 110,
            editable: true,
            cellClass: "amount-positive",
            valueGetter: params => {
                if (params.data.credit) return parseFloat(params.data.credit);
                if (params.data.type === 'credit') return parseFloat(params.data.amount);
                return null;
            },
            valueFormatter: params => params.value ? '$' + Number(params.value).toFixed(2) : ''
        },
        // RUNNING BALANCE
        {
            headerName: "Balance",
            field: "_balance", // Uses pre-calculated chronological balance
            width: 120,
            // USER REQUEST: Black, No Bold
            cellStyle: { color: '#000000' },
            valueFormatter: params => params.value ? params.value.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '$0.00'
        },
        // ACTIONS
        {
            headerName: "", // USER REQUEST: Snug/Hidden Header
            width: 50,      // USER REQUEST: Tight width
            suppressMenu: true,
            resizable: false,
            cellStyle: { padding: '0', display: 'flex', justifyContent: 'center' },
            cellRenderer: params => {
                return `
                    <div class="actions-cell" style="display: flex; gap: 4px; justify-content: center; width: 100%;">
                        <button onclick="window.gridSwap(${params.node.rowIndex})" style="border:none; background:none; cursor:pointer; font-size: 14px; padding: 2px; color: #94a3b8;">⇄</button>
                        <button onclick="window.gridDelete(${params.node.rowIndex})" style="border:none; background:none; cursor:pointer; font-size: 16px; padding: 2px; color: #ef4444; font-weight: bold;">×</button>
                    </div>`;
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

            // 🧠 Continuous Learning Hook
            if (params.colDef.field === 'account') {
                const desc = params.data.description;
                const newCat = params.newValue;
                if (desc && newCat && window.CategorizationEngine) {
                    // Normalize account name to category if needed, or just learn mapping
                    // Ideally we map Description -> Account Name for this setup
                    console.log(`🧠 Learning: "${desc}" -> "${newCat}"`);
                    window.CategorizationEngine.learn(desc, newCat);

                    if (window.showToast) window.showToast(`Learned: ${newCat}`, 'success');
                }
            }

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
        },
        components: {
            SmartAccountEditor: SmartAccountEditor
        }
    };

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
    // if (window.showToast) window.showToast('Values Swapped', 'success');
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

    const countIn = data.filter(t => (parseFloat(t.credit) || (t.type === 'credit' && t.amount)) > 0).length;
    const countOut = data.filter(t => (parseFloat(t.debit) || (t.type === 'debit' && t.amount)) > 0).length;

    const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const curr = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

    // Update DOM
    const elIn = document.getElementById('stat-total-in');
    const elOut = document.getElementById('stat-total-out');
    const elEnd = document.getElementById('stat-ending-bal');

    // Update Labels (Search for the label elements relative to the value containers or recreate)
    // Since we didn't give IDs to labels, we must rely on re-rendering or careful DOM traversal.
    // Simpler: Just refresh page or assume user reloads. 
    // BUT user expects dynamic updates.
    // Let's grab the grandparent and update innerHTML of labels if possible.

    // Actually, `renderTransactions` returns the HTML string. We can update specific fields.
    // For labels updates: "CREDITS (#)" - we need to target the label.
    // Let's add IDs to labels in the render function next time.
    // For now, let's try to find them or just update text content if we can select them.

    // Hacky but effective: Update the Previous Sibling's Text
    if (elIn && elIn.previousElementSibling) elIn.previousElementSibling.innerText = `CREDITS (${countIn})`;
    if (elOut && elOut.previousElementSibling) elOut.previousElementSibling.innerText = `DEBITS (${countOut})`;

    if (elIn) elIn.innerText = '+' + fmt(totalIn);
    if (elOut) elOut.innerText = '-' + fmt(totalOut);
    if (elEnd) elEnd.innerText = curr(ending);
};

window.clearGrid = function () {
    const currentAccount = window.accountManager ? window.accountManager.getCurrentAccount() : null;
    const label = currentAccount ? `transactions for <strong>${currentAccount.accountName}</strong>` : '<strong>ALL transactions</strong>';

    // Use Modern UI
    if (window.ModalService) {
        window.ModalService.confirm(
            'Clear Grid View',
            `Are you sure you want to clear ${label}? <br><br>This will empty your current view but preserve data in other accounts. This action cannot be undone.`,
            () => {
                _performClear();
            },
            'danger'
        );
    } else {
        // Fallback
        if (!confirm(`Clear ${currentAccount ? currentAccount.accountName : 'ALL'}?`)) return;
        _performClear();
    }
};

function _performClear() {
    window.transactionData = [];
    window.gridApi.setRowData([]);
    saveGridData();
    window.updateHeaderStats();
    if (window.showToast) window.showToast('Grid cleared (Safe Mode)', 'success');
}

// --- Batch Categorization Logic (The Finance Demo Effect) ---
window.runCategorizationBatch = async function () {
    console.log('⚡ Auto-Cat Triggered');
    if (!window.CategorizationEngine) {
        alert('Categorization Engine not loaded.');
        return;
    }

    const api = window.gridApi;
    if (!api) {
        console.error('Grid API not ready');
        return;
    }

    const progressCard = document.getElementById('ai-progress-card');
    const progressFill = document.getElementById('ai-progress-fill');
    const progressText = document.getElementById('ai-progress-text');

    // 1. Identification
    const tasks = [];
    api.forEachNode(node => {
        // Check both null and 'Uncategorized' and empty string
        const cat = node.data.category;
        if (!cat || cat === 'Uncategorized' || cat.trim() === '') {
            tasks.push(node);
        }
    });

    console.log(`Found ${tasks.length} uncategorized rows.`);

    if (tasks.length === 0) {
        window.showToast('All transactions are already categorized!', 'success');
        return;
    }

    // 2. Setup UI
    if (progressCard) progressCard.style.display = 'flex';
    if (progressFill) progressFill.style.width = '0%';
    if (progressText) progressText.innerText = `0%`;

    // 3. Process with Animation
    let processed = 0;
    let changed = 0;

    // Chunk process to allow UI updates
    const CHUNK_SIZE = 5;
    const total = tasks.length;

    for (let i = 0; i < total; i += CHUNK_SIZE) {
        const chunk = tasks.slice(i, i + CHUNK_SIZE);

        // Process Chunk
        chunk.forEach(node => {
            const match = window.CategorizationEngine.classify(node.data);
            if (match && match.confidence >= 0.9) { // High Confidence
                const oldData = node.data;
                const newData = {
                    ...oldData,
                    category: match.category,
                    accountNumber: match.accountNumber || oldData.accountNumber, // Align Account Number
                    notes: (oldData.notes || '') + ' [Rule]'
                };

                // Direct update for immediate flash
                node.setData(newData);
                api.flashCells({ rowNodes: [node], columns: ['category', 'accountNumber'], flashDelay: 500, fadeDelay: 300 });
                changed++;
            }
        });

        processed += chunk.length;

        // Update UI
        const pct = Math.round((processed / total) * 100);
        if (progressFill) progressFill.style.width = `${pct}%`;
        if (progressText) progressText.innerText = `${pct}% (${processed}/${total})`;

        // Artificial Delay for "The Effect"
        await new Promise(r => setTimeout(r, 50));
    }

    // 4. Cleanup
    setTimeout(() => {
        if (progressCard) progressCard.style.display = 'none';
        window.showToast(`Batch Complete: ${changed} categorized.`, 'success');
        saveGridData(); // Save changes
    }, 1200);
};

// --- Smart Scan Logic ---
// --- Smart Scan Logic ---
window.scanAndFix9970s = function () {
    if (!window.CategorizationEngine) { alert('Engine not ready'); return; }

    const api = window.gridApi;
    const suggestions = [];
    const allUnknowns = [];

    // 1. Scan and Classify
    api.forEachNode(node => {
        const d = node.data;
        const isUncat = (d.account === 'Ask My Accountant' || d.account === 'Uncategorized' || !d.account);
        if (isUncat) {
            allUnknowns.push(d); // For Clustering
            const match = window.CategorizationEngine.classify(d);
            if (match) {
                suggestions.push({ node, match, current: d });
            }
        }
    });

    // 2. Cluster Analysis (Tier 4)
    const clusters = window.CategorizationEngine.clusterUnknowns(allUnknowns);
    let clusterMsg = '';
    if (clusters.length > 0) {
        clusterMsg = `\n\n🧩 CLUSTER INSIGHTS:\nI found ${clusters.length} groups of unknown transactions:\n`;
        clusters.slice(0, 3).forEach(c => {
            clusterMsg += `- "${c.token.toUpperCase()}": ${c.count} items (e.g., ${c.sample})\n`;
        });
        if (clusters.length > 3) clusterMsg += `...and ${clusters.length - 3} more groups.\n`;
    }

    if (suggestions.length === 0) {
        let msg = 'No confident suggestions found.';
        if (clusterMsg) msg += clusterMsg;
        alert(msg);
        return;
    }

    // 3. Show Modal
    let msg = `Found ${suggestions.length} suggestions:\n\n`;
    suggestions.slice(0, 10).forEach(s => {
        let methodIcon = s.match.method === 'history' ? '🧠' : (s.match.method === 'fuzzy' ? '🌫️' : '📜');
        msg += `• ${methodIcon} ${s.current.description.substring(0, 30)}... -> ${s.match.category} (${Math.round(s.match.confidence * 100)}%)\n`;
    });
    if (suggestions.length > 10) msg += `...and ${suggestions.length - 10} more.`;

    msg += clusterMsg;
    msg += `\n\nApply ${suggestions.length} fixes?`;

    if (confirm(msg)) {
        let count = 0;
        suggestions.forEach(s => {
            s.node.setData({
                ...s.current,
                account: s.match.category,
                notes: (s.current.notes || '') + ` [Auto-Fix: ${s.match.method}]`
            });
            count++;
        });
        api.refreshCells();
        window.saveGridData();
        window.showToast(`Applied ${count} fixes.`, 'success');
    }
};
