/**
 * Vendor Detail Page
 */

window.renderVendorDetail = function (params) {
  const vendorId = params.vendorId || 'unknown';

  return `
    <div class="page">
      <div class="page-header">
        <div class="header-with-back">
          <button onclick="router.navigate('/vendors')" class="btn-back">← Back to Vendors</button>
          <h1 class="page-title">Vendor Details</h1>
        </div>
        <div class="page-actions">
          <button class="btn-secondary">✏️ Edit</button>
          <button class="btn-danger">🗑️ Delete</button>
        </div>
      </div>
      
      <div class="detail-grid">
        <div class="card">
          <h2>Vendor Information</h2>
          <dl class="detail-list">
            <dt>Vendor ID:</dt>
            <dd><code>${vendorId}</code></dd>
            
            <dt>Name:</dt>
            <dd>Sample Vendor Corp</dd>
            
            <dt>Status:</dt>
            <dd><span class="badge badge-success">Active</span></dd>
            
            <dt>Category:</dt>
            <dd>Office Supplies</dd>
            
            <dt>Payment Terms:</dt>
            <dd>Net 30</dd>
          </dl>
        </div>
        
        <div class="card">
          <h2>Statistics</h2>
          <dl class="detail-list">
            <dt>Total Transactions:</dt>
            <dd>0</dd>
            
            <dt>Total Spent:</dt>
            <dd>$0.00</dd>
            
            <dt>Last Transaction:</dt>
            <dd>Never</dd>
            
            <dt>Default Account:</dt>
            <dd>None set</dd>
          </dl>
        </div>
      </div>
      
      <div class="card">
        <h2>Recent Transactions</h2>
        <div class="grid-placeholder small">
          <p>Transaction history will appear here</p>
        </div>
      </div>
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
