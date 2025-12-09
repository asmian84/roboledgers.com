/**
 * DASHBOARD STATISTICS ENGINE
 * Calculates and displays financial metrics
 */

class DashboardStats {
    constructor() {
        this.metrics = {
            revenue: 0,
            expenses: 0,
            profit: 0,
            transactionCount: 0
        };

        this.previousMetrics = null;
        this.activities = [];
    }

    /**
     * Calculate metrics from transaction data
     */
    calculateMetrics(transactions) {
        if (!transactions || transactions.length === 0) {
            return this.metrics;
        }

        let totalCredits = 0;
        let totalDebits = 0;

        transactions.forEach(tx => {
            const credit = parseFloat(tx.credit) || 0;
            const debit = parseFloat(tx.debit) || 0;

            totalCredits += credit;
            totalDebits += debit;
        });

        this.metrics = {
            revenue: totalCredits,
            expenses: totalDebits,
            profit: totalCredits - totalDebits,
            transactionCount: transactions.length
        };

        return this.metrics;
    }

    /**
     * Calculate trend compared to previous period
     */
    calculateTrend(current, previous) {
        if (!previous || previous === 0) {
            return { percent: 0, direction: 'neutral' };
        }

        const change = current - previous;
        const percent = (change / Math.abs(previous)) * 100;

        return {
            percent: Math.abs(percent).toFixed(1),
            direction: change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral',
            arrow: change > 0 ? '↑' : change < 0 ? '↓' : '='
        };
    }

    /**
     * Update dashboard display with current metrics
     */
    updateDashboard(transactions) {
        const metrics = this.calculateMetrics(transactions);

        // Update revenue
        const revenueEl = document.getElementById('dashRevenue');
        if (revenueEl) {
            revenueEl.textContent = this.formatCurrency(metrics.revenue);
        }

        // Update expenses
        const expensesEl = document.getElementById('dashExpenses');
        if (expensesEl) {
            expensesEl.textContent = this.formatCurrency(metrics.expenses);
        }

        // Update profit
        const profitEl = document.getElementById('dashProfit');
        if (profitEl) {
            profitEl.textContent = this.formatCurrency(metrics.profit);

            // Color-code profit
            if (metrics.profit > 0) {
                profitEl.style.color = '#10b981';
            } else if (metrics.profit < 0) {
                profitEl.style.color = '#ef4444';
            } else {
                profitEl.style.color = 'var(--text-primary)';
            }
        }

        // Update trends if we have previous data
        if (this.previousMetrics) {
            this.updateTrends(metrics);
        }

        // Update transaction count
        this.updateActivityFeed(transactions);
    }

    /**
     * Update trend indicators
     */
    updateTrends(currentMetrics) {
        // Revenue trend
        const revenueTrend = this.calculateTrend(
            currentMetrics.revenue,
            this.previousMetrics.revenue
        );
        this.renderTrend('dashRevenueTrend', revenueTrend);

        // Expenses trend
        const expensesTrend = this.calculateTrend(
            currentMetrics.expenses,
            this.previousMetrics.expenses
        );
        this.renderTrend('dashExpensesTrend', expensesTrend);

        // Profit trend
        const profitTrend = this.calculateTrend(
            currentMetrics.profit,
            this.previousMetrics.profit
        );
        this.renderTrend('dashProfitTrend', profitTrend);
    }

    /**
     * Render a single trend indicator
     */
    renderTrend(elementId, trend) {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.className = `metric-trend ${trend.direction}`;
        el.innerHTML = `
            <span class="metric-trend-icon">${trend.arrow}</span>
            <span>${trend.percent}%</span>
        `;
    }

    /**
     * Update activity feed
     */
    updateActivityFeed(transactions) {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        if (!transactions || transactions.length === 0) {
            activityList.innerHTML = `
                <div class="activity-empty">
                    📭 No recent activity. Upload a CSV to get started!
                </div>
            `;
            return;
        }

        // Get last import info from session
        const lastImport = sessionStorage.getItem('lastImportInfo');
        let activities = [];

        if (lastImport) {
            try {
                const importInfo = JSON.parse(lastImport);
                activities.push({
                    icon: '📄',
                    title: `File uploaded: ${importInfo.filename || 'transactions.csv'}`,
                    time: this.getRelativeTime(importInfo.timestamp || Date.now())
                });
            } catch (e) {
                // Ignore parse errors
            }
        }

        activities.push({
            icon: '💳',
            title: `${transactions.length} transactions processed`,
            time: 'Just now'
        });

        // Add export activity if exists
        const lastExport = sessionStorage.getItem('lastExportTime');
        if (lastExport) {
            activities.push({
                icon: '⚡',
                title: 'Exported to Excel',
                time: this.getRelativeTime(parseInt(lastExport))
            });
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-content">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-time">${activity.time}</div>
                </div>
            </div>
        `).join('');
    }

    /**
     * Format currency value
     */
    formatCurrency(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    /**
     * Get relative time string
     */
    getRelativeTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;

        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        return `${days} day${days > 1 ? 's' : ''} ago`;
    }

    /**
     * Save current metrics as previous (for trend calculation)
     */
    savePreviousMetrics() {
        this.previousMetrics = { ...this.metrics };
        localStorage.setItem('previousMetrics', JSON.stringify(this.previousMetrics));
    }

    /**
     * Load previous metrics from storage
     */
    loadPreviousMetrics() {
        const stored = localStorage.getItem('previousMetrics');
        if (stored) {
            try {
                this.previousMetrics = JSON.parse(stored);
            } catch (e) {
                this.previousMetrics = null;
            }
        }
    }
}

// Initialize dashboard stats
const dashboardStats = new DashboardStats();
dashboardStats.loadPreviousMetrics();

// Quick action functions
function navigateToUpload() {
    const uploadSection = document.getElementById('uploadSection');
    const dashSection = document.getElementById('dashboardSection');

    if (uploadSection && dashSection) {
        dashSection.classList.remove('active');
        uploadSection.classList.add('active');

        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function openReportsModal() {
    const reportsBtn = document.getElementById('reportsBtn');
    if (reportsBtn) {
        reportsBtn.click();
    }
}

function exportDataQuick() {
    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.click();

        // Track export time
        sessionStorage.setItem('lastExportTime', Date.now().toString());
    }
}
