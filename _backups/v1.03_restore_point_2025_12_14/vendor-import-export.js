// Vendor Import/Export Module
// Handle importing and exporting vendor dictionary

const VendorImportExport = {

    // Export vendors to JSON file
    exportVendors() {
        const vendors = VendorMatcher.getAllVendors();

        if (vendors.length === 0) {
            alert('No vendors to export!');
            return;
        }

        const data = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            vendorCount: vendors.length,
            vendors: vendors
        };

        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `vendors_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`📤 Exported ${vendors.length} vendors`);
        alert(`✅ Exported ${vendors.length} vendors to ${a.download}`);
    },

    // Import vendors from JSON file
    async importVendors(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!this.validateImportData(data)) {
                alert('❌ Invalid vendor file format!');
                return;
            }

            const importedVendors = data.vendors || [];
            const existingVendors = VendorMatcher.getAllVendors();

            let added = 0;
            let updated = 0;
            let skipped = 0;

            for (const vendorData of importedVendors) {
                const existing = existingVendors.find(v =>
                    v.name.toLowerCase() === vendorData.name.toLowerCase()
                );

                if (existing) {
                    // Ask user what to do with duplicates
                    // For now, skip
                    skipped++;
                } else {
                    // Add new vendor
                    VendorMatcher.addVendor(vendorData);
                    added++;
                }
            }

            console.log(`📥 Import complete: ${added} added, ${updated} updated, ${skipped} skipped`);
            alert(`✅ Import complete!\n\n Added: ${added}\nUpdated: ${updated}\nSkipped: ${skipped}`);

            // Reload vendor manager if open
            if (typeof VendorManager !== 'undefined' && VendorManager.isOpen) {
                VendorManager.refreshVendorList();
            }

        } catch (error) {
            console.error('Import error:', error);
            alert(`❌ Import failed: ${error.message}`);
        }
    },

    // Validate import data structure
    validateImportData(data) {
        if (!data || typeof data !== 'object') {
            console.error('Not a valid object');
            return false;
        }

        if (!Array.isArray(data.vendors)) {
            console.error('Missing vendors array');
            return false;
        }

        // Check at least one vendor has required fields
        if (data.vendors.length > 0) {
            const sample = data.vendors[0];
            if (!sample.name || !sample.defaultAccount) {
                console.error('Vendor missing required fields:', sample);
                return false;
            }
        }

        return true;
    },

    // Export to CSV format
    exportToCSV() {
        const vendors = VendorMatcher.getAllVendors();

        if (vendors.length === 0) {
            alert('No vendors to export!');
            return;
        }

        // CSV headers
        let csv = 'Name,Default Account,Account Name,Category,Notes,Match Count\n';

        // Add rows
        for (const vendor of vendors) {
            const row = [
                this.escapeCsv(vendor.name),
                this.escapeCsv(vendor.defaultAccount),
                this.escapeCsv(vendor.defaultAccountName),
                this.escapeCsv(vendor.category || ''),
                this.escapeCsv(vendor.notes || ''),
                vendor.matchCount || 0
            ];
            csv += row.join(',') + '\n';
        }

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `vendors_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`📤 Exported ${vendors.length} vendors to CSV`);
        alert(`✅ Exported ${vendors.length} vendors to CSV`);
    },

    // Escape CSV special characters
    escapeCsv(value) {
        if (value === null || value === undefined) return '';
        const str = String(value);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return '"' + str.replace(/"/g, '""') + '"';
        }
        return str;
    },

    // Import from CSV
    async importFromCSV(file) {
        try {
            const text = await file.text();
            const lines = text.split('\n');

            if (lines.length < 2) {
                alert('CSV file is empty or invalid!');
                return;
            }

            // Skip header
            const vendors = [];
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;

                const cols = this.parseCSVLine(line);
                if (cols.length >= 2) {
                    vendors.push({
                        name: cols[0],
                        defaultAccount: cols[1],
                        defaultAccountName: cols[2] || '',
                        category: cols[3] || '',
                        notes: cols[4] || '',
                        matchCount: parseInt(cols[5]) || 0,
                        patterns: [cols[0].toLowerCase()]
                    });
                }
            }

            // Import the vendors
            let added = 0;
            for (const vendorData of vendors) {
                try {
                    VendorMatcher.addVendor(vendorData);
                    added++;
                } catch (e) {
                    console.warn('Failed to add vendor:', vendorData.name, e);
                }
            }

            console.log(`📥 CSV import complete: ${added} vendors added`);
            alert(`✅ Imported ${added} vendors from CSV`);

            if (typeof VendorManager !== 'undefined' && VendorManager.isOpen) {
                VendorManager.refreshVendorList();
            }

        } catch (error) {
            console.error('CSV import error:', error);
            alert(`❌ CSV import failed: ${error.message}`);
        }
    },

    // Parse CSV line handling quotes
    parseCSVLine(line) {
        const result = [];
        let current = '';
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];

            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }

        result.push(current);
        return result;
    }
};

console.log('✅ Vendor Import/Export loaded');
