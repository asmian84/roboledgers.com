/**
 * Global Search Modal
 * Ctrl+K to open, ESC to close
 */

class SearchModal {
    constructor() {
        this.modal = null;
        this.input = null;
        this.resultsContainer = null;
        this.isOpen = false;
        this.selectedIndex = -1;
        this.currentResults = { transactions: [], vendors: [], accounts: [] };
        this.searchTimeout = null;
        this.recentSearches = this.loadRecentSearches();

        this.init();
    }

    init() {
        // Create modal HTML
        const modalHTML = `
      <div id="globalSearchModal" class="search-modal" style="display: none;">
        <div class="search-modal-backdrop"></div>
        <div class="search-modal-content">
          <div class="search-header">
            <div class="search-input-wrapper">
              <span class="search-icon">🔍</span>
              <input 
                type="text" 
                id="globalSearchInput" 
                placeholder="Search transactions, vendors, accounts..."
                autocomplete="off"
              />
              <button class="search-clear" id="searchClear" title="Clear (Esc)">×</button>
            </div>
          </div>
          
          <div class="search-body" id="searchResults">
            <!-- Results will be rendered here -->
          </div>
          
          <div class="search-footer">
            <div class="search-hints">
              <span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span>
              <span><kbd>Enter</kbd> Select</span>
              <span><kbd>Esc</kbd> Close</span>
            </div>
          </div>
        </div>
      </div>
    `;

        // Insert modal into body
        document.body.insertAdjacentHTML('beforeend', modalHTML);

        // Get references
        this.modal = document.getElementById('globalSearchModal');
        this.input = document.getElementById('globalSearchInput');
        this.resultsContainer = document.getElementById('searchResults');
        this.clearBtn = document.getElementById('searchClear');

        // Attach event listeners
        this.attachListeners();

        // Inject styles
        this.injectStyles();

        console.log('🔍 Search Modal initialized');
    }

    attachListeners() {
        // Input events
        this.input.addEventListener('input', (e) => this.handleInput(e));
        this.input.addEventListener('keydown', (e) => this.handleKeydown(e));

        // Clear button
        this.clearBtn.addEventListener('click', () => this.clear());

        // Backdrop click to close
        this.modal.querySelector('.search-modal-backdrop').addEventListener('click', () => this.close());

        // Result clicks
        this.resultsContainer.addEventListener('click', (e) => this.handleResultClick(e));
    }

    handleInput(e) {
        const query = e.target.value;

        // Debounce search
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            this.performSearch(query);
        }, 300);
    }

    async performSearch(query) {
        if (!query || query.length < 2) {
            this.showRecentSearches();
            return;
        }

        // Show loading state
        this.resultsContainer.innerHTML = '<div class="search-loading">Searching...</div>';

        // Perform search
        const results = await window.searchEngine.search(query);
        this.currentResults = results;
        this.selectedIndex = -1;

        // Render results
        this.renderResults(results);
    }

    renderResults(results) {
        const { transactions, vendors, accounts } = results;
        const totalResults = transactions.length + vendors.length + accounts.length;

        if (totalResults === 0) {
            this.resultsContainer.innerHTML = `
        <div class="search-empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">No results found</div>
        </div>
      `;
            return;
        }

        let html = '';

        // Transactions section
        if (transactions.length > 0) {
            html += `
        <div class="search-section">
          <div class="search-section-header">Transactions (${transactions.length})</div>
          ${transactions.map((txn, idx) => this.renderTransaction(txn, idx)).join('')}
        </div>
      `;
        }

        // Vendors section
        if (vendors.length > 0) {
            html += `
        <div class="search-section">
          <div class="search-section-header">Vendors (${vendors.length})</div>
          ${vendors.map((vendor, idx) => this.renderVendor(vendor, transactions.length + idx)).join('')}
        </div>
      `;
        }

        // Accounts section
        if (accounts.length > 0) {
            html += `
        <div class="search-section">
          <div class="search-section-header">Accounts (${accounts.length})</div>
          ${accounts.map((account, idx) => this.renderAccount(account, transactions.length + vendors.length + idx)).join('')}
        </div>
      `;
        }

        this.resultsContainer.innerHTML = html;
    }

    renderTransaction(txn, index) {
        const amount = txn.amount ? `$${Math.abs(txn.amount).toFixed(2)}` : '';
        const amountClass = txn.amount >= 0 ? 'amount-positive' : 'amount-negative';
        const date = txn.date ? new Date(txn.date).toLocaleDateString() : '';

        return `
      <div class="search-result" data-index="${index}" data-type="transaction" data-id="${txn.id}">
        <div class="result-icon">📊</div>
        <div class="result-content">
          <div class="result-title">${this.escapeHtml(txn.description || 'Untitled')}</div>
          <div class="result-meta">
            ${date ? `<span>${date}</span>` : ''}
            ${txn.vendor ? `<span>Vendor: ${this.escapeHtml(txn.vendor)}</span>` : ''}
          </div>
        </div>
        <div class="result-amount ${amountClass}">${amount}</div>
      </div>
    `;
    }

    renderVendor(vendor, index) {
        const name = vendor.description || vendor.name || 'Unnamed Vendor';

        return `
      <div class="search-result" data-index="${index}" data-type="vendor" data-id="${vendor.id}">
        <div class="result-icon">🏢</div>
        <div class="result-content">
          <div class="result-title">${this.escapeHtml(name)}</div>
          <div class="result-meta">
            ${vendor.accountNumber ? `<span>Account: ${vendor.accountNumber}</span>` : ''}
          </div>
        </div>
      </div>
    `;
    }

    renderAccount(account, index) {
        return `
      <div class="search-result" data-index="${index}" data-type="account" data-id="${account.id || account.code}">
        <div class="result-icon">💰</div>
        <div class="result-content">
          <div class="result-title">${this.escapeHtml(account.name)}</div>
          <div class="result-meta">
            <span>Code: ${account.code || account.accountNumber}</span>
          </div>
        </div>
      </div>
    `;
    }

    showRecentSearches() {
        if (this.recentSearches.length === 0) {
            this.resultsContainer.innerHTML = `
        <div class="search-empty">
          <div class="empty-text">Start typing to search...</div>
        </div>
      `;
            return;
        }

        const html = `
      <div class="search-section">
        <div class="search-section-header">Recent Searches</div>
        ${this.recentSearches.map((query, idx) => `
          <div class="search-recent" data-query="${this.escapeHtml(query)}">
            <span class="recent-icon">🕐</span>
            <span class="recent-query">${this.escapeHtml(query)}</span>
          </div>
        `).join('')}
      </div>
    `;

        this.resultsContainer.innerHTML = html;
    }

    handleKeydown(e) {
        const results = this.resultsContainer.querySelectorAll('.search-result');

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, results.length - 1);
                this.updateSelection(results);
                break;

            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
                this.updateSelection(results);
                break;

            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && results[this.selectedIndex]) {
                    this.selectResult(results[this.selectedIndex]);
                }
                break;

            case 'Escape':
                e.preventDefault();
                this.close();
                break;
        }
    }

    updateSelection(results) {
        results.forEach((result, idx) => {
            result.classList.toggle('selected', idx === this.selectedIndex);
        });

        // Scroll selected into view
        if (this.selectedIndex >= 0) {
            results[this.selectedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        }
    }

    handleResultClick(e) {
        const result = e.target.closest('.search-result');
        if (result) {
            this.selectResult(result);
        }

        const recent = e.target.closest('.search-recent');
        if (recent) {
            const query = recent.dataset.query;
            this.input.value = query;
            this.performSearch(query);
        }
    }

    selectResult(result) {
        const type = result.dataset.type;
        const id = result.dataset.id;
        const query = this.input.value;

        // Save to recent searches
        this.saveRecentSearch(query);

        // Navigate based on type
        switch (type) {
            case 'transaction':
                window.AppRouter?.navigate('/transactions');
                // TODO: Scroll to and highlight transaction
                break;
            case 'vendor':
                window.AppRouter?.navigate('/vendors');
                break;
            case 'account':
                window.AppRouter?.navigate('/accounts');
                break;
        }

        this.close();
    }

    saveRecentSearch(query) {
        if (!query || query.length < 2) return;

        // Remove if already exists
        this.recentSearches = this.recentSearches.filter(q => q !== query);

        // Add to front
        this.recentSearches.unshift(query);

        // Keep only last 5
        this.recentSearches = this.recentSearches.slice(0, 5);

        // Save to localStorage
        localStorage.setItem('ab3_recent_searches', JSON.stringify(this.recentSearches));
    }

    loadRecentSearches() {
        try {
            const saved = localStorage.getItem('ab3_recent_searches');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    }

    open() {
        this.modal.style.display = 'flex';
        this.isOpen = true;
        this.input.value = '';
        this.input.focus();
        this.showRecentSearches();
    }

    close() {
        this.modal.style.display = 'none';
        this.isOpen = false;
        this.selectedIndex = -1;
        this.input.value = '';
    }

    clear() {
        this.input.value = '';
        this.input.focus();
        this.showRecentSearches();
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
      .search-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10000;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 10vh;
      }

      .search-modal-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .search-modal-content {
        position: relative;
        width: 640px;
        max-width: 90vw;
        max-height: 70vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .search-header {
        padding: 1rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 12px;
        font-size: 1.2rem;
      }

      #globalSearchInput {
        width: 100%;
        padding: 12px 40px 12px 40px;
        border: none;
        font-size: 1rem;
        outline: none;
      }

      .search-clear {
        position: absolute;
        right: 8px;
        width: 28px;
        height: 28px;
        border: none;
        background: #f1f5f9;
        border-radius: 4px;
        cursor: pointer;
        font-size: 1.2rem;
        color: #64748b;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .search-clear:hover {
        background: #e2e8f0;
        color: #334155;
      }

      .search-body {
        flex: 1;
        overflow-y: auto;
        padding: 0.5rem;
      }

      .search-section {
        margin-bottom: 1rem;
      }

      .search-section-header {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #64748b;
        padding: 0.5rem 0.75rem;
        letter-spacing: 0.5px;
      }

      .search-result {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }

      .search-result:hover,
      .search-result.selected {
        background: #f1f5f9;
      }

      .result-icon {
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .result-content {
        flex: 1;
        min-width: 0;
      }

      .result-title {
        font-weight: 500;
        color: #1e293b;
        margin-bottom: 2px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .result-meta {
        font-size: 0.85rem;
        color: #64748b;
        display: flex;
        gap: 12px;
      }

      .result-amount {
        font-weight: 600;
        font-size: 0.95rem;
        flex-shrink: 0;
      }

      .amount-positive {
        color: #16a34a;
      }

      .amount-negative {
        color: #dc2626;
      }

      .search-recent {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 10px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: background 0.15s;
      }

      .search-recent:hover {
        background: #f1f5f9;
      }

      .recent-icon {
        font-size: 1.2rem;
        color: #94a3b8;
      }

      .recent-query {
        color: #64748b;
      }

      .search-empty {
        text-align: center;
        padding: 3rem 2rem;
        color: #94a3b8;
      }

      .empty-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      .empty-text {
        font-size: 0.95rem;
      }

      .search-loading {
        text-align: center;
        padding: 2rem;
        color: #64748b;
      }

      .search-footer {
        padding: 0.75rem 1rem;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .search-hints {
        display: flex;
        gap: 1.5rem;
        font-size: 0.85rem;
        color: #64748b;
      }

      .search-hints kbd {
        display: inline-block;
        padding: 2px 6px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        font-family: system-ui;
        font-size: 0.75rem;
        margin: 0 2px;
      }
    `;
        document.head.appendChild(style);
    }
}

// Initialize search modal
window.searchModal = new SearchModal();

console.log('🔍 Search Modal loaded');
