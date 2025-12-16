/**
 * Modal Controller Base Class
 * Parent template for all modal controllers in the application
 * 
 * Usage:
 * class MyModalController extends ModalController {
 *     constructor() {
 *         super('myModalId');
 *     }
 *     
 *     onShown() {
 *         // Custom logic when modal opens
 *     }
 *     
 *     onClosed() {
 *         // Custom logic when modal closes
 *     }
 * }
 */

class ModalController {
    constructor(modalId) {
        this.modalId = modalId;
        this.modal = null;
        this.isInitialized = false;
    }

    /**
     * Initialize the modal - fetch DOM references and bind events
     * Call this once on app startup
     */
    initialize() {
        this.modal = document.getElementById(this.modalId);

        if (!this.modal) {
            console.warn(`ModalController: Modal with ID "${this.modalId}" not found`);
            return false;
        }

        this.bindCloseEvents();
        this.isInitialized = true;

        console.log(`✅ ModalController: ${this.modalId} initialized`);
        return true;
    }

    /**
     * Bind standard close events (X button, backdrop click, Escape key)
     */
    bindCloseEvents() {
        if (!this.modal) return;

        // Find close button(s)
        const closeButtons = this.modal.querySelectorAll('.modal-close');
        closeButtons.forEach(btn => {
            btn.addEventListener('click', () => this.close());
        });

        // Close on backdrop click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on Escape key (global listener)
        if (!ModalController.escapeListenerBound) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    const activeModal = document.querySelector('.modal.active');
                    if (activeModal) {
                        const modalId = activeModal.id;
                        // Find controller instance and close
                        ModalController.closeActiveModal();
                    }
                }
            });
            ModalController.escapeListenerBound = true;
        }
    }

    /**
     * Show the modal
     */
    show() {
        if (!this.modal) {
            console.error(`Cannot show modal - ${this.modalId} not initialized`);
            return;
        }

        // Use ModalManager if available for centralized control
        if (window.ModalManager) {
            ModalManager.open(this.modalId);
        } else {
            // Fallback: direct show
            this.modal.classList.add('active');
        }

        // Call lifecycle hook
        this.onShown();
    }

    /**
     * Close the modal
     */
    close() {
        if (!this.modal) return;

        // Use ModalManager if available
        if (window.ModalManager) {
            ModalManager.close(this.modalId);
        } else {
            // Fallback: direct close
            this.modal.classList.remove('active');
        }

        // Call lifecycle hook
        this.onClosed();
    }

    /**
     * LIFECYCLE HOOK: Override in child classes
     * Called when modal is shown
     */
    onShown() {
        // Override in child classes
        console.log(`📋 Modal shown: ${this.modalId}`);
    }

    /**
     * LIFECYCLE HOOK: Override in child classes
     * Called when modal is closed
     */
    onClosed() {
        // Override in child classes
        console.log(`📋 Modal closed: ${this.modalId}`);
    }

    /**
     * Check if modal is currently visible
     */
    isVisible() {
        return this.modal && this.modal.classList.contains('active');
    }

    /**
     * Static helper: Close any active modal
     */
    static closeActiveModal() {
        const activeModal = document.querySelector('.modal.active');
        if (activeModal) {
            activeModal.classList.remove('active');
        }
    }
}

// Track if escape listener has been bound
ModalController.escapeListenerBound = false;

console.log('✅ ModalController base class loaded');
