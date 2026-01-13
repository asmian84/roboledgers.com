/**
 * Settings Page - Nested Route-Based System
 */

window.renderSettings = function (params) {
  const panel = params?.panel || 'general';

  return `
    <div class="settings-layout">
      <!-- Modern Sidebar -->
      <aside class="settings-sidebar">
        <div class="sidebar-header">
            <h3>App Settings</h3>
            <p>Configure RoboLedgers</p>
        </div>
        
        <nav class="settings-nav">
          <a href="#/settings" class="settings-nav-item ${panel === 'general' ? 'active' : ''}">
            <i class="ph ph-sliders"></i>
            <div>
              <div class="nav-title">General</div>
              <div class="nav-desc">Preferences</div>
            </div>
          </a>
          
          <a href="#/settings/accounts" class="settings-nav-item ${panel === 'accounts' ? 'active' : ''}">
            <i class="ph ph-bank"></i>
            <div>
              <div class="nav-title">Accounts</div>
              <div class="nav-desc">Bank & cards</div>
            </div>
          </a>
          
          <a href="#/settings/appearance" class="settings-nav-item ${panel === 'appearance' ? 'active' : ''}">
            <i class="ph ph-palette"></i>
            <div>
              <div class="nav-title">Appearance</div>
              <div class="nav-desc">Themes</div>
            </div>
          </a>
          
          <a href="#/settings/data" class="settings-nav-item ${panel === 'data' ? 'active' : ''}">
            <i class="ph ph-database"></i>
            <div>
              <div class="nav-title">Data</div>
              <div class="nav-desc">Backup / AI</div>
            </div>
          </a>
          
          <a href="#/settings/integrations" class="settings-nav-item ${panel === 'integrations' ? 'active' : ''}">
            <i class="ph ph-plugs"></i>
            <div>
              <div class="nav-title">Integrations</div>
              <div class="nav-desc">Cloud & Wiki</div>
            </div>
          </a>
          
          <a href="#/settings/subscription" class="settings-nav-item ${panel === 'subscription' ? 'active' : ''}">
            <i class="ph ph-credit-card"></i>
            <div>
              <div class="nav-title">Billing</div>
              <div class="nav-desc">Plan</div>
            </div>
          </a>
          
          <a href="#/settings/about" class="settings-nav-item ${panel === 'about' ? 'active' : ''}">
            <i class="ph ph-info"></i>
            <div>
              <div class="nav-title">About</div>
              <div class="nav-desc">Version</div>
            </div>
          </a>
        </nav>
      </aside>

      <!-- Panel Content -->
      <main class="settings-panel-container">
        ${renderSettingsPanel(panel)}
      </main>

      <style>
        .settings-layout {
            display: grid;
            grid-template-columns: 240px 1fr;
            height: calc(100vh - 80px); /* Fit within viewport minus breadcrumb */
            background: #f8fafc;
            overflow: hidden;
            margin: -32px; /* Compensate for app-container padding */
        }

        @media (max-width: 768px) {
            .settings-layout {
                grid-template-columns: 1fr;
                grid-template-rows: auto 1fr;
                margin: -1rem;
                height: calc(100vh - 60px);
            }
            .settings-sidebar {
                border-right: none;
                border-bottom: 1px solid rgba(226, 232, 240, 0.8);
                flex-direction: row !important;
                overflow-x: auto;
                padding: 10px !important;
                gap: 10px;
                scrollbar-width: none;
            }
            .settings-sidebar::-webkit-scrollbar { display: none; }
            .sidebar-header { display: none; }
            .settings-nav { flex-direction: row !important; }
            .settings-nav-item { padding: 8px 12px !important; white-space: nowrap; }
            .settings-panel { max-width: 100% !important; }
        }

        /* SIDEBAR - Compact */
        .settings-sidebar {
            background: #fff;
            border-right: 1px solid rgba(226, 232, 240, 0.8);
            display: flex;
            flex-direction: column;
            padding: 20px 12px;
        }
        .sidebar-header { margin-bottom: 24px; padding: 0 10px; }
        .sidebar-header h3 { margin: 0; font-size: 1rem; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.05em; }
        .sidebar-header p { margin: 2px 0 0; font-size: 0.75rem; color: #94a3b8; font-weight: 500; }

        .settings-nav { display: flex; flex-direction: column; gap: 4px; }
        .settings-nav-item {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 12px;
            border-radius: 10px;
            text-decoration: none;
            transition: all 0.15s ease;
            color: #64748b;
        }
        .settings-nav-item i { font-size: 1.15rem; }
        .settings-nav-item .nav-title { font-weight: 700; font-size: 0.9rem; color: #334155; }
        .settings-nav-item .nav-desc { font-size: 0.7rem; color: #94a3b8; font-weight: 500; display: none; } /* Hide desc for snugness */
        
        .settings-nav-item:hover { background: #f8fafc; color: #2563eb; }
        .settings-nav-item.active { background: #eff6ff; color: #2563eb; border: 1px solid rgba(37, 99, 235, 0.1); }
        .settings-nav-item.active i { color: #2563eb; }
        .settings-nav-item.active .nav-title { color: #1e40af; }

        /* CONTENT PANEL - Optimized */
        .settings-panel-container {
            padding: 16px 24px;
            overflow-y: auto;
            background: #f8fafc;
            /* Completely hide scrollbars but maintain scrollability */
            scrollbar-width: none; /* Firefox */
            -ms-overflow-style: none;  /* IE and Edge */
        }
        .settings-panel-container::-webkit-scrollbar {
            display: none; /* Chrome, Safari and Opera */
        }
        .settings-panel { max-width: 520px; margin: 0; animation: slideUp 0.3s ease-out; }
        @keyframes slideUp { from { transform: translateY(6px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

        .settings-panel h2 { font-size: 1.2rem; font-weight: 800; color: #0f172a; margin: 0 0 2px 0; letter-spacing: -0.02em; }
        .panel-description { color: #64748b; font-size: 0.75rem; margin-bottom: 8px; font-weight: 500; }

        .form-section { 
            background: white; 
            border: 1px solid rgba(226, 232, 240, 0.7); 
            border-radius: 12px; 
            padding: 12px 14px; 
            margin-bottom: 10px; 
            box-shadow: 0 1px 2px rgba(0,0,0,0.02); 
        }
        .form-section h3 { 
            margin: 0 0 8px 0; 
            font-size: 0.75rem; 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            font-weight: 800; 
            color: #64748b; 
            border-bottom: 1px solid #f8fafc; 
            padding-bottom: 6px; 
        }

        .form-group { margin-bottom: 8px; }
        .form-group label { display: block; font-size: 0.7rem; font-weight: 800; color: #94a3b8; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
        .form-group input, .form-group select {
            width: 100%; padding: 8px 12px; border: 1px solid #e2e8f0; border-radius: 8px;
            font-size: 0.85rem; transition: all 0.2s; background: #fff; color: #1e293b;
            font-weight: 500;
        }
        .form-group input:focus { outline: none; border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }

        /* THEME CARDS EXTREME */
        .theme-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; }
        .theme-card {
            background: white; border: 1px solid #e2e8f0; border-radius: 14px;
            padding: 20px; cursor: pointer; text-align: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative; overflow: hidden;
        }
        .theme-card:hover { transform: translateY(-4px); border-color: #3b82f6; box-shadow: 0 8px 16px rgba(0,0,0,0.05); }
        .theme-card.active { border-color: #2563eb; background: #eff6ff; box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2); }
        .theme-icon { font-size: 2rem; margin-bottom: 12px; }
        .theme-name { font-weight: 800; font-size: 1rem; color: #0f172a; margin-bottom: 4px; }
        .theme-desc { font-size: 0.75rem; color: #64748b; font-weight: 500; }

        /* ACCOUNT CARDS */
        .account-card {
            background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
            padding: 20px; display: flex; justify-content: space-between; align-items: center;
            transition: all 0.2s;
        }
        .account-card:hover { border-color: #cbd5e1; background: #f1f5f9; }
        .account-card-icon { font-size: 1.5rem; width: 48px; height: 48px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; }
        .account-card-details h4 { margin: 0; font-size: 1rem; font-weight: 700; color: #0f172a; }
        .account-card-details p { margin: 2px 0 0; font-size: 0.85rem; color: #64748b; }

        .btn-upgrade { 
            width: 100%; border-radius: 12px; font-weight: 800; font-size: 1rem; 
            background: linear-gradient(135deg, #2563eb, #7c3aed); border: none; padding: 16px;
        }

        .ultra-compact .form-section { padding: 8px 12px; margin-bottom: 8px; }
        .ultra-compact .form-group { margin-bottom: 4px; }
        .ultra-compact .settings-panel h2 { font-size: 1rem; }
        .ultra-compact .panel-description { margin-bottom: 4px; font-size: 0.7rem; }
        
        /* Clean scrollbars - only visible when scrolling */
        .settings-panel-container {
            scrollbar-width: thin;
            scrollbar-color: #cbd5e1 transparent;
        }
        .settings-panel-container::-webkit-scrollbar {
            width: 5px;
        }
        .settings-panel-container::-webkit-scrollbar-thumb {
            background-color: #cbd5e1;
            border-radius: 10px;
        }
      </style>
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
      <p class="panel-description">Configure core application identity and behavior</p>
        
        <div class="form-section">
          <h3>Application Behavior</h3>
          
          <div class="form-group">
            <label class="checkbox-label" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
              <input type="checkbox" id="auto-save" style="width: 18px; height: 18px;">
              <span style="font-weight: 500; color: #334155; font-size: 0.8rem;">Auto-sync changes to cloud (Supabase)</span>
            </label>
          </div>
          
          <div class="form-group">
            <label class="checkbox-label" style="display: flex; align-items: center; gap: 12px; cursor: pointer;">
              <input type="checkbox" id="show-hints" style="width: 18px; height: 18px;" checked>
              <span style="font-weight: 500; color: #334155; font-size: 0.8rem;">Enable AI Categorization Assistant</span>
            </label>
          </div>
        </div>
        
        <div class="form-actions" style="display: flex; justify-content: flex-end; margin-top: -4px;">
          <button class="btn btn-primary" onclick="saveGeneralSettings(event)" style="padding: 8px 16px; font-size: 0.85rem; font-weight: 700;">💾 Save Preferences</button>
        </div>
    </div>
  `;
}

// ==================================================
// ACCOUNTS PANEL
// ==================================================

function renderAccountsPanel() {
  return `
    <div class="settings-panel">
      <div style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 12px;">
        <div>
          <h2>Financial Accounts</h2>
          <p class="panel-description">Manage your primary ledgers and credit lines.</p>
        </div>
        <button class="btn btn-primary btn-sm" onclick="window.accountSwitcher.showAddAccountModal()" style="display: flex; align-items: center; gap: 6px; padding: 8px 14px; font-size: 0.8rem;">
          <i class="ph ph-plus-circle"></i> Add Account
        </button>
      </div>

      <div class="form-section">
        <h3>Connected Ledger Nodes</h3>
        <div id="accounts-list" style="display: grid; gap: 12px;">
          <div class="loading-state">Syncing ledger records...</div>
        </div>
      </div>
    </div>
  `;
}

// ==================================================
// APPEARANCE PANEL
// ==================================================

function renderAppearancePanel() {
  return `
    <div class="settings-panel">
      <h2>Visual Interface</h2>
      <p class="panel-description">Personalize the application design system</p>
      
      <div class="form-section">
        <h3>Color Archetypes</h3>
        <div class="theme-grid" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;">
          <div class="theme-card" data-theme="daylight" onclick="applyTheme('daylight')" style="padding: 12px;">
            <div class="theme-icon" style="color: #f59e0b; font-size: 1.25rem;">☀️</div>
            <div class="theme-name" style="font-size: 0.85rem;">Daylight</div>
          </div>
          
          <div class="theme-card" data-theme="midnight" onclick="applyTheme('midnight')" style="padding: 12px;">
            <div class="theme-icon" style="color: #1e293b; font-size: 1.25rem;">🌑</div>
            <div class="theme-name" style="font-size: 0.85rem;">Midnight</div>
          </div>
          
          <div class="theme-card" data-theme="sage" onclick="applyTheme('sage')" style="padding: 12px;">
            <div class="theme-icon" style="color: #10b981; font-size: 1.25rem;">🌿</div>
            <div class="theme-name" style="font-size: 0.85rem;">Sage</div>
          </div>
          
          <div class="theme-card" data-theme="ocean" onclick="applyTheme('ocean')" style="padding: 12px;">
            <div class="theme-icon" style="color: #0ea5e9; font-size: 1.25rem;">🌊</div>
            <div class="theme-name" style="font-size: 0.85rem;">Ocean</div>
          </div>
          
          <div class="theme-card" data-theme="rose" onclick="applyTheme('rose')" style="padding: 12px;">
            <div class="theme-icon" style="color: #f43f5e; font-size: 1.25rem;">🌸</div>
            <div class="theme-name" style="font-size: 0.85rem;">Rose</div>
          </div>

          <div class="theme-card" data-theme="lavender" onclick="applyTheme('lavender')" style="padding: 12px;">
            <div class="theme-icon" style="color: #8b5cf6; font-size: 1.25rem;">💜</div>
            <div class="theme-name" style="font-size: 0.85rem;">Lavender</div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Typography & Grid</h3>
        <div class="form-row">
            <div class="form-group">
                <label>System Font Size</label>
                <select id="font-size" style="padding: 8px 12px;">
                    <option value="small">Comfortable</option>
                    <option value="medium" selected>Standard</option>
                    <option value="large">Accessible</option>
                </select>
            </div>
            
            <div class="form-group" style="padding-top: 28px;">
                <label class="checkbox-label" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                    <input type="checkbox" id="compact-mode" style="width: 16px; height: 16px;">
                    <span style="font-weight: 700; color: #64748b; font-size: 0.8rem;">Ultra-Compact Mode</span>
                </label>
            </div>
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
      <h2>Data Infrastructure</h2>
      <p class="panel-description">Manage local storage and AI post-processing</p>

      <div class="form-section">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
                <h3 style="margin: 0; border: none; padding: 0;">AI Processor</h3>
                <p style="color: #64748b; font-size: 0.8rem; margin: 4px 0 0;">Mass-cleanup <code>scan_results.json</code> files.</p>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="document.getElementById('json-result-upload').click()" style="padding: 6px 12px; font-size: 0.75rem;">
                📂 Browse JSON
            </button>
        </div>
        
        <input type="file" id="json-result-upload" accept=".json" style="display: none;" onchange="window.processJSONUpload(event)">

        <div id="ai-process-stats" style="display: none; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px;">
            <div id="ai-progress-text" style="font-weight: 700; color: #1e293b; margin-bottom: 8px; font-size: 0.85rem;">Initializing...</div>
            <div style="background: #e2e8f0; height: 6px; border-radius: 3px; overflow: hidden; margin-bottom: 16px;">
                <progress id="ai-progress-bar" value="0" max="100" style="width: 100%; height: 100%; appearance: none; border: none;"></progress>
            </div>
            <div id="ai-download-area"></div>
            <div id="ai-preview-grid" class="ag-theme-alpine" style="height: 350px; width: 100%; border-radius: 6px; overflow: hidden; border: 1px solid #e2e8f0; display: none;"></div>
        </div>
      </div>

      <div class="form-section danger-zone" style="border-color: #fee2e2; background: #fffcfc; padding: 20px;">
        <h3 style="color: #991b1b; border-bottom-color: #fee2e2; margin-bottom: 16px;">System Maintenance</h3>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #fee2e2; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 800; color: #b91c1c; font-size: 0.85rem;">Wipe Database</div>
                    <div style="font-size: 0.75rem; color: #991b1b;">Irreversible deletion.</div>
                </div>
                <button class="btn btn-danger btn-sm" onclick="clearAllData()" style="padding: 4px 10px; font-size: 0.75rem;">Destroy</button>
            </div>
            
            <div style="background: white; padding: 12px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 800; color: #334155; font-size: 0.85rem;">Reset Samples</div>
                    <div style="font-size: 0.75rem; color: #64748b;">Seed training data.</div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="resetToDemo()" style="padding: 4px 10px; font-size: 0.75rem;">Seed</button>
            </div>
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
  const supabaseUrl = 'https://qygddrggoywhvlwhuzil.supabase.co';

  return `
    <div class="settings-panel">
      <h2>Cloud Infrastructure</h2>
      <p class="panel-description">Integrate external ledger sync and AI metadata</p>
      
      <div class="form-section" style="padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 38px; height: 38px; background: #3ecf8e15; color: #3ecf8e; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    <i class="ph ph-cloud"></i>
                </div>
                <div>
                    <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b;">Supabase DB</h4>
                    <div style="font-size: 0.7rem; color: #10b981; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                        <span style="width: 5px; height: 5px; background: #10b981; border-radius: 50%;"></span> ACTIVE SYNC
                    </div>
                </div>
            </div>
            <button class="btn btn-secondary btn-sm" style="font-size: 0.75rem;">Modify Key</button>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.65rem;">Database URL</label>
                <div style="background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 0.75rem; color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    ${supabaseUrl}
                </div>
            </div>
            <div class="form-group" style="margin-bottom: 0;">
                <label style="font-size: 0.65rem;">API Access</label>
                <div style="background: #f8fafc; padding: 6px 12px; border-radius: 6px; border: 1px solid #e2e8f0; font-family: monospace; font-size: 0.75rem; color: #64748b;">
                    ••••••••••••••••
                </div>
            </div>
        </div>
      </div>
      
      <div class="form-section" style="padding: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <div style="display: flex; align-items: center; gap: 12px;">
                <div style="width: 38px; height: 38px; background: #4285f415; color: #4285f4; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">
                    <i class="ph ph-sparkle"></i>
                </div>
                <div>
                    <h4 style="margin: 0; font-size: 1rem; font-weight: 700; color: #1e293b;">Google Gemini AI</h4>
                    <div id="ai-status-badge" style="font-size: 0.7rem; color: #94a3b8; font-weight: 800; display: flex; align-items: center; gap: 4px;">
                        <span style="width: 5px; height: 5px; background: #94a3b8; border-radius: 50%;"></span> NOT CONFIGURED
                    </div>
                </div>
            </div>
            <button class="btn btn-secondary btn-sm" onclick="testAILink(event)" style="font-size: 0.75rem;">Test Link</button>
        </div>
        
        <div class="form-group" style="margin-bottom: 4px;">
            <label style="font-size: 0.65rem;">Gemini API Key</label>
            <div style="display: flex; gap: 8px;">
                <input type="password" id="google-ai-api-key" placeholder="Enter your Gemini API Key" style="flex: 1; font-family: monospace; font-size: 0.75rem; padding: 8px 12px;">
                <button class="btn btn-primary btn-sm" onclick="saveIntegrationSettings(event)" style="padding: 0 16px;">Save</button>
            </div>
            <p style="font-size: 0.65rem; color: #64748b; margin-top: 6px;">Used for the 7th step: High-certainty categorization & clean-up.</p>
        </div>
        
        <!-- Inline Test Result Area -->
        <div id="ai-test-result" style="display: none; margin-top: 12px; padding: 12px 16px; border-radius: 8px; font-size: 0.85rem; animation: fadeIn 0.3s ease;"></div>
      </div>
      
      <div class="form-section" style="padding: 14px;">
        <h3 style="font-size: 0.8rem;">Partner Ecosystem</h3>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">🏦</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">Plaid</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">COMING SOON</div>
                </div>
            </div>
            
            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">💳</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">Stripe</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">REQUEST ACCESS</div>
                </div>
            </div>

            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">📖</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">Wikipedia</div>
                    <div style="font-size: 0.65rem; color: #10b981; font-weight: 700;">ENABLED</div>
                </div>
            </div>

            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">📊</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">QuickBooks</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">PLANNED</div>
                </div>
            </div>

            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">🏢</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">Xero</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">BETA TESTING</div>
                </div>
            </div>

            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">🛍️</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">Shopify</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">PLANNED</div>
                </div>
            </div>

            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">🌿</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">Sage</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">PLANNED</div>
                </div>
            </div>

            <div style="border: 1px solid #f1f5f9; border-radius: 10px; padding: 10px; display: flex; gap: 10px; background: #fafafa; align-items: center;">
                <div style="font-size: 1.15rem;">🌊</div>
                <div>
                    <div style="font-weight: 700; color: #334155; font-size: 0.8rem;">Wave</div>
                    <div style="font-size: 0.65rem; color: #94a3b8; font-weight: 700;">PLANNED</div>
                </div>
            </div>
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
      <h2>Licensing & Tiers</h2>
      <p class="panel-description">Manage your professional RoboLedgers access</p>
      
      <div class="form-section" style="background: linear-gradient(135deg, #0f172a, #27272a); padding: 16px; border: none; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <div>
                  <div style="background: #3b82f630; color: #60a5fa; padding: 3px 10px; border-radius: 20px; font-size: 0.65rem; font-weight: 800; display: inline-block; margin-bottom: 8px; border: 1px solid #3b82f650;">LIFETIME PRO</div>
                  <h3 style="margin: 0; font-size: 1.4rem; font-weight: 800; color: white; border: none; padding: 0;">Unlimited Enterprise</h3>
              </div>
              <div style="font-size: 2rem;">🏆</div>
          </div>
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #e2e8f0; font-weight: 600;"><i class="ph ph-check-circle" style="color: #10b981;"></i> Multi-Entity</div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #e2e8f0; font-weight: 600;"><i class="ph ph-check-circle" style="color: #10b981;"></i> Cloud Backup</div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #e2e8f0; font-weight: 600;"><i class="ph ph-check-circle" style="color: #10b981;"></i> AI Indexing</div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; color: #e2e8f0; font-weight: 600;"><i class="ph ph-check-circle" style="color: #10b981;"></i> API Access</div>
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
      <h2>System Diagnostics</h2>
      <p class="panel-description">Technical specifications and application metadata</p>
      
      <div class="form-section" style="text-align: center; padding: 24px 0;">
          <div style="width: 80px; height: 80px; background: #f1f5f9; border-radius: 20px; display: flex; align-items: center; justify-content: center; font-size: 2.5rem; margin: 0 auto 20px;">
              🤖
          </div>
          <h3 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a;">RoboLedgers 4.0</h3>
          <p style="color: #64748b; font-weight: 600; font-size: 0.9rem;">Intelligence-First Accounting Engine</p>
          <div style="background: #e2e8f0; height: 1px; width: 100px; margin: 20px auto;"></div>
          <p style="font-size: 0.8rem; color: #94a3b8; font-family: monospace;">Build Hash: V4.0.2026.JAN</p>
      </div>
      
      <div class="form-section">
        <h3>Resource Allocation</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px;">
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 800; margin-bottom: 8px;">Nodes</div>
            <div id="total-transactions" style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">-</div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 800; margin-bottom: 8px;">Entities</div>
            <div id="total-vendors" style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">-</div>
          </div>
          
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 800; margin-bottom: 8px;">Storage</div>
            <div id="storage-used" style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">-</div>
          </div>

          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; border: 1px solid #e2e8f0; text-align: center;">
            <div style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 800; margin-bottom: 8px;">Uptime</div>
            <div style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">99.9%</div>
          </div>
        </div>
      </div>
      
      <div class="form-section">
        <h3>Engine Credits</h3>
        <p style="font-size: 0.85rem; color: #64748b; line-height: 1.6;">
            RoboLedgers is built on high-performance foundation layers including <strong>AG Grid Corporate</strong>, <strong>Chart.js High-Fidelity</strong>, and <strong>Supabase Realtime Sync</strong>.
        </p>
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
      if (document.getElementById('company-name')) document.getElementById('company-name').value = settings.companyName || '';
      if (document.getElementById('fiscal-year-end')) document.getElementById('fiscal-year-end').value = settings.fiscalYearEnd || '12-31';
      if (document.getElementById('currency')) document.getElementById('currency').value = settings.currency || 'USD';
    } else if (panel === 'integrations') {
      if (document.getElementById('google-ai-api-key')) {
        document.getElementById('google-ai-api-key').value = settings.googleAiApiKey || '';
        if (settings.googleAiApiKey) {
          const badge = document.getElementById('ai-status-badge');
          if (badge) {
            badge.innerHTML = '<span style="width: 5px; height: 5px; background: #10b981; border-radius: 50%;"></span> KEY CONFIGURED';
            badge.style.color = '#10b981';
          }
        }
      }
    } else if (panel === 'accounts') {
      renderAccountsList();
    } else if (panel === 'appearance') {
      const fontSize = localStorage.getItem('ab_font_size') || 'medium';
      const compactMode = localStorage.getItem('ab_compact_mode') === 'true';

      const fontSizeSelect = document.getElementById('font-size');
      const compactCheckbox = document.getElementById('compact-mode');

      // Apply globally
      document.documentElement.setAttribute('data-font-size', fontSize);
      document.documentElement.classList.toggle('ultra-compact', compactMode);

      if (fontSizeSelect) {
        fontSizeSelect.value = fontSize;
        fontSizeSelect.addEventListener('change', (e) => {
          const newSize = e.target.value;
          localStorage.setItem('ab_font_size', newSize);
          document.documentElement.setAttribute('data-font-size', newSize);
          console.log(`📏 Font size set to: ${newSize}`);
        });
      }

      if (compactCheckbox) {
        compactCheckbox.checked = compactMode;
        compactCheckbox.addEventListener('change', (e) => {
          const enabled = e.target.checked;
          localStorage.setItem('ab_compact_mode', enabled);
          document.documentElement.classList.toggle('ultra-compact', enabled);
          console.log(`📦 Compact mode: ${enabled}`);
        });
      }
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
  if (event) event.preventDefault();

  try {
    const settings = await window.storage.getSettings();

    // Update fields if they exist in DOM
    if (document.getElementById('auto-save')) settings.autoSave = document.getElementById('auto-save').checked;
    if (document.getElementById('show-hints')) settings.showHints = document.getElementById('show-hints').checked;
    if (document.getElementById('company-name')) settings.companyName = document.getElementById('company-name').value;
    if (document.getElementById('fiscal-year-end')) settings.fiscalYearEnd = document.getElementById('fiscal-year-end').value;
    if (document.getElementById('currency')) settings.currency = document.getElementById('currency').value;

    await window.storage.updateSettings(settings);

    // Visual feedback
    const btn = event?.target || document.querySelector('.btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Saved';
    btn.disabled = true;

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);

    console.log('✓ General settings updated');

  } catch (error) {
    console.error('Failed to save settings:', error);
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

async function saveIntegrationSettings(event) {
  if (event) event.preventDefault();

  try {
    const settings = await window.storage.getSettings();
    const apiKey = document.getElementById('google-ai-api-key').value;

    settings.googleAiApiKey = apiKey;
    await window.storage.updateSettings(settings);

    // Update singleton
    if (window.GoogleAICategorizer) {
      window.GoogleAICategorizer.apiKey = apiKey;
    }

    // Visual feedback
    const btn = event?.target || document.querySelector('.btn-primary');
    const originalText = btn.innerHTML;
    btn.innerHTML = '✅ Saved';
    btn.disabled = true;

    // Update badge
    const badge = document.getElementById('ai-status-badge');
    if (badge && apiKey) {
      badge.innerHTML = '<span style="width: 5px; height: 5px; background: #10b981; border-radius: 50%;"></span> KEY CONFIGURED';
      badge.style.color = '#10b981';
    }

    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }, 2000);

    console.log('✓ Integration settings updated');

  } catch (error) {
    console.error('Failed to save settings:', error);
  }
}

async function testAILink(event) {
  if (event) event.preventDefault();
  const apiKey = document.getElementById('google-ai-api-key').value;
  const resultArea = document.getElementById('ai-test-result');

  if (!apiKey) {
    // Show inline error
    if (resultArea) {
      resultArea.style.display = 'block';
      resultArea.style.background = '#fef2f2';
      resultArea.style.border = '1px solid #fecaca';
      resultArea.style.color = '#dc2626';
      resultArea.innerHTML = '<i class="ph ph-warning-circle" style="margin-right: 8px;"></i><strong>API Key Required:</strong> Please enter a valid Gemini API key above.';
    }
    return;
  }

  const btn = event.target;
  const originalText = btn.innerHTML;
  btn.innerHTML = '<i class="ph ph-circle-notch ph-spin"></i> Testing...';
  btn.disabled = true;

  // Hide previous result while testing
  if (resultArea) resultArea.style.display = 'none';

  try {
    const result = await window.GoogleAICategorizer.testConnection(apiKey);
    if (result.success) {
      // Show inline success message
      if (resultArea) {
        resultArea.style.display = 'block';
        resultArea.style.background = 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)';
        resultArea.style.border = '1px solid #86efac';
        resultArea.style.color = '#15803d';
        resultArea.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="ph ph-check-circle" style="font-size: 1.5rem; color: #16a34a;"></i>
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 2px;">✅ Connection Successful</div>
              <div style="font-size: 0.75rem; color: #166534;">Google Gemini AI is online and responsive. You can now use AI-powered categorization.</div>
            </div>
          </div>
        `;
      }
      // Also show toast notification
      if (window.toast) {
        window.toast.success('Google Gemini AI connected successfully!', { duration: 3000 });
      }
      // Update status badge
      const badge = document.getElementById('ai-status-badge');
      if (badge) {
        badge.innerHTML = '<span style="width: 5px; height: 5px; background: #10b981; border-radius: 50%;"></span> ACTIVE';
        badge.style.color = '#10b981';
      }
    } else {
      // Show inline error message
      if (resultArea) {
        resultArea.style.display = 'block';
        resultArea.style.background = '#fef2f2';
        resultArea.style.border = '1px solid #fecaca';
        resultArea.style.color = '#dc2626';
        resultArea.innerHTML = `
          <div style="display: flex; align-items: center; gap: 10px;">
            <i class="ph ph-x-circle" style="font-size: 1.5rem; color: #dc2626;"></i>
            <div>
              <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 2px;">❌ Connection Failed</div>
              <div style="font-size: 0.75rem; color: #991b1b;">${result.message || 'Unable to connect to Gemini API. Please check your API key.'}</div>
            </div>
          </div>
        `;
      }
      // Show toast error
      if (window.toast) {
        window.toast.error('AI connection failed: ' + result.message, { duration: 5000 });
      }
    }
  } catch (error) {
    // Show inline error message
    if (resultArea) {
      resultArea.style.display = 'block';
      resultArea.style.background = '#fef2f2';
      resultArea.style.border = '1px solid #fecaca';
      resultArea.style.color = '#dc2626';
      resultArea.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px;">
          <i class="ph ph-warning-octagon" style="font-size: 1.5rem; color: #dc2626;"></i>
          <div>
            <div style="font-weight: 700; font-size: 0.9rem; margin-bottom: 2px;">⚠️ Test Error</div>
            <div style="font-size: 0.75rem; color: #991b1b;">${error.message || 'An unexpected error occurred during the connection test.'}</div>
          </div>
        </div>
      `;
    }
    // Show toast error
    if (window.toast) {
      window.toast.error('Test error: ' + error.message, { duration: 5000 });
    }
  } finally {
    btn.innerHTML = originalText;
    btn.disabled = false;
  }
}

function renderAccountsList() {
  const container = document.getElementById('accounts-list');
  if (!container || !window.accountManager) return;

  const accounts = window.accountManager.getAllAccounts();

  if (accounts.length === 0) {
    container.innerHTML = `
        <div style="text-align: center; padding: 24px; background: #fdfdfd; border-radius: 10px; border: 1px dashed #e2e8f0;">
            <div style="font-size: 1.5rem; margin-bottom: 8px;">🏦</div>
            <p style="color: #94a3b8; font-size: 0.85rem; font-weight: 600; margin: 0;">No active ledgers detected.</p>
        </div>
    `;
    return;
  }

  container.innerHTML = accounts.map(acc => {
    const balance = window.accountManager.getAccountBalance(acc.id);
    const balanceFormatted = Math.abs(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    return `
      <div class="account-card" style="background: #fff; border: 1px solid rgba(226, 232, 240, 0.6); border-radius: 10px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; background: ${acc.type === 'bank' ? '#eff6ff' : '#fff1f2'}; color: ${acc.type === 'bank' ? '#2563eb' : '#e11d48'}; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.1rem;">
            <i class="ph ${acc.type === 'bank' ? 'ph-bank' : 'ph-credit-card'}"></i>
          </div>
          <div>
            <h4 style="margin: 0; font-size: 0.9rem; font-weight: 700; color: #1e293b;">${acc.accountName}</h4>
            <div style="font-size: 0.75rem; color: #94a3b8; font-weight: 600;">
              ${acc.type.toUpperCase()} • ${acc.accountNumber}
            </div>
          </div>
        </div>
        
        <div style="text-align: right; display: flex; align-items: center; gap: 16px;">
          <div>
            <div style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 2px;">Value</div>
            <div style="font-size: 1rem; font-weight: 800; color: #0f172a;">$${balanceFormatted}</div>
          </div>
          
          ${accounts.length > 1 ? `
            <button class="btn-icon delete" title="Delete" onclick="window.deleteAccountSettings('${acc.id}')" style="color: #cbd5e1; background: none; border: none; padding: 6px; cursor: pointer; transition: 0.2s; border-radius: 6px;">
                <i class="ph ph-trash-simple" style="font-size: 1rem;"></i>
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
