// Vendor Summary Grid - AG Grid Implementation
// v1.29 - CLONE of VIG Logic (1:1 Match)
console.log('📊 Loading VendorSummaryGrid v1.29 (VIG Clone)...');

window.VendorSummaryGrid = {
    gridApi: null,
    columnApi: null,
    userHasResized: false,
    saveTimer: null,
    resizeObserver: null, // ⚡ FIX: Store observer reference for cleanup

    initialize(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Detect Logic: Check if parent modal is "VDMModal" (Vendor Dictionary)
        // If so, we are in VDM. If not, we are likely in VIG.
        const modal = container.closest('.modal');
        this.isVDM = (modal && modal.id === 'VDMModal');

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
            rowHeight: 32, // Snug Rows
            headerHeight: 32, // Snug Header

            // Match VIG Row Styling (Simplified for v1.25)
            getRowStyle: (params) => {
                // Removed Red Border logic for missing accounts (User Feedback)
                // Use Standard Stripe Logic
                const scheme = (window.Settings && Settings.current.gridColorScheme) || 'classic'; // Default to classic (White/Gray)
                const schemes = (window.TransactionGrid && TransactionGrid.colorSchemes) || {
                    rainbow: ['#FFD1DC', '#D1F2FF', '#D1FFD1', '#FFFACD', '#FFDAB9', '#E6E6FA'],
                    classic: ['#FFFFFF', '#F5F5F5']
                };
                // Fallback to classic if scheme not found or if user wants "weird" rainbow gone
                const colors = schemes[scheme] || schemes.classic;
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
            console.log('💾 Restoring VIG Size:', savedSize);
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

        // Force refresh ONLY if visible
        const container = document.getElementById('vendorSummaryGridContainer');
        if (container && container.offsetWidth > 0) {
            setTimeout(() => this.gridApi.sizeColumnsToFit(), 50);
        }
    },

    // 1:1 Copy from VIG
    setupSaveListener() {
        const container = document.getElementById('vendorSummaryGridContainer');
        if (!container) return;
        const modalContent = container.closest('.modal-content');
        if (!modalContent) return;

        // ⚡ FIX: Cleanup old observer if exists
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        this.resizeObserver = new ResizeObserver(entries => {
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

                            Settings.current.modalSize_VIG = { width: w, height: h };
                            if (Settings.save) Settings.save();

                            this.userHasResized = true;
                        }
                    }, 500);
                }
            }
        });

        this.resizeObserver.observe(modalContent);
    },

    // ⚡ FIX: Cleanup method to prevent memory leaks
    cleanup() {
        console.log('🧹 VendorSummaryGrid: Cleaning up resources...');

        // Disconnect ResizeObserver
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        // Clear timers
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }

        // Destroy grid
        if (this.gridApi) {
            this.gridApi.destroy();
            this.gridApi = null;
        }

        console.log('✅ VendorSummaryGrid: Cleanup complete');
    },

    getColumnDefs() {
        const columns = [
            {
                headerName: 'Vendor Name',
                field: 'name',
                width: 260,
                minWidth: 200,
                sortable: true,
                filter: true,
                cellRenderer: (params) => {
                    const name = `<span style="font-weight: 500;">${params.value}</span>`;
                    return `<div style="display:flex; align-items:center; justify-content: space-between; width: 100%;">${name}</div>`;
                }
            },
            { headerName: 'Count', field: 'count', width: 90, minWidth: 80, type: 'numericColumn' },
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

        // ➕ RESTORED: Drill Down (VIG ONLY)
        // Feature logic: Only show if NOT in Vendor Dictionary
        if (!this.isVDM) {
            columns.push({
                headerName: '',
                width: 50,
                maxWidth: 50,
                pinned: 'right',
                suppressMenu: true,
                cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center', padding: 0 },
                cellRenderer: (params) => {
                    return `<button class="drill-down-btn" 
                        style="border:none; background:transparent; cursor:pointer; color:var(--primary-color); padding: 4px; border-radius: 4px; transition: background 0.2s;"
                        onmouseover="this.style.background='rgba(99, 102, 241, 0.1)'"
                        onmouseout="this.style.background='transparent'"
                        title="View Transactions">
                        <i class="fas fa-search-plus" style="font-size: 0.9rem;"></i>
                     </button>`;
                },
                onCellClicked: (params) => {
                    if (params.event.target.closest('.drill-down-btn')) {
                        if (window.App && App.openDrillDown) {
                            App.openDrillDown(params.data.name);
                        }
                    }
                }
            });
        }

        // 🔒 DELETE (Always Last)
        columns.push({
            headerName: '',
            field: 'delete',
            width: 60,
            pinned: 'right', // 🔒 Standard "Action Column" behavior
            lockPosition: true, // Prevent moving
            suppressMenu: true,
            cellStyle: { display: 'flex', justifyContent: 'center', alignItems: 'center' },
            cellRenderer: (params) => {
                return `<button class="delete-vendor-btn" data-vendor="${params.data.name}" 
                style="padding: 6px 8px; border: none; background: transparent; cursor: pointer; color: #64748b; border-radius: 4px; transition: all 0.2s;"
                onmouseover="this.style.background='#fee2e2'; this.style.color='#dc2626';" 
                onmouseout="this.style.background='transparent'; this.style.color='#64748b';"
                title="Delete Vendor">
                <i class="fas fa-trash" style="font-size: 0.85rem;"></i>
            </button>`;
            },
            onCellClicked: (params) => {
                if (params.event.target.closest('.delete-vendor-btn')) {
                    const vendorName = params.data.name;
                    if (confirm(`Delete vendor "${vendorName}"?\n\nThis will remove the vendor but keep all transactions.`)) {
                        window.App?.deleteVendor(vendorName);
                    }
                }
            }
        });

        return columns;
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
    },

    // ➕ NEW: Add Vendor Support (Standardized)
    addVendor(vendorData) {
        if (window.VendorMatcher) {
            VendorMatcher.addVendor(vendorData);
            this.loadVendors(VendorMatcher.getAllVendors()); // Refresh
            alert(`Vendor "${vendorData.name}" added successfully!`);
        } else {
            console.error('VendorMatcher not found');
        }
    }
};
