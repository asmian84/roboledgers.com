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
