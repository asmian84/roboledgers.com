// ULTRA-AGGRESSIVE MERCHANT DATABASE CLEANUP v2
// Integrated with Merchant Categorizer v4

window.nukeAndClean = async function () {
    if (!confirm('🚀 DATABASE OPTIMIZATION\n\nThis will:\n1. Backup current data\n2. Re-clean ALL merchants using v4 protocol (Stripping store #s, FX, locations)\n3. Delete ALL garbage (bank noise, too short, ignored)\n4. Deduplicate (7-Eleven, Amazon, etc.)\n\nProceed?')) return;

    console.log('🏁 Starting Database Optimization...\n');
    console.log('═'.repeat(60));

    // STEP 1: Backup
    console.log('\n📦 STEP 1/4: Creating backup...');
    await backupVendors();

    // STEP 2: Re-categorize/Clean
    console.log('\n🏭 STEP 2/4: Applying v4 Cleaning Protocol...');
    await applyV4Cleaning();

    // STEP 3: Remove garbage
    console.log('\n🧹 STEP 3/4: Removing garbage...');
    await removeGarbage();

    // STEP 4: Deduplicate
    console.log('\n🔄 STEP 4/4: Deduplicating remains...');
    await smartDeduplicate();

    console.log('\n' + '═'.repeat(60));
    console.log('✅ OPTIMIZATION COMPLETE!\n');

    if (window.showToast) {
        window.showToast('Dictionary Optimized! Refresh to see results.', 'success');
    }
};

// Apply v4 Cleaning Protocol to every merchant in DB
async function applyV4Cleaning() {
    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }

    const all = await window.merchantDictionary.getAllMerchants();
    console.log(`   Processing ${all.length} merchants...`);

    let changed = 0;
    for (let i = 0; i < all.length; i++) {
        const m = all[i];
        const result = window.merchantCategorizer.cleanTransaction(m.display_name);

        // Update merchant data
        m.display_name = result.clean_name;
        m.industry = result.industry;
        m.default_account = result.default_account;
        m.default_category = result.default_category;
        m.categorization_confidence = result.confidence;
        m.clean_status = result.status || 'valid'; // Default to valid if status is missing

        // Persist to IndexedDB
        await window.merchantDictionary.saveMerchant(m);

        if (i % 500 === 0 && i > 0) console.log(`   Progress: ${i}/${all.length}...`);
        changed++;
    }

    await window.merchantDictionary.init(); // Reload memory
    console.log(`   ✓ Applied cleaning rules to ${changed} merchants`);
}

// Remove garbage entries (including those flagged by v4)
async function removeGarbage() {
    const all = await window.merchantDictionary.getAllMerchants();
    const toDelete = [];

    for (const m of all) {
        // v4 'ignore' status covers bank noise, too short, etc.
        if (m.clean_status === 'ignore' || m.display_name.includes('[IGNORE]')) {
            toDelete.push(m.id);
        }
    }

    console.log(`   Found ${toDelete.length} entries to drop`);

    for (let i = 0; i < toDelete.length; i++) {
        await window.merchantDictionary.deleteMerchant(toDelete[i]);
        if (i % 500 === 0 && i > 0) console.log(`   Progress: ${i}/${toDelete.length} deleted...`);
    }

    await window.merchantDictionary.init();
    console.log(`   ✓ Deleted ${toDelete.length} garbage entries`);
}

// Smart deduplication based on canonical names
async function smartDeduplicate() {
    const all = await window.merchantDictionary.getAllMerchants();
    const groups = fuzzyGroup(all);

    console.log(`   Grouped ${all.length} merchants into ${groups.length} unique vendors`);

    let removed = 0;
    const toDelete = [];

    for (const group of groups) {
        if (group.variations.length === 1) continue;

        // Keep the best one (prefer non-Miscellaneous if possible)
        group.variations.sort((a, b) => {
            if (a.industry !== 'Miscellaneous' && b.industry === 'Miscellaneous') return -1;
            if (a.industry === 'Miscellaneous' && b.industry !== 'Miscellaneous') return 1;
            return (b.categorization_confidence || 0) - (a.categorization_confidence || 0);
        });

        // Delete others
        group.variations.slice(1).forEach(v => toDelete.push(v.id));
        removed += group.variations.length - 1;
    }

    for (let i = 0; i < toDelete.length; i++) {
        await window.merchantDictionary.deleteMerchant(toDelete[i]);
        if (i % 500 === 0 && i > 0) console.log(`   Progress: ${i}/${toDelete.length} removed...`);
    }

    await window.merchantDictionary.init();
    console.log(`   ✓ Removed ${removed} duplicates`);
}

// Fuzzy grouping with higher sensitivity
function fuzzyGroup(merchants) {
    const groups = [];
    const processed = new Set();

    for (const m of merchants) {
        if (processed.has(m.id)) continue;

        const name = (m.display_name || '').trim().toUpperCase();
        if (!name) continue;

        const similar = merchants.filter(x => {
            if (processed.has(x.id)) return false;
            const xName = (x.display_name || '').trim().toUpperCase();
            return isSimilar(name, xName);
        });

        similar.forEach(x => processed.add(x.id));

        groups.push({
            canonical: similar[0].display_name,
            variations: similar
        });
    }

    return groups;
}

function isSimilar(a, b) {
    if (a === b) return true;

    // Aggressive normalization: Strip all non-letters to catch store/ID variations
    const norm1 = a.replace(/[^A-Z]/g, '');
    const norm2 = b.replace(/[^A-Z]/g, '');

    if (norm1 === norm2 && norm1.length > 3) return true;

    // Substring match
    if (norm1.length > 5 && norm2.length > 5) {
        if (norm1.includes(norm2) || norm2.includes(norm1)) return true;
    }

    return false;
}

// Backup logic (unchanged)
async function backupVendors() {
    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }
    const all = await window.merchantDictionary.getAllMerchants();
    const backup = { backup_date: new Date().toISOString(), total_merchants: all.length, merchants: all };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `merchant_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log(`   ✓ Backed up ${all.length} merchants`);
}

console.log('💡 Database Cleanup Tools Loaded');
// console.log('   Run: nukeAndClean()');
