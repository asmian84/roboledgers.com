/**
 * Batch Upload Modal Component
 * Shows pre-scan results and allows user to select which files to import
 */

class BatchUploadModal {
    constructor() {
        this.scanResults = null;
        this.selectedFiles = new Set();
    }

    /**
     * Show batch upload modal with scan results
     */
    show(scanResults) {
        this.scanResults = scanResults;
        this.selectedFiles = new Set(scanResults.confirmed.map(f => f.filename));

        const modal = this.createModal();
        document.body.appendChild(modal);

        // Auto-select confirmed files
        this.updateSelections();
    }

    /**
     * Create modal HTML
     */
    createModal() {
        const modal = document.createElement('div');
        modal.className = 'prescan-modal';
        modal.id = 'batch-upload-modal';

        modal.innerHTML = `
            <div class="prescan-content">
                <div class="prescan-header">
                    <h2>📊 Batch Scan Results</h2>
                    <p>Found ${this.scanResults.summary.confirmed + this.scanResults.summary.likely} bank statements out of ${this.scanResults.total} files</p>
                </div>
                
                <div class="prescan-body">
                    ${this.renderConfirmed()}
                    ${this.renderLikely()}
                    ${this.renderUncertain()}
                    ${this.renderRejected()}
                </div>
                
                <div class="prescan-actions">
                    <button class="btn-cancel" onclick="window.batchUploadModal.close()">
                        Cancel
                    </button>
                    <button class="btn-import" onclick="window.batchUploadModal.importSelected()">
                        Import ${this.selectedFiles.size} Files
                    </button>
                </div>
            </div>
        `;

        return modal;
    }

    /**
     * Render confirmed statements
     */
    renderConfirmed() {
        if (this.scanResults.confirmed.length === 0) return '';

        return `
            <div class="result-category confirmed">
                <div class="category-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h4>
                        ✅ Confirmed Bank Statements
                        <span class="category-count">${this.scanResults.confirmed.length}</span>
                    </h4>
                </div>
                <div class="category-files">
                    ${this.scanResults.confirmed.map(file => this.renderFileItem(file, true)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render likely statements
     */
    renderLikely() {
        if (this.scanResults.likely.length === 0) return '';

        return `
            <div class="result-category likely">
                <div class="category-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h4>
                        💙 Likely Statements
                        <span class="category-count">${this.scanResults.likely.length}</span>
                    </h4>
                </div>
                <div class="category-files">
                    ${this.scanResults.likely.map(file => this.renderFileItem(file, false)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render uncertain files
     */
    renderUncertain() {
        if (this.scanResults.uncertain.length === 0) return '';

        return `
            <div class="result-category uncertain collapsed">
                <div class="category-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h4>
                        ⚠️ Uncertain
                        <span class="category-count">${this.scanResults.uncertain.length}</span>
                    </h4>
                </div>
                <div class="category-files">
                    ${this.scanResults.uncertain.map(file => this.renderFileItem(file, false)).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Render rejected files
     */
    renderRejected() {
        if (this.scanResults.rejected.length === 0) return '';

        return `
            <div class="result-category rejected collapsed">
                <div class="category-header" onclick="this.parentElement.classList.toggle('collapsed')">
                    <h4>
                        ❌ Not Bank Statements
                        <span class="category-count">${this.scanResults.rejected.length}</span>
                    </h4>
                </div>
                <div class="category-files">
                    <p style="padding: 1rem; color: #64748b; font-size: 0.875rem;">
                        These files don't appear to be bank statements. They've been automatically excluded.
                    </p>
                </div>
            </div>
        `;
    }

    /**
     * Render individual file item
     */
    renderFileItem(file, autoSelected) {
        const confidenceClass = file.confidence >= 90 ? 'confidence-high' :
            file.confidence >= 70 ? 'confidence-medium' : 'confidence-low';

        return `
            <div class="file-item">
                <input type="checkbox" 
                       id="file-${file.filename}" 
                       ${autoSelected ? 'checked' : ''}
                       onchange="window.batchUploadModal.toggleFile('${file.filename}')">
                <div class="file-info">
                    <div class="file-name">${file.filename}</div>
                    <div class="file-details">
                        ${file.bank || 'Unknown Bank'} • ${file.type || 'Unknown Type'} • ${file.reason}
                    </div>
                </div>
                <span class="confidence-badge ${confidenceClass}">
                    ${file.confidence}%
                </span>
            </div>
        `;
    }

    /**
     * Toggle file selection
     */
    toggleFile(filename) {
        if (this.selectedFiles.has(filename)) {
            this.selectedFiles.delete(filename);
        } else {
            this.selectedFiles.add(filename);
        }
        this.updateImportButton();
    }

    /**
     * Update import button text
     */
    updateImportButton() {
        const btn = document.querySelector('.btn-import');
        if (btn) {
            btn.textContent = `Import ${this.selectedFiles.size} Files`;
        }
    }

    /**
     * Update checkbox selections
     */
    updateSelections() {
        this.selectedFiles.forEach(filename => {
            const checkbox = document.getElementById(`file-${filename}`);
            if (checkbox) checkbox.checked = true;
        });
    }

    /**
     * Import selected files
     */
    async importSelected() {
        if (this.selectedFiles.size === 0) {
            alert('Please select at least one file to import');
            return;
        }

        // Get the original files
        const filesToImport = [];
        const allFiles = [
            ...this.scanResults.confirmed,
            ...this.scanResults.likely,
            ...this.scanResults.uncertain
        ];

        for (const result of allFiles) {
            if (this.selectedFiles.has(result.filename)) {
                // Find original file from the file input
                const originalFile = window.batchUploadFiles.find(f => f.name === result.filename);
                if (originalFile) {
                    filesToImport.push(originalFile);
                }
            }
        }

        console.log(`📥 Importing ${filesToImport.length} selected files...`);

        // Close modal
        this.close();

        // Process files through existing import flow
        if (window.handleSmartUpload) {
            await window.handleSmartUpload(filesToImport);
        }
    }

    /**
     * Close modal
     */
    close() {
        const modal = document.getElementById('batch-upload-modal');
        if (modal) {
            modal.remove();
        }
        this.scanResults = null;
        this.selectedFiles.clear();
    }
}

// Initialize global instance
if (typeof window !== 'undefined') {
    window.batchUploadModal = new BatchUploadModal();
    console.log('📊 Batch Upload Modal loaded');
}
