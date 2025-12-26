/**
 * AutoBookkeeping v3.0 - System Logger
 * "The Black Box" - Tracks all critical system events for auditability.
 * 
 * Storage: LocalStorage 'ab3_system_log'
 * Limit: 2000 Events (Auto-rotates)
 */

class SystemLogger {
    constructor() {
        this.STORAGE_KEY = 'ab3_system_log';
        this.MAX_LOGS = 2000;
        this.logs = this._load();
    }

    /**
     * Log a critical system event
     * @param {string} category - DATA | VENDOR | ACCOUNT | SYSTEM
     * @param {string} action - Short verb (e.g., 'IMPORT_CSV', 'RENAME_VENDOR')
     * @param {object|string} details - Specifics of the action
     * @param {string} [status='SUCCESS'] - SUCCESS | FAILURE
     */
    log(category, action, details, status = 'SUCCESS') {
        const entry = {
            id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            category,
            action,
            details: typeof details === 'string' ? details : JSON.stringify(details),
            status,
            user: 'User' // Placeholder for future multi-user support
        };

        this.logs.unshift(entry); // Add to top

        // Enforce Limit
        if (this.logs.length > this.MAX_LOGS) {
            this.logs = this.logs.slice(0, this.MAX_LOGS);
        }

        this._save();
        console.log(`[SystemLog] ${category} > ${action}:`, details);
    }

    /**
     * Retrieve logs with optional filtering
     * @param {object} filters - { category, action }
     */
    getLogs(filters = {}) {
        let filtered = this.logs;
        if (filters.category) {
            filtered = filtered.filter(l => l.category === filters.category);
        }
        return filtered;
    }

    /**
     * Clear all logs (Admin only)
     */
    clear() {
        this.logs = [];
        this._save();
        this.log('SYSTEM', 'CLEAR_LOGS', 'System log cleared by user.');
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.STORAGE_KEY);
            return raw ? JSON.parse(raw) : [];
        } catch (e) {
            console.error('Failed to load system logs', e);
            return [];
        }
    }

    _save() {
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.logs));
        } catch (e) {
            console.error('Failed to save system logs', e);
        }
    }
}

// Global Instance
window.SystemLog = new SystemLogger();
