// Default Chart of Accounts based on user's provided list
const DEFAULT_CHART_OF_ACCOUNTS = [
    { code: "1000", name: "Bank - chequing" },
    { code: "1030", name: "Bank - US account" },
    { code: "1035", name: "Savings account" },
    { code: "1040", name: "Savings account #2" },
    { code: "1100", name: "Investments - Marketable securities" },
    { code: "1210", name: "Accounts receivable" },
    { code: "1220", name: "Accounts receivable-employee loan" },
    { code: "1221", name: "Advances" },
    { code: "1240", name: "Interest receivable" },
    { code: "1245", name: "Loans receivable - current" },
    { code: "1250", name: "NSF cheques" },
    { code: "1255", name: "Allowance for doubtful accounts" },
    { code: "1260", name: "Agreement of sale" },
    { code: "1270", name: "Agreement of sale" },
    { code: "1280", name: "Agreement of sale" },
    { code: "1290", name: "Deposit" },
    { code: "1300", name: "Inventories-merchandise" },
    { code: "1310", name: "Inventories-supplies" },
    { code: "1320", name: "Inventories-other" },
    { code: "1350", name: "Prepaid expenses" },
    { code: "1400", name: "Investments" },
    { code: "1500", name: "Land" },
    { code: "1600", name: "Buildings" },
    { code: "1650", name: "Accum amort - buildings" },
    { code: "1760", name: "Office Furniture and equipment" },
    { code: "1761", name: "Accum amort -  Office Furniture and equipment" },
    { code: "1762", name: "Office furnishings" },
    { code: "1763", name: "Accum amort - office furnishings" },
    { code: "1765", name: "Heavy equipment" },
    { code: "1766", name: "Accum amort - heavy equipment" },
    { code: "1768", name: "Equipment" },
    { code: "1769", name: "Accum amort - equipment" },
    { code: "1800", name: "Vehicles" },
    { code: "1820", name: "Accum amort - vehicles" },
    { code: "1840", name: "Leasehold improvements" },
    { code: "1845", name: "Accum amort - leaseholds" },
    { code: "1855", name: "Computer equipment" },
    { code: "1856", name: "Accum amort - computer equipment" },
    { code: "1857", name: "Computer software" },
    { code: "1858", name: "Accum amort - software" },
    { code: "1860", name: "Capital assets - other" },
    { code: "1865", name: "Accum amort - other" },
    { code: "1900", name: "Deposits" },
    { code: "1945", name: "Loans receivable - long term" },
    { code: "1950", name: "Goodwill" },
    { code: "1951", name: "Accum amort - Goodwill" },
    { code: "1960", name: "Incorporation costs" },
    { code: "1961", name: "Accum amort - Incorporation" },
    { code: "2000", name: "Future income taxes-long-term" },
    { code: "2010", name: "Demand loan" },
    { code: "2020", name: "Demand loan" },
    { code: "2030", name: "Demand loan" },
    { code: "2100", name: "Accounts payable" },
    { code: "2101", name: "RBC MC" },
    { code: "2102", name: "RBC Visa" },
    { code: "2103", name: "Bonus Payable" },
    { code: "2120", name: "Unearned revenue" },
    { code: "2140", name: "Accrued liabilities" },
    { code: "2148", name: "GST balance from prior year" },
    { code: "2149", name: "GST payments to Revenue Canada" },
    { code: "2150", name: "GST paid on purchases" },
    { code: "2155", name: "GST paid on purchases" },
    { code: "2160", name: "GST collected on sales" },
    { code: "2170", name: "GST Installments" },
    { code: "2180", name: "Accrued wages" },
    { code: "2300", name: "Income tax deductions" },
    { code: "2330", name: "CPP deductions" },
    { code: "2340", name: "EI deductions" },
    { code: "2600", name: "Income taxes payable-Federal-current year" },
    { code: "2601", name: "Income taxes payable - Federal - PY" },
    { code: "2602", name: "Income tax installments - Federal - Installments" },
    { code: "2620", name: "Income taxes payable-Prov.-current year" },
    { code: "2621", name: "Income taxes payable - Provincial - PY" },
    { code: "2622", name: "Income taxes payable - Provincial - Installments" },
    { code: "2650", name: "Shareholder loan #1 -personal" },
    { code: "2652", name: "Shareholder loan #2 -withdrawals/transfers" },
    { code: "2654", name: "Shareholder loan #3 - CC payments" },
    { code: "2656", name: "Shareholder loan #4 -short term" },
    { code: "2658", name: "Shareholder loan #5 -short term" },
    { code: "2660", name: "Shareholder loan #6 -short term" },
    { code: "2662", name: "Shareholder loan #7 -short term" },
    { code: "2664", name: "Shareholder loan #8 -short term" },
    { code: "2670", name: "Due from (to) related company #A-short term" },
    { code: "2672", name: "Due from (to) related company #B-short term" },
    { code: "2674", name: "Due from (to) related company #C-short term" },
    { code: "2676", name: "Due from (to) related company #D-short term" },
    { code: "2678", name: "Due from (to) related company #E-short term" },
    { code: "2680", name: "Due from (to) related company #F-short term" },
    { code: "2682", name: "Due from (to) related company #G-short term" },
    { code: "2684", name: "Due from (to) related company #H-short term" },
    { code: "2685", name: "Contingent liabilities" },
    { code: "2690", name: "Current portion of long-term debt" },
    { code: "2700", name: "Future income taxes-current portion" },
    { code: "2710", name: "Bank loan #1" },
    { code: "2712", name: "Bank loan #2" },
    { code: "2714", name: "Bank loan #3" },
    { code: "2716", name: "Bank loan #4" },
    { code: "2718", name: "Bank loan #5" },
    { code: "2720", name: "Bank loan #6" },
    { code: "2722", name: "Bank loan #7" },
    { code: "2724", name: "Bank loan #8" },
    { code: "2800", name: "Mortgage #1" },
    { code: "2810", name: "Mortgage #2" },
    { code: "2820", name: "Mortgage #3" },
    { code: "2850", name: "Finance contract #1" },
    { code: "2860", name: "Finance contract #2" },
    { code: "2870", name: "Finance contract #3" },
    { code: "2880", name: "Finance contract #4" },
    { code: "2950", name: "Shareholder loan #1 - Long term." },
    { code: "2952", name: "Shareholder loan #2 - Long term" },
    { code: "2954", name: "Shareholder loan #3 - Long term" },
    { code: "2956", name: "Shareholder loan #4 - Long term" },
    { code: "2958", name: "Shareholder loan #5 - Long term" },
    { code: "2960", name: "Shareholder loan #6 - Long term" },
    { code: "2962", name: "Shareholder loan #7 - Long term" },
    { code: "2964", name: "Shareholder loan #8 - Long term" },
    { code: "2970", name: "Due from (to) related company #A.-long term" },
    { code: "2972", name: "Due from (to) related company #B.-long term" },
    { code: "2974", name: "Due from (to) related company #C-long term" },
    { code: "2976", name: "Due from (to) related company #D-long term" },
    { code: "2978", name: "Due from (to) related company #E-long term" },
    { code: "2980", name: "Due from (to) related company #F-long term" },
    { code: "2982", name: "Due from (to) related company #G-long term" },
    { code: "2984", name: "Due from (to) related company #H-long term" },
    { code: "2995", name: "Current portion of long term debt (OFFSET)" },
    { code: "3000", name: "Share capital - common" },
    { code: "3100", name: "Share capital - preferred" },
    { code: "3200", name: "Contributed surplus" },
    { code: "3640", name: "Dividends paid-taxable" },
    { code: "3650", name: "Dividends paid-capital" },
    { code: "3999", name: "Retained earnings" },
    { code: "4001", name: "Sales" },
    { code: "4002", name: "Consulting fees" },
    { code: "4003", name: "Contracting fees" },
    { code: "4004", name: "Management fees" },
    { code: "4010", name: "GST Government assistance" },
    { code: "4700", name: "Commissions" },
    { code: "4840", name: "Expenses recovered" },
    { code: "4860", name: "Interest income" },
    { code: "4880", name: "Intercompany dividends" },
    { code: "4900", name: "Rental revenue" },
    { code: "4950", name: "Loss (gain) on sale of assets" },
    { code: "4970", name: "Other gains" },
    { code: "4971", name: "Portfolio investment dividends" },
    { code: "4972", name: "Portfolio capital gains dividends" },
    { code: "4973", name: "Gain (loss) on sale of investments" },
    { code: "5305", name: "Consultants" },
    { code: "5310", name: "Equipment rental" },
    { code: "5320", name: "Equipment repairs" },
    { code: "5330", name: "Fuel and oil" },
    { code: "5335", name: "Materials and supplies" },
    { code: "5340", name: "Insurance" },
    { code: "5345", name: "Opening inventory" },
    { code: "5350", name: "Purchases" },
    { code: "5351", name: "Direct cost #1" },
    { code: "5352", name: "Direct cost #2" },
    { code: "5353", name: "Direct cost #3" },
    { code: "5355", name: "Closing inventory" },
    { code: "5360", name: "Subcontractors" },
    { code: "5377", name: "Direct wages" },
    { code: "5380", name: "Vehicle" },
    { code: "5700", name: "Freight" },
    { code: "5750", name: "Waste/Recycling" },
    { code: "6000", name: "Advertising" },
    { code: "6100", name: "Amortization on tangible assets" },
    { code: "6300", name: "Bad debts" },
    { code: "6301", name: "Collection agency" },
    { code: "6400", name: "Building repairs" },
    { code: "6410", name: "Business taxes" },
    { code: "6415", name: "Client meals and entertainment" },
    { code: "6420", name: "Conferences" },
    { code: "6450", name: "Consulting fees" },
    { code: "6500", name: "Contract wages" },
    { code: "6550", name: "Courier" },
    { code: "6600", name: "Credit card charges" },
    { code: "6750", name: "Donations" },
    { code: "6800", name: "Dues, memberships and subscriptions" },
    { code: "6900", name: "Employee benefits" },
    { code: "7000", name: "Equipment rentals" },
    { code: "7100", name: "Equipment repairs" },
    { code: "7400", name: "Fuel and oil" },
    { code: "7600", name: "Insurance" },
    { code: "7700", name: "Interest and bank charges" },
    { code: "7750", name: "Interest on income taxes" },
    { code: "7751", name: "CRA penalties and interest" },
    { code: "7752", name: "Loss (gain) on foreign exchange" },
    { code: "7800", name: "Interest on long-term debt" },
    { code: "7890", name: "Legal fees" },
    { code: "8400", name: "Management remuneration" },
    { code: "8450", name: "Materials and supplies" },
    { code: "8500", name: "Miscellaneous" },
    { code: "8600", name: "Office supplies and postage" },
    { code: "8601", name: "" },
    { code: "8700", name: "Professional fees" },
    { code: "8710", name: "Property taxes" },
    { code: "8720", name: "Rent" },
    { code: "8730", name: "Condo fees" },
    { code: "8800", name: "Repairs and maintenance" },
    { code: "8850", name: "Security" },
    { code: "8900", name: "Shop supplies" },
    { code: "8950", name: "Subcontracting" },
    { code: "9100", name: "Telephone" },
    { code: "9200", name: "Travel and accomodations" },
    { code: "9250", name: "Training - Courses" },
    { code: "9500", name: "Utilities" },
    { code: "9550", name: "Uniforms" },
    { code: "9700", name: "Vehicle" },
    { code: "9750", name: "Workers compensation" },
    { code: "9800", name: "Wages and benefits" },
    { code: "9950", name: "Income taxes - current" },
    { code: "9955", name: "Income taxes - recovery" },
    { code: "9960", name: "Income taxes - future" },
    { code: "9970", name: "Unusual item" },
];

// 📊 Chart Manager UI
window.ChartManager = {
    modal: null,
    listContainer: null,
    searchOutput: null,
    resizeObserver: null, // ⚡ NEW: For resize persistence
    saveTimer: null,

    initialize() {
        if (document.getElementById('chartOfAccountsModal')) {
            this.modal = document.getElementById('chartOfAccountsModal');
            this.listContainer = document.getElementById('accountsList');
            this.searchInput = document.getElementById('accountSearch');
            // Re-bind listeners just in case
            this.attachListeners();
            return;
        }

        // Create Modal Structure (Standardized WOW Layout)
        const modalHtml = `
            <div id="chartOfAccountsModal" class="modal large-modal" style="z-index: 1000000004;">
                <div class="modal-content" style="width: 900px; max-width: 95vw; height: 80vh; display: flex; flex-direction: column; resize: both; overflow: hidden;">
                    
                    <!-- HEADER -->
                    <div class="modal-header">
                        <div class="header-title-group">
                            <h2>Chart of Accounts</h2>
                            <span class="header-subtitle">Manage your financial categories</span>
                        </div>
                        <span class="modal-close">&times;</span>
                    </div>

                    <!-- Toolbar (The WOW Standard) -->
                    <div class="modal-toolbar"
                        style="flex-shrink: 0; padding: 1rem 1.5rem; background: var(--bg-secondary); border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 0;">

                        <!-- LEFT: Search -->
                        <div class="search-wrapper" style="position: relative; flex: 1; max-width: 400px;">
                            <span
                                style="position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">🔍</span>
                            <input type="text" id="coaSearchInput" placeholder="Search accounts..."
                                style="width: 100%; padding: 0.6rem 1rem 0.6rem 2.5rem; border: 1px solid var(--border-color); border-radius: 8px; font-size: 0.95rem; transition: all 0.2s ease; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                        </div>

                        <!-- RIGHT: Actions -->
                        <div class="account-actions" style="display: flex; gap: 0.75rem; align-items: center;">
                            <button id="addAccountBtn" class="btn-primary"
                                style="display: flex; align-items: center; gap: 6px; padding: 0.6rem 1.2rem; font-weight: 500; box-shadow: 0 4px 6px -1px rgba(99, 102, 241, 0.2);">
                                <i class="fas fa-plus"></i>
                                <span>Add Account</span>
                            </button>
                        </div>
                    </div>

                    <!-- BODY (Grid) -->
                    <div class="modal-body" id="coaGridWrapper">
                        <div id="coaGrid" class="ag-theme-alpine" style="width: 100%; height: 100%;"></div>
                    </div>

                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.modal = document.getElementById('chartOfAccountsModal');
        this.listContainer = document.getElementById('coaGrid');
        this.searchInput = document.getElementById('coaSearchInput');

        this.attachListeners();
    },

    attachListeners() {
        const closeBtn = this.modal.querySelector('.modal-close');
        const addBtn = document.getElementById('addAccountBtn');
        const refreshBtn = document.getElementById('refreshAccountsBtn');

        // Close logic
        if (closeBtn) {
            closeBtn.onclick = () => this.close();
        }

        // Modal Overlay Close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });

        // Add Account logic
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                // Ensure AccountUI exists or show simple prompt for now
                if (window.AccountUI && AccountUI.openAccountForm) {
                    AccountUI.openAccountForm();
                } else {
                    alert('Account Form logic pending implementation in AccountUI.');
                }
            });
        }

        // Search logic
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                if (this.gridApi) {
                    this.gridApi.setGridOption('quickFilterText', e.target.value);
                }
            });
        }

        // Refresh logic
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.renderList());
        }
    },

    showModal() {
        if (!this.modal) this.initialize();

        // PERSIST STATE: Remember this modal is open
        localStorage.setItem('activeModal', 'chartOfAccounts');

        // Re-fetch references in case DOM was nuked/replaced
        this.modal = document.getElementById('chartOfAccountsModal');
        this.listContainer = document.getElementById('coaGrid');
        this.searchInput = document.getElementById('coaSearchInput');
        if (!this.modal) return;

        // Reset Search
        if (this.searchInput) this.searchInput.value = '';

        // Show Modal
        this.modal.classList.add('active');

        // ⚡ NEW: Restore saved size or use defaults
        const modalContent = this.modal.querySelector('.modal-content');
        if (modalContent) {
            const savedSize = (window.Settings && Settings.current && Settings.current.modalSize_COA);
            if (savedSize && savedSize.width) {
                console.log('💾 Restoring Chart of Accounts size:', savedSize);
                modalContent.style.width = savedSize.width;
                modalContent.style.height = savedSize.height || '70vh';
            } else {
                // Default height only - width will be auto-sized after grid loads
                modalContent.style.height = '70vh';
                // Width will be set by fitModalToGrid() after autoSizeAllColumns()
            }

            // Setup resize listener
            this.setupResizeListener();
        }

        // Wait for modal transition, then render grid
        setTimeout(() => {
            if (this.listContainer) {
                console.log(`✅ Creating CoA grid...`);
                this.renderList();
            } else {
                console.error("❌ ChartManager: coaGrid container not found!");
            }
        }, 500);
    },

    close() {
        if (this.modal) {
            // PERSIST STATE: Forget this modal
            localStorage.removeItem('activeModal');

            // ⚡ NEW: Cleanup resize observer
            this.cleanup();

            this.modal.classList.remove('active');
            setTimeout(() => {
                this.modal.style.display = 'none';
            }, 300);
        }
    },

    // ⚡ NEW: Setup resize listener to save dimensions
    setupResizeListener() {
        const modalContent = this.modal.querySelector('.modal-content');
        if (!modalContent) return;

        // Cleanup old observer if exists
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }

        this.resizeObserver = new ResizeObserver(entries => {
            for (const entry of entries) {
                clearTimeout(this.saveTimer);
                this.saveTimer = setTimeout(() => {
                    const w = entry.target.style.width;
                    const h = entry.target.style.height;
                    if (w && h && parseInt(w) > 300) {
                        if (!window.Settings) return;
                        if (!Settings.current) Settings.current = {};

                        Settings.current.modalSize_COA = { width: w, height: h };
                        if (Settings.save) {
                            Settings.save();
                            console.log('✅ Saved Chart of Accounts size:', w, h);
                        }
                    }
                }, 500);
            }
        });

        this.resizeObserver.observe(modalContent);
    },

    // ⚡ NEW: Cleanup method
    cleanup() {
        if (this.resizeObserver) {
            this.resizeObserver.disconnect();
            this.resizeObserver = null;
        }
        if (this.saveTimer) {
            clearTimeout(this.saveTimer);
            this.saveTimer = null;
        }
    },

    // ⚡ NEW: Auto-size columns to fit content (no wrapping)
    autoSizeAllColumns() {
        if (!this.gridApi) return;

        // Get all column IDs
        const allColumnIds = [];
        this.gridApi.getColumns().forEach(column => {
            allColumnIds.push(column.getColId());
        });

        // Auto-size all columns based on content
        this.gridApi.autoSizeColumns(allColumnIds, false);

        // Fit modal to grid width
        setTimeout(() => this.fitModalToGrid(), 100);
    },

    // ⚡ NEW: Fit modal width to grid content
    fitModalToGrid() {
        if (!this.gridApi || !this.modal) return;

        const modalContent = this.modal.querySelector('.modal-content');
        if (!modalContent) return;

        // Calculate total grid width
        let totalWidth = 0;
        this.gridApi.getColumns().forEach(col => {
            totalWidth += col.getActualWidth();
        });

        // Add padding/scrollbar space (80px)
        const optimalWidth = totalWidth + 80;

        // Apply min/max constraints
        const finalWidth = Math.max(600, Math.min(optimalWidth, window.innerWidth * 0.95));

        modalContent.style.width = `${finalWidth}px`;
        console.log(`📐 Auto-sized Chart of Accounts modal: ${finalWidth}px (grid: ${totalWidth}px)`);
    },

    renderList() {
        if (!this.listContainer) return;

        // Clear previous content
        this.listContainer.innerHTML = '';

        // 1. Theme Logic (Dynamic from Settings)
        const scheme = (window.Settings && Settings.current && Settings.current.gridColorScheme) || 'classic';
        const schemes = (window.TransactionGrid && TransactionGrid.colorSchemes) || {
            rainbow: ['#FFD1DC', '#D1F2FF', '#D1FFD1', '#FFFACD', '#FFDAB9', '#E6E6FA'],
            classic: ['#FFFFFF', '#F5F5F5']
        };
        const activeColors = schemes[scheme] || schemes.classic;

        // 2. Data Source
        let sourceAccounts = [];
        if (window.AccountAllocator && AccountAllocator.getAllAccounts) {
            sourceAccounts = AccountAllocator.getAllAccounts();
        }

        // Fallback to DEFAULT if empty (Critical for viewing grid when no data exists yet)
        if (!sourceAccounts || sourceAccounts.length === 0) {
            console.warn("⚠️ ChartManager: No accounts found in Allocator, using DEFAULTS.");
            sourceAccounts = (typeof DEFAULT_CHART_OF_ACCOUNTS !== 'undefined') ? DEFAULT_CHART_OF_ACCOUNTS : [];
        }

        console.log(`📊 Rendering CoA with ${sourceAccounts.length} accounts.`);

        // Clear container
        this.listContainer.innerHTML = '';

        // Container already has width/height from CSS, just ensure theme class
        this.listContainer.className = 'ag-theme-alpine';

        const gridOptions = {
            rowData: sourceAccounts,
            columnDefs: [
                {
                    headerName: 'Account#',
                    field: 'code',
                    sortable: true,
                    filter: true,
                    width: 135,
                    suppressSizeToFit: true,
                    cellStyle: { fontWeight: '600', color: '#1e293b' }
                },
                {
                    headerName: 'Account Name',
                    field: 'name',
                    sortable: true,
                    filter: true,
                    flex: 1,
                    minWidth: 200,
                    cellStyle: { fontWeight: '400' }
                },
                {
                    headerName: '',
                    width: 60,
                    maxWidth: 60,
                    pinned: 'right', // 🔒 Pinned to match Vendor Dictionary
                    lockPosition: true,
                    suppressSizeToFit: true,
                    cellRenderer: (params) => {
                        const btn = document.createElement('button');
                        btn.innerHTML = '<i class="fas fa-trash" style="font-size: 0.85rem;"></i>';
                        btn.title = "Delete Account";
                        btn.style.cssText = 'padding: 6px 8px; border: none; background: transparent; cursor: pointer; color: #64748b; border-radius: 4px; transition: all 0.2s;';

                        btn.onmouseover = () => {
                            btn.style.background = '#fee2e2';
                            btn.style.color = '#dc2626';
                        };
                        btn.onmouseout = () => {
                            btn.style.background = 'transparent';
                            btn.style.color = '#64748b';
                        };

                        btn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            const accountName = params.data.name;
                            const accountCode = params.data.code;

                            if (confirm(`Are you sure you want to delete "${accountName}" (${accountCode})?`)) {
                                if (window.AccountAllocator && AccountAllocator.deleteAccount) {
                                    const success = await AccountAllocator.deleteAccount(accountCode);
                                    if (success) {
                                        params.api.applyTransaction({ remove: [params.data] });
                                        console.log(`Deleted account: ${accountCode}`);
                                    }
                                } else {
                                    alert('Account deletion logic not found (AccountAllocator).');
                                }
                            }
                        });
                        return btn;
                    },
                    cellStyle: { textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center' }
                }
            ],
            defaultColDef: {
                resizable: true,
                sortable: true
            },
            animateRows: true,

            onGridReady: (params) => {
                this.gridApi = params.api;
                // Auto-size columns to content (eliminates text wrapping)
                this.autoSizeAllColumns();
            },



            // Native AG Grid event: actively refits columns when container resizes
            // Native AG Grid event: actively refits columns when container resizes
            onGridSizeChanged: (params) => {
                // If we are resizing based on column drag, don't auto-fit back!
                if (this.blockAutofit) return;

                params.api.sizeColumnsToFit();
            },

            // Bi-directional resize: when columns are resized, resize modal
            onColumnResized: (params) => {
                // React to user dragging OR double-clicking (autosize)
                if (!params.finished || (params.source !== 'uiColumnDragged' && params.source !== 'autosizeColumns')) return;

                const modalContent = this.modal?.querySelector('.modal-content');
                if (!modalContent || !this.gridApi) return;

                this.blockAutofit = true;

                // Calculate total width needed for all columns
                const columnState = this.gridApi.getColumnState();
                const totalWidth = columnState.reduce((sum, col) => sum + (col.width || 0), 0);

                // Enforce a healthy minimum width (800px) so it doesn't look anorexic
                const newWidth = Math.max(totalWidth + 50, 800);

                // Cap at window width
                const finalWidth = Math.min(newWidth, window.innerWidth * 0.95);

                // Configure modal to match
                modalContent.style.width = `${finalWidth}px`;

                setTimeout(() => { this.blockAutofit = false; }, 200);
            },

            // UI MATCH: Dynamic Theme
            getRowStyle: (params) => {
                const index = params.node.rowIndex % activeColors.length;
                return { background: activeColors[index] };
            }
        };

        // Create grid and save API reference (CRITICAL: must save return value!)
        this.gridApi = agGrid.createGrid(this.listContainer, gridOptions);
    },

    filterList(text) {
        if (this.gridApi) {
            this.gridApi.setGridOption('quickFilterText', text);
        }
    }
};
