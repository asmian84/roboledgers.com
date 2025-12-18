/**
 * Transactions Page - Modern Feed UI (Stripe/Apple Card style)
 * WRAPPED IN IIFE TO AVOID GLOBAL parseCSV CONFLICTS
 */

(function () {
  'use strict';

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
          <div class="transaction-count" id="transaction-count-display" style="margin-right: 15px; font-weight: bold; color: #666;">
            0 Items
          </div>
          <button class="btn-secondary" onclick="clearAllTransactions()" style="margin-right: 10px; color: #e74c3c; border-color: #e74c3c;">
            🗑️ Clear Data
          </button>
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

    // Sort dates descending - KEEP for internal sorting if needed, but we will sort flat list now
    // const sortedDates = Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a));
    // console.log(`📊 Grouped into ${sortedDates.length} date groups`);

    // Flatten and sort all transactions by date descending
    return transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
  }

  function renderTransactionFeed() {
    const feedContainer = document.getElementById('transactionFeed');
    if (!feedContainer) return;

    // Update count display
    const countDisplay = document.getElementById('transaction-count-display');
    if (countDisplay) {
      countDisplay.textContent = `${transactionData.length} Items`;
    }

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

    // Sort transactions by date descending
    const sortedTransactions = [...transactionData].sort((a, b) => new Date(b.date) - new Date(a.date));
    console.log(`🎨 Rendering ${sortedTransactions.length} transactions as table`);

    let html = `
      <table class="transaction-table" style="width: 100%; border-collapse: collapse; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 8px; overflow: hidden;">
        <thead style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
          <tr>
            <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569;">Date</th>
            <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569;">Payee / Description</th>
            <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #475569;">Account / Memo</th>
            <th style="padding: 12px 16px; text-align: right; font-weight: 600; color: #475569;">Amount</th>
            <th style="padding: 12px 16px; text-align: center; font-weight: 600; color: #475569;">Actions</th>
          </tr>
        </thead>
        <tbody>
    `;

    sortedTransactions.forEach((txn, index) => {
      const amount = parseFloat(txn.debit || 0) || parseFloat(txn.credit || 0) || 0;
      const isExpense = parseFloat(txn.debit || 0) > 0;
      const amountClass = isExpense ? 'text-red-600' : 'text-green-600';
      const amountStyle = isExpense ? 'color: #dc2626;' : 'color: #16a34a;';
      const dateStr = formatDateHeader(new Date(txn.date || Date.now()));

      html += `
        <tr style="border-bottom: 1px solid #e2e8f0; transition: background 0.1s;" onmouseover="this.style.backgroundColor='#f8fafc'" onmouseout="this.style.backgroundColor='transparent'">
          <td style="padding: 12px 16px; white-space: nowrap; color: #64748b;">${dateStr}</td>
          <td style="padding: 12px 16px; font-weight: 500; color: #1e293b;">${txn.description || 'No description'}</td>
          <td style="padding: 12px 16px; color: #64748b; font-size: 0.9em;">
            ${txn.accountDescription || txn.accountNumber || '<span style="color: #94a3b8; font-style: italic;">Uncategorized</span>'}
          </td>
          <td style="padding: 12px 16px; text-align: right; font-weight: 600; ${amountStyle}">
            ${isExpense ? '-' : '+'}$${amount.toFixed(2)}
          </td>
          <td style="padding: 12px 16px; text-align: center;">
            <button class="btn-icon-tiny" onclick="editTransaction(${transactionData.indexOf(txn)})" title="Edit" style="background:none; border:none; cursor:pointer; font-size: 1.1em;">✏️</button>
            <button class="btn-icon-tiny" onclick="deleteTransaction(${transactionData.indexOf(txn)})" title="Delete" style="background:none; border:none; cursor:pointer; font-size: 1.1em; color: #ef4444;">🗑️</button>
          </td>
        </tr>
      `;
    });

    html += `
        </tbody>
      </table>
    `;

    feedContainer.innerHTML = html;
  }

  // Watch for feed container
  const observer = new MutationObserver(() => {
    const feedDiv = document.getElementById('transactionFeed');
    if (feedDiv) {
      console.log('📍 Transaction feed container detected, loading data...');
      loadSavedTransactions();
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
    // Prompt for account type
    const accountType = confirm('Is this a Credit Card account?\n\nClick OK for Credit Card\nClick Cancel for Bank Account');
    localStorage.setItem('lastAccountType', accountType ? 'creditcard' : 'bank');

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
    console.log('🔍 handleFileSelect called, event:', event);
    const file = event.target.files[0];
    console.log('📄 Selected file:', file);
    if (file) {
      handleFile(file);
    }
  }

  function handleFile(file) {
    console.log('🔍 handleFile called with:', file.name, file.size, 'bytes');
    const reader = new FileReader();

    reader.onload = (e) => {
      console.log('📖 FileReader onload triggered, data length:', e.target.result.length);
      try {
        const csv = e.target.result;
        console.log('🔍 About to call parseCSV...');
        parseCSV(csv);
        console.log('✅ parseCSV completed');
        hideCSVImport();
      } catch (error) {
        console.error('❌❌❌ ERROR in onload:', error);
        console.error('Error stack:', error.stack);
        alert('Error parsing CSV: ' + error.message);
      }
    };

    console.log('📖 Starting FileReader.readAsText...');
    reader.readAsText(file);
  }

  // Proper CSV parser that handles quoted fields
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  function parseCSV(csv) {
    console.log('🚀🚀🚀 parseCSV CALLED! CSV length:', csv?.length);
    console.log('🚀🚀🚀 First 100 chars:', csv?.substring(0, 100));

    const lines = csv.split('\n').filter(line => line.trim());
    console.log('📊 Total lines after split:', lines.length);

    if (lines.length === 0) {
      console.error('❌ CSV is empty after filtering');
      alert('CSV file is empty');
      return;
    }

    const headers = parseCSVLine(lines[0]);
    console.log('📋 Headers:', headers);
    console.log('CSV Headers:', headers);
    console.log('First data line:', lines[1]);

    const newTransactions = [];

    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length < 3) continue;

      let transaction;

      if (headers[0].toLowerCase() === 'date' && headers.length >= 4) {
        const dateStr = values[0] || '';
        const payee = values[2] || 'Unknown';
        const amountStr = values[3] || '0';
        const memo = values[4] || '';

        const amount = parseFloat(amountStr.replace(/[^0-9.-]/g, '')) || 0;

        if (!dateStr) continue;

        // Prompt user for account type to determine debit/credit logic
        let accountType = localStorage.getItem('lastAccountType') || 'bank';

        // Convert to our format
        // Account type determines debit/credit logic:
        // BANK: Negative = Credit (IN), Positive = Debit (OUT)
        // CREDIT CARD: Negative = Debit (charges), Positive = Credit (payments)

        let debit, credit;
        if (accountType === 'creditcard') {
          // Credit Card logic
          debit = amount < 0 ? Math.abs(amount) : 0;    // Negative = Debit (charges)
          credit = amount > 0 ? amount : 0;              // Positive = Credit (payments)
        } else {
          // Bank Account logic (default)
          debit = amount > 0 ? amount : 0;               // Positive = Debit (OUT)
          credit = amount < 0 ? Math.abs(amount) : 0;    // Negative = Credit (IN)
        }

        transaction = {
          refNumber: `REF${Date.now()}-${i}`,
          date: parseTransactionDate(dateStr),  // FIXED: was 'date' (undefined)
          description: payee,
          debit: debit,
          credit: credit,
          balance: 0,
          accountNumber: '',
          accountDescription: memo ? memo.substring(0, 80) : '',
          status: 'unmatched'
        };
      } else {
        // Standard format
        transaction = {
          refNumber: values[0] || `REF${Date.now()}-${i}`,
          date: values[1] || new Date().toISOString().split('T')[0],
          description: values[2] || '',
          debit: parseFloat(values[3]) || 0,
          credit: parseFloat(values[4]) || 0,
          accountNumber: values[5] || '',
          accountDescription: values[6] || ''
        };
      }

      newTransactions.push(transaction);
    }

    transactionData = [...transactionData, ...newTransactions];
    renderTransactionFeed();
    saveTransactions();

    console.log(`✅ Imported ${newTransactions.length} transactions`);
    alert(`Successfully imported ${newTransactions.length} transactions`);
  }

  // Helper to parse various date formats
  function parseTransactionDate(dateStr) {
    if (!dateStr) return new Date().toISOString().split('T')[0];

    const cleanDate = dateStr.trim();

    // Try M/D/YYYY or M/D/YY format
    const parts = cleanDate.split('/');
    if (parts.length === 3) {
      const month = parts[0].padStart(2, '0');
      const day = parts[1].padStart(2, '0');
      let year = parts[2];

      // Handle 2-digit year
      if (year.length === 2) {
        year = '20' + year;
      }

      console.log(`🔍 Parsing date: '${dateStr}' -> ${year}-${month}-${day}`);
      return `${year}-${month}-${day}`;
    }

    // Return as-is or current date
    return cleanDate || new Date().toISOString().split('T')[0];
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

    // Also save to central storage if available
    if (window.storage && typeof window.storage.saveTransactions === 'function') {
      window.storage.saveTransactions(transactionData);
    }
  }

  async function loadSavedTransactions() {
    // Try window.storage first (central data system)
    if (window.storage && typeof window.storage.getTransactions === 'function') {
      try {
        const data = await window.storage.getTransactions();
        if (data && data.length > 0) {
          transactionData = data;
          renderTransactionFeed();
          console.log(`📂 Loaded ${transactionData.length} transactions from storage`);
          return;
        }
      } catch (error) {
        console.error('❌ Failed to load from storage:', error);
      }
    }

    // Fallback to localStorage
    const saved = localStorage.getItem('transactions');
    if (saved) {
      transactionData = JSON.parse(saved);
      renderTransactionFeed();
      console.log(`📂 Loaded ${transactionData.length} transactions from localStorage`);
    }
  }


  function clearAllTransactions() {
    if (confirm('Are you sure you want to DELETE ALL transactions? This cannot be undone.')) {
      transactionData = [];
      renderTransactionFeed();
      saveTransactions();
      alert('All transactions deleted.');
    }
  }

  // ===========================================
  // EXPOSE FUNCTIONS TO WINDOW (Global Scope)
  // ===========================================
  window.showCSVImport = showCSVImport;
  window.hideCSVImport = hideCSVImport;
  window.handleFileSelect = handleFileSelect;
  window.addNewTransaction = addNewTransaction;
  window.clearAllTransactions = clearAllTransactions; // Exported
  window.exportToCSV = exportToCSV;
  window.filterTransactionFeed = filterTransactionFeed;
  window.editTransaction = editTransaction;
  window.deleteTransaction = deleteTransaction;


})(); // End IIFE wrapper
