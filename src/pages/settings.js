/**
 * Settings Page - Nested Route-Based System
 */

window.renderSettings = function (params) {
  const panel = params?.panel || 'general';

  return `
    <div class="settings-page">
      <!-- Settings Navigation (Left Sidebar) -->
      <nav class="settings-nav">
        <a href="#/settings" class="settings-nav-item ${panel === 'general' ? 'active' : ''}">
          <i class="icon">⚙️</i>
          <div>
            <div class="nav-title">General</div>
            <div class="nav-desc">Company & preferences</div>
          </div>
        </a>
        
        <a href="#/settings/appearance" class="settings-nav-item ${panel === 'appearance' ? 'active' : ''}">
          <i class="icon">🎨</i>
          <div>
            <div class="nav-title">Appearance</div>
            <div class="nav-desc">Themes & display</div>
          </div>
        </a>
        
        <a href="#/settings/data" class="settings-nav-item ${panel === 'data' ? 'active' : ''}">
          <i class="icon">💾</i>
          <div>
            <div class="nav-title">Data</div>
            <div class="nav-desc">Import, export & backup</div>
          </div>
        </a>
        
        <a href="#/settings/integrations" class="settings-nav-item ${panel === 'integrations' ? 'active' : ''}">
          <i class="icon">🔗</i>
          <div>
            <div class="nav-title">Integrations</div>
            <div class="nav-desc">Bank & API connections</div>
          </div>
        </a>
        
        <a href="#/settings/subscription" class="settings-nav-item ${panel === 'subscription' ? 'active' : ''}">
          <i class="icon">💳</i>
          <div>
            <div class="nav-title">Subscription</div>
            <div class="nav-desc">Billing & plan</div>
          </div>
        </a>
        
        <a href="#/settings/about" class="settings-nav-item ${panel === 'about' ? 'active' : ''}">
          <i class="icon">ℹ️</i>
          <div>
            <div class="nav-title">About</div>
            <div class="nav-desc">Version & system info</div>
          </div>
        </a>
      </nav>

      <!-- Settings Content Panel -->
      <div class="settings-content">
        ${renderSettingsPanel(panel)}
      </div>
    </div>
    
    <script>
      if (typeof initSettingsPage === 'function') {
        setTimeout(() => initSettingsPage('${panel}'), 100);
      }
    </script>
  `;
};

function renderSettingsPanel(panel) {
  switch (panel) {
    case 'general':
      return renderGeneralPanel();
    case 'appearance':
      return renderAppearancePanel();
    case 'data':
      return renderDataPanel();
    case 'integrations':
      return renderIntegrationsPanel();
    case 'subscription':
      return renderSubscriptionPanel();
    case 'about':
      return renderAboutPanel();
    default:
      return renderGeneralPanel();
  }
}

// ==================================================
// GENERAL PANEL
// ==================================================

function renderGeneralPanel() {
  return `
    <div class="settings-panel">
      <h2>General Settings</h2>
      <p class="panel-description">Configure your company information and application preferences</p>
      
      <form id="general-settings-form" onsubmit="saveGeneralSettings(event)">
        <div class="form-section">
          <h3>Company Information</h3>
          
          <div class="form-group">
            <label>Company Name</label>
            <input type="text" id="company-name" placeholder="My Business Inc">
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>Fiscal Year End</label>
              <select id="fiscal-year-end">
                <option value="12-31">December 31</option>
                <option value="06-30">June 30</option>
                <option value="03-31">March 31</option>
                <option value="09-30">September 30</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Currency</label>
              <select id="currency">
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
                <option value="CAD">CAD ($)</option>
              </select>
            </div>
          </div>
        </div>
        
        <div class="form-section">
          <h3>Preferences</h3>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="auto-save">
              <span>Auto-save changes</span>
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label">
              <input type="checkbox" id="show-hints">
              <span>Show helpful hints</span>
            </label>
          </div>
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn-primary">💾 Save Changes</button>
        </div>
      </form>
    </div>
  `;
}

// ==================================================
// APPEARANCE PANEL
// ==================================================

function renderAppearancePanel() {
  return `
    <div class="settings-panel">
      <h2>Appearance</h2>
      <p class="panel-description">Customize the look and feel of your application</p>
      
      <div class="form-section">
        <h3>Theme Selection (Arctic Dawn Collection)</h3>
        
        <div class="theme-grid">
          <!-- 1. Arctic Dawn -->
          <div class="theme-card" data-theme="arctic-dawn" onclick="applyTheme('arctic-dawn')">
            <div class="theme-preview" style="background: linear-gradient(120deg, #f0f9ff, #cbebff);">
              <div class="preview-content"></div>
            </div>
            <div class="theme-name">Arctic Dawn</div>
            <div class="theme-desc">Soft morning light</div>
            <button class="btn-apply" onclick="applyTheme('arctic-dawn'); event.stopPropagation();">Apply</button>
          </div>
          
          <!-- 2. Polar Night -->
          <div class="theme-card" data-theme="polar-night" onclick="applyTheme('polar-night')">
            <div class="theme-preview" style="background: linear-gradient(180deg, #0f172a, #1e293b);">
              <div class="preview-content"></div>
            </div>
            <div class="theme-name">Polar Night</div>
            <div class="theme-desc">Dark navy professional</div>
            <button class="btn-apply" onclick="applyTheme('polar-night'); event.stopPropagation();">Apply</button>
          </div>
          
          <!-- 3. Glacial Ice -->
          <div class="theme-card" data-theme="glacial-ice" onclick="applyTheme('glacial-ice')">
            <div class="theme-preview" style="background: linear-gradient(135deg, #e0f2fe, #f0fdf4);">
              <div class="preview-content"></div>
            </div>
            <div class="theme-name">Glacial Ice</div>
            <div class="theme-desc">Crisp teal & white</div>
            <button class="btn-apply" onclick="applyTheme('glacial-ice'); event.stopPropagation();">Apply</button>
          </div>
          
          <!-- 4. Aurora -->
          <div class="theme-card" data-theme="aurora" onclick="applyTheme('aurora')">
            <div class="theme-preview" style="background: linear-gradient(45deg, #d8b4fe, #818cf8, #2dd4bf);">
              <div class="preview-content"></div>
            </div>
            <div class="theme-name">Aurora</div>
            <div class="theme-desc">Soft northern lights</div>
            <button class="btn-apply" onclick="applyTheme('aurora'); event.stopPropagation();">Apply</button>
          </div>
          
          <!-- 5. Tundra -->
          <div class="theme-card" data-theme="tundra" onclick="applyTheme('tundra')">
            <div class="theme-preview" style="background: linear-gradient(to right, #e2e8f0, #cbd5e1);">
              <div class="preview-content"></div>
            </div>
            <div class="theme-name">Tundra</div>
            <div class="theme-desc">Muted elegant grey</div>
            <button class="btn-apply" onclick="applyTheme('tundra'); event.stopPropagation();">Apply</button>
          </div>
          
          <!-- 6. Frostbite -->
          <div class="theme-card" data-theme="frostbite" onclick="applyTheme('frostbite')">
            <div class="theme-preview" style="background: linear-gradient(135deg, #f8fafc, #e2e8f0);">
              <div class="preview-content"></div>
            </div>
            <div class="theme-name">Frostbite</div>
            <div class="theme-desc">Sharp silver & blue</div>
            <button class="btn-apply" onclick="applyTheme('frostbite'); event.stopPropagation();">Apply</button>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Display Options</h3>
        
        <div class="form-group">
          <label>Font Size</label>
          <select id="font-size">
            <option value="small">Small</option>
            <option value="medium" selected>Medium</option>
            <option value="large">Large</option>
          </select>
        </div>
        
        <div class="form-group">
          <label class="checkbox-label">
            <input type="checkbox" id="compact-mode">
            <span>Compact mode (reduce spacing)</span>
          </label>
        </div>
      </div>
    </div>
  `;
}

// ==================================================
// DATA PANEL
// ==================================================

function renderDataPanel() {
  return `
    <div class="settings-panel">
      <h2>Data Management</h2>
      <p class="panel-description">Import, export, and manage your financial data</p>
      
      <div class="form-section">
        <h3>📦 Data Migration</h3>
        
        <div class="export-options">
          <button class="btn-export" onclick="if(window.DataMigration) DataMigration.runFullMigration().then(r => alert(r.success ? '✅ Migration complete!' : '❌ Migration failed')); else alert('Migration tool not loaded');">
            <span class="export-icon">🚀</span>
            <div>
              <div class="export-title">Migrate from Old System</div>
              <div class="export-desc">Import vendors, COA, and transactions</div>
            </div>
          </button>
          
          <button class="btn-export" onclick="if(window.DataMigration) DataMigration.exportV3Data(); else alert('Migration tool not loaded');">
            <span class="export-icon">💾</span>
            <div>
              <div class="export-title">Backup v3 Data</div>
              <div class="export-desc">Export all v3 data as JSON</div>
            </div>
          </button>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Export Data</h3>
        
        <div class="export-options">
          <button class="btn-export" onclick="exportAllData('json')">
            <span class="export-icon">📄</span>
            <div>
              <div class="export-title">Export as JSON</div>
              <div class="export-desc">Complete database backup</div>
            </div>
          </button>
          
          <button class="btn-export" onclick="exportAllData('csv')">
            <span class="export-icon">📊</span>
            <div>
              <div class="export-title">Export as CSV</div>
              <div class="export-desc">Transactions only</div>
            </div>
          </button>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Import Data</h3>
        
        <div class="import-zone">
          <input type="file" id="data-import-file" accept=".json,.csv" style="display: none" onchange="handleDataImport(event)">
          <button class="btn-secondary" onclick="document.getElementById('data-import-file').click()">
            📥 Choose File to Import
          </button>
          <p class="import-hint">Supports JSON (full backup) or CSV (transactions)</p>
        </div>
      </div>
      
      <div class="form-section danger-zone">
        <h3>Danger Zone</h3>
        
        <div class="danger-action">
          <div>
            <div class="danger-title">Clear All Data</div>
            <div class="danger-desc">Permanently delete all transactions, vendors, and accounts</div>
          </div>
          <button class="btn-danger" onclick="clearAllData()">Clear Database</button>
        </div>
        
        <div class="danger-action">
          <div>
            <div class="danger-title">Reset to Demo Data</div>
            <div class="danger-desc">Replace current data with sample demo data</div>
          </div>
          <button class="btn-danger" onclick="resetToDemo()">Reset to Demo</button>
        </div>
      </div>
    </div>
  `;
}

// ==================================================
// INTEGRATIONS PANEL
// ==================================================

function renderIntegrationsPanel() {
  const supabaseUrl = 'https://rpwbfaahsbkfhtexaxuv.supabase.co';

  return `
    <div class="settings-panel">
      <h2>Integrations</h2>
      <p class="panel-description">Connect your bank accounts and external services</p>
      
      <div class="form-section">
        <h3>Supabase Cloud Sync</h3>
        
        <div class="integration-card">
          <div class="integration-header">
            <div class="integration-icon">☁️</div>
            <div>
              <div class="integration-name">Supabase</div>
              <div class="integration-status disconnected">Not Connected</div>
            </div>
          </div>
          
          <p>Sync your data to the cloud for backup and multi-device access</p>
          
          <div class="form-group">
            <label>Supabase URL</label>
            <input type="url" id="supabase-url" value="${supabaseUrl}" readonly>
            <small style="color: var(--text-secondary);">✓ Your project URL is configured</small>
          </div>
          
          <div class="form-group">
            <label>API Key (anon/public)</label>
            <input type="password" id="supabase-key" placeholder="Enter your anon key">
            <small style="color: var(--text-secondary);">Find this in your Supabase project settings</small>
          </div>
          
          <button class="btn-primary" onclick="connectSupabase()">🔗 Connect to Cloud</button>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Bank Connections</h3>
        
        <p class="feature-notice">🚧 Bank integrations coming soon! Connect your bank accounts to automatically import transactions.</p>
        
        <div class="bank-placeholder">
          <div class="placeholder-icon">🏦</div>
          <p>Plaid integration in development</p>
        </div>
      </div>
    </div>
  `;
}

// ==================================================
// SUBSCRIPTION PANEL
// ==================================================

function renderSubscriptionPanel() {
  return `
    <div class="settings-panel">
      <h2>Subscription & Billing</h2>
      <p class="panel-description">Manage your subscription plan and billing information</p>
      
      <div class="subscription-card">
        <div class="subscription-badge">FREE PLAN</div>
        <h3>AutoBookkeeping Free</h3>
        <p>Fully functional offline bookkeeping with unlimited transactions</p>
        
        <ul class="feature-list">
          <li>✅ Unlimited transactions</li>
          <li>✅ Unlimited vendors & accounts</li>
          <li>✅ Full offline access</li>
          <li>✅ Data import/export</li>
          <li>❌ Cloud sync</li>
          <li>❌ Multi-device access</li>
          <li>❌ Automatic bank imports</li>
          <li>❌ Advanced reporting</li>
        </ul>
      </div>
      
      <div class="upgrade-section">
        <h3>Upgrade to Pro</h3>
        <p>Get cloud sync, bank integrations, and advanced features</p>
        
        <div class="pricing-card">
          <div class="price">$9.99<span>/month</span></div>
          <ul class="pro-features">
            <li>☁️ Cloud sync across devices</li>
            <li>🏦 Automatic bank imports</li>
            <li>📊 Advanced analytics</li>
            <li>👥 Multi-user access</li>
            <li>🔒 Enhanced security</li>
          </ul>
          <button class="btn-primary btn-upgrade" disabled>Coming Soon</button>
        </div>
      </div>
    </div>
  `;
}

// ==================================================
// ABOUT PANEL
// ==================================================

function renderAboutPanel() {
  return `
    <div class="settings-panel">
      <h2>About AutoBookkeeping</h2>
      <p class="panel-description">Version information and system details</p>
      
      <div class="about-card">
        <div class="app-logo">💰</div>
        <h3>AutoBookkeeping v3.0</h3>
        <p class="version-info">Build: 2024.12.17</p>
      </div>
      
      <div class="form-section">
        <h3>System Information</h3>
        
        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Browser</div>
            <div class="info-value" id="browser-info">-</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Storage Used</div>
            <div class="info-value" id="storage-used">-</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Total Transactions</div>
            <div class="info-value" id="total-transactions">-</div>
          </div>
          
          <div class="info-item">
            <div class="info-label">Total Vendors</div>
            <div class="info-value" id="total-vendors">-</div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Credits</h3>
        <p>Built with modern web technologies:</p>
        <ul class="credits-list">
          <li>AG Grid Community (Data Tables)</li>
          <li>Chart.js (Visualizations)</li>
          <li>Vanilla JavaScript (Zero frameworks!)</li>
        </ul>
      </div>
      
      <div class="form-section">
        <h3>Resources</h3>
        <div class="resource-links">
          <a href="https://github.com/your-repo" target="_blank" class="resource-link">
            📚 Documentation
          </a>
          <a href="https://github.com/your-repo/issues" target="_blank" class="resource-link">
            🐛 Report Bug
          </a>
          <a href="mailto:support@autobookkeeping.com" class="resource-link">
            📧 Contact Support
          </a>
        </div>
      </div>
    </div>
  `;
}

// ==================================================
// SETTINGS PAGE LOGIC
// ==================================================

async function initSettingsPage(panel) {
  console.log(`🚀 Initializing Settings Page: ${panel}`);

  try {
    // Load current settings
    const settings = await window.storage.getSettings();

    // Populate forms based on panel
    if (panel === 'general') {
      document.getElementById('company-name').value = settings.companyName || '';
      document.getElementById('fiscal-year-end').value = settings.fiscalYearEnd || '12-31';
      document.getElementById('currency').value = settings.currency || 'USD';
    } else if (panel === 'about') {
      // Populate system info
      document.getElementById('browser-info').textContent = navigator.userAgent.split(' ').pop();

      const transactions = await window.storage.getTransactions();
      const vendors = await window.storage.getVendors();

      document.getElementById('total-transactions').textContent = transactions.length;
      document.getElementById('total-vendors').textContent = vendors.length;

      // Calculate storage
      let totalSize = 0;
      for (let key in localStorage) {
        if (key.startsWith('ab3_')) {
          totalSize += localStorage[key].length;
        }
      }
      document.getElementById('storage-used').textContent = (totalSize / 1024).toFixed(2) + ' KB';
    }

  } catch (error) {
    console.error('Failed to initialize settings:', error);
  }
}

async function saveGeneralSettings(event) {
  event.preventDefault();

  try {
    const settings = {
      companyName: document.getElementById('company-name').value,
      fiscalYearEnd: document.getElementById('fiscal-year-end').value,
      currency: document.getElementById('currency').value
    };

    await window.storage.updateSettings(settings);

    alert('✅ Settings saved successfully!');

  } catch (error) {
    console.error('Failed to save settings:', error);
    alert('Failed to save settings');
  }
}

function applyTheme(themeName) {
  // Update data-theme on body
  document.body.setAttribute('data-theme', themeName);

  // Save to storage
  localStorage.setItem('ab3_theme', themeName);

  // Show active state in grid
  document.querySelectorAll('.theme-card').forEach(card => {
    if (card.dataset.theme === themeName) {
      card.classList.add('active');
    } else {
      card.classList.remove('active');
    }
  });

  // Show toast
  const toast = document.createElement('div');
  toast.className = 'glass-card fade-in-up';
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '16px 24px';
  toast.style.border = '1px solid var(--theme-glass-border)';
  toast.style.zIndex = '9999';
  toast.innerHTML = `✅ Theme "${themeName.replace(/-/g, ' ')}" applied`;
  document.body.appendChild(toast);

  setTimeout(() => toast.remove(), 3000);
}

function exportAllData(format) {
  if (format === 'json') {
    window.storage.exportAll();
  } else {
    alert('CSV export coming soon!');
  }
}

function handleDataImport(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      await window.storage.importAll(data);
      alert('✅ Data imported successfully!');
      location.reload();
    } catch (error) {
      console.error('Import failed:', error);
      alert('Failed to import data');
    }
  };
  reader.readAsText(file);
}

async function clearAllData() {
  if (!confirm('⚠️ This will permanently delete ALL your data. Are you sure?')) return;
  if (!confirm('This action CANNOT be undone. Continue?')) return;

  await window.storage.clearAllData();
  alert('Database cleared');
  location.reload();
}

async function resetToDemo() {
  if (!confirm('Replace current data with demo data?')) return;

  await window.storage.clearAllData();
  await window.seedDatabase();
  alert('Reset to demo data');
  location.reload();
}

function connectSupabase() {
  const url = document.getElementById('supabase-url').value;
  const key = document.getElementById('supabase-key').value;

  if (!url || !key) {
    alert('Please enter both URL and API key');
    return;
  }

  // Show loading state
  const button = event.target;
  const originalText = button.textContent;
  button.textContent = 'Connecting...';
  button.disabled = true;

  // Connect to Supabase
  window.SupabaseSync.connect(key).then(result => {
    button.disabled = false;

    if (result.success) {
      button.textContent = '✓ Connected!';

      // Update status badge
      const statusBadge = document.querySelector('.integration-status');
      if (statusBadge) {
        statusBadge.textContent = 'Connected';
        statusBadge.classList.remove('disconnected');
        statusBadge.classList.add('connected');
      }

      alert('✅ ' + result.message + '\n\nYou can now sync your data to the cloud!');

      setTimeout(() => {
        button.textContent = originalText;
      }, 2000);
    } else {
      button.textContent = originalText;
      alert('❌ ' + result.message);
    }
  });
}
