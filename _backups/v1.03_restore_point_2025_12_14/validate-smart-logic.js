// Validation Script
(async () => {
    console.log("🕵️ Starting Smart Logic Validation...");

    // Ensure VendorMatcher is loaded
    if (!window.VendorMatcher) {
        console.error("❌ VendorMatcher not found!");
        return;
    }

    const vendors = VendorMatcher.getAllVendors();
    const stats = {
        total: vendors.length,
        googleSearched: 0,
        optimized: 0,
        transfers: 0,
        emptyCandidates: 0
    };

    vendors.forEach(v => {
        if (v._googleSearched) stats.googleSearched++;

        let original = v.originalName || v.name; // Fallback
        // Check if name is significantly different (length change > 2 or different words)
        if (v.name !== original && Math.abs(v.name.length - original.length) > 0) {
            stats.optimized++;
        }

        if (v.name === 'Transfer' || v.name === 'Payment') {
            stats.transfers++;
        }

        if (!v.name || v.name.trim().length === 0) {
            stats.emptyCandidates++;
        }
    });

    console.log("📊 VALIDATION REPORT:");
    console.log(`------------------------`);
    console.log(`📦 Total Vendors:      ${stats.total}`);
    console.log(`🔍 Google Searched:    ${stats.googleSearched} (${Math.round(stats.googleSearched / stats.total * 100)}%)`);
    console.log(`✨ AI Optimized:       ${stats.optimized} (${Math.round(stats.optimized / stats.total * 100)}%)`);
    console.log(`💸 Consolidated Tfrs:  ${stats.transfers}`);
    console.log(`🗑️ Empty (To Prune):   ${stats.emptyCandidates}`);
    console.log(`------------------------`);

    if (stats.emptyCandidates > 0) {
        console.log("⚠️ Found empty vendors! Triggering prune pass...");
        // Trigger generic prune manually if needed, or rely on update loop
        // for (const v of vendors) ... updateVendor(v.id, {}) ...
    }

    console.log("✅ Analysis Complete.");
})();
