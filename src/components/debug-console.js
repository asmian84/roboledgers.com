/**
 * Debug Console Component
 * A floating panel to visualize internal application logs, parser output, and system state.
 * Connects to ProcessingEngine and global event streams.
 */

class DebugConsole {
    constructor() {
        this.isVisible = false;
        this.logs = [];
        this.maxLogs = 200;
        this.dom = null;
    }

    init() {
        if (document.getElementById('ab-debug-console')) return;

        this.createDOM();
        this.attachListeners();
        this.log('system', 'Debug Console Initialized');

        // Expose global toggle
        window.toggleDebugConsole = () => this.toggle();
    }

    createDOM() {
        const container = document.createElement('div');
        container.id = 'ab-debug-console';
        container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 600px;
            height: 400px;
            background: #1e1e1e;
            color: #d4d4d4;
            border: 1px solid #333;
            border-radius: 8px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            display: none;
            flex-direction: column;
            font-family: 'Consolas', 'Monaco', monospace;
            font-size: 12px;
            z-index: 99999;
            resize: both;
            overflow: hidden;
        `;

        container.innerHTML = `
            <div style="padding: 8px 12px; background: #252526; border-bottom: 1px solid #333; display: flex; justify-content: space-between; align-items: center; cursor: move;" id="ab-debug-header">
                <span style="font-weight: bold; color: #fff;">🛠️ RoboLedgers Debug Console</span>
                <div>
                    <button id="ab-debug-clear" style="background: none; border: none; color: #ccc; cursor: pointer; margin-right: 10px;">🚫 Clear</button>
                    <button id="ab-debug-close" style="background: none; border: none; color: #ccc; cursor: pointer;">✕</button>
                </div>
            </div>
            <div class="ab-debug-tabs" style="display: flex; background: #2d2d2d; border-bottom: 1px solid #333;">
                <button class="tab active" data-tab="log" style="padding: 6px 12px; border: none; background: #3e3e42; color: white; cursor: pointer;">Live Log</button>
                <button class="tab" data-tab="parser" style="padding: 6px 12px; border: none; background: transparent; color: #ccc; cursor: pointer;">Parser Dump</button>
                <button class="tab" data-tab="status" style="padding: 6px 12px; border: none; background: transparent; color: #ccc; cursor: pointer;">System Status</button>
            </div>
            <div id="ab-debug-content-log" style="flex: 1; overflow-y: auto; padding: 8px;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tbody id="ab-debug-log-body"></tbody>
                </table>
            </div>
            <div id="ab-debug-content-parser" style="flex: 1; overflow-y: auto; padding: 8px; display: none; white-space: pre-wrap;">
                <div style="color: #888;">No parser data available yet. Run an import to see raw text.</div>
            </div>
            <div id="ab-debug-content-status" style="flex: 1; overflow-y: auto; padding: 8px; display: none;">
                <div id="ab-debug-status-body">Loading...</div>
            </div>
        `;

        document.body.appendChild(container);
        this.dom = container;

        // Drag functionality
        const header = container.querySelector('#ab-debug-header');
        let isDragging = false;
        let startX, startY, initialLeft, initialTop;

        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            const rect = container.getBoundingClientRect();
            initialLeft = rect.left;
            initialTop = rect.top;
            container.style.right = 'auto'; // Switch to left/top positioning
            container.style.bottom = 'auto';
            container.style.left = initialLeft + 'px';
            container.style.top = initialTop + 'px';
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            container.style.left = (initialLeft + dx) + 'px';
            container.style.top = (initialTop + dy) + 'px';
        });

        document.addEventListener('mouseup', () => isDragging = false);
    }

    attachListeners() {
        // Close button
        this.dom.querySelector('#ab-debug-close').onclick = () => this.toggle();

        // Clear button
        this.dom.querySelector('#ab-debug-clear').onclick = () => {
            this.logs = [];
            this.renderLogs();
        };

        // Tab switching
        const tabs = this.dom.querySelectorAll('.tab');
        tabs.forEach(tab => {
            tab.onclick = () => {
                tabs.forEach(t => {
                    t.classList.remove('active');
                    t.style.background = 'transparent';
                    t.style.color = '#ccc';
                });
                tab.classList.add('active');
                tab.style.background = '#3e3e42';
                tab.style.color = 'white';

                const target = tab.dataset.tab;
                this.dom.querySelectorAll('[id^="ab-debug-content-"]').forEach(el => el.style.display = 'none');
                this.dom.querySelector(`#ab-debug-content-${target}`).style.display = 'block';

                if (target === 'parser') this.updateParserView();
                if (target === 'status') this.updateStatusView();
            };
        });

        // Global Event Listener for Logs
        window.addEventListener('ab-debug-log', (e) => {
            if (e.detail) {
                this.addLog(e.detail.level, e.detail.message, e.detail.data);
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.dom.style.display = this.isVisible ? 'flex' : 'none';

        if (this.isVisible) {
            this.renderLogs();
        }
    }

    addLog(level, message, data) {
        const entry = {
            time: new Date().toLocaleTimeString(),
            level,
            message,
            data
        };
        this.logs.unshift(entry); // Newest first
        if (this.logs.length > this.maxLogs) this.logs.pop();

        if (this.isVisible) {
            this.renderRow(entry, true);
        }
    }

    renderRow(entry, insertTop = false) {
        const tbody = this.dom.querySelector('#ab-debug-log-body');
        const colorMap = {
            'log': '#9cdcfe',
            'info': '#9cdcfe',
            'warn': '#ce9178',
            'error': '#f48771',
            'system': '#6a9955'
        };
        const color = colorMap[entry.level] || '#d4d4d4';

        const tr = document.createElement('tr');
        tr.style.fontFamily = 'monospace';
        tr.style.borderBottom = '1px solid #333';

        // Format data if present
        let dataStr = '';
        if (entry.data) {
            try {
                dataStr = typeof entry.data === 'object' ? JSON.stringify(entry.data) : String(entry.data);
                if (dataStr.length > 50) dataStr = dataStr.substring(0, 50) + '...';
            } catch (e) { }
        }

        tr.innerHTML = `
            <td style="color: #569cd6; width: 80px; vertical-align: top; padding: 2px;">${entry.time}</td>
            <td style="color: ${color}; width: 50px; vertical-align: top; padding: 2px;">[${entry.level.toUpperCase()}]</td>
            <td style="color: #d4d4d4; vertical-align: top; padding: 2px;">
                ${entry.message}
                ${dataStr ? `<span style="color: #808080; display: block; font-size: 0.9em;">${dataStr}</span>` : ''}
            </td>
        `;

        if (insertTop) {
            tbody.prepend(tr);
        } else {
            tbody.appendChild(tr);
        }
    }

    renderLogs() {
        const tbody = this.dom.querySelector('#ab-debug-log-body');
        tbody.innerHTML = '';
        this.logs.forEach(log => this.renderRow(log));
    }

    updateParserView() {
        const container = this.dom.querySelector('#ab-debug-content-parser');
        if (window.rbcChequingParser && window.rbcChequingParser.metadata && window.rbcChequingParser.metadata.debug_raw_header) {
            container.innerText = window.rbcChequingParser.metadata.debug_raw_header;
        } else if (window.rbcChequingParser && window.rbcChequingParser.lastLineMetadata) {
            container.innerText = window.rbcChequingParser.lastLineMetadata.map(l => l.text).join('\n');
        } else {
            container.innerHTML = '<div style="color: #888;">No raw parser data found.</div>';
        }
    }

    updateStatusView() {
        const container = this.dom.querySelector('#ab-debug-status-body');

        // Gather stats
        let vendorCount = 'Unknown';
        if (window.merchantDictionary) {
            // This is async in reality, but we check if we can get a quick count property or cache
            // For now just check if initialized
            vendorCount = window.merchantDictionary.isInitialized ? 'Initialized' : 'Not Initialized';
        }

        const seedStatus = localStorage.getItem('ab_data_seeding_complete_v1');

        container.innerHTML = `
            <div style="margin-bottom: 10px;">
                <strong>System Health:</strong>
            </div>
            <ul>
                <li><strong>Seeder Status:</strong> ${seedStatus === 'true' ? '<span style="color:#4ec9b0">Complete</span>' : '<span style="color:#f48771">Pending/Failed</span>'}</li>
                <li><strong>Vendor DB:</strong> ${vendorCount}</li>
                <li><strong>Window.SEED_DATA:</strong> ${window.SEED_DATA ? 'Present (Memory Leak?)' : 'Cleared (Good)'}</li>
                <li><strong>LocalStorage:</strong> ${(JSON.stringify(localStorage).length / 1024).toFixed(2)} KB</li>
            </ul>
        `;
    }

    // Internal log helper
    log(level, msg, data) {
        this.addLog(level, msg, data);
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
    window.DebugConsole = new DebugConsole();
    setTimeout(() => window.DebugConsole.init(), 1000);
});
