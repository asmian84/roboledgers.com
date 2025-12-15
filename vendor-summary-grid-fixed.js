// Vendor Summary Grid - AG Grid Implementation
// v1.29 - CLONE of VIG Logic (1:1 Match)
console.log('📊 Loading VendorSummaryGrid v1.29 (VIG Clone)...');

window.VendorSummaryGrid = {
    gridApi: null,
    columnApi: null,
    userHasResized: false,
    saveTimer: null,

    initialize(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        // 1:1 Match with VIG
        container.style.height = '100%';
        container.style.width = '100%';

        const gridOptions = {
            columnDefs: this.getColumnDefs(),
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                suppressSizeToFit: false // Match VIG
            },
            rowData: [],
            animateRows: true,
            rowSelection: 'single',
            overlayNoRowsTemplate: '<span style="color:var(--text-secondary);">No vendors found.</span>',

            // Match VIG Row Styling
            getRowStyle: (params) => {
                if (!params.data.currentAccount) {
                    return { background: '#fff1f2', borderLeft: '5px solid #ef4444', fontWeight: '500' };
                }
                const scheme = (window.Settings && Settings.current.gridColorScheme) || 'rainbow';
                const schemes = (window.TransactionGrid && TransactionGrid.colorSchemes) || {
                    rainbow: ['#FFD1DC', '#D1F2FF', '#D1FFD1', '#FFFACD', '#FFDAB9', '#E6E6FA'],
                    classic: ['#FFFFFF', '#F5F5F5']
                };
                const colors = schemes[scheme] || schemes.rainbow;
                const index = params.node.rowIndex % colors.length;
                return { background: colors[index] };
            },

            onGridReady: (params) => {
                this.gridApi = params.api;
                this.restoreOrFit();
                this.initializeBulkActions(); // NEW: Setup UI
            },

            onSelectionChanged: () => {
                this.updateBulkUI(); // NEW: Handle checkbox clicks
            },

            onFirstDataRendered: () => {
                this.restoreOrFit();
            }
        };

        this.gridApi = agGrid.createGrid(container, gridOptions);
        this.setupSaveListener();
    },

    // 1:1 Copy from VIG
    restoreOrFit() {
        if (!this.gridApi) return;

        // 1. Check for saved size (VSM Key)
        const savedSize = (window.Settings && Settings.current && Settings.current.modalSize_VSM);
        if (savedSize && savedSize.width) {
            console.log('💾 Restoring VSM Size:', savedSize);
            const container = document.getElementById('vendorSummaryGridContainer');
            if (container) {
                const modalContent = container.closest('.modal-content');
                if (modalContent) {
                    modalContent.style.width = savedSize.width;
                    if (savedSize.height) modalContent.style.height = savedSize.height;
                    this.userHasResized = true;
                }
            }
        } else {
            // 2. Default Size (Match VIG)
            const container = document.getElementById('vendorSummaryGridContainer');
            if (container) {
                const modalContent = container.closest('.modal-content');
                if (modalContent) {
                    modalContent.style.width = '1000px';
                    modalContent.style.maxWidth = '95vw';
                }
            }
        }

        // Force refresh
        setTimeout(() => this.gridApi.sizeColumnsToFit(), 50);
    },

    // 1:1 Copy from VIG
    setupSaveListener() {
        const container = document.getElementById('vendorSummaryGridContainer');
        if (!container) return;
        const modalContent = container.closest('.modal-content');
        if (!modalContent || modalContent.dataset.resizeListenerAttached) return;

        const observer = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (this.gridApi) {
                    this.gridApi.sizeColumnsToFit();

                    clearTimeout(this.saveTimer);
                    this.saveTimer = setTimeout(() => {
                        const w = entry.target.style.width;
                        const h = entry.target.style.height;
                        if (w && h && parseInt(w) > 300) {
                            if (!window.Settings) return;
                            if (!Settings.current) Settings.current = {};

                            Settings.current.modalSize_VSM = { width: w, height: h };
                            if (Settings.save) Settings.save();

                            this.userHasResized = true;
                        }
                    }, 500);
                }
            }
        });

        observer.observe(modalContent);
        modalContent.dataset.resizeListenerAttached = 'true';
    },

    getColumnDefs() {
        return [
            {
                // "Ghost Column" for alignment with Drill Down checkboxes
                width: 50,
                minWidth: 50,
                maxWidth: 50,
                pinned: 'left',
                lockPosition: true,
                suppressMenu: true,
                headerName: '',
                cellRenderer: (params) => {
                    // MOCK SYNC STATUS: Check if vendor has an ID or just assume 'Cloud' for now
                    // User Request: "if sync to cloud... show sync icon"
                    // We'll use a cloud icon. If we had a 'dirty' flag, we'd use offline.
                    // For UI demo: Cloud by default.
                    return `<div style="display:flex; justify-content:center; align-items:center; height:100%;">
                        <i class="fas fa-cloud" style="color: #3b82f6; font-size: 0.8rem;" title="Synced to Cloud"></i>
                    </div>`;
                },
                cellStyle: { background: '#ffffff', borderRight: '1px solid #e2e8f0', padding: 0 } // Force white background
            },
            {
                // Matches VIG Description style
                headerName: 'Vendor Name', field: 'name', width: 260, minWidth: 200,
                sortable: true, filter: true,
                cellRenderer: (params) => {
                    const link = `<span class="drill-down-link" style="color:#2563eb; text-decoration:underline; cursor:pointer; font-weight:bold;">${params.value}</span>`;
                    const editIcon = `<span class="edit-icon" style="margin-left:8px; opacity:0.6; cursor:pointer;" title="Rename">✏️</span>`;
                    return `<div style="display:flex; align-items:center;">${link}${editIcon}</div>`;
                },
                onCellClicked: (params) => {
                    const t = params.event.target;
                    if (t.closest('.drill-down-link')) window.App?.openDrillDown(params.value);
                    if (t.closest('.edit-icon')) {
                        setTimeout(() => {
                            const n = prompt(`Rename vendor "${params.value}" to:`, params.value);
                            if (n && n !== params.value) window.App?.renameVendor(params.value, n);
                        }, 10);
                    }
                }
            },
            { headerName: 'Count', field: 'count', width: 90, minWidth: 80, type: 'numericColumn' },
            {
                headerName: 'Amount ($)', field: 'totalAmount', width: 110, minWidth: 100, type: 'numericColumn',
                valueFormatter: p => Utils.formatCurrency(p.value)
            },
            {
                // MATCHING VIG FLEX LOGIC EXACTLY
                headerName: 'Account', field: 'currentAccount',
                flex: 1,
                minWidth: 250,
                editable: true,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: () => ({
                    values: AccountAllocator.getAllAccounts().map(a => `${a.code} - ${a.name}`),
                    valueListGap: 8
                }),
                valueFormatter: p => {
                    const acc = AccountAllocator.getAccountByCode(p.value);
                    return acc ? `${acc.code} - ${acc.name}` : (p.value || 'SELECT...');
                },
                singleClickEdit: true
            }
        ];
    },

    loadVendors(data) {
        if (!this.gridApi) return;
        this.vendors = data;
        this.gridApi.setRowData(data);
    },

    onCellValueChanged(params) {
        if (params.colDef.field === 'currentAccount' && window.App?.bulkUpdateVendor) {
            window.App.bulkUpdateVendor(params.data.name, params.newValue);
            this.gridApi.flashCells({ rowNodes: [params.node], columns: ['currentAccount'] });
        }
    },

    // --- NEW BULK ACTION LOGIC ---
    initializeBulkActions() {
        const bar = document.getElementById('vsmBulkActions');
        const select = document.getElementById('vsmBulkAccountSelect');
        const btn = document.getElementById('vsmApplyBulkBtn');

        if (!bar || !select || !btn) return;

        // Populate Dropdown
        const accounts = AccountAllocator.getAllAccounts();
        select.innerHTML = '<option value="">Assign Account...</option>' +
            accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');

        // Clean up old listener if exists (simple check)
        btn.onclick = () => this.applyBulkUpdate();
    },

    updateBulkUI() {
        const bar = document.getElementById('vsmBulkActions');
        const countSpan = document.getElementById('vsmSelectedCount');
        if (!bar || !this.gridApi) return;

        const selected = this.gridApi.getSelectedRows();
        if (selected.length > 0) {
            bar.style.display = 'flex';
            if (countSpan) countSpan.textContent = `${selected.length} selected`;
        } else {
            bar.style.display = 'none';
        }
    },

    applyBulkUpdate() {
        if (!this.gridApi || !window.App) return;

        const select = document.getElementById('vsmBulkAccountSelect');
        const accountCode = select.value;
        const selectedRows = this.gridApi.getSelectedRows();

        if (!accountCode) {
            alert('Please select an account first.');
            return;
        }

        if (selectedRows.length === 0) return;

        if (confirm(`Assign account ${accountCode} to ${selectedRows.length} vendors?`)) {
            let updatedCount = 0;

            // 1. Update Data & App Logic
            selectedRows.forEach(row => {
                // Update App (Backend/Storage)
                window.App.bulkUpdateVendor(row.name, accountCode);

                // Update Grid Data Locally
                row.currentAccount = accountCode;
                updatedCount++;
            });

            // 2. Refresh Grid Display
            this.gridApi.applyTransaction({ update: selectedRows });
            this.gridApi.deselectAll();

            // 3. Reset UI
            select.value = "";
            this.updateBulkUI();

            // 4. Feedback
            // Try to use App's toast if available, or just console
            console.log(`✅ Bulk Updated ${updatedCount} vendors to ${accountCode}`);
        }
    }
};
