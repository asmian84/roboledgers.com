/**
 * FRAPPE LAYOUT NAVIGATION CONTROLLER
 * Handles sidebar navigation, section switching, and interactions
 */

class NavigationController {
    constructor() {
        this.currentSection = 'transactionSection';
        this.init();
    }

    init() {
        this.setupSidebarNavigation();
        this.setupSidebarToggle();
        this.setupSearchShortcut();
        this.setupThemeToggle();
        this.restoreLastSection();
    }

    /**
     * Setup sidebar navigation item clicks
     */
    setupSidebarNavigation() {
        // Handle navigation items with data-target (page sections)
        document.querySelectorAll('.nav-item[data-target]').forEach(item => {
            item.addEventListener('click', (e) => {
                const targetId = item.dataset.target;
                this.switchToSection(targetId);

                // Update active state
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');

                // Save to localStorage
                localStorage.setItem('lastActiveSection', targetId);
            });
        });

        // Handle navigation items with data-action (modal triggers)
        document.querySelectorAll('.nav-item[data-action]').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                this.handleAction(action);
            });
        });
    }

    /**
     * Switch between different sections
     */
    switchToSection(targetId) {
        console.log('Switching to section:', targetId);

        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(targetId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = targetId;
        } else {
            console.error('Section not found:', targetId);
        }
    }

    /**
     * Handle navigation actions (open modals, external links, etc.)
     */
    handleAction(action) {
        console.log('Handling action:', action);

        switch (action) {
            case 'open-reports':
                const reportsBtn = document.getElementById('reportsBtn');
                if (reportsBtn) reportsBtn.click();
                break;

            case 'open-settings':
                const settingsBtn = document.getElementById('settingsBtn');
                if (settingsBtn) settingsBtn.click();
                break;

            case 'open-roadmap':
                window.location.href = 'roadmap.html';
                break;

            default:
                console.warn('Unknown action:', action);
        }
    }

    /**
     * Setup sidebar collapse/expand toggle
     */
    setupSidebarToggle() {
        const toggleBtn = document.getElementById('sidebarToggleBtn');
        const sidebar = document.querySelector('.sidebar');

        if (toggleBtn && sidebar) {
            toggleBtn.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');

                // Save state
                const isCollapsed = sidebar.classList.contains('collapsed');
                localStorage.setItem('sidebarCollapsed', isCollapsed);

                // Update icon
                toggleBtn.textContent = isCollapsed ? '→' : '←';
            });

            // Restore collapsed state
            const wasCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
            if (wasCollapsed) {
                sidebar.classList.add('collapsed');
                toggleBtn.textContent = '→';
            }
        }
    }

    /**
     * Setup Ctrl+K search shortcut
     */
    setupSearchShortcut() {
        const searchInput = document.querySelector('.search-input');

        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                if (searchInput) {
                    searchInput.focus();
                    searchInput.select();
                }
            }
        });

        // Search functionality (basic filtering)
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const query = e.target.value.toLowerCase();
                this.filterNavItems(query);
            });
        }
    }

    /**
     * Filter navigation items based on search query
     */
    filterNavItems(query) {
        if (!query) {
            // Show all items
            document.querySelectorAll('.nav-item').forEach(item => {
                item.style.display = 'flex';
            });
            document.querySelectorAll('.nav-section').forEach(section => {
                section.style.display = 'block';
            });
            return;
        }

        // Filter items
        document.querySelectorAll('.nav-item').forEach(item => {
            const label = item.querySelector('.nav-label')?.textContent.toLowerCase() || '';
            const matches = label.includes(query);
            item.style.display = matches ? 'flex' : 'none';
        });

        // Hide empty sections
        document.querySelectorAll('.nav-section').forEach(section => {
            const visibleItems = section.querySelectorAll('.nav-item[style*="display: flex"]');
            section.style.display = visibleItems.length > 0 ? 'block' : 'none';
        });
    }

    /**
     * Setup theme toggle in topbar
     */
    setupThemeToggle() {
        const themeToggleBtn = document.querySelector('.action-btn.theme-toggle');

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                // Trigger existing theme modal
                const settingsBtn = document.getElementById('settingsBtn');
                if (settingsBtn) {
                    settingsBtn.click();

                    // Wait for modal to open, then switch to appearance tab
                    setTimeout(() => {
                        const appearanceTab = document.querySelector('.tab-btn[data-tab="appearance"]');
                        if (appearanceTab) appearanceTab.click();
                    }, 100);
                }
            });
        }
    }

    /**
     * Restore last active section on page load
     */
    restoreLastSection() {
        const lastSection = localStorage.getItem('lastActiveSection');

        if (lastSection && document.getElementById(lastSection)) {
            this.switchToSection(lastSection);

            // Update nav active state
            const navItem = document.querySelector(`.nav-item[data-target="${lastSection}"]`);
            if (navItem) {
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                navItem.classList.add('active');
            }
        } else {
            // Default to transaction section
            this.switchToSection('transactionSection');
            const navItem = document.querySelector('.nav-item[data-target="transactionSection"]');
            if (navItem) navItem.classList.add('active');
        }
    }

    /**
     * Navigate to specific section (public API)
     */
    navigateTo(sectionId) {
        this.switchToSection(sectionId);

        const navItem = document.querySelector(`.nav-item[data-target="${sectionId}"]`);
        if (navItem) {
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            navItem.classList.add('active');
        }
    }
}

// Initialize navigation when DOM is ready
let navigationController;

document.addEventListener('DOMContentLoaded', () => {
    console.log('Initializing Frappe Navigation Controller...');
    navigationController = new NavigationController();
});

// Mobile sidebar toggle (for responsive design)
function toggleMobileSidebar() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        sidebar.classList.toggle('mobile-open');
    }
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NavigationController;
}
