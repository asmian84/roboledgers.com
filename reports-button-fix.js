// Reports Button - Wire to Visual Report Builder
// Visual Report Builder IS the new Reports Modal

(function () {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', wireReportsButton);
    } else {
        wireReportsButton();
    }

    function wireReportsButton() {
        console.log('🔧 Wiring Reports button to Visual Report Builder...');

        const reportsBtn = document.getElementById('reportsBtn');
        if (!reportsBtn) {
            console.warn('⚠️ Reports button not found');
            return;
        }

        // Clone button to remove all existing listeners
        const cleanBtn = reportsBtn.cloneNode(true);
        reportsBtn.parentNode.replaceChild(cleanBtn, reportsBtn);

        // Wire to Visual Report Builder
        cleanBtn.addEventListener('click', () => {
            console.log('📊 Opening Visual Report Builder...');
            const modal = document.getElementById('visualReportBuilderModal');
            if (modal) {
                modal.classList.add('active');
            } else {
                console.error('❌ Visual Report Builder modal not found!');
            }
        });

        console.log('✅ Reports button wired successfully');
    }
})();
