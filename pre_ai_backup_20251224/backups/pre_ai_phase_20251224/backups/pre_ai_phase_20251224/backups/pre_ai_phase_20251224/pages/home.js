/**
 * Home/Dashboard Page - RoboLedgers Command Center
 * Displays real-time financial metrics, AI status, and quick actions.
 */

window.renderHome = async function () {
    // 1. Fetch Real-Time Data
    const accounts = window.accountManager ? window.accountManager.getAllAccounts() : [];

    let allTransactions = [];
    try {
        allTransactions = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
    } catch (e) { console.error('Failed to load txns', e); }

    // 2. Calculate Metrics
    let totalCash = 0;
    let totalDebt = 0;

    if (window.accountManager) {
        accounts.forEach(acc => {
            const bal = window.accountManager.getAccountBalance(acc.id);
            if (acc.type === 'bank' || acc.type === 'asset') {
                totalCash += bal;
            } else if (acc.type === 'credit' || acc.type === 'liability') {
                totalDebt += Math.abs(bal);
            }
        });
    }

    const netPosition = totalCash - totalDebt;

    // AI Stats
    const totalTxns = allTransactions.length;
    const autoCategorized = allTransactions.filter(t => t.confidence && t.confidence > 0.8).length;
    const aiRate = totalTxns > 0 ? Math.round((autoCategorized / totalTxns) * 100) : 0;

    // Recent Activity (Last 5)
    const recentTxns = [...allTransactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    // 3. Render Dashboard
    return `
    <div class="page dashboard-page">
        <style>
            .dashboard-page { padding: 32px; max-width: 1200px; margin: 0 auto; animation: fadeIn 0.4s ease-out; }
            .dashboard-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
            .brand-large { font-size: 1.75rem; font-weight: 800; background: linear-gradient(135deg, #2563eb, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; letter-spacing: -0.03em; }
            .ai-badge { background: #ecfdf5; color: #059669; padding: 4px 10px; border-radius: 20px; font-weight: 600; font-size: 0.75rem; display: flex; align-items: center; gap: 6px; border: 1px solid #d1fae5; box-shadow: 0 1px 2px rgba(0,0,0,0.03); }
            
            /* Sleek Metrics - Smaller, tighter */
            .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-bottom: 24px; }
            .metric-card { background: white; border-radius: 12px; padding: 14px 16px; box-shadow: 0 2px 8px -2px rgba(0,0,0,0.04); border: 1px solid #f1f5f9; position: relative; overflow: hidden; transition: transform 0.2s; }
            .metric-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08); }
            
            .metric-label { font-size: 0.75rem; color: #64748b; font-weight: 600; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; }
            .metric-value { font-size: 1.5rem; font-weight: 700; color: #1e293b; letter-spacing: -0.02em; }
            .metric-sub { font-size: 0.75rem; color: #94a3b8; margin-top: 2px; }

            /* Compact Main Split */
            .main-split { display: grid; grid-template-columns: 1.8fr 1.2fr; gap: 20px; }
            @media (max-width: 900px) { .main-split { grid-template-columns: 1fr; } }

            .panel { background: white; border-radius: 16px; padding: 20px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.02); }
            .panel-header { font-size: 0.95rem; font-weight: 700; color: #334155; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; letter-spacing: -0.01em; }

            /* Cute Action Grid - 4 Columns */
            .action-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
            .action-card { padding: 16px 8px; border: 1px solid #e2e8f0; border-radius: 12px; text-align: center; cursor: pointer; transition: all 0.2s; background: #fff; color: #475569; display: flex; flex-direction: column; align-items: center; gap: 8px; box-shadow: 0 1px 2px rgba(0,0,0,0.02); }
            .action-card:hover { border-color: #bfdbfe; background: #eff6ff; color: #2563eb; transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.1); }
            .action-icon { font-size: 1.5rem; filter: drop-shadow(0 2px 2px rgba(0,0,0,0.05)); }
            .action-label { font-size: 0.8rem; font-weight: 600; line-height: 1.2; }
            .action-sub { font-size: 0.7rem; color: #94a3b8; display: none; }

            /* Activity Feed */
            .activity-list { display: flex; flex-direction: column; gap: 8px; }
            .activity-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px dashed #f1f5f9; }
            .activity-item:last-child { border-bottom: none; }
            .act-info { display: flex; flex-direction: column; gap: 1px; }
            .act-main { font-weight: 500; font-size: 0.85rem; color: #334155; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
            .act-meta { font-size: 0.7rem; color: #94a3b8; }
            .act-amt { font-weight: 600; font-size: 0.9rem; }
            .amt-pos { color: #10b981; }
            .amt-neg { color: #334155; }

            /* Status Panel */
            .status-row { display: flex; align-items: center; gap: 10px; padding: 6px 0; font-size: 0.85rem; color: #475569; }
            .status-dot { width: 8px; height: 8px; background: #cbd5e1; border-radius: 50%; }
            .status-dot.active { background: #10b981; box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15); }
        </style>

        <div class="dashboard-header">
            <div>
                <div class="brand-large">RoboLedgers</div>
                <div style="color: #94a3b8; font-size: 0.9rem; font-weight: 500;">Financial Command Center</div>
            </div>
            <div class="ai-badge">
                <span style="font-size: 1.2em; color: #10b981;">●</span> All Systems Online
            </div>
        </div>

        <!-- SLEEK METRICS -->
        <div class="metrics-grid">
            <div class="metric-card">
                <div class="metric-label" style="color: #059669;">Liquid Assets</div>
                <div class="metric-value">${totalCash.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label" style="color: #dc2626;">Credit Usage</div>
                <div class="metric-value text-red" style="color: #ef4444;">$${totalDebt.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label" style="color: #7c3aed;">Net Position</div>
                <div class="metric-value" style="color: #1f2937;">$${netPosition.toLocaleString()}</div>
            </div>
            <div class="metric-card">
                <div class="metric-label" style="color: #2563eb;">AI Rate</div>
                <div class="metric-value" style="color: #3b82f6;">${aiRate}%</div>
            </div>
        </div>

        <div class="main-split">
            <!-- LEFT: COMPACT ACTIONS -->
            <div class="left-col">
                <div class="panel">
                    <div class="panel-header">Quick Actions</div>
                    <div class="action-grid">
                        <div class="action-card" onclick="window.location.hash='/data-import'">
                            <div class="action-icon">📥</div>
                            <div class="action-label">Smart Import</div>
                        </div>
                         <div class="action-card" onclick="window.openTransferAgent()">
                            <div class="action-icon">💸</div>
                            <div class="action-label">Transfers</div>
                        </div>
                        <div class="action-card" onclick="window.applyVendorRules ? window.applyVendorRules() : alert('Auto-Pilot Agent is initializing...')">
                            <div class="action-icon">🤖</div>
                            <div class="action-label">Auto-Pilot</div>
                        </div>
                        <div class="action-card" onclick="window.location.hash='/accounts'">
                            <div class="action-icon">🏦</div>
                            <div class="action-label">New Acct</div>
                        </div>
                    </div>
                </div>

                <div class="panel" style="margin-top: 20px; background: linear-gradient(135deg, #f8fafc, #fff);">
                    <div class="panel-header">System Health</div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
                        <div class="status-row">
                            <div class="status-dot active"></div>
                            <div>Transfer Agent</div>
                        </div>
                        <div class="status-row">
                            <div class="status-dot active"></div>
                            <div>Vendor Matcher</div>
                        </div>
                        <div class="status-row">
                            <div class="status-dot active"></div>
                            <div>Local Cloud</div>
                        </div>
                        <div class="status-row">
                            <div class="status-dot active"></div>
                            <div>Backup Service</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- RIGHT: PULSE -->
            <div class="right-col">
                <div class="panel">
                    <div class="panel-header">
                        Recent Activity
                        <a href="#/transactions" style="font-size: 0.75rem; color: #3b82f6; text-decoration: none; font-weight: 600;">View All →</a>
                    </div>
                    
                    ${recentTxns.length === 0 ?
            `<div style="text-align: center; color: #94a3b8; padding: 20px;">No recent transactions</div>` :
            `<div class="activity-list">
                            ${recentTxns.map(t => `
                                <div class="activity-item">
                                    <div class="act-info">
                                        <div class="act-main">${t.description || 'Unknown Transaction'}</div>
                                        <div class="act-meta">${new Date(t.date).toLocaleDateString()} • ${t.category || 'Uncategorized'}</div>
                                    </div>
                                    <div class="act-amt ${t.amount < 0 || t.type === 'debit' ? 'amt-neg' : 'amt-pos'}">
                                        ${parseFloat(t.amount).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                    </div>
                                </div>
                            `).join('')}
                        </div>`
        }
                </div>
            </div>
        </div>
    </div>
    `;
};

// Transfer Agent UI
// Transfer Agent UI
window.openTransferAgent = function () {
    if (!window.ModalService || !window.TransferAgent) {
        alert('Transfer Agent v1.0\nService initializing...');
        return;
    }

    // 1. Get Real Data
    let allTransactions = [];
    try { allTransactions = JSON.parse(localStorage.getItem('ab3_transactions') || '[]'); } catch (e) { }

    const clearingStatus = window.TransferAgent.getClearingStatus(allTransactions);
    const proposals = window.TransferAgent.proposeActions(allTransactions);

    // 2. Determine Agent State
    let statusColor = '#10b981'; // Green
    let statusText = 'Active (Idle)';
    let statusIcon = '●';

    if (!clearingStatus.isBalanced) {
        statusColor = '#ef4444'; // Red
        statusText = 'Attention Needed';
        statusIcon = '⚠';
    } else if (proposals.length > 0) {
        statusColor = '#f59e0b'; // Amber
        statusText = 'Transfers Detected';
        statusIcon = '●';
    }

    // 3. Render Modal
    window.ModalService.alert(
        '💸 Transfer Agent',
        `
        <div style="text-align: center; padding: 20px 0;">
            <div style="font-size: 3rem; margin-bottom: 16px;">🤖</div>
            <h3 style="color: #334155; margin-bottom: 8px;">Transfer Agent Online</h3>
            <p style="color: #64748b; margin-bottom: 24px;">Automatic double-entry manager.</p>
            
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: left; margin-bottom: 24px;">
                <div style="display:flex; justify-content:space-between; margin-bottom:12px; padding-bottom:12px; border-bottom:1px dashed #e2e8f0;">
                    <strong style="color: #475569;">Agent Status:</strong>
                    <span style="color: ${statusColor}; font-weight:600;">${statusIcon} ${statusText}</span>
                </div>
                <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                     <strong style="color: #475569;">Clearing Balance:</strong>
                     <span style="font-family:monospace; ${!clearingStatus.isBalanced ? 'color:#ef4444; font-weight:700;' : ''}">
                        $${clearingStatus.balance.toFixed(2)}
                     </span>
                </div>
                <div style="display:flex; justify-content:space-between;">
                     <strong style="color: #475569;">Pending Actions:</strong>
                     <span style="background: #e2e8f0; px-2 py-1 rounded; font-size: 0.8em; padding: 2px 6px; border-radius: 4px;">${proposals.length} Found</span>
                </div>
            </div>
            
            ${proposals.length > 0 ?
            `<div style="text-align:left; margin-bottom: 20px;">
                    <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:8px; text-transform:uppercase; font-weight:700;">Proposed Actions</div>
                    <div style="max-height: 150px; overflow-y:auto; border:1px solid #e2e8f0; border-radius:6px;">
                        ${proposals.map(p => `
                            <div style="padding:8px 12px; border-bottom:1px solid #f1f5f9; font-size:0.85rem; display:flex; justify-content:space-between;">
                                <span style="color:#334155;">${p.transaction.description.substring(0, 25)}...</span>
                                <span style="color:#10b981;">→ Transfer</span>
                            </div>
                        `).join('')}
                    </div>
                 </div>` : ''
        }
            
            <button class="btn-primary" 
                style="width: 100%; justify-content: center; background: ${proposals.length > 0 ? '#10b981' : '#3b82f6'};" 
                onclick="${proposals.length > 0 ? 'window.executeTransferProposals()' : 'document.getElementById(\'global-modal-overlay\').remove()'}">
                ${proposals.length > 0 ? `Auto-Categorize (${proposals.length})` : 'Run Manual Diagnosis'}
            </button>
        </div>
        `
    );
};

// Helper to execute proposals
window.executeTransferProposals = function () {
    let allTransactions = [];
    try { allTransactions = JSON.parse(localStorage.getItem('ab3_transactions') || '[]'); } catch (e) { }

    const count = window.TransferAgent.executeProposals(allTransactions);

    if (count > 0) {
        window.showToast(`✅ Auto-Categorized ${count} transfers!`, 'success');
        document.getElementById('global-modal-overlay').remove();
        // Refresh Dashboard
        document.getElementById('app').innerHTML = window.renderHome();
    } else {
        alert('No actions to take.');
    }
};
