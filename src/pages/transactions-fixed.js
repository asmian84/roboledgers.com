/**
 * Transactions Page - Modern Feed UI (Stripe/Apple Card style)
 * WRAPPED IN IIFE TO AVOID GLOBAL parseCSV CONFLICTS
 */

(function () {
  'use strict';

  window.renderTransactions = function () {
    return `
    <div class="transactions-page">
      <style>
        .transactions-page {
          width: 100% !important;
          max-width: none !important;
        }
        .transactions-page .toolbar,
        .transactions-page .content-area,
        .transactions-page .transaction-feed,
        .transactions-page table {
          width: 100% !important;
          max-width: none !important;
        }
      </style>
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

      <!-- Balance Summary Bar (will be populated dynamically) -->
      <div id="balance-summary-bar" class="balance-summary" style="margin-top: 0; margin-bottom: 15px;">
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
    // Inject Styles for Full Width, Sticky Header, and Inputs
    const style = document.createElement('style');
    style.innerHTML = `
      .transactions-page { 
        width: 100% !important; 
        max-width: none !important; 
        padding: 20px;
        height: 100vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }
      .transactions-page .toolbar { 
        width: 100% !important; 
        max-width: none !important;
        flex-shrink: 0;
        background: white;
        padding-bottom: 10px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }
      .content-area { 
        width: 100% !important; 
        max-width: none !important; 
        overflow: hidden; 
        flex: 1;
        display: flex; 
        flex-direction: column;
        min-height: 0;
      }
      .transaction-feed { 
        flex: 1; 
        overflow-y: auto; 
        overflow-x: hidden;
        padding-bottom: 50px;
        position: relative;
        min-height: 0;
      }
      
      /* Sticky Header Wrapper - Contains balance summary AND table header */
      .sticky-header-wrapper {
        position: sticky;
        top: 0;
        z-index: 40;
        background: white;
        padding-bottom: 0;
      }
      
      .transaction-table { 
        width: 100%; 
        border-collapse: separate; 
        border-spacing: 0;
      }
      .transaction-table thead {
        background: white;
      }
      .transaction-table th { 
        position: sticky;
        top: 0;
        z-index: 10;
        background-color: #f8fafc; 
        border-bottom: 2px solid #e2e8f0; 
        padding: 12px 8px; 
        text-align: left; 
        font-weight: 600; 
        color: #475569; 
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      .transaction-table td { border-bottom: 1px solid #f1f5f9; padding: 4px; vertical-align: middle; }
      .transaction-table tr:hover td { background-color: #f8fafc; }
      
      /* Input Styles */
      .txn-input { 
        width: 100%; 
        padding: 6px 8px; 
        border: 1px solid transparent; 
        border-radius: 4px; 
        font-size: 14px; 
        background: transparent; 
        transition: all 0.2s;
      }
      .txn-input:hover { border-color: #e2e8f0; background: #fff; }
      .txn-input:focus { border-color: #2563eb; background: #fff; outline: none; box-shadow: 0 0 0 2px rgba(37,99,235,0.1); }
      
      .txn-date { width: 110px; }
      .txn-desc { width: 100%; min-width: 200px; }
      .txn-account { width: 100%; min-width: 150px; }
      .txn-amount { width: 100px; text-align: right; }
      .txn-balance { width: 100px; text-align: right; color: #64748b; font-weight: 500; padding-right: 8px; }
      
      .balance-summary { margin-bottom: 15px; display: flex; gap: 20px; align-items: center; background: #fff; padding: 10px 20px; border-radius: 8px; border: 1px solid #e2e8f0; }
      .balance-input { border: 1px solid #cbd5e1; padding: 5px 10px; border-radius: 4px; width: 120px; text-align: right; }
    `;
    document.head.appendChild(style);

    const feedContainer = document.getElementById('transactionFeed');
    if (!feedContainer) return;

    // Accounts Dropdown Options
    let accountOptions = '<option value="" style="color: #94a3b8;">Uncategorized</option>';

    // Use window.DEFAULT_CHART_OF_ACCOUNTS if available (from src/data/account-chart.js)
    // Fallback to storage or empty list
    const accounts = (typeof window.DEFAULT_CHART_OF_ACCOUNTS !== 'undefined')
      ? window.DEFAULT_CHART_OF_ACCOUNTS
      : (window.storage && typeof window.storage.getAccounts === 'function' ? JSON.parse(localStorage.getItem('ab3_accounts') || '[]') : []);

    // If empty, use defaults from accounts.js if accessible, or just manual list
    if (accounts.length > 0) {
      accounts.forEach(acc => {
        // Handle variations in field names (code vs accountNumber, name vs description)
        const code = acc.code || acc.accountNumber;
        const name = acc.name || acc.description;
        if (code && name) {
          accountOptions += `<option value="${code}">${code} - ${name}</option>`;
        }
      });
    }

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

    // Sort Descending for View but Calculate OLD -> NEW
    const sortedTxns = [...transactionData].sort((a, b) => new Date(a.date) - new Date(b.date));

    // Calculate Running Balance
    let runningBalance = parseFloat(localStorage.getItem('openingBalance') || 0);
    let totalDebits = 0;
    let totalCredits = 0;

    // Calculate balances on the sorted (Oldest First) array
    const txnsWithBalance = sortedTxns.map(txn => {
      const debit = parseFloat(txn.debit || 0);
      const credit = parseFloat(txn.credit || 0);
      totalDebits += debit;
      totalCredits += credit;
      runningBalance = runningBalance - debit + credit;
      return { ...txn, runningBalance: runningBalance };
    });

    // Reverse for Display (Newest First)
    const displayTxns = txnsWithBalance.reverse();

    // Opening Balance Input
    const openingBal = localStorage.getItem('openingBalance') || '0';

    // Populate the Balance Summary Bar (in toolbar)
    const balanceSummaryBar = document.getElementById('balance-summary-bar');
    if (balanceSummaryBar) {
      balanceSummaryBar.innerHTML = `
        <label>Opening Balance: <input type="number" class="balance-input" value="${openingBal}" onchange="updateOpeningBalance(this.value)" step="0.01"></label>
        <div style="flex:1"></div>
        <div>Total Debits: <span style="color: #dc2626;">-$${totalDebits.toFixed(2)}</span></div>
        <div>Total Credits: <span style="color: #16a34a;">+$${totalCredits.toFixed(2)}</span></div>
        <div>Ending Balance: <strong>$${runningBalance.toFixed(2)}</strong></div>
      `;
    }

    let html = `
      <div class="sticky-header-wrapper">
        <table class="transaction-table">
          <thead>
            <tr>
              <th style="width: 120px;">Date</th>
              <th>Payee / Description</th>
              <th style="width: 250px;">Account</th>
              <th style="width: 120px; text-align: right;">Debit</th>
              <th style="width: 120px; text-align: right;">Credit</th>
              <th style="width: 120px; text-align: right;">Balance</th>
              <th style="width: 60px; text-align: center;"></th>
            </tr>
          </thead>
      </div>
          <tbody>
    `;

    // PERFORMANCE: Virtual scrolling - only render visible rows
    const rowsPerBatch = 50;
    let renderedCount = 0;

    function renderBatch(startIdx, endIdx) {
      let batchHtml = '';
      for (let i = startIdx; i < Math.min(endIdx, displayTxns.length); i++) {
        const txn = displayTxns[i];
        const originalIndex = transactionData.findIndex(t => t.refNumber === txn.refNumber);
        const dataIndex = originalIndex >= 0 ? originalIndex : i;

        batchHtml += `
          <tr data-index="${i}">
            <td>
              <input type="date" class="txn-input txn-date" value="${txn.date ? txn.date.split('T')[0] : ''}" onchange="updateTransactionField(${dataIndex}, 'date', this.value)">
            </td>
            <td>
              <input type="text" class="txn-input txn-desc" value="${(txn.description || '').replace(/"/g, '&quot;')}" onchange="updateTransactionField(${dataIndex}, 'description', this.value)">
            </td>
            <td>
              <select class="txn-input txn-account" onchange="updateTransactionField(${dataIndex}, 'accountNumber', this.value)">
                  ${accountOptions.replace(`value="${txn.accountNumber}"`, `value="${txn.accountNumber}" selected`)}
              </select>
            </td>
            <td>
               <input type="number" step="0.01" class="txn-input txn-amount" style="color: #dc2626;" value="${(txn.debit || 0).toFixed(2)}" onchange="updateTransactionField(${dataIndex}, 'debit', this.value)">
            </td>
            <td>
               <input type="number" step="0.01" class="txn-input txn-amount" style="color: #16a34a;" value="${(txn.credit || 0).toFixed(2)}" onchange="updateTransactionField(${dataIndex}, 'credit', this.value)">
            </td>
            <td class="txn-balance">
              $${txn.runningBalance.toFixed(2)}
            </td>
            <td style="text-align: center;">
              <button class="btn-icon-tiny delete-btn" data-index="${dataIndex}" onclick="requestDeleteConfirmation(this, ${dataIndex})" title="Delete" style="color: #ef4444; opacity: 0.5;">✕</button>
            </td>
          </tr>
        `;
      }
      return batchHtml;
    }

    // Initial render - first batch only
    html += renderBatch(0, rowsPerBatch);
    renderedCount = Math.min(rowsPerBatch, displayTxns.length);

    // Add loading sentinel
    html += `
      <tr id="load-more-sentinel" style="height: 1px;">
        <td colspan="7"></td>
      </tr>
    </tbody></table>`;

    feedContainer.innerHTML = html;

    // Setup IntersectionObserver for infinite scroll
    const sentinel = document.getElementById('load-more-sentinel');
    if (sentinel && renderedCount < displayTxns.length) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && renderedCount < displayTxns.length) {
          const tbody = sentinel.parentElement;
          const nextBatch = renderBatch(renderedCount, renderedCount + rowsPerBatch);

          // Insert before sentinel
          const template = document.createElement('template');
          template.innerHTML = nextBatch;
          while (template.content.firstChild) {
            tbody.insertBefore(template.content.firstChild, sentinel);
          }

          renderedCount += rowsPerBatch;

          // Disconnect if all loaded
          if (renderedCount >= displayTxns.length) {
            observer.disconnect();
            sentinel.remove();
          }
        }
      }, { rootMargin: '200px' });

      observer.observe(sentinel);
    }
  }

  // --- Helper Functions for Inline Editing ---

  // Debounced save to reduce localStorage writes (500ms delay)
  let saveTimeout;
  function debouncedSave() {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveTransactions();
    }, 500);
  }

  function saveTransactions() {
    // Use ONLY central storage system (fixes data disappearing bug)
    if (window.storage) {
      // Save to ab3_transactions key via storage service
      window.storage._set('transactions', transactionData);
      console.log(`💾 Saved ${transactionData.length} transactions`);
    }
  }

  window.updateOpeningBalance = function (val) {
    localStorage.setItem('openingBalance', val);
    renderTransactionFeed(); // Re-render to update running balances
  };

  window.updateTransactionField = function (index, field, value) {
    if (!transactionData[index]) return;

    // Parse numeric fields
    let val = value;
    if (field === 'debit' || field === 'credit') {
      val = parseFloat(value) || 0;
    }

    // Update the field
    transactionData[index][field] = val;

    // Debounced save for performance
    debouncedSave();

    // If updating date or amount, re-render to fix sorting/balances
    if (['date', 'debit', 'credit'].includes(field)) {
      renderTransactionFeed();
    }
  };

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

  // CRITICAL: Save any pending changes before navigation/unload
  window.addEventListener('beforeunload', () => {
    // Cancel any pending debounced save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    // Save immediately
    saveTransactions();
  });

  // Also save when hash changes (SPA navigation)
  window.addEventListener('hashchange', () => {
    // Cancel any pending debounced save
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }
    // Save immediately before route change
    saveTransactions();
  });

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

  // Inline delete confirmation (no popup)
  window.requestDeleteConfirmation = function (btn, index) {
    // If already in confirm state, delete
    if (btn.classList.contains('confirm-delete')) {
      transactionData.splice(index, 1);
      renderTransactionFeed();
      saveTransactions();
      return;
    }

    // Change to confirm state
    btn.classList.add('confirm-delete');
    btn.textContent = 'Confirm?';
    btn.style.opacity = '1';
    btn.style.backgroundColor = '#ef4444';
    btn.style.color = 'white';
    btn.style.padding = '4px 8px';
    btn.style.borderRadius = '4px';

    // Reset if user clicks elsewhere
    const resetBtn = () => {
      btn.classList.remove('confirm-delete');
      btn.textContent = '✕';
      btn.style.opacity = '0.5';
      btn.style.backgroundColor = '';
      btn.style.color = '#ef4444';
      btn.style.padding = '';
      btn.style.borderRadius = '';
      document.removeEventListener('click', outsideClickHandler);
    };

    const outsideClickHandler = (e) => {
      if (!btn.contains(e.target)) {
        resetBtn();
      }
    };

    // Add listener on next tick to avoid immediate trigger
    setTimeout(() => {
      document.addEventListener('click', outsideClickHandler);
    }, 0);
  };

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

  async function loadSavedTransactions() {
    // Use ONLY central storage system
    if (window.storage && typeof window.storage.getTransactions === 'function') {
      try {
        const data = await window.storage.getTransactions();
        if (data && data.length > 0) {
          transactionData = data;
          renderTransactionFeed();
          console.log(`📂 Loaded ${transactionData.length} transactions from central storage`);

          // CLEANUP: Remove old 'transactions' key if it exists
          if (localStorage.getItem('transactions')) {
            console.log('🧹 Cleaning up old localStorage key: transactions');
            localStorage.removeItem('transactions');
          }

          return;
        }
      } catch (error) {
        console.error('❌ Failed to load from storage:', error);
      }
    }

    console.log('⚠️ No transactions found');
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
  // requestDeleteConfirmation is already exposed globally above


})(); // End IIFE wrapper
