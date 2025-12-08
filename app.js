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

            // Save session for Continue/Start Over
            if (typeof SessionManager !== 'undefined') {
                SessionManager.saveSession(file.name, this.transactions);
            }

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
            expectedOpening.value = '';
        }
        if (expectedEnding) {
            expectedEnding.addEventListener('input', () => this.updateReconciliation());
            expectedEnding.addEventListener('blur', () => formatCurrencyInput(expectedEnding));
            // Clear on page load
            expectedEnding.value = '';
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

        // Confirm with user that this will override ALL categorizations
        const confirmed = confirm(
            `⚠️ AI Re-think will re-analyze ALL ${this.transactions.length} transactions.\n\n` +
            `This will OVERRIDE any manual categorizations you've made.\n\n` +
            `This is useful for:\n` +
            `• Fixing bulk categorization errors\n` +
            `• Resetting incorrect manual assignments\n` +
            `• Getting fresh AI suggestions\n\n` +
            `Continue?`
        );

        if (!confirmed) {
            console.log('❌ AI Re-think cancelled by user');
            return;
        }

        // Simple loading flash (no progress tracking)
        const loadingFlash = document.createElement('div');
        loadingFlash.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 9999;
            display: flex; align-items: center; justify-content: center;
        `;
        loadingFlash.innerHTML = `
            <div style="text-align: center; font-size: 64px;">🪄✨</div>
        `;
        document.body.appendChild(loadingFlash);

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

    // Merge transactions and remove duplicates
    mergeTransactions(existing, newTxns) {
        const merged = [...existing];
        let duplicates = 0;

        for (const newTx of newTxns) {
            // Check if duplicate exists
            const isDuplicate = existing.some(existingTx =>
                existingTx.date === newTx.date &&
                existingTx.amount === newTx.amount &&
                existingTx.description === newTx.description
            );

            if (!isDuplicate) {
                merged.push(newTx);
            } else {
                duplicates++;
            }
        }

        console.log('🔍 Duplicates skipped:', duplicates);
        return merged;
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

    if (settingsAccountsBtn) {
        settingsAccountsBtn.addEventListener('click', () => {
            App.showAccountsModal();
        });
    }

    console.log('✅ App.js loaded and event listeners set up');
});
