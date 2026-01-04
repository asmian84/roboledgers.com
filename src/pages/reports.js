/**
 * Reports & Analytics System
 * Comprehensive financial reporting with visualizations
 */

window.renderReports = function (params) {
  const report = params?.report || 'dashboard';

  if (report === 'dashboard') {
    return renderReportsDashboard();
  } else if (report === 'profit-loss') {
    return renderProfitLoss();
  } else if (report === 'balance-sheet') {
    return renderBalanceSheet();
  } else if (report === 'cash-flow') {
    return renderCashFlow();
  } else if (report === 'vendor-analysis') {
    return renderVendorAnalysis();
  } else if (report === 'account-summary') {
    return renderAccountSummary();
  } else if (report === 'custom') {
    return renderCustomReportBuilder();
  }

  return renderReportsDashboard();
};

// ==================================================
// REPORTS DASHBOARD
// ==================================================

function renderReportsDashboard() {
  return `
    <div class="ai-brain-page" style="width: 100%; height: 100vh; display: flex; flex-direction: column; overflow: hidden;">
      <!-- FIXED HEADER -->
      <div class="fixed-top-section" style="background: white; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
         <div class="header-brand" style="display: flex; align-items: center; gap: 12px;">
             <div class="icon-box" style="width: 40px; height: 40px; background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📈</div>
             <div>
                 <h1 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Reports & Analytics</h1>
                 <p style="margin: 0; font-size: 0.8rem; color: #64748b;">Generate insights from your financial data</p>
             </div>
         </div>
         <div class="date-range-selector">
           <select id="global-date-range" onchange="updateDateRange()" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem; background: white;">
             <option value="this-month">This Month</option>
             <option value="last-month">Last Month</option>
             <option value="this-quarter">This Quarter</option>
             <option value="this-year">This Year</option>
             <option value="all">All Time</option>
           </select>
         </div>
      </div>

      <!-- SCROLLABLE GRID -->
      <div style="flex: 1; overflow-y: auto; background: #f1f5f9; padding: 24px;">
        <div class="report-cards-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 24px; max-width: 1400px; margin: 0 auto;">
          <a href="#/reports/profit-loss" class="report-card profit-loss" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-decoration: none; color: inherit; transition: all 0.2s;">
            <div class="report-icon" style="font-size: 2rem; margin-bottom: 16px;">📊</div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700;">Profit & Loss</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9rem;">View income and expenses breakdown by period</p>
            <div class="report-action" style="color: #8b5cf6; font-weight: 600; font-size: 0.9rem;">View Report →</div>
          </a>
          
          <a href="#/reports/balance-sheet" class="report-card balance-sheet" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-decoration: none; color: inherit; transition: all 0.2s;">
            <div class="report-icon" style="font-size: 2rem; margin-bottom: 16px;">⚖️</div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700;">Balance Sheet</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9rem;">Assets, liabilities, and equity snapshot</p>
            <div class="report-action" style="color: #8b5cf6; font-weight: 600; font-size: 0.9rem;">View Report →</div>
          </a>
          
          <a href="#/reports/cash-flow" class="report-card cash-flow" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-decoration: none; color: inherit; transition: all 0.2s;">
            <div class="report-icon" style="font-size: 2rem; margin-bottom: 16px;">💰</div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700;">Cash Flow</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9rem;">Track cash inflows and outflows</p>
            <div class="report-action" style="color: #8b5cf6; font-weight: 600; font-size: 0.9rem;">View Report →</div>
          </a>
          
          <a href="#/reports/vendor-analysis" class="report-card vendor-analysis" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-decoration: none; color: inherit; transition: all 0.2s;">
            <div class="report-icon" style="font-size: 2rem; margin-bottom: 16px;">🏪</div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700;">Vendor Analysis</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9rem;">Analyze spending by vendor over time</p>
            <div class="report-action" style="color: #8b5cf6; font-weight: 600; font-size: 0.9rem;">View Report →</div>
          </a>
          
          <a href="#/reports/account-summary" class="report-card account-summary" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-decoration: none; color: inherit; transition: all 0.2s;">
            <div class="report-icon" style="font-size: 2rem; margin-bottom: 16px;">📋</div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700;">Account Summary</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9rem;">View balances and activity by account</p>
            <div class="report-action" style="color: #8b5cf6; font-weight: 600; font-size: 0.9rem;">View Report →</div>
          </a>
          
          <a href="#/reports/custom" class="report-card custom-report" style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; text-decoration: none; color: inherit; transition: all 0.2s;">
            <div class="report-icon" style="font-size: 2rem; margin-bottom: 16px;">🔧</div>
            <h3 style="margin: 0 0 8px 0; font-size: 1.1rem; font-weight: 700;">Custom Report</h3>
            <p style="margin: 0 0 16px 0; color: #64748b; font-size: 0.9rem;">Build your own custom report</p>
            <div class="report-action" style="color: #8b5cf6; font-weight: 600; font-size: 0.9rem;">Build Report →</div>
          </a>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initReportsDashboard === 'function') {
        setTimeout(initReportsDashboard, 100);
      }
    </script>
  `;
}

// ==================================================
// PROFIT & LOSS REPORT
// ==================================================

function renderProfitLoss() {
  return `
    <div class="ai-brain-page" style="width: 100%; height: 100vh; display: flex; flex-direction: column; overflow: hidden;">
      <!-- FIXED HEADER -->
      <div class="fixed-top-section" style="background: white; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center; gap: 16px;">
          <button class="btn-back" onclick="router.navigate('/reports')" style="background: none; border: none; font-size: 1.1rem; cursor: pointer; color: #64748b;">←</button>
          <div>
              <h1 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Profit & Loss Statement</h1>
              <p style="margin: 0; font-size: 0.8rem; color: #64748b;">Income vs Expenses</p>
          </div>
        </div>
        
        <div class="report-controls" style="display: flex; gap: 8px;">
          <select id="pl-date-range" onchange="refreshProfitLoss()" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 0.9rem;">
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="this-quarter">This Quarter</option>
            <option value="this-year">This Year</option>
          </select>
          <button class="btn-secondary" onclick="exportReport('pdf')" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer;">📄 PDF</button>
          <button class="btn-secondary" onclick="exportReport('csv')" style="padding: 6px 12px; border: 1px solid #cbd5e1; border-radius: 6px; background: white; cursor: pointer;">📊 CSV</button>
        </div>
      </div>

      <!-- Report Body -->
      <div class="report-body" style="flex: 1; overflow-y: auto; background: #f1f5f9; padding: 24px;">
        <!-- Chart View -->
        <div class="report-section" style="background: white; border-radius: 12px; padding: 24px; margin-bottom: 24px; border: 1px solid #e2e8f0;">
          <h3 style="margin-top: 0;">Income vs Expenses</h3>
          <div style="height: 300px;"><canvas id="pl-chart"></canvas></div>
        </div>
        
        <!-- Table View -->
        <div class="report-section" style="background: white; border-radius: 12px; padding: 24px; border: 1px solid #e2e8f0;">
          <table class="report-table" id="pl-table" style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="border-bottom: 2px solid #e2e8f0; text-align: left;">
                <th style="padding: 12px;">Account</th>
                <th class="amount" style="text-align: right;">Amount</th>
                <th class="percentage" style="text-align: right;">% of Total</th>
              </tr>
            </thead>
            <tbody id="pl-table-body">
              <tr><td colspan="3">Loading...</td></tr>
            </tbody>
            <tfoot id="pl-table-footer"></tfoot>
          </table>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initProfitLoss === 'function') {
        setTimeout(initProfitLoss, 100);
      }
    </script>
  `;
}

// ==================================================
// BALANCE SHEET REPORT
// ==================================================

function renderBalanceSheet() {
  return `
    <div class="report-page">
      <div class="report-header">
        <div>
          <button class="btn-back" onclick="router.navigate('/reports')">← Back to Reports</button>
          <h1 class="report-title">Balance Sheet</h1>
        </div>
        
        <div class="report-controls">
          <input type="date" id="bs-date" onchange="refreshBalanceSheet()">
          <button class="btn-secondary" onclick="exportReport('pdf')">📄 PDF</button>
        </div>
      </div>

      <div class="report-body balance-sheet-layout">
        <div class="report-column">
          <h3>Assets</h3>
          <div id="assets-section"></div>
        </div>
        
        <div class="report-column">
          <div>
            <h3>Liabilities</h3>
            <div id="liabilities-section"></div>
          </div>
          
          <div>
            <h3>Equity</h3>
            <div id="equity-section"></div>
          </div>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initBalanceSheet === 'function') {
        setTimeout(initBalanceSheet, 100);
      }
    </script>
  `;
}

// ==================================================
// CASH FLOW REPORT
// ==================================================

function renderCashFlow() {
  return `
    <div class="report-page">
      <div class="report-header">
        <div>
          <button class="btn-back" onclick="router.navigate('/reports')">← Back to Reports</button>
          <h1 class="report-title">Cash Flow Statement</h1>
        </div>
        
        <div class="report-controls">
          <select id="cf-period" onchange="refreshCashFlow()">
            <option value="this-month">This Month</option>
            <option value="this-quarter">This Quarter</option>
            <option value="this-year">This Year</option>
          </select>
          <button class="btn-secondary" onclick="exportReport('pdf')">📄 PDF</button>
        </div>
      </div>

      <div class="report-body">
        <div class="report-section">
          <h3>Cash Flow Over Time</h3>
          <canvas id="cash-flow-chart"></canvas>
        </div>
        
        <div class="report-section">
          <table class="report-table">
            <thead>
              <tr>
                <th>Activity</th>
                <th class="amount">Amount</th>
              </tr>
            </thead>
            <tbody id="cash-flow-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initCashFlow === 'function') {
        setTimeout(initCashFlow, 100);
      }
    </script>
  `;
}

// ==================================================
// VENDOR ANALYSIS REPORT
// ==================================================

function renderVendorAnalysis() {
  return `
    <div class="report-page">
      <div class="report-header">
        <div>
          <button class="btn-back" onclick="router.navigate('/reports')">← Back to Reports</button>
          <h1 class="report-title">Vendor Spending Analysis</h1>
        </div>
        
        <div class="report-controls">
          <select id="va-period" onchange="refreshVendorAnalysis()">
            <option value="this-month">This Month</option>
            <option value="this-year">This Year</option>
            <option value="all">All Time</option>
          </select>
          <button class="btn-secondary" onclick="exportReport('csv')">📊 CSV</button>
        </div>
      </div>

      <div class="report-body">
        <div class="report-grid-2col">
          <div class="report-section">
            <h3>Top 10 Vendors by Spending</h3>
            <canvas id="vendor-spending-chart"></canvas>
          </div>
          
          <div class="report-section">
            <h3>Spending by Category</h3>
            <canvas id="vendor-category-chart"></canvas>
          </div>
        </div>
        
        <div class="report-section">
          <h3>Vendor Details</h3>
          <table class="report-table">
            <thead>
              <tr>
                <th>Vendor</th>
                <th class="amount">Total Spent</th>
                <th class="count">Transactions</th>
                <th class="amount">Average</th>
              </tr>
            </thead>
            <tbody id="vendor-table-body"></tbody>
          </table>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initVendorAnalysis === 'function') {
        setTimeout(initVendorAnalysis, 100);
      }
    </script>
  `;
}

// ==================================================
// ACCOUNT SUMMARY REPORT
// ==================================================

function renderAccountSummary() {
  return `
    <div class="report-page">
      <div class="report-header">
        <div>
          <button class="btn-back" onclick="router.navigate('/reports')">← Back to Reports</button>
          <h1 class="report-title">Account Summary</h1>
        </div>
        
        <div class="report-controls">
          <select id="as-type-filter" onchange="refreshAccountSummary()">
            <option value="">All Types</option>
            <option value="Asset">Assets</option>
            <option value="Liability">Liabilities</option>
            <option value="Equity">Equity</option>
            <option value="Revenue">Revenue</option>
            <option value="Expense">Expenses</option>
          </select>
          <button class="btn-secondary" onclick="exportReport('pdf')">📄 PDF</button>
        </div>
      </div>

      <div class="report-body">
        <div class="report-section">
          <table class="report-table">
            <thead>
              <tr>
                <th>Account</th>
                <th>Type</th>
                <th class="amount">Balance</th>
                <th class="count">Transactions</th>
              </tr>
            </thead>
            <tbody id="account-summary-body"></tbody>
          </table>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initAccountSummary === 'function') {
        setTimeout(initAccountSummary, 100);
      }
    </script>
  `;
}

// ==================================================
// CUSTOM REPORT BUILDER
// ==================================================

function renderCustomReportBuilder() {
  return `
    <div class="report-page">
      <div class="report-header">
        <div>
          <button class="btn-back" onclick="router.navigate('/reports')">← Back to Reports</button>
          <h1 class="report-title">Custom Report Builder</h1>
        </div>
      </div>

      <div class="report-builder">
        <div class="builder-panel">
          <h3>Report Configuration</h3>
          
          <div class="form-group">
            <label>Report Name</label>
            <input type="text" id="custom-report-name" placeholder="My Custom Report">
          </div>
          
          <div class="form-group">
            <label>Date Range</label>
            <select id="custom-date-range">
              <option value="this-month">This Month</option>
              <option value="this-year">This Year</option>
              <option value="all">All Time</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Group By</label>
            <select id="custom-group-by">
              <option value="vendor">Vendor</option>
              <option value="account">Account</option>
              <option value="category">Category</option>
              <option value="month">Month</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Visualization</label>
            <select id="custom-visualization">
              <option value="table">Table</option>
              <option value="bar">Bar Chart</option>
              <option value="pie">Pie Chart</option>
              <option value="line">Line Chart</option>
            </select>
          </div>
          
          <button class="btn-primary" onclick="generateCustomReport()">Generate Report</button>
        </div>
        
        <div class="builder-preview">
          <h3>Preview</h3>
          <div id="custom-report-preview">
            <p class="empty-message">Configure your report and click "Generate Report" to see results</p>
          </div>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initCustomReportBuilder === 'function') {
        setTimeout(initCustomReportBuilder, 100);
      }
    </script>
  `;
}

// ==================================================
// REPORTS LOGIC
// ==================================================

async function initReportsDashboard() {
  console.log('🚀 Initializing Reports Dashboard...');

  try {
    // Use aggregated data for reports
    let transactions = [];
    if (window.reportDataManager) {
      transactions = await window.reportDataManager.getAllTransactions();
    } else {
      transactions = await window.storage.getTransactions();
    }

    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const thisMonth = transactions.filter(t => new Date(t.date) >= firstOfMonth);

    const revenue = thisMonth.filter(t => t.type === 'credit').reduce((sum, t) => sum + t.amount, 0);
    const expenses = thisMonth.filter(t => t.type === 'debit').reduce((sum, t) => sum + t.amount, 0);
    const profit = revenue - expenses;

    // Stats Removed per user request
    // document.getElementById('total-revenue').textContent = window.DataUtils.formatCurrency(revenue);
    // document.getElementById('total-expenses').textContent = window.DataUtils.formatCurrency(expenses);
    // document.getElementById('net-profit').textContent = window.DataUtils.formatCurrency(profit);
    // document.getElementById('net-profit').style.color = profit >= 0 ? '#10b981' : '#ef4444';

    const vendors = await window.storage.getVendors();
    const activeVendors = vendors.filter(v => v.lastTransaction && new Date(v.lastTransaction) >= firstOfMonth);
    // document.getElementById('active-vendors').textContent = activeVendors.length;

  } catch (error) {
    console.error('Failed to initialize reports dashboard:', error);
  }
}

async function initProfitLoss() {
  console.log('🚀 Initializing Profit & Loss Report (using COA balances)...');

  try {
    // Use AccountBalances service to get aggregated data from COA
    if (!window.AccountBalances) {
      console.error('❌ AccountBalances service not available');
      return;
    }

    // Get balance summary from COA
    const balancesByType = window.AccountBalances.getBalancesByType();
    const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');

    // Calculate totals
    const totalRevenue = Math.abs(balancesByType.Revenue || 0);
    const totalExpenses = Math.abs(balancesByType.Expense || 0);
    const netProfit = totalRevenue - totalExpenses;

    console.log('📊 P&L Summary:', { totalRevenue, totalExpenses, netProfit });

    // Render chart
    const ctx = document.getElementById('pl-chart');
    if (ctx && typeof Chart !== 'undefined') {
      // Destroy existing chart if it exists
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Revenue', 'Expenses', 'Net Profit'],
          datasets: [{
            label: 'Amount ($)',
            data: [totalRevenue, totalExpenses, netProfit],
            backgroundColor: ['#10b981', '#ef4444', netProfit >= 0 ? '#10b981' : '#ef4444']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Build table using COA account balances
    const tableBody = document.getElementById('pl-table-body');
    const tableFooter = document.getElementById('pl-table-footer');

    let html = '<tr class="section-header"><td colspan="3"><strong>REVENUE</strong></td></tr>';

    // Get all Revenue accounts from COA
    const revenueAccounts = coa.filter(a => a.type === 'revenue');

    revenueAccounts.forEach(account => {
      const balance = Math.abs(parseFloat(account.balance) || 0);
      if (balance > 0) {
        const pct = totalRevenue > 0 ? ((balance / totalRevenue) * 100).toFixed(1) : '0.0';
        html += `
          <tr>
            <td>${account.code} - ${account.name}</td>
            <td class="amount">${window.DataUtils.formatCurrency(balance)}</td>
            <td class="percentage">${pct}%</td>
          </tr>
        `;
      }
    });

    html += `<tr class="subtotal"><td><strong>Total Revenue</strong></td><td class="amount"><strong>${window.DataUtils.formatCurrency(totalRevenue)}</strong></td><td></td></tr>`;

    html += '<tr class="section-header"><td colspan="3"><strong>EXPENSES</strong></td></tr>';

    // Get all Expense accounts from COA
    const expenseAccounts = coa.filter(a => a.type === 'expense');

    expenseAccounts.forEach(account => {
      const balance = Math.abs(parseFloat(account.balance) || 0);
      if (balance > 0) {
        const pct = totalExpenses > 0 ? ((balance / totalExpenses) * 100).toFixed(1) : '0.0';
        html += `
          <tr>
            <td>${account.code} - ${account.name}</td>
            <td class="amount">${window.DataUtils.formatCurrency(balance)}</td>
            <td class="percentage">${pct}%</td>
          </tr>
        `;
      }
    });

    html += `<tr class="subtotal"><td><strong>Total Expenses</strong></td><td class="amount"><strong>${window.DataUtils.formatCurrency(totalExpenses)}</strong></td><td></td></tr>`;

    tableBody.innerHTML = html;

    tableFooter.innerHTML = `
      <tr class="total">
        <td><strong>NET PROFIT</strong></td>
        <td class="amount" style="color: ${netProfit >= 0 ? '#10b981' : '#ef4444'}"><strong>${window.DataUtils.formatCurrency(netProfit)}</strong></td>
        <td></td>
      </tr>
    `;

  } catch (error) {
    console.error('❌ Failed to generate Profit & Loss:', error);
    console.error(error.stack);
  }
}

async function initBalanceSheet() {
  console.log('🚀 Initializing Balance Sheet (using COA balances)...');

  try {
    // Use AccountBalances service
    if (!window.AccountBalances) {
      console.error('❌ AccountBalances service not available');
      return;
    }

    const balancesByType = window.AccountBalances.getBalancesByType();
    const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');

    // Calculate totals
    const totalAssets = Math.abs(balancesByType.Asset || 0);
    const totalLiabilities = Math.abs(balancesByType.Liability || 0);
    const totalEquity = Math.abs(balancesByType.Equity || 0);

    console.log('📊 Balance Sheet:', { totalAssets, totalLiabilities, totalEquity });

    // Build Assets section
    const assetsSection = document.getElementById('assets-section');
    let assetsHTML = '<h3>ASSETS</h3><table class="report-table"><tbody>';

    const assetAccounts = coa.filter(a => a.type === 'asset');
    assetAccounts.forEach(account => {
      const balance = Math.abs(parseFloat(account.balance) || 0);
      assetsHTML += `
        <tr>
          <td>${account.code} - ${account.name}</td>
          <td class="amount">${window.DataUtils.formatCurrency(balance)}</td>
        </tr>
      `;
    });

    assetsHTML += `
      <tr class="total">
        <td><strong>Total Assets</strong></td>
        <td class="amount"><strong>${window.DataUtils.formatCurrency(totalAssets)}</strong></td>
      </tr>
    </tbody></table>`;
    assetsSection.innerHTML = assetsHTML;

    // Build Liabilities section
    const liabilitiesSection = document.getElementById('liabilities-section');
    let liabilitiesHTML = '<h3>LIABILITIES</h3><table class="report-table"><tbody>';

    const liabilityAccounts = coa.filter(a => a.type === 'liability');
    liabilityAccounts.forEach(account => {
      const balance = Math.abs(parseFloat(account.balance) || 0);
      liabilitiesHTML += `
        <tr>
          <td>${account.code} - ${account.name}</td>
          <td class="amount">${window.DataUtils.formatCurrency(balance)}</td>
        </tr>
      `;
    });

    liabilitiesHTML += `
      <tr class="total">
        <td><strong>Total Liabilities</strong></td>
        <td class="amount"><strong>${window.DataUtils.formatCurrency(totalLiabilities)}</strong></td>
      </tr>
    </tbody></table>`;
    liabilitiesSection.innerHTML = liabilitiesHTML;

    // Build Equity section
    const equitySection = document.getElementById('equity-section');
    let equityHTML = '<h3>EQUITY</h3><table class="report-table"><tbody>';

    const equityAccounts = coa.filter(a => a.type === 'equity');
    equityAccounts.forEach(account => {
      const balance = Math.abs(parseFloat(account.balance) || 0);
      equityHTML += `
        <tr>
          <td>${account.code} - ${account.name}</td>
          <td class="amount">${window.DataUtils.formatCurrency(balance)}</td>
        </tr>
      `;
    });

    equityHTML += `
      <tr class="total">
        <td><strong>Total Equity</strong></td>
        <td class="amount"><strong>${window.DataUtils.formatCurrency(totalEquity)}</strong></td>
      </tr>
    </tbody></table>`;
    equitySection.innerHTML = equityHTML;

    // Calculate and display the accounting equation check
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const balanced = Math.abs(totalAssets - totalLiabilitiesAndEquity) < 0.01;

    console.log(balanced ? '✅ Balance Sheet is balanced' : '⚠️ Balance Sheet not in balance', {
      totalAssets,
      totalLiabilitiesAndEquity,
      difference: totalAssets - totalLiabilitiesAndEquity
    });

  } catch (error) {
    console.error('❌ Failed to generate Balance Sheet:', error);
    console.error(error.stack);
  }
}

async function initCashFlow() {
  console.log('🚀 Initializing Cash Flow Statement (using COA balances)...');

  try {
    // Use AccountBalances service
    if (!window.AccountBalances) {
      console.error('❌ AccountBalances service not available');
      return;
    }

    const balancesByType = window.AccountBalances.getBalancesByType();
    const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');
    const transactions = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');

    // Calculate Cash Flow from Operations (simplified indirect method)
    const netIncome = (balancesByType.Revenue || 0) - (balancesByType.Expense || 0);

    // Operating Activities
    const operatingCashFlow = netIncome; // Simplified: In full implementation, adjust for non-cash items

    // Investing Activities (Asset changes excluding cash)
    const assetAccounts = coa.filter(a => a.type === 'asset' && !a.name.toLowerCase().includes('cash'));
    const investingCashFlow = -Math.abs(assetAccounts.reduce((sum, acc) => sum + (parseFloat(acc.balance) || 0), 0) * 0.1); // Simplified

    // Financing Activities (Liability + Equity changes)
    const liabilityChanges = balancesByType.Liability || 0;
    const equityChanges = balancesByType.Equity || 0;
    const financingCashFlow = (liabilityChanges + equityChanges) * 0.05; // Simplified

    const netCashFlow = operatingCashFlow + investingCashFlow + financingCashFlow;

    // Get cash account balances
    const cashAccounts = coa.filter(a =>
      a.type === 'asset' && (
        a.name.toLowerCase().includes('cash') ||
        a.name.toLowerCase().includes('checking') ||
        a.name.toLowerCase().includes('bank')
      )
    );
    const totalCash = cashAccounts.reduce((sum, acc) => sum + Math.abs(parseFloat(acc.balance) || 0), 0);

    console.log('💰 Cash Flow:', { operatingCashFlow, investingCashFlow, financingCashFlow, netCashFlow, totalCash });

    // Render Chart
    const ctx = document.getElementById('cash-flow-chart');
    if (ctx && typeof Chart !== 'undefined') {
      // Destroy existing chart
      const existingChart = Chart.getChart(ctx);
      if (existingChart) {
        existingChart.destroy();
      }

      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Operating', 'Investing', 'Financing', 'Net Change'],
          datasets: [{
            label: 'Cash Flow ($)',
            data: [operatingCashFlow, investingCashFlow, financingCashFlow, netCashFlow],
            backgroundColor: [
              operatingCashFlow >= 0 ? '#10b981' : '#ef4444',
              investingCashFlow >= 0 ? '#10b981' : '#ef4444',
              financingCashFlow >= 0 ? '#10b981' : '#ef4444',
              netCashFlow >= 0 ? '#3b82f6' : '#f59e0b'
            ]
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function (value) {
                  return '$' + value.toLocaleString();
                }
              }
            }
          }
        }
      });
    }

    // Build Table
    const tableBody = document.getElementById('cash-flow-table-body');

    let html = `
      <tr class="section-header"><td colspan="2"><strong>OPERATING ACTIVITIES</strong></td></tr>
      <tr>
        <td style="padding-left: 20px;">Net Income</td>
        <td class="amount">${window.DataUtils.formatCurrency(netIncome)}</td>
      </tr>
      <tr class="subtotal">
        <td><strong>Net Cash from Operations</strong></td>
        <td class="amount"><strong>${window.DataUtils.formatCurrency(operatingCashFlow)}</strong></td>
      </tr>
      
      <tr class="section-header"><td colspan="2"><strong>INVESTING ACTIVITIES</strong></td></tr>
    `;

    // Show asset purchases/sales
    assetAccounts.slice(0, 3).forEach(acc => {
      const balance = parseFloat(acc.balance) || 0;
      if (Math.abs(balance) > 0) {
        html += `
          <tr>
            <td style="padding-left: 20px;">${acc.name}</td>
            <td class="amount">${window.DataUtils.formatCurrency(-Math.abs(balance) * 0.1)}</td>
          </tr>
        `;
      }
    });

    html += `
      <tr class="subtotal">
        <td><strong>Net Cash from Investing</strong></td>
        <td class="amount"><strong>${window.DataUtils.formatCurrency(investingCashFlow)}</strong></td>
      </tr>
      
      <tr class="section-header"><td colspan="2"><strong>FINANCING ACTIVITIES</strong></td></tr>
      <tr>
        <td style="padding-left: 20px;">Borrowings / Equity</td>
        <td class="amount">${window.DataUtils.formatCurrency(financingCashFlow)}</td>
      </tr>
      <tr class="subtotal">
        <td><strong>Net Cash from Financing</strong></td>
        <td class="amount"><strong>${window.DataUtils.formatCurrency(financingCashFlow)}</strong></td>
      </tr>
      
      <tr class="total" style="border-top: 2px solid #cbd5e1;">
        <td><strong>NET CHANGE IN CASH</strong></td>
        <td class="amount" style="color: ${netCashFlow >= 0 ? '#10b981' : '#ef4444'}">
          <strong>${window.DataUtils.formatCurrency(netCashFlow)}</strong>
        </td>
      </tr>
      <tr>
        <td>Cash at End of Period</td>
        <td class="amount"><strong>${window.DataUtils.formatCurrency(totalCash)}</strong></td>
      </tr>
    `;

    tableBody.innerHTML = html;

  } catch (error) {
    console.error('❌ Failed to generate Cash Flow Statement:', error);
    console.error(error.stack);
  }
}

async function initVendorAnalysis() {
  console.log('🚀 Initializing Vendor Analysis...');

  try {
    const vendors = await window.storage.getVendors();

    // Sort by total spent
    const sorted = vendors.sort((a, b) => (b.totalSpent || 0) - (a.totalSpent || 0)).slice(0, 10);

    // Render chart
    const ctx = document.getElementById('vendor-spending-chart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: sorted.map(v => v.name),
          datasets: [{
            label: 'Total Spent ($)',
            data: sorted.map(v => v.totalSpent || 0),
            backgroundColor: '#ef4444'
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            legend: { display: false }
          }
        }
      });
    }

    // Build table
    const tableBody = document.getElementById('vendor-table-body');
    tableBody.innerHTML = sorted.map(v => `
      <tr>
        <td><a href="#/vendors/${v.id}">${v.name}</a></td>
        <td class="amount">${window.DataUtils.formatCurrency(v.totalSpent || 0)}</td>
        <td class="count">${v.transactionCount || 0}</td>
        <td class="amount">${window.DataUtils.formatCurrency((v.totalSpent || 0) / (v.transactionCount || 1))}</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Failed to generate Vendor Analysis:', error);
  }
}

async function initAccountSummary() {
  console.log('🚀 Initializing Account Summary (using COA balances)...');

  try {
    const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');

    const tableBody = document.getElementById('account-summary-body');
    tableBody.innerHTML = coa.map(account => `
      <tr>
        <td><a href="#/accounts">${account.code} - ${account.name}</a></td>
        <td>${account.type ? account.type.charAt(0).toUpperCase() + account.type.slice(1) : 'N/A'}</td>
        <td class="amount">${window.DataUtils.formatCurrency(Math.abs(parseFloat(account.balance) || 0))}</td>
        <td class="count">${account.transactionCount || 0}</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('❌ Failed to generate Account Summary:', error);
    console.error(error.stack);
  }
}

function initCustomReportBuilder() {
  console.log('🚀 Initializing Custom Report Builder...');
}

function generateCustomReport() {
  alert('Custom report generation coming soon!');
}

function exportReport(format) {
  if (format === 'pdf') {
    alert('PDF export coming soon!');
  } else if (format === 'csv') {
    alert('CSV export coming soon!');
  }
}

// ==================================================
// DATE RANGE UTILITIES
// ==================================================

/**
 * Get date range based on period string
 * @param {string} period - 'this-month', 'last-month', 'this-quarter', 'this-year', 'all'
 * @returns {Object} - {startDate, endDate} as Date objects
 */
window.getDateRange = function (period) {
  const now = new Date();
  let startDate, endDate;

  switch (period) {
    case 'this-month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // Last day of month
      break;

    case 'last-month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0);
      break;

    case 'this-quarter':
      const quarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), quarter * 3, 1);
      endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
      break;

    case 'this-year':
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31);
      break;

    case 'all':
    default:
      startDate = new Date(2000, 0, 1); // Far enough back
      endDate = now;
      break;
  }

  return { startDate, endDate };
};

/**
 * Filter transactions by date range
 * @param {Array} transactions 
 * @param {string} period 
 * @returns {Array} Filtered transactions
 */
window.filterTransactionsByPeriod = function (transactions, period) {
  const { startDate, endDate } = window.getDateRange(period);
  return transactions.filter(t => {
    const txnDate = new Date(t.date);
    return txnDate >= startDate && txnDate <= endDate;
  });
};

// ==================================================
// EXPORT UTILITIES
// ==================================================

window.exportReport = function (format) {
  console.log(`📤 Exporting report as ${format.toUpperCase()}...`);
  if (window.showToast) {
    window.showToast(`Export to ${format.toUpperCase()} coming soon!`, 'info');
  }
  // TODO: Implement PDF/CSV export functionality
};

// ==================================================
// REFRESH FUNCTIONS
// ==================================================

function refreshProfitLoss() {
  initProfitLoss();
}

function refreshBalanceSheet() {
  initBalanceSheet();
}

function refreshCashFlow() {
  initCashFlow();
}

function refreshVendorAnalysis() {
  initVendorAnalysis();
}

function refreshAccountSummary() {
  initAccountSummary();
}

function updateDateRange() {
  //Global date range update
  console.log('Date range updated');
}

