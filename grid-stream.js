/**
 * GridStream - Observable Pattern for Real-Time Grid Updates
 * Acts as a central event bus for transaction changes.
 */
console.log('📡 Loading GridStream...');
const GridStream = {
    subscribers: [],

    /**
     * Subscribe to updates
     * @param {Function} callback - Function to call on update (receives event data)
     * @returns {Function} unsubscribe - Function to remove subscription
     */
    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    },

    /**
     * Publish an update event
     * @param {string} type - Event type: 'UPDATE', 'ADD', 'DELETE', 'AI_COMPLETE'
     * @param {Object} payload - Data associated with event
     */
    publish(type, payload) {
        console.log(`📡 Stream Event: ${type}`, payload);
        const event = { type, payload, timestamp: Date.now() };

        this.subscribers.forEach(callback => {
            try {
                callback(event);
            } catch (err) {
                console.error('Error in GridStream subscriber:', err);
            }
        });

        // If Pop-Out is open, forward event to it
        if (window.GridPopout && window.GridPopout.isPoppedOut && window.GridPopout.popoutWindow) {
            try {
                // Ensure the function exists in the child window
                if (window.GridPopout.popoutWindow.handleStreamEvent) {
                    window.GridPopout.popoutWindow.handleStreamEvent(event);
                }
            } catch (e) {
                console.warn('Failed to forward event to popout:', e);
            }
        }
    },

    /**
     * Convenience: Push a transaction update
     * @param {Object} transaction - Updated transaction object
     */
    pushUpdate(transaction) {
        this.publish('UPDATE', { transactions: [transaction] });
    },

    /**
     * Convenience: Push multiple updates
     * @param {Array} transactions - Array of updated transactions
     */
    pushBatchUpdate(transactions) {
        this.publish('UPDATE', { transactions });
    }
};

// Expose globally
window.GridStream = GridStream;
