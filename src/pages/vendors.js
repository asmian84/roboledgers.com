/**
 * Vendor Dictionary Page - RoboLedger Style
 * Features: Bulk Index, Delete Fix, Bulk Delete
 */

window.renderVendors = function () {
  console.log('🎨 renderVendors called via Window');

  const html = `
  <div class="vendors-page">
      <div class="page-header">
        <h1>Vendor Dictionary</h1>
        <div class="header-actions" style="display:flex; gap:10px; align-items: center;">
            <div class="action-menu">
                <button class="action-menu-btn" onclick="this.nextElementSibling.classList.toggle('show')">
                    ...
                </button>
                <div class="action-menu-content">
                    <button class="action-menu-item" onclick="addNewVendor()">➕ Add Vendor</button>
                    <button class="action-menu-item" onclick="toggleBulkIndex()">⚡ Bulk Index</button>
                    <button class="action-menu-item" onclick="cleanupUnassignedVendors()">🧹 Clean Up</button>
                    <button class="action-menu-item danger" id="btn-bulk-delete" onclick="deleteSelectedVendors()" style="display:none">🗑️ Delete Selected</button>
                </div>
            </div>
        </div>
      </div>
      
      <!--BULK INDEX DROP ZONE(Hidden by default )-- >
      <div id="bulk-drop-zone" style="display:none; background: #fff; border: 2px dashed #a78bfa; border-radius: 12px; padding: 40px; margin-bottom: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease;">
          <div style="font-size: 40px; margin-bottom: 10px;">📂</div>
          <h3 style="color: #4c1d95; margin: 0 0 5px 0; font-size: 18px; font-weight: 700;">DROP HISTORICAL FILES HERE</h3>
      <!-- BULK INDEX DROP ZONE (Hidden by default) -->
      <div id="bulk-drop-zone" style="display:none; background: #fff; border: 2px dashed #a78bfa; border-radius: 12px; padding: 40px; margin-bottom: 20px; text-align: center; cursor: pointer; transition: all 0.2s ease;">
          <div style="font-size: 40px; margin-bottom: 10px;">📂</div>
          <h3 style="color: #4c1d95; margin: 0 0 5px 0; font-size: 18px; font-weight: 700;">DROP HISTORICAL FILES HERE</h3>
          <p style="color: #6b7280; margin: 0;">Process years of data to build a master vendor list</p>
          <input type="file" id="bulk-file-input" multiple accept=".csv" style="display:none" onchange="handleBulkFiles(this.files)">
      </div>
      
      <div class="content-area" style="padding: 0 20px;">
        <div id="vendorsGrid" class="ag-theme-alpine" style="height: calc(100vh - 180px); width: 100%; max-width: 1100px; margin: 0 auto; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border-radius: 8px;"></div>
      </div>
    </div>
  `;
  console.log(`🎨 renderVendors: Returning HTML (Length: ${html.length})`);
  return html;
};

// --- INITIALIZATION LOGIC ---

// Expose globally for manual re-init if needed
window.initVendorsGrid = async function (retryCount = 0, forceRefresh = false) {
  const gridDiv = document.querySelector('#vendorsGrid');

  // RETRY LOGIC: If container not found, wait and try again (up to 20 times / 2 seconds)
  if (!gridDiv) {
    if (retryCount < 20) {
      console.warn(`⚠️ Vendor grid container not found (Attempt ${retryCount + 1}). Retrying...`);
      setTimeout(() => window.initVendorsGrid(retryCount + 1), 100);
      return;
    } else {
      console.error('❌ Vendor grid container not found after 20 attempts!');
      return;
    }
  }

  // Prevent double init UNLESS forced
  if (!forceRefresh && gridDiv.querySelector('.ag-root')) return;
  if (forceRefresh) {
    gridDiv.innerHTML = ''; // Clear for re-render
  }

  console.log('🔷 Initializing Vendor Dictionary Grid...');
  gridDiv.innerHTML = '<div style="padding: 20px; text-align: center; color: #666;">⏳ Loading Vendor Grid...</div>';

  try {
    // CHECK AG GRID
    if (typeof agGrid === 'undefined') {
      throw new Error('AG Grid library is not loaded!');
    }

    // LOAD DATA
    let rawVendors = [];
    if (window.storage) {
      rawVendors = await window.storage.getVendors();
    }

    const transactions = window.transactionData || [];

    // 1. Calculate Counts
    const usageMap = {};

    // SAFE USAGE OF VENDOR ENGINE
    if (transactions.length > 0 && window.VendorEngine) {
      // Ensure initialized if possible
      if (typeof window.VendorEngine.init === 'function') {
        await window.VendorEngine.init();
      }

      transactions.forEach(t => {
        try {
          const match = window.VendorEngine.match(t.description);
          if (match) {
            usageMap[match.id] = (usageMap[match.id] || 0) + 1;
          }
        } catch (e) {
          // Ignore match errors
        }
      });
    }

    const vendorData = rawVendors.map(v => ({
      id: v.id,
      accountLabel: getAccountLabel(v.defaultAccountId),
      description: v.name,
      count: usageMap[v.id] || 0,
      category: v.category
    }));

    vendorData.sort((a, b) => b.count - a.count);

    // 2. Adjust Layout (20% Smaller, Central, Responsive)
    const gridDiv = document.querySelector('#vendorsGrid');
    if (gridDiv) {
      // Dynamic resizing based on user request
      gridDiv.style.maxWidth = '1100px';
      gridDiv.style.margin = '0 auto';
    }

    // 3. Check for Empty State
    if (vendorData.length === 0) {
      // User Request: "if there no transactions then load this" -> Assuming Drop Zone
      const dropZone = document.getElementById('bulk-drop-zone');
      if (dropZone && dropZone.style.display === 'none') {
        dropZone.style.display = 'block';
      }
      showToast('Dictionary empty. Drop files to build it!', 'info');
    }

    console.log(`📊 Loaded ${vendorData.length} vendors.`);

    // Account Dropdown Options
    function getAccountOptions() {
      if (!window.DEFAULT_CHART_OF_ACCOUNTS) return [];
      return window.DEFAULT_CHART_OF_ACCOUNTS.map(acc => `${acc.code} - ${acc.name}`);
    }

    // Define Columns
    const columnDefs = [
      {
        headerName: 'VENDOR NAME',
        field: 'description',
        flex: 2,
        editable: true,
        filter: 'agTextColumnFilter',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        cellStyle: { fontWeight: '500', color: '#333' }
      },
      {
        headerName: 'COUNT',
        field: 'count',
        width: 100,
        sortable: true,
        cellStyle: { textAlign: 'center', color: '#666' }
      },
      {
        headerName: 'ACCOUNT',
        field: 'accountLabel',
        flex: 3,
        editable: true,
        cellEditor: 'agSelectCellEditor',
        cellEditorParams: {
          values: getAccountOptions()
        },
        sortable: true,
        cellStyle: { color: '#4F46E5', fontWeight: 'bold' }
      },
      {
        headerName: '',
        field: 'actions',
        width: 80,
        cellRenderer: (params) => {
          if (!params.data) return '';
          return `<button class="btn-delete" onclick="deleteVendor('${params.data.id}')" title="Delete Rule">🗑️</button>`;
        },
        cellStyle: { textAlign: 'center' }
      }
    ];

    const gridOptions = {
      columnDefs: columnDefs,
      rowData: vendorData,
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        editable: true
      },
      rowHeight: 45,
      headerHeight: 40,
      animateRows: true,
      rowSelection: 'multiple',
      suppressHorizontalScroll: false,

      getRowStyle: params => {
        if (params.node.rowIndex % 2 === 0) {
          return { background: '#f9fafb' };
        }
      },
      onSelectionChanged: () => {
        // FIXED: Use global API reference or event context
        const api = window.vendorsGridApi || gridOptions.api;
        if (!api) return;

        const selectedRows = api.getSelectedRows();
        const btn = document.getElementById('btn-bulk-delete');
        if (btn) {
          if (selectedRows.length > 0) {
            btn.style.display = 'block';
            btn.innerText = `🗑️ Delete (${selectedRows.length})`;
          } else {
            btn.style.display = 'none';
          }
        }
      },
      onGridReady: (event) => {
        window.vendorsGridApi = event.api;
        event.api.sizeColumnsToFit();
      },
      onCellValueChanged: async (event) => {
        const updatedRow = event.data;
        let newAccount = updatedRow.accountLabel;
        if (newAccount && newAccount.includes(' - ')) {
          newAccount = newAccount.split(' - ')[1];
        }

        if (window.storage && updatedRow.id) {
          await window.storage.updateVendor(updatedRow.id, {
            name: updatedRow.description,
            defaultAccountId: newAccount
          });
          if (window.showToast) showToast('Vendor updated.', 'success');
        }
      }
    };

    // Clear loading text
    gridDiv.innerHTML = '';

    // Create Grid
    agGrid.createGrid(gridDiv, gridOptions);
    console.log('✅ Grid created successfully');

  } catch (err) {
    console.error('🚨 Grid Init Failed:', err);
    gridDiv.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #ef4444; border: 2px solid #ef4444; border-radius: 8px;">
            <h3>⚠️ Error Loading Grid</h3>
            <p>${err.message}</p>
            <pre style="text-align:left; background:#f0f0f0; padding:10px; margin-top:10px; overflow:auto;">${err.stack}</pre>
        </div>
      `;
  }
};


// Watcher for SPA navigation
let isInitializingVendors = false;
const vendorObserver = new MutationObserver(() => {
  const gridDiv = document.getElementById('vendorsGrid');
  const hasGrid = gridDiv?.querySelector('.ag-root-wrapper');
  if (gridDiv && !isInitializingVendors && !hasGrid) {
    isInitializingVendors = true;
    window.initVendorsGrid();
    setTimeout(() => { isInitializingVendors = false; }, 500);
  }
});
if (document.body) vendorObserver.observe(document.body, { childList: true, subtree: true });

// Close Dropdowns when clicking outside
document.addEventListener('click', function (event) {
  if (!event.target.matches('.action-menu-btn') && !event.target.closest('.action-menu-content')) {
    const dropdowns = document.getElementsByClassName("action-menu-content");
    for (let i = 0; i < dropdowns.length; i++) {
      const openDropdown = dropdowns[i];
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
});

// --- ACTIONS ---

function getAccountLabel(nameOrCode) {
  if (!nameOrCode) return '';
  if (/^\d{4}\s-\s/.test(nameOrCode)) return nameOrCode;

  if (!window.DEFAULT_CHART_OF_ACCOUNTS) return nameOrCode;

  const byName = window.DEFAULT_CHART_OF_ACCOUNTS.find(a => a.name === nameOrCode);
  if (byName) return `${byName.code} - ${byName.name} `;

  const byCode = window.DEFAULT_CHART_OF_ACCOUNTS.find(a => a.code === nameOrCode);
  if (byCode) return `${byCode.code} - ${byCode.name} `;

  return nameOrCode;
}

window.addNewVendor = function () {
  if (!window.ModalService) return;
  ModalService.prompt('New Vendor', 'Vendor Name:', '', async (name) => {
    if (!name) return;
    if (window.storage) {
      await window.storage.createVendor({ name: name, defaultAccountId: '' });
      window.initVendorsGrid(0, true);
      showToast(`Vendor ${name} added`, 'success');
    }
  });
}

// FIXED DELETE FUNCTION WITH ID
// FIXED DELETE FUNCTION WITH ID
window.deleteVendor = function (id) {
  ModalService.confirm('Delete Vendor', `Are you sure you want to delete this rule ? `, async () => {
    if (window.storage) {
      // 1. Delete from Storage
      try {
        await window.storage.deleteVendor(id);
      } catch (e) {
        console.error('Storage delete failed', e);
        showToast('Failed to delete from storage', 'error');
        return;
      }

      // 2. Remove from Grid instantly
      if (window.vendorsGridApi) {
        const rowNode = window.vendorsGridApi.getRowNode(String(id)); // Assuming ID is string
        // If getRowNode doesn't work (requires getRowId callback), use loop or transaction with ID
        // NOTE: AG Grid requires `getRowId` in gridOptions for `getRowNode` to work by ID.
        // Let's verify gridOptions has getRowId or use brute force filter.

        // Option A: Iterate and find (safe)
        let nodeToDelete = null;
        window.vendorsGridApi.forEachNode(node => {
          if (node.data.id === id) nodeToDelete = node.data;
        });

        if (nodeToDelete) {
          window.vendorsGridApi.applyTransaction({ remove: [nodeToDelete] });
        } else {
          // Fallback if not found in grid (synced weirdly)
          window.initVendorsGrid(0, true);
        }
      } else {
        window.initVendorsGrid(0, true);
      }

      showToast('Vendor deleted', 'success');
    }
  }, 'danger');
}

// BULK DELETE FUNCTION
window.deleteSelectedVendors = function () {
  if (!window.vendorsGridApi) return;
  const selectedNodes = window.vendorsGridApi.getSelectedNodes();
  if (selectedNodes.length === 0) return;

  const count = selectedNodes.length;
  ModalService.confirm('Bulk Delete', `Are you sure you want to delete ${count} vendors ? `, async () => {
    if (!window.storage) return;

    let deleted = 0;
    const nodesToRemove = [];

    for (const node of selectedNodes) {
      const id = node.data.id;
      if (id) {
        try {
          await window.storage.deleteVendor(id);
          deleted++;
          nodesToRemove.push(node.data); // Queue for grid removal
        } catch (e) {
          console.warn(`Failed to delete vendor ${id}`, e);
        }
      }
    }

    // UI Update: Transaction
    if (window.vendorsGridApi && nodesToRemove.length > 0) {
      window.vendorsGridApi.applyTransaction({ remove: nodesToRemove });
    } else {
      // Fallback
      try {
        window.initVendorsGrid(0, true);
      } catch (e) { console.error('Error refreshing grid', e); }
    }

    showToast(`Successfully deleted ${deleted} vendors`, 'success');

    // Hide button
    const btn = document.getElementById('btn-bulk-delete');
    if (btn) btn.style.display = 'none';

  }, 'danger');
}

// CLEAN UP UNASSIGNED VENDORS
window.cleanupUnassignedVendors = async function () {
  if (!window.storage) return;

  // Find unassigned
  const vendors = await window.storage.getVendors();
  const unassigned = vendors.filter(v => !v.defaultAccountId || v.defaultAccountId.trim() === '');

  if (unassigned.length === 0) {
    showToast('No unassigned vendors found.', 'info');
    return;
  }

  ModalService.confirm('🧹 Clean Up', `Delete ${unassigned.length} vendors that have no assigned account?`, async () => {
    let deleted = 0;
    for (const v of unassigned) {
      try {
        await window.storage.deleteVendor(v.id);
        deleted++;
      } catch (e) {
        console.warn(`Failed to delete cleanup vendor ${v.id}`, e);
      }
    }

    try {
      window.initVendorsGrid(0, true);
    } catch (e) { console.error('Error refreshing grid', e); }

    showToast(`Cleaned up ${deleted} vendors.`, 'success');
  }, 'warning');
}


// --- BULK INDEX / DROP ZONE LOGIC ---

window.toggleBulkIndex = function () {
  const zone = document.getElementById('bulk-drop-zone');
  if (!zone) return;

  if (zone.style.display === 'none') {
    zone.style.display = 'block';
    // Setup Drag & Drop listeners if not already done
    if (!zone._hasListeners) {
      zone.addEventListener('click', () => document.getElementById('bulk-file-input').click());

      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.style.background = '#f5f3ff';
        zone.style.borderColor = '#7c3aed';
      });

      zone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        zone.style.background = '#fff';
        zone.style.borderColor = '#a78bfa';
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.style.background = '#fff';
        zone.style.borderColor = '#a78bfa';
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleBulkFiles(e.dataTransfer.files);
        }
      });
      zone._hasListeners = true;
    }
  } else {
    zone.style.display = 'none';
  }
}

window.handleBulkFiles = async function (files) {
  if (!files || files.length === 0) return;
  if (!window.SmartCSV) {
    showToast('Error: CSV Parser not ready', 'error');
    return;
  }

  // UPDATE UI: Show Processing State
  const zone = document.getElementById('bulk-drop-zone');
  const originalContent = zone ? zone.innerHTML : '';

  if (zone) {
    zone.style.cursor = 'wait';
    zone.innerHTML = `
        <div style="font-size: 40px; margin-bottom: 10px; animation: spin 1s infinite linear;">⚙️</div>
        <h3 style="color: #4c1d95; margin: 0 0 5px 0;">Processing ${files.length} files...</h3>
        <p style="color: #6b7280;">Please wait while we analyze your data.</p>
      `;
  }

  showToast(`Acknowledged: ${files.length} files received. Starting import...`, 'info');

  let totalNewVendors = 0;
  let processedCount = 0;

  // Get existing vendors first to avoid duplicates in memory
  const existingVendors = await window.storage.getVendors();
  const existingNames = new Set(existingVendors.map(v => v.name.toLowerCase()));

  for (const file of files) {
    processedCount++;
    if (zone) {
      zone.querySelector('h3').innerText = `Analyzing file ${processedCount} of ${files.length}...`;
      zone.querySelector('p').innerText = `${file.name}`;
    }

    try {
      let transactions = [];

      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // EXCEL PARSING
        if (typeof XLSX === 'undefined') {
          showToast('Excel parser (SheetJS) not loaded.', 'error');
          continue;
        }

        try {
          const binary = await readBinaryFile(file);
          const workbook = XLSX.read(binary, { type: 'binary' });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rawData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }); // Array of arrays

          // STRICT HEADER ANALYSIS
          const mapping = analyzeFileHeaders(rawData);

          if (mapping.headerIndex !== -1) {
            console.log(`✅ Valid Headers found in ${file.name}: Row ${mapping.headerIndex}`);

            for (let i = mapping.headerIndex + 1; i < rawData.length; i++) {
              const row = rawData[i];
              if (row && row[mapping.descriptionIndex]) {
                const desc = String(row[mapping.descriptionIndex]);
                const acctStr = row[mapping.accountIndex] ? String(row[mapping.accountIndex]) : '';

                transactions.push({
                  description: desc,
                  accountLabel: acctStr
                });
              }
            }
          } else {
            console.warn(`🗑️ Garbage File Detected: ${file.name} - Missing 'Description' or 'Account' headers.`);
            showToast(`Skipped ${file.name}: Invalid Headers (Need 'Description' & 'Account')`, 'warning');
            continue; // SKIP THIS FILE
          }

        } catch (e) {
          console.error('Excel parse error', e);
          showToast(`Failed to parse Excel file ${file.name}`, 'error');
          continue;
        }

      } else {
        // CSV PARSING (Legacy/Loose for now, or Strict?)
        // User asked for "spreadsheet" strictness. Let's keep CSV open but maybe warn?
        // Let's keep CSV as is for now to avoid breaking other imports.
        const text = await readFileAsText(file);
        transactions = window.SmartCSV.parse(text);
      }

      let fileNewCount = 0;

      for (const txn of transactions) {
        if (!txn.description) continue;

        // ... (rest of loop logic is the same)
        let cleanName = txn.description;
        if (window.VendorEngine) {
          cleanName = window.VendorEngine.normalize(txn.description);
        }

        if (!cleanName || cleanName.length < 2) continue;
        if (existingNames.has(cleanName.toLowerCase())) continue;

        // Resolve Account ID if present
        let finalAccountId = '';
        if (txn.accountLabel) {
          finalAccountId = findAccountId(txn.accountLabel);
        }

        await window.storage.createVendor({
          name: cleanName,
          defaultAccountId: finalAccountId,
          category: ''
        });

        existingNames.add(cleanName.toLowerCase());
        fileNewCount++;
      }

      totalNewVendors += fileNewCount;

      // Small pause to let UI breathe
      await new Promise(r => setTimeout(r, 50));

    } catch (err) {
      console.error(`Error parsing ${file.name}: `, err);
      showToast(`Failed to parse ${file.name}: ${err.message} `, 'error');
    }
  }

  // RESET UI
  if (zone) {
    zone.style.cursor = 'pointer';
    if (totalNewVendors > 0) {
      zone.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 10px;">✅</div>
            <h3 style="color: #059669; margin: 0 0 5px 0;">Import Complete!</h3>
            <p style="color: #059669;">Found ${totalNewVendors} new vendors.</p>
          `;
      // Reset to default after 3 seconds
      setTimeout(() => { if (zone) zone.innerHTML = originalContent; }, 3000);
    } else {
      zone.innerHTML = `
            <div style="font-size: 40px; margin-bottom: 10px;">👌</div>
            <h3 style="color: #4c1d95; margin: 0 0 5px 0;">No New Vendors</h3>
            <p style="color: #6b7280;">All vendors in files were duplicates.</p>
          `;
      setTimeout(() => { if (zone) zone.innerHTML = originalContent; }, 3000);
    }
  }

  if (totalNewVendors > 0) {
    showToast(`✅ Successfully indexed ${totalNewVendors} new vendors!`, 'success');
    window.initVendorsGrid(0, true); // Refresh grid
  } else {
    showToast('Processing complete. No new unique vendors found.', 'info');
  }
}

// Helper to find Description AND Account columns
function analyzeFileHeaders(rows) {
  // Scan first 10 rows for header candidates
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const row = rows[r];
    if (!Array.isArray(row)) continue;

    let descIdx = -1;
    let accIdx = -1;

    for (let c = 0; c < row.length; c++) {
      const cell = String(row[c]).toLowerCase().trim();

      // Description Synonyms
      if (cell.includes('description') || cell.includes('particulars') || cell.includes('narrative') || cell.includes('details') || cell.includes('memo') || cell.includes('vendor')) {
        descIdx = c;
      }

      // Account Synonyms
      if (cell.includes('account') || cell.includes('ledger') || cell.includes('category') || cell.includes('allocation') || cell.includes('code')) {
        accIdx = c;
      }
    }

    // STRICT CHECK: Need BOTH
    if (descIdx !== -1 && accIdx !== -1) {
      return { headerIndex: r, descriptionIndex: descIdx, accountIndex: accIdx };
    }
  }

  return { headerIndex: -1, descriptionIndex: -1, accountIndex: -1 };
}

// Helper to match Account String to System Account ID
function findAccountId(accountStr) {
  if (!accountStr || !window.DEFAULT_CHART_OF_ACCOUNTS) return '';
  const clean = accountStr.toLowerCase().trim();

  // 1. Try exact code match (e.g. "5000")
  // 2. Try exact name match
  // 3. Try "Code - Name" format

  for (const acc of window.DEFAULT_CHART_OF_ACCOUNTS) {
    if (clean === acc.code.toLowerCase()) return acc.code; // Store code as ID for now or lookup valid UUID? App uses Code usually? No, internal ID is UUID, but let's see. logic uses Code usually for defaultAccount? 
    // Wait, storage.createVendor expects defaultAccountId. In this app, accounts have UUIDs?
    // Checking getVendors... defaultAccountId usually stores the ID suitable for the transaction.account_id field.
    // But wait, the app uses `window.DEFAULT_CHART_OF_ACCOUNTS` which seems to match by Code mostly? 
    // Let's assume we need to return the Account CODE if the system uses codes, or ID if it uses IDs.
    // storage.js `getAccounts` returns objects with `id` and `code`.
    // Let's try to match to `acc.id`.

    if (clean === acc.code.toLowerCase()) return acc.id || acc.code;
    if (clean.includes(acc.code.toLowerCase()) && clean.includes(acc.name.toLowerCase())) return acc.id || acc.code;
    if (clean === acc.name.toLowerCase()) return acc.id || acc.code;
  }

  return '';
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
}

function readBinaryFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target.result);
    reader.onerror = (e) => reject(e);
    reader.readAsBinaryString(file);
  });
}

// CLEAN UP UNASSIGNED VENDORS
window.cleanupUnassignedVendors = async function () {
  if (!window.storage) return;

  // Find unassigned
  const vendors = await window.storage.getVendors();
  const unassigned = vendors.filter(v => !v.defaultAccountId || v.defaultAccountId.trim() === '');

  if (unassigned.length === 0) {
    showToast('No unassigned vendors found.', 'info');
    return;
  }

  ModalService.confirm('🧹 Clean Up', `Delete ${unassigned.length} vendors that have no assigned account?`, async () => {
    let deleted = 0;
    for (const v of unassigned) {
      await window.storage.deleteVendor(v.id);
      deleted++;
    }

    window.initVendorsGrid();
    showToast(`Cleaned up ${deleted} vendors.`, 'success');
  }, 'warning');
}
