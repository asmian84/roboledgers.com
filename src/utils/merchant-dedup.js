// Smart Merchant Deduplication with Fuzzy Matching & Pattern Learning
// Finds ALL variations of merchants, learns patterns, then consolidates

// Backup current merchant list
window.backupVendors = async function () {
    console.log('💾 Creating backup...');

    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }

    const all = await window.merchantDictionary.getAllMerchants();
    const backup = {
        backup_date: new Date().toISOString(),
        total_merchants: all.length,
        merchants: all
    };

    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    console.log(`✅ Backed up ${all.length} merchants`);
    return backup;
};

// Smart deduplication with fuzzy matching
window.deduplicateVendors = async function () {
    if (!confirm('SMART FUZZY DEDUPLICATION\n\n1. Find ALL variations of each merchant\n2. Learn patterns from variations\n3. Keep BEST entry per merchant\n4. Delete ALL duplicates/variations\n\nExample: "AIR CAN*", "AIR CANADA", "AIR CAN* BOOKING" → 1 entry\n\nProceed?')) return;

    console.log('🧠 Smart fuzzy deduplication starting...\n');

    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }

    const all = await window.merchantDictionary.getAllMerchants();
    console.log(`📊 Starting with ${all.length} merchants\n`);

    // FUZZY GROUPING: Find all variations of each merchant
    const groups = fuzzyGroupMerchants(all);
    console.log(`📑 Fuzzy grouped into ${groups.length} unique merchants\n`);

    // LEARNING PHASE: Extract patterns from variations
    const learnedPatterns = [];

    for (const group of groups) {
        if (group.variations.length <= 1) continue;

        const allVariations = group.variations
            .map(v => v.original_name || v.display_name)
            .filter((v, i, arr) => arr.indexOf(v) === i);

        const core = extractCore(allVariations);

        if (core && core.length >= 3) {
            learnedPatterns.push({
                pattern: core.toLowerCase(),
                canonical: group.canonical,
                industry: group.best.industry || 'Miscellaneous',
                category: group.best.default_category || 'Miscellaneous',
                total_variations: group.variations.length,
                examples: allVariations.slice(0, 5).join(', ')
            });

            console.log(`📚 "${core}" → "${group.canonical}" (${group.variations.length} variations)`);
        }
    }

    if (learnedPatterns.length > 0) {
        console.log(`\n✨ Learned ${learnedPatterns.length} patterns:`);

        // Save to localStorage for review
        localStorage.setItem('ab3_learned_patterns', JSON.stringify(learnedPatterns, null, 2));
        console.log(`💾 Saved to localStorage (ab3_learned_patterns) for manual review\n`);
    }

    // DEDUPLICATION PHASE: Delete all but best
    let totalRemoved = 0;
    const toDelete = [];

    for (const group of groups) {
        if (group.variations.length === 1) continue;

        // Delete all except the best
        group.variations.slice(1).forEach(v => {
            toDelete.push(v.id);
        });

        totalRemoved += group.variations.length - 1;
        console.log(`🗑️ "${group.canonical}": keeping 1, removing ${group.variations.length - 1} variations`);
    }

    // Execute deletions
    if (toDelete.length > 0) {
        console.log(`\n🗑️ Deleting ${toDelete.length} entries...`);

        for (let i = 0; i < toDelete.length; i++) {
            await window.merchantDictionary.deleteMerchant(toDelete[i]);

            if (i % 100 === 0 && i > 0) {
                console.log(`   Progress: ${i}/${toDelete.length} deleted...`);
            }
        }

        await window.merchantDictionary.init();

        console.log(`\n✅ SMART DEDUPLICATION COMPLETE!`);
        console.log(`   Started: ${all.length} merchants`);
        console.log(`   Learned: ${learnedPatterns.length} patterns`);
        console.log(`   Removed: ${totalRemoved} duplicates`);
        console.log(`   Final: ${all.length - totalRemoved} unique merchants`);

        if (window.showToast) {
            window.showToast(`Learned ${learnedPatterns.length} patterns, removed ${totalRemoved} duplicates!`, 'success');
        }

        if (window.initVendorsGrid) window.initVendorsGrid();
    } else {
        console.log('✅ No duplicates found!');
    }
};

// Fuzzy group merchants by similarity
function fuzzyGroupMerchants(merchants) {
    const groups = [];
    const processed = new Set();

    for (const merchant of merchants) {
        if (processed.has(merchant.id)) continue;

        const name = (merchant.display_name || '').trim().toUpperCase();
        if (!name) continue;

        // Find all similar merchants
        const similar = merchants.filter(m => {
            if (processed.has(m.id)) return false;
            const mName = (m.display_name || '').trim().toUpperCase();
            return areSimilar(name, mName);
        });

        // Sort by best quality (industry > category > confidence)
        similar.sort((a, b) => {
            if (a.industry && !b.industry) return -1;
            if (!a.industry && b.industry) return 1;
            if (a.default_category && !b.default_category) return -1;
            if (!a.default_category && b.default_category) return 1;
            return (b.categorization_confidence || 0) - (a.categorization_confidence || 0);
        });

        // Mark as processed
        similar.forEach(m => processed.add(m.id));

        groups.push({
            canonical: similar[0].display_name,
            best: similar[0],
            variations: similar
        });
    }

    return groups;
}

// Check if two merchant names are similar (fuzzy match)
function areSimilar(name1, name2) {
    if (name1 === name2) return true;

    // Remove common suffixes/prefixes for comparison
    const clean1 = cleanForComparison(name1);
    const clean2 = cleanForComparison(name2);

    // Exact match after cleaning
    if (clean1 === clean2) return true;

    // One contains the other (and core is significant)
    if (clean1.length >= 5 && clean2.length >= 5) {
        if (clean1.includes(clean2) || clean2.includes(clean1)) return true;
    }

    // Levenshtein distance (for very close matches)
    if (Math.abs(clean1.length - clean2.length) <= 3) {
        const distance = levenshtein(clean1, clean2);
        const maxLen = Math.max(clean1.length, clean2.length);
        const similarity = 1 - (distance / maxLen);
        if (similarity >= 0.85) return true;
    }

    return false;
}

// Clean name for comparison
function cleanForComparison(name) {
    return name
        .replace(/[\*\#\-\.\,]/g, ' ') // Remove special chars
        .replace(/\s+/g, ' ') // Normalize spaces
        .replace(/\b(INC|LTD|LLC|CORP|CO)\b/g, '') // Remove company suffixes
        .trim();
}

// Extract common core from variations
function extractCore(variations) {
    if (!variations || variations.length === 0) return '';

    const upper = variations.map(s => s.toUpperCase().trim());
    let core = upper[0];

    // Find longest common substring
    while (core.length >= 3) {
        const cleaned = cleanForComparison(core);
        if (upper.every(s => cleanForComparison(s).includes(cleaned))) {
            return cleaned.trim();
        }
        core = core.slice(0, -1);
    }

    return '';
}

// Levenshtein distance (edit distance between two strings)
function levenshtein(a, b) {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }

    return matrix[b.length][a.length];
}

console.log('💡 Smart Deduplication Tools Loaded!');
console.log('   backupVendors() - Create backup JSON');
console.log('   deduplicateVendors() - Smart fuzzy dedup with pattern learning');
