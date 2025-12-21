/**
 * Bank Reconciliation System
 * Three-panel workflow with auto-matching engine
 */

window.renderReconciliation = function () {
  return `
    <div class="reconciliation-page">
      <!-- Account Selector Bar -->
      <div class="recon-header">
        <div class="recon-account-selector">
          <label>Bank Account:</label>
          <select id="recon-account-select" onchange="selectReconciliationAccount()">
            <option value="">Select account...</option>
          </select>
        </div>
        
        <div class="recon-info">
          <div class="recon-info-item">
            <span class="label">Current Balance:</span>
            <span class="value" id="recon-current-balance">$0.00</span>
          </div>
          <div class="recon-info-item">
            <span class="label">Last Reconciled:</span>
            <span class="value" id="recon-last-date">Never</span>
          </div>
        </div>
        
        <div class="recon-actions">
          <button class="btn-secondary" onclick="importBankStatement()">
            📥 Import Bank Statement
          </button>
          <button class="btn-primary" onclick="startNewReconciliation()">
            ➕ New Reconciliation
          </button>
        </div>
      </div>

      <!-- Three-Panel Layout -->
      <div class="recon-panels">
        <!-- Left Panel: Bank Statement -->
        <div class="recon-panel bank-panel">
          <div class="panel-header">
            <h3>Bank Statement</h3>
            <div class="panel-controls">
              <select id="bank-filter" onchange="filterBankTransactions()">
                <option value="all">All</option>
                <option value="unmatched">Unmatched</option>
                <option value="matched">Matched</option>
              </select>
            </div>
          </div>
          
          <div class="panel-body">
            <div id="bank-transactions-list" class="transaction-list">
              <div class="empty-state">
                <p>No bank statement imported</p>
                <button class="btn-secondary" onclick="importBankStatement()">
                  Import Statement
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Middle Panel: Matching Controls -->
        <div class="recon-panel controls-panel">
          <div class="panel-header">
            <h3>Matching</h3>
          </div>
          
          <div class="panel-body">
            <div class="matching-controls">
              <button class="btn-primary" onclick="autoMatchTransactions()">
                🤖 Auto-Match
              </button>
              
              <button class="btn-secondary" id="match-selected-btn" onclick="matchSelected()" disabled>
                🔗 Match Selected
              </button>
              
              <button class="btn-secondary" id="unmatch-btn" onclick="unmatchSelected()" disabled>
                ❌ Unmatch
              </button>
              
              <button class="btn-secondary" onclick="createNewTransaction()">
                ➕ Create Transaction
              </button>
              
              <div class="match-stats" id="match-stats">
                <div class="stat">
                  <span class="label">Total:</span>
                  <span class="value">0</span>
                </div>
                <div class="stat">
                  <span class="label">Matched:</span>
                  <span class="value" id="matched-count">0</span>
                </div>
                <div class="stat">
                  <span class="label">Unmatched:</span>
                  <span class="value" id="unmatched-count">0</span>
                </div>
              </div>
              
              <div class="drag-hint">
                💡 Tip: Select one from each side and click "Match Selected"
              </div>
            </div>
          </div>
        </div>

        <!-- Right Panel: Ledger Transactions -->
        <div class="recon-panel ledger-panel">
          <div class="panel-header">
            <h3>Your Records</h3>
            <div class="panel-controls">
              <select id="ledger-filter" onchange="filterLedgerTransactions()">
                <option value="unreconciled">Unreconciled</option>
                <option value="all">All</option>
                <option value="matched">Matched</option>
              </select>
            </div>
          </div>
          
          <div class="panel-body">
            <div id="ledger-transactions-list" class="transaction-list">
              <p class="empty-state">Select an account to view transactions</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Reconciliation Summary -->
      <div class="recon-summary" id="recon-summary" style="display: none;">
        <h3>Reconciliation Summary</h3>
        
        <div class="summary-grid">
          <div class="summary-section">
            <div class="summary-line">
              <span>Opening Balance:</span>
              <span id="opening-balance">$0.00</span>
            </div>
            <div class="summary-line highlight">
              <span>+ Cleared Deposits:</span>
              <span id="cleared-deposits">$0.00</span>
            </div>
            <div class="summary-line highlight">
              <span>- Cleared Payments:</span>
              <span id="cleared-payments">$0.00</span>
            </div>
            <div class="summary-line total">
              <span><strong>= Calculated Ending:</strong></span>
              <span id="calculated-ending"><strong>$0.00</strong></span>
            </div>
          </div>
          
          <div class="summary-section">
            <div class="summary-line">
              <span>Bank Statement Ending:</span>
              <span id="bank-ending">$0.00</span>
            </div>
            <div class="summary-line difference">
              <span><strong>Difference:</strong></span>
              <span id="difference"><strong>$0.00</strong></span>
            </div>
          </div>
        </div>
        
        <div class="summary-actions">
          <button class="btn-primary" id="complete-recon-btn" onclick="completeReconciliation()" disabled>
            ✅ Complete Reconciliation
          </button>
          <button class="btn-secondary" onclick="cancelReconciliation()">
            Cancel
          </button>
        </div>
      </div>
    </div>
    
    <!-- Import Modal -->
    <div id="import-modal" class="modal" style="display: none;">
      <div class="modal-content import-modal-content">
        <div class="modal-header">
          <h2>Import Bank Statement</h2>
          <button class="modal-close" onclick="closeImportModal()">×</button>
        </div>
        
        <div class="modal-body">
          <div id="import-step-1" class="import-step">
            <h3>Step 1: Upload File</h3>
            <div class="file-upload-zone">
              <input type="file" id="statement-file" accept=".csv,.qfx,.ofx" onchange="handleFileUpload(event)">
              <label for="statement-file">
                <span class="upload-icon">📄</span>
                <p>Click to upload or drag & drop</p>
                <p class="hint">Supports CSV, QFX, OFX files</p>
              </label>
            </div>
          </div>
          
          <div id="import-step-2" class="import-step" style="display: none;">
            <h3>Step 2: Map Columns</h3>
            <p>Match CSV columns to transaction fields:</p>
            
            <div class="column-mapping">
              <div class="mapping-row">
                <label>Date Column:</label>
                <select id="map-date"></select>
              </div>
              <div class="mapping-row">
                <label>Description:</label>
                <select id="map-description"></select>
              </div>
              <div class="mapping-row">
                <label>Amount:</label>
                <select id="map-amount"></select>
              </div>
              <div class="mapping-row">
                <label>Type (optional):</label>
                <select id="map-type">
                  <option value="">Auto-detect from amount</option>
                </select>
              </div>
            </div>
            
            <div class="preview-section">
              <h4>Preview (first 5 rows):</h4>
              <div id="import-preview" class="import-preview"></div>
            </div>
            
            <div class="import-actions">
              <button class="btn-secondary" onclick="showImportStep(1)">← Back</button>
              <button class="btn-primary" onclick="importTransactions()">Import Transactions</button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <script>
      if (typeof initReconciliationPage === 'function') {
        setTimeout(initReconciliationPage, 100);
      }
    </script>
  `;
};

// ==================================================
// RECONCILIATION STATE
// ==================================================

let currentReconAccount = null;
let bankTransactions = [];
let ledgerTransactions = [];
let matches = [];
let selectedBank = null;
let selectedLedger = null;
let importedCSVData = null;
let columnHeaders = [];

// ==================================================
// INITIALIZATION
// ==================================================

async function initReconciliationPage() {
  console.log('🚀 Initializing Bank Reconciliation...');

  try {
    // Load bank accounts
    const accounts = await window.storage.getAccounts();
    const bankAccounts = accounts.filter(a => a.type === 'Asset');

    const select = document.getElementById('recon-account-select');
    bankAccounts.forEach(a => {
      const option = document.createElement('option');
      option.value = a.id;
      option.textContent = `${a.accountNumber} - ${a.name}`;
      select.appendChild(option);
    });

  } catch (error) {
    console.error('Failed to initialize reconciliation:', error);
  }
}

async function selectReconciliationAccount() {
  const accountId = document.getElementById('recon-account-select').value;
  if (!accountId) return;

  try {
    currentReconAccount = await window.storage.getAccount(accountId);

    // Update header info
    document.getElementById('recon-current-balance').textContent =
      window.DataUtils.formatCurrency(currentReconAccount.currentBalance || 0);

    // Load ledger transactions for this account
    ledgerTransactions = await window.storage.getTransactions({ accountId });

    renderLedgerTransactions();

    // Show summary
    document.getElementById('recon-summary').style.display = 'block';
    updateReconciliationSummary();

  } catch (error) {
    console.error('Failed to select account:', error);
  }
}

// ==================================================
// IMPORT BANK STATEMENT
// ==================================================

function importBankStatement() {
  document.getElementById('import-modal').style.display = 'flex';
  showImportStep(1);
}

function closeImportModal() {
  document.getElementById('import-modal').style.display = 'none';
  document.getElementById('statement-file').value = '';
  importedCSVData = null;
}

function showImportStep(step) {
  document.getElementById('import-step-1').style.display = step === 1 ? 'block' : 'none';
  document.getElementById('import-step-2').style.display = step === 2 ? 'block' : 'none';
}

function handleFileUpload(event) {
  if (!event || !event.target || !event.target.files) return;
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const csv = e.target.result;
    parseCSV(csv);
  };
  reader.readAsText(file);
}

function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  columnHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));

  importedCSVData = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const row = {};
    columnHeaders.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });

  console.log('Parsed CSV:', importedCSVData.length, 'rows');

  // Populate column mapping dropdowns
  const selects = ['map-date', 'map-description', 'map-amount', 'map-type'];
  selects.forEach(id => {
    const select = document.getElementById(id);
    select.innerHTML = '<option value="">-- Select Column --</option>';
    columnHeaders.forEach(header => {
      const option = document.createElement('option');
      option.value = header;
      option.textContent = header;
      select.appendChild(option);
    });

    // Auto-detect common column names
    if (id === 'map-date') {
      const dateCol = columnHeaders.find(h => /date/i.test(h));
      if (dateCol) select.value = dateCol;
    } else if (id === 'map-description') {
      const descCol = columnHeaders.find(h => /desc|name|memo/i.test(h));
      if (descCol) select.value = descCol;
    } else if (id === 'map-amount') {
      const amtCol = columnHeaders.find(h => /amount|value/i.test(h));
      if (amtCol) select.value = amtCol;
    }
  });

  // Show preview
  showImportPreview();

  // Go to step 2
  showImportStep(2);
}

function showImportPreview() {
  const preview = document.getElementById('import-preview');
  const rows = importedCSVData.slice(0, 5);

  const dateCol = document.getElementById('map-date').value;
  const descCol = document.getElementById('map-description').value;
  const amtCol = document.getElementById('map-amount').value;

  let html = '<table class="preview-table"><thead><tr>';
  html += '<th>Date</th><th>Description</th><th>Amount</th>';
  html += '</tr></thead><tbody>';

  rows.forEach(row => {
    html += '<tr>';
    html += `<td>${row[dateCol] || '-'}</td>`;
    html += `<td>${row[descCol] || '-'}</td>`;
    html += `<td>${row[amtCol] || '-'}</td>`;
    html += '</tr>';
  });

  html += '</tbody></table>';
  preview.innerHTML = html;
}

function importTransactions() {
  const dateCol = document.getElementById('map-date').value;
  const descCol = document.getElementById('map-description').value;
  const amtCol = document.getElementById('map-amount').value;

  if (!dateCol || !descCol || !amtCol) {
    alert('Please map all required columns');
    return;
  }

  // Convert to bank transactions
  bankTransactions = importedCSVData.map((row, i) => {
    const amount = parseFloat(row[amtCol].replace(/[^0-9.-]/g, ''));
    return {
      id: `bank-${i}`,
      date: row[dateCol],
      description: row[descCol],
      amount: amount,
      type: amount >= 0 ? 'credit' : 'debit',
      matched: false,
      matchId: null
    };
  });

  console.log('Imported', bankTransactions.length, 'bank transactions');

  renderBankTransactions();
  closeImportModal();

  // Auto-match
  setTimeout(autoMatchTransactions, 500);
}

// ==================================================
// RENDER TRANSACTIONS
// ==================================================

function renderBankTransactions() {
  const container = document.getElementById('bank-transactions-list');

  if (bankTransactions.length === 0) {
    container.innerHTML = '<p class="empty-state">No bank transactions</p>';
    return;
  }

  const filter = document.getElementById('bank-filter')?.value || 'all';
  let filtered = bankTransactions;

  if (filter === 'unmatched') {
    filtered = bankTransactions.filter(t => !t.matched);
  } else if (filter === 'matched') {
    filtered = bankTransactions.filter(t => t.matched);
  }

  container.innerHTML = filtered.map(t => `
    <div class="txn-item ${t.matched ? 'matched' : ''} ${selectedBank === t.id ? 'selected' : ''}" 
         onclick="selectBankTransaction('${t.id}')">
      <div class="txn-date">${t.date}</div>
      <div class="txn-desc">${t.description}</div>
      <div class="txn-amount ${t.amount >= 0 ? 'credit' : 'debit'}">
        ${window.DataUtils.formatCurrency(Math.abs(t.amount))}
      </div>
      ${t.matched ? '<div class="match-indicator">✓</div>' : ''}
    </div>
  `).join('');

  updateMatchStats();
}

function renderLedgerTransactions() {
  const container = document.getElementById('ledger-transactions-list');

  if (ledgerTransactions.length === 0) {
    container.innerHTML = '<p class="empty-state">No transactions for this account</p>';
    return;
  }

  const filter = document.getElementById('ledger-filter')?.value || 'unreconciled';
  let filtered = ledgerTransactions;

  if (filter === 'unreconciled') {
    filtered = ledgerTransactions.filter(t => !t.reconciled);
  } else if (filter === 'matched') {
    const matchedIds = matches.map(m => m.ledger.id);
    filtered = ledgerTransactions.filter(t => matchedIds.includes(t.id));
  }

  container.innerHTML = filtered.map(t => `
    <div class="txn-item ${t.reconciled ? 'reconciled' : ''} ${selectedLedger === t.id ? 'selected' : ''}" 
         onclick="selectLedgerTransaction('${t.id}')">
      <div class="txn-date">${new Date(t.date).toLocaleDateString()}</div>
      <div class="txn-desc">${t.description}</div>
      <div class="txn-amount ${t.type === 'credit' ? 'credit' : 'debit'}">
        ${window.DataUtils.formatCurrency(t.amount)}
      </div>
      ${t.reconciled ? '<div class="match-indicator">✓</div>' : ''}
    </div>
  `).join('');
}

// ==================================================
// SELECTION HANDLING
// ==================================================

function selectBankTransaction(id) {
  selectedBank = selectedBank === id ? null : id;
  renderBankTransactions();
  updateMatchButton();
}

function selectLedgerTransaction(id) {
  selectedLedger = selectedLedger === id ? null : id;
  renderLedgerTransactions();
  updateMatchButton();
}

function updateMatchButton() {
  const btn = document.getElementById('match-selected-btn');
  btn.disabled = !(selectedBank && selectedLedger);
}

// ==================================================
// AUTO-MATCHING ENGINE
// ==================================================

function autoMatchTransactions() {
  if (bankTransactions.length === 0 || ledgerTransactions.length === 0) {
    alert('Please import bank statement and select an account first');
    return;
  }

  console.log('🤖 Running auto-match engine...');

  let matchCount = 0;

  bankTransactions.forEach(bankTxn => {
    if (bankTxn.matched) return;

    // Find candidates within 3 days and exact amount match
    const candidates = ledgerTransactions.filter(ledger =>
      !ledger.reconciled &&
      Math.abs(bankTxn.amount - (ledger.type === 'credit' ? ledger.amount : -ledger.amount)) < 0.01 &&
      Math.abs(dateDiff(bankTxn.date, ledger.date)) <= 3
    );

    if (candidates.length === 1) {
      // Perfect match - only one candidate
      createMatch(bankTxn, candidates[0], 100);
      matchCount++;
    } else if (candidates.length > 1) {
      // Multiple matches - use fuzzy description matching
      const best = candidates.reduce((prev, curr) => {
        const prevScore = stringSimilarity(bankTxn.description, prev.description);
        const currScore = stringSimilarity(bankTxn.description, curr.description);
        return currScore > prevScore ? curr : prev;
      });

      const confidence = stringSimilarity(bankTxn.description, best.description) * 100;

      if (confidence > 60) {
        createMatch(bankTxn, best, confidence);
        matchCount++;
      }
    }
  });

  renderBankTransactions();
  renderLedgerTransactions();
  updateReconciliationSummary();

  alert(`Auto-matched ${matchCount} transactions!`);
}

function createMatch(bankTxn, ledgerTxn, confidence) {
  const matchId = `match-${Date.now()}-${Math.random()}`;

  bankTxn.matched = true;
  bankTxn.matchId = matchId;

  ledgerTxn.reconciled = true;
  ledgerTxn.matchId = matchId;

  matches.push({
    id: matchId,
    bank: bankTxn,
    ledger: ledgerTxn,
    confidence: confidence
  });
}

// ==================================================
// MANUAL MATCHING
// ==================================================

function matchSelected() {
  if (!selectedBank || !selectedLedger) return;

  const bankTxn = bankTransactions.find(t => t.id === selectedBank);
  const ledgerTxn = ledgerTransactions.find(t => t.id === selectedLedger);

  if (!bankTxn || !ledgerTxn) return;

  createMatch(bankTxn, ledgerTxn, 100);

  selectedBank = null;
  selectedLedger = null;

  renderBankTransactions();
  renderLedgerTransactions();
  updateReconciliationSummary();
}

function unmatchSelected() {
  // Implement unmatch logic
  alert('Unmatch feature coming soon!');
}

// ==================================================
// RECONCILIATION SUMMARY
// ==================================================

function updateReconciliationSummary() {
  const matchedLedger = ledgerTransactions.filter(t => t.reconciled);

  const deposits = matchedLedger.filter(t => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);

  const payments = matchedLedger.filter(t => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  const opening = 10000; // TODO: Get from last reconciliation
  const calculated = opening + deposits - payments;

  const bankEnding = bankTransactions.filter(t => t.matched)
    .reduce((sum, t) => sum + t.amount, opening);

  const difference = calculated - bankEnding;

  document.getElementById('opening-balance').textContent = window.DataUtils.formatCurrency(opening);
  document.getElementById('cleared-deposits').textContent = window.DataUtils.formatCurrency(deposits);
  document.getElementById('cleared-payments').textContent = window.DataUtils.formatCurrency(payments);
  document.getElementById('calculated-ending').textContent = window.DataUtils.formatCurrency(calculated);
  document.getElementById('bank-ending').textContent = window.DataUtils.formatCurrency(bankEnding);
  document.getElementById('difference').textContent = window.DataUtils.formatCurrency(Math.abs(difference));

  const diffEl = document.getElementById('difference');
  if (Math.abs(difference) < 0.01) {
    diffEl.style.color = '#10b981';
    diffEl.innerHTML = '<strong>$0.00 ✓</strong>';
    document.getElementById('complete-recon-btn').disabled = false;
  } else {
    diffEl.style.color = '#ef4444';
    document.getElementById('complete-recon-btn').disabled = true;
  }
}

function updateMatchStats() {
  const total = bankTransactions.length;
  const matched = bankTransactions.filter(t => t.matched).length;
  const unmatched = total - matched;

  document.getElementById('matched-count').textContent = matched;
  document.getElementById('unmatched-count').textContent = unmatched;
}

// ==================================================
// UTILITY FUNCTIONS
// ==================================================

function dateDiff(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs(d1 - d2) / (1000 * 60 * 60 * 24);
}

function stringSimilarity(str1, str2) {
  const s1 = str1.toLowerCase();
  const s2 = str2.toLowerCase();

  if (s1 === s2) return 1.0;
  if (s1.length < 2 || s2.length < 2) return 0;

  const pairs1 = wordLetterPairs(s1);
  const pairs2 = wordLetterPairs(s2);

  let intersection = 0;
  for (const pair1 of pairs1) {
    for (let j = 0; j < pairs2.length; j++) {
      if (pair1 === pairs2[j]) {
        intersection++;
        pairs2.splice(j, 1);
        break;
      }
    }
  }

  return (2.0 * intersection) / (pairs1.length + pairs2.length);
}

function wordLetterPairs(str) {
  const pairs = [];
  const words = str.split(/\s+/);

  for (const word of words) {
    for (let i = 0; i < word.length - 1; i++) {
      pairs.push(word.substring(i, i + 2));
    }
  }

  return pairs;
}

function filterBankTransactions() {
  renderBankTransactions();
}

function filterLedgerTransactions() {
  renderLedgerTransactions();
}

function startNewReconciliation() {
  if (!currentReconAccount) {
    alert('Please select an account first');
    return;
  }

  bankTransactions = [];
  matches = [];
  renderBankTransactions();
  updateReconciliationSummary();
}

function createNewTransaction() {
  alert('Create new transaction feature coming soon!');
}

function completeReconciliation() {
  if (!confirm('Complete this reconciliation? This will mark all matched transactions as reconciled.')) {
    return;
  }

  // Mark all matched transactions as reconciled in storage
  matches.forEach(match => {
    window.storage.updateTransaction(match.ledger.id, { reconciled: true });
  });

  alert('✅ Reconciliation completed successfully!');

  // Reset
  bankTransactions = [];
  matches = [];
  renderBankTransactions();
  renderLedgerTransactions();
}

function cancelReconciliation() {
  if (!confirm('Cancel this reconciliation? All matches will be lost.')) {
    return;
  }

  bankTransactions = [];
  matches = [];
  renderBankTransactions();
  renderLedgerTransactions();
}
