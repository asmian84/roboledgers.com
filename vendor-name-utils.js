// Enhanced vendor name utilities

// Enhanced vendor name utilities

window.VendorNameUtils = {
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
            /^ONLINE TRANSFER SENT\s*-?\s*([\d\s]+)?/i, // Remove "Online transfer sent - 1234"
            /^ONLINE TRANSFER\s*-?\s*/i,
            /^MISC PAYMENT\s*-?\s*/i,
            /^E-TRANSFER\s*-?\s*/i,
            /^DEBIT CARD\s*-?\s*/i,
            /^CREDIT CARD\s*-?\s*/i,
            /^POS PURCHASE\s*-?\s*/i,
            /^POS\s*-?\s*/i,
            /^ATM WITHDRAWAL\s*-?\s*/i,
            /^ATM\s*-?\s*/i,
            /^ATM WITHDRAWAL\s*-?\s*/i,
            /^ATM\s*-?\s*/i,
            /^MONTHLY FEE\s*$/i,
            /^WWW\s+/i
        ];

        // 0. Remove Leading Numbers (Store IDs like "22048 MACS")
        cleaned = cleaned.replace(/^\d{3,}\s+/, '');

        // 1. Remove Location Suffixes (Canadian Specific + Generic)
        // e.g. "CALGARY AB", "EDMONTON AB", "VANCOUVER BC", "TORONTO ON"
        const locationSuffixes = [
            /\s+(CALGARY|EDMONTON|RED DEER|LETHBRIDGE|BANFF|CANMORE|MEDICINE HAT|AIRDRIE)\s+AB$/i,
            /\s+(VANCOUVER|VICTORIA|SURREY|BURNABY)\s+BC$/i,
            /\s+(TORONTO|OTTAWA|MISSISSAUGA)\s+ON$/i,
            /\s+(MONTREAL|QUEBEC)\s+QC$/i,
            /\s+AB$/i, /\s+BC$/i, /\s+ON$/i, /\s+SK$/i, /\s+MB$/i, // Generic Province codes
            /\s+CANADA$/i
        ];

        locationSuffixes.forEach(regex => {
            cleaned = cleaned.replace(regex, '');
        });

        // 2. Remove Specific User Garbage
        cleaned = cleaned
            .replace(/MKTP\s+.*$/i, '')       // "MKTP CAGXKBF..." -> Remove all after MKTP
            .replace(/WWW\s+.*$/i, '')        // "WWW AMAZON CAON" -> Remove
            .replace(/\s+CO\s+OP\s+/i, ' CO-OP ') // Normalize CO OP
            .replace(/\s+COMBILL/i, '');      // APPLE COMBILL -> APPLE

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
