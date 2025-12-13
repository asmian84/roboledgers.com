/**
 * 📊 DASHBOARD LOGIC CENTER
 * Handles real-time financial calculations and visualization
 */

const DashboardManager = {
    // State
    charts: {},
    isOpen: false,
    refreshInterval: null,

    // Configuration - Chart Colors
    colors: {
        revenue: '#10b981',
        expense: '#ef4444',
        profit: '#3b82f6',
        gridLines: 'rgba(0,0,0,0.05)',
        text: '#64748b'
    },

    init() {
        console.log('🚀 Initializing Dashboard Manager...');
        this.setupEventListeners();
        this.initCharts();

        // Start the "Live" heartbeat (1s updates)
        this.startLiveUpdates();
    },

    setupEventListeners() {
        const openBtn = document.getElementById('openDashboardBtn');
        const closeBtn = document.getElementById('closeDashboardBtn');
        const overlay = document.getElementById('financialDashboard');

        if (openBtn) {
            openBtn.addEventListener('click', () => {
                this.openDashboard();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeDashboard();
            });
        }

        // Close on escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) this.closeDashboard();
        });

        // Theme change detection
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.updateChartTheme());
        }
    },

    openDashboard() {
        const overlay = document.getElementById('financialDashboard');
        overlay.classList.remove('hidden'); // In case it was hidden by display:none
        // Force reflow
        void overlay.offsetWidth;
        overlay.classList.add('visible');
        this.isOpen = true;
        this.updateData(); // Immediate update
    },

    closeDashboard() {
        const overlay = document.getElementById('financialDashboard');
        overlay.classList.remove('visible');
        this.isOpen = false;
        // Wait for animation
        setTimeout(() => {
            // overlay.classList.add('hidden');
        }, 300);
    },

    startLiveUpdates() {
        // Update math every 1 second if dashboard is open
        setInterval(() => {
            if (this.isOpen) {
                this.updateData();
            }
        }, 1000);
    },

    // 🧠 CORE MATH ENGINE
    calculateFinancials() {
        let metrics = {
            revenue: 0,
            expenses: 0,
            profit: 0,
            cash: 0,
            expenseCategories: {},
            monthlyTrend: {},
            accountBalances: {},
            latestDate: null
        };

        if (!window.TransactionGrid || !window.TransactionGrid.gridApi) return metrics;

        window.TransactionGrid.gridApi.forEachNode((node) => {
            const txn = node.data;
            if (!txn) return;

            // PARSE VALUES (Handling Grid Field Names: 'debits', 'amount' (credit), 'balance')
            const debit = parseFloat(txn.debits) || 0;
            const credit = parseFloat(txn.amount) || 0; // 'amount' field is Credit in this grid
            const balance = parseFloat(txn.balance);

            // Extract Account Code from 'allocatedAccount' (e.g. "6500")
            // Or 'allocatedAccountName' (e.g. "6500 - Office Supplies")
            let accountCode = 0;
            let categoryName = 'Uncategorized';

            if (txn.allocatedAccount) {
                accountCode = parseInt(txn.allocatedAccount);
            } else if (txn.allocatedAccountName) {
                accountCode = parseInt(txn.allocatedAccountName.split(' ')[0]);
            }

            if (txn.allocatedAccountName) {
                const parts = txn.allocatedAccountName.split('-');
                if (parts.length > 1) categoryName = parts[1].trim();
                else categoryName = txn.allocatedAccountName;
            }

            // 🧮 LOGIC ROUTING
            if (accountCode >= 4000 && accountCode < 5000) {
                // REVENUE
                metrics.revenue += credit; // Revenue is credit
                this.addToTrend(metrics.monthlyTrend, txn.date, credit, 0);
            }
            else if (accountCode >= 5000) {
                // EXPENSES
                metrics.expenses += debit; // Expense is debit

                // Category Breakdown
                if (debit > 0) {
                    metrics.expenseCategories[categoryName] = (metrics.expenseCategories[categoryName] || 0) + debit;
                    this.addToTrend(metrics.monthlyTrend, txn.date, 0, debit);
                }
            }
            // 💵 NET POSITION / CASH AGGREGATION
            // Track the latest balance for EACH account to determine current standing
            if (txn.accountId && txn.date && !isNaN(balance)) {
                const d = new Date(txn.date);
                if (!metrics.accountBalances[txn.accountId] || d > metrics.accountBalances[txn.accountId].date) {
                    metrics.accountBalances[txn.accountId] = { date: d, balance: balance };
                }
            } else if (!txn.accountId && txn.date && !isNaN(balance)) {
                // Fallback for legacy transactions without accountId (Treat as one 'default' account)
                const d = new Date(txn.date);
                if (!metrics.latestDate || d > metrics.latestDate) {
                    metrics.latestDate = d;
                    metrics.cash = balance; // Legacy behavior
                }
            }
        });

        metrics.profit = metrics.revenue - metrics.expenses;

        // Finalize Net Position Calculation
        let netPosition = 0;
        let hasMultiAccountData = Object.keys(metrics.accountBalances).length > 0;

        if (hasMultiAccountData) {
            // Sum up latest balances from all accounts
            Object.keys(metrics.accountBalances).forEach(accId => {
                let bal = metrics.accountBalances[accId].balance;

                // Smart Liability Handling
                // If it's a Credit Card, Positive Balance usually means DEBT.
                // We should display Net Position (Assets - Liabilities).
                // So if we owe $500 (Positive in CSV), it counts as -$500 towards Net Position.
                if (window.BankAccountManager) {
                    const acc = BankAccountManager.getAccountById(accId);
                    if (acc && acc.isReversedLogic && acc.isReversedLogic()) {
                        // It's a liability (Credit Card / LOC)
                        // Assumption: Bank CSV shows positive number for amount owed.
                        netPosition -= bal;
                    } else {
                        // Asset (Checking / Savings)
                        netPosition += bal;
                    }
                } else {
                    netPosition += bal;
                }
            });
            metrics.cash = netPosition;
        }

        return metrics;
    },

    // Helper to init metrics
    _initMetrics() {
        return {
            revenue: 0,
            expenses: 0,
            profit: 0,
            cash: 0,
            expenseCategories: {},
            monthlyTrend: {},
            accountBalances: {}, // Map of accountId -> {date, balance}
            latestDate: null
        };
    },

    addToTrend(trendObj, dateStr, rev, exp) {
        if (!dateStr) return;
        // Format: YYYY-MM
        try {
            const date = new Date(dateStr);
            const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

            if (!trendObj[key]) trendObj[key] = { r: 0, e: 0 };
            trendObj[key].r += rev;
            trendObj[key].e += exp;
        } catch (e) { }
    },

    updateData() {
        const data = this.calculateFinancials();

        // 1. Update KPI Cards (with animation?)
        this.animateValue('kpiRevenue', data.revenue);
        this.animateValue('kpiExpenses', data.expenses);
        this.animateValue('kpiProfit', data.profit);

        // Colorize Profit
        const profitEl = document.getElementById('kpiProfit');
        if (data.profit >= 0) profitEl.style.color = '#10b981';
        else profitEl.style.color = '#ef4444';

        // 2. Update Charts
        this.updateCharts(data);

        // 3. Update Insight
        this.generateInsight(data);
    },

    animateValue(elementId, value) {
        const el = document.getElementById(elementId);
        if (!el) return;

        // Simple formatter
        const formatted = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
        el.innerText = formatted;
    },

    generateInsight(data) {
        const el = document.getElementById('aiInsightText');
        if (!el) return;

        const margin = data.revenue > 0 ? ((data.profit / data.revenue) * 100).toFixed(1) : 0;

        if (data.revenue === 0 && data.expenses === 0) {
            el.innerText = "Waiting for data... Upload a CSV to begin.";
        } else if (data.profit > 0) {
            el.innerText = `Healthy Performance! Net Profit Margin is ${margin}%. Keeping expenses under control.`;
        } else {
            el.innerText = `Attention: operating at a loss. Expenses exceed revenue by ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(data.profit))}.`;
        }
    },

    // 📊 CHARTJS INTEGRATION
    initCharts() {
        const ctxTrend = document.getElementById('trendChart')?.getContext('2d');
        const ctxDonut = document.getElementById('expenseDonutChart')?.getContext('2d');

        if (ctxTrend) {
            this.charts.trend = new Chart(ctxTrend, {
                type: 'line',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'top' } },
                    interaction: { mode: 'index', intersect: false },
                    scales: {
                        y: {
                            beginAtZero: true,
                            grid: { color: 'rgba(0,0,0,0.05)' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        if (ctxDonut) {
            this.charts.donut = new Chart(ctxDonut, {
                type: 'doughnut',
                data: { labels: [], datasets: [] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'right' } }
                }
            });
        }
    },

    updateCharts(data) {
        // Trend Chart
        if (this.charts.trend) {
            const sortedKeys = Object.keys(data.monthlyTrend).sort();
            const revenues = sortedKeys.map(k => data.monthlyTrend[k].r);
            const expenses = sortedKeys.map(k => data.monthlyTrend[k].e);

            this.charts.trend.data = {
                labels: sortedKeys,
                datasets: [
                    {
                        label: 'Revenue',
                        data: revenues,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Expenses',
                        data: expenses,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.4
                    }
                ]
            };
            this.charts.trend.update('none'); // 'none' for smooth animation
        }

        // Donut Chart (Top 5 Expenses)
        if (this.charts.donut) {
            const entries = Object.entries(data.expenseCategories);
            entries.sort((a, b) => b[1] - a[1]); // Sort by amount desc
            const top5 = entries.slice(0, 5);

            this.charts.donut.data = {
                labels: top5.map(e => e[0]),
                datasets: [{
                    data: top5.map(e => e[1]),
                    backgroundColor: [
                        '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316'
                    ],
                    borderWidth: 0
                }]
            };
            this.charts.donut.update();
        }
    },

    updateChartTheme() {
        // Check body class for dark mode and update chart options if needed
        // (Chart.js usually handles colors via explicit dataset props, but grid lines need update)
        const isDark = document.body.classList.contains('dark-mode');
        const color = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';
        const textColor = isDark ? '#94a3b8' : '#64748b';

        if (this.charts.trend) {
            this.charts.trend.options.scales.y.grid.color = color;
            this.charts.trend.options.scales.x.grid.color = color;
            this.charts.trend.update();
        }
    }
};

// Expose to window for global access
window.DashboardManager = DashboardManager;

// Auto-init when DOM ready
document.addEventListener('DOMContentLoaded', () => {
    DashboardManager.init();
});
