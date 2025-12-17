/**
 * AuditManager - Tracks and logs all user actions for accountability and debugging.
 * Persists to localStorage.
 */
const AuditManager = {
    logs: [],
    MAX_LOGS: 1000,

    init() {
        this.loadLogs();
        this.log('System', 'Audit Manager Initialized');
        this.render(); // Initial render if section is active
    },

    loadLogs() {
        try {
            const saved = localStorage.getItem('audit_log');
            if (saved) {
                this.logs = JSON.parse(saved);
            }
        } catch (e) {
            console.error('Failed to load audit logs', e);
            this.logs = [];
        }
    },

    saveLogs() {
        try {
            localStorage.setItem('audit_log', JSON.stringify(this.logs));
        } catch (e) {
            console.warn('Failed to save audit logs (Quota?)', e);
            // If quota exceeded, trim logs
            if (this.logs.length > 100) {
                this.logs = this.logs.slice(0, 50);
                this.saveLogs();
            }
        }
    },

    /**
     * Log an action
     * @param {string} category - e.g., 'Grid', 'Account', 'System', 'Vendor'
     * @param {string} action - e.g., 'Edit Value', 'Create Account'
     * @param {object|string} details - detailed info
     */
    log(category, action, details) {
        const entry = {
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            timestamp: new Date().toISOString(),
            category,
            action,
            details: typeof details === 'object' ? JSON.stringify(details) : String(details)
        };

        this.logs.unshift(entry); // Add to top

        // Limit size
        if (this.logs.length > this.MAX_LOGS) {
            this.logs.pop();
        }

        this.saveLogs();
        this.render(); // Update UI if visible
        console.log(`📝 [AUDIT] [${category}] ${action}:`, details);
    },

    clearLogs() {
        this.logs = [];
        this.saveLogs();
        this.render();
    },

    // Render to the Audit Section in app.html
    render() {
        const container = document.getElementById('auditLogList');
        if (!container) return; // UI might not be ready or section not active

        container.innerHTML = '';

        if (this.logs.length === 0) {
            container.innerHTML = '<div class="empty-state">No activity recorded.</div>';
            return;
        }

        this.logs.forEach(log => {
            const date = new Date(log.timestamp);
            const timeStr = date.toLocaleString();

            const item = document.createElement('div');
            item.className = 'audit-item';
            item.style.borderBottom = '1px solid var(--border-color)';
            item.style.padding = '10px';
            item.style.display = 'grid';
            item.style.gridTemplateColumns = '150px 100px 150px 1fr';
            item.style.gap = '10px';
            item.style.fontSize = '0.9rem';

            // Status Color based on Category
            let catColor = 'var(--text-primary)';
            if (log.category === 'Grid') catColor = '#3b82f6';
            if (log.category === 'Account') catColor = '#10b981';
            if (log.category === 'System') catColor = '#6b7280';
            if (log.category === 'Vendor') catColor = '#8b5cf6';

            item.innerHTML = `
                <div style="color:var(--text-secondary); font-size:0.8em;">${timeStr}</div>
                <div style="font-weight:600; color:${catColor};">${log.category}</div>
                <div style="font-weight:500;">${log.action}</div>
                <div style="color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title='${log.details}'>${log.details}</div>
            `;

            container.appendChild(item);
        });
    },

    exportLogs() {
        const csvContent = "data:text/csv;charset=utf-8,"
            + "Timestamp,Category,Action,Details\n"
            + this.logs.map(e => `${e.timestamp},${e.category},${e.action},"${e.details.replace(/"/g, '""')}"`).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "audit_log.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
};

// Expose globally
window.AuditManager = AuditManager;
