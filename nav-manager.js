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
        // 1. Hide all sections
        document.querySelectorAll('main .section').forEach(el => el.classList.remove('active'));

        // 2. Show target section
        const target = document.getElementById(sectionId);
        if (target) {
            target.classList.add('active');
            // Update Title
            const title = document.getElementById('pageTitle');
            if (title) title.innerText = activeLinkElement.innerText.trim();
        }

        // 3. Update Sidebar Active State
        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        if (activeLinkElement) activeLinkElement.classList.add('active');

        // 4. Close Modals (if any were open)
        // document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
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
