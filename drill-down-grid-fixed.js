// Vendor Drill-Down Grid - AG Grid Implementation
// v1.28 - Flex Layout (Auto-Resize & No Whitespace)
console.log('🔍 Loading DrillDownGrid v1.28 (Flex)...');

window.DrillDownGrid = {
    gridApi: null,
    columnApi: null,
    userHasResized: false,
    saveTimer: null,

    initialize(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = '';
        container.style.height = '100%';
        container.style.width = '100%';

        const gridOptions = {
            columnDefs: this.getColumnDefs(),
            defaultColDef: {
                sortable: true, filter: true, resizable: true, suppressSizeToFit: false
            },
            rowData: [],
            animateRows: true,
            rowSelection: 'single',
            overlayNoRowsTemplate: '<span style="color:var(--text-secondary);">No transactions found.</span>',

            getRowStyle: (params) => {
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
            },

            onFirstDataRendered: () => {
                this.restoreOrFit();
            }
        };

        this.gridApi = agGrid.createGrid(container, gridOptions);
        this.setupSaveListener();
    },

    restoreOrFit() {
        if (!this.gridApi) return;

        const savedSize = (window.Settings && Settings.current && Settings.current.modalSize_VIG);
        if (savedSize && savedSize.width) {
            console.log('💾 Restoring VIG Size:', savedSize);
            const container = document.getElementById('drillDownGridContainer');
            if (container) {
                const modalContent = container.closest('.modal-content');
                if (modalContent) {
                    modalContent.style.width = savedSize.width;
                    if (savedSize.height) modalContent.style.height = savedSize.height;
                    this.userHasResized = true;
                }
            }
        } else {
            // Default size
            const container = document.getElementById('drillDownGridContainer');
            if (container) {
                const modalContent = container.closest('.modal-content');
                if (modalContent) {
                    modalContent.style.width = '1000px';
                    modalContent.style.maxWidth = '95vw';
                }
            }
        }

        setTimeout(() => this.gridApi.sizeColumnsToFit(), 50);
    },

    setupSaveListener() {
        const container = document.getElementById('drillDownGridContainer');
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

                            Settings.current.modalSize_VIG = { width: w, height: h };
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
                headerName: 'Date', field: 'date', width: 100, minWidth: 90, sortable: true,
                cellRenderer: p => p.value ? new Date(p.value).toLocaleDateString() : ''
            },
            { headerName: 'Description (Payee)', field: 'payee', width: 280, minWidth: 200, sortable: true, filter: true },
            {
                headerName: 'Amount ($)',
                width: 110, minWidth: 100, type: 'numericColumn', sortable: true,
                valueGetter: (params) => {
                    const d = params.data;
                    if (d.amount != null && d.amount !== '' && Math.abs(parseFloat(d.amount)) > 0.001) return parseFloat(d.amount);
                    if (d.Amount != null && d.Amount !== '' && Math.abs(parseFloat(d.Amount)) > 0.001) return parseFloat(d.Amount);
                    return (parseFloat(d.debits || 0) - parseFloat(d.credits || 0));
                },
                valueFormatter: p => {
                    if (p.value == null) return '$0.00';
                    return (p.value < 0 ? '-' : '') + '$' + Math.abs(p.value).toFixed(2);
                }
            },
            {
                // FLEX COLUMN (VIG)
                headerName: 'Account', field: 'allocatedAccount',
                flex: 1,
                minWidth: 250,
                editable: true,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: () => ({
                    values: AccountAllocator.getAllAccounts().map(a => `${a.code} - ${a.name}`),
                    valueListGap: 8
                }),
                valueFormatter: p => {
                    if (!p.value) return 'SELECT...';
                    const acc = AccountAllocator.getAccountByCode(p.value);
                    return acc ? `${acc.code} - ${acc.name}` : p.value;
                },
                singleClickEdit: true
            }
        ];
    },

    loadTransactions(transactions, vendorName) {
        if (!this.gridApi) return;
        this.currentVendorName = vendorName;
        this.gridApi.setRowData(transactions);
    },

    onCellValueChanged(params) {
        if (typeof App !== 'undefined' && App.updateTransaction) {
            const tx = params.data;
            const field = params.colDef.field;
            if (field === 'allocatedAccount') {
                const acc = AccountAllocator.getAccountByCode(params.newValue);
                if (acc) tx.allocatedAccountName = acc.name;
            }
            App.updateTransaction(tx);
            this.gridApi.flashCells({ rowNodes: [params.node] });
        }
    }
};
