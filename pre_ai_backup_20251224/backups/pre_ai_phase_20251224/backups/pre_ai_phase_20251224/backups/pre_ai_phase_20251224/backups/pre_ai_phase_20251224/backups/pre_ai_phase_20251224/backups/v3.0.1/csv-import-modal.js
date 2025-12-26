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

// Create Modal Structure
function createCSVImportModal() {
    const modalHTML = `
    <div id="csv-import-modal" class="auth-modal" style="display: none;">
      <div class="auth-modal-content" style="max-width: 1200px; width: 95%; max-height: 90vh;">
        <!-- Header -->
        <div class="auth-header">
          <h2>📁 Import Transactions</h2>
          <p>Upload CSV or Excel file to preview and import transactions</p>
          <button class="modal-close-btn" onclick="closeCSVImportModal()">×</button>
        </div>

        <!-- Step 1: File Upload -->
        <div id="upload-section" class="csv-section">
          <div class="upload-zone" id="csv-upload-zone">
            <div class="upload-icon">📤</div>
            <h3>Drag & Drop File Here</h3>
            <p>or click to browse</p>
            <p class="upload-hint">Supports: CSV, XLS, XLSX, PDF</p>
            <input type="file" id="csv-file-input" accept=".csv,.xls,.xlsx,.pdf" style="display: none;">
          </div>
        </div>

        <!-- Step 2: Preview Grid -->
        <div id="preview-section" class="csv-section" style="display: none;">
          <div class="preview-header">
            <h3>📊 Preview Data</h3>
            <div class="preview-stats">
              <span id="row-count">0 rows</span>
              <span id="col-count">0 columns</span>
            </div>
          </div>
          
          <div id="csv-preview-grid" class="ag-theme-alpine" style="height: 400px; width: 100%;"></div>
          
          <div class="preview-actions">
            <button class="btn-secondary" onclick="resetCSVImport()">
              ← Back to Upload
            </button>
            <button class="btn-primary" onclick="proceedToMapping()">
              Continue to Column Mapping →
            </button>
          </div>
        </div>

        <!-- Step 3: Column Mapping -->
        <div id="mapping-section" class="csv-section" style="display: none;">
          <h3>🔗 Map Columns to Fields</h3>
          <p>Match your CSV columns to transaction fields</p>
          
          <div id="column-mapping" class="mapping-grid"></div>
          
          <div class="mapping-actions">
            <button class="btn-secondary" onclick="backToPreview()">
              ← Back to Preview
            </button>
            <button class="btn-primary" onclick="importTransactions()">
              ✅ Import Transactions
            </button>
          </div>
        </div>

        <!-- Step 4: Import Progress -->
        <div id="import-section" class="csv-section" style="display: none;">
          <div class="import-progress">
            <div class="progress-icon">⏳</div>
            <h3>Importing Transactions...</h3>
            <div class="progress-bar">
              <div id="import-progress-fill" class="progress-fill"></div>
            </div>
            <p id="import-status">Processing...</p>
          </div>
        </div>

        <!-- Step 5: Import Complete -->
        <div id="complete-section" class="csv-section" style="display: none;">
          <div class="import-complete">
            <div class="complete-icon">✅</div>
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

    setupFileUpload();
}

// Setup File Upload (Drag & Drop + Browse)
function setupFileUpload() {
    const uploadZone = document.getElementById('csv-upload-zone');
    const fileInput = document.getElementById('csv-file-input');

    // Click to browse
    uploadZone.addEventListener('click', () => {
        fileInput.click();
    });

    // File selected
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileUpload(e.target.files[0]);
        }
    });

    // Drag & Drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '#6366f1';
        uploadZone.style.background = 'rgba(99, 102, 241, 0.05)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.borderColor = '';
        uploadZone.style.background = '';

        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
}

// Handle File Upload
async function handleFileUpload(file) {
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xls') && !fileName.endsWith('.xlsx') && !fileName.endsWith('.pdf')) {
        alert('Please upload a CSV, Excel, or PDF file');
        return;
    }

    try {
        if (fileName.endsWith('.csv')) {
            await parseCSV(file); // csvData populated
        } else if (fileName.endsWith('.pdf')) {
            if (!window.PdfImportService) throw new Error("PDF Service not loaded");
            const transactions = await window.PdfImportService.parse(file);
            if (transactions.length === 0) {
                throw new Error("No readable transactions found in PDF. Is it a scanned image?");
            }
            // Normalize to Expected Format
            csvData = transactions; // Already array of objects
            csvHeaders = Object.keys(transactions[0] || {});
            showPreview(); // Jump to preview
        } else {
            await parseExcel(file);
        }

        // Auto-detect account type and show selection
        await showAccountSelection();
    } catch (error) {
        console.error('File parse error:', error);
        alert('Failed to parse file: ' + error.message);
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

// Show Preview Grid
function showPreview() {
    document.getElementById('upload-section').style.display = 'none';
    document.getElementById('preview-section').style.display = 'block';

    // Update stats
    document.getElementById('row-count').textContent = `${csvData.length} rows`;
    document.getElementById('col-count').textContent = `${csvHeaders.length} columns`;

    // Create AG Grid
    const gridDiv = document.getElementById('csv-preview-grid');

    const columnDefs = csvHeaders.map(header => ({
        headerName: header,
        field: header,
        width: 150,
        resizable: true,
        sortable: true,
        filter: true
    }));

    const gridOptions = {
        columnDefs: columnDefs,
        rowData: csvData,
        pagination: true,
        paginationPageSize: 50,
        defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true
        }
    };

    csvPreviewGrid = agGrid.createGrid(gridDiv, gridOptions);
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
        < div class="mapping-row" >
        <label class="mapping-label">
          ${field.label}
          <span class="mapping-hint">${field.hint}</span>
        </label>
        <select class="mapping-select" data-field="${field.key}">
          <option value="">-- Not Mapped --</option>
          ${csvHeaders.map(h => `<option value="${h}">${h}</option>`).join('')}
        </select>
      </div >
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
        const select = document.querySelector(`select[data - field= "${field}"]`);
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
            filename: document.getElementById('csv-file-input').files[0]?.name || 'Unknown',
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
        < p >✅ Successfully imported: <strong>${imported}</strong> transactions</p >
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

    document.getElementById('csv-file-input').value = '';
}

// Close Modal
window.closeCSVImportModal = function () {
    if (csvImportModal) {
        csvImportModal.style.display = 'none';
        resetCSVImport();
    }
};

console.log('📁 CSV Import Modal loaded');
