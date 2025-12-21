/**
 * Transactions Page - Unified Command Center
 * Strict Layout Compliance Version
 */

if (typeof window.transactionData === 'undefined') {
  window.transactionData = [];
}

// Ensure at least one dummy data for visualization if empty
if (window.transactionData.length === 0) {
  window.transactionData = [
    {
      refNumber: 'CHQ-001',
      date: '2025-12-20',
      description: 'Corrupt Test',
      debit: 10.00,
      credit: 0,
      accountDescription: '',
      reconciled: false
    },
    {
      refNumber: 'CHQ-002',
      date: '2025-12-21',
      description: 'Starbucks',
      debit: 15.25,
      credit: 0,
      accountDescription: 'Meals & Entertainment (95%)',
      reconciled: false
    },
    {
      refNumber: 'CHQ-004',
      date: '2025-12-23',
      description: 'Client Payment',
      debit: 0,
      credit: 1240.00,
      accountDescription: 'Office Supplies',
      reconciled: false
    }
  ];
}

window.renderTransactions = function () {
  const opening = 0.00;
  const totalIn = window.transactionData.reduce((acc, t) => acc + (t.credit || 0), 0);
  const totalOut = window.transactionData.reduce((acc, t) => acc + (t.debit || 0), 0);
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
              <input type="text" class="input-box input-ref" placeholder="[CHQ]" value="[CHQ]">
              <input type="text" class="input-box input-search" placeholder="Search transactions...">
            </div>
            
            <div class="control-right btn-group">
               <button class="uc-btn uc-btn-outline" onclick="showCSVImport()">
                 📥 Import CSV
               </button>
               <button class="uc-btn uc-btn-primary" onclick="addNewTransaction()">
                 <span>+</span> Add Entry
               </button>
               <button class="uc-btn uc-btn-outline">
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
          <tbody>
            ${renderTableRows()}
          </tbody>
        </table>
      </div>

      <!-- CSV Modal (Hidden) -->
      <div id="csv-dropzone" style="display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 999; align-items: center; justify-content: center;">
         <div style="background: white; padding: 2rem; border-radius: 8px; text-align: center;">
            <h3>Import CSV</h3>
            <p>Drop your file here</p>
            <input type="file" id="csv-file-input" accept=".csv" onchange="handleFileSelect(event)">
            <button class="uc-btn uc-btn-outline" onclick="hideCSVImport()" style="margin-top: 1rem;">Cancel</button>
         </div>
      </div>

    </div>
  `;
};

// --- RENDER ROWS ---

function renderTableRows() {
  let runningBalance = 0;

  return window.transactionData.map((txn, index) => {
    const debit = parseFloat(txn.debit || 0);
    const credit = parseFloat(txn.credit || 0);
    runningBalance += (credit - debit);

    const isUncategorized = !txn.accountDescription;
    const accountLabel = txn.accountDescription || 'Uncategorized';

    // Smart dropdown content (Visual Mockup logic)
    const dropdownHtml = `
        <div class="smart-menu" id="dropdown-${index}" style="display: none;">
            <div class="smart-menu-header">✨ Smart Recommendation</div>
            <div class="smart-menu-item smart-recommendation" onclick="selectAccount(${index}, 'Meals & Entertainment (95%)')">
                <span>🍽️</span> Meals & Entertainment (95%)
            </div>
            <div class="smart-menu-header" style="border-top: 1px solid #e2e8f0; margin-top: 4px;">Standard Accounts</div>
            <div class="smart-menu-item" onclick="selectAccount(${index}, 'Office Supplies')">
                <span>📦</span> Office Supplies
            </div>
            <div class="smart-menu-item" onclick="selectAccount(${index}, 'Travel')">
                <span>✈️</span> Travel
            </div>
        </div>
    `;

    return `
      <tr>
        <td class="w-check"><input type="checkbox"></td>
        <td class="w-ref">${txn.refNumber}</td>
        <td class="w-date">${txn.date}</td>
        <td class="w-payee">${txn.description}</td>
        <td class="w-icon clickable">📎</td>
        <td class="w-icon clickable icon-split">⑃</td>
        <td class="w-reconcile">
            <span class="reconcile-dot ${txn.reconciled ? 'checked' : ''}" onclick="toggleReconcile(${index})"></span>
        </td>
        <td class="w-account">
            <div class="smart-dropdown-wrapper">
                <div class="smart-pill ${txn.accountDescription === 'Meals & Entertainment (95%)' ? 'smart-pill-highlight' : ''}" onclick="toggleDropdown(${index})">
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
  // Close all others first
  document.querySelectorAll('.smart-menu').forEach(el => el.style.display = 'none');

  const menu = document.getElementById(`dropdown-${index}`);
  if (menu) {
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

    // Auto-close on click outside (simple version)
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
    window.renderApp(); // Global re-render
    // Or if in standalone mode: document.getElementById('transactionFeed').innerHTML = renderTransactions();
  }
  saveTransactions();
};

window.toggleReconcile = function (index) {
  if (window.transactionData[index]) {
    window.transactionData[index].reconciled = !window.transactionData[index].reconciled;
    window.renderApp();
  }
  saveTransactions();
};

window.addNewTransaction = function () {
  window.transactionData.unshift({
    refNumber: 'CHQ-' + Math.floor(Math.random() * 1000),
    date: new Date().toISOString().split('T')[0],
    description: 'New Entry',
    debit: 0,
    credit: 0,
    accountDescription: ''
  });
  window.renderApp();
  saveTransactions();
};

// --- DATA PERSISTENCE ---

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactionData));
  if (window.storage && window.storage.saveTransactions) {
    window.storage.saveTransactions(transactionData);
  }
}

// Minimal CSV Handlers (retained)
window.showCSVImport = () => document.getElementById('csv-dropzone').style.display = 'flex';
window.hideCSVImport = () => document.getElementById('csv-dropzone').style.display = 'none';
window.handleFileSelect = (e) => {
  // Implementation would go here, preserved from previous logic
  window.hideCSVImport();
  alert('Import logic simulated.');
};
