/**
 * Transactions Page
 */

window.renderTransactions = function () {
  return `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Transactions</h1>
        <div class="page-actions">
          <button class="btn-secondary">📥 Import CSV</button>
          <button class="btn-primary">➕ Add Transaction</button>
        </div>
      </div>
      
      <div class="card">
        <div class="table-toolbar">
          <input type="search" placeholder="Search transactions..." class="search-input">
          <select class="filter-select">
            <option>All Categories</option>
            <option>Income</option>
            <option>Expenses</option>
          </select>
        </div>
        
        <div class="grid-placeholder">
          <div class="placeholder-icon">💳</div>
          <p><strong>AG Grid will be integrated here</strong></p>
          <p>Transaction list with sorting, filtering, and inline editing</p>
        </div>
      </div>
    </div>
  `;
}
