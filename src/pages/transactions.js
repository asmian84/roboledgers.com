/**
 * Transactions Page - Modern Feed UI (Stripe/Apple Card style)
 */

window.renderTransactions = function () {
  return `
    <div class="transactions-page">
      <!-- Toolbar -->
      <div class="toolbar">
        <div class="toolbar-left">
          <button class="btn-primary" onclick="showCSVImport()">
            📥 Import CSV
          </button>
          <button class="btn-primary" onclick="addNewTransaction()">
            ➕ Add Transaction
          </button>
        </div>
        
        <div class="toolbar-right">
          <input 
            type="search" 
            id="search-input" 
            class="search-input" 
            placeholder="Search transactions..." 
            oninput="filterTransactionFeed(this.value)"
          >
          <button class="btn-secondary" onclick="exportToCSV()">📄 Export CSV</button>
        </div>
      </div>

      <!-- CSV Import Dropzone (hidden by default) -->
      <div id="csv-dropzone" class="csv-dropzone" style="display: none;">
        <div class="dropzone-content">
          <div class="dropzone-icon">📂</div>
          <h3>Drop CSV file here or click to browse</h3>
          <p>Supported format: Ref#, Date, Description, Debit, Credit, Account#</p>
          <input type="file" id="csv-file-input" accept=".csv" style="display: none;" onchange="handleFileSelect(event)">
          <button class="btn-primary" onclick="document.getElementById('csv-file-input').click()">
            Choose File
          </button>
          <button class="btn-secondary" onclick="hideCSVImport()">Cancel</button>
        </div>
      </div>

      <!-- Transaction Feed -->
      <div class="content-area">
        <div id="transactionFeed" class="transaction-feed"></div>
      </div>
    </div>
  `;
};

let transactionData = [];

// Category icons
const categoryIcons = {
  'Office Supplies': '📦',
  'Utilities': '💡',
  'Rent': '🏠',
  'Travel': '✈️',
  'Meals': '🍽️',
  'Insurance': '🛡️',
  'Marketing': '📢',
  'Professional': '💼',
  'Software': '💻',
  'Banking': '🏦',
  'default': '💰'
};

function getCategoryIcon(description, accountDesc) {
  const text = (description + ' ' + (accountDesc || '')).toLowerCase();

  if (text.includes('office') || text.includes('supplies') || text.includes('staples') || text.includes('depot')) return '📦';
  if (text.includes('electric') || text.includes('water') || text.includes('utility')) return '💡';
  if (text.includes('rent') || text.includes('property')) return '🏠';
  if (text.includes('airline') || text.includes('hotel') || text.includes('travel') || text.includes('hertz')) return '✈️';
  if (text.includes('restaurant') || text.includes('starbucks') || text.includes('grille') || text.includes('meal')) return '🍽️';
  if (text.includes('insurance')) return '🛡️';
  if (text.includes('ads') || text.includes('marketing')) return '📢';
  if (text.includes('legal') || text.includes('cpa') || text.includes('professional')) return '💼';
  if (text.includes('microsoft') || text.includes('adobe') || text.includes('software') || text.includes('salesforce')) return '💻';
  if (text.includes('bank') || text.includes('wells fargo')) return '🏦';
  if (text.includes('verizon') || text.includes('phone') || text.includes('internet')) return '📱';

  return '💰';
}

function formatDateHeader(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const yesterdayOnly = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());

  if (dateOnly.getTime() === todayOnly.getTime()) {
    return 'Today';
  } else if (dateOnly.getTime() === yesterdayOnly.getTime()) {
    return 'Yesterday';
  } else {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function groupTransactionsByDate(transactions) {
  const grouped = {};

  transactions.forEach(txn => {
    const date = txn.date || 'Unknown';
    if (!grouped[date]) {
      grouped[date] = [];
    }
    grouped[date].push(txn);
  });

  // Sort dates descending
  const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));

  return sortedDates.map(date => ({
    date,
    dateHeader: formatDateHeader(date),
    transactions: grouped[date]
  }));
}

function renderTransactionFeed() {
  const feedContainer = document.getElementById('transactionFeed');
  if (!feedContainer) return;

  if (transactionData.length === 0) {
    feedContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📊</div>
        <h3>No transactions yet</h3>
        <p>Import a CSV file or add transactions manually to get started</p>
      </div>
    `;
    return;
  }

  const groupedData = groupTransactionsByDate(transactionData);

  let html = '';
  groupedData.forEach(group => {
    html += `
      <div class="date-group">
        <div class="date-header">${group.dateHeader}</div>
        <div class="transaction-list">
    `;

    group.transactions.forEach((txn, index) => {
      const amount = parseFloat(txn.debit || 0) || parseFloat(txn.credit || 0) || 0;
      const isExpense = parseFloat(txn.debit || 0) > 0;
      const amountClass = isExpense ? 'amount-expense' : 'amount-income';
      const icon = getCategoryIcon(txn.description, txn.accountDescription);

      html += `
        <div class="transaction-item" data-index="${transactionData.indexOf(txn)}">
          <div class="transaction-icon">${icon}</div>
          <div class="transaction-details">
            <div class="transaction-description">${txn.description || 'No description'}</div>
            <div class="transaction-meta">${txn.accountDescription || txn.accountNumber || 'Uncategorized'}</div>
          </div>
          <div class="transaction-amount ${amountClass}">
            ${isExpense ? '-' : '+'}$${amount.toFixed(2)}
          </div>
          <div class="transaction-actions">
            <button class="btn-icon-tiny" onclick="editTransaction(${transactionData.indexOf(txn)})" title="Edit">✏️</button>
            <button class="btn-icon-tiny" onclick="deleteTransaction(${transactionData.indexOf(txn)})" title="Delete">🗑️</button>
          </div>
        </div>
      `;
    });

    html += `
        </div>
      </div>
    `;
  });

  feedContainer.innerHTML = html;
}

// Watch for feed container
const observer = new MutationObserver(() => {
  const feedDiv = document.getElementById('transactionFeed');
  if (feedDiv) {
    console.log('📍 Transaction feed container detected, rendering...');
    renderTransactionFeed();
    setupDragAndDrop();
    observer.disconnect();
  }
});

if (document.body) {
  observer.observe(document.body, { childList: true, subtree: true });
}

function setupDragAndDrop() {
  const dropzone = document.getElementById('csv-dropzone');
  if (!dropzone) return;

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].name.endsWith('.csv')) {
      handleFile(files[0]);
    } else {
      alert('Please drop a CSV file');
    }
  });
}

function showCSVImport() {
  const dropzone = document.getElementById('csv-dropzone');
  if (dropzone) {
    dropzone.style.display = 'flex';
  }
}

function hideCSVImport() {
  const dropzone = document.getElementById('csv-dropzone');
  if (dropzone) {
    dropzone.style.display = 'none';
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    handleFile(file);
  }
}

function handleFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const csv = e.target.result;
    parseCSV(csv);
    hideCSVImport();
  };

  reader.readAsText(file);
}

function parseCSV(csv) {
  const lines = csv.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());

  console.log('CSV Headers:', headers);

  const newTransactions = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());

    if (values.length >= 3) {
      const transaction = {
        refNumber: values[0] || `REF${Date.now()}-${i}`,
        date: values[1] || new Date().toISOString().split('T')[0],
        description: values[2] || '',
        debit: parseFloat(values[3]) || 0,
        credit: parseFloat(values[4]) || 0,
        accountNumber: values[5] || '',
        accountDescription: values[6] || ''
      };

      newTransactions.push(transaction);
    }
  }

  transactionData = [...transactionData, ...newTransactions];
  renderTransactionFeed();
  saveTransactions();

  console.log(`✅ Imported ${newTransactions.length} transactions`);
  alert(`Successfully imported ${newTransactions.length} transactions`);
}

function addNewTransaction() {
  const newTxn = {
    refNumber: `REF${Date.now()}`,
    date: new Date().toISOString().split('T')[0],
    description: prompt('Enter description:') || 'New Transaction',
    debit: parseFloat(prompt('Enter debit amount (0 for credit):') || 0),
    credit: parseFloat(prompt('Enter credit amount (0 for debit):') || 0),
    accountNumber: '',
    accountDescription: ''
  };

  transactionData.unshift(newTxn);
  renderTransactionFeed();
  saveTransactions();
}

function editTransaction(index) {
  const txn = transactionData[index];
  if (!txn) return;

  const newDesc = prompt('Edit description:', txn.description);
  if (newDesc !== null) {
    txn.description = newDesc;
    renderTransactionFeed();
    saveTransactions();
  }
}

function deleteTransaction(index) {
  if (!confirm('Delete this transaction?')) return;

  transactionData.splice(index, 1);
  renderTransactionFeed();
  saveTransactions();
}

function filterTransactionFeed(searchText) {
  const items = document.querySelectorAll('.transaction-item');
  const search = searchText.toLowerCase();

  items.forEach(item => {
    const text = item.textContent.toLowerCase();
    if (text.includes(search)) {
      item.style.display = 'flex';
    } else {
      item.style.display = 'none';
    }
  });
}

function exportToCSV() {
  if (transactionData.length === 0) {
    alert('No transactions to export');
    return;
  }

  const headers = ['Ref#', 'Date', 'Description', 'Debit', 'Credit', 'Account#', 'Account Description'];
  const rows = transactionData.map(txn => [
    txn.refNumber,
    txn.date,
    txn.description,
    txn.debit,
    txn.credit,
    txn.accountNumber,
    txn.accountDescription
  ]);

  const csv = [headers, ...rows].map(row => row.join(',')).join('\n');

  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'transactions.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function saveTransactions() {
  localStorage.setItem('transactions', JSON.stringify(transactionData));
}

function loadSavedTransactions() {
  const saved = localStorage.getItem('transactions');
  if (saved) {
    transactionData = JSON.parse(saved);
    renderTransactionFeed();
    console.log(`📂 Loaded ${transactionData.length} transactions from localStorage`);
  }
}

// Load on startup
loadSavedTransactions();
