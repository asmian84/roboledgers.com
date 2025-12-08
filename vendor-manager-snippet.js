// Snippet to replace lines 32-71 in vendor-manager.js
// Enhanced Vendor Indexing with file/folder browsing

// Vendor Indexing button - with file/folder browsing
const vendorIndexBtn = document.getElementById('vendorIndexBtn');
const vendorIndexInput = document.getElementById('vendorIndexInput');

if (vendorIndexBtn && vendorIndexInput) {
    vendorIndexBtn.addEventListener('click', () => {
        // Show choice: files or folder
        const choice = confirm(
            '📁 Vendor Indexing Options:\n\n' +
            'OK = Select multiple CSV files\n' +
            'Cancel = Browse folder (process all CSVs)'
        );

        if (choice) {
            // Multiple files
            vendorIndexInput.removeAttribute('webkitdirectory');
            vendorIndexInput.removeAttribute('directory');
            vendorIndexInput.click();
        } else {
            // Folder browsing
            vendorIndexInput.setAttribute('webkitdirectory', '');
            vendorIndexInput.setAttribute('directory', '');
            vendorIndexInput.click();
        }
    });

    vendorIndexInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        const isFolder = vendorIndexInput.hasAttribute('webkitdirectory');

        try {
            console.log(`📥 Processing ${files.length} file(s) for vendor indexing...`);

            if (typeof VendorIndexer !== 'undefined') {
                // Process files with validation
                const result = isFolder
                    ? await VendorIndexer.processFolderFiles(files)
                    : await VendorIndexer.indexFromFiles(files);

                // Apply to vendor matcher
                const applyResults = await VendorIndexer.applyToVendorMatcher(result.consolidated);

                // Reload grid
                VendorGrid.loadVendors();

                // Build detailed results message
                let message = `✅ Vendor Indexing Complete!\n\n`;
                message += `📁 Files processed: ${result.filesIndexed + result.filesSkipped}\n`;
                message += `✓ Files indexed: ${result.filesIndexed}\n`;
                message += `⏭️ Files skipped: ${result.filesSkipped}\n`;
                message += `📝 Transactions: ${result.totalTransactions}\n\n`;
                message += `📊 Vendor Dictionary:\n`;
                message += `✓ ${applyResults.added} new vendors added\n`;
                message += `✓ ${applyResults.updated} existing vendors updated\n`;
                message += `✓ Total vendors: ${VendorMatcher.getAllVendors().length}\n`;

                // Add file details if any were skipped
                if (result.filesSkipped > 0) {
                    message += `\n⚠️ Skipped Files:\n`;
                    result.processedFiles
                        .filter(f => f.status === 'skipped' || f.status === 'error')
                        .forEach(f => {
                            message += `  • ${f.filename}: ${f.reason}\n`;
                        });
                }

                alert(message);
            } else {
                alert('VendorIndexer module not loaded');
            }
        } catch (error) {
            console.error('Vendor indexing error:', error);
            alert('Error indexing vendors: ' + error.message);
        }

        // Reset input
        vendorIndexInput.value = '';
        vendorIndexInput.removeAttribute('webkitdirectory');
        vendorIndexInput.removeAttribute('directory');
    });
}
