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
  console.log('🚀 Initializing Profit & Loss Report...');

  try {
    // Use aggregated data
    let transactions = [];
    if (window.reportDataManager) {
      transactions = await window.reportDataManager.getAllTransactions();
    } else {
      transactions = await window.storage.getTransactions();
    }
    const accounts = await window.storage.getAccounts();

    // Filter by date range
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const filtered = transactions.filter(t => new Date(t.date) >= firstOfMonth);

    // Calculate revenue and expenses
    const revenue = filtered.filter(t => t.type === 'credit');
    const expenses = filtered.filter(t => t.type === 'debit');

    const totalRevenue = revenue.reduce((sum, t) => sum + t.amount, 0);
    const totalExpenses = expenses.reduce((sum, t) => sum + t.amount, 0);

    // Render chart
    const ctx = document.getElementById('pl-chart');
    if (ctx && typeof Chart !== 'undefined') {
      new Chart(ctx, {
        type: 'bar',
        data: {
          labels: ['Revenue', 'Expenses', 'Net Profit'],
          datasets: [{
            label: 'Amount ($)',
            data: [totalRevenue, totalExpenses, totalRevenue - totalExpenses],
            backgroundColor: ['#10b981', '#ef4444', totalRevenue - totalExpenses >= 0 ? '#10b981' : '#ef4444']
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: {
              beginAtZero: true
            }
          }
        }
      });
    }

    // Build table
    const tableBody = document.getElementById('pl-table-body');
    const tableFooter = document.getElementById('pl-table-footer');

    let html = '<tr class="section-header"><td colspan="3"><strong>REVENUE</strong></td></tr>';

    // Group revenue by account
    const revenueByAccount = {};
    revenue.forEach(t => {
      const account = accounts.find(a => a.id === t.accountId);
      const name = account ? account.name : 'Uncategorized';
      revenueByAccount[name] = (revenueByAccount[name] || 0) + t.amount;
    });

    Object.entries(revenueByAccount).forEach(([name, amount]) => {
      const pct = ((amount / totalRevenue) * 100).toFixed(1);
      html += `
        <tr>
          <td>${name}</td>
          <td class="amount">${window.DataUtils.formatCurrency(amount)}</td>
          <td class="percentage">${pct}%</td>
        </tr>
      `;
    });

    html += `<tr class="subtotal"><td><strong>Total Revenue</strong></td><td class="amount"><strong>${window.DataUtils.formatCurrency(totalRevenue)}</strong></td><td></td></tr>`;

    html += '<tr class="section-header"><td colspan="3"><strong>EXPENSES</strong></td></tr>';

    // Group expenses by account
    const expensesByAccount = {};
    expenses.forEach(t => {
      const account = accounts.find(a => a.id === t.accountId);
      const name = account ? account.name : 'Uncategorized';
      expensesByAccount[name] = (expensesByAccount[name] || 0) + t.amount;
    });

    Object.entries(expensesByAccount).forEach(([name, amount]) => {
      const pct = ((amount / totalExpenses) * 100).toFixed(1);
      html += `
        <tr>
          <td>${name}</td>
          <td class="amount">${window.DataUtils.formatCurrency(amount)}</td>
          <td class="percentage">${pct}%</td>
        </tr>
      `;
    });

    html += `<tr class="subtotal"><td><strong>Total Expenses</strong></td><td class="amount"><strong>${window.DataUtils.formatCurrency(totalExpenses)}</strong></td><td></td></tr>`;

    tableBody.innerHTML = html;

    const netProfit = totalRevenue - totalExpenses;
    tableFooter.innerHTML = `
      <tr class="total">
        <td><strong>NET PROFIT</strong></td>
        <td class="amount" style="color: ${netProfit >= 0 ? '#10b981' : '#ef4444'}"><strong>${window.DataUtils.formatCurrency(netProfit)}</strong></td>
        <td></td>
      </tr>
    `;

  } catch (error) {
    console.error('Failed to generate Profit & Loss:', error);
  }
}

async function initBalanceSheet() {
  console.log('🚀 Initializing Balance Sheet...');
  // Balance sheet logic placeholder
  document.getElementById('assets-section').innerHTML = '<p class="empty-message">Balance Sheet coming soon!</p>';
}

async function initCashFlow() {
  console.log('🚀 Initializing Cash Flow...');
  // Cash flow logic placeholder
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
  console.log('🚀 Initializing Account Summary...');

  try {
    const accounts = await window.storage.getAccounts();

    const tableBody = document.getElementById('account-summary-body');
    tableBody.innerHTML = accounts.map(a => `
      <tr>
        <td><a href="#/accounts">${a.accountNumber} - ${a.name}</a></td>
        <td>${a.type}</td>
        <td class="amount">${window.DataUtils.formatCurrency(a.currentBalance || 0)}</td>
        <td class="count">-</td>
      </tr>
    `).join('');

  } catch (error) {
    console.error('Failed to generate Account Summary:', error);
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
  // Global date range update
  console.log('Date range updated');
}
