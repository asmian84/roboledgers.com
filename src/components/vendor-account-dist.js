/**
 * Account Distribution Analytics Panel
 * Shows vendor counts grouped by GL account with drill-down filtering
 */

class AccountDistributionPanel {
    constructor() {
        this.container = null;
        this.gridApi = null;
        this.distributionData = [];
        this.currentFilter = null;
    }

    /**
     * Initialize the panel
     * @param {string} containerId - DOM element ID for the panel
     * @param {object} gridApi - AG Grid API reference for filtering
     */
    init(containerId, gridApi) {
        this.container = document.getElementById(containerId);
        this.gridApi = gridApi;

        if (!this.container) {
            console.error('Account distribution container not found');
            return;
        }

        this.render();
    }

    /**
     * Calculate vendor distribution by GL account
     * @param {Array} vendors - Array of vendor objects
     */
    calculateDistribution(vendors) {
        const accountMap = new Map();

        vendors.forEach(vendor => {
            const account = vendor.default_account || vendor.default_gl_account || '9970';
            const category = vendor.default_category || 'Uncategorized';

            if (!accountMap.has(account)) {
                accountMap.set(account, {
                    account: account,
                    category: category,
                    count: 0,
                    vendors: []
                });
            }

            const entry = accountMap.get(account);
            entry.count++;
            entry.vendors.push(vendor);
        });

        // Convert to array and sort by count (descending)
        this.distributionData = Array.from(accountMap.values())
            .sort((a, b) => b.count - a.count);

        this.renderDistribution();
    }

    /**
     * Render the panel structure
     */
    render() {
        this.container.innerHTML = `
            <div class="account-distribution-panel">
                <div class="dist-header" onclick="this.nextElementSibling.classList.toggle('collapsed')">
                    <h3>📊 Account Distribution</h3>
                    <span class="toggle-icon">▼</span>
                </div>
                <div class="dist-content collapsed">
                    <div class="dist-summary" id="distSummary">
                        <p>Loading distribution data...</p>
                    </div>
                    <div class="dist-actions">
                        <button id="resetFilter" class="btn-secondary" style="display: none; margin-right: 8px;">
                            🔄 Reset Filter
                        </button>
                        <button id="consolidateGlobal" class="btn-warning">
                            🧹 Consolidate Global
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Attach event listeners
        const resetBtn = document.getElementById('resetFilter');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetFilter());
        }

        const consolidateBtn = document.getElementById('consolidateGlobal');
        if (consolidateBtn) {
            consolidateBtn.addEventListener('click', async () => {
                if (confirm('GLOBAL MERGE: This will unify all vendors who share a category name to the same account code across your entire dictionary. Proceed?')) {
                    consolidateBtn.disabled = true;
                    consolidateBtn.textContent = '⏳ Processing...';

                    try {
                        const count = await window.merchantDictionary.consolidateAllAccounts();
                        alert(`Successfully consolidated ${count} vendors. All categories are now unified to their most common GL accounts.`);

                        // Trigger a full grid refresh
                        if (window.initVendorsGrid) {
                            await window.initVendorsGrid();
                        }
                    } catch (err) {
                        console.error('Consolidation failed:', err);
                        alert('Error during consolidation: ' + err.message);
                    } finally {
                        consolidateBtn.disabled = false;
                        consolidateBtn.textContent = '🧹 Consolidate Global';
                    }
                }
            });
        }

        this.addStyles();
    }

    /**
     * Render the distribution data
     */
    renderDistribution() {
        const summaryEl = document.getElementById('distSummary');
        if (!summaryEl) return;

        if (this.distributionData.length === 0) {
            summaryEl.innerHTML = '<p class="empty-state">No vendor data available</p>';
            return;
        }

        const totalVendors = this.distributionData.reduce((sum, item) => sum + item.count, 0);

        let html = `
            <div class="dist-stats">
                <div class="stat-card">
                    <div class="stat-value">${totalVendors}</div>
                    <div class="stat-label">Total Vendors</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${this.distributionData.length}</div>
                    <div class="stat-label">Accounts Used</div>
                </div>
            </div>
            <div class="dist-table">
                <table>
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th>Category</th>
                            <th>Vendors</th>
                            <th>%</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        this.distributionData.forEach(item => {
            const percentage = ((item.count / totalVendors) * 100).toFixed(1);
            const accountColor = this.getAccountColor(item.account);

            html += `
                <tr class="dist-row ${this.currentFilter === item.account ? 'active' : ''}" 
                    data-account="${item.account}">
                    <td>
                        <span class="account-badge" style="background-color: ${accountColor}">
                            ${item.account}
                        </span>
                    </td>
                    <td>${item.category}</td>
                    <td class="count">${item.count}</td>
                    <td class="percentage">${percentage}%</td>
                    <td>
                        <button class="btn-filter" onclick="window.accountDistPanel.filterByAccount('${item.account}')">
                            Filter →
                        </button>
                    </td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        summaryEl.innerHTML = html;
    }

    /**
     * Filter grid by account
     * @param {string} accountNumber - GL account to filter by
     */
    filterByAccount(accountNumber) {
        if (!this.gridApi) {
            console.error('❌ Cannot filter: gridApi is missing');
            return;
        }

        console.log(`📊 Drilling down into account: ${accountNumber}`);
        this.currentFilter = accountNumber;

        // Set global filter state and signal grid to refresh
        window.activeAccountDrilldown = accountNumber;
        this.gridApi.onFilterChanged();

        // Show reset button
        const resetBtn = document.getElementById('resetFilter');
        if (resetBtn) {
            resetBtn.style.display = 'inline-block';
        }

        // Update UI highlighting
        document.querySelectorAll('.dist-row').forEach(row => {
            row.classList.toggle('active', row.dataset.account === accountNumber);
        });
    }

    /**
     * Reset grid filter
     */
    resetFilter() {
        console.log('📊 Resetting account filter...');
        this.currentFilter = null;
        window.activeAccountDrilldown = null;

        if (this.gridApi) {
            this.gridApi.onFilterChanged();
        }

        // Hide reset button
        const resetBtn = document.getElementById('resetFilter');
        if (resetBtn) {
            resetBtn.style.display = 'none';
        }

        // Update UI
        document.querySelectorAll('.dist-row').forEach(row => {
            row.classList.remove('active');
        });
    }

    /**
     * Get color based on account number
     * @param {string} account - GL account number
     * @returns {string} CSS color value
     */
    getAccountColor(account) {
        const num = parseInt(account);

        if (num >= 1000 && num < 2000) return '#4CAF50'; // Assets - Green
        if (num >= 2000 && num < 3000) return '#F44336'; // Liabilities - Red
        if (num >= 3000 && num < 4000) return '#2196F3'; // Equity - Blue
        if (num >= 4000 && num < 5000) return '#FF9800'; // Revenue - Orange
        if (num >= 5000 && num < 10000) return '#9C27B0'; // Expenses - Purple

        return '#757575'; // Gray for uncategorized
    }

    /**
     * Add CSS styles
     */
    addStyles() {
        if (document.getElementById('account-dist-styles')) return;

        const style = document.createElement('style');
        style.id = 'account-dist-styles';
        style.textContent = `
            .account-distribution-panel {
                background: white;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                margin-bottom: 20px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }

            .dist-header {
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                user-select: none;
                border-bottom: 1px solid #e0e0e0;
            }

            .dist-header:hover {
                background: #f5f5f5;
            }

            .dist-header h3 {
                margin: 0;
                font-size: 18px;
                color: #333;
            }

            .toggle-icon {
                transition: transform 0.3s;
            }

            .dist-content.collapsed {
                display: none;
            }

            .dist-content.collapsed ~ .dist-header .toggle-icon {
                transform: rotate(-90deg);
            }

            .dist-content {
                padding: 20px;
            }

            .dist-stats {
                display: flex;
                gap: 20px;
                margin-bottom: 20px;
            }

            .stat-card {
                flex: 1;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 8px;
                text-align: center;
            }

            .stat-value {
                font-size: 32px;
                font-weight: bold;
                margin-bottom: 8px;
            }

            .stat-label {
                font-size: 14px;
                opacity: 0.9;
            }

            .dist-table {
                overflow-x: auto;
            }

            .dist-table table {
                width: 100%;
                border-collapse: collapse;
            }

            .dist-table th {
                text-align: left;
                padding: 12px;
                background: #f5f5f5;
                border-bottom: 2px solid #e0e0e0;
                font-weight: 600;
                color: #555;
            }

            .dist-table td {
                padding: 12px;
                border-bottom: 1px solid #f0f0f0;
            }

            .dist-row {
                transition: background 0.2s;
            }

            .dist-row:hover {
                background: #f9f9f9;
            }

            .dist-row.active {
                background: #e3f2fd;
            }

            .account-badge {
                display: inline-block;
                padding: 4px 12px;
                border-radius: 4px;
                color: white;
                font-weight: 600;
                font-size: 13px;
            }

            .count {
                font-weight: 600;
                color: #333;
            }

            .percentage {
                color: #666;
            }

            .btn-filter {
                background: #2196F3;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
                font-weight: 500;
            }

            .btn-filter:hover {
                background: #1976D2;
            }

            .dist-actions {
                margin-top: 16px;
                text-align: center;
            }

            .btn-secondary {
                background: #757575;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
            }

            .btn-secondary:hover {
                background: #616161;
            }

            .btn-warning {
                background: #f59e0b;
                color: white;
                border: none;
                padding: 10px 20px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 14px;
                font-weight: 500;
                transition: background 0.2s;
            }

            .btn-warning:hover {
                background: #d97706;
            }

            .btn-warning:disabled {
                background: #fbbf24;
                cursor: not-allowed;
                opacity: 0.7;
            }

            .empty-state {
                text-align: center;
                color: #999;
                padding: 40px;
                font-style: italic;
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Refresh the distribution data
     * @param {Array} vendors - Updated vendor array
     */
    refresh(vendors) {
        this.calculateDistribution(vendors);
    }
}

// Export for global usage
window.AccountDistributionPanel = AccountDistributionPanel;
console.log('📊 Account Distribution Panel loaded');
