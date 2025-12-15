// VendorGrid Compatibility Shim
// Maps missing VendorGrid calls to VendorSummaryGrid to fix reference errors
if (typeof window.VendorGrid === 'undefined' && typeof window.VendorSummaryGrid !== 'undefined') {
    console.warn('⚠️ VendorGrid not defined. Mapping to VendorSummaryGrid.');
    window.VendorGrid = window.VendorSummaryGrid;
}
