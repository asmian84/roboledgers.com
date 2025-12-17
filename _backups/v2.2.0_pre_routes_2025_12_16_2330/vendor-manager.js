// Vendor Manager UI Controller with Bulk Indexing

// Vendor Manager UI Controller with Bulk Indexing

console.log('🔄 Loading VendorManager (New Version)...');
window.VendorManager = {
    modal: null,
    bulkIndexActive: false,

    initialize() {
        this.modal = document.getElementById('VDMModal');
        if (!this.modal) {
            console.warn('VendorManager: VDMModal element not found, skipping initialization');
            return;
        }

        // Initialize vendor grid
        if (window.VendorSummaryGrid) {
            VendorSummaryGrid.initialize('vendorGrid');
        }

        // REPLACEMENT: Helper to load stats per account
        this.loadVendorStats = () => {
            if (!window.App || !App.transactions) return;

            const accountId = App.currentAccountId;
            const txs = App.transactions;
            const vendorMap = new Map();

            // 1. Aggregate
            txs.forEach(tx => {
                if (accountId && accountId !== 'all' && tx.accountId !== accountId) return;

                const vName = tx.vendor || VendorNameUtils.extractVendorName(tx.description) || 'Unknown';
                if (!vendorMap.has(vName)) {
                    vendorMap.set(vName, {
                        name: vName,
                        count: 0,
                        totalAmount: 0,
                        currentAccount: null,
                        accountMap: new Map() // Track frequency of accounts
                    });
                }
                const stats = vendorMap.get(vName);
                stats.count++;

                // Fix Amount: Use signed amount or debit-credit
                // If amount is string "$100.00", parseFloat handles it. 
                // If amount is missing, try debits/credits
                let val = 0;
                if (tx.amount !== undefined && tx.amount !== null) {
                    val = parseFloat(String(tx.amount).replace(/[^0-9.-]/g, ''));
                } else {
                    val = (parseFloat(tx.debits || 0) - parseFloat(tx.credits || 0));
                }
                if (isNaN(val)) val = 0;

                stats.totalAmount += val;

                // Fix Account: Track usage to find "Allocated Account"
                // Check 'allocatedAccount' field (or 'categoryId'/'accountId' depending on model)
                const acct = tx.allocatedAccount || tx.account || '';
                if (acct && acct !== '9970' && acct !== 'Uncategorized') {
                    stats.accountMap.set(acct, (stats.accountMap.get(acct) || 0) + 1);
                }
            });

            // 2. Finalize (Pick Dominant Account)
            vendorMap.forEach(v => {
                // Format Amount
                // v.totalAmount is raw number. Grid formatter will handle display.

                // Determine Dominant Account
                let bestAcct = null;
                let maxCount = -1;
                v.accountMap.forEach((count, acct) => {
                    if (count > maxCount) {
                        maxCount = count;
                        bestAcct = acct;
                    }
                });
                // If no allocated account found in grid, check Dictionary?
                if (!bestAcct && window.VendorMatcher) {
                    const rule = VendorMatcher.getVendorByName(v.name);
                    if (rule) bestAcct = rule.defaultAccount;
                }
                v.currentAccount = bestAcct;
            });

            // 2. Merge with Dictionary Logic
            // The user might want to see ALL vendors from dictionary, even if 0 count in this account?
            // "Vendors in Grid" implies vendors present in current view.
            // Vendor Dict usually implies ALL known vendors.
            // Let's assume VDM should show ALL vendors, but update counts for current account?
            // OR VIG shows only vendors in grid.
            // The user asked "Link to grid is still not working".
            // If they are in VIG (Vendor Summary), they expect to see vendors IN THE GRID.
            // So we should use the map.values().

            // BUT, Vendor Dictionary (VDM) is typically "All Vendors".
            // Let's separate VIG vs VDM loading?
            // Actually, VIG and VDM share the same modal logic in this app structure based on previous edits.
            // "Vendors in Grid" button opens "VIGModal".
            // "Vendor Dictionary" button opens "VDMModal" (wait, they are different modals in HTML? Yes.)

            // Checking VendorManager.showModal - it opens VDMModal.
            // App.js opens VIGModal for "Vendors in Grid".

            // IF this is VDM (Dictionary), it should show ALL.
            // IF this is VIG (Summary), it should show only current account.

            // Logic split:
            // VendorDict: Load from VendorMatcher.getAllVendors().
            // VIG: Load from aggregation.

            // This function `loadVendorStats` is for VIG mode.
            // VendorManager controls VDM.
            // App.js controls VIG.

            // So where should I put this? 
            // VendorManager seems disconnected from VIG logic in App.js?
            // app.js listener for `vendorSummaryBtn` calls `VendorGrid.initialize` (which is shimmed to SummaryGrid).
            // But it DOESN'T call load data.

            // I need to add this aggregation logic to wherever VIG is loaded.
            // In app.js?

            return Array.from(vendorMap.values());
        };

        // Wire up NEW Search Bar
        const searchInput = document.getElementById('vendorSearch');
        const bindSearch = () => {
            if (searchInput && VendorSummaryGrid.gridApi) {
                searchInput.addEventListener('input', (e) => {
                    VendorSummaryGrid.gridApi.setGridOption('quickFilterText', e.target.value);
                });
            } else if (searchInput) {
                setTimeout(bindSearch, 500);
            }
        };
        bindSearch();

        // Set up event listeners with null checks
        const dictBtn = document.getElementById('dictBtn');
        if (dictBtn) {
            dictBtn.addEventListener('click', () => {
                this.showModal();
            });
        }

        // ModalManager handles closing via .modal-close and ESC
        // We only need to ensure the button exists for ModalManager to find it
        // OR we can explicitly call ModalManager.close('VDMModal') if needed
        // For now, let's trust ModalManager or use explicit wiring if button ID is unique
        const closeVendorModal = document.getElementById('closeVendorModal');
        if (closeVendorModal) {
            // Optional: If we want specific cleanup on close, we can listen.
            // But ModalManager handles the display toggling.
        }

        const addVendorBtn = document.getElementById('addVendorBtn');
        if (addVendorBtn) {
            addVendorBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // 🛡️ Prevent ModalManager from suppressing the prompt
                this.showAddVendorDialog();
            });
        }



        // Robustly attach/reattach listener only once
        const bindBulkIndex = () => {
            const bulkIndexBtn = document.getElementById('bulkIndexBtn');
            if (bulkIndexBtn && !bulkIndexBtn._listenerAttached) {
                console.log('✅ Bulk Index Button Found & Wired');
                bulkIndexBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.toggleBulkIndex();
                });
                bulkIndexBtn._listenerAttached = true;
            }
        };
        bindBulkIndex();
        // Check again after a delay in case DOM was slow
        setTimeout(bindBulkIndex, 1000);

        // Import Vendor Button - Toggle drop bucket

        const vendorImportDropZone = document.getElementById('vendorImportDropZone');
        const vendorImportInput = document.getElementById('vendorImportInput');

        // Cloud Badge Removed as per user request




        // Handle file selection and drag/drop
        if (vendorImportInput) {
            const handleFiles = async (files) => {
                if (files.length === 0) return;

                let totalVendorsAdded = 0;
                let totalVendorsUpdated = 0;

                for (const file of files) {
                    try {
                        const fileName = file.name.toLowerCase();

                        if (fileName.endsWith('.csv') || fileName.endsWith('.xls') || fileName.endsWith('.xlsx')) {
                            // Parse transactions and extract vendors
                            const transactions = await CSVParser.parseFile(file);

                            if (transactions && transactions.length > 0) {
                                // Extract unique vendors from transactions
                                console.log(`🔍 Processing ${transactions.length} transactions for vendors...`);
                                console.log('   First transaction sample:', transactions[0]);

                                const vendorNames = new Set();
                                transactions.forEach((tx, index) => {
                                    // Debug first 3 transactions
                                    if (index < 3) console.log(`   Rx ${index}: Payee="${tx.payee}", Desc="${tx.description}"`);

                                    const rawName = tx.payee || tx.description || tx.vendor || '';

                                    if (rawName) {
                                        const vendorName = VendorNameUtils.extractVendorName(rawName);

                                        // Debug name extraction
                                        if (index < 3) console.log(`      -> Extracted: "${vendorName}"`);

                                        if (vendorName && vendorName.length >= 2) {
                                            vendorNames.add(vendorName);
                                        }
                                    }
                                });

                                console.log(`✅ Found ${vendorNames.size} unique potential vendors`);

                                // Add vendors to dictionary
                                vendorNames.forEach(name => {
                                    const existing = VendorMatcher.getVendorByName(name);
                                    if (!existing) {
                                        VendorMatcher.addVendor({
                                            name: name,
                                            defaultAccount: '9970',
                                            category: 'General'
                                        });
                                        totalVendorsAdded++;
                                    } else {
                                        totalVendorsUpdated++;
                                    }
                                });
                            }
                        }
                    } catch (error) {
                        console.error(`Failed to process ${file.name}:`, error);
                    }
                }

                VendorMatcher.initialize();
                VendorSummaryGrid.loadVendors();

                vendorImportDropZone.style.display = 'none';
                alert(`\u2705 Vendor Indexing Complete!\n\n` +
                    `${totalVendorsAdded} new vendors added\n` +
                    `${totalVendorsUpdated} vendors already exist\n` +
                    `Total: ${VendorMatcher.getAllVendors().length} vendors`);
            };

            vendorImportInput.onchange = (e) => handleFiles(Array.from(e.target.files));

            const uploadZone = vendorImportDropZone.querySelector('.upload-zone');
            if (uploadZone) {
                uploadZone.onclick = () => vendorImportInput.click();

                uploadZone.ondragover = (e) => {
                    e.preventDefault();
                    uploadZone.style.borderColor = 'var(--primary-color)';
                    uploadZone.style.backgroundColor = 'var(--hover-bg)';
                };

                uploadZone.ondragleave = () => {
                    uploadZone.style.borderColor = '';
                    uploadZone.style.backgroundColor = '';
                };

                uploadZone.ondrop = (e) => {
                    e.preventDefault();
                    uploadZone.style.borderColor = '';
                    uploadZone.style.backgroundColor = '';
                    handleFiles(Array.from(e.dataTransfer.files));
                };
            }
        }




        // Bulk upload zone
        const bulkUploadZone = document.getElementById('bulkUploadZone');
        const bulkFileInput = document.getElementById('bulkFileInput');

        if (bulkUploadZone && bulkFileInput) {
            bulkUploadZone.addEventListener('click', () => {
                bulkFileInput.click();
            });

            bulkUploadZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                bulkUploadZone.style.borderColor = 'var(--accent-color)';
            });

            bulkUploadZone.addEventListener('dragleave', () => {
                bulkUploadZone.style.borderColor = '';
            });

            bulkUploadZone.addEventListener('drop', (e) => {
                e.preventDefault();
                bulkUploadZone.style.borderColor = '';
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.processBulkFiles(files);
                }
            });

            bulkFileInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    this.processBulkFiles(e.target.files);
                }
            });
        }

        // ModalManager handles outside click

        // Initialize Real-Time Sync
        if (window.SupabaseClient) {
            SupabaseClient.subscribeToVendors((payload) => {
                // 🟢 Process Update ("The Ticker")
                if (window.VendorMatcher && VendorMatcher.handleCloudUpdate) {
                    VendorMatcher.handleCloudUpdate(payload);
                }

                const badge = document.getElementById('cloudCountBadge');
                if (badge) {
                    badge.innerHTML = '<span>⚡ Syncing...</span>';
                    badge.style.background = 'rgba(59, 130, 246, 0.1)';
                    badge.style.color = '#3b82f6';

                    // Revert after 1.5s
                    setTimeout(() => {
                        badge.innerHTML = '<span>☁️ Synced</span>';
                        badge.style.background = 'rgba(16, 185, 129, 0.1)';
                        badge.style.color = '#10b981';
                        // Ideally trigger a grid refresh here in future iterations
                    }, 1500);
                }
            });
        }
    },

    showModal() {
        if (window.ModalManager) {
            ModalManager.open('VDMModal');
        } else {
            this.modal.classList.add('active'); // Fallback
            this.modal.style.display = 'flex';
        }

        const rawVendors = VendorMatcher.getAllVendors();

        // 📏 Autofit Logic for Vendor Grid
        const modal = document.getElementById('VDMModal');
        if (modal) {
            const modalContent = modal.querySelector('.modal-content');
            if (modalContent) {
                const rowCount = rawVendors.length;
                // Header(60) + Toolbar(50) + GridHeader(35) + Rows + Padding
                const estimatedHeight = 60 + 50 + 35 + (rowCount * 32) + 40;
                const maxAllowed = window.innerHeight * 0.85;
                const finalHeight = Math.min(Math.max(estimatedHeight, 450), maxAllowed);

                modalContent.style.height = `${finalHeight}px`;
                // Set Snug Width
                modalContent.style.width = '1000px';

                // Enable Resize
                modalContent.style.resize = 'both';
                modalContent.style.overflow = 'hidden';
                modalContent.style.minWidth = '600px';
                modalContent.style.minHeight = '400px';
            }
        }

        // MAP Data to Grid Definition (Fix for Empty Grid)
        const gridData = rawVendors.map(v => ({
            name: v.name,
            count: v.matchCount || 0,
            totalAmount: 0, // Dictionary doesn't track live totals usually
            currentAccount: v.defaultAccount,
            // Keep original for reference
            ...v
        }));
        VendorSummaryGrid.loadVendors(gridData);
        this.hideBulkIndex(); // Reset to normal view

        // 🔧 FIX: Robust Loop to Force Resize until it works
        // The grid needs to be visible and have width > 0
        let attempts = 0;
        const resizeInterval = setInterval(() => {
            const gridDiv = document.getElementById('vendorGrid');
            if (gridDiv && gridDiv.offsetWidth > 0 && VendorSummaryGrid.gridApi) {
                VendorSummaryGrid.gridApi.sizeColumnsToFit();
                attempts++;
                // Try a few times to ensure it catches the transition end
                if (attempts > 5) clearInterval(resizeInterval);
            } else if (attempts > 20) {
                clearInterval(resizeInterval); // Give up after 2 seconds
            }
            attempts++;
        }, 100);
    },

    hideModal() {
        if (window.ModalManager) {
            ModalManager.close('VDMModal');
        } else {
            this.modal.classList.remove('active');
            this.modal.style.display = 'none';
        }
    },

    toggleBulkIndex() {
        // Debounce / Toggle State
        this.bulkIndexActive = !this.bulkIndexActive;
        console.log('🔄 Toggling Bulk Index. Active:', this.bulkIndexActive);

        const bulkInfo = document.getElementById('bulkIndexInfo');
        const vendorGrid = document.getElementById('vendorGrid');
        const bulkBtn = document.getElementById('bulkIndexBtn');

        if (this.bulkIndexActive) {
            // SHOW BULK IMPORT
            if (bulkInfo) bulkInfo.style.display = 'block';
            if (vendorGrid) vendorGrid.style.height = '300px';
            if (bulkBtn) {
                bulkBtn.innerHTML = `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 12H5M12 19l-7-7 7-7"/>
                    </svg>
                    Back to List`;
            }

            // Re-bind click zone (Hard Fix)
            const clickZone = document.getElementById('bulkUploadZone');
            const fileInput = document.getElementById('bulkFileInput');
            if (clickZone && fileInput) {
                clickZone.onclick = (e) => {
                    e.stopPropagation(); // Prevent bubbling
                    console.log('📂 Bulk Upload Zone Clicked');
                    fileInput.click();
                };
                // Also handle file change
                fileInput.onchange = (e) => {
                    console.log('📂 Files selected:', e.target.files.length);
                    this.processBulkFiles(e.target.files);
                };
            }

        } else {
            // HIDE BULK IMPORT (Return to List)
            this.hideBulkIndex();
        }

        // Resize grid again as height changed
        setTimeout(() => {
            if (VendorSummaryGrid.gridApi) VendorSummaryGrid.gridApi.sizeColumnsToFit();
        }, 300);
    },

    hideBulkIndex() {
        this.bulkIndexActive = false;
        const bulkInfo = document.getElementById('bulkIndexInfo');
        const vendorGrid = document.getElementById('vendorGrid');
        const bulkBtn = document.getElementById('bulkIndexBtn');

        if (bulkInfo) bulkInfo.style.display = 'none';
        if (vendorGrid) vendorGrid.style.height = '400px';

        document.getElementById('bulkProgress').style.display = 'none';
        document.getElementById('bulkResults').style.display = 'none';

        if (bulkBtn) {
            bulkBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                </svg>
                Bulk Index
            `;
        }
    },

    async processBulkFiles(files) {
        const progressDiv = document.getElementById('bulkProgress');
        const resultsDiv = document.getElementById('bulkResults');
        const progressText = document.getElementById('bulkProgressText');
        const progressFill = document.getElementById('bulkProgressFill');

        progressDiv.style.display = 'block';
        resultsDiv.style.display = 'none';

        try {
            progressText.textContent = `Processing ${files.length} file(s)...`;
            progressFill.style.width = '30%';

            const results = await BulkIndexer.processFiles(files);

            progressFill.style.width = '70%';
            progressText.textContent = 'Consolidating duplicates...';

            const consolidation = BulkIndexer.consolidateDuplicates();

            progressFill.style.width = '90%';
            progressText.textContent = 'Cleaning patterns...';

            const cleaning = BulkIndexer.cleanPatterns();

            progressFill.style.width = '100%';
            progressText.textContent = 'Complete!';

            // Show results
            setTimeout(() => {
                progressDiv.style.display = 'none';
                resultsDiv.style.display = 'block';

                resultsDiv.innerHTML = `
                    <h4>✓ Bulk Indexing Complete!</h4>
                    <ul>
                        <li>Files processed: <strong>${results.filesProcessed}</strong></li>
                        <li>Total transactions: <strong>${results.totalTransactions}</strong></li>
                        <li>Vendors created: <strong>${results.vendorsCreated}</strong></li>
                        <li>Vendors updated: <strong>${results.vendorsUpdated}</strong></li>
                        <li>Duplicates removed: <strong>${consolidation.duplicatesRemoved}</strong></li>
                        <li>Redundant patterns cleaned: <strong>${cleaning.patternsRemoved}</strong></li>
                        ${results.errors.length > 0 ? `<li style="color: var(--error-color);">Errors: ${results.errors.length} file(s) failed</li>` : ''}
                    </ul>
                `;

                // Reload vendor grid
                VendorSummaryGrid.loadVendors();

                // Reset file input
                document.getElementById('bulkFileInput').value = '';
            }, 500);

        } catch (error) {
            progressDiv.style.display = 'none';
            alert('Error processing files: ' + error.message);
            console.error(error);
        }
    },

    showAddVendorDialog() {
        const vendorName = prompt('Enter vendor name:');
        if (!vendorName) return;

        const pattern = prompt('Enter matching pattern (e.g., "AMAZON*"):');
        if (!pattern) return;

        const vendorData = {
            name: vendorName,
            patterns: [pattern],
            defaultAccount: null,
            defaultAccountName: '',
            category: '',
            notes: ''
        };

        if (window.VendorSummaryGrid && VendorSummaryGrid.addVendor) {
            VendorSummaryGrid.addVendor(vendorData);
        } else {
            // Fallback
            // Legacy VendorGrid removal - try VendorSummaryGrid anyway or warn
            console.warn('VendorSummaryGrid.addVendor not found, check version');
        }
    },

    showImportDialog() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (file) {
                try {
                    const vendors = await Storage.importVendorDictionary(file);
                    VendorMatcher.initialize();
                    VendorSummaryGrid.loadVendors();
                    alert(`Successfully imported ${vendors.length} vendors`);
                } catch (error) {
                    alert('Failed to import vendor dictionary: ' + error.message);
                }
            }
        };

        input.click();
    },

    async rethinkVendors() {
        const confirmMsg = 'This will use AI to:\n' +
            '• Auto-categorize vendors\n' +
            '• Allocate account numbers\n' +
            '• Suggest vendor merges\n\n' +
            'Continue?';

        if (!confirm(confirmMsg)) return;

        // Show loading with progress
        const progressDiv = document.getElementById('bulkProgress');
        const progressText = document.getElementById('bulkProgressText');
        const progressFill = document.getElementById('bulkProgressFill');

        if (progressDiv) {
            progressDiv.style.display = 'block';
        }

        try {
            // Call AI with progress callback
            const result = await VendorAI.rethinkVendors((message, percent) => {
                if (progressText) progressText.textContent = message;
                if (progressFill) progressFill.style.width = `${percent}%`;
            });

            // Show results
            setTimeout(() => {
                if (progressDiv) progressDiv.style.display = 'none';

                const resultsDiv = document.getElementById('bulkResults');
                if (resultsDiv) {
                    resultsDiv.style.display = 'block';
                    resultsDiv.innerHTML = `
                        <h4>✨ AI Re-think Complete!</h4>
                        <ul>
                            <li>Vendors categorized: <strong>${result.results.categorized}</strong></li>
                            <li>Accounts allocated: <strong>${result.results.allocated}</strong></li>
                            <li>Similar vendors found: <strong>${result.results.merged}</strong></li>
                        </ul>
                        ${result.results.merged > 0 ? '<p style="color: var(--primary-color); margin-top: 1rem;">💡 Review the grid for similar vendors that may need merging.</p>' : ''}
                    `;
                }

                // Reload grid
                VendorSummaryGrid.loadVendors();

                alert(`✨ AI Re-think complete!\n\n${result.results.categorized} vendors categorized\n${result.results.allocated} accounts allocated\n${result.results.merged} similar vendors found`);
            }, 500);

        } catch (error) {
            if (progressDiv) progressDiv.style.display = 'none';
            alert('Error during AI re-think: ' + error.message);
            console.error(error);
        }
    }
};

