/**
 * Data Import Page
 * Master import section with 3-tier architecture integration
 */

// ============================================
// STATE MANAGEMENT
// ============================================

console.log('🚀 Parsing data-import.js...');

// Global state
window.previewGrid = null;
window.currentParsedData = null;
window.pendingFilesToUpload = null;
window.selectedHistoryIds = new Set();
window.forcedAccountType = null; // 'bank' or 'credit_card' or null (auto)

// ============================================
// IMPORT HISTORY MANAGEMENT
// ============================================

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getImportHistory() {
    try {
        const history = localStorage.getItem('ab_import_history');
        return history ? JSON.parse(history) : [];
    } catch (e) {
        console.error('Failed to load import history:', e);
        return [];
    }
}

function saveImportToHistory(file, parsedData) {
    const history = getImportHistory();
    const isDuplicate = history.some(item => item.filename === file.name);
    if (isDuplicate) {
        const existing = history.find(item => item.filename === file.name);
        return existing ? existing.id : null;
    }

    const newImport = {
        id: generateId(),
        filename: file.name,
        date: new Date().toISOString(),
        count: parsedData.length,
        bank: parsedData[0]?._bank || 'Unknown',
        data: parsedData
    };

    history.unshift(newImport);
    if (history.length > 20) history.pop();

    localStorage.setItem('ab_import_history', JSON.stringify(history));
    renderBatchList();
    return newImport.id;
}

function deleteImport(id, event) {
    if (event) event.stopPropagation();
    const history = getImportHistory();
    const newHistory = history.filter(item => item.id !== id);
    localStorage.setItem('ab_import_history', JSON.stringify(newHistory));

    if (window.selectedHistoryIds.has(id)) {
        window.selectedHistoryIds.delete(id);
    }

    renderBatchList();
    window.showToast('Import removed from history', 'info');
}

function toggleHistorySelection(id, event) {
    if (event) event.stopPropagation();
    if (window.selectedHistoryIds.has(id)) {
        window.selectedHistoryIds.delete(id);
    } else {
        window.selectedHistoryIds.add(id);
    }
    renderBatchList();
}

function loadImportFromHistory(id) {
    const history = getImportHistory();
    const item = history.find(i => i.id === id);
    if (item) {
        handleSmartDataLoad([item.data], [`${item.filename} (History)`]);
    }
}

async function handleBatchHistoryLoad() {
    if (window.selectedHistoryIds.size === 0) return;

    const history = getImportHistory();
    const selectedItems = history.filter(item => window.selectedHistoryIds.has(item.id));

    const dataBatches = selectedItems.map(item => item.data);
    const filenames = selectedItems.map(item => item.filename);

    await handleSmartDataLoad(dataBatches, filenames);

    window.selectedHistoryIds.clear();
    renderBatchList();
}


window.renderBatchList = function () {
    const listEl = document.getElementById('batch-list');
    const updateBtn = document.getElementById('btn-append-selected');
    if (!listEl) return;

    const history = getImportHistory();

    if (updateBtn) {
        if (window.selectedHistoryIds.size > 0) {
            updateBtn.style.display = 'inline-block';
            updateBtn.textContent = `Append (${window.selectedHistoryIds.size})`;
        } else {
            updateBtn.style.display = 'none';
        }
    }

    if (history.length === 0) {
        listEl.innerHTML = `
            <div class="empty-state">
                <p>No recent imports</p>
            </div>
        `;
        return;
    }

    listEl.innerHTML = history.map(item => {
        const isSelected = window.selectedHistoryIds.has(item.id);
        return `
        <div class="batch-item ${isSelected ? 'selected' : ''}" onclick="loadImportFromHistory('${item.id}')">
            <div class="batch-row-top">
                <div class="batch-checkbox-wrapper" onclick="toggleHistorySelection('${item.id}', event)">
                    <input type="checkbox" ${isSelected ? 'checked' : ''} class="batch-checkbox">
                </div>
                <span class="batch-bank-text">${item.bank}</span>
                <span class="batch-date-right">${new Date(item.date).toLocaleDateString()}</span>
                <button class="btn-icon-sm delete-btn-abs" onclick="deleteImport('${item.id}', event)" title="Delete">✕</button>
            </div>
            <div class="batch-row-bot">
                <span class="batch-filename" title="${item.filename}">${item.filename}</span>
                <span class="batch-count">${item.count} txns</span>
            </div>
        </div>
    `}).join('');
};

window.refreshBatchList = function () {
    window.selectedHistoryIds.clear();
    renderBatchList();
    window.showToast('History refreshed', 'info');
};

// ============================================
// PAGE INITIALIZATION
// ============================================

window.renderDataImportPage = function () {
    const container = document.getElementById('app');

    container.innerHTML = `
        <div class="data-import-container">
            
            <!-- Default Page Header -->
            <div class="page-header" id="default-page-header">
                <h1>Data Import</h1>
                <p class="page-subtitle">Universal import engine for PDF and CSV bank statements</p>
            </div>

            <!-- MOVED TOP: Summary Stats -->
            <div id="preview-summary-wrapper" class="preview-summary-wrapper" style="display: none;">
                <div class="summary-card sleek-card compact-row">
                    <!-- LEFT: Bank Info -->
                    <div class="sc-section sc-info">
                        <div class="sc-bank-row">
                            <span id="summary-bank-name" class="sc-bank-name">Unknown Bank</span>
                            <!-- Clickable Badge for Switching Type -->
                            <span id="account-type-badge" class="badge badge-gray cursor-pointer" onclick="toggleAccountType()" title="Click to switch type">Type</span>
                        </div>
                        <span class="sc-filename" id="sc-filename">Imports loaded</span>
                    </div>

                    <!-- MIDDLE: Metrics -->
                    <div class="sc-section sc-metrics-compact">
                        <div class="metric-group-compact">
                            <label class="metric-label-left">Opening</label>
                            <div class="input-inline-wrapper modern-input-wrapper">
                                <span class="currency-symbol">$</span>
                                <input type="number" id="opening-balance" class="input-inline modern-input" value="0.00" onchange="recalculateTotals()">
                            </div>
                        </div>
                        <div class="metric-divider"></div>
                        <div class="metric-group-compact">
                            <!-- Label ID for In/Credit -->
                            <label id="label-in" class="metric-label-left">Credits <span id="count-in" class="metric-count">(0)</span></label>
                            <span id="summary-total-in" class="val-in left-align">+0.00</span>
                        </div>
                        <div class="metric-divider"></div>
                        <div class="metric-group-compact">
                            <!-- Label ID for Out/Debit -->
                            <label id="label-out" class="metric-label-left">Debits <span id="count-out" class="metric-count">(0)</span></label>
                            <span id="summary-total-out" class="val-out left-align">-0.00</span>
                        </div>
                        <div class="metric-divider"></div>
                        <div class="metric-group-compact highlight">
                            <label class="metric-label-left">Ending</label>
                            <span id="summary-ending-balance" class="val-end left-align">$0.00</span>
                        </div>
                    </div>

                    <!-- RIGHT: Actions Menu -->
                    <div class="sc-section sc-menu">
                        <div class="dropdown-container">
                            <button class="btn-icon-menu" onclick="toggleActionMenu(event)" title="Actions">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </button>
                            <div id="sc-dropdown-menu" class="dropdown-menu hidden">
                                <button onclick="downloadCSV()" class="dropdown-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                                    <span>CSV Export</span>
                                </button>
                                <button onclick="loadToTransactions()" class="dropdown-item">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
                                    <span>To Ledger</span>
                                </button>
                                <div class="dropdown-divider"></div>
                                <button onclick="clearPreview()" class="dropdown-item danger">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>
                                    <span>Clear Data</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Main Layout: Sidebar + Content -->
            <div class="import-layout">
                
                <!-- Left Sidebar: Import Explorer -->
                <aside class="upload-explorer">
                    <div class="explorer-header">
                        <h3>Import History</h3>
                        <div class="explorer-actions">
                             <input type="file" id="sidebar-upload-input" accept=".pdf,.csv,.xls,.xlsx" multiple style="display: none;">
                             <button id="btn-append-selected" class="btn-xs btn-primary-inv" style="display: none;" onclick="handleBatchHistoryLoad()">Append</button>
                             <button class="btn-xs btn-primary-inv" onclick="document.getElementById('sidebar-upload-input').click()" title="Add file">＋ Add</button>
                             <button class="btn-xs btn-secondary" onclick="refreshBatchList()" title="Refresh">🔄</button>
                        </div>
                    </div>
                    <div id="batch-list" class="batch-list"></div>
                </aside>

                <!-- Main Content Area -->
                <main class="import-content">
                    <div id="upload-zone" class="compact-upload-zone">
                        <svg class="upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <div class="upload-text">
                            <span class="upload-main">Drag and drop files here</span>
                            <span class="upload-sub">Limit 200MB per file • PDF, CSV, Excel</span>
                        </div>
                        <button class="btn-browse" onclick="event.stopPropagation(); document.getElementById('import-file-input').click()">Browse files</button>
                        <input type="file" id="import-file-input" accept=".pdf,.csv,.xls,.xlsx" multiple style="display: none;">
                    </div>
                    <div id="preview-section" style="display: none;">
                        <div id="import-preview-grid" class="ag-theme-alpine"></div>
                    </div>
                </main>
            </div>
        </div>

        <div id="append-choice-modal" class="modal-overlay" style="display: none;">
            <div class="modal-card">
                <div class="modal-header">
                    <h3>Import Options</h3>
                    <button class="btn-icon-sm" onclick="closeAppendModal()">✕</button>
                </div>
                <div class="modal-body">
                    <p>Current session has data. How would you like to handle the new selection?</p>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" onclick="confirmReplace()">Start Over (Replace)</button>
                    <button class="btn-primary" onclick="confirmAppend()">Append to Current</button>
                </div>
            </div>
        </div>
        
        <style>
            .data-import-container { padding: 20px; max-width: 1600px; margin: 0 auto; }
            .page-header h1 { margin: 0; font-size: 1.8rem; letter-spacing: -0.02em; }
            .page-subtitle { color: #64748b; margin-top: 4px; }
            .preview-summary-wrapper { margin-top: 0; width: 100%; margin-bottom: 24px; }
            .import-layout { display: grid; grid-template-columns: 320px 1fr; gap: 24px; margin-top: 24px; }
            @media (max-width: 1024px) { .import-layout { grid-template-columns: 1fr; } }

            .upload-explorer {
                background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                padding: 16px; height: fit-content; max-height: 80vh; overflow-y: auto;
            }
            .explorer-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;
            }
            .explorer-header h3 { margin: 0; font-size: 0.95rem; color: #334155; font-weight: 700; }
            .explorer-actions { display: flex; gap: 8px; align-items: center; }
            .btn-primary-inv { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; cursor: pointer; }
            .btn-primary-inv:hover { background: #dbeafe; }
            #btn-append-selected { background: #16a34a; color: white; border: 1px solid #16a34a; }
            #btn-append-selected:hover { background: #15803d; }
            
            .batch-list { display: flex; flex-direction: column; gap: 8px; }
            .batch-item { padding: 10px 12px; border: 1px solid #f1f5f9; border-radius: 8px; cursor: pointer; transition: all 0.2s; position: relative; background: white; }
            .batch-item:hover { border-color: #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .batch-item.selected { border-color: #3b82f6; background: #eff6ff; }
            .batch-row-top { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }
            .batch-checkbox-wrapper { display: flex; align-items: center; }
            .batch-checkbox { cursor: pointer; width: 14px; height: 14px; accent-color: #1d4ed8; }
            .batch-bank-text { font-weight: 600; color: #1e40af; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px; }
            .batch-date-right { margin-left: auto; color: #94a3b8; font-size: 0.7rem; margin-right: 24px; }
            .delete-btn-abs { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #cbd5e1; cursor: pointer; font-size: 14px; padding: 2px; line-height: 1; }
            .delete-btn-abs:hover { color: #ef4444; background: #fee2e2; border-radius: 4px; }
            .batch-row-bot { display: flex; align-items: center; justify-content: space-between; font-size: 0.8rem; margin-left: 22px; }
            .batch-filename { font-weight: 600; color: #0f172a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; margin-right: 8px; }
            .batch-count { color: #94a3b8; font-size: 0.7rem; white-space: nowrap; background: #f1f5f9; padding: 1px 5px; border-radius: 4px; }

            .compact-upload-zone {
                display: flex; align-items: center; gap: 16px; padding: 20px 24px;
                background: white; border: 2px dashed #cbd5e1; border-radius: 8px;
                cursor: pointer; transition: all 0.2s;
            }
            .compact-upload-zone:hover { border-color: #3b82f6; background: #f8fafc; }
            
            .sleek-card {
                background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                padding: 12px 20px; display: flex; align-items: center; justify-content: space-between;
                width: 100%; gap: 24px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03);
            }
            .compact-row { flex-direction: row; flex-wrap: wrap; }
            .sc-section { display: flex; flex-direction: column; justify-content: center; }
            .sc-info { min-width: 200px; }
            .sc-bank-row { display: flex; align-items: center; gap: 8px; margin-bottom: 2px; }
            .sc-bank-name { font-size: 1rem; font-weight: 700; color: #0f172a; } 
            .sc-filename { font-size: 0.75rem; color: #64748b; }
            .sc-metrics-compact { display: flex; flex-direction: row; align-items: center; gap: 16px; flex: 1; justify-content: flex-end; padding-right: 24px; }
            .metric-group-compact { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
            .metric-group-compact label { font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 600; }
            .metric-group-compact span { line-height: 1.2; }
            .metric-group-compact span.val-in { font-size: 0.95rem; font-weight: 600; color: #16a34a; }
            .metric-group-compact span.val-out { font-size: 0.95rem; font-weight: 600; color: #dc2626; }
            .metric-group-compact span.val-end { font-size: 1.1rem; font-weight: 700; color: #0f172a; } 
            .metric-divider { width: 1px; height: 24px; background: #e2e8f0; }

            .input-inline-wrapper { display: flex; align-items: center; gap: 2px; border: 1px solid transparent; border-radius: 4px; padding: 0 4px; transition: all 0.2s; }
            .input-inline-wrapper:hover { background: #f8fafc; border-color: #cbd5e1; }
            .input-inline {
                border: none; background: transparent; width: 80px; text-align: left;
                font-size: 0.95rem; font-weight: 600; color: #334155; outline: none; padding: 0;
            }

            .badge { display: inline-flex; align-items: center; padding: 2px 8px; border-radius: 999px; font-size: 0.6rem; font-weight: 700; text-transform: uppercase; }
            .badge-blue { background: #dbeafe; color: #1e40af; }
            .badge-purple { background: #f3e8ff; color: #6b21a8; }
            .badge-gray { background: #f1f5f9; color: #475569; }
            .cursor-pointer { cursor: pointer; user-select: none; }
            .cursor-pointer:hover { opacity: 0.8; }

            .dropdown-container { position: relative; }
            .btn-icon-menu { background: white; border: 1px solid #e2e8f0; border-radius: 6px; color: #64748b; padding: 6px; cursor: pointer; transition: all 0.2s; height: 32px; width: 32px; display: flex; align-items: center; justify-content: center; }
            .btn-icon-menu:hover { background: #f8fafc; color: #0f172a; border-color: #cbd5e1; }
            
            /* UPDATED DROPDOWN CSS */
            .dropdown-menu {
                position: absolute; top: 100%; right: 0 !important; left: auto !important; margin-top: 4px;
                background: white; border: 1px solid #e2e8f0; border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1); width: 160px; z-index: 1000;
                padding: 4px; display: flex; flex-direction: column;
            }
            .dropdown-menu.hidden { display: none; }
            .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: none; background: none; width: 100%; text-align: left; font-size: 0.85rem; font-weight: 500; color: #334155; cursor: pointer; border-radius: 4px; transition: background 0.1s; }
            .dropdown-item:hover { background: #f1f5f9; }
            .dropdown-item.danger { color: #ef4444; }
            .dropdown-item.danger:hover { background: #fee2e2; }
            .dropdown-divider { height: 1px; background: #e2e8f0; margin: 4px 0; }

            #import-preview-grid { flex: 1; background: white; border-radius: 8px; border: 1px solid #e2e8f0; height: calc(100vh - 280px); min-height: 400px; width: 100%; overflow: hidden; }
            
            .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; }
            .modal-card { background: white; border-radius: 12px; width: 450px; box-shadow: 0 10px 25px rgba(0,0,0,0.15); overflow: hidden; }
            .modal-header { padding: 16px 20px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
            .modal-body { padding: 24px 20px; font-size: 0.95rem; color: #475569; }
            .modal-actions { padding: 16px 20px; background: #f8fafc; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; }
            .btn-primary { background: #1e40af; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
            .btn-secondary { background: white; color: #475569; border: 1px solid #cbd5e1; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; }
        </style>
    `;

    // Initialize
    initializeDataImport();

    // Auto-Close Dropdown Listeners
    setTimeout(() => {
        const container = document.querySelector('.dropdown-container');
        const menu = document.getElementById('sc-dropdown-menu');

        if (container && menu) {
            let closeTimer;

            container.addEventListener('mouseenter', () => {
                if (closeTimer) {
                    clearTimeout(closeTimer);
                    closeTimer = null;
                }
            });

            container.addEventListener('mouseleave', () => {
                closeTimer = setTimeout(() => {
                    menu.classList.add('hidden');
                }, 5000); // 5s Delay
            });
        }
    }, 100);

    // Global click close
    document.addEventListener('click', (e) => {
        const menu = document.getElementById('sc-dropdown-menu');
        if (menu && !menu.classList.contains('hidden')) {
            if (!e.target.closest('.dropdown-container')) {
                menu.classList.add('hidden');
            }
        }
    });

    const sidebarInput = document.getElementById('sidebar-upload-input');
    if (sidebarInput) {
        sidebarInput.addEventListener('change', async (e) => {
            handleSmartUpload(Array.from(e.target.files), Array.from(e.target.files).map(f => f.name));
            e.target.value = ''; // Reset
        });
    }

    // Restore session if exists
    console.log('🔄 Rendering done, checking for session...');
    if (typeof loadSessionState === 'function') {
        loadSessionState();
    } else {
        console.warn('loadSessionState unsupported');
    }
};

function saveSessionState() {
    if (window.currentParsedData && window.currentParsedData.data && window.currentParsedData.data.length > 0) {
        const session = {
            parsedData: window.currentParsedData,
            forcedAccountType: window.forcedAccountType
        };
        localStorage.setItem('ab_import_session', JSON.stringify(session));
    }
}

function loadSessionState() {
    try {
        const saved = localStorage.getItem('ab_import_session');
        if (saved) {
            const session = JSON.parse(saved);
            if (session.parsedData && session.parsedData.data) {
                window.currentParsedData = session.parsedData;
                window.forcedAccountType = session.forcedAccountType || null;

                // Restore UI
                document.getElementById('upload-zone').style.display = 'none';

                // Restore Metadata (Opening Balance)
                if (session.parsedData.metadata && session.parsedData.metadata.openingBalance !== undefined) {
                    const obInput = document.getElementById('opening-balance');
                    if (obInput) {
                        obInput.value = parseFloat(session.parsedData.metadata.openingBalance).toFixed(2);
                        obInput.removeAttribute('readonly');
                    }
                }

                // Re-render preview
                showImmediatePreview({ name: session.parsedData.filename || 'Restored Session' }, session.parsedData.data, false); // false = no new toast
                window.recalculateTotals();
                window.showToast('Restored previous import session', 'info');
            }
        }
    } catch (e) {
        console.error('Failed to load session:', e);
    }
}

function initializeDataImport() {
    renderBatchList();

    const uploadZone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('import-file-input');

    if (uploadZone && fileInput) {
        uploadZone.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON') fileInput.click();
        };

        fileInput.addEventListener('change', async (e) => {
            if (e.target.files.length > 0) {
                handleSmartUpload(Array.from(e.target.files));
            }
        });

        uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.style.transform = 'scale(1.02)'; });
        uploadZone.addEventListener('dragleave', () => { uploadZone.style.transform = 'scale(1)'; });
        uploadZone.addEventListener('drop', (e) => {
            e.preventDefault(); uploadZone.style.transform = 'scale(1)';
            if (e.dataTransfer.files.length > 0) handleSmartUpload(Array.from(e.dataTransfer.files));
        });
    }
}

window.toggleActionMenu = function (e) {
    e.stopPropagation();
    const menu = document.getElementById('sc-dropdown-menu');
    if (menu) menu.classList.toggle('hidden');
};

// ============================================
// MODAL & TOGGLES
// ============================================

window.currentPendingLoad = null;

window.closeAppendModal = function () {
    document.getElementById('append-choice-modal').style.display = 'none';
    window.currentPendingLoad = null;
};

window.confirmAppend = async function () {
    if (window.currentPendingLoad) {
        await executeAppend(window.currentPendingLoad.dataChunks, window.currentPendingLoad.filenames);
    }
    closeAppendModal();
};

window.confirmReplace = async function () {
    if (window.currentPendingLoad) {
        await executeReplace(window.currentPendingLoad.dataChunks, window.currentPendingLoad.filenames);
    }
    closeAppendModal();
};

window.toggleAccountType = function () {
    // Cycle: Auto -> Bank -> Credit Card -> Auto? Or just Bank <-> Card
    // If null, we detect. If set, we toggle.
    if (!window.forcedAccountType) {
        // Assume we toggle to the ONE WE ARE NOT CURRENTLY DETECTING?
        // Let's simplified: If forced is null, set to 'credit_card' (defaulting to bank mostly?).
        // Let's check current badge text
        const badge = document.getElementById('account-type-badge');
        if (badge && badge.textContent.includes('Credit')) {
            window.forcedAccountType = 'bank';
        } else {
            window.forcedAccountType = 'credit_card';
        }
    } else {
        window.forcedAccountType = (window.forcedAccountType === 'bank') ? 'credit_card' : 'bank';
    }

    window.recalculateTotals();
    saveSessionState();
};

// ============================================
// LOADERS
// ============================================

async function handleSmartDataLoad(dataChunks, filenames, metadata = null) {
    if (dataChunks.length === 0) return;

    if (window.currentParsedData && document.getElementById('preview-summary-wrapper').style.display !== 'none') {
        window.currentPendingLoad = { dataChunks, filenames };
        document.getElementById('append-choice-modal').style.display = 'flex';
    } else {
        await executeReplace(dataChunks, filenames, metadata);
    }
}

async function handleSmartUpload(files) {
    if (files.length === 0) return;
    try {
        const { chunks, names, metadata } = await parseFilesToChunks(files);
        await handleSmartDataLoad(chunks, names, metadata);
    } catch (e) {
        window.showToast('Upload error: ' + e.message, 'error');
    }
}

async function executeReplace(dataChunks, filenames, metadata = null) {
    let allData = dataChunks.flat();
    allData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    window.forcedAccountType = null; // Reset on new replace
    const displayFilename = filenames.length === 1 ? filenames[0] : `${filenames.length} Files Loaded`;

    window.showToast(`Loaded ${allData.length} txns`, 'success');
    showImmediatePreview({ name: displayFilename }, allData, true);

    // Attach Metadata to Reset Data object
    if (metadata && window.currentParsedData) {
        window.currentParsedData.metadata = metadata;
    }

    saveSessionState();
}

async function executeAppend(dataChunks, filenames) {
    if (!window.currentParsedData || !window.currentParsedData.data) return executeReplace(dataChunks, filenames);

    let currentData = window.currentParsedData.data;
    let newData = dataChunks.flat();
    let mergedData = [...currentData, ...newData];
    mergedData.sort((a, b) => new Date(a.Date) - new Date(b.Date));

    window.currentParsedData.data = mergedData;
    window.currentParsedData.filename = "Multi-Batch Session";

    window.showToast(`Appended ${newData.length} txns`, 'success');
    window.recalculateTotals();

    const fileLabel = document.getElementById('sc-filename');
    if (fileLabel) fileLabel.textContent = `Merged Session (${mergedData.length} txns)`;
    saveSessionState();
}


async function parseFilesToChunks(files) {
    let chunks = [];
    let names = [];
    let combinedMetadata = {}; // Only support single file metadata effectively for now
    window.showToast(`Parsing ${files.length} files...`, 'info');

    for (const file of files) {
        const fileName = file.name.toLowerCase();
        let parsedData;

        if (fileName.endsWith('.pdf')) {
            if (!window.pdfParser) throw new Error('PDF parser not loaded');
            const result = await window.pdfParser.parsePDF(file);
            console.log('Processed Chunk:', result);

            // Apply Metadata if available
            if (result.metadata) {
                // Store for session
                combinedMetadata = result.metadata;

                if (result.metadata.openingBalance !== null && result.metadata.openingBalance !== undefined) {
                    const obInput = document.getElementById('opening-balance');
                    if (obInput) {
                        obInput.value = result.metadata.openingBalance.toFixed(2);
                        obInput.removeAttribute('readonly');
                    }
                }
            }

            // Map to unified format
            const mapped = result.transactions.map(t => ({
                Date: t.date,
                Description: t.description,
                Amount: t.amount,
                Debit: t.type === 'debit' ? Math.abs(t.amount) : null,
                Credit: t.type === 'credit' ? Math.abs(t.amount) : null,
                Balance: t.Balance !== undefined ? t.Balance : null, // Use extracted Balance
                _bank: result.bank
            }));

            parsedData = mapped;
        } else if (fileName.endsWith('.csv') || fileName.endsWith('.xlsx')) {
            parsedData = await parseCSVFile(file);
        }

        if (parsedData) {
            saveImportToHistory(file, parsedData);
            chunks.push(...parsedData);
            names.push(file.name);
        }
    }
    return { chunks, names, metadata: combinedMetadata };
}

// ============================================
// LOGIC: RECALCULATE & GRID
// ============================================

window.recalculateTotals = function () {
    // 1. Get Opening Balance
    const obInput = document.getElementById('opening-balance');
    let runningBalance = obInput ? parseFloat(obInput.value.replace(/,/g, '')) : 0;
    if (isNaN(runningBalance)) runningBalance = 0;

    let totalIn = 0;
    let totalOut = 0;
    let countIn = 0;
    let countOut = 0;

    // 2. Loop through current parsed data
    if (window.currentParsedData && window.currentParsedData.data) {
        window.currentParsedData.data.forEach(row => {
            let valCredit = 0;
            let valDebit = 0;

            // Check Credit
            // Handle both number and string currency formats
            let rawCredit = row.Credit;
            if (typeof rawCredit === 'string') rawCredit = rawCredit.replace(/[$,]/g, '');
            const credit = parseFloat(rawCredit);

            if (!isNaN(credit) && credit > 0) {
                totalIn += credit;
                countIn++;
                valCredit = credit;
            }

            // Check Debit
            let rawDebit = row.Debit;
            if (typeof rawDebit === 'string') rawDebit = rawDebit.replace(/[$,]/g, '');
            const debit = parseFloat(rawDebit);

            if (!isNaN(debit) && debit > 0) {
                totalOut += debit;
                countOut++;
                valDebit = debit;
            }

            // 3. Calculate Running Balance (OUTSIDE if blocks!)
            runningBalance = runningBalance - valDebit + valCredit;
            row.Balance = runningBalance;
        });

        // Refresh Grid
        if (window.previewGrid && window.previewGrid.api) {
            window.previewGrid.api.refreshCells({ columns: ['Balance'] });
        }
    }

    // 4. Update Summary Cards
    const safeTotalIn = totalIn || 0;
    const safeTotalOut = totalOut || 0;
    const endingBalance = runningBalance;

    // Update DOM
    if (document.getElementById('summary-total-in')) document.getElementById('summary-total-in').textContent = '+' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeTotalIn).replace('$', '');
    if (document.getElementById('summary-total-out')) document.getElementById('summary-total-out').textContent = '-' + new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(safeTotalOut).replace('$', '');
    if (document.getElementById('summary-ending-balance')) document.getElementById('summary-ending-balance').innerText = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(endingBalance);

    // Update Counts (Correct IDs)
    if (document.getElementById('count-in')) document.getElementById('count-in').textContent = `(${countIn})`;
    if (document.getElementById('count-out')) document.getElementById('count-out').textContent = `(${countOut})`;
};
window.toggleAccountType = function () {
    // Simple toggle for now, mostly visual or for 'To Ledger' logic
    const badge = document.getElementById('account-type-badge');
    if (!badge) return;

    if (badge.textContent.includes('Bank')) {
        badge.textContent = 'Credit Card';
        badge.className = 'badge badge-purple cursor-pointer';
        window.forcedAccountType = 'Credit Card';
    } else {
        badge.textContent = 'Bank Account';
        badge.className = 'badge badge-blue cursor-pointer';
        window.forcedAccountType = 'Bank Account';
    }
    // Re-run calc in case logic changes
    window.recalculateTotals();
    saveSessionState();
};

function showImmediatePreview(file, parsedData, replace = true) {
    document.getElementById('upload-zone').style.display = 'none';
    const defaultHeader = document.getElementById('default-page-header');
    if (defaultHeader) defaultHeader.style.display = 'none';

    document.getElementById('preview-summary-wrapper').style.display = 'block';
    document.getElementById('preview-section').style.display = 'block';

    if (replace) {
        window.currentParsedData = {
            filename: file.name,
            data: parsedData
        };
    }

    const bankName = (parsedData.length > 0 && parsedData[0]._bank) ? parsedData[0]._bank : 'Unknown Bank';
    const bankEl = document.getElementById('summary-bank-name');
    if (bankEl) bankEl.textContent = bankName;

    const fileEl = document.getElementById('sc-filename');
    if (fileEl) fileEl.textContent = file.name;

    window.recalculateTotals();

    if (!window.previewGrid) {
        renderPreviewGrid(parsedData);
    } else {
        // Just refresh data
        if (window.previewGrid.api) {
            window.previewGrid.api.setGridOption('rowData', parsedData);
            window.previewGrid.api.refreshCells({ force: true });
        }
    }
}

function renderPreviewGrid(parsedData) {
    const gridDiv = document.getElementById('import-preview-grid');
    if (!gridDiv) return;

    gridDiv.innerHTML = '';

    const columnDefs = [
        {
            field: 'Date', headerName: 'Date', width: 120, sort: 'asc', sortable: true,
            comparator: (d1, d2) => new Date(d1).getTime() - new Date(d2).getTime(),
            resizable: true,
            valueFormatter: p => {
                if (!p.value) return '';
                const d = new Date(p.value);
                if (isNaN(d.getTime())) return p.value;
                return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }
        },
        { field: 'Description', headerName: 'Description', flex: 1, minWidth: 250, sortable: true, wrapText: false, autoHeight: false, resizable: true },
        {
            field: 'Debit', headerName: 'Debit', width: 110, sortable: true, resizable: true, type: 'numericColumn',
            valueFormatter: p => {
                const val = parseFloat(p.value) || 0;
                if (val === 0) return '';
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
            },
            cellStyle: { textAlign: 'right', color: '#dc2626' }
        },
        {
            field: 'Credit', headerName: 'Credit', width: 110, sortable: true, resizable: true, type: 'numericColumn',
            valueFormatter: p => {
                const val = parseFloat(p.value) || 0;
                if (val === 0) return '';
                return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Math.abs(val));
            },
            cellStyle: { textAlign: 'right', color: '#16a34a' }
        },
        {
            field: 'Balance', headerName: 'Balance', width: 120, sortable: true, resizable: true, type: 'numericColumn',
            valueFormatter: p => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(p.value) || 0),
            cellStyle: p => ({ textAlign: 'right', fontWeight: 'bold', color: (parseFloat(p.value) || 0) < 0 ? '#dc2626' : '#16a34a' })
        },
        {
            headerName: 'Action',
            width: 100,
            cellStyle: { textAlign: 'center' },
            cellRenderer: params => {
                return `
                    <div style="display: flex; gap: 4px; justify-content: center; height: 100%; align-items: center;">
                        <button onclick="window.previewActionSwap(${params.node.rowIndex})" title="Swap Sign (Credit/Debit)" 
                                style="border: none; background: none; cursor: pointer; opacity: 0.6; padding: 4px; font-size: 14px;"
                                onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">
                            ⇄
                        </button>
                        <button onclick="window.previewActionDelete(${params.node.rowIndex})" title="Delete Row" 
                                style="border: none; background: none; cursor: pointer; opacity: 0.6; padding: 4px; font-size: 14px; color: #dc2626;"
                                onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">
                            ✕
                        </button>
                    </div>
                `;
            }
        }
    ];

    const gridOptions = {
        columnDefs, rowData: parsedData, defaultColDef: { resizable: true, sortable: true, filter: true },
        domLayout: 'normal', headerHeight: 40, rowHeight: 40, enableCellTextSelection: true,
        onGridReady: (params) => {
            window.previewGrid = params;

            // Wait for visibility to resize
            const safecounter = 0;
            const checkVisible = setInterval(() => {
                const w = gridDiv.offsetWidth;
                if (w > 0) {
                    params.api.sizeColumnsToFit();
                    clearInterval(checkVisible);
                } else if (safecounter > 20) { // 2 seconds max
                    clearInterval(checkVisible);
                }
            }, 100);

            window.addEventListener('resize', () => { setTimeout(() => { params.api.sizeColumnsToFit(); }, 200); });
        }
    };

    agGrid.createGrid(gridDiv, gridOptions);
}

window.downloadCSV = function () {
    if (!window.currentParsedData) return;
    const { filename, data } = window.currentParsedData;
    const headers = ['Date', 'Description', 'Amount', 'Debit', 'Credit', 'Balance'];
    const csvContent = [
        headers.join(','),
        ...data.map(row => [
            row.Date, `"${(row.Description || '').replace(/"/g, '""')}"`, row.Amount, row.Debit || '', row.Credit || '', row.Balance || ''
        ].join(','))
    ].join('\n');

    // BOM added for Excel compatibility
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename.replace('.pdf', '.csv'); a.click();
    URL.revokeObjectURL(url);
    window.showToast('CSV downloaded', 'success');
};

// --- PREVIEW GRID ACTIONS ---

window.previewActionSwap = function (rowIndex) {
    if (!window.currentParsedData || !window.currentParsedData.data) return;

    const row = window.currentParsedData.data[rowIndex];
    if (!row) return;

    // Swap Logic
    // If it was Credit, make it Debit.
    // row.Credit / row.Debit are strings or numbers?
    // In parser we store: "Credit": "1,234.56" usually for CSV? 
    // Wait, PDF parser returns objects: { amount: 123.45, type: 'credit/debit' }
    // BUT the Grid uses flat data.
    // Let's check how we map it. 
    // Actually PDF parser output is clean list of objects.
    // But RenderPreviewGrid receives that clean list.
    // The columns are 'Debit', 'Credit'.
    // The parser output has: { amount, type }
    // Wait, renderPreviewGrid expects fields: 'Debit', 'Credit'.
    // BUT pdf-parser.js returns: { amount, type, ... }
    // AND data-import.js converts it?

    // Ah, wait. In `processFiles` (which I didn't read fully today, but recall):
    // The CSV parser likely outputs Debit/Credit columns directly.
    // The PDF parser outputs `type` and `amount`.
    // We need to normalize or handle both.

    // Let's look at `renderPreviewGrid` again.
    // It has columns: field: 'Debit', field: 'Credit'.
    // If our data from PDF parser is { amount: 100, type: 'credit' },
    // AG Grid won't show it unless we mapped it.

    // Re-reading `loadSessionState` or `parsePDF` usage...
    // Ah, `extractRBCTransactions` pushed: { amount, type }.
    // It does NOT have 'Debit' or 'Credit' keys.
    // SO... how is the grid showing anything?
    // Maybe `renderPreviewGrid` handles it?
    // No, I saw the colDefs. `field: 'Credit'`.

    // CHECKPOINT: Only CSVs might have worked with this grid before?
    // OR `parsePDF` returns data with Debit/Credit keys?
    // Let's check `pdf-parser.js` return structure again.
    // It pushes { amount, type }. 
    // It seems I might have broken the grid display for PDF if I didn't map it.
    // BUT user screenshot showed data. So maybe `processFiles` does mapping?
    // I need to be careful.

    // Assuming the row object HAS `Debit` and `Credit` properties (or mapped ones).
    // If it's the `parsePDF` output directly, it won't work with `field: 'Debit'`.
    // EXCEPT if `smart-csv-parser` is used for CSVs, and `pdf-parser` for PDFs.

    // Let's assume the data in `window.currentParsedData.data` matches the Grid Fields.
    // If so:
    let valDebit = parseFloat(row.Debit) || 0;
    let valCredit = parseFloat(row.Credit) || 0;

    if (valCredit > 0) {
        // Swap to Debit
        row.Debit = valCredit;
        row.Credit = '';
        // Update Internal Type if present
        row.type = 'debit';
        row.amount = valCredit;
    } else if (valDebit > 0) {
        // Swap to Credit
        row.Credit = valDebit;
        row.Debit = '';
        row.type = 'credit';
        row.amount = valDebit;
    }

    // Refresh Grid
    if (window.previewGrid && window.previewGrid.api) {
        window.previewGrid.api.applyTransaction({ update: [row] });
        window.previewGrid.api.refreshCells({ force: true });
    }

    window.recalculateTotals();
    saveSessionState();
};

window.previewActionDelete = function (rowIndex) {
    if (!window.currentParsedData || !window.currentParsedData.data) return;

    // Remove from array
    // Careful: rowIndex in Grid usually matches array index if unsorted/unfiltered.
    // Better to get node.

    // Let's accept we modify the data array at index.
    const deletedRow = window.currentParsedData.data.splice(rowIndex, 1)[0];

    // Refresh Grid
    if (window.previewGrid && window.previewGrid.api) {
        window.previewGrid.api.setGridOption('rowData', window.currentParsedData.data);
    }

    window.recalculateTotals();
    saveSessionState();
    window.showToast('Transaction deleted', 'info');
};

function clearPreview() {
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('preview-summary-wrapper').style.display = 'none';
    const defaultHeader = document.getElementById('default-page-header');
    if (defaultHeader) defaultHeader.style.display = 'block';

    document.getElementById('upload-zone').style.display = 'flex';
    window.currentParsedData = null;
    document.getElementById('import-preview-grid').innerHTML = '';
    window.selectedHistoryIds.clear();
    localStorage.removeItem('ab_import_session');
    renderBatchList();
}

window.loadToTransactions = async function () {
    if (!window.currentParsedData) return;
    const { data } = window.currentParsedData;

    // Use the main app's storage logic if available
    let savedCount = 0;

    // 1. Ensure we have an account ID
    // If we have a 'currentImportAccount' likely from manual selection or context
    let targetAccountId = window.currentImportAccount ? window.currentImportAccount.id : null;

    // If not, ask the user
    if (!targetAccountId) {
        try {
            const account = await window.selectTargetAccount();
            if (account) {
                targetAccountId = account.id;
                window.currentImportAccount = account; // cache it
            } else {
                return; // User cancelled
            }
        } catch (e) {
            console.warn('Account selection cancelled');
            return;
        }
    }

    if (!targetAccountId) {
        alert('An account must be selected to save to the ledger.');
        return;
    }

    // 2. Check for Existing Ledger Data
    let shouldClear = false;
    let existingCount = 0;

    // Check local storage directly for speed/fallback, or use storage API if exposing counting
    const currentStored = localStorage.getItem('ab3_transactions');
    if (currentStored) {
        const parsed = JSON.parse(currentStored);
        existingCount = parsed.length;
    }

    if (existingCount > 0) {
        try {
            const resolution = await window.promptLedgerResolution(existingCount);
            if (resolution === 'replace') {
                shouldClear = true;
            }
        } catch (e) {
            console.log('Ledger load cancelled by user');
            return;
        }
    }

    if (shouldClear) {
        // Clear all transactions or just for this account? 
        // "Start New" usually implies "This is my new truth".
        // Use storage API if available to clear
        if (window.storage && window.storage.clearAllTransactions) {
            window.storage.clearAllTransactions();
        } else {
            localStorage.setItem('ab3_transactions', '[]');
        }
        window.showToast('Existing ledger cleared.', 'info');
    }

    window.showToast('Importing to Ledger...', 'info');

    // Process sequentially to ensure storage sync
    for (const txn of data) {
        // Determine Type and Amount safely
        let amount = 0;
        let type = 'debit';

        let creditVal = parseFloat(txn.Credit);
        // Handle currency string
        if (typeof txn.Credit === 'string') creditVal = parseFloat(txn.Credit.replace(/[$,]/g, ''));

        let debitVal = parseFloat(txn.Debit);
        // Handle currency string
        if (typeof txn.Debit === 'string') debitVal = parseFloat(txn.Debit.replace(/[$,]/g, ''));

        const rawAmt = parseFloat(txn.Amount);

        if (!isNaN(creditVal) && creditVal > 0) {
            type = 'credit';
            amount = creditVal;
        } else if (!isNaN(debitVal) && debitVal > 0) {
            type = 'debit';
            amount = debitVal;
        } else if (!isNaN(rawAmt)) {
            type = rawAmt >= 0 ? 'credit' : 'debit';
            amount = Math.abs(rawAmt);
        }

        const transactionObj = {
            date: txn.Date,
            description: txn.Description,
            amount: amount,
            type: type,
            category: 'Uncategorized',
            accountId: targetAccountId, // PASSED HERE
            reconciled: false
        };

        if (window.storage && window.storage.createTransaction) {
            try {
                await window.storage.createTransaction(transactionObj);
                savedCount++;
            } catch (e) {
                console.error('Failed to save txn:', e);
            }
        } else {
            // Fallback (Legacy)
            const existing = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
            transactionObj.id = 'txn_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            existing.push(transactionObj);
            localStorage.setItem('ab3_transactions', JSON.stringify(existing));
            savedCount++;
        }
    }

    window.showToast(`Successfully saved ${savedCount} transactions`, 'success');

    // Trigger Auto-Categorize & Sanitize
    setTimeout(() => {
        // Clear session on successful commit
        localStorage.removeItem('ab_import_session');

        if (window.sanitizeData) {
            // console.log('Running Post-Import Sanitization');
            window.sanitizeData();
        }
        window.router.navigate('/transactions');
    }, 500);
};

// Modal for Ledger Resolution
window.promptLedgerResolution = function (count) {
    return new Promise((resolve, reject) => {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal-overlay';
        modalDiv.style.zIndex = '3500'; // Very high z-index

        modalDiv.innerHTML = `
        <div class="modal-card">
            <div class="modal-header">
                <h3>Ledger Has Data</h3>
                <button id="cancel-ledger-res" class="btn-icon-sm">✕</button>
            </div>
            <div class="modal-body">
                <p>The Ledger currently contains <strong>${count} transactions</strong>.</p>
                <p style="margin-top: 8px;">Do you want to append the new data or start fresh?</p>
            </div>
            <div class="modal-actions">
                <button id="action-replace" class="btn-secondary" style="border-color: #ef4444; color: #ef4444;">Start New (Overwrite)</button>
                <button id="action-append" class="btn-primary">Append to Existing</button>
            </div>
        </div>
        `;

        document.body.appendChild(modalDiv);

        // Handlers
        modalDiv.querySelector('#cancel-ledger-res').onclick = () => {
            modalDiv.remove();
            reject('cancelled');
        };

        modalDiv.querySelector('#action-replace').onclick = () => {
            if (confirm('Are you sure? This will delete ALL existing transactions in the ledger.')) {
                modalDiv.remove();
                resolve('replace');
            }
        };

        modalDiv.querySelector('#action-append').onclick = () => {
            modalDiv.remove();
            resolve('append');
        };
    });
};

// Account Selection Modal (Generic)
window.selectTargetAccount = function () {
    return new Promise((resolve, reject) => {
        const accounts = window.accountManager ? window.accountManager.getAllAccounts() : [];
        if (accounts.length === 0) {
            alert('No accounts found. Please create one in Accounts page first.');
            reject('no accounts');
            return;
        }

        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal-overlay';
        modalDiv.style.zIndex = '3000'; // High z-index

        modalDiv.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>Select Target Account</h3>
                    <button class="btn-icon" onclick="this.closest('.modal-overlay').remove();">×</button>
                </div>
                <div class="modal-body">
                    <p style="margin-bottom: 12px; color: #64748b;">Which account do these transactions belong to?</p>
                    <select id="target-account-select" style="width: 100%; padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 1rem;">
                        ${accounts.map(acc => `<option value="${acc.id}">
                            ${acc.type === 'bank' ? '🏦' : '💳'} ${acc.accountName || acc.name}
                        </option>`).join('')}
                    </select>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" id="cancel-account-select">Cancel</button>
                    <button class="btn-primary" id="confirm-account-select">Continue</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);

        // Handlers
        modalDiv.querySelector('#cancel-account-select').onclick = () => {
            modalDiv.remove();
            reject('cancelled');
        };

        modalDiv.querySelector('#confirm-account-select').onclick = () => {
            const select = modalDiv.querySelector('#target-account-select');
            const accountId = select.value;
            const account = accounts.find(a => a.id === accountId);
            modalDiv.remove();
            resolve(account);
        };
    });
};

function formatMoney(val) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val || 0); }

async function parseCSVFile(file) {
    if (window.SmartCSV) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const rawText = e.target.result;
                    // Smart Parser returns [{date, description, debit, credit...}]
                    const transactions = window.SmartCSV.parse(rawText);

                    // Normalize to Data Import Page Format (Capitalized keys)
                    const normalized = transactions.map(t => ({
                        Date: t.date,
                        Description: t.description,
                        Debit: t.debit,
                        Credit: t.credit,
                        Amount: t.amount, // SmartCSV might not return this if split, but let's see
                        _bank: 'CSV Import'
                    }));

                    resolve(normalized);
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    // Legacy Fallback
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
            } catch (error) { reject(error); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
    });
}
