// Aggressive Garbage Cleanup for Merchant Dictionary
// Removes junk entries directly from IndexedDB

window.cleanupGarbageFromDB = async function () {
    if (!confirm('⚠️ AGGRESSIVE GARBAGE CLEANUP\n\nThis will PERMANENTLY DELETE:\n- Excel formulas (COLUMN, $500.000)\n- Credit messages (REQUEST A CREDIT LINE)\n- URLs and receipts\n- Incomplete fragments\n- Pure numbers/dates\n- Entries starting with special chars\n\nProceed?')) return;

    console.log('🧹 Starting aggressive garbage cleanup...\n');

    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }

    const all = await window.merchantDictionary.getAllMerchants();
    console.log(`📊 Scanning ${all.length} merchants for garbage...\n`);

    const toDelete = [];

    for (const merchant of all) {
        const name = (merchant.display_name || '').trim();

        if (isGarbage(name)) {
            toDelete.push({
                id: merchant.id,
                name: name,
                reason: getGarbageReason(name)
            });
        }
    }

    if (toDelete.length === 0) {
        console.log('✅ No garbage found!');
        if (window.showToast) window.showToast('No garbage found!', 'success');
        return;
    }

    console.log(`🗑️ Found ${toDelete.length} garbage entries:\n`);

    // Group by reason for reporting
    const byReason = {};
    toDelete.forEach(item => {
        if (!byReason[item.reason]) byReason[item.reason] = [];
        byReason[item.reason].push(item.name);
    });

    for (const [reason, names] of Object.entries(byReason)) {
        console.log(`   ${reason}: ${names.length} entries`);
        if (names.length <= 5) {
            names.forEach(n => console.log(`      - "${n}"`));
        } else {
            names.slice(0, 3).forEach(n => console.log(`      - "${n}"`));
            console.log(`      ... and ${names.length - 3} more`);
        }
    }

    console.log(`\n🗑️ Deleting ${toDelete.length} garbage entries...`);

    for (let i = 0; i < toDelete.length; i++) {
        await window.merchantDictionary.deleteMerchant(toDelete[i].id);

        if (i % 50 === 0 && i > 0) {
            console.log(`   Progress: ${i}/${toDelete.length} deleted...`);
        }
    }

    await window.merchantDictionary.init();

    console.log(`\n✅ GARBAGE CLEANUP COMPLETE!`);
    console.log(`   Started: ${all.length} merchants`);
    console.log(`   Deleted: ${toDelete.length} garbage entries`);
    console.log(`   Remaining: ${all.length - toDelete.length} quality merchants`);

    if (window.showToast) {
        window.showToast(`Deleted ${toDelete.length} garbage entries!`, 'success');
    }

    if (window.initVendorsGrid) window.initVendorsGrid();
};

// Determine if a merchant name is garbage
function isGarbage(name) {
    if (!name || name.length < 2) return true;

    // Excel formulas and math
    if (/[\$\(\)\+\-\*\/\=]/.test(name) && /\d/.test(name)) return true;

    // Column references
    if (/COLUMN\s+[A-Z]/i.test(name)) return true;

    // Credit/banking messages
    if (/REQUEST A CREDIT|INCREASE|PAYMENT DUE|AMOUNT PAID|BALANCE/i.test(name)) return true;
    if (/ENTER AMOUNT|ON LINE|ON PAGE/i.test(name)) return true;

    // URLs and receipts
    if (/HTTPS?:\/\//i.test(name)) return true;
    if (/RECEIPT.*\.COM/i.test(name)) return true;

    // Starts with special characters
    if (/^[\(\)\[\]\{\}\<\>\.\,\;\:]/.test(name)) return true;

    // Pure numbers or pure dates
    if (/^\d+$/.test(name)) return true;
    if (/^\d{2,4}[\-\/\.]\d{1,2}/.test(name)) return true;

    // Starts with year or "20XX"
    if (/^(19|20)\d{2}\s/.test(name)) return true;

    // Fragments (too short and looks incomplete)
    if (name.length < 4 && /^[A-Z]{1,3}$/.test(name)) return true;

    // Common garbage patterns
    if (/^(AND|OR|THE|FOR|TO|FROM|AT|IN|ON|OF)\s/i.test(name)) return true;
    if (/^(DURING|YEAR|TAX|LINE|PAGE)\s/i.test(name)) return true;

    // Ends with incomplete words
    if (/\s(BEI|REI|INC|LI|CR)$/i.test(name) && name.length < 30) return true;

    // Contains more than 30% special characters
    const specialCount = (name.match(/[^a-zA-Z0-9\s]/g) || []).length;
    if (specialCount / name.length > 0.3) return true;

    return false;
}

// Get reason why entry is garbage (for reporting)
function getGarbageReason(name) {
    if (/COLUMN\s+[A-Z]/i.test(name)) return 'Excel formula';
    if (/REQUEST A CREDIT|INCREASE|PAYMENT DUE/i.test(name)) return 'Credit message';
    if (/ENTER AMOUNT|ON LINE|ON PAGE/i.test(name)) return 'Form instruction';
    if (/HTTPS?:\/\//i.test(name)) return 'URL/Receipt';
    if (/^[\(\)\[\]]/i.test(name)) return 'Starts with special char';
    if (/^\d+$/.test(name)) return 'Pure number';
    if (/^(19|20)\d{2}\s/.test(name)) return 'Date fragment';
    if (/^(AND|OR|THE|DURING|YEAR)/i.test(name)) return 'Text fragment';
    return 'Other garbage';
}

console.log('💡 Garbage Cleanup Tool Loaded!');
console.log('   cleanupGarbageFromDB() - Remove junk from IndexedDB');
