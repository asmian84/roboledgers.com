// Enhanced vendor name utilities

const VendorNameUtils = {
    // Extract clean vendor name from payee with intelligent garbage removal
    extractVendorName(payee) {
        if (!payee) return '';

        let cleaned = payee.trim();

        // Remove trailing transaction IDs, reference numbers, and store numbers
        cleaned = cleaned
            .replace(/\s*-\s*\d+$/i, '')                    // Remove " - 5168"
            .replace(/\s*-\s*[A-Z0-9]{4,}$/i, '')          // Remove " - ABCD1234"
            .replace(/\s*#\s*\d+$/i, '')                   // Remove " #1234"
            .replace(/\s*\*\s*\d+$/i, '')                  // Remove " *5678"
            .replace(/\s+\d{4,}$/i, '')                    // Remove trailing numbers " 12345"
            .replace(/\s*\(\d+\)$/i, '')                   // Remove " (1234)"
            .replace(/\s*\[\d+\]$/i, '')                   // Remove " [5678]"
            .trim();

        // Remove common banking transaction prefixes
        const commonPrefixes = [
            /^ONLINE BANKING TRANSFER\s*-?\s*/i,
            /^ONLINE BANKING\s*-?\s*/i,
            /^E-TRANSFER\s*-?\s*/i,
            /^DEBIT CARD\s*-?\s*/i,
            /^CREDIT CARD\s*-?\s*/i,
            /^POS PURCHASE\s*-?\s*/i,
            /^POS\s*-?\s*/i,
            /^ATM WITHDRAWAL\s*-?\s*/i,
            /^ATM\s*-?\s*/i,
            /^MONTHLY FEE\s*$/i
        ];

        for (const prefix of commonPrefixes) {
            const beforeRemoval = cleaned;
            cleaned = cleaned.replace(prefix, '').trim();

            //If we removed everything or left with just garbage, revert
            if (!cleaned || cleaned.length < 2 || /^[\s\-\*#]+$/.test(cleaned)) {
                cleaned = beforeRemoval;
                break;
            }
        }

        // Final cleanup
        cleaned = cleaned.replace(/\s+/g, ' ').trim();

        return cleaned || payee.trim();
    },

    // Normalize for comparison
    normalizeVendorName(vendorName) {
        if (!vendorName) return '';

        let normalized = this.extractVendorName(vendorName);
        normalized = normalized
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();

        return normalized;
    }
};

// Override Utils.extractVendorName with enhanced version
Utils.extractVendorName = VendorNameUtils.extractVendorName.bind(VendorNameUtils);
Utils.normalizeVendorName = VendorNameUtils.normalizeVendorName.bind(VendorNameUtils);
