/**
 * Analytics Dashboard (Tier 2/3 Feature)
 * Provides visual breakdown of spending with drill-down capabilities.
 */
window.renderAnalyticsPage = async function (container) {
    if (!container) return;

    // Clear Container
    container.innerHTML = `
        <div class="ai-brain-page" style="width: 100%; height: 100vh; display: flex; flex-direction: column; overflow: hidden;">

            <!-- FIXED HEADER -->
            <div class="fixed-top-section" style="background: white; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
                 <div class="header-brand" style="display: flex; align-items: center; gap: 12px;">
                    <div class="icon-box" style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📊</div>
                    <div>
                        <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Financial Intelligence</h2>
                        <span style="font-size: 0.8rem; color: #64748b;">Real-time spending analysis</span>
                    </div>
                 </div>
                 <div>
                    <button class="btn btn-secondary" style="background: white; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; color: #475569;" onclick="window.renderAnalyticsPage(document.getElementById('app'))">
                        <i class="ph ph-arrows-clockwise"></i> Refresh Data
                    </button>
                 </div>
            </div>

            <!-- SCROLLABLE CONTENT -->
            <div style="flex: 1; overflow-y: auto; background: #f1f5f9; padding: 24px;">
                <div class="analytics-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 24px; padding-bottom: 40px; max-width: 1600px; margin: 0 auto;">
                    
                    <!-- CARD: Spending by Category -->
                    <div class="card" style="padding: 24px; border-radius: 16px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <h3 style="margin: 0 0 20px 0; font-size: 1rem; color: #1e293b; font-weight: 700;">Spending by Category</h3>
                        <div style="height: 300px; position: relative;">
                            <canvas id="chart-category"></canvas>
                        </div>
                    </div>

                    <!-- CARD: Monthly Trend -->
                    <div class="card" style="padding: 24px; border-radius: 16px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
                        <h3 style="margin: 0 0 20px 0; font-size: 1rem; color: #1e293b; font-weight: 700;">Monthly Trend</h3>
                        <div style="height: 300px; position: relative;">
                            <canvas id="chart-trend"></canvas>
                        </div>
                    </div>

                     <!-- CARD: Top Vendors -->
                    <div class="card" style="padding: 24px; border-radius: 16px; background: white; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); grid-column: 1 / -1;">
                        <h3 style="margin: 0 0 20px 0; font-size: 1rem; color: #1e293b; font-weight: 700;">Top 10 Vendors</h3>
                        <div style="height: 300px; position: relative;">
                            <canvas id="chart-vendors"></canvas>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Drill Down Modal Container -->
            <div id="drilldown-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center;">
                <div style="background: white; width: 90%; height: 90%; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);">
                    <div style="padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                        <h3 id="drilldown-title" style="margin: 0; font-size: 1.25rem;">Drill Down</h3>
                        <button onclick="document.getElementById('drilldown-modal').style.display='none'" style="background: none; border: none; font-size: 2rem; cursor: pointer; color: #64748b;">&times;</button>
                    </div>
                    <!-- AG GRID Container -->
                    <div id="drilldown-grid" class="ag-theme-alpine" style="flex: 1; width: 100%;"></div>
                </div>
            </div>
        </div>
    `;

    // Initialize logic
    setTimeout(initDashboard, 100);
};

async function initDashboard() {
    // 1. Load Data
    const rawData = localStorage.getItem('ab3_transactions');
    const transactions = rawData ? JSON.parse(rawData) : [];

    if (transactions.length === 0) {
        window.showToast('No transaction data found.', 'warning');
        return;
    }

    // 2. Process Data
    const categoryStats = {};
    const monthlyStats = {}; // "2024-01" -> { income, expense }
    const vendorStats = {};

    transactions.forEach(txn => {
        const amt = parseFloat(txn.amount);
        const date = new Date(txn.date);
        const monthKey = `${date.getFullYear()} -${String(date.getMonth() + 1).padStart(2, '0')} `;
        const vendor = (txn.description || 'Unknown').trim().toUpperCase();

        // Category (Expenses Only)
        if (txn.type === 'debit') {
            const cat = txn.category || 'Uncategorized';
            categoryStats[cat] = (categoryStats[cat] || 0) + amt;

            // Vendor
            vendorStats[vendor] = (vendorStats[vendor] || 0) + amt;
        }

        // Monthly
        if (!monthlyStats[monthKey]) monthlyStats[monthKey] = { income: 0, expense: 0 };
        if (txn.type === 'credit') monthlyStats[monthKey].income += amt;
        else monthlyStats[monthKey].expense += amt;
    });

    // 3. Render Charts
    renderCategoryChart(categoryStats, transactions);
    renderTrendChart(monthlyStats);
    renderVendorChart(vendorStats);
}

function renderCategoryChart(stats, allTransactions) {
    const ctx = document.getElementById('chart-category');
    if (!ctx) return;

    // Sort by value desc
    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(k => k[0]);
    const data = sorted.map(k => k[1]);

    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: [
                    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6', '#14b8a6'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            onClick: (e, elements) => {
                if (elements.length > 0) {
                    const idx = elements[0].index;
                    const category = labels[idx];
                    openDrillDown('Category', category, allTransactions.filter(t => t.category === category));
                }
            },
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function renderTrendChart(stats) {
    const ctx = document.getElementById('chart-trend');
    if (!ctx) return;

    const labels = Object.keys(stats).sort();
    const incomeData = labels.map(k => stats[k].income);
    const expenseData = labels.map(k => stats[k].expense);

    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Income',
                    data: incomeData,
                    backgroundColor: '#10b981',
                    borderRadius: 4
                },
                {
                    label: 'Expenses',
                    data: expenseData,
                    backgroundColor: '#ef4444',
                    borderRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function renderVendorChart(stats) {
    const ctx = document.getElementById('chart-vendors');
    if (!ctx) return;

    const sorted = Object.entries(stats).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(k => k[0]);
    const data = sorted.map(k => k[1]);

    new Chart(ctx, {
        type: 'bar',
        indexAxis: 'y',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total Spent',
                data: data,
                backgroundColor: '#6366f1',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

/**
 * Drill Down Grid Modal
 */
function openDrillDown(type, value, rowData) {
    const modal = document.getElementById('drilldown-modal');
    const title = document.getElementById('drilldown-title');
    const gridDiv = document.getElementById('drilldown-grid');

    title.innerText = `${type}: ${value} `;
    modal.style.display = 'flex';
    gridDiv.innerHTML = ''; // Clear previous

    const gridOptions = {
        rowData: rowData,
        columnDefs: [
            { field: 'date', headerName: 'Date', width: 110, sortable: true },
            { field: 'description', headerName: 'Description', flex: 2, filter: true },
            {
                field: 'amount',
                headerName: 'Amount',
                width: 110,
                valueFormatter: p => '$' + Number(p.value).toFixed(2),
                type: 'numericColumn'
            },
            { field: 'account', headerName: 'Account', flex: 1 }
        ],
        defaultColDef: {
            resizable: true,
            sortable: true
        }
    };

    agGrid.createGrid(gridDiv, gridOptions);
}
