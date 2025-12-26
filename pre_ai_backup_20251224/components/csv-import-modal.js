/**
 * CSV Import Modal with AG Grid Preview
 * Supports CSV and Excel files with full column preview
 */

let csvImportModal = null;
let csvPreviewGrid = null;
let csvData = [];
let csvHeaders = [];

// Show CSV Import Modal
window.showCSVImportModal = function () {
    if (!csvImportModal) {
        createCSVImportModal();
    }

    csvImportModal.style.display = 'flex';
    resetCSVImport();
};

// Create Modal Structure (Modern Redesign)
function createCSVImportModal() {
    const modalHTML = `
    <div id="csv-import-modal" class="modern-modal-overlay" style="display: none;">
      <div class="modern-modal-card">
        <!-- Header -->
        <div class="modern-modal-header">
          <h2>
             <span style="font-size: 1.5em;">📥</span> Import Transactions
          </h2>
          <button class="modern-modal-close" onclick="closeCSVImportModal()">×</button>
        </div>

        <div class="modern-modal-body">
            <!-- Step 1: File Upload -->
            <div id="upload-section" class="csv-section" style="width: 100%; display: flex; flex-direction: column; align-items: center;">
              <div class="modern-upload-zone" id="csv-upload-zone" onclick="document.getElementById('csv-file-input').click()">
                <div class="upload-icon-wrapper">
                    <!-- SVG Cloud Icon -->
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="17 8 12 3 7 8"></polyline>
                        <line x1="12" y1="3" x2="12" y2="15"></line>
                    </svg>
                </div>
                <h3 class="upload-title">Drag & Drop Bank Statements</h3>
                <p class="upload-sub">or click to browse from your computer</p>
                
                <div class="upload-badges">
                    <span class="format-badge badge-pdf">PDF</span>
                    <span class="format-badge badge-csv">CSV</span>
                    <span class="format-badge badge-xls">Excel</span>
                </div>
                
                <input type="file" id="modern-import-file-input" accept=".csv, .xls, .xlsx, .pdf, application/pdf, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv" style="display: none;">
              </div>
            </div>

            <!-- Step 2: Preview & Verify (MoneyThumb Style) -->
            <div id="preview-section" class="csv-section" style="display: none; width: 100%;">
              
              <!-- Verification Header -->
              <div class="mt-verification-header">
                  <div class="mt-stats-row">
                      <div class="mt-stat-group">
                          <label>PDF Totals:</label>
                          <span class="mt-stat credit">Credits: <strong id="mt-credits-count">0</strong> (<span id="mt-credits-sum">$0.00</span>)</span>
                          <span class="mt-separator">|</span>
                          <span class="mt-stat debit">Debits: <strong id="mt-debits-count">0</strong> (<span id="mt-debits-sum">$0.00</span>)</span>
                      </div>
                      <div class="mt-stat-group">
                          <label>Net Balance:</label>
                          <strong id="mt-net-balance" class="mt-net">$0.00</strong>
                      </div>
                  </div>
                  
                  <div class="mt-controls-row">
                      <div class="mt-control">
                          <label><input type="checkbox" id="mt-switch-signs" onchange="toggleSignLogic()"> Switch signs of amounts</label>
                      </div>
                       <div class="mt-control">
                          <button class="btn-xs btn-secondary" onclick="openCleanupSettings()">Payee Cleanup Settings</button>
                      </div>
                  </div>
              </div>

              <div id="csv-preview-grid" class="ag-theme-alpine" style="height: 500px; width: 100%;"></div>
              
              <div class="preview-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;">
                <button class="btn-secondary" onclick="resetCSVImport()">Discard & Clear</button>
                <button class="btn-primary" onclick="proceedToMapping()">Next: Map Columns →</button>
              </div>
            </div>

            <!-- Step 3: Column Mapping -->
            <div id="mapping-section" class="csv-section" style="display: none; width: 100%;">
              <h3>🔗 Map Columns</h3>
              <p>Match your columns to the database fields.</p>
              
              <div id="column-mapping" class="mapping-grid"></div>
              
              <div class="mapping-actions" style="margin-top: 20px; display: flex; justify-content: flex-end; gap: 12px;">
                <button class="btn-secondary" onclick="backToPreview()">← Back</button>
                <button class="btn-primary" onclick="importTransactions()">✅ Import Now</button>
              </div>
            </div>

            <!-- Step 4: Import Progress -->
            <div id="import-section" class="csv-section" style="display: none; width: 100%; text-align: center;">
              <div class="progress-card">
                <div class="spinner-ring"></div>
                <h3>Importing Transactions...</h3>
                <p id="import-status" style="color: #64748b;">Processing data...</p>
                <div class="progress-bar" style="max-width: 400px; margin: 20px auto;">
                  <div id="import-progress-fill" class="progress-fill"></div>
                </div>
              </div>
            </div>

            <!-- Step 5: Import Complete -->
            <div id="complete-section" class="csv-section" style="display: none; width: 100%; text-align: center;">
              <div class="import-complete">
                <div class="complete-icon" style="font-size: 3rem; margin-bottom: 16px;">✅</div>
                <h3>Import Complete!</h3>
                <div class="import-summary" id="import-summary"></div>

            <button class="btn-primary" onclick="finalizeImport()">
              View Transactions
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

    // ... (keep surrounding code) ...

    // Finalize Import and Trigger Auto-Fix
    window.finalizeImport = function () {
        // Log the import event
        if (window.SystemLog) {
            const count = (window.transactionData || []).length;
            window.SystemLog.log('DATA', 'IMPORT_CSV', { count: count, file: 'Manual Upload' });
        }

        closeCSVImportModal();
        if (window.router) window.router.navigate('/transactions');

        // Auto-Run Sanitize/Fix Data
        setTimeout(() => {
            if (window.sanitizeData) {
                console.log('🚑 Auto-running data fix...');
                window.sanitizeData();
            }
            // Force re-render to ensure persistence
            if (window.reRenderTable) window.reRenderTable();
        }, 500);
    };

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    csvImportModal = document.getElementById('csv-import-modal');

    // Drag & Drop Handling
    const uploadZone = document.getElementById('csv-upload-zone');
    const fileInput = document.getElementById('modern-import-file-input');

    // Click to browse - Bind to the NEW function to avoid triggering listeners on old ID
    uploadZone.onclick = function () {
        document.getElementById('modern-import-file-input').click();
    };

    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            processImportModalFile(e.target.files[0]);
        }
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');

        if (e.dataTransfer.files.length > 0) {
            processImportModalFile(e.dataTransfer.files[0]);
        }
    });
}

// Handle File Upload (Renamed to avoid conflict with global handleFileUpload)
async function processImportModalFile(file) {
    currentUploadFile = file; // Capture for re-processing settings
    const fileName = file.name.toLowerCase();

    // STRICT Extension Check
    const allowed = ['.csv', '.xls', '.xlsx', '.pdf'];
    if (!allowed.some(ext => fileName.endsWith(ext))) {
        alert('Supported formats: CSV, Excel (.xls, .xlsx), and PDF.');
        return;
    }

    try {
        if (fileName.endsWith('.csv')) {
            await parseCSV(file);
        } else if (fileName.endsWith('.pdf')) {
            if (!window.PdfImportService) throw new Error("PDF Service not loaded");

            window.showToast('Scanning PDF Layout...', 'info');
            const transactions = await window.PdfImportService.parse(file);

            if (transactions.length === 0) {
                throw new Error("No transactions found. Please ensure the PDF contains clear bank statement tables.");
            }

            // Normalize for Grid
            csvData = transactions;
            // Extract headers from first row
            csvHeaders = Object.keys(transactions[0] || {});

            // If we have data, jump to preview
            showPreview();
            window.showToast('PDF Parsed Successfully!', 'success');
        } else {
            await parseExcel(file);
        }

        // Auto-detect account type and show selection if needed
        // (Functionality preserved)
        // await showAccountSelection(); 
    } catch (error) {
        console.error('File parse error:', error);
        window.showToast('Import Failed: ' + error.message, 'error');
    }
}

// Auto-detect account type from CSV data
function detectAccountType() {
    if (csvData.length === 0) return 'unknown';

    let positiveCount = 0;
    let negativeCount = 0;

    // Analyze transaction amounts
    csvData.forEach(row => {
        // Try to find amount column
        let amount = null;
        for (const key of Object.keys(row)) {
            const keyLower = key.toLowerCase();
            if (keyLower.includes('amount') || keyLower.includes('debit') || keyLower.includes('credit')) {
                const value = parseFloat(row[key].toString().replace(/[^0-9.-]/g, ''));
                if (!isNaN(value)) {
                    amount = value;
                    break;
                }
            }
        }

        if (amount !== null) {
            if (amount > 0) positiveCount++;
            else if (amount < 0) negativeCount++;
        }
    });

    // If mostly positive (debits), it's likely a bank account
    // If mostly negative (credits/charges), it's likely a credit card
    const total = positiveCount + negativeCount;
    if (total === 0) return 'unknown';

    const positiveRatio = positiveCount / total;

    if (positiveRatio > 0.6) {
        return 'bank'; // Mostly debits = bank account
    } else if (positiveRatio < 0.4) {
        return 'credit'; // Mostly credits = credit card
    } else {
        return 'unknown'; // Mixed
    }
}

// Show Account Selection Modal
async function showAccountSelection() {
    const detectedType = detectAccountType();
    let accounts = [];

    // Use AccountManager if valid
    if (window.accountManager) {
        accounts = window.accountManager.getAllAccounts();

        // If no accounts, prompt to create
        if (accounts.length === 0) {
            alert('No accounts found. Please create an account first.');
            return;
        }
    } else {
        return;
    }

    let detectionMessage = '';
    if (detectedType === 'bank') {
        detectionMessage = '🏦 Detected: <strong>Bank Account</strong> (mostly positive amounts)';
        accounts.sort((a, b) => (a.type === 'bank' ? -1 : 1));
    } else if (detectedType === 'credit') {
        detectionMessage = '💳 Detected: <strong>Credit Card</strong> (mostly negative amounts)';
        accounts.sort((a, b) => (a.type === 'credit' ? -1 : 1));
    } else {
        detectionMessage = '📊 Could not determine account type automatically.';
    }

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '2000';
    modal.innerHTML = `
    <div class="modal-content" style="max-width: 500px;">
      <div class="modal-header">
        <h3>Select Account for Import</h3>
        <button class="close-btn" onclick="this.closest('.modal-overlay').remove()">×</button>
      </div>
      <div class="modal-body">
        <div class="detection-alert" style="background: #f1f5f9; padding: 12px; border-radius: 6px; margin-bottom: 20px; color: #475569;">
            ${detectionMessage}
        </div>
        
        <div class="form-group">
            <label>Select Account:</label>
            <select id="import-account-select" class="form-control" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px;">
                ${accounts.map(acc => `
                    <option value="${acc.id}">
                        ${acc.type === 'bank' ? '🏦' : '💳'} ${acc.accountName} (${acc.accountNumber})
                    </option>
                `).join('')}
            </select>
        </div>
        
        <div style="margin-top: 15px; display: flex; justify-content: space-between; font-size: 0.9em; color: #64748b;">
           <a href="#" onclick="window.accountSwitcher.showAddAccountModal(); this.closest('.modal-overlay').remove(); return false;">+ Create new account</a>
           <a href="#/uploads" onclick="this.closest('.modal-overlay').remove();">View Import Bucket 📁</a>
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
        <button class="btn-primary" id="confirm-account-btn">Continue</button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);

    document.getElementById('confirm-account-btn').onclick = async () => {
        const select = document.getElementById('import-account-select');
        const accountId = select.value;
        const account = window.accountManager.getAccount(accountId);

        if (account) {
            // Set for uploading reference
            window.currentImportAccount = account;

            // OPTIONAL: Switch to this account now so user sees data immediately after
            window.accountManager.setCurrentAccount(accountId);

            // Notify layout to update header
            window.dispatchEvent(new Event('accountChanged'));

            modal.remove();

            // Show mapping UI
            initColumnMapping();

            // Force redraw of header
            if (window.accountSwitcher) window.accountSwitcher.render();
        }
    };
}

// Parse CSV File
function parseCSV(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(line => line.trim());

                if (lines.length === 0) {
                    reject(new Error('Empty file'));
                    return;
                }

                // Parse headers
                csvHeaders = parseCSVLine(lines[0]);

                // Parse data
                csvData = lines.slice(1).map(line => {
                    const values = parseCSVLine(line);
                    const row = {};
                    csvHeaders.forEach((header, i) => {
                        row[header] = values[i] || '';
                    });
                    return row;
                });

                console.log(`Parsed CSV: ${csvHeaders.length} columns, ${csvData.length} rows`);
                resolve();
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsText(file);
    });
}

// Parse CSV Line (handles quotes)
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }

    result.push(current.trim());
    return result;
}

// Parse Excel File (basic support using SheetJS if available)
async function parseExcel(file) {
    // Check if SheetJS (xlsx) library is loaded
    if (typeof XLSX === 'undefined') {
        alert('Excel support requires SheetJS library. Please use CSV format or add SheetJS to your project.');
        throw new Error('SheetJS not loaded');
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

                csvHeaders = json[0];
                csvData = json.slice(1).map(row => {
                    const obj = {};
                    csvHeaders.forEach((header, i) => {
                        obj[header] = row[i] || '';
                    });
                    return obj;
                });

                resolve();
            } catch (error) {
                reject(error);
            }
        };

        reader.onerror = () => reject(new Error('Failed to read Excel file'));
        reader.readAsArrayBuffer(file);
    });
}

// Show Preview Grid with Verification Stats
function showPreview() {
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('preview-section').style.display = 'block';

    updateVerificationStats();

    if (csvPreviewGrid) {
        csvPreviewGrid.destroy();
    }

    const gridDiv = document.getElementById('csv-preview-grid');

    // MoneyThumb Column Defs
    const columnDefs = [
        {
            headerName: "",
            checkboxSelection: true,
            headerCheckboxSelection: true,
            width: 50,
            pinned: 'left'
        },
        {
            field: "Date",
            width: 120,
            editable: true
        },
        {
            field: "Description",
            headerName: "Payee / Description",
            flex: 2,
            editable: true
        },
        {
            field: "Debit",
            headerName: "Debits",
            width: 110,
            valueFormatter: params => params.value ? formatMoney(params.value) : '',
            cellStyle: { color: '#dc2626', textAlign: 'right' }
        },
        {
            field: "Credit",
            headerName: "Credits",
            width: 110,
            valueFormatter: params => params.value ? formatMoney(params.value) : '',
            cellStyle: { color: '#16a34a', textAlign: 'right' }
        },
        {
            field: "Category",
            width: 150,
            editable: true
        }
    ];

    // If "Debit/Credit" columns missing (e.g. CSV), fall back to Amount
    const hasSplitCols = csvData.some(r => r.Debit !== undefined || r.Credit !== undefined);
    if (!hasSplitCols) {
        columnDefs.splice(3, 2, {
            field: "Amount",
            width: 120,
            valueFormatter: params => formatMoney(params.value),
            cellStyle: params => ({
                color: params.value >= 0 ? '#16a34a' : '#dc2626',
                textAlign: 'right'
            })
        });
    }

    const gridOptions = {
        columnDefs: columnDefs,
        rowData: csvData,
        defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true
        },
        rowSelection: 'multiple',
        onGridReady: (params) => {
            csvPreviewGrid = params.api; // Save for later access
            params.api.selectAll(); // Default select all
        }
    };

    new agGrid.Grid(gridDiv, gridOptions);
}

// Update Header Stats
function updateVerificationStats() {
    // Safety check for UI elements
    const creditsCountEl = document.getElementById('mt-credits-count');
    if (!creditsCountEl) return;

    let creditCount = 0;
    let creditSum = 0;
    let debitCount = 0;
    let debitSum = 0;

    csvData.forEach(row => {
        // Prefer Split columns if available
        if (row.Credit) {
            creditCount++;
            creditSum += parseFloat(row.Credit) || 0;
        }
        if (row.Debit) {
            debitCount++;
            debitSum += parseFloat(row.Debit) || 0;
        }

        // Fallback to Amount
        if (!row.Credit && !row.Debit && row.Amount !== undefined) {
            const amt = parseFloat(row.Amount);
            if (amt > 0) {
                creditCount++;
                creditSum += amt;
            } else if (amt < 0) {
                debitCount++;
                debitSum += Math.abs(amt);
            }
        }
    });

    const net = creditSum - debitSum;

    // Update DOM
    document.getElementById('mt-credits-count').innerText = creditCount;
    document.getElementById('mt-credits-sum').innerText = formatMoney(creditSum);

    document.getElementById('mt-debits-count').innerText = debitCount;
    document.getElementById('mt-debits-sum').innerText = formatMoney(debitSum);

    const netEl = document.getElementById('mt-net-balance');
    netEl.innerText = formatMoney(net);
    netEl.style.color = net >= 0 ? '#16a34a' : '#dc2626';
}

// Store current file for re-processing
let currentUploadFile = null;

window.reprocessCurrentFile = function () {
    if (currentUploadFile) {
        processImportModalFile(currentUploadFile);
    }
};

// Toggle Sign Logic (Updates config + UI)
window.toggleSignLogic = function () {
    const checkbox = document.getElementById('mt-switch-signs');
    const isSwitched = checkbox.checked;

    // Update Global Config
    if (!window.parserConfig) window.parserConfig = window.PdfImportService.DEFAULT_CONFIG;
    window.parserConfig.parsingStrategy.signLogic = isSwitched ? 'Switched' : 'Normal';

    // Re-process to apply logic at parser level OR simple invert if cached?
    // Determine best path. Parser level is safer for consistent "Credit" vs "Debit" column assignment.
    if (currentUploadFile) {
        processImportModalFile(currentUploadFile);
    } else {
        // Fallback for CSV or no file
        csvData.forEach(row => {
            if (row.Amount) row.Amount = -row.Amount;
            const temp = row.Debit; row.Debit = row.Credit; row.Credit = temp;
        });
        showPreview();
    }
};

// window.openCleanupSettings is now handled by parser-settings-modal.js

function formatMoney(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
}

// Proceed to Column Mapping
function proceedToMapping() {
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('mapping-section').style.display = 'block';

    renderColumnMapping();
}

// Render Column Mapping UI
function renderColumnMapping() {
    const mappingDiv = document.getElementById('column-mapping');

    const requiredFields = [
        { key: 'date', label: 'Date *', hint: 'Transaction date' },
        { key: 'description', label: 'Description *', hint: 'Transaction description' },
        { key: 'amount', label: 'Amount *', hint: 'Transaction amount' }
    ];

    const optionalFields = [
        { key: 'vendor', label: 'Vendor', hint: 'Vendor/payee name' },
        { key: 'category', label: 'Category', hint: 'Transaction category' },
        { key: 'account', label: 'Account', hint: 'Account number' },
        { key: 'reference', label: 'Reference', hint: 'Reference number' },
        { key: 'notes', label: 'Notes', hint: 'Additional notes' }
    ];

    const allFields = [...requiredFields, ...optionalFields];

    let html = '<div class="mapping-list">';

    allFields.forEach(field => {
        html += `
        <div class="mapping-row">
        <label class="mapping-label">
          ${field.label}
          <span class="mapping-hint">${field.hint}</span>
        </label>
        <select class="mapping-select" data-field="${field.key}">
          <option value="">-- Not Mapped --</option>
          ${csvHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}
        </select>
      </div>
        `;
    });

    html += '</div>';
    mappingDiv.innerHTML = html;

    // Auto-detect mappings
    autoDetectMappings();
}

// Auto-detect column mappings
function autoDetectMappings() {
    const mappings = {
        'date': ['date', 'transaction date', 'posted date', 'trans date'],
        'description': ['description', 'desc', 'memo', 'details', 'payee'],
        'amount': ['amount', 'total', 'value', 'debit', 'credit'],
        'vendor': ['vendor', 'payee', 'merchant', 'name'],
        'category': ['category', 'type', 'class'],
        'account': ['account', 'account number', 'acct'],
        'reference': ['reference', 'ref', 'check number', 'transaction id'],
        'notes': ['notes', 'comment', 'remarks']
    };

    Object.entries(mappings).forEach(([field, keywords]) => {
        const select = document.querySelector(`select[data-field="${field}"]`);
        if (!select) return;

        const match = csvHeaders.find(header =>
            keywords.some(kw => header.toLowerCase().includes(kw))
        );

        if (match) {
            select.value = match;
        }
    });
}

// Back to Preview
function backToPreview() {
    document.getElementById('mapping-section').style.display = 'none';
    document.getElementById('preview-section').style.display = 'block';
}

// Import Transactions
async function importTransactions() {
    // Get column mappings
    const mapping = {};
    document.querySelectorAll('.mapping-select').forEach(select => {
        const field = select.dataset.field;
        const column = select.value;
        if (column) {
            mapping[field] = column;
        }
    });

    // Validate required fields
    if (!mapping.date || !mapping.description || !mapping.amount) {
        alert('Please map required fields: Date, Description, and Amount');
        return;
    }

    // Show progress
    document.getElementById('mapping-section').style.display = 'none';
    document.getElementById('import-section').style.display = 'block';

    // Import data
    let imported = 0;
    let failed = 0;

    for (let i = 0; i < csvData.length; i++) {
        const row = csvData[i];

        try {
            const transaction = {
                date: row[mapping.date],
                description: row[mapping.description],
                amount: parseFloat(row[mapping.amount].toString().replace(/[^0-9.-]/g, '')),
                type: parseFloat(row[mapping.amount]) >= 0 ? 'credit' : 'debit',
                vendor: mapping.vendor ? row[mapping.vendor] : '',
                category: mapping.category ? row[mapping.category] : 'Uncategorized',
                accountId: mapping.account ? row[mapping.account] : '',
                notes: mapping.notes ? row[mapping.notes] : '',
                reconciled: false
            };

            await window.storage.createTransaction(transaction);
            imported++;
        } catch (error) {
            console.error('Failed to import row:', error);
            failed++;
        }

        // Update progress
        const progress = ((i + 1) / csvData.length) * 100;
        document.getElementById('import-progress-fill').style.width = progress + '%';
        document.getElementById('import-status').textContent = `Imported ${imported} of ${csvData.length} transactions`;

        // Small delay for UI update
        await new Promise(resolve => setTimeout(resolve, 10));
    }

    // Show complete
    showImportComplete(imported, failed);

    // Track upload in history
    if (window.uploadHistory && window.currentImportAccount) {
        const accountInfo = getAccountInfo(window.currentImportAccount);
        window.uploadHistory.addUpload({
            filename: document.getElementById('modern-import-file-input').files[0]?.name || 'Unknown',
            accountCode: window.currentImportAccount,
            accountName: accountInfo.name,
            transactionCount: imported,
            uploadDate: new Date().toISOString()
        });
    }
}

// Get account info from code
function getAccountInfo(code) {
    const accounts = {
        '1000': { name: 'Bank - chequing' },
        '1030': { name: 'Bank - US account' },
        '1035': { name: 'Savings account' },
        '1040': { name: 'Savings account #2' },
        '2101': { name: 'RBC MC (Mastercard)' },
        '2102': { name: 'RBC Visa' }
    };
    return accounts[code] || { name: 'Unknown Account' };
}

// Show Import Complete
function showImportComplete(imported, failed) {
    document.getElementById('import-section').style.display = 'none';
    document.getElementById('complete-section').style.display = 'block';

    document.getElementById('import-summary').innerHTML = `
        <p>✅ Successfully imported: <strong>${imported}</strong> transactions</p>
        ${failed > 0 ? `<p>⚠️ Failed: <strong>${failed}</strong> transactions</p>` : ''}
        <p>Total processed: <strong>${imported + failed}</strong></p>
    `;
}

// Reset CSV Import
function resetCSVImport() {
    document.getElementById('upload-section').style.display = 'block';
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('mapping-section').style.display = 'none';
    document.getElementById('import-section').style.display = 'none';
    document.getElementById('complete-section').style.display = 'none';

    csvData = [];
    csvHeaders = [];

    if (csvPreviewGrid) {
        csvPreviewGrid.destroy();
        csvPreviewGrid = null;
    }

    document.getElementById('modern-import-file-input').value = '';
}

// Close Modal
window.closeCSVImportModal = function () {
    if (csvImportModal) {
        csvImportModal.style.display = 'none';
        resetCSVImport();
    }
};

console.log('📁 CSV Import Modal loaded');
