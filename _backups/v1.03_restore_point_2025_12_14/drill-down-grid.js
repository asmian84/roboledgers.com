// Vendor Drill-Down Grid - AG Grid Implementation
console.log('🔍 Loading DrillDownGrid v10 (Smart Resize + Stable)...');

window.DrillDownGrid = {
    gridApi: null,
    columnApi: null,
    currentVendorName: null,

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
        container.style.height = '100%'; // Fill parent height

        const gridOptions = {
            columnDefs: this.getColumnDefs(),
            defaultColDef: {
                sortable: true, filter: true, resizable: true, flex: 1
            },
            rowData: [],
            // No autoHeight -> Sticky Headers
            animateRows: true,
            rowSelection: 'single',
            overlayNoRowsTemplate: '<span style="color:var(--text-secondary);">No transactions found.</span>',

            // UNIFIED ROW STYLING (Matches TransactionGrid)
            getRowClass: (params) => '',
            getRowStyle: (params) => {
                // Use Standard Color Scheme
                const scheme = (window.Settings && Settings.current.gridColorScheme) || 'rainbow';
                const schemes = (window.TransactionGrid && TransactionGrid.colorSchemes) || {
                    rainbow: ['#FFD1DC', '#D1F2FF', '#D1FFD1', '#FFFACD', '#FFDAB9', '#E6E6FA'],
                    classic: ['#FFFFFF', '#F5F5F5']
                };
                const colors = schemes[scheme] || schemes.rainbow;
                const colorIndex = params.node.rowIndex % colors.length;

                const style = { background: colors[colorIndex] };

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

            onFirstDataRendered: (params) => {
                this.safelySizeColumnsToFit();
            },

            popupParent: document.body,
            stopEditingWhenCellsLoseFocus: true,
            onCellValueChanged: this.onCellValueChanged.bind(this)
        };

        this.gridApi = agGrid.createGrid(container, gridOptions);

        // Responsive Resize (Debounced)
        const resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                if (entry.contentRect.width > 0 && this.gridApi) {
                    // Force resize when container becomes visible/resizes
                    requestAnimationFrame(() => {
                        this.safelySizeColumnsToFit();
                    });
                }
            }
        });
        resizeObserver.observe(container);
        this.resizeObserver = resizeObserver;
    },

    getColumnDefs() {
        return [
            {
                headerName: 'Date',
                field: 'date',
                minWidth: 120,
                flex: 1, // Autofit
                pinned: 'left',
                valueFormatter: (params) => Utils.formatDate(params.value)
            },
            {
                headerName: 'Description (Payee)',
                field: 'payee',
                minWidth: 150, // Reduced from 250 for Flex
                flex: 3 // Takes most space
                // Read-only reference
            },
            {
                headerName: 'Amount',
                field: 'amount',
                minWidth: 120,
                flex: 1,
                type: 'numericColumn',
                valueGetter: (params) => {
                    // Logic to show generic amount regardless of Debit/Credit
                    return params.data.debits > 0 ? -params.data.debits : params.data.amount;
                },
                valueFormatter: (params) => {
                    const val = Math.abs(params.value);
                    return (params.value < 0 ? '-' : '') + '$' + val.toFixed(2);
                },
                cellStyle: (params) => {
                    return params.value < 0 ? { color: '#ef4444' } : { color: '#22c55e' };
                }
            },
            {
                headerName: 'Allocated Account',
                field: 'allocatedAccount', // The code
                headerName: 'Allocated Account',
                field: 'allocatedAccount', // The code
                minWidth: 150, // Reduced from 250 for Flex
                flex: 2,
                editable: true,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: (params) => {
                    const accounts = AccountAllocator.getAllAccounts();
                    return {
                        values: accounts.map(a => `${a.code} - ${a.name}`),
                        valueListGap: 8
                    };
                },
                valueParser: (params) => {
                    if (!params.newValue) return '';
                    const match = params.newValue.match(/^(\d+)/);
                    return match ? match[1] : params.newValue;
                },
                valueFormatter: (params) => {
                    if (!params.value) return '';
                    if (String(params.value).includes(' - ')) return params.value;
                    const acc = AccountAllocator.getAccountByCode(params.value);
                    return acc ? `${acc.code} - ${acc.name}` : params.value;
                },
                cellRenderer: (params) => {
                    return params.valueFormatted || params.value || '';
                },
                singleClickEdit: true
            }
        ];
    },

    loadTransactions(transactions, vendorName) {
        if (!this.gridApi) return;
        this.currentVendorName = vendorName;
        // ⚠️ REVERT: setGridOption caused crash. Using deprecated but stable setRowData.
        this.gridApi.setRowData(transactions);
        this.safelySizeColumnsToFit();
    },

    // ⚡ SMART RESIZE: Polls until grid is visible
    safelySizeColumnsToFit() {
        if (!this.gridApi) return;

        const attemptResize = (attemptsLeft) => {
            const container = document.getElementById('drillDownGridContainer');
            if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
                // ✅ Visible! Resize now.
                console.log('✅ DrillDownGrid Visible - Resizing Columns...');
                this.gridApi.sizeColumnsToFit();
            } else if (attemptsLeft > 0) {
                // ⏳ Not visible yet... wait and retry
                requestAnimationFrame(() => attemptResize(attemptsLeft - 1));
            }
        };

        // Try for 300 frames (~5 seconds) to be safe
        attemptResize(300);
    },

    onCellValueChanged(params) {
        const tx = params.data;
        const field = params.colDef.field;

        console.log(`🔨 Drill-Down Edit: [${field}] for tx ${tx.id} -> ${params.newValue}`);

        if (field === 'allocatedAccount') {
            const acc = AccountAllocator.getAccountByCode(params.newValue);
            if (acc) {
                tx.allocatedAccountName = acc.name;
            }
        }

        // Trigger App Update
        if (typeof App !== 'undefined' && App.updateTransaction) {
            // We use updateTransaction which usually handles single updates
            // Force status to manual
            tx.status = 'manual';
            App.updateTransaction(tx);

            // Flash cell
            this.gridApi.flashCells({ rowNodes: [params.node] });
        }
    }
};
