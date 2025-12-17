/**
 * Settings Page with Tabs
 */

window.renderSettings = function (params) {
  const currentTab = params.tab || 'general';

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️', path: '/settings' },
    { id: 'appearance', label: 'Appearance', icon: '🎨', path: '/settings/appearance' },
    { id: 'data', label: 'Data & Files', icon: '💾', path: '/settings/data' },
    { id: 'subscription', label: 'Subscription', icon: '💳', path: '/settings/subscription' },
    { id: 'about', label: 'About', icon: 'ℹ️', path: '/settings/about' }
  ];

  const tabsHtml = tabs.map(tab => {
    const isActive = (currentTab === tab.id || (currentTab === 'general' && tab.id === 'general'));
    return `
      <a href="#${tab.path}" class="settings-tab ${isActive ? 'active' : ''}">
        <span class="tab-icon">${tab.icon}</span>
        <span class="tab-label">${tab.label}</span>
      </a>
    `;
  }).join('');

  let contentHtml = '';

  switch (currentTab) {
    case 'appearance':
      contentHtml = renderAppearance();
      break;
    case 'data':
      contentHtml = renderData();
      break;
    case 'subscription':
      contentHtml = renderSubscription();
      break;
    case 'about':
      contentHtml = renderAbout();
      break;
    default:
      contentHtml = renderGeneral();
  }

  return `
    <div class="page settings-page">
      <div class="page-header">
        <h1 class="page-title">Settings</h1>
      </div>
      
      <div class="settings-container">
        <div class="settings-tabs">
          ${tabsHtml}
        </div>
        
        <div class="settings-content">
          ${contentHtml}
        </div>
      </div>
    </div>
  `;
}

function renderGeneral() {
  return `
    <div class="card">
      <h2>General Settings</h2>
      
      <div class="form-group">
        <label>Company Name</label>
        <input type="text" class="form-input" placeholder="Your Company Name">
      </div>
      
      <div class="form-group">
        <label>Fiscal Year Start</label>
        <select class="form-select">
          <option>January</option>
          <option>February</option>
          <option>March</option>
          <option>April</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Default Currency</label>
        <select class="form-select">
          <option>USD - US Dollar</option>
          <option>EUR - Euro</option>
          <option>GBP - British Pound</option>
        </select>
      </div>
      
      <button class="btn-primary">Save Changes</button>
    </div>
  `;
}

function renderAppearance() {
  return `
    <div class="card">
      <h2>Appearance</h2>
      
      <div class="form-group">
        <label>Theme</label>
        <select class="form-select" onchange="document.documentElement.setAttribute('data-theme', this.value)">
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto (System)</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Sidebar Width</label>
        <input type="range" min="200" max="300" value="260" class="form-range">
        <span class="range-value">260px</span>
      </div>
      
      <div class="form-group">
        <label>Compact Mode</label>
        <input type="checkbox" class="form-checkbox">
        <span>Use compact layout</span>
      </div>
      
      <button class="btn-primary">Save Changes</button>
    </div>
  `;
}

function renderData() {
  return `
    <div class="card">
      <h2>Data & Files</h2>
      
      <div class="data-actions">
        <div class="action-item">
          <div>
            <h3>Export Data</h3>
            <p>Download all your data as CSV</p>
          </div>
          <button class="btn-secondary">📥 Export</button>
        </div>
        
        <div class="action-item">
          <div>
            <h3>Import Data</h3>
            <p>Import transactions from CSV file</p>
          </div>
          <button class="btn-secondary">📤 Import</button>
        </div>
        
        <div class="action-item">
          <div>
            <h3>Backup</h3>
            <p>Create a backup of your database</p>
          </div>
          <button class="btn-secondary">💾 Backup</button>
        </div>
        
        <div class="action-item danger">
          <div>
            <h3>Clear All Data</h3>
            <p class="text-danger">Permanently delete all data</p>
          </div>
          <button class="btn-danger">🗑️ Clear</button>
        </div>
      </div>
    </div>
  `;
}

function renderSubscription() {
  return `
    <div class="card">
      <h2>Subscription</h2>
      
      <div class="subscription-status">
        <div class="plan-badge">Free Plan</div>
        <h3>AutoBookkeeping Free</h3>
        <p>Perfect for getting started</p>
      </div>
      
      <div class="plan-features">
        <h4>Included Features:</h4>
        <ul>
          <li>✅ Up to 100 transactions/month</li>
          <li>✅ Basic reports</li>
          <li>✅ CSV import/export</li>
          <li>❌ Advanced automation rules</li>
          <li>❌ Priority support</li>
        </ul>
      </div>
      
      <button class="btn-primary">Upgrade to Pro</button>
    </div>
  `;
}

function renderAbout() {
  return `
    <div class="card">
      <h2>About AutoBookkeeping</h2>
      
      <div class="about-info">
        <div class="app-logo">💼</div>
        <h3>AutoBookkeeping v3.0</h3>
        <p>Route-First Architecture</p>
        
        <dl class="detail-list">
          <dt>Version:</dt>
          <dd>3.0.0</dd>
          
          <dt>Build:</dt>
          <dd>2025.12.17</dd>
          
          <dt>License:</dt>
          <dd>MIT</dd>
          
          <dt>Size:</dt>
          <dd>~25KB (core foundation)</dd>
        </dl>
        
        <div class="about-links">
          <a href="#" class="link">📚 Documentation</a>
          <a href="#" class="link">🐛 Report Issue</a>
          <a href="#" class="link">💡 Request Feature</a>
        </div>
      </div>
    </div>
  `;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
