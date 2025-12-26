/**
 * AutoBookkeeping V4 - Upload History Service
 * Manages the history of file uploads in localStorage
 */

(function () {
    'use strict';

    class UploadHistoryService {
        constructor() {
            this.storageKey = 'ab_upload_history';
            this.maxEntries = 15;
            this.history = this.loadHistory();
        }

        loadHistory() {
            try {
                const stored = localStorage.getItem(this.storageKey);
                return stored ? JSON.parse(stored) : [];
            } catch (e) {
                console.error('Failed to load upload history', e);
                return [];
            }
        }

        saveHistory() {
            try {
                localStorage.setItem(this.storageKey, JSON.stringify(this.history));
            } catch (e) {
                console.error('Failed to save upload history', e);
            }
        }

        addEntry(file, type, count) {
            const entry = {
                id: Date.now().toString(),
                fileName: file.name,
                fileType: type, // 'PDF' or 'CSV'
                date: new Date().toISOString(),
                count: count,
                size: this.formatSize(file.size)
            };

            // Add to top
            this.history.unshift(entry);

            // Limit size
            if (this.history.length > this.maxEntries) {
                this.history = this.history.slice(0, this.maxEntries);
            }

            this.saveHistory();
            return entry;
        }

        getHistory() {
            return this.history;
        }

        clearHistory() {
            this.history = [];
            this.saveHistory();
        }

        formatSize(bytes) {
            if (bytes === 0) return '0 B';
            const k = 1024;
            const sizes = ['B', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
        }
    }

    // Expose globally
    window.UploadHistoryService = new UploadHistoryService();
    console.log('📜 Upload History Service loaded');

})();
