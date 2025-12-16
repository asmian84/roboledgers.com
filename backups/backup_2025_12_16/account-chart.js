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

    initialize() {
        this.modal = document.getElementById('chartOfAccountsModal');
        this.listContainer = document.getElementById('chartList');
        this.searchInput = document.getElementById('chartSearch');
        const refreshBtn = document.getElementById('refreshChartBtn');

        if (!this.modal) return;

        // Close button logic
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Close on click outside - DELAYED to prevent immediate trigger
        setTimeout(() => {
            window.addEventListener('click', (e) => {
                // Only close if active and target is the backdrop
                if (this.modal.classList.contains('active') && e.target === this.modal) {
                    this.close();
                }
            });
        }, 500);

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
        if (this.modal) {
            // Standard Modal Activation
            this.modal.classList.add('active');
            this.modal.style.display = 'flex'; // Explicit flex for centering
            this.modal.style.zIndex = '1000000000 !important';

            requestAnimationFrame(() => {
                this.renderList();
            });
        }
    },

    close() {
        if (this.modal) {
            this.modal.classList.remove('active');
            setTimeout(() => {
                this.modal.style.display = 'none';
            }, 300);
        }
    },

    renderList() {
        if (!this.listContainer) return;

        // Clear previous content
        this.listContainer.innerHTML = '';

        // Setup Grid Container - Match Vendor Grid Height/Width
        this.listContainer.style.height = '60vh';
        this.listContainer.style.width = '100%';
        // UI MATCH: Use Light Theme to match Vendor Dictionary
        this.listContainer.className = 'ag-theme-alpine';

        const sourceAccounts = (window.AccountAllocator && AccountAllocator.getAllAccounts)
            ? AccountAllocator.getAllAccounts()
            : DEFAULT_CHART_OF_ACCOUNTS;

        const gridOptions = {
            rowData: sourceAccounts,
            columnDefs: [
                {
                    // "Ghost Column" for alignment (Matches VIG)
                    width: 50,
                    minWidth: 50,
                    maxWidth: 50,
                    pinned: 'left',
                    lockPosition: true,
                    suppressMenu: true,
                    headerName: '',
                    cellRenderer: (params) => {
                        // Mock Cloud Icon (Always synced for now)
                        return `<div style="display:flex; justify-content:center; align-items:center; height:100%;">
                            <i class="fas fa-cloud" style="color: #3b82f6; font-size: 0.8rem;" title="Synced to Cloud"></i>
                        </div>`;
                    },
                    cellStyle: { background: '#ffffff', borderRight: '1px solid #e2e8f0', padding: 0 }
                },
                {
                    headerName: 'Code',
                    field: 'code',
                    sortable: true,
                    filter: true,
                    width: 100,
                    pinned: 'left',
                    cellStyle: { fontWeight: 'bold' }
                },
                { headerName: 'Account Name', field: 'name', sortable: true, filter: true, flex: 1 },
                {
                    headerName: 'Action',
                    width: 90,
                    cellRenderer: (params) => {
                        const btn = document.createElement('button');
                        btn.className = 'btn-secondary'; // Minimal styling
                        btn.innerHTML = '🗑️'; // Trash icon
                        btn.title = "Delete Account";
                        btn.style.cssText = 'padding: 2px 8px; font-size: 1rem; border: none; background: transparent; cursor: pointer;';

                        btn.onmouseover = () => btn.style.transform = 'scale(1.1)';
                        btn.onmouseout = () => btn.style.transform = 'scale(1)';

                        btn.addEventListener('click', async (e) => {
                            e.stopPropagation(); // Prevent row selection
                            const accountName = params.data.name;
                            const accountCode = params.data.code;

                            if (confirm(`Are you sure you want to delete "${accountName}" (${accountCode})?`)) {
                                if (window.AccountAllocator && AccountAllocator.deleteAccount) {
                                    const success = await AccountAllocator.deleteAccount(accountCode);
                                    if (success) {
                                        // Update AG Grid locally to reflect change instantly
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
            // Snug Sizing (1:1 with Vendor Dictionary)
            rowHeight: 32,
            headerHeight: 32,

            onGridReady: (params) => {
                this.gridApi = params.api;
                // Double check sizing 
                setTimeout(() => params.api.sizeColumnsToFit(), 50);
            },

            // UI MATCH: Classic Clean White (Consistent Theme)
            getRowStyle: (params) => {
                if (params.node.rowIndex % 2 === 1) {
                    return { background: '#F5F5F5' }; // Light grey for alternate rows
                }
                return { background: '#FFFFFF' }; // White for primary rows
            }
        };

        // Initialize AG Grid
        agGrid.createGrid(this.listContainer, gridOptions);
    },

    filterList(text) {
        if (this.gridApi) {
            this.gridApi.setGridOption('quickFilterText', text);
        }
    }
};
