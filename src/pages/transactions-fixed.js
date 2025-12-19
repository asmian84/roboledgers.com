/**
 * Transactions Page - Modern High-Density Financial UI
 * "Two-Tier Pro" Architecture - Integrated Dashboard
 */

(function () {
  'use strict';

  // --- PERSISTENT STATE ---
  let transactionData = [];
  let refPrefix = localStorage.getItem('ab3_ref_prefix') || 'CHQ';
  let selectedTxnIds = new Set();
  let searchFilter = '';
  let sortState = { col: 'date', dir: 'desc' };

  window.renderTransactions = function () {
    console.log('🎨 renderTransactions() called - returning Two-Tier Pro template');
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
        }

        /* 1. MAIN STAGE (VIRTUAL FRAME) */
        .transactions-page {
          width: 100% !important;
          max-width: none !important;
          height: 100vh;
          padding: 8px; 
          background: var(--bg);
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          font-family: 'Inter', system-ui, sans-serif;
        }

        /* 2. THE SEAMLESS CARD WRAPPER */
        .app-panel {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: var(--surface);
          border-radius: 12px; 
          border: 1px solid var(--border);
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          overflow: hidden;
          min-height: 0;
        }

        /* 3. THE FROZEN TWO-TIER HEADER PANE */
        .panel-header {
          flex: none;
          background: var(--surface);
          border-bottom: 1px solid var(--border);
          display: flex;
          flex-direction: column;
        }

        /* TIERS */
        .header-tier {
           padding: 8px 16px;
           display: flex;
           align-items: center;
           justify-content: space-between;
           min-height: 44px;
        }
        .header-tier.status-row { border-bottom: 1px solid #f1f5f9; background: #fff; }
        .header-tier.toolbar-row { background: #fafafa; }

        /* Titles & Status */
        .tier-title { font-size: 1rem; font-weight: 700; color: var(--text-main); }
        
        .stats-strip {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--accent);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.75rem;
          color: var(--text-muted);
          border: 1px solid #e2e8f0;
        }
        .stat-item { display: flex; align-items: center; gap: 4px; }
        .stat-label { font-weight: 600; font-size: 0.65rem; color: #94a3b8; text-transform: uppercase; }
        .stat-value { font-weight: 700; color: var(--text-main); }
        .stat-value.inc { color: #059669; }
        .stat-value.exp { color: #dc2626; }
        .stat-divider { color: #cbd5e1; }

        /* Toolbar Controls */
        .toolbar-group { display: flex; align-items: center; gap: 8px; }
        
        .control-box { display: flex; align-items: center; gap: 6px; }
        .control-label { font-size: 0.7rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; white-space: nowrap; }
        .tiny-input { padding: 4px 8px; border: 1px solid var(--border); border-radius: 4px; font-size: 0.75rem; width: 60px; height: 28px; }

        .search-container { flex: 1; max-width: 500px; position: relative; margin: 0 20px; }
        .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94a3b8; font-size: 0.8rem; }
        .search-box {
          width: 100%;
          padding: 6px 12px 6px 30px;
          border: 1px solid var(--border);
          border-radius: 6px;
          font-size: 0.85rem;
          height: 32px;
          background: #fff;
        }
        .search-box:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 10px rgba(59, 130, 246, 0.1); }

        .btn {
          height: 32px;
          padding: 0 12px;
          font-size: 0.75rem;
          font-weight: 600;
          border-radius: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          border: 1px solid transparent;
        }
        .btn-primary { background: #0f172a; color: white; }
        .btn-secondary { background: white; border-color: var(--border); color: var(--text-main); }
        .btn:hover { opacity: 0.9; transform: translateY(-1px); }

        /* 4. THE DATA PANE */
        .panel-body {
          flex: 1;
          overflow-y: auto;
          background: #fff;
        }
        
        /* THE PRO TABLE */
        .txn-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
        .txn-table thead th {
           position: sticky; top: 0; z-index: 10;
           background: #f8fafc;
           padding: 10px 12px;
           text-align: left;
           font-size: 0.65rem;
           font-weight: 700;
           color: #64748b;
           text-transform: uppercase;
           letter-spacing: 0.05em;
           border-bottom: 1px solid #e2e8f0;
           cursor: pointer;
           user-select: none;
        }
        .txn-table thead th:hover { background: #f1f5f9; }
        .header-icon { font-size: 0.6rem; margin-left: 4px; color: #94a3b8; }

        .txn-table td {
           border-bottom: 1px solid #f1f5f9;
           padding: 0;
           vertical-align: middle;
        }
        .txn-table tr:hover td { background-color: #f0f7ff !important; }

        .cell-input {
           width: 100%;
           padding: 8px 12px;
           border: 1px solid transparent;
           font-size: 0.8rem;
           background: transparent;
           box-sizing: border-box;
           color: #1e293b;
           height: 36px;
        }
        .cell-input:focus { outline: none; background: #fff; border-color: #3b82f6; box-shadow: inset 0 0 0 1px #3b82f6; }

        /* COLUMN WIDTHS */
        .col-cb { width: 40px; text-align: center; }
        .col-ref { width: 100px; }
        .col-date { width: 110px; }
        .col-payee { width: auto; }
        .col-acct { width: 200px; }
        .col-amount { width: 110px; }
        .col-bal { width: 120px; }
        .col-act { width: 44px; }

        .text-right { text-align: right !important; }
        .font-mono { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-variant-numeric: tabular-nums; }

        /* CHECKBOXES */
        .bulk-cb { width: 16px; height: 16px; cursor: pointer; accent-color: var(--primary); }

        /* SCROLLBAR */
        .panel-body::-webkit-scrollbar { width: 8px; }
        .panel-body::-webkit-scrollbar-track { background: transparent; }
        .panel-body::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; border: 2px solid #fff; }
      </style>

      <div class="app-panel">
         <!-- TWO-TIER HEADER -->
         <div class="panel-header">
            <!-- Tier 1: Title & Status -->
            <div class="header-tier status-row">
               <div class="tier-title">Transactions</div>
               <div class="stats-strip">
                  <div class="stat-item"><span class="stat-label">Opening:</span><span id="stat-opening" class="stat-value" onclick="promptOpeningBalance()" style="cursor:pointer;text-decoration:underline dotted;">$0.00</span></div>
                  <div class="stat-divider">|</div>
                  <div class="stat-item"><span class="stat-label">In:</span><span id="stat-income" class="stat-value inc">$0.00</span></div>
                  <div class="stat-divider">|</div>
                  <div class="stat-item"><span class="stat-label">Out:</span><span id="stat-expense" class="stat-value exp">$0.00</span></div>
                  <div class="stat-divider">|</div>
                  <div class="stat-item"><span class="stat-label">End:</span><span id="stat-end" class="stat-value">$0.00</span></div>
               </div>
            </div>

            <!-- Tier 2: Toolbar -->
            <div class="header-tier toolbar-row">
               <div class="toolbar-group">
                  <div class="control-box">
                     <span class="control-label">Ref Prefix:</span>
                     <input type="text" id="ref-prefix-input" class="tiny-input" value="${refPrefix}" oninput="updateRefPrefix(this.value)">
                  </div>
               </div>

               <div class="search-container">
                  <span class="search-icon">🔍</span>
                  <input type="search" id="search-input" class="search-box" placeholder="Search Payee, Reference, or Amount..." oninput="filterTransactionFeed(this.value)">
               </div>

               <div class="toolbar-group">
                  <button class="btn btn-secondary" onclick="showCSVImport()">📥 Import</button>
                  <button class="btn btn-primary" onclick="addNewTransaction()">➕ Add New</button>
               </div>
            </div>
         </div>

         <!-- DATA PANE -->
         <div class="panel-body" id="panel-body">
            <div id="transactionFeed"></div>
         </div>
      </div>
    </div>
    
    <script>
      if (typeof window.loadTransactionData === 'function') {
        setTimeout(window.loadTransactionData, 100);
      }
    </script>
    `;
  };

  function updateRefPrefix(val) {
    refPrefix = val || 'REF';
    localStorage.setItem('ab3_ref_prefix', refPrefix);
    renderTransactionFeed();
  }

  function formatCurrency(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  }

  function renderTransactionFeed() {
    const feedContainer = document.getElementById('transactionFeed');
    if (!feedContainer) return;

    // --- 1. State Logic ---
    let currentOpeningBalance = 0;
    if (window.accountManager) {
      const acc = window.accountManager.getCurrentAccount();
      if (acc) currentOpeningBalance = parseFloat(acc.openingBalance || 0);
    } else {
      currentOpeningBalance = parseFloat(localStorage.getItem('openingBalance') || 0);
    }

    const sortedData = [...transactionData].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Apply Filters
    let displayData = sortedData.filter(txn => {
      if (!searchFilter) return true;
      const s = searchFilter.toLowerCase();
      return (txn.description || '').toLowerCase().includes(s) ||
        (txn.refNumber || '').toLowerCase().includes(s) ||
        (txn.debit || '').toString().includes(s) ||
        (txn.credit || '').toString().includes(s);
    });

    // Handle Balance Calculation Flow (needs to be done on sorted data)
    let runningBalance = currentOpeningBalance;
    let totalIn = 0;
    let totalOut = 0;

    const processedData = sortedData.map((txn, idx) => {
      const debit = parseFloat(txn.debit || 0);
      const credit = parseFloat(txn.credit || 0);
      totalIn += credit;
      totalOut += debit;
      runningBalance = runningBalance - debit + credit;

      // Calculate Ref Number based on ORIGINAL SORT position (stable index)
      const paddedIdx = (idx + 1).toString().padStart(3, '0');
      const computedRef = `${refPrefix}-${paddedIdx}`;

      return { ...txn, computedRef, runningBalance, _formattedBalance: formatCurrency(runningBalance) };
    });

    // Update Header Stats
    const setStat = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
    setStat('stat-opening', formatCurrency(currentOpeningBalance));
    setStat('stat-income', formatCurrency(totalIn));
    setStat('stat-expense', formatCurrency(totalOut));
    setStat('stat-end', formatCurrency(runningBalance));

    // Sort the display data based on UI sort state
    displayData = processedData.filter(txn => {
      if (!searchFilter) return true;
      const s = searchFilter.toLowerCase();
      return (txn.description || '').toLowerCase().includes(s) ||
        (txn.computedRef || '').toLowerCase().includes(s);
    });

    if (sortState.col) {
      displayData.sort((a, b) => {
        let aV = a[sortState.col], bV = b[sortState.col];
        if (sortState.col === 'date') { aV = new Date(a.date); bV = new Date(b.date); }
        if (sortState.col === 'debit' || sortState.col === 'credit') { aV = parseFloat(a[sortState.col]); bV = parseFloat(b[sortState.col]); }
        return (aV < bV ? -1 : 1) * (sortState.dir === 'asc' ? 1 : -1);
      });
    } else {
      displayData.reverse(); // Default newest first
    }

    // --- 2. Build Grid ---
    if (displayData.length === 0) {
      feedContainer.innerHTML = `<div style="padding: 80px; text-align: center; color: #94a3b8;">No results.</div>`;
      return;
    }

    const accounts = (window.DEFAULT_CHART_OF_ACCOUNTS ||
      (window.storage && window.storage.getAccounts ? JSON.parse(localStorage.getItem('ab3_accounts') || '[]') : []));
    let accountOpts = '<option value="">Uncategorized</option>';
    accounts.forEach(acc => {
      const code = acc.code || acc.accountNumber;
      const name = acc.name || acc.description;
      if (code) accountOpts += `<option value="${code}">${code} - ${name}</option>`;
    });

    const renderRow = (txn) => {
      const index = transactionData.indexOf(txn);
      const selected = selectedTxnIds.has(txn.id || index);
      const selOpts = accountOpts.replace(`value="${txn.accountNumber}"`, `value="${txn.accountNumber}" selected`);

      return `
        <tr data-id="${txn.id || index}">
          <td class="col-cb">
             <input type="checkbox" class="bulk-cb" ${selected ? 'checked' : ''} onchange="toggleTxnSelection('${txn.id || index}')">
          </td>
          <td class="col-ref">
             <div class="cell-input font-mono" style="color: #64748b; font-weight:600; padding-top:10px;">${txn.computedRef}</div>
          </td>
          <td class="col-date">
             <input class="cell-input" type="date" value="${txn.date ? txn.date.split('T')[0] : ''}" onchange="updateTransactionField(${index}, 'date', this.value)">
          </td>
          <td class="col-payee">
             <input class="cell-input" type="text" value="${(txn.description || '').replace(/"/g, '&quot;')}" onchange="updateTransactionField(${index}, 'description', this.value)">
          </td>
          <td class="col-acct">
            <select class="cell-input" onchange="updateTransactionField(${index}, 'accountNumber', this.value)">
                ${selOpts}
            </select>
          </td>
          <td class="col-amount">
             <input class="cell-input text-right font-mono" type="number" step="0.01" style="color: #dc2626" value="${parseFloat(txn.debit || 0).toFixed(2)}" onchange="updateTransactionField(${index}, 'debit', this.value)">
          </td>
          <td class="col-amount">
             <input class="cell-input text-right font-mono" type="number" step="0.01" style="color: #059669" value="${parseFloat(txn.credit || 0).toFixed(2)}" onchange="updateTransactionField(${index}, 'credit', this.value)">
          </td>
          <td class="col-bal">
             <div class="cell-input text-right font-mono" style="color: #1e293b; font-weight: 700; padding-top:10px;">${txn._formattedBalance}</div>
          </td>
          <td class="col-act">
             <button class="btn" style="border:none; background:transparent; color:#cbd5e1;" onclick="if(confirm('Delete?')) { transactionData.splice(${index}, 1); saveTransactions(); renderTransactionFeed(); }">✕</button>
          </td>
        </tr>`;
    };

    const getSortIcon = (col) => {
      if (sortState.col !== col) return '↕';
      return sortState.dir === 'asc' ? '↑' : '↓';
    };

    feedContainer.innerHTML = `
      <table class="txn-table">
        <colgroup>
           <col class="col-cb"><col class="col-ref"><col class="col-date"><col class="col-payee"><col class="col-acct"><col class="col-amount"><col class="col-amount"><col class="col-bal"><col class="col-act">
        </colgroup>
        <thead>
          <tr>
            <th class="col-cb"><input type="checkbox" class="bulk-cb" id="master-cb" onclick="toggleSelectAll(this.checked)"></th>
            <th onclick="sortTransactions('computedRef')">REF # <span class="header-icon">${getSortIcon('computedRef')}</span></th>
            <th onclick="sortTransactions('date')">DATE <span class="header-icon">${getSortIcon('date')}</span></th>
            <th onclick="sortTransactions('description')">PAYEE / DESCRIPTION <span class="header-icon">▼</span></th>
            <th onclick="sortTransactions('accountNumber')">ACCOUNT <span class="header-icon">▼</span></th>
            <th class="text-right" onclick="sortTransactions('debit')">DEBIT <span class="header-icon">${getSortIcon('debit')}</span></th>
            <th class="text-right" onclick="sortTransactions('credit')">CREDIT <span class="header-icon">${getSortIcon('credit')}</span></th>
            <th class="text-right">BALANCE</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="txn-tbody"></tbody>
      </table>
      <div id="sentinel" style="height: 20px;"></div>
    `;

    // Infinite Scroll
    const tbody = document.getElementById('txn-tbody');
    const sentinel = document.getElementById('sentinel');
    const batchSize = 60;
    let renderedRows = 0;

    const loadMore = () => {
      const batch = displayData.slice(renderedRows, renderedRows + batchSize);
      if (batch.length > 0) {
        tbody.insertAdjacentHTML('beforeend', batch.map(renderRow).join(''));
        renderedRows += batch.length;
      }
      if (renderedRows >= displayData.length) {
        if (obs) obs.disconnect();
        sentinel.style.display = 'none';
      }
    };

    const obs = new IntersectionObserver(entries => { if (entries[0].isIntersecting) loadMore(); }, { rootMargin: '400px' });
    obs.observe(sentinel);
    loadMore();
  }

  // --- Helpers ---
  window.updateRefPrefix = updateRefPrefix;

  window.toggleTxnSelection = function (id) {
    if (selectedTxnIds.has(id)) selectedTxnIds.delete(id);
    else selectedTxnIds.add(id);
    renderTransactionFeed();
  };

  window.toggleSelectAll = function (checked) {
    selectedTxnIds.clear();
    if (checked) {
      transactionData.forEach((t, i) => selectedTxnIds.add(t.id || i));
    }
    renderTransactionFeed();
  };

  window.sortTransactions = function (col) {
    if (sortState.col === col) sortState.dir = sortState.dir === 'asc' ? 'desc' : 'asc';
    else { sortState.col = col; sortState.dir = 'asc'; }
    renderTransactionFeed();
  };

  window.filterTransactionFeed = function (val) {
    searchFilter = val;
    renderTransactionFeed();
  };

  window.updateTransactionField = function (index, field, value) {
    if (!transactionData[index]) return;
    transactionData[index][field] = (field === 'debit' || field === 'credit') ? (parseFloat(value) || 0) : value;
    if (window.debouncedSave) window.debouncedSave();
    else saveTransactions();
    if (['date', 'debit', 'credit'].includes(field)) renderTransactionFeed();
  };

  function saveTransactions() {
    if (window.accountManager) {
      const acc = window.accountManager.getCurrentAccount();
      if (acc) { window.accountManager.setAccountTransactions(acc.id, transactionData); return; }
    }
    if (window.storage) window.storage._set('transactions', transactionData);
  }

  window.addNewTransaction = function () {
    transactionData.unshift({
      id: Date.now(),
      refNumber: '',
      date: new Date().toISOString().split('T')[0],
      description: 'New Transaction',
      debit: 0, credit: 0, accountNumber: ''
    });
    renderTransactionFeed();
    saveTransactions();
  };

  async function loadSavedTransactions() {
    if (window.accountManager) {
      const acc = window.accountManager.getCurrentAccount();
      if (acc) {
        transactionData = window.accountManager.getAccountTransactions(acc.id) || [];
        localStorage.setItem('openingBalance', acc.openingBalance.toString());
        return renderTransactionFeed();
      }
    }
    if (window.storage) {
      transactionData = await window.storage.getTransactions() || [];
      renderTransactionFeed();
    }
  }

  // Lifecycle
  let isInit = false;
  const obs = new MutationObserver(() => {
    if (document.getElementById('transactionFeed') && !isInit) {
      isInit = true;
      loadSavedTransactions();
      setTimeout(() => { isInit = false; }, 300);
    }
  });
  if (document.body) obs.observe(document.body, { childList: true, subtree: true });

  // Exports
  window.showCSVImport = () => { if (window.showAccountSelection) window.showAccountSelection(); };
  window.loadTransactionData = loadSavedTransactions;

})();
