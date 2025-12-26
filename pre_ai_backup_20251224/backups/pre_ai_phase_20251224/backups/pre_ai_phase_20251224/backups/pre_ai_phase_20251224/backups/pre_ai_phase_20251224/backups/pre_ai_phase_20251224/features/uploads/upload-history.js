/**
 * Version Explorer - Upload History Manager
 * Track all CSV uploads with edit/delete/reload capabilities
 */

// Upload history stored in localStorage
const UPLOAD_HISTORY_KEY = 'ab3_upload_history';

// Upload History Manager
class UploadHistoryManager {
    constructor() {
        this.history = this.loadHistory();
    }

    /**
     * Load upload history from localStorage
     */
    loadHistory() {
        try {
            const saved = localStorage.getItem(UPLOAD_HISTORY_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error('Failed to load upload history:', e);
            return [];
        }
    }

    /**
     * Save upload history to localStorage
     */
    saveHistory() {
        try {
            localStorage.setItem(UPLOAD_HISTORY_KEY, JSON.stringify(this.history));
        } catch (e) {
            console.error('Failed to save upload history:', e);
        }
    }

    /**
     * Add new upload to history
     * @param {Object} upload - { filename, accountCode, accountName, transactionCount, uploadDate, fileHash }
     */
    addUpload(upload) {
        const newUpload = {
            id: Date.now(),
            filename: upload.filename,
            accountCode: upload.accountCode,
            accountName: upload.accountName,
            transactionCount: upload.transactionCount,
            uploadDate: upload.uploadDate || new Date().toISOString(),
            fileHash: upload.fileHash || this.generateHash(upload.filename)
        };

        // Check for duplicates based on filename and hash
        const isDuplicate = this.history.some(item =>
            item.filename === newUpload.filename && item.fileHash === newUpload.fileHash
        );

        if (!isDuplicate) {
            this.history.unshift(newUpload); // Add to beginning
            this.saveHistory();
            console.log('Added upload to history:', newUpload);
        } else {
            console.log('Duplicate upload detected, skipping');
        }

        return newUpload.id;
    }

    /**
     * Delete upload from history
     */
    deleteUpload(id) {
        this.history = this.history.filter(item => item.id !== id);
        this.saveHistory();
        console.log('Deleted upload:', id);
    }

    /**
     * Get all uploads
     */
    getAllUploads() {
        return this.history;
    }

    /**
     * Get upload by ID
     */
    getUpload(id) {
        return this.history.find(item => item.id === id);
    }

    /**
     * Generate simple hash for filename
     */
    generateHash(filename) {
        let hash = 0;
        for (let i = 0; i < filename.length; i++) {
            const char = filename.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash).toString(36);
    }
}

// Create global instance
window.uploadHistory = new UploadHistoryManager();

// Render Uploads Page
window.renderUploads = function () {
    const uploads = window.uploadHistory.getAllUploads();

    return `
    <style>
      .uploads-page {
        padding: 30px;
        max-width: 1200px;
        margin: 0 auto;
      }

      .uploads-header {
        margin-bottom: 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .uploads-header h1 {
        margin: 0;
        font-size: 2rem;
        color: #1e293b;
      }

      .uploads-stats {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .stat-card {
        background: white;
        padding: 1.5rem;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      }

      .stat-label {
        font-size: 0.85rem;
        color: #64748b;
        margin-bottom: 0.5rem;
      }

      .stat-value {
        font-size: 2rem;
        font-weight: 700;
        color: #1e293b;
      }

      .uploads-grid {
        background: white;
        border-radius: 8px;
        border: 1px solid #e2e8f0;
        overflow: hidden;
      }

      .upload-item {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 120px 150px;
        gap: 1rem;
        padding: 1.25rem 1.5rem;
        border-bottom: 1px solid #f1f5f9;
        align-items: center;
        transition: background 0.15s;
      }

      .upload-item:hover {
        background: #f8fafc;
      }

      .upload-item:last-child {
        border-bottom: none;
      }

      .upload-filename {
        font-weight: 500;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .upload-filename-icon {
        font-size: 1.2rem;
      }

      .upload-account {
        display: flex;
        flex-direction: column;
      }

      .upload-account-code {
        font-weight: 600;
        color: #6366f1;
        font-size: 0.9rem;
      }

      .upload-account-name {
        font-size: 0.85rem;
        color: #64748b;
      }

      .upload-count {
        color: #475569;
        font-size: 0.95rem;
      }

      .upload-date {
        color: #64748b;
        font-size: 0.9rem;
      }

      .upload-actions {
        display: flex;
        gap: 0.5rem;
        justify-content: flex-end;
      }

      .upload-action-btn {
        padding: 6px 10px;
        border: none;
        background: transparent;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        font-size: 1rem;
      }

      .upload-action-btn:hover {
        background: #f1f5f9;
      }

      .btn-reload {
        color: #3b82f6;
      }

      .btn-reload:hover {
        background: #eff6ff;
        color: #2563eb;
      }

      .btn-edit {
        color: #64748b;
      }

      .btn-edit:hover {
        background: #f1f5f9;
        color: #334155;
      }

      .btn-delete {
        color: #ef4444;
      }

      .btn-delete:hover {
        background: #fef2f2;
        color: #dc2626;
      }

      .uploads-empty {
        text-align: center;
        padding: 4rem 2rem;
        color: #94a3b8;
      }

      .uploads-empty-icon {
        font-size: 4rem;
        margin-bottom: 1rem;
      }

      .uploads-header-row {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr 120px 150px;
        gap: 1rem;
        padding: 1rem 1.5rem;
        background: #f8fafc;
        border-bottom: 2px solid #e2e8f0;
        font-weight: 600;
        font-size: 0.85rem;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
    </style>

    <div class="uploads-page">
      <div class="uploads-header">
        <h1>📁 Upload History</h1>
        <button class="btn-primary" onclick="window.showCSVImportModal()">
          ➕ Upload New CSV
        </button>
      </div>

      <div class="uploads-stats">
        <div class="stat-card">
          <div class="stat-label">Total Uploads</div>
          <div class="stat-value">${uploads.length}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Total Transactions</div>
          <div class="stat-value">${uploads.reduce((sum, u) => sum + (u.transactionCount || 0), 0)}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Unique Files</div>
          <div class="stat-value">${new Set(uploads.map(u => u.fileHash)).size}</div>
        </div>
      </div>

      <div class="uploads-grid">
        ${uploads.length === 0 ? `
          <div class="uploads-empty">
            <div class="uploads-empty-icon">📭</div>
            <p>No uploads yet</p>
            <p style="font-size: 0.9rem; color: #64748b;">Upload a CSV file to get started</p>
          </div>
        ` : `
          <div class="uploads-header-row">
            <div>Filename</div>
            <div>Account</div>
            <div>Transactions</div>
            <div>Date</div>
            <div>Actions</div>
          </div>
          ${uploads.map(upload => `
            <div class="upload-item" data-upload-id="${upload.id}">
              <div class="upload-filename">
                <span class="upload-filename-icon">📄</span>
                <span>${upload.filename}</span>
              </div>
              <div class="upload-account">
                <span class="upload-account-code">${upload.accountCode}</span>
                <span class="upload-account-name">${upload.accountName}</span>
              </div>
              <div class="upload-count">${upload.transactionCount} transactions</div>
              <div class="upload-date">${formatUploadDate(upload.uploadDate)}</div>
              <div class="upload-actions">
                <button class="upload-action-btn btn-reload" onclick="reloadUpload(${upload.id})" title="Reload">
                  🔄
                </button>
                <button class="upload-action-btn btn-edit" onclick="editUpload(${upload.id})" title="Edit">
                  ✏️
                </button>
                <button class="upload-action-btn btn-delete" onclick="deleteUpload(${upload.id})" title="Delete">
                  🗑️
                </button>
              </div>
            </div>
          `).join('')}
        `}
      </div>
    </div>

    <script>
      function formatUploadDate(dateStr) {
        try {
          const date = new Date(dateStr);
          const now = new Date();
          const diffMs = now - date;
          const diffMins = Math.floor(diffMs / 60000);
          const diffHours = Math.floor(diffMs / 3600000);
          const diffDays = Math.floor(diffMs / 86400000);

          if (diffMins < 1) return 'Just now';
          if (diffMins < 60) return diffMins + 'm ago';
          if (diffHours < 24) return diffHours + 'h ago';
          if (diffDays < 7) return diffDays + 'd ago';
          
          return date.toLocaleDateString();
        } catch (e) {
          return 'Unknown';
        }
      }

      function reloadUpload(id) {
        const upload = window.uploadHistory.getUpload(id);
        if (!upload) {
          toast.error('Upload not found');
          return;
        }

        if (confirm('Reload this CSV? This will replace current transaction data.')) {
          // TODO: Implement reload logic
          toast.warning('Reload feature coming soon - file data not stored yet');
          console.log('Reload upload:', upload);
        }
      }

      function editUpload(id) {
        const upload = window.uploadHistory.getUpload(id);
        if (!upload) {
          toast.error('Upload not found');
          return;
        }

        // TODO: Implement edit modal
        toast.info('Edit feature coming soon');
        console.log('Edit upload:', upload);
      }

      function deleteUpload(id) {
        const upload = window.uploadHistory.getUpload(id);
        if (!upload) {
          toast.error('Upload not found');
          return;
        }

        if (confirm(\`Delete "\${upload.filename}"? This will not affect imported transactions.\`)) {
          window.uploadHistory.deleteUpload(id);
          toast.success('Upload deleted from history');
          
          // Refresh view
          if (window.AppRouter) {
            window.AppRouter.navigate('/uploads');
          }
        }
      }
    </script>
  `;
};

console.log('📁 Upload History Manager loaded');
