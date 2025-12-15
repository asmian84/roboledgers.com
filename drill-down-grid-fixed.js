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
            animateRows: true,
            rowSelection: 'multiple', // User Request: Bulk Reclassify
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
                this.initializeBulkActions(); // NEW: UI Setup
            },

            onSelectionChanged: () => {
                this.updateBulkUI(); // NEW: Toggle UI
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
                checkboxSelection: true,
                headerCheckboxSelection: true,
                width: 50,
                minWidth: 50,
                maxWidth: 50,
                pinned: 'left',
                lockPosition: true,
                suppressMenu: true,
                cellClass: 'checkbox-cell'
            },
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
    },

    // --- NEW BULK ACTION LOGIC ---
    initializeBulkActions() {
        const bar = document.getElementById('ddBulkActions');
        const vendorSelect = document.getElementById('ddBulkVendorSelect');
        const accountSelect = document.getElementById('ddBulkAccountSelect');
        const btn = document.getElementById('ddApplyBulkBtn');

        if (!bar || !vendorSelect || !accountSelect || !btn) return;

        // 1. Populate VENDOR Dropdown
        let vendorOptions = '<option value="">(Optional) Move to Vendor...</option>';
        if (window.VendorSummaryGrid && window.VendorSummaryGrid.gridApi) {
            const vendors = [];
            window.VendorSummaryGrid.gridApi.forEachNode(node => {
                if (node.data && node.data.name) vendors.push(node.data.name);
            });
            vendors.sort();
            vendorOptions += vendors.map(v => `<option value="${v}">${v}</option>`).join('');
        }
        vendorSelect.innerHTML = vendorOptions;

        // 2. Populate ACCOUNT Dropdown
        const accounts = AccountAllocator.getAllAccounts();
        let accountOptions = '<option value="">(Optional) Assign Account...</option>';
        accountOptions += accounts.map(a => `<option value="${a.code}">${a.code} - ${a.name}</option>`).join('');
        accountSelect.innerHTML = accountOptions;

        // Clean listener
        btn.onclick = () => this.applyBulkAction();
    },

    updateBulkUI() {
        const bar = document.getElementById('ddBulkActions');
        const countSpan = document.getElementById('ddSelectedCount');
        if (!bar || !this.gridApi) return;

        const selected = this.gridApi.getSelectedRows();
        if (selected.length > 0) {
            bar.style.display = 'flex';
            if (countSpan) countSpan.textContent = `${selected.length} selected`;
        } else {
            bar.style.display = 'none';
        }
    },

    applyBulkAction() {
        if (!this.gridApi || !window.App) return;

        const vendorSelect = document.getElementById('ddBulkVendorSelect');
        const accountSelect = document.getElementById('ddBulkAccountSelect');

        const targetVendor = vendorSelect.value;
        const targetAccount = accountSelect.value;
        const selectedRows = this.gridApi.getSelectedRows();

        if (!targetVendor && !targetAccount) {
            alert('Please select a Vendor OR an Account (or both) to apply changes.');
            return;
        }

        if (selectedRows.length === 0) return;

        let confirmMsg = `Update ${selectedRows.length} transactions?`;
        if (targetVendor && targetAccount) confirmMsg = `Move ${selectedRows.length} items to "${targetVendor}" AND set account to ${targetAccount}?`;
        else if (targetVendor) confirmMsg = `Move ${selectedRows.length} items to vendor "${targetVendor}"?`;
        else if (targetAccount) confirmMsg = `Set account for ${selectedRows.length} items to ${targetAccount}?`;

        if (confirm(confirmMsg)) {
            let updatedCount = 0;

            selectedRows.forEach(tx => {
                // Logic 1: Vendor Change
                if (targetVendor) {
                    tx.vendor = targetVendor;
                }

                // Logic 2: Account Change
                if (targetAccount) {
                    tx.allocatedAccount = targetAccount;
                    const acc = AccountAllocator.getAccountByCode(targetAccount);
                    if (acc) tx.allocatedAccountName = acc.name;
                } else if (targetVendor && !targetAccount) {
                    // If ONLY vendor changed, check if we should inherit that vendor's default account
                    // (Optional, but often expected behavior)
                    if (window.VendorMatcher) {
                        const rule = VendorMatcher.getVendorByName(targetVendor);
                        if (rule && rule.defaultAccount) {
                            tx.allocatedAccount = rule.defaultAccount;
                            const acc = AccountAllocator.getAccountByCode(rule.defaultAccount);
                            if (acc) tx.allocatedAccountName = acc.name;
                        }
                    }
                }

                // Persist
                window.App.updateTransaction(tx);
                updatedCount++;
            });

            // Refresh Logic
            if (targetVendor) {
                // If vendor changed, rows MUST leave the current view (Dynamic Update)
                this.gridApi.applyTransaction({ remove: selectedRows });

                // --- DYNAMIC TITLE UPDATE ---
                const titleEl = document.getElementById('drillDownModalTitle');
                if (titleEl) {
                    // Extract current count "Transactions: Vendor (44)"
                    const match = titleEl.textContent.match(/\((\d+)\)/);
                    if (match && match[1]) {
                        const currentCount = parseInt(match[1]);
                        const newCount = Math.max(0, currentCount - selectedRows.length);
                        // Safe replace
                        titleEl.textContent = titleEl.textContent.replace(`(${currentCount})`, `(${newCount})`);
                    }
                }

                // --- SUCCESS FEEDBACK ---
                setTimeout(() => {
                    alert(`✅ Successfully moved ${selectedRows.length} transactions to "${targetVendor}".`);
                }, 50);

                // Trigger Parent Refresh
                if (window.VendorSummaryGrid && window.VendorSummaryGrid.gridApi) {
                    console.log('🔄 Triggering VIG Refresh (Best Effort)...');
                    // In a real app we'd fire an event. For now, we rely on the user closing/re-opening
                    // or we could try to force a redraw if we had access to the aggregation logic.
                }
            } else {
                // If ONLY account changed, rows stay, just update data
                this.gridApi.applyTransaction({ update: selectedRows });
                this.gridApi.flashCells({ rowNodes: selectedRows, columns: ['allocatedAccount'] });
            }

            this.gridApi.deselectAll();

            // Reset UI
            vendorSelect.value = "";
            accountSelect.value = "";
            this.updateBulkUI();

            console.log(`✅ Bulk Action Complete on ${updatedCount} items.`);
        }
    }
};
