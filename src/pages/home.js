/**
 * Home/Dashboard Page
 */

window.renderHome = function () {
  return `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Welcome to AutoBookkeeping v3.0</h1>
        <p class="page-subtitle">Your intelligent bookkeeping assistant</p>
      </div>
      
      <div class="dashboard-grid">
        <div class="card stat-card">
          <div class="stat-icon">💰</div>
          <h3>Total Transactions</h3>
          <p class="stat-value">0</p>
          <a href="#/transactions" class="stat-link">View all →</a>
        </div>
        
        <div class="card stat-card">
          <div class="stat-icon">🏢</div>
          <h3>Vendors</h3>
          <p class="stat-value">0</p>
          <a href="#/vendors" class="stat-link">Manage →</a>
        </div>
        
        <div class="card stat-card">
          <div class="stat-icon">📊</div>
          <h3>Accounts</h3>
          <p class="stat-value">0</p>
          <a href="#/accounts" class="stat-link">View chart →</a>
        </div>
        
        <div class="card stat-card">
          <div class="stat-icon">📈</div>
          <h3>Reports</h3>
          <p class="stat-value">Ready</p>
          <a href="#/reports" class="stat-link">Generate →</a>
        </div>
      </div>
      
      <div class="card quick-actions">
        <h2>Quick Actions</h2>
        <div class="action-buttons">
          <button class="btn-primary">📥 Import Transactions</button>
          <button class="btn-secondary">➕ Add Vendor</button>
          <button class="btn-secondary">📋 Create Rule</button>
        </div>
      </div>
    </div>
  `;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
