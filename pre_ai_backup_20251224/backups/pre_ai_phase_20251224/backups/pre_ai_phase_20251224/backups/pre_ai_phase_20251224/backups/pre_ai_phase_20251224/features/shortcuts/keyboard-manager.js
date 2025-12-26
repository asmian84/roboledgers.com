/**
 * Keyboard Shortcuts Manager
 * Central registry for all keyboard shortcuts
 */

class KeyboardManager {
    constructor() {
        this.shortcuts = new Map();
        this.sequences = new Map(); // For multi-key sequences like "g then t"
        this.sequenceBuffer = [];
        this.sequenceTimeout = null;
        this.sequenceTimeoutDuration = 1000; // 1 second
        this.isEnabled = true;

        this.init();
    }

    init() {
        // Register core shortcuts
        this.registerCoreShortcuts();

        // Listen for keydown events
        document.addEventListener('keydown', (e) => this.handleKeydown(e));

        console.log('⌨️ Keyboard Manager initialized');
    }

    registerCoreShortcuts() {
        // Search
        this.register('ctrl+k', () => window.searchModal?.toggle(), 'Open search');
        this.register('/', () => window.searchModal?.open(), 'Quick search');

        // Help
        this.register('?', () => this.showShortcutsHelp(), 'Show keyboard shortcuts');

        // Undo/Redo (will be implemented in Phase 2)
        this.register('ctrl+z', () => window.undoManager?.undo(), 'Undo');
        this.register('ctrl+shift+z', () => window.undoManager?.redo(), 'Redo');

        // Navigation sequences
        this.registerSequence(['g', 't'], () => this.navigate('/transactions'), 'Go to Transactions');
        this.registerSequence(['g', 'v'], () => this.navigate('/vendors'), 'Go to Vendors');
        this.registerSequence(['g', 'a'], () => this.navigate('/accounts'), 'Go to Accounts');
        this.registerSequence(['g', 'r'], () => this.navigate('/reports'), 'Go to Reports');
        this.registerSequence(['g', 'h'], () => this.navigate('/'), 'Go to Home');

        // Quick actions
        this.registerSequence(['n', 't'], () => this.addTransaction(), 'New Transaction');
        this.registerSequence(['n', 'v'], () => this.addVendor(), 'New Vendor');
        this.registerSequence(['n', 'a'], () => this.addAccount(), 'New Account');

        // Import/Export
        this.register('ctrl+i', () => this.importCSV(), 'Import CSV');
        this.register('ctrl+e', () => this.exportData(), 'Export Data');

        // Refresh
        this.register('ctrl+r', (e) => {
            // Allow default browser refresh unless we want to intercept
            return true;
        }, 'Refresh page');
    }

    /**
     * Register a single-key shortcut
     * @param {string} key - Key combination (e.g., 'ctrl+k', 'escape')
     * @param {Function} action - Function to execute
     * @param {string} description - Human-readable description
     */
    register(key, action, description = '') {
        const normalizedKey = this.normalizeKey(key);
        this.shortcuts.set(normalizedKey, {
            action,
            description,
            key: normalizedKey
        });
    }

    /**
     * Register a multi-key sequence
     * @param {Array} keys - Array of keys (e.g., ['g', 't'])
     * @param {Function} action - Function to execute
     * @param {string} description - Description
     */
    registerSequence(keys, action, description = '') {
        const sequenceKey = keys.join(' ');
        this.sequences.set(sequenceKey, {
            keys,
            action,
            description,
            displayKey: keys.join(' then ')
        });
    }

    /**
     * Normalize key string for consistent comparison
     */
    normalizeKey(key) {
        return key.toLowerCase()
            .replace('command', 'meta')
            .replace('cmd', 'meta');
    }

    /**
     * Handle keydown events
     */
    handleKeydown(e) {
        if (!this.isEnabled) return;

        // Skip if user is typing in an input
        if (this.isInputFocused() && !this.isGlobalShortcut(e)) {
            return;
        }

        // Build current key combination
        const key = this.buildKeyString(e);

        // Check for single-key shortcuts
        if (this.shortcuts.has(key)) {
            const shortcut = this.shortcuts.get(key);
            const shouldPrevent = shortcut.action(e) !== true;

            if (shouldPrevent) {
                e.preventDefault();
                this.clearSequenceBuffer();
            }
            return;
        }

        // Handle multi-key sequences
        // Only lowercase letters for sequences
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            this.handleSequence(e.key.toLowerCase(), e);
        }
    }

    /**
     * Handle multi-key sequence input
     */
    handleSequence(key, event) {
        // Add to buffer
        this.sequenceBuffer.push(key);

        // Reset timeout
        clearTimeout(this.sequenceTimeout);

        // Check if buffer matches any sequence
        const bufferString = this.sequenceBuffer.join(' ');
        let matchFound = false;

        for (const [sequenceKey, sequence] of this.sequences) {
            if (sequenceKey === bufferString) {
                // Exact match - execute
                event.preventDefault();
                sequence.action();
                this.clearSequenceBuffer();
                matchFound = true;
                break;
            } else if (sequenceKey.startsWith(bufferString + ' ')) {
                // Partial match - keep waiting
                matchFound = true;
                this.showSequenceIndicator(this.sequenceBuffer);
            }
        }

        if (!matchFound) {
            this.clearSequenceBuffer();
        } else {
            // Set timeout to clear buffer
            this.sequenceTimeout = setTimeout(() => {
                this.clearSequenceBuffer();
            }, this.sequenceTimeoutDuration);
        }
    }

    /**
     * Clear sequence buffer
     */
    clearSequenceBuffer() {
        this.sequenceBuffer = [];
        clearTimeout(this.sequenceTimeout);
        this.hideSequenceIndicator();
    }

    /**
     * Show visual indicator for sequence in progress
     */
    showSequenceIndicator(buffer) {
        let indicator = document.getElementById('keyboardSequenceIndicator');

        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'keyboardSequenceIndicator';
            indicator.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #1e293b;
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-family: monospace;
        font-size: 14px;
        z-index: 10001;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.2s ease;
      `;
            document.body.appendChild(indicator);
        }

        indicator.textContent = buffer.join(' → ') + ' ...';
        indicator.style.display = 'block';
    }

    /**
     * Hide sequence indicator
     */
    hideSequenceIndicator() {
        const indicator = document.getElementById('keyboardSequenceIndicator');
        if (indicator) {
            indicator.style.display = 'none';
        }
    }

    /**
     * Build key string from event
     */
    buildKeyString(e) {
        const parts = [];

        if (e.ctrlKey) parts.push('ctrl');
        if (e.metaKey) parts.push('meta');
        if (e.altKey) parts.push('alt');
        if (e.shiftKey && e.key.length > 1) parts.push('shift'); // Only add shift for special keys

        // Add the main key
        let key = e.key.toLowerCase();

        // Special key mappings
        if (key === ' ') key = 'space';

        parts.push(key);

        return parts.join('+');
    }

    /**
     * Check if an input element has focus
     */
    isInputFocused() {
        const active = document.activeElement;
        return active && (
            active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.tagName === 'SELECT' ||
            active.isContentEditable
        );
    }

    /**
     * Check if this is a global shortcut that works even in inputs
     */
    isGlobalShortcut(e) {
        const key = this.buildKeyString(e);
        // Ctrl+K should work everywhere
        return key === 'ctrl+k' || key === 'meta+k' || key === 'escape';
    }

    /**
     * Navigate to a route
     */
    navigate(path) {
        if (window.AppRouter) {
            window.AppRouter.navigate(path);
        }
    }

    /**
     * Show shortcuts help modal
     */
    showShortcutsHelp() {
        if (window.shortcutsModal) {
            window.shortcutsModal.open();
        }
    }

    /**
     * Quick actions
     */
    addTransaction() {
        if (window.addTransactionModal) {
            window.addTransactionModal.open();
        }
    }

    addVendor() {
        // Navigate to vendors and trigger add
        this.navigate('/vendors');
        setTimeout(() => {
            if (typeof addNewVendor === 'function') {
                addNewVendor();
            }
        }, 300);
    }

    addAccount() {
        // Navigate to accounts and trigger add
        this.navigate('/accounts');
        setTimeout(() => {
            if (typeof addNewAccount === 'function') {
                addNewAccount();
            }
        }, 300);
    }

    importCSV() {
        if (window.csvImportModal) {
            window.csvImportModal.open();
        }
    }

    exportData() {
        // Will be implemented in Phase 3
        console.log('Export data - to be implemented');
    }

    /**
     * Get all registered shortcuts for display
     */
    getAllShortcuts() {
        const all = [];

        // Single-key shortcuts
        for (const [key, shortcut] of this.shortcuts) {
            if (shortcut.description) {
                all.push({
                    keys: this.formatKeyDisplay(key),
                    description: shortcut.description,
                    type: 'shortcut'
                });
            }
        }

        // Sequences
        for (const [key, sequence] of this.sequences) {
            all.push({
                keys: sequence.displayKey,
                description: sequence.description,
                type: 'sequence'
            });
        }

        return all;
    }

    /**
     * Format key for display
     */
    formatKeyDisplay(key) {
        return key
            .split('+')
            .map(k => {
                // Capitalize
                if (k === 'ctrl') return 'Ctrl';
                if (k === 'meta') return 'Cmd';
                if (k === 'alt') return 'Alt';
                if (k === 'shift') return 'Shift';
                return k.toUpperCase();
            })
            .join('+');
    }

    /**
     * Enable/disable shortcuts
     */
    enable() {
        this.isEnabled = true;
    }

    disable() {
        this.isEnabled = false;
    }
}

// Create global instance
window.keyboardManager = new KeyboardManager();

console.log('⌨️ Keyboard Shortcuts System loaded');
