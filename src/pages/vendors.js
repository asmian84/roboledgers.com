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
          <button onclick="window.addNewVendor()" style="background: #1e293b; color: white; border: none; padding: 8px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; display: flex; align-items: center; gap: 8px;">
            <span>+</span> Add Rule
          </button>
        </div>

        <!-- AG GRID -->
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
  if (window.storage) {
    rowData = await window.storage.getVendors();
  }

  // ENRICH DATA (MOCK AI SCORING FOR NOW)
  rowData = rowData.map(v => ({
    ...v,
    confidence: v.confidence || Math.floor(Math.random() * 30) + 70, // Simulating 70-100% confidence
    count: v.count || 0
  }));

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
    }
  };

  new agGrid.Grid(gridDiv, gridOptions);
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
