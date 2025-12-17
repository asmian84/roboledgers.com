// Vendor Summary Grid - AG Grid Implementation
console.log('📊 Loading VendorSummaryGrid...');

window.VendorSummaryGrid = {
    gridApi: null,
    columnApi: null,
    vendors: [],

    initialize(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        // Prevent duplicate initialization
        if (this.gridApi) {
            this.gridApi.destroy();
            this.gridApi = null;
        }

        container.innerHTML = '';
        container.style.width = '100%';
        container.style.height = '100%'; // ⚡ Force Height

        const gridOptions = {
            columnDefs: this.getColumnDefs(),
            defaultColDef: {
                sortable: true, filter: true, resizable: true, flex: 1
            },
            rowData: [],
            // REMOVED 'autoHeight' to enable Sticky Headers 📌
            // domLayout: 'normal', 
            animateRows: true,
            rowSelection: 'single',
            overlayNoRowsTemplate: '<span style="color:var(--text-secondary);">No vendors found.</span>',

            // Apply same theme classes as main grid if needed
            getRowClass: (params) => '',

            // UNIFIED ROW STYLING (Matches TransactionGrid)
            getRowStyle: (params) => {
                // 1. Highlight Unmatched/Action Items
                if (!params.data.currentAccount) {
                    return {
                        background: '#fff1f2', // Very light red
                        borderLeft: '5px solid #ef4444', // Red indicator
                        fontWeight: '500'
                    };
                }

                // 2. Standard Color Scheme
                const scheme = (window.Settings && Settings.current.gridColorScheme) || 'rainbow';
                // Try to use shared schemes, fallback to local definition
                const schemes = (window.TransactionGrid && TransactionGrid.colorSchemes) || {
                    rainbow: ['#FFD1DC', '#D1F2FF', '#D1FFD1', '#FFFACD', '#FFDAB9', '#E6E6FA'],
                    classic: ['#FFFFFF', '#F5F5F5'],
                    ledger: ['#E8F5E9', '#F1F8E9']
                };
                const colors = schemes[scheme] || schemes.rainbow;
                const colorIndex = params.node.rowIndex % colors.length;

                const style = { background: colors[colorIndex] };

                // Apply font customization if set
                if (window.Settings && Settings.current.gridFontSize) {
                    style.fontSize = Settings.current.gridFontSize + 'px';
                }

                return style;
            },

            onGridReady: (params) => {
                this.gridApi = params.api;
                this.columnApi = params.columnApi;
                this.safelySizeColumnsToFit();
            },

            // REDRAW on first data
            onFirstDataRendered: (params) => {
                this.safelySizeColumnsToFit();
            },

            // FIX DROPDOWN CLIPPING: Allow popups to escape the modal container
            popupParent: document.body,
            stopEditingWhenCellsLoseFocus: true,

            onCellValueChanged: this.onCellValueChanged.bind(this)
        };

        this.gridApi = agGrid.createGrid(container, gridOptions);

        // STABILITY: Use ResizeObserver to handle modal transitions
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && this.gridApi) {
                    // Debounce resize
                    clearTimeout(this.resizeTimer);
                    this.resizeTimer = setTimeout(() => {
                        this.gridApi.sizeColumnsToFit();
                    }, 50);
                }
            }
        });
        resizeObserver.observe(container);
        this.resizeObserver = resizeObserver;
    },

    getColumnDefs() {
        return [
            {
                headerName: 'Vendor Name',
                field: 'name',
                minWidth: 200,
                flex: 2, // Main content takes most space
                editable: false,
                cellRenderer: (params) => {
                    // 1. Drill-Down Link
                    const link = `<span class="drill-down-link" style="color:#2563eb; text-decoration:underline; cursor:pointer; font-weight:bold;">${params.value}</span>`;

                    // 2. Edit Action (Rename) - Wrapped in span for targetting
                    const editIcon = `<span class="edit-icon" style="margin-left:8px; opacity:0.6; cursor:pointer; font-size:14px;" title="Rename Vendor">✏️</span>`;

                    return `<div style="display:flex; align-items:center;">${link}${editIcon}</div>`;
                },
                onCellClicked: (params) => {
                    const target = params.event.target;

                    // Robust targeting using closest()
                    if (target.closest('.drill-down-link') || target.classList.contains('drill-down-link')) {
                        // 🔍 DRILL DOWN ACTION
                        const vendorName = params.value;
                        console.log('🔍 Drill Down Clicked:', vendorName);

                        if (window.App && window.App.openDrillDown) {
                            window.App.openDrillDown(vendorName);
                        } else {
                            console.error('❌ App.openDrillDown not found!', window.App);
                            alert(`Drill-down not available for ${vendorName} (App not verified)`);
                        }
                    }

                    if (target.closest('.edit-icon') || target.classList.contains('edit-icon')) {
                        // ⚡ RENAME ACTION
                        console.log('✏️ Rename Icon Clicked for:', params.value);

                        // Small timeout to ensure UI updates before alert/prompt blocks main thread
                        setTimeout(() => {
                            const oldName = params.value;
                            const newName = prompt(`Rename vendor "${oldName}" to:`, oldName);

                            if (newName && newName !== oldName) {
                                if (typeof App !== 'undefined' && App.renameVendor) {
                                    App.renameVendor(oldName, newName);
                                }
                            }
                        }, 10);
                    }
                }
            },
            {
                headerName: 'Count',
                field: 'count',
                minWidth: 100,
                flex: 1,
                type: 'numericColumn'
            },
            {
                headerName: 'Total Amount',
                field: 'totalAmount',
                width: 150,           // Fixed width for numbers
                minWidth: 150,
                type: 'numericColumn',
                suppressSizeToFit: true, // Don't shrink/grow
                resizable: true,
                valueFormatter: params => Utils.formatCurrency(params.value)
            },
            {
                headerName: 'Allocated Account',
                field: 'currentAccount',
                minWidth: 300,        // Safe minimum
                flex: 3,              // Takes remaining space
                editable: true,
                resizable: true,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: params => {
                    const accounts = AccountAllocator.getAllAccounts();
                    return {
                        values: accounts.map(a => `${a.code} - ${a.name}`),
                        valueListGap: 8
                    };
                },
                valueFormatter: (params) => {
                    const val = params.value;
                    if (!val) return 'SELECT...';
                    const acc = AccountAllocator.getAccountByCode(val);
                    return acc ? `${acc.code} - ${acc.name}` : val;
                },
                singleClickEdit: true
            }
        ];
    },

    loadVendors(vendorData) {
        if (!this.gridApi) return;
        this.vendors = vendorData;
        this.gridApi.setRowData(vendorData);
        // Use standard sizeColumnsToFit to fill width responsively
        if (this.gridApi) {
            this.gridApi.sizeColumnsToFit();
        }
    },

    // ⚡ Standard Resize
    safelySizeColumnsToFit() {
        if (this.gridApi) {
            this.gridApi.sizeColumnsToFit();
        }
    },

    onCellValueChanged(params) {
        // CASE 1: Account Change (Bulk Update)
        if (params.colDef.field === 'currentAccount') {
            const vendorName = params.data.name;
            const newAccountCode = params.newValue;

            console.log(`📝 Vendor Grid Edit: ${vendorName} -> ${newAccountCode}`);

            if (typeof App !== 'undefined' && App.bulkUpdateVendor) {
                App.bulkUpdateVendor(vendorName, newAccountCode);

                this.gridApi.flashCells({
                    rowNodes: [params.node],
                    columns: ['currentAccount']
                });
            }
        }

        // CASE 2: Name Change (Consolidation) 🧩
        if (params.colDef.field === 'name') {
            const oldName = params.oldValue;
            const newName = params.newValue;

            console.log(`🧩 Vendor Renamed: "${oldName}" -> "${newName}"`);

            if (typeof App !== 'undefined' && App.renameVendor) {
                // Call the App logic which will update transactions AND refresh this grid
                // We don't need to flash here because the whole grid is about to be refreshed
                App.renameVendor(oldName, newName);
            }
        }
    }
};
