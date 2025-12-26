/**
 * Account Detail Page
 */

window.renderAccountDetail = function (params) {
  const accountId = params.accountId || 'unknown';

  return `
    <div class="page">
      <div class="page-header">
        <div class="header-with-back">
          <button onclick="router.navigate('/accounts')" class="btn-back">← Back to Accounts</button>
          <h1 class="page-title">Account Details</h1>
        </div>
        <div class="page-actions">
          <button class="btn-secondary">✏️ Edit</button>
        </div>
      </div>
      
      <div class="detail-grid">
        <div class="card">
          <h2>Account Information</h2>
          <dl class="detail-list">
            <dt>Account Number:</dt>
            <dd><code>${accountId}</code></dd>
            
            <dt>Name:</dt>
            <dd>Sample Account</dd>
            
            <dt>Type:</dt>
            <dd>Expense</dd>
            
            <dt>Parent Account:</dt>
            <dd>Operating Expenses</dd>
            
            <dt>Status:</dt>
            <dd><span class="badge badge-success">Active</span></dd>
          </dl>
        </div>
        
        <div class="card">
          <h2>Balance Information</h2>
          <dl class="detail-list">
            <dt>Current Balance:</dt>
            <dd class="stat-value">$0.00</dd>
            
            <dt>MTD Activity:</dt>
            <dd>$0.00</dd>
            
            <dt>YTD Activity:</dt>
            <dd>$0.00</dd>
          </dl>
        </div>
      </div>
      
      <div class="card">
        <h2>Transaction History</h2>
        <div class="grid-placeholder small">
          <p>Transactions for this account will appear here</p>
        </div>
      </div>
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
