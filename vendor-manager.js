// Vendor Manager UI Controller with Bulk Indexing

// Vendor Manager UI Controller with Bulk Indexing

console.log('🔄 Loading VendorManager (New Version)...');
window.VendorManager = {
    modal: null,
    bulkIndexActive: false,

    initialize() {
        this.modal = document.getElementById('vendorModal');
        if (!this.modal) {
            console.warn('VendorManager: vendorModal element not found, skipping initialization');
            return;
        }

        // Initialize vendor grid
        VendorGrid.initialize('vendorGrid');

        // Set up event listeners with null checks
        const dictBtn = document.getElementById('dictBtn');
        if (dictBtn) {
            dictBtn.addEventListener('click', () => {
                this.showModal();
            });
        }

        const closeVendorModal = document.getElementById('closeVendorModal');
        if (closeVendorModal) {
            closeVendorModal.addEventListener('click', () => {
                this.hideModal();
            });
        }

        const addVendorBtn = document.getElementById('addVendorBtn');
        if (addVendorBtn) {
            addVendorBtn.addEventListener('click', () => {
                this.showAddVendorDialog();
            });
        }

        const rethinkVendorsBtn = document.getElementById('rethinkVendorsBtn');
        if (rethinkVendorsBtn) {
            rethinkVendorsBtn.addEventListener('click', async () => {
                // Use unified AI Re-think (optimizes vendors + categorizes transactions)
                if (typeof App !== 'undefined' && App.unifiedAIRethink) {
                    await App.unifiedAIRethink();
                } else {
                    alert('❌ AI Re-think function not available');
                }
            });
        }

        const bulkIndexBtn = document.getElementById('bulkIndexBtn');
        if (bulkIndexBtn) {
            bulkIndexBtn.addEventListener('click', () => {
                this.toggleBulkIndex();
            });
        }

        // Import Vendor Button - Toggle drop bucket
        const importVendorBtn = document.getElementById('importVendorBtn');
        const vendorImportDropZone = document.getElementById('vendorImportDropZone');
        const vendorImportInput = document.getElementById('vendorImportInput');

        if (importVendorBtn && vendorImportDropZone) {
            importVendorBtn.addEventListener('click', () => {
                // Toggle drop bucket visibility
                if (vendorImportDropZone.style.display === 'none') {
                    vendorImportDropZone.style.display = 'block';
                } else {
                    vendorImportDropZone.style.display = 'none';
                }
            });

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
                    VendorGrid.loadVendors();

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
        }

        // Export / Sync Button
        const exportVendorBtn = document.getElementById('exportVendorBtn');
        if (exportVendorBtn) {
            exportVendorBtn.addEventListener('click', () => {
                const vendors = VendorMatcher.getAllVendors();

                if (vendors.length === 0) {
                    alert('No vendors to export');
                    return;
                }

                // Cloud Sync Only
                if (window.SupabaseClient) {
                    const originalText = exportVendorBtn.textContent;
                    exportVendorBtn.textContent = '⏳ Syncing...';
                    exportVendorBtn.disabled = true;

                    SupabaseClient.initialize().then(connected => {
                        exportVendorBtn.textContent = originalText;
                        exportVendorBtn.disabled = false;

                        if (connected) {
                            SupabaseClient.syncVendors(vendors);
                        } else {
                            alert('⚠️ Cloud connection unavailable.');
                        }
                    });
                } else {
                    alert('Supabase Client not loaded.');
                }
            });
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

        // Close modal on outside click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
    },

    showModal() {
        this.modal.classList.add('active');
        VendorGrid.loadVendors();
        this.hideBulkIndex(); // Reset to normal view
    },

    hideModal() {
        this.modal.classList.remove('active');
    },

    toggleBulkIndex() {
        this.bulkIndexActive = !this.bulkIndexActive;

        const bulkInfo = document.getElementById('bulkIndexInfo');
        const vendorGrid = document.getElementById('vendorGrid');
        const bulkBtn = document.getElementById('bulkIndexBtn');

        if (this.bulkIndexActive) {
            bulkInfo.style.display = 'block';
            vendorGrid.style.height = '300px';
            bulkBtn.textContent = '← Back to List';
        } else {
            this.hideBulkIndex();
        }
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
                VendorGrid.loadVendors();

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

        VendorGrid.addVendor(vendorData);
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
                    VendorGrid.loadVendors();
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
                VendorGrid.loadVendors();

                alert(`✨ AI Re-think complete!\n\n${result.results.categorized} vendors categorized\n${result.results.allocated} accounts allocated\n${result.results.merged} similar vendors found`);
            }, 500);

        } catch (error) {
            if (progressDiv) progressDiv.style.display = 'none';
            alert('Error during AI re-think: ' + error.message);
            console.error(error);
        }
    }
};

