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
    if (!description) {
        return {
            vendorId: null,
            accountId: '9970',
            vendorName: 'Review Required',
            isNew: true,
            confidence: 0,
            method: 'Empty Description' // Fix log noise
        };
    }

    const cleanDesc = normalizeVendorName(description).toUpperCase();
    const rawDesc = description.trim();

    // --- STEP 1: Exact Canonical Match (Tier 1) ---
    // Fast check against main vendor names
    let match = vendors.find(v => normalizeVendorName(v.name).toUpperCase() === cleanDesc);
    if (match) {
        console.log(`[Matcher] Exact Match Found: ${match.name}`);
        return {
            vendorId: match.id,
            vendorName: match.name,
            accountId: match.defaultAccountId || '9970',
            isNew: false,
            confidence: 1.0,
            method: 'Exact Match'
        };
    }

    // --- STEP 2: Historical Pattern Match (Tier 4 - "The Brain") ---
    // Check known variations (e.g. "TIM HORTONS #123" -> "TIM HORTONS")
    // This uses the "Pristine Backup" style data
    for (const v of vendors) {
        if (v.description_patterns && Array.isArray(v.description_patterns)) {
            // Check raw examples first (Exact Hit)
            for (const p of v.description_patterns) {
                // Check if any raw example matches exactly
                if (p.raw_examples && p.raw_examples.includes(rawDesc)) {
                    return {
                        vendorId: v.id,
                        vendorName: v.name,
                        accountId: v.defaultAccountId || '9970',
                        isNew: false,
                        confidence: 1.0,
                        method: 'Historical Pattern (Exact)'
                    };
                }
                // Check normalized pattern
                if (p.normalized_pattern && cleanDesc.includes(p.normalized_pattern.toUpperCase())) {
                    return {
                        vendorId: v.id,
                        vendorName: v.name,
                        accountId: v.defaultAccountId || '9970',
                        isNew: false,
                        confidence: 0.95,
                        method: 'Historical Pattern (Partial)'
                    };
                }
            }
        }
    }

    // --- STEP 3: Fuzzy Levenshtein Match (Tier 2) ---
    const similar = findSimilarVendors(cleanDesc, vendors, 0.85);
    if (similar.length > 0) {
        match = similar[0].vendor;
        console.log(`[Matcher] Fuzzy Match Found: ${match.name} (Score: ${similar[0].similarity})`);
        return {
            vendorId: match.id,
            vendorName: match.name,
            accountId: match.defaultAccountId || '9970',
            isNew: false,
            confidence: 0.9,
            method: 'Fuzzy Match'
        };
    }

    // --- STEP 4: MCC/Keyword Rules (Tier 3) ---
    // Dictionary-first logic for categories
    const suggestedCategory = suggestCategory(cleanDesc);
    const coa = JSON.parse(localStorage.getItem('ab_accounts') || '[]');

    let categoryAccount = coa.find(a => a.name.toUpperCase() === suggestedCategory.toUpperCase());

    if (!categoryAccount && suggestedCategory) {
        console.log(`[Matcher] Keyword Inference: "${suggestedCategory}"`);
        const categoryAccountMap = {
            'Utilities': '6800',
            'Office Supplies': '6700',
            'Meals & Entertainment': '6300',
            'Travel': '6600',
            'Vehicle': '6400',
            'Insurance': '6500',
            'Professional Services': '6900',
            'Software': '6700'
        };
        const mappedCode = categoryAccountMap[suggestedCategory];
        // Find close match in COA or use generic code
        if (mappedCode) {
            const exist = coa.find(a => a.code.startsWith(mappedCode.substring(0, 2)));
            categoryAccount = exist ? exist : { code: mappedCode };
        }
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

    // --- STEP 5: Recurring Amount Heuristics (Tier 5) ---
    // (Reserved for Transaction History Analysis)

    // --- STEP 6: AI Inference (Tier 6 - Google Gemini) ---
    if (window.GoogleAICategorizer) {
        try {
            const aiResult = await window.GoogleAICategorizer.categorize({
                description: description,
                amount: 0
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

    // --- STEP 7: Forced Fallback (Tier 7) ---
    const fallbackName = cleanDesc.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

    return {
        vendorId: null,
        accountId: '9970', // Automated Suspense
        vendorName: fallbackName,
        isNew: true,
        confidence: 0,
        method: 'Forced Fallback'
    };
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
