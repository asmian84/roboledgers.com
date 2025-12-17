/**
 * ModalManager.js
 * Centralized logic for all application modals (Macro Container).
 * Handles Opening, Closing, Animations, ESC key, and Click Outside.
 */

window.ModalManager = {
    // Track active modals for stacking
    activeModals: [],

    initialize() {
        console.log('🏗️ ModalManager: Initializing...');

        // 1. Global Click Listener (Delegation)
        window.addEventListener('click', (e) => {
            // A. Close Button Click
            if (e.target.closest('.modal-close') || e.target.matches('.modal-close')) {
                const modal = e.target.closest('.modal');
                if (modal) {
                    this.close(modal.id);
                    e.stopPropagation(); // Prevent bubbling
                }
            }

            // B. Background Click (Outside Content)
            if (e.target.classList.contains('modal')) {
                // Only close if it's the top-most modal (optional, but good for stacking)
                // For now, simple standard: click background -> close.
                this.close(e.target.id);
            }
        });

        // 2. Global ESC Key Listener
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const visibleModals = this.getVisibleModals();
                if (visibleModals.length > 0) {
                    // Close the last one opened (top of stack)
                    const topModal = visibleModals[visibleModals.length - 1];
                    this.close(topModal.id);
                }
            }
        });

        console.log('✅ ModalManager: Listeners attached.');
    },

    /**
     * Open a modal by ID
     * @param {string} modalId 
     */
    open(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`❌ ModalManager: Modal #${modalId} not found.`);
            return;
        }

        // Apply display flex first to make it visible in DOM
        modal.style.display = 'flex';

        // Small delay to allow CSS transition to catch the "active" class
        requestAnimationFrame(() => {
            modal.classList.add('active');
        });

        // Track order (simple push)
        if (!this.activeModals.includes(modalId)) {
            this.activeModals.push(modalId);
        }

        console.log(`🔓 Opened modal: ${modalId}`);
    },

    /**
     * Close a modal by ID
     * @param {string} modalId 
     */
    close(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;

        // Start Animation Out
        modal.classList.remove('active');

        // Wait for transition to finish before hiding
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300); // Matches standard transition time (0.3s)

        // Update stack
        this.activeModals = this.activeModals.filter(id => id !== modalId);

        console.log(`🔒 Closed modal: ${modalId}`);
    },

    /**
     * Helper to get currently visible modals
     */
    getVisibleModals() {
        // Return Array of elements that are displayed
        return Array.from(document.querySelectorAll('.modal')).filter(m => {
            return window.getComputedStyle(m).display !== 'none';
        }); // Note: Z-index sort could be added here if needed
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ModalManager.initialize();
});
