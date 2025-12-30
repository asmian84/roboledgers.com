/**
 * Robo-Accountant "AI Brain" - Vendor Management System
 * Version 3.0 (AI-Core)
 */

// --- GLOBAL DEFINITION (CRITICAL FIX) ---
window.renderVendors = function () {
  console.log('🤖 Robo-Accountant: Rendering AI Brain...');

  // State Check
  // State Check (ALWAYS ON)
  const autoPilot = true;
  localStorage.setItem('ab3_autopilot', 'true');

  return `
    <div class="ai-brain-page" style="width: 100%; height: 100vh; display: flex; flex-direction: column; overflow: hidden;">
      
      <!-- HEADER: REMOVED LEGACY AI-HEADER TO CLEAN UP UI -->
      <!-- HEADER SUMMARY CARD (TRANSACTIONS STYLE) -->
       <div class="fixed-top-section" style="margin-bottom: 0;">
          <header class="dashboard-header-modern" style="background: white; padding: 16px 24px; border-radius: 12px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <div class="header-brand" style="display: flex; align-items: center; gap: 12px;">
                <div class="icon-box" style="width: 40px; height: 40px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">🧠</div>
                <div class="header-info">
                    <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Vendor Dictionary</h2>
                    <div class="meta" style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 6px;">
                        <span style="background: #eff6ff; color: #3b82f6; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 0.7rem;">AI MEMORY</span>
                        <span>•</span>
                        <span>Active Learning</span>
                    </div>
                </div>
            </div>

            <div class="header-stats" style="display: flex; gap: 24px; background: #f8fafc; padding: 8px 16px; border-radius: 12px; border: 1px solid #f1f5f9;">
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Total Vendors</label>
                    <div id="stat-total-vendors" class="val" style="font-size: 1.1rem; font-weight: 700; color: #1e293b;">--</div>
                </div>
                <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Categorized</label>
                    <div id="stat-categorized" class="val" style="font-size: 1.1rem; color:#10b981; font-weight:600;">--</div>
                </div>
                <!--
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Uncategorized</label>
                    <div id="stat-uncategorized" class="val" style="font-size: 1.1rem; color:#f59e0b; font-weight:600;">--</div>
                </div>
                -->
                <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                <div class="stat-unit">
                    <label style="font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 700;">Health</label>
                    <div id="stat-health" class="val" style="font-size: 1.1rem; color:#2563eb; font-weight:700;">--%</div>
                </div>
            </div>
          </header>

          <!-- TOOLBAR (Relocated) -->
          <div style="padding: 12px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; background: #fdfdfd;">
            <div style="display: flex; gap: 12px; align-items: center;">
               <input type="text" placeholder="Search knowledge base..." id="vendor-search" 
                      onkeyup="window.vendorsGridApi.setQuickFilter(this.value)"
                      style="padding: 6px 12px; border-radius: 6px; border: 1px solid #cbd5e1; width: 300px; font-size: 13px;">
            </div>

            <div style="display:flex; gap: 10px;">
              <button onclick="window.cleanGarbageVendors()" style="background: #ffffff; color: #f59e0b; border: 1px solid #f59e0b; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px;">
                 <i class="ph ph-magic-wand"></i> Mega Fix
              </button>
              <button onclick="window.addNewVendor()" style="background: #1e293b; color: white; border: none; padding: 6px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px; font-size: 13px;">
                  <span>+</span> Add Rule
              </button>
            </div>
          </div>
       </div>

      <!-- MAIN GRID CONTAINER (Full Width / Fluid) -->
      <div style="flex: 1; min-height: 0; background: #f1f5f9; padding: 0;">
        <div id="vendorsGrid" class="ag-theme-alpine" style="height: 100%; width: 100%;"></div>
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
      cellStyle: { textAlign: 'center', color: '#64748b', cursor: 'pointer', textDecoration: 'underline' },
      onCellClicked: params => {
        if (params.value > 0) {
          window.showVendorDrillDown(params.data.name, params.data.count);
        }
      }
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
  if (window.storage) {
    rowData = await window.storage.getVendors();
  }

  // ENRICH DATA (MOCK AI SCORING FOR NOW)
  rowData = rowData.map(v => ({
    ...v,
    confidence: v.confidence || Math.floor(Math.random() * 30) + 70, // Simulating 70-100% confidence
    count: v.count || 0
  }));

  // Update Stats (Header Card)
  const total = rowData.length;
  const categorized = rowData.filter(r => r.defaultAccount && r.defaultAccount !== 'Uncategorized').length;
  const health = total > 0 ? Math.round((categorized / total) * 100) : 0;

  const elTotal = document.getElementById('stat-total-vendors');
  const elCat = document.getElementById('stat-categorized');
  const elHealth = document.getElementById('stat-health');

  if (elTotal) elTotal.innerText = total;
  if (elCat) elCat.innerText = categorized;
  if (elHealth) {
    elHealth.innerText = health + '%';
    // Dynamic Color
    if (health < 50) elHealth.style.color = '#ef4444';
    else if (health < 80) elHealth.style.color = '#f59e0b';
    else elHealth.style.color = '#10b981';
  }

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
      params.api.sizeColumnsToFit();
    },
    onCellValueChanged: async (params) => {
      if (params.colDef.field === 'defaultAccount') {
        const newValue = params.newValue;
        const vendorId = params.data.id;
        console.log(`💾 Saving Category Change: ${params.data.name} -> ${newValue}`);
        await window.storage.updateVendor(vendorId, { defaultAccount: newValue });
        if (window.showToast) window.showToast('Rule saved!', 'success');
      }
    }
  };

  // Modern AG Grid
  window.vendorsGridApi = agGrid.createGrid(gridDiv, gridOptions);
};

// --- HELPER: Account Names ---
window.initVendorsGrid.getAccountNames = function () {
  return (window.DEFAULT_CHART_OF_ACCOUNTS || []).map(a => a.name);
};


// --- ACTIONS ---

window.toggleAutoPilot = function (el) {
  const isOn = el.checked;
  localStorage.setItem('ab3_autopilot', isOn);

  if (window.showToast) {
    window.showToast(isOn ? '🤖 Auto-Pilot ENABLED' : '🤖 Auto-Pilot DISABLED', isOn ? 'success' : 'info');
  }
};

window.scanForNewVendors = async function () {
  if (window.showToast) window.showToast('🧠 AI Scanning Transactions...', 'info');

  // Logic to scan transactionData for new descriptions
  const txns = window.transactionData || [];
  const vendors = await window.storage.getVendors();
  const existingNames = new Set(vendors.map(v => v.name.toLowerCase()));

  let newFound = 0;

  // Simple extraction logic
  const candidates = new Set();
  txns.forEach(t => {
    if (t.description && !existingNames.has(t.description.toLowerCase())) {
      candidates.add(t.description);
    }
  });

  if (window.showToast) window.showToast(`Found ${candidates.size} potential new rules.`, 'success');
};

window.deleteVendor = async function (id) {
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

window.cleanGarbageVendors = async function () {
  if (!confirm("MEGA FIX: 1. Auto-Assign categories based on history?\n2. Delete remaining empty/garbage rules?")) return;

  const vendors = await window.storage.getVendors();
  let updated = 0;

  // 1. AUTO ASSIGN (Simple Heuristic for now, or just filling Uncategorized)
  // For now, let's just look for obvious matches or use 'Unknown' -> 'Uncategorized' normalization
  // Or if we have a CategorizationEngine, use it.
  if (window.CategorizationEngine) {
    for (const v of vendors) {
      if (v.defaultAccount === 'Uncategorized' || !v.defaultAccount) {
        const suggestion = window.CategorizationEngine.classify({ description: v.name });
        if (suggestion && suggestion.confidence > 0.8) {
          await window.storage.updateVendor(v.id, { defaultAccount: suggestion.category });
          updated++;
        }
      }
    }
  }

  if (updated > 0) alert(`✅ Auto-Assigned ${updated} vendors.`);

  // 2. GARBAGE COLLECTION
  const freshVendors = await window.storage.getVendors(); // Reload
  const garbage = freshVendors.filter(v =>
    (v.defaultAccount === 'Uncategorized' || !v.defaultAccount) &&
    (v.name.length < 3 || /^\d+$/.test(v.name)) // Short or Pure Numbers
  );

  if (garbage.length === 0) {
    alert("No remaining garbage rules found.");
    return;
  }

  if (!confirm(`Found ${garbage.length} remaining garbage rules (Short/Unassigned). Delete them?`)) return;

  // Delete loop
  for (const v of garbage) {
    await window.storage.deleteVendor(v.id);
  }

  window.initVendorsGrid();
  alert(`Cleaned up ${garbage.length} rules.`);
};

// --- DRILL DOWN MODAL ---
window.showVendorDrillDown = async function (vendorName, count) {
  const modal = document.getElementById('vendor-drilldown-modal');
  const title = document.getElementById('drilldown-title');
  const list = document.getElementById('drilldown-list');

  if (!modal || !list) return;

  title.innerText = `${vendorName} (${count} txns)`;
  list.innerHTML = '<div style="padding:20px; text-align:center;">Loading...</div>';

  modal.style.display = 'flex';

  // Fetch Transactions
  let allTxns = [];
  if (window.storage) allTxns = await window.storage.getTransactions();

  const matches = allTxns.filter(t => t.description === vendorName || t.description.includes(vendorName));

  if (matches.length === 0) {
    list.innerHTML = '<div style="padding:20px; text-align:center; color:#64748b;">No matching transactions found.</div>';
    return;
  }

  const html = matches.map(t => `
        <div style="padding: 12px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <div style="font-weight: 600; font-size: 14px; color: #1e293b;">${t.date ? new Date(t.date).toLocaleDateString() : 'N/A'}</div>
                <div style="font-size: 12px; color: #64748b;">${t.description}</div>
            </div>
            <div style="font-weight: 700; color: ${t.type === 'credit' ? '#10b981' : '#1e293b'};">
                ${t.amount ? '$' + parseFloat(t.amount).toFixed(2) : '-'}
            </div>
        </div>
    `).join('');

  list.innerHTML = html;
};

window.closeVendorDrillDown = function () {
  const modal = document.getElementById('vendor-drilldown-modal');
  if (modal) modal.style.display = 'none';
};

