// Vendor Manager UI Controller with Bulk Indexing

const VendorManager = {
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

        // Vendor Indexing button - directly trigger file selection
        const vendorIndexBtn = document.getElementById('vendorIndexBtn');
        const vendorIndexInput = document.getElementById('vendorIndexInput');

        if (vendorIndexBtn && vendorIndexInput) {
            vendorIndexBtn.addEventListener('click', () => {
                vendorIndexInput.click();
            });

            vendorIndexInput.addEventListener('change', async (e) => {
                const files = Array.from(e.target.files);
                if (files.length === 0) return;

                try {
                    console.log(`📥 Processing ${files.length} CSV file(s) for vendor indexing...`);

                    // Use VendorIndexer if available
                    if (typeof VendorIndexer !== 'undefined') {
                        const consolidated = await VendorIndexer.indexFromFiles(files);
                        const results = await VendorIndexer.applyToVendorMatcher(consolidated);

                        // Reload grid
                        VendorGrid.loadVendors();

                        alert(`✅ Vendor Indexing Complete!\n\n` +
                            `✓ ${results.added} new vendors added\n` +
                            `✓ ${results.updated} existing vendors updated\n` +
                            `✓ Total vendors: ${VendorMatcher.getAllVendors().length}`);
                    } else {
                        alert('VendorIndexer module not loaded');
                    }
                } catch (error) {
                    console.error('Vendor indexing error:', error);
                    alert('Error indexing vendors: ' + error.message);
                }

                // Reset input
                vendorIndexInput.value = '';
            });
        }

        // Save to File button
        const saveVendorFileBtn = document.getElementById('saveVendorFileBtn');
        if (saveVendorFileBtn) {
            saveVendorFileBtn.addEventListener('click', () => {
                const count = Storage.exportVendorDictionary();
                const notice = document.getElementById('gitBackupNotice');
                if (notice) {
                    notice.style.display = 'block';
                    setTimeout(() => notice.style.display = 'none', 10000);
                }
                alert(`✅ Saved ${count} vendors to vendor-dictionary.json\n\n💡 Don't forget to:\n1. Move file to your project directory\n2. git add vendor-dictionary.json\n3. git commit -m "Update vendor dictionary"`);
            });
        }

        // Load from File button
        const loadVendorFileBtn = document.getElementById('loadVendorFileBtn');
        const loadVendorFileInput = document.getElementById('loadVendorFileInput');

        if (loadVendorFileBtn && loadVendorFileInput) {
            loadVendorFileBtn.addEventListener('click', () => {
                loadVendorFileInput.click();
            });

            loadVendorFileInput.addEventListener('change', async (e) => {
                const file = e.target.files[0];
                if (!file) return;

                try {
                    const vendors = await Storage.importVendorDictionary(file);
                    VendorMatcher.vendors = vendors;
                    VendorGrid.loadVendors();
                    alert(`✅ Loaded ${vendors.length} vendors from ${file.name}`);
                } catch (error) {
                    alert('❌ Error loading vendor dictionary: ' + error.message);
                }

                loadVendorFileInput.value = '';
            });
        }

        const addVendorBtn = document.getElementById('addVendorBtn');
        if (addVendorBtn) {
            addVendorBtn.addEventListener('click', () => {
                this.showAddVendorDialog();
            });
        }

        const importVendorBtn = document.getElementById('importVendorBtn');
        if (importVendorBtn) {
            importVendorBtn.addEventListener('click', () => {
                this.showImportDialog();
            });
        }

        const exportVendorBtn = document.getElementById('exportVendorBtn');
        if (exportVendorBtn) {
            exportVendorBtn.addEventListener('click', () => {
                this.exportVendorDictionary();
            });
        }

        const rethinkVendorsBtn = document.getElementById('rethinkVendorsBtn');
        if (rethinkVendorsBtn) {
            rethinkVendorsBtn.addEventListener('click', () => {
                this.rethinkVendors();
            });
        }

        const bulkIndexBtn = document.getElementById('bulkIndexBtn');
        if (bulkIndexBtn) {
            bulkIndexBtn.addEventListener('click', () => {
                this.toggleBulkIndex();
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
        const modal = document.getElementById('vendorImportModal');
        const closeBtn = document.getElementById('closeVendorImportModal');
        const uploadZone = document.getElementById('vendorImportZone');
        const fileInput = document.getElementById('vendorImportInput');
        const progress = document.getElementById('vendorImportProgress');
        const progressText = document.getElementById('vendorImportProgressText');
        const progressFill = document.getElementById('vendorImportProgressFill');
        const results = document.getElementById('vendorImportResults');

        if (!modal) return;

        // Show modal
        modal.style.display = 'flex';

        // Close handlers
        const closeModal = () => {
            modal.style.display = 'none';
            progress.style.display = 'none';
            results.style.display = 'none';
        };

        closeBtn.onclick = closeModal;
        modal.onclick = (e) => e.target === modal && closeModal();

        // File input handler
        const handleFiles = async (files) => {
            if (files.length === 0) return;

            progress.style.display = 'block';
            results.style.display = 'none';

            let totalVendors = 0;
            let processedFiles = 0;

            for (const file of files) {
                progressText.textContent = `Processing ${file.name}...`;
                progressFill.style.width = `${(processedFiles / files.length) * 100}%`;

                try {
                    const vendors = await Storage.importVendorDictionary(file);
                    totalVendors += vendors.length;
                } catch (error) {
                    console.error(`Failed to import ${file.name}:`, error);
                }

                processedFiles++;
            }

            progressFill.style.width = '100%';
            VendorMatcher.initialize();
            VendorGrid.loadVendors();

            results.innerHTML = `<p style="color: var(--success-color);">✅ Successfully imported ${totalVendors} vendors from ${processedFiles} file(s)</p>`;
            results.style.display = 'block';
            progress.style.display = 'none';
        };

        fileInput.onchange = (e) => handleFiles(Array.from(e.target.files));
        uploadZone.onclick = () => fileInput.click();

        // Drag and drop
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
    },

    exportVendorDictionary() {
        const vendors = VendorMatcher.getAllVendors();

        if (vendors.length === 0) {
            alert('No vendors to export');
            return;
        }

        const data = JSON.stringify(vendors, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const timestamp = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `vendor-dictionary-${timestamp}.json`;
        a.click();
        URL.revokeObjectURL(url);

        console.log(`✅ Exported ${vendors.length} vendors`);
    }
};

