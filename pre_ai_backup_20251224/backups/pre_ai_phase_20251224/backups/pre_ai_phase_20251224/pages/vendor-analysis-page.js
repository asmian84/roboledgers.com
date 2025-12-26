/**
 * Vendor Analysis Page - RoboLedger Style
 * Dedicated Route: #/vendor-analysis
 * 
 * Features:
 * - Full page dashboard
 * - Grouped vendors
 * - Drill-down to specific vendor transactions
 * - Bulk account updates
 * - Sorted Tables & Smart Dropdowns
 */

window.VendorAnalysisPage = {

    // --- STATE ---
    state: {
        activeVendor: null,
        selectedVendors: new Set(),
        selectedTxnIndices: new Set(),
        isRenaming: false,
        search: '', // Search State
        // Sorting State
        sortConfig: {
            key: 'date', // default sort
            direction: 'desc'
        }
    },

    // --- MAIN RENDER ---
    render: function () {
        const hash = window.location.hash;

        // Router Logic inside the component for sub-views
        if (hash.includes('/vendor-analysis/')) {
            const vendorName = decodeURIComponent(hash.split('/vendor-analysis/')[1]);
            // Append Action Bar if transactions are selected
            return this.renderDrillDown(vendorName) +
                (this.state.selectedTxnIndices.size > 0 ? this.renderActionBar() : '');
        }

        // Dashboard + Action Bar (if selection exists)
        return `
            ${this.renderDashboard()}
            ${this.state.selectedVendors.size > 0 ? this.renderActionBar() : ''}
        `;
    },

    // --- SORTING LOGIC ---
    handleSort: function (key) {
        if (this.state.sortConfig.key === key) {
            // Toggle direction
            this.state.sortConfig.direction = this.state.sortConfig.direction === 'asc' ? 'desc' : 'asc';
        } else {
            this.state.sortConfig.key = key;
            this.state.sortConfig.direction = 'asc';
        }
        this.refresh();
    },

    getSortIndicator: function (key) {
        if (this.state.sortConfig.key !== key) return '<span style="opacity:0.2">⇅</span>';
        return this.state.sortConfig.direction === 'asc' ? '↑' : '↓';
    },

    sortData: function (data, isGroups = false) {
        const { key, direction } = this.state.sortConfig;
        if (!key) return data;

        return [...data].sort((a, b) => {
            let valA = isGroups ? a[key] : a[key];
            let valB = isGroups ? b[key] : b[key];

            // Special Handling
            if (key === 'amount') {
                valA = parseFloat(isGroups ? 0 : (parseFloat(a.debit) || 0) + (parseFloat(a.credit) || 0));
                valB = parseFloat(isGroups ? 0 : (parseFloat(b.debit) || 0) + (parseFloat(b.credit) || 0));
            }

            if (key === 'date') {
                valA = new Date(valA || 0).getTime();
                valB = new Date(valB || 0).getTime();
            }

            if (typeof valA === 'string') valA = valA.toLowerCase();
            if (typeof valB === 'string') valB = valB.toLowerCase();

            if (valA < valB) return direction === 'asc' ? -1 : 1;
            if (valA > valB) return direction === 'asc' ? 1 : -1;
            return 0;
        });
    },

    // --- SEARCH ---
    handleVendorSearch: function (val) {
        this.state.search = val;
        this.refresh();
        // Restore focus
        setTimeout(() => {
            const el = document.getElementById('vendor-search-input');
            if (el) {
                el.focus();
                el.setSelectionRange(val.length, val.length);
            }
        }, 0);
    },

    toggleTab: function (id, tabName) {
        // 1. Update Tab Buttons
        const wrapper = document.getElementById(`menu-${id}`);
        if (!wrapper) return;

        const tabs = wrapper.querySelectorAll('.smart-tab-item');
        tabs.forEach(t => {
            if (t.innerText === tabName) t.classList.add('active');
            else t.classList.remove('active');
        });

        // 2. Update Content
        const contents = wrapper.querySelectorAll('.smart-tab-content');
        contents.forEach(c => {
            if (c.id === `tab-${id}-${tabName}`) c.classList.add('active');
            else c.classList.remove('active');
        });
    },

    // --- DASHBOARD VIEW ---
    renderDashboard: function () {
        // 1. Group Data
        let grouped = this.groupTransactions(window.transactionData || []);

        // FILTER: Search Logic
        if (this.state.search) {
            const term = this.state.search.toLowerCase();
            grouped = grouped.filter(g => g.name.toLowerCase().includes(term));
        }

        const totalVendors = grouped.length;
        const unallocatedCount = grouped.filter(g => g.isUnallocated).length;

        // Apply Sorting (Only if keys match group properties: name, count, mostCommonAccount)
        if (['name', 'count', 'mostCommonAccount'].includes(this.state.sortConfig.key)) {
            grouped = this.sortData(grouped, true);
        } else {
            // Default Sort for Dashboard: Attention needed first, then Count
            grouped.sort((a, b) => {
                if (a.isUnallocated && !b.isUnallocated) return -1;
                if (!a.isUnallocated && b.isUnallocated) return 1;
                return b.count - a.count;
            });
        }

        // UPDATE GLOBAL BREADCRUMBS (Delayed)
        setTimeout(() => {
            if (window.breadcrumbManager) {
                window.breadcrumbManager.renderCustom([
                    { label: 'Transactions', path: '/transactions', icon: '💰' },
                    { label: 'Vendor Analysis', isActive: true, icon: '🏢' }
                ]);
            }
        }, 50);

        const unallocatedGlobal = (window.transactionData || []).filter(t => !t.accountDescription || t.accountDescription === 'Uncategorized').length;

        // --- OPTIMIZATION: Calculate Frequently Used Accounts ONCE ---
        const counts = {};
        const chartMap = new Map((window.DEFAULT_CHART_OF_ACCOUNTS || []).map(a => [a.code, a.name]));

        (window.transactionData || []).forEach(t => {
            let desc = t.accountDescription;
            if (desc && desc !== 'Uncategorized') {
                // Resolve number to name if needed
                if (/^\d{3,4}$/.test(desc) && chartMap.has(desc)) {
                    desc = chartMap.get(desc);
                }
                counts[desc] = (counts[desc] || 0) + 1;
            }
        });
        this.topAccounts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
        // -----------------------------------------------------------

        return `
        <div class="vendor-analysis-page" style="height: calc(100vh - 60px); display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', system-ui, sans-serif;">
            
            
            <!-- HEADER CARD -->
            <div class="dashboard-header-modern" style="border-radius: 12px 12px 0 0; border: 1px solid #e2e8f0;">
                <div class="header-brand">
                    <div class="icon-box" style="background: linear-gradient(135deg, #10b981, #059669); box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.3);">
                        🏢
                    </div>
                    <div class="header-info">
                        <h2>Vendor Analysis</h2>
                        <div class="meta">
                            <span class="badge-account" style="color: #64748b; background: #f1f5f9;">All Vendors</span>
                            <span>•</span>
                            <span>Review & Categorize</span>
                        </div>
                    </div>
                </div>
                
                <div class="header-stats">
                    <div class="stat-unit">
                        <label>Total Vendors</label>
                        <div class="val">${totalVendors}</div>
                    </div>
                    <div style="width: 1px; background: #e2e8f0; margin: 4px 0;"></div>
                    <div class="stat-unit">
                        <label>Needs Attention</label>
                        <div class="val ${unallocatedCount > 0 ? 'red' : 'green'}">
                            ${unallocatedCount}
                        </div>
                    </div>
                </div>
            </div>

            <!-- TOOLBAR CARD -->
            <div class="control-bar" style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: white; padding: 16px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 1.5rem;">
                <div class="control-left" style="display: flex; gap: 10px;">
                    <input type="text" class="input-box input-search" 
                           placeholder="Search vendors..." 
                           value="${this.state.search}"
                           id="vendor-search-input"
                           oninput="window.VendorAnalysisPage.handleVendorSearch(this.value)"
                           style="width: 300px;">
                </div>
                 <!-- Right side: Global Status Badge & Menu -->
                 <div style="display: flex; align-items: center; gap: 12px;">
                     <div class="action-menu">
                        <button class="action-menu-btn" style="width: 32px; height: 32px; border-radius: 6px; border: 1px solid #e2e8f0; background: white; color: #64748b; cursor: pointer;">...</button>
                     </div>
                 </div>
            </div>

            <!-- TABLE CONTAINER (Scrollable) -->
            <div class="grid-container" style="flex: 1; overflow-y: auto;">
                 <!-- Grid container itself has white bg/shadow from CSS now -->
                    <table class="uc-table">
                        <thead style="position: sticky; top: 0; z-index: 10; background: #f8fafc;">
                            <tr>
                                <th style="width: 40px; padding: 0.75rem 1rem;">
                                    <input type="checkbox" onclick="window.VendorAnalysisPage.toggleSelectAll(this.checked)">
                                </th>
                                <th style="text-align: left; padding: 0.75rem 1rem; cursor: pointer;" onclick="window.VendorAnalysisPage.handleSort('name')">
                                    Vendor Name ${this.getSortIndicator('name')}
                                </th>
                                <th style="text-align: center; padding: 0.75rem 1rem; width: 100px; cursor: pointer;" onclick="window.VendorAnalysisPage.handleSort('count')">
                                    Count ${this.getSortIndicator('count')}
                                </th>
                                <th style="text-align: left; padding: 0.75rem 1rem; width: 350px; cursor: pointer;" onclick="window.VendorAnalysisPage.handleSort('mostCommonAccount')">
                                    Default Account ${this.getSortIndicator('mostCommonAccount')}
                                </th>
                                <th style="text-align: right; padding: 0.75rem 1rem; width: 100px;">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${grouped.map(g => this.renderDashboardRow(g)).join('')}
                        </tbody>
                    </table>
                     ${grouped.length === 0 ? `<div style="padding: 3rem; text-align: center; color: #94a3b8;">No transactions found. Import data first.</div>` : ''}
            </div>

        </div>
        `;
    },

    renderDashboardRow: function (group) {
        const isUnallocated = group.isUnallocated;

        // Use standard background (white) to match rest of UI
        const bgStyle = 'background: white;';
        const vendorNameEncoded = encodeURIComponent(group.name);
        const isSelected = this.state.selectedVendors.has(group.name);

        return `
        <tr style="border-bottom: 1px solid #f1f5f9; ${bgStyle} transition: all 0.2s;" class="dashboard-row">
            <td style="padding: 8px 1rem;">
                <input type="checkbox" 
                       onchange="window.VendorAnalysisPage.toggleVendor('${group.name.replace(/'/g, "\\'")}', this.checked)"
                       ${isSelected ? 'checked' : ''}>
            </td>
            <td style="padding: 8px 1rem; font-weight: 500;">
                <div style="color: #0f172a; font-size: 0.95rem;">${group.name}</div>
                <div style="color: #64748b; font-size: 0.75rem; margin-top: 2px;">
                    ${group.originalDescriptions.join(', ')}${group.originalDescriptions.length === 5 ? '...' : ''}
                </div>
            </td>
            <td style="padding: 8px 1rem; text-align: center;">
                <span class="badge-account" style="background: #e2e8f0; color: #475569;">
                    ${group.count}
                </span>
            </td>
            <td style="padding: 8px 1rem;">
                ${this.renderAccountDropdown(group.name, group.mostCommonAccount, true)}
            </td>
            <td style="padding: 8px 1rem; text-align: right;">
                <button onclick="window.location.hash='#/vendor-analysis/${vendorNameEncoded}'" 
                        class="btn-icon-tiny" style="opacity: 1; color: #3b82f6; font-size: 0.85rem; font-weight: 600;">
                    Details &rarr;
                </button>
            </td>
        </tr>
        `;
    },

    // --- DRILL DOWN VIEW ---
    renderDrillDown: function (vendorName) {
        const normalizedName = this.normalize(vendorName);
        // Filter transactions for this vendor (using normalized check)
        let vendorTxns = (window.transactionData || []).filter(t =>
            this.normalize(t.description) === normalizedName
        );

        // --- OPTIMIZATION: Calculate Frequently Used Accounts ONCE (for drill down) ---
        const counts = {};
        const chartMap = new Map((window.DEFAULT_CHART_OF_ACCOUNTS || []).map(a => [a.code, a.name]));

        (window.transactionData || []).forEach(t => {
            let desc = t.accountDescription;
            if (desc && desc !== 'Uncategorized') {
                // Resolve number to name if needed
                if (/^\d{3,4}$/.test(desc) && chartMap.has(desc)) {
                    desc = chartMap.get(desc);
                }
                counts[desc] = (counts[desc] || 0) + 1;
            }
        });
        this.topAccounts = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(e => e[0]);
        // -----------------------------------------------------------------------------

        // FILTER: Sub-Search within Drilldown
        if (this.state.search) {
            const term = this.state.search.toLowerCase();
            vendorTxns = vendorTxns.filter(t =>
                t.description.toLowerCase().includes(term) ||
                (t.amount && t.amount.toString().includes(term)) ||
                (t.date && t.date.includes(term))
            );
        }

        // Sort Data
        vendorTxns = this.sortData(vendorTxns);

        // Check if all are selected
        const allSelected = vendorTxns.length > 0 && vendorTxns.every(t => {
            const idx = window.transactionData.indexOf(t);
            return this.state.selectedTxnIndices.has(idx);
        });

        // Safe display name (Decode URI components to remove %20)
        const displayVendorName = decodeURIComponent(vendorName);
        const escapedName = displayVendorName.replace(/'/g, "\\'");

        // UPDATE GLOBAL BREADCRUMBS
        setTimeout(() => {
            if (window.breadcrumbManager) {
                window.breadcrumbManager.renderCustom([
                    { label: 'Transactions', path: '/transactions', icon: '💰' },
                    { label: 'Vendor Analysis', path: '/vendor-analysis', icon: '🏢' },
                    { label: displayVendorName, isActive: true } // Active = no path
                ]);
            }
        }, 50);

        const unallocatedGlobal = (window.transactionData || []).filter(t => !t.accountDescription || t.accountDescription === 'Uncategorized').length;

        return `
        <div class="vendor-detail-page" style="height: calc(100vh - 60px); display: flex; flex-direction: column; overflow: hidden; font-family: 'Inter', system-ui, sans-serif;">
            
             <!-- HEADER CARD -->
            <div class="dashboard-header-modern" style="border-radius: 12px 12px 0 0; border: 1px solid #e2e8f0;">
                <div class="header-brand">
                    <div class="icon-box" style="background: linear-gradient(135deg, #3b82f6, #2563eb);">
                        👤
                    </div>
                    <div class="header-info">
                        <h2>${displayVendorName}</h2>
                        <div class="meta">
                            <span class="badge-account" style="color: #64748b; background: #f1f5f9;">Found ${vendorTxns.length} Items</span>
                        </div>
                    </div>
                </div>
                
                 <!-- Optional Stats for Drill Down -->
                 <div class="header-stats">
                     <div class="stat-unit">
                        <label>Total Spent</label>
                        <div class="val blue">
                            $${vendorTxns.reduce((sum, t) => sum + (parseFloat(t.debit) || 0), 0).toFixed(2)}
                        </div>
                    </div>
                 </div>
            </div>

            <!-- TOOLBAR CARD -->
            <div class="control-bar" style="border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px; background: white; padding: 16px 24px; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
                <div class="control-left" style="display: flex; gap: 10px;">
                    <input type="text" class="input-box input-search" 
                           placeholder="Search transactions..." 
                           value="${this.state.search}"
                           id="vendor-search-input"
                <div class="control-left" style="display: flex; gap: 10px;">
                    <input type="text" class="input-box input-search" 
                           placeholder="Search transactions..." 
                           value="${this.state.search}"
                           id="vendor-search-input"
                           oninput="window.VendorAnalysisPage.handleVendorSearch(this.value)"
                           style="width: 300px;">
                </div>
            </div>

            <!-- TXN GRID (Scrollable) -->
            <div class="grid-container" style="flex: 1; overflow-y: auto;">
                 <!-- Grid container itself has white bg/shadow from CSS -->
                    <table class="uc-table" style="table-layout: fixed;">
                        <thead style="background: #f8fafc; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10;">
                            <tr>
                                <th class="w-check" style="padding: 0.5rem 1rem;">
                                    <input type="checkbox" 
                                           ${allSelected ? 'checked' : ''} 
                                           onclick="window.VendorAnalysisPage.toggleSelectAllTransactions('${escapedName}', this.checked)">
                                </th>
                                <th class="w-date" style="padding: 0.5rem 1rem; width: 120px; cursor: pointer;" onclick="window.VendorAnalysisPage.handleSort('date')">
                                    Date ${this.getSortIndicator('date')}
                                </th>
                                <th class="w-payee has-tooltip" style="padding: 0.5rem 1rem; cursor: pointer;" onclick="window.VendorAnalysisPage.handleSort('description')">
                                    Payee ${this.getSortIndicator('description')}
                                </th>
                                <th class="w-account" style="padding: 0.5rem 1rem; width: 450px; text-align: left; cursor: pointer;" onclick="window.VendorAnalysisPage.handleSort('accountDescription')">
                                    Account ${this.getSortIndicator('accountDescription')}
                                </th>
                                <th class="w-amount" style="padding: 0.5rem 1rem; width: 120px; cursor: pointer;" onclick="window.VendorAnalysisPage.handleSort('amount')">
                                    Amount ${this.getSortIndicator('amount')}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            ${vendorTxns.map((t, idx) => {
            const realIndex = window.transactionData.indexOf(t);
            const amount = parseFloat(t.debit) || 0;
            const isCredit = amount === 0;
            const displayAmt = isCredit ? (parseFloat(t.credit) || 0) : amount;
            const color = isCredit ? '#16a34a' : '#0f172a';
            const isSelected = this.state.selectedTxnIndices.has(realIndex);

            return `
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td class="w-check" style="padding: 0.5rem 1rem;">
                                    <input type="checkbox" 
                                           ${isSelected ? 'checked' : ''} 
                                           onchange="window.VendorAnalysisPage.toggleTransaction(${realIndex}, this.checked)">
                                </td>
                                <td class="w-date" style="padding: 0.5rem 1rem; color: #64748b;">${t.date ? t.date.substring(0, 10) : ''}</td>
                                <td class="w-payee" style="padding: 0.5rem 1rem; font-weight: 500;">${t.description}</td>
                                <td class="w-account" style="padding: 0.5rem 1rem; width: 450px; min-width: 450px; max-width: 450px;">
                                    ${this.renderAccountDropdown(null, t.accountDescription, false, realIndex)}
                                </td>
                                <td class="w-amount" style="padding: 0.5rem 1rem; color: ${color}; opacity: 0.9; font-size: 1rem; font-weight: 600;">
                                    ${displayAmt.toFixed(2)}
                                </td>
                            </tr>
                            `;
        }).join('')}
                        </tbody>
                    </table>
            </div>

        </div>
        `;
    },

    // --- SMART DROPDOWN LOGIC ---

    renderAccountDropdown: function (groupName, currentVal, isBulk, txnIndex) {
        // ID generation: 'bulk-<cleanGroup>' or 'txn-<index>'
        const id = isBulk ? `bulk-${this.normalize(groupName).replace(/\s/g, '-')}` : `txn-${txnIndex}`;
        const isUncategorized = !currentVal || currentVal === 'Uncategorized';

        // --- CUSTOM SMART MENU (Fixes Position Issue) ---
        // Using onclick to toggle visibility
        // Data attributes to store context
        const contextStr = isBulk
            ? `data-type="bulk" data-group="${groupName.replace(/"/g, '&quot;')}"`
            : `data-type="txn" data-index="${txnIndex}"`;

        const chart = window.DEFAULT_CHART_OF_ACCOUNTS || [];
        // Group Chart
        // Group Chart
        const grouped = { 'Assets': [], 'Liabilities': [], 'Equity': [], 'Revenue': [], 'Expenses': [] };
        chart.forEach(a => {
            const type = (a.type || '').toLowerCase().trim();
            let g = 'Other';

            if (type.includes('asset')) g = 'Assets';
            else if (type.includes('liab')) g = 'Liabilities';
            else if (type.includes('equity')) g = 'Equity';
            else if (type.includes('rev') || type.includes('income')) g = 'Revenue';
            else if (type.includes('exp')) g = 'Expenses';

            if (!grouped[g]) grouped[g] = [];
            grouped[g].push(a.name); // Just name for Vendor Analysis? Or Code + Name? keeping Name as original logic.
        });

        // Build Menu HTML
        let menuHtml = `<div class="smart-menu" id="menu-${id}" style="display: none;">`;

        // 1. Frequently Used Section (Using cached this.topAccounts)
        if (this.topAccounts && this.topAccounts.length > 0) {
            menuHtml += `<div class="smart-menu-header" style="background: #f0fdfa; color: #0f766e; border-bottom: 1px solid #ccfbf1;">Frequently Used</div>`;
            this.topAccounts.forEach(acc => {
                const isSelected = acc === currentVal;
                const safeAcc = acc.replace(/'/g, "\\'");
                menuHtml += `
                    <div class="smart-menu-item ${isSelected ? 'selected' : ''}" 
                         onclick="window.VendorAnalysisPage.selectAccount('${id}', '${safeAcc}')">
                        <span style="color: #14b8a6; margin-right: 6px;">★</span> ${acc}
                    </div>
                `;
            });
            menuHtml += `<div style="height: 1px; background: #e2e8f0; margin: 4px 0;"></div>`;
        }

        // 2. CATEGORY TABS
        // Default to 'Expenses' if it exists, otherwise 'All' or first
        const tabOrder = ['Expenses', 'Liabilities', 'Assets', 'Revenue', 'Equity', 'Other'];
        let activeTab = 'Expenses';
        if (!grouped['Expenses'] || grouped['Expenses'].length === 0) {
            activeTab = Object.keys(grouped).find(k => grouped[k].length > 0) || 'Other';
        }

        // Tab Header
        menuHtml += `<div class="smart-tabs">`;
        tabOrder.forEach(tab => {
            if (grouped[tab] && grouped[tab].length > 0) {
                const isActive = tab === activeTab ? 'active' : '';
                menuHtml += `<div class="smart-tab-item ${isActive}" onclick="event.stopPropagation(); window.VendorAnalysisPage.toggleTab('${id}', '${tab}')">${tab}</div>`;
            }
        });
        menuHtml += `</div>`;

        // Tab Content
        menuHtml += `<div class="smart-tab-body">`;
        for (const [gName, accs] of Object.entries(grouped)) {
            if (accs.length === 0) continue;
            const isActive = gName === activeTab ? 'active' : '';
            menuHtml += `<div id="tab-${id}-${gName}" class="smart-tab-content ${isActive}">`;
            // menuHtml += `<div class="smart-menu-header">${gName}</div>`; // Header redundant with tabs? Maybe keep for context if needed, but clean is better.

            accs.forEach(acc => {
                const isSelected = acc === currentVal;
                // Escape for function call
                const safeAcc = acc.replace(/'/g, "\\'");
                menuHtml += `
                    <div class="smart-menu-item ${isSelected ? 'selected' : ''}" 
                         onclick="window.VendorAnalysisPage.selectAccount('${id}', '${safeAcc}')">
                        ${acc}
                    </div>
                `;
            });
            menuHtml += `</div>`;
        }
        menuHtml += `</div>`; // End Body
        menuHtml += `</div>`; // End Menu Wrapper

        return `
            <div class="smart-dropdown-wrapper" id="wrapper-${id}" ${contextStr}>
                <div class="smart-pill ${isUncategorized ? 'uncategorized' : ''}" 
                     style="width: 100%; justify-content: space-between; border: 1px solid ${isUncategorized ? '#fca5a5' : '#cbd5e1'}; padding: 4px 12px; background: ${isUncategorized ? '#fef2f2' : 'white'}; cursor: text;"
                     onclick="window.VendorAnalysisPage.openDropdown('${id}')">
                    
                    <input type="text" class="smart-pill-input" 
                           value="${currentVal || ''}" 
                           placeholder="Uncategorized"
                           onfocus="window.VendorAnalysisPage.openDropdown('${id}')"
                           onkeyup="window.VendorAnalysisPage.handleDropdownInput(event, '${id}', this.value)"
                           autocomplete="off">
                    <span style="font-size: 0.7rem; opacity: 0.5; pointer-events: none;">▼</span>
                </div>
                ${menuHtml}
            </div>
        `;
    },

    openDropdown: function (id) {
        const menu = document.getElementById(`menu-${id}`);
        if (menu && menu.style.display !== 'block') {
            // Close others
            document.querySelectorAll('.smart-menu').forEach(m => m.style.display = 'none');
            menu.style.display = 'block';

            // Auto-close
            setTimeout(() => {
                const closer = (e) => {
                    const wrapper = document.getElementById(`wrapper-${id}`);
                    if (wrapper && !wrapper.contains(e.target)) {
                        menu.style.display = 'none';
                        document.removeEventListener('click', closer);
                    }
                };
                document.addEventListener('click', closer);
            }, 100);
        }
    },

    handleDropdownInput: function (e, id, term) {
        // 1. Force Open
        this.openDropdown(id);

        // 2. Shortcuts
        if (e.key === 'Enter') {
            const menu = document.getElementById(`menu-${id}`);
            const visibleItem = Array.from(menu.querySelectorAll('.smart-menu-item')).find(i => i.style.display !== 'none');
            if (visibleItem) {
                visibleItem.click();
                e.target.blur();
            }
            return;
        }
        if (e.key === 'Escape') {
            const menu = document.getElementById(`menu-${id}`);
            if (menu) menu.style.display = 'none';
            e.target.blur();
            return;
        }

        // 3. Search Logic
        const menu = document.getElementById(`menu-${id}`);
        if (!menu) return;

        term = term.toLowerCase();
        const items = menu.querySelectorAll('.smart-menu-item');
        const tabs = menu.querySelector('.smart-tabs');
        const contents = menu.querySelectorAll('.smart-tab-content');
        const freqHeader = menu.querySelector('.smart-menu-header');

        if (!term) {
            // Reset
            if (tabs) tabs.style.display = 'flex';
            if (freqHeader) freqHeader.style.display = 'block';

            // Reset Tabs
            const activeTabBtn = menu.querySelector('.smart-tab-item.active');
            const activeTabName = activeTabBtn ? activeTabBtn.innerText : 'Expenses';
            this.toggleTab(id, activeTabName);

            items.forEach(i => i.style.display = 'block');
            contents.forEach(c => c.style.display = '');
            return;
        }

        // SEARCH MODE
        if (tabs) tabs.style.display = 'none';
        if (freqHeader) freqHeader.style.display = 'none';

        contents.forEach(c => {
            c.classList.add('active');
            c.style.display = 'block';
        });

        items.forEach(item => {
            const text = item.innerText.toLowerCase();
            item.style.display = text.includes(term) ? 'block' : 'none';
        });
    },

    toggleDropdown: function (id, event) {
        // Deprecated but kept for safety if referenced elsewhere, effectively replaced by openDropdown logic for this specific pill
        if (event) event.stopPropagation();
        this.openDropdown(id);
    },

    selectAccount: function (id, accountName) {
        const wrapper = document.getElementById(`wrapper-${id}`);
        if (!wrapper) return;

        const type = wrapper.getAttribute('data-type');

        if (type === 'bulk') {
            const groupName = wrapper.getAttribute('data-group');
            this.handleBulkUpdate(groupName, accountName);
        } else {
            const index = parseInt(wrapper.getAttribute('data-index'));
            // Update Single Transaction
            if (window.transactionData[index]) {
                window.transactionData[index].accountDescription = accountName;
                if (window.saveTransactions) window.saveTransactions();
                this.refresh();
            }
        }
    },

    // --- LOGIC ---
    groupTransactions: function (txns) {
        const groups = {};
        txns.forEach(t => {
            const norm = this.normalize(t.description);
            if (!groups[norm]) {
                groups[norm] = {
                    name: norm,
                    count: 0,
                    accounts: {},
                    originalDescriptions: new Set()
                };
            }
            groups[norm].count++;
            // Collect original description
            if (t.description) groups[norm].originalDescriptions.add(t.description);

            const acc = t.accountDescription || 'Uncategorized';
            groups[norm].accounts[acc] = (groups[norm].accounts[acc] || 0) + 1;
        });

        return Object.values(groups).map(g => {
            // Find most common account
            const sortedAccs = Object.entries(g.accounts).sort((a, b) => b[1] - a[1]);
            g.mostCommonAccount = sortedAccs[0][0]; // Account name
            g.isUnallocated = g.mostCommonAccount === 'Uncategorized';
            // Convert Set to Array for easier rendering
            g.originalDescriptions = Array.from(g.originalDescriptions).slice(0, 5); // Limit to top 5 variations
            return g;
        }); // Sorting is now handled by render logic based on state
    },

    normalize: function (str) {
        if (!str) return '';
        return str.toUpperCase()
            .replace(/[0-9#]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    },

    handleBulkUpdate: function (vendorName, newAccount) {
        if (!window.transactionData) return;

        const normalizedTarget = this.normalize(vendorName);
        let count = 0;

        window.transactionData.forEach(t => {
            if (this.normalize(t.description) === normalizedTarget) {
                t.accountDescription = newAccount;
                count++;
            }
        });

        // Save & Refresh
        if (window.saveTransactions) window.saveTransactions(window.transactionData);

        // Show Toast
        if (window.showToast) window.showToast(`Updated ${count} transactions for ${vendorName}`, 'success');

        // Reload Logic - Re-render the dashboard to show updated counts/colors
        const app = document.getElementById('app');
        if (app) app.innerHTML = this.render();
    },



    // --- BULK SELECTION LOGIC ---

    toggleSelectAll: function (isChecked) {
        const grouped = this.groupTransactions(window.transactionData || []);
        if (isChecked) {
            grouped.forEach(g => this.state.selectedVendors.add(g.name));
        } else {
            this.state.selectedVendors.clear();
        }
        this.refresh();
    },

    toggleVendor: function (name, isChecked) {
        if (isChecked) {
            this.state.selectedVendors.add(name);
        } else {
            this.state.selectedVendors.delete(name);
        }
        this.refresh();
    },

    refresh: function () {
        const app = document.getElementById('app');
        if (app) app.innerHTML = this.render();
    },

    toggleTransaction: function (index, isChecked) {
        if (isChecked) this.state.selectedTxnIndices.add(index);
        else this.state.selectedTxnIndices.delete(index);
        this.refresh();
    },

    toggleSelectAllTransactions: function (vendorName, isChecked) {
        const norm = this.normalize(vendorName);
        window.transactionData.forEach((t, i) => {
            if (this.normalize(t.description) === norm) {
                if (isChecked) this.state.selectedTxnIndices.add(i);
                else this.state.selectedTxnIndices.delete(i);
            }
        });
        this.refresh();
    },

    // --- ACTION BAR UI ---
    renderActionBar: function () {
        const isDrillDown = window.location.hash.includes('/vendor-analysis/');
        const count = isDrillDown ? this.state.selectedTxnIndices.size : this.state.selectedVendors.size;

        const isRenaming = this.state.isRenaming;

        // Determine first item for rename suggestion
        let firstItem = '';
        if (isDrillDown) {
            const firstIdx = Array.from(this.state.selectedTxnIndices)[0];
            if (firstIdx !== undefined && window.transactionData[firstIdx]) {
                firstItem = window.transactionData[firstIdx].description;
            }
        } else {
            firstItem = Array.from(this.state.selectedVendors)[0] || '';
        }

        return `
        <div style="position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); 
                    background: #1e293b; color: white; padding: 12px 24px; border-radius: 100px; 
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); z-index: 1000; display: flex; align-items: center; gap: 24px;">
            
            ${isRenaming
                ? `
                <!-- RENAMING MODE -->
                 <div style="font-weight: 600; padding-right: 12px; border-right: 1px solid #475569;">
                    Rename ${count} items
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <input type="text" id="bulk-rename-input" value="${firstItem}" 
                           style="background: #334155; border: 1px solid #475569; padding: 6px 12px; border-radius: 6px; color: white; font-family: inherit; font-size: 0.9rem; width: 200px;"
                           onkeydown="if(event.key === 'Enter') window.VendorAnalysisPage.confirmRename()">
                    
                    <button onclick="window.VendorAnalysisPage.confirmRename()"
                            style="background: #2563eb; border: none; color: white; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">
                        Save
                    </button>
                    <button onclick="window.VendorAnalysisPage.cancelRename()" 
                            style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.5rem; line-height: 1;">
                        &times;
                    </button>
                </div>
            `
                : `
                <!-- DEFAULT ACTIONS -->
                <div style="font-weight: 600; padding-right: 12px; border-right: 1px solid #475569;">
                    ${count} Selected
                </div>

                <div style="display: flex; gap: 12px;">
                    <!-- Reclassify -->
                    <button onclick="window.VendorAnalysisPage.openBulkReclassify()" 
                            style="background: #3b82f6; border: none; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 500; cursor: pointer; transition: background 0.2s;">
                        📁 Reclassify
                    </button>

                    <!-- Rename -->
                    <button onclick="window.VendorAnalysisPage.openBulkRename()" 
                            style="background: #64748b; border: none; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 500; cursor: pointer; transition: background 0.2s;">
                        ✏️ Rename
                    </button>

                    <!-- Delete -->
                    <button onclick="window.VendorAnalysisPage.executeBulkDelete()" 
                            style="background: #ef4444; border: none; color: white; padding: 6px 16px; border-radius: 20px; font-weight: 500; cursor: pointer; transition: background 0.2s;">
                        🗑️ Delete
                    </button>
                </div>

                <button onclick="window.VendorAnalysisPage.clearSelection()" 
                        style="background: none; border: none; color: #94a3b8; cursor: pointer; font-size: 1.2rem; display: flex; align-items: center; padding: 0;">
                    &times;
                </button>
            `}
        </div>
        `;
    },

    clearSelection: function () {
        this.state.selectedVendors.clear();
        this.state.selectedTxnIndices.clear();
        this.refresh();
    },

    // --- BULK ACTIONS ---

    openBulkReclassify: function () {
        const isDrillDown = window.location.hash.includes('/vendor-analysis/');
        const count = isDrillDown ? this.state.selectedTxnIndices.size : this.state.selectedVendors.size;

        const newAccount = prompt(`Enter category name to apply to ${count} items:`);
        if (newAccount) {
            const coa = window.DEFAULT_CHART_OF_ACCOUNTS || [];
            const exists = coa.find(a => a.name.toLowerCase() === newAccount.toLowerCase());
            const targetAccount = exists ? exists.name : newAccount;

            this.executeBulkReclassify(targetAccount, isDrillDown);
        }
    },

    executeBulkReclassify: function (newAccount, isDrillDown) {
        let count = 0;

        if (isDrillDown) {
            // Reclassify selected transactions
            const targetIndices = Array.from(this.state.selectedTxnIndices);
            targetIndices.forEach(idx => {
                const txn = window.transactionData[idx];
                if (txn) {
                    txn.accountDescription = newAccount;
                    txn.isUnallocated = false;
                    count++;
                }
            });
            window.SystemLog.log('DATA', 'BULK_RECLASSIFY', { count: targetIndices.length, account: newAccount, source: 'DrillDown' });
        } else {
            // Reclassify selected vendors
            const targetVendors = this.state.selectedVendors;
            window.transactionData.forEach(t => {
                if (targetVendors.has(this.normalize(t.description))) {
                    t.accountDescription = newAccount;
                    t.isUnallocated = false;
                    count++;
                }
            });
            window.SystemLog.log('DATA', 'BULK_RECLASSIFY', { vendorCount: targetVendors.size, account: newAccount, source: 'Dashboard' });
        }
        this.saveAndNotify(`Reclassified ${count} items to "${newAccount}"`);
    },

    openBulkRename: function () {
        // Toggle inline rename
        this.state.isRenaming = true;
        this.refresh();
        setTimeout(() => document.getElementById('bulk-rename-input')?.focus(), 50);
    },

    cancelRename: function () {
        this.state.isRenaming = false;
        this.refresh();
    },

    confirmRename: function () {
        const input = document.getElementById('bulk-rename-input');
        if (!input) return;
        const newName = input.value.trim();
        if (newName) {
            const isDrillDown = window.location.hash.includes('/vendor-analysis/');
            this.executeBulkRename(newName, isDrillDown);
        }
        this.state.isRenaming = false;
    },

    executeBulkRename: function (newName, isDrillDown) {
        let count = 0;

        if (isDrillDown) {
            // Transaction Mode
            const targetIndices = Array.from(this.state.selectedTxnIndices);
            targetIndices.forEach(idx => {
                const t = window.transactionData[idx];
                if (t) {
                    t.description = newName.toUpperCase();
                    count++;
                }
            });
            window.SystemLog.log('VENDOR', 'BULK_RENAME', { count: targetIndices.length, newName: newName, source: 'DrillDown' });
            // Clear selection after rename
            this.state.selectedTxnIndices.clear();
        } else {
            // Vendor Mode
            const targetVendors = this.state.selectedVendors;
            window.transactionData.forEach(t => {
                if (targetVendors.has(this.normalize(t.description))) {
                    t.description = newName.toUpperCase();
                    count++;
                }
            });
            window.SystemLog.log('VENDOR', 'BULK_RENAME', { vendorCount: targetVendors.size, newName: newName, source: 'Dashboard' });
            this.state.selectedVendors.clear();
        }

        this.saveAndNotify(`Renamed ${count} items to "${newName}"`);
    },

    executeBulkDelete: function () {
        const isDrillDown = window.location.hash.includes('/vendor-analysis/');
        const count = isDrillDown ? this.state.selectedTxnIndices.size : this.state.selectedVendors.size;

        if (confirm(`Are you sure you want to delete ${count} items? IRREVERSIBLE.`)) {
            const initialLen = window.transactionData.length;

            if (isDrillDown) {
                // Delete specific indices
                const indicesToDelete = this.state.selectedTxnIndices;
                window.transactionData = window.transactionData.filter((_t, i) => !indicesToDelete.has(i));
                window.SystemLog.log('DATA', 'BULK_DELETE', { count: indicesToDelete.size, source: 'DrillDown' });
                this.state.selectedTxnIndices.clear();
            } else {
                // Delete by Vendor Name
                const targets = this.state.selectedVendors;
                window.transactionData = window.transactionData.filter(t =>
                    !targets.has(this.normalize(t.description))
                );
                window.SystemLog.log('DATA', 'BULK_DELETE', { vendorCount: targets.size, source: 'Dashboard' });
                this.state.selectedVendors.clear();
            }

            const deleted = initialLen - window.transactionData.length;
            this.saveAndNotify(`Deleted ${deleted} items.`);
        }
    },

    saveAndNotify: function (msg) {
        if (window.saveTransactions) window.saveTransactions(window.transactionData);
        if (window.showToast) window.showToast(msg, 'success');
        this.refresh();
    },

};
