// Bulk Rename Selected Vendors
window.bulkRenameVendors = async function () {
    if (!window.vendorsGridApi) return;
    const selected = window.vendorsGridApi.getSelectedRows();
    if (selected.length === 0) return;

    const newName = prompt(`Enter new canonical name for ${selected.length} selected items:`, selected[0].display_name);
    if (!newName) return;

    console.log(`📝 Bulk Renaming ${selected.length} items to "${newName}"...`);

    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }

    for (const m of selected) {
        m.display_name = newName;
        await window.merchantDictionary.saveMerchant(m);
    }

    if (window.showToast) window.showToast(`Updated ${selected.length} merchants`, 'success');

    // Refresh
    await window.merchantDictionary.init();
    window.initVendorsGrid();
};

// Bulk Recategorize Selected Vendors
window.bulkRecategorizeVendors = async function () {
    if (!window.vendorsGridApi) return;
    const selected = window.vendorsGridApi.getSelectedRows();
    if (selected.length === 0) return;

    const newIndustry = prompt(`Enter new industry for ${selected.length} selected items:`, selected[0].industry);
    if (newIndustry === null) return;

    console.log(`🏷️ Bulk Recategorizing ${selected.length} items to "${newIndustry}"...`);

    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }

    for (const m of selected) {
        m.industry = newIndustry;
        // Optionally update default category based on industry if we had a mapping
        await window.merchantDictionary.saveMerchant(m);
    }

    if (window.showToast) window.showToast(`Updated ${selected.length} industries`, 'success');

    // Refresh
    await window.merchantDictionary.init();
    window.initVendorsGrid();
};
