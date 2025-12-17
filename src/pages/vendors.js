/**
 * Vendors List Page
 */

window.renderVendors = function () {
  return `
    <div class="page">
      <div class="page-header">
        <h1 class="page-title">Vendors</h1>
        <div class="page-actions">
          <button class="btn-secondary">📥 Import</button>
          <button class="btn-primary">➕ Add Vendor</button>
        </div>
      </div>
      
      <div class="card">
        <div class="table-toolbar">
          <input type="search" placeholder="Search vendors..." class="search-input">
          <select class="filter-select">
            <option>All Status</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>
        
        <div class="grid-placeholder">
          <div class="placeholder-icon">🏢</div>
          <p><strong>Vendor Grid will be here</strong></p>
          <p>Click any vendor to view details</p>
          <br>
          <p class="text-secondary">Try: <a href="#/vendors/demo-123">View Demo Vendor</a></p>
        </div>
      </div>
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
