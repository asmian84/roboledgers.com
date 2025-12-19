/**
 * Transactions Page - Modern High-Density Financial UI
 * "Two-Tier Pro" Architecture - Final Refined Edition
 */

(function () {
  'use strict';

  // --- PERSISTENT STATE ---
  let transactionData = [];
  let refPrefix = localStorage.getItem('ab3_ref_prefix') || 'CHQ';
  let selectedTxnIds = new Set();
  let searchFilter = '';
  let sortState = { col: 'date', dir: 'desc' };
  let deletingRowId = null;
  let undoStack = null; // { type: 'bulk'|'single', data: [...] }
  let viewMode = 'grid'; // 'grid' | 'vendor'
  let isEditingOpening = false;
  let editingImportId = null;
  let restoringImportId = null;
  let importPendingData = null; // Holds parsed CSV data before account choice
  let importPendingFilename = '';

  // --- SHEETJS LOADER ---
  if (!window.XLSX) {
    const script = document.createElement('script');
    script.src = 'https://cdn.sheetjs.com/xlsx-latest/package/dist/xlsx.full.min.js';
    document.head.appendChild(script);
  }

  window.renderTransactions = function () {
    return `
      <div class="transactions-page">
      <style>
        :root {
          --primary: #3b82f6;
          --bg: #f8fafc;
          --surface: #ffffff;
          --text-main: #0f172a;
          --text-muted: #64748b;
          --border: #e2e8f0;
          --accent: #f1f5f9;
          --red: #ef4444;
          --green: #22c55e;
        }

        .transactions-page {
          width: 100% !important; height: 100vh; padding: 12px;
          background: var(--bg); box-sizing: border-box;
          display: flex; flex-direction: column; overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        .app-panel {
          flex: 1; display: flex; flex-direction: column; background: var(--surface);
          border-radius: 12px; border: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden; min-height: 0;
        }

        /* CENTERED TWO-TIER HEADER */
        .panel-header { flex: none; background: #fff; border-bottom: 1px solid var(--border); display: flex; flex-direction: column; }
        .header-tier { padding: 8px 16px; display: flex; align-items: center; justify-content: space-between; min-height: 48px; position: relative; }
        
        /* Title centered above Toolbar */
        .header-tier.status-row { 
            border-bottom: 1px solid #f8fafc; 
            flex-direction: column; 
            justify-content: center;
            gap: 8px;
            padding: 16px;
        }
        .tier-title { font-size: 1.25rem; font-weight: 800; color: var(--text-main); text-align: center; width: 100%; letter-spacing: -0.02em; }
        
        .header-tier.toolbar-row { background: #fafafa; }
        .bulk-mode { background: #eff6ff !important; border-bottom: 2px solid #3b82f6 !important; }

        .stats-strip { display: flex; align-items: center; gap: 12px; background: var(--accent); padding: 6px 16px; border-radius: 24px; font-size: 0.8rem; color: var(--text-muted); border: 1px solid #e2e8f0; }
        .stat-item { display: flex; align-items: center; gap: 6px; }
        .stat-label { font-weight: 700; font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
        .stat-value { font-weight: 700; color: var(--text-main); }
        .stat-value.inc { color: var(--green); }
        .stat-value.exp { color: var(--red); }
        .stat-edit-btn { cursor: pointer; color: #94a3b8; font-size: 0.75rem; transition: color 0.1s; }
        .stat-edit-btn:hover { color: var(--primary); }
        
        /* Inline Opening Balance Input */
        .opening-input-box { display: flex; align-items: center; gap: 8px; }
        .opening-input { width: 100px; height: 24px; padding: 2px 8px; border: 1px solid var(--primary); border-radius: 4px; font-size: 0.8rem; font-weight: 700; }

        /* TOOLBAR */
        .toolbar-group { display: flex; align-items: center; gap: 12px; }
        .control-box { display: flex; align-items: center; gap: 6px; }
        .control-label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
        .tiny-input { padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 0.75rem; width: 70px; height: 28px; }
        .account-select { padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 0.75rem; height: 28px; min-width: 160px; font-weight: 600; color: var(--text-main); }

        .search-container { flex: 1; max-width: 600px; position: relative; margin: 0 16px; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.8rem; }
        .search-box { width: 100%; padding: 6px 12px 6px 30px; border: 1px solid var(--border); border-radius: 6px; font-size: 0.85rem; height: 32px; }

        .btn { height: 32px; padding: 0 12px; font-size: 0.75rem; font-weight: 600; border-radius: 6px; display: flex; align-items: center; gap: 6px; cursor: pointer; border: 1px solid transparent; transition: all 0.1s; user-select: none; }
        .btn-primary { background: #0f172a; color: white; }
        .btn-secondary { background: white; border-color: var(--border); color: var(--text-main); }
        .btn-danger { background: #fef2f2; border-color: #fee2e2; color: var(--red); }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .btn:active { transform: translateY(0); }

        /* DATA GRID */
        .panel-body { flex: 1; overflow-y: auto; background: #fff; position: relative; }
        .txn-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
        .txn-table thead th { position: sticky; top: 0; z-index: 10; background: #f8fafc; padding: 12px; text-align: left; font-size: 0.65rem; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; cursor: pointer; }
        .header-icon { font-size: 0.6rem; color: #94a3b8; margin-left: 2px; }
        
        .txn-table td { border-bottom: 1px solid #f1f5f9; padding: 0; vertical-align: middle; }
        .txn-table tr:hover td { background-color: #f0f7ff !important; }
        
        .cell-input { width: 100%; padding: 8px 12px; border: 1px solid transparent; font-size: 0.8rem; background: transparent; box-sizing: border-box; color: #1e293b; height: 38px; }
        .cell-input:focus { outline: none; background: #fff; border-color: var(--primary); box-shadow: inset 0 0 0 1px var(--primary); }

        /* HIDE CALENDAR ICON */
        .cell-input[type="date"]::-webkit-calendar-picker-indicator {
            display: none;
            -webkit-appearance: none;
        }

        .col-cb { width: 44px; text-align: center; }
        .col-ref { width: 100px; }
        .col-date { width: 110px; }
        .col-payee { width: auto; }
        .col-acct { width: 180px; }
        .col-amount { width: 110px; }
        .col-bal { width: 120px; }
        .col-act { width: 44px; }
        .text-right { text-align: right !important; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-variant-numeric: tabular-nums; }
        .bulk-cb { width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary); }
        .tier-breadcrumb { font-size: 0.72rem; color: #94a3b8; font-weight: 500; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.02em; }
        .tier-title { font-size: 1.5rem; font-weight: 800; color: #1e293b; letter-spacing: -0.02em; line-height: 1; }
        .editable-hint { border-bottom: 2px dashed #cbd5e1; cursor: pointer; transition: all 0.2s; }
        .editable-hint:hover { border-bottom-color: #3b82f6; color: #3b82f6; }
        .opening-input { width: 120px; font-size: 1.1rem; font-weight: 700; border: 1px solid #3b82f6; border-radius: 4px; padding: 2px 4px; outline: none; text-align: right; background: #fff; }

        /* MODAL */
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); display: none; align-items: center; justify-content: center; z-index: 1000; animation: fadeIn 0.1s ease-out; }
        .modal-content { background: #fff; width: 620px; border-radius: 12px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); display: flex; flex-direction: column; overflow: hidden; }
        .modal-header { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .modal-body { padding: 24px; flex: 1; overflow-y: auto; }
        
        .dropzone { border: 2px dashed #e2e8f0; border-radius: 8px; padding: 40px; text-align: center; color: #94a3b8; transition: all 0.2s; cursor: pointer; }
        .dropzone:hover { border-color: var(--primary); background: #f0f7ff; color: var(--primary); }
        .history-list { margin-top: 24px; border: 1px solid #f1f5f9; border-radius: 8px; overflow: hidden; }
        .history-item { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; display: flex; align-items: center; justify-content: space-between; font-size: 0.85rem; }
        .history-item:last-child { border-bottom: none; }
        .history-item:hover { background: #f8fafc; }

        #modal-status { margin-top: 12px; color: var(--green); font-size: 0.8rem; text-align: center; height: 20px; font-weight: 600; pointer-events: none; }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
      </style>

      <div class="app-panel">
         <!-- PANEL HEADER -->
         <div class="panel-header" id="panel-header">
            <!-- Row 1: Centered Title & Status Strip -->
            <div class="header-tier status-row" id="header-row-1">
               <div class="tier-title">Transactions</div>
               <div class="stats-strip" id="stats-strip">
                   <!-- Populated by updateHeaderUI -->
               </div>
            </div>

            <!-- Row 2: Toolbar -->
            <div class="header-tier toolbar-row" id="header-row-2">
               <div class="toolbar-group">
                  <select id="account-select" class="account-select" onchange="switchAccount(this.value)">
                      <option value="">Loading accounts...</option>
                  </select>
                  <div class="control-box">
                     <span class="control-label">Ref Prefix:</span>
                     <input type="text" id="ref-prefix-input" class="tiny-input" value="${refPrefix}" oninput="updateRefPrefix(this.value)">
                  </div>
               </div>
               <div class="search-container">
                  <span class="search-icon">🔍</span>
                  <input type="search" id="search-input" class="search-box" placeholder="Search..." oninput="filterTransactionFeed(this.value)">
               </div>
               <div class="toolbar-group">
                  <button class="btn btn-secondary" onclick="openImportManager()">📥 Import</button>
                  <button class="btn btn-primary" onclick="addNewTransaction()">➕ Add New</button>
                  <button class="btn btn-secondary" onclick="exportToXLS()">📊 Export XLS</button>
                  <button class="btn btn-secondary" onclick="window.router.navigate('/settings')">⚙️</button>
               </div>
            </div>
         </div>

         <!-- GRID BODY -->
         <div class="panel-body">
            <div id="transactionFeed"></div>
         </div>
      </div>

      <!-- IMPORT MANAGER MODAL -->
      <div id="import-modal" class="modal-overlay" onclick="if(event.target===this) closeImportManager()">
         <div class="modal-content">
            <div class="modal-header">
               <h3 style="margin:0; font-size:1.1rem; font-weight:700;">Import Manager</h3>
               <button class="btn btn-secondary" style="border:none; width:30px; padding:0; justify-content:center;" onclick="closeImportManager()">✕</button>
            </div>
            <div class="modal-body">
               <div class="dropzone" id="dropzone" onclick="document.getElementById('file-input').click()">
                  <div style="font-size:2rem; margin-bottom:10px;">☁️</div>
                  <div>Drag & Drop CSV files here or <b>browse</b></div>
                  <input type="file" id="file-input" hidden accept=".csv" onchange="handleFileDrop(this.files)">
               </div>
               <div id="modal-status"></div>
               <div style="margin-top:24px;">
                  <h4 style="font-size:0.75rem; text-transform:uppercase; color:#94a3b8; margin-bottom:12px; letter-spacing:0.05em; font-weight:700;">Upload History</h4>
                  <div class="history-list" id="history-list"></div>
               </div>
            </div>
         </div>
      </div>
    </div>
    
    <script>
      (function() {
          function initAccountSelector() {
             const select = document.getElementById('account-select');
             if (!select) return;

             // Implement Professional Hardcoded Accounts
             const professionalAccounts = [
                { id: 'chq1', accountName: 'TD Chequing (Asset)', type: 'asset' },
                { id: 'mc1', accountName: 'RBC Avion Visa (Liability)', type: 'liability' }
             ];

             // Mock Account Manager for consistency if it's currently "Loading..."
             if (!window.accountManager || !window.accountManager.getAllAccounts().length) {
                console.log('AB3: Mocking accountManager for professional UI support.');
                window.accountManager = {
                   id: 'pro-manager',
                   getAllAccounts: () => professionalAccounts,
                   getAccount: (id) => professionalAccounts.find(a => a.id === id),
                   getCurrentAccountId: () => localStorage.getItem('ab3_current_account_id') || 'chq1',
                   getCurrentAccount: function() { return this.getAccount(this.getCurrentAccountId()); },
                   setCurrentAccount: (id) => { localStorage.setItem('ab3_current_account_id', id); },
                   getAccountTransactions: (id) => JSON.parse(localStorage.getItem('ab3_txns_' + id) || '[]'),
                   setAccountTransactions: (id, txns) => localStorage.setItem('ab3_txns_' + id, JSON.stringify(txns)),
                   updateAccount: (id, updates) => { 
                      const acc = professionalAccounts.find(a => a.id === id);
                      if (acc) {
                        if (updates.openingBalance !== undefined) localStorage.setItem('ab3_opening_' + id, updates.openingBalance);
                      }
                   }
                };
             }

             const accs = window.accountManager.getAllAccounts();
             const currentId = window.accountManager.getCurrentAccountId();
             select.innerHTML = accs.map(a => '<option value="' + a.id + '" ' + (currentId === a.id ? 'selected' : '') + '>' + a.accountName + '</option>').join('');
          }
          window.initAccountSelector = initAccountSelector;
          
          setTimeout(() => {
             console.log('AB3: Running initialization sequence...');
             initAccountSelector();
             if (window.loadTransactionData) {
               console.log('AB3: Triggering loadTransactionData...');
               window.loadTransactionData();
             } else {
               console.error('AB3: window.loadTransactionData not found!');
             }
          }, 100);
      })();
    </script>
    `;
  };

  // --- BUSINESS LOGIC ---

  function updateRefPrefix(val) {
    refPrefix = val;
    localStorage.setItem('ab3_ref_prefix', refPrefix);
    renderTransactionFeed();
  }

  window.switchAccount = function (id) {
    if (window.accountManager) {
      window.accountManager.setCurrentAccount(id);
      window.loadTransactionData();
    }
  };

  function sanitizeDate(dateStr) {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0];
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return '';
  }

  function renderTransactionFeed() {
    const feedContainer = document.getElementById('transactionFeed');
    if (!feedContainer) return;

    // --- State & Account Info ---
    let accType = 'asset';
    let currentOpeningBalance = 0;
    if (window.accountManager) {
      const acc = window.accountManager.getCurrentAccount();
      if (acc) {
        const type = (acc.type || 'asset').toLowerCase();
        // Asset if type is asset, bank, checking, or savings
        accType = (['asset', 'bank', 'checking', 'savings'].includes(type)) ? 'asset' : 'liability';
        currentOpeningBalance = parseFloat(localStorage.getItem(`ab3_opening_${acc.id}`) || acc.openingBalance || 0);
      }
    } else {
      currentOpeningBalance = parseFloat(localStorage.getItem('openingBalance') || 0);
    }

    // --- Calculation Logic ---
    // Start with data sorted by date for balance calculation
    const sortedData = [...transactionData].sort((a, b) => {
      const dA = new Date(a.date || 0);
      const dB = new Date(b.date || 0);
      return dA - dB;
    });
    let runningBalance = currentOpeningBalance;
    let totalIn = 0;
    let totalOut = 0;

    const dataWithBalance = sortedData.map((txn, idx) => {
      const debit = parseFloat(txn.debit || 0);
      const credit = parseFloat(txn.credit || 0);

      if (accType === 'asset') {
        // Asset (Checking): Debit decreases balance, Credit increases balance
        totalIn += credit;
        totalOut += debit;
        runningBalance = runningBalance - debit + credit;
      } else {
        // Liability (Credit Card): Credit increases balance (debt), Debit decreases balance (payment)
        totalIn += debit;
        totalOut += credit;
        runningBalance = runningBalance + credit - debit;
      }

      return { ...txn, runningBalance, _formattedBalance: formatCurrency(runningBalance) };
    });

    // --- Filter & Final Display Sort ---
    let displayData = dataWithBalance.filter(txn => {
      if (!searchFilter) return true;
      const s = searchFilter.toLowerCase();
      return (txn.description || '').toLowerCase().includes(s);
    });

    // Default: Sort by date newest first if no specific sort set
    if (sortState.col) {
      displayData.sort((a, b) => {
        let aV = a[sortState.col], bV = b[sortState.col];
        if (sortState.col === 'date') { aV = new Date(a.date); bV = new Date(b.date); }
        if (sortState.col === 'debit' || sortState.col === 'credit') { aV = parseFloat(a[sortState.col]); bV = parseFloat(b[sortState.col]); }
        return (aV < bV ? -1 : 1) * (sortState.dir === 'asc' ? 1 : -1);
      });
    } else {
      displayData.sort((a, b) => new Date(b.date) - new Date(a.date));
    }

    // --- RE-CALCULATE REF BASED ON CURRENT DISPLAY ORDER ---
    const processedData = displayData.map((txn, idx) => {
      const paddedIdx = (idx + 1).toString().padStart(3, '0');
      const computedRef = refPrefix ? `${refPrefix}-${paddedIdx}` : paddedIdx;
      return { ...txn, computedRef };
    });

    // --- RENDERING ---
    updateHeaderUI({
      opening: formatCurrency(currentOpeningBalance),
      rawOpening: currentOpeningBalance,
      income: formatCurrency(totalIn),
      expense: formatCurrency(totalOut),
      end: formatCurrency(runningBalance)
    });

    if (viewMode === 'vendor') {
      return renderVendorGlance(processedData);
    }

    if (processedData.length === 0) {
      feedContainer.innerHTML = `<div style="padding:100px; text-align:center; color:#94a3b8;">No data found.</div>`;
      return;
    }

    const accounts = (window.DEFAULT_CHART_OF_ACCOUNTS ||
      (window.storage && window.storage.getAccounts ? JSON.parse(localStorage.getItem('ab3_accounts') || '[]') : []));
    let accountOpts = '<option value="">Uncategorized</option>';
    accounts.forEach(acc => {
      const code = acc.code || acc.accountNumber;
      if (code) accountOpts += `<option value="${code}">${code} - ${acc.name || acc.description}</option>`;
    });

    const renderRow = (txn) => {
      const rowId = txn.id;
      const sel = selectedTxnIds.has(rowId.toString());
      const accSel = accountOpts.replace(`value="${txn.accountNumber}"`, `value="${txn.accountNumber}" selected`);

      if (deletingRowId === rowId.toString()) {
        return `<tr><td colspan="9" style="padding:12px 16px; background:#fef2f2;"><div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="color:var(--red); font-weight:600; font-size:0.85rem;">Delete this line?</span>
              <div style="display:flex; gap:8px;">
                 <button class="btn btn-danger" style="height:28px;" onclick="confirmDeleteRow('${rowId}')">Yes, Delete</button>
                 <button class="btn btn-secondary" style="height:28px;" onclick="cancelDeleteRow()">Cancel</button>
              </div>
           </div></td></tr>`;
      }

      const debitDisplay = parseFloat(txn.debit) ? parseFloat(txn.debit).toFixed(2) : '';
      const creditDisplay = parseFloat(txn.credit) ? parseFloat(txn.credit).toFixed(2) : '';

      return `
        <tr data-id="${rowId}">
           <td class="col-cb"><input type="checkbox" class="bulk-cb" ${sel ? 'checked' : ''} onchange="toggleTxn('${rowId}')"></td>
           <td class="col-ref"><div class="cell-input font-mono" style="color:#64748b; padding-top:10px; font-size:0.75rem;">${txn.computedRef}</div></td>
           <td class="col-date"><input class="cell-input" type="date" value="${sanitizeDate(txn.date)}" onchange="updateField('${rowId}', 'date', this.value)"></td>
           <td class="col-payee"><input class="cell-input" type="text" value="${(txn.description || '').replace(/"/g, '&quot;')}" onchange="updateField('${rowId}', 'description', this.value)"></td>
           <td class="col-acct"><select class="cell-input" onchange="updateField('${rowId}', 'accountNumber', this.value)">${accSel}</select></td>
           <td class="col-amount"><input class="cell-input text-right font-mono" style="color:var(--red)" type="text" value="${debitDisplay}" placeholder="" onblur="updateField('${rowId}', 'debit', this.value)"></td>
           <td class="col-amount"><input class="cell-input text-right font-mono" style="color:var(--green)" type="text" value="${creditDisplay}" placeholder="" onblur="updateField('${rowId}', 'credit', this.value)"></td>
           <td class="col-bal"><div class="cell-input text-right font-mono" style="font-weight:700; padding-top:10px;">${txn._formattedBalance}</div></td>
           <td class="col-act"><button class="btn" style="border:none;background:transparent;color:#cbd5e1;" onclick="startDeleteRow('${rowId}')">✕</button></td>
        </tr>`;
    };

    const sI = (col) => sortState.col === col ? (sortState.dir === 'asc' ? '↑' : '↓') : '↕';

    feedContainer.innerHTML = `
      <table class="txn-table">
        <colgroup>
           <col class="col-cb"><col class="col-ref"><col class="col-date"><col class="col-payee"><col class="col-acct"><col class="col-amount"><col class="col-amount"><col class="col-bal"><col class="col-act">
        </colgroup>
        <thead>
           <tr>
              <th class="col-cb"><input type="checkbox" class="bulk-cb" onchange="toggleAllTxns(this.checked)"></th>
              <th onclick="setSort('computedRef')">Ref # <span class="header-icon">${sI('computedRef')}</span></th>
              <th onclick="setSort('date')">Date <span class="header-icon">${sI('date')}</span></th>
              <th onclick="setSort('description')">Payee <span class="header-icon">▼</span></th>
              <th>Account <span class="header-icon">▼</span></th>
              <th class="text-right" onclick="setSort('debit')">Debit <span class="header-icon">${sI('debit')}</span></th>
              <th class="text-right" onclick="setSort('credit')">Credit <span class="header-icon">${sI('credit')}</span></th>
              <th class="text-right">Balance</th>
              <th></th>
           </tr>
        </thead>
        <tbody id="txn-tbody"></tbody>
      </table>
      <div id="sentinel" style="height:40px;"></div>
    `;

    const tbody = document.getElementById('txn-tbody');
    const sentinel = document.getElementById('sentinel');
    let rendered = 0;
    const loadBatch = () => {
      const batch = processedData.slice(rendered, rendered + 60);
      if (batch.length > 0) {
        tbody.insertAdjacentHTML('beforeend', batch.map(renderRow).join(''));
        rendered += batch.length;
      }
      if (rendered >= processedData.length) { if (ob) ob.disconnect(); sentinel.style.display = 'none'; }
    };
    const ob = new IntersectionObserver(e => { if (e[0].isIntersecting) loadBatch(); }, { rootMargin: '400px' });
    ob.observe(sentinel);
    loadBatch();
  }

  // --- ACTIONS ---

  function renderVendorGlance(data) {
    const feedContainer = document.getElementById('transactionFeed');
    if (!feedContainer) return;

    // Aggregate by Vendor
    const stats = {};
    data.forEach(txn => {
      const v = txn.description || 'Unknown Vendor';
      if (!stats[v]) stats[v] = { name: v, count: 0, latest: txn.date, total: 0 };
      stats[v].count++;
      if (new Date(txn.date) > new Date(stats[v].latest)) stats[v].latest = txn.date;
      stats[v].total += (parseFloat(txn.credit || 0) - parseFloat(txn.debit || 0));
    });

    const rows = Object.values(stats).sort((a, b) => b.count - a.count);

    feedContainer.innerHTML = `
      <table class="txn-table">
        <colgroup>
           <col style="width:44.2%"><col style="width:15%"><col style="width:20%"><col style="width:20.8%">
        </colgroup>
        <thead>
           <tr>
              <th style="padding-left:24px;">VENDOR NAME</th>
              <th class="text-right">OCCURRENCES</th>
              <th class="text-right">LATEST DATE</th>
              <th class="text-right" style="padding-right:24px;">TOTAL NET</th>
           </tr>
        </thead>
        <tbody>
           ${rows.map(v => `
              <tr style="cursor:pointer" onclick="drillDownVendor('${v.name.replace(/'/g, "\\'")}')">
                 <td style="font-weight:600; color:var(--primary); padding-left:24px;">${v.name}</td>
                 <td class="text-right font-mono" style="color:#64748b;">${v.count}</td>
                 <td class="text-right font-mono" style="color:#64748b;">${(v.latest || '').slice(0, 10)}</td>
                 <td class="text-right font-mono" style="font-weight:700; color:${v.total >= 0 ? 'var(--green)' : 'var(--red)'}; padding-right:24px;">${formatCurrency(v.total)}</td>
              </tr>
           `).join('')}
        </tbody>
      </table>
    `;
  }

  window.drillDownVendor = function (name) {
    searchFilter = name;
    viewMode = 'grid';
    renderTransactionFeed();
  };

  function updateHeaderUI(data = {}) {
    const headerRow1 = document.getElementById('header-row-1');
    const toolbarRow = document.getElementById('header-row-2');
    const panelHeader = document.getElementById('panel-header');
    if (!headerRow1 || !toolbarRow || !panelHeader) return;

    if (selectedTxnIds.size > 0) {
      panelHeader.classList.add('bulk-mode');

      if (bulkEditingType) {
        // --- INLINE BULK EDITING UI ---
        const label = bulkEditingType === 'vendor' ? 'New Payee:' : 'New Account:';
        let inputHtml = '';

        if (bulkEditingType === 'vendor') {
          inputHtml = `<input type="text" id="bulk-edit-input" class="tiny-input" style="width:200px;" placeholder="Type payee name...">`;
        } else {
          // Re-use accountOpts if possible or re-generate
          const accounts = (window.DEFAULT_CHART_OF_ACCOUNTS ||
            (window.storage && window.storage.getAccounts ? JSON.parse(localStorage.getItem('ab3_accounts') || '[]') : []));
          let opts = '<option value="">Select Account...</option>';
          accounts.forEach(acc => {
            const code = acc.code || acc.accountNumber;
            if (code) opts += `<option value="${code}">${code} - ${acc.name || acc.description}</option>`;
          });
          inputHtml = `<select id="bulk-edit-input" class="account-select" style="min-width:200px;">${opts}</select>`;
        }

        headerRow1.innerHTML = `
          <div style="display:flex; flex-direction:column; align-items:center; gap:8px; width:100%;">
            <div class="tier-title" style="color:var(--primary); margin-bottom:4px;">Bulk Reclassify ${bulkEditingType === 'vendor' ? 'Vendor' : 'Account'}</div>
            <div style="display:flex; gap:12px; align-items:center;">
              <span class="control-label" style="color:var(--primary)">${label}</span>
              ${inputHtml}
              <button class="btn btn-primary" onclick="saveBulkReclassify()">Apply to ${selectedTxnIds.size} lines</button>
              <button class="btn btn-secondary" onclick="cancelBulkReclassify()">Cancel</button>
            </div>
          </div>
        `;
        // Focus input
        setTimeout(() => { const el = document.getElementById('bulk-edit-input'); if (el) el.focus(); }, 10);
      } else {
        // --- NORMAL BULK MODE ---
        headerRow1.innerHTML = `
           <div class="tier-title" style="color:var(--primary); margin-bottom:8px;">${selectedTxnIds.size} Selected</div>
           <div style="display:flex; gap:12px; justify-content:center;">
              <button class="btn btn-primary" onclick="bulkReclassify('vendor')">Reclassify Vendor</button>
              <button class="btn btn-primary" onclick="bulkReclassify('account')">Reclassify Account</button>
              <button class="btn btn-secondary" onclick="clearSelection()">Exit Bulk Mode</button>
           </div>
        `;
      }
      toolbarRow.innerHTML = ''; // Clear toolbar in bulk mode
    } else {
      panelHeader.classList.remove('bulk-mode');
      headerRow1.innerHTML = `
           <div style="display:flex; flex-direction:column; gap:2px;">
              <div class="tier-title" id="page-title">${viewMode === 'vendor' ? 'Vendor Analysis' : 'Transactions'}</div>
           </div>
           <div style="display:flex; gap:16px; align-items:center;">
              <div class="stat-box">
                 <span class="stat-label">OPENING</span>
                 ${isEditingOpening ?
          `<input type="number" step="0.01" class="opening-input" value="${data.rawOpening}" onblur="saveOpeningBalance(this.value)" onkeydown="if(event.key==='Enter') saveOpeningBalance(this.value); if(event.key==='Escape') cancelEditOpening()">` :
          `<span class="stat-val editable-hint" onclick="startEditOpening()">${data.opening}</span>`
        }
              </div>
              <div class="stat-box"><span class="stat-label">IN</span> <span class="stat-val" style="color:var(--green)">${data.income}</span></div>
              <div class="stat-box"><span class="stat-label">OUT</span> <span class="stat-val" style="color:var(--red)">${data.expense}</span></div>
              <div class="stat-box"><span class="stat-label">END</span> <span class="stat-val">${data.end}</span></div>
           </div>
        `;

      // Row 2: Two-Tier Toolbar
      toolbarRow.style.flexDirection = 'column';
      toolbarRow.style.gap = '12px';
      toolbarRow.style.alignItems = 'stretch';
      toolbarRow.innerHTML = `
           <!-- Tier 1: Controls -->
           <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
              <div style="display:flex; align-items:center; gap:12px;">
                 <select class="account-select" id="account-select" onchange="switchAccount(this.value)" style="width:200px;"></select>
                 <div class="control-box">
                    <span class="control-label">REF PREFIX</span>
                    <input type="text" id="ref-prefix-input" class="tiny-input" value="${refPrefix}" oninput="updateRefPrefix(this.value)">
                 </div>
              </div>
              <div class="search-container" style="flex:1; max-width:600px;">
                 <span class="search-icon">🔍</span>
                 <input type="search" id="search-input" class="search-box" placeholder="Search transactions..." value="${searchFilter}" oninput="filterTransactionFeed(this.value)">
              </div>
           </div>
           
           <!-- Tier 2: Actions -->
           <div style="display:flex; align-items:center; justify-content:flex-end; gap:8px;">
              <button class="btn btn-secondary" onclick="toggleGlance()">${viewMode === 'grid' ? '📊 Vendors' : '📝 Transactions'}</button>
              <div style="width:1px; height:20px; background:var(--border); margin:0 4px;"></div>
              <button class="btn btn-secondary" onclick="openImportManager()">📥 Import</button>
              <button class="btn btn-primary" onclick="addNewTransaction()">➕ Add New Entry</button>
              <button class="btn btn-secondary" onclick="exportToXLS()">📊 Export XLS</button>
              <button class="btn btn-danger" style="background:#fff" onclick="confirmClearData()">🗑️ Clear Data</button>
              <button class="btn btn-secondary" onclick="window.router ? window.router.navigate('/settings') : console.log('Settings clicked')">⚙️</button>
           </div>
        `;

      if (isEditingOpening) {
        setTimeout(() => {
          const inp = document.querySelector('.opening-input');
          if (inp) { inp.focus(); inp.select(); }
        }, 50);
      }
    }
  }

  window.startEditOpening = function () {
    isEditingOpening = true;
    renderTransactionFeed();
  };

  window.cancelEditOpening = function () {
    isEditingOpening = false;
    renderTransactionFeed();
  };

  window.confirmClearData = function () {
    if (confirm('Are you sure you want to clear ALL transactions for the current account? This cannot be undone.')) {
      transactionData = [];
      saveTransactions();
      renderTransactionFeed();
    }
  };

  window.saveOpeningBalance = function (val) {
    const clean = parseFloat(val) || 0;
    if (window.accountManager) {
      const accId = window.accountManager.getCurrentAccountId();
      window.accountManager.updateAccount(accId, { openingBalance: clean });
      localStorage.setItem(`ab3_opening_${accId}`, clean);
    }
    isEditingOpening = false;
    renderTransactionFeed();
  };

  window.toggleGlance = function () {
    viewMode = viewMode === 'grid' ? 'vendor' : 'grid';
    renderTransactionFeed();
  };
  // Functional Functions

  window.toggleTxn = (id) => {
    const stringId = id.toString();
    selectedTxnIds.has(stringId) ? selectedTxnIds.delete(stringId) : selectedTxnIds.add(stringId);
    renderTransactionFeed();
  };

  window.toggleAllTxns = (checked) => {
    selectedTxnIds.clear();
    if (checked) transactionData.forEach(t => selectedTxnIds.add(t.id.toString()));
    renderTransactionFeed();
  };

  window.clearSelection = () => { selectedTxnIds.clear(); renderTransactionFeed(); };

  window.bulkReclassify = (type) => {
    bulkEditingType = type;
    renderTransactionFeed();
  };

  window.saveBulkReclassify = () => {
    const input = document.getElementById('bulk-edit-input');
    if (input && input.value) {
      const val = input.value;
      const snapshot = [];

      transactionData.forEach(t => {
        if (selectedTxnIds.has(t.id.toString())) {
          const field = bulkEditingType === 'vendor' ? 'description' : 'accountNumber';
          snapshot.push({ id: t.id, field, oldVal: t[field] });
          t[field] = val;
        }
      });

      undoStack = { type: 'bulk', data: snapshot };
      saveTransactions();
      bulkEditingType = null;
      renderTransactionFeed();

      // Auto-clear undo after 15 seconds
      setTimeout(() => { if (undoStack && undoStack.type === 'bulk') { undoStack = null; renderTransactionFeed(); } }, 15000);
    }
  };

  window.triggerUndo = () => {
    if (!undoStack) return;
    undoStack.data.forEach(item => {
      const txn = transactionData.find(t => t.id.toString() === item.id.toString());
      if (txn) txn[item.field] = item.oldVal;
    });
    undoStack = null;
    saveTransactions();
    renderTransactionFeed();
  };

  window.cancelBulkReclassify = () => {
    bulkEditingType = null;
    renderTransactionFeed();
  };

  window.updateField = (id, field, value) => {
    const txn = transactionData.find(t => t.id.toString() === id.toString());
    if (txn) {
      const oldVal = txn[field];
      const newVal = (field === 'debit' || field === 'credit') ? (parseFloat(value) || 0) : value;

      if (oldVal !== newVal) {
        if (field === 'description' || field === 'accountNumber') {
          undoStack = { type: 'edit', data: [{ id, field, oldVal }] };
          setTimeout(() => { if (undoStack && undoStack.type === 'edit') { undoStack = null; renderTransactionFeed(); } }, 10000);
        }

        txn[field] = newVal;
        if (window.debouncedSave) window.debouncedSave(); else saveTransactions();
        if (['date', 'debit', 'credit', 'description', 'accountNumber'].includes(field)) renderTransactionFeed();
      }
    }
  };

  window.setSort = (col) => {
    if (sortState.col === col) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    else { sortState.col = col; sortState.dir = 'asc'; }
    renderTransactionFeed();
  };

  window.startDeleteRow = (id) => { deletingRowId = id.toString(); renderTransactionFeed(); };
  window.confirmDeleteRow = (id) => {
    const idx = transactionData.findIndex(t => t.id.toString() === id.toString());
    if (idx !== -1) {
      transactionData.splice(idx, 1);
      deletingRowId = null;
      saveTransactions();
      renderTransactionFeed();
    }
  };
  window.cancelDeleteRow = () => { deletingRowId = null; renderTransactionFeed(); };

  window.exportToXLS = function () {
    if (!window.XLSX) return alert('Loading exporter...');
    const dataRows = transactionData.map((txn, idx) => ({
      "Ref #": txn.computedRef || (idx + 1).toString().padStart(3, '0'),
      "Date": txn.date ? txn.date.split('T')[0] : '',
      "Description": txn.description || '',
      "Debit": parseFloat(txn.debit || 0),
      "Credit": parseFloat(txn.credit || 0),
      "Balance": txn.runningBalance || 0,
      "Account #": txn.accountNumber || '',
      "Category": ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Transactions");
    XLSX.writeFile(workbook, "Transactions_Export.xlsx");
  };

  // --- MODAL ---

  window.openImportManager = () => {
    document.getElementById('import-modal').style.display = 'flex';
    renderImportHistory();
  };
  window.closeImportManager = () => document.getElementById('import-modal').style.display = 'none';

  function renderImportHistory() {
    const history = JSON.parse(localStorage.getItem('ab3_upload_history') || '[]');
    const list = document.getElementById('history-list');
    if (!list) return;

    if (importPendingData) {
      list.innerHTML = `
        <div style="background:#f8fafc; border:1px solid var(--primary); border-radius:8px; padding:20px; text-align:center;">
          <div style="font-weight:700; color:var(--text-main); margin-bottom:12px;">Where should these ${importPendingData.length} transactions go?</div>
          <div style="display:flex; flex-direction:column; gap:8px;">
            <button class="btn btn-primary" style="justify-content:center;" onclick="finalizeImport('chq1')">TD Chequing (Asset)</button>
            <button class="btn btn-primary" style="justify-content:center; background:#475569;" onclick="finalizeImport('mc1')">RBC Avion Visa (Liability)</button>
            <button class="btn btn-secondary" style="justify-content:center;" onclick="cancelImport()">Cancel</button>
          </div>
        </div>
      `;
      return;
    }

    if (!history.length) {
      list.innerHTML = '<div style="padding:24px; text-align:center; color:#94a3b8; font-size:0.85rem; font-weight:500;">No history found.</div>';
      return;
    }

    list.innerHTML = history.map(h => {
      const isEditing = editingImportId === h.id;
      const isRestoring = restoringImportId === h.id;

      if (isEditing) {
        return `
          <div class="history-item">
            <div style="flex:1; display:flex; gap:8px; align-items:center;">
              <input type="text" id="rename-import-input" class="tiny-input" style="flex:1; width:auto;" value="${h.filename}">
              <button class="btn btn-primary" style="height:28px; padding:0 8px;" onclick="saveImportRename('${h.id}')">Save</button>
              <button class="btn btn-secondary" style="height:28px; padding:0 8px;" onclick="cancelImportRename()">✕</button>
            </div>
          </div>`;
      }

      if (isRestoring) {
        return `
          <div class="history-item" style="background:#eff6ff; border-left:4px solid var(--primary);">
            <div style="flex:1; font-weight:700; font-size:0.75rem; color:var(--primary); text-transform:uppercase;">Restore:</div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-primary" style="height:26px; padding:0 8px; font-size:0.7rem;" onclick="confirmRestore('${h.id}', 'replace')">Replace All</button>
              <button class="btn btn-secondary" style="height:26px; padding:0 8px; font-size:0.7rem;" onclick="confirmRestore('${h.id}', 'append')">Add to Current</button>
              <button class="btn btn-secondary" style="height:26px; width:26px; padding:0; justify-content:center;" onclick="cancelRestore()">✕</button>
            </div>
          </div>`;
      }

      return `
        <div class="history-item">
           <div style="flex:1;">
              <div style="font-weight:700; font-size:0.8rem; color:var(--text-main);">${h.filename}</div>
              <div style="font-size:0.65rem; color:#94a3b8; font-weight:600;">${h.date} • ${h.count} txns</div>
           </div>
           <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary" style="width:28px; padding:0; justify-content:center; border:none;" onclick="renameImport('${h.id}')" title="Rename">✏️</button>
              <button class="btn btn-secondary" style="width:28px; padding:0; justify-content:center; border:none;" onclick="restoreImport('${h.id}')" title="Restore">🔄</button>
              <button class="btn btn-secondary" style="width:28px; padding:0; justify-content:center; border:none;" onclick="deleteImport('${h.id}')" title="Delete">✕</button>
           </div>
        </div>
      `;
    }).join('');
  }

  window.renameImport = (id) => {
    editingImportId = id;
    renderImportHistory();
    setTimeout(() => {
      const input = document.getElementById('rename-import-input');
      if (input) { input.focus(); input.select(); }
    }, 10);
  };

  window.saveImportRename = (id) => {
    const input = document.getElementById('rename-import-input');
    if (input) {
      const history = JSON.parse(localStorage.getItem('ab3_upload_history') || '[]');
      const item = history.find(h => h.id === id);
      if (item && input.value.trim()) {
        item.filename = input.value.trim();
        localStorage.setItem('ab3_upload_history', JSON.stringify(history));
      }
    }
    editingImportId = null;
    renderImportHistory();
  };

  window.cancelImportRename = () => {
    editingImportId = null;
    renderImportHistory();
  };

  window.restoreImport = (id) => {
    restoringImportId = id;
    renderImportHistory();
  };

  window.cancelRestore = () => {
    restoringImportId = null;
    renderImportHistory();
  };

  window.confirmRestore = (id, mode) => {
    const raw = localStorage.getItem(`ab3_raw_data_${id}`);
    if (!raw) return showModalStatus('Original data not found.', 'red');

    const txns = JSON.parse(raw);
    if (mode === 'replace') {
      transactionData = txns;
    } else {
      transactionData = [...txns, ...transactionData];
    }

    saveTransactions();
    renderTransactionFeed();
    showModalStatus(`Restored ${txns.length} transactions (${mode})`, 'green');
    restoringImportId = null;
    renderImportHistory();
  };

  window.handleFileDrop = (files) => {
    if (!files.length) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target.result;
        const lines = csv.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 2) return showModalStatus('CSV file is empty or invalid.', 'red');

        const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g, ''));
        const dataRows = lines.slice(1);

        const newTxns = dataRows.map((line, idx) => {
          const cells = line.split(',').map(c => c.trim().replace(/"/g, ''));
          const row = {};
          headers.forEach((h, i) => { row[h] = cells[i]; });

          return {
            id: Date.now() + idx,
            date: row.date || row.timestamp || new Date().toISOString().split('T')[0],
            description: row.description || row.payee || row.memo || 'Imported Transaction',
            debit: parseFloat(row.debit || row.out || row.withdrawal || 0),
            credit: parseFloat(row.credit || row.in || row.deposit || 0),
            accountNumber: row.account || row.category || ''
          };
        });

        importPendingData = newTxns;
        importPendingFilename = file.name;
        renderImportHistory();
        showModalStatus(`Parsed ${newTxns.length} transactions. Select account.`, 'green');
      } catch (err) {
        console.error('Import failed:', err);
        showModalStatus('Failed to parse CSV.', 'red');
      }
    };
    reader.readAsText(file);
  };

  window.cancelImport = () => {
    importPendingData = null;
    importPendingFilename = '';
    renderImportHistory();
  };

  window.finalizeImport = (accountId) => {
    if (!importPendingData) return;

    // Switch account first
    if (window.accountManager) window.accountManager.setCurrentAccount(accountId);

    const history = JSON.parse(localStorage.getItem('ab3_upload_history') || '[]');
    const existing = history.find(h => h.filename === importPendingFilename);
    const uploadId = Date.now().toString();

    // Store raw data for RESTORE functionality
    localStorage.setItem(`ab3_raw_data_${uploadId}`, JSON.stringify(importPendingData));

    if (existing) {
      existing.count = importPendingData.length;
      existing.date = new Date().toLocaleDateString();
      existing.id = uploadId;
    } else {
      history.unshift({ id: uploadId, filename: importPendingFilename, date: new Date().toLocaleDateString(), count: importPendingData.length });
    }

    localStorage.setItem('ab3_upload_history', JSON.stringify(history));

    // Persist to the correct account storage (REPLACE MODE per user request)
    transactionData = importPendingData;
    saveTransactions(); // Handles accountManager or storage correctly

    importPendingData = null;
    importPendingFilename = '';
    viewMode = 'grid'; // Auto-switch to grid to show new data

    renderTransactionFeed();
    renderImportHistory();
    initAccountSelector(); // Refresh dropdown
    if (window.closeImportManager) window.closeImportManager(); // Auto-close modal
    showModalStatus('Import Finalized!', 'green');
  };

  function showModalStatus(msg, color) {
    const el = document.getElementById('modal-status');
    if (el) {
      el.textContent = msg;
      el.style.color = color === 'red' ? 'var(--red)' : 'var(--green)';
      setTimeout(() => { if (el.textContent === msg) el.textContent = ''; }, 3000);
    }
  }

  // --- IO ---

  function saveTransactions() {
    if (window.accountManager) {
      const acc = window.accountManager.getCurrentAccount();
      if (acc) { window.accountManager.setAccountTransactions(acc.id, transactionData); return; }
    }
    if (window.storage) window.storage._set('transactions', transactionData);
  }

  async function loadSavedTransactions() {
    if (window.accountManager) {
      const acc = window.accountManager.getCurrentAccount();
      if (acc) {
        let loaded = window.accountManager.getAccountTransactions(acc.id) || [];
        // Normalize Data (handle legacy amount/type)
        loaded.forEach((t, i) => {
          if (!t.id) t.id = Date.now() + i;
          if (t.amount !== undefined && t.debit === undefined && t.credit === undefined) {
            if (t.type === 'credit') { t.credit = t.amount; t.debit = 0; }
            else { t.debit = t.amount; t.credit = 0; }
          }
        });
        transactionData = loaded;
        localStorage.setItem('openingBalance', (acc.openingBalance || 0).toString());
        return renderTransactionFeed();
      }
    }
    if (window.storage) {
      transactionData = await window.storage.getTransactions() || [];
      transactionData.forEach((t, i) => { if (!t.id) t.id = Date.now() + i; });
      renderTransactionFeed();
    }
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  let isInitializing = false;
  const lo = new MutationObserver(() => {
    if (document.getElementById('transactionFeed') && !isInitializing) {
      isInitializing = true;
      loadSavedTransactions();
      setTimeout(() => isInitializing = false, 300);
    }
  });
  if (document.body) lo.observe(document.body, { childList: true, subtree: true });

  window.loadTransactionData = loadSavedTransactions;
  window.updateRefPrefix = updateRefPrefix;
  window.deleteImport = (id) => {
    const history = JSON.parse(localStorage.getItem('ab3_upload_history') || '[]');
    const filtered = history.filter(h => h.id !== id);
    localStorage.setItem('ab3_upload_history', JSON.stringify(filtered));
    localStorage.removeItem(`ab3_raw_data_${id}`);
    renderImportHistory();
  };
  window.filterTransactionFeed = (v) => { searchFilter = v; renderTransactionFeed(); };
  window.addNewTransaction = () => {
    transactionData.unshift({ id: Date.now(), date: new Date().toISOString().split('T')[0], description: 'New Entry', debit: 0, credit: 0, accountNumber: '' });
    renderTransactionFeed(); saveTransactions();
  };
})();
