/**
 * Transactions Page - Unified Command Center
 * Strict Layout Compliance Version
 */

if (typeof window.transactionData === 'undefined') {
  window.transactionData = [];
}

// Ensure at least one dummy data for visualization if empty
if (window.transactionData.length === 0) {
  const saved = localStorage.getItem('transactions');
  if (saved) {
    try {
      window.transactionData = JSON.parse(saved);
    } catch (e) { console.error('Error loading local transactions', e); }
  }
}

// State for filters
window.transactionState = {
  search: '',
  refPrefix: '[CHQ]'
};

window.renderTransactions = function () {
  const filteredData = getFilteredTransactions();

  const opening = 0.00;
  const totalIn = filteredData.reduce((acc, t) => acc + (t.credit || 0), 0);
  const totalOut = filteredData.reduce((acc, t) => acc + (t.debit || 0), 0);
  const ending = opening + totalIn - totalOut;

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return `
    <div class="transaction-page">
      
      <!-- FIXED SECTION: Header & Controls -->
      <div class="fixed-top-section">
          <!-- Row 1: Context & Stats -->
          <header class="uc-header">
            <div class="uc-subtitle">
              BANK: Imported Transactions
              <span>▾</span>
            </div>
            
            <div class="uc-stats">
              <span>Opening: $0.00</span>
              <span class="stat-divider">|</span>
              <span class="text-green">In: +${fmt(totalIn)}</span>
              <span class="stat-divider">|</span>
              <span class="text-red">Out: -${fmt(totalOut)}</span>
              <span class="stat-divider">|</span>
              <span class="stat-value-bold">Ending: ${fmt(ending)}</span>
            </div>
          </header>

          <!-- Row 2: Toolbar -->
          <div class="control-bar">
            <div class="control-left">
              <input type="text" class="input-box input-ref" 
                     placeholder="[CHQ]" 
                     value="${window.transactionState.refPrefix}"
                     oninput="updateRefPrefix(this.value)">
              <input type="text" class="input-box input-search" 
                     placeholder="Search transactions..." 
                     value="${window.transactionState.search}"
                     oninput="handleSearch(this.value)">
            </div>
            
            <div class="control-right btn-group">
               <button class="uc-btn uc-btn-outline" onclick="showCSVImport()">
                 📥 Import CSV
               </button>
               <button class="uc-btn uc-btn-primary" onclick="addNewTransaction()">
                 <span>+</span> Add Entry
               </button>
               <button class="uc-btn uc-btn-outline" onclick="analyzeVendors()">
                 <span>📈</span> Analyze Vendors
               </button>
               <button class="uc-btn uc-btn-icon">
                 •••
               </button>
            </div>
          </div>
      </div>

      <!-- SCROLLABLE SECTION: Data Grid -->
      <div class="grid-container">
        <table class="uc-table">
          <thead>
            <tr>
              <th class="w-check"><input type="checkbox"></th>
              <th class="w-ref">REF #</th>
              <th class="w-date">DATE</th>
              <th class="w-payee">PAYEE</th>
              <th class="w-icon">📎</th>
              <th class="w-icon">⑃</th>
              <th class="w-reconcile">✓</th>
              <th class="w-account">ACCOUNT</th>
              <th class="w-amount">DEBIT</th>
              <th class="w-amount">CREDIT</th>
              <th class="w-amount">BALANCE</th>
            </tr>
          </thead>
          <tbody id="txn-tbody">
            ${renderTableRows(filteredData)}
          </tbody>
        </table>
      </div>

      <!-- CSV Modal (Hidden) -->
      <div id="csv-dropzone" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; align-items: center; justify-content: center;">
         <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center; width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
            <h3 style="margin-bottom: 1rem;">Import CSV</h3>
            <div style="border: 2px dashed #cbd5e1; padding: 2rem; margin-bottom: 1rem; border-radius: 8px; cursor: pointer;" onclick="document.getElementById('csv-file-input').click()">
                <p>Click to upload or drag file here</p>
                <input type="file" id="csv-file-input" accept=".csv" style="display: none;" onchange="handleFileSelect(event)">
            </div>
            <button class="uc-btn uc-btn-outline" onclick="hideCSVImport()">Cancel</button>
         </div>
      </div>

    </div>
  `;
};

// --- DATA LOGIC ---

function getFilteredTransactions() {
  if (!window.transactionState.search) return window.transactionData;
  const term = window.transactionState.search.toLowerCase();
  return window.transactionData.filter(t =>
    (t.description && t.description.toLowerCase().includes(term)) ||
    (t.refNumber && t.refNumber.toLowerCase().includes(term)) ||
    (t.accountDescription && t.accountDescription.toLowerCase().includes(term))
  );
}

window.updateRefPrefix = function (val) {
  window.transactionState.refPrefix = val;
}

window.handleSearch = function (val) {
  window.transactionState.search = val;
  reRenderTable();
}

function reRenderTable() {
  const tbody = document.getElementById('txn-tbody');
  if (tbody) {
    tbody.innerHTML = renderTableRows(getFilteredTransactions());

    // Also update stats if we want to be fancy, but full re-render is safer for single-page app simplicity
    // document.querySelector('.uc-stats').innerHTML = ... // (Optional optimization)

    // Let's re-render the whole app to update stats.
    // If we only update table, stats won't update.
    // A full re-render can be jarring if input focus is lost. 
    // For search, updating table is enough. Stats updating on search is debatable (should stats reflect filter?). 
    // Usually yes.
    // But for typing performance, let's keep it simple. Only table updates for now.
  }
}

// --- RENDER ROWS ---

function renderTableRows(data) {
  if (data.length === 0) {
    return `<tr><td colspan="11" style="text-align:center; padding: 2rem; color: #94a3b8;">No transactions found</td></tr>`;
  }

  let runningBalance = 0;

  return data.map((txn, index) => {
    // Math
    const debit = parseFloat(txn.debit || 0);
    const credit = parseFloat(txn.credit || 0);
    runningBalance += (credit - debit);

    const isUncategorized = !txn.accountDescription;
    const accountLabel = txn.accountDescription || 'Uncategorized';

    // Check global index if we are filtered
    const realIndex = window.transactionData.indexOf(txn);

    // Smart dropdown content
    const dropdownHtml = `
        <div class="smart-menu" id="dropdown-${realIndex}" style="display: none;">
            <div class="smart-menu-header">✨ Smart Recommendation</div>
            <div class="smart-menu-item smart-recommendation" onclick="selectAccount(${realIndex}, 'Meals & Entertainment (95%)')">
                <span>🍽️</span> Meals & Entertainment (95%)
            </div>
            <div class="smart-menu-header" style="border-top: 1px solid #e2e8f0; margin-top: 4px;">Standard Accounts</div>
            <div class="smart-menu-item" onclick="selectAccount(${realIndex}, 'Office Supplies')">
                <span>📦</span> Office Supplies
            </div>
            <div class="smart-menu-item" onclick="selectAccount(${realIndex}, 'Travel')">
                <span>✈️</span> Travel
            </div>
        </div>
    `;

    return `
      <tr>
        <td class="w-check"><input type="checkbox"></td>
        <td class="w-ref">${txn.refNumber}</td>
        <td class="w-date">${txn.date}</td>
        <td class="w-payee" contenteditable="true" onblur="updatePayee(${realIndex}, this.innerText)">${txn.description}</td>
        <td class="w-icon clickable">📎</td>
        <td class="w-icon clickable icon-split">⑃</td>
        <td class="w-reconcile">
            <span class="reconcile-dot ${txn.reconciled ? 'checked' : ''}" onclick="toggleReconcile(${realIndex})"></span>
        </td>
        <td class="w-account">
            <div class="smart-dropdown-wrapper">
                <div class="smart-pill ${txn.accountDescription === 'Meals & Entertainment (95%)' ? 'smart-pill-highlight' : ''}" onclick="toggleDropdown(${realIndex})">
                    ${accountLabel} ▾
                </div>
                ${dropdownHtml}
            </div>
        </td>
        <td class="w-amount">${debit > 0 ? '$' + debit.toFixed(2) : ''}</td>
        <td class="w-amount text-green">${credit > 0 ? '$' + credit.toFixed(2) : ''}</td>
        <td class="w-amount" style="font-weight: 600;">$${runningBalance.toFixed(2)}</td>
      </tr>
    `;
  }).join('');
}

// --- INTERACTIVITY ---

window.toggleDropdown = function (index) {
  document.querySelectorAll('.smart-menu').forEach(el => el.style.display = 'none');
  const menu = document.getElementById(`dropdown-${index}`);
  if (menu) {
    menu.style.display = 'block';
    setTimeout(() => {
      document.addEventListener('click', function close(e) {
        if (!e.target.closest('.smart-dropdown-wrapper')) {
          menu.style.display = 'none';
          document.removeEventListener('click', close);
        }
      });
    }, 0);
  }
};

window.selectAccount = function (index, accountName) {
  if (window.transactionData[index]) {
    window.transactionData[index].accountDescription = accountName;
    reRenderTable();
  }
  saveTransactions();
};

window.toggleReconcile = function (index) {
  if (window.transactionData[index]) {
    window.transactionData[index].reconciled = !window.transactionData[index].reconciled;
    reRenderTable();
  }
  saveTransactions();
};

window.updatePayee = function (index, newVal) {
  if (window.transactionData[index]) {
    window.transactionData[index].description = newVal;
    saveTransactions();
  }
}

window.addNewTransaction = function () {
  // Use current Ref Prefix
  const prefix = window.transactionState.refPrefix.replace(/[\[\]]/g, '') || 'REF';
  const randomId = Math.floor(Math.random() * 1000).toString().padStart(3, '0');

  window.transactionData.unshift({
    refNumber: `${prefix}-${randomId}`,
    date: new Date().toISOString().split('T')[0],
    description: 'New Transaction',
    debit: 0,
    credit: 0,
    accountDescription: ''
  });
  reRenderTable();
  saveTransactions();
};

window.analyzeVendors = function () {
  // Navigate to reports
  window.location.hash = '#/reports/vendor-analysis';
};

// --- CSV LOGIC (Restored) ---

window.showCSVImport = () => document.getElementById('csv-dropzone').style.display = 'flex';
window.hideCSVImport = () => document.getElementById('csv-dropzone').style.display = 'none';

window.handleFileSelect = function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (event) {
    const csv = event.target.result;
    parseAndImportCSV(csv);
    window.hideCSVImport();
  };
  reader.readAsText(file);
};

function parseAndImportCSV(csvText) {
  const lines = csvText.split('\n').map(l => l.trim()).filter(l => l);
  // Simple parser: assumes header row, comma separated
  // Expected format: Ref,Date,Payee,Debit,Credit

  // Skip header if it contains 'date' or 'ref'
  let startIndex = 0;
  if (lines[0].toLowerCase().includes('date')) startIndex = 1;

  const newTxns = [];
  for (let i = startIndex; i < lines.length; i++) {
    const cols = lines[i].split(','); // Very basic split, might break on quoted commas
    if (cols.length < 3) continue;

    newTxns.push({
      refNumber: cols[0] || `IMP-${Math.floor(Math.random() * 1000)}`,
      date: cols[1] || new Date().toISOString().split('T')[0],
      description: cols[2] || 'Imported Entry',
      debit: parseFloat(cols[3]) || 0,
      credit: parseFloat(cols[4]) || 0,
      accountDescription: '',
      reconciled: false
    });
  }

  if (newTxns.length > 0) {
    window.transactionData = [...newTxns, ...window.transactionData];
    alert(`Successfully imported ${newTxns.length} transactions.`);
    reRenderTable(); // Update grid immediately
    saveTransactions();

    // Refresh entire app to update stats header
    const app = document.getElementById('app');
    if (app) app.innerHTML = window.renderTransactions();
  } else {
    alert('No valid transactions found in CSV.');
  }
}

// --- PERSISTENCE ---

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(window.transactionData));
  if (window.storage && window.storage.saveTransactions) {
    window.storage.saveTransactions(window.transactionData);
  }
}
