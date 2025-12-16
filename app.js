// Main Application Controller
// Rebuilt from scratch - 2025-12-06

window.App = {
    currentSection: 'upload',
    transactions: [],
    currentFileName: null,

    // Global Text Formatter for Grids
    formatGridDescription(text) {
        if (!text) return '';
        // Future: Check Settings.current.gridTextCase
        return String(text).toUpperCase();
    },

    async initialize() {
        console.log('🚀 Initializing AutoBookkeeping v1.03...');

        // 1. Initialize Settings (UI Theme, etc.) - Run first for visuals
        if (typeof Settings !== 'undefined') {
            Settings.initialize();
        }

        // 2. Auth Check
        try {
            if (typeof AuthManager !== 'undefined') {
                await AuthManager.initialize();
                if (!AuthManager.user) {
                    console.warn('⚠️ User not logged in. App functionality will be limited.');
                    // If redirection in AuthManager didn't happen, we might want to force it or show a UI overlay
                    // For now, let's NOT return, but just warn, to see if it fixes the "Empty Grid" issue if they ARE logged in but state is laggy
                    // return; 
                } else {
                    console.log('✅ User authenticated:', AuthManager.user.email);
                }
            }
        } catch (e) {
            console.error('⚠️ Auth Check Failed:', e);
        }

        try {
            // Initialize modules
            // Initialize modules - MOVED TO AUTH MANAGER
            // AccountAllocator.initialize();
            // await VendorMatcher.initialize();



            // Initialize Bank Account Manager 🏦
            if (typeof BankAccountManager !== 'undefined') {
                try {
                    BankAccountManager.initialize();
                    console.log('✅ BankAccountManager initialized.');
                } catch (err) {
                    console.error('❌ BankAccountManager Init Failed:', err);
                }
            }

            // Initialize Settings
            if (typeof Settings !== 'undefined') {
                Settings.initialize();
            }

            // Initialize UI components  
            if (typeof RecentFilesManager !== 'undefined') {
                RecentFilesManager.init();
            }

            if (typeof TransactionGrid === 'undefined') {
                throw new Error('TransactionGrid not loaded. Check script order in index.html');
            }
            TransactionGrid.initialize('transactionGrid');

            // 🔄 FORCE REPROCESS: Now that dictionary and grid are loaded
            setTimeout(() => {
                if (window.TransactionGrid && TransactionGrid.reprocessAllTransactions) {
                    TransactionGrid.reprocessAllTransactions();
                }
            }, 1500); // Wait for grid init to complete

            if (typeof VendorManager === 'undefined') {
                console.warn('VendorManager not loaded yet');
            } else {
                // Initialized by AuthManager or when needed
                // VendorManager.initialize();
            }

            // Initialize Settings
            if (typeof Settings !== 'undefined') {
                Settings.initialize();
            } else {
                console.warn('Settings module not loaded');
            }

            // Set up event listeners
            this.setupEventListeners();

            // Initialize Headers
            this.updateBankAccountSelector();

            // Initialize Version Explorer (Static Card)
            // Initialize Version Explorer (Static Card)
            if (this.renderVersionExplorerV2) {
                this.renderVersionExplorerV2();
            } else {
                console.error("renderVersionExplorerV2 missing!");
            }

            /* Dead code removed (history button) */


            // Listen for Uploads section
            this.showSection('home');

            // Start Background AI Worker
            if (window.AIWorker) {
                AIWorker.start();
            }

            // Initialize Audit Manager
            if (window.AuditManager) {
                AuditManager.init();
            }

            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ INITIALIZATION ERROR:', error);
            alert('Application failed to initialize: ' + error.message);
        }
    },

    // 📺 Section Switching Logic
    showSection(sectionName) {
        console.log('📺 Switching to section:', sectionName);
        this.currentSection = sectionName;

        // Hide all sections
        document.querySelectorAll('.section').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });

        // Determine Target ID
        let targetId = '';
        switch (sectionName) {
            case 'home': targetId = 'homeSection'; break;
            case 'dashboard': targetId = 'dashboardSection'; break;
            case 'upload': targetId = 'uploadSection'; break;
            case 'processing': targetId = 'processingSection'; break;
            case 'review': targetId = 'reviewSection'; break;
            case 'settings': targetId = 'settingsSection'; break;
            case 'reconciliation': targetId = 'reconciliationSection'; break;
            case 'vendors': targetId = 'VDMModal'; break; // Open Vendor Modal directly
            case 'reports': targetId = 'reportsModal'; break; // Open Reports Modal directly
            case 'team': targetId = 'teamSection'; break;
            case 'subscription': targetId = 'subscriptionSection'; break;
            case 'audit': targetId = 'auditSection'; break;
            default: console.warn('Unknown section:', sectionName); return;
        }

        // Special handling for Modals vs Sections
        if (targetId.includes('Modal')) {
            const modal = document.getElementById(targetId);
            if (modal) {
                modal.classList.add('active');
                modal.style.display = 'block';
                // Keep current background section active visually or do nothing
                return;
            }
        }

        // Show Target
        const target = document.getElementById(targetId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
        }

        // Trigger Specific Loaders
        if (sectionName === 'review') {
            this.loadReviewSection();
        } else if (sectionName === 'reconciliation') {
            this.updateReconciliation();
        } else if (sectionName === 'upload') {
            // Fix for disappearing content: Force render of default tab (Restore)
            this.switchUploadTab('restore');
        }
    },

    // 🔄 Upload Section Sidebar Navigation
    switchUploadTab(tabName) {
        // 1. Update Buttons (using settings-nav-item class)
        document.querySelectorAll('#uploadSection .settings-nav-item').forEach(btn => {
            btn.classList.remove('active');
            if (btn.getAttribute('onclick').includes(`('${tabName}')`)) {
                btn.classList.add('active');
            }
        });

        // 2. Update Content
        ['csv', 'restore', 'bank'].forEach(name => {
            const el = document.getElementById(`uploadTab-${name}`);
            if (el) {
                // Ensure proper display type
                el.style.display = (name === tabName) ? 'block' : 'none';
                if (name === tabName) el.classList.add('active');
                else el.classList.remove('active');
            }
        });

        // 3. Special Actions
        if (tabName === 'restore') {
            this.renderVersionExplorerV2();
        }
    },

    // Unified AI Re-think: Optimize vendors + Categorize transactions
    async unifiedAIRethink() {
        console.log('🧠 Starting Unified AI Re-think...');

        // Step 1: Optimize vendors
        const vendorResult = await VendorAI.rethinkVendors((msg, percent) => {
            console.log(`${percent}% - ${msg}`);
        });

        if (!vendorResult.success) {
            alert('❌ Vendor optimization failed: ' + vendorResult.message);
            return;
        }

        // Step 1.5: FORCE SAVE vendors to storage so transactions get fresh data
        console.log('💾 Saving updated vendors to storage...');
        if (typeof VendorMatcher !== 'undefined') {
            // VendorMatcher already has the updated vendors in memory from rethinkVendors
            // Force save them to localStorage
            const allVendors = VendorMatcher.getAllVendors();
            Storage.saveVendors(allVendors);
            console.log(`✅ Saved ${allVendors.length} vendors with updated accounts`);

            // CRITICAL: Force VendorMatcher to reload from storage to get fresh data
            VendorMatcher.initialize();
            console.log('✅ VendorMatcher reloaded with fresh vendor data');
        }

        // Step 2: Apply vendor matching AND account assignment to ALL transactions
        let categorized = 0;
        let errors = 0;

        for (const tx of this.transactions) {
            try {
                const match = VendorMatcher.matchPayee(tx.payee);
                if (match && match.vendor) {
                    tx.vendor = match.vendor.name;
                    tx.vendorId = match.vendor.id;
                    tx.category = match.vendor.category;
                    tx.status = 'matched';

                    // DIRECTLY apply account logic based on vendor name (bypass cache)
                    const vendorName = match.vendor.name.toLowerCase();
                    const accounts = AccountAllocator.getAllAccounts();
                    let assignedAccount = null;

                    // --- SPECIAL LOGIC: Credit Card Payments ---
                    // If this transaction is on a Credit Card (Liability) AND it is a Credit (Money In/Payment)
                    // Then it is likely a transfer from the bank, NOT revenue.
                    let isCCPayment = false;
                    if (window.BankAccountManager && tx.accountId) {
                        const acc = BankAccountManager.getAccountById(tx.accountId);
                        if (acc && BankAccountManager.isLiability(acc.type) && tx.amount > 0) {
                            isCCPayment = true;
                        }
                    }

                    if (isCCPayment) {
                        console.log(`💳 Detected Credit Card Payment: "${tx.payee}"`);
                        // Assign to Main Checking (1000) or 'Transfer'
                        // Try to find the default checking account
                        const defaultChecking = BankAccountManager.accounts.find(a => a.type === 'CHECKING');
                        assignedAccount = defaultChecking
                            ? accounts.find(a => a.code === '1000') // Map to GL 1000 if possible
                            : accounts.find(a => a.code === '1000');

                        // Force specific category/account for payments
                        if (!assignedAccount) assignedAccount = { code: '1000', name: 'Bank' }; // Fallback
                        tx.category = 'Credit Card Payment';
                    }

                    // Apply patterns (same as in vendor-ai.js) 
                    else if (/wcb|workers comp/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '9750');
                    } else if (/pay[-\s]?file|file\s*fee/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '7700');
                    } else if (/sec\s*reg|lien/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '6800');
                    } else if (/loan\s*(payment|credit|pmt)/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '2710');
                    } else if ((vendorName.includes('loan') && vendorName.includes('interest'))) {
                        assignedAccount = accounts.find(a => a.code === '7700');
                    } else if (/mobile\s*.*\s*deposit/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '4001');
                    } else if (/(received|rcvd).*(e-transfer|interac)/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '4001');
                    } else if (/(sent|transfer).*(e-transfer|interac)/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '8950');
                    } else if (/online\s*.*\s*transfer/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '2101');
                    } else if (/gst[-\s]?[a-z]/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '2170');
                    } else if (/abcit/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '2620');
                    } else if (/commercial\s*tax/i.test(vendorName)) {
                        assignedAccount = accounts.find(a => a.code === '2600');
                    } else {
                        // Use vendor's default account if no pattern matches
                        assignedAccount = match.vendor.defaultAccount ?
                            accounts.find(a => a.code === match.vendor.defaultAccount) : null;

                        // 🧠 SANITY CHECK: If allocated to Accounts Receivable (1210) but likely an expense?
                        // This fixes legacy data ("Home Depot" -> 1210)
                        if (assignedAccount && assignedAccount.code === '1210') {
                            const betterSuggestion = AccountAllocator.suggestAccountFromText(vendorName);
                            if (betterSuggestion && betterSuggestion.code !== '1210') {
                                console.log(`🧠 AI OVERRIDE: "${vendorName}" was 1210, correcting to ${betterSuggestion.code} (${betterSuggestion.name})`);
                                assignedAccount = betterSuggestion;

                                // Update the vendor in memory too so next time it's right
                                if (match.vendor) {
                                    match.vendor.defaultAccount = betterSuggestion.code;
                                    match.vendor.defaultAccountName = betterSuggestion.name;
                                }
                            }
                        }
                    }

                    if (assignedAccount) {
                        tx.account = assignedAccount.code;
                        tx.allocatedAccount = assignedAccount.code;
                        tx.allocatedAccountName = assignedAccount.name;
                        console.log(`📊 TX: "${tx.payee}" → ${assignedAccount.code} (${assignedAccount.name})`);
                    } else {
                        // Fallback to vendor default or 9970
                        tx.account = match.vendor.defaultAccount || '9970';
                        tx.allocatedAccount = match.vendor.defaultAccount || '9970';
                        tx.allocatedAccountName = match.vendor.defaultAccountName || 'Un usual item';
                        console.log(`📊 TX: "${tx.payee}" → ${tx.account} (fallback)`);
                    }

                    categorized++;
                }
            } catch (error) {
                console.error('Error categorizing transaction:', tx, error);
                errors++;
            }
        }

        // Step 3: Refresh all grids
        if (typeof TransactionGrid !== 'undefined' && TransactionGrid.gridApi) {
            TransactionGrid.gridApi.setRowData(this.transactions);
            TransactionGrid.gridApi.refreshCells({ force: true });
        }

        if (typeof VendorGrid !== 'undefined' && VendorGrid.gridApi) {
            VendorGrid.loadVendors();
        }

        // Step 4: Save session
        if (typeof SessionManager !== 'undefined') {
            SessionManager.saveSession(this.currentFileName || 'Manual Save', this.transactions);
        }

        // Step 5: Show results
        const message = `✨ Unified AI Re-think Complete!\n\n` +
            `📖 VENDOR OPTIMIZATION:\n` +
            `  ✅ Names normalized: ${vendorResult.results.normalized}\n` +
            `  ✅ Categories assigned: ${vendorResult.results.categorized}\n` +
            `  ✅ Accounts allocated: ${vendorResult.results.allocated}\n` +
            `  ✅ Duplicates merged: ${vendorResult.results.merged}\n\n` +
            `📊 TRANSACTION CATEGORIZATION:\n` +
            `  ✅ Transactions categorized: ${categorized}/${this.transactions.length}\n` +
            `  ${errors > 0 ? `⚠️ Errors: ${errors}\n` : ''}` +
            `\n💡 All changes saved!`;

        alert(message);
        console.log('✅ Unified AI Re-think complete:', { vendorResult, categorized, errors });
    },

    updateBankAccountSelector(force = false) {
        if (typeof BankAccountManager === 'undefined') return;

        const selector = document.getElementById('bankAccountSelect');
        if (!selector) return;

        // Save current selection
        const currentVal = selector.value;

        // Get options from manager
        const options = BankAccountManager.getAccountOptions();

        this.renderSelectorOptions(selector, options, currentVal);

        // Also update Upload Account Selector
        const uploadSelector = document.getElementById('uploadAccountSelect');
        if (uploadSelector) {
            const uploadVal = uploadSelector.value;
            this.renderSelectorOptions(uploadSelector, options, uploadVal);
        }
    },

    renderSelectorOptions(selector, options, currentVal) {
        // Clear and rebuild
        selector.innerHTML = '<option value="">Select Account...</option>';

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;

            if (opt.disabled) option.disabled = true;
            if (opt.value === currentVal) option.selected = true;
            if (opt.isUnused) option.style.color = 'var(--text-tertiary)';
            if (opt.action) {
                option.style.fontWeight = 'bold';
                option.style.color = 'var(--primary-color)';
            }
            selector.appendChild(option);
        });
    },

    renderVersionExplorerV2() {
        try {
            const container = document.getElementById('versionExplorer');
            if (!container) return;

            // Bulletproof: Ensure history is an array
            let rawHistory = SessionManager.getHistory();
            if (!Array.isArray(rawHistory)) rawHistory = [];

            const history = rawHistory.slice(0, 5);

            if (history.length === 0) {
                container.innerHTML = `
                    <div class="version-static-card empty">
                       <div class="v-card-header">
                            <h4>Recent CSV History</h4>
                        </div>
                        <div class="empty-state-card">
                            <i class="fas fa-file-csv"></i>
                            <p>No CSV found in history</p>
                        </div>
                    </div>`;
                return;
            }

            const listHTML = history.map((session, index) => {
                const date = new Date(parseInt(session.timestamp));
                const dateStr = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

                // Inline Confirmation Logic
                if (App.confirmingDeleteIndex === index) {
                    return `
                        <div class="version-row-static confirm-delete-row" style="background: rgba(239, 68, 68, 0.1); border-left: 3px solid #ef4444;">
                            <div class="v-icon-col">
                                <i class="fas fa-trash-alt" style="color: #ef4444;"></i>
                            </div>
                            <div class="v-info-col">
                                <span class="v-name" style="color: #ef4444; font-weight:bold;">Delete "${session.filename}"?</span>
                                <span class="v-sub">This action cannot be undone.</span>
                            </div>
                            <div class="v-actions-col">
                                <button class="btn-text-action confirm" onclick="App.performDelete(${index})" style="color: #ef4444; font-weight:bold; margin-right:8px;">
                                    Confirm
                                </button>
                                <button class="btn-text-action cancel" onclick="App.cancelDelete()" style="color: var(--text-secondary);">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    `;
                }

                return `
                    <div class="version-row-static">
                        <div class="v-icon-col">
                            <i class="fas fa-file-csv"></i>
                        </div>
                        <div class="v-info-col" style="min-width: 0; padding-right: 10px;">
                            <span class="v-name" id="v-name-${index}" style="display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${session.filename}">${session.filename}</span>
                            <input type="text" class="v-name-edit" id="v-edit-${index}" value="${session.filename}"
                                   onblur="App.finishRename(${index})" onkeydown="if(event.key==='Enter') this.blur()">
                            <span class="v-date">${dateStr}</span>
                        </div>
                        <div class="v-actions-col">
                            <button class="btn-icon-action edit" onclick="App.startRename(${index})" title="Rename">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                            <button class="btn-icon-action delete" onclick="App.deleteSession(${index})" title="Delete">
                                <i class="fas fa-times"></i>
                            </button>
                            <button class="btn-icon-action restore" onclick="App.restoreSession(${index})" title="Restore">
                                <i class="fas fa-upload"></i>
                            </button>
                        </div>
                    </div>
                `;
            }).join('');

            container.innerHTML = `
                <div class="version-static-card">
                    <div class="v-card-header">
                        <h4>Last 5 Uploads</h4>
                    </div>
                    <div class="v-card-list">
                        ${listHTML}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error('Render VE Error:', e);
            const c = document.getElementById('versionExplorer');
            if (c) c.innerHTML = `<div style="color:red; padding:1rem;">Error rendering version explorer: ${e.message}</div>`;
        }
    },

    openVersionHistory() {
        this.renderVersionExplorer();
        const modal = document.getElementById('versionHistoryModal');
        if (modal) modal.style.display = 'flex';
    },

    startRename(index) {
        document.getElementById(`v-name-${index}`).style.display = 'none';
        const input = document.getElementById(`v-edit-${index}`);
        input.style.display = 'block';
        input.focus();
    },

    finishRename(index) {
        const input = document.getElementById(`v-edit-${index}`);
        const newName = input.value;
        if (newName && newName.trim()) {
            this.renameSession(index, newName);
        }
        input.style.display = 'none';
        document.getElementById(`v-name-${index}`).style.display = 'block';
    },

    restoreSession(index) {
        console.log(`🔄 Attempting to restore session index ${index}...`);
        const history = SessionManager.getHistory();
        if (history[index]) {
            if (confirm(`Restore "${history[index].filename}"? Current work will be overwritten.`)) {

                // 1. Perform Restore (Updates LocalStorage)
                // Use decoupled logic - SessionManager only handles storage
                const success = SessionManager.restoreFromHistory(index);

                if (success) {
                    // 2. Hydrate App State from Storage (Reliable)
                    const savedData = localStorage.getItem('lastTransactions');
                    this.transactions = savedData ? JSON.parse(savedData) : [];
                    this.currentFileName = localStorage.getItem('lastFileName');

                    // 3. Switch to Review & Refresh Grid
                    // IMPORTANT: Ensure we switch to the generic Review section, not Dashboard
                    this.showSection('review');
                    this.loadReviewSection();

                    if (window.TransactionGrid) {
                        try {
                            TransactionGrid.forceRefresh(this.transactions);
                            console.log('✅ Grid refreshed');
                        } catch (e) { console.error('Grid refresh failed:', e); }
                    }

                    console.log(`✅ Restored "${this.currentFileName}" with ${this.transactions.length} transactions.`);
                }

                // 4. Update Explorer State
                this.renderVersionExplorerV2();
            }
        }
    },

    // State for inline delete confirmation
    confirmingDeleteIndex: null,

    deleteSession(index) {
        this.confirmingDeleteIndex = index;
        this.renderVersionExplorerV2();
    },

    performDelete(index) {
        SessionManager.removeFromHistory(index);
        this.confirmingDeleteIndex = null;
        this.renderVersionExplorerV2();
    },

    cancelDelete() {
        this.confirmingDeleteIndex = null;
        this.renderVersionExplorerV2();
    },

    renameSession(index, newName) {
        if (!newName || !newName.trim()) return;
        const history = SessionManager.getHistory();
        if (history[index]) {
            history[index].filename = newName.trim();
            SessionManager.saveHistory(history);
            this.renderVersionExplorer();
        }
    },

    // New Method: Bulk assign all current transactions to an account
    assignAllToAccount(accountId) {
        console.log(`🔗 Linking ${this.transactions.length} transactions to account: ${accountId}`);

        this.transactions.forEach(tx => {
            tx.accountId = accountId;
        });

        // 🧠 AUTO-SMART: Now that we have the Account Context, re-run categorization!
        // This fixes Credit Card Pymts vs Revenue, and 1210 overrides based on the specific account type.
        console.log('🧠 Auto-applying smart categorization based on new account context...');
        this.applySmartCategorization(this.transactions);

        // Save
        Storage.saveTransactions(this.transactions);

        // Refresh Grid (Current filter will now match everything)
        if (window.TransactionGrid) {
            // 1. Nuclear Refresh to ensure the view updates visually ☢️
            TransactionGrid.forceRefresh(this.transactions);

            // 2. ⚡ TICKER EFFECT: Push update via stream to trigger "Green Flash"
            // This grants the user's wish for "Stock Market Logic" visual feedback
            if (window.GridStream) {
                setTimeout(() => {
                    GridStream.pushBatchUpdate(this.transactions);
                }, 400); // 400ms delay to allow forceRefresh (50ms) + render to complete
            }
        }

        // Hide Button
        const assignBtn = document.getElementById('assignGridToAccountBtn');
        if (assignBtn) assignBtn.style.display = 'none';

        // Feedback
        this.updateStatistics(); // Update header stats

        // Refresh Dropdown (Updates "(Unused)" status to used)
        this.updateBankAccountSelector();
    },

    // ⚡ BULK VENDOR UPDATE (From Summary Modal)
    bulkUpdateVendor(vendorName, newAccountCode) {
        console.log(`⚡ BULK UPDATE: "${vendorName}" -> ${newAccountCode}`);

        let updateCount = 0;
        const newAccount = AccountAllocator.getAccountByCode(newAccountCode);
        const newAccountName = newAccount ? newAccount.name : '';

        // 1. Update Transactions
        this.transactions.forEach(tx => {
            if (tx.vendor === vendorName || tx.payee === vendorName) {
                tx.account = newAccountCode;
                tx.allocatedAccount = newAccountCode;
                tx.allocatedAccountName = newAccountName;
                tx.status = 'manual'; // User engaged
                updateCount++;
            }
        });

        // 2. Update Vendor Dictionary (Persist Rule)
        if (typeof VendorMatcher !== 'undefined') {
            const vendor = VendorMatcher.getVendorByName(vendorName);
            if (vendor) {
                vendor.defaultAccount = newAccountCode;
                vendor.defaultAccountName = newAccountName;
                VendorMatcher.updateVendor(vendor); // Save to storage
            } else {
                // Create new if missing
                VendorMatcher.addVendor({
                    name: vendorName,
                    defaultAccount: newAccountCode,
                    defaultAccountName: newAccountName
                });
            }
        }

        // 3. Refresh Grid & Flash
        if (window.TransactionGrid) {
            TransactionGrid.forceRefresh(this.transactions);
            if (window.GridStream) {
                setTimeout(() => GridStream.pushBatchUpdate(this.transactions), 400);
            }
        }

        console.log(`✅ Updated ${updateCount} transactions for "${vendorName}"`);
    },

    // 📊 GENERATE VENDOR SUMMARY
    openVendorSummary() {
        const modal = document.getElementById('vendorSummaryModal');
        const listContainer = document.getElementById('vendorSummaryList');
        if (!modal || !listContainer) return;

        // 1. Aggregate Data
        const vendorMap = new Map();

        this.transactions.forEach(tx => {
            const name = tx.vendor || tx.payee; // Prefer vendor name
            if (!vendorMap.has(name)) {
                vendorMap.set(name, { count: 0, currentAccount: tx.allocatedAccount, totalAmount: 0 });
            }
            const entry = vendorMap.get(name);
            entry.count++;
            entry.totalAmount += (tx.amount || 0) + (tx.debits || 0); // Rough total volume
        });

        // Sort by Count (Desc)
        const sortedVendors = Array.from(vendorMap.entries()).sort((a, b) => b[1].count - a[1].count);

        // 2. Render List
        listContainer.innerHTML = '';
        const accounts = AccountAllocator.getAccountOptions(); // Get dropdown options

        sortedVendors.forEach(([name, data]) => {
            const row = document.createElement('div');
            row.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 2fr; align-items: center; padding: 0.5rem; background: var(--bg-secondary); border-radius: 6px; box-shadow: 0 1px 2px rgba(0,0,0,0.05);';

            // Name & Count
            const infoDiv = document.createElement('div');
            infoDiv.innerHTML = `<strong>${name}</strong> <span style="color:var(--text-secondary); font-size:0.85em;">(${data.count} items)</span>`;

            // Amount
            const amtDiv = document.createElement('div');
            amtDiv.textContent = `$${data.totalAmount.toFixed(2)}`;
            amtDiv.style.color = 'var(--text-secondary)';
            amtDiv.style.fontSize = '0.9rem';

            // Dropdown
            const select = document.createElement('select');
            select.style.cssText = 'padding: 0.3rem; border: 1px solid var(--border-color); border-radius: 4px; width: 100%; background: white; color: var(--text-primary);';

            // Populate Options
            // Default option
            const defOpt = document.createElement('option');
            defOpt.value = '';
            defOpt.textContent = 'Select Account...';
            select.appendChild(defOpt);

            accounts.forEach(opt => {
                if (opt.disabled) {
                    const el = document.createElement('option');
                    el.disabled = true;
                    el.textContent = opt.label; // Separator
                    select.appendChild(el);
                } else {
                    const el = document.createElement('option');
                    el.value = opt.value;
                    el.textContent = opt.label;
                    if (String(opt.value) === String(data.currentAccount)) el.selected = true;
                    select.appendChild(el);
                }
            });

            // Event Listener
            select.addEventListener('change', (e) => {
                const newAcc = e.target.value;
                if (newAcc) {
                    this.bulkUpdateVendor(name, newAcc);
                    // Visual feedback
                    row.style.backgroundColor = '#dcfce7'; // Flash green
                    setTimeout(() => row.style.backgroundColor = 'var(--bg-secondary)', 500);
                }
            });

            row.appendChild(infoDiv);
            row.appendChild(amtDiv);
            row.appendChild(select);
            listContainer.appendChild(row);
        });

        // 3. Show Modal
        modal.display = 'block'; // Fallback
        modal.classList.add('active');
    },

    // 🧠 CENTRAL BRAIN: Apply all smart logic (Vendor Match + Account Rules)
    applySmartCategorization(transactions) {
        let updates = 0;

        for (const tx of transactions) {
            // 1. Basic Vendor Match (if not matched or to ensure freshness)
            const match = VendorMatcher.matchPayee(tx.payee);
            if (match && match.vendor) {
                tx.vendor = match.vendor.name;
                tx.vendorId = match.vendor.id;
                tx.category = match.vendor.category;
                tx.status = 'matched';

                // Default Assignment
                let assignedAccount = null;
                const accounts = AccountAllocator.getAllAccounts();

                // --- SPECIAL LOGIC: Credit Card Payments ---
                let isCCPayment = false;
                if (window.BankAccountManager && tx.accountId) {
                    const acc = BankAccountManager.getAccountById(tx.accountId);
                    if (acc && BankAccountManager.isLiability(acc.type) && tx.amount > 0) {
                        isCCPayment = true;
                    }
                }

                // --- LOGIC: Contra-Expense Checks (Refunds) ---
                // If it's a Credit (Refund) but the Vendor is a known Expense Vendor, keep it in Expense account.
                // e.g. "Amazon Refund" -> 8600 (not 4001)

                if (match.vendor.defaultAccount) {
                    const defAcc = accounts.find(a => a.code === match.vendor.defaultAccount);

                    if (defAcc) {
                        // Logic: If manual rule exists, TRUST IT 100%
                        // This covers both normal expenses AND refunds to that vendor
                        assignedAccount = defAcc;
                    }
                }

                // If no assigned account yet, try suggestions
                if (!assignedAccount) {
                    if (isCCPayment) {
                        // CC Payment Logic
                        assignedAccount = accounts.find(a => a.code === '2101') || accounts.find(a => a.code === '2100');
                    } else {
                        // Standard Logic
                        // If Credit (tx.amount > 0), suggestAccount typically finds Income.
                        // But if suggestAccount finds an EXPENSE account based on name (e.g. "Home Depot"), 
                        // we should use it! (Contra-Expense)

                        const suggestion = AccountAllocator.suggestAccount(tx);
                        if (suggestion) {
                            if (tx.isCredit && (suggestion.type === 'Expense' || suggestion.type === 'Asset')) {
                                // It's a refund! Allow mapping to Expense/Asset
                                console.log(`↩️ Refund Detected: ${tx.payee} -> ${suggestion.code} (${suggestion.type})`);
                                assignedAccount = suggestion;
                            } else {
                                assignedAccount = suggestion;
                            }
                        }
                    }
                }

                // 🧠 SANITY CHECK (1210 Override) / 1200 (Accounts Receivable)
                // Check for 1210 or 1200 (Common AR codes)
                if (assignedAccount && (assignedAccount.code == 1210 || assignedAccount.code == 1200)) {

                    if (isCCPayment) {
                        // Credit Card Payment Logic
                        assignedAccount = accounts.find(a => a.code === '1000');
                        tx.category = 'Credit Card Payment';
                    } else {
                        // Standard Logic
                        // 🧠 SANITY CHECK (1210 Override) / 1200 (Accounts Receivable)
                        // Check for 1210 or 1200 (Common AR codes)
                        console.log(`🧠 Checking AR Override for: ${match.vendor.name} (${tx.payee})`);

                        // 1. Try Vendor Name
                        let betterSuggestion = AccountAllocator.suggestAccountFromText(match.vendor.name);

                        // 2. If no luck, try Raw Payee (in case vendor name is generic like 'Store')
                        if (!betterSuggestion || betterSuggestion.code == 1210 || betterSuggestion.code == 1200) {
                            betterSuggestion = AccountAllocator.suggestAccountFromText(tx.payee);
                        }

                        if (betterSuggestion && betterSuggestion.code != 1210 && betterSuggestion.code != 1200) {
                            console.log(`🚀 AI OVERRIDE SUCCESS: ${match.vendor.name} 1210 -> ${betterSuggestion.code}`);
                            assignedAccount = betterSuggestion;

                            // Auto-update vendor dict validation
                            if (match.vendor) {
                                match.vendor.defaultAccount = betterSuggestion.code;
                                match.vendor.defaultAccountName = betterSuggestion.name;
                                match.vendor.isAutoCorrected = true; // Flag it
                            }
                        } else {
                            console.log(`❌ AI Override Failed: Could not find better match for ${match.vendor.name}`);
                        }
                    }
                }

                if (assignedAccount) {
                    tx.account = assignedAccount.code;
                    tx.allocatedAccount = assignedAccount.code;
                    tx.allocatedAccountName = assignedAccount.name;
                } else {
                    // Fallback
                    tx.account = match.vendor.defaultAccount || '9970';
                    tx.allocatedAccount = match.vendor.defaultAccount || '9970';
                    tx.allocatedAccountName = match.vendor.defaultAccountName || 'Unusual item';
                }
                updates++;
            }
        }
        console.log(`🧠 Smart Categorization applied to ${updates} transactions.`);
        console.log(`🧠 Smart Categorization applied to ${updates} transactions.`);
    },

    setupEventListeners() {
        // 🧭 Navigation Logic
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                const targetSection = targetBtn.dataset.target;

                // Update Active State
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                targetBtn.classList.add('active');

                // Navigate
                if (targetSection === 'dashboardSection') this.showSection('dashboard');
                else if (targetSection === 'uploadSection') this.showSection('upload');
                else if (targetSection === 'reviewSection') this.showSection('review');
                else if (targetSection === 'settingsSection') this.showSection('settings');
                // Vendors/Reports placeholder for now
            });
        });


        // 🟢 VENDOR SUMMARY BUTTON (Vendors in Grid)
        // Defined here to ensure it's bound during app init
        const vendorSummaryBtn = document.getElementById('vendorSummaryBtn');
        const closeVendorSummaryBtn = document.getElementById('closeVendorSummaryBtn');
        const closeVendorSummaryModal = document.getElementById('closeVendorSummaryModal');
        const vendorSummaryModal = document.getElementById('VIGModal');

        if (vendorSummaryBtn) {
            vendorSummaryBtn.addEventListener('click', () => {
                console.log('🟢 Opening Vendor Summary...');
                if (vendorSummaryModal) {
                    // Match VIG Logic Exactly: Block -> AnimationFrame -> Active
                    vendorSummaryModal.style.display = 'block';

                    if (window.VendorSummaryGrid) {
                        // Re-initialize every time to ensure fresh container
                        VendorSummaryGrid.initialize('vendorSummaryGridContainer');
                    }

                    requestAnimationFrame(() => {
                        vendorSummaryModal.classList.add('active');
                        // Force a resize check after animation starts frames
                        setTimeout(() => {
                            if (window.VendorSummaryGrid && VendorSummaryGrid.gridApi) {
                                VendorSummaryGrid.gridApi.sizeColumnsToFit();
                            }
                        }, 50);
                    });

                    // 🔍 DATA SOURCE HARDENING (Aggressive)
                    let sourceTransactions = this.transactions;
                    console.log('🔍 VendorSummary: 1. App.transactions:', sourceTransactions ? sourceTransactions.length : 'null');

                    if ((!sourceTransactions || sourceTransactions.length === 0) && window.TransactionGrid && TransactionGrid.transactions) {
                        console.log('⚠️ App.transactions empty, pulling from TransactionGrid.transactions...');
                        sourceTransactions = TransactionGrid.transactions;
                    }

                    if ((!sourceTransactions || sourceTransactions.length === 0) && window.TransactionGrid && TransactionGrid.gridApi) {
                        console.log('⚠️ Grid.transactions empty, pulling from TransactionGrid API...');
                        const rowData = [];
                        TransactionGrid.gridApi.forEachNode(node => rowData.push(node.data));
                        sourceTransactions = rowData;
                    }

                    // Fallback to Storage
                    if (!sourceTransactions || sourceTransactions.length === 0) {
                        console.log('⚠️ TransactionGrid empty, pulling from Storage...');
                        sourceTransactions = Storage.getTransactions() || [];
                    }

                    console.log('✅ Final Source Count:', sourceTransactions ? sourceTransactions.length : 0);

                    const hasData = sourceTransactions && sourceTransactions.length > 0;

                    if (hasData) {
                        // 📊 AGGREGATE TRANSACTIONS
                        const aggregation = {};
                        let skippedCount = 0;

                        sourceTransactions.forEach((tx, index) => {
                            const rawName = tx.vendor || tx.payee || tx.description || '';
                            const name = tx.vendor || (window.VendorNameUtils ? VendorNameUtils.extractVendorName(rawName) : rawName);

                            if (index < 5) console.log(`🔍 Row ${index} | Raw: "${rawName}" | Extracted: "${name}" | Vendor: "${tx.vendor}"`);

                            if (!name) {
                                skippedCount++;
                                return;
                            }

                            if (!aggregation[name]) {
                                const savedRule = window.VendorMatcher ? VendorMatcher.getVendorByName(name) : null;
                                aggregation[name] = {
                                    name: name,
                                    count: 0,
                                    totalAmount: 0,
                                    currentAccount: savedRule ? savedRule.defaultAccount : (tx.allocatedAccount !== '9970' ? tx.allocatedAccount : ''),
                                    isSaved: !!savedRule
                                };
                            }

                            aggregation[name].count++;
                            aggregation[name].totalAmount += (tx.debits || 0) - (tx.credits || 0);
                        });

                        console.log(`⚠️ Skipped ${skippedCount} rows due to empty name.`);
                        const gridData = Object.values(aggregation).sort((a, b) => b.count - a.count);
                        console.log(`📊 Aggregated ${gridData.length} unique vendors from ${sourceTransactions.length} transactions.`);

                        if (window.VendorSummaryGrid) {
                            VendorSummaryGrid.loadVendors(gridData);
                        }
                    } else {
                        if (window.VendorSummaryGrid) {
                            VendorSummaryGrid.loadVendors([]);
                        }
                    }
                }
            });
        }

        // Close handlers for Vendor Summary
        const closeSummary = () => {
            if (vendorSummaryModal) {
                vendorSummaryModal.classList.remove('active');
                setTimeout(() => vendorSummaryModal.style.display = 'none', 300);
            }
        };

        if (closeVendorSummaryBtn) closeVendorSummaryBtn.addEventListener('click', closeSummary);
        if (closeVendorSummaryModal) closeVendorSummaryModal.addEventListener('click', closeSummary);

        // 🟢 DRILL DOWN MODAL HANDLERS
        const closeDrillDownBtn = document.getElementById('closeDrillDownModal');
        const drillDownModal = document.getElementById('VSMModal');

        const closeDrillDown = () => {
            if (drillDownModal) {
                drillDownModal.classList.remove('active');
                setTimeout(() => drillDownModal.style.display = 'none', 300);
            }
        };

        if (closeDrillDownBtn) closeDrillDownBtn.addEventListener('click', closeDrillDown);

        // Ensure clicking outside closes it too (optional, but good UX)
        /*
        window.addEventListener('click', (e) => {
            if (e.target === drillDownModal) closeDrillDown();
        });
        */

        // Settings button
        const settingsBtn = document.getElementById('settingsBtn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => {
                const settingsModal = document.getElementById('settingsModal');
                if (settingsModal) {
                    settingsModal.classList.add('active');
                }
            });
        }

        // Features button
        const featuresBtn = document.getElementById('featuresBtn');
        if (featuresBtn) {
            featuresBtn.addEventListener('click', () => {
                const featuresModal = document.getElementById('featuresModal');
                if (featuresModal) {
                    featuresModal.classList.add('active');
                    featuresModal.style.display = 'flex';
                }
            });
        }

        // Settings modal close
        const closeSettingsModal = document.getElementById('closeSettingsModal');
        const settingsModal = document.getElementById('settingsModal');

        if (closeSettingsModal && settingsModal) {
            closeSettingsModal.addEventListener('click', () => {
                settingsModal.classList.remove('active');
            });

            settingsModal.addEventListener('click', (e) => {
                if (e.target.id === 'settingsModal') {
                    settingsModal.classList.remove('active');
                }
            });
        }

        // Features modal close
        const closeFeaturesModal = document.getElementById('closeFeaturesModal');
        const featuresModal = document.getElementById('featuresModal');

        if (closeFeaturesModal && featuresModal) {
            closeFeaturesModal.addEventListener('click', () => {
                featuresModal.classList.remove('active');
                featuresModal.style.display = 'none';
            });

            featuresModal.addEventListener('click', (e) => {
                if (e.target.id === 'featuresModal') {
                    featuresModal.classList.remove('active');
                    featuresModal.style.display = 'none';
                }
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (typeof ExcelExporter !== 'undefined') {
                    ExcelExporter.exportGeneralLedger(this.transactions);
                }
            });
        }

        // AI Re-think button (Unified: Optimizes vendors + categorizes transactions)
        const rethinkBtn = document.getElementById('rethinkTransactionsBtn');
        if (rethinkBtn) {
            rethinkBtn.addEventListener('click', async () => {
                await this.unifiedAIRethink();
            });
        }

        // Add Data button (append new transactions)
        const addDataBtn = document.getElementById('addDataBtn');
        if (addDataBtn) {
            addDataBtn.addEventListener('click', () => {
                this.addData();
            });
        }

        // Start Over button (clear all)
        const startOverBtn = document.getElementById('startOverBtn');
        if (startOverBtn) {
            startOverBtn.addEventListener('click', () => {
                this.startOver();
            });
        }

        // Grid Pop-out
        const popoutBtn = document.getElementById('popoutBtn');
        if (popoutBtn) {
            popoutBtn.addEventListener('click', () => {
                if (window.GridPopout) {
                    window.GridPopout.openPopout();
                } else {
                    alert('Grid Pop-out module not loaded. Please refresh.');
                }
            });
        }

        // Reset button  
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }

        // Quick Search / Filter
        const gridQuickFilter = document.getElementById('gridQuickFilter');
        if (gridQuickFilter) {
            gridQuickFilter.addEventListener('input', (e) => {
                if (TransactionGrid.gridApi) {
                    TransactionGrid.gridApi.setQuickFilter(e.target.value);
                }
            });
        }

        // Ref# Prefix Input
        const refPrefixInput = document.getElementById('refPrefixInput');
        if (refPrefixInput) {
            refPrefixInput.addEventListener('input', (e) => {
                const prefix = e.target.value.toUpperCase();
                TransactionGrid.setRefPrefix(prefix);
            });
        }

        // Match Account Context
        const bankAccountSelect = document.getElementById('bankAccountSelect');
        if (bankAccountSelect) {
            bankAccountSelect.addEventListener('change', (e) => {
                const accountId = e.target.value;

                // Handle "Add New" Action
                if (accountId === 'action_new') {
                    const modal = document.getElementById('manageAccountsModal');
                    if (modal && window.BankAccountManager) {
                        modal.style.display = 'block';
                        BankAccountManager.addAccount('New Account');
                    }
                    e.target.value = ''; // Reset dropdown
                    return;
                }

                this.currentAccountId = accountId;

                // --- Account Linking Logic ---
                const assignBtn = document.getElementById('assignGridToAccountBtn');
                console.log('🔍 Debug Link Button:', {
                    accountId,
                    totalTx: this.transactions.length,
                    hasGrid: !!window.TransactionGrid,
                    assignBtnExists: !!assignBtn
                });

                if (window.TransactionGrid) {
                    TransactionGrid.setAccountContext(accountId);
                    TransactionGrid.loadTransactions(this.transactions); // Reload with filter

                    if (this.transactions.length > 0 && accountId && accountId !== 'all') {
                        const filteredCount = this.transactions.filter(t => t.accountId === accountId).length;
                        console.log('🔍 filtering:', filteredCount, 'matches for', accountId);

                        // Treat 'undefined' or 'null' accountId in filtered items as NOT matching specific account
                        // If filteredCount is 0, it means NO transactions are currently assigned to this account.

                        if (filteredCount === 0 && assignBtn) {
                            console.log('✅ SHOWING LINK BUTTON');
                            assignBtn.style.display = 'inline-block';
                            assignBtn.onclick = () => {
                                if (confirm(`Link all ${this.transactions.length} current transactions to this account?`)) {
                                    this.assignAllToAccount(accountId);
                                }
                            };
                        } else if (assignBtn) {
                            console.log('❌ HIDING LINK BUTTON (Has matches)');
                            assignBtn.style.display = 'none';
                        }
                    } else if (assignBtn) {
                        console.log('❌ HIDING LINK BUTTON (No tx or invalid account)');
                        assignBtn.style.display = 'none';
                    }
                }
                this.updateStatistics();
            });
        }



        // Account Type Dropdown (filter transactions)
        const accountTypeSelect = document.getElementById('accountTypeSelect');
        if (accountTypeSelect) {
            accountTypeSelect.addEventListener('change', (e) => {
                const accountType = e.target.value;
                this.filterByAccountType(accountType);
            });
        }

        // Grid Font Family
        const gridFontFamily = document.getElementById('gridFontFamily');
        if (gridFontFamily) {
            gridFontFamily.addEventListener('change', (e) => {
                const fontFamily = e.target.value;
                Settings.setGridStyle('gridFontFamily', fontFamily);
                if (TransactionGrid.gridApi) {
                    TransactionGrid.applyGridStyling();
                }
            });
        }

        // Grid Font Size
        const gridFontSize = document.getElementById('gridFontSize');
        const fontSizeValue = document.getElementById('fontSizeValue');
        if (gridFontSize) {
            gridFontSize.addEventListener('input', (e) => {
                const fontSize = parseInt(e.target.value);
                if (fontSizeValue) {
                    fontSizeValue.textContent = fontSize + 'px';
                }
                Settings.setGridStyle('gridFontSize', fontSize);
                if (TransactionGrid.gridApi) {
                    TransactionGrid.applyGridStyling();
                }
            });
        }

        // Grid Color Scheme
        const gridColorScheme = document.getElementById('gridColorScheme');
        if (gridColorScheme) {
            gridColorScheme.addEventListener('change', (e) => {
                const scheme = e.target.value;
                Settings.setGridStyle('gridColorScheme', scheme);
                if (TransactionGrid.gridApi) {
                    TransactionGrid.applyGridStyling();
                }
            });
        }

        // Verify Account Button

        if (VIGModal) {
            VIGModal.addEventListener('click', (e) => {
                // ModalManager handles this, but if we have specific logic:
                if (e.target.id === 'VIGModal' && window.ModalManager) ModalManager.close('VIGModal');
            });
        }
        // Logo click - return to home
        const logoHome = document.getElementById('logoHome');
        if (logoHome) {
            logoHome.addEventListener('click', () => {
                this.reset();
            });
        }

        // Manage Bank Accounts Settings Button
        const settingsBankAccountsBtn = document.getElementById('settingsBankAccountsBtn');
        if (settingsBankAccountsBtn) {
            settingsBankAccountsBtn.addEventListener('click', () => {
                document.getElementById('manageAccountsModal').classList.add('active');
            });
        }

        // Accounts modal
        const closeAccountsModal = document.getElementById('closeManageAccountsModal');
        if (closeAccountsModal) {
            closeAccountsModal.addEventListener('click', () => {
                this.hideAccountsModal();
            });
        }

        const accountsModal = document.getElementById('accountsModal');
        if (accountsModal) {
            accountsModal.addEventListener('click', (e) => {
                if (e.target.id === 'accountsModal') {
                    this.hideAccountsModal();
                }
            });
        }

        // 🟢 FILE UPLOAD HANDLERS (Restored)
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');
        const browseBtn = document.getElementById('browseBtn');

        if (uploadZone && fileInput) {
            // Drag & Drop
            uploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadZone.classList.add('dragging');
            });

            uploadZone.addEventListener('dragleave', () => {
                uploadZone.classList.remove('dragging');
            });

            uploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadZone.classList.remove('dragging');
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleFile(files[0]);
                }
            });

            // Click to browse
            uploadZone.addEventListener('click', () => fileInput.click());

            // File Input Change
            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

        if (browseBtn && fileInput) {
            browseBtn.addEventListener('click', (e) => {
                // Prevent bubbling if button is inside zone (it is)
                e.stopPropagation();
                fileInput.click();
            });
        }



    },

    async handleFile(file) {
        console.log('📄 Processing file:', file.name);

        // Store filename for session management
        this.currentFileName = file.name;

        // Add to Recent Files
        if (typeof RecentFilesManager !== 'undefined') {
            RecentFilesManager.addFile(file);
        }

        if (!file.name.endsWith('.csv')) {
            alert('Please upload a CSV file');
            return;
        }

        // Show processing section
        this.showSection('processing');
        this.updateProcessing('Validating file...', 10);

        try {
            // Validate file format
            const validation = await CSVParser.validateFormat(file);

            if (!validation.isValid) {
                throw new Error(validation.error);
            }

            this.updateProcessing('Parsing transactions...', 30);

            // Parse CSV with Account Awareness 🏦
            let selectedAccount = null;
            if (this.currentAccountId && window.BankAccountManager) {
                selectedAccount = BankAccountManager.getAccountById(this.currentAccountId);
                console.log('🏦 Importing into Account:', selectedAccount ? selectedAccount.name : 'Unknown');
            }

            const transactions = await CSVParser.parseFile(file, selectedAccount);
            console.log(`✅ Parsed ${transactions.length} transactions`);

            // 🧹 AUTO-CLEAN VENDORS ON IMPORT 🧹
            // User Request: "smart system... do it upon initial loadup"
            const cleanedTransactions = transactions.map(tx => {
                // 1. Clean Name (Aggressive)
                const originalPayee = tx.payee;
                const cleanedPayee = Utils.normalizeVendorName(originalPayee);

                if (cleanedPayee !== originalPayee) {
                    tx.payee = cleanedPayee;
                    tx.vendor = cleanedPayee; // Updates vendor field too
                }

                // 2. Try Smart Categorization (if not already matched)
                if (!tx.category && window.VendorAI) {
                    const aiCat = VendorAI.categorizeVendor(tx.payee);
                    if (aiCat && aiCat !== 'General') tx.category = aiCat;
                }

                return tx;
            });

            // Replace the raw transactions with clean ones
            // Note: We don't overwrite 'this.transactions' yet, we do it at merge step.
            // But properly we should use these cleaned ones for matching.

            // 🕵️ AUTO-DETECT INDICATOR
            // Logic: 
            // 1. If Account is Liability -> CREDIT CARD
            // 2. If 'FORCE REVERSED' was triggered in Parser -> CREDIT CARD
            // 3. Fallback: Check if we have typical Credit Card categories

            let detectedType = 'CHECKING';
            if (selectedAccount && window.BankAccountManager.isLiability(selectedAccount.type)) {
                detectedType = 'CREDIT CARD';
            } else if (cleanedTransactions.some(t => t.isCredit && t.category === 'Credit Card Payment')) {
                detectedType = 'CREDIT CARD (Inferred)';
            } else {
                detectedType = 'BANK / CHECKING';
            }

            // UPDATE INDICATOR UI
            const indicator = document.getElementById('fileTypeIndicator');
            if (indicator) {
                indicator.style.display = 'inline-block';
                if (detectedType.includes('CREDIT')) {
                    indicator.textContent = '💳 ' + detectedType;
                    indicator.style.backgroundColor = '#fef3c7'; // Yellow/Amber
                    indicator.style.color = '#d97706';
                    indicator.style.border = '1px solid #fcd34d';
                } else {
                    indicator.textContent = '🏦 ' + detectedType;
                    indicator.style.backgroundColor = '#dcfce7'; // Green
                    indicator.style.color = '#15803d';
                    indicator.style.border = '1px solid #86efac';
                }
            }

            this.updateProcessing(`Found ${cleanedTransactions.length} transactions. Matching vendors...`, 50);

            // Match vendors
            await this.delay(500);
            const matchResult = VendorMatcher.matchTransactions(cleanedTransactions);
            const matchedTransactions = matchResult.transactions || (Array.isArray(matchResult) ? matchResult : []);

            if (!matchedTransactions || matchedTransactions.length === 0) {
                console.warn("⚠️ Vendor matching returned no transactions or invalid format.", matchResult);
            }

            this.updateProcessing('Allocating accounts...', 70);

            // Allocate accounts
            await this.delay(500);
            // Allocate accounts
            await this.delay(500);
            AccountAllocator.allocateTransactions(matchedTransactions);

            // 🧠 CORE FIX: Ensure Grid Context matches Import
            // If we detected an account or used a selected one, FORCE the grid to look at it.
            // If nothing selected, FORCE it to 'all' to ensure rows show up.
            const targetContext = selectedAccount ? selectedAccount.id : 'all';

            if (this.currentAccountId !== targetContext) {
                this.currentAccountId = targetContext;
                if (TransactionGrid) TransactionGrid.setAccountContext(targetContext);
                const selector = document.getElementById('bankAccountSelect');
                if (selector) selector.value = targetContext === 'all' ? '' : targetContext;
            } else if (!this.currentAccountId && TransactionGrid) {
                // Double safety: If app state is null, ensure grid is 'all'
                TransactionGrid.setAccountContext('all');
            }

            this.updateProcessing('Preparing review...', 90);

            // Store transactions (Merge with existing)
            this.mergeTransactions(matchedTransactions);
            Storage.saveTransactions(this.transactions);

            // Save session for Continue/Start Over
            if (typeof SessionManager !== 'undefined') {
                SessionManager.saveSession(file.name, this.transactions);
            }

            await this.delay(500);

            // Show review section
            this.showSection('review');


            // FORCE GRID REFRESH - Push updated data to AG Grid
            if (TransactionGrid.gridApi) {
                console.log('🔄 Forcing grid refresh with updated transaction accounts...');

                // Method 1: Update row data completely
                TransactionGrid.gridApi.setRowData(this.transactions);

                // Method 2: Force refresh all cells
                TransactionGrid.gridApi.refreshCells({ force: true });

                // Method 3: Redraw all rows
                TransactionGrid.gridApi.redrawRows();

                console.log('✅ Grid forcefully refreshed with categorized data');
            }

            this.loadReviewSection();

            console.log('✅ File processing complete!');

        } catch (error) {
            console.error('❌ FILE PROCESSING ERROR:', error);
            alert('Error processing file: ' + error.message);
            this.showSection('upload');
        }
    },

    // Merge new transactions with deduplication 🧩
    mergeTransactions(newTransactions) {
        if (!newTransactions || !Array.isArray(newTransactions)) {
            console.error('❌ mergeTransactions called with invalid data:', newTransactions);
            return;
        }

        if (!this.transactions || this.transactions.length === 0) {
            this.transactions = newTransactions;
            console.log(`Initialized with all ${newTransactions.length} transactions.`);
            return;
        }

        let addedCount = 0;
        let skippedCount = 0;

        newTransactions.forEach(newTx => {
            // Deduplication Logic
            // Create a simple signature based on immutable import fields
            // Note: We use original payee from import, but 'payee' field might change?
            // Actually 'payee' in Transaction model usually stores the raw payee from CSV designated column.
            const newDate = new Date(newTx.date).toISOString().split('T')[0];
            // Use debits and credits separate to be precise
            const signature = `${newDate}_${newTx.debits}_${newTx.amount}_${newTx.payee}_${newTx.balance}_${newTx.accountId || 'null'}`;

            const exists = this.transactions.some(existingTx => {
                const exDate = new Date(existingTx.date).toISOString().split('T')[0];
                const exSignature = `${exDate}_${existingTx.debits}_${existingTx.amount}_${existingTx.payee}_${existingTx.balance}_${existingTx.accountId || 'null'}`;
                return signature === exSignature;
            });

            if (!exists) {
                this.transactions.push(newTx);
                addedCount++;
            } else {
                skippedCount++;
            }
        });

        console.log(`🧩 Merged ${addedCount} new transactions. Skipped ${skippedCount} duplicates.`);

        // Re-sort by date descending
        this.transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
    },

    loadReviewSection() {
        // 🛡️ SANITIZATION: Clean invalid transactions before checking
        if (this.transactions && Array.isArray(this.transactions)) {
            // Filter out null/undefined/ghost objects
            this.transactions = this.transactions.filter(t => t && t.id);
        }

        // Toggle Empty State using robust CSS classes
        const section = document.getElementById('reviewSection');
        const emptyState = document.getElementById('emptyTransactionState');
        const reviewContent = document.getElementById('reviewContent');
        const hasTransactions = this.transactions && this.transactions.length > 0;

        console.log('👀 loadReviewSection: hasTransactions=', hasTransactions, 'Count:', this.transactions ? this.transactions.length : 0);

        // SIMPLE LOGIC: No Data -> Go to Upload
        if (!hasTransactions) {
            console.warn('⚠️ No transactions found. Redirecting to Upload.');
            // Show a toast or small alert? Maybe just redirect for now as requested.
            this.showSection('upload');
            // Optional: Open the CSV tab specifically?
            this.switchUploadTab('csv');
            return;
        }

        // HAS DATA -> Show Review Section
        if (section) {
            section.classList.remove('state-empty');
            section.classList.add('state-has-data');
            if (reviewContent) reviewContent.style.display = 'block';
            if (emptyState) emptyState.style.display = 'none';
        }

        // Load transactions into grid
        TransactionGrid.loadTransactions(this.transactions);

        // Update statistics
        this.updateStatistics();

        // Update year-end date display in reconciliation
        this.updateYearEndDisplay();

        // Show and update reconciliation
        this.updateReconciliation();

        // Setup reconciliation input listeners
        this.setupReconciliationListeners();
    },

    updateYearEndDisplay() {
        const yearEndDate = localStorage.getItem('yearEndDate');
        const header = document.getElementById('endingBalanceHeader');

        if (header && yearEndDate) {
            const date = new Date(yearEndDate);
            const formattedDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
            });
            header.textContent = `Ending Balance (as of ${formattedDate})`;
        } else if (header) {
            header.textContent = 'Ending Balance';
        }
    },

    setupReconciliationListeners() {
        const expectedOpening = document.getElementById('expectedOpeningBalance');
        const expectedEnding = document.getElementById('expectedEndingBalance');

        // Format currency inputs
        const formatCurrencyInput = (input) => {
            if (!input.value) return;

            // Remove any non-numeric characters except decimal point
            let value = input.value.replace(/[^0-9.]/g, '');

            // Parse as number
            const number = parseFloat(value);
            if (isNaN(number)) {
                input.value = '';
                return;
            }

            // Format with commas and dollar sign
            input.value = '$' + number.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        };

        if (expectedOpening) {
            expectedOpening.addEventListener('input', () => this.updateReconciliation());
            expectedOpening.addEventListener('blur', () => formatCurrencyInput(expectedOpening));
            // Clear on page load
            // PRESERVE VALUES IF EXISTS
        }
        if (expectedEnding) {
            expectedEnding.addEventListener('input', () => this.updateReconciliation());
            expectedEnding.addEventListener('blur', () => formatCurrencyInput(expectedEnding));
            // PRESERVE VALUES IF EXISTS
        }
    },

    updateReconciliation() {
        const panel = document.getElementById('reconciliationPanel');
        if (!panel) {
            return;
        }

        // Parse currency inputs (remove $ and commas)
        const openingInput = document.getElementById('expectedOpeningBalance');
        const endingInput = document.getElementById('expectedEndingBalance');

        const expectedOpening = openingInput?.value ?
            parseFloat(openingInput.value.replace(/[$,]/g, '')) : null;
        const expectedEnding = endingInput?.value ?
            parseFloat(endingInput.value.replace(/[$,]/g, '')) : null;

        // DEBUG: Log transaction count
        console.log('🔍 updateReconciliation called. Transaction count:', this.transactions?.length || 0);
        if (this.transactions && this.transactions.length > 0) {
            console.log('📊 Sample transaction:', this.transactions[0]);
        }

        if (typeof ReconciliationManager !== 'undefined') {
            const reconciliation = ReconciliationManager.getReconciliationData(
                this.transactions || [],
                expectedOpening,
                expectedEnding
            );

            // DEBUG: Log reconciliation data
            console.log('💰 Reconciliation data:', {
                totalCredits: reconciliation.totalCredits,
                totalDebits: reconciliation.totalDebits,
                calculatedEnding: reconciliation.calculated.endingBalance
            });

            // Update calculated values

            const calcOpening = document.getElementById('calculatedOpeningBalance');
            const calcEnding = document.getElementById('calculatedEndingBalance');

            if (calcOpening) {
                calcOpening.textContent = ReconciliationManager.formatCurrency(reconciliation.calculated.openingBalance);
            }
            if (calcEnding) {
                calcEnding.textContent = ReconciliationManager.formatCurrency(reconciliation.calculated.endingBalance);
            }

            // Update transaction totals
            const totalCreditsEl = document.getElementById('totalCredits');
            const totalDebitsEl = document.getElementById('totalDebits');

            if (totalCreditsEl) {
                totalCreditsEl.textContent = ReconciliationManager.formatCurrency(reconciliation.totalCredits);
            }
            if (totalDebitsEl) {
                totalDebitsEl.textContent = ReconciliationManager.formatCurrency(reconciliation.totalDebits);
            }

            // Update discrepancies
            const openingDiscEl = document.getElementById('openingDiscrepancy');
            const endingDiscEl = document.getElementById('endingDiscrepancy');

            if (openingDiscEl && reconciliation.opening) {
                openingDiscEl.textContent = ReconciliationManager.formatCurrency(reconciliation.opening.discrepancy);
                openingDiscEl.className = 'discrepancy-value ' + (reconciliation.opening.isBalanced ? 'balanced' : 'error');
            }

            if (endingDiscEl && reconciliation.ending) {
                endingDiscEl.textContent = ReconciliationManager.formatCurrency(reconciliation.ending.discrepancy);
                endingDiscEl.className = 'discrepancy-value ' + (reconciliation.ending.isBalanced ? 'balanced' : 'error');
            }

            // Update status
            const statusIcon = document.querySelector('#statusIndicator .status-icon');
            const statusText = document.querySelector('#statusIndicator .status-text');

            if (statusIcon && statusText && reconciliation.opening && reconciliation.ending) {
                if (reconciliation.opening.isBalanced && reconciliation.ending.isBalanced) {
                    statusIcon.textContent = '✅';
                    statusText.textContent = 'Reconciled Successfully';
                    statusText.style.color = 'var(--success-color)';
                } else {
                    statusIcon.textContent = '❌';
                    statusText.textContent = 'Discrepancy Found';
                    statusText.style.color = 'var(--error-color)';
                }
            }
        }
    },

    // ⚡ UPDATE TRANSACTION (called from Drill Down Grid or other editors)
    updateTransaction(updatedTx) {
        if (!updatedTx || !updatedTx.id) return;

        console.log(`📝 App.updateTransaction: Updating ${updatedTx.id}`);

        // 1. Update Internal Array
        const index = this.transactions.findIndex(t => t.id === updatedTx.id);
        if (index !== -1) {
            this.transactions[index] = updatedTx;
        }

        // 2. Persist to Storage
        Storage.saveTransactions(this.transactions);

        // 3. Update Main Grid UI
        if (window.TransactionGrid && window.TransactionGrid.gridApi) {
            // refreshRow logic usually preferred
            TransactionGrid.updateTransaction(updatedTx);
        }

        // 4. Update Stats
        this.updateStatistics();
        this.updateReconciliation();
    },

    // ⚡ UPDATE TRANSACTION (called from Drill Down Grid or other editors)
    updateTransaction(updatedTx) {
        if (!updatedTx || !updatedTx.id) return;

        console.log(`📝 App.updateTransaction: Updating ${updatedTx.id}`);

        // 1. Update Internal Array
        const index = this.transactions.findIndex(t => t.id === updatedTx.id);
        if (index !== -1) {
            this.transactions[index] = updatedTx;
        }

        // 2. Persist to Storage
        Storage.saveTransactions(this.transactions);

        // 3. Update Main Grid UI
        if (window.TransactionGrid && window.TransactionGrid.gridApi) {
            TransactionGrid.updateTransaction(updatedTx);
        }

        // 4. Update Stats
        this.updateStatistics();
        this.updateReconciliation();
    },

    updateStatistics() {
        const stats = AccountAllocator.getStats(this.transactions);
        const reviewStats = document.getElementById('reviewStats');

        if (reviewStats) {
            // Simplified view when empty
            if (!stats.total || stats.total === 0) {
                reviewStats.innerHTML = '<span style="color:var(--text-secondary); opacity:0.7;">Ready to import CSV...</span>';
                return;
            }

            // Active view
            reviewStats.innerHTML = `
                <span class="stat-item"><strong>${stats.total}</strong> txns</span> | 
                <span class="stat-item" style="color:${stats.unallocated === 0 ? 'var(--success-color)' : 'var(--warning-color)'}">
                    ${stats.allocated} allocated
                </span> | 
                <span class="stat-item">${stats.accountsUsed} accounts</span>
            `;
        }

        this.updateTrialBalance();
    },

    updateTrialBalance() {
        // Trial balance summary - optional UI element
        const summaryElement = document.getElementById('trialBalanceSummary');
        if (!summaryElement) return;

        const summary = AccountAllocator.generateSummary(this.transactions);
        const summaryHtml = [];

        summaryHtml.push('<div class="balance-row">');
        summaryHtml.push('<strong>Account</strong>');
        summaryHtml.push('<strong>Debits</strong>');
        summaryHtml.push('<strong>Credits</strong>');
        summaryHtml.push('<strong>Balance</strong>');
        summaryHtml.push('</div>');

        const topAccounts = summary.slice(0, 10);
        for (const entry of topAccounts) {
            summaryHtml.push('<div class="balance-row">');
            summaryHtml.push(`<span>${entry.code} - ${entry.name}</span>`);
            summaryHtml.push(`<span>${Utils.formatCurrency(entry.debits)}</span>`);
            summaryHtml.push(`<span>${Utils.formatCurrency(entry.credits)}</span>`);
            summaryHtml.push(`<span>${Utils.formatCurrency(entry.debits - entry.credits)}</span>`);
            summaryHtml.push('</div>');
        }

        summaryElement.innerHTML = summaryHtml.join('');
    },

    // 🔄 LIVE UPDATE LOGIC
    // Called by VendorMatcher when a vendor is optimized/updated
    updateTransactionsForVendor(vendor) {
        if (!vendor || !this.transactions) return;

        console.log(`🔄 App: Syncing transactions for vendor: ${vendor.name}`);
        const normalizedVendorName = Utils.normalizeString(vendor.name);
        const relevantPatterns = vendor.patterns || [];

        let updateCount = 0;

        this.transactions.forEach(tx => {
            let isMatch = false;

            // 1. Direct ID match (if we linked them)
            if (tx.vendorId === vendor.id) {
                isMatch = true;
            }
            // 2. Name / Pattern Match
            else {
                const normDesc = Utils.normalizeString(tx.description);
                // Check if description contains vendor name or matches patterns
                if (normDesc.includes(normalizedVendorName) ||
                    relevantPatterns.some(p => normDesc.includes(Utils.normalizeString(p)))) {
                    isMatch = true;
                }
            }

            if (isMatch) {
                // UPDATE THE TRANSACTION
                tx.vendor = vendor.name;
                tx.vendorId = vendor.id;

                // Only override if currently Unallocated or using generic/wrong account
                if (!tx.allocatedAccount || tx.allocatedAccount === '9970' || tx.allocatedAccount === '') {
                    tx.allocatedAccount = vendor.defaultAccount;
                    tx.allocatedAccountName = vendor.defaultAccountName;
                    tx.category = vendor.category;
                    tx.status = 'auto'; // ⚡ Set status to auto-matched

                    // Trigger Grid Refresh for this row
                    if (window.TransactionGrid) {
                        if (TransactionGrid.refreshRow) {
                            // 🚀 Pass full object so grid updates its internal data!
                            TransactionGrid.refreshRow(tx);
                        } else {
                            // Fallback if refreshRow missing
                            TransactionGrid.updateTransaction(tx);
                        }
                    }
                    updateCount++;
                }
            }
        });

        if (updateCount > 0) {
            console.log(`✅ Synced ${updateCount} transactions for ${vendor.name}`);
            this.updateStatistics(); // Refresh stats at top
        }
    },

    updateProcessing(message, progress) {
        const textEl = document.getElementById('processingText');
        const progressEl = document.getElementById('progressFill');

        if (textEl) textEl.textContent = message;
        if (progressEl) progressEl.style.width = progress + '%';
    },

    // 🔍 DRILL DOWN: Open modal with transactions for specific vendor
    openDrillDown(vendorName) {
        const modalId = 'VSMModal';
        const title = document.getElementById('drillDownModalTitle');

        // Check if modal exists directly or via ModalManager logic
        const modal = document.getElementById(modalId);
        if (!modal) return;

        console.log(`🔍 Opening Drill-Down for: ${vendorName}`);

        // 1. Filter Transactions
        const normalizedVendor = Utils.normalizeString(vendorName);
        const filtered = this.transactions.filter(t => {
            // Check normalized vendor name or payee
            const normPayee = Utils.normalizeString(t.payee || t.description);
            const normVendor = Utils.normalizeString(t.vendor || ''); // Check assigned vendor too

            return normPayee.includes(normalizedVendor) || normVendor === normalizedVendor;
        });

        // 2. Set Title
        if (title) title.textContent = `Transactions: ${vendorName} (${filtered.length})`;

        // 3. Load Grid (DrillDownGrid handles logic)
        if (window.DrillDownGrid) {
            DrillDownGrid.initialize('drillDownGridContainer');
            DrillDownGrid.loadTransactions(filtered);
        }

        // 4. Show Modal via Manager
        if (window.ModalManager) {
            ModalManager.open(modalId);
        } else {
            modal.style.display = 'block';
            modal.classList.add('active');
        }

        requestAnimationFrame(() => {
            // ⚡ Force Resize of DrillDownGrid after modal animation
            if (window.DrillDownGrid && DrillDownGrid.safelySizeColumnsToFit) {
                DrillDownGrid.safelySizeColumnsToFit();
            }
        });
    },

    showSection(sectionName) {
        console.log('📺 Switching to section:', sectionName);
        this.currentSection = sectionName;

        // Hide all sections
        document.querySelectorAll('.section').forEach(el => {
            el.classList.remove('active');
            el.style.display = 'none';
        });

        // Determine Target ID
        const targetId = sectionName + 'Section';
        const target = document.getElementById(targetId);

        if (target) {
            target.classList.add('active');
            target.style.display = 'block';
        }

        // Trigger Specific Loaders
        if (sectionName === 'review') {
            this.loadReviewSection();
        }

        if (sectionName === 'audit') {
            if (window.AuditManager) AuditManager.render();
        }

        if (sectionName === 'reconciliation') {
            // Load reconciliation data
            this.updateReconciliation();
            // Setup listeners if not already done (idempotent usually)
            this.setupReconciliationListeners();
        }
    },


    showAccountsModal() {
        const modal = document.getElementById('accountsModal');
        if (!modal) return;

        const container = document.getElementById('accountsGrid');
        const accounts = AccountAllocator.getAllAccounts();

        // Build simple grid
        const gridOptions = {
            columnDefs: [
                { headerName: 'Code', field: 'code', width: 100 },
                { headerName: 'Name', field: 'name', width: 250 },
                { headerName: 'Type', field: 'type', width: 150 },
                { headerName: 'Full Name', field: 'fullName', width: 350 }
            ],
            rowData: accounts,
            animateRows: true
        };

        if (typeof agGrid !== 'undefined') {
            new agGrid.Grid(container, gridOptions);
        }
        modal.style.display = 'flex';
    },

    hideAccountsModal() {
        const modal = document.getElementById('accountsModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },

    reset() {
        if (confirm('Start over with a new file? (Current data will be lost)')) {
            this.transactions = [];
            Storage.clearTransactions();
            this.showSection('upload');

            // Reset file input
            const fileInput = document.getElementById('fileInput');
            if (fileInput) {
                fileInput.value = '';
            }
        }
    },

    async rethinkTransactions() {
        console.log('🤔 AI Re-think: Starting batch optimization...');

        // Confirm with user
        const confirmed = confirm(
            `🪄 AI Re-think will re-categorize all ${this.transactions.length} transactions.\n\n` +
            `This will override any manual changes.\n\n` +
            `Continue?`
        );

        if (!confirmed) {
            console.log('❌ AI Re-think cancelled by user');
            return;
        }

        // Get account type from dropdown
        const accountTypeSelect = document.getElementById('accountTypeSelect');
        const accountType = accountTypeSelect ? accountTypeSelect.value : 'chequing';

        let categorized = 0;
        let allocated = 0;
        let learned = 0;

        // Process ALL transactions (no progress modal - just blaze through instantly!)
        for (const txn of this.transactions) {
            // Use both vendor and payee for matching
            const vendorName = txn.vendor || txn.payee || txn.description;
            if (!vendorName) {
                continue;
            }

            // Try to match existing vendor first
            let vendor = VendorMatcher.getVendor(vendorName);

            if (!vendor && typeof VendorAI !== 'undefined') {
                // Use AI to categorize and allocate
                const category = VendorAI.suggestCategory(vendorName);
                const suggestedAccount = VendorAI.suggestAccount(vendorName, category, accountType);

                if (category) {
                    txn.category = category;
                    categorized++;
                }

                if (suggestedAccount) {
                    txn.allocatedAccount = suggestedAccount.code;
                    txn.allocatedAccountName = suggestedAccount.name;
                    txn.status = 'matched';
                    allocated++;

                    // Auto-learn: Add to vendors array WITHOUT saving (batch save at end)
                    if (!VendorMatcher.vendors.find(v => v.name.toLowerCase() === vendorName.toLowerCase())) {
                        VendorMatcher.vendors.push(new Vendor({
                            name: vendorName,
                            defaultAccount: suggestedAccount.code,
                            defaultAccountName: suggestedAccount.name,
                            category: category || 'General',
                            notes: `AI-generated (${accountType})`,
                            patterns: [vendorName.toLowerCase()]
                        }));
                        learned++;
                    }
                }
            } else if (vendor) {
                // Apply existing vendor mapping
                txn.allocatedAccount = vendor.defaultAccount;
                txn.allocatedAccountName = vendor.defaultAccountName;
                txn.category = vendor.category;
                txn.status = 'matched';
                allocated++;
            } else {
                // No match found - mark as "To Be Sorted"
                txn.allocatedAccount = '9970';
                txn.allocatedAccountName = 'To Be Sorted';
                txn.status = 'unallocated';
            }

            processed++;

            // Only update progress every 50 transactions for performance
            if (processed % 50 === 0 || processed === this.transactions.length) {
                updateProgress();
            }
        }

        // Save all learned vendors ONCE at the end (not during loop!)
        if (learned > 0) {
            VendorMatcher.saveVendors();
            console.log(`💾 Saved ${learned} new vendors to dictionary`);
        }

        // Remove progress modal
        modal.remove();

        // Save updated transactions
        Storage.saveTransactions(this.transactions);

        // Refresh the grid ONCE at the end (not during loop)
        TransactionGrid.loadTransactions(this.transactions);

        // Update statistics
        this.updateStatistics();
        this.updateTrialBalance();
        this.updateReconciliation();

        // Show results
        if (allocated === 0) {
            alert(`✨ AI Re-think Complete!\n\n💡 No changes made\n\nAll ${unallocated.length} unallocated transactions were already optimally categorized or require manual review.`);
        } else {
            alert(`✨ AI Re-think Complete!\n\n✅ Categorized: ${categorized} vendors\n💰 Allocated: ${allocated} transactions\n📚 Learned: ${learned} new vendors\n\nAccount Type: ${accountType.toUpperCase()}\n\nNew vendors have been added to your dictionary for future use.`);
        }
    },

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },

    // Add Data: Append transactions from new CSV file
    async addData() {
        console.log('📥 Add Data: Opening file picker...');

        const fileInput = document.getElementById('fileInput');
        if (!fileInput) return;

        // Create a new file input to trigger selection
        const newInput = document.createElement('input');
        newInput.type = 'file';
        newInput.accept = '.csv';
        newInput.style.display = 'none';

        newInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                this.showSection('processing');
                this.updateProcessing('Parsing new transactions...', 30);

                // Parse the new CSV
                const result = await CSVParser.parseCSV(file);
                const newTransactions = result.transactions;

                console.log('📊 Adding', newTransactions.length, 'new transactions');
                this.updateProcessing('Merging transactions...', 60);

                // Merge with existing transactions
                const beforeCount = this.transactions.length;
                this.transactions = this.mergeTransactions(this.transactions, newTransactions);
                const addedCount = this.transactions.length - beforeCount;

                this.updateProcessing('Saving data...', 90);
                Storage.saveTransactions(this.transactions);

                await this.delay(500);

                // Reload the review section
                this.showSection('review');
                this.loadReviewSection();

                alert(`✅ Successfully added ${addedCount} new transactions!\n\nTotal transactions: ${this.transactions.length}`);
                console.log('✅ Add Data complete:', addedCount, 'added,', this.transactions.length, 'total');

            } catch (error) {
                console.error('❌ Error adding data:', error);
                alert('Error adding data: ' + error.message);
                this.showSection('review');
            } finally {
                document.body.removeChild(newInput);
            }
        });

        document.body.appendChild(newInput);
        newInput.click();
    },



    // Start Over: Clear all data and return to upload
    startOver() {
        const confirmMsg = 'Are you sure you want to start over?\n\nThis will clear ALL transactions and reset the application.\n\n⚠️ This action cannot be undone!';

        if (!confirm(confirmMsg)) {
            return;
        }

        console.log('🔄 Starting over - clearing all data');

        // Clear transactions
        this.transactions = [];
        Storage.clearTransactions();

        // Clear reconciliation inputs
        const openingInput = document.getElementById('expectedOpeningBalance');
        const endingInput = document.getElementById('expectedEndingBalance');
        if (openingInput) openingInput.value = '';
        if (endingInput) endingInput.value = '';

        // Reset file input
        const fileInput = document.getElementById('fileInput');
        if (fileInput) fileInput.value = '';

        // Return to upload section
        this.showSection('upload');

        console.log('✅ Application reset complete');
    },

    // Filter transactions by account type
    filterByAccountType(accountType) {
        if (!TransactionGrid.gridApi) return;

        if (!accountType || accountType === 'all') {
            // Clear filter
            TransactionGrid.gridApi.setFilterModel(null);
        } else {
            // Apply filter on 'Account Type' column
            const filterModel = {
                accountType: {
                    filterType: 'text',
                    type: 'equals',
                    filter: accountType
                }
            };
            TransactionGrid.gridApi.setFilterModel(filterModel);
        }
    },

    renderVersionExplorer() {
        const explorer = document.getElementById('versionExplorer');
        const list = document.getElementById('fileList'); // Changing target to fileList in file-explorer-container

        // User requested "right below this" (drag drop). The HTML has .file-explorer-container with #fileList there.
        // Let's use THAT instead of the old #versionExplorer div inside the stats bar.

        if (!list || !SessionManager) return;

        const history = SessionManager.getHistory();

        // Populate the list
        list.innerHTML = '';

        if (history.length === 0) {
            list.innerHTML = '<li class="empty-state">No recent files found.</li>';
            return;
        }

        history.forEach((session, index) => {
            const date = new Date(parseInt(session.timestamp));
            const timeStr = date.toLocaleString();

            const li = document.createElement('li');
            li.className = 'file-item';
            li.innerHTML = `
                <div class="file-info">
                    <span class="file-name">${session.filename}</span>
                    <span class="file-meta">${timeStr} • ${session.count || 0} txns</span>
                </div>
                <div class="file-actions">
                    <button class="action-btn edit-btn" title="Edit Filename">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="action-btn delete-btn" title="Remove from History">
                        <i class="fas fa-times"></i>
                    </button>
                    <button class="action-btn restore-btn" title="Load this file">
                        <i class="fas fa-upload"></i> Load
                    </button>
                </div>
            `;

            // DELETE Action
            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm(`Remove "${session.filename}" from recent history?`)) {
                    SessionManager.removeFromHistory(index);
                    this.renderVersionExplorer(); // Re-render
                }
            };

            // EDIT Action (Rename)
            const editBtn = li.querySelector('.edit-btn');
            editBtn.onclick = (e) => {
                e.stopPropagation();
                const newName = prompt("Rename file alias:", session.filename);
                if (newName && newName.trim() !== "") {
                    // Use new update method
                    SessionManager.updateHistoryItem(index, { filename: newName.trim() });
                    this.renderVersionExplorer();
                }
            };

            // RESTORE Action
            const restoreBtn = li.querySelector('.restore-btn');
            restoreBtn.onclick = () => {
                if (confirm(`Load "${session.filename}"? Current unsaved work will be lost.`)) {
                    SessionManager.restoreFromHistory(index);
                }
            };

            list.appendChild(li);
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM Content Loaded - Initializing App...');
    App.initialize();

    // Auto-Restore Session (Immediate Load)
    if (SessionManager && SessionManager.autoRestore) {
        SessionManager.autoRestore();
        App.renderVersionExplorer(); // Just in case we stay on upload
    }
}, 100);

// Initial Audit Log
if (window.AuditManager && !localStorage.getItem('audit_log')) {
    AuditManager.log('System', 'First Run', 'Application loaded for the first time');
}

// Setup settings tab switching
const settingsTabs = document.querySelectorAll('.settings-tab');
const settingsPanels = document.querySelectorAll('.settings-panel');

settingsTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const targetPanel = tab.dataset.tab;

        // Remove active from all tabs and panels
        settingsTabs.forEach(t => t.classList.remove('active'));
        settingsPanels.forEach(p => p.classList.remove('active'));

        // Add active to clicked tab and corresponding panel
        tab.classList.add('active');
        const panel = document.querySelector(`[data-panel="${targetPanel}"]`);
        if (panel) {
            panel.classList.add('active');
        }
    });
});

// Dashboard Launch Button from Header
const dashboardBtn = document.getElementById('openDashboardBtn');
if (dashboardBtn) {
    dashboardBtn.addEventListener('click', () => {
        if (window.DashboardManager) {
            DashboardManager.openDashboard();
        } else {
            console.error('DashboardManager not loaded');
            alert('Dashboard module not loaded. Please refresh.');
        }
    });
}

// Settings Button from Header/Sidebar
const settingsBtn = document.getElementById('settingsBtn');
if (settingsBtn) {
    settingsBtn.addEventListener('click', () => {
        App.showSection('settings');
    });
}

// Reconciliation Button
const reconBtn = document.getElementById('navReconciliation');
if (reconBtn) {
    reconBtn.addEventListener('click', () => {
        App.showSection('reconciliation');
    });
}

// Edit Account Button (Toolbar)
const editAcctBtn = document.getElementById('editAccountBtn');
if (editAcctBtn) {
    editAcctBtn.addEventListener('click', () => {
        console.log('✏️ Edit Account Clicked');
        // Open Account Manager Modal
        App.showAccountsModal();
    });
}

// Link to Grid Button
const linkGridBtn = document.getElementById('assignGridToAccountBtn');
if (linkGridBtn) {
    linkGridBtn.addEventListener('click', () => {
        console.log('🔗 Link to Grid Clicked');
        // Logic: Assign all displayed transactions to the currently selected bank account
        const accountSelect = document.getElementById('bankAccountSelect');
        if (accountSelect && accountSelect.value) {
            const accountCode = accountSelect.value;
            if (confirm(`Assign ALL current transactions to account ${accountCode}?`)) {
                // We need a method in TransactionGrid or App to do this bulk update
                // Assuming TransactionGrid.bulkAssignAccount exists or we create it.
                // For now, simpler implementation:
                App.transactions.forEach(t => {
                    // Only update if unallocated or filtered view? 
                    // User request implies "transactions displayed in grid" -> "Link to Grid"
                    // Ideally we'd use the grid's filtered rows.
                    // For MVP: Update ALL in memory match.
                    t.allocatedAccount = accountCode;
                    // Ideally find name too
                });
                Storage.saveTransactions(App.transactions);
                TransactionGrid.loadTransactions(App.transactions); // Refresh
                App.updateStatistics();
                alert('Assignments updated.');
            }
        } else {
            alert('Please select an account first.');
        }
    });
}

// Start Over Button Logic
const startOverBtn = document.getElementById('startOverBtn');
console.log('🔍 Debug: Searching for startOverBtn...', startOverBtn);

if (startOverBtn) {
    // Remove old listeners by replacing the element
    const newBtn = startOverBtn.cloneNode(true);
    startOverBtn.parentNode.replaceChild(newBtn, startOverBtn);

    // Update reference
    const btn = newBtn;

    let resetTimeout;
    btn.addEventListener('click', (e) => {
        console.log('🖱️ Start Over Clicked!');

        // Check if already in confirmation state
        if (btn.classList.contains('confirm-state')) {
            // CONFIRMED Action
            console.log('✅ Reset confirmed. Clearing transactions only...');
            btn.innerHTML = '♻️ Resetting...';

            // ONLY Clear Transactions and Session Data (Preserve VENDORS)
            localStorage.removeItem('autobookkeeping_transactions');
            localStorage.removeItem('lastTransactions');
            localStorage.removeItem('lastFileName');
            localStorage.removeItem('lastFileTime');

            // Keep 'autobookkeeping_vendors', 'autobookkeeping_accounts', and 'autobookkeeping_settings'

            setTimeout(() => {
                window.location.reload();
            }, 500);
        } else {
            // First Click: Ask for confirmation
            const originalText = btn.innerHTML;
            btn.innerHTML = '⚠️ Click to Confirm';
            btn.classList.add('confirm-state');
            btn.style.backgroundColor = '#ef4444'; // Force red for visibility
            btn.style.color = 'white';
            btn.style.borderColor = '#dc2626';

            // Reset after 3 seconds if not confirmed
            resetTimeout = setTimeout(() => {
                btn.innerHTML = originalText;
                btn.classList.remove('confirm-state');
                btn.style.backgroundColor = '';
                btn.style.color = '';
                btn.style.borderColor = '';
            }, 3000);
        }
    });
}


// Wire up Pop-out button (added dynamically)
const popoutBtn = document.getElementById('popoutBtn');
if (popoutBtn) {
    popoutBtn.addEventListener('click', () => {
        if (window.GridPopout) {
            window.GridPopout.openPopout();
        } else {
            console.error('GridPopout module not loaded');
            alert('Grid Pop-out module not loaded. Please refresh the page.');
        }
    });
}

// Setup theme dropdown with live preview
const themeSelect = document.getElementById('themeSelect');
const themePreview = document.getElementById('themePreview');

const themePreviews = {
    'cyber-night': 'linear-gradient(135deg, #0a0e1a 0%, #00d4ff 100%)',
    'arctic-dawn': 'linear-gradient(135deg, #f0f4f8 0%, #0077cc 100%)',
    'neon-forest': 'linear-gradient(135deg, #0d1f12 0%, #00ff88 100%)',
    'royal-amethyst': 'linear-gradient(135deg, #1a0d2e 0%, #b565d8 100%)',
    'sunset-horizon': 'linear-gradient(135deg, #2d1810 0%, #ff6b35 100%)'
};

function updateThemePreview(theme) {
    if (themePreview && themePreviews[theme]) {
        themePreview.style.background = themePreviews[theme];
    }
}

if (themeSelect && typeof Settings !== 'undefined') {
    // Set initial preview
    updateThemePreview(Settings.current.theme || 'cyber-night');
    themeSelect.value = Settings.current.theme || 'cyber-night';

    // Handle theme changes
    themeSelect.addEventListener('change', (e) => {
        const theme = e.target.value;
        Settings.setTheme(theme);
        updateThemePreview(theme);
    });
}

// Settings Logic - Handled by settings-manager.js
// Legacy code removed to prevent conflicts

// Reports button (placeholder)
const reportsBtn = document.getElementById('reportsBtn');
if (reportsBtn) {
    reportsBtn.addEventListener('click', () => {
        alert('📊 Reports feature coming soon!\n\nWill include:\n- Income Statement\n- Balance Sheet\n- Trial Balance\n- Custom Reports');
    });
}

// Settings Data tab buttons
const settingsVendorDictBtn = document.getElementById('settingsVendorDictBtn');
const settingsAccountsBtn = document.getElementById('settingsAccountsBtn'); // Fixed ID
const settingsBankAccountsBtn = document.getElementById('settingsBankAccountsBtn'); // Added correct var

if (settingsVendorDictBtn) {
    settingsVendorDictBtn.addEventListener('click', async () => {
        console.log('📚 Opening Vendor Dictionary from Settings...');
        if (typeof VendorManager !== 'undefined') {
            // Initialize Logic Engines
            if (typeof VendorMatcher !== 'undefined') {
                await VendorMatcher.initialize();
            }

            // Initialize UI Managers and show modal
            if (typeof VendorManager.showModal === 'function') {
                VendorManager.showModal();
            } else if (typeof VendorManager.initialize === 'function') {
                // Fallback if showModal is not directly available, but initialize is
                VendorManager.initialize();
                // If initialize doesn't show it, we might need to manually show it,
                // but the instruction implies showModal handles it.
                // For now, assume initialize might implicitly show it or we're missing a step.
                // If showModal is the new standard, this fallback might be removed later.
                console.warn('VendorManager.showModal() not found, falling back to initialize().');
            } else {
                console.warn('⚠️ VendorManager not found or missing showModal()/initialize()');
            }
        } else {
            console.error('VendorManager not found');
        }
    });
}

// Settings: Chart of Accounts
if (settingsAccountsBtn) {
    settingsAccountsBtn.addEventListener('click', () => {
        console.log('📊 Opening Chart of Accounts...');
        // Try to use the grid's sidebar if available (User preference "Grid")
        if (typeof TransactionGrid !== 'undefined' && TransactionGrid.gridApi) {
            // Open AG Grid Tool Panel if possible as a quick "Grid" view
            // But also offer the full list if that fails
            // TransactionGrid.gridApi.openToolPanel('columns'); // This might be what they meant?
        }

        if (window.ChartManager) {
            ChartManager.showModal();
        } else {
            console.error('ChartManager not found');
        }
    });
}

// Settings: Manage Bank Accounts
if (settingsBankAccountsBtn) {
    settingsBankAccountsBtn.addEventListener('click', () => {
        console.log('🏦 Opening Bank Accounts from Settings...');
        if (typeof BankAccountManager !== 'undefined') {
            BankAccountManager.renderAccountsList();
            if (window.ModalManager) {
                ModalManager.open('manageAccountsModal');
            } else {
                document.getElementById('manageAccountsModal').style.display = 'block';
            }
        }
    });
}

// Edit Account Button (in Review Toolbar) -> Opens Manage Accounts Modal
const editAccountBtn = document.getElementById('editAccountBtn');
if (editAccountBtn) {
    editAccountBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (typeof BankAccountManager !== 'undefined') {
            BankAccountManager.renderAccountsList();
            if (window.ModalManager) {
                ModalManager.open('manageAccountsModal');
            }
        }
    });
}

// Company Name Input
const companyNameInput = document.getElementById('companyNameInput');
if (companyNameInput && typeof Settings !== 'undefined') {
    // Set initial value from settings
    companyNameInput.value = Settings.current.companyName || '';

    // Save on change
    companyNameInput.addEventListener('blur', () => {
        Settings.current.companyName = companyNameInput.value;
        Storage.saveSettings(Settings.current);
        console.log('💾 Company name saved:', companyNameInput.value);
    });
}

// Year End Date Input
const yearEndDateInput = document.getElementById('yearEndDate');
if (yearEndDateInput) {
    // Set initial value from localStorage
    const savedYearEnd = localStorage.getItem('yearEndDate');
    if (savedYearEnd) {
        yearEndDateInput.value = savedYearEnd.split('T')[0];
    }

    // Save on change
    yearEndDateInput.addEventListener('change', () => {
        localStorage.setItem('yearEndDate', yearEndDateInput.value);
        console.log('💾 Year-end date saved:', yearEndDateInput.value);
    });
}

// Duplicate listener removed (Fix for COA opening Bank Accounts)

// Close Manage Accounts Modal - HANDLED BY MODALMANAGER now
// Legacy logic removed to prevent conflicts


// Initialize the main application - Duplicate call removed
/*
if (typeof App !== 'undefined' && App.initialize) {
    App.initialize();
}
*/


console.log('✅ App.js loaded and event listeners set up');


// Initialize App on Load
document.addEventListener('DOMContentLoaded', () => {
    if (typeof App !== 'undefined' && App.initialize) {
        App.initialize();
    }
});
