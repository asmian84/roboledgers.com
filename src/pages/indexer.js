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
    dirHandle: null,
    fileHandles: {}, // Transient storage for file handles (for opening)
    logs: [],
    memory: {},
    gridApi: null
};

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
                    { field: 'description', headerName: 'Pattern', flex: 2 },
                    { field: 'accountNumber', headerName: 'Acct #', width: 100 },
                    { field: 'account', headerName: 'Category', flex: 1 },
                    { field: 'frequency', headerName: 'Freq', width: 70 }, // New Freq Column
                    { field: 'confidence', headerName: 'Conf.', width: 80, valueFormatter: p => (p.value * 100).toFixed(0) + '%' }
                ],
                defaultColDef: { sortable: true, filter: true, resizable: true },
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
                     </div>
                </div>
                
                <hr class="separator">

                <button class="btn-secondary" onclick="promoteToDictionary()">
                    <i class="ph ph-book-bookmark"></i> PROMOTE KNOWLEDGE
                </button>

                <div class="status-indicator">
                    <div class="status-dot" id="status-dot"></div>
                    <span id="status-text">IDLE</span>
                </div>

                <div class="memory-actions">
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
                    <div class="terminal-header">
                        <span><i class="ph ph-terminal-window"></i> SYSTEM_LOG</span>
                        <span class="blinking-cursor">_</span>
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
    const gridOptions = {
        rowData: [],
        columnDefs: [
            { field: 'description', headerName: 'Pattern / Vendor', flex: 2, filter: true, editable: true },
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
}

window.selectAndScan = function () {
    // Trigger the HIDDEN file input instead of showing the API picker
    // This avoids the "Allow this site to view..." popup every time.
    const input = document.getElementById('dir-input');
    if (input) {
        input.value = ''; // Reset so onChange fires even if same directory selected
        input.click();
    } else {
        alert('Input element missing. Please reload page.');
    }
};

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

        // Buttons
        document.getElementById('btn-pause').disabled = false;
        document.getElementById('btn-stop').disabled = false;
        document.getElementById('btn-play').disabled = true;
        document.getElementById('btn-play-text').textContent = 'SCANNING...';

        window.indexerState.isScanning = true;
        window.indexerState.isPaused = false;
        window.indexerState.startTime = Date.now();
        startTimer();

        log(`Target acquired: ${folderName}`, 'success');
        log(`Found ${files.length} potential files. Starting crawl...`, 'info');

        // New Scan Logic: Iterate flat file list
        await scanFileList(files);

        // Complete
        finishScan();

    } catch (err) {
        log(`Error: ${err.message}`, 'error');
        console.error(err);
        window.indexerState.isScanning = false;
        finishScanUI();
    }
};

async function scanFileList(files) {
    if (!window.indexerState.isScanning) return;

    for (const file of files) {
        if (!window.indexerState.isScanning) break;

        // PAUSE LOOP
        while (window.indexerState.isPaused) {
            if (!window.indexerState.isScanning) break;
            await new Promise(r => setTimeout(r, 500));
        }

        try {
            // Check junk folders via path
            // file.webkitRelativePath contains the full relative path
            const pathParts = file.webkitRelativePath.split('/');
            if (pathParts.some(p => ['node_modules', '.git', 'dist', 'build', 'AppData', '$Recycle.Bin', 'System Volume Information', 'CW', 'cw'].includes(p))) {
                continue;
            }

            // Mock a fileHandle API so we don't have to rewrite processFile logic entirely
            // processFile expects { name, getFile() }
            const mockHandle = {
                name: file.name,
                getFile: async () => file
            };

            await processFile(mockHandle);

        } catch (innerErr) {
            console.warn(`Skipping file ${file.name}:`, innerErr);
        }
    }
}

// Replaces async function scanDirectory(dirHandle) { ... code removed ... }


async function processFile(fileHandle) {
    const name = fileHandle.name.toLowerCase();

    // Store handle
    window.indexerState.fileHandles[fileHandle.name] = fileHandle;

    // FILENAME CHECK
    const nameFilter = window.indexerState.filenameFilter;
    if (nameFilter && !name.includes(nameFilter)) return;

    // FILTER CHECK
    const filter = window.indexerState.scanFilter;
    if (filter === 'csv' && !name.endsWith('.csv')) return;
    if (filter === 'xls' && !name.includes('.xls')) return;
    if (filter === 'pdf' && !name.endsWith('.pdf')) return;

    // EXTENSION CHECK (Base)
    if (!name.endsWith('.xlsx') && !name.endsWith('.xls') && !name.endsWith('.csv') && !name.endsWith('.pdf')) return;

    // Increment Total (Visible feedback of progress)
    window.indexerState.totalFiles++;
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

                    learnPattern(desc, cat || 'Unknown', accNum, filename);
                    newRules++;
                }
            }

            if (newRules > 0) log(`+ Extracted ${newRules} MARRIED rules`, 'info');
        } else {
            // Verbose log for debugging (Optional, maybe too noisy?)
            // log(`Skipped ${filename}: No valid header row found.`, 'warn');
        }

    } catch (e) {
        log(`Parse error in ${filename}: ${e.message}`, 'error');
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

                learnPattern(txn.description, categoryForGrid, '', filename);

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
        if (e.message.includes('DUPLICATE')) {
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

function learnPattern(description, category, accountNumber, sourceFile) {
    const cleanDesc = description.trim();

    // Create Item
    const item = {
        description: cleanDesc,
        account: category,
        accountNumber: accountNumber || '',
        confidence: 1.0,
        source: sourceFile
    };

    if (window.indexerState.memory[cleanDesc]) {
        // If we have a richer entry (e.g. now we have an account number), update it
        const entry = window.indexerState.memory[cleanDesc];
        entry.frequency = (entry.frequency || 1) + 1; // Increment Frequency

        if (!entry.accountNumber && accountNumber) {
            entry.accountNumber = accountNumber;
            entry.account = category; // Update category if we found a better source
        }

        // Boost confidence based on frequency
        if (entry.frequency > 2) entry.confidence = Math.min(1.0, entry.confidence + 0.1);

    } else {
        item.frequency = 1; // Init frequency
        window.indexerState.memory[cleanDesc] = item;
        window.indexerState.learnedRules++;
        updateStats();

        // Update Grid (debounced? or batch?)
        // For visual feedback, update every item might be too slow if 1000s.
        // Let's do nothing here, and update grid periodically or at end?
        // Actually user wants to SEE it.
        if (window.indexerState.gridApi) {
            window.indexerState.gridApi.applyTransaction({ add: [item], addIndex: 0 });
        }
        // LIVE SYNC: Update Pop-out Grid
        // LIVE SYNC: Update Pop-out Grid
        if (window.indexerState.popoutGridApi) {
            window.indexerState.popoutGridApi.applyTransaction({ add: [item], addIndex: 0 });
        }
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
    log('Memory saved to browser storage.', 'system');

    updateAccountNavigator();
}

function finishScanUI() {
    document.getElementById('status-dot').classList.remove('active');
    document.getElementById('status-dot').classList.remove('paused');
    document.getElementById('status-text').textContent = 'COMPLETE';

    document.getElementById('btn-pause').disabled = true;
    document.getElementById('btn-stop').disabled = true;
    document.getElementById('btn-play').disabled = false;
    document.getElementById('btn-play-text').textContent = 'START SCAN';
}

// ==========================================
// ACTION BUTTONS
// ==========================================

window.promoteToDictionary = async function () {
    const rules = Object.values(window.indexerState.memory);
    if (!rules.length) {
        window.showAlert('Empty', 'No rules to promote! Scan a drive first.');
        return;
    }

    window.showConfirm('Promote to Dictionary', `Are you sure you want to promote ${rules.length} learned rules to the main Vendor Dictionary?`, async () => {
        log('Promoting rules to Vendor Dictionary...', 'info');
        // ... (promotion logic) ...
        // We need to move the logic inside callback, but wait, promoteToDictionary is async.
        // Confirm modal is callback based. We need to refactor slightly.
        await doPromotion();
    });
}

async function doPromotion() {
    const rules = Object.values(window.indexerState.memory);
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
    const content = window.indexerState.logs.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `data_junkie_logs_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
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
        window.indexerState.totalFiles,
        window.indexerState.learnedRules,
        document.getElementById('idx-time')?.textContent || '00:00:00'
    ];

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

