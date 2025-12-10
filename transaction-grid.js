// Transaction Grid using AG Grid

const TransactionGrid = {
    gridApi: null,
    transactions: [],
    refPrefix: '',

    initialize(containerId) {
        const container = document.getElementById(containerId);

        const gridOptions = {
            columnDefs: this.getColumnDefs(),
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                editable: false,
                floatingFilter: true, // Enable floating filters for quick search
                filterParams: {
                    buttons: ['reset', 'apply'],
                    debounceMs: 200
                }
            },
            rowData: [],
            animateRows: true,
            enableCellChangeFlash: true,
            enableRangeSelection: true, // Allow selecting ranges
            enableFillHandle: true, // Allow dragging to fill cells
            suppressRowClickSelection: true, // Only checkbox selects rows
            rowSelection: 'multiple',
            onCellValueChanged: this.onCellValueChanged.bind(this),
            onSelectionChanged: this.onSelectionChanged.bind(this), // Track selection changes
            onGridReady: (params) => {
                this.gridApi = params.api;
                this.columnApi = params.columnApi;

                // REMOVED: Duplicate grid toolbar with Quick Search
                // Now using Quick Search from review header instead
                // this.addGridToolbar(container);

                // Set up window resize listener for responsive grid
                this.setupResizeListener();

                // Set up opening balance change listener
                this.setupOpeningBalanceListener();

                // Sort by date on initial load
                this.gridApi.applyColumnState({
                    state: [{ colId: 'date', sort: 'asc' }],
                    defaultState: { sort: null }
                });
            },
            onFirstDataRendered: (params) => {
                // Size columns to fit once data is loaded
                params.api.sizeColumnsToFit();
            },
            getRowStyle: (params) => {
                return this.getRowStyle(params);
            }
        };

        new agGrid.Grid(container, gridOptions);
    },

    addGridToolbar(container) {
        // Create toolbar div before grid
        const toolbar = document.createElement('div');
        toolbar.className = 'grid-toolbar';
        toolbar.innerHTML = `
            <div class="toolbar-left">
                <input type="text" id="gridQuickFilter" placeholder="Quick search..." class="toolbar-search">
            </div>
            <div class="toolbar-right">
                <button id="gridColumnToggle" class="btn-icon" title="Show/Hide Columns">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="3" width="7" height="7"></rect>
                        <rect x="14" y="3" width="7" height="7"></rect>
                        <rect x="14" y="14" width="7" height="7"></rect>
                        <rect x="3" y="14" width="7" height="7"></rect>
                    </svg>
                </button>
                <button id="gridExportCsv" class="btn-icon" title="Export to CSV">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                </button>
            </div>
        `;

        container.parentElement.insertBefore(toolbar, container);

        // Wire up toolbar events
        const quickFilter = document.getElementById('gridQuickFilter');
        if (quickFilter) {
            quickFilter.addEventListener('input', (e) => {
                this.gridApi.setQuickFilter(e.target.value);
            });
        }

        const columnToggle = document.getElementById('gridColumnToggle');
        if (columnToggle) {
            columnToggle.addEventListener('click', () => {
                this.showColumnManager();
            });
        }

        const exportBtn = document.getElementById('gridExportCsv');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToCsv();
            });
        }
    },

    showColumnManager() {
        const columns = this.columnApi.getAllColumns();
        const columnStates = columns.map(col => ({
            colId: col.getColId(),
            headerName: col.getColDef().headerName,
            visible: col.isVisible()
        }));

        // Create modal for column management
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'columnManagerModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h2>Manage Columns</h2>
                    <button class="modal-close" id="closeColumnManager">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="column-list">
                        ${columnStates.map(col => `
                            <div class="column-item">
                                <label>
                                    <input type="checkbox" data-col-id="${col.colId}" ${col.visible ? 'checked' : ''}>
                                    ${col.headerName}
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Handle checkbox changes
        modal.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                this.columnApi.setColumnVisible(e.target.dataset.colId, e.target.checked);
            });
        });

        // Close button
        modal.querySelector('#closeColumnManager').addEventListener('click', () => {
            modal.remove();
        });

        // Click outside to close
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    },

    getColumnDefs() {
        const accounts = AccountAllocator.getAllAccounts();
        const accountOptions = accounts.map(a => a.fullName);

        return [
            // Checkbox for batch selection
            {
                headerName: '',
                checkboxSelection: true,
                headerCheckboxSelection: true,
                width: 50,
                pinned: 'left',
                lockPosition: true,
                suppressMenu: true,
                filter: false,
                resizable: false
            },
            {
                headerName: 'Ref #',
                field: 'ref',
                width: 120,
                pinned: 'left',
                valueGetter: (params) => {
                    // Auto-generate ref number based on row index
                    const rowIndex = params.node.rowIndex + 1;
                    const refNum = String(rowIndex).padStart(3, '0');
                    const prefix = this.refPrefix || '';
                    return prefix ? `${prefix}-${refNum}` : refNum;
                }
            },
            {
                headerName: 'Date',
                field: 'date',
                width: 120,
                editable: true,
                sort: 'asc', // Default sort ascending
                comparator: (date1, date2) => {
                    // Date comparator for proper sorting
                    const d1 = new Date(date1);
                    const d2 = new Date(date2);
                    return d1.getTime() - d2.getTime();
                },
                valueFormatter: (params) => {
                    return Utils.formatDate(params.value, 'MM/DD/YYYY');
                },
                valueParser: (params) => {
                    // Parse and validate date input
                    return this.parseAndValidateDate(params.newValue);
                },
                cellStyle: { background: 'rgba(99, 102, 241, 0.05)' }
            },
            {
                headerName: 'Description',
                field: 'payee',
                width: 300,
                editable: true,
                tooltipField: 'payee',
                cellStyle: { background: 'rgba(99, 102, 241, 0.05)' }
            },
            {
                headerName: 'Debit',
                field: 'debits',
                width: 120,
                editable: true,
                type: 'numericColumn',
                valueFormatter: (params) => {
                    return params.value > 0 ? Utils.formatCurrency(params.value) : '';
                },
                valueParser: (params) => {
                    return this.parseCurrencyInput(params.newValue);
                },
                cellStyle: (params) => {
                    const baseStyle = { background: 'rgba(99, 102, 241, 0.05)' };
                    if (params.value > 0) {
                        return { ...baseStyle, color: '#ef4444', fontWeight: '500' };
                    }
                    return baseStyle;
                }
            },
            {
                headerName: 'Credit',
                field: 'amount',
                width: 120,
                editable: true,
                type: 'numericColumn',
                valueFormatter: (params) => {
                    return params.value > 0 ? Utils.formatCurrency(params.value) : '';
                },
                valueParser: (params) => {
                    return this.parseCurrencyInput(params.newValue);
                },
                cellStyle: (params) => {
                    const baseStyle = { background: 'rgba(99, 102, 241, 0.05)' };
                    if (params.value > 0) {
                        return { ...baseStyle, color: '#22c55e', fontWeight: '500' };
                    }
                    return baseStyle;
                }
            },
            {
                headerName: 'Balance',
                field: 'balance',
                width: 120,
                type: 'numericColumn',
                valueFormatter: (params) => {
                    return Utils.formatCurrency(params.value);
                }
            },
            {
                headerName: 'Account #',
                field: 'allocatedAccount',
                width: 120,
                editable: false,
                sortable: true,
                filter: true
            },
            {
                headerName: 'Account',
                field: 'allocatedAccountName',
                width: 300,
                editable: true,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: accountOptions
                },
                cellStyle: { background: 'rgba(99, 102, 241, 0.05)' },
                tooltipField: 'allocatedAccountName'
            },
            {
                headerName: 'Status',
                field: 'status',
                width: 120,
                sortable: true,
                filter: true,
                cellRenderer: (params) => {
                    const statusMap = {
                        'matched': { icon: '✓', color: '#22c55e', text: 'Matched' },
                        'unmatched': { icon: '!', color: '#ef4444', text: 'Unmatched' },
                        'manual': { icon: '✎', color: '#3b82f6', text: 'Manual' },
                        'reviewed': { icon: '✓✓', color: '#8b5cf6', text: 'Reviewed' }
                    };

                    const status = statusMap[params.value] || statusMap['unmatched'];
                    return `<span style="color: ${status.color}; font-weight: 500;">${status.icon} ${status.text}</span>`;
                }
            }
        ];
    },

    loadTransactions(transactions) {
        this.transactions = transactions;

        // Sort transactions chronologically before loading
        const sortedTransactions = [...transactions].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });

        this.transactions = sortedTransactions;

        if (this.gridApi) {
            this.gridApi.setRowData(this.transactions);
            this.gridApi.sizeColumnsToFit();

            // CRITICAL: Auto-calculate balances when loading transactions
            console.log('🔢 AUTO-CALCULATING BALANCES for', this.transactions.length, 'transactions');
            this.recalculateAllBalances();

            // Initialize bulk actions toolbar
            this.initializeBulkActions();
        }
    },

    setRefPrefix(prefix) {
        this.refPrefix = prefix || '';
        // Refresh grid to update ref numbers
        if (this.gridApi) {
            this.gridApi.refreshCells({ columns: ['ref'], force: true });
        }
    },

    onCellValueChanged(event) {
        const transaction = event.data;
        const field = event.colDef.field;
        let shouldRecalculateBalance = false;

        // Handle date change
        if (field === 'date') {
            transaction.date = event.newValue;
            transaction.status = 'manual';
            shouldRecalculateBalance = true; // Date change requires re-sort and balance recalc

            // Re-sort grid by date
            this.gridApi.applyColumnState({
                state: [{ colId: 'date', sort: 'asc' }],
                defaultState: { sort: null }
            });
        }

        // Handle payee change
        if (field === 'payee') {
            transaction.payee = event.newValue;
            transaction.status = 'manual';
            this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
        }

        // Handle debit change
        if (field === 'debits') {
            const newValue = parseFloat(event.newValue) || 0;
            transaction.debits = newValue;
            transaction.status = 'manual';
            shouldRecalculateBalance = true;
        }

        // Handle credit/amount change
        if (field === 'amount') {
            const newValue = parseFloat(event.newValue) || 0;
            transaction.amount = newValue;
            transaction.status = 'manual';
            shouldRecalculateBalance = true;
        }


        // Handle account selection
        if (field === 'allocatedAccountName') {
            const accountName = event.newValue;
            const account = AccountAllocator.getAllAccounts().find(a =>
                a.fullName === accountName
            );

            if (account) {
                transaction.allocatedAccount = account.code;
                transaction.allocatedAccountName = account.name;
                transaction.status = 'manual';

                // Learn from this manual categorization
                VendorMatcher.learnFromTransaction(transaction);

                // Check if there are other transactions with the same payee/description
                const payee = transaction.payee || transaction.description;
                const matchingTransactions = this.transactions.filter(t =>
                    t !== transaction && // Exclude current transaction
                    (t.payee === payee || t.description === payee) &&
                    t.allocatedAccount !== account.code // Only different account
                );

                if (matchingTransactions.length > 0) {
                    // Prompt user to apply to all matching
                    const message = `Found ${matchingTransactions.length} other transaction(s) with the same description:\n\n"${payee}"\n\nDo you want to apply account "${account.fullName}" to all of them?`;

                    if (confirm(message)) {
                        // Apply to all matching transactions
                        matchingTransactions.forEach(t => {
                            t.allocatedAccount = account.code;
                            t.allocatedAccountName = account.name;
                            t.status = 'manual';
                        });

                        // Refresh entire grid
                        this.gridApi.refreshCells({ force: true });

                        console.log(`✅ Applied account ${account.code} to ${matchingTransactions.length} matching transactions`);
                    } else {
                        // Just refresh the current row
                        this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
                    }
                } else {
                    // No matching transactions, just refresh current row
                    this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
                }

                // Update statistics
                App.updateStatistics();
            }
        }

        // Handle vendor name change
        if (field === 'vendor') {
            transaction.vendor = event.newValue;
            transaction.status = 'manual';

            // Refresh the row
            this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
        }

        // Handle category or notes change
        if (field === 'category' || field === 'notes') {
            // Just update the transaction
            this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
        }

        // Recalculate balances if amount or date changed
        if (shouldRecalculateBalance) {
            this.recalculateAllBalances();
        }

        // Save to localStorage
        Storage.saveTransactions(this.transactions);

        // Update statistics
        if (shouldRecalculateBalance) {
            App.updateStatistics();
        }
    },

    getTransactions() {
        return this.transactions;
    },

    updateTransaction(transactionId, updates) {
        const transaction = this.transactions.find(t => t.id === transactionId);
        if (transaction) {
            Object.assign(transaction, updates);
            this.gridApi.applyTransaction({ update: [transaction] });
            Storage.saveTransactions(this.transactions);
        }
    },

    exportToCsv() {
        if (this.gridApi) {
            this.gridApi.exportDataAsCsv({
                fileName: `transactions_${ExcelExporter.getDateString()}.csv`
            });
        }
    },

    // Helper method: Parse currency input (supports $1,234.56, 1234.56, etc.)
    parseCurrencyInput(value) {
        if (!value) return 0;

        // Remove currency symbols and commas
        const cleaned = String(value).replace(/[$,]/g, '');

        // Parse as float
        const parsed = parseFloat(cleaned);

        // Return 0 if invalid
        return isNaN(parsed) ? 0 : Math.max(0, parsed);
    },

    // Helper method: Parse and validate date input
    parseAndValidateDate(value) {
        if (!value) return null;

        // Try to parse the date
        const date = new Date(value);

        // Check if valid
        if (isNaN(date.getTime())) {
            console.warn('Invalid date input:', value);
            return null;
        }

        return date.toISOString();
    },

    // BATCH SELECTION: Handle selection changes
    onSelectionChanged() {
        const selectedRows = this.gridApi.getSelectedRows();
        const count = selectedRows.length;

        // Show/hide bulk actions bar
        const bulkBar = document.getElementById('bulkActionsBar');
        const countEl = document.getElementById('selectedCount');

        if (bulkBar && countEl) {
            if (count > 0) {
                bulkBar.style.display = 'flex';
                countEl.textContent = count;
            } else {
                bulkBar.style.display = 'none';
            }
        }

        console.log(`📋 ${count} rows selected`);
    },

    // BATCH SELECTION: Apply account to all selected transactions
    applyBulkAccount(accountCode, accountName) {
        const selectedRows = this.gridApi.getSelectedRows();

        if (selectedRows.length === 0) {
            alert('No transactions selected');
            return;
        }

        // Confirm bulk update
        const confirmMsg = `Assign "${accountName}" to ${selectedRows.length} selected transaction(s)?`;
        if (!confirm(confirmMsg)) return;

        // Update all selected transactions
        selectedRows.forEach(row => {
            row.allocatedAccount = accountCode;
            row.allocatedAccountName = accountName;
            row.status = 'manual';

            // Learn from each transaction
            VendorMatcher.learnFromTransaction(row);
        });

        // Refresh grid
        this.gridApi.refreshCells({ force: true });

        // Clear selection
        this.gridApi.deselectAll();

        // Save and update stats
        Storage.saveTransactions(this.transactions);
        App.updateStatistics();

        console.log(`✅ Bulk assigned ${accountCode} to ${selectedRows.length} transactions`);
    },

    // BATCH SELECTION: Initialize bulk actions toolbar
    initializeBulkActions() {
        const accountSelect = document.getElementById('bulkAccountSelect');
        const applyBtn = document.getElementById('applyBulkAccount');
        const clearBtn = document.getElementById('clearSelection');

        if (!accountSelect || !applyBtn || !clearBtn) {
            console.warn('⚠️ Bulk actions UI elements not found');
            return;
        }

        // Populate account dropdown
        const accounts = AccountAllocator.getAllAccounts();
        accountSelect.innerHTML = '<option value="">Assign Account...</option>';

        accounts.forEach(account => {
            const option = document.createElement('option');
            option.value = account.code;
            option.textContent = `${account.code} - ${account.fullName}`;
            accountSelect.appendChild(option);
        });

        // Apply button handler
        applyBtn.addEventListener('click', () => {
            const selectedAccount = accountSelect.value;
            if (!selectedAccount) {
                alert('Please select an account');
                return;
            }

            const account = accounts.find(a => a.code === selectedAccount);
            if (account) {
                this.applyBulkAccount(account.code, account.fullName);
                accountSelect.value = ''; // Reset dropdown
            }
        });

        // Clear selection button
        clearBtn.addEventListener('click', () => {
            this.gridApi.deselectAll();
        });

        console.log('✅ Bulk actions initialized');
    },

    // Helper method: Recalculate all balances from opening balance
    recalculateAllBalances() {
        if (!this.transactions || this.transactions.length === 0) return;

        // Sort transactions by date
        const sortedTransactions = [...this.transactions].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return dateA.getTime() - dateB.getTime();
        });

        // Get opening balance from reconciliation panel or default to 0
        const openingBalanceInput = document.getElementById('expectedOpeningBalance');
        let runningBalance = 0;

        if (openingBalanceInput && openingBalanceInput.value) {
            runningBalance = parseFloat(openingBalanceInput.value) || 0;
        }

        console.log('Starting balance calculation from opening:', runningBalance);

        // Recalculate each transaction balance
        for (let i = 0; i < sortedTransactions.length; i++) {
            const tx = sortedTransactions[i];
            const debit = parseFloat(tx.debits) || 0;
            const credit = parseFloat(tx.amount) || 0;

            // Balance calculation: Opening Balance - Debit + Credit
            // Debits decrease balance (money out), Credits increase balance (money in)
            runningBalance = runningBalance - debit + credit;
            tx.balance = runningBalance;

            // Debug first few transactions
            if (i < 3) {
                console.log(`Txn ${i + 1}: Debit=${debit}, Credit=${credit}, Balance=${runningBalance}`);
            }
        }

        // Update the actual transactions array with the sorted data
        this.transactions = sortedTransactions;

        // Refresh the grid to show updated balances
        if (this.gridApi) {
            this.gridApi.setRowData(this.transactions);
            this.gridApi.refreshCells({ force: true });
        }

        // Update reconciliation if available
        if (typeof App !== 'undefined' && App.updateReconciliation) {
            App.updateReconciliation();
        }

        console.log('Balance calculation complete. Final balance:', runningBalance);
    },

    // Rainbow row styling
    getRowStyle(params) {
        const rainbowColors = [
            { background: '#FFD1DC' },  // Pink
            { background: '#D1F2FF' },  // Cyan
            { background: '#D1FFD1' },  // Mint
            { background: '#FFFACD' },  // Yellow/Cream
            { background: '#FFDAB9' },  // Peach
            { background: '#E6E6FA' }   // Lavender
        ];
        return rainbowColors[params.node.rowIndex % 6];
    },

    // Color schemes for grid rows
    colorSchemes: {
        rainbow: ['#FFD1DC', '#D1F2FF', '#D1FFD1', '#FFFACD', '#FFDAB9', '#E6E6FA'],  // 6 pastel colors
        classic: ['#FFFFFF', '#F5F5F5'],  // White/light gray
        default: ['transparent', 'transparent'],  // Grid default
        ledger: ['#E8F5E9', '#F1F8E9'],  // Green accounting
        postit: ['#FFF9C4', '#FFEB3B'],  // Yellow sticky notes
        pastel: ['#FFE4E1', '#E6F3FF', '#FFF0F5', '#F0FFF0'],  // Soft pastels
        professional: ['#FFFFFF', '#E3F2FD'],  // Corporate blue/white
        highcontrast: ['#FFFFFF', '#E0E0E0']  // Strong gray
    },

    // Get row style based on selected color scheme
    getRowStyle(params) {
        const scheme = Settings.current.gridColorScheme || 'rainbow';
        const colors = this.colorSchemes[scheme] || this.colorSchemes.rainbow;
        const colorIndex = params.node.rowIndex % colors.length;

        const style = { background: colors[colorIndex] };

        // Apply font customization if set
        if (Settings.current.gridFontFamily) {
            style.fontFamily = Settings.current.gridFontFamily;
        }
        if (Settings.current.gridFontSize) {
            style.fontSize = Settings.current.gridFontSize + 'px';
        }

        return style;
    },

    // Apply grid customization
    applyGridCustomization() {
        if (this.gridApi) {
            this.gridApi.redrawRows();
        }
    },

    // Helper method: Setup opening balance input changes
    setupOpeningBalanceListener() {
        const openingBalanceInput = document.getElementById('expectedOpeningBalance');
        if (openingBalanceInput) {
            openingBalanceInput.addEventListener('input', () => {
                console.log('⚡ Opening balance changed, recalculating...');
                this.recalculateAllBalances();
            });
            console.log('✅ Opening balance listener attached');
        } else {
            console.warn('⚠️ Opening balance input not found');
        }
    },

    // Helper method: Setup window resize listener
    setupResizeListener() {
        let resizeTimer;

        const handleResize = () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(() => {
                if (this.gridApi) {
                    this.gridApi.sizeColumnsToFit();
                }
            }, 250); // Debounce resize events
        };

        window.addEventListener('resize', handleResize);
    }
};

// Vendor Dictionary Grid
window.VendorGrid = {
    gridApi: null,

    initialize(containerId) {
        const container = document.getElementById(containerId);

        const gridOptions = {
            columnDefs: this.getColumnDefs(),
            rowData: [],
            defaultColDef: {
                sortable: true,
                filter: true,
                resizable: true,
                editable: true
            },
            // Pagination settings
            pagination: true,
            paginationPageSize: 1000,
            paginationPageSizeSelector: [100, 500, 1000, 5000],
            paginationAutoPageSize: false,
            suppressPaginationPanel: false, // Show controls

            animateRows: true,
            onCellValueChanged: (event) => {
                const vendor = event.data;
                VendorMatcher.updateVendor(vendor);
            },
            onGridReady: (params) => {
                this.gridApi = params.api;
                this.loadVendors();
            }
        };

        new agGrid.Grid(container, gridOptions);
    },

    getColumnDefs() {
        const accounts = AccountAllocator.getAllAccounts();

        return [
            {
                headerName: 'Description',
                field: 'name',
                width: 300,
                pinned: 'left',
                editable: false,
                sortable: true,
                filter: true
            },
            {
                headerName: 'Account # - Category',
                field: 'defaultAccount',
                width: 350,
                editable: true,
                cellEditor: 'agSelectCellEditor',
                cellEditorParams: {
                    values: accounts.map(a => `${a.code} - ${a.name}`)
                },
                valueFormatter: (params) => {
                    if (!params.value) return '9970 - Unusual item';
                    const account = accounts.find(a => a.code === params.value);
                    if (account) {
                        return `${account.code} - ${account.name}`;
                    }
                    return params.value;
                },
                valueParser: (params) => {
                    // Extract code from "CODE - NAME" format
                    const match = params.newValue.match(/^(\d+)/);
                    return match ? match[1] : params.newValue;
                },
                sortable: true,
                filter: true,
                cellStyle: { background: 'rgba(99, 102, 241, 0.05)' }
            },
            {
                headerName: '# of instances',
                field: 'matchCount',
                width: 130,
                editable: false,
                sortable: true,
                filter: true,
                valueFormatter: (params) => {
                    return params.value || 0;
                }
            },
            {
                headerName: 'Delete',
                width: 100,
                pinned: 'right',
                lockPosition: true,
                suppressMenu: true,
                filter: false,
                resizable: false,
                editable: false,
                cellRenderer: (params) => {
                    const btn = document.createElement('button');
                    btn.className = 'btn-secondary';
                    btn.innerHTML = '🗑️';
                    btn.style.cssText = 'padding: 4px 12px; font-size: 14px; cursor: pointer;';
                    btn.onclick = () => {
                        if (confirm(`Delete vendor "${params.data.name}"?`)) {
                            this.deleteVendor(params.data.id);
                        }
                    };
                    return btn;
                }
            }
        ];
    },


    loadVendors() {
        const vendors = VendorMatcher.getAllVendors();
        if (this.gridApi) {
            this.gridApi.setRowData(vendors);
        }
    },

    onCellValueChanged(event) {
        const vendor = event.data;
        const field = event.colDef.field;

        // Handle account# selection - auto-fill account name
        if (field === 'defaultAccount') {
            const accountCode = event.newValue;
            const account = AccountAllocator.getAllAccounts().find(a =>
                a.code === accountCode
            );

            if (account) {
                vendor.defaultAccount = account.code;
                vendor.defaultAccountName = account.name;
                // Refresh row to show updated account name
                this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
            }
        }

        // Handle account name selection - also update account#
        if (field === 'defaultAccountName') {
            const accountName = event.newValue;
            const account = AccountAllocator.getAllAccounts().find(a =>
                a.fullName === accountName
            );

            if (account) {
                vendor.defaultAccount = account.code;
                vendor.defaultAccountName = account.name;
                // Refresh row to show updated account#
                this.gridApi.refreshCells({ rowNodes: [event.node], force: true });
            }
        }

        // Update vendor
        VendorMatcher.updateVendor(vendor.id, vendor);
    },

    deleteVendor(vendorId) {
        if (confirm('Are you sure you want to delete this vendor?')) {
            VendorMatcher.deleteVendor(vendorId);
            this.loadVendors();
        }
    },

    addVendor(vendorData) {
        VendorMatcher.addVendor(vendorData);
        this.loadVendors();
    }
};

