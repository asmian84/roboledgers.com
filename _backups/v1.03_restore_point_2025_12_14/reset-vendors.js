// Emergency Vendor Reset Script
// Run this in console to clear all vendor cache

function resetAllVendors() {
    console.log('🔥 RESETTING ALL VENDORS...');

    // Clear vendor cache
    localStorage.removeItem('autobookkeeping_vendors');
    localStorage.removeItem('vendors'); // old key

    console.log('✅ Vendor cache cleared');
    console.log('💡 Now refresh the page and run AI Re-think');

    alert('✅ Vendor cache cleared!\n\nRefresh the page (Ctrl+Shift+R) and run AI Re-think to rebuild vendors with correct accounts.');
}

// Auto-run
resetAllVendors();
