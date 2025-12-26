/**
 * Audit Log Page
 * Visualizes the System Log data.
 */

window.AuditLogPage = {
    render: function () {
        const logs = window.SystemLog ? window.SystemLog.getLogs() : [];

        return `
        <div class="audit-page" style="height: calc(100vh - 60px); display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', system-ui, sans-serif;">
            
            <!-- HEADER -->
            <div class="dashboard-header-modern" style="border-radius: 12px 12px 0 0; border: 1px solid #e2e8f0; margin-bottom: 0;">
                <div class="header-brand">
                    <div class="icon-box" style="background: linear-gradient(135deg, #64748b, #475569); box-shadow: 0 4px 6px -1px rgba(100, 116, 139, 0.3);">
                        📋
                    </div>
                    <div class="header-info">
                        <h2>System Audit Log</h2>
                        <div class="meta">
                            <span class="badge-account" style="color: #64748b; background: #f1f5f9;">${logs.length} Events Logged</span>
                            <span>•</span>
                            <span>Full History</span>
                        </div>
                    </div>
                </div>
                
                <div class="header-stats">
                    <button class="btn-secondary" onclick="window.AuditLogPage.refresh()">
                        🔄 Refresh
                    </button>
                    ${logs.length > 0 ? `
                    <button class="btn-danger-outline" onclick="if(confirm('Clear all logs?')) { window.SystemLog.clear(); window.AuditLogPage.refresh(); }">
                        🗑️ Clear Log
                    </button>` : ''}
                </div>
            </div>

            <!-- TABLE CONTAINER -->
            <div class="grid-container" style="flex: 1; overflow-y: auto; background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                <table class="uc-table" style="table-layout: fixed;">
                    <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10;">
                        <tr>
                            <th style="width: 180px; padding: 0.75rem 1rem;">Timestamp</th>
                            <th style="width: 120px; padding: 0.75rem 1rem;">Category</th>
                            <th style="width: 200px; padding: 0.75rem 1rem;">Action</th>
                            <th style="width: auto; padding: 0.75rem 1rem;">Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${logs.map(log => this.renderRow(log)).join('')}
                        ${logs.length === 0 ? '<tr><td colspan="4" style="padding: 3rem; text-align: center; color: #94a3b8;">No events recorded yet.</td></tr>' : ''}
                    </tbody>
                </table>
            </div>

        </div>
        `;
    },

    renderRow: function (log) {
        const date = new Date(log.timestamp).toLocaleString();
        let catColor = '#64748b';
        let icon = '📝';

        switch (log.category) {
            case 'DATA': icon = '💾'; catColor = '#2563eb'; break;
            case 'VENDOR': icon = '🏢'; catColor = '#d97706'; break;
            case 'ACCOUNT': icon = '📊'; catColor = '#059669'; break;
            case 'SYSTEM': icon = '🔧'; catColor = '#475569'; break;
        }

        let formattedDetails = log.details;
        try {
            // If JSON string, parse it for prettier display
            const parsed = JSON.parse(log.details);
            formattedDetails = Object.entries(parsed).map(([k, v]) => `<span style="opacity:0.7">${k}:</span> <strong>${v}</strong>`).join(' | ');
        } catch (e) {
            // plain string
        }

        return `
        <tr style="border-bottom: 1px solid #f1f5f9;">
            <td style="padding: 10px 1rem; color: #64748b; font-size: 0.85rem; font-family: monospace;">${date}</td>
            <td style="padding: 10px 1rem;">
                <span style="display: inline-flex; align-items: center; gap: 6px; padding: 2px 8px; border-radius: 4px; background: ${catColor}15; color: ${catColor}; font-weight: 600; font-size: 0.75rem;">
                    ${icon} ${log.category}
                </span>
            </td>
            <td style="padding: 10px 1rem; font-weight: 500; color: #1e293b;">${log.action}</td>
            <td style="padding: 10px 1rem; color: #334155; font-size: 0.9rem;">${formattedDetails}</td>
        </tr>
        `;
    },

    refresh: function () {
        const app = document.getElementById('app');
        if (app) app.innerHTML = this.render();
    }
};
