/**
 * GridPopoutService
 * Manages detachment of AG Grids into separate browser windows.
 * Handles resource injection (CSS/JS) and Grid Initialization.
 */
class GridPopoutService {
    constructor() {
        this.activeWindows = new Map(); // gridId -> window reference
    }

    /**
     * Opens a new window and initializes an AG Grid inside it.
     * @param {string} gridId - Unique identifier for the grid
     * @param {string} title - Window title
     * @param {object} gridOptions - AG Grid configuration object
     * @param {array} rowData - Data to populate
     * @param {function} onOpen - Callback when window opens successfully
     * @param {function} onClose - Callback when window is closed
     */
    open(gridId, title, gridOptions, rowData, onOpen, onClose) {
        // 1. Check if already open
        if (this.activeWindows.has(gridId)) {
            const existingWin = this.activeWindows.get(gridId);
            if (!existingWin.closed) {
                existingWin.focus();
                return;
            } else {
                this.activeWindows.delete(gridId);
            }
        }

        // 2. Open Window
        // width=1200,height=800 is a good default size
        const win = window.open('', '_blank', 'width=1200,height=800,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');

        if (!win) {
            alert('Popup blocked! Please allow popups for this site to use the Pop-Out Grid feature.');
            return;
        }

        this.activeWindows.set(gridId, win);

        // 3. Construct HTML Content
        // We explicitly inject ONLY the necessary styles and AG Grid script
        // to avoid re-initializing the entire application in the child window.
        const html = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${title} - Pop-Out View</title>
                
                <!-- Core Styles -->
                <link rel="stylesheet" href="src/styles/styles.css">
                
                <!-- Phosphor Icons (for cell renderers) -->
                <script src="https://unpkg.com/@phosphor-icons/web"></script>

                <!-- AG Grid Community -->
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-grid.css">
                <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-theme-quartz.css">
                <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/dist/ag-grid-community.min.js"></script>

                <style>
                    body { 
                        margin: 0; 
                        padding: 0; 
                        height: 100vh; 
                        display: flex; 
                        flex-direction: column; 
                        font-family: 'Inter', sans-serif;
                        background-color: var(--bg-color, #f8fafc);
                    }
                    .popout-header {
                        padding: 12px 24px;
                        background: white;
                        border-bottom: 1px solid #e2e8f0;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
                        z-index: 10;
                    }
                    .popout-title {
                        font-size: 16px;
                        font-weight: 600;
                        color: #1e293b;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    .popout-controls {
                        display: flex;
                        gap: 10px;
                    }
                    .btn-close {
                        padding: 6px 12px;
                        border: 1px solid #cbd5e1;
                        background: white;
                        border-radius: 6px;
                        cursor: pointer;
                        font-size: 13px;
                        color: #475569;
                        transition: all 0.2s;
                    }
                    .btn-close:hover {
                        background: #f1f5f9;
                        border-color: #94a3b8;
                    }
                    #grid-wrapper {
                        flex: 1;
                        width: 100%;
                        height: 0; /* Important for flex growth */
                        padding: 0;
                        position: relative;
                    }
                    #myGrid {
                        width: 100%;
                        height: 100%;
                    }
                    /* Ensure theme overrides work */
                    :root {
                        --ag-font-family: 'Inter', sans-serif;
                        --ag-header-height: 48px;
                        --ag-row-height: 48px;
                    }
                </style>
            </head>
            <body>
                <div class="popout-header">
                    <div class="popout-title">
                        <span>🪟</span>
                        ${title}
                    </div>
                    <div class="popout-controls">
                        <button class="btn-close" onclick="window.close()">Close Window</button>
                    </div>
                </div>
                <div id="grid-wrapper">
                    <div id="myGrid" class="ag-theme-quartz"></div>
                </div>
                
                <script>
                    // Wait for AG Grid to load
                    window.onload = function() {
                        if (typeof agGrid !== 'undefined') {
                            // Signal parent that we are ready
                            if (window.opener && window.opener.GridPopoutService) {
                                window.opener.GridPopoutService.initChildGrid(window);
                            }
                        } else {
                            document.body.innerHTML += '<p style="padding:20px; color:red;">Error: AG Grid failed to load.</p>';
                        }
                    };
                </script>
            </body>
            </html>
        `;

        win.document.write(html);
        win.document.close();

        // 4. Stash data for the child to grab (or push mechanism)
        // We attach the pending config to the service instance so initChildGrid can find it
        this.pendingConfig = {
            id: gridId,
            options: gridOptions,
            rowData: rowData
        };

        // 4.1 Trigger Open Callback
        if (onOpen) onOpen();

        // 5. Monitor Closing
        // We use a polling interval as a backup because onbeforeunload can be flaky cross-origin or if crashed
        const checkClosed = setInterval(() => {
            if (win.closed) {
                clearInterval(checkClosed);
                if (onClose) onClose();
            }
        }, 1000);

        // Also try standard event
        win.onbeforeunload = () => {
            // This might fire before the window is actually closed, but it's a good signal
        };
    }

    /**
     * openDashboard
     * Opens a generic window for custom UI (Data Junkie)
     */
    openDashboard(id, title, onInit, onClose) {
        if (this.activeWindows.has(id)) {
            const existingWin = this.activeWindows.get(id);
            if (!existingWin.closed) {
                existingWin.focus();
                return;
            } else {
                this.activeWindows.delete(id);
            }
        }

        const win = window.open('', '_blank', 'width=1400,height=900,menubar=no,toolbar=no,location=no,status=no,resizable=yes,scrollbars=yes');
        if (!win) { alert('Popup blocked!'); return; }

        this.activeWindows.set(id, win);

        // Create DOM Programmatically
        const doc = win.document;
        doc.open();
        doc.write('<!DOCTYPE html><html lang="en"><head><title>' + title + '</title></head><body><div id="root" class="popout-root"></div></body></html>');
        doc.close();

        // Inject Styles
        const linkCSS = doc.createElement('link');
        linkCSS.rel = 'stylesheet';
        linkCSS.href = 'src/styles/styles.css';
        doc.head.appendChild(linkCSS);

        const linkAG = doc.createElement('link');
        linkAG.rel = 'stylesheet';
        linkAG.href = 'https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-grid.css';
        doc.head.appendChild(linkAG);

        const linkTheme = doc.createElement('link');
        linkTheme.rel = 'stylesheet';
        linkTheme.href = 'https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/styles/ag-theme-quartz.css';
        doc.head.appendChild(linkTheme);

        const style = doc.createElement('style');
        style.textContent = 'body { margin: 0; padding: 0; background: #f8fafc; display: flex; flex-direction: column; height: 100vh; overflow:hidden; } .popout-root { flex: 1; display: flex; flex-direction: column; height: 100%; }';
        doc.head.appendChild(style);

        // Inject Scripts
        const scriptIcons = doc.createElement('script');
        scriptIcons.src = 'https://unpkg.com/@phosphor-icons/web';
        doc.head.appendChild(scriptIcons);

        const scriptAG = doc.createElement('script');
        scriptAG.src = 'https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/dist/ag-grid-community.min.js';
        scriptAG.onload = () => {
            if (window.opener && window.opener.GridPopoutService) {
                window.opener.GridPopoutService.initDashboard(win, id);
            }
        };
        doc.head.appendChild(scriptAG);

        // Register init callback
        this.pendingDashboards = this.pendingDashboards || {};
        this.pendingDashboards[id] = onInit;

        // Monitor close
        const checkClosed = setInterval(() => {
            if (win.closed) {
                clearInterval(checkClosed);
                if (onClose) onClose();
            }
        }, 1000);
    }

    static initDashboard(childWin, id) {
        const service = window.popoutService;
        if (service && service.pendingDashboards && service.pendingDashboards[id]) {
            service.pendingDashboards[id](childWin);
            delete service.pendingDashboards[id];
        }
    }
    /**
     * Called by the child window's onload script to bootstrap the grid.
     * @param {Window} childWin 
     */
    static initChildGrid(childWin) {
        // Access singleton instance from the parent window context
        const service = window.popoutService; // Assumes global instance
        if (!service || !service.pendingConfig) return;

        const config = service.pendingConfig;
        const gridDiv = childWin.document.getElementById('myGrid');

        // Apply Grid Options
        const options = {
            ...config.options, // Copy parent options
            rowData: config.rowData, // Use current data
            onGridReady: (params) => {
                params.api.sizeColumnsToFit();
                if (config.options.onGridReady) {
                    // CAUTION: Functions depending on closures in parent might fail
                    // Simple resize matches are fine.
                }
            }
        };

        // Create Grid
        childWin.agGrid.createGrid(gridDiv, options);
        console.log(`🚀 Pop-out grid '${config.id}' initialized.`);

        // Clear pending
        service.pendingConfig = null;
    }
}

// Global Instance
window.GridPopoutService = GridPopoutService; // Class ref for static calls
window.popoutService = new GridPopoutService(); // Singleton
