// Reports Button Fix - Removes old "coming soon" listener and adds modal handler
// This script runs AFTER app.js to override the Reports button

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

        // Add the CORRECT listener (open Reports modal)
        cleanBtn.addEventListener('click', () => {
            console.log('📊 Reports button clicked - opening modal');
            const modal = document.getElementById('reportsModal');
            if (modal) {
                modal.classList.add('active');

                // Set default end date
                const yearEndDate = localStorage.getItem('yearEndDate');
                const endDateInput = document.getElementById('reportEndDate');
                if (endDateInput) {
                    if (yearEndDate) {
                        endDateInput.value = yearEndDate.split('T')[0];
                    } else {
                        endDateInput.value = new Date().toISOString().split('T')[0];
                    }
                }
            } else {
                console.error('reportsModal not found in DOM');
            }
        });

        console.log('✅ Reports button fixed - modal listener added');
    }
})();
