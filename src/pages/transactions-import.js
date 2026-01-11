/**
 * Transactions Import Page - V4
 * Scenario #1: Inline Collapsible Zone with Full Grid
 * 
 * Merges best features from data-import.js and transactions-grid.js
 */

console.log('%c📊💰 TRANSACTIONS-IMPORT v4.0', 'background: #10b981; color: white; padding: 4px 8px; border-radius: 4px; font-weight: bold;');

// ============================================
// STATE MANAGEMENT
// ============================================

window.txnImportState = {
    transactions: [],
    openingBalance: parseFloat(localStorage.getItem('txn_import_opening')) || 0,
    gridApi: null,
    showUploadZone: true,
    importHistory: [],
    undoStack: [],
    forcedAccountType: null,
    currentParsedData: null
};

// ============================================
// CoA HELPERS (from transactions-grid.js)
// ============================================

function getGridCoANames() {
    const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
    let rawCustom = [];
    try {
        rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
    } catch (e) { }
    const all = [...rawDefault, ...rawCustom];
    return all.map(a => a.name).filter(name => name && !name.toString().toLowerCase().includes("invalid"));
}

function getGroupedCoA() {
    const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
    let rawCustom = [];
    try { rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
    const all = [...rawDefault, ...rawCustom];

    const groups = {
        'Assets': [],
        'Liabilities': [],
        'Equity': [],
        'Revenue': [],
        'Expenses': []
    };

    all.forEach(acc => {
        if (!acc.name || acc.name.toString().toLowerCase().includes("invalid")) return;
        const type = (acc.type || '').toLowerCase();
        const cat = (acc.category || '').toLowerCase();
        const displayName = acc.code ? `${acc.code} - ${acc.name}` : acc.name;

        if (type.includes('asset') || cat.includes('asset')) groups['Assets'].push(displayName);
        else if (type.includes('liabil') || cat.includes('liabil')) groups['Liabilities'].push(displayName);
        else if (type.includes('equity') || cat.includes('equity')) groups['Equity'].push(displayName);
        else if (type.includes('revenue') || type.includes('income') || cat.includes('revenue')) groups['Revenue'].push(displayName);
        else if (type.includes('expense') || cat.includes('expense')) groups['Expenses'].push(displayName);
    });

    return groups;
}

function resolveAccountName(val) {
    if (!val) return 'Uncategorized';
    val = val.toString().trim();
    if (val.toLowerCase().includes("invalid")) return 'Uncategorized';

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

// ============================================
// UNDO SYSTEM (from transactions-grid.js)
// ============================================

const MAX_UNDO_STEPS = 10;

window.captureState = function () {
    if (!window.txnImportState.transactions) return;
    const snapshot = JSON.parse(JSON.stringify(window.txnImportState.transactions));
    window.txnImportState.undoStack.push(snapshot);
    if (window.txnImportState.undoStack.length > MAX_UNDO_STEPS) {
        window.txnImportState.und

        oStack.shift();
    }
    window.updateUndoButton();
};

window.undoLastAction = function () {
    if (window.txnImportState.undoStack.length === 0) {
        if (window.showToast) window.showToast('Nothing to undo', 'info');
        return;
    }

    const prevState = window.txnImportState.undoStack.pop();
    window.txnImportState.transactions = prevState;

    if (window.txnImportState.gridApi) {
        window.txnImportState.gridApi.setGridOption('rowData', window.txnImportState.transactions);
        window.txnImportState.gridApi.refreshCells({ force: true });
    }

    saveData();
    updateHeaderStats();
    window.updateUndoButton();

    if (window.showToast) window.showToast('Action undone', 'success');
};

window.updateUndoButton = function () {
    const btn = document.getElementById('btn-undo-import');
    if (!btn) return;

    const count = window.txnImportState.undoStack.length;
    if (count > 0) {
        btn.style.display = 'flex';
        btn.querySelector('span:last-child').innerText = `Undo (${count})`;
    } else {
        btn.style.display = 'none';
    }
};

// ============================================
// CUSTOM AC EDITOR (from transactions-grid.js)
// ============================================

class GroupedAccountEditor {
    init(params) {
        this.params = params;
        this.value = params.value || 'Uncategorized';
        this.groupedData = getGroupedCoA();

        this.container = document.createElement('div');
        this.container.className = 'custom-coa-dropdown';
        this.container.tabIndex = 0;

        const searchBox = document.createElement('input');
        searchBox.type = 'text';
        searchBox.placeholder = 'Search accounts...';
        searchBox.className = 'coa-search-box';
        searchBox.value = '';
        setTimeout(() => searchBox.focus(), 0);

        searchBox.addEventListener('input', (e) => this.filterList(e.target.value));
        this.container.appendChild(searchBox);

        this.listContainer = document.createElement('div');
        this.listContainer.className = 'coa-list-container';
        this.container.appendChild(this.listContainer);

        this.renderList();
        this.addStyles();
    }

    getGui() { return this.container; }
    getValue() { return this.value; }
    isPopup() { return true; }

    renderList(filterText = '') {
        this.listContainer.innerHTML = '';
        const lowerFilter = filterText.toLowerCase();

        if ('uncategorized'.includes(lowerFilter)) {
            this.createItem('Uncategorized', null);
        }

        Object.keys(this.groupedData).forEach(groupName => {
            const items = this.groupedData[groupName];
            const filteredItems = items.filter(item => item.toLowerCase().includes(lowerFilter));

            if (filteredItems.length > 0) {
                const groupHeader = document.createElement('div');
                groupHeader.className = 'coa-group-header';

                const icon = document.createElement('span');
                icon.innerHTML = '▶';
                icon.style.fontSize = '10px';
                icon.style.marginRight = '6px';
                icon.style.transition = 'transform 0.2s';

                groupHeader.appendChild(icon);
                groupHeader.appendChild(document.createTextNode(groupName));

                this.listContainer.appendChild(groupHeader);

                const itemsDiv = document.createElement('div');
                itemsDiv.className = 'coa-group-items';
                itemsDiv.style.display = 'none'; // HIDDEN BY DEFAULT

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

    filterList(text) { this.renderList(text); }

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
        display: flex; flex-direction: column; overflow: hidden;
      }
      .coa-search-box {
        padding: 10px; border: none; border-bottom: 1px solid #e2e8f0;
        outline: none; font-size: 13px;
      }
      .coa-list-container { max-height: 300px; overflow-y: auto; }
      .coa-group-header {
        padding: 8px 12px; background: #f8fafc; font-weight: 600; font-size: 11px;
        color: #64748b; text-transform: uppercase; cursor: pointer; display: flex; align-items: center;
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

// ============================================
// MAIN RENDER
// ============================================

window.renderTransactionsImportPage = function () {
    loadData();

    const stats = calculateStats();
    const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    return `
    <div class="txn-import-page-v4">
      
      <!-- Header -->
      <div class="fixed-top-section">
        <header class="dashboard-header-modern">
          <div class="header-brand">
            <div class="icon-box" style="background: linear-gradient(135deg, #10b981, #059669);">💰</div>
            <div class="header-info">
              <h2>Transaction Import</h2>
              <div class="meta">
                <span class="badge-account">UNIFIED</span>
                <span>•</span>
                <span>Import & Manage</span>
              </div>
            </div>
          </div>

          <div class="header-stats-container">
            <div class="stat-unit">
              <label>Opening Bal</label>
              <div class="val">$<input type="number" value="${window.txnImportState.openingBalance.toFixed(2)}" onchange="updateOpeningBalance(this.value)" class="invisible-input"></div>
            </div>
            <div class="stat-divider-v"></div>
            <div class="stat-unit">
              <label>Total In</label>
              <div id="stat-total-in" class="val val-positive">+${fmt(stats.totalIn)}</div>
            </div>
            <div class="stat-unit">
              <label>Total Out</label>
              <div id="stat-total-out" class="val">-${fmt(stats.totalOut)}</div>
            </div>
            <div class="stat-divider-v"></div>
            <div class="stat-unit">
              <label>Ending Bal</label>
              <div id="stat-ending-bal" class="val val-bold">$${fmt(stats.ending)}</div>
            </div>
          </div>
        </header>

        <!-- Inline Collapsible Upload Zone -->
        <div id="inline-upload-zone" class="${window.txnImportState.showUploadZone ? 'upload-zone-expanded' : 'upload-zone-collapsed'}" onclick="toggleUploadZone()">
          ${renderUploadZoneContent()}
        </div>

        <!-- Toolbar (after import) -->
        <div class="control-bar-grid" style="${window.txnImportState.transactions.length === 0 ? 'display:none' : ''}">
          <div class="control-left-grid">
            <div id="bulk-actions-area" class="bulk-actions-pill" style="display: none;">
              <span id="selection-count">0 selected</span>
              <button onclick="window.bulkCategorize()" class="btn-bulk-action">✨ Bulk Categorize</button>
              <button onclick="window.deselectGrid()" class="btn-clear-selection">✕ Clear</button>
            </div>

            <button id="btn-undo-import" onclick="window.undoLastAction()" class="btn-secondary" style="display: none;">
              <span>⎌</span>
              <span>Undo</span>
            </button>

            <button onclick="window.categorizeLive()" class="btn-primary">
              <span>🪄 Auto-Categorize</span>
            </button>

            <div class="search-wrapper-grid">
              <input type="text" placeholder="Search..." onkeyup="if(window.txnImportState.gridApi) window.txnImportState.gridApi.setGridOption('quickFilterText', this.value)" class="grid-search-input">
            </div>
          </div>

          <div class="dropdown-container">
            <button class="btn-icon-menu" onclick="window.toggleImportMenu(event)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
            </button>
            <div id="import-dropdown-menu" class="dropdown-menu hidden">
              <button onclick="window.exportCSV()" class="dropdown-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                <span>Export CSV</span>
              </button>
              <div class="dropdown-divider"></div>
              <button onclick="window.clearAllData()" class="dropdown-item danger">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                <span>Clear All</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- AG Grid -->
      <div style="padding: 0; background: #f1f5f9; height: calc(100vh - 280px);">
        <div id="txnImportGrid" class="ag-theme-alpine" style="height: 100%; width: 100%;"></div>
      </div>

    </div>
  `;
};

// ============================================
// UPLOAD ZONE RENDERING
// ============================================

function renderUploadZoneContent() {
    if (window.txnImportState.showUploadZone) {
        return `
      <div class="upload-zone-content-expanded">
        <div class="upload-icon-large">📤</div>
        <h3>Drop Bank Statement Here</h3>
        <p>or click to browse</p>
        <div class="format-badges">
          <span class="badge-pdf">PDF</span>
          <span class="badge-csv">CSV</span>
        </div>
        <input type="file" id="txn-file-input" accept=".pdf,.csv" multiple style="display: none;" onchange="handleFileUpload(event)">
      </div>
    `;
    } else {
        return `
      <div class="upload-zone-content-collapsed">
        <span class="upload-icon-sm">📥</span>
        <span>Import More Data</span>
        <span class="expand-hint">Click to expand</span>
      </div>
    `;
    }
}

window.toggleUploadZone = function () {
    window.txnImportState.showUploadZone = !window.txnImportState.showUploadZone;
    refreshUploadZone();

    if (window.txnImportState.showUploadZone) {
        setTimeout(() => {
            const fileInput = document.getElementById('txn-file-input');
            const zone = document.querySelector('.upload-zone-content-expanded');

            if (zone && fileInput) {
                zone.onclick = (e) => {
                    e.stopPropagation();
                    if (e.target !== fileInput) fileInput.click();
                };

                zone.ondragover = (e) => {
                    e.preventDefault();
                    zone.classList.add('drag-over');
                };
                zone.ondragleave = () => zone.classList.remove('drag-over');
                zone.ondrop = (e) => {
                    e.preventDefault();
                    zone.classList.remove('drag-over');
                    if (e.dataTransfer.files.length > 0) {
                        handleFileUpload({ target: { files: e.dataTransfer.files } });
                    }
                };
            }
        }, 100);
    }
};

function refreshUploadZone() {
    const zone = document.getElementById('inline-upload-zone');
    if (zone) {
        zone.className = window.txnImportState.showUploadZone ? 'upload-zone-expanded' : 'upload-zone-collapsed';
        zone.innerHTML = renderUploadZoneContent();
    }
}

// ============================================
// FILE UPLOAD HANDLER
// ============================================

window.handleFileUpload = async function (event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    if (window.LoadingOverlay) window.LoadingOverlay.show('Processing files...');

    try {
        const allParsed = [];

        for (const file of files) {
            const fileName = file.name.toLowerCase();
            let parsed;

            if (fileName.endsWith('.pdf')) {
                if (!window.PDFParserService) throw new Error('PDF parser not loaded');
                const result = await window.PDFParserService.parse(file);
                parsed = result.transactions || result;
            } else if (fileName.endsWith('.csv')) {
                if (!window.SmartCSVParser) throw new Error('CSV parser not loaded');
                const result = await window.SmartCSVParser.parse(file);
                parsed = result.transactions || result;
            } else {
                console.warn('Unsupported file:', file.name);
                continue;
            }

            // Convert to standard format
            const normalized = parsed.map((row, idx) => ({
                id: generateId(),
                date: row.Date || row.date || new Date().toISOString().split('T')[0],
                description: row.Description || row['Original Description'] || row.Payee || '',
                accountDescription: row.Account || row.Category || null,
                debit: parseFloat(row.Debit || 0),
                credit: parseFloat(row.Credit || 0),
                reconciled: false,
                source: file.name
            }));

            allParsed.push(...normalized);
        }

        // Append to existing
        window.txnImportState.transactions = [...allParsed, ...window.txnImportState.transactions];

        saveData();

        // Refresh grid
        if (window.txnImportState.gridApi) {
            window.txnImportState.gridApi.setGridOption('rowData', window.txnImportState.transactions);
        } else {
            // Initialize grid if not yet created
            setTimeout(() => {
                if (window.initTxnImportGrid) window.initTxnImportGrid();
            }, 100);
        }

        // Auto-collapse
        setTimeout(() => {
            window.txnImportState.showUploadZone = false;
            refreshUploadZone();
            updateHeaderStats();
            if (window.showToast) window.showToast(`Imported ${allParsed.length} transactions`, 'success');
        }, 500);

    } catch (error) {
        console.error('Import error:', error);
        if (window.showToast) window.showToast('Import failed: ' + error.message, 'error');
    } finally {
        if (window.LoadingOverlay) window.LoadingOverlay.hide();
        if (event.target) event.target.value = ''; // Reset input
    }
};

// ============================================
// AG GRID INITIALIZATION
// ============================================

window.initTxnImportGrid = function () {
    const gridDiv = document.getElementById('txnImportGrid');
    if (!gridDiv) return;

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
            headerName: "Ref#",
            colId: "refNumber",
            width: 100,
            valueGetter: params => {
                const index = params.node.rowIndex + 1;
                return index.toString().padStart(3, '0');
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
            editable: true,
            cellEditor: GroupedAccountEditor,
            cellRenderer: params => {
                let displayVal = resolveAccountName(params.value);
                if (!params.value || displayVal === 'Uncategorized')
                    return '<span style="color:#cbd5e1; font-style:italic;">Uncategorized</span>';
                return `<span style="background:#eff6ff; color:#2563eb; padding:2px 8px; border-radius:12px; font-weight:600; font-size:12px;">${displayVal}</span>`;
            }
        },
        {
            headerName: "Debit",
            field: "debit",
            flex: 1,
            minWidth: 90,
            editable: true,
            valueFormatter: params => params.value > 0 ? fmt(params.value) : '',
            cellStyle: { color: '#334155', textAlign: 'right', fontWeight: '500' }
        },
        {
            headerName: "Credit",
            field: "credit",
            flex: 1,
            minWidth: 90,
            editable: true,
            valueFormatter: params => params.value > 0 ? fmt(params.value) : '',
            cellStyle: { color: '#10b981', fontWeight: 'bold', textAlign: 'right' }
        },
        {
            headerName: "Balance",
            flex: 1,
            minWidth: 100,
            valueGetter: params => {
                let balance = window.txnImportState.openingBalance;
                const rowIndex = params.node.rowIndex;
                for (let i = 0; i <= rowIndex; i++) {
                    const row = params.api.getDisplayedRowAtIndex(i).data;
                    balance += (row.credit || 0) - (row.debit || 0);
                }
                return balance;
            },
            valueFormatter: params => fmt(params.value),
            cellStyle: params => ({
                textAlign: 'right',
                fontWeight: '600',
                color: params.value < 0 ? '#ef4444' : '#334155'
            })
        },
        {
            headerName: "Actions",
            flex: 0.8,
            minWidth: 80,
            cellRenderer: params => {
                return `
          <div style="display:flex; gap: 8px; align-items: center; height: 100%;">
            <button title="Delete" onclick="window.deleteRow(${params.rowIndex})" style="border:none; background:#fef2f2; color:#ef4444; cursor:pointer; padding: 2px 6px; border-radius: 4px;">✕</button>
          </div>
        `;
            }
        }
    ];

    const gridOptions = {
        columnDefs,
        rowData: window.txnImportState.transactions,
        rowSelection: 'multiple',
        rowHeight: 48,
        animateRows: true,
        onSelectionChanged: () => {
            if (!window.txnImportState.gridApi) return;
            const nodes = window.txnImportState.gridApi.getSelectedNodes();
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

            if (colId === 'accountDescription') {
                const newCat = params.newValue;
                const payee = params.data.description;

                if (newCat && newCat !== 'Uncategorized' && payee) {
                    params.data.accountDescription = newCat;

                    if (window.merchantDictionary) {
                        try {
                            await window.merchantDictionary.confirmCategorization(payee, newCat);
                            if (window.showToast) window.showToast(`Learned: "${payee}" → ${newCat}`, 'success');
                        } catch (e) {
                            console.error('Failed to learn rule:', e);
                        }
                    }
                }
            }
            saveData();
            updateHeaderStats();
        },
        onGridReady: (params) => {
            console.log("📈 Txn Import Grid: Ready");
            if (window.LoadingOverlay) window.LoadingOverlay.hide();
        }
    };

    window.txnImportState.gridApi = agGrid.createGrid(gridDiv, gridOptions);
    window.updateUndoButton();
};

// ============================================
// DATA PERSISTENCE
// ============================================

function saveData() {
    const data = {
        transactions: window.txnImportState.transactions,
        openingBalance: window.txnImportState.openingBalance
    };
    localStorage.setItem('ab3_txn_import', JSON.stringify(data));
    localStorage.setItem('txn_import_opening', window.txnImportState.openingBalance.toString());
}

function loadData() {
    try {
        const stored = localStorage.getItem('ab3_txn_import');
        if (stored) {
            const data = JSON.parse(stored);
            window.txnImportState.transactions = data.transactions || [];
            window.txnImportState.openingBalance = data.openingBalance || 0;
        }
    } catch (e) {
        console.error('Error loading data:', e);
    }

    // Hide upload zone if we have data
    if (window.txnImportState.transactions.length > 0) {
        window.txnImportState.showUploadZone = false;
    }
}

function calculateStats() {
    const totalIn = window.txnImportState.transactions.reduce((sum, t) => sum + (t.credit || 0), 0);
    const totalOut = window.txnImportState.transactions.reduce((sum, t) => sum + (t.debit || 0), 0);
    const ending = window.txnImportState.openingBalance + totalIn - totalOut;
    return { totalIn, totalOut, ending };
}

function updateHeaderStats() {
    const stats = calculateStats();
    const fmt = (n) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

    const inEl = document.getElementById('stat-total-in');
    const outEl = document.getElementById('stat-total-out');
    const endEl = document.getElementById('stat-ending-bal');

    if (inEl) inEl.textContent = '+' + fmt(stats.totalIn);
    if (outEl) outEl.textContent = '-' + fmt(stats.totalOut);
    if (endEl) endEl.textContent = '$' + fmt(stats.ending);
}

// ============================================
// UTILITIES
// ============================================

function generateId() {
    return 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function fmt(val) {
    return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Math.abs(val));
}

// ============================================
// ACTIONS
// ============================================

window.updateOpeningBalance = function (value) {
    window.txnImportState.openingBalance = parseFloat(value) || 0;
    saveData();
    if (window.txnImportState.gridApi) {
        window.txnImportState.gridApi.refreshCells({ force: true });
    }
    updateHeaderStats();
};

window.deleteRow = function (rowIndex) {
    if (window.ModalService) {
        window.ModalService.confirm('Delete Transaction', 'Are you sure?', () => {
            window.txnImportState.transactions.splice(rowIndex, 1);
            if (window.txnImportState.gridApi) {
                window.txnImportState.gridApi.setGridOption('rowData', window.txnImportState.transactions);
            }
            saveData();
            updateHeaderStats();
            if (window.showToast) window.showToast('Transaction deleted', 'success');
        });
    } else {
        window.txnImportState.transactions.splice(rowIndex, 1);
        if (window.txnImportState.gridApi) {
            window.txnImportState.gridApi.setGridOption('rowData', window.txnImportState.transactions);
        }
        saveData();
        updateHeaderStats();
    }
};

window.bulkCategorize = function () {
    // Simplified version - full implementation can use modal
    if (!window.txnImportState.gridApi) return;
    const selectedNodes = window.txnImportState.gridApi.getSelectedNodes();
    if (selectedNodes.length === 0) return;

    const category = prompt(`Categorize ${selectedNodes.length} items to:`);
    if (category) {
        selectedNodes.forEach(node => {
            node.data.accountDescription = category;
        });
        window.txnImportState.gridApi.refreshCells({ force: true });
        saveData();
        if (window.showToast) window.showToast(`Categorized ${selectedNodes.length} items`, 'success');
    }
};

window.deselectGrid = function () {
    if (window.txnImportState.gridApi) {
        window.txnImportState.gridApi.deselectAll();
    }
};

window.exportCSV = function () {
    if (window.txnImportState.gridApi) {
        window.txnImportState.gridApi.exportDataAsCsv({ fileName: 'transactions-export.csv' });
    }
};

window.clearAllData = function () {
    if (window.ModalService) {
        window.ModalService.confirm('Clear All Data', 'This will delete all transactions. Continue?', () => {
            window.txnImportState.transactions = [];
            window.txnImportState.showUploadZone = true;
            if (window.txnImportState.gridApi) {
                window.txnImportState.gridApi.setGridOption('rowData', []);
            }
            saveData();
            refreshUploadZone();
            updateHeaderStats();
            if (window.showToast) window.showToast('All data cleared', 'success');
        }, 'danger');
    }
};

window.categorizeLive = function () {
    // Placeholder for AI categorization
    if (window.showToast) window.showToast('AI categorization coming soon', 'info');
};

window.toggleImportMenu = function (e) {
    e.stopPropagation();
    const menu = document.getElementById('import-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
};

// Auto-close dropdown on outside click
document.addEventListener('click', (e) => {
    const menu = document.getElementById('import-dropdown-menu');
    if (menu && !menu.classList.contains('hidden')) {
        if (!e.target.closest('.dropdown-container')) {
            menu.classList.add('hidden');
        }
    }
});

console.log('✅ Transactions-Import page loaded');
