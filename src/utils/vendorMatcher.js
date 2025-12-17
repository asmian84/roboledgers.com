/**
 * Vendor Matcher Utility
 * Fuzzy string matching and smart vendor suggestions
 */

// Levenshtein distance calculation
function calculateLevenshteinDistance(str1, str2) {
    const s1 = str1.toLowerCase();
    const s2 = str2.toLowerCase();

    const costs = [];
    for (let i = 0; i <= s1.length; i++) {
        let lastValue = i;
        for (let j = 0; j <= s2.length; j++) {
            if (i === 0) {
                costs[j] = j;
            } else if (j > 0) {
                let newValue = costs[j - 1];
                if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
                    newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
                }
                costs[j - 1] = lastValue;
                lastValue = newValue;
            }
        }
        if (i > 0) {
            costs[s2.length] = lastValue;
        }
    }
    return costs[s2.length];
}

// Calculate similarity score (0-1, where 1 is identical)
function calculateSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
        return 1.0;
    }

    const distance = calculateLevenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
}

// Find similar vendors by name
function findSimilarVendors(name, vendors, threshold = 0.7) {
    if (!name || name.length < 2) return [];

    return vendors
        .map(v => ({
            vendor: v,
            similarity: calculateSimilarity(name, v.name)
        }))
        .filter(v => v.similarity > threshold)
        .sort((a, b) => b.similarity - a.similarity);
}

// Auto-categorize vendor based on name patterns
function suggestCategory(vendorName) {
    const name = vendorName.toLowerCase();

    // Utilities
    if (name.includes('electric') || name.includes('gas') || name.includes('pge') ||
        name.includes('water') || name.includes('power')) {
        return 'Utilities';
    }

    if (name.includes('verizon') || name.includes('at&t') || name.includes('comcast') ||
        name.includes('internet') || name.includes('phone') || name.includes('wireless')) {
        return 'Utilities';
    }

    // Office Supplies
    if (name.includes('depot') || name.includes('staples') || name.includes('office')) {
        return 'Office Supplies';
    }

    // General/Online
    if (name.includes('amazon') || name.includes('ebay') || name.includes('walmart')) {
        return 'General';
    }

    // Meals & Entertainment
    if (name.includes('coffee') || name.includes('starbucks') || name.includes('cafe') ||
        name.includes('restaurant') || name.includes('diner') || name.includes('grill') ||
        name.includes('pizza') || name.includes('bar')) {
        return 'Meals & Entertainment';
    }

    // Travel
    if (name.includes('airlines') || name.includes('airline') || name.includes('hotel') ||
        name.includes('hilton') || name.includes('marriott') || name.includes('airbnb') ||
        name.includes('uber') || name.includes('lyft')) {
        return 'Travel';
    }

    // Vehicle
    if (name.includes('shell') || name.includes('chevron') || name.includes('exxon') ||
        name.includes('bp') || name.includes('gas') || name.includes('fuel') ||
        name.includes('auto') || name.includes('car')) {
        return 'Vehicle';
    }

    // Insurance
    if (name.includes('insurance') || name.includes('state farm') || name.includes('geico') ||
        name.includes('allstate')) {
        return 'Insurance';
    }

    // Professional Services
    if (name.includes('law') || name.includes('attorney') || name.includes('cpa') ||
        name.includes('accounting') || name.includes('consulting')) {
        return 'Professional Services';
    }

    // Default
    return '';
}

// Check if vendor name might be a duplicate
function checkForDuplicates(name, vendors) {
    const similar = findSimilarVendors(name, vendors, 0.8);

    if (similar.length > 0) {
        return {
            isDuplicate: true,
            suggestions: similar.map(s => ({
                name: s.vendor.name,
                similarity: Math.round(s.similarity * 100) + '%',
                id: s.vendor.id
            }))
        };
    }

    return { isDuplicate: false, suggestions: [] };
}

// Normalize vendor name (clean up common variations)
function normalizeVendorName(name) {
    return name
        .trim()
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/\b(inc|llc|ltd|corp|co)\b\.?/gi, '') // Remove common suffixes
        .trim();
}

// Export functions
if (typeof window !== 'undefined') {
    window.VendorMatcher = {
        calculateSimilarity,
        findSimilarVendors,
        suggestCategory,
        checkForDuplicates,
        normalizeVendorName
    };
}

console.log('🎯 Vendor matcher utility loaded');
