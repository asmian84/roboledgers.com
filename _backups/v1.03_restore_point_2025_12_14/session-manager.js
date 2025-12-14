// Session Manager - Continue/Start Over Feature
//Saves and restores transaction sessions via localStorage

const SessionManager = {
    // Save current session
    saveSession(filename, transactions) {
        try {
            localStorage.setItem('lastTransactions', JSON.stringify(transactions));
            localStorage.setItem('lastFileName', filename);
            localStorage.setItem('lastFileTime', Date.now().toString());
            console.log('💾 Session saved:', filename, transactions.length, 'transactions');
        } catch (error) {
            console.error('❌ Error saving session:', error);
        }
    },

    // Check if saved session exists
    hasSavedSession() {
        const saved = localStorage.getItem('lastTransactions');
        const filename = localStorage.getItem('lastFileName');
        return !!(saved && filename);
    },

    // Get saved session info
    getSavedSessionInfo() {
        const filename = localStorage.getItem('lastFileName');
        const time = localStorage.getItem('lastFileTime');
        const transactionsStr = localStorage.getItem('lastTransactions');

        // Check for missing or corrupted data
        if (!filename || !time || !transactionsStr ||
            filename === 'undefined' || time === 'undefined' || transactionsStr === 'undefined') {
            return null;
        }

        const uploadTime = new Date(parseInt(time));
        const now = new Date();
        const diffMs = now - uploadTime;
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

        let timeAgo;
        if (diffHours > 24) {
            const days = Math.floor(diffHours / 24);
            timeAgo = `${days} day${days > 1 ? 's' : ''} ago`;
        } else if (diffHours > 0) {
            timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        } else {
            timeAgo = `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
        }

        return {
            filename,
            uploadTime: uploadTime.toLocaleString(),
            timeAgo
        };
    },

    // Restore saved session
    restoreSession() {
        try {
            const saved = localStorage.getItem('lastTransactions');
            if (!saved || saved === 'undefined') {
                this.clearSession();
                return null;
            }

            const transactions = JSON.parse(saved);
            if (!Array.isArray(transactions)) {
                throw new Error('Saved data is not an array');
            }

            console.log('📂 Restored session:', transactions.length, 'transactions');
            return transactions;
        } catch (error) {
            console.error('❌ Error restoring session:', error);
            this.clearSession(); // Auto-clear corrupted session
            return null;
        }
    },

    // Clear saved session
    clearSession() {
        localStorage.removeItem('lastTransactions');
        localStorage.removeItem('lastFileName');
        localStorage.removeItem('lastFileTime');
        console.log('🗑️ Session cleared');
    },

    // Show continue/start over dialog
    showContinueDialog() {
        const info = this.getSavedSessionInfo();
        if (!info) return false;

        const html = `
            <div class="modal active" id="continueDialog" style="z-index: 9999;">
                <div class="modal-content" style="max-width: 500px;">
                    <div class="modal-header">
                        <h2>Continue Previous Session?</h2>
                    </div>
                    <div class="modal-body" style="padding: 2rem;">
                        <div style="text-align: center; margin-bottom: 2rem;">
                            <div style="font-size: 3rem; margin-bottom: 1rem;">📂</div>
                            <p style="font-size: 1.1rem; font-weight: 600; margin-bottom: 0.5rem;">
                                ${info.filename}
                            </p>
                            <p style="color: var(--text-secondary); font-size: 0.9rem;">
                                Uploaded ${info.timeAgo}
                            </p>
                        </div>
                        
                        <div style="display: flex; gap: 1rem; justify-content: center;">
                            <button id="continueSessionBtn" class="btn-primary" style="flex: 1;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; margin-right: 0.5rem;">
                                    <polyline points="9 11 12 14 22 4"></polyline>
                                    <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
                                </svg>
                                Continue Working
                            </button>
                            <button id="startFreshBtn" class="btn-secondary" style="flex: 1;">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px; margin-right: 0.5rem;">
                                    <polyline points="1 4 1 10 7 10"></polyline>
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                </svg>
                                Start Over
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);

        // Event listeners
        document.getElementById('continueSessionBtn').addEventListener('click', () => {
            this.handleContinue();
        });

        document.getElementById('startFreshBtn').addEventListener('click', () => {
            this.handleStartFresh();
        });

        return true;
    },

    // Handle continue button
    handleContinue() {
        const transactions = this.restoreSession();
        if (!transactions) {
            alert('Error loading saved session');
            this.handleStartFresh();
            return;
        }

        // Close dialog
        document.getElementById('continueDialog')?.remove();

        // Restore transactions to App
        if (typeof App !== 'undefined') {
            App.transactions = transactions;
            Storage.saveTransactions(transactions);
            App.showSection('review');
            App.loadReviewSection();
            console.log('✅ Session restored successfully');
        }
    },

    // Handle start fresh button
    handleStartFresh() {
        this.clearSession();
        document.getElementById('continueDialog')?.remove();
        console.log('🆕 Starting fresh session');
    }
};

// Check for saved session on page load
document.addEventListener('DOMContentLoaded', () => {
    // Wait a bit for App to initialize
    setTimeout(() => {
        if (SessionManager.hasSavedSession()) {
            SessionManager.showContinueDialog();
        }
    }, 500);
});
