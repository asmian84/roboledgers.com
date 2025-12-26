/**
 * AutoBookkeeping v3.0 - Reactive State Management
 * Simple reactive store with localStorage persistence
 * Zero dependencies
 */

class Store {
    constructor(initialState = {}, options = {}) {
        this.state = { ...initialState };
        this.subscribers = [];
        this.storageKey = options.storageKey || 'autobook_state';
        this.persist = options.persist !== false; // Default to true

        // Load from localStorage if enabled
        if (this.persist) {
            this._loadFromStorage();
        }

        console.log('📦 Store initialized:', this.state);
    }

    /**
     * Get current state
     * @param {string} key - Optional key to get specific value
     */
    getState(key = null) {
        if (key) {
            return this._getNestedValue(this.state, key);
        }
        return { ...this.state };
    }

    /**
     * Update state
     * @param {Object|Function} updates - Object with updates or function that receives current state
     */
    setState(updates) {
        const oldState = { ...this.state };

        // Handle function updates
        if (typeof updates === 'function') {
            updates = updates(this.state);
        }

        // Merge updates
        this.state = this._deepMerge(this.state, updates);

        console.log('📦 State updated:', updates);

        // Persist to localStorage
        if (this.persist) {
            this._saveToStorage();
        }

        // Notify subscribers
        this._notify(oldState, this.state);
    }

    /**
     * Subscribe to state changes
     * @param {Function} callback - Called when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        console.log(`📦 Subscriber added (total: ${this.subscribers.length})`);

        // Return unsubscribe function
        return () => {
            const index = this.subscribers.indexOf(callback);
            if (index > -1) {
                this.subscribers.splice(index, 1);
                console.log(`📦 Subscriber removed (total: ${this.subscribers.length})`);
            }
        };
    }

    /**
     * Reset state to initial or provided values
     * @param {Object} newState - New state to reset to
     */
    reset(newState = {}) {
        const oldState = { ...this.state };
        this.state = { ...newState };

        console.log('📦 State reset:', this.state);

        if (this.persist) {
            this._saveToStorage();
        }

        this._notify(oldState, this.state);
    }

    /**
     * Clear all state
     */
    clear() {
        this.reset({});
        if (this.persist) {
            localStorage.removeItem(this.storageKey);
        }
    }

    /**
     * Notify subscribers of state change
     * @private
     */
    _notify(oldState, newState) {
        this.subscribers.forEach(callback => {
            try {
                callback(newState, oldState);
            } catch (error) {
                console.error('📦 Error in subscriber:', error);
            }
        });
    }

    /**
     * Save state to localStorage
     * @private
     */
    _saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.state));
        } catch (error) {
            console.error('📦 Failed to save to localStorage:', error);
        }
    }

    /**
     * Load state from localStorage
     * @private
     */
    _loadFromStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.state = this._deepMerge(this.state, parsed);
                console.log('📦 State loaded from localStorage');
            }
        } catch (error) {
            console.error('📦 Failed to load from localStorage:', error);
        }
    }

    /**
     * Deep merge objects
     * @private
     */
    _deepMerge(target, source) {
        const output = { ...target };

        if (this._isObject(target) && this._isObject(source)) {
            Object.keys(source).forEach(key => {
                if (this._isObject(source[key])) {
                    if (!(key in target)) {
                        output[key] = source[key];
                    } else {
                        output[key] = this._deepMerge(target[key], source[key]);
                    }
                } else {
                    output[key] = source[key];
                }
            });
        }

        return output;
    }

    /**
     * Get nested value from object using dot notation
     * @private
     */
    _getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => current?.[key], obj);
    }

    /**
     * Check if value is an object
     * @private
     */
    _isObject(item) {
        return item && typeof item === 'object' && !Array.isArray(item);
    }
}

/**
 * Create a new store
 * @param {Object} initialState - Initial state
 * @param {Object} options - Store options
 */
function createStore(initialState = {}, options = {}) {
    return new Store(initialState, options);
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createStore, Store };
}

console.log('📦 State management ready');
