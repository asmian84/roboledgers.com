// Session Manager - Auto-Restore & Version History
// Saves/Restores sessions and maintains a history of the last 3 files.

const SessionManager = {
    // Save current session & add to history
    saveSession(filename, transactions) {
        try {
            const timestamp = Date.now();
            const sessionData = {
                filename: filename,
                timestamp: timestamp.toString(),
                count: transactions.length,
                data: JSON.stringify(transactions)
            };

            // 1. Save as "Current Session" (Fast Resume)
            localStorage.setItem('lastTransactions', sessionData.data);
            localStorage.setItem('lastFileName', filename);
            localStorage.setItem('lastFileTime', sessionData.timestamp);

            // 2. Add to History (Rolling Buffer of 3)
            this.addToHistory(sessionData);

            console.log('💾 Session saved:', filename, transactions.length, 'txns');
        } catch (error) {
            console.error('❌ Error saving session:', error);
            // Handle quota exceeded?
        }
    },

    addToHistory(session) {
        try {
            let history = this.getHistory();
            
            // Remove duplicates (by filename generally, or just push to top)
            // We want unique filenames at top, or just latest versions?
            // Let's just keep last 3 saves for now, filtering out exact duplicates if needed.
            
            // Simple: Remove if exact filename exists (overwrite effect)
            history = history.filter(h => h.filename !== session.filename);

            // Add new to top
            history.unshift({
                filename: session.filename,
                timestamp: session.timestamp,
                count: session.count,
                // We DON'T store the full data in history array to save space? 
                // Wait, if we want to restore from history, we need the data.
                // Storing 3 full transaction sets might be heavy.
                // LocalStorage is ~5MB. 
                // If a file is 500KB, 3 files is 1.5MB. It's okay.
                data: session.data 
            });

            // Limit to 3
            if (history.length > 3) {
                history = history.slice(0, 3);
            }

            localStorage.setItem('session_history', JSON.stringify(history));
        } catch (e) {
            console.warn('⚠️ Could not save to history (Quota?)', e);
        }
    },

    getHistory() {
        try {
            const raw = localStorage.getItem('session_history');
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Error reading history', e);
            return [];
        }
    },

    // Auto-Restore logic (No Modal)
    autoRestore() {
        // If we have data, load it immediately.
        if (this.hasSavedSession()) {
            console.log('🔄 Auto-restoring last session...');
            const transactions = this.restoreSession();
            if (transactions && typeof App !== 'undefined') {
                App.transactions = transactions;
                // We don't need to save again immediately, it's already there.
                // Just trigger UI load
                App.showSection('review');
                App.loadReviewSection();
                return true;
            }
        }
        return false;
    },

    hasSavedSession() {
        return !!localStorage.getItem('lastTransactions');
    },

    restoreSession() {
        try {
            const saved = localStorage.getItem('lastTransactions');
            if (!saved) return null;
            return JSON.parse(saved);
        } catch (e) {
            console.error('❌ Restore failed', e);
            return null;
        }
    },

    restoreFromHistory(index) {
        const history = this.getHistory();
        if (history[index]) {
            const item = history[index];
            console.log('📂 Restoring from history:', item.filename);
            
            // Update "Current" pointers
            localStorage.setItem('lastTransactions', item.data);
            localStorage.setItem('lastFileName', item.filename);
            localStorage.setItem('lastFileTime', item.timestamp);
            
            // Load
            const transactions = JSON.parse(item.data);
            if (typeof App !== 'undefined') {
                App.transactions = transactions;
                App.showSection('review');
                App.loadReviewSection();
            }
            return true;
        }
        return false;
    },

    clearSession() {
        localStorage.removeItem('lastTransactions');
        localStorage.removeItem('lastFileName');
        localStorage.removeItem('lastFileTime');
        // Do we clear history? Maybe not, safety net.
    }
};
