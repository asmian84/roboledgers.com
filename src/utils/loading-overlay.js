/**
 * Loading Overlay Utility
 * Displays a modern loading spinner during data operations
 */

window.LoadingOverlay = {
    overlayElement: null,

    /**
     * Show loading overlay with optional message
     * @param {string} message - Loading message to display
     * @param {string} container - Optional container selector (defaults to body)
     */
    show(message = 'Loading...', container = 'body') {
        // Remove existing overlay if any
        this.hide();

        const containerEl = typeof container === 'string'
            ? document.querySelector(container)
            : container;

        if (!containerEl) return;

        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'ab-loading-overlay';
        overlay.innerHTML = `
            <div class="ab-loading-content">
                <div class="ab-loading-spinner">
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                    <div class="spinner-ring"></div>
                </div>
                <div class="ab-loading-message">${message}</div>
            </div>
        `;

        // Add styles if not already present
        if (!document.getElementById('ab-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'ab-loading-styles';
            style.textContent = `
                .ab-loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(248, 250, 252, 0.95);
                    backdrop-filter: blur(4px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 9999;
                    animation: fadeIn 0.2s ease-in;
                }

                .ab-loading-overlay.fixed {
                    position: fixed;
                }

                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }

                .ab-loading-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 16px;
                }

                .ab-loading-spinner {
                    position: relative;
                    width: 60px;
                    height: 60px;
                }

                .spinner-ring {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    border: 3px solid transparent;
                    border-top-color: #3b82f6;
                    border-radius: 50%;
                    animation: spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite;
                }

                .spinner-ring:nth-child(1) {
                    animation-delay: -0.45s;
                }

                .spinner-ring:nth-child(2) {
                    animation-delay: -0.3s;
                    border-top-color: #8b5cf6;
                }

                .spinner-ring:nth-child(3) {
                    animation-delay: -0.15s;
                    border-top-color: #06b6d4;
                }

                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                .ab-loading-message {
                    font-family: 'Inter', sans-serif;
                    font-size: 14px;
                    font-weight: 600;
                    color: #475569;
                    text-align: center;
                    animation: pulse 1.5s ease-in-out infinite;
                }

                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.6; }
                }

                /* Grid-specific loading overlay */
                .grid-loading-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(255, 255, 255, 0.9);
                    backdrop-filter: blur(2px);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 100;
                }
            `;
            document.head.appendChild(style);
        }

        containerEl.style.position = containerEl.style.position || 'relative';
        containerEl.appendChild(overlay);
        this.overlayElement = overlay;

        return overlay;
    },

    /**
     * Show as fixed overlay (covers entire screen)
     */
    showFixed(message = 'Loading...') {
        const overlay = this.show(message, 'body');
        if (overlay) {
            overlay.classList.add('fixed');
            overlay.style.position = 'fixed';
        }
        return overlay;
    },

    /**
     * Update loading message
     */
    updateMessage(message) {
        if (this.overlayElement) {
            const msgEl = this.overlayElement.querySelector('.ab-loading-message');
            if (msgEl) msgEl.textContent = message;
        }
    },

    /**
     * Hide loading overlay
     */
    hide() {
        if (this.overlayElement) {
            this.overlayElement.style.animation = 'fadeOut 0.15s ease-out';
            setTimeout(() => {
                if (this.overlayElement && this.overlayElement.parentNode) {
                    this.overlayElement.parentNode.removeChild(this.overlayElement);
                }
                this.overlayElement = null;
            }, 150);
        }
    },

    /**
     * Show loading for async operation
     * @param {Promise} promise - Promise to wait for
     * @param {string} message - Loading message
     * @param {number} minDuration - Minimum time to show loader (ms)
     */
    async showDuring(promise, message = 'Loading...', minDuration = 300) {
        const startTime = Date.now();
        this.showFixed(message);

        try {
            const result = await promise;
            const elapsed = Date.now() - startTime;
            const remaining = Math.max(0, minDuration - elapsed);

            // Ensure loader shows for minimum duration
            if (remaining > 0) {
                await new Promise(resolve => setTimeout(resolve, remaining));
            }

            this.hide();
            return result;
        } catch (error) {
            this.hide();
            throw error;
        }
    }
};

// Add fadeOut animation
const fadeOutStyle = document.createElement('style');
fadeOutStyle.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
    }
`;
document.head.appendChild(fadeOutStyle);
