/**
 * Transactions Page - Unified Command Center
 * Strict Layout Compliance Version
 */

if (typeof window.transactionData === 'undefined') {
  window.transactionData = [];
}
if (typeof window.selectedTransactionIds === 'undefined') {
  window.selectedTransactionIds = new Set();
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

// Inject CSS for Transactions Page Improvements
const styleSheet = document.createElement("style");
styleSheet.innerText = `
    .row-selected { background: #f8fafc !important; }
    .w-actions { width: 80px; text-align: center; }
    .btn-icon-xs { border: none; background: #f1f5f9; cursor: pointer; padding: 4px 8px; border-radius: 4px; font-size: 12px; transition: all 0.2s; color: #475569; }
    .btn-icon-xs:hover { background: #e2e8f0; transform: scale(1.1); }
    .btn-icon-xs.text-red { color: #ef4444; }
    .btn-icon-xs.text-red:hover { background: #fee2e2; }
    .uc-table tr.row-selected td { border-bottom: 2px solid #3b82f6; }
`;
document.head.appendChild(styleSheet);

window.renderTransactions = function () {
  const opening = 0.00;
  const totalIn = window.transactionData.reduce((acc, t) => acc + (t.credit || 0), 0);
  const totalOut = window.transactionData.reduce((acc, t) => acc + (t.debit || 0), 0);
  const ending = opening + totalIn - totalOut;

  const fmt = (n) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  return `
    <div class="transaction-page">
      
      <!-- FIXED SECTION: Header & Controls -->
      <div class="std-page-header">
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
               ${window.selectedTransactionIds && window.selectedTransactionIds.size > 0 ? `
                 <button class="uc-btn uc-btn-primary" style="background: #8b5cf6;" onclick="window.bulkCategorizePrompt()">
                   ✨ Bulk Categorize (${window.selectedTransactionIds.size})
                 </button>
                 <button class="uc-btn uc-btn-outline" onclick="window.selectedTransactionIds.clear(); window.renderApp();">
                   ✕ Clear Selection
                 </button>
               ` : ''}
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
              <th class="w-check">
                <input type="checkbox" id="select-all-transactions" onchange="window.toggleAllTransactions(this.checked)">
              </th>
              <th class="w-date">DATE</th>
              <th class="w-payee">PAYEE / DESCRIPTION</th>
              <th class="w-account">ACCOUNT</th>
              <th class="w-amount">DEBIT</th>
              <th class="w-amount">CREDIT</th>
              <th class="w-status">STATUS</th>
              <th class="w-actions">ACTIONS</th>
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

    // Format Date 1:1 with Import Grid (DD/MM/YYYY)
    let displayDate = txn.date;
    try {
      const dObj = new Date(txn.date);
      if (!isNaN(dObj.getTime())) {
        displayDate = dObj.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      }
    } catch (e) { }

    const isSelected = window.selectedTransactionIds.has(txn.id || index.toString());
    const status = (txn.category && txn.category !== 'Uncategorized') || (txn.accountDescription && txn.accountDescription !== 'Uncategorized') ? 'Matched' : 'Unmatched';
    const statusColor = status === 'Matched' ? '#10b981' : '#f59e0b';

    return `
      <tr class="${isSelected ? 'row-selected' : ''}">
        <td class="w-check">
            <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="window.toggleTransactionSelection('${txn.id || index}', this.checked)">
        </td>
        <td class="w-date">${displayDate}</td>
        <td class="w-payee" style="font-weight: 500;">${(txn.description || '').toUpperCase()}</td>
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
        <td class="w-status">
            <span style="font-size: 0.75rem; font-weight: 600; color: ${statusColor}; background: ${statusColor}15; padding: 2px 6px; border-radius: 4px;">
                ${status}
            </span>
        </td>
        <td class="w-actions">
            <div style="display: flex; gap: 8px; justify-content: center;">
                <button class="btn-icon-xs" title="Swap Sign" onclick="window.swapTransactionSign(${index})">⇄</button>
                <button class="btn-icon-xs text-red" title="Delete" onclick="window.deleteLedgerTransaction(${index})">✕</button>
            </div>
        </td>
      </tr>
    `;
  }).join('');
}

// --- BULK SELECTION HANDLERS ---

window.toggleTransactionSelection = function (id, isSelected) {
  if (isSelected) {
    window.selectedTransactionIds.add(id);
  } else {
    window.selectedTransactionIds.delete(id);
  }
  // Re-render only rows would be better but for legacy we re-render app or local
  window.renderApp();
};

window.toggleAllTransactions = function (isSelected) {
  if (isSelected) {
    window.transactionData.forEach((txn, index) => {
      window.selectedTransactionIds.add(txn.id || index.toString());
    });
  } else {
    window.selectedTransactionIds.clear();
  }
  window.renderApp();
};

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

// --- BULK ACTION LOGIC ---

window.bulkCategorizePrompt = async function () {
  if (window.selectedTransactionIds.size === 0) return;

  // Use custom prompt or standard for now
  const category = prompt("Enter category for selected items:");
  if (!category) return;

  let count = 0;
  window.transactionData.forEach((txn, index) => {
    if (window.selectedTransactionIds.has(txn.id || index.toString())) {
      txn.accountDescription = category;
      txn.category = category; // Sync both fields
      count++;
    }
  });

  window.selectedTransactionIds.clear();
  window.renderApp();
  saveTransactions();
  window.showToast(`Updated ${count} transactions to "${category}"`, 'success');
};

window.swapTransactionSign = function (index) {
  const txn = window.transactionData[index];
  if (!txn) return;

  // Simple toggle between debit/credit
  const temp = txn.debit;
  txn.debit = txn.credit;
  txn.credit = temp;

  window.renderApp();
  saveTransactions();
  window.showToast('Sign swapped', 'info');
};

window.deleteLedgerTransaction = async function (index) {
  const txn = window.transactionData[index];
  if (!txn) return;

  if (!confirm(`Are you sure you want to delete "${txn.description}"?`)) return;

  window.transactionData.splice(index, 1);
  window.renderApp();
  saveTransactions();
  window.showToast('Transaction deleted', 'success');
};

// --- AI INTELLIGENCE WIRING ---

window.categorizeLedger = async function () {
  console.log('🔮 Transactions: Starting Ledger Intelligence scan...');
  let updatedCount = 0;

  for (const txn of window.transactionData) {
    // Only categorize if uncategorized or "Uncategorized" label
    if (txn.accountDescription && txn.accountDescription !== 'Uncategorized') continue;

    let match = null;

    // 1. Regex Pattern Match (from data-import style)
    if (window.patternDetector) {
      const detection = window.patternDetector.detect(txn.description);
      if (detection && detection.confidence > 0.6) {
        match = { category: detection.category };
      }
    }

    // 2. Dictionary Match
    if (window.merchantDictionary) {
      const dictMatch = await window.merchantDictionary.matchTransaction(txn.description);
      if (dictMatch) {
        match = { category: dictMatch.merchant?.default_category || dictMatch.suggestedCategory };
      }
    }

    if (match) {
      txn.accountDescription = match.category;
      txn.category = match.category;
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    console.log(`✅ Ledger Intelligence: Matched ${updatedCount} transactions.`);
    window.renderApp();
    saveTransactions();
  }
};

// Start intelligence after a short delay
setTimeout(() => {
  if (window.categorizeLedger) window.categorizeLedger();
}, 1500);

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
