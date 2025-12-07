// Main Application Controller
// Rebuilt from scratch - 2025-12-06

const App = {
    currentSection: 'upload',
    transactions: [],

    async initialize() {
        console.log('🚀 Initializing AutoBookkeeping v1.03...');

        try {
            // Initialize modules
            AccountAllocator.initialize();
            VendorMatcher.initialize();

            // Initialize UI components  
            TransactionGrid.initialize('transactionGrid');
            VendorManager.initialize();

            // Initialize Settings
            if (typeof Settings !== 'undefined') {
                Settings.initialize();
            }

            // Set up event listeners
            this.setupEventListeners();

            // Show upload section
            this.showSection('upload');

            console.log('✅ Application initialized successfully');
        } catch (error) {
            console.error('❌ INITIALIZATION ERROR:', error);
            alert('Application failed to initialize: ' + error.message);
        }
    },

    setupEventListeners() {
        // File upload handling
        const uploadZone = document.getElementById('uploadZone');
        const fileInput = document.getElementById('fileInput');

        if (uploadZone && fileInput) {
            uploadZone.addEventListener('click', () => {
                fileInput.click();
            });

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

            fileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }

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

        // Export button
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                if (typeof ExcelExporter !== 'undefined') {
                    ExcelExporter.exportGeneralLedger(this.transactions);
                }
            });
        }

        // AI Re-think button
        const rethinkBtn = document.getElementById('rethinkTransactionsBtn');
        if (rethinkBtn) {
            rethinkBtn.addEventListener('click', () => {
                this.rethinkTransactions();
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

        // Reset button  
        const resetBtn = document.getElementById('resetBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.reset();
            });
        }

        // Logo click - return to home
        const logoHome = document.getElementById('logoHome');
        if (logoHome) {
            logoHome.addEventListener('click', () => {
                this.reset();
            });
        }

        // Accounts modal
        const closeAccountsModal = document.getElementById('closeAccountsModal');
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
    },

    async handleFile(file) {
        console.log('📄 Processing file:', file.name);

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

            // Parse CSV
            const transactions = await CSVParser.parseFile(file);
            console.log(`✅ Parsed ${transactions.length} transactions`);

            this.updateProcessing(`Found ${transactions.length} transactions. Matching vendors...`, 50);

            // Match vendors
            await this.delay(500);
            const matchResult = VendorMatcher.matchTransactions(transactions);

            this.updateProcessing('Allocating accounts...', 70);

            // Allocate accounts
            await this.delay(500);
            AccountAllocator.allocateTransactions(matchResult.transactions);

            this.updateProcessing('Preparing review...', 90);

            // Store transactions
            this.transactions = matchResult.transactions;
            Storage.saveTransactions(this.transactions);

            await this.delay(500);

            // Show review section
            this.showSection('review');
            this.loadReviewSection();

            console.log('✅ File processing complete!');

        } catch (error) {
            console.error('❌ FILE PROCESSING ERROR:', error);
            alert('Error processing file: ' + error.message);
            this.showSection('upload');
        }
    },

    loadReviewSection() {
        // Load transactions into grid
        TransactionGrid.loadTransactions(this.transactions);

        // Update statistics
        this.updateStatistics();

        // Show and update reconciliation
        this.updateReconciliation();

        // Setup reconciliation input listeners
        this.setupReconciliationListeners();
    },

    setupReconciliationListeners() {
        const expectedOpening = document.getElementById('expectedOpeningBalance');
        const expectedEnding = document.getElementById('expectedEndingBalance');

        if (expectedOpening) {
            expectedOpening.addEventListener('input', () => this.updateReconciliation());
        }
        if (expectedEnding) {
            expectedEnding.addEventListener('input', () => this.updateReconciliation());
        }
    },

    updateReconciliation() {
        const panel = document.getElementById('reconciliationPanel');
        if (!panel || this.transactions.length === 0) {
            if (panel) panel.style.display = 'none';
            return;
        }

        panel.style.display = 'block';

        const expectedOpening = parseFloat(document.getElementById('expectedOpeningBalance')?.value) || null;
        const expectedEnding = parseFloat(document.getElementById('expectedEndingBalance')?.value) || null;

        if (typeof ReconciliationManager !== 'undefined') {
            const reconciliation = ReconciliationManager.getReconciliationData(
                this.transactions,
                expectedOpening,
                expectedEnding
            );

            // Update calculated values
            const calcOpening = document.getElementById('calculatedOpeningBalance');
            const calcEnding = document.getElementById('calculatedEndingBalance');

            if (calcOpening) {
                calcOpening.textContent = ReconciliationManager.formatCurrency(reconciliation.calculated.openingBalance);
            }
            if (calcEnding) {
                calcEnding.textContent = ReconciliationManager.formatCurrency(reconciliation.calculated.endingBalance);
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

    updateStatistics() {
        const stats = AccountAllocator.getStats(this.transactions);

        const reviewStats = document.getElementById('reviewStats');
        if (reviewStats) {
            reviewStats.innerHTML = `
                ${stats.total} transactions | 
                ${stats.allocated} allocated (${stats.allocationRate}%) | 
                ${stats.unallocated} unallocated | 
                ${stats.accountsUsed} accounts used
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

    updateProcessing(message, progress) {
        const textEl = document.getElementById('processingText');
        const progressEl = document.getElementById('progressFill');

        if (textEl) textEl.textContent = message;
        if (progressEl) progressEl.style.width = progress + '%';
    },

    showSection(sectionName) {
        // Remove active class from all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Add active class to requested section
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
        }

        this.currentSection = sectionName;
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

        const unallocated = this.transactions.filter(t => !t.allocatedAccount || t.allocatedAccount === 'UNALLOCATED' || t.allocatedAccount === '9970');

        if (unallocated.length === 0) {
            alert('✅ All transactions are already allocated!');
            return;
        }

        // Create progress modal
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.id = 'aiProgressModal';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 500px; text-align: center;">
                <div class="modal-body">
                    <div class="ai-progress-animation" style="font-size: 64px; margin: 2rem 0; animation: magicWand 1.5s ease-in-out infinite;">
                        🪄✨
                    </div>
                    <h2 style="margin-bottom: 1rem;">AI Re-think in Progress</h2>
                    <p id="aiProgressText" style="color: var(--text-secondary); margin-bottom: 1rem;">
                        Processing <span id="aiCurrentCount">0</span> of <span id="aiTotalCount">${unallocated.length}</span> transactions...
                    </p>
                    <div class="progress-bar" style="width: 100%; max-width: 400px; margin: 0 auto;">
                        <div id="aiProgressFill" class="progress-fill" style="width: 0%;"></div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add animation style if not exists
        if (!document.getElementById('aiAnimationStyle')) {
            const style = document.createElement('style');
            style.id = 'aiAnimationStyle';
            style.textContent = `
                @keyframes magicWand {
                    0%, 100% { transform: rotate(-15deg) scale(1); }
                    50% { transform: rotate(15deg) scale(1.1); }
                }
            `;
            document.head.appendChild(style);
        }

        // Get account type from dropdown
        const accountTypeSelect = document.getElementById('accountTypeSelect');
        const accountType = accountTypeSelect ? accountTypeSelect.value : 'chequing';

        let categorized = 0;
        let allocated = 0;
        let learned = 0;
        let processed = 0;

        const updateProgress = () => {
            const progressText = document.getElementById('aiCurrentCount');
            const progressFill = document.getElementById('aiProgressFill');
            if (progressText) progressText.textContent = processed;
            if (progressFill) progressFill.style.width = ((processed / unallocated.length) * 100) + '%';
        };

        for (const txn of unallocated) {
            // Use both vendor and payee for matching
            const vendorName = txn.vendor || txn.payee || txn.description;
            if (!vendorName) {
                processed++;
                updateProgress();
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

                    // Auto-learn: Add to vendor dictionary
                    VendorMatcher.addVendor({
                        name: vendorName,
                        defaultAccount: suggestedAccount.code,
                        defaultAccountName: suggestedAccount.name,
                        category: category || 'General',
                        notes: `AI-generated (${accountType})`,
                        patterns: [vendorName.toLowerCase()]
                    });
                    learned++;
                }
            } else if (vendor) {
                // Apply existing vendor mapping
                txn.allocatedAccount = vendor.defaultAccount;
                txn.allocatedAccountName = vendor.defaultAccountName;
                txn.category = vendor.category;
                txn.status = 'matched';
                allocated++;
            }

            processed++;
            updateProgress();

            // Small delay to make progress visible
            if (processed % 5 === 0) {
                await this.delay(10);
            }
        }

        // Remove progress modal
        modal.remove();

        // Save updated transactions
        Storage.saveTransactions(this.transactions);

        // Refresh the grid
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
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📋 DOM Content Loaded - Initializing App...');
    App.initialize();

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

    // Reports button (placeholder)
    const reportsBtn = document.getElementById('reportsBtn');
    if (reportsBtn) {
        reportsBtn.addEventListener('click', () => {
            alert('📊 Reports feature coming soon!\n\nWill include:\n- Income Statement\n- Balance Sheet\n- Trial Balance\n- Custom Reports');
        });
    }

    // Settings Data tab buttons
    const settingsVendorDictBtn = document.getElementById('settingsVendorDictBtn');
    const settingsAccountsBtn = document.getElementById('settingsAccountsBtn');

    if (settingsVendorDictBtn) {
        settingsVendorDictBtn.addEventListener('click', () => {
            if (typeof VendorManager !== 'undefined') {
                VendorManager.showModal();
            }
        });
    }

    if (settingsAccountsBtn) {
        settingsAccountsBtn.addEventListener('click', () => {
            App.showAccountsModal();
        });
    }

    console.log('✅ App.js loaded and event listeners set up');
});
