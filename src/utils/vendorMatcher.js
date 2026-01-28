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
    if (str1 === str2) return 1.0;

    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
        return 1.0;
    }

    // Optimization: If length difference is too great, it can't possibly meet threshold
    // E.g. if threshold is 0.7, then shorter.length must be at least 0.7 * longer.length

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

// 5-Step Smart Categorization Logic
// 7-Step Smart Categorization Logic
// Now ASYNC to support AI calls
async function smartCategorize(description, vendors) {
    if (!description) return { vendorId: null, accountId: '9970', vendorName: 'Review Required', isNew: true, confidence: 0 };

    const cleanDesc = normalizeVendorName(description).toUpperCase();

    // --- STEP 1: Exact Dictionary Match ---
    let match = vendors.find(v => normalizeVendorName(v.name).toUpperCase() === cleanDesc);
    if (match) {
        return {
            vendorId: match.id,
            vendorName: match.name,
            accountId: match.defaultAccountId || '9970',
            isNew: false,
            confidence: 1.0,
            method: 'Exact Match'
        };
    }

    // --- STEP 2: Fuzzy Levenshtein Match ---
    const similar = findSimilarVendors(cleanDesc, vendors, 0.85);
    if (similar.length > 0) {
        match = similar[0].vendor;
        return {
            vendorId: match.id,
            vendorName: match.name,
            accountId: match.defaultAccountId || '9970',
            isNew: false,
            confidence: 0.9,
            method: 'Fuzzy Match'
        };
    }

    // --- STEP 3: Keyword/MCC Pattern Match (Dictionary First) ---
    // PRIORITIZE: User's custom vendor dictionary keyword rules
    const suggestedCategory = suggestCategory(cleanDesc);
    const coa = JSON.parse(localStorage.getItem('ab_accounts') || '[]');

    // Dynamic lookup: Try to find an account that matches the suggested category name
    let categoryAccount = coa.find(a => a.name.toUpperCase() === suggestedCategory.toUpperCase());

    // Fallback mapping for common categories if dynamic lookup fails
    if (!categoryAccount) {
        const categoryAccountMap = {
            'Utilities': coa.find(a => a.code.startsWith('68'))?.code || '6800',
            'Office Supplies': coa.find(a => a.code.startsWith('67'))?.code || '6700',
            'Meals & Entertainment': coa.find(a => a.code.startsWith('63'))?.code || '6300',
            'Travel': coa.find(a => a.code.startsWith('66'))?.code || '6600',
            'Vehicle': coa.find(a => a.code.startsWith('64'))?.code || '6400',
            'Insurance': coa.find(a => a.code.startsWith('65'))?.code || '6500',
            'Professional Services': coa.find(a => a.code.startsWith('69'))?.code || '6900',
            'Software': coa.find(a => a.code.startsWith('67'))?.code || '6700'
        };
        const fallbackCode = suggestedCategory && categoryAccountMap[suggestedCategory];
        if (fallbackCode) categoryAccount = { code: fallbackCode };
    }

    if (suggestedCategory && categoryAccount) {
        const proposedName = cleanDesc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        return {
            vendorId: null,
            vendorName: proposedName,
            accountId: categoryAccount.code,
            isNew: true,
            confidence: 0.8,
            method: 'Keyword Pattern'
        };
    }

    // --- STEP 4: Historical Memory (User Corrections) ---
    // (Future: Query Brain/History)

    // --- STEP 5: Recurring Pattern Recognition ---
    // (Future: Identify frequent identical amounts/descriptions)

    // --- STEP 6: Amount-Based Heuristics ---
    // E.g. Exact $15.00 might be bank fee? Skipped for safety.

    // --- STEP 7: Google AI (Gemini) ---
    // High-certainty fallback using LLM
    if (window.GoogleAICategorizer) {
        try {
            // Construct a mini-transaction object for the AI
            const aiResult = await window.GoogleAICategorizer.categorize({
                description: description,
                amount: 0 // Amount not strictly needed for category, but helpful context if avail
            });

            if (aiResult && aiResult.account) {
                const proposedName = cleanDesc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
                return {
                    vendorId: null,
                    vendorName: proposedName,
                    accountId: aiResult.account,
                    isNew: true,
                    confidence: 0.95,
                    method: 'Google AI'
                };
            }
        } catch (e) {
            console.warn('AI Categorization failed:', e);
        }
    }

    // --- FALLBACK: FORCED CATEGORIZATION ---
    // Ensure we never return null/empty. Force to "Suspense" (9970)
    const fallbackName = cleanDesc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    const finalResult = {
        vendorId: null,
        accountId: '9970', // Automated Suspense / Review Required
        vendorName: fallbackName,
        isNew: true,
        confidence: 0,
        method: 'Forced Fallback'
    };

    return finalResult;
}

// Normalize vendor name (clean up common variations)
function normalizeVendorName(name) {
    if (!name) return '';
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
        normalizeVendorName,
        smartCategorize
    };
}

// console.log('🎯 Vendor matcher utility loaded');
