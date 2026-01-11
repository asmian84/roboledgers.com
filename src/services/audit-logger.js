/**
 * Audit Log System - High Performance Event Tracking
 * Logs all events without slowing down the system
 * Uses async batching and IndexedDB for performance
 */

class AuditLogger {
    constructor() {
        this.db = null;
        this.batchQueue = [];
        this.batchSize = 50; // Batch 50 events before writing
        this.batchTimeout = 5000; // Or write every 5 seconds
        this.batchTimer = null;
        this.isInitialized = false;
    }

    // ============================================
    // INITIALIZATION
    // ============================================

    async init() {
        if (this.isInitialized) return;

        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AuditLogDB', 1);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                this.isInitialized = true;

                resolve();
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Audit logs store
                if (!db.objectStoreNames.contains('audit_logs')) {
                    const store = db.createObjectStore('audit_logs', {
                        keyPath: 'id',
                        autoIncrement: true
                    });
                    store.createIndex('timestamp', 'timestamp', { unique: false });
                    store.createIndex('event_type', 'event_type', { unique: false });
                    store.createIndex('user_id', 'user_id', { unique: false });
                    store.createIndex('severity', 'severity', { unique: false });
                }
            };
        });
    }

    // ============================================
    // LOGGING METHODS (Async, Non-Blocking)
    // ============================================

    log(eventType, data, severity = 'info') {
        // Don't block - add to queue immediately
        const logEntry = {
            event_type: eventType,
            timestamp: new Date().toISOString(),
            user_id: this.getUserId(),
            severity: severity, // info, warning, error, critical
            data: data,
            session_id: this.getSessionId(),
            user_agent: navigator.userAgent,
            url: window.location.href
        };

        // Add to batch queue
        this.batchQueue.push(logEntry);

        // If batch is full, flush immediately
        if (this.batchQueue.length >= this.batchSize) {
            this.flushBatch();
        } else {
            // Otherwise, schedule a flush
            this.scheduleBatchFlush();
        }

        // Return immediately (non-blocking)
        return logEntry;
    }

    // ============================================
    // BATCH PROCESSING (Performance Optimization)
    // ============================================

    scheduleBatchFlush() {
        if (this.batchTimer) return; // Already scheduled

        this.batchTimer = setTimeout(() => {
            this.flushBatch();
        }, this.batchTimeout);
    }

    async flushBatch() {
        if (this.batchQueue.length === 0) return;

        // Clear timer
        if (this.batchTimer) {
            clearTimeout(this.batchTimer);
            this.batchTimer = null;
        }

        // Get batch to write
        const batch = [...this.batchQueue];
        this.batchQueue = [];

        // Write asynchronously (non-blocking)
        try {
            await this.writeBatch(batch);
        } catch (error) {
            console.error('❌ Failed to write audit batch:', error);
            // Re-queue failed items
            this.batchQueue.unshift(...batch);
        }
    }

    async writeBatch(batch) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['audit_logs'], 'readwrite');
            const store = transaction.objectStore('audit_logs');

            // Write all items in batch
            batch.forEach(item => store.add(item));

            transaction.oncomplete = () => {

                resolve();
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // ============================================
    // CONVENIENCE METHODS
    // ============================================

    // User actions
    logUserAction(action, details) {
        return this.log('user_action', { action, ...details }, 'info');
    }

    // System events
    logSystemEvent(event, details) {
        return this.log('system_event', { event, ...details }, 'info');
    }

    // Data changes
    logDataChange(entity, operation, details) {
        return this.log('data_change', {
            entity,
            operation, // create, update, delete
            ...details
        }, 'info');
    }

    // Errors
    logError(error, context) {
        return this.log('error', {
            error: error.message,
            stack: error.stack,
            ...context
        }, 'error');
    }

    // Security events
    logSecurityEvent(event, details) {
        return this.log('security', { event, ...details }, 'warning');
    }

    // Performance metrics
    logPerformance(metric, value, details) {
        return this.log('performance', {
            metric,
            value,
            ...details
        }, 'info');
    }

    // ============================================
    // QUERY METHODS
    // ============================================

    async getLogs(filters = {}) {
        if (!this.isInitialized) await this.init();

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['audit_logs'], 'readonly');
            const store = transaction.objectStore('audit_logs');

            let request;

            // Use index if filtering by indexed field
            if (filters.event_type) {
                const index = store.index('event_type');
                request = index.getAll(filters.event_type);
            } else if (filters.severity) {
                const index = store.index('severity');
                request = index.getAll(filters.severity);
            } else {
                request = store.getAll();
            }

            request.onsuccess = () => {
                let logs = request.result;

                // Apply additional filters
                if (filters.start_date) {
                    logs = logs.filter(log =>
                        new Date(log.timestamp) >= new Date(filters.start_date)
                    );
                }
                if (filters.end_date) {
                    logs = logs.filter(log =>
                        new Date(log.timestamp) <= new Date(filters.end_date)
                    );
                }
                if (filters.limit) {
                    logs = logs.slice(-filters.limit);
                }

                resolve(logs);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getRecentLogs(limit = 100) {
        return this.getLogs({ limit });
    }

    async getLogsByType(eventType, limit = 100) {
        return this.getLogs({ event_type: eventType, limit });
    }

    async getErrorLogs(limit = 50) {
        return this.getLogs({ severity: 'error', limit });
    }

    async getStats() {
        const logs = await this.getLogs();

        const stats = {
            total_events: logs.length,
            by_type: {},
            by_severity: {},
            by_hour: {},
            errors_count: 0,
            warnings_count: 0
        };

        logs.forEach(log => {
            // Count by type
            stats.by_type[log.event_type] = (stats.by_type[log.event_type] || 0) + 1;

            // Count by severity
            stats.by_severity[log.severity] = (stats.by_severity[log.severity] || 0) + 1;

            // Count by hour
            const hour = new Date(log.timestamp).getHours();
            stats.by_hour[hour] = (stats.by_hour[hour] || 0) + 1;

            // Count errors/warnings
            if (log.severity === 'error') stats.errors_count++;
            if (log.severity === 'warning') stats.warnings_count++;
        });

        return stats;
    }

    // ============================================
    // CLEANUP
    // ============================================

    async clearOldLogs(daysToKeep = 30) {
        if (!this.isInitialized) await this.init();

        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['audit_logs'], 'readwrite');
            const store = transaction.objectStore('audit_logs');
            const index = store.index('timestamp');

            const range = IDBKeyRange.upperBound(cutoffDate.toISOString());
            const request = index.openCursor(range);

            let deletedCount = 0;

            request.onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    deletedCount++;
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => {

                resolve(deletedCount);
            };
            transaction.onerror = () => reject(transaction.error);
        });
    }

    async exportLogs(format = 'json') {
        const logs = await this.getLogs();

        if (format === 'json') {
            return JSON.stringify(logs, null, 2);
        } else if (format === 'csv') {
            return this.logsToCSV(logs);
        }
    }

    logsToCSV(logs) {
        if (logs.length === 0) return '';

        const headers = ['id', 'timestamp', 'event_type', 'severity', 'user_id', 'data'];
        const rows = logs.map(log => [
            log.id,
            log.timestamp,
            log.event_type,
            log.severity,
            log.user_id,
            JSON.stringify(log.data)
        ]);

        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    // ============================================
    // HELPERS
    // ============================================

    getUserId() {
        // Get from localStorage or generate
        let userId = localStorage.getItem('user_id');
        if (!userId) {
            userId = 'user_' + Date.now();
            localStorage.setItem('user_id', userId);
        }
        return userId;
    }

    getSessionId() {
        // Get from sessionStorage or generate
        let sessionId = sessionStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = 'session_' + Date.now();
            sessionStorage.setItem('session_id', sessionId);
        }
        return sessionId;
    }
}

// ============================================
// GLOBAL INSTANCE
// ============================================

window.auditLogger = new AuditLogger();

// Auto-initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
    await window.auditLogger.init();

    // Log page load
    window.auditLogger.logSystemEvent('page_load', {
        page: window.location.pathname,
        referrer: document.referrer
    });

    // Auto-cleanup old logs (keep 30 days)
    setInterval(async () => {
        await window.auditLogger.clearOldLogs(30);
    }, 24 * 60 * 60 * 1000); // Once per day
});

// Log page unload
window.addEventListener('beforeunload', () => {
    // Flush any pending logs
    window.auditLogger.flushBatch();

    window.auditLogger.logSystemEvent('page_unload', {
        page: window.location.pathname,
        duration: performance.now()
    });
});

// Export
window.AuditLogger = AuditLogger;
