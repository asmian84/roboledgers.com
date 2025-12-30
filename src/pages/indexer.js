/**
 * Data Junkie - Drive Indexer Page
 * Uses File System Access API to recursively scan local drives
 */

window.triggerFileDownload = (fileName) => {
    console.log(`📥 Triggering download for: ${fileName}`);
    if (window.currentScanFiles) {
        const file = window.currentScanFiles.find(f => f.name === fileName);
        if (file) {
            const url = URL.createObjectURL(file);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            return;
        }
    }
    alert(`File "${fileName}" not found in memory (file handle lost or page reloaded).`);
};

window.indexerState = {
    totalFiles: 0,
    processedCount: 0,
    learnedRules: 0,
    startTime: null,
    isScanning: false,
    isPaused: false,
    scanFilter: 'all', // 'all', 'csv', 'xls', 'pdf'
    filenameFilter: '', // text match
    batchSize: 'all', // 'all', 10, 50, 100
    batchProcessed: 0,
    dirHandle: null,
    fileHandles: {}, // Transient storage for file handles (for opening)
    logs: [],
    memory: {},
    gridApi: null,
    memory: {},
    gridApi: null,
    coaCache: null, // Cache for COA lookup
    pendingGridRows: [],
    lastAutoSave: 0,
    scannedRegistry: new Set(), // Set<number> (Hashes of scanned paths)
    lastRegistrySave: 0,
    scanQueue: [] // For ETL calc
};

// HELPER: Format Time (Seconds -> HH:MM:SS)
window.formatTime = function (seconds) {
    if (!seconds || seconds < 0) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

// HELPER: ETL Calculator
window.updateETL = function () {
    if (!window.indexerState.isScanning || window.indexerState.isPaused) return;

    const now = Date.now();
    const elapsedSeconds = (now - window.indexerState.startTime) / 1000;
    const processed = window.indexerState.processedCount;
    const total = window.indexerState.totalScanCount;

    // Only show estimate after we have some velocity data
    if (processed > 5 && total > 0 && elapsedSeconds > 2) {
        const rate = processed / elapsedSeconds; // Files per second
        const remaining = total - processed;
        const etaSeconds = remaining / rate;

        const el = document.getElementById('idx-etl');
        if (el) el.textContent = window.formatTime(etaSeconds);
    }
};

// HELPER: Simple 32-bit Hash for Filenames (Save Space)
window.getPathHash = function (path) {
    let hash = 0;
    if (path.length === 0) return hash;
    for (let i = 0; i < path.length; i++) {
        const char = path.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
};

// HELPER: Register Scanned File
window.addToScannedRegistry = function (path) {
    const hash = window.getPathHash(path);
    if (!window.indexerState.scannedRegistry.has(hash)) {
        window.indexerState.scannedRegistry.add(hash);

        // Auto-Save Hash Registry (Periodic - every 5s)
        const now = Date.now();
        if (now - window.indexerState.lastRegistrySave > 5000) {
            const ary = Array.from(window.indexerState.scannedRegistry);
            localStorage.setItem('indexer_scanned_hashes', JSON.stringify(ary));
            window.indexerState.lastRegistrySave = now;
        }
    }
};

// ==========================================
// PERIODIC TASKS (Grid Flush + AutoSave)
// ==========================================
window.startPeriodicTasks = function () {
    if (window.indexerState.periodicInterval) return;

    window.indexerState.periodicInterval = setInterval(() => {
        // 1. Flush Grid Buffer (UI Optimization)
        if (window.indexerState.pendingGridRows.length > 0) {
            const batch = window.indexerState.pendingGridRows.splice(0, window.indexerState.pendingGridRows.length);

            if (window.indexerState.gridApi) {
                window.indexerState.gridApi.applyTransaction({ add: batch, addIndex: 0 });
            }
            if (window.indexerState.popoutGridApi) {
                window.indexerState.popoutGridApi.applyTransaction({ add: batch, addIndex: 0 });
            }
        }

        // 2. Incremental Auto-Save (Persistence)
        const now = Date.now();
        if (now - window.indexerState.lastAutoSave > 2000) { // Save every 2 seconds if changed
            // Only save if we strictly need to? Actually save is cheap if memory object isn't huge.
            // But JSON.stringify of 5MB is ~20ms. Acceptable every 2s.
            if (window.indexerState.learnedRules > 0) {
                localStorage.setItem('ab3_user_memory', JSON.stringify(window.indexerState.memory));
                window.indexerState.lastAutoSave = now;
            }
        }
    }, 500); // Check every 500ms
};

// Start immediately
window.startPeriodicTasks();

// ==========================================
// CATEGORY TO COA MAPPING
// ==========================================

/**
 * Maps AI-generated category names to COA account codes
 * Uses intelligent fuzzy matching against COA account names
 * @param {string} categoryName - AI category like "Professional and Financial Services"
 * @returns {string} COA account code like "8700" or empty string if no match
 */
window.mapCategoryToAccount = function (categoryName) {
    if (!categoryName || categoryName === 'Uncategorized') return '';

    // Lazy load COA
    if (!window.indexerState.coaCache) {
        try {
            const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');
            if (coa.length === 0 && window.DEFAULT_CHART_OF_ACCOUNTS) {
                window.indexerState.coaCache = window.DEFAULT_CHART_OF_ACCOUNTS;
            } else {
                window.indexerState.coaCache = coa;
            }
        } catch (e) {
            console.warn('Failed to load COA for mapping:', e);
            return '';
        }
    }

    const coa = window.indexerState.coaCache;
    if (!coa || coa.length === 0) return '';

    // Normalize category name for matching
    const normCat = categoryName.toLowerCase().trim();

    // 1. Try exact match on account name
    let match = coa.find(acc => acc.name && acc.name.toLowerCase() === normCat);
    if (match) return match.code || match.accountNumber || '';

    // 2. Try partial match on account name (contains)
    match = coa.find(acc => acc.name && acc.name.toLowerCase().includes(normCat));
    if (match) return match.code || match.accountNumber || '';

    // 3. Try reverse partial match (category contains account name)
    match = coa.find(acc => acc.name && normCat.includes(acc.name.toLowerCase()));
    if (match) return match.code || match.accountNumber || '';

    // 4. Keyword-based intelligent mapping for common AI categories
    const keywordMap = {
        'professional': ['8700', '6450', '7890'], // Professional fees, Consulting, Legal
        'financial services': ['8700', '6450'],
        'meals': ['6415'], // Client meals
        'entertainment': ['6415'],
        'office': ['8600'], // Office supplies
        'supplies': ['8600', '8450'],
        'utilities': ['9500'],
        'telephone': ['9100'],
        'phone': ['9100'],
        'internet': ['9100'],
        'travel': ['9200'],
        'vehicle': ['9700', '7400'],
        'fuel': ['7400'],
        'insurance': ['7600'],
        'rent': ['8720'],
        'advertising': ['6000'],
        'marketing': ['6000'],
        'consulting': ['6450'],
        'legal': ['7890'],
        'accounting': ['8700'],
        'bank': ['7700', '6600'], // Interest and bank charges, Credit card charges
        'interest': ['7700'],
        'equipment': ['7000', '7100'],
        'repairs': ['8800'],
        'maintenance': ['8800'],
        'wages': ['9800'],
        'payroll': ['9800'],
        'salary': ['9800'],
        'training': ['9250'],
        'conference': ['6420'],
        'subscription': ['6800'],
        'membership': ['6800'],
        'donation': ['6750']
    };

    // Search for keyword matches
    for (const [keyword, codes] of Object.entries(keywordMap)) {
        if (normCat.includes(keyword)) {
            // Return first matching code (most specific)
            const accountCode = codes[0];
            const account = coa.find(acc => (acc.code || acc.accountNumber) === accountCode);
            if (account) {
                console.log(`🎯 Mapped "${categoryName}" → ${accountCode} (${account.name}) via keyword "${keyword}"`);
                return accountCode;
            }
        }
    }

    // 5. Fallback: Try matching against COA category field
    match = coa.find(acc => acc.category && acc.category.toLowerCase().includes(normCat));
    if (match) return match.code || match.accountNumber || '';

    // No match found
    console.warn(`⚠️ No COA mapping found for category: "${categoryName}"`);
    return '';
}


// ==========================================
// CONTROLS LOGIC
// ==========================================

window.setScanFilter = function (val) {
    window.indexerState.scanFilter = val;
    log(`Filter set to: ${val.toUpperCase()}`, 'info');
}

window.setFilenameFilter = function (val) {
    window.indexerState.filenameFilter = val.trim().toLowerCase();
}

window.setBatchSize = function (val) {
    window.indexerState.batchSize = val === 'all' ? 'all' : parseInt(val);
    log(`Batch size set to: ${val === 'all' ? 'Unlimited' : val}`, 'info');
}

window.togglePause = function () {
    window.indexerState.isPaused = !window.indexerState.isPaused;
    const btn = document.getElementById('btn-pause');
    const dot = document.getElementById('status-dot');

    if (window.indexerState.isPaused) {
        btn.innerHTML = '<i class="ph ph-play"></i> RESUME';
        log('Scanner Paused.', 'warn');
        if (dot) dot.classList.add('paused');
        document.getElementById('status-text').textContent = 'PAUSED';
    } else {
        // RESUME
        // Reset batch counter if we were paused due to batch limit
        if (window.indexerState.batchSize !== 'all' && window.indexerState.batchProcessed >= window.indexerState.batchSize) {
            window.indexerState.batchProcessed = 0;
            log('Starting next batch...', 'info');
        }

        btn.innerHTML = '<i class="ph ph-pause"></i> PAUSE';
        log('Resuming Scan...', 'success');
        if (dot) dot.classList.remove('paused');
        document.getElementById('status-text').textContent = 'INDEXING...';
    }
}

window.stopScan = function () {
    if (!window.indexerState.isScanning) return;
    window.showConfirm('Stop Scan', 'Are you sure you want to stop the current scan?', () => {
        window.indexerState.isScanning = false;
        window.indexerState.isPaused = false; // Break pause loop
        log('Scanner Stopped by User.', 'error');
        finishScan();
    });
}

window.startOverScan = function () {
    if (!window.indexerState.dirHandle) {
        alert('No directory selected. Please select a directory first.');
        return;
    }

    window.showConfirm('Start Over Scan', 'This will restart the scan from the beginning of the folder (not resume). Continue?', () => {
        // Reset scan state but keep learned data
        window.indexerState.processedCount = 0;
        window.indexerState.totalFiles = 0;
        window.indexerState.isScanning = false;
        window.indexerState.isPaused = false;

        // Reset stats display
        document.getElementById('idx-count').textContent = '0';

        // Clear logs
        window.indexerState.logs = [];
        const terminal = document.getElementById('idx-terminal');
        if (terminal) terminal.innerHTML = '';

        log('🔄 Starting scan over from beginning...', 'info');
        log(`Keeping ${window.indexerState.learnedRules} learned rules in memory`, 'success');

        // Start fresh scan
        setTimeout(() => {
            handleDirectorySelect(window.indexerState.dirHandle);
        }, 100);
    });
}

window.skipCurrentFolder = function () {
    if (!window.indexerState.isScanning) return;
    window.indexerState.skipCurrentFolder = true;
    log('⏭️ Skipping current folder, moving to next root folder...', 'warn');
    const btn = document.getElementById('btn-skip-folder');
    if (btn) {
        btn.disabled = true;
        setTimeout(() => { if (btn) btn.disabled = false; }, 2000); // Re-enable after 2s
    }
}

window.popOutIndexer = function () {
    if (!window.popoutService) {
        alert('Pop-out service not loaded.');
        return;
    }

    // Get Data from State
    const rowData = [];
    if (window.indexerState.gridApi) {
        window.indexerState.gridApi.forEachNode(node => rowData.push(node.data));
    }

    // Config
    const colDefs = window.indexerState.gridApi ? window.indexerState.gridApi.getColumnDefs() : [];

    const options = {
        columnDefs: colDefs,
        defaultColDef: { sortable: true, filter: true, resizable: true }
    };

    // OLD: window.popoutService.open('indexer-grid', 'Data Junkie Console', options, rowData);

    // NEW: Full Dashboard Pop-Out
    window.popOutConsole();
};

window.popOutConsole = function () {
    if (!window.popoutService) return;

    // Open Dashboard
    window.popoutService.openDashboard('dj-console', 'Data Junkie Command Center', (childWin) => {
        // 1. Inject HTML
        const root = childWin.document.getElementById('root');
        if (root) {
            root.innerHTML = window.renderIndexerPage(); // Clone UI

            // Add Split View Controls
            const header = root.querySelector('.indexer-header');
            if (header) {
                const controls = childWin.document.createElement('div');
                controls.innerHTML = `
                    <div style="display:flex; gap:10px; margin-left:20px;">
                        <button class="btn-secondary small" onclick="document.querySelector('.indexer-main-layout').style.flexDirection = 'row'">
                            <i class="ph ph-columns"></i> H-Split
                        </button>
                        <button class="btn-secondary small" onclick="document.querySelector('.indexer-main-layout').style.flexDirection = 'column'">
                            <i class="ph ph-rows"></i> V-Split
                        </button>
                    </div>
                `;
                header.appendChild(controls);
            }
        }

        // 2. Init Grid in Pop-out
        const gridDiv = childWin.document.querySelector('#learned-grid');
        if (gridDiv) {
            // Create a NEW grid instance in the child window
            // We share the same row data reference or copy it
            const localData = [];
            if (window.indexerState.gridApi) {
                window.indexerState.gridApi.forEachNode(n => localData.push(n.data));
            }

            const gridOptions = {
                rowData: localData,
                columnDefs: [
                    { field: 'description', headerName: 'Pattern / Vendor', flex: 2, checkboxSelection: true, headerCheckboxSelection: true },
                    { field: 'parser', headerName: 'Parser', width: 100 },
                    { field: 'accountNumber', headerName: 'Acct #', width: 100 },
                    { field: 'account', headerName: 'Mapped Category', flex: 1 },
                    { field: 'frequency', headerName: 'Freq', width: 70 },
                    { field: 'confidence', headerName: 'Conf.', width: 80, valueFormatter: p => (p.value * 100).toFixed(0) + '%' },
                    {
                        field: 'source',
                        headerName: 'Source File',
                        flex: 1,
                        cellRenderer: params => {
                            if (!params.value) return '';
                            // Clickable Link for local file (Attempt)
                            return `<span style="cursor:pointer; text-decoration:underline; color:#3b82f6;" onclick="window.openFile(this.innerText)">${params.value.split(/[\\/]/).pop()}</span>`;
                        }
                    }
                ],
                defaultColDef: { sortable: true, filter: true, resizable: true },
                rowSelection: 'multiple', // Enable Bulk Selection
                animateRows: true
            };

            // Save reference to child grid API
            window.indexerState.popoutGridApi = childWin.agGrid.createGrid(gridDiv, gridOptions);
        }

        // 3. Register Global State Link
        window.indexerState.popoutWindow = childWin;

        // 4. Proxy Global Functions to Child Window
        // This allows 'onclick="selectAndScan()"' in the child HTML to call the parent's function
        childWin.selectAndScan = () => window.selectAndScan();
        childWin.setScanFilter = (val) => window.setScanFilter(val);
        childWin.setFilenameFilter = (val) => window.setFilenameFilter(val);
        childWin.togglePause = () => window.togglePause();
        childWin.stopScan = () => window.stopScan();
        childWin.promoteToDictionary = () => window.promoteToDictionary();
        childWin.downloadMemory = () => window.downloadMemory();
        childWin.downloadLogs = () => window.downloadLogs();
        childWin.clearMemory = () => window.clearMemory();
        childWin.filterSuspense = () => window.filterSuspense();
        childWin.copySuspenseList = () => window.copySuspenseList();
        childWin.filterGridByAccount = (val) => window.filterGridByAccount(val);
        childWin.closePreview = () => window.closePreview();
        childWin.popOutIndexer = () => { alert('Already popped out!'); }; // Disable recursive popout

        // 5. Update Main UI to "Popped Out Mode"
        const mainContainer = document.querySelector('.indexer-container');
        if (mainContainer) {
            mainContainer.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:#64748b;">
                    <i class="ph ph-rocket-launch" style="font-size: 64px; margin-bottom: 20px;"></i>
                    <h2>Console Active in External Window</h2>
                    <p>Scanning and processing is running in the background.</p>
                    <button class="btn-secondary" onclick="if(window.indexerState.popoutWindow && !window.indexerState.popoutWindow.closed) window.indexerState.popoutWindow.focus(); else alert('Pop-out window is closed. Please reload.')">Focus Window</button>
                </div>
            `;
        }

    }, () => {
        // On Close
        window.indexerState.popoutWindow = null;
        window.indexerState.popoutGridApi = null;
        // Restore UI? We'd need to re-render. Ideally user just navigates away and back.
        // Or we force reload
        if (confirm("Pop-out closed. Reload console?")) {
            window.renderTransactions('indexer');
        }
    });
};

window.renderIndexerPage = function () {
    return `
    <div class="indexer-container">
        <!-- Hidden Input for Directory Selection (No Popups!) -->
        <input type="file" id="dir-input" webkitdirectory directory multiple style="display:none" onchange="handleDirectorySelect(this)">

        <div class="indexer-header">
            <div class="header-left">
                <h1>Data Junkie Console</h1>
                <p>Feed the machine. Point to a drive to extract intelligence.</p>
            </div>
            <div class="header-stats-group">
                <div class="stat-box">
                    <span class="stat-label">FILES SCANNED</span>
                    <span class="stat-value" id="idx-files">0</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">RULES LEARNED</span>
                    <span class="stat-value" id="idx-rules">0</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">ELAPSED</span>
                    <span class="stat-value" id="idx-time">00:00:00</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">EST. REMAINING</span>
                    <span class="stat-value" id="idx-etl" style="color: #64748b;">--:--</span>
                </div>
            </div>
        </div>

        <div class="indexer-main-layout">
            <!-- Left: Controls -->
            <div class="indexer-card control-panel">
                <h3><i class="ph ph-sliders-horizontal"></i> Scanner Controls</h3>
                
                <!-- File Type Filter -->
                <div class="control-group">
                    <label class="group-label">FILE SYSTEM FILTER</label>
                    <div class="radio-group">
                        <label class="radio-option">
                            <input type="radio" name="fileType" value="all" checked onchange="setScanFilter('all')">
                            <span>All Files</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="fileType" value="csv" onchange="setScanFilter('csv')">
                            <span>CSV Only</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="fileType" value="xls" onchange="setScanFilter('xls')">
                            <span>Excel Only</span>
                        </label>
                        <label class="radio-option">
                            <input type="radio" name="fileType" value="pdf" onchange="setScanFilter('pdf')">
                            <span>PDF Only</span>
                        </label>
                    </div>
                </div>

                <!-- Filename Filter -->
                <div class="control-group">
                    <label class="group-label">FILENAME MATCH (OPTIONAL)</label>
                    <input type="text" class="text-input" placeholder="e.g. SWIFT" oninput="setFilenameFilter(this.value)">
                </div>
                
                <!-- Account Review Navigator -->
                <div class="control-group">
                    <label class="group-label">BATCH SIZE (Files)</label>
                    <select class="dropdown-select" onchange="setBatchSize(this.value)">
                        <option value="all" selected>Unlimited (All Files)</option>
                        <option value="10">10 Files (Safe Mode)</option>
                        <option value="50">50 Files</option>
                        <option value="100">100 Files</option>
                        <option value="500">500 Files</option>
                    </select>
                </div>

                <div class="control-group">
                    <label class="group-label">REVIEW ACCOUNT</label>
                    <select id="accountNavigator" class="dropdown-select" onchange="filterGridByAccount(this.value)">
                        <option value="">(All Accounts)</option>
                    </select>
                </div>

                <div class="path-display" id="path-display" title="Selected Directory">
                    No directory selected
                </div>

                <!-- Playback Controls -->
                <div class="playback-controls">
                     <button class="btn-control play" id="btn-play" onclick="selectAndScan()">
                        <i class="ph ph-play"></i> <span id="btn-play-text">START SCAN</span>
                     </button>
                     <div class="sub-controls">
                        <button class="btn-control pause" id="btn-pause" onclick="togglePause()" disabled>
                            <i class="ph ph-pause"></i> PAUSE
                        </button>
                        <button class="btn-control stop" id="btn-stop" onclick="stopScan()" disabled>
                            <i class="ph ph-stop"></i> STOP
                        </button>
                        <button class="btn-control" id="btn-skip-folder" onclick="skipCurrentFolder()" disabled style="background: #f59e0b; border-color: #f59e0b;">
                            <i class="ph ph-fast-forward"></i> FFW
                        </button>
                     </div>
                </div>
                
                <hr class="separator">

                <div class="action-buttons-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                    <button class="btn-secondary" style="background: #ef4444; color:white; border:none;" onclick="deleteSelected()">
                        <i class="ph ph-trash"></i> DELETE
                    </button>
                    <button class="btn-secondary" style="background: #f59e0b; color:white; border:none;" onclick="megaFix()">
                        <i class="ph ph-magic-wand"></i> MEGA FIX
                    </button>
                </div>
                
                <button class="btn-secondary" style="width:100%; margin-bottom: 15px; background: #8b5cf6; color:white; border:none;" onclick="startOverScan()">
                    <i class="ph ph-arrow-counter-clockwise"></i> START OVER SCAN
                </button>

                <div class="import-section" style="margin-bottom: 15px;">
                     <button class="btn-primary" style="width:100%; background: #22c55e; border:none;" onclick="triggerImport(false)">
                        <i class="ph ph-check-circle"></i> READY TO IMPORT
                    </button>
                    <button class="btn-secondary" style="width:100%; margin-top:8px; border-color: #22c55e; color:#15803d;" onclick="triggerImport(true)">
                        <i class="ph ph-check"></i> IMPORT (NO 9970)
                    </button>
                </div>

                <div class="status-indicator">
                    <div class="status-dot" id="status-dot"></div>
                    <span id="status-text">IDLE</span>
                </div>

                <div class="memory-actions">
                    <input type="file" id="json-memory-input" accept=".json" style="display:none" onchange="handleMemoryUpload(this)">
                    <button class="btn-secondary small" onclick="document.getElementById('json-memory-input').click()">Import JSON</button>
                    <button class="btn-secondary small" onclick="downloadMemory()">Download JSON</button>
                    <button class="btn-secondary small" onclick="downloadLogs()">Download Logs</button>
                    <button class="btn-secondary small" onclick="clearMemory()">Reset Brain</button>
                </div>

                <div class="control-group" style="margin-top: 10px;">
                     <button class="btn-secondary small" onclick="filterSuspense()" style="width:100%; color:#b91c1c; border-color:#fca5a5;">
                        <i class="ph ph-warning"></i> FILTER SUSPENSE (9970)
                     </button>
                     <button class="btn-secondary small" onclick="copySuspenseList()" style="width:100%; margin-top:8px;">
                        <i class="ph ph-copy"></i> COPY 9970 LIST
                     </button>
                </div>
            </div>

            <!-- Right: Grid & Terminal -->
            <div class="indexer-right-panel">
                
                <!-- AG GRID for Learned Rules -->
                <div class="indexer-card grid-panel">
                    <div class="panel-header-small">
                        <span><i class="ph ph-brain"></i> MARRIED DATA STREAM (Desc + Acct#)</span>
                        <div style="display: flex; gap: 10px; align-items: center;">
                            <span class="badge" id="grid-count">0 items</span>
                            <button onclick="window.popOutIndexer()" title="Pop Out" style="background:none; border:none; cursor:pointer; color:#64748b;"><i class="ph ph-arrow-square-out"></i></button>
                        </div>
                    </div>
                    <div id="learned-grid" class="ag-theme-quartz" style="height: 100%; width: 100%;"></div>
                </div>

                <!-- Terminal -->
                <div class="indexer-card terminal-panel">
                    <div class="terminal-header" style="display:flex; justify-content:space-between;">
                        <span><i class="ph ph-terminal-window"></i> SYSTEM_LOG</span>
                        <span id="terminal-stats" style="color: #22c55e; font-family: monospace; font-size: 0.8rem;">Ready</span>
                    </div>
                    <div class="terminal-window" id="terminal-output">
                        <div class="log-line system">> System Ready.</div>
                        <div class="log-line system">> Waiting for input stream...</div>
                    </div>
                </div>

            </div>
        </div>
    <div id="file-preview-modal" class="modal-overlay" style="display: none;">
        <div class="modal-content">
            <div class="modal-header">
                <h3 id="preview-title">File Preview</h3>
                <button class="btn-close" onclick="closePreview()">×</button>
            </div>
            <div class="modal-body" id="preview-body">
                Loading...
            </div>
        </div>
    </div>
    
    <!-- Confirm/Alert Modal -->
    <div id="confirm-modal" class="modal-overlay" style="display: none; z-index: 1001;">
        <div class="modal-content" style="height: auto; max-width: 400px;">
            <div class="modal-header">
                <h3 id="alert-title">Alert</h3>
                <button class="btn-close" onclick="closeAlert()">×</button>
            </div>
            <div class="modal-body" id="alert-body" style="padding: 20px; text-align: center;">
                Message...
            </div>
            <div class="modal-footer" style="padding: 16px; display: flex; justify-content: flex-end; gap: 10px; border-top: 1px solid #e2e8f0;">
                <button class="btn-secondary" id="alert-cancel" onclick="closeAlert()">Cancel</button>
                <button class="btn-control play" id="alert-ok" style="width: auto; background: #0f172a; color: white;">OK</button>
            </div>
        </div>
    </div>
    </div>

    <style>
        /* ... Existing CSS ... */
        .indexer-container { padding: 24px; max-width: 100%; min-height: 100vh; display: flex; flex-direction: column; gap: 20px; font-family: 'JetBrains Mono', 'Courier New', monospace; box-sizing: border-box; }
        .indexer-header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 20px; border-bottom: 1px solid #e2e8f0; flex-shrink: 0; }
        .header-left h1 { font-size: 1.8rem; margin: 0 0 8px 0; color: #0f172a; letter-spacing: -0.05em; }
        .header-left p { margin: 0; color: #64748b; }
        .header-stats-group { display: flex; gap: 32px; }
        .stat-box { display: flex; flex-direction: column; align-items: flex-end; }
        .stat-label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; letter-spacing: 0.1em; }
        .stat-value { font-size: 1.5rem; font-weight: 700; color: #2563eb; }
        .indexer-main-layout { display: flex; gap: 24px; flex: 1; min-height: 0; overflow: visible; flex-wrap: wrap; }
        
        .indexer-card { background: white; border: 1px solid #cbd5e1; border-radius: 12px; padding: 24px; display: flex; flex-direction: column; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .control-panel { width: 320px; gap: 20px; flex-shrink: 0; }
        .indexer-right-panel { flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 300px; }
        .grid-panel { height: 500px; padding: 0; overflow: hidden; display: flex; flex-direction: column; }
        .panel-header-small { padding: 12px 16px; background: #f8fafc; border-bottom: 1px solid #e2e8f0; font-size: 0.8rem; font-weight: 700; color: #64748b; display: flex; justify-content: space-between; }
        .terminal-panel { height: 300px; background: #0f172a; border: 1px solid #334155; color: #e2e8f0; padding: 0; overflow: hidden; }
        
        .path-display { background: #f1f5f9; padding: 12px; border-radius: 6px; font-size: 0.8rem; color: #475569; word-break: break-all; border: 1px dashed #cbd5e1; min-height: 48px; display: flex; align-items: center; }
        
        /* CONTROLS */
        .group-label { font-size: 0.7rem; font-weight: 700; color: #94a3b8; margin-bottom: 8px; display: block; }
        .radio-group { display: flex; gap: 12px; margin-bottom: 10px; }
        .radio-option { display: flex; align-items: center; gap: 6px; font-size: 0.85rem; color: #475569; cursor: pointer; }
        
        .playback-controls { display: flex; flex-direction: column; gap: 12px; }
        .sub-controls { display: flex; gap: 12px; }
        
        .btn-control { border: none; padding: 16px; border-radius: 8px; font-weight: 700; font-size: 0.9rem; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s; flex: 1; }
        .btn-control.play { background: #0f172a; color: #22c55e; width: 100%; font-size: 1rem; }
        .btn-control.play:hover { background: #1e293b; box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }
        
        .btn-control.pause { background: #fcd34d; color: #78350f; }
        .btn-control.pause:hover:not(:disabled) { background: #fbbf24; }
        
        .btn-control.stop { background: #fca5a5; color: #7f1d1d; }
        .btn-control.stop:hover:not(:disabled) { background: #f87171; }
        
        .btn-control:disabled { opacity: 0.5; cursor: not-allowed; filter: grayscale(1); }

        .btn-secondary { background: white; border: 1px solid #cbd5e1; color: #0f172a; padding: 10px; border-radius: 6px; cursor: pointer; font-weight: 600; display:flex; align-items:center; justify-content:center; gap:8px;}
        .btn-secondary:hover { background: #f1f5f9; }
        .btn-secondary.small { font-size: 0.75rem; padding: 8px; flex: 1; }

        .status-indicator { display: flex; align-items: center; gap: 12px; background: #f8fafc; padding: 12px; border-radius: 8px; }
        .status-dot { width: 12px; height: 12px; border-radius: 50%; background: #94a3b8; }
        .status-dot.active { background: #22c55e; box-shadow: 0 0 10px #22c55e; animation: pulse 1.5s infinite; }
        .status-dot.paused { background: #f59e0b; animation: none; }
        
        @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }

        /* Pop-out specific overrides */
        .indexer-container { height: 100vh !important; padding: 10px !important; }

        /* Pop-out specific overrides */
        .indexer-container { height: 100vh !important; padding: 10px !important; }

        .terminal-header { background: #1e293b; padding: 12px 20px; border-bottom: 1px solid #334155; font-size: 0.8rem; font-weight: 600; color: #94a3b8; display: flex; justify-content: space-between; }
        .terminal-window { flex: 1; padding: 20px; font-family: 'Fira Code', monospace; font-size: 0.9rem; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; }
        .terminal-window::-webkit-scrollbar { width: 8px; }
        .terminal-window::-webkit-scrollbar-track { background: #0f172a; }
        .terminal-window::-webkit-scrollbar-thumb { background: #334155; border-radius: 4px; }
        .log-line { opacity: 0.8; }
        .log-line.success { color: #22c55e; }
        .log-line.error { color: #ef4444; }
        .separator { margin: 20px 0; border: 0; border-top: 1px solid #e2e8f0; width: 100%; }
        .memory-actions { display: flex; gap: 10px; flex-wrap: wrap; }
        .suspense-row { background-color: #fef2f2 !important; }
        .suspense-row .ag-cell-value { color: #b91c1c !important; font-weight: bold; }
        .dropdown-select { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f1f5f9; color: #475569; font-size: 0.9rem; }
        .text-input { width: 100%; padding: 8px; border: 1px solid #cbd5e1; border-radius: 6px; background: #fff; color: #475569; font-size: 0.9rem; box-sizing: border-box; }
        .action-icon { cursor: pointer; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 100%; }
        .action-icon:hover { color: #ef4444; }
        .action-icon:hover { color: #ef4444; }

        /* MODAL */
        .modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px); }
        .modal-content { background: white; border-radius: 12px; width: 90%; height: 90%; display: flex; flex-direction: column; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); }
        .modal-header { padding: 16px 24px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
        .modal-header h3 { margin: 0; color: #0f172a; }
        .btn-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
        .modal-body { flex: 1; overflow: auto; padding: 24px; }
        .modal-body table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
        .modal-body th, .modal-body td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        .modal-body th { background: #f1f5f9; font-weight: 600; position: sticky; top: 0; }
        .modal-body tr:nth-child(even) { background: #f8fafc; }
    </style>
    `;
};

// ==========================================
// LOGIC
// ==========================================

window.initIndexerGrid = function () {
    // PRE-LOAD COA FOR VALIDATION
    try {
        const coaRaw = localStorage.getItem('ab3_coa') || '[]';
        const coa = JSON.parse(coaRaw);
        window.indexerState.validCoaIds = new Set(coa.map(c => String(c.code || c.id || c.accountNumber)));
        window.indexerState.validCoaIds = new Set(coa.map(c => String(c.code || c.id || c.accountNumber)));
        console.log(`✅ Loaded ${window.indexerState.validCoaIds.size} Valid COA Accounts for Strict Validation.`);
    } catch (e) { console.error("Failed to load COA:", e); }

    // PRE-LOAD SCANNED REGISTRY (Smart Resume)
    try {
        const hashesRaw = localStorage.getItem('indexer_scanned_hashes') || '[]';
        const hashes = JSON.parse(hashesRaw);
        window.indexerState.scannedRegistry = new Set(hashes);
        console.log(`✅ Smart Resume: Loaded ${hashes.length} previously scanned files.`);
    } catch (e) { console.error("Failed to load Scanned Registry:", e); }

    const gridOptions = {
        rowData: [],
        columnDefs: [
            {
                field: 'description',
                headerName: 'Pattern / Vendor',
                flex: 2,
                filter: true,
                editable: true,
                checkboxSelection: true,
                headerCheckboxSelection: true
            },
            { field: 'parser', headerName: 'Parser', width: 100, filter: true },
            { field: 'accountNumber', headerName: 'Account #', width: 120, filter: true, editable: true },
            { field: 'account', headerName: 'Mapped Category', flex: 1, filter: true, editable: true },
            { field: 'confidence', headerName: 'Conf.', width: 80, valueFormatter: p => (p.value * 100).toFixed(0) + '%' },
            {
                field: 'source',
                headerName: 'Source File',
                flex: 1,
                cellStyle: { color: '#3b82f6', cursor: 'pointer', textDecoration: 'underline' },
                onCellClicked: params => window.triggerFileDownload(params.value)
            },
            {
                headerName: '',
                width: 50,
                cellRenderer: params => `<div class="action-icon" onclick="deleteRule('${params.data.description.replace(/'/g, "\\'")}')"><i class="ph ph-trash"></i></div>`
            }
        ],
        rowSelection: 'multiple',
        onCellValueChanged: params => handleGridEdit(params),
        rowClassRules: {
            'suspense-row': params => params.data.accountNumber == '9970' || params.data.accountNumber == 9970
        },
        defaultColDef: {
            sortable: true,
            resizable: true,
        },
        animateRows: true,
        headerHeight: 40,
        rowHeight: 40,
        onGridReady: (params) => {
            window.indexerState.gridApi = params.api;
            params.api.sizeColumnsToFit();
            // Populate navigator if memory exists
            updateAccountNavigator();
        }
    };

    const gridDiv = document.querySelector('#learned-grid');
    if (gridDiv) {
        window.indexerState.gridApi = agGrid.createGrid(gridDiv, gridOptions);

        // Handle Resize
        window.addEventListener('resize', () => {
            if (window.indexerState.gridApi) window.indexerState.gridApi.sizeColumnsToFit();
        });
    }

    // ON LOAD CHECK
    const crashLog = localStorage.getItem('indexer_crash_log');
    if (crashLog) {
        try {
            const d = JSON.parse(crashLog);
            // Just warn visually
            if (document.getElementById('status-text')) {
                document.getElementById('status-text').textContent = "CRASHED LAST RUN";
                document.getElementById('status-text').style.color = "red";
            }
        } catch (e) { }
    }

    // CHECK FOR KILLER FILE (User Request: "Know what's crashing it")
    const lastKiller = localStorage.getItem('indexer_last_file');
    if (lastKiller) {
        log(`⚠️ CRASH DETECTED: The system likely crashed while processing: "${lastKiller}"`, 'error');
        alert(`CRASH REPORT:\nThe last session crashed while processing:\n\n${lastKiller}\n\nWe recommend deleting or skipping this file.`);
    }
}

// ==========================================
// NATIVE FILE SYSTEM API (STREAMING)
// ==========================================

window.selectAndScan = async function () {
    try {
        // 1. Open Directory Picker (Native)
        const dirHandle = await window.showDirectoryPicker();

        // 2. Setup UI
        const folderName = dirHandle.name;
        document.getElementById('path-display').textContent = folderName;
        document.getElementById('status-dot').classList.add('active');
        document.getElementById('status-text').textContent = 'INDEXING...';

        // 3. Reset State
        window.indexerState.isScanning = true;
        window.indexerState.isPaused = false;
        window.indexerState.startTime = Date.now();
        window.indexerState.processedCount = 0;
        window.indexerState.totalScanCount = 0; // Unknown in streaming mode

        // 4. Buttons
        document.getElementById('btn-pause').disabled = false;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('btn-skip-folder').disabled = false;
        document.getElementById('btn-play').disabled = true;
        document.getElementById('btn-play-text').textContent = 'SCANNING...';

        log(`Target acquired: ${folderName}`, 'success');
        log(`Starting STREAMING scan (Native Mode)...`, 'info');

        // 5. Start Streaming
        await scanDirectoryStream(dirHandle);

        finishScan();

    } catch (err) {
        if (err.name !== 'AbortError') {
            log(`Error: ${err.message}`, 'error');
            console.error(err);
        }
        window.indexerState.isScanning = false;
        finishScanUI();
    }
};

// Recursive Async Generator for Files
async function* getFilesRecursively(entry, path = '') {
    if (entry.kind === 'file') {
        yield { handle: entry, path: path + entry.name };
    } else if (entry.kind === 'directory') {
        const newPath = path + entry.name + '/';

        // SMART SKIP: System Folders
        const systemFolders = ['node_modules', '.git', 'dist', 'build', '$Recycle.Bin'];
        if (systemFolders.includes(entry.name)) return;

        // INDEXER SPECIFIC SKIP (Optimization)
        // Skip non-financial folders early to save recursion time
        // Only if not root
        if (path !== '') {
            const skipFolders = ['Investment', 'Invoice', 'Receipt', 'CRA', 'Authorization'];
            const nameLower = entry.name.toLowerCase();
            if (skipFolders.some(s => nameLower.includes(s.toLowerCase()))) return;
        }

        try {
            for await (const handle of entry.values()) {
                yield* getFilesRecursively(handle, newPath);
            }
        } catch (e) {
            console.warn(`Skipping missing/access-denied folder: ${newPath}`, e);
        }
    }
}

// Streaming Scanner
// Streaming Scanner (Improved with Pre-Discovery for ETL)
async function scanDirectoryStream(dirHandle) {
    window.indexerState.batchProcessed = 0;

    // PHASE 1: DISCOVERY (Fast Walk)
    log('Phase 1: Discovering files... (Building Index)', 'info');
    document.getElementById('status-text').textContent = 'DISCOVERING...';

    const fileQueue = [];
    let discoveryCount = 0;

    // Fast walk just to get handles
    for await (const item of getFilesRecursively(dirHandle)) {
        if (!window.indexerState.isScanning) break;
        fileQueue.push(item);
        discoveryCount++;

        // Update UI occasionally during discovery
        if (discoveryCount % 100 === 0) {
            document.getElementById('idx-files').textContent = `${discoveryCount} (Found)`;
            await new Promise(r => setTimeout(r, 0));
        }
    }

    if (!window.indexerState.isScanning) return;

    // Setup Phase 2
    window.indexerState.totalScanCount = fileQueue.length;
    window.indexerState.processedCount = 0; // Reset for actual processing
    log(`Discovery Complete. Found ${fileQueue.length} files. Starting Deep Scan...`, 'success');
    document.getElementById('status-text').textContent = 'INDEXING...';
    window.indexerState.startTime = Date.now(); // Reset timer for accurate ETL

    // PHASE 2: PROCESSING (Deep Scan)
    let currentRootFolder = null;
    let skipUntilNewFolder = false;

    for (let i = 0; i < fileQueue.length; i++) {
        if (!window.indexerState.isScanning) break;

        const { handle, path } = fileQueue[i];

        // Yield to UI
        if (i % 20 === 0) await new Promise(r => setTimeout(r, 0));

        // ETL Update (Every file or every few)
        updateETL();

        // SMART RESUME: Skip if already scanned
        const hash = window.getPathHash(path);
        if (window.indexerState.scannedRegistry.has(hash)) {
            continue;
        }

        // PAUSE & BATCH LOGIC (Same as before)
        while (window.indexerState.isPaused) {
            if (!window.indexerState.isScanning) break;
            await new Promise(r => setTimeout(r, 500));
        }

        if (window.indexerState.batchSize !== 'all' && window.indexerState.batchProcessed >= window.indexerState.batchSize) {
            log(`Batch limit of ${window.indexerState.batchSize} reached. Pausing...`, 'warn');
            togglePause();
            while (window.indexerState.isPaused) {
                if (!window.indexerState.isScanning) break;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // FFW / SKIP FOLDER LOGIC
        const pathParts = path.split('/');
        const rootFolder = pathParts[0];

        if (currentRootFolder !== rootFolder) {
            currentRootFolder = rootFolder;
            skipUntilNewFolder = false;
        }

        if (window.indexerState.skipCurrentFolder && !skipUntilNewFolder) {
            skipUntilNewFolder = true;
            window.indexerState.skipCurrentFolder = false;
            log(`⏭️ Skipping folder: ${currentRootFolder}`, 'warn');
        }

        if (skipUntilNewFolder) continue;

        if (skipUntilNewFolder) continue;

        // PROCESS
        try {
            const file = await handle.getFile();

            // MOCK HANDLE for processFile compatibility
            const mockHandle = {
                name: path, // Full relative path
                getFile: async () => file
            };

            // Crash Log
            localStorage.setItem('indexer_last_file', path);

            await processFile(mockHandle);

        } catch (err) {
            // Handle "NotFoundError" or other access errors gracefully
            if (err.name === 'NotFoundError') {
                log(`⚠️ File not found (moved/deleted): ${path}`, 'warn');
            } else {
                log(`⚠️ Error accessing ${path}: ${err.message}`, 'error');
            }
        }
    }

    localStorage.removeItem('indexer_last_file');
}


window.handleDirectorySelect = async function (input) {
    if (!input.files || input.files.length === 0) return;

    try {
        if (window.indexerState.isScanning) {
            alert('Scan in progress');
            return;
        }

        const files = Array.from(input.files);
        // Heuristic: Get Folder Name from the first file's webkitRelativePath
        // e.g., "MyFolder/MyFile.txt" -> "MyFolder"
        const folderName = files[0].webkitRelativePath.split('/')[0] || 'Selected Folder';

        // UI Reset
        document.getElementById('path-display').textContent = folderName;
        document.getElementById('status-dot').classList.add('active');
        document.getElementById('status-text').textContent = 'INDEXING...';

        // CRASH RESUME CHECK
        let resumeIndex = 0;
        const crashLog = localStorage.getItem('indexer_crash_log');
        if (crashLog) {
            try {
                const logData = JSON.parse(crashLog);
                // Simple check: does the folder name match?
                if (logData.path && logData.path.startsWith(folderName)) {
                    const doResume = confirm(`⚠️ CRASH DETECTED\n\nLast scan crashed on:\n${logData.path}\n\nResume from file #${logData.index + 2}? (Skips the crashing file)`);
                    if (doResume) {
                        resumeIndex = logData.index + 1;
                        log(`RESUMING from file index ${resumeIndex}...`, 'warn');
                    } else {
                        localStorage.removeItem('indexer_crash_log');
                    }
                }
            } catch (e) { console.error(e); }
        }

        // Buttons
        document.getElementById('btn-pause').disabled = false;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('btn-skip-folder').disabled = false;
        document.getElementById('btn-play').disabled = true;
        document.getElementById('btn-play-text').textContent = 'SCANNING...';

        window.indexerState.isScanning = true;
        window.indexerState.isPaused = false;
        window.indexerState.startTime = Date.now();
        startTimer();

        log(`Target acquired: ${folderName}`, 'success');
        window.indexerState.isScanning = true;
        window.indexerState.isPaused = false;
        window.indexerState.startTime = Date.now();
        window.indexerState.processedCount = 0; // Reset
        window.indexerState.totalScanCount = files.length; // Set Total
        startTimer();

        log(`Target acquired: ${folderName}`, 'success');
        log(`Found ${files.length} potential files. Starting crawl...`, 'info');

        // New Scan Logic: Iterate flat file list
        await scanFileList(files, resumeIndex);

        // Complete
        finishScan();

    } catch (err) {
        log(`Error: ${err.message}`, 'error');
        console.error(err);
        window.indexerState.isScanning = false;
        finishScanUI();
    }
};

async function scanFileList(files, startIndex = 0) {
    if (!window.indexerState.isScanning) return;

    let currentRootFolder = null;
    let skipUntilNewFolder = false;
    window.indexerState.batchProcessed = 0; // Reset on new scan start

    for (let i = 0; i < files.length; i++) {
        // Yield to UI to prevent freezing
        if (i % 50 === 0) await new Promise(r => setTimeout(r, 0));
        if (i < startIndex) continue; // SKIP SCAN (Resume)

        // SMART RESUME: Skip if already scanned
        const file = files[i];
        const fullPath = file.webkitRelativePath || file.name;
        const hash = window.getPathHash(fullPath);

        if (window.indexerState.scannedRegistry.has(hash)) {
            // log(`⏭️ Skipped (Already Scanned): ${fullPath}`, 'debug'); // Too noisy?
            continue;
        }
        if (!window.indexerState.isScanning) break;

        // PAUSE LOOP
        while (window.indexerState.isPaused) {
            if (!window.indexerState.isScanning) break;
            await new Promise(r => setTimeout(r, 500));
        }

        // BATCH CHECK
        if (window.indexerState.batchSize !== 'all' && window.indexerState.batchProcessed >= window.indexerState.batchSize) {
            log(`Batch limit of ${window.indexerState.batchSize} reached. Pausing...`, 'warn');
            togglePause(); // Use existing pause logic
            // Wait for pause to take effect in the loop
            while (window.indexerState.isPaused) {
                if (!window.indexerState.isScanning) break;
                await new Promise(r => setTimeout(r, 500));
            }
        }

        // CRASH LOGGING
        // const fullPath = file.webkitRelativePath || file.name; // Duplicate removed
        localStorage.setItem('indexer_crash_log', JSON.stringify({
            index: i,
            path: fullPath,
            timestamp: Date.now()
        }));

        // FFW LOGIC: Skip current folder
        const pathParts = fullPath.split('/');
        const rootFolder = pathParts[0]; // First folder in path

        // Detect folder change
        if (currentRootFolder !== rootFolder) {
            currentRootFolder = rootFolder;
            skipUntilNewFolder = false; // Reset skip flag on new folder
            log(`📁 Entering folder: ${rootFolder}`, 'info');
        }

        // Check if skip flag was set
        if (window.indexerState.skipCurrentFolder && !skipUntilNewFolder) {
            skipUntilNewFolder = true;
            window.indexerState.skipCurrentFolder = false; // Reset flag
            log(`⏭️ Skipping all files in: ${currentRootFolder}`, 'warn');
        }

        // Skip files if we're in skip mode
        if (skipUntilNewFolder) {
            continue;
        }

        try {
            // Check junk folders via path
            const pathParts = fullPath.split('/');

            // SKIP: System folders
            const systemFolders = ['node_modules', '.git', 'dist', 'build', 'AppData', '$Recycle.Bin', 'System Volume Information', 'CW', 'cw'];
            if (pathParts.some(p => systemFolders.includes(p))) {
                continue;
            }

            // SKIP: Non-bank folders (Investment, Invoice, Receipt, CRA, Authorization)
            const skipFolders = ['Investment', 'Invoice', 'Receipt', 'CRA', 'Authorization', 'Invoices', 'Receipts'];
            const hasSkipFolder = pathParts.some(p => {
                const pLower = p.toLowerCase();
                return skipFolders.some(skip => pLower.includes(skip.toLowerCase()));
            });
            if (hasSkipFolder) {
                log(`⏭️ Skipping non-bank folder: ${pathParts[pathParts.length - 2] || pathParts[0]}`, 'system');
                continue;
            }

            // ONLY SCAN: Bank/Credit Card statement folders (CHQ, SAV, Visa, MC, or bank account names)
            const bankKeywords = ['CHQ', 'SAV', 'Visa', 'MC', 'MasterCard', 'Checking', 'Savings', 'Credit', 'Statement', 'Bank'];
            const hasBankKeyword = pathParts.some(p => {
                const pUpper = p.toUpperCase();
                return bankKeywords.some(keyword => pUpper.includes(keyword.toUpperCase()));
            });

            // If we're more than 2 levels deep and no bank keyword found, skip
            if (pathParts.length > 2 && !hasBankKeyword) {
                log(`⏭️ Skipping non-bank path: ${pathParts.slice(0, 3).join('/')}...`, 'system');
                continue;
            }

            // Mock a fileHandle API
            const mockHandle = {
                name: fullPath, // PASS FULL PATH HERE for source tracking
                getFile: async () => file
            };

            await processFile(mockHandle);

        } catch (innerErr) {
            console.warn(`Skipping file ${file.name}:`, innerErr);
        }
    }

    // SUCCESS - Clear Log
    localStorage.removeItem('indexer_crash_log');
}

// Replaces async function scanDirectory(dirHandle) { ... code removed ... }


async function processFile(fileHandle) {
    const name = fileHandle.name.toLowerCase();

    // FORENSICS: Save current file incase of crash
    localStorage.setItem('indexer_last_file', fileHandle.name);



    // FILENAME CHECK
    const nameFilter = window.indexerState.filenameFilter;
    if (nameFilter && !name.includes(nameFilter)) return;

    // FILTER CHECK
    const filter = window.indexerState.scanFilter;
    if (filter === 'csv' && !name.endsWith('.csv')) return;
    if (filter === 'xls' && !name.includes('.xls')) return;
    if (filter === 'pdf' && !name.endsWith('.pdf')) return;

    // Store handle (Optimization: Only relevant files)
    window.indexerState.fileHandles[fileHandle.name] = fileHandle;

    // Increment batch counter (Only count processed files)
    if (window.indexerState.batchSize !== 'all') {
        window.indexerState.batchProcessed++;
    }

    // EXTENSION CHECK (Base)
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv') && !name.endsWith('.pdf')) return;

    // Increment Total (Visible feedback of progress)
    window.indexerState.processedCount++;
    updateStats();

    log(`Reading: ${fileHandle.name}`, 'system');

    try {
        const file = await fileHandle.getFile();

        if (name.endsWith('.pdf')) {
            await processPDF(file, fileHandle.name);
        } else {
            const buffer = await file.arrayBuffer();
            processExcel(buffer, fileHandle.name);
        }
    } catch (e) {
        log(`Failed to read ${fileHandle.name}: ${e.message}`, 'error');
    }
}

function processExcel(buffer, filename) {
    try {
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheetName = wb.SheetNames[0];
        const sheet = wb.Sheets[sheetName];

        // COA Validation Load
        let coaIds = [];
        try {
            const coaStore = JSON.parse(localStorage.getItem('ab3_coa') || '[]');
            // Assuming COA shape is [{code: '1000', ...}] or similar. 
            // Let's grab all likely ID fields to be safe
            coaIds = coaStore.map(c => String(c.code || c.id || c.accountNumber));
        } catch (e) {
            // If COA fails, be permissive? Or strict? User said STRICT.
            // But if COA is empty, nothing would learn. Let's warn.
            if (!window.indexerState.coaWarned) {
                log('Warning: Could not load Chart of Accounts for validation.', 'warn');
                window.indexerState.coaWarned = true;
            }
        }

        // Convert to array of arrays (AOA) to find headers manually
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

        if (!data || data.length === 0) return;

        // Header Hunting (Scan first 20 rows)
        let headerRowIndex = -1;
        let descIdx = -1;
        let catIdx = -1;
        let numIdx = -1;

        const descKeywords = ['description', 'payee', 'vendor', 'name', 'memo', 'details', 'particulars', 'transaction', 'party'];
        const catKeywords = ['category', 'account', 'class', 'type', 'expense', 'item', 'gl account'];
        const numKeywords = ['account #', 'gl code', 'num', 'no.', 'code'];

        for (let i = 0; i < Math.min(20, data.length); i++) {
            const row = data[i].map(c => String(c).toLowerCase().trim());

            // Try to find indices
            const d = row.findIndex(c => descKeywords.some(k => c.includes(k)));
            const c = row.findIndex(c => catKeywords.some(k => c.includes(k)));
            const n = row.findIndex(c => numKeywords.some(k => c.includes(k) && !c.includes('ref') && !c.includes('inv')));

            // MARRIED CHECK: Description AND Account Number required
            if (d !== -1 && n !== -1) {
                headerRowIndex = i;
                descIdx = d;
                catIdx = c;
                numIdx = n;
                break;
            }
        }

        if (headerRowIndex !== -1) {
            log(`Found Pattern in ${filename} (Row ${headerRowIndex + 1})`, 'success');
            let newRules = 0;

            // Process data rows (start after header)
            for (let i = headerRowIndex + 1; i < data.length; i++) {
                const row = data[i];
                if (!row) continue;

                const desc = row[descIdx];
                const cat = catIdx !== -1 ? row[catIdx] : '';
                const accNum = String(row[numIdx]).trim();

                // MARRIED CHECK: Description AND Account Number required
                if (desc && accNum && String(desc).length > 2) {

                    // 1. STRICT DESCRIPTION CHECK (Must contain letters)
                    // Rejects dates like "6/1/2021" or pure numbers "102938"
                    if (!/[a-zA-Z]/.test(desc)) continue;

                    // 2. STRICT ACCOUNT CHECK (Max 4 digits)
                    // User Rule: "Cannot be more than 4 digits" (usually 4, allowing 3 for odd cases)
                    if (!/^\d{3,4}$/.test(accNum)) continue;

                    // 3. COA STRICT CHECK
                    if (coaIds.length > 0 && !coaIds.includes(accNum)) {
                        // Skip non-COA account numbers
                        continue;
                    }

                    // Check exclusion for "Total" rows or empty
                    if (String(desc).toLowerCase().includes('total')) continue;

                    learnPattern(desc, cat || 'Unknown', accNum, filename, 'CSV/Excel');
                    newRules++;

                    // 🧠 BRIDGE TO BRAIN (CSV/XLS Support)
                    if (window.CategorizationEngine) {
                        window.CategorizationEngine.learn(desc, cat || 'Uncategorized');
                    }

                    // 🏢 LEARN IN MERCHANT DICTIONARY
                    if (window.merchantDictionary && window.dataJunkie) {
                        const merchantName = window.dataJunkie.extractMerchantName(desc);
                        if (merchantName) {
                            // Note: processExcel is async-ish but we are in sync loop. 
                            // dictionary.learnFromTransaction is async but we can fire-and-forget here 
                            // or we should make processExcel async?
                            // processExcel is not async in signature `function processExcel`.
                            // But learnFromTransaction handles its own state. Check if we need await.
                            // In processPDF it uses await? No, processPDF loop logs "await" for dictionary? 
                            // processPDF snippet: `await window.merchantDictionary.learnFromTransaction(...)` 
                            // If processExcel is sync, awaiting might break flow or standard loop.
                            // However, we want to ensure it runs.
                            // Let's fire and forget for now or just call it.
                            window.merchantDictionary.learnFromTransaction({
                                raw_description: desc,
                                merchant_name: merchantName,
                                category: cat || 'Uncategorized',
                                source: `Indexer: ${filename}`
                            });
                        }
                    }
                }
            }

            if (newRules > 0) log(`+ Extracted ${newRules} MARRIED rules`, 'info');
        } else {
            // Verbose log for debugging (Optional, maybe too noisy?)
            // log(`Skipped ${filename}: No valid header row found.`, 'warn');
        }

    } catch (e) {
        log(`Parse error in ${filename}: ${e.message}`, 'error');
    } finally {
        // MEMORY OPTIMIZATION: Free handle immediately to prevent memory hogging
        // User requested: "dont want it to halt all the memory"
        if (window.indexerState.fileHandles[fileHandle.name]) {
            delete window.indexerState.fileHandles[fileHandle.name];
        }

        // SMART RESUME: Register success
        // We use 'name' which is the full path stored in mockHandle
        window.addToScannedRegistry(name);
    }
}

async function processPDF(file, filename) {
    if (!window.pdfParser) {
        log(`Skipped ${filename}: PDF Parser not loaded.`, 'warn');
        return;
    }

    try {
        // DATA JUNKIE MODE: Allow re-scanning duplicates for learning
        // Pass skipDuplicateCheck flag to parser
        const result = await window.pdfParser.parsePDF(file, { skipDuplicateCheck: true });

        if (!result || !result.transactions || result.transactions.length === 0) {
            // log(`Skipped ${filename}: No transactions found.`, 'warn');
            return;
        }

        log(`Found ${result.transactions.length} txns in ${filename} (${result.bank})`, 'success');
        let newRules = 0;
        let aiCategorized = 0;

        for (const txn of result.transactions) {
            // CIBC Parser extracts "Spend Categories" into txn.category
            // Others might just have description.

            // Data Junkie Strategy:
            // 1. If Category Exists -> Learn Mapping (High Value)
            // 2. If No Category -> Learn Description Frequency (Medium Value)

            const category = txn.category || 'Uncategorized';
            console.log(`📋 Transaction: "${txn.description}" - Category: ${category}`);

            // 🤖 AI AUTO-CATEGORIZATION: If uncategorized, try AI classification
            if (category === 'Uncategorized' && txn.description && window.CategorizationEngine) {
                const aiSuggestion = window.CategorizationEngine.classify({ description: txn.description });
                if (aiSuggestion && aiSuggestion.confidence > 0.6) {
                    txn.category = aiSuggestion.category;
                    txn.account = aiSuggestion.category; // Also set account field
                    console.log(`🤖 AI Auto-Cat: "${txn.description}" → ${aiSuggestion.category} (${aiSuggestion.method}, ${Math.round(aiSuggestion.confidence * 100)}%)`);
                    aiCategorized++;
                } else {
                    txn.category = category;
                    txn.account = category;
                }
            } else {
                txn.category = category;
                txn.account = category;
            }

            // Only skip if description is empty (rare)
            if (txn.description) {
                // If it's uncategorized, we pass empty string for 'account' so we don't pollute mapping
                // Or maybe we pass 'Uncategorized' to show in grid?
                // Grid 'Category' column expects a mapping.

                // Let's pass txn.category if it exists, else empty string.
                // But we still call learnPattern to register the description.
                const categoryForGrid = txn.category || '';

                // 🎯 MAP CATEGORY TO COA ACCOUNT CODE
                // This is the key fix: convert AI category names to COA account numbers
                const accountCode = window.mapCategoryToAccount(categoryForGrid);

                learnPattern(txn.description, categoryForGrid, accountCode, filename, result.bank ? result.bank.name : 'PDF');

                // 2. BRIDGE TO BRAIN: Persist to Vector Dictionary
                if (window.CategorizationEngine) {
                    // Normalize text first to ensure clean entry
                    window.CategorizationEngine.learn(txn.description, txn.category);
                }

                // 3. LEARN IN MERCHANT DICTIONARY (NEW!)
                if (window.merchantDictionary && window.dataJunkie) {
                    const merchantName = window.dataJunkie.extractMerchantName(txn.description);
                    if (merchantName) {
                        await window.merchantDictionary.learnFromTransaction({
                            raw_description: txn.description,
                            merchant_name: merchantName,
                            category: txn.category,
                            source: `Indexer: ${filename}`
                        });
                    }
                }

                newRules++;
            }
        }

        if (newRules > 0) log(`+ Extracted ${newRules} MARRIED rules from PDF`, 'info');
        if (aiCategorized > 0) log(`🤖 AI Categorized ${aiCategorized} transactions`, 'success');

        // 📁 ADD TO UPLOAD HISTORY (so it shows in UI)
        if (window.uploadHistory && result.transactions.length > 0) {
            const fileHash = result.fileHash || 'unknown';
            window.uploadHistory.addUpload({
                filename: filename,
                accountCode: 'PDF',
                accountName: 'PDF Import',
                transactionCount: result.transactions.length,
                uploadDate: new Date().toISOString(),
                fileHash: fileHash
            });
            console.log(`📁 Added to upload history: ${filename}`);
        }

    } catch (e) {
        // Validation errors (dupes, unrecognizable) are thrown by parser
        if (e.message.includes('IMAGE_PDF')) {
            // Scanned PDF - requires OCR, skip gracefully
            log(`⏭️ Skipped ${filename}: Scanned image (OCR required)`, 'system');
            return;
        } else if (e.message.includes('DUPLICATE')) {
            // DATA JUNKIE: Don't skip duplicates, just log and continue
            log(`Re-scanning ${filename} for learning (duplicate file)`, 'info');
            // Try again with force flag
            try {
                const result = await window.pdfParser.parsePDF(file, { skipDuplicateCheck: true, force: true });
                if (result && result.transactions) {
                    log(`Learned from ${result.transactions.length} transactions in duplicate file`, 'success');
                }
            } catch (retryError) {
                log(`Could not learn from ${filename}: ${retryError.message}`, 'warn');
            }
        } else {
            log(`PDF Error ${filename}: ${e.message}`, 'warn');
        }
    }
}

function learnPattern(description, category, accountNumber, sourceFile, parserName) {
    const cleanDesc = description.trim();

    // STRICT COA VALIDATION (v23) - Only validate if accountNumber is provided
    // User Requirement: "Do not import any transaction which doesnt have a corresponding account which matches with COA"
    // BUT: Allow learning patterns without account numbers (for training mode)

    if (accountNumber) {
        // Ensure COA is loaded (Lazy Load if needed)
        if (!window.indexerState.validCoaIds) {
            try {
                const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');
                window.indexerState.validCoaIds = new Set(coa.map(c => String(c.code || c.id || c.accountNumber)));
            } catch (e) { }
        }

        // Check if Account exists in COA
        if (window.indexerState.validCoaIds && window.indexerState.validCoaIds.size > 0) {
            if (!window.indexerState.validCoaIds.has(String(accountNumber))) {
                // console.warn(`Skipping invalid account: ${accountNumber} for ${cleanDesc}`);
                return; // REJECT
            }
        }
    }

    // Create Item
    const item = {
        description: cleanDesc,
        account: category,
        accountNumber: accountNumber || '',
        confidence: 1.0,
        source: sourceFile,
        parser: parserName || 'Unknown'
    };

    if (window.indexerState.memory[cleanDesc]) {
        // If we have a richer entry (e.g. now we have an account number), update it
        const entry = window.indexerState.memory[cleanDesc];
        entry.frequency = (entry.frequency || 1) + 1; // Increment Frequency

        if (!entry.accountNumber && accountNumber) {
            entry.accountNumber = accountNumber;
            entry.account = category; // Update category if we found a better source
        }

        // Update parser if unknown
        if ((!entry.parser || entry.parser === 'Unknown') && parserName) {
            entry.parser = parserName;
        }

        // Boost confidence based on frequency
        if (entry.frequency > 2) entry.confidence = Math.min(1.0, entry.confidence + 0.1);

    } else {
        item.frequency = 1; // Init frequency
        window.indexerState.memory[cleanDesc] = item;
        window.indexerState.learnedRules++;
        updateStats();

        // Update Grid (Batched)
        window.indexerState.pendingGridRows.push(item);
    }

    // Update Scroll count
    const badge = document.getElementById('grid-count');
    if (badge) badge.textContent = `${window.indexerState.learnedRules} items`;
}

function finishScan() {
    window.indexerState.isScanning = false;

    // Stop Timer
    if (window.indexerState.timerInterval) {
        clearInterval(window.indexerState.timerInterval);
        window.indexerState.timerInterval = null;
    }

    finishScanUI();
    log('Scan Complete.', 'success');
    log(`Total Rules Learned: ${window.indexerState.learnedRules}`, 'success');

    // Auto-Save Memory
    localStorage.setItem('ab3_user_memory', JSON.stringify(window.indexerState.memory));

    // Final Save of Registry
    const ary = Array.from(window.indexerState.scannedRegistry);
    localStorage.setItem('indexer_scanned_hashes', JSON.stringify(ary));

    localStorage.removeItem('indexer_last_file'); // Clear crash marker
    log('Memory & Scan History saved to browser storage.', 'system');

    updateAccountNavigator();
}

function finishScanUI() {
    document.getElementById('status-dot').classList.remove('active');
    document.getElementById('status-dot').classList.remove('paused');
    document.getElementById('status-text').textContent = 'COMPLETE';

    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-skip-folder').disabled = true;
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-play-text').textContent = 'START SCAN';
}

// ==========================================
// ACTION BUTTONS
// ==========================================

window.promoteToDictionary = async function (skipSuspense = false) {
    let rules = Object.values(window.indexerState.memory);
    if (!rules.length) {
        window.showAlert('Empty', 'No rules to promote! Scan a drive first.');
        return;
    }

    if (skipSuspense) {
        const countBefore = rules.length;
        rules = rules.filter(r => r.accountNumber !== '9970');
        const countAfter = rules.length;
        if (countAfter < countBefore) log(`Filtered out ${countBefore - countAfter} suspense rules from import.`, 'info');
    }

    // STRICT COA VALIDATION (Import Time)
    // Ensures we never pollute the dictionary with invalid codes, even from old JSON scans
    const coaRaw = localStorage.getItem('ab3_coa');
    if (coaRaw) {
        try {
            const coa = JSON.parse(coaRaw);
            const validIds = new Set(coa.map(c => String(c.code || c.id || c.accountNumber)));

            const beforeCount = rules.length;
            rules = rules.filter(r => validIds.has(String(r.accountNumber)));
            const afterCount = rules.length;

            if (afterCount < beforeCount) {
                log(`🛑 Dropped ${beforeCount - afterCount} rules with INVALID COA codes.`, 'warn');
            }
        } catch (e) { console.error("Import COA Check Failed:", e); }
    }

    window.showConfirm('Promote to Dictionary', `Are you sure you want to promote ${rules.length} learned rules to the main Vendor Dictionary?`, async () => {
        log('Promoting rules to Vendor Dictionary...', 'info');
        // ... (promotion logic) ...
        // We need to move the logic inside callback, but wait, promoteToDictionary is async.
        // Confirm modal is callback based. We need to refactor slightly.
        await doPromotion(rules);
    });
}

async function doPromotion(rules) {
    // const rules = Object.values(window.indexerState.memory); // Use passed rules
    let promoted = 0;

    // ... logic ...
    for (const rule of rules) {
        if (window.VendorEngine) {
            await window.VendorEngine.learn(rule.description, rule.account, { accountNumber: rule.accountNumber });
            promoted++;
        }
    }

    log(`✅ Successfully promoted ${promoted} vendors to the Dictionary.`, 'success');
    window.showAlert('Success', `Success! ${promoted} vendors added to your global dictionary.`);
}




window.downloadLogs = function () {
    // Limit Logs in Memory (Prevent OOM)
    if (window.indexerState.logs.length > 1000) {
        window.indexerState.logs.shift(); // Remove oldest
    }

    const content = window.indexerState.logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_junkie_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
}

// Global Log Function (Refined)
function log(msg, type = 'info') {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;

    // Add to State
    window.indexerState.logs.push(entry);

    // Rotate Logs (Memory Safety)
    if (window.indexerState.logs.length > 1000) {
        window.indexerState.logs.shift();
    }

    // Persist Critical Errors
    if (type === 'error') {
        try {
            const crashLog = window.indexerState.logs.slice(-50); // Save last 50 lines context
            localStorage.setItem('indexer_crash_log', JSON.stringify(crashLog));
        } catch (e) { }
    }

    // Update terminal UI (Optimized: Append instead of full re-render if possible, or throttle)
    // For now, simple append
    const term = document.getElementById('terminal-output');
    if (term) {
        const div = document.createElement('div');
        div.className = `log-line ${type}`;
        div.textContent = `> ${msg}`;
        term.appendChild(div);
        term.scrollTop = term.scrollHeight;

        // Cleanup DOM? (Optional: remove old lines from DOM too)
        if (term.childElementCount > 1000) {
            term.removeChild(term.firstChild);
        }
    }
}

window.downloadMemory = function () {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(window.indexerState.memory, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "learned_memory.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

window.handleMemoryUpload = function (input) {
    if (!input.files || input.files.length === 0) return;
    const file = input.files[0];

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const json = JSON.parse(e.target.result);
            if (!json || typeof json !== 'object') throw new Error("Invalid JSON");

            // Merge Logic
            let count = 0;
            const validCoaIds = window.indexerState.validCoaIds || new Set();
            const checkCoa = (validCoaIds.size > 0);

            for (const key in json) {
                const item = json[key];
                // Basic Validation
                if (!item.description) continue;

                // COA Check (if item has account number)
                if (checkCoa && item.accountNumber && !validCoaIds.has(String(item.accountNumber))) {
                    continue; // Skip invalid COA from imported JSON
                }

                // Merge
                window.indexerState.memory[key] = item;
                count++;
            }

            window.indexerState.learnedRules = Object.keys(window.indexerState.memory).length;

            // Refresh Grid
            if (window.indexerState.gridApi) {
                // Determine new rows vs updates? Easier to setRowData for bulk import
                const allRows = Object.values(window.indexerState.memory);
                window.indexerState.gridApi.setRowData(allRows);
            }

            updateStats();
            updateAccountNavigator();

            log(`📥 Imported ${count} rules from JSON.`, 'success');
            alert(`Successfully imported ${count} rules!`);

        } catch (err) {
            alert("Failed to parse JSON: " + err.message);
            console.error(err);
        }
        input.value = ''; // Reset
    };
    reader.readAsText(file);
};

window.clearMemory = function () {
    if (!confirm("Clear session memory?")) return;
    window.indexerState.memory = {};
    window.indexerState.learnedRules = 0;
    if (window.indexerState.gridApi) window.indexerState.gridApi.setRowData([]);
    updateStats();
    log('Memory cleared.', 'warn');
}


window.filterSuspense = function () {
    if (!window.indexerState.gridApi) return;

    const filterModel = window.indexerState.gridApi.getFilterModel();
    if (filterModel && filterModel['accountNumber']) {
        window.indexerState.gridApi.setFilterModel(null); // Clear
    } else {
        window.indexerState.gridApi.setFilterModel({
            accountNumber: {
                filterType: 'text',
                type: 'equals',
                filter: '9970'
            }
        });
    }
}

window.copySuspenseList = function () {
    const memory = window.indexerState.memory;
    let suspenseItems = [];

    // Find all 9970s
    for (const key in memory) {
        if (memory[key].accountNumber === '9970') {
            suspenseItems.push(memory[key].description);
        }
    }

    if (suspenseItems.length === 0) {
        window.showAlert("No Suspense Items", "Great news! No '9970' items were found in memory.");
        return;
    }

    // Format as list
    const textData = suspenseItems.join('\n');

    // Copy to clipboard
    navigator.clipboard.writeText(textData).then(() => {
        window.showAlert("Copied to Clipboard", `Copied ${suspenseItems.length} suspense items!\n\nPaste them to your Agent to find categories.`);
    }).catch(err => {
        console.error('Failed to copy: ', err);
        window.showAlert("Error", "Failed to copy to clipboard. Please check browser permissions.");
    });
}

window.previewFile = async function (filename) {
    const handle = window.indexerState.fileHandles[filename];

    if (!handle) {
        window.showAlert('Error', 'File handle lost. Please rescan.');
        return;
    }
    // ... logic for preview ...

    const modal = document.getElementById('file-preview-modal');
    const title = document.getElementById('preview-title');
    const body = document.getElementById('preview-body');

    modal.style.display = 'flex';
    title.textContent = `Preview: ${filename}`;
    body.innerHTML = '<div style="text-align:center; padding: 40px; color: #64748b;">Loading content...</div>';

    try {
        const file = await handle.getFile();
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];

        // Convert to HTML
        const html = XLSX.utils.sheet_to_html(sheet, { id: 'preview-table', editable: false });
        body.innerHTML = html;
    } catch (e) {
        body.innerHTML = `<div style="color:red; padding: 20px;">Error reading file: ${e.message}</div>`;
    }
}

window.closePreview = function () {
    document.getElementById('file-preview-modal').style.display = 'none';
}
// ==========================================
// SYNC UTILS
// ==========================================

// Helper to update stats in both windows
function updateStats() {
    const ids = ['idx-files', 'idx-rules', 'idx-time'];
    const values = [
        window.indexerState.processedCount || 0, // Top stats just shows count
        window.indexerState.learnedRules,
        document.getElementById('idx-time')?.textContent || '00:00:00'
    ];

    // Terminal Progress
    const termStats = document.getElementById('terminal-stats');
    if (termStats) {
        if (window.indexerState.totalScanCount > 0) {
            termStats.textContent = `Progress: ${window.indexerState.processedCount || 0} / ${window.indexerState.totalScanCount}`;
        } else {
            termStats.textContent = 'Ready';
        }
    }

    ids.forEach((id, i) => {
        // Local
        const el = document.getElementById(id);
        if (el) el.textContent = values[i];

        // Pop-out
        if (window.indexerState.popoutWindow && !window.indexerState.popoutWindow.closed) {
            const popEl = window.indexerState.popoutWindow.document.getElementById(id);
            if (popEl) popEl.textContent = values[i];
        }
    });

    // Sync Timer Text specifically
    const localTime = document.getElementById('idx-time')?.textContent;
    if (localTime && window.indexerState.popoutWindow) {
        const popTime = window.indexerState.popoutWindow.document.getElementById('idx-time');
        if (popTime) popTime.textContent = localTime;
    }
}





// ==========================================
// UTILS
// ==========================================

function log(msg, type = 'info') {
    // Store in state
    const timestamp = new Date().toLocaleTimeString();
    window.indexerState.logs.push(`[${timestamp}] [${type.toUpperCase()}] ${msg}`);

    const term = document.getElementById('terminal-output');
    if (!term) return;

    const line = document.createElement('div');
    line.className = `log-line ${type}`;
    line.textContent = `> ${msg}`;
    term.appendChild(line);
    term.scrollTop = term.scrollHeight;
}


function startTimer() {
    if (window.indexerState.timerInterval) clearInterval(window.indexerState.timerInterval);
    window.indexerState.timerInterval = setInterval(() => {
        if (!window.indexerState.startTime) return;
        const diff = Date.now() - window.indexerState.startTime;
        const date = new Date(diff);
        const str = date.toISOString().substr(11, 8);
        const el = document.getElementById('idx-time');
        if (el) el.textContent = str;
    }, 1000);
}

window.handleGridEdit = function (params) {
    const oldKey = params.data.description; // Note: data is already updated by AG Grid in memory? No, params.data is the ROW data.
    // If description changed, the key in memory needs moving.

    // Actually, AG Grid updates params.data inplace before calling this?
    // Let's rely on params.oldValue for the changed field.

    const mem = window.indexerState.memory;
    const item = params.data;
    const col = params.colDef.field;

    if (col === 'description') {
        // Key change
        const oldDesc = params.oldValue;
        const newDesc = params.newValue;
        if (mem[oldDesc]) {
            delete mem[oldDesc];
            mem[newDesc] = item;
            log(`Renamed rule: ${oldDesc} -> ${newDesc}`, 'info');
        }
    } else {
        // Just update value
        if (mem[item.description]) {
            mem[item.description] = item;
            log(`Updated ${col} for ${item.description}`, 'info');
        }
    }

    // Persist
    localStorage.setItem('ab3_user_memory', JSON.stringify(mem));

    // If account number changed, update navigator
    if (col === 'accountNumber') updateAccountNavigator();
}

window.deleteRule = function (desc) {
    window.showConfirm('Delete Rule', `Delete rule for "${desc}"?`, () => {
        if (window.indexerState.memory[desc]) {
            delete window.indexerState.memory[desc];

            // Remove from Grid
            const rowData = [];
            window.indexerState.gridApi.forEachNode(node => {
                if (node.data.description !== desc) rowData.push(node.data);
            });
            window.indexerState.gridApi.setRowData(rowData);

            // Update stats
            window.indexerState.learnedRules--;
            updateStats();

            // Persist
            localStorage.setItem('ab3_user_memory', JSON.stringify(window.indexerState.memory));
            log(`Deleted rule: ${desc}`, 'warn');

            updateAccountNavigator();
        }
    });
}


window.showConfirm = function (title, msg, onConfirm) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-body').textContent = msg;
    document.getElementById('alert-cancel').style.display = 'inline-block';

    // Setup OK button
    const okBtn = document.getElementById('alert-ok');
    okBtn.onclick = function () {
        modal.style.display = 'none';
        if (onConfirm) onConfirm();
    };

    modal.style.display = 'flex';
}

window.showAlert = function (title, msg) {
    const modal = document.getElementById('confirm-modal');
    document.getElementById('alert-title').textContent = title;
    document.getElementById('alert-body').textContent = msg;
    document.getElementById('alert-cancel').style.display = 'none';

    document.getElementById('alert-ok').onclick = function () {
        modal.style.display = 'none';
    };
    modal.style.display = 'flex';
}

window.closeAlert = function () {
    document.getElementById('confirm-modal').style.display = 'none';
}

window.updateAccountNavigator = function () {
    const sel = document.getElementById('accountNavigator');
    if (!sel) return;

    // Collect all accounts
    const counts = {};
    Object.values(window.indexerState.memory).forEach(item => {
        const acc = item.accountNumber || 'Unknown';
        counts[acc] = (counts[acc] || 0) + 1;
    });

    const sorted = Object.keys(counts).sort();

    let html = '<option value="">(All Accounts)</option>';
    sorted.forEach(acc => {
        html += `<option value="${acc}">${acc} (${counts[acc]} items)</option>`;
    });

    sel.innerHTML = html;
}

window.filterGridByAccount = function (val) {
    if (!window.indexerState.gridApi) return;

    if (!val) {
        window.indexerState.gridApi.setFilterModel(null);
    } else {
        window.indexerState.gridApi.setFilterModel({
            accountNumber: {
                filterType: 'text',
                type: 'equals',
                filter: val
            }
        });
    }
}



// =======================================================
// UI ACTIONS (Added for v20 Enhancements)
// =======================================================

/**
 * Open local file using Blob URL (Safe for Browser)
 */
window.openFile = async (filename) => {
    const handle = window.indexerState.fileHandles[filename];
    if (handle) {
        try {
            // Basic permission check? Browser usually prompts on getFile()
            const file = await handle.getFile();
            const url = URL.createObjectURL(file);
            window.open(url, '_blank');
        } catch (e) { alert('Could not open file: ' + e.message); }
    } else {
        alert('File handle not found for: ' + filename);
    }
};

/**
 * Delete Selected Rows
 */
window.deleteSelected = () => {
    const gridApi = window.indexerState.gridApi || window.indexerState.popoutGridApi;
    if (!gridApi) return;

    const selected = gridApi.getSelectedRows();
    if (selected.length === 0) {
        alert("No items selected.");
        return;
    }

    if (!confirm(`Delete ${selected.length} items?`)) return;

    // Remove from memory
    selected.forEach(item => {
        delete window.indexerState.memory[item.description];
    });

    // Remove from Grid
    gridApi.applyTransaction({ remove: selected });

    // Update Count
    window.indexerState.learnedRules -= selected.length;
    const badge = document.getElementById('grid-count');
    if (badge) badge.textContent = `${window.indexerState.learnedRules} items`;
};

/**
 * Mega Fix: Remove Garbage / Low Confidence Items
 */
window.megaFix = () => {
    if (!confirm("MEGA FIX: This will delete all items with 'Uncategorized' account or 'Unknown' category. Continue?")) return;

    const gridApi = window.indexerState.gridApi || window.indexerState.popoutGridApi;
    const allData = [];
    gridApi.forEachNode(node => allData.push(node.data));

    // Define Garbage Criteria
    const garbage = allData.filter(item =>
        (item.account === 'Uncategorized' || item.account === 'Unknown' || !item.account) ||
        (item.description.length < 3) // Noise
    );

    if (garbage.length === 0) {
        alert("No garbage found! Clean machine.");
        return;
    }

    // Remove
    garbage.forEach(item => delete window.indexerState.memory[item.description]);
    gridApi.applyTransaction({ remove: garbage });

    window.indexerState.learnedRules -= garbage.length;
    const badge = document.getElementById('grid-count');
    if (badge) badge.textContent = `${window.indexerState.learnedRules} items`;

    alert(`MEGA FIX Complete: Removed ${garbage.length} items.`);
};

/**
 * Trigger Import
 */
window.triggerImport = (skipSuspense = false) => {
    if (window.indexerState.learnedRules === 0) {
        alert("Nothing to import! Scan some files first.");
        return;
    }

    const msg = skipSuspense ?
        `Ready to import learned rules, EXCLUDING Suspense (9970)?` :
        `Ready to import ${window.indexerState.learnedRules} learned rules?`;

    if (!confirm(msg)) return;

    // Map to promoteToDictionary
    promoteToDictionary(skipSuspense);
};

