/**
 * Nav Manager
 * Handles switching between Sidebar sections.
 */
window.NavManager = {
    initialize() {
        console.log('🧭 Initializing Navigation...');
        this.setupListeners();
        this.restoreState();
    },

    setupListeners() {
        const navItems = document.querySelectorAll('.nav-item, .nav-item-footer');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.getAttribute('data-target');
                if (targetId) {
                    this.switchSection(targetId, item);
                } else {
                    // Handle special buttons like "Vendors" if they are modals
                    if (item.id === 'navVendors') this.openVendors();
                    if (item.id === 'navReports') this.openReports();
                }
            });
        });
    },

    switchSection(sectionId, activeLinkElement) {
        // 1. App.js handles the heavy lifting (logic initialization)
        const coreSectionName = sectionId.replace('Section', '');

        // This bridge ensures that if App.js has specialized logic (like loadReviewSection), it gets triggered
        if (window.App && typeof App.showSection === 'function') {
            App.showSection(coreSectionName);
        }

        // 2. UI Update (Sidebar Active State)
        document.querySelectorAll('.nav-item, .nav-item-footer').forEach(el => el.classList.remove('active'));
        if (activeLinkElement) activeLinkElement.classList.add('active');

        // 3. Fallback: If App.js didn't handle the DOM visibility (unlikely), NavManager ensures it
        document.querySelectorAll('main .section').forEach(el => el.classList.remove('active'));
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active');
            target.style.display = 'block';

            // Update Title
            const title = document.getElementById('pageTitle');
            if (title && activeLinkElement) title.innerText = activeLinkElement.innerText.trim();
        }
    },

    openVendors() {
        // Reuse existing modal logic
        const modal = document.getElementById('vendorModal');
        if (modal) {
            modal.style.display = 'flex';
            if (window.VendorManager) VendorManager.renderGrid();
        }
    },

    openReports() {
        const modal = document.getElementById('reportsModal');
        if (modal) modal.style.display = 'flex';
    },

    restoreState() {
        // Default to Dashboard
        // const dashBtn = document.getElementById('navDashboard');
        // if (dashBtn) dashBtn.click();
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NavManager.initialize();
});
