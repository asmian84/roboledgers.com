/**
 * Toast Notification Manager
 * success/error/warning/info toasts with auto-dismiss
 */

class ToastManager {
    constructor() {
        this.toasts = [];
        this.maxVisible = 3;
        this.container = null;
        this.nextId = 1;
        this.defaultDuration = 4000; // 4 seconds

        this.init();
    }

    init() {
        // Create toast container
        const containerHTML = `
      <div id="toastContainer" class="toast-container"></div>
    `;

        document.body.insertAdjacentHTML('beforeend', containerHTML);
        this.container = document.getElementById('toastContainer');

        console.log('🔔 Toast Manager loaded');
    }

    /**
     * Show a success toast
     */
    success(message, options = {}) {
        return this.show(message, 'success', options);
    }

    /**
     * Show an error toast
     */
    error(message, options = {}) {
        return this.show(message, 'error', options);
    }

    /**
     * Show a warning toast
     */
    warning(message, options = {}) {
        return this.show(message, 'warning', options);
    }

    /**
     * Show an info toast
     */
    info(message, options = {}) {
        return this.show(message, 'info', options);
    }

    /**
     * Show a toast notification
     * @param {string} message - Toast message
     * @param {string} type - success/error/warning/info
     * @param {Object} options - { duration, action, actionText }
     */
    show(message, type = 'info', options = {}) {
        const id = this.nextId++;
        const duration = options.duration !== undefined ? options.duration : this.defaultDuration;

        const toast = {
            id,
            message,
            type,
            duration,
            action: options.action,
            actionText: options.actionText || 'Action',
            createdAt: Date.now()
        };

        this.toasts.push(toast);
        this.render();

        // Auto-dismiss after duration (if duration > 0)
        if (duration > 0) {
            setTimeout(() => {
                this.dismiss(id);
            }, duration);
        }

        return id;
    }

    /**
     * Dismiss a specific toast
     */
    dismiss(id) {
        const index = this.toasts.findIndex(t => t.id === id);
        if (index === -1) return;

        // Get toast element
        const toastEl = this.container.querySelector(`[data-toast-id="${id}"]`);
        if (toastEl) {
            // Add exit animation
            toastEl.classList.add('toast-exit');

            // Remove after animation
            setTimeout(() => {
                this.toasts = this.toasts.filter(t => t.id !== id);
                this.render();
            }, 300);
        } else {
            this.toasts = this.toasts.filter(t => t.id !== id);
            this.render();
        }
    }

    /**
     * Dismiss all toasts
     */
    dismissAll() {
        const toastEls = this.container.querySelectorAll('.toast');
        toastEls.forEach(el => el.classList.add('toast-exit'));

        setTimeout(() => {
            this.toasts = [];
            this.render();
        }, 300);
    }

    /**
     * Render all toasts
     */
    render() {
        // Only show the most recent maxVisible toasts
        const visibleToasts = this.toasts.slice(-this.maxVisible);

        this.container.innerHTML = visibleToasts.map(toast => this.renderToast(toast)).join('');

        // Attach event listeners
        this.attachListeners();
    }

    /**
     * Render a single toast
     */
    renderToast(toast) {
        const icon = this.getIcon(toast.type);
        const color = this.getColor(toast.type);

        return `
      <div class="toast toast-${toast.type}" data-toast-id="${toast.id}" style="border-left-color: ${color};">
        <div class="toast-icon" style="color: ${color};">
          ${icon}
        </div>
        <div class="toast-content">
          <div class="toast-message">${this.escapeHtml(toast.message)}</div>
          ${toast.action ? `
            <button class="toast-action" data-toast-id="${toast.id}">
              ${toast.actionText}
            </button>
          ` : ''}
        </div>
        <button class="toast-close" data-toast-id="${toast.id}" title="Dismiss">
          ×
        </button>
      </div>
    `;
    }

    /**
     * Attach event listeners to toasts
     */
    attachListeners() {
        // Close buttons
        const closeBtns = this.container.querySelectorAll('.toast-close');
        closeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.toastId);
                this.dismiss(id);
            });
        });

        // Action buttons
        const actionBtns = this.container.querySelectorAll('.toast-action');
        actionBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(btn.dataset.toastId);
                const toast = this.toasts.find(t => t.id === id);

                if (toast && toast.action) {
                    toast.action();
                    this.dismiss(id);
                }
            });
        });
    }

    /**
     * Get icon for toast type
     */
    getIcon(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    }

    /**
     * Get color for toast type
     */
    getColor(type) {
        const colors = {
            success: '#16a34a',
            error: '#dc2626',
            warning: '#ea580c',
            info: '#2563eb'
        };
        return colors[type] || colors.info;
    }

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
window.toast = new ToastManager();

console.log('🔔 Toast Notification System loaded');
