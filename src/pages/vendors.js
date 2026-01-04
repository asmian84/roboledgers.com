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

  const groups = {
    'ASSETS': [],
    'LIABILITIES': [],
    'EQUITY': [],
    'REVENUE': [],
    'EXPENSES': []
  };

  all.forEach(a => {
    const code = parseInt(a.code);
    const name = a.name;
    if (!name || name.toLowerCase().includes("invalid")) return;

    if (code >= 1000 && code <= 1999) groups['ASSETS'].push(name);
    else if (code >= 2000 && code <= 2999) groups['LIABILITIES'].push(name);
    else if (code >= 3000 && code <= 3999) groups['EQUITY'].push(name);
    else if (code >= 4000 && code <= 4999) groups['REVENUE'].push(name);
    else groups['EXPENSES'].push(name);
  });

  return groups;
}

window.renderVendors = function () {
  return `
    <div class="page vendors-page" style="padding: 0; animation: fadeIn 0.5s ease-out; height: 100vh; display: flex; flex-direction: column; background: #f8fafc;">
      <style>
        .vendors-page { font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }
        
        /* PREMIUM HEADER STYLE */
        .v-premium-header { 
            padding: 16px 24px; 
            border-bottom: 1px solid #e2e8f0; 
            background: white;
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

         /* DROPDOWN SYSTEM */
         .dropdown-container { position: relative; }
         .btn-icon-menu { 
             background: white; border: 1px solid #e2e8f0; border-radius: 8px; color: #64748b; 
             padding: 8px; cursor: pointer; transition: all 0.2s; height: 36px; width: 36px; 
             display: flex; align-items: center; justify-content: center; 
         }
         .btn-icon-menu:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
         .dropdown-menu {
             position: absolute; top: 100%; right: 0; left: auto; margin-top: 6px;
             background: white; border: 1px solid #e2e8f0; border-radius: 12px;
             box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1); 
             width: 200px; z-index: 1000; padding: 6px; display: flex; flex-direction: column;
         }
         .dropdown-menu.hidden { display: none; }
         .dropdown-item { 
             display: flex; align-items: center; gap: 10px; padding: 10px 14px; border: none; 
             background: none; width: 100%; text-align: left; font-size: 0.85rem; font-weight: 600; 
             color: #334155; cursor: pointer; border-radius: 8px; transition: background 0.1s; 
         }
         .dropdown-item:hover { background: #f1f5f9; color: #0f172a; }
         .dropdown-item i { font-size: 1.1rem; width: 20px; text-align: center; }
         .dropdown-item.danger { color: #ef4444; }
         .dropdown-item.danger:hover { background: #fee2e2; color: #b91c1c; }
         .dropdown-divider { height: 1px; background: #e2e8f0; margin: 6px 0; }
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
            <label>Top Industry</label>
            <div id="v-stat-industry" class="val" style="color:#10b981;">-</div>
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
                <button class="v-btn v-btn-secondary" style="padding: 4px 10px; font-size: 11px; color:#4f46e5; border-color:#4f46e5;" onclick="window.bulkWikiEnrich()">🌐 Wiki Enrich</button>
                <button class="v-btn v-btn-secondary" style="padding: 4px 10px; font-size: 11px; color:#10b981; border-color:#10b981;" onclick="window.bulkCleanVendors()">🪄 Clean</button>
                <button class="v-btn v-btn-danger" style="padding: 4px 10px; font-size: 11px;" onclick="window.bulkDeleteVendors()">🗑️ Delete</button>
            </div>
            <input type="text" placeholder="Filter dictionary..." id="vendor-search" 
                   onkeyup="window.vendorsGridApi.setQuickFilter(this.value)"
                   style="padding: 8px 16px; border-radius: 10px; border: 1px solid #e2e8f0; width: 300px; font-size: 13px; outline: none; background: #f8fafc;">
         </div>
         
         <div style="display: flex; gap: 12px; align-items: center;">
            <button class="v-btn v-btn-primary" style="padding: 8px 16px; background: #0f172a;" onclick="router.navigate('/vendors/new')">
               <i class="ph ph-plus-circle"></i> New Rule
            </button>

            <div class="dropdown-container">
               <button class="btn-icon-menu" onclick="window.toggleVendorMenu(event)" title="More Options">
                   <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
               </button>
               <div id="vendor-dropdown-menu" class="dropdown-menu hidden">
                   <button onclick="window.backupVendorsDictionary()" class="dropdown-item">
                       <i class="ph ph-download-simple"></i>
                       <span>Safety Backup</span>
                   </button>
                   <button onclick="window.exportVendorsToExcel()" class="dropdown-item">
                       <i class="ph ph-file-xls"></i>
                       <span>Export Excel</span>
                   </button>
                   <button onclick="window.vortexCleanVendors()" class="dropdown-item">
                       <i class="ph ph-flask"></i>
                       <span>Vortex Cleanse</span>
                   </button>
                   <button onclick="window.masterMergeVendors()" class="dropdown-item">
                       <i class="ph ph-brain"></i>
                       <span>Master Merge</span>
                   </button>
                   <button onclick="window.bulkWikiEnrich(false)" class="dropdown-item">
                       <i class="ph ph-globe"></i>
                       <span>Wiki Enrich All</span>
                   </button>
                   <button onclick="document.getElementById('v-file-input').click()" class="dropdown-item">
                       <i class="ph ph-upload-simple"></i>
                       <span>Restore Data</span>
                   </button>
                   <div class="dropdown-divider"></div>
                   <button onclick="window.nuclearPurgeVendors()" class="dropdown-item danger">
                       <i class="ph ph-warning"></i>
                       <span>Nuclear Purge</span>
                   </button>
               </div>
               <input type="file" id="v-file-input" style="display:none" onchange="window.restoreFromVendorsFile(this)">
            </div>
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
 * CUSTOM CELL EDITOR: Hierarchical Select
 */
class CategoryCellEditor {
  init(params) {
    this.params = params;
    this.container = document.createElement('div');
    this.container.className = 'custom-category-editor';
    this.container.style.cssText = `
            background: white; border: 1px solid #cbd5e1; border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); width: 280px;
            max-height: 400px; overflow-y: auto; padding: 8px; z-index: 1000;
        `;

    const groups = getChartOfAccounts();
    const currentValue = params.value;

    Object.keys(groups).forEach(groupName => {
      const accounts = groups[groupName];
      if (accounts.length === 0) return;

      const groupEl = document.createElement('div');
      groupEl.className = 'coa-group';
      groupEl.style.cssText = `margin-bottom: 4px;`;

      const header = document.createElement('div');
      header.className = 'coa-header';
      header.innerHTML = `<span class="coa-toggle">▶</span> ${groupName}`; // Changed to ▶
      header.style.cssText = `
                padding: 6px 10px; font-weight: 800; font-size: 11px; color: #64748b;
                text-transform: uppercase; cursor: pointer; display: flex; align-items: center; gap: 8px;
                background: #f8fafc; border-radius: 6px;
            `;

      const list = document.createElement('div');
      list.className = 'coa-list';
      list.style.display = 'none'; // Initial collapsed state
      list.style.paddingLeft = '12px';

      header.onclick = () => {
        const isHidden = list.style.display === 'none';
        list.style.display = isHidden ? 'block' : 'none';
        header.querySelector('.coa-toggle').textContent = isHidden ? '▼' : '▶';
      };

      accounts.sort().forEach(acc => {
        const item = document.createElement('div');
        item.className = 'coa-item';
        item.textContent = acc;
        item.style.cssText = `
                    padding: 6px 10px; cursor: pointer; font-size: 13px; border-radius: 4px;
                    transition: 0.2s; color: #1e293b;
                `;
        if (acc === currentValue) {
          item.style.background = '#eff6ff';
          item.style.color = '#2563eb';
          item.style.fontWeight = '700';
        }

        item.onmouseover = () => { if (acc !== currentValue) item.style.background = '#f1f5f9'; };
        item.onmouseout = () => { if (acc !== currentValue) item.style.background = 'transparent'; };
        item.onclick = () => {
          this.selectedValue = acc;
          params.stopEditing();
        };
        list.appendChild(item);
      });

      groupEl.appendChild(header);
      groupEl.appendChild(list);
      this.container.appendChild(groupEl);
    });

    this.selectedValue = currentValue;
  }

  getGui() { return this.container; }
  getValue() { return this.selectedValue; }
  isPopup() { return true; }
}

/**
 * INIT FLOW
 */
window.initVendorsGrid = async function () {
  const container = document.getElementById('vendorsGrid');
  if (!container) return;

  try {
    console.time('Vendors:TotalInit');

    // 1. INIT DICTIONARY
    console.time('Vendors:InitDictionary');
    if (!window.merchantDictionary.isInitialized) await window.merchantDictionary.init();
    console.timeEnd('Vendors:InitDictionary');

    // 2. FETCH DATA
    console.time('Vendors:GetMerchants');
    const rawMerchants = await window.merchantDictionary.getAllMerchants();
    console.timeEnd('Vendors:GetMerchants');

    console.log(`📝 Dictionary: Fetched ${rawMerchants.length} vendors for grid.`);

    // coaNames is no longer needed here as CategoryCellEditor fetches it internally.

    // Stats Calculation
    console.time('Vendors:Stats');
    const total = rawMerchants.length;
    const avgConfidence = total > 0 ? Math.round((rawMerchants.reduce((s, m) => s + (m.categorization_confidence || 0), 0) / total) * 100) : 0;

    // Top Industry
    const indMap = {};
    rawMerchants.forEach(m => indMap[m.industry] = (indMap[m.industry] || 0) + 1);
    const topIndustry = Object.entries(indMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'None';

    document.getElementById('v-count-badge').textContent = total.toLocaleString();
    document.getElementById('v-stat-industry').textContent = topIndustry;
    document.getElementById('v-stat-cat').textContent = `${avgConfidence}%`;
    document.getElementById('v-stat-patterns').textContent = rawMerchants.reduce((s, m) => s + (m.description_patterns?.length || 0), 0).toLocaleString();

    const columnDefs = [
      { width: 50, checkboxSelection: true, headerCheckboxSelection: true, headerCheckboxSelectionFilteredOnly: true, pinned: 'left' },
      { field: 'display_name', headerName: 'Vendor Name', flex: 2, sortable: true, filter: 'agTextColumnFilter', cellStyle: { fontWeight: 700, color: '#1e293b' } },
      {
        field: 'default_category',
        headerName: 'Account',
        flex: 1.5,
        editable: true,
        cellEditor: CategoryCellEditor,
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
        cellClass: 'no-border-cell',
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
        if (!window.vendorsGridApi) return;
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
 * MANUAL DICTIONARY BACKUP
 */
window.backupVendorsDictionary = async function () {
  try {
    const raw = await window.merchantDictionary.getAllMerchants();
    const dataStr = JSON.stringify(raw, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pristine_Dictionary_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (err) { alert('Backup Error: ' + err.message); }
};

/**
 * STAGE 1: VORTEX CLEANSE
 * Strips IDs, Locations, and noise. No deletions.
 */
window.vortexCleanVendors = async function () {
  const confirmation = confirm("🧪 TRIGGER STAGE 1: VORTEX CLEANSE?\n\nThis will strip branch IDs, cities, and special characters from all names.\n\nNo records will be deleted. Proceed?");
  if (!confirmation) return;

  try {
    const raw = await window.merchantDictionary.getAllMerchants();
    const updated = raw.map(m => ({
      ...m,
      display_name: window.merchantCategorizer.vortexSanitize(m.display_name)
    }));
    await window.merchantDictionary.bulkSaveMerchants(updated, null, false);
    alert("✅ Vortex Cleanse Complete! All names have been sanitized.");
    location.reload();
  } catch (err) { alert('Vortex Error: ' + err.message); }
};

/**
 * STAGE 2: MASTER MERGE
 * Consolidates duplicates into canonical brands.
 */
window.masterMergeVendors = async function () {
  const confirmation = confirm("🧠 TRIGGER STAGE 2: MASTER MERGE?\n\nThis will combine variations (e.g. 'Mark's Calgary' and 'Mark's') into single entries.\n\nThis will reduce your total record count. Proceed?");
  if (!confirmation) return;

  try {
    const raw = await window.merchantDictionary.getAllMerchants();
    const consolidatedMap = new Map();
    let mergedCount = 0;

    for (const m of raw) {
      const cleanRes = window.merchantCategorizer.cleanTransaction(m.display_name);
      const finalName = cleanRes.clean_name;

      if (consolidatedMap.has(finalName)) {
        mergedCount++;
        const existing = consolidatedMap.get(finalName);
        if ((cleanRes.confidence || 0) > (existing.categorization_confidence || 0)) {
          consolidatedMap.set(finalName, { ...existing, ...m, display_name: finalName, categorization_confidence: cleanRes.confidence });
        }
      } else {
        consolidatedMap.set(finalName, { ...m, display_name: finalName, industry: cleanRes.industry, default_category: cleanRes.default_category });
      }
    }

    const output = Array.from(consolidatedMap.values());
    await window.merchantDictionary.bulkSaveMerchants(output, null, true);
    alert(`✅ Master Merge Complete!\n\nMerged ${mergedCount} duplicates.\nTotal records: ${output.length}`);
    location.reload();
  } catch (err) { alert('Merge Error: ' + err.message); }
};

/**
 * STAGE 3: NUCLEAR PURGE
 * Deletes undeniable garbage rows.
 */
window.nuclearPurgeVendors = async function () {
  const confirmation = confirm("☢️ TRIGGER STAGE 3: NUCLEAR PURGE?\n\nThis will permanently delete rows that are pure numbers, empty, or trash fragments (e.g. 'Opening', '.ca').\n\nProceed with caution.");
  if (!confirmation) return;

  try {
    const raw = await window.merchantDictionary.getAllMerchants();
    const toDelete = raw.filter(m => window.merchantCategorizer.isNuclearWaste(m.display_name));

    if (toDelete.length === 0) {
      alert("No nuclear waste found. Your dictionary is already clean!");
      return;
    }

    if (confirm(`Detected ${toDelete.length} trash rows. Delete them all?`)) {
      const ids = toDelete.map(m => m.id);
      for (const id of ids) await window.merchantDictionary.deleteMerchant(id);
      alert(`✅ Nuclear Purge Complete! Removed ${toDelete.length} garbage records.`);
      location.reload();
    }
  } catch (err) { alert('Nuclear Error: ' + err.message); }
};

/**
 * ACTIONS
 */
window.deleteVendor = (id) => {
  window.ModalService.confirm(
    "Delete Vendor",
    "Are you sure you want to delete this vendor? This action cannot be undone.",
    async () => {
      const overlay = document.getElementById('v-loading-overlay');
      if (overlay) { overlay.style.display = 'flex'; overlay.querySelector('p').textContent = 'Deleting logic...'; }
      await window.merchantDictionary.deleteMerchant(id);
      location.reload();
    },
    'danger'
  );
};

window.bulkDeleteVendors = () => {
  // Safe Selection: Only grab nodes that are currently passing the active filter
  const selectedNodes = window.vendorsGridApi.getSelectedNodes();
  const filteredNodes = [];
  window.vendorsGridApi.forEachNodeAfterFilter(node => {
    if (node.isSelected()) filteredNodes.push(node);
  });

  if (filteredNodes.length === 0) {
    if (window.ModalService) {
      window.ModalService.alert("No selection", "No visible, selected items found to delete.");
    } else {
      alert("No visible, selected items found to delete.");
    }
    return;
  }

  window.ModalService.confirm(
    "Bulk Delete Confirmation",
    `Are you sure you want to delete <strong>${filteredNodes.length} items</strong>?<br><br>This will ONLY delete items that are currently SELECTED and VISIBLE in your search.`,
    async () => {
      const ids = filteredNodes.map(n => n.data.id);
      const overlay = document.getElementById('v-loading-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.querySelector('p').textContent = `🗑️ Deleting ${filteredNodes.length} vendors...`;
      }
      await window.merchantDictionary.bulkDeleteMerchants(ids);
      location.reload();
    },
    'danger'
  );
};

window.bulkRecategorizeVendors = async () => {
  const nodes = window.vendorsGridApi.getSelectedNodes();
  if (nodes.length === 0) {
    if (!confirm("No vendors selected. Run AI Recategorization on ALL vendors?")) return;
  }

  const targets = nodes.length > 0 ? nodes : []; // We'll handle grid nodes or all

  const overlay = document.getElementById('v-loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  const textEl = overlay.querySelector('p');
  if (textEl) textEl.textContent = "🧠 Running Advanced AI Recategorization...";

  try {
    const allRows = [];
    if (nodes.length > 0) {
      allRows.push(...nodes.map(n => n.data));
    } else {
      // Select all after filter
      window.vendorsGridApi.forEachNodeAfterFilter(node => {
        allRows.push(node.data);
      });
    }

    const updated = [];
    for (let i = 0; i < allRows.length; i++) {
      const row = allRows[i];
      if (textEl) textEl.textContent = `🧠 Analyzing: ${i + 1} of ${allRows.length}...`;

      const r = await window.merchantCategorizer.cleanAndEnrichTransaction(row.display_name);
      updated.push({
        ...row,
        display_name: r.clean_name,
        industry: r.industry,
        default_account: r.default_account,
        default_category: r.default_category,
        categorization_confidence: r.confidence,
        notes: r.notes || row.notes
      });
    }

    await window.merchantDictionary.bulkSaveMerchants(updated, null, false);
    alert(`✅ AI Recategorization Complete! Processed ${updated.length} vendors.`);
    location.reload();
  } catch (err) {
    alert('Recategorization Error: ' + err.message);
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
};

/**
 * UI HELPERS
 */
window.toggleVendorMenu = function (e) {
  e.stopPropagation();
  const menu = document.getElementById('vendor-dropdown-menu');
  if (menu) menu.classList.toggle('hidden');
};

document.addEventListener('click', (e) => {
  const menu = document.getElementById('vendor-dropdown-menu');
  if (menu && !menu.classList.contains('hidden')) {
    if (!e.target.closest('.dropdown-container')) {
      menu.classList.add('hidden');
    }
  }
});

window.restoreFromVendorsFile = (input) => {
  const reader = new FileReader();
  reader.onload = async (e) => {
    const merchants = JSON.parse(e.target.result).merchants || JSON.parse(e.target.result);
    await window.merchantDictionary.bulkSaveMerchants(merchants, null, true);
    location.reload();
  };
  reader.readAsText(input.files[0]);
};

/**
 * EXPORT TO EXCEL (CSV) - STRICT COA v18.0
 */
/**
 * BULK WIKIPEDIA ENRICHMENT
 */
window.bulkWikiEnrich = async function () {
  const selectedNodes = window.vendorsGridApi.getSelectedNodes();
  let targets = [];

  if (selectedNodes.length > 0) {
    targets = selectedNodes.map(n => n.data);
  } else {
    if (!confirm("🌐 No vendors selected. Run Wiki Enrichment on ALL vendors? \n\nThis will look up brands on Wikipedia to officialize names and fix industries.")) return;
    targets = await window.merchantDictionary.getAllMerchants();
  }

  const overlay = document.getElementById('v-loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  const textEl = overlay.querySelector('p');
  if (textEl) textEl.textContent = "🌐 Fetching Knowledge from Wikipedia...";

  let updatedCount = 0;
  let skippedCount = 0;
  const batchSize = 5;

  for (let i = 0; i < targets.length; i += batchSize) {
    const batch = targets.slice(i, i + batchSize);
    if (textEl) textEl.textContent = `🌐 Wiki-Syncing: ${i + 1} of ${targets.length}...`;

    await Promise.all(batch.map(async (v) => {
      const search = await window.wikiService.searchVendor(v.display_name);
      if (search) {
        const info = await window.wikiService.getVendorInfo(search.title);
        if (info) {
          const suggestedIndustry = window.wikiService.guessIndustry(info);
          const update = {
            ...v,
            display_name: search.title.toUpperCase(), // Officialize!
            industry: suggestedIndustry || v.industry,
            notes: (v.notes || '') + ` [Wiki Verified: ${search.link}]`
          };

          // If industry changed, re-categorize to get new account
          if (suggestedIndustry && suggestedIndustry !== v.industry) {
            const cleanRes = window.merchantCategorizer.cleanTransaction(search.title);
            update.default_category = cleanRes.default_category;
          }

          await window.merchantDictionary.updateMerchant(v.id, update);
          updatedCount++;
        } else skippedCount++;
      } else skippedCount++;
    }));
  }

  if (overlay) overlay.style.display = 'none';
  alert(`🌐 Wiki Enrichment Complete!\n\nUpdated/Officialized: ${updatedCount}\nSkipped (No Wiki Page): ${skippedCount}`);
  location.reload();
};


window.exportVendorsToExcel = function () {
  if (!window.vendorsGridApi) return;

  const params = {
    fileName: `Pristine_Vendors_${new Date().toISOString().split('T')[0]}.csv`,
    columnKeys: ['original', 'display_name', 'default_account', 'default_category'],
    processHeaderCallback: (params) => {
      if (params.column.getColId() === 'original') return 'Original_Name';
      if (params.column.getColId() === 'display_name') return 'Clean_Name';
      if (params.column.getColId() === 'default_account') return 'Account_Number';
      if (params.column.getColId() === 'default_category') return 'Account_Name';
      return params.label;
    }
  };

  window.vendorsGridApi.exportDataAsCsv(params);
};

window.bulkCleanVendors = () => {
  const selectedNodes = window.vendorsGridApi.getSelectedNodes();
  if (selectedNodes.length === 0) {
    if (window.ModalService) {
      window.ModalService.alert("No selection", "Select multiple vendors to perform a bulk clean.");
    } else {
      alert("Select multiple vendors to perform a bulk clean.");
    }
    return;
  }

  // Smart Pre-fill: Use current filter value
  const searchInput = document.getElementById('vendor-search');
  const currentFilter = searchInput ? searchInput.value.trim() : "";

  window.ModalService.form(
    "🪄 Bulk Find & Replace",
    [
      { label: "Find text (e.g. 'DEBIT CARD')", name: 'find', value: currentFilter, placeholder: 'Text to remove...' },
      { label: "Replace with (leave empty to remove)", name: 'replace', placeholder: 'Replacement text...' }
    ],
    async (values) => {
      if (!values.find) return;

      const overlay = document.getElementById('v-loading-overlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.querySelector('p').textContent = `🧹 Creating Backup & Cleaning ${selectedNodes.length} items...`;
      }

      const ids = selectedNodes.map(n => n.data.id);
      const count = await window.merchantDictionary.bulkFindAndReplace(ids, values.find, values.replace || '');

      if (window.ModalService) {
        window.ModalService.alert("Clean Complete", `✅ Cleaned ${count} merchant names.\nA restore point was created automatically.`);
      } else {
        alert(`✅ Cleaned ${count} merchant names.\nA restore point was created automatically.`);
      }
      location.reload();
    }
  );
};
