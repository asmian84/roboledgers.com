// Reports Button Fix - Removes old "coming soon" listener
// This script runs AFTER app.js to clean up the Reports button

(function () {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixReportsButton);
    } else {
        fixReportsButton();
    }

    function fixReportsButton() {
        console.log('🔧 Fixing Reports button...');

        const reportsBtn = document.getElementById('reportsBtn');
        if (!reportsBtn) {
            console.warn('Reports button not found');
            return;
        }

        // Clone the button to remove ALL existing event listeners
        const cleanBtn = reportsBtn.cloneNode(true);
        reportsBtn.parentNode.replaceChild(cleanBtn, reportsBtn);

        console.log('✅ Reports button cleaned - old listeners removed');
    }
})();
