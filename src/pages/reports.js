/**
 * Reports Dashboard Page
 */

window.renderReports = function () {
  return `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Reports</h1>
      </div>
      
      <div class="report-grid">
        <div class="card report-card">
          <div class="report-icon">📊</div>
          <h3>Profit & Loss</h3>
          <p>Income and expenses summary</p>
          <button class="btn-secondary">Generate →</button>
        </div>
        
        <div class="card report-card">
          <div class="report-icon">💰</div>
          <h3>Balance Sheet</h3>
          <p>Assets, liabilities, and equity</p>
          <button class="btn-secondary">Generate →</button>
        </div>
        
        <div class="card report-card">
          <div class="report-icon">📈</div>
          <h3>Cash Flow</h3>
          <p>Cash movements over time</p>
          <button class="btn-secondary">Generate →</button>
        </div>
        
        <div class="card report-card">
          <div class="report-icon">🏢</div>
          <h3>Vendor Summary</h3>
          <p>Spending by vendor</p>
          <button class="btn-secondary">Generate →</button>
        </div>
        
        <div class="card report-card">
          <div class="report-icon">📋</div>
          <h3>Account Activity</h3>
          <p>Transactions by account</p>
          <button class="btn-secondary">Generate →</button>
        </div>
        
        <div class="card report-card">
          <div class="report-icon">📅</div>
          <h3>Custom Report</h3>
          <p>Build your own report</p>
          <button class="btn-primary">Create →</button>
        </div>
      </div>
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
