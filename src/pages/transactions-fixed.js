/**
 * Transactions Page - Unified Command Center
 * Strict Layout Compliance Version - REFACTORED V2
 * Decluttered & Spacious
 */

// EMERGENCY FIX: Sanitize corrupted huge numbers (Robust Version)
// EMERGENCY FIX: Sanitize corrupted huge numbers (Nuclear Option)
// EMERGENCY FIX: Sanitize corrupted huge numbers and bad mappings
window.sanitizeData = function () {
  // REMOVED: 500ms artificial delay for instant performance ⚡
  let fixed = false;
  if (!window.transactionData) return;

  // console.log('🧹 Running Deep Clean...'); 
  // Commented out log to reduce console noise

  // Filter out rows that are clearly garbage (e.g. numeric descriptions, invalid dates)
  const initialCount = window.transactionData.length;
  window.transactionData = window.transactionData.filter(t => {
    // Rule 1: Date must be valid
    if (!t.date || t.date === 'Invalid Date' || isNaN(new Date(t.date).getTime())) return false;

    // Rule 2: Description cannot be a number (e.g. "-20.36")
    // Check if description matches money regex
    const descClean = String(t.description).replace(/[$,\s\-]/g, '');
    if (descClean.length > 0 && !isNaN(parseFloat(descClean)) && isFinite(descClean)) {
      return false;
    }

    // Rule 3: Description cannot be "Inv" or empty
    if (!t.description || t.description === 'Inv' || t.description.length < 2) return false;

    return true;
  });

  if (window.transactionData.length !== initialCount) {
    console.warn(`🗑️ Removed ${initialCount - window.transactionData.length} garbage rows.`);
    fixed = true;
  }

  // Now clean values of remaining
  window.transactionData.forEach(t => {
    // Check for scientific notation strings explicitly or massive numbers
    const dStr = String(t.debit);
    const cStr = String(t.credit);

    const isBad = (val) => {
      if (!val) return false;
      if (String(val).toLowerCase().includes('e+')) return true; // Scientific notation
      const n = parseFloat(val);
      return !isNaN(n) && Math.abs(n) > 1000000000; // > 1 Billion
    };

    if (isBad(t.debit)) { t.debit = 0; fixed = true; }
    if (isBad(t.credit)) { t.credit = 0; fixed = true; }
    if (isNaN(parseFloat(t.debit))) t.debit = 0;
    if (isNaN(parseFloat(t.debit))) t.debit = 0;
    if (isNaN(parseFloat(t.credit))) t.credit = 0;
  });

  if (fixed) {
    console.warn('⚠️ Auto-sanitized corrupted transaction data.');
    saveTransactions();
    // Force full page reload to clear any caching ghosts
    window.location.reload();
  } else {
    // if (window.showToast) window.showToast('Data scan complete. Grid is clean.', 'success');
    // console.log('✅ Data appears clean.');
  }

  // AUTO-RUN: Trigger smart categorization silently on load
  // This ensures the "Unallocated" count is accurate and rules are applied immediately.
  setTimeout(() => {
    if (window.runAutoCategorize) window.runAutoCategorize(true);
  }, 500); // Short delay to ensure VendorEngine is loaded
};

if (typeof window.transactionData === 'undefined') {
  window.transactionData = [];
}

// Ensure at least one dummy data for visualization if empty
if (window.transactionData.length === 0) {
  // FIXED: Consistent storage key with storage.js
  const saved = localStorage.getItem('ab3_transactions');
  if (saved) {
    try {
      window.transactionData = JSON.parse(saved);
      sanitizeData(); // Auto-heal corrupted data
    } catch (e) { console.error('Error loading local transactions', e); }
  }
} else {
  // Also sanitize if data was pre-loaded
  sanitizeData();
}

// State for filters and UI
// State for filters and UI
window.transactionState = {
  search: '',
  refPrefix: localStorage.getItem('txn_refPrefix') || '',
  openingBalance: parseFloat(localStorage.getItem('txn_openingBalance')) || 0.00,
  confirmingDelete: new Set(),
  menuOpen: false,
  csvHistory: JSON.parse(localStorage.getItem('csv_history') || '[]'),
  sortConfig: { key: 'date', direction: 'desc' } // Default Sort
};

// Full Chart of Accounts
// Full Chart of Accounts (Dynamic)
function getChartOfAccounts() {
  const raw = window.DEFAULT_CHART_OF_ACCOUNTS || [];
  const grouped = {
    'Assets': [],
    'Liabilities': [],
    'Equity': [],
    'Revenue': [],
    'Expenses': [] //, 'Other': [] implicit
  };

  raw.forEach(acc => {
    // USER REQUEST: Show only name, no code.
    const label = acc.name;
    const type = (acc.type || '').toLowerCase().trim();

    // Fuzzy Matching
    if (type.includes('asset')) grouped['Assets'].push(label);
    else if (type.includes('liab')) grouped['Liabilities'].push(label); // catches Liability, Liabilities
    else if (type.includes('equity')) grouped['Equity'].push(label);
    else if (type.includes('rev') || type.includes('income')) grouped['Revenue'].push(label);
    else if (type.includes('exp')) grouped['Expenses'].push(label);
    else {
      if (!grouped['Other']) grouped['Other'] = [];
      grouped['Other'].push(label);
    }
  });

  // Clean up empty groups BUT keep major ones if needed? 
  // No, we only want tabs for what we have.
  Object.keys(grouped).forEach(k => {
    if (grouped[k].length === 0) delete grouped[k];
  });

  return grouped;
}

window.renderTransactions = function () {
  const filteredData = getFilteredTransactions();
  // Unallocated Count for Badge
  const unallocatedCount = (window.transactionData || []).filter(t => !t.accountDescription || t.accountDescription === 'Uncategorized').length;

  // Totals
  const totalIn = filteredData.reduce((acc, t) => acc + (parseFloat(t.credit) || 0), 0);
  const totalOut = filteredData.reduce((acc, t) => acc + (parseFloat(t.debit) || 0), 0);
  const ending = parseFloat(window.transactionState.openingBalance) + totalIn - totalOut;

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return `
    <div class="transaction-page">
      
      <!-- FIXED SECTION: Header & Controls -->
      <!-- FIXED SECTION: Header & Controls -->
      <div class="fixed-top-section">
      
          <style>
              /* Embedded Header Styles for High-Level UX */
              .dashboard-header-modern {
                  background: #ffffff;
                  padding: 16px 24px;
                  border-bottom: 1px solid #e2e8f0;
                  display: flex;
                  justify-content: space-between;
                  align-items: center;
                  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
              }
              .header-brand {
                  display: flex;
                  align-items: center;
                  gap: 12px;
              }
              .header-brand .icon-box {
                  width: 40px; 
                  height: 40px; 
                  background: linear-gradient(135deg, #3b82f6, #2563eb); 
                  color: white; 
                  border-radius: 10px; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center;
                  font-size: 1.25rem;
                  box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.3);
              }
              .header-info h2 {
                  margin: 0;
                  font-size: 1.1rem;
                  font-weight: 700;
                  color: #0f172a;
                  letter-spacing: -0.01em;
              }
              .header-info .meta {
                  font-size: 0.8rem;
                  color: #64748b;
                  display: flex;
                  align-items: center;
                  gap: 6px;
              }
              .badge-account {
                  background: #eff6ff; 
                  color: #3b82f6; 
                  padding: 2px 8px; 
                  border-radius: 12px; 
                  font-weight: 600; 
                  font-size: 0.7rem;
                  text-transform: uppercase;
                  letter-spacing: 0.05em;
              }

              .header-stats {
                  display: flex;
                  gap: 24px;
                  background: #f8fafc;
                  padding: 8px 16px;
                  border-radius: 12px;
                  border: 1px solid #f1f5f9;
              }
              .stat-unit {
                  display: flex;
                  flex-direction: column;
                  gap: 2px;
              }
              .stat-unit label {
                  font-size: 0.65rem;
                  text-transform: uppercase;
                  color: #94a3b8;
                  font-weight: 700;
                  letter-spacing: 0.05em;
              }
              .stat-unit .val {
                  font-size: 0.95rem;
                  font-weight: 600;
                  color: #334155;
                  font-family: 'Inter', system-ui, sans-serif;
                  font-variant-numeric: tabular-nums;
              }
              .val.green { color: #10b981; }
              .val.red { color: #ef4444; }
              .val.blue { color: #2563eb; font-weight: 700; }
              
              .editable-balance {
                  background: transparent;
                  border: none;
                  border-bottom: 1px dashed #cbd5e1;
                  width: 80px;
                  font-family: inherit;
                  font-size: inherit;
                  font-weight: inherit;
                  color: inherit;
                  padding: 0;
                  text-align: left;
                  cursor: text;
              }
              .editable-balance:focus {
                  outline: none;
                  border-bottom: 1px solid #3b82f6;
                  color: #3b82f6;
              }
          </style>

          <header class="dashboard-header-modern">
            <div class="header-brand">
                <div class="icon-box">🏦</div>
                <div class="header-info">
                   <h2>Imported Transactions</h2>
                   <div class="meta">
                      <span class="badge-account">Checking</span>
                      <span>•</span>
                      <span>Ready for Review</span>
                   </div>
                </div>
            </div>
            
            <!-- NEW: Header Actions -->
            <div class="header-actions">
                <button class="btn-primary" onclick="showCSVImportModal()" style="display:flex; align-items:center; gap:8px; padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s;">
                    <span style="font-size: 1.1em;">📥</span> Import Data (PDF/CSV)
                </button>
            </div>
            <div class="header-stats">
              <div class="stat-unit">
                 <label>Opening Bal</label>
                 <div class="val">
                    $<input type="number" step="0.01" class="editable-balance" value="${window.transactionState.openingBalance}" onchange="updateOpeningBalance(this.value)">
                 </div>
              </div>
              
              <!-- Separator -->
              <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>

              <div class="stat-unit">
                <label>Total In</label>
                <div class="val green">
                    +${fmt(totalIn).replace('$', '')}
                </div>
              </div>

               <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>

              <div class="stat-unit">
                <label>Total Out</label>
                <div class="val red">
                    -${fmt(totalOut).replace('$', '')}
                </div>
              </div>

               <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>

              <div class="stat-unit">
                <label>Ending Bal</label>
                <div class="val blue">
                    ${fmt(ending)}
                </div>
              </div>
            </div>
          </header>

          <!-- Row 2: Toolbar -->
          <div class="control-bar">
            <div class="control-left" style="display: flex; gap: 12px; align-items: center;">
              <input type="text" class="input-box input-ref" 
                     placeholder="[CHQ]" 
                     value="${window.transactionState.refPrefix}"
                     oninput="updateRefPrefix(this.value)">
              <input type="text" class="input-box input-search" 
                     placeholder="Search transactions..." 
                     value="${window.transactionState.search}"
                     oninput="handleSearch(this.value)"
                     style="width: 320px;">
                    
                </div>
            
            <div class="control-right btn-group">
               <!-- Global Status Badge (Moved Here) -->
               <div class="status-badge" onclick="window.location.hash='#/vendor-analysis'" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600; background: ${unallocatedCount > 0 ? '#fff7ed' : '#ecfdf5'}; color: ${unallocatedCount > 0 ? '#c2410c' : '#047857'}; border: 1px solid ${unallocatedCount > 0 ? '#ffedd5' : '#d1fae5'}; margin-right: 12px; cursor: pointer; transition: transform 0.1s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'">
                  <span>${unallocatedCount > 0 ? '⚠️' : '✅'}</span>
                  <span>${unallocatedCount} Unallocated Items</span>
               </div>
               
               <!-- Analysis Message PlaceHolder -->
               <div id="vendor-analysis-message" style="display: none;"></div>

               <!-- Repositioned/Reduced Actions -->
            <div class="action-menu">
               <button class="action-menu-btn" onclick="toggleTransactionMenu(this)">...</button>
               <div id="main-menu" class="action-menu-content">
                    <button class="action-menu-item" onclick="showCSVImport()">📥 Import CSV</button>
                    <button class="action-menu-item" onclick="addNewTransaction()">➕ Add Entry</button>
                    <button class="action-menu-item" onclick="analyzeVendors()">🔍 Analyze Vendors</button>
                    <button class="action-menu-item" onclick="runAutoCategorize()">🤖 Auto-Catch</button>
                    <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e2e8f0;">
                    <button class="action-menu-item" onclick="sanitizeData()">🚑 Fix Data</button>
                    <button class="action-menu-item" onclick="exportXLS()">📥 Export XLS</button>
                    <button class="action-menu-item" onclick="window.print()">🖨️ Print View</button>
                    <hr style="margin: 4px 0; border: 0; border-top: 1px solid #e2e8f0;">
                    <button class="action-menu-item danger" onclick="clearGrid()">🗑️ Clear All Data</button>
               </div>
            </div>
            </div>
          </div>
      </div>

      <!-- SCROLLABLE SECTION: Data Grid -->
      <div class="grid-container">
        <table class="uc-table">
          <thead>
            <tr>
              <th class="w-check"><input type="checkbox" onclick="toggleSelectAll(this)"></th>
              <th class="w-ref">REF #</th>
              <th class="w-date" onclick="handleSort('date')" style="cursor: pointer;">DATE ${getSortIndicator('date')}</th>
              <th class="w-payee" onclick="handleSort('description')" style="cursor: pointer;">PAYEE ${getSortIndicator('description')}</th>
              <th class="w-account" onclick="handleSort('accountDescription')" style="cursor: pointer;">ACCOUNT ${getSortIndicator('accountDescription')}</th>
              <th class="w-amount" onclick="handleSort('debit')" style="cursor: pointer;">DEBIT ${getSortIndicator('debit')}</th>
              <th class="w-amount" onclick="handleSort('credit')" style="cursor: pointer;">CREDIT ${getSortIndicator('credit')}</th>
              <th class="w-amount">BALANCE</th>
              <th class="w-actions">ACTION</th>
            </tr>
          </thead>
          <tbody id="txn-tbody">
            ${renderTableRows(filteredData)}
          </tbody>
        </table>
      </div>

      <!-- CSV Modal (Hidden) -->
      <!-- CSV Modal (Hidden) -->
      <div id="csv-dropzone" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; align-items: center; justify-content: center; backdrop-filter: blur(2px);">
         <div style="background: white; padding: 0; border-radius: 12px; width: 550px; max-height: 85vh; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);">
            
            <!-- Header -->
            <div style="padding: 1.5rem; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-size: 1.1rem; color: #1e293b;">Import Transactions</h3>
                <button class="uc-btn-icon" onclick="hideCSVImport()" style="font-size: 1.25rem;">&times;</button>
            </div>

            <!-- Content -->
            <div style="padding: 1.5rem; overflow-y: auto;">
                
                ${window.transactionState.pendingFile
      ? `
                    <!-- INLINE DUPLICATE WARNING -->
                    <div style="background-color: #fff7ed; border: 1px solid #ffedd5; border-radius: 8px; padding: 1.5rem; text-align: center; animation: fadeIn 0.2s;">
                        <div style="font-size: 2rem; margin-bottom: 0.5rem;">⚠️</div>
                        <h4 style="margin: 0 0 0.5rem 0; color: #9a3412;">Duplicate File Detected</h4>
                        <p style="margin: 0 0 1.5rem 0; color: #c2410c; font-size: 0.9rem;">
                            "<b>${window.transactionState.pendingFile.name}</b>" has been imported before.
                        </p>
                        
                        <div style="display: flex; gap: 12px; justify-content: center;">
                            <button onclick="cancelPendingFile()" 
                                    style="padding: 8px 16px; border-radius: 6px; border: 1px solid #fed7aa; background: white; color: #9a3412; cursor: pointer; font-weight: 500;">
                                Cancel
                            </button>
                            <button onclick="confirmPendingFile()" 
                                    style="padding: 8px 16px; border-radius: 6px; border: none; background: #ea580c; color: white; cursor: pointer; font-weight: 500; display: flex; align-items: center; gap: 6px;">
                                <span>Import Anyway</span>
                            </button>
                        </div>
                    </div>
                    `
      : `
                    <!-- DEFAULT UPLOAD BOX -->
                    <div style="border: 2px dashed #cbd5e1; padding: 2.5rem; margin-bottom: 2rem; border-radius: 12px; cursor: pointer; text-align: center; background-color: #f8fafc; transition: all 0.2s;" 
                         onclick="document.getElementById('csv-file-input').click()"
                         ondragover="event.preventDefault(); this.style.borderColor='#3b82f6'; this.style.backgroundColor='#eff6ff';"
                         ondragleave="this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#f8fafc';"
                         ondrop="handleFileDrop(event)"
                         onmouseover="this.style.borderColor='#94a3b8'; this.style.backgroundColor='#f1f5f9'"
                         onmouseout="this.style.borderColor='#cbd5e1'; this.style.backgroundColor='#f8fafc'">
                        <div style="font-size: 2.5rem; margin-bottom: 1rem; opacity: 0.7;">📂</div>
                        <p style="color: #64748b; font-weight: 500; margin: 0;">Click to upload CSV or drag file here</p>
                        <p style="color: #94a3b8; font-size: 0.8rem; margin-top: 0.5rem;">Supports standard bank exports</p>
                        <input type="file" id="csv-file-input" accept=".csv" style="display: none;" onchange="handleFileSelect(event)">
                    </div>
                    `
    }

                <!-- History Explorer -->
                <div id="csv-history-section">
                    <h4 style="font-size: 0.75rem; text-transform: uppercase; color: #94a3b8; margin-bottom: 1rem; letter-spacing: 0.05em; font-weight: 600;">Recent Imports</h4>
                    
                    ${window.transactionState.csvHistory.length === 0
      ? `<div style="text-align: center; padding: 2rem; color: #cbd5e1; border: 1px dashed #e2e8f0; border-radius: 8px;">No upload history</div>`
      : `<div style="display: flex; flex-direction: column; gap: 8px;">
                            ${window.transactionState.csvHistory.map(item => `
                                <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; background: white; border: 1px solid #f1f5f9; border-radius: 8px; transition: all 0.1s;">
                                    <div style="display: flex; align-items: center; gap: 12px;">
                                        <div style="width: 36px; height: 36px; background: #eff6ff; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #3b82f6; font-size: 1.1rem;">
                                            📄
                                        </div>
                                        <div style="display: flex; flex-direction: column;">
                                            <span style="font-weight: 500; font-size: 0.9rem; color: #334155;" title="${item.fileName}">
                                                ${item.fileName}
                                            </span>
                                            <span style="font-size: 0.75rem; color: #94a3b8;">
                                                ${item.date} • ${item.count} items
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div style="display: flex; gap: 4px;">
                                        <button class="icon-btn-modern" onclick="renameCSVItem('${item.id}')" title="Rename" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px; opacity:0.6; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">
                                            ✏️
                                        </button>
                                        <button class="icon-btn-modern text-blue" onclick="loadCSVItem('${item.id}')" title="Load to Grid" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px; opacity:0.6; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">
                                            📥
                                        </button>
                                        <button class="icon-btn-modern text-red" onclick="deleteCSVItem('${item.id}')" title="Delete" style="background:none; border:none; cursor:pointer; font-size:1.1rem; padding:4px; opacity:0.6; transition:opacity 0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">
                                            🗑️
                                        </button>
                                    </div>
                                </div>
                            `).join('')}
                           </div>`
    }
                </div>
            </div>
         </div>
      </div>

    </div>
  `;
};

function renderMainMenu() {
  return `
        <div class="smart-menu" style="display: block; right: 0; left: auto; top: 100%; width: 180px;">
            <div class="smart-menu-item" onclick="sanitizeData()">🚑 Fix Corrupted Data</div>
            <div class="smart-menu-item" onclick="showToast('Export feature coming soon.', 'info')">📥 Export XLS</div>
            <div class="smart-menu-item" onclick="clearGrid()">🗑️ Clear Grid</div>
            <div class="smart-menu-item" onclick="showToast('Settings moved to sidebar.', 'info')">⚙️ Settings</div>
        </div>
    `;
}

// --- DATA LOGIC ---

function getFilteredTransactions() {
  if (!window.transactionState.search) return window.transactionData;
  const term = window.transactionState.search.toLowerCase();

  const prefix = window.transactionState.refPrefix.replace(/[\[\]]/g, '');

  return window.transactionData.map((t, i) => {
    const calculatedRef = prefix ? `${prefix}-${String(i + 1).padEnd(3, '0')}` : String(i + 1).padStart(3, '0');
    return { ...t, _tempRef: calculatedRef };
  }).filter(t =>
    (t.description && t.description.toLowerCase().includes(term)) ||
    (t._tempRef && t._tempRef.toLowerCase().includes(term)) ||
    (t.accountDescription && t.accountDescription.toLowerCase().includes(term))
  ).sort((a, b) => {
    // Sorting Logic
    const { key, direction } = window.transactionState.sortConfig;
    if (!key) return 0;

    let valA = a[key];
    let valB = b[key];

    if (key === 'debit' || key === 'credit') {
      valA = parseFloat(valA) || 0;
      valB = parseFloat(valB) || 0;
    }
    if (key === 'date') {
      valA = new Date(valA || 0).getTime();
      valB = new Date(valB || 0).getTime();
    }
    if (typeof valA === 'string') valA = valA.toLowerCase();
    if (typeof valB === 'string') valB = valB.toLowerCase();

    if (valA < valB) return direction === 'asc' ? -1 : 1;
    if (valA > valB) return direction === 'asc' ? 1 : -1;
    return 0;
  });
}

window.updateRefPrefix = function (val) {
  window.transactionState.refPrefix = val;
  localStorage.setItem('txn_refPrefix', val);
  reRenderTable();
}

window.updateOpeningBalance = function (val) {
  window.transactionState.openingBalance = parseFloat(val) || 0;
  localStorage.setItem('txn_openingBalance', window.transactionState.openingBalance);
  const app = document.getElementById('app');
  if (app) app.innerHTML = window.renderTransactions();
}

window.handleSearch = function (val) {
  window.transactionState.search = val;
  reRenderTable();
}

window.toggleMainMenu = function () {
  window.transactionState.menuOpen = !window.transactionState.menuOpen;
  const app = document.getElementById('app');
  if (app) app.innerHTML = window.renderTransactions();
}

window.clearGrid = function () {
  ModalService.confirm('Clear Grid', 'Are you sure you want to clear all transactions? This cannot be undone.', () => {
    window.transactionData = [];
    saveTransactions();
    const app = document.getElementById('app');
    if (app) app.innerHTML = window.renderTransactions();
    showToast('Grid cleared successfully.', 'success');
  }, 'danger');
}

function reRenderTable() {
  const tbody = document.getElementById('txn-tbody');
  if (tbody) {
    tbody.innerHTML = renderTableRows(getFilteredTransactions());
  }
  // ⚡ TRIGGER ANALYSIS UPDATE ON PARTIAL RENDER
  if (window.updateAnalysisStatus) window.updateAnalysisStatus();
}

// --- RENDER ROWS ---

function renderTableRows(data) {
  if (data.length === 0) {
    return `
      <tr>
        <td colspan="9" style="padding: 4rem 2rem; text-align: center;">
            <div style="max-width: 450px; margin: 0 auto; display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
                <!-- Icon -->
                <div style="width: 80px; height: 80px; background: #eff6ff; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #3b82f6; font-size: 2.5rem; box-shadow: 0 10px 15px -3px rgba(59, 130, 246, 0.1);">
                    📂
                </div>
                
                <!-- Text -->
                <div>
                    <h3 style="margin: 0 0 0.5rem 0; font-size: 1.5rem; color: #1e293b; font-weight: 700;">No transactions yet.</h3>
                    <p style="margin: 0; color: #64748b; line-height: 1.5;">
                        Import your bank statement to get started.
                    </p>
                </div>

                <!-- Actions -->
                <div style="display: flex; gap: 1rem;">
                    <button onclick="showCSVImport()" class="btn-primary" style="padding: 0.75rem 1.5rem; font-size: 1rem; display: flex; align-items: center; gap: 8px;">
                        📥 Import CSV
                    </button>
                    <!-- "Add Entry" hidden as per user request (crossed out) -->
                </div>
            </div>
        </td>
      </tr>
    `;
  }

  const rawPrefix = window.transactionState.refPrefix;
  const prefix = rawPrefix ? rawPrefix.replace(/[\[\]]/g, '') : '';

  let runningBalance = window.transactionState.openingBalance;

  // --- OPTIMIZATION: Calculate Frequently Used Accounts ONCE ---
  // --- OPTIMIZATION: Calculate Frequently Used Accounts ONCE (Top 10 Expenses) ---
  const accountCounts = {};
  const coa = window.DEFAULT_CHART_OF_ACCOUNTS || [];
  const chartMap = new Map(coa.map(a => [a.code, a.name]));
  const nameToType = new Map(coa.map(a => [a.name, (a.type || '').toLowerCase()]));

  (window.transactionData || []).forEach(t => {
    let desc = t.accountDescription;
    if (desc && desc !== 'Uncategorized') {
      let cleanName = desc;

      // 1. Resolve pure number "6415" -> "Meals"
      if (/^\d{3,4}$/.test(desc) && chartMap.has(desc)) {
        cleanName = chartMap.get(desc);
      }
      // 2. Resolve "6415 - Meals" -> "Meals"
      const codeMatch = desc.match(/^(\d{3,4})\s?-\s?(.*)/);
      if (codeMatch) {
        cleanName = codeMatch[2];
      }

      // 3. Filter for EXPENSES only (User Request)
      const type = nameToType.get(cleanName) || '';
      if (type.includes('exp')) {
        accountCounts[cleanName] = (accountCounts[cleanName] || 0) + 1;
      }
    }
  });
  // Top 10 Expenses
  const topAccounts = Object.entries(accountCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
  // -----------------------------------------------------------
  // -----------------------------------------------------------

  return data.map((txn, index) => {
    // 1. Ref # Calculation
    const paddedIndex = String(index + 1).padStart(3, '0');
    const refDisplay = prefix ? `${prefix}-${paddedIndex}` : paddedIndex;

    // 2. Math & Normalization Logic
    // We treat existing debit/credit fields as robust inputs, but normalize for display
    // to ensure what affects the balance is ALWAYS visible.
    const rawDebit = parseFloat(txn.debit || 0);
    const rawCredit = parseFloat(txn.credit || 0);
    const netChange = rawCredit - rawDebit;

    runningBalance += netChange;

    // Determine Display Values from Net Change
    // If Net is negative, the money left the account -> Show as Debit (positive value)
    // If Net is positive, money entered -> Show as Credit
    const displayDebit = netChange < 0 ? Math.abs(netChange) : 0;
    const displayCredit = netChange > 0 ? netChange : 0;

    const isUncategorized = !txn.accountDescription;
    let accountLabel = txn.accountDescription || 'Uncategorized';

    // --- ACCOUNT DISPLAY NORMALIZATION ---
    // If the label is purely numeric (e.g. "6415"), find its real name (e.g. "Office Supplies")
    // This fixes the "Meals & Ent" inconsistency.
    // We check if it looks like a code (3-4 digits).
    if (/^\d{3,4}$/.test(accountLabel)) {
      const found = (window.DEFAULT_CHART_OF_ACCOUNTS || []).find(a => a.code === accountLabel);
      if (found) {
        // User requested: "make all like mels & ent" (which is text name)
        accountLabel = found.name;
      }
    }
    // -------------------------------------

    // Magic Wand for Auto-Categorized
    const autoIcon = txn._isAutoCategorized
      ? '<span title="Auto-Categorized via Vendor Rule" style="margin-left:4px; filter: grayscale(100%); opacity: 0.6;">🪄</span>'
      : '';

    const realIndex = window.transactionData.indexOf(txn);
    const isConfirmingDelete = window.transactionState.confirmingDelete.has(realIndex);

    // 3. Structured Account Dropdown
    let dropdownHtml = `<div class="smart-menu" id="dropdown-${realIndex}" style="display: none;">`;

    // A. Frequently Used

    // A. Frequently Used
    const counts = {};
    (window.transactionData || []).forEach(t => {
      if (t.accountDescription && t.accountDescription !== 'Uncategorized') {
        counts[t.accountDescription] = (counts[t.accountDescription] || 0) + 1;
      }
    }); // optimization: calculate this once per render, not per row? (Doing per row effectively for simplicity, but perf hit is minimal for <500 items)

    // Actually, calculate ONCE at top of function would be better. But inline here is safer for edit context.
    const topAccounts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);

    if (topAccounts.length > 0) {
      dropdownHtml += `<div class="smart-menu-header" style="background: #f0fdfa; color: #0f766e; border-bottom: 1px solid #ccfbf1;">Frequently Used</div>`;
      topAccounts.forEach(acc => {
        const safeAcc = acc.replace(/'/g, "\\'");
        dropdownHtml += `
            <div class="smart-menu-item" onclick="selectAccount(${realIndex}, '${safeAcc}')">
                <span style="color: #14b8a6; margin-right: 6px;">★</span> ${acc}
            </div>`;
      });
      dropdownHtml += `<div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>`;
    }

    // Grouped Options
    const coa = getChartOfAccounts();

    // TABS GENERATION
    const tabOrder = ['Expenses', 'Liabilities', 'Assets', 'Revenue', 'Equity', 'Other'];
    let activeTab = 'Expenses';
    if (!coa['Expenses'] || coa['Expenses'].length === 0) {
      activeTab = Object.keys(coa).find(k => coa[k].length > 0) || 'Other';
    }

    dropdownHtml += `<div class="smart-tabs">`;
    tabOrder.forEach(tab => {
      if (coa[tab] && coa[tab].length > 0) {
        const isActive = tab === activeTab ? 'active' : '';
        // Use window.toggleAccountTab(index, 'TabName')
        dropdownHtml += `<div class="smart-tab-item ${isActive}" onclick="event.stopPropagation(); window.toggleAccountTab(${realIndex}, '${tab}')">${tab}</div>`;
      }
    });
    dropdownHtml += `</div>`;

    dropdownHtml += `<div class="smart-tab-body">`;

    for (const [group, options] of Object.entries(coa)) {
      const isActive = group === activeTab ? 'active' : '';
      dropdownHtml += `<div id="tab-content-${realIndex}-${group}" class="smart-tab-content ${isActive}">`;

      options.forEach(acc => {
        // Escape quotes to prevent HTML breaking
        const safeAcc = acc.replace(/'/g, "\\'");
        dropdownHtml += `
                <div class="smart-menu-item" onclick="selectAccount(${realIndex}, '${safeAcc}')">
                    <span style="font-size: 0.75rem; color: #cbd5e1;">●</span> ${acc}
                </div>`;
      });
      dropdownHtml += `</div>`;
    }
    dropdownHtml += `</div></div>`;

    // 4. Strict Date Validation
    let dateDisplay = txn.date;
    const d = new Date(txn.date);
    if (isNaN(d.getTime())) {
      if (txn.date && txn.date.length > 0) {
        // It's garbage text "PAYMENT", hide it
        dateDisplay = '<span style="color:red; font-size:0.7rem;">Inv</span>';
      } else {
        dateDisplay = '';
      }
    } else {
      // Enforce standardized format YYYY-MM-DD for display consistency
      dateDisplay = d.toISOString().split('T')[0];
    }

    return `
      <tr>
        <td class="w-check"><input type="checkbox"></td>
        
        <td class="w-ref">${refDisplay}</td>
        
        <td class="w-date" title="${txn.date || ''}">${dateDisplay}</td>
        <td class="w-payee" contenteditable="true" onblur="updatePayee(${realIndex}, this.innerText)">${txn.description}</td>
        
        <!-- REMOVED: Reconcile Column -->
        
         <td class="w-account">
            <div class="smart-dropdown-wrapper">
                <div class="smart-pill ${isUncategorized ? 'uncategorized' : ''}" 
                     style="padding: 4px 12px; cursor: text; border: 1px solid ${isUncategorized ? '#fca5a5' : '#cbd5e1'}; background: ${isUncategorized ? '#fef2f2' : 'white'};"
                     onclick="window.openDropdown(${realIndex})">
                     
                     <input type="text" class="smart-pill-input" 
                            id="input-${realIndex}"
                            value="${accountLabel}" 
                            onfocus="window.openDropdown(${realIndex})"
                            onkeyup="window.handleDropdownInput(event, ${realIndex}, this.value)"
                            placeholder="Categorize..."
                            autocomplete="off">
                     <span style="font-size: 0.7rem; opacity: 0.5; pointer-events: none;">▼</span>
                </div>
                ${dropdownHtml}
            </div>
        </td>
        
        <td class="w-amount">${displayDebit > 0 ? '$' + displayDebit.toFixed(2) : ''}</td>
        <td class="w-amount text-green">${displayCredit > 0 ? '$' + displayCredit.toFixed(2) : ''}</td>
        
        <td class="w-amount" style="font-weight: 600;">$${runningBalance.toFixed(2)}</td>

        <td class="w-actions">
           <span class="action-icon" onclick="swapDebitCredit(${realIndex})" title="Swap Debit/Credit" style="margin-right: 8px; font-size: 1.1rem; cursor: pointer;">⇄</span>
            ${isConfirmingDelete
        ? `<span class="delete-confirm" onclick="confirmDelete(${realIndex})">Confirm? <b>Yes</b> / <b onclick="cancelDelete(${realIndex}, event)">No</b></span>`
        : `<span class="action-icon delete-icon" onclick="requestDelete(${realIndex})">✕</span>`
      }
        </td>
      </tr>
    `;
  }).join('');
}

// --- INTERACTIVITY ---

// --- INTERACTIVITY ---

window.handleSort = function (key) {
  const cfg = window.transactionState.sortConfig;
  if (cfg.key === key) {
    cfg.direction = cfg.direction === 'asc' ? 'desc' : 'asc';
  } else {
    cfg.key = key;
    cfg.direction = 'asc';
  }
  const app = document.getElementById('app');
  if (app) app.innerHTML = window.renderTransactions();
}

window.getSortIndicator = function (key) {
  const cfg = window.transactionState.sortConfig;
  if (cfg.key !== key) return '<span style="opacity:0.2; font-weight:normal;">⇅</span>';
  return cfg.direction === 'asc' ? '↑' : '↓';
}

window.toggleDropdown = function (event, index) {
  event.stopPropagation(); // Prevent immediate close

  // Close all other open menus first
  // Close all other open menus first
  document.querySelectorAll('.smart-menu').forEach(el => {
    // Check if we are opening THIS one
    const wrapper = event.currentTarget.closest('.smart-dropdown-wrapper');
    const myMenu = wrapper ? wrapper.querySelector('.smart-menu') : null;
    if (el !== myMenu) el.style.display = 'none';
  });

  // Find the menu relative to the clicked element
  // The clicked element is the .smart-pill
  // The menu is a sibling in .smart-dropdown-wrapper
  const wrapper = event.currentTarget.closest('.smart-dropdown-wrapper');
  const menu = wrapper.querySelector('.smart-menu');

  if (menu) {
    const isVisible = menu.style.display === 'block';
    menu.style.display = isVisible ? 'none' : 'block';

    if (!isVisible) {
      // Focus Search
      const searchInput = menu.querySelector('.smart-search-input');
      if (searchInput) setTimeout(() => searchInput.focus(), 50);

      // Add click listener to close when clicking outside
      document.addEventListener('click', function close(e) {
        if (!wrapper.contains(e.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', close);
        }
      });
    }
  }
};

// --- DROPDOWN SEARCH & TABS ---

window.toggleAccountTab = function (index, tabName) {
  const menu = document.getElementById(`dropdown-${index}`);
  if (!menu) return;

  // update tabs
  menu.querySelectorAll('.smart-tab-item').forEach(t => {
    if (t.innerText === tabName) t.classList.add('active');
    else t.classList.remove('active');
  });

  // update content
  menu.querySelectorAll('.smart-tab-content').forEach(c => {
    // We use a specific ID format for content: tab-content-{index}-{Group}
    if (c.id === `tab-content-${index}-${tabName}`) c.classList.add('active');
    else c.classList.remove('active');
  });
};

window.handleAccountSearch = function (index, term) {
  const menu = document.getElementById(`dropdown-${index}`);
  if (!menu) return;

  term = term.toLowerCase();
  const items = menu.querySelectorAll('.smart-menu-item');
  const tabs = menu.querySelector('.smart-tabs');
  const contents = menu.querySelectorAll('.smart-tab-content');
  const freqHeader = menu.querySelector('.smart-menu-header');

  if (!term) {
    // Reset Logic
    if (tabs) tabs.style.display = 'flex';
    if (freqHeader) freqHeader.style.display = 'block';

    const activeTabBtn = menu.querySelector('.smart-tab-item.active');
    const activeTabName = activeTabBtn ? activeTabBtn.innerText : 'Expenses';
    window.toggleAccountTab(index, activeTabName); // restore tab view

    items.forEach(i => i.style.display = 'block');
    // Reset styles for contents
    contents.forEach(c => {
      c.style.display = ''; // Clear inline block override from search
    });
    return;
  }

  // SEARCH MODE
  if (tabs) tabs.style.display = 'none';
  if (freqHeader) freqHeader.style.display = 'none';

  // Unhide ALL content blocks so we can search globally
  contents.forEach(c => {
    c.classList.add('active');
    c.style.display = 'block'; // force visible
  });

  // Filter Items
  items.forEach(item => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(term) ? 'block' : 'none';
  });
};

// --- DROPDOWN SEARCH & TABS ---

window.toggleAccountTab = function (index, tabName) {
  const menu = document.getElementById(`dropdown-${index}`);
  if (!menu) return;

  // update tabs
  menu.querySelectorAll('.smart-tab-item').forEach(t => {
    if (t.innerText === tabName) t.classList.add('active');
    else t.classList.remove('active');
  });

  // update content
  menu.querySelectorAll('.smart-tab-content').forEach(c => {
    // We use a specific ID format for content: tab-content-{index}-{Group}
    if (c.id === `tab-content-${index}-${tabName}`) c.classList.add('active');
    else c.classList.remove('active');
  });
};

window.handleAccountSearch = function (index, term) {
  const menu = document.getElementById(`dropdown-${index}`);
  if (!menu) return;

  term = term.toLowerCase();
  const items = menu.querySelectorAll('.smart-menu-item');
  const tabs = menu.querySelector('.smart-tabs');
  const contents = menu.querySelectorAll('.smart-tab-content');
  const freqHeader = menu.querySelector('.smart-menu-header');

  if (!term) {
    // Reset Logic
    if (tabs) tabs.style.display = 'flex';
    if (freqHeader) freqHeader.style.display = 'block';

    const activeTabBtn = menu.querySelector('.smart-tab-item.active');
    const activeTabName = activeTabBtn ? activeTabBtn.innerText : 'Expenses';
    window.toggleAccountTab(index, activeTabName); // restore tab view

    items.forEach(i => i.style.display = 'block');
    // Reset styles for contents
    contents.forEach(c => {
      c.style.display = ''; // Clear inline block override from search
    });
    return;
  }

  // SEARCH MODE
  if (tabs) tabs.style.display = 'none';
  if (freqHeader) freqHeader.style.display = 'none';

  // Unhide ALL content blocks so we can search globally
  contents.forEach(c => {
    c.classList.add('active');
    c.style.display = 'block'; // force visible
  });

  // Filter Items
  items.forEach(item => {
    const text = item.innerText.toLowerCase();
    item.style.display = text.includes(term) ? 'block' : 'none';
  });
};

window.selectAccount = async function (index, accountName) {
  if (window.transactionData[index]) {
    const txn = window.transactionData[index];
    const oldAccount = txn.accountDescription; // Unused for now but good for context

    // Update State
    txn.accountDescription = accountName;
    // Remove auto-flag if manual override happens (optional, but good for UI clarity)
    // txn._isAutoCategorized = false; 

    reRenderTable();
    saveTransactions();

    // --- BI-DIRECTIONAL LEARNING ---
    await checkAndLearnRule(txn, accountName);
  }
};

/**
 * Prompt user to save this categorization as a permanent rule
 */
async function checkAndLearnRule(txn, accountName) {
  if (!window.VendorEngine || !window.ModalService) return;

  // 1. Normalize
  const cleanName = window.VendorEngine.normalize(txn.description);
  if (!cleanName) return;

  // 2. Check if we already know this rule
  // We only prompt if it's NEW or DIFFERENT
  await window.VendorEngine.init(); // Refresh cache
  const existing = window.VendorEngine.match(txn.description);

  if (existing && existing.defaultAccountId === accountName) {
    // Already learned, nothing to do.
    return;
  }

  // 3. User Prompt
  const action = existing ? 'Updat' : 'Creat';
  const msg = `
        <div style="text-align: left;">
            <strong>${action}e Vendor Rule?</strong><br><br>
            Always categorize <b>${cleanName}</b> as <br>
            <span class="smart-pill" style="display:inline-block; margin-top:4px;">${accountName}</span> ?
        </div>
    `;

  const confirmed = await window.ModalService.confirm(msg);
  if (confirmed) {
    await window.VendorEngine.learn(txn.description, accountName);
    if (window.showToast) showToast(`Rule saved for ${cleanName}`, 'success');
  }
}

window.swapDebitCredit = function (index) {
  if (window.transactionData[index]) {
    const txn = window.transactionData[index];
    // Swap values
    const temp = txn.debit || 0;
    txn.debit = txn.credit || 0;
    txn.credit = temp;

    saveTransactions();
    reRenderTable();
  }
}

window.updatePayee = function (index, newVal) {
  if (window.transactionData[index]) {
    window.transactionData[index].description = newVal;
    saveTransactions();
  }
}

// --- DELETE LOGIC ---

window.requestDelete = function (index) {
  window.transactionState.confirmingDelete.add(index);
  reRenderTable();
}

window.cancelDelete = function (index, event) {
  event.stopPropagation();
  window.transactionState.confirmingDelete.delete(index);
  reRenderTable();
}

window.confirmDelete = function (index) {
  window.transactionData.splice(index, 1);
  window.transactionState.confirmingDelete.delete(index);
  const app = document.getElementById('app');
  if (app) app.innerHTML = window.renderTransactions();
  saveTransactions();
}


window.addNewTransaction = function () {
  window.transactionData.unshift({
    date: new Date().toISOString().split('T')[0],
    description: 'New Transaction',
    debit: 0,
    credit: 0,
    accountDescription: ''
  });

  const app = document.getElementById('app');
  if (app) app.innerHTML = window.renderTransactions();
  saveTransactions();
};

window.analyzeVendors = function () {
  window.location.hash = '#/reports/vendor-analysis';
};

// --- CSV LOGIC & HISTORY ---

window.showCSVImport = () => {
  // Re-render to ensure history is up to date if modified elsewhere
  const app = document.getElementById('app');
  // Simple re-render of modal content if needed, but for now full render works 
  // or we assume renderTransactions() is called on state change.
  // Trigger render to be safe:
  if (app) app.innerHTML = window.renderTransactions();

  // Find modal and show
  const modal = document.getElementById('csv-dropzone');
  if (modal) modal.style.display = 'flex';
};

window.hideCSVImport = () => {
  const modal = document.getElementById('csv-dropzone');
  if (modal) modal.style.display = 'none';
};

window.handleFileSelect = function (e) {
  const file = e.target.files[0];
  if (!file) return;

  // 1. Check Duplicates in History
  const existing = window.transactionState.csvHistory.find(h => h.fileName === file.name);
  if (existing) {
    // Set pending state and re-render modal to show warning
    window.transactionState.pendingFile = file;
    window.showCSVImport();
    // Reset input so change event can fire again if needed
    e.target.value = '';
    return;
  }
  readFile(file);
};

window.handleFileDrop = function (e) {
  e.preventDefault();
  e.stopPropagation();

  // Reset styles
  const zone = e.currentTarget;
  if (zone) {
    zone.style.borderColor = '#cbd5e1';
    zone.style.backgroundColor = '#f8fafc';
  }

  const file = e.dataTransfer.files[0];
  if (!file) return;

  // 1. Check Duplicates in History
  const existing = window.transactionState.csvHistory.find(h => h.fileName === file.name);
  if (existing) {
    window.transactionState.pendingFile = file;
    window.showCSVImport();
    return;
  }

  readFile(file);
};


function readFile(file) {
  const reader = new FileReader();
  reader.onload = function (event) {
    const csv = event.target.result;
    parseAndImportCSV(csv, file.name);
    window.hideCSVImport();
    window.transactionState.pendingFile = null;
  };
  reader.readAsText(file);
}

window.cancelPendingFile = function () {
  window.transactionState.pendingFile = null;
  window.showCSVImport(); // Re-render to show upload box
}

window.confirmPendingFile = function () {
  const file = window.transactionState.pendingFile;
  if (file) {
    readFile(file);
  }
}

async function parseAndImportCSV(csvText, fileName) {
  try {
    // Delegate to SmartCSV
    if (!window.SmartCSV) throw new Error("SmartCSV utility not loaded");

    let newTxns = window.SmartCSV.parse(csvText);

    if (newTxns.length === 0) {
      if (window.showToast) showToast('No valid transactions found in file.', 'warning');
      return;
    }

    // --- VENDOR ENGINE HOOK ---
    if (window.VendorEngine) {
      await window.VendorEngine.init();
      newTxns = window.VendorEngine.processTransactions(newTxns);
    }
    // --------------------------

    // 2. Add to Grid
    window.transactionData = [...newTxns, ...window.transactionData];

    // 3. Add to History
    const historyItem = {
      id: Date.now().toString(),
      fileName: fileName || 'Unknown.csv',
      date: new Date().toISOString().split('T')[0],
      count: newTxns.length,
      data: newTxns // Storing data to allow "Load into Grid" later
    };

    window.transactionState.csvHistory.unshift(historyItem);
    // Limit history to 20 items to save space
    if (window.transactionState.csvHistory.length > 20) {
      window.transactionState.csvHistory.pop();
    }

    saveCSVHistory();
    saveTransactions(); // Persist grid

    // 4. Update UI & Toast
    const app = document.getElementById('app');
    if (app) app.innerHTML = window.renderTransactions();

    if (window.showToast) showToast(`Successfully imported ${newTxns.length} transactions from ${fileName}`, 'success');
  } catch (error) {
    console.error(error);
    if (window.showToast) showToast(error.message, 'error');
  }
}



// History Actions

/**
 * REAL-TIME ANALYSIS DASHBOARD
 * Called on every grid render to update the header status.
 */
window.updateAnalysisStatus = function () {
  const txns = window.transactionData || [];
  if (txns.length === 0) return;

  let uncategorized = 0;
  txns.forEach(t => {
    // Robust Check:
    // 1. Missing account description
    // 2. Account description is literally "Uncategorized"
    // 3. (Optional) Missing ID, though description is the visual truth
    const desc = (t.accountDescription || '').trim();
    const isUnallocated = !desc || desc === '' || desc.toLowerCase() === 'uncategorized';

    if (isUnallocated) {
      uncategorized++;
    }
  });

  const msgBox = document.getElementById('vendor-analysis-message');
  if (!msgBox) return;

  if (uncategorized > 0) {
    // 🔴 RED STATE: Action Needed
    msgBox.innerHTML = `
        <span style="color: #ea580c; cursor: pointer;" onclick="window.location.hash='#/vendor-analysis'">
            ⚠️ <b>${uncategorized}</b> Unallocated Items
        </span> 
      `;
  } else {
    // 🟢 GREEN STATE: All Good
    msgBox.innerHTML = `
        <span style="color: #16a34a; font-weight: 700;">✅ All Allocated</span>
      `;
  }
};

/**
 * Manual Trigger for Analysis Modal (User Requested Button)
 */
window.analyzeVendors = function () {
  // 1. Force update the dashboard status first (just in case)
  if (window.updateAnalysisStatus) window.updateAnalysisStatus();

  // 2. Route to Dedicated Analysis Page (RoboLedger Style)
  window.location.hash = '#/vendor-analysis';
};


window.exportXLS = function () {
  const txns = window.transactionData || [];
  if (txns.length === 0) {
    showToast('No data to export', 'warning');
    return;
  }

  if (typeof XLSX === 'undefined') {
    showToast('Excel engine (SheetJS) not loaded.', 'error');
    return;
  }

  // 1. Format Data
  const exportData = txns.map(t => ({
    Date: t.date,
    Ref: t.ref || '',
    Payee: t.description,
    Account: t.accountDescription || 'Uncategorized',
    Debit: t.type === 'debit' ? parseFloat(t.amount) : 0,
    Credit: t.type === 'credit' ? parseFloat(t.amount) : 0,
    Balance: parseFloat(t.balance) || 0
  }));

  // 2. Create Sheet
  const ws = XLSX.utils.json_to_sheet(exportData);

  // 3. Create Workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Transactions");

  // 4. Save
  const filename = `AutoBook_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(wb, filename);
  showToast(`Exported ${filename}`, 'success');
};

window.menuTimer = null;
window.toggleTransactionMenu = function (btn) {
  const menu = btn.nextElementSibling;
  menu.classList.toggle('show');

  // Clear existing timer
  if (window.menuTimer) clearTimeout(window.menuTimer);

  // Auto-close after 4 seconds if open
  if (menu.classList.contains('show')) {
    window.menuTimer = setTimeout(() => {
      menu.classList.remove('show');
    }, 4000);
  }
}

// History Actions
window.loadCSVItem = function (id) {
  const item = window.transactionState.csvHistory.find(h => h.id === id);
  if (!item) return;

  ModalService.confirm('Load CSV', `Load ${item.count} transactions from "${item.fileName}" into the grid?`, () => {
    window.transactionData = [...item.data, ...window.transactionData];
    saveTransactions();
    const app = document.getElementById('app');
    if (app) app.innerHTML = window.renderTransactions();
    showToast(`Loaded ${item.count} transactions.`);
    window.hideCSVImport();
  });
};

window.deleteCSVItem = function (id) {
  ModalService.confirm('Delete History', 'Remove this import from history?', () => {
    window.transactionState.csvHistory = window.transactionState.csvHistory.filter(h => h.id !== id);
    saveCSVHistory();
    const app = document.getElementById('app');
    if (app) app.innerHTML = window.renderTransactions();
    window.showCSVImport();
  }, 'danger');
};

window.renameCSVItem = function (id) {
  const item = window.transactionState.csvHistory.find(h => h.id === id);
  if (!item) return;

  ModalService.prompt('Rename Import', 'New filename alias:', item.fileName, (newName) => {
    if (newName && newName.trim()) {
      item.fileName = newName.trim();
      saveCSVHistory();
      const app = document.getElementById('app');
      if (app) app.innerHTML = window.renderTransactions();
      window.showCSVImport();
    }
  });
};

function saveCSVHistory() {
  localStorage.setItem('csv_history', JSON.stringify(window.transactionState.csvHistory));
}

// --- PERSISTENCE ---

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(window.transactionData));
  if (window.storage && window.storage.saveTransactions) {
    window.storage.saveTransactions(window.transactionData);
  }
}

// --- NOTIFICATIONS ---
function showToast(message, type = 'success') {
  const toast = document.createElement('div');
  toast.style.position = 'fixed';
  toast.style.bottom = '20px';
  toast.style.right = '20px';
  toast.style.padding = '12px 24px';
  toast.style.borderRadius = '8px';
  toast.style.background = type === 'success' ? '#10b981' : '#ef4444';
  toast.style.color = 'white';
  toast.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
  toast.style.zIndex = '9999';
  toast.style.fontSize = '0.9rem';
  toast.style.fontWeight = '500';
  toast.style.display = 'flex';
  toast.style.alignItems = 'center';
  toast.style.gap = '8px';
  toast.style.animation = 'fadeIn 0.3s ease-out';

  toast.innerText = message;

  document.body.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.5s ease';
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// Add animation keyframes if not exists
if (!document.getElementById('toast-style')) {
  const style = document.createElement('style');
  style.id = 'toast-style';
  style.innerHTML = `
        @keyframes fadeIn {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
    `;
  document.head.appendChild(style);
}

// --- AI AUTO-CATEGORIZE FEATURE ---

window.runAutoCategorize = async function (silent = false) {
  if (!window.VendorEngine) return;
  if (!window.transactionData || window.transactionData.length === 0) {
    if (!silent && window.showToast) showToast('No transactions to categorize', 'warning');
    return;
  }

  if (!silent && window.showToast) showToast('🪄 Running 8-Layer Intelligence...', 'info');

  // 1. Initialize Engine (Train Bayes, Load Rules)
  await window.VendorEngine.init();

  // 2. Run Batch Processing
  // We pass the RAW reference so we can update in place or replace
  const beforeCount = window.transactionData.filter(t => t.accountDescription !== 'Uncategorized').length;
  const processed = window.VendorEngine.processTransactions(window.transactionData);
  const afterCount = processed.filter(t => t.accountDescription !== 'Uncategorized').length;

  const newlyCategorized = afterCount - beforeCount;

  // 3. Update State
  window.transactionData = processed;

  // 4. Save & Render
  if (window.storage) {
    await window.storage.saveTransactions(window.transactionData);
  }

  // Refresh Grid
  const tbody = document.getElementById('txn-tbody');
  if (tbody) tbody.innerHTML = window.renderTableRows(window.transactionData);

  // Update Status Box explicitly
  if (window.updateAnalysisStatus) window.updateAnalysisStatus();

  if (newlyCategorized > 0) {
    if (window.showToast) showToast(`🪄 Magic! Auto-categorized ${newlyCategorized} items.`, 'success');
  } else {
    if (!silent && window.showToast) showToast('No new matches found. Teach me!', 'info');
  }
}


// --- SELECT ALL FEATURE ---
window.toggleSelectAll = function (source) {
  const checkboxes = document.querySelectorAll('#txn-tbody input[type="checkbox"]');
  checkboxes.forEach(cb => {
    cb.checked = source.checked;
    // Trigger change event if needed for state tracking
    cb.dispatchEvent(new Event('change'));
  });
};

window.saveTransactions = function () {
  const data = window.transactionData;
  localStorage.setItem('ab3_transactions', JSON.stringify(data));
  localStorage.setItem('transactions', JSON.stringify(data)); // Legacy backup

  // Sync with Storage Service if available
  if (window.storage) {
    window.storage.saveTransactions(data);
  }
};
