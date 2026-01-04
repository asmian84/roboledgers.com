// Bulk delete selected vendors
window.deleteSelectedVendors = async function () {
    if (!window.vendorsGridApi) {
        alert('Grid not ready');
        return;
    }

    const selected = window.vendorsGridApi.getSelectedRows();

    if (selected.length === 0) {
        alert('No vendors selected');
        return;
    }

    if (!confirm(`⚠️ DELETE ${selected.length} MERCHANTS?\n\nThis will permanently delete:\n${selected.slice(0, 5).map(v => `- ${v.display_name}`).join('\n')}${selected.length > 5 ? `\n... and ${selected.length - 5} more` : ''}\n\nProceed?`)) {
        return;
    }

    console.log(`🗑️ Deleting ${selected.length} merchants...`);

    // Delete from IndexedDB
    if (!window.merchantDictionary || !window.merchantDictionary.isInitialized) {
        await window.merchantDictionary.init();
    }

    for (let i = 0; i < selected.length; i++) {
        await window.merchantDictionary.deleteMerchant(selected[i].id);

        if (i % 10 === 0 && i > 0) {
            console.log(`   Progress: ${i}/${selected.length} deleted...`);
        }
    }

    console.log(`✅ Deleted ${selected.length} merchants`);

    if (window.showToast) {
        window.showToast(`Deleted ${selected.length} merchants`, 'success');
    }

    // Refresh grid
    await window.merchantDictionary.init();
    window.initVendorsGrid();
};
