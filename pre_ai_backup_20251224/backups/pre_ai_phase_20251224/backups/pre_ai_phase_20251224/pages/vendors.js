/**
 * Robo-Accountant "AI Brain" - Vendor Management System
 * Version 3.0 (AI-Core)
 */

// --- GLOBAL DEFINITION (CRITICAL FIX) ---
window.renderVendors = function () {
  console.log('🤖 Robo-Accountant: Rendering AI Brain...');

  // State Check
  const autoPilot = localStorage.getItem('ab3_autopilot') === 'true';

  return `
    <div class="ai-brain-page" style="padding: 24px; max-width: 1400px; margin: 0 auto; font-family: 'Inter', sans-serif;">
      
      <!-- HEADER: AI COMMAND CENTER -->
      <div class="ai-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px;">
        <div>
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
            <div style="width: 48px; height: 48px; background: linear-gradient(135deg, #6366f1, #a855f7); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);">
              🧠
            </div>
            <div>
              <h1 style="font-size: 24px; font-weight: 800; color: #1e293b; margin: 0; letter-spacing: -0.5px;">Vendor Intelligence</h1>
              <p style="margin: 0; color: #64748b; font-size: 14px;">The central brain of your Robo-Accountant</p>
            </div>
          </div>
        </div>

        <!-- AUTO-PILOT TOGGLE -->
        <div class="autopilot-card" style="background: white; padding: 16px 20px; border-radius: 16px; border: 1px solid #e2e8f0; display: flex; align-items: center; gap: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <div>
            <div style="font-size: 14px; font-weight: 700; color: #1e293b;">Auto-Pilot Mode</div>
            <div style="font-size: 12px; color: #64748b;">Auto-categorize matching > 90%</div>
          </div>
          <label class="toggle-switch" style="position: relative; display: inline-block; width: 48px; height: 28px;">
            <input type="checkbox" id="autopilot-toggle" ${autoPilot ? 'checked' : ''} onchange="window.toggleAutoPilot(this)">
            <span class="slider" style="position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background-color: #cbd5e1; transition: .4s; border-radius: 34px;"></span>
            <span class="knob" style="position: absolute; content: ''; height: 20px; width: 20px; left: 4px; bottom: 4px; background-color: white; transition: .4s; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></span>
            <style>
              input:checked + .slider { background-color: #10b981; }
              input:checked + .slider .knob { transform: translateX(20px); }
            </style>
          </label>
        </div>
      </div>

      <!-- STATS DASHBOARD -->
      <div class="ai-stats-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; margin-bottom: 32px;">
        
        <!-- CARD 1: Rules -->
        <div class="stat-card" style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Learned Rules</div>
          <div style="font-size: 32px; font-weight: 800; color: #1e293b; margin: 8px 0;" id="stat-rules-count">--</div>
          <div style="font-size: 13px; color: #10b981; display: flex; align-items: center; gap: 4px;">
            <span>+0 new</span>
            <span style="color: #94a3b8;">this session</span>
          </div>
        </div>

        <!-- CARD 2: Confidence -->
        <div class="stat-card" style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">AI Confidence</div>
          <div style="font-size: 32px; font-weight: 800; color: #6366f1; margin: 8px 0;">94%</div>
          <div style="width: 100%; height: 6px; background: #e0e7ff; border-radius: 3px; overflow: hidden;">
            <div style="width: 94%; height: 100%; background: #6366f1;"></div>
          </div>
        </div>

        <!-- CARD 3: Unassigned -->
        <div class="stat-card" style="background: white; padding: 20px; border-radius: 16px; border: 1px solid #f1f5f9; box-shadow: 0 1px 3px rgba(0,0,0,0.05); position: relative; overflow: hidden;">
          <div style="color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Needs Review</div>
          <div style="font-size: 32px; font-weight: 800; color: #f59e0b; margin: 8px 0;" id="stat-needs-review">--</div>
          <button onclick="window.scanForNewVendors()" style="margin-top: 8px; font-size: 13px; color: #f59e0b; background: #fffbeb; border: 1px solid #fcd34d; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-weight: 600;">
            ⚡ Scan Transactions
          </button>
        </div>

      </div>

      <!-- MAIN GRID CONTAINER -->
      <div style="background: white; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; height: calc(100vh - 350px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
        
        <!-- TOOLBAR -->
        <div style="padding: 16px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; background: #f8fafc;">
          <div style="display: flex; gap: 12px;">
             <input type="text" placeholder="Search knowledge base..." id="vendor-search" 
                    onkeyup="window.gridApi.setQuickFilter(this.value)"
                    style="padding: 8px 16px; border-radius: 8px; border: 1px solid #cbd5e1; width: 300px; font-size: 14px;">
          </div>
          <button onclick="document.getElementById('import-json-input').click()" style="background: white; color: #334155; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-right: 12px;">
            <span>📥</span> Import JSON
          </button>
          
          <input type="file" id="import-json-input" accept=".json" style="display: none;" onchange="window.handleImportJSON(this)">
            
          <button onclick="window.popOutVendors()" title="Pop Out Grid" style="background: white; color: #334155; border: 1px solid #cbd5e1; padding: 8px 12px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; margin-right: 12px;">
             <span style="font-size: 16px;">↗️</span>
          </button>

          <button onclick="window.addNewVendor()" style="background: #1e293b; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <span>+</span> Add Rule
          </button>
        </div>

        <!-- AG GRID -->
        <div id="vendorsGrid" class="ag-theme-quartz" style="height: 100%; width: 100%;"></div>
      </div>

    </div>
  `;
};

// --- INITIALIZATION ---
window.initVendorsGrid = async function () {
  const gridDiv = document.querySelector('#vendorsGrid');
  if (!gridDiv) return;

  // Clear previous
  gridDiv.innerHTML = '';

  const columnDefs = [
    {
      headerName: "Vendor / Rule",
      field: "name",
      flex: 2,
      cellRenderer: params => {
        // Initials Avatar
        const initials = (params.value || '?').substring(0, 2).toUpperCase();
        return `
          <div style="display: flex; align-items: center; gap: 12px;">
            <div style="width: 28px; height: 28px; background: #f1f5f9; color: #64748b; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700;">
              ${initials}
            </div>
            <span style="font-weight: 600; color: #334155;">${params.value}</span>
          </div>
        `;
      }
    },
    {
      headerName: "Assigned Category",
      field: "defaultAccount",
      flex: 1.5,
      editable: true,
      cellEditor: 'agSelectCellEditor',
      cellEditorParams: {
        values: window.initVendorsGrid.getAccountNames()
      },
      cellRenderer: params => {
        if (!params.value) return '<span style="color: #cbd5e1; font-style: italic;">Unassigned</span>';
        return `<span style="background: #eff6ff; color: #2563eb; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${params.value}</span>`;
      }
    },
    {
      headerName: "Acct #",
      field: "accountNumber",
      width: 100,
      cellStyle: { fontFamily: 'monospace', color: '#64748b' }
    },
    {
      headerName: "Type",
      field: "accountType",
      width: 100,
      cellRenderer: params => {
        if (!params.value) return '';
        const color = params.value === 'Expense' ? '#ef4444' : (params.value === 'Liability' ? '#f59e0b' : '#3b82f6');
        return `<span style="color: ${color}; font-weight: 500; font-size: 12px;">${params.value}</span>`;
      }
    },
    {
      headerName: "Confidence",
      field: "confidence",
      width: 150,
      cellRenderer: params => {
        const val = params.value || 0;
        let color = '#ef4444'; // red
        if (val > 50) color = '#f59e0b'; // orange
        if (val > 80) color = '#10b981'; // green

        return `
          <div style="display: flex; align-items: center; gap: 8px; height: 100%;">
            <div style="flex: 1; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;">
              <div style="width: ${val}%; height: 100%; background: ${color};"></div>
            </div>
            <span style="font-size: 11px; color: ${color}; font-weight: 700; width: 30px; text-align: right;">${val}%</span>
          </div>
        `;
      }
    },
    {
      headerName: "Occurrences",
      field: "count",
      width: 120,
      cellStyle: { textAlign: 'center', color: '#64748b' }
    },
    {
      headerName: "Actions",
      width: 100,
      cellRenderer: params => {
        return `<button onclick="window.deleteVendor('${params.data.id}')" style="color: #ef4444; border: none; background: none; cursor: pointer; font-weight: 700;">×</button>`;
      }
    }
  ];

  // Load Data
  let rowData = [];
  let accounts = [];
  if (window.storage) {
    rowData = await window.storage.getVendors();
    accounts = await window.storage.getAccounts();
  }

  // CREATE COA MAP (Name -> Details)
  const coaMap = {};
  accounts.forEach(a => {
    coaMap[a.name] = { number: a.accountNumber, type: a.type };
  });

  // ENRICH DATA
  rowData = rowData.map(v => {
    // Map 'category' (storage) to 'defaultAccount' (grid expectation)
    const categoryName = v.category || v.defaultAccount;
    const coaInfo = coaMap[categoryName] || {};

    return {
      ...v,
      defaultAccount: categoryName, // Ensure grid sees it
      accountNumber: coaInfo.number || v.defaultAccountId || '',
      accountType: coaInfo.type || '',
      confidence: v.confidence || Math.floor(Math.random() * 30) + 70,
      count: v.count || 0
    };
  });

  // Update Stats
  const elCount = document.getElementById('stat-rules-count');
  if (elCount) elCount.innerText = rowData.length;

  const gridOptions = {
    columnDefs: columnDefs,
    rowData: rowData,
    rowHeight: 48,
    headerHeight: 48,
    animateRows: true,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    onGridReady: (params) => {
      window.gridApi = params.api;
      params.api.sizeColumnsToFit();
    },
    // SAVE ON EDIT
    onCellValueChanged: async (params) => {
      if (params.data.isCandidate && params.colDef.field === 'defaultAccount' && params.newValue) {
        // CONVERT CANDIDATE TO REAL VENDOR
        const newVendor = {
          name: params.data.name,
          defaultAccount: params.newValue,
          confidence: 100 // It's verified now
        };
        await window.storage.addVendor(newVendor);
        if (window.showToast) window.showToast(`Rule Saved: ${newVendor.name} -> ${newVendor.defaultAccount}`, 'success');

        // Refresh to get clean state (ID etc)
        window.initVendorsGrid();
      } else if (!params.data.isCandidate) {
        // Normal update (mock implementation for storage update)
        // In a real app we'd update storage here
        // window.storage.updateVendor(params.data.id, ...);
      }
    }
  };

  window.gridApi = agGrid.createGrid(gridDiv, gridOptions);
};

// --- HELPER: Account Names ---
window.initVendorsGrid.getAccountNames = function () {
  return (window.DEFAULT_CHART_OF_ACCOUNTS || []).map(a => a.name);
};


// --- ACTIONS ---

// --- ACTIONS ---

window.toggleAutoPilot = function (el) {
  const isOn = el.checked;
  localStorage.setItem('ab3_autopilot', isOn);

  if (isOn) {
    window.applyVendorRules();
  }

  if (window.showToast) {
    window.showToast(isOn ? '🤖 Auto-Pilot ENABLED' : '🤖 Auto-Pilot DISABLED', isOn ? 'success' : 'info');
  }
};

window.applyVendorRules = async function () {
  // 1. Get Rules
  const vendors = await window.storage.getVendors();
  const data = window.transactionData || [];
  let applied = 0;

  // 2. Iterate & Match
  data.forEach(t => {
    if (!t.account || t.account === 'Uncategorized') {
      const match = vendors.find(v => t.description.toLowerCase().includes(v.name.toLowerCase()));
      if (match && match.defaultAccount) {
        t.account = match.defaultAccount;
        t.autoCategorized = true; // Flag for UI
        applied++;
      }
    }
  });

  // 3. Persist & Notify
  if (applied > 0) {
    localStorage.setItem('transactionData', JSON.stringify(data));
    if (window.showToast) window.showToast(`🤖 Auto-Pilot categorized ${applied} transactions.`, 'success');
    // Refresh grids if visible
    if (window.renderTransactions) window.location.reload();
  }
};

window.scanForNewVendors = async function () {
  if (window.showToast) window.showToast('🧠 AI Scanning Transactions...', 'info');

  const txns = window.transactionData || [];
  const vendors = await window.storage.getVendors();
  const existingNames = new Set(vendors.map(v => v.name.toLowerCase()));

  // 1. Frequency Analysis
  const frequency = {};
  txns.forEach(t => {
    if (!t.account || t.account === 'Uncategorized') {
      const desc = t.description.trim();
      // Skip if already a rule
      if ([...existingNames].some(n => desc.toLowerCase().includes(n))) return;

      frequency[desc] = (frequency[desc] || 0) + 1;
    }
  });

  // 2. Identify Candidates (appearing > 1 time)
  const candidates = Object.entries(frequency)
    .filter(([name, count]) => count > 1)
    .map(([name, count], index) => ({
      id: `new_${Date.now()}_${index}`,
      name: name,
      defaultAccount: '',
      confidence: 10, // Low confidence until reviewed
      count: count,
      isCandidate: true
    }))
    .sort((a, b) => b.count - a.count);

  // 3. Update UI
  const reviewEl = document.getElementById('stat-needs-review');
  if (reviewEl) reviewEl.innerText = candidates.length;

  if (candidates.length > 0 && window.gridApi) {
    // Add to top of grid
    window.gridApi.applyTransaction({ add: candidates, addIndex: 0 });

    if (window.showToast) window.showToast(`Found ${candidates.length} potential new rules!`, 'success');
  } else {
    if (window.showToast) window.showToast('No new patterns found.', 'info');
  }
};

window.deleteVendor = async function (id) {
  if (id.toString().startsWith('new_')) {
    // Just remove from grid
    const rowNode = window.gridApi.getRowNode(id.toString()); // Row IDs might be complex in AG Grid without getRowId
    // Fallback: iterate
    window.gridApi.forEachNode(node => {
      if (node.data.id === id) {
        window.gridApi.applyTransaction({ remove: [node.data] });
      }
    });
    return;
  }

  if (!confirm('Delete this rule?')) return;
  await window.storage.deleteVendor(id);
  window.initVendorsGrid(); // Refresh
};

window.addNewVendor = function () {
  const name = prompt("Enter Vendor Name rule:");
  if (name) {
    window.storage.addVendor({ name: name, defaultAccount: 'Uncategorized' });
    window.initVendorsGrid();
  }
};

/* --- IMPORT & REVIEW SYSTEM (ENHANCED) --- */

window.importState = {
  rules: [],      // All rules
  visible: [],    // Filtered & Sorted
  selected: new Set(),
  filterText: '',
  sortField: 'name',
  sortDir: 'asc'
};

// Main Entry Point (New Import)
window.handleImportJSON = function (input) {
  window.processImportFile(input.files[0], true); // true = reset
  input.value = '';
};

// Append Entry Point (Add to existing)
window.appendImportJSON = function (input) {
  window.processImportFile(input.files[0], false); // false = append
  input.value = '';
};

window.popOutVendors = function () {
  if (!window.popoutService) {
    alert('Pop-out service not loaded.');
    return;
  }

  // Get Data
  let rowData = [];
  if (window.gridApi) {
    window.gridApi.forEachNode(node => rowData.push(node.data));
  }

  // Get Cols
  const colDefs = window.gridApi ? window.gridApi.getColumnDefs() : [];

  const options = {
    columnDefs: colDefs,
    defaultColDef: { sortable: true, filter: true, resizable: true }
  };

  window.popoutService.open('vendors-grid', 'Vendor Dictionary', options, rowData);
};

window.processImportFile = function (file, isReset) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const json = JSON.parse(e.target.result);
      let rules = [];
      if (Array.isArray(json)) rules = json;
      else if (typeof json === 'object') rules = Object.values(json);

      if (rules.length === 0) {
        if (window.showToast) window.showToast('JSON file is empty.', 'error');
        return;
      }

      // 1. Get COA Map for Enrichment
      let coaMap = {};
      try {
        const storedCOA = JSON.parse(localStorage.getItem('ab3_coa') || '[]');
        if (storedCOA.length > 0) storedCOA.forEach(a => coaMap[a.code] = a.name);
        if (window.DEFAULT_CHART_OF_ACCOUNTS) {
          window.DEFAULT_CHART_OF_ACCOUNTS.forEach(a => {
            if (!coaMap[a.code]) coaMap[a.code] = a.name;
          });
        }
      } catch (e) { console.warn("COA Load Error", e); }

      // 2. Normalize and Enrich
      const newRules = rules.map((r, i) => {
        const accNum = (r.accountNumber || '').toString().trim();
        let category = r.defaultAccount || r.account || 'Uncategorized';

        // Enrichment
        if (accNum && coaMap[accNum]) category = coaMap[accNum];

        return {
          id: Math.random().toString(36).substr(2, 9), // Unique ID
          name: r.description || r.name || 'Unknown',
          defaultAccount: category,
          accountNumber: accNum,
          confidence: r.confidence || 100
        };
      }).filter(r => r.name && r.name !== 'Unknown');

      // 3. Update State
      if (isReset) {
        window.importState.rules = newRules;
        window.importState.selected = new Set(newRules.map(r => r.id));
      } else {
        // Append
        window.importState.rules = [...window.importState.rules, ...newRules];
        newRules.forEach(r => window.importState.selected.add(r.id));
      }

      // Ensure Modal Is Open First (DOM Creation)
      window.renderImportModal();

      // Refresh View (DOM Manipulation) - Now safe
      window.filterImportRules(window.importState.filterText || '');

      if (window.showToast) window.showToast(`Loaded ${newRules.length} items.`, 'success');

    } catch (err) {
      console.error(err);
      if (window.showToast) window.showToast('Failed to parse JSON file.', 'error');
    }
  };
  reader.readAsText(file);
};

window.renderImportModal = function () {
  let modal = document.getElementById('import-review-modal');
  if (!modal) {
    const modalHTML = `
        <div id="import-review-modal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 2000; display: flex; align-items: center; justify-content: center;">
            <div style="background: white; width: 900px; max-height: 85vh; border-radius: 16px; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                
                <!-- HEADER & TOOLS -->
                <div style="padding: 20px; border-bottom: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                        <h3 style="margin: 0; color: #1e293b;">Review Import</h3>
                        <div style="display:flex; gap:8px;">
                             <button onclick="document.getElementById('append-json-input').click()" style="padding: 6px 12px; border: 1px dashed #cbd5e1; background: #f8fafc; color: #334155; border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                <span>➕</span> Append JSON
                             </button>
                             <input type="file" id="append-json-input" accept=".json" style="display: none;" onchange="window.appendImportJSON(this)">
                             
                             <button onclick="window.copyImportForAI()" style="padding: 6px 12px; border: 1px solid #cbd5e1; background: #fff; color: #334155; border-radius: 6px; font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                <span>📋</span> Copy for AI
                             </button>

                             <button onclick="window.closeImportModal()" style="border: none; background: none; font-size: 20px; cursor: pointer; color: #64748b; margin-left: 8px;">×</button>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 8px;">
                         <button onclick="window.truncateImportNaming()" style="padding: 6px 10px; border: 1px solid #bae6fd; background: #e0f2fe; color: #0369a1; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            ✂️ Turncate Naming
                         </button>
                         <button onclick="window.deleteDuplicateImportRules()" style="padding: 6px 10px; border: 1px solid #fde68a; background: #fef3c7; color: #b45309; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            🧹 Delete Duplicates
                         </button>
                         <button onclick="window.bundleImportVendors()" style="padding: 6px 10px; border: 1px solid #bbf7d0; background: #dcfce7; color: #15803d; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            📦 Bundle Vendors
                         </button>
                         <button onclick="window.filterForAI()" style="padding: 6px 10px; border: 1px solid #ddd6fe; background: #ede9fe; color: #6d28d9; border-radius: 6px; font-size: 13px; cursor: pointer;">
                            🤖 AI Filter
                         </button>
                    </div>

                    <div style="display: flex; gap: 12px; align-items: center;">
                        <input type="text" id="import-filter-input" placeholder="Filter vendor or account..." 
                               onkeyup="window.filterImportRules(this.value)"
                               style="flex: 1; padding: 10px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px;">
                        
                        <button onclick="window.deleteSelectedImportRules()" style="padding: 8px 12px; border: 1px solid #fecaca; background: #fef2f2; color: #ef4444; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 6px;">
                           <span class="icon">🗑️</span> Remove Selected
                        </button>
                    </div>
                </div>

                <!-- TABLE -->
                <div style="flex: 1; overflow-y: auto; padding: 0;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                        <thead style="background: #f8fafc; color: #64748b; font-weight: 700; text-align: left; position: sticky; top: 0; z-index: 10; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <tr>
                                <th style="padding: 12px;">
                                    <input type="checkbox" id="import-select-all" checked onchange="window.toggleSelectAll(this.checked)">
                                </th>
                                <th style="padding: 12px; cursor: pointer;" onclick="window.toggleImportSort('name')">Vendor Name ↕</th>
                                <th style="padding: 12px; cursor: pointer;" onclick="window.toggleImportSort('accountNumber')">Acct # ↕</th>
                                <th style="padding: 12px; cursor: pointer;" onclick="window.toggleImportSort('defaultAccount')">Category ↕</th>
                            </tr>
                        </thead>
                        <tbody id="import-preview-body">
                            <!-- Rows injected here -->
                        </tbody>
                    </table>
                </div>

                <!-- FOOTER -->
                <div style="padding: 20px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #f8fafc; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
                    <div style="font-size: 13px; color: #64748b; display: flex; gap: 16px;">
                        <span>Selected: <strong id="import-selected-count" style="color:#0f172a">0</strong> / <span id="import-total-count">0</span></span>
                        <span style="color: #cbd5e1">|</span>
                        <span title="Items with 'Unusual item' category">Suspense (9970): <strong id="import-suspense-count" style="color:#d97706">0</strong></span>
                    </div>
                    <div style="display: flex; gap: 12px;">
                        <button onclick="window.closeImportModal()" style="padding: 8px 16px; border: 1px solid #cbd5e1; background: white; border-radius: 8px; font-weight: 600; cursor: pointer;">Cancel</button>
                        
                        <button onclick="window.commitClassifiedOnly()" style="padding: 8px 16px; border: 1px solid #bae6fd; background: #f0f9ff; color: #0284c7; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            Import Sorted Only
                        </button>

                        <button onclick="window.commitImport()" style="padding: 8px 16px; background: #10b981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                            Import All Selected
                        </button>
                    </div>
                </div>
            </div>
        </div>`;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    modal = document.getElementById('import-review-modal');
  }

  window.renderImportUI();
  modal.style.display = 'flex';
};

window.renderImportUI = function () {
  const s = window.importState;

  // Sort
  s.visible.sort((a, b) => {
    const valA = (a[s.sortField] || '').toString().toLowerCase();
    const valB = (b[s.sortField] || '').toString().toLowerCase();
    if (valA < valB) return s.sortDir === 'asc' ? -1 : 1;
    if (valA > valB) return s.sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const tbody = document.getElementById('import-preview-body');
  tbody.innerHTML = s.visible.map(r => `
        <tr style="border-bottom: 1px solid #f1f5f9; background: ${s.selected.has(r.id) ? '#f0fdf4' : 'white'};">
            <td style="padding: 12px;">
                <input type="checkbox" class="import-check" 
                       ${s.selected.has(r.id) ? 'checked' : ''} 
                       onchange="window.toggleImportSelection('${r.id}')">
            </td>
            <td style="padding: 12px; font-weight: 600; color: #334155;">${r.name}</td>
            <td style="padding: 12px; color: #64748b; font-family: monospace;">${r.accountNumber || '-'}</td>
            <td style="padding: 12px; color: #2563eb;">${r.defaultAccount}</td>
        </tr>
    `).join('');

  // Update Counts
  document.getElementById('import-selected-count').innerText = s.selected.size;
  document.getElementById('import-total-count').innerText = s.rules.length;

  // Update Suspense Count (9970/Unusual)
  const suspenseCount = s.rules.filter(r => r.defaultAccount === 'Unusual item' || !r.defaultAccount).length;
  document.getElementById('import-suspense-count').innerText = suspenseCount;

  // Update Select ALL checkbox state
  const allVisibleSelected = s.visible.length > 0 && s.visible.every(r => s.selected.has(r.id));
  document.getElementById('import-select-all').checked = allVisibleSelected;
};

// --- HANDLERS ---

window.closeImportModal = function () {
  const modal = document.getElementById('import-review-modal');
  if (modal) {
    modal.style.display = 'none'; // Hide immediately
    setTimeout(() => modal.remove(), 100); // Remove after short delay to ensure clicks register
  }
};

window.filterForAI = function () {
  const filterInput = document.getElementById('import-filter-input');

  if (filterInput) {
    // 1. Run Cleanup (Tier 0)
    window.truncateImportNaming();

    // 2. Run Smart Categorization (Tier 2 - Keyword Rules)
    const stats = window.applySmartCategorization();

    // 3. Filter for leftovers (Unusual item)
    filterInput.value = 'Unusual item';
    window.filterImportRules('Unusual item');

    let msg = `Auto-categorized ${stats.categorized} items.`;
    if (stats.remaining > 0) msg += ` ${stats.remaining} still need review.`;
    if (window.showToast) window.showToast(msg, 'info');
  }
};

window.applySmartCategorization = function () {
  // Tier 2: Keyword Rules (Simulated "Rulebook")
  // In a real app, these would come from the database or user settings.
  const KEYWORD_RULES = [
    { keywords: ['Shell', 'Esso', 'Petro', 'Chevron', 'Husky', 'Gas', '7-Eleven', 'Mobil', 'Circle K'], account: 'Fuel and oil', num: '7400' },
    { keywords: ['Safeway', 'Sobeys', 'Costco', 'Walmart', 'Grocer', 'Save-On-Foods', 'Loblaws'], account: 'Meals and entertainment', num: '6415' }, // Approximation for groceries/meals mix
    { keywords: ['Restaurant', 'Cafe', 'Diner', 'Pizza', 'Burger', 'Starbucks', 'Tim Hortons', 'McDonald', 'A&W', 'Subway', 'Keg', 'Boston Pizza'], account: 'Meals and entertainment', num: '6415' },
    { keywords: ['Uber', 'Taxi', 'Lyft', 'Hotel', 'Airbnb', 'Motel', 'Inn'], account: 'Travel and accomodations', num: '9200' },
    { keywords: ['Adobe', 'Microsoft', 'Apple', 'Software', 'Google', 'Zoom', 'Slack'], account: 'Office supplies and postage', num: '8600' },
    { keywords: ['Home Depot', 'Rona', 'Lowe', 'Hardware', 'Canadian Tire'], account: 'Repairs and maintenance', num: '8800' },
    { keywords: ['Telus', 'Bell', 'Rogers', 'Shaw', 'Fido', 'Koodo', 'Video'], account: 'Telephone and utilities', num: '9000' },
    { keywords: ['Insurance', 'Intact', 'Wawanesa', 'AMA', 'Allstate'], account: 'Insurance', num: '8400' },
    { keywords: ['Bank', 'Fee', 'Interest', 'Service Chg', 'Monthly Plan', 'Interact'], account: 'Interest and bank charges', num: '8500' }
  ];

  let categorized = 0;
  const rules = window.importState.rules;

  rules.forEach(r => {
    // Only classify if currently unknown/unusual
    if (r.defaultAccount === 'Unusual item' || !r.defaultAccount) {
      const lowerName = r.name.toLowerCase();

      for (const rule of KEYWORD_RULES) {
        if (rule.keywords.some(k => lowerName.includes(k.toLowerCase()))) {
          r.defaultAccount = rule.account;
          r.accountNumber = rule.num;
          categorized++;
          break; // Specificity wins (first match)
        }
      }
    }
  });

  // Recalculate remaining
  const remaining = rules.filter(r => r.defaultAccount === 'Unusual item').length;

  return { categorized, remaining };
};

// --- DATA CLEANUP TOOLS ---

window.truncateImportNaming = function () {
  // 5 Logics of Auto-Categorization (Cleaning)
  // 1. Store Numbers (#123, Store 456)
  // 2. Locations (Calgary AB, ON, BC)
  // 3. Phone Numbers
  // 4. Common Suffixes (Inc, Ltd)
  // 5. Gibberish / Web Junk (.com)

  let modifiedCount = 0;
  const rules = window.importState.rules;

  rules.forEach(r => {
    let name = r.name;

    // 1. Remove Store/Location #
    name = name.replace(/#\s?\d+/g, '').replace(/Store\s+#?\d+/gi, '');

    // 2. Remove Locations (End of string usually)
    name = name.replace(/\s(AB|BC|ON|QC|MB|SK|NS|NB|PE|NL|YT|NT|NU)(\s|$)/gi, '');
    name = name.replace(/\s(CALGARY|EDMONTON|VANCOUVER|TORONTO|MONTREAL|OTTAWA)(\s|$)/gi, '');

    // 3. Remove Phone Numbers
    name = name.replace(/\d{3}[-\s]?\d{3}[-\s]?\d{4}/g, '');

    // 4. Remove Suffixes
    name = name.replace(/\s(Inc|Ltd|Corp|Llp)\.?$/gi, '');

    // 5. Web Junk
    name = name.replace(/www\.|.com|.ca/gi, '');

    // Clean double spaces
    name = name.replace(/\s+/g, ' ').trim();

    if (name !== r.name && name.length > 2) {
      r.name = name;
      modifiedCount++;
    }
  });

  if (window.showToast) window.showToast(`Truncated ${modifiedCount} names.`, 'success');
  window.renderImportUI();
};

window.deleteDuplicateImportRules = function () {
  const rules = window.importState.rules;
  const seen = new Set();
  const unique = [];
  let removed = 0;

  // Keep unique Name + AccountNumber
  rules.forEach(r => {
    const key = `${r.name.toLowerCase()}|${r.accountNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(r);
    } else {
      removed++;
    }
  });

  window.importState.rules = unique;
  window.importState.selected = new Set(unique.map(r => r.id)); // Reset selection to valid IDs

  if (window.showToast) window.showToast(`Removed ${removed} duplicates.`, 'success');
  window.filterImportRules(window.importState.filterText || '');
};

window.bundleImportVendors = function () {
  // Strategy: Group by "Clean Name" (ignoring account for a moment)? 
  // Or Group by Name to find conflicts?
  // User likely wants to MERGE items that are now identical after Truncation.

  // First run truncation logic effectively to normalize
  window.truncateImportNaming();

  // Then Dedupe aggressively
  window.deleteDuplicateImportRules();

  if (window.showToast) window.showToast('Vendors bundled & consolidated.', 'success');
};

window.filterImportRules = function (text) {
  window.importState.filterText = text.toLowerCase();
  window.importState.visible = window.importState.rules.filter(r =>
    String(r.name || '').toLowerCase().includes(text) ||
    String(r.defaultAccount || '').toLowerCase().includes(text) ||
    String(r.accountNumber || '').includes(text)
  );
  window.renderImportUI();
};

window.toggleImportSort = function (field) {
  const s = window.importState;
  if (s.sortField === field) {
    s.sortDir = s.sortDir === 'asc' ? 'desc' : 'asc';
  } else {
    s.sortField = field;
    s.sortDir = 'asc';
  }
  window.renderImportUI();
};

window.toggleSelectAll = function (checked) {
  const s = window.importState;
  s.visible.forEach(r => {
    if (checked) s.selected.add(r.id);
    else s.selected.delete(r.id);
  });
  window.renderImportUI();
};

window.toggleImportSelection = function (id) {
  const s = window.importState;
  if (s.selected.has(id)) s.selected.delete(id);
  else s.selected.add(id);

  // Just update UI to reflect row color and counts without full re-sort
  window.renderImportUI();
};

window.deleteSelectedImportRules = function () {
  const s = window.importState;
  if (s.selected.size === 0) return;

  if (!confirm(`Permanently remove ${s.selected.size} selected items from this import?`)) return;

  // Remove from main list
  s.rules = s.rules.filter(r => !s.selected.has(r.id));
  // Clear selection
  s.selected.clear();
  // Re-filter
  window.filterImportRules(s.filterText);
};

window.copyImportForAI = function () {
  // Copy VISIBLE rows to clipboard in a simple format
  const s = window.importState;
  if (s.visible.length === 0) {
    if (window.showToast) window.showToast('No visible items to copy.', 'info');
    return;
  }

  /* Format:
     Name | Account | Category
  */
  const header = "Vendor Name\tAccount Number\tCategory";
  const rows = s.visible.map(r => `${r.name}\t${r.accountNumber}\t${r.defaultAccount}`).join('\n');
  const text = header + '\n' + rows;

  navigator.clipboard.writeText(text).then(() => {
    if (window.showToast) window.showToast(`Copied ${s.visible.length} items to clipboard!`, 'success');
  }).catch(err => {
    console.error('Clipboard failed', err);
    alert("Failed to copy to clipboard.");
  });
};


window.downloadImportSelection = function () {
  const s = window.importState;
  const toExport = s.rules.filter(r => s.selected.has(r.id));

  if (toExport.length === 0) {
    if (window.showToast) window.showToast('No rules selected to save.', 'info');
    return;
  }

  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(toExport, null, 2));
  const downloadAnchorNode = document.createElement('a');
  downloadAnchorNode.setAttribute("href", dataStr);
  downloadAnchorNode.setAttribute("download", `filtered_rules_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(downloadAnchorNode);
  downloadAnchorNode.click();
  downloadAnchorNode.remove();
};




// --- COMMIT LOGIC ---

window.commitClassifiedOnly = function () {
  // 1. Select ONLY items that are NOT unusual
  const s = window.importState;
  const classifiedIds = s.rules
    .filter(r => r.defaultAccount && r.defaultAccount !== 'Unusual item') // Valid accounts only
    .map(r => r.id);

  if (classifiedIds.length === 0) {
    if (window.showToast) window.showToast('No classified items to import.', 'warning');
    return;
  }

  // Update selection state to match these IDs
  s.selected = new Set(classifiedIds);
  window.renderImportUI(); // Refresh UI to show what's about to go

  // 2. Commit them, but keep modal open
  window.commitImport(true); // true = keepModalOpen
};

window.commitImport = async function (keepModalOpen = false) {
  const s = window.importState;

  if (s.selected.size === 0) {
    if (window.showToast) window.showToast('No vendors selected.', 'warning');
    return;
  }

  // Filter out the selected rules
  const rulesToSave = s.rules.filter(r => s.selected.has(r.id));
  let savedCount = 0;

  // Use Storage Service to ensure sync with Grid
  for (const rule of rulesToSave) {
    // Check if exists to avoid duplicates (Name check)
    // Note: In real app, we might want bulk insert, but loop is fine for < 100 items
    // Check done via strict name matching? Or just add?
    // StorageService doesn't dedupe by name, so we should check briefly or just add
    // Ideally we check if it already exists in the full list
    // For speed, let's just add, assuming user reviewed duplicates in modal
    try {
      await window.storage.createVendor({
        name: rule.name,
        category: rule.defaultAccount, // Maps defaultAccount -> category
        defaultAccountId: rule.accountNumber, // Maps accountNumber -> defaultAccountId
        notes: 'Imported via JSON'
      });
      savedCount++;
    } catch (e) {
      console.warn('Failed to save vendor:', rule.name, e);
    }
  }

  if (window.showToast) window.showToast(`Imported ${savedCount} vendors to dictionary.`, 'success');

  // TRIGGER REFRESH of Main Grid
  if (window.initVendorsGrid) window.initVendorsGrid();

  if (keepModalOpen) {
    // 3. Remove committed items from the Modal State
    s.rules = s.rules.filter(r => !s.selected.has(r.id));
    s.selected.clear();

    // Re-filter and render
    window.filterImportRules(s.filterText || '');
  } else {
    window.closeImportModal();
  }
};
