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
        
        <a href="#/settings/accounts" class="settings-nav-item ${panel === 'accounts' ? 'active' : ''}">
          <i class="icon">🏦</i>
          <div>
            <div class="nav-title">Accounts</div>
            <div class="nav-desc">Manage bank accounts</div>
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
    case 'accounts':
      return renderAccountsPanel();
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
// ACCOUNTS PANEL
// ==================================================

function renderAccountsPanel() {
  return `
    <div class="settings-panel">
      <div class="panel-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <div>
          <h2>Accounts</h2>
          <p class="panel-description">Manage your bank accounts and credit cards</p>
        </div>
        <button class="btn-primary" onclick="window.accountSwitcher.showAddAccountModal()">
          + Add Account
        </button>
      </div>

      <div class="form-section">
        <h3>Active Accounts</h3>
        <div id="accounts-list" class="accounts-grid">
          <!-- Populated via JS -->
          <div class="loading-state">Loading accounts...</div>
        </div>
      </div>
    </div>
    
    <style>
      .accounts-grid {
        display: grid;
        gap: 16px;
      }
      
      .account-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .account-card-info {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .account-card-icon {
        font-size: 1.5rem;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f1f5f9;
        border-radius: 50%;
      }
      
      .account-card-details h4 {
        margin: 0;
        color: #1e293b;
      }
      
      .account-card-details p {
        margin: 2px 0 0;
        color: #64748b;
        font-size: 0.9rem;
      }
      
      .account-card-actions {
        display: flex;
        gap: 8px;
      }
      
      .btn-icon {
        background: none;
        border: none;
        padding: 8px;
        cursor: pointer;
        color: #94a3b8;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .btn-icon:hover {
        background: #f1f5f9;
        color: #475569;
      }
      
      .btn-icon.delete:hover {
        background: #fef2f2;
        color: #ef4444;
      }
    </style>
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
        <h3>Theme Selection</h3>
        
        <div class="theme-grid">
          <div class="theme-card" data-theme="daylight" onclick="applyTheme('daylight')">
            <div class="theme-icon">☀️</div>
            <div class="theme-name">Daylight</div>
            <div class="theme-desc">Classic Light</div>
            <button class="btn-apply" onclick="applyTheme('daylight'); event.stopPropagation();">Apply</button>
          </div>
          
          <div class="theme-card" data-theme="midnight" onclick="applyTheme('midnight')">
            <div class="theme-icon">🌑</div>
            <div class="theme-name">Midnight</div>
            <div class="theme-desc">OLED Dark</div>
            <button class="btn-apply" onclick="applyTheme('midnight'); event.stopPropagation();">Apply</button>
          </div>
          
          <div class="theme-card" data-theme="sage" onclick="applyTheme('sage')">
            <div class="theme-icon">🌿</div>
            <div class="theme-name">Sage</div>
            <div class="theme-desc">Soft Green</div>
            <button class="btn-apply" onclick="applyTheme('sage'); event.stopPropagation();">Apply</button>
          </div>
          
          <div class="theme-card" data-theme="ocean" onclick="applyTheme('ocean')">
            <div class="theme-icon">🌊</div>
            <div class="theme-name">Ocean</div>
            <div class="theme-desc">Calm Blue</div>
            <button class="btn-apply" onclick="applyTheme('ocean'); event.stopPropagation();">Apply</button>
          </div>
          
          <div class="theme-card" data-theme="rose" onclick="applyTheme('rose')">
            <div class="theme-icon">🌸</div>
            <div class="theme-name">Rose</div>
            <div class="theme-desc">Warm Pink</div>
            <button class="btn-apply" onclick="applyTheme('rose'); event.stopPropagation();">Apply</button>
          </div>

          <div class="theme-card" data-theme="cloud" onclick="applyTheme('cloud')">
            <div class="theme-icon">☁️</div>
            <div class="theme-name">Cloud</div>
            <div class="theme-desc">Soft Grey</div>
            <button class="btn-apply" onclick="applyTheme('cloud'); event.stopPropagation();">Apply</button>
          </div>

          <div class="theme-card" data-theme="lavender" onclick="applyTheme('lavender')">
            <div class="theme-icon">💜</div>
            <div class="theme-name">Lavender</div>
            <div class="theme-desc">Soft Purple</div>
            <button class="btn-apply" onclick="applyTheme('lavender'); event.stopPropagation();">Apply</button>
          </div>

          <div class="theme-card" data-theme="autumn" onclick="applyTheme('autumn')">
            <div class="theme-icon">🍂</div>
            <div class="theme-name">Autumn</div>
            <div class="theme-desc">Warm Orange</div>
            <button class="btn-apply" onclick="applyTheme('autumn'); event.stopPropagation();">Apply</button>
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
        <h3>AI Processor</h3>
        <p class="feature-notice">🤖 <strong>Smart Post-Processor:</strong> Upload your raw scan results to auto-assign COA codes and clean merchant names.</p>
        
        <div class="card" style="border: 1px dashed var(--border-color); padding: 2rem; text-align: center;">
          <div style="font-size: 2rem; margin-bottom: 1rem;">🧠</div>
          <h3>Upload Scan Results</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1.5rem;">Select your <code>scan_results.json</code> file</p>
          
          <input type="file" id="json-result-upload" accept=".json" style="display: none;" onchange="window.processJSONUpload(event)">
          <button class="btn-primary" onclick="document.getElementById('json-result-upload').click()">
            📂 Select File
          </button>
          
          <div id="ai-process-stats" style="display: none; margin-top: 1.5rem; text-align: left; background: var(--bg-subtle); padding: 1rem; border-radius: 8px;">
            <div id="ai-progress-text">Processing...</div>
            <progress id="ai-progress-bar" value="0" max="100" style="width: 100%; margin-top: 0.5rem;"></progress>
            <div id="ai-download-area" style="margin-top: 1rem; text-align: center;">
              <!-- Download button will appear here -->
            </div>
            
            <!-- Missing Grid Container -->
            <div id="ai-preview-grid" class="ag-theme-alpine" style="height: 500px; width: 100%; margin-top: 20px; display: none;"></div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <h3>Advanced Tools</h3>
        
        <div class="export-options">
          <button class="btn-export" onclick="window.location.hash = '#/indexer'">
            <span class="export-icon">🧠</span>
            <div>
              <div class="export-title">Data Junkie Console</div>
              <div class="export-desc">Train the Brain & Bulk Index Files</div>
            </div>
          </button>
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
// AI POST-PROCESSOR LOGIC
// ==================================================

// Store raw processed data globally for drill-down access
window.aiProcessedData = [];

window.processJSONUpload = function (event) {
  const file = event.target.files[0];
  if (!file) return;

  const statsDiv = document.getElementById('ai-process-stats');
  const progressText = document.getElementById('ai-progress-text');
  const progressBar = document.getElementById('ai-progress-bar');
  const downloadArea = document.getElementById('ai-download-area');
  const gridDiv = document.getElementById('ai-preview-grid');

  statsDiv.style.display = 'block';
  progressText.textContent = 'Reading file...';
  downloadArea.innerHTML = '';
  // Reset Grid
  if (gridDiv) {
    gridDiv.innerHTML = '';
    gridDiv.style.display = 'none';
  }

  progressBar.value = 10;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const rawData = JSON.parse(e.target.result);

      // Fix: Flatten CLI Output (Array of Files) -> Single Transaction List
      let transactions = [];
      if (Array.isArray(rawData)) {
        if (rawData.length > 0 && rawData[0].transactions) {
          // It's a CLI Scan Result (Array of Files)
          rawData.forEach(file => {
            if (Array.isArray(file.transactions)) {
              transactions.push(...file.transactions);
            }
          });
        } else {
          // It's likely already a flat list
          transactions = rawData;
        }
      } else if (rawData.transactions) {
        // Single object wrapper
        transactions = rawData.transactions;
      }

      progressText.textContent = `Processing ${transactions.length} transactions...`;

      // Load COA
      const COA = window.DEFAULT_CHART_OF_ACCOUNTS || [];
      if (COA.length === 0) {
        throw new Error("Chart of Accounts not loaded.");
      }

      window.aiProcessedData = []; // Clear previous
      let processedCount = 0;

      // Smart loop (non-blocking)
      const chunkSize = 50;

      const processChunk = async (startIndex) => {
        const endIndex = Math.min(startIndex + chunkSize, transactions.length);

        for (let i = startIndex; i < endIndex; i++) {
          const rawTxn = transactions[i];

          // NORMALIZE KEYS (Handle improper casing from CLI)
          const txn = {
            Date: rawTxn.Date || rawTxn.date || 'N/A',
            Description: rawTxn.Description || rawTxn.description || rawTxn.desc || 'Unknown',
            Amount: rawTxn.Amount || rawTxn.amount || 0
          };

          // 1. Clean Merchant Name using DataJunkie logic if available
          let cleanMerchant = txn.Description;
          if (window.dataJunkie) {
            const extracted = window.dataJunkie.extractMerchantName(txn.Description);
            if (extracted) cleanMerchant = extracted;
          }

          // 2. AI COA Matching
          const match = findBestCOAMatch(cleanMerchant, txn.Description, COA);

          window.aiProcessedData.push({
            ...txn,
            CleanMerchant: cleanMerchant,
            COA_Account: match.account ? `${match.account.code} - ${match.account.name}` : 'Unassigned',
            COA_Code: match.account ? match.account.code : '',
            COA_Name: match.account ? match.account.name : '',
            Match_Confidence: match.confidence.toFixed(2),
            Match_Source: match.source
          });
        }

        processedCount = endIndex;
        const percent = Math.round((processedCount / transactions.length) * 100);
        progressBar.value = percent;
        progressText.textContent = `Analyzed ${processedCount} / ${transactions.length} transactions...`;

        if (processedCount < transactions.length) {
          setTimeout(() => processChunk(processedCount), 0); // Yield to UI
        } else {
          finishProcessing(window.aiProcessedData, file.name);
        }
      };

      processChunk(0);

    } catch (error) {
      console.error('AI Process Failed:', error);
      progressText.textContent = `❌ Error: ${error.message}`;
    }
  };
  reader.readAsText(file);
};

function findBestCOAMatch(cleanName, originalDesc, coa) {
  const searchTerms = [cleanName, originalDesc].join(' ').toLowerCase();

  let bestMatch = null;
  let maxScore = 0;

  // Weights
  const EXACT_NAME_MATCH = 100;
  const PARTIAL_NAME_MATCH = 50;
  const KEYWORD_MATCH = 10;

  // Common keyword mappings (Heuristic Brain)
  const keywords = {
    'gas': 'fuel', 'station': 'fuel', 'oil': 'fuel', 'petro': 'fuel', 'shell': 'fuel',
    'hotel': 'travel', 'inn': 'travel', 'airbnb': 'travel', 'flight': 'travel',
    'food': 'meals', 'restaurant': 'meals', 'cafe': 'meals', 'coffee': 'meals',
    'uber': 'travel', 'taxi': 'travel', 'lyft': 'travel',
    'software': 'software', 'adobe': 'software', 'google': 'software',
    'bank': 'bank charges', 'fee': 'bank charges', 'interest': 'bank charges'
  };

  coa.forEach(account => {
    let score = 0;
    const accName = account.name.toLowerCase();
    const accCat = account.category.toLowerCase();

    // 1. Check Keywords in Description against Account Name
    if (searchTerms.includes(accName)) score += EXACT_NAME_MATCH;

    // 2. Check Keywords
    Object.keys(keywords).forEach(key => {
      if (searchTerms.includes(key)) {
        // If keyword maps to this account name/category
        const target = keywords[key];
        if (accName.includes(target) || accCat.includes(target)) {
          score += KEYWORD_MATCH;
        }
      }
    });

    // 3. Simple Token Match
    const tokens = searchTerms.split(/\s+/);
    tokens.forEach(token => {
      if (token.length > 3 && accName.includes(token)) {
        score += 5;
      }
    });

    if (score > maxScore) {
      maxScore = score;
      bestMatch = account;
    }
  });

  return {
    account: bestMatch,
    confidence: maxScore > 0 ? Math.min(maxScore / 100, 1.0) : 0,
    source: bestMatch ? (maxScore >= 100 ? 'Exact' : 'Heuristic') : 'None'
  };
}

function finishProcessing(data, originalFilename) {
  const progressText = document.getElementById('ai-progress-text');
  const downloadArea = document.getElementById('ai-download-area');
  const gridDiv = document.getElementById('ai-preview-grid');

  // Group Data by CleanMerchant
  const aggregated = {};
  data.forEach(txn => {
    const key = txn.CleanMerchant;
    if (!aggregated[key]) {
      aggregated[key] = {
        CleanMerchant: key,
        Count: 0,
        Transactions: [],
        COA_Code: txn.COA_Code,
        COA_Name: txn.COA_Name,
        Match_Confidence: parseFloat(txn.Match_Confidence)
      };
    }
    aggregated[key].Count++;
    aggregated[key].Transactions.push(txn);
    // Take highest confidence if multiple
    if (parseFloat(txn.Match_Confidence) > aggregated[key].Match_Confidence) {
      aggregated[key].Match_Confidence = parseFloat(txn.Match_Confidence);
      aggregated[key].COA_Code = txn.COA_Code;
      aggregated[key].COA_Name = txn.COA_Name;
    }
  });

  const gridData = Object.values(aggregated);

  progressText.innerHTML = `✅ <strong>Success!</strong> Processed ${data.length} transactions into ${gridData.length} unique merchants.`;

  if (gridDiv) {
    gridDiv.style.display = 'block';

    const gridOptions = {
      rowData: gridData,
      columnDefs: [
        {
          field: "CleanMerchant", headerName: "Merchant", flex: 1.5, filter: true, sortable: true, cellRenderer: params => {
            return `<strong>${params.value || 'Unknown'}</strong>`;
          }
        },
        {
          field: "Count", headerName: "Description", width: 150, cellRenderer: params => {
            return `<button class="btn-sm btn-secondary" onclick="window.showAIProcessedDrillDown('${(params.data.CleanMerchant || '').replace(/'/g, "\\'")}')">
               View ${params.value} Txns
             </button>`;
          }
        },
        { field: "COA_Code", headerName: "Account #", width: 120, sortable: true },
        { field: "COA_Name", headerName: "Account Description", flex: 1.5, filter: true },
        {
          field: "Match_Confidence", headerName: "Confidence", width: 120, cellStyle: params => {
            return { color: params.value > 0.8 ? 'green' : (params.value > 0.5 ? 'orange' : 'red'), fontWeight: 'bold' };
          }
        }
      ],
      defaultColDef: {
        resizable: true,
      },
      pagination: true,
      paginationPageSize: 100,
      domLayout: 'autoHeight'
    };

    gridDiv.innerHTML = '';
    agGrid.createGrid(gridDiv, gridOptions);
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const newFilename = originalFilename.replace('.json', '_ai_processed.json');

  // Create CSV Blob
  const csvContent = "Date,Merchant,Original Description,Amount,Account Code,Account Name,Confidence\n" +
    data.map(r => `"${r.Date}","${r.CleanMerchant.replace(/"/g, '""')}","${r.Description.replace(/"/g, '""')}",${r.Amount},"${r.COA_Code}","${r.COA_Name}","${r.Match_Confidence}"`).join("\n");
  const blobCSV = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const urlCSV = URL.createObjectURL(blobCSV);

  downloadArea.innerHTML = `
    <div style="display: flex; gap: 10px; justify-content: center;">
      <a href="${url}" download="${newFilename}" class="btn-primary" style="text-decoration: none; display: inline-block; background: #64748b;">
        ⬇️ Download JSON
      </a>
      <a href="${urlCSV}" download="${newFilename.replace('.json', '.csv')}" class="btn-primary" style="text-decoration: none; display: inline-block; background: #10b981;">
        📊 Download Excel (CSV)
      </a>
    </div>
  `;
}

window.showAIProcessedDrillDown = function (merchantName) {
  const modal = document.getElementById('vendor-drilldown-modal');
  if (!modal) return;

  const title = document.getElementById('drilldown-title');
  const list = document.getElementById('drilldown-list');

  title.textContent = `Transactions for: ${merchantName}`;

  // Filter data
  const txns = window.aiProcessedData.filter(t => t.CleanMerchant === merchantName);

  let html = `
      <table style="width:100%; border-collapse: collapse; font-size: 0.9rem;">
        <thead>
           <tr style="background: #f1f5f9; text-align: left;">
             <th style="padding: 8px;">Date</th>
             <th style="padding: 8px;">Original Description</th>
             <th style="padding: 8px; text-align: right;">Amount</th>
           </tr>
        </thead>
        <tbody>
    `;

  txns.forEach(t => {
    const dateStr = t.Date ? new Date(t.Date).toISOString().split('T')[0] : 'N/A';
    const amt = parseFloat(t.Amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' });
    html += `
         <tr style="border-bottom: 1px solid #e2e8f0;">
           <td style="padding: 8px;">${dateStr}</td>
           <td style="padding: 8px;">${t.Description}</td>
           <td style="padding: 8px; text-align: right; font-weight: 500;">${amt}</td>
         </tr>
       `;
  });

  html += `</tbody></table>`;
  list.innerHTML = html;

  modal.style.display = 'flex';
}

// Add close handler globally
window.closeVendorDrillDown = function () {
  const modal = document.getElementById('vendor-drilldown-modal');
  if (modal) modal.style.display = 'none';
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
    } else if (panel === 'accounts') {
      renderAccountsList();
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
  // Apply theme by setting data-theme attribute on root element
  document.documentElement.setAttribute('data-theme', themeName);

  // Save preference to localStorage
  localStorage.setItem('preferred_theme', themeName);

  // Visual feedback
  console.log('✓ Theme applied:', themeName);

  // Update active state on theme cards
  document.querySelectorAll('.theme-card').forEach(card => {
    card.classList.remove('active');
    if (card.getAttribute('data-theme') === themeName) {
      card.classList.add('active');
    }
  });
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
    }
  });
}

function renderAccountsList() {
  const container = document.getElementById('accounts-list');
  if (!container || !window.accountManager) return;

  const accounts = window.accountManager.getAllAccounts();

  if (accounts.length === 0) {
    container.innerHTML = '<div class="empty-state">No accounts found. Create one to get started.</div>';
    return;
  }

  container.innerHTML = accounts.map(acc => {
    const balance = window.accountManager.getAccountBalance(acc.id);
    const balanceFormatted = Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Bank: Positive = Green (Asset), Credit: Positive = Red (Liability) usually
    // But for simple visualization:
    // Bank: >0 Green, <0 Red
    // Credit: >0 Red (Owe money), <0 Green (Overpaid) - Assuming credit balance is stored as positive if owed
    // Let's stick to simple logic: 
    const balanceColor = '#1e293b'; // Neutral color for now to avoid confusion

    return `
      <div class="account-card">
        <div class="account-card-info">
          <div class="account-card-icon">
            ${acc.type === 'bank' ? '🏦' : '💳'}
          </div>
          <div class="account-card-details">
            <h4>${acc.accountName}</h4>
            <p>
              ${acc.type === 'bank' ? 'Bank Account' : 'Credit Card'} • ${acc.accountNumber} <br>
              Balance: <span style="font-weight: 600;">$${balanceFormatted}</span>
            </p>
          </div>
        </div>
        <div class="account-card-actions">
           ${accounts.length > 1 ? `
            <button class="btn-icon delete" title="Delete Account" onclick="window.deleteAccountSettings('${acc.id}')">
              🗑️
            </button>
          ` : ''}
        </div>
      </div>
    `;
  }).join('');
}

window.deleteAccountSettings = function (accountId) {
  if (confirm('Are you sure you want to delete this account? ALL transactions will be lost forever!')) {
    try {
      window.accountManager.deleteAccount(accountId);

      // If deleted account was current, reload page to refresh state
      location.reload();

    } catch (error) {
      alert(error.message);
    }
  }
};
