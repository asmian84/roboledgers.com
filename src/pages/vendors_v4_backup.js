/**
 * Vendors Page (v4.7 - Nuclear Intelligence Edition)
 * Optimized for quality over quantity. 
 * Features: Nuclear Purge Engine, COA-Dropdown Integration, Atomic Synchronization.
 */

// --- 1. DATA HELPERS ---

function getChartOfAccounts() {
  const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
  let rawCustom = [];
  try {
    rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
  } catch (e) { console.error('Failed to load custom COA', e); }

  const all = [...rawDefault, ...rawCustom];

  // Return flat list of names, excluding internal codes or "Invalid" strings
  return all
    .map(a => a.name)
    .filter(name => name && !name.toString().toLowerCase().includes("invalid"));
}

window.renderVendors = function () {
  return `
    <div class="page vendors-page" style="padding: 0; animation: fadeIn 0.5s ease-out; height: 100vh; display: flex; flex-direction: column; background: #f8fafc;">
      <style>
        .vendors-page { font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
        
        /* PREMIUM HEADER STYLE */
        .v-premium-header { 
            background: white; 
            padding: 16px 24px; 
            border-bottom: 1px solid #e2e8f0; 
            display: flex; 
            justify-content: space-between; 
            align-items: center;
            flex-shrink: 0;
        }
        .v-brand-area { display: flex; align-items: center; gap: 12px; }
        .v-icon-box { 
            width: 42px; height: 42px; 
            background: linear-gradient(135deg, #6366f1, #4f46e5); 
            color: white; border-radius: 12px; 
            display: flex; align-items: center; justify-content: center; font-size: 1.4rem; 
            box-shadow: 0 4px 12px rgba(79, 70, 229, 0.2);
        }
        .v-info-area h2 { margin: 0; font-size: 1.15rem; font-weight: 800; color: #0f172a; }
        .v-meta-status { font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 6px; }
        .v-status-badge { background: #f0fdf4; color: #16a34a; padding: 2px 8px; border-radius: 12px; font-weight: 700; font-size: 0.7rem; text-transform: uppercase; }

        .v-header-stats { display: flex; gap: 24px; padding: 6px 20px; border-radius: 14px; background: #f8fafc; border: 1px solid #f1f5f9; }
        .v-stat-unit { display: flex; flex-direction: column; }
        .v-stat-unit label { font-size: 0.65rem; text-transform: uppercase; color: #94a3b8; font-weight: 800; letter-spacing: 0.05em; margin-bottom: 2px; }
        .v-stat-unit .val { font-size: 1.1rem; font-weight: 700; color: #1e293b; }
        
        /* TOOLBAR */
        .v-toolbar { 
            padding: 12px 24px; display: flex; justify-content: space-between; align-items: center; 
            border-bottom: 1px solid #e2e8f0; background: #fdfdfd; flex-shrink: 0;
        }
        
        #bulk-actions-area {
            display: none; align-items: center; gap: 10px; padding: 6px 14px; 
            background: #eff6ff; border: 1px solid #dbeafe; border-radius: 8px;
            animation: slideIn 0.3s ease-out;
        }

        /* GRID WRAPPER */
        .v-grid-wrapper { flex: 1; padding: 12px; position: relative; min-height: 0; }
        #vendorsGrid {
            height: 100%; width: 100%; background: white;
            border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;
            box-shadow: 0 4px 15px -3px rgba(0,0,0,0.05);
        }

        .ag-theme-alpine { --ag-font-family: 'Inter', sans-serif; --ag-font-size: 13px; }
        
        .v-btn { 
            display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; 
            border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; 
            font-size: 13px;
        }
        .v-btn-primary { background: #4f46e5; color: white; }
        .v-btn-secondary { background: white; color: #475569; border: 1px solid #e2e8f0; }
        .v-btn-danger { background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; }
        .v-btn-magic { background: linear-gradient(135deg, #8b5cf6, #6366f1); color: white; }
        .v-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideIn { from { opacity: 0; transform: translateX(-10px); } to { opacity: 1; transform: translateX(0); } }
      </style>

      <div class="v-premium-header">
        <div class="v-brand-area">
          <div class="v-icon-box">☢️</div>
          <div class="v-info-area">
            <h2>Pristine Dictionary</h2>
            <div class="v-meta-status">
              <span class="v-status-badge">Nuclear Engine Active</span>
              <span>•</span>
              <span id="v-sync-text">Quality Over Quantity</span>
            </div>
          </div>
        </div>

        <div class="v-header-stats">
          <div class="v-stat-unit">
            <label>Clean Records</label>
            <div id="v-count-badge" class="val">0</div>
          </div>
          <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>
          <div class="v-stat-unit">
            <label>Data Quality</label>
            <div id="v-stat-health" class="val" style="color:#10b981;">0%</div>
          </div>
          <div class="v-stat-unit">
            <label>AI Confidence</label>
            <div id="v-stat-cat" class="val" style="color:#4f46e5;">0%</div>
          </div>
          <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>
          <div class="v-stat-unit">
            <label>Active Rules</label>
            <div id="v-stat-patterns" class="val">0</div>
          </div>
        </div>
      </div>

      <div class="v-toolbar">
         <div style="display: flex; gap: 12px; align-items: center;">
            <div id="bulk-actions-area">
                <span id="selection-count" style="font-size: 13px; font-weight: 800; color: #4f46e5; margin-right: 8px;">0 selected</span>
                <button class="v-btn v-btn-primary" style="padding: 4px 10px; font-size: 11px; background:#4f46e5;" onclick="window.bulkRecategorizeVendors()">✨ Recategorize</button>
                <button class="v-btn v-btn-danger" style="padding: 4px 10px; font-size: 11px;" onclick="window.bulkDeleteVendors()">🗑️ Delete</button>
            </div>
            <input type="text" placeholder="Filter dictionary..." id="vendor-search" 
                   onkeyup="window.vendorsGridApi.setQuickFilter(this.value)"
                   style="padding: 8px 16px; border-radius: 10px; border: 1px solid #e2e8f0; width: 300px; font-size: 13px; outline: none; background: #f8fafc;">
         </div>
         
         <div style="display: flex; gap: 10px;">
            <button class="v-btn v-btn-magic" style="padding: 6px 14px;" onclick="window.cleanGarbageVendors()">
                <i class="ph-bold ph-magic-wand"></i> Nuclear Mega Fix
            </button>
            <button class="v-btn v-btn-secondary" style="padding: 6px 14px;" onclick="document.getElementById('v-file-input').click()">Restore</button>
            <input type="file" id="v-file-input" style="display:none" onchange="window.restoreFromVendorsFile(this)">
            <button class="v-btn v-btn-primary" style="padding: 6px 14px; background: #0f172a;" onclick="router.navigate('/vendors/new')">+ New Rule</button>
         </div>
      </div>

      <div class="v-grid-wrapper">
        <div id="vendorsGrid" class="ag-theme-alpine"></div>
        <div id="v-loading-overlay" style="position:absolute; inset:0; background:white; display:flex; flex-direction:column; align-items:center; justify-content:center; z-index:100; border-radius:12px;">
           <div class="spinner" style="width:36px; height:36px; border:4px solid #f3f3f3; border-top:4px solid #4f46e5; border-radius:50%; animation:spin 1s linear infinite;"></div>
           <p style="margin-top:12px; color:#64748b; font-weight:600; font-size: 13px;">Pritining Dictionary Data...</p>
        </div>
      </div>
    </div>
  `;
};

/**
 * INIT FLOW
 */
window.initVendorsGrid = async function () {
  const container = document.getElementById('vendorsGrid');
  if (!container) return;

  try {
    if (!window.merchantDictionary.isInitialized) await window.merchantDictionary.init();
    const rawMerchants = await window.merchantDictionary.getAllMerchants();
    const coaNames = getChartOfAccounts();

    // Stats Calculation
    const total = rawMerchants.length;
    const valid = rawMerchants.filter(m => !m.display_name.includes('[IGNORE]')).length;
    const health = total > 0 ? Math.round((valid / total) * 100) : 0;
    const avgConfidence = total > 0 ? Math.round((rawMerchants.reduce((s, m) => s + (m.categorization_confidence || 0), 0) / total) * 100) : 0;

    document.getElementById('v-count-badge').textContent = total.toLocaleString();
    document.getElementById('v-stat-health').textContent = `${health}%`;
    document.getElementById('v-stat-cat').textContent = `${avgConfidence}%`;
    document.getElementById('v-stat-patterns').textContent = rawMerchants.reduce((s, m) => s + (m.description_patterns?.length || 0), 0).toLocaleString();

    const columnDefs = [
      { width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },
      { field: 'display_name', headerName: 'Clean Merchant', flex: 2, sortable: true, filter: 'agTextColumnFilter', cellStyle: { fontWeight: 700, color: '#1e293b' } },
      {
        field: 'default_category',
        headerName: 'Category (COA)',
        flex: 1.5,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: { values: ['Uncategorized', 'Miscellaneous', ...coaNames] },
        cellRenderer: params => {
          const val = params.value || 'Uncategorized';
          const color = val === 'Uncategorized' || val === 'Miscellaneous' ? '#94a3b8' : '#2563eb';
          const bg = val === 'Uncategorized' || val === 'Miscellaneous' ? 'transparent' : '#eff6ff';
          return `<span style="background:${bg}; color:${color}; padding:2px 8px; border-radius:12px; font-weight:700; font-size:12px;">${val}</span>`;
        }
      },
      {
        field: 'categorization_confidence',
        headerName: 'AI Confidence',
        width: 130,
        cellRenderer: params => {
          const val = Math.round((params.value || 0) * 100);
          const color = val > 80 ? '#10b981' : val > 50 ? '#f59e0b' : '#ef4444';
          return `<div style="display:flex; align-items:center; gap:8px;">
                        <div style="flex:1; height:6px; background:#f1f5f9; border-radius:3px; overflow:hidden;">
                            <div style="width:${val}%; height:100%; background:${color};"></div>
                        </div>
                        <span style="color:${color}; font-weight:800; font-size:11px;">${val}%</span>
                    </div>`;
        }
      },
      { field: 'industry', headerName: 'Industry', flex: 1, sortable: true, cellStyle: { color: '#64748b' } },
      {
        headerName: '',
        width: 60,
        pinned: 'right',
        cellRenderer: params => `
                    <button onclick="window.deleteVendor('${params.data.id}')" style="border:none; background:transparent; color:#ef4444; cursor:pointer; font-size:16px; opacity:0.6; transition:0.2s;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">✕</button>
                `
      }
    ];

    const gridOptions = {
      columnDefs: columnDefs,
      rowData: rawMerchants.sort((a, b) => (a.display_name || '').localeCompare(b.display_name || '')),
      rowSelection: 'multiple',
      pagination: true,
      paginationPageSize: 100,
      rowHeight: 48,
      headerHeight: 44,
      animateRows: true,
      onCellValueChanged: async (params) => {
        const vendor = params.data;
        console.log('📝 Dictionary: Auto-Saving vendor update...', vendor.display_name);
        await window.merchantDictionary.updateMerchant(vendor.id, vendor);
      },
      onSelectionChanged: () => {
        const nodes = window.vendorsGridApi.getSelectedNodes();
        const bulkArea = document.getElementById('bulk-actions-area');
        const countEl = document.getElementById('selection-count');
        if (bulkArea) {
          bulkArea.style.display = nodes.length > 0 ? 'flex' : 'none';
          if (countEl) countEl.textContent = `${nodes.length} selected`;
        }
      },
      onGridReady: (params) => {
        window.vendorsGridApi = params.api;
        params.api.sizeColumnsToFit();
        const overlay = document.getElementById('v-loading-overlay');
        if (overlay) overlay.style.display = 'none';
      }
    };

    agGrid.createGrid(container, gridOptions);
    window.addEventListener('resize', () => { if (window.vendorsGridApi) window.vendorsGridApi.sizeColumnsToFit(); });
  } catch (err) { console.error('❌ Vendors Init Failed:', err); }
};

/**
 * NUCLEAR CLEANING ENGINE
 */
window.cleanGarbageVendors = async function () {
  const confirmation = confirm(
    "🚀 TRIGGER NUCLEAR CLEANING PROTOCOL?\n\n" +
    "Targeting: Pure amounts, Bank Wires, ID strings, Accounting placeholers.\n" +
    "Objective: Quality Over Quantity.\n\n" +
    "This will permanently purge roughly 30-50% of the currently messy records."
  );
  if (!confirmation) return;

  try {
    const raw = await window.merchantDictionary.getAllMerchants();
    const cleanedMap = new Map();
    let purgedCount = 0;

    for (const m of raw) {
      let name = (m.display_name || "").trim().toUpperCase();

      // 1. NUCLEAR JUNK FILTERS (PURGE)
      const isAmount = /^[\d,.\s%$€£¥]+$/.test(name);
      const isWireID = /WIRE|\d{6,}|0EBITCARD|INTERAC|DEBITCARD|PURCHASE|PYMT|PMT|REF\d+/i.test(name);
      const isAccounting = /^(ACCOUNTING|ACCOUNTS|ACCRUALS|ACCT|AMORT|OPENING|BALANTE|PYMT|TRANSFER|PAYMENT)/i.test(name);
      const isPlaceholder = /IGNORE|PLACEHOLDER|NULL|UNDEFINED|UNKNOWN|N\/A/i.test(name);
      const tooShort = name.length < 3 || (!/[A-Z]/.test(name)); // No letters

      if (isAmount || isWireID || isPlaceholder || tooShort || isAccounting) {
        purgedCount++;
        continue;
      }

      // 2. ADVANCED CLEANING (STRIP)
      const cleanResult = window.merchantCategorizer.cleanTransaction(name);
      let finalName = cleanResult.clean_name.toUpperCase();

      // Aggressive Prefix Strip for 10k style junk (e.g. "123456 COFFEE" -> "COFFEE")
      finalName = finalName.replace(/^[\d\s-]{3,}/, '').trim();
      // Trailing ID Strip (e.g. "WALMART 1234" -> "WALMART")
      finalName = finalName.replace(/\s+#?\d{3,}$/, '').trim();

      if (finalName.length < 3) { purgedCount++; continue; }

      // 3. FUZZY DEDUPLICATION (MERGE)
      if (cleanedMap.has(finalName)) continue;

      cleanedMap.set(finalName, {
        ...m,
        display_name: finalName,
        default_category: cleanResult.default_category || m.default_category || 'Miscellaneous',
        industry: cleanResult.industry || m.industry || 'Miscellaneous',
        categorization_confidence: cleanResult.confidence || 0.3
      });
    }

    const output = Array.from(cleanedMap.values());
    await window.merchantDictionary.bulkSaveMerchants(output, null, true);
    alert(`☢️ Nuclear Cleanup Successful!\n\nPurged items: ${purgedCount}\nClean records: ${output.length}`);
    location.reload();
  } catch (err) { alert('Nuclear Error: ' + err.message); }
};

/**
 * ACTIONS
 */
window.deleteVendor = async (id) => {
  if (confirm("Delete this vendor?")) {
    await window.merchantDictionary.deleteMerchant(id);
    location.reload();
  }
};

window.bulkDeleteVendors = async () => {
  const nodes = window.vendorsGridApi.getSelectedNodes();
  if (confirm(`Delete ${nodes.length} items?`)) {
    for (const node of nodes) await window.merchantDictionary.deleteMerchant(node.data.id);
    location.reload();
  }
};

window.bulkRecategorizeVendors = async () => {
  const nodes = window.vendorsGridApi.getSelectedNodes();
  const updated = nodes.map(node => {
    const r = window.merchantCategorizer.cleanTransaction(node.data.display_name);
    return { ...node.data, default_category: r.default_category, serialization_confidence: r.confidence };
  });
  await window.merchantDictionary.bulkSaveMerchants(updated, null, false);
  location.reload();
};

window.restoreFromVendorsFile = (input) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const merchants = JSON.parse(e.target.result).merchants || JSON.parse(e.target.result);
    await window.merchantDictionary.bulkSaveMerchants(merchants, null, true);
    location.reload();
  };
  reader.readAsText(input.files[0]);
};
