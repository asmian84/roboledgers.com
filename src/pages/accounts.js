/**
 * Chart of Accounts Page
 */

window.renderAccounts = function () {
  return `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Chart of Accounts</h1>
        <div class="page-actions">
          <button class="btn-primary">➕ Add Account</button>
        </div>
      </div>
      
      <div class="card">
        <div class="table-toolbar">
          <input type="search" placeholder="Search accounts..." class="search-input">
          <select class="filter-select">
            <option>All Types</option>
            <option>Assets</option>
            <option>Liabilities</option>
            <option>Equity</option>
            <option>Revenue</option>
            <option>Expenses</option>
          </select>
        </div>
        
        <div class="grid-placeholder">
          <div class="placeholder-icon">📊</div>
          <p><strong>Account hierarchy will be here</strong></p>
          <p>Tree view with parent-child relationships</p>
        </div>
      </div>
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
