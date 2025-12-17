/**
 * Grid Pop-out Manager
 * Handles detaching the transaction grid into a separate window and keeping it synced.
 */
class GridPopoutManager {
    constructor() {
        this.popoutWindow = null;
        this.isPoppedOut = false;
        this.mainGridDiv = null;
        this.placeholderDiv = null;
    }

    /**
     * Open the grid in a new detached window
     */
    openPopout() {
        if (this.isPoppedOut && !this.popoutWindow.closed) {
            this.popoutWindow.focus();
            return;
        }

        // 1. Capture current state
        const currentData = this.getCurrentData();
        const columnState = this.getCurrentColumnState();
        const filterModel = this.getCurrentFilterModel();

        // 2. Prepare screen position
        const width = 1600;
        const height = 900;
        const left = (window.screen.width - width) / 2;
        const top = (window.screen.height - height) / 2;

        // 3. Open window
        this.popoutWindow = window.open(
            '',
            'RoboLedgersGrid',
            `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
        );

        if (!this.popoutWindow) {
            alert('Pop-up blocked! Please allow pop-ups for this site.');
            return;
        }

        // 4. Setup content and sync
        this.isPoppedOut = true;
        this.setupPopoutWindow(currentData, columnState, filterModel);

        // 5. Hide main grid and show placeholder
        this.toggleMainGrid(false);
    }

    /**
     * Toggle visibility of main grid vs placeholder
     */
    toggleMainGrid(showGrid) {
        this.mainGridDiv = document.getElementById('transactionGrid');

        if (!this.placeholderDiv) {
            this.createPlaceholder();
        }

        if (showGrid) {
            if (this.mainGridDiv) this.mainGridDiv.style.display = 'block';
            if (this.placeholderDiv) this.placeholderDiv.style.display = 'none';
        } else {
            if (this.mainGridDiv) this.mainGridDiv.style.display = 'none';
            if (this.placeholderDiv) this.placeholderDiv.style.display = 'flex';
        }
    }

    /**
     * Create the "Popped Out" placeholder element
     */
    createPlaceholder() {
        this.placeholderDiv = document.createElement('div');
        this.placeholderDiv.id = 'gridPlaceholder';
        this.placeholderDiv.style.cssText = `
            display: none;
            flex: 1;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            background: #1e1e1e;
            color: #808080;
            border: 2px dashed #333;
            border-radius: 8px;
            margin: 20px;
            min-height: 400px;
        `;

        this.placeholderDiv.innerHTML = `
            <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5;">↗️</div>
            <h2 style="margin: 0 0 10px 0; color: #e0e0e0;">Grid is Popped Out</h2>
            <p style="margin-bottom: 20px;">The transaction grid is currently open in a separate window.</p>
            <button onclick="window.GridPopout.closePopout()" class="btn-primary" style="padding: 10px 20px; font-size: 1rem; cursor: pointer; background: #4caf50; color: white; border: none; border-radius: 4px;">
                Pop In (Restore Grid)
            </button>
        `;

        if (this.mainGridDiv && this.mainGridDiv.parentNode) {
            this.mainGridDiv.parentNode.insertBefore(this.placeholderDiv, this.mainGridDiv);
        }
    }

    /**
     * Setup the new window content matching 1:1
     */
    setupPopoutWindow(rowData, columnState, filterModel) {
        const doc = this.popoutWindow.document;

        // --- 1. Copy Styles ---
        // --- 1. Copy Styles (Convert to Absolute URLs) ---
        const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
            .map(el => {
                if (el.tagName === 'LINK') {
                    // Create a new link element string with absolute href
                    return `<link rel="stylesheet" href="${el.href}">`;
                }
                return el.outerHTML;
            })
            .join('\n');

        // --- 2. Build HTML ---
        doc.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <title>Transaction Grid - RoboLedgers</title>
                ${styles}
                <style>
                    body { 
                        margin: 0; padding: 0; height: 100vh; display: flex; 
                        flex-direction: column; background-color: var(--bg-primary); 
                        color: var(--text-primary); overflow: hidden;
                    }
                    /* Force dark text for rainbow rows */
                    .ag-row { color: #1f2937 !important; font-weight: 500; transition: background-color 0.2s; }
                    #grid-container { flex: 1; width: 100%; }
                    
                    /* Bulk Actions Bar Styles (Ensured) */
                    .bulk-actions-bar {
                        background: var(--panel-bg); border-bottom: 1px solid var(--border-color);
                        padding: 0.75rem 1.5rem; animation: slideDown 0.3s ease;
                    }
                    /* Fix Dropdown Visibility */
                    select option {
                        background-color: #1f2937; /* Dark background */
                        color: #ffffff;            /* White text */
                    }
                </style>
            </head>
            <body class="${document.body.className}">
                <!-- Header -->
                 <div style="padding: 10px 20px; background: var(--panel-bg); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
                    <h2 style="margin: 0; font-size: 1.2rem;">Transaction Review <span style="font-size: 0.8em; opacity: 0.7;">(Pop-Out)</span></h2>
                    <button onclick="window.close()" class="btn-primary">Pop In</button>
                </div>

                <!-- Bulk Actions Bar -->
                <div id="bulkActionsBar" class="bulk-actions-bar" style="display: none;">
                    <div class="bulk-actions-content" style="display: flex; justify-content: space-between; align-items: center;">
                        <span class="selection-count">
                            <strong id="selectedCount">0</strong> transactions selected
                        </span>
                        <div class="bulk-actions-controls" style="display: flex; gap: 0.5rem;">
                            <select id="bulkAccountSelect" class="bulk-account-dropdown" style="padding: 0.4rem; border-radius: 4px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-primary); min-width: 200px;">
                                <option value="">Assign Account...</option>
                            </select>
                            <button id="applyBulkAccount" class="bulk-action-btn primary" style="background: var(--primary-color); color: white; border: none; padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">
                                Apply to Selected
                            </button>
                            <button id="clearSelection" class="bulk-action-btn secondary" style="background: transparent; color: var(--text-secondary); border: 1px solid var(--border-color); padding: 0.4rem 0.8rem; border-radius: 4px; cursor: pointer;">
                                Clear Selection
                            </button>
                        </div>
                    </div>
                </div>

                <div id="grid-container" class="grid-container-full"></div>
                
                <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.1/dist/ag-grid-community.min.js"></script>
                
                <script>
                    window.onload = function() {
                        const gridDiv = document.getElementById('grid-container');
                        const parentWin = window.opener;
                        
                        // Populate Bulk Dropdown
                        const accountSelect = document.getElementById('bulkAccountSelect');
                         if (parentWin && parentWin.AccountAllocator) {
                            const accounts = parentWin.AccountAllocator.getAllAccounts();
                            accounts.forEach(acc => {
                                const option = document.createElement('option');
                                option.value = acc.code;
                                option.textContent = acc.code + ' - ' + acc.name;
                                accountSelect.appendChild(option);
                            });
                        }

                        // Bulk Actions Logic
                        document.getElementById('clearSelection').onclick = () => window.gridApi.deselectAll();
                        
                        document.getElementById('applyBulkAccount').onclick = () => {
                            const selectedNodes = window.gridApi.getSelectedNodes();
                            const accountCode = accountSelect.value;
                            if (!accountCode || selectedNodes.length === 0) return;

                            const accountName = accountSelect.options[accountSelect.selectedIndex].text.split(' - ')[1];
                            const updates = [];

                            selectedNodes.forEach(node => {
                                const data = node.data;
                                data.allocatedAccount = accountCode;
                                data.allocatedAccountName = accountName;
                                data.account = accountCode;
                                data.status = 'verified'; // Mark manually changed
                                updates.push(data);
                                
                                // Sync back to parent
                                if(parentWin && parentWin.GridPopout) {
                                    parentWin.GridPopout.syncFromPopout(data);
                                }
                            });
                            
                            window.gridApi.applyTransaction({ update: updates });
                            window.gridApi.deselectAll();
                        };

                        if (!parentWin || !parentWin.TransactionGrid) {
                            document.body.innerHTML = '<div style="padding:20px;">Error: Lost connection.</div>';
                            return;
                        }

                        const parentGrid = parentWin.TransactionGrid;
                        const parentGridEl = parentWin.document.getElementById('transactionGrid');
                        if (parentGridEl) gridDiv.className += ' ' + parentGridEl.className;
                        else gridDiv.className += ' ag-theme-alpine';

                        // gridOptions
                        const gridOptions = {
                            rowData: ${JSON.stringify(rowData)},
                            columnDefs: parentGrid.getColumnDefs(),
                            getRowId: (params) => params.data.id,
                            defaultColDef: parentGrid.gridApi ? parentGrid.gridApi.getGridOption('defaultColDef') : {},
                            getRowStyle: (params) => parentGrid.getRowStyle(params),
                            animateRows: true,
                            enableCellChangeFlash: true,

                            rowSelection: 'multiple',
                            suppressRowClickSelection: true,

                            // Sync Changes
                            onCellValueChanged: (params) => {
                                if(parentWin && parentWin.GridPopout) {
                                    parentWin.GridPopout.syncFromPopout(params.data);
                                }
                            },
                            
                            // Show/Hide Bulk Bar
                            onSelectionChanged: () => {
                                const selectedCount = window.gridApi.getSelectedRows().length;
                                const bar = document.getElementById('bulkActionsBar');
                                const countSpan = document.getElementById('selectedCount');
                                
                                if (selectedCount > 0) {
                                    bar.style.display = 'block';
                                    countSpan.textContent = selectedCount;
                                } else {
                                    bar.style.display = 'none';
                                }
                            }
                        };

                        // onGridReady: Size columns initially
                        gridOptions.onGridReady = (params) => {
                             window.gridApi = params.api;
                             setTimeout(() => params.api.sizeColumnsToFit(), 100);
                        };

                        window.gridApi = agGrid.createGrid(gridDiv, gridOptions);

                        // Restore State
                        if(${JSON.stringify(columnState)}) window.gridApi.applyColumnState({ state: ${JSON.stringify(columnState)}, applyOrder: true });
                        if(${JSON.stringify(filterModel)}) window.gridApi.setFilterModel(${JSON.stringify(filterModel)});

                        // Responsive Resize Listener
                        window.onresize = () => {
                            if(window.gridApi) {
                                window.gridApi.sizeColumnsToFit();
                            }
                        };

                        window.onbeforeunload = function() {
                            if (parentWin && parentWin.GridPopout) {
                                parentWin.GridPopout.handlePopoutClosed({
                                    columnState: window.gridApi.getColumnState(),
                                    filterModel: window.gridApi.getFilterModel(),
                                });
                            }
                        };
                    
                    // Expose stream handler for updates
                    window.handleStreamEvent = function(event) {
                         if(!window.gridApi) return;
                         if (event.type === 'UPDATE') {
                             window.gridApi.applyTransaction({ update: event.payload.transactions });
                             // Flash cells (GridStream logic handles this in main, here we rely on grid options or manual flash)
                             const params = {
                                rowNodes: event.payload.transactions.map(t => window.gridApi.getRowNode(t.id)).filter(Boolean),
                                flashDelay: 500,
                                fadeDelay: 1000
                             };
                             window.gridApi.flashCells(params);
                         }
                    };
                    };
                    
                    window.syncData = function(data) {
                         if(!window.gridApi) return;
                         window.gridApi.setGridOption('rowData', data);
                    };

                    // STREAM HANDLER (called by parent GridStream)
                    window.handleStreamEvent = function(event) {
                        if (!window.gridApi) return;

                        if (event.type === 'UPDATE') {
                            const transactions = event.payload.transactions;
                            
                            // 1. Update Popout Grid
                            window.gridApi.applyTransaction({ update: transactions });
                            
                            // 2. Flash Cells
                            window.gridApi.flashCells({
                                rowNodes: transactions.map(t => window.gridApi.getRowNode(t.id)),
                                flashDelay: 500,
                                fadeDelay: 500
                            });
                        }
                    };
                </script>
            </body>
            </html>
        `);
        doc.close();
    }

    /**
     * Close the popout manually (Pop In)
     */
    closePopout() {
        if (this.popoutWindow && !this.popoutWindow.closed) {
            this.popoutWindow.close(); // This will trigger onbeforeunload in child
        } else {
            // If already closed but state didn't update (edge case)
            this.handlePopoutClosed();
        }
    }

    /**
     * Handle the popout closing (Pop In Logic)
     */
    handlePopoutClosed(finalState) {
        console.log('📥 Popping grid back in...');
        this.isPoppedOut = false;
        this.popoutWindow = null;

        // Restore Main Grid
        this.toggleMainGrid(true);

        // Apply state from popout if available
        if (finalState && TransactionGrid.gridApi) {
            if (finalState.columnState) {
                TransactionGrid.gridApi.applyColumnState({ state: finalState.columnState, applyOrder: true });
            }
            if (finalState.filterModel) {
                TransactionGrid.gridApi.setFilterModel(finalState.filterModel);
            }
        }

        // Refresh grid to show any changes
        if (TransactionGrid.gridApi) {
            TransactionGrid.gridApi.refreshCells({ force: true });
        }
    }

    /**
     * Sync single row update from Popout -> Parent
     */
    syncFromPopout(updatedTransaction) {
        if (TransactionGrid) {
            TransactionGrid.updateTransaction(updatedTransaction.id, updatedTransaction);
        }
    }

    // --- Helpers ---

    getCurrentData() {
        return TransactionGrid && TransactionGrid.getTransactions ? TransactionGrid.getTransactions() : [];
    }

    getCurrentColumnState() {
        return TransactionGrid && TransactionGrid.gridApi ? TransactionGrid.gridApi.getColumnState() : null;
    }

    getCurrentFilterModel() {
        return TransactionGrid && TransactionGrid.gridApi ? TransactionGrid.gridApi.getFilterModel() : null;
    }
}

// Global Instance
window.GridPopout = new GridPopoutManager();
