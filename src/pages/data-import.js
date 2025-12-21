/**
 * Data Import Page
 * Master import section with 3-tier architecture integration
 */

// ============================================
// STATE MANAGEMENT
// ============================================

let importBatches = [];
let currentBatch = null;
let currentRawLines = [];
let previewGrid = null;

// ============================================
// PAGE INITIALIZATION
// ============================================

window.renderDataImportPage = function () {
    const container = document.getElementById('app');

    container.innerHTML = `
        <div class="data-import-container">
            <!-- Header -->
            <div class="page-header">
                <h1>📥 Data Import</h1>
                <p class="page-subtitle">Universal import engine for PDF and CSV bank statements</p>
            </div>

            <!-- Main Layout: Sidebar + Content -->
            <div class="import-layout">
                
                <!-- Left Sidebar: Upload Explorer -->
                <aside class="upload-explorer">
                    <div class="explorer-header">
                        <h3>Import History</h3>
                        <button class="btn-xs btn-secondary" onclick="refreshBatchList()">🔄</button>
                    </div>
                    
                    <div id="batch-list" class="batch-list">
                        <!-- Populated by renderBatchList() -->
                    </div>
                </aside>

                <!-- Main Content Area -->
                <main class="import-content">
                    
                    <!-- Upload Zone -->
                    <div id="upload-zone" class="modern-upload-zone-large">
                        <div class="upload-icon-wrapper">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                        </div>
                        <h2>Drop Bank Statement Here</h2>
                        <p>or click to browse</p>
                        <div class="upload-badges">
                            <span class="format-badge badge-pdf">PDF</span>
                            <span class="format-badge badge-csv">CSV</span>
                            <span class="format-badge badge-xls">Excel</span>
                        </div>
                        <input type="file" id="import-file-input" accept=".pdf,.csv,.xls,.xlsx" style="display: none;">
                    </div>

                    <!-- Preview Section (Hidden initially) -->
                    <div id="preview-section" style="display: none;">
                        <div class="preview-header">
                            <div class="preview-info">
                                <h3 id="preview-title">Preview: <span id="batch-filename"></span></h3>
                                <div class="preview-stats">
                                    <span id="batch-status" class="status-badge"></span>
                                    <span id="batch-row-count"></span>
                                </div>
                            </div>
                            <div class="preview-actions">
                                <button class="btn-secondary" onclick="revertBatch()">↩️ Revert All to Raw</button>
                                <button class="btn-secondary" onclick="clearPreview()">✕ Close</button>
                                <button class="btn-primary" onclick="loadToTransactions()">→ Load to Transactions</button>
                            </div>
                        </div>

                        <!-- AG Grid Preview -->
                        <div id="import-preview-grid" class="ag-theme-alpine" style="height: 500px; width: 100%;"></div>
                    </div>

                </main>

            </div>
        </div>

        <style>
            .data-import-container {
                padding: 20px;
                max-width: 1600px;
                margin: 0 auto;
            }

            .import-layout {
                display: grid;
                grid-template-columns: 300px 1fr;
                gap: 24px;
                margin-top: 24px;
            }

            /* Upload Explorer Sidebar */
            .upload-explorer {
                background: white;
                border-radius: 12px;
                padding: 16px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                height: fit-content;
                max-height: 80vh;
                overflow-y: auto;
            }

            .explorer-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 16px;
                padding-bottom: 12px;
                border-bottom: 2px solid #e2e8f0;
            }

            .explorer-header h3 {
                margin: 0;
                font-size: 1rem;
                color: #334155;
            }

            .batch-list {
                display: flex;
                flex-direction: column;
                gap: 8px;
            }

            .batch-item {
                padding: 12px;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                cursor: pointer;
                transition: all 0.2s;
            }

            .batch-item:hover {
                background: #f8fafc;
                border-color: #3b82f6;
            }

            .batch-item.active {
                background: #eff6ff;
                border-color: #3b82f6;
            }

            .batch-item-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 4px;
            }

            .batch-filename {
                font-weight: 600;
                font-size: 0.875rem;
                color: #1e293b;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .batch-meta {
                font-size: 0.75rem;
                color: #64748b;
            }

            /* Upload Zone */
            .modern-upload-zone-large {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 16px;
                padding: 60px;
                text-align: center;
                cursor: pointer;
                transition: transform 0.2s;
                color: white;
            }

            .modern-upload-zone-large:hover {
                transform: translateY(-2px);
            }

            .modern-upload-zone-large h2 {
                margin: 16px 0 8px;
                color: white;
            }

            .modern-upload-zone-large p {
                color: rgba(255,255,255,0.9);
                margin-bottom: 20px;
            }

            /* Preview Section */
            .preview-header {
                background: white;
                padding: 16px 20px;
                border-radius: 12px 12px 0 0;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid #e2e8f0;
            }

            .preview-info h3 {
                margin: 0 0 8px;
                font-size: 1.125rem;
            }

            .preview-stats {
                display: flex;
                gap: 12px;
                font-size: 0.875rem;
                color: #64748b;
            }

            .preview-actions {
                display: flex;
                gap: 12px;
            }

            .status-badge {
                padding: 4px 12px;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: 600;
            }

            .status-badge.completed {
                background: #dcfce7;
                color: #166534;
            }

            .status-badge.pending {
                background: #fef3c7;
                color: #92400e;
            }

            .status-badge.failed {
                background: #fee2e2;
                color: #991b1b;
            }

            #import-preview-grid {
                background: white;
                border-radius: 0 0 12px 12px;
            }
        </style>
    `;

    // Initialize
    initializeDataImport();
};

// ============================================
// INITIALIZATION
// ============================================

function initializeDataImport() {
    // Load batches from localStorage (simulating DB)
    loadBatchList();
    renderBatchList();

    // Setup file upload
    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('import-file-input');

    uploadZone.onclick = () => {
        console.log('📥 Upload zone clicked');
        fileInput.click();
    };

    fileInput.addEventListener('change', (e) => {
        console.log('📁 File input changed, files:', e.target.files.length);
        if (e.target.files.length > 0) {
            console.log('📄 Processing file:', e.target.files[0].name);
            handleFileUpload(e.target.files[0]);
        }
    });

    // Drag & drop
    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.style.transform = 'scale(1.02)';
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.style.transform = 'scale(1)';
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.style.transform = 'scale(1)';
        if (e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    });
}

// ============================================
// FILE UPLOAD HANDLER
// ============================================

async function handleFileUpload(file) {
    try {
        window.showToast('Processing file...', 'info');

        // Use existing PDF/CSV parser
        let parsedData;
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.pdf')) {
            if (!window.PdfImportService) throw new Error('PDF service not loaded');
            parsedData = await window.PdfImportService.parse(file);
        } else if (fileName.endsWith('.csv')) {
            // Use existing CSV parser
            parsedData = await parseCSVFile(file);
        } else {
            throw new Error('Unsupported file type');
        }

        // Create batch record
        const batch = createBatch(file, parsedData);

        // Save to localStorage
        importBatches.push(batch);
        saveBatchList();

        // Render and select
        renderBatchList();
        selectBatch(batch.id);

        window.showToast(`Imported ${parsedData.length} transactions`, 'success');

    } catch (error) {
        console.error('Import error:', error);
        window.showToast('Import failed: ' + error.message, 'error');
    }
}

// ============================================
// BATCH MANAGEMENT
// ============================================

function createBatch(file, parsedData) {
    const batch = {
        id: generateId(),
        filename: file.name,
        sourceType: file.name.endsWith('.pdf') ? 'PDF' : 'CSV',
        status: 'COMPLETED',
        fileSize: file.size,
        rowCount: parsedData.length,
        createdAt: new Date().toISOString(),
        rawLines: parsedData.map((row, index) => ({
            id: generateId(),
            lineNumber: index + 1,
            rawDate: row.Date || '',
            rawDescription: row.Description || row['Original Description'] || '',
            rawAmount: row.Amount?.toString() || '',
            rawSection: row.Debit ? 'debits' : 'credits'
        })),
        transactions: parsedData.map((row, index) => ({
            id: generateId(),
            rawLineId: null, // Will link after
            postingDate: row.Date,
            payee: row.Description,
            amount: parseFloat(row.Amount) || 0,
            type: parseFloat(row.Amount) < 0 ? 'DEBIT' : 'CREDIT',
            category: row.Category || null
        }))
    };

    // Link transactions to raw lines
    batch.transactions.forEach((txn, i) => {
        txn.rawLineId = batch.rawLines[i].id;
    });

    return batch;
}

function loadBatchList() {
    const stored = localStorage.getItem('importBatches');
    importBatches = stored ? JSON.parse(stored) : [];
}

function saveBatchList() {
    localStorage.setItem('importBatches', JSON.stringify(importBatches));
}

function renderBatchList() {
    const listEl = document.getElementById('batch-list');
    if (!listEl) return;

    if (importBatches.length === 0) {
        listEl.innerHTML = '<p style="text-align: center; color: #94a3b8; padding: 20px;">No imports yet</p>';
        return;
    }

    listEl.innerHTML = importBatches.map(batch => `
        <div class="batch-item ${currentBatch?.id === batch.id ? 'active' : ''}" onclick="selectBatch('${batch.id}')">
            <div class="batch-item-header">
                <span class="batch-filename" title="${batch.filename}">${batch.filename}</span>
                <span class="status-badge ${batch.status.toLowerCase()}">${batch.status}</span>
            </div>
            <div class="batch-meta">
                ${batch.rowCount} rows • ${new Date(batch.createdAt).toLocaleDateString()}
            </div>
        </div>
    `).join('');
}

function selectBatch(batchId) {
    currentBatch = importBatches.find(b => b.id === batchId);
    if (!currentBatch) return;

    renderBatchList(); // Update active state
    showPreview(currentBatch);
}

// ============================================
// PREVIEW GRID
// ============================================

function showPreview(batch) {
    document.getElementById('upload-zone').style.display = 'none';
    document.getElementById('preview-section').style.display = 'block';

    // Update header
    document.getElementById('batch-filename').textContent = batch.filename;
    document.getElementById('batch-status').textContent = batch.status;
    document.getElementById('batch-status').className = `status-badge ${batch.status.toLowerCase()}`;
    document.getElementById('batch-row-count').textContent = `${batch.rowCount} transactions`;

    // Render grid
    const gridDiv = document.getElementById('import-preview-grid');

    if (previewGrid) {
        previewGrid.destroy();
    }

    const columnDefs = [
        { field: 'lineNumber', headerName: '#', width: 60, pinned: 'left' },
        { field: 'rawDate', headerName: 'Raw Date', width: 120 },
        { field: 'rawDescription', headerName: 'Raw Description', flex: 2 },
        { field: 'payee', headerName: 'Cleaned Payee', flex: 1, editable: true },
        { field: 'rawAmount', headerName: 'Raw Amount', width: 120 },
        { field: 'amount', headerName: 'Amount', width: 120, valueFormatter: p => formatMoney(p.value) },
        { field: 'type', width: 100 },
        {
            headerName: 'Actions',
            width: 100,
            cellRenderer: params => `<button class="btn-xs" onclick="revertTransaction('${params.data.id}')">↩️</button>`
        }
    ];

    // Merge raw + transaction data for display
    const rowData = batch.rawLines.map((raw, i) => {
        const txn = batch.transactions[i];
        return {
            ...raw,
            ...txn,
            id: txn.id
        };
    });

    const gridOptions = {
        columnDefs,
        rowData,
        defaultColDef: {
            resizable: true,
            sortable: true,
            filter: true
        }
    };

    previewGrid = agGrid.createGrid(gridDiv, gridOptions);
}

function clearPreview() {
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('upload-zone').style.display = 'block';
    currentBatch = null;
    renderBatchList();
}

// ============================================
// REVERT FUNCTIONALITY
// ============================================

window.revertTransaction = function (transactionId) {
    if (!currentBatch) return;

    const txn = currentBatch.transactions.find(t => t.id === transactionId);
    const raw = currentBatch.rawLines.find(r => r.id === txn.rawLineId);

    if (txn && raw) {
        txn.payee = raw.rawDescription; // Restore full raw string
        saveBatchList();
        showPreview(currentBatch); // Refresh grid
        window.showToast('Reverted to raw description', 'success');
    }
};

window.revertBatch = function () {
    if (!currentBatch) return;

    currentBatch.transactions.forEach(txn => {
        const raw = currentBatch.rawLines.find(r => r.id === txn.rawLineId);
        if (raw) {
            txn.payee = raw.rawDescription;
        }
    });

    saveBatchList();
    showPreview(currentBatch);
    window.showToast('All transactions reverted to raw', 'success');
};

// ============================================
// LOAD TO TRANSACTIONS
// ============================================

window.loadToTransactions = function () {
    if (!currentBatch) return;

    // Get existing transactions using correct storage key
    const existing = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');

    // Add batch transactions
    const newTransactions = currentBatch.transactions.map(txn => ({
        id: txn.id,
        date: txn.postingDate,
        description: txn.payee,
        amount: txn.amount,
        type: txn.type.toLowerCase(),
        category: txn.category || 'Uncategorized',
        reconciled: false
    }));

    localStorage.setItem('ab3_transactions', JSON.stringify([...existing, ...newTransactions]));

    window.showToast(`Loaded ${newTransactions.length} transactions`, 'success');

    // Navigate to transactions
    setTimeout(() => {
        window.router.navigate('/transactions');
    }, 1000);
};

// ============================================
// HELPERS
// ============================================

function generateId() {
    return 'id_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function formatMoney(val) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0);
}

async function parseCSVFile(file) {
    // Reuse existing CSV parser logic
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target.result;
                const lines = text.split('\n').filter(l => l.trim());
                const headers = lines[0].split(',');
                const data = lines.slice(1).map(line => {
                    const values = line.split(',');
                    const row = {};
                    headers.forEach((h, i) => row[h.trim()] = values[i]?.trim() || '');
                    return row;
                });
                resolve(data);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}

window.refreshBatchList = function () {
    loadBatchList();
    renderBatchList();
    window.showToast('Refreshed', 'success');
};

console.log('📥 Data Import page loaded');
