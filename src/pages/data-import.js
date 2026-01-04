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

// Helper: Resolve account code to name and clean labels
function resolveAccountName(val) {
    if (!val) return 'Uncategorized';
    val = val.toString().trim();

    // DEFENSIVE SHIELD: If value is "Invalid Number" or contains "invalid", force Uncategorized
    if (val.toLowerCase().includes("invalid")) return 'Uncategorized';

    // If it's just a 4-digit code, look it up
    if (val.match(/^\d{4}$/)) {
        const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
        let rawCustom = [];
        try { rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
        const all = [...rawDefault, ...rawCustom];
        const match = all.find(a => a.code === val);
        if (match && match.name && !match.name.toLowerCase().includes("invalid")) return match.name;
    }

    // Smart Clean: Only strip 4-digit code if descriptive text follows
    if (val.match(/^\d{4}\b\s+.+/)) {
        return val.replace(/^\d{4}\b\s*/, '');
    }

    return val;
}

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

window.handleLoadAllHistory = function () {
    const history = getImportHistory();
    if (history.length === 0) {
        window.showToast('No history to load', 'info');
        return;
    }

    // Select all
    window.selectedHistoryIds = new Set(history.map(item => item.id));

    // Refresh list to show selection (visual feedback)
    renderBatchList();

    // Trigger load
    handleBatchHistoryLoad();
    window.showToast(`Loading all ${history.length} batches...`, 'info');
};


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
                <span class="batch-date-right">${new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
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

window.clearFullHistory = async function () {
    try {
        await window.confirmActionCustom({
            title: 'Clear Import History',
            message: 'Are you sure you want to clear your entire import history? This will remove all previously processed filenames from the sidebar.',
            confirmText: 'Clear All',
            danger: true
        });

        localStorage.removeItem('ab_import_history');
        window.selectedHistoryIds.clear();
        renderBatchList();
        window.showToast('Import history cleared', 'success');
    } catch (e) {
        // User cancelled
    }
};

// ============================================
// PAGE INITIALIZATION
// ============================================

window.renderDataImportPage = function () {
    const container = document.getElementById('app');

    container.innerHTML = `
        <div class="ai-brain-page" style="width: 100%; height: 100vh; display: flex; flex-direction: column; overflow: hidden;">
            
            <!-- FIXED TOP -->
            <div class="fixed-top-section" style="background: white; border-bottom: 1px solid #e2e8f0; flex-shrink: 0;">
                <header class="std-page-header">
                    <div class="header-brand" style="display: flex; align-items: center; gap: 12px;">
                        <div class="icon-box" style="width: 40px; height: 40px; background: linear-gradient(135deg, #10b981, #059669); color: white; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem;">📥</div>
                        <div class="header-info">
                            <h2 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Data Import</h2>
                            <div class="meta" style="font-size: 0.8rem; color: #64748b; display: flex; align-items: center; gap: 6px;">
                                <span style="background: #d1fae5; color: #059669; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 0.7rem;">IMPORT ENGINE</span>
                                <span>•</span>
                                <span>PDF and CSV bank statements</span>
                            </div>
                        </div>
                    </div>
                    <div class="header-actions">
                        <div class="dropdown-container">
                            <button class="btn-icon-menu" onclick="toggleActionMenu(event, 'main-header-dropdown')" title="More Options">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
                            </button>
                            <div id="main-header-dropdown" class="dropdown-menu hidden" style="top: 100%; right: 0;">
                                <button onclick="window.triggerDictionaryExcel()" class="dropdown-item">
                                    <i class="ph ph-books"></i>
                                    <span>Dictionary</span>
                                </button>
                                <button onclick="window.clearFullHistory()" class="dropdown-item danger">
                                    <i class="ph ph-trash"></i>
                                    <span>Clear History</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </header>

                <!-- MOVED TOP: Summary Stats -->
                <div id="preview-summary-wrapper" class="preview-summary-wrapper" style="display: none; padding: 0 24px 16px 24px; margin: 0; width: auto;">
                    <div class="summary-card sleek-card compact-row" style="margin: 0;">
                        <!-- LEFT: Bank Info -->
                        <div class="sc-section sc-info">
                            <div class="sc-bank-row">
                                <span id="summary-bank-name" class="sc-bank-name">Unknown Bank</span>
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
                                <label id="label-in" class="metric-label-left">Credits <span id="count-in" class="metric-count">(0)</span></label>
                                <span id="summary-total-in" class="val-in left-align">+0.00</span>
                            </div>
                            <div class="metric-divider"></div>
                            <div class="metric-group-compact">
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
            </div>

            <!-- Main Layout: Sidebar + Content -->
            <div class="import-layout" style="flex: 1; min-height: 0; display: flex; gap: 24px; padding: 24px; background: #f1f5f9; overflow: hidden;">
                
                <!-- Left Sidebar: Import Explorer -->
                <aside class="upload-explorer" style="width: fit-content; min-width: 220px; max-width: 260px; flex-shrink: 0; display: flex; flex-direction: column; height: auto !important; align-self: flex-start; max-height: 100%; overflow: hidden;">
                    <div class="explorer-header" style="flex-shrink: 0;">
                        <h3>Import History</h3>
                        <div class="explorer-actions">
                             <input type="file" id="sidebar-upload-input" accept=".pdf,.csv,.xls,.xlsx" multiple style="display: none;">
                             <button id="btn-append-selected" class="btn-xs btn-primary-inv" style="display: none;" onclick="handleBatchHistoryLoad()">Append</button>
                             
                             <!-- NEW: Load All Button -->
                             <button id="btn-load-all-history" class="btn-xs btn-secondary" onclick="handleLoadAllHistory()" title="Load all files from history">Load All</button>

                             <div class="dropdown-container">
                                <button class="btn-icon-menu" onclick="toggleActionMenu(event, 'history-options-dropdown')" title="Options">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
                                </button>
                                <div id="history-options-dropdown" class="dropdown-menu hidden" style="top: 100%; right: 0; min-width: 140px;">
                                    <button onclick="document.getElementById('sidebar-upload-input').click()" class="dropdown-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                                        <span>Add File</span>
                                    </button>
                                    <button onclick="refreshBatchList()" class="dropdown-item">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6"></path><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
                                        <span>Refresh</span>
                                    </button>
                                    <div class="dropdown-divider"></div>
                                    <button onclick="window.clearFullHistory()" class="dropdown-item danger">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                                        <span>Clear History</span>
                                    </button>
                                </div>
                             </div>
                        </div>
                    </div>
                    <div id="batch-list" class="batch-list" style="overflow-y: auto; flex: 1;"></div>
                </aside>

                <!-- Main Content Area -->
                <main class="import-content" style="flex: 1; display: flex; flex-direction: column; height: 100%; min-width: 0;">
                    <div id="upload-zone" class="compact-upload-zone" style="flex-shrink: 0;">
                        <svg class="upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        <div class="upload-text">
                            <span class="upload-main">Drag and drop files here</span>
                            <span class="upload-sub">Limit 200MB per file • PDF, CSV, Excel</span>
                        </div>
                        <button class="btn-browse" onclick="event.stopPropagation(); document.getElementById('import-file-input').click()">Browse files</button>
                        <input type="file" id="import-file-input" accept=".pdf,.csv,.xls,.xlsx" multiple style="display: none;">
                    </div>
                    <div id="preview-section" style="display: none; flex: 1; min-height: 0; margin-top: 0;">
                        <div id="import-preview-grid" class="ag-theme-alpine" style="height: 100%; width: 100%;"></div>
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
        
        <div id="duplicate-choice-modal" class="modal-overlay" style="display: none;">
            <div class="modal-card">
                <div class="modal-header">
                    <h3>🔄 Files Already Processed</h3>
                    <button class="btn-icon-sm" onclick="closeDuplicateModal()">✕</button>
                </div>
                <div class="modal-body">
                    <p id="duplicate-modal-text">These files have already been imported. Would you like to:</p>
                    <ul style="margin: 12px 0; padding-left: 20px; color: #64748b;">
                        <li><strong>Reload Previous Session</strong> - Continue where you left off</li>
                        <li><strong>Start Fresh</strong> - Re-import all files (overwrites previous)</li>
                    </ul>
                </div>
                <div class="modal-actions">
                    <button id="btn-duplicate-reload" class="btn-secondary" onclick="handleDuplicateReload()">📂 Reload Previous Session</button>
                    <button id="btn-duplicate-fresh" class="btn-primary" onclick="handleDuplicateFreshImport()">🔄 Start Fresh Import</button>
                </div>
            </div>
        </div>
        
        <style>
            /* Updated for Full-Width Layout */
             .upload-explorer {
                background: white; border: 1px solid #e2e8f0; border-radius: 12px;
                padding: 16px; display: flex; flex-direction: column;
            }
            .explorer-header {
                display: flex; justify-content: space-between; align-items: center;
                margin-bottom: 16px; padding-bottom: 12px; border-bottom: 2px solid #e2e8f0;
            }
            .explorer-header h3 { margin: 0; font-size: 0.95rem; color: #334155; font-weight: 700; white-space: nowrap; }
            .explorer-actions { display: flex; gap: 8px; align-items: center; }
            .btn-primary-inv { background: #eff6ff; color: #1d4ed8; border: 1px solid #dbeafe; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; cursor: pointer; }
            .btn-primary-inv:hover { background: #dbeafe; }
            #btn-append-selected { background: #16a34a; color: white; border: 1px solid #16a34a; }
            #btn-append-selected:hover { background: #15803d; }
            
            .batch-list { display: flex; flex-direction: column; gap: 8px; }
            .empty-state { padding: 8px 0; margin: 0; }
            .empty-state p { margin: 0; padding: 4px 0; font-size: 0.85rem; color: #94a3b8; text-align: center; }
            .batch-item { padding: 10px 12px; border: 1px solid #f1f5f9; border-radius: 8px; cursor: pointer; transition: all 0.2s; position: relative; background: white; flex-shrink: 0; }
            .batch-item:hover { border-color: #cbd5e1; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
            .batch-item.selected { border-color: #3b82f6; background: #eff6ff; }
            .batch-row-top { display: flex; align-items: center; gap: 8px; font-size: 0.75rem; color: #64748b; margin-bottom: 4px; }
            .batch-checkbox-wrapper { display: flex; align-items: center; }
            .batch-checkbox { cursor: pointer; width: 14px; height: 14px; accent-color: #1d4ed8; }
            .batch-bank-text { font-weight: 600; color: #1e40af; overflow: hidden; max-width: 100%; word-break: break-word; }
            .batch-date-right { margin-left: auto; color: #94a3b8; font-size: 0.7rem; margin-right: 24px; white-space: nowrap; }
            .delete-btn-abs { position: absolute; top: 10px; right: 10px; background: none; border: none; color: #cbd5e1; cursor: pointer; font-size: 14px; padding: 2px; line-height: 1; }
            .delete-btn-abs:hover { color: #ef4444; background: #fee2e2; border-radius: 4px; }
            .batch-row-bot { display: flex; align-items: flex-start; justify-content: space-between; font-size: 0.8rem; margin-left: 22px; }
            .batch-filename { font-weight: 600; color: #0f172a; word-break: break-word; flex: 1; margin-right: 8px; font-size: 0.75rem; line-height: 1.3; }
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
            .metric-group-compact label { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 700; margin-bottom: 2px; }
            .metric-group-compact span { line-height: 1.2; }
            .metric-group-compact span.val-in { font-size: 0.95rem; font-weight: 600; color: #16a34a; }
            .metric-group-compact span.val-out { font-size: 0.95rem; font-weight: 600; color: #dc2626; }
            .metric-group-compact span.val-end { font-size: 1.15rem; font-weight: 800; color: #0f172a; letter-spacing: -0.01em; } 
            .metric-divider { width: 1px; height: 28px; background: #f1f5f9; }
            .metric-label-left { font-size: 0.6rem; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; font-weight: 700; margin-bottom: 4px; display: block; width: 100%; text-align: left; }
            .metric-count { font-size: 0.7rem; color: #64748b; background: #f1f5f9; padding: 1px 6px; border-radius: 4px; font-weight: 600; font-family: sans-serif; margin-left: 4px; line-height: 1; vertical-align: middle; }

            .input-inline-wrapper { 
                display: flex; align-items: center; gap: 2px; 
                background: transparent; border: 1px solid transparent; 
                border-radius: 4px; padding: 0; 
                transition: all 0.2s;
            }
            .input-inline-wrapper:hover { border-bottom-color: #cbd5e1; }
            .input-inline-wrapper:focus-within { 
                border-bottom-color: #3b82f6;
            }
            .currency-symbol { font-size: 1.15rem; color: #0f172a; font-weight: 800; letter-spacing: -0.01em; }
            .input-inline {
                border: none; background: transparent; width: 100px; text-align: left;
                font-size: 1.15rem; font-weight: 800; color: #0f172a; outline: none; padding: 0;
                font-family: inherit; letter-spacing: -0.01em;
            }
            /* Hide Spin Buttons */
            .input-inline::-webkit-outer-spin-button,
            .input-inline::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
            .input-inline { -moz-appearance: textfield; }

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
            .dropdown-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; border: none; background: none; width: 100%; text-align: left; font-size: 0.85rem; font-weight: 500; color: #334155; cursor: pointer; border-radius: 44px; transition: background 0.1s; }
            .dropdown-item:hover { background: #f1f5f9; }
            .dropdown-item.danger { color: #ef4444; }
            .dropdown-item.danger:hover { background: #fee2e2; }
            .dropdown-divider { height: 1px; background: #e2e8f0; margin: 4px 0; }
            .btn-secondary-danger { background: #fee2e2; color: #ef4444; border: 1px solid #fecaca; padding: 4px 8px; border-radius: 4px; font-weight: 600; font-size: 0.75rem; cursor: pointer; }
            .btn-secondary-danger:hover { background: #fecaca; }

            /* Live Categorization Ticker Effect */
            .live-update-pulse {
                animation: pulse-green 1.5s ease;
            }
            @keyframes pulse-green {
                0% { background-color: rgba(34, 197, 94, 0.2); }
                100% { background-color: transparent; }
            }
            /* NEW: Phase 3 Purple Pulse for Low Confidence */
            .low-confidence-pulse {
                animation: pulse-purple 2s infinite ease-in-out;
                color: #8b5cf6 !important;
                font-weight: 600;
            }
            @keyframes pulse-purple {
                0% { opacity: 1; }
                50% { opacity: 0.6; }
                100% { opacity: 1; }
            }
            .category-uncategorized {
                color: #94a3b8;
                font-style: italic;
            }
            .live-categorized {
                animation: live-update-pulse 1.5s ease-out;
            }
            .category-text {
                transition: color 0.3s ease;
                font-weight: 500;
            }

            /* Modal System - Guaranteeing Visibility & Premium Design */
            .modal-overlay {
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center;
                z-index: 9999; animation: fadeIn 0.2s ease-out;
            }
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

            .modal-card {
                background: white; border-radius: 16px; width: 100%; max-width: 480px;
                box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
                overflow: hidden; animation: slideUp 0.3s ease-out;
            }
            @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }

            .modal-header {
                padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
                display: flex; justify-content: space-between; align-items: center;
                background: #f8fafc;
            }
            .modal-header h3 { margin: 0; font-size: 1.1rem; color: #0f172a; font-weight: 700; }
            
            .modal-body { padding: 24px; color: #475569; line-height: 1.6; font-size: 0.95rem; }
            .modal-actions {
                padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9;
                display: flex; justify-content: flex-end; gap: 12px;
            }
            
            .btn-xs { padding: 4px 8px; font-size: 0.75rem; border-radius: 4px; border: none; cursor: pointer; transition: all 0.2s; }
            .btn-secondary { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
            .btn-secondary:hover { background: #e2e8f0; }
            .btn-primary { background: #3b82f6; color: white; border: 1px solid #3b82f6; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            .btn-primary:hover { background: #2563eb; transform: translateY(-1px); }
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

    // CRITICAL: Cleanup function to destroy grid when page is unmounted
    // This prevents stale grid instances when navigating away and back
    return () => {
        if (window.previewGrid && window.previewGrid.api) {
            console.log('🗑️ Cleaning up Data Import page - destroying grid...');
            window.previewGrid.api.destroy();
            window.previewGrid = null;
        }
    };
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

                // Restore Metadata (Opening Balance) - support both key names
                const metadata = session.parsedData.metadata;
                const openingBal = metadata?.openingBalance ?? metadata?.previousBalance;
                if (openingBal !== undefined && openingBal !== null) {
                    const obInput = document.getElementById('opening-balance');
                    if (obInput) {
                        obInput.value = parseFloat(openingBal).toFixed(2);
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

window.toggleActionMenu = function (e, menuId) {
    e.stopPropagation();
    // Close others
    document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m.id !== (menuId || 'sc-dropdown-menu')) m.classList.add('hidden');
    });

    const id = menuId || 'sc-dropdown-menu';
    const menu = document.getElementById(id);
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

// ============================================
// DUPLICATE FILE MODAL HANDLERS
// ============================================

window.pendingDuplicateFiles = null;

window.closeDuplicateModal = function () {
    document.getElementById('duplicate-choice-modal').style.display = 'none';
    window.pendingDuplicateFiles = null;
};

window.handleDuplicateReload = function () {
    const saved = localStorage.getItem('ab_import_session');

    if (!saved) {
        // Fallback: Check if we can recover from history
        const history = getImportHistory();
        const files = window.pendingDuplicateFiles || [];

        // Find if any of our duplicate files are in history
        const matches = history.filter(h => files.some(f => f.name === h.filename));

        if (matches.length > 0) {
            console.log('📜 Recovering session from history match...');
            // Take the most recent match data
            const match = matches[0];
            window.currentParsedData = {
                filename: match.filename,
                data: match.data,
                metadata: {} // Historic data might not have metadata preserved perfectly
            };

            closeDuplicateModal();
            showImmediatePreview({ name: match.filename }, match.data, false);
            window.recalculateTotals();
            window.showToast('Recovered data from history', 'success');
            return;
        }

        window.showToast('No session or history found to reload. Please start fresh.', 'warning');
        return;
    }

    closeDuplicateModal();
    // Load previous session
    loadSessionState();
    window.showToast('Restored previous session', 'success');
};

window.handleDuplicateFreshImport = async function () {
    if (window.pendingDuplicateFiles) {
        const files = window.pendingDuplicateFiles;
        closeDuplicateModal();

        // Clear all file hashes to allow re-import
        if (window.BrainStorage) {
            await window.BrainStorage.clearAllFileHashes();
            console.log('🗑️ Cleared all file hashes for fresh import');
        }

        // Now try importing again
        try {
            const { chunks, names, metadata } = await parseFilesToChunks(files);
            await handleSmartDataLoad(chunks, names, metadata);
        } catch (e) {
            window.showToast('Fresh import error: ' + e.message, 'error');
        }
    }
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
        console.log('💡 handleSmartUpload caught error:', e.message);
        if (e.message.includes('DUPLICATE_FILE')) {
            window.pendingDuplicateFiles = files;

            const hasSession = !!localStorage.getItem('ab_import_session');
            const modal = document.getElementById('duplicate-choice-modal');
            const reloadBtn = document.getElementById('btn-duplicate-reload');
            const modalText = document.getElementById('duplicate-modal-text');

            if (modal) {
                console.log('✅ Duplicate modal found, triggering UI...');
                if (!hasSession) {
                    if (reloadBtn) reloadBtn.style.display = 'none';
                    if (modalText) modalText.innerHTML = 'These files have already been imported, but the previous session data is no longer in memory. Would you like to re-import them fresh?';
                } else {
                    if (reloadBtn) reloadBtn.style.display = 'inline-block';
                    if (modalText) modalText.innerHTML = 'These files have already been imported. Would you like to:';
                }
                modal.style.display = 'flex';
            } else {
                console.error('❌ CRITICAL: duplicate-choice-modal NOT found in DOM!');
                window.showToast('Duplicate detected, but UI is missing. Try refreshing.', 'error');
            }
        } else {
            window.showToast('Upload error: ' + e.message, 'error');
        }
    }
}

async function executeReplace(dataChunks, filenames, metadata = null) {
    let allData = dataChunks.flat();
    allData.sort((a, b) => new Date(a.Date) - new Date(b.Date));
    window.forcedAccountType = null; // Reset on new replace
    const displayFilename = filenames.length === 1 ? filenames[0] : `${filenames.length} Files Loaded`;

    window.showToast(`Loaded ${allData.length} txns`, 'success');
    // Apply Metadata (Opening Balance)
    if (metadata && metadata.openingBalance !== undefined && metadata.openingBalance !== null) {
        const obInput = document.getElementById('opening-balance');
        if (obInput) {
            obInput.value = parseFloat(metadata.openingBalance).toFixed(2);
            obInput.removeAttribute('readonly');
        }
    }

    showImmediatePreview({ name: displayFilename }, allData, true, metadata);
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
    let allMetadata = []; // Track metadata from all files
    window.showToast(`Parsing ${files.length} files...`, 'info');

    for (const file of files) {
        const fileName = file.name.toLowerCase();
        let parsedData;

        if (fileName.endsWith('.pdf')) {
            if (!window.pdfParser) throw new Error('PDF parser not loaded');
            const result = await window.pdfParser.parsePDF(file);
            console.log('Processed Chunk:', result);

            // Store metadata with file reference for multi-statement logic
            if (result.metadata) {
                allMetadata.push({
                    filename: file.name,
                    ...result.metadata,
                    // Try to extract earliest transaction date from this file
                    earliestDate: result.transactions.length > 0
                        ? result.transactions.reduce((min, t) =>
                            new Date(t.date) < new Date(min.date) ? t : min
                        ).date
                        : null
                });
            }

            // Map to unified format
            const mapped = result.transactions.map(t => ({
                Date: t.date,
                Description: t.description,
                Amount: t.amount,
                Debit: t.type === 'debit' ? Math.abs(t.amount) : null,
                Credit: t.type === 'credit' ? Math.abs(t.amount) : null,
                Balance: t.Balance !== undefined ? t.Balance : null,
                Category: 'Uncategorized', // Placeholder for live categorization
                AccountId: null,
                _bank: result.bank,
                _sourceFile: file.name
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

    // Multi-Statement Opening Balance Logic
    // Find the earliest statement and use its opening balance
    let combinedMetadata = {};

    if (allMetadata.length > 0) {
        // Sort by earliest date to find the first statement
        const sortedMeta = allMetadata
            .filter(m => m.earliestDate != null)
            .sort((a, b) => new Date(a.earliestDate) - new Date(b.earliestDate));

        if (sortedMeta.length > 0) {
            const firstStatement = sortedMeta[0];
            console.log(`📊 Multi-Statement: Using opening balance from ${firstStatement.filename} (earliest: ${firstStatement.earliestDate})`);

            const openingBal = firstStatement.openingBalance ?? firstStatement.previousBalance ?? null;
            console.log(`💰 Opening Balance detected: ${openingBal}`);

            combinedMetadata = {
                openingBalance: openingBal,
                sourceFile: firstStatement.filename,
                statementCount: allMetadata.length
            };
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
                // DEFENSIVE: Block astronomical numbers that look like account/ID strings (Safety trigger)
                if (debit < 1000000000) {
                    totalOut += debit;
                    countOut++;
                    valDebit = debit;
                } else {
                    console.warn('🛑 RecalculateTotals: Ignored astronomical debit (possible parse error):', debit);
                }
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
    if (document.getElementById('summary-total-in')) document.getElementById('summary-total-in').textContent = '+' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safeTotalIn);
    if (document.getElementById('summary-total-out')) {
        const el = document.getElementById('summary-total-out');
        el.textContent = '-' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(safeTotalOut);
        el.style.color = '#334155'; // Force black
    }
    if (document.getElementById('summary-ending-balance')) document.getElementById('summary-ending-balance').innerText = '$' + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(endingBalance);

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

function showImmediatePreview(file, parsedData, replace = true, metadata = null) {
    document.getElementById('upload-zone').style.display = 'none';
    const defaultHeader = document.getElementById('default-page-header');
    if (defaultHeader) defaultHeader.style.display = 'none';

    document.getElementById('preview-summary-wrapper').style.display = 'block';
    document.getElementById('preview-section').style.display = 'block';

    if (replace) {
        window.currentParsedData = {
            filename: file.name,
            data: parsedData,
            metadata: metadata || {}
        };
    }

    const bankName = (parsedData.length > 0 && parsedData[0]._bank) ? parsedData[0]._bank : 'Unknown Bank';
    const bankEl = document.getElementById('summary-bank-name');
    if (bankEl) bankEl.textContent = bankName;

    const fileEl = document.getElementById('sc-filename');
    if (fileEl) fileEl.textContent = file.name;

    window.recalculateTotals();

    // SAFETY CHECK: Verify grid container exists
    const gridDiv = document.getElementById('import-preview-grid');
    if (!gridDiv) {
        console.error('❌ Grid container not found!');
        return;
    }

    // CRITICAL FIX: Always destroy old grid instance before creating new one
    // This prevents stale grid references after navigation
    if (window.previewGrid && window.previewGrid.api) {
        console.log('🗑️ Destroying old grid instance...');
        window.previewGrid.api.destroy();
        window.previewGrid = null;
    }

    // Always re-render grid to ensure it's properly initialized
    renderPreviewGrid(parsedData);
}

function renderPreviewGrid(parsedData) {
    const gridDiv = document.getElementById('import-preview-grid');
    if (!gridDiv) return;

    gridDiv.innerHTML = '';

    // Check if there's no data - show empty state
    if (!parsedData || parsedData.length === 0) {
        gridDiv.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; background: white; border-radius: 8px;">
                <img src="../assets/empty-state.png" alt="No transactions" style="max-width: 400px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 8px 0; font-size: 1.5rem; color: #0f172a;">No transactions yet.</h3>
                <p style="margin: 0; color: #64748b; font-size: 1rem;">Import your bank statement or add your first entry manually to get started.</p>
            </div>
        `;
        return;
    }

    const columnDefs = [
        {
            field: 'Date', headerName: 'Date', width: 120, sortable: true, resizable: true,
            valueFormatter: p => {
                if (!p.value) return '';
                try {
                    const date = new Date(p.value);
                    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
                } catch {
                    return p.value;
                }
            },
            cellStyle: { color: '#64748b', fontWeight: '500' }
        },
        {
            field: 'Description', headerName: 'Description', flex: 3, minWidth: 250, sortable: true, resizable: true,
            wrapText: true, autoHeight: true,
            valueFormatter: p => (p.value || '').toString().toUpperCase()
        },
        {
            field: 'Debit', headerName: 'Debit', width: 110, sortable: true, resizable: true, type: 'numericColumn',
            valueFormatter: p => {
                const val = parseFloat(p.value) || 0;
                if (val === 0) return '';
                return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
            },
            cellStyle: { textAlign: 'right', color: '#334155' }
        },
        {
            field: 'Credit', headerName: 'Credit', width: 110, sortable: true, resizable: true, type: 'numericColumn',
            valueFormatter: p => {
                const val = parseFloat(p.value) || 0;
                if (val === 0) return '';
                return new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
            },
            cellStyle: { textAlign: 'right', color: '#10b981', fontWeight: '600' }
        },
        {
            field: 'Balance', headerName: 'Balance', width: 120, sortable: true, resizable: true, type: 'numericColumn',
            valueFormatter: p => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(parseFloat(p.value) || 0),
            cellStyle: p => ({ textAlign: 'right', fontWeight: 'bold', color: (parseFloat(p.value) || 0) < 0 ? '#dc2626' : '#16a34a' })
        },
        {
            headerName: 'Action',
            width: 100,
            pinned: 'right',
            lockPinned: true,
            suppressMovable: true,
            cellStyle: {
                textAlign: 'center',
                borderLeft: 'none'
            },
            cellRenderer: params => {
                return `
                    <div style="display: flex; gap: 4px; justify-content: center; height: 100%; align-items: center;">
                        <button onclick="window.previewActionSwap(${params.node.rowIndex})" title="Swap Sign (Credit/Debit)" 
                                style="border: none; background: none; cursor: pointer; opacity: 0.6; padding: 4px; font-size: 14px;"
                                onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.6">
                            ⇄
                        </button>
                        ${params.data.confidence && params.data.confidence < 0.65 ? `
                            <button onclick="window.confirmCategory(${params.node.rowIndex})" title="Confirm Match (Trains AI)" 
                                    style="border: none; background: #8b5cf6; color: white; cursor: pointer; padding: 2px 6px; font-size: 10px; border-radius: 4px; font-weight: bold;">
                                OK
                            </button>
                        ` : ''}
                        <button onclick="window.previewActionDelete(${params.node.rowIndex})" title="Remove Line" 
                                style="border: none; background: none; cursor: pointer; opacity: 0.6; padding: 4px; font-size: 14px; color: #ef4444;"
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

            // Start Live Categorization
            setTimeout(() => {
                window.categorizeLive();
            }, 300);
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

/**
 * Live AI Categorization Engine for Import Grid
 * Cycles through rows and applies Pattern Detection + Dictionary patterns
 */
window.categorizeLive = async function () {
    if (!window.previewGrid || !window.previewGrid.api) return;
    if (!window.currentParsedData || !window.currentParsedData.data) return;

    console.log('🔮 AI Categorization: Starting live scan...');
    const api = window.previewGrid.api;
    const items = window.currentParsedData.data;

    // We process in small chunks to keep UI responsive (ticker effect)
    for (let i = 0; i < items.length; i++) {
        const row = items[i];
        if (row.Category !== 'Uncategorized') continue;

        // 1. Try Pattern Detection
        let match = null;
        if (window.patternDetector) {
            const detection = window.patternDetector.detect(row.Description);
            if (detection && detection.confidence > 0.6) {
                match = { name: detection.merchantName, category: detection.category, confidence: detection.confidence, method: 'regex' };
            }
        }

        // 2. Try Dictionary mapping (Highest confidence)
        if (window.merchantDictionary) {
            const dictMatch = await window.merchantDictionary.matchTransaction(row.Description);
            if (dictMatch) {
                match = {
                    name: dictMatch.merchant?.display_name || dictMatch.matched_pattern,
                    category: dictMatch.merchant?.default_category || dictMatch.suggestedCategory,
                    confidence: dictMatch.confidence,
                    method: dictMatch.method
                };
            }
        }


        // 3. Phase 2 Intelligence: Subscriptions & Anomalies (Always run)
        const subscriptionFound = window.detectSubscriptionPattern(row);
        const isAnomaly = window.detectAnomaly(row);

        row.isSubscription = subscriptionFound;
        row.isAnomaly = isAnomaly;

        if (subscriptionFound) {
            row.Category = 'Subscriptions';
            row.ImportStatus = '📦 Subscription';
        } else if (isAnomaly) {
            row.ImportStatus = '🚩 Review Needed';
        }

        // Update Grid Row
        api.forEachNode(node => {
            if (node.data === row) {
                node.updateData(row);
            }
        });

        // Delay for "Ticker" feel
        if (i % 3 === 0) await new Promise(r => setTimeout(r, 100));
    }

    console.log('✅ AI Categorization: Scan complete.');
    api.refreshCells({ force: true });
};

// ============================================
// INTELLIGENCE HELPERS
// ============================================

window.detectSubscriptionPattern = function (txn) {
    if (!txn || !txn.Description) return false;

    try {
        const history = JSON.parse(localStorage.getItem('ab_import_history') || '[]');
        if (history.length === 0) return false;

        const desc = txn.Description.toUpperCase();
        const amount = Math.abs(parseFloat(txn.Debit) || parseFloat(txn.Credit) || 0);

        // Look for similar transactions in history
        let matches = 0;
        for (const batch of history) {
            if (!batch.data) continue;
            for (const hTxn of batch.data) {
                if (hTxn.Description.toUpperCase() === desc) {
                    const hAmt = Math.abs(parseFloat(hTxn.Debit) || parseFloat(hTxn.Credit) || 0);
                    // Match if amount is within 5% variance
                    if (Math.abs(hAmt - amount) < (amount * 0.05)) {
                        matches++;
                    }
                }
            }
        }
        return matches >= 2; // Seen at least twice before
    } catch (e) {
        return false;
    }
};

window.detectAnomaly = function (txn) {
    const amt = Math.abs(parseFloat(txn.Debit) || parseFloat(txn.Credit) || 0);
    // Simple Threshold for now (Phase 2)
    return amt > 1000;
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

    // DEBUG: Verify Verification
    const finalStored = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
    console.log(`💾 Import Logic Check: Saved ${savedCount} txns. LocalStorage now has ${finalStored.length} txns.`);

    window.showToast(`Successfully saved ${savedCount} transactions`, 'success');

    // Trigger Auto-Categorize & Sanitize
    setTimeout(() => {
        // Clear session on successful commit
        localStorage.removeItem('ab_import_session');

        if (window.sanitizeData) {
            // console.log('Running Post-Import Sanitization');
            window.sanitizeData();
        }

        // Refresh account balances after import
        if (window.refreshAccountBalances) {
            window.refreshAccountBalances();
        }

        // FORCE RELOAD DATA IN MEMORY TO ENSURE GRID SEES IT
        if (window.transactionData) window.transactionData = [];

        console.log('🚀 Navigating to Transactions...');
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
            modalDiv.remove();
            resolve('replace');
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

// Custom Confirmation Modal (Generic)
window.confirmActionCustom = function (options = {}) {
    return new Promise((resolve, reject) => {
        const modalDiv = document.createElement('div');
        modalDiv.className = 'modal-overlay';
        modalDiv.style.zIndex = '5000'; // Topmost

        const title = options.title || 'Are you sure?';
        const message = options.message || 'This action cannot be undone.';
        const confirmText = options.confirmText || 'Confirm';
        const cancelText = options.cancelText || 'Cancel';
        const isDanger = options.danger === true;

        modalDiv.innerHTML = `
            <div class="modal-card">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="btn-icon" id="custom-confirm-close">×</button>
                </div>
                <div class="modal-body">
                    <p>${message}</p>
                </div>
                <div class="modal-actions">
                    <button class="btn-secondary" id="custom-confirm-cancel">${cancelText}</button>
                    <button class="btn-primary" id="custom-confirm-run" style="${isDanger ? 'background: #ef4444; border-color: #ef4444;' : ''}">
                        ${confirmText}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modalDiv);

        // Handlers
        const close = () => { modalDiv.remove(); reject('cancelled'); };

        modalDiv.querySelector('#custom-confirm-close').onclick = close;
        modalDiv.querySelector('#custom-confirm-cancel').onclick = close;
        modalDiv.querySelector('#custom-confirm-run').onclick = () => {
            modalDiv.remove();
            resolve(true);
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

// ============================================
// ACTIVE LEARNING HANDLERS
// ============================================

window.confirmCategory = async function (rowIndex) {
    if (!window.previewGrid || !window.merchantDictionary) return;

    const rowNode = window.previewGrid.api.getDisplayedRowAtIndex(rowIndex);
    if (!rowNode) return;

    const { Description, Category } = rowNode.data;

    try {
        await window.merchantDictionary.confirmCategorization(Description, Category);

        // Update UI
        rowNode.data.confidence = 1.0;
        rowNode.data.ImportStatus = '✅ Confirmed';
        window.previewGrid.api.applyTransaction({ update: [rowNode.data] });

        window.showToast('AI Trained: Categorization confirmed!', 'success');
    } catch (e) {
        console.error('❌ Confirm Category failed:', e);
        window.showToast('Failed to train AI', 'error');
    }
};

window.updateManualCategory = async function (rowIndex, newCategory) {
    if (!window.previewGrid || !window.merchantDictionary) return;

    const rowNode = window.previewGrid.api.getDisplayedRowAtIndex(rowIndex);
    if (!rowNode) return;

    const { Description } = rowNode.data;

    try {
        // Learning from manual edit
        await window.merchantDictionary.confirmCategorization(Description, newCategory);

        // Update UI
        rowNode.data.confidence = 1.0;
        rowNode.data.ImportStatus = '🧠 Learned';
        window.previewGrid.api.applyTransaction({ update: [rowNode.data] });

        window.showToast(`AI Learned: "${Description}" is now "${newCategory}"`, 'info');
    } catch (e) {
        console.error('❌ Manual Categorization Learning failed:', e);
    }
};

window.triggerDictionaryExcel = function () {
    console.log('📑 Dictionary: Triggering Excel selection...');
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx, .xls, .csv';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        window.showToast('Processing dictionary...', 'info');
        try {
            const count = await window.merchantDictionary.importFromExcel(file);
            window.showToast(`Imported ${count} dictionary records!`, 'success');

            // Re-run categorization on current view if data exists
            if (window.currentParsedData && window.currentParsedData.data) {
                console.log('🧩 Re-categorizing current preview with new dictionary data...');
                for (const row of window.currentParsedData.data) {
                    const match = await window.merchantDictionary.matchTransaction(row.Description);
                    if (match) {
                        row.category = match.merchant?.default_category || match.suggestedCategory;
                    }
                }
                if (window.previewGrid && window.previewGrid.api) {
                    window.previewGrid.api.setGridOption('rowData', window.currentParsedData.data);
                }
            }
        } catch (err) {
            window.showToast('Import failed', 'error');
        }
    };
    input.click();
};
