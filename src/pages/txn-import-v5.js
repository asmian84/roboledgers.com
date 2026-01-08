/**
 * Txn Import V5 - Unified Transaction Import Page
 * Combines: InlineImport Zone + AG Grid + 7-Method Categorization + Background Processing
 */

console.log('🚀 Loading Txn Import V5...');

// ============================================
// STATE MANAGEMENT
// ============================================

const V5State = {
  importZoneExpanded: true,
  gridData: [],
  importHistory: [],
  selectedFiles: [],
  gridApi: null,
  undoStack: [],
  isProcessing: false,
  currentProgress: { current: 0, total: 0, message: '' },
  openingBalance: 0, // Changed from 0.00
  recentImports: [], // New property
  accountType: null, // New property
  refPrefix: '' // For Ref# column (e.g., "CHQ" -> CHQ-001, CHQ-002...)
};

const V5_MAX_UNDO_STEPS = 10;

// ============================================
// COA HELPERS (5-Tier Compressed)
// ============================================

function get5TierCoAAccounts() {
  // Try multiple sources for accounts
  let accounts = [];

  // Source 1: window.storage (preferred)
  if (window.storage?.getAccountsSync) {
    accounts = window.storage.getAccountsSync();
    console.log('📊 Loaded', accounts.length, 'accounts from window.storage');
  }

  // Source 2: localStorage fallback
  if (accounts.length === 0) {
    accounts = JSON.parse(localStorage.getItem('ab_accounts') || '[]');
    console.log('📊 Loaded', accounts.length, 'accounts from localStorage');
  }

  // Source 3: window.chartOfAccounts fallback
  if (accounts.length === 0 && window.chartOfAccounts) {
    accounts = window.chartOfAccounts;
    console.log('📊 Loaded', accounts.length, 'accounts from window.chartOfAccounts');
  }

  if (accounts.length === 0) {
    console.warn('⚠️ No COA accounts found! Account dropdown will be empty.');
  }

  // Group into 5 tiers based on account code ranges
  const tiers = {
    ASSETS: [],
    LIABILITIES: [],
    EQUITY: [],
    REVENUE: [],
    EXPENSES: []
  };

  accounts.forEach(acc => {
    const code = parseInt(acc.code);
    if (code >= 1000 && code < 2000) tiers.ASSETS.push(acc);
    else if (code >= 2000 && code < 3000) tiers.LIABILITIES.push(acc);
    else if (code >= 3000 && code < 4000) tiers.EQUITY.push(acc);
    else if (code >= 4000 && code < 5000) tiers.REVENUE.push(acc);
    else if (code >= 5000 && code < 10000) tiers.EXPENSES.push(acc);
  });

  return tiers;
}

function resolveAccountName(val) {
  if (!val) return 'Uncategorized';
  const accounts = window.storage?.getAccountsSync?.() || [];
  const found = accounts.find(a => a.code === val || a.name === val);
  return found ? `${found.code} - ${found.name}` : val;
}

// ============================================
// UNDO SYSTEM
// ============================================

function captureState() {
  const state = {
    gridData: V5State.gridData.map(row => ({ ...row })),
    timestamp: Date.now()
  };

  V5State.undoStack.push(state);
  if (V5State.undoStack.length > V5_MAX_UNDO_STEPS) {
    V5State.undoStack.shift();
  }

  updateUndoButton();
}

function undoLastAction() {
  if (V5State.undoStack.length === 0) return;

  const previousState = V5State.undoStack.pop();
  V5State.gridData = previousState.gridData;

  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }

  updateUndoButton();
  saveData();
}

function updateUndoButton() {
  // Update menu text
  const menuText = document.getElementById('v5-undo-menu-text');
  if (menuText) {
    menuText.textContent = `Undo (${V5State.undoStack.length})`;
  }
}


// ============================================
// SEARCH/FILTER FUNCTION
// ============================================

window.filterV5Grid = function (searchText) {
  if (!V5State.gridApi) return;

  V5State.gridApi.setQuickFilter(searchText);
}

// ============================================
// CUSTOM 5-TIER COA EDITOR
// ============================================

class FiveTierAccountEditor {
  init(params) {
    this.value = params.value;
    this.params = params;

    // Create container
    this.container = document.createElement('div');
    this.container.className = 'five-tier-editor';
    this.container.style.cssText = `
      position: absolute;
      background: var(--bg-primary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 12px;
      min-width: 300px;
      max-height: 400px;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
      z-index: 9999;
    `;

    // Search input
    this.searchInput = document.createElement('input');
    this.searchInput.type = 'text';
    this.searchInput.placeholder = 'Search accounts...';
    this.searchInput.style.cssText = `
      width: 100%;
      padding: 8px;
      margin-bottom: 8px;
      border: 1px solid var(--border-color);
      border-radius: 4px;
    `;
    this.searchInput.addEventListener('input', (e) => {
      this.renderList(e.target.value);
    });

    // List container
    this.listContainer = document.createElement('div');
    this.listContainer.className = 'tier-list';

    this.container.appendChild(this.searchInput);
    this.container.appendChild(this.listContainer);

    this.renderList();
  }

  renderList(filterText = '') {
    const tiers = get5TierCoAAccounts();
    this.listContainer.innerHTML = '';

    // Add "Uncategorized" option
    if (!filterText || 'uncategorized'.includes(filterText.toLowerCase())) {
      const uncatItem = document.createElement('div');
      uncatItem.className = 'tier-item uncategorized';
      uncatItem.textContent = '🔹 Uncategorized';
      uncatItem.style.cssText = `
        padding: 8px;
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
        color: #f59e0b;
        font-weight: 600;
      `;
      uncatItem.onclick = () => {
        this.value = 'Uncategorized';
        this.params.stopEditing();
      };
      this.listContainer.appendChild(uncatItem);
    }

    // Render each tier
    Object.entries(tiers).forEach(([tierName, accounts]) => {
      if (accounts.length === 0) return;

      // Filter accounts if search active
      const filtered = filterText ?
        accounts.filter(a =>
          a.name.toLowerCase().includes(filterText.toLowerCase()) ||
          a.code.includes(filterText)
        ) : accounts;

      if (filtered.length === 0) return;

      // Tier header
      const header = document.createElement('div');
      header.className = 'tier-header';
      header.textContent = `▶️ ${tierName}`;
      header.style.cssText = `
        padding: 8px;
        font-weight: 700;
        background: var(--bg-secondary);
        cursor: pointer;
        border-bottom: 1px solid var(--border-color);
        color: var(--text-primary);
      `;

      const itemsContainer = document.createElement('div');
      itemsContainer.className = 'tier-items';
      itemsContainer.style.display = filterText ? 'block' : 'none'; // Expand if searching

      header.onclick = () => {
        itemsContainer.style.display =
          itemsContainer.style.display === 'none' ? 'block' : 'none';
        header.textContent =
          itemsContainer.style.display === 'none' ?
            `▶️ ${tierName}` : `▼ ${tierName}`;
      };

      // Tier items
      filtered.forEach(account => {
        const item = document.createElement('div');
        item.className = 'tier-account';
        item.textContent = `${account.code} - ${account.name}`;
        item.style.cssText = `
          padding: 6px 8px 6px 20px;
          cursor: pointer;
          border-bottom: 1px solid var(--border-color);
          font-size: 0.9rem;
        `;
        item.onmouseenter = () => item.style.background = 'var(--bg-tertiary)';
        item.onmouseleave = () => item.style.background = 'transparent';
        item.onclick = () => {
          this.value = account.code;
          this.params.stopEditing();
        };

        itemsContainer.appendChild(item);
      });

      this.listContainer.appendChild(header);
      this.listContainer.appendChild(itemsContainer);
    });
  }

  getGui() {
    return this.container;
  }

  getValue() {
    return this.value;
  }

  isPopup() {
    return true;
  }

  destroy() {
    // Cleanup if needed
  }
}

// ====================================================================================
// MAIN RENDER FUNCTION
// ============================================

window.renderTxnImportV5Page = function () {
  return `
    <style>
      /* RESPONSIVE FOUNDATION */
      :root {
        --mobile-max: 767px;
        --tablet-min: 768px;
        --tablet-max: 1023px;
        --desktop-min: 1024px;
      }
      .mobile-only,  .tablet-up, .desktop-up { display: none; }
      @media (max-width: 767px) { .mobile-only { display: block !important; } }
      @media (min-width: 768px) { .tablet-up { display: block !important; } }
      @media (min-width: 768px) { .tablet-up { display: block !important; } }
      @media (min-width: 1024px) { .desktop-up { display: block !important; } }

      /* PHASE 2: Grid Touch-Friendly Mobile Styles */
      @media (max-width: 767px) {
        .ag-theme-alpine { font-size: 14px; }
        .ag-theme-alpine .ag-row { min-height: 56px !important; }
        .ag-theme-alpine .ag-cell { padding: 12px 8px !important; }
        .v5-grid-container { overflow-x: auto; -webkit-overflow-scrolling: touch; }
      }

      /* PHASE 3: Upload Zone Mobile Adaptation */
      @media (max-width: 767px) {
        .v5-dropzone { 
          min-height: 120px !important;
          padding: 1rem !important;
        }
        .v5-dropzone-button {
          min-height: 44px !important; /* Touch target */
          font-size: 16px !important;
        }
      }

      /* PHASE 4: Touch-Friendly Buttons */
      @media (max-width: 767px) {
        .btn-icon, .action-btn {
          min-width: 44px !important;
          min-height: 44px !important;
        }
      }

      /* ========================================
         PHASE 2: NEW LAYOUT CSS - FINTECH STYLE
         ======================================== */
      
      /* Fixed Main Header */
      .v5-main-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.25rem 1.5rem;
        background: var(--bg-primary);
        border-bottom: 2px solid var(--border-color);
        gap: 2rem;
        position: sticky;
        top: 0;
        z-index: 100;
      }
      
      .v5-header-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }
      
      /* ========================================
         UNIFIED COMMAND SURFACE - CARD LAYOUT
         ======================================== */
      
      .v5-unified-card {
        background: white;
        border: 1px solid #E5E7EB;
        border-radius: 8px;
        overflow: hidden;
        margin: 1.5rem;
      }
      
      .v5-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.5rem;
        background: white;
        border-bottom: 1px solid #E5E7EB;
      }
      
      .v5-card-header h2 {
        margin: 0;
        font-size: 1.5rem;
        font-weight: 700;
        color: #111827;
      }
      
      .v5-browse-btn {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        background: #EFF6FF;
        color: #3B82F6;
        border: 1px solid #BFDBFE;
        padding: 0.75rem 1.5rem;
        border-radius: 6px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }
      
      .v5-browse-btn:hover {
        background: #DBEAFE;
      }
      
      .v5-browse-btn i {
        font-size: 1.125rem;
      }
      
      .v5-card-controls {
        display: flex;
        gap: 1.5rem;
        align-items: center;
        padding: 1.5rem;
        background: #F9FAFB;
        border-bottom: 1px solid #E5E7EB;
      }
      
      .v5-card-grid {
        background: white;
        padding: 0;
      }
      
      /* ========================================
         RESPONSIVE & OVERFLOW HANDLING
         ======================================== */
      
      @media (max-width: 1024px) {
        .v5-card-controls {
          flex-wrap: wrap;
        }
      }
      
      @media (max-width: 768px) {
        .v5-unified-card {
          margin: 0.5rem;
        }
        
        .v5-card-header {
          flex-direction: column;
          gap: 1rem;
        }
      }
      
      .v5-card-grid {
        overflow-x: auto;
      }
      
      /* ========================================
         SECTION 5: GRID THEMING
         ======================================== */
      
      /* Rainbow Theme */
      .ag-theme-rainbow .ag-row-even { background: #FEF3C7; }
      .ag-theme-rainbow .ag-row-odd { background: #DBEAFE; }
      .ag-theme-rainbow .ag-header { 
        background: linear-gradient(90deg, #EF4444, #F59E0B, #10B981, #3B82F6, #8B5CF6); 
        color: white;
      }
      
      /* Ledger Pad Theme */
      .ag-theme-ledger .ag-row { 
        background: #F0FDF4; 
        border-bottom: 1px solid #86EFAC;
      }
      .ag-theme-ledger .ag-header { background: #D1FAE5; color: #065F46; }
      .ag-theme-ledger .ag-root-wrapper { border: 2px solid #10B981; }
      
      /* Post-it Note Theme */
      .ag-theme-postit .ag-row { background: #FFF9C4; }
      .ag-theme-postit .ag-header { background: #FFD54F; color: #5D4037; }
      .ag-theme-postit .ag-cell { border-right: 1px dashed #FBC02D; }
      .ag-theme-postit .ag-root-wrapper { 
        border: 2px solid #FBC02D; 
        box-shadow: 3px 3px 8px rgba(251, 192, 45, 0.3);
      }
      
      /* Classic Theme - uses default AG Grid styles */
      .ag-theme-classic { /* No custom styles */ }
      
      /* Print Styles */
      .v5-history-drawer {
        background: white;
        border-bottom: 1px solid #E5E7EB;
        max-height: 300px;
        overflow-y: auto;
      }
      
      .v5-history-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.75rem 1.5rem;
        border-bottom: 1px solid #F3F4F6;
        transition: background 0.2s;
      }
      
      .v5-history-item:hover {
        background: #F9FAFB;
      }
      
      .v5-history-delete-btn {
        padding: 0.5rem;
        background: transparent;
        border: none;
        color: #EF4444;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
      }
      
      .v5-history-delete-btn:hover {
        background: #FEE2E2;
      }
      
      .v5-history-delete-btn i {
        font-size: 1.125rem;
      }
      
      
      /* Bulk Actions Inline Bar - COMPACT */
      .v5-bulk-actions-bar {
        display: none;
        align-items: center;
        gap: 1rem;
        padding: 0 1.5rem; /* Vertical padding removed */
        background: #FEF3C7;
        border-bottom: 1px solid #FDE68A;
      }

      /* Control Toolbar - Conditional display, clean styling */
      .v5-control-toolbar {
        display: none;
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        background: #ffffff;
        border-bottom: 1px solid #E5E7EB;
        margin: 0;
      }
      
      .v5-control-toolbar.show-data {
        display: flex;
      }
      
      /* Ref# Input - Top Label, Ultra Compact */
      .v5-ref-input-wrapper {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
        flex-shrink: 0;
      }
      
      .v5-ref-input-wrapper label {
        font-size: 0.625rem;
        font-weight: 700;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.8px;
        line-height: 1;
      }
      
      .v5-ref-input {
        width: 48px;
        padding: 0.375rem 0.5rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.875rem;
        font-weight: 600;
        text-align: center;
        font-family: 'Courier New', monospace;
        transition: all 0.2s;
      }
      
      .v5-ref-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      /* Search Bar - Flex Grow */
      .v5-search-wrapper {
        flex: 1;
        position: relative;
        display: flex;
        align-items: center;
      }
      
      .v5-search-wrapper i {
        position: absolute;
        left: 0.75rem;
        color: #9ca3af;
        font-size: 1.125rem;
      }
      
      .v5-search-input {
        width: 100%;
        padding: 0.625rem 0.75rem 0.625rem 2.5rem;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 0.875rem;
        transition: all 0.2s;
      }
      
      .v5-search-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .v5-search-input::placeholder {
        color: #9ca3af;
      }
      
      /* Balances Card - Natural blend, no border */
      .v5-balances-card {
        display: flex;
        gap: 1.5rem;
        padding: 0.75rem 1.25rem;
        background: transparent;
        border-radius: 6px;
        flex-shrink: 0;
      }
      
      .v5-balance-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 80px;
      }
      
      .v5-balance-label {
        font-size: 0.625rem;
        font-weight: 700;
        color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .v5-balance-value {
        font-size: 0.875rem;
        font-weight: 700;
        color: #1F2937;
        font-family: 'Courier New', monospace;
      }
      
      .v5-balance-value.positive {
        color: #10b981;
      }
      
      .v5-balance-value.negative {
        color: #ef4444;
      }
      
      .v5-balance-item.ending .v5-balance-value {
        font-size: 1rem;
        color: #60a5fa;
      }
      
      /* Bulk Operations Bar - Super Snug, Increased Height */
      .v5-bulk-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        min-height: 50px !important;
        padding: 1.25rem 1.5rem !important;
        background: #fef3c7 !important;
        border-bottom: 1px solid #fbbf24 !important;
        margin: 0 !important;
        gap: 1rem;
        animation: slideDown 0.3s ease-out;
      }
      
      /* DUAL-PURPOSE INLINE BAR */
      .v5-inline-bar {
        background: #fef3c7;
        border-bottom: 1px solid #fbbf24;
        padding: 1rem 1.5rem;
        margin: 0;
        display: flex;
        align-items: center;
        gap: 1rem;
        min-height: 50px;
      }
      
      .v5-inline-bar > div {
        display: flex;
        align-items: center;
        gap: 1rem;
        width: 100%;
      }
      
      .btn-inline-apply {
        padding: 0.5rem 1rem;
        background: #3b82f6;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .btn-inline-apply:hover {
        background: #2563eb;
      }
      
      .btn-inline-danger {
        padding: 0.5rem 1rem;
        background: #ef4444;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .btn-inline-danger:hover {
        background: #dc2626;
      }
      
      .btn-inline-cancel {
        padding: 0.5rem 1rem;
        background: white;
        color: #64748b;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        cursor: pointer;
        font-weight: 600;
      }
      
      .btn-inline-cancel:hover {
        background: #f8fafc;
      }
      
      @keyframes slideDown {
        from {
          opacity: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      .v5-bulk-info {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-weight: 600;
        color: #92400e;
      }
      
      .v5-bulk-info i {
        font-size: 1.25rem;
      }
      
      .v5-bulk-actions {
        display: flex;
        gap: 0.75rem;
      }
      
      .btn-bulk {
        padding: 0.5rem 1rem;
        background: #ffffff;
        border: 1px solid #d97706;
        border-radius: 4px;
        font-weight: 600;
        color: #92400e;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .btn-bulk:hover {
        background: #fed7aa;
      }
      
      .btn-bulk-cancel {
        padding: 0.5rem 1rem;
        background: #ffffff;
        border: 1px solid #dc2626;
        border-radius: 4px;
        font-weight: 600;
        color: #dc2626;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .btn-bulk-cancel:hover {
        background: #fee2e2;
      }
      /* ========================================
         SECTION 4: HORIZONTAL HISTORY STRIP
         ======================================== */
      
      /* ===== COLLAPSIBLE RECENT IMPORTS CARD ===== */
      .v5-recent-imports-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        margin-bottom: 16px;
        overflow: hidden;
      }

      .v5-card-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 16px;
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        cursor: pointer;
        user-select: none;
      }

      .v5-card-header:hover {
        background: #f1f5f9;
      }

      .v5-card-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 0.875rem;
        color: #1e293b;
      }

      .v5-card-title i {
        font-size: 1.125rem;
        color: #3b82f6;
      }

      .v5-collapse-btn {
        background: none;
        border: none;
        cursor: pointer;
        color: #64748b;
        padding: 4px;
        transition: transform 0.2s;
      }

      .v5-collapse-btn.collapsed {
        transform: rotate(-90deg);
      }

      .v5-card-content {
        overflow: hidden;
        transition: max-height 0.3s ease;
      }

      /* ===== HORIZONTAL HISTORY STRIP (from data-import.js) ===== */
      .v5-history-strip {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 24px;
        background: white;
        border-bottom: 1px solid #e2e8f0;
        overflow-x: auto;
        overflow-y: hidden;
        white-space: nowrap;
        flex-shrink: 0;
      }

      .v5-history-scroll {
        display: flex;
        gap: 12px;
        flex: 1;
      }

      .v5-history-chip {
        min-width: 220px;
        max-width: 220px;
        padding: 10px 12px;
        border: 1px solid #f1f5f9;
        border-radius: 8px;
        cursor: pointer;
        background: white;
        transition: all 0.2s;
        flex-shrink: 0;
      }

      .v5-history-chip:hover {
        border-color: #3b82f6;
        box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      }

      .v5-chip-top {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.75rem;
        color: #64748b;
        margin-bottom: 4px;
        position: relative;
      }

      .v5-chip-bank {
        font-weight: 600;
        color: #1e40af;
        flex: 1;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .v5-chip-date {
        color: #94a3b8;
        font-size: 0.7rem;
        margin-right: 24px;
      }

      .v5-chip-delete {
        position: absolute;
        top: -2px;
        right: 0;
        background: none;
        border: none;
        color: #cbd5e1;
        cursor: pointer;
        font-size: 14px;
        padding: 2px;
      }

      .v5-chip-delete:hover {
        color: #ef4444;
        background: #fee2e2;
        border-radius: 4px;
      }

      .v5-chip-bot {
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-size: 0.8rem;
      }

      .v5-chip-filename {
        font-weight: 600;
        color: #0f172a;
        font-size: 0.75rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        flex: 1;
        margin-right: 8px;
      }

      .v5-chip-count {
        color: #94a3b8;
        font-size: 0.7rem;
        background: #f1f5f9;
        padding: 1px 5px;
        border-radius: 4px;
        white-space: nowrap;
      }

      /* Remove old history styles */
      /* Responsive Breakpoints */
      @media (max-width: 1200px) {
        .v5-balances-card {
          gap: 1rem;
        }
        
        .v5-balance-item {
          min-width: 70px;
        }
      }
      
      @media (max-width: 768px) {
        .v5-control-toolbar {
          flex-wrap: wrap;
        }
        
        .v5-search-wrapper {
          order: 3;
          flex-basis: 100%;
        }
        
        .v5-balances-card {
          order: 2;
          flex-wrap: wrap;
          gap: 0.75rem;
        }
        
        .v5-bulk-bar {
          flex-direction: column;
          gap: 0.75rem;
          align-items: stretch;
        }
        
        .v5-bulk-actions {
          justify-content: stretch;
        }
        
        .btn-bulk, .btn-bulk-cancel {
          flex: 1;
        }
      }
      
      /* ========================================
         PART 4: BANK STATEMENT PRINT VIEW
         ======================================== */
      
      @media print {
        /* Hide all web UI elements */
        .sidebar,
        nav,
        .v5-main-header,
        .v5-control-toolbar,
        .v5-bulk-bar,
        .v5-history-panel,
        .v5-empty-state,
        .btn-icon,
        button,
        .ag-header-cell-menu-button,
        .ag-selection-checkbox,
        [class*="action"],
        input[type="checkbox"] {
          display: none !important;
        }
        
        /* Page setup */
        @page {
          size: A4;
          margin: 15mm;
        }
        
        body {
          background: white;
          margin: 0;
          padding: 0;
          font-family: 'Times New Roman', 'Georgia', serif;
          font-size: 11pt;
          color: #000;
        }
        
        /* Statement header */
        .print-statement-header {
          display: block !important;
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #000;
          padding-bottom: 20px;
        }
        
        .print-statement-header h1 {
          font-size: 24pt;
          font-weight: bold;
          margin: 0 0 10px 0;
          letter-spacing: 2px;
        }
        
        .print-statement-header h2 {
          font-size: 14pt;
          margin: 0 0 15px 0;
          color: #333;
        }
        
        .print-statement-header p {
          margin: 5px 0;
          font-size: 10pt;
          color: #666;
        }
        
        /* Grid styling for print */
        .v5-grid-container,
        #v5-grid-container {
          display: block !important;
          width: 100%;
          margin: 0;
          padding: 0;
        }
        
        .ag-root-wrapper {
          border: 1px solid #000 !important;
        }
        
        .ag-header {
          background: #f0f0f0 !important;
          border-bottom: 2px solid #000 !important;
          font-weight: bold;
        }
        
        .ag-header-cell {
          border-right: 1px solid #000 !important;
          padding: 8px !important;
        }
        
        .ag-cell {
          border-right: 1px solid #ccc !important;
          border-bottom: 1px solid #ccc !important;
          padding: 6px !important;
          font-size: 10pt;
        }
        
        .ag-row {
          page-break-inside: avoid;
        }
        
        /* Number formatting */
        .ag-cell[col-id="Debit"],
        .ag-cell[col-id="Credit"],
        .ag-cell[col-id="Balance"] {
          text-align: right;
          font-family: 'Courier New', monospace;
        }
        
        /* Alternating row colors */
        .ag-row-even {
          background: #fafafa !important;
        }
        
        .ag-row-odd {
          background: white !important;
        }
        
        /* Page breaks */
        .print-page-break {
          page-break-after: always;
        }
      }
    </style>

    <div class="txn-import-v5-container">
      
      <!-- PHASE 1: FIXED MAIN HEADER (Always Visible) -->
      <div class="v5-main-header">
        <!-- Left: Icon + Title + Status -->
        <div class="v5-title-section">
          <div class="v5-page-icon">
            <i class="ph ph-arrow-square-down"></i>
          </div>
          <div class="v5-title-text">
            <h1>Imported Transactions (Grid)</h1>
            <p class="v5-subtitle">
              <span class="v5-account-type">CHECKING</span>
              <span class="v5-dot">•</span>
              <span class="v5-status">Ready for Review</span>
            </p>
          </div>
        </div>
        
        <!-- Center: Browse/Drop Files (Hybrid - Click OR Drag) -->
        <div class="v5-browse-section">
          <button class="btn-browse" id="v5-hybrid-dropzone"
                  onclick="document.getElementById('v5-file-input').click()"
                  ondragover="event.preventDefault(); this.classList.add('drag-over')"
                  ondragleave="this.classList.remove('drag-over')"
                  ondrop="handleV5DragDrop(event)">
            <i class="ph ph-cloud-arrow-up"></i>
            <span>Drag and drop files here</span>
            <small style="display: block; font-size: 0.75rem; opacity: 0.8;">Limit 200MB per file • PDF, CSV, Excel</small>
          </button>
          <input type="file" id="v5-file-input" multiple accept=".pdf,.csv" 
                 style="display: none;" onchange="handleV5FileSelect(event)">
        </div>
        
        <!-- Right: Action Icons -->
        <div class="v5-header-actions">
          <button class="btn-icon" onclick="startOverV5()" title="Start Over">
            <i class="ph ph-arrows-counter-clockwise"></i>
          </button>
          <button class="btn-icon" onclick="toggleV5History()" title="Toggle History" id="v5-history-toggle-btn">
            <i class="ph ph-clock-counter-clockwise"></i>
          </button>
          <button class="btn-icon" onclick="popOutV5Grid()" title="Pop Out">
            <i class="ph ph-arrow-square-out"></i>
          </button>
          <button class="btn-icon" onclick="showKeyboardShortcuts()" title="Keyboard Shortcuts">
            <i class="ph ph-question"></i>
          </button>
          <div class="v5-menu-wrapper">
            <button class="btn-icon" onclick="toggleV5HeaderMenu()" title="More" id="v5-header-menu-btn">
              <i class="ph ph-dots-three"></i>
            </button>
            <div id="v5-header-dropdown" class="v5-dropdown-menu" style="display: none;">
              <button onclick="exportV5Excel()">
                <i class="ph ph-file-xls"></i>
                Export Excel
              </button>
              <button onclick="printV5Preview()">
                <i class="ph ph-printer"></i>
                PDF Print Preview
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- PHASE 1: NEW CONTROL TOOLBAR -->
      <div class="v5-control-toolbar" id="v5-control-toolbar">
        <!-- Left: Ref# Input -->
        <div class="v5-ref-input-wrapper">
          <label for="v5-ref-input">Ref#</label>
          <input type="text" 
                 id="v5-ref-input" 
                 class="v5-ref-input" 
                 maxlength="4" 
                 placeholder="####"
                 oninput="updateRefPrefix(this.value)"
                 title="Reference number prefix (max 4 characters)">
        </div>
        
        <!-- Center: Search Bar -->
        <div class="v5-search-wrapper">
          <i class="ph ph-magnifying-glass"></i>
          <input type="text" 
                 id="v5-search-input" 
                 class="v5-search-input" 
                 placeholder="Search transactions..."
                 oninput="handleV5Search(event)">
        </div>
        
        <!-- Right: Balances (Moved from header) -->
        <div class="v5-balances-card" id="v5-balances-card">
          <div class="v5-balance-item">
            <div class="v5-balance-label">OPENING</div>
            <div class="v5-balance-value" id="v5-opening-bal">$0</div>
          </div>
          <div class="v5-balance-item">
            <div class="v5-balance-label">TOTAL IN</div>
            <div class="v5-balance-value positive" id="v5-total-in">+$0.00</div>
          </div>
          <div class="v5-balance-item">
            <div class="v5-balance-label">TOTAL OUT</div>
            <div class="v5-balance-value negative" id="v5-total-out">-$0.00</div>
          </div>
          <div class="v5-balance-item ending">
            <div class="v5-balance-label">ENDING</div>
            <div class="v5-balance-value" id="v5-ending-bal">$0.00</div>
          </div>
        </div>
      </div>
      
      <!-- PHASE 1: BULK OPERATIONS BAR (Conditional) -->
      <div class="v5-bulk-bar" id="v5-bulk-bar" style="display: none;">
        <div class="v5-bulk-info">
          <i class="ph ph-check-square"></i>
          <span id="v5-bulk-count">0 items selected</span>
        </div>
        <div class="v5-bulk-actions">
          <button class="btn-bulk" onclick="bulkCategorizeV5()">
            <i class="ph ph-tag"></i>
            Bulk Categorize
          </button>
          <button class="btn-bulk" onclick="bulkRenameV5()">
            <i class="ph ph-pencil"></i>
            Bulk Rename
          </button>
          <button class="btn-bulk-cancel" onclick="cancelBulkSelection()">
            <i class="ph ph-x"></i>
            Cancel
          </button>
        </div>
      </div>
      
      
      <!-- OLD HEADER REMOVED - Content continues below -->
      <div class="OLD-v5-header-unified" style="display:none;">
        <!-- Left: Icon + Title -->
        <div class="v5-title-section">
          <div class="v5-page-icon">
            <i class="ph ph-arrow-square-down"></i>
          </div>
          <div class="v5-title-text">
            <h1>Imported Transactions (Grid)</h1>
            <p class="v5-subtitle">
              <span class="v5-account-type">CHECKING</span>
              <span class="v5-dot">•</span>
              <span class="v5-status">Ready for Review</span>
            </p>
          </div>
        </div>
        
        <!-- OLD RECON CARD - Now moved to control toolbar -->
        <div class="v5-recon-inline" id="v5-recon-inline" style="display: none !important;">
          <div class="v5-recon-mini">
            <div class="v5-recon-mini-label">OPENING BAL</div>
            <div class="v5-recon-mini-value" id="v5-opening-bal-mini">$0</div>
          </div>
          <div class="v5-recon-mini">
            <div class="v5-recon-mini-label">TOTAL IN</div>
            <div class="v5-recon-mini-value positive" id="v5-total-in-mini">+0.00</div>
          </div>
          <div class="v5-recon-mini">
            <div class="v5-recon-mini-label">TOTAL OUT</div>
            <div class="v5-recon-mini-value negative" id="v5-total-out-mini">-0.00</div>
          </div>
          <div class="v5-recon-mini ending">
            <div class="v5-recon-mini-label">ENDING BAL</div>
            <div class="v5-recon-mini-value" id="v5-ending-bal-mini">$0.00</div>
          </div>
        </div>
        
        <!-- Center-Right: Browse/Drop Files (always visible) -->
        <div class="v5-browse-section">
          <button class="btn-browse" onclick="document.getElementById('v5-file-input').click()">
            <i class="ph ph-cloud-arrow-up"></i>
            <span>Drag and drop files here</span>
            <small style="display: block; font-size: 0.75rem; opacity: 0.8;">Limit 200MB per file • PDF, CSV, Excel</small>
          </button>
          <input type="file" id="v5-file-input" multiple accept=".pdf,.csv" 
                 style="display: none;" onchange="handleV5FileSelect(event)">
        </div>
        
        <!-- Right: Icon Actions + Help + Menu -->
        <div class="v5-header-actions-basic">
          <button class="btn-icon" onclick="startOverV5()" title="Start Over">
            <i class="ph ph-arrows-counter-clockwise"></i>
          </button>
          <button class="btn-icon" onclick="toggleV5History()" title="Toggle History" id="v5-history-toggle-btn">
            <i class="ph ph-clock-counter-clockwise"></i>
          </button>
          <button class="btn-icon" onclick="popOutV5Grid()" title="Pop Out">
            <i class="ph ph-arrow-square-out"></i>
          </button>
          <button class="btn-icon" onclick="showKeyboardShortcuts()" title="Keyboard Shortcuts">
            <i class="ph ph-question"></i>
          </button>
          <div class="v5-menu-wrapper">
            <button class="btn-icon" onclick="toggleV5HeaderMenu()" title="More" id="v5-header-menu-btn">
              <i class="ph ph-dots-three"></i>
            </button>
            <div id="v5-header-dropdown" class="v5-dropdown-menu" style="display: none;">
              <button onclick="exportV5Excel()">
                <i class="ph ph-file-xls"></i>
                Export Excel
              </button>
              <button onclick="printV5Preview()">
                <i class="ph ph-printer"></i>
                PDF Print Preview
              </button>
              <button onclick="undoLastAction()">
                <i class="ph ph-arrow-counter-clockwise"></i>
                <span id="v5-undo-menu-text">Undo (0)</span>
              </button>
              <hr>
              <button onclick="showV5Appearance()">
                <i class="ph ph-palette"></i>
                Appearance
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Action Bar - Only shown when grid has data -->
      <div class="v5-action-bar" id="v5-action-bar" style="display: none;">
        <!-- Expand/Collapse All Buttons (Left) -->
        <div class="v5-expand-collapse-btns" style="display: flex; gap: 8px;">
          <button class="btn-action-secondary" onclick="expandAllV5()">
            <i class="ph ph-caret-down"></i>
            Expand All
          </button>
          <button class="btn-action-secondary" onclick="collapseAllV5()">
            <i class="ph ph-caret-up"></i>
            Collapse All
          </button>
        </div>
        
        <!-- Left: Selection Count (shown when selected) -->
        <div class="v5-selection-info" id="v5-selection-info" style="display: none;">
          <span id="v5-selection-count">0 selected</span>
        </div>
        
        <!-- Center: Bulk Actions (only shown when rows selected) -->
        <div class="v5-actions-center">
          <button class="btn-action" onclick="bulkCategorizeV5()" id="v5-bulk-categorize-btn" style="display: none;">
            <i class="ph ph-tag"></i>
            Bulk Categorize
          </button>
          
          <button class="btn-action" onclick="bulkRenameV5()" id="v5-bulk-rename-btn" style="display: none;">
            <i class="ph ph-pencil"></i>
            Bulk Rename
          </button>
          
          <button class="btn-action-secondary" onclick="clearV5Selection()" id="v5-clear-btn" style="display: none;">
            <i class="ph ph-x"></i>
            Clear
          </button>
          
          <button class="btn-action-blue" onclick="autoCategorizeV5()" id="v5-auto-categorize-btn">
            <i class="ph ph-magic-wand"></i>
            Auto-Categorize
          </button>
        </div>
        
        <!-- Right: Search + Menu -->
        <div class="v5-actions-right">
          <div class="v5-search-compact">
            <i class="ph ph-magnifying-glass"></i>
            <input type="text" 
                   id="v5-search-input" 
                   placeholder="Search transactions..." 
                   oninput="filterV5Grid(this.value)">
          </div>
          
          <div class="v5-menu-wrapper">
            <button class="btn-icon" onclick="toggleV5ActionMenu()" title="More Actions" id="v5-action-menu-btn">
              <i class="ph ph-dots-three-vertical"></i>
            </button>
            <div id="v5-action-dropdown" class="v5-dropdown-menu" style="display: none;">
              <button onclick="setGridTheme('default'); toggleV5ActionMenu();">
                <i class="ph ph-palette"></i>
                Theme: Default
              </button>
              <button onclick="setGridTheme('rainbow'); toggleV5ActionMenu();">
                <i class="ph ph-rainbow"></i>
                Theme: Rainbow
              </button>
              <button onclick="setGridTheme('ledger'); toggleV5ActionMenu();">
                <i class="ph ph-notepad"></i>
                Theme: Ledger Pad
              </button>
              <button onclick="setGridTheme('postit'); toggleV5ActionMenu();">
                <i class="ph ph-note"></i>
                Theme: Post-it Note
              </button>
              <button onclick="setGridTheme('classic'); toggleV5ActionMenu();">
                <i class="ph ph-squares-four"></i>
                Theme: Classic
              </button>
              <hr>
              <button onclick="exportSelected()">
                <i class="ph ph-export"></i>
                Export Selected
              </button>
              <button onclick="deleteSelected()">
                <i class="ph ph-trash"></i>
                Delete Selected
              </button>
              <hr>
              <button onclick="selectAllV5()">
                <i class="ph ph-check-square"></i>
                Select All
              </button>
              <button onclick="deselectAllV5()">
                <i class="ph ph-square"></i>
                Deselect All
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Drag & Drop Overlay (shown when dragging files over entire page) -->
      <div id="v5-drop-overlay" class="v5-drop-overlay" style="display: none;"
           ondragover="handleV5DragOver(event)" 
           ondrop="handleV5Drop(event)"
           ondragleave="handleV5DragLeave(event)">
        <div class="v5-drop-overlay-content">
          <i class="ph ph-cloud-arrow-down" style="font-size: 4rem;"></i>
          <h2>Drop files here to import</h2>
          <p>PDF or CSV bank statements</p>
        </div>
      </div>
      
      <!-- FIX 2: Horizontal History Strip -->
      <div class="v5-history-strip" id="v5-history-strip" style="display: none;">
        <div class="v5-history-scroll" id="v5-history-scroll">
        </div>
      </div>
      
      <!-- Progress Indicator (shown during parsing) -->
      <div id="v5-progress-container" class="v5-progress-container" style="display: none;">
        <div class="v5-progress-content">
          <p id="v5-progress-message">Processing files...</p>
          <div class="v5-progress-bar">
            <div id="v5-progress-fill" class="v5-progress-fill" style="width: 0%;"></div>
          </div>
        </div>
      </div>
      
      <style>
        .v5-grid-container {
          flex: 1;
          overflow: auto;
        }
        
        /* CRITICAL: Force AG Grid wrapper to fill container */
        #v5-grid-container .ag-root-wrapper {
          height: 100% !important;
          min-height: 400px !important;
        }
        
      /* Grid Container - FULL HEIGHT to 1px from bottom */
      .v5-grid-container {
        width: 100%;
        height: calc(100vh - 200px - 1px) !important;
        min-height: 400px;
        margin: 0 !important;
        padding: 0 !important;
      }
        
        @media (max-width: 768px) {
          #v5-grid-container {
            height: calc(100vh - 250px) !important;
            min-height: 400px;
          }
        }
        
        @media (min-width: 1400px) {
          #v5-grid-container {
            height: calc(100vh - 240px) !important;
          }
        }
      </style>

      <!-- Empty State (shown when no data) -->
      <div id="v5-empty-state" class="v5-empty-state">
        <div class="v5-empty-icon">
          <i class="ph ph-book-open-text" style="font-size: 8rem; color: var(--text-tertiary);"></i>
        </div>
        <h2>No transactions yet.</h2>
        <p style="color: var(--text-secondary);">
          Import your bank statement or add your first entry manually to get started.
        </p>
      </div>
      
      <!-- Dual-Purpose Inline Bar -->
      <div id="v5-inline-bar" class="v5-inline-bar" style="display: none;">
        
        <!-- STATE 1: Bulk Operations -->
        <div id="bulk-mode-bar" style="display: none;">
          <span id="selection-count" style="font-weight: 600;">0 selected</span>
          <select id="bulk-category-dropdown" style="padding: 0.5rem; border-radius: 4px; border: 1px solid #cbd5e1; min-width: 250px;">
            <option value="">Select Account...</option>
          </select>
          <button onclick="window.applyBulkCategoryInline()" class="btn-inline-apply">Apply Category</button>
          <button onclick="window.cancelBulkSelection()" class="btn-inline-cancel">✕ Clear</button>
        </div>
        
        <!-- STATE 2: Start Over Confirmation -->
        <div id="startover-mode-bar" style="display: none;">
          <span style="font-weight: 600;">⚠️ Clear all data and start fresh?</span>
          <button onclick="window.confirmStartOverInline()" class="btn-inline-danger">Yes, Clear All</button>
          <button onclick="window.cancelStartOverInline()" class="btn-inline-cancel">Cancel</button>
        </div>
        
      </div>
      
      <!-- AG Grid -->
      <div id="v5-grid-container" class="v5-grid-container ag-theme-alpine">
        <!-- Grid will be initialized here -->
      </div>
      
    </div>
  `;
};

// ============================================
// UI INTERACTION HANDLERS
// ============================================

window.toggleV5History = function () {
  const zone = document.getElementById('v5-history-zone');
  const btn = document.getElementById('v5-history-toggle-btn');

  if (zone.classList.contains('collapsed')) {
    zone.classList.remove('collapsed');
    zone.classList.add('expanded');
  } else {
    zone.classList.remove('expanded');
    zone.classList.add('collapsed');
  }
};

window.toggleV5HeaderMenu = function () {
  const menu = document.getElementById('v5-header-dropdown');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

  // Close on click outside
  if (menu.style.display === 'block') {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
};

window.toggleV5ActionMenu = function () {
  const menu = document.getElementById('v5-action-dropdown');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';

  if (menu.style.display === 'block') {
    setTimeout(() => {
      document.addEventListener('click', function closeMenu(e) {
        if (!menu.contains(e.target)) {
          menu.style.display = 'none';
          document.removeEventListener('click', closeMenu);
        }
      });
    }, 100);
  }
};

// ============================================
// ACCOUNT TYPE DETECTION
// ============================================

function detectAccountType(transactions) {
  if (!transactions || transactions.length === 0) return 'CHECKING';

  // Analyze transaction pattern
  let positiveCount = 0;
  let negativeCount = 0;
  let totalPositive = 0;
  let totalNegative = 0;

  transactions.forEach(txn => {
    const amount = parseFloat(txn.amount) || 0;
    if (amount > 0) {
      positiveCount++;
      totalPositive += amount;
    } else if (amount < 0) {
      negativeCount++;
      totalNegative += Math.abs(amount);
    }
  });

  // Credit Card Pattern: Mostly positive (charges), few large negatives (payments)
  // Bank Account Pattern: Mix or mostly negative (withdrawals more common)

  const positiveRatio = positiveCount / transactions.length;

  // If 70%+ transactions are positive AND average positive is small (typical purchases)
  // AND there are a few large negatives (payments) → Credit Card
  if (positiveRatio > 0.7 && positiveCount > 0) {
    const avgPositive = totalPositive / positiveCount;
    const avgNegative = negativeCount > 0 ? totalNegative / negativeCount : 0;

    // Credit cards: many small charges, few large payments
    if (avgNegative > avgPositive * 3) {
      return 'CREDIT_CARD';
    }
  }

  // Default to bank account
  return 'CHECKING';
}

// ============================================
// DEBIT/CREDIT/BALANCE HELPERS
// ============================================

function updateRowBalance(row) {
  // Balance is computed from running total
  // This should be recalculated for entire grid when any row changes
  recalculateAllBalances();
}

function recalculateAllBalances() {
  if (!V5State.gridData || V5State.gridData.length === 0) return;

  const isCreditCard = V5State.accountType === 'CREDIT_CARD';

  let runningBalance = V5State.openingBalance || 0;

  V5State.gridData.forEach(txn => {
    // Support both capitalized and lowercase field names
    const debit = parseFloat(txn.Debit || txn.debit) || 0;
    const credit = parseFloat(txn.Credit || txn.credit) || 0;

    if (isCreditCard) {
      // Credit Card (Liability): Balance = Opening - Debit + Credit
      // Payments (debit) reduce what you owe, Purchases (credit) increase what you owe
      runningBalance = runningBalance - debit + credit;
    } else {
      // Bank Account (Asset): FIXED - Credits = deposits (IN), Debits = withdrawals (OUT)
      // Balance = Opening + Credits - Debits
      runningBalance = runningBalance + credit - debit;
    }

    txn.balance = parseFloat(runningBalance.toFixed(2)); // Round to avoid floating point errors
  });

  // Refresh grid to show updated balances
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }

  // Update reconciliation card
  updateReconciliationCard();
}

window.swapDebitCredit = function (rowIndex) {
  if (!V5State.gridData || !V5State.gridApi) return;
  const row = V5State.gridData[rowIndex];
  if (!row) return;

  // Swap debit and credit
  const temp = row.debit;
  row.debit = row.credit;
  row.credit = temp;

  // Also swap capitalized versions
  if (row.Debit !== undefined || row.Credit !== undefined) {
    const tempCap = row.Debit;
    row.Debit = row.Credit;
    row.Credit = tempCap;
  }

  // Recalculate all balances
  recalculateAllBalances();
  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  updateReconciliationCard();
  captureState();
  saveData();
};

window.deleteRow = function (rowId) {
  const index = V5State.gridData.findIndex(r => r.id === rowId);
  if (index === -1) return;

  // Remove row
  V5State.gridData.splice(index, 1);

  // Recalculate all balances
  recalculateAllBalances();
};

// ============================================
// BULK ACTION FUNCTIONS
// ============================================

window.bulkCategorizeV5 = function () {
  const selected = V5State.gridApi?.getSelectedRows() || [];
  if (selected.length === 0) {
    // Toast removed
    return;
  }

  // Toast removed
  // TODO: Implement bulk categorization modal
};

window.bulkRenameV5 = function () {
  const selected = V5State.gridApi?.getSelectedRows() || [];
  if (selected.length === 0) {
    // Toast removed
    return;
  }

  // Toast removed
  // TODO: Implement bulk rename modal
};

window.clearV5Selection = function () {
  V5State.gridApi?.deselectAll();
  updateV5SelectionUI();
};

window.autoCategorizeV5 = async function () {
  if (V5State.gridData.length === 0) {
    // Toast removed
    return;
  }

  // Toast removed

  const categorized = await window.ProcessingEngine.categorizeTransactions(
    V5State.gridData,
    (progress, message) => {
      console.log(`Progress: ${progress}% - ${message}`);
    }
  );

  V5State.gridData = categorized;
  V5State.gridApi?.setRowData(categorized);
  updateReconciliationCard();

  // Toast removed
};

window.reviewMatchesV5 = function () {
  // TODO: Show review UI for matched transactions
  // Toast removed
};

// ============================================
// SELECTION UI UPDATE
// ============================================

function updateV5SelectionUI() {
  const selectedCount = V5State.gridApi?.getSelectedRows()?.length || 0;
  const selectionInfo = document.getElementById('v5-selection-info');
  const selectionCount = document.getElementById('v5-selection-count');
  const bulkCategorizeBtn = document.getElementById('v5-bulk-categorize-btn');
  const bulkRenameBtn = document.getElementById('v5-bulk-rename-btn');
  const clearBtn = document.getElementById('v5-clear-btn');

  if (selectedCount > 0) {
    selectionInfo.style.display = 'block';
    selectionCount.textContent = `${selectedCount} selected`;
    bulkCategorizeBtn.style.display = 'flex';
    bulkRenameBtn.style.display = 'flex';
    clearBtn.style.display = 'flex';
  } else {
    selectionInfo.style.display = 'none';
    bulkCategorizeBtn.style.display = 'none';
    bulkRenameBtn.style.display = 'none';
    clearBtn.style.display = 'none';
  }
}

// Grid selection helpers
window.selectAllV5 = function () {
  V5State.gridApi?.selectAll();
};

window.deselectAllV5 = function () {
  V5State.gridApi?.deselectAll();
};

// ============================================
// RECONCILIATION UPDATE (REVISED)
// ============================================

function updateReconciliationCard() {
  const gridData = V5State.gridData || [];
  if (gridData.length === 0) {
    console.log('⚠️ No grid data to update balance card');
    return;
  }

  // FIXED: Calculate totals from Debit/Credit columns, not amount field
  let totalIn = 0;  // Credits = money IN
  let totalOut = 0; // Debits = money OUT

  gridData.forEach(txn => {
    const credit = parseFloat(txn.Credit || txn.credit) || 0;
    const debit = parseFloat(txn.Debit || txn.debit) || 0;

    totalIn += credit;   // Sum all credits
    totalOut += debit;   // Sum all debits
  });

  const openingBal = V5State.openingBalance || 0.00;
  const endingBal = openingBal + totalIn - totalOut;

  // PHASE 3: Update NEW balance card in control toolbar
  const openingEl = document.getElementById('v5-opening-bal');
  const totalInEl = document.getElementById('v5-total-in');
  const totalOutEl = document.getElementById('v5-total-out');
  const endingEl = document.getElementById('v5-ending-bal');

  if (openingEl) openingEl.textContent =
    '$' + openingBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (totalInEl) totalInEl.textContent =
    '+$' + totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (totalOutEl) totalOutEl.textContent =
    '-$' + totalOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (endingEl) endingEl.textContent =
    '$' + endingBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  console.log('✅ Balance card updated:', { openingBal, totalIn, totalOut, endingBal });
}

// ==================================================
// PHASE 3: SEARCH BAR FILTERING
// ==================================================

window.handleV5Search = function (event) {
  const searchTerm = event.target.value.toLowerCase().trim();

  if (!V5State.gridApi) {
    console.warn('Grid API not ready');
    return;
  }

  if (!searchTerm) {
    // Clear filter
    V5State.gridApi.setFilterModel(null);
    console.log('🔍 Search cleared - showing all rows');
    return;
  }

  // Apply external filter
  V5State.gridApi.setFilterModel({
    // Filter across multiple columns
    description: {
      filterType: 'text',
      type: 'contains',
      filter: searchTerm
    }
  });

  // Also use quick filter for multi-column search
  V5State.gridApi.setGridOption('quickFilterText', searchTerm);

  const rowCount = V5State.gridApi.getDisplayedRowCount();
  console.log(`🔍 Searching for "${searchTerm}" - ${rowCount} results`);
};

// ==================================================
// PHASE 3: BULK OPERATIONS
// ==================================================

window.updateV5SelectionUI = function () {
  if (!V5State.gridApi) return;

  const count = V5State.gridApi.getSelectedNodes().length;

  // Show/hide inline bar bulk mode
  const inlineBar = document.getElementById('v5-inline-bar');
  const bulkMode = document.getElementById('bulk-mode-bar');
  const startoverMode = document.getElementById('startover-mode-bar');
  const oldBulkBar = document.getElementById('v5-bulk-bar');

  if (count > 0) {
    if (inlineBar) inlineBar.style.display = 'flex';
    if (bulkMode) {
      bulkMode.style.display = 'flex';
      document.getElementById('selection-count').textContent = `${count} selected`;
      populateBulkCategoryDropdown();
    }
    if (startoverMode) startoverMode.style.display = 'none';
    if (oldBulkBar) oldBulkBar.style.display = 'none';
  } else {
    if (inlineBar) inlineBar.style.display = 'none';
    if (bulkMode) bulkMode.style.display = 'none';
    if (oldBulkBar) oldBulkBar.style.display = 'none';
  }
};

// Helper: Populate bulk category dropdown
window.populateBulkCategoryDropdown = function () {
  const dropdown = document.getElementById('bulk-category-dropdown');
  if (!dropdown) return;

  const coa = JSON.parse(localStorage.getItem('ab_chart_of_accounts') || '[]');
  const cats = {
    'Assets': coa.filter(a => a.code >= 1000 && a.code < 2000),
    'Liabilities': coa.filter(a => a.code >= 2000 && a.code < 3000),
    'Equity': coa.filter(a => a.code >= 3000 && a.code < 4000),
    'Revenue': coa.filter(a => a.code >= 4000 && a.code < 5000),
    'Expenses': coa.filter(a => a.code >= 5000 && a.code < 10000)
  };

  let opts = '<option value="">Select Account...</option>';
  Object.keys(cats).forEach(cat => {
    if (cats[cat].length > 0) {
      opts += `<optgroup label="${cat}">`;
      cats[cat].forEach(a => opts += `<option value="${a.code}">${a.code} - ${a.name}</option>`);
      opts += '</optgroup>';
    }
  });
  dropdown.innerHTML = opts;
};

// Apply bulk category from inline bar
window.applyBulkCategoryInline = function () {
  const code = document.getElementById('bulk-category-dropdown').value;
  if (!code) return;

  const coa = JSON.parse(localStorage.getItem('ab_chart_of_accounts') || '[]');
  const acct = coa.find(a => a.code == code);
  if (!acct) return;

  const rows = V5State.gridApi.getSelectedRows();
  rows.forEach(r => {
    r.account = `${acct.code} - ${acct.name}`;
    r.category = acct.name;
  });

  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  saveData();
  console.log(`✅ Categorized ${rows.length} to ${acct.name}`);
  cancelBulkSelection();
};

// Show start over confirmation in inline bar
window.startOverV5 = function () {
  const inlineBar = document.getElementById('v5-inline-bar');
  const bulkMode = document.getElementById('bulk-mode-bar');
  const startoverMode = document.getElementById('startover-mode-bar');

  if (inlineBar) inlineBar.style.display = 'flex';
  if (bulkMode) bulkMode.style.display = 'none';
  if (startoverMode) startoverMode.style.display = 'flex';
};

// Confirm start over from inline bar
window.confirmStartOverInline = async function () {
  await confirmStartOver();
  cancelStartOverInline();
};

// Cancel start over
window.cancelStartOverInline = function () {
  const inlineBar = document.getElementById('v5-inline-bar');
  const startoverMode = document.getElementById('startover-mode-bar');

  if (inlineBar) inlineBar.style.display = 'none';
  if (startoverMode) startoverMode.style.display = 'none';
};

// Update Ref# prefix and refresh grid
window.updateRefPrefix = function (value) {
  V5State.refPrefix = value.toUpperCase().trim();

  // Refresh grid to show new Ref# values
  if (V5State.gridApi) {
    V5State.gridApi.refreshCells({ columns: ['refNumber'], force: true });
  }

  console.log(`✅ Ref# prefix updated: "${V5State.refPrefix}"`);
};

// ============================================
// SYSTEM A: GRID DATA PERSISTENCE (FIXED)
// ============================================

window.saveData = function () {
  try {
    // FIX 4: Strictly filter out file blobs before saving
    const cleanData = V5State.gridData.map(({ sourceFileBlob, ...keep }) => keep);

    localStorage.setItem('ab_v5_grid_data', JSON.stringify(cleanData));
    localStorage.setItem('ab_v5_last_save', new Date().toISOString());

    console.log(`💾 Saved ${cleanData.length} transactions (blobs filtered)`);
    return true;
  } catch (error) {
    console.error('❌ Failed to save data:', error);
    return false;
  }
};

window.loadSavedData = function () {
  try {
    const savedData = localStorage.getItem('ab_v5_grid_data');
    if (!savedData) {
      console.log('📂 No saved data found');
      return false;
    }

    V5State.gridData = JSON.parse(savedData);
    console.log(`📂 Loaded ${V5State.gridData.length} transactions from storage`);

    // Initialize grid with loaded data
    if (V5State.gridData.length > 0) {
      initV5Grid();

      // Show toolbar
      const toolbar = document.getElementById('v5-control-toolbar');
      if (toolbar) toolbar.style.display = 'flex';

      // Update balances
      updateBalanceSummary();
    }

    return true;
  } catch (error) {
    console.error('❌ Failed to load saved data:', error);
    return false;
  }
};

// =================================================================
// WORKING IMPORT HISTORY - Copied from data-import.js (Horizontal)
// =================================================================

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function getImportHistory() {
  try {
    const history = localStorage.getItem('ab_import_history');
    const parsed = history ? JSON.parse(history) : [];
    console.log(`📦 getImportHistory returning ${parsed.length} items`);
    return parsed;
  } catch (e) {
    console.error('Failed to load import history:', e);
    return [];
  }
}

window.saveImportToHistory = function (file, parsedData) {
  const history = getImportHistory();


  // NO duplicate check - every upload creates a new chip

  const newImport = {
    id: generateId(),
    filename: file.name,
    date: new Date().toISOString(),
    count: parsedData.length,
    bank: V5State.accountType || parsedData[0]?._bank || 'Unknown Bank',
    data: parsedData
  };

  history.unshift(newImport);
  if (history.length > 20) history.pop();

  // Save to localStorage
  localStorage.setItem('ab_import_history', JSON.stringify(history));

  // CRITICAL: Sync V5State.recentImports with localStorage
  V5State.recentImports = history;

  console.log(`✅ Saved to history: ${file.name} (${parsedData.length} txns) - Total history: ${history.length} items`);
  // renderV5History(); // DISABLED - rebuilding chips
  return newImport.id;
};

window.deleteV5Import = function (id, event) {
  if (event) event.stopPropagation();

  if (!confirm('Delete this import from history?')) return;

  const history = getImportHistory();
  const newHistory = history.filter(item => item.id !== id);
  localStorage.setItem('ab_import_history', JSON.stringify(newHistory));
  // renderV5History(); // DISABLED - rebuilding chips
  window.showToast('Import removed from history', 'info');
};

window.loadV5FromHistory = function (id) {
  const history = getImportHistory();
  const item = history.find(i => i.id === id);
  if (item && item.data) {
    V5State.gridData = item.data;
    if (V5State.gridApi) {
      V5State.gridApi.setGridOption('rowData', item.data);
    } else {
      initV5Grid();
    }
    updateBalanceSummary();
    window.showToast(`Loaded ${item.filename}`, 'success');
  }
};

window.renderV5History = function () {
  // DISABLED: Return immediately - rebuilding from scratch
  return;

  console.log('📋 Rendering V5 history...');
  const strip = document.getElementById('v5-history-strip');
  const scroll = document.getElementById('v5-history-scroll');

  if (!strip || !scroll) {
    console.warn('⚠️ History elements not found');
    return;
  }

  const history = getImportHistory();
  console.log(`Found ${history.length} history items`);

  // Get the blue panel element
  const panel = document.getElementById('v5-history-panel');

  if (history.length === 0) {
    // Hide panel if no history
    if (panel) panel.style.display = 'none';
    strip.style.display = 'none';
    return;
  }

  // Show panel and strip (but user can collapse it)
  if (panel) panel.style.display = 'block';
  strip.style.display = 'flex';

  scroll.innerHTML = history.map(item => `
        <div class="v5-history-chip" onclick="loadV5FromHistory('${item.id}')">
            <div class="v5-chip-top">
                <span class="v5-chip-bank">${item.bank}</span>
                <span class="v5-chip-date">${new Date(item.date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                <button class="v5-chip-delete" onclick="deleteV5Import('${item.id}', event)" title="Delete">✕</button>
            </div>
            <div class="v5-chip-bot">
                <span class="v5-chip-filename" title="${item.filename}">${item.filename}</span>
                <span class="v5-chip-count">${item.count} txns</span>
            </div>
        </div>
    `).join('');

  console.log(`✅ Rendered ${history.length} history chips`);
};

window.deleteImportSource = function (fileId) {
  if (!confirm('Delete all transactions from this import?')) return;

  // Count rows before deletion
  const beforeCount = V5State.gridData.length;

  // Remove all rows with this sourceFileId
  V5State.gridData = V5State.gridData.filter(r => r.sourceFileId !== fileId);

  const afterCount = V5State.gridData.length;
  const deletedCount = beforeCount - afterCount;

  // Update grid
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }

  // Remove from history
  V5State.recentImports = V5State.recentImports.filter(h => h.id !== fileId);
  localStorage.setItem('ab_import_history', JSON.stringify(V5State.recentImports));

  // CRITICAL: Save updated grid data
  saveData();

  // CRITICAL: Recalculate balances
  updateBalanceSummary();

  // Refresh history display
  loadImportHistory();

  console.log(`🗑️ Deleted ${deletedCount} transactions from source: ${fileId}`);
};

window.toggleV5History = function () {
  const panel = document.getElementById('v5-history-panel');
  const strip = document.getElementById('v5-history-strip');

  if (!panel && !strip) return;

  // Toggle the strip display
  if (strip) {
    const isHidden = strip.style.display === 'none';
    strip.style.display = isHidden ? 'flex' : 'none';

    if (isHidden && typeof renderV5History === 'function') {
      renderV5History();
    }

    console.log(isHidden ? '📜 History shown' : '📜 History hidden');
  }
};

window.openSourceFile = function (fileId) {
  const row = V5State.gridData.find(r => r.sourceFileId === fileId);
  if (!row || !row.sourceFileBlob) {
    console.warn('Source file not found for:', fileId);
    return;
  }

  const url = URL.createObjectURL(row.sourceFileBlob);
  window.open(url, '_blank');
  console.log(`📂 Opened source file: ${row.sourceFileName}`);
};

// ============================================
// INLINE BULK ACTIONS
// ============================================

window.applyBulkAccount = function () {
  const accountSelect = document.getElementById('v5-bulk-account-select');
  const selectedAccount = accountSelect.value;

  if (!selectedAccount) {
    alert('Please select an account');
    return;
  }

  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  if (selectedRows.length === 0) return;

  selectedRows.forEach(row => {
    row.account = selectedAccount;
  });

  V5State.gridApi.refreshCells({ columns: ['account'], force: true });
  console.log(`✅ Applied account "${selectedAccount}" to ${selectedRows.length} rows`);
};

window.bulkSearchReplace = function () {
  const searchValue = document.getElementById('v5-bulk-search').value;
  const replaceValue = document.getElementById('v5-bulk-replace').value;

  if (!searchValue) {
    alert('Please enter a search term');
    return;
  }

  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  if (selectedRows.length === 0) return;

  let count = 0;
  selectedRows.forEach(row => {
    if (row.description && row.description.includes(searchValue)) {
      row.description = row.description.replace(new RegExp(searchValue, 'g'), replaceValue);
      count++;
    }
  });

  V5State.gridApi.refreshCells({ columns: ['description'], force: true });
  console.log(`✅ Replaced "${searchValue}" with "${replaceValue}" in ${count} rows`);
};

// ============================================
// SECTION 2: COA DROPDOWN TREE STRUCTURE
// ============================================

window.populateCOADropdown = function (selectId) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const coa = get5TierCoAAccounts();

  const roots = {
    'Assets': coa.filter(a => a.code >= 1000 && a.code < 2000),
    'Liabilities': coa.filter(a => a.code >= 2000 && a.code < 3000),
    'Equity': coa.filter(a => a.code >= 3000 && a.code < 4000),
    'Revenue': coa.filter(a => a.code >= 4000 && a.code < 5000),
    'Expenses': coa.filter(a => a.code >= 5000 && a.code < 10000)
  };

  select.innerHTML = '<option value="">Select Account...</option>';

  Object.entries(roots).forEach(([category, accounts]) => {
    if (accounts.length === 0) {
      // Allow root selection if no sub-accounts
      const option = document.createElement('option');
      option.value = category;
      option.textContent = category;
      select.appendChild(option);
    } else {
      // Create optgroup for category
      const optgroup = document.createElement('optgroup');
      optgroup.label = category;

      accounts.forEach(acct => {
        const option = document.createElement('option');
        option.value = `${acct.code} - ${acct.name}`;
        option.textContent = `${acct.code} - ${acct.name}`;
        optgroup.appendChild(option);
      });

      select.appendChild(optgroup);
    }
  });

  console.log(`📋 Populated COA dropdown with 5 categories`);
};

// ============================================
// SECTION 5: GRID THEMING
// ============================================

// ============================================
// SYSTEM C: GRID THEMING (FIXED)
// ============================================

window.setGridTheme = function (theme) {
  console.log(`🎨 Setting theme to: ${theme}`);

  // FIX 3: Target the grid container specifically
  const container = document.getElementById('v5-grid-container');
  if (!container) {
    console.error('❌ Grid container #v5-grid-container not found');
    return;
  }

  // Remove all theme classes
  container.classList.remove('ag-theme-rainbow', 'ag-theme-ledger', 'ag-theme-postit', 'ag-theme-classic');

  // Add new theme class (if not default)
  if (theme && theme !== 'default') {
    container.classList.add(`ag-theme-${theme}`);
  }

  // Update state
  V5State.gridTheme = theme;

  // Persist immediately
  localStorage.setItem('v5_grid_theme', theme);

  // Verify class was applied
  console.log(`✅ Theme applied. Container classes:`, container.className);
  console.log(`💾 Theme saved to localStorage: ${theme}`);
};

// Initialize theme on page load
const savedTheme = localStorage.getItem('v5_grid_theme') || 'default';
if (savedTheme !== 'default') {
  setTimeout(() => setGridTheme(savedTheme), 500);
}

window.bulkCategorizeV5 = function () {
  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  if (selectedRows.length === 0) return;

  const coa = JSON.parse(localStorage.getItem('ab_chart_of_accounts') || '[]');
  const cats = {
    'Assets': coa.filter(a => a.code >= 1000 && a.code < 2000),
    'Liabilities': coa.filter(a => a.code >= 2000 && a.code < 3000),
    'Equity': coa.filter(a => a.code >= 3000 && a.code < 4000),
    'Revenue': coa.filter(a => a.code >= 4000 && a.code < 5000),
    'Expenses': coa.filter(a => a.code >= 5000 && a.code < 10000)
  };

  let opts = '<select id="bulk-acct" style="width:100%;padding:0.5rem;border:1px solid #d1d5db;border-radius:6px"><option value="">Select Account...</option>';
  Object.keys(cats).forEach(cat => {
    if (cats[cat].length > 0) {
      opts += `<optgroup label="${cat}">`;
      cats[cat].forEach(a => opts += `<option value="${a.code}">${a.code} - ${a.name}</option>`);
      opts += '</optgroup>';
    }
  });
  opts += '</select>';

  const m = document.createElement('div');
  m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000';
  m.innerHTML = `<div style="background:white;border-radius:8px;padding:2rem;width:500px;max-width:90vw">
<h2 style="margin:0 0 1rem 0">Bulk Categorize</h2>
<p style="color:#6b7280;margin-bottom:1.5rem">${selectedRows.length} items selected</p>
<div style="margin-bottom:1.5rem"><label style="display:block;font-weight:600;margin-bottom:0.5rem">Account:</label>${opts}</div>
<div style="display:flex;gap:0.5rem;justify-content:flex-end">
<button onclick="this.closest('div[style*=fixed]').remove()" style="padding:0.5rem 1rem;border:1px solid #d1d5db;background:white;border-radius:6px;cursor:pointer">Cancel</button>
<button onclick="window.applyBulkCat()" style="padding:0.5rem 1rem;border:none;background:#3b82f6;color:white;border-radius:6px;cursor:pointer">Apply</button>
</div></div>`;
  document.body.appendChild(m);
};

window.applyBulkCat = function () {
  const code = document.getElementById('bulk-acct').value;
  if (!code) return;
  const coa = JSON.parse(localStorage.getItem('ab_chart_of_accounts') || '[]');
  const acct = coa.find(a => a.code == code);
  const rows = V5State.gridApi.getSelectedRows();
  rows.forEach(r => { r.account = `${acct.code} - ${acct.name}`; r.category = acct.name; });
  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  saveData();
  console.log(`✅ Categorized ${rows.length} to ${acct.name}`);
  document.querySelector('div[style*="fixed"]').remove();
  cancelBulkSelection();
};

window.bulkRenameV5 = function () {
  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  if (selectedRows.length === 0) return;

  const m = document.createElement('div');
  m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000';
  m.innerHTML = `<div style="background:white;border-radius:8px;padding:2rem;width:500px;max-width:90vw">
<h2 style="margin:0 0 1rem 0">Bulk Rename (Search & Replace)</h2>
<p style="color:#6b7280;margin-bottom:1.5rem">${selectedRows.length} items selected</p>
<div style="margin-bottom:1rem"><label style="display:block;font-weight:600;margin-bottom:0.5rem">Search:</label>
<input id="bulk-search" type="text" placeholder="Text to find" style="width:100%;padding:0.5rem;border:1px solid #d1d5db;border-radius:6px"></div>
<div style="margin-bottom:1.5rem"><label style="display:block;font-weight:600;margin-bottom:0.5rem">Replace:</label>
<input id="bulk-replace" type="text" placeholder="Text to replace with" style="width:100%;padding:0.5rem;border:1px solid #d1d5db;border-radius:6px"></div>
<div style="display:flex;gap:0.5rem;justify-content:flex-end">
<button onclick="this.closest('div[style*=fixed]').remove()" style="padding:0.5rem 1rem;border:1px solid #d1d5db;background:white;border-radius:6px;cursor:pointer">Cancel</button>
<button onclick="window.applyBulkRename()" style="padding:0.5rem 1rem;border:none;background:#3b82f6;color:white;border-radius:6px;cursor:pointer">Apply</button>
</div></div>`;
  document.body.appendChild(m);
};

window.applyBulkRename = function () {
  const search = document.getElementById('bulk-search').value;
  const replace = document.getElementById('bulk-replace').value;
  if (!search) return;
  const rows = V5State.gridApi.getSelectedRows();
  rows.forEach(r => { if (r.description) r.description = r.description.replace(new RegExp(search, 'g'), replace); });
  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  saveData();
  document.querySelector('div[style*="fixed"]').remove();
  cancelBulkSelection();
};

window.cancelBulkSelection = function () {
  if (V5State.gridApi) {
    V5State.gridApi.deselectAll();
    updateV5SelectionUI();
    console.log('❌ Bulk selection cancelled');
  }
};

// ============================================
// FILE UPLOAD HANDLERS
// ============================================

window.handleV5DragOver = function (e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add('drag-over');
};

window.handleV5DragLeave = function (e) {
  e.currentTarget.classList.remove('drag-over');
};

window.handleV5Drop = function (e) {
  e.preventDefault();
  e.stopPropagation();

  // Hide overlay
  document.getElementById('v5-drop-overlay').style.display = 'none';

  const files = Array.from(e.dataTransfer.files).filter(f =>
    f.name.endsWith('.pdf') || f.name.endsWith('.csv')
  );

  if (files.length > 0) {
    V5State.selectedFiles = files;

    // Automatically start parsing
    parseV5Files();
  }
};

window.handleV5FileSelect = function (e) {
  const files = Array.from(e.target.files);
  if (files.length === 0) return;

  V5State.selectedFiles = files;

  // Automatically start parsing
  parseV5Files();
};

function displayV5SelectedFiles() {
  const filesList = document.getElementById('v5-files-list');
  const filesUl = document.getElementById('v5-files-ul');

  filesUl.innerHTML = '';
  V5State.selectedFiles.forEach(file => {
    const li = document.createElement('li');
    li.textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    li.style.padding = '4px 0';
    filesUl.appendChild(li);
  });

  filesList.style.display = 'block';
}

window.clearV5Files = function () {
  V5State.selectedFiles = [];
  document.getElementById('v5-file-input').value = '';
};

// ============================================
// PARSE FILES (BACKGROUND PROCESSING)
// ============================================

window.parseV5Files = async function () {
  if (V5State.selectedFiles.length === 0) return;

  V5State.isProcessing = true;
  document.getElementById('v5-progress-container').style.display = 'block';

  try {
    // Use ProcessingEngine for background parsing
    const transactions = await window.ProcessingEngine.parseFiles(
      V5State.selectedFiles,
      updateV5Progress
    );

    // Categorize using all 7 methods
    updateV5Progress(0, 1, 'Categorizing transactions...');
    const categorized = await window.ProcessingEngine.categorizeTransactions(
      transactions,
      (progress, message) => {
        updateV5Progress(progress, 100, message);
      }
    );

    // ============================================
    // PHASE 3: ATTACH SOURCE METADATA TO EACH ROW
    // ============================================
    const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const file = V5State.selectedFiles[0]; // Get first file
    const fileType = file.name.endsWith('.pdf') ? 'pdf' : 'csv';

    categorized.forEach(row => {
      row.sourceFileId = fileId;
      row.sourceFileName = file.name;
      row.sourceFileBlob = file;
      row.sourceFileType = fileType;
    });

    // Add to import history
    // Save to history using proper function
    const currentHistory = getImportHistory();
    currentHistory.unshift({
      id: fileId,
      filename: file.name,
      date: new Date().toISOString(),
      count: categorized.length,
      status: 'Success'
    });
    if (currentHistory.length > 20) currentHistory.pop();
    localStorage.setItem('ab_import_history', JSON.stringify(currentHistory));
    V5State.recentImports = currentHistory; // Keep in sync

    // Load into grid
    V5State.gridData = categorized;

    // AUTO-DETECT account type from transaction patterns
    V5State.accountType = detectAccountType(categorized);
    console.log(`📊 Detected account type: ${V5State.accountType}`);

    // Generate IDs and convert Amount to Debit/Credit
    const isCreditCard = V5State.accountType === 'CREDIT_CARD';

    let runningBalance = V5State.openingBalance || 0;
    categorized.forEach((txn, index) => {
      if (!txn.id) {
        txn.id = `txn_${Date.now()}_${index}`;
      }

      // Assign sequential reference number (001, 002, 003...)
      txn.refNumber = String(index + 1).padStart(3, '0');

      // Convert amount to debit/credit based on account type
      const amount = parseFloat(txn.amount) || 0;

      if (isCreditCard) {
        // Credit Card: Positive = Charge (Credit), Negative = Payment (Debit)
        if (amount > 0) {
          txn.credit = amount;  // Charges increase what you owe
          txn.debit = 0;
          runningBalance += amount;
        } else {
          txn.debit = Math.abs(amount);  // Payments reduce what you owe
          txn.credit = 0;
          runningBalance -= Math.abs(amount);
        }
      } else {
        // Bank Account: Positive = Deposit (Debit), Negative = Withdrawal (Credit)
        if (amount > 0) {
          txn.debit = amount;  // Deposits increase balance
          txn.credit = 0;
          runningBalance += amount;
        } else {
          txn.credit = Math.abs(amount);  // Withdrawals decrease balance
          txn.debit = 0;
          runningBalance -= Math.abs(amount);
        }
      }

      // Set balance
      txn.balance = runningBalance;
    });

    // Initialize or update grid
    if (!V5State.gridApi) {
      // Grid not initialized yet, call init
      initV5Grid();
    } else {
      // Grid exists, just update data
      V5State.gridApi.setGridOption('rowData', categorized);
    }

    // Show control toolbar when data is loaded
    const controlToolbar = document.querySelector('.v5-control-toolbar');
    if (controlToolbar && categorized.length > 0) {
      controlToolbar.classList.add('show-data');
      console.log('✅ Control toolbar shown - data loaded');
    }

    // Force reconciliation update
    updateReconciliationCard();

    // Save to cache
    await window.CacheManager.saveTransactions(categorized);

    // Add to history
    const historyEntry = {
      id: Date.now(),
      files: V5State.selectedFiles.map(f => f.name),
      count: categorized.length,
      timestamp: new Date().toISOString()
    };
    await window.CacheManager.saveImportHistoryEntry(historyEntry);


    // Save to history - ONE CHIP PER FILE for individual deletion
    console.log('📋 Saving individual files to history...', V5State.selectedFiles);
    if (V5State.selectedFiles && V5State.selectedFiles.length > 0 && typeof saveImportToHistory === 'function') {
      // Create a chip for EACH file, so user can delete individual files
      V5State.selectedFiles.forEach((file, index) => {
        const fileId = `file-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`;
        const pseudoFile = {
          name: file.name,
          _fileId: fileId  // Track unique file ID for deletion
        };
        saveImportToHistory(pseudoFile, categorized);
        console.log(`✅ Chip created for: ${file.name} (ID: ${fileId})`);
      });
      console.log(`✅ Created ${V5State.selectedFiles.length} chips for ${V5State.selectedFiles.length} files`);
    } else {
      console.error('❌ saveImportToHistory NOT called:', {
        hasFiles: V5State.selectedFiles && V5State.selectedFiles.length > 0,
        funcExists: typeof saveImportToHistory === 'function'
      });
    }

    // Render history strip
    if (typeof renderV5History === 'function') {
      setTimeout(() => renderV5History(), 200);
      console.log('✅ renderV5History scheduled');
    } else {
      console.error('❌ renderV5History NOT found');
    }

    // Clear files
    clearV5Files();

    // Success - data loaded into grid

  } catch (error) {
    console.error('Parse failed:', error);

    // Check if ALL files were duplicates
    const isDuplicateError = error.message && error.message.includes('DUPLICATE_FILE');

    if (isDuplicateError) {
      // Friendly message with automatic fix option
      if (confirm('These files have already been imported.\n\nWould you like to clear the import history and re-import them?')) {
        try {
          // Clear duplicate cache
          await window.BrainStorage.clearAllFileHashes();

          console.log('Import history cleared');

          // Clear file selection so they can re-select
          clearV5Files();
        } catch (clearError) {
          console.error('Failed to clear cache:', clearError);
          console.error('Failed to clear cache');
        }
      } else {
        console.log('Import cancelled - files already imported');
      }
    } else {
      // Other parsing errors
      console.error('Failed to parse files');
    }
  } finally {
    V5State.isProcessing = false;
    document.getElementById('v5-progress-container').style.display = 'none';
  }
};

function updateV5Progress(current, total, message) {
  const fill = document.getElementById('v5-progress-fill');
  const msg = document.getElementById('v5-progress-message');

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  fill.style.width = `${percentage}%`;
  msg.textContent = message || `Processing (${current}/${total})...`;


  V5State.currentProgress = { current, total, message };
}

// ============================================
// AG GRID INITIALIZATION WITH KEYBOARD SHORTCUTS
// ============================================

window.initV5Grid = function () {
  const container = document.getElementById('v5-grid-container');
  if (!container) {
    console.error('Grid container not found!');
    return;
  }

  // IMPORTANT: Hide empty state, show grid
  const emptyState = document.getElementById('v5-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  container.style.display = 'block';

  console.log('✅ Initializing grid with', V5State.gridData.length, 'transactions');
  console.log('📊 First 3 transactions:', V5State.gridData.slice(0, 3));

  const columnDefs = [
    {
      headerName: '',
      checkboxSelection: true,
      headerCheckboxSelection: true,
      width: 50
    },
    // Source column removed - icon moved to Actions column
    {
      headerName: 'Ref#',
      field: 'refNumber',
      width: 100,
      minWidth: 80,
      flex: 0,
      valueGetter: (params) => {
        if (!params.data.refNumber) return '';
        const prefix = V5State.refPrefix || '';
        // Add hyphen if prefix exists
        return prefix ? `${prefix}-${params.data.refNumber}` : params.data.refNumber;
      },
      cellStyle: { fontWeight: '600', color: '#6B7280' }
    },
    {
      headerName: 'Date',
      field: 'date',
      width: 120,
      editable: true,
      valueFormatter: params => params.value ? new Date(params.value).toLocaleDateString() : ''
    },
    {
      headerName: 'Description',
      field: 'description',
      flex: 2,
      minWidth: 250,
      editable: true
    },
    {
      headerName: 'Debit',
      field: 'debit',
      width: 120,
      editable: true,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return val > 0 ? '$' + val.toFixed(2) : '';
      },
      valueSetter: params => {
        const val = parseFloat(params.newValue) || 0;
        params.data.debit = val;
        params.data.credit = 0; // Clear credit when setting debit
        // Recalculate balance
        updateRowBalance(params.data);
        return true;
      }
    },
    {
      headerName: 'Credit',
      field: 'credit',
      width: 120,
      editable: true,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return val > 0 ? '$' + val.toFixed(2) : '';
      },
      valueSetter: params => {
        const val = parseFloat(params.newValue) || 0;
        params.data.credit = val;
        params.data.debit = 0; // Clear debit when setting credit
        // Recalculate balance
        updateRowBalance(params.data);
        return true;
      }
    },
    {
      headerName: 'Balance',
      field: 'balance',
      width: 130,
      editable: false,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      },
      cellStyle: params => {
        const val = parseFloat(params.value) || 0;
        return val < 0 ? { color: '#ef4444' } : { color: '#10b981' };
      }
    },
    {
      headerName: 'Account',
      field: 'account',
      flex: 1,
      minWidth: 200,
      editable: true,
      cellEditor: FiveTierAccountEditor,
      valueGetter: params => {
        // Support multiple field names from different parsers
        return params.data.account || params.data.Category || params.data.AccountId || 'Uncategorized';
      },
      valueFormatter: params => resolveAccountName(params.value)
    },
    {
      headerName: 'Actions',
      field: 'actions',
      width: 150,
      cellRenderer: (params) => {
        // Source file icon - dynamic based on type
        let sourceIcon = '';
        if (params.data.sourceFileType) {
          const isPdf = params.data.sourceFileType === 'pdf' || params.data.sourceFileType.includes('pdf');
          const icon = isPdf ? 'ph-file-pdf' : 'ph-file-csv';
          const color = isPdf ? '#EF4444' : '#10B981';
          sourceIcon = `<i class="ph ${icon}" 
                 onclick="openSourceFile('${params.data.sourceFileId}')" 
                 style="cursor: pointer; color: ${color}; margin-right: 0.5rem; font-size: 1.125rem;"
                 title="Open ${params.data.sourceFileName}"></i>`;
        }

        return `
          <div style="display: flex; gap: 8px; align-items: center; height: 100%;">
            ${sourceIcon}
            <button 
              class="action-btn" 
              onclick="window.swapDebitCredit(${params.node.rowIndex})" 
              title="Swap Debit/Credit"
              style="padding: 4px 8px; background: #3b82f6; color: white; border: none; border-radius: 4px; cursor: pointer;"
            >⇄</button>
            <button 
              class="action-btn delete-btn" 
              onclick="window.deleteV5Row(${params.node.rowIndex})" 
              title="Delete"
              style="padding: 4px 8px; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;"
            >✕</button>
          </div>
        `;
      }
    }
  ];

  console.log('📋 Column Definitions:', columnDefs);
  console.log('📊 Total columns:', columnDefs.length);
  columnDefs.forEach((col, i) => {
    console.log(`  Column ${i}: "${col.headerName}" (field: ${col.field}, width: ${col.width})`);
  });

  const gridOptions = {
    columnDefs,
    rowData: V5State.gridData,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true
    },
    rowSelection: 'multiple',
    onCellValueChanged: (params) => {
      captureState();
      saveData();

      // Machine learning
      if (params.colDef.field === 'category') {
        window.ProcessingEngine.learnFromUserAction('category_change', {
          description: params.data.description,
          newCategory: params.newValue
        });
      }
    },
    onSelectionChanged: () => {
      updateV5SelectionUI();
    },
    onFirstDataRendered: (params) => {
      console.log('🎯 First data rendered - auto-sizing columns');
      params.api.sizeColumnsToFit();
    },
    onFirstDataRendered: (params) => {
      console.log('🎯 First data rendered - auto-sizing columns');
      params.api.sizeColumnsToFit();
    },
    onGridReady: (params) => {
      console.log('✅ AG Grid onGridReady fired');
      V5State.gridApi = params.api;

      // Size columns to fit viewport
      params.api.sizeColumnsToFit();
      console.log('✅ Grid API stored and columns auto-fitted');

      // Log grid state
      const rect = container.getBoundingClientRect();
      console.log('📐 Grid container dimensions:', {
        width: rect.width,
        height: rect.height,
        top: rect.top,
        left: rect.left,
        visible: rect.height > 0 && rect.width > 0
      });
      console.log('🎯 Grid has', params.api.getDisplayedRowCount(), 'displayed rows');
    }
  };

  // Initialize grid
  console.log('🔧 Creating AG Grid instance...');
  console.log('Container element:', container);
  console.log('Container computed style:', window.getComputedStyle(container).display, window.getComputedStyle(container).height);
  console.log('Grid options:', gridOptions);

  try {
    // Create grid
    V5State.gridApi = agGrid.createGrid(container, gridOptions);

    console.log('✅ AG Grid initialized successfully');
    console.log('📊 Grid API:', V5State.gridApi);

    // Populate COA dropdown in bulk actions bar
    populateCOADropdown('v5-bulk-account-select');

    // Populate COA dropdown in grid's Account cell editor (if exists)
    const accountEditor = document.querySelector('.ag-cell-editor select');
    if (accountEditor && accountEditor.id) {
      populateCOADropdown(accountEditor.id);
    }

    // FORCE container to be visible with explicit height!
    container.style.display = 'block';
    container.style.visibility = 'visible';
    container.style.opacity = '1';
    container.style.position = 'relative';
    container.style.height = 'calc(100vh - 250px)'; // Fill viewport minus header/padding
    container.style.minHeight = '500px'; // Minimum height
    container.style.zIndex = '1';
    console.log('✅ Container forced to visible with height:', container.style.height);

    // CRITICAL: Hide empty state now that grid has data
    const emptyState = document.getElementById('v5-empty-state');
    if (emptyState) {
      emptyState.style.display = 'none';
      console.log('✅ Empty state hidden');
    }
  } catch (error) {
    console.error('❌ Failed to create AG Grid:', error);
  }

  // Add keyboard shortcut listeners
  setupV5KeyboardShortcuts();

  // Update reconciliation card
  updateReconciliationCard();
};

// ============================================
// KEYBOARD SHORTCUTS
// ============================================

function setupV5KeyboardShortcuts() {
  document.addEventListener('keydown', handleV5KeyboardShortcut);
}

function handleV5KeyboardShortcut(e) {
  const isCtrl = e.ctrlKey || e.metaKey;

  // Only active if grid is visible
  if (document.getElementById('v5-grid-container').style.display === 'none') return;

  // Ctrl+Z: Undo
  if (isCtrl && e.key === 'z' && !e.shiftKey) {
    e.preventDefault();
    undoLastAction();
  }

  // Ctrl+S: Save
  if (isCtrl && e.key === 's') {
    e.preventDefault();
    saveData();
    // PART 3: Silent operation - no toast
    console.log('💾 Data saved to cache');
  }

  // Delete: Delete selected rows
  if (e.key === 'Delete' && !e.target.matches('input, textarea')) {
    e.preventDefault();
    deleteV5SelectedRows();
  }
}

// ============================================
// ACTION HANDLERS
// ============================================

// Keyboard Shortcuts Legend
window.showKeyboardShortcuts = function () {
  const modal = document.createElement('div');
  modal.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
        <h2 style="margin: 0; font-size: 1.25rem;">⌨️ Keyboard Shortcuts</h2>
        <button onclick="this.closest('div').parentElement.remove()" style="border: none; background: none; font-size: 24px; cursor: pointer; color: #6b7280;">×</button>
      </div>
      <div style="display: grid; gap: 0.75rem;">
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Save Data</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Ctrl + S</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Undo Last Change</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Ctrl + Z</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #e5e7eb;">
          <span style="color: #6b7280;">Delete Selected</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Delete</kbd>
        </div>
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0;">
          <span style="color: #6b7280;">Edit Cell</span>
          <kbd style="background: #f3f4f6; padding: 4px 8px; border-radius: 4px; font-family: monospace;">Double Click</kbd>
        </div>
      </div>
      <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 0.875rem;">
        <strong>Actions:</strong><br>• Click <strong>⇄</strong> to swap Debit/Credit<br>• Click <strong>✕</strong> to delete row
      </div>
    </div>
  `;

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);

  document.body.appendChild(modal);
};

// ==================================================
// PHASE 3: HISTORY PANEL TOGGLE
// ==================================================

window.toggleV5History = function () {
  const historyPanel = document.getElementById('v5-history-panel');
  const historyBtn = document.getElementById('v5-history-toggle-btn');

  if (!historyPanel) {
    console.warn('History panel not found');
    return;
  }

  const isVisible = historyPanel.style.display !== 'none';

  if (isVisible) {
    // Hide panel
    historyPanel.style.display = 'none';
    historyBtn?.classList.remove('active');
    console.log('📜 History panel hidden');
  } else {
    // Show panel and load history
    historyPanel.style.display = 'block';
    historyBtn?.classList.add('active');

    // Use new history function
    if (typeof renderV5History === 'function') {
      renderV5History();
    }

    console.log('📜 History panel shown');
  }
};

// ============================================
// START OVER
// ============================================


window.startOverV5 = async function () {
  // Create in-page confirmation banner instead of popup
  const existingBanner = document.getElementById('v5-confirm-banner');
  if (existingBanner) existingBanner.remove();

  const banner = document.createElement('div');
  banner.id = 'v5-confirm-banner';
  banner.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: white;
    border: 2px solid #ef4444;
    border-radius: 12px;
    padding: 2rem;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    z-index: 10000;
    max-width: 450px;
    width: 90%;
    `;

  banner.innerHTML = `
    <div style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.75rem; color: #dc2626;">
      ⚠️ Clear All Data?
    </div>
    <div style="margin-bottom: 1.5rem; color: #6b7280; line-height: 1.5;">
      This will permanently delete all transactions and import history. This action cannot be undone.
    </div>
    <div style="display: flex; gap: 0.75rem;">
      <button onclick="confirmStartOver()" style="flex: 1; padding: 0.75rem 1.5rem; background: #ef4444; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.95rem;">
        Yes, Clear All
      </button>
      <button onclick="document.getElementById('v5-confirm-banner').remove()" style="flex: 1; padding: 0.75rem 1.5rem; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 8px; cursor: pointer; font-weight: 500; font-size: 0.95rem;">
        Cancel
      </button>
    </div>
    `;

  document.body.appendChild(banner);
};

window.confirmStartOver = async function () {
  document.getElementById('v5-confirm-banner')?.remove();

  V5State.gridData = [];
  V5State.importHistory = [];
  V5State.undoStack = [];

  // CRITICAL FIX: Clear file hashes to allow re-uploading same files
  if (window.BrainStorage) {
    await window.BrainStorage.clearAllFileHashes();
    console.log('✅ File hashes cleared - can re-upload same PDFs');
  }

  // Clear localStorage
  localStorage.removeItem('ab_import_session');
  localStorage.removeItem('ab_import_history');

  await window.CacheManager.clearAll();

  // Hide grid, show empty state
  document.getElementById('v5-grid-container').style.display = 'none';
  document.getElementById('v5-empty-state').style.display = 'flex';
  document.getElementById('v5-recon-inline').style.display = 'none';

  // Hide control toolbar when data is cleared
  const controlToolbar = document.querySelector('.v5-control-toolbar');
  if (controlToolbar) {
    controlToolbar.classList.remove('show-data');
    console.log('✅ Control toolbar hidden - data cleared');
  }

  // Reset UI
  updateUndoButton();

  // PART 3: Silent operation - no toast
  console.log('🗑️ All data cleared');
};

window.popOutV5Grid = function () {
  // Hide in-page grid and show pop-in button
  const gridContainer = document.getElementById('v5-grid-container');
  gridContainer.style.display = 'none';

  // Show pop-in button
  let popInBtn = document.getElementById('v5-popin-btn');
  if (!popInBtn) {
    popInBtn = document.createElement('button');
    popInBtn.id = 'v5-popin-btn';
    popInBtn.className = 'btn-primary';
    popInBtn.onclick = () => window.popInV5Grid();
    popInBtn.style.cssText = 'margin: 2rem auto; display: block;';
    popInBtn.innerHTML = '<i class="ph ph-arrow-square-in"></i> Pop In Grid';
    document.getElementById('v5-grid-container').parentElement.appendChild(popInBtn);
  }
  popInBtn.style.display = 'block';

  // Open popout window
  const popOutWindow = window.open('', 'V5GridPopOut', 'width=1400,height=900');

  if (!popOutWindow) {
    alert('Popup blocked! Please allow popups for this site.');
    return;
  }

  // Store reference
  V5State.popoutWindow = popOutWindow;

  popOutWindow.document.write(`
      < html >
      <head>
        <title>Transaction Grid - Pop Out</title>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ag-grid-community/styles@31.0.0/ag-grid.css">
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ag-grid-community/styles@31.0.0/ag-theme-alpine.css">
            <link rel="stylesheet" href="https://unpkg.com/@phosphor-icons/web@2.0.3/src/regular/style.css">
              <style>
                body {margin: 0; padding: 1rem; font-family: system-ui; background: #f9fafb; }
                .popout-header {display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
                .popout-actions {display: flex; gap: 0.5rem; }
                .btn {padding: 8px 16px; border-radius: 6px; border: 1px solid #d1d5db; background: white; cursor: pointer; }
                .btn:hover {background: #f3f4f6; }
                .btn-primary {background: #3b82f6; color: white; border-color: #3b82f6; }
                .btn-primary:hover {background: #2563eb; }
                #popout-grid {height: calc(100vh - 100px); }

                /* CRITICAL: Force AG Grid wrapper to fill container - FIX for blank popout */
                #popout-grid .ag-root-wrapper {
                  height: 100% !important;
                min-height: 600px !important;
          }
              </style>
            </head>
            <body>
              <div class="popout-header">
                <h2>📊 Transaction Grid</h2>
                <div class="popout-actions">
                  <button class="btn" onclick="selectAll()"><i class="ph ph-check-square"></i> Select All</button>
                  <button class="btn" onclick="deselectAll()"><i class="ph ph-square"></i> Deselect All</button>
                  <button class="btn" onclick="bulkDelete()"><i class="ph ph-trash"></i> Delete Selected</button>
                  <button class="btn-primary" onclick="closePopout()"><i class="ph ph-arrow-square-in"></i> Pop In</button>
                </div>
              </div>
              <div id="popout-grid" class="ag-theme-alpine"></div>

              <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/dist/ag-grid-community.min.js"></script>
              <script>
                const gridData = ${JSON.stringify(V5State.gridData)};
                let gridApi;

                // Same column defs as main grid
                const columnDefs = ${JSON.stringify(getV5ColumnDefs())};

                const gridOptions = {
                  columnDefs,
                  rowData: gridData,
                defaultColDef: {sortable: true, filter: true, resizable: true },
                rowSelection: 'multiple',
            onCellValueChanged: (params) => {
                  // Sync back to parent window
                  window.opener.updateV5DataFromPopout(gridData);
            }
          };
          
          document.addEventListener('DOMContentLoaded', () => {
                  gridApi = agGrid.createGrid(document.getElementById('popout-grid'), gridOptions);
          });

                function selectAll() {gridApi.selectAll(); }
                function deselectAll() {gridApi.deselectAll(); }
                function bulkDelete() {
            const selected = gridApi.getSelectedRows();
                if (selected.length === 0) return;
                if (!confirm(\`Delete \${selected.length} transaction(s)?\`)) return;
            
            const selectedIds = selected.map(r => r.id);
            const newData = gridData.filter(r => !selectedIds.includes(r.id));
                gridApi.setGridOption('rowData', newData);
                window.opener.updateV5DataFromPopout(newData);
          }
                function closePopout() {
                  window.opener.popInV5Grid();
                window.close();
          }
              </script>
            </body>
          </html>
          `);
};

window.popInV5Grid = function () {
  // Close popout if open
  if (V5State.popoutWindow && !V5State.popoutWindow.closed) {
    V5State.popoutWindow.close();
  }

  // Show in-page grid
  document.getElementById('v5-grid-container').style.display = 'block';

  // Hide pop-in button
  const popInBtn = document.getElementById('v5-popin-btn');
  if (popInBtn) popInBtn.style.display = 'none';

  // Refresh grid
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }
};

window.updateV5DataFromPopout = function (newData) {
  V5State.gridData = newData;
  recalculateAllBalances();
  saveData();
};

function getV5ColumnDefs() {
  // Return same column defs used in main grid (without cellRenderer for actions)
  return [
    // Checkbox column
    { headerName: '', width: 50, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },

    // Ref# column with auto-numbering and prefix support
    {
      headerName: 'Ref#',
      field: 'refNumber',
      width: 110,
      pinned: 'left',
      editable: true,
      valueGetter: (params) => {
        // Check if manually set
        if (params.data.refNumber) return params.data.refNumber;

        // Auto-generate
        const prefix = V5State.refPrefix || '';
        const num = String(params.node.rowIndex + 1).padStart(3, '0');
        return prefix ? `${prefix}-${num}` : num;
      },
      valueSetter: (params) => {
        params.data.refNumber = params.newValue;
        return true;
      },
      cellStyle: { fontWeight: '600', color: '#64748b', fontFamily: 'monospace' }
    },

    // Date column
    { headerName: 'Date', field: 'date', width: 120, editable: true },
    { headerName: 'Description', field: 'description', width: 300, editable: true },
    { headerName: 'Debit', field: 'debit', width: 120, editable: true },
    { headerName: 'Credit', field: 'credit', width: 120, editable: true },
    { headerName: 'Balance', field: 'balance', width: 130, editable: false },
    { headerName: 'Account', field: 'account', width: 280, editable: true }
  ];
}

window.toggleV5Menu = function () {
  const menu = document.getElementById('v5-dropdown-menu');
  menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
};

// ==================================================
// EXCEL EXPORT - PART 2 FIX
// ==================================================

window.exportV5Excel = function () {
  if (!V5State.gridApi) {
    console.warn('Grid not initialized');
    return;
  }

  const fileName = `transactions_${new Date().toISOString().split('T')[0]}.csv`;

  V5State.gridApi.exportDataAsCsv({
    fileName: fileName,
    columnKeys: ['Date', 'Description', 'Debit', 'Credit', 'Balance', 'Account']
  });

  console.log(`📊 Excel export: ${fileName}`);
};

// ==================================================
// PART 4: BANK STATEMENT PRINT VIEW
// ==================================================

window.printV5Preview = function () {
  // Inject statement header before printing
  const header = document.createElement('div');
  header.className = 'print-statement-header';
  header.style.display = 'none'; // Hidden on screen, shown in print

  const gridData = V5State.gridData || [];
  const dates = gridData.map(t => new Date(t.Date || t.date)).filter(d => !isNaN(d));
  const startDate = dates.length > 0 ? new Date(Math.min(...dates)).toLocaleDateString() : 'N/A';
  const endDate = dates.length > 0 ? new Date(Math.max(...dates)).toLocaleDateString() : 'N/A';

  header.innerHTML = `
    <h1>STATEMENT OF ACCOUNTS</h1>
    <h2>CHECKING ACCOUNT</h2>
    <p>Period: ${startDate} - ${endDate}</p>
    <p>Total Transactions: ${gridData.length}</p>
    <p>Statement Generated: ${new Date().toLocaleDateString()}</p>
  `;

  document.body.prepend(header);

  // Trigger print
  window.print();

  // Clean up after print
  setTimeout(() => {
    header.remove();
  }, 100);

  console.log('🖨️ Bank statement print preview opened');
};

window.showV5Appearance = function () {
  alert('Appearance settings: Redirect to Settings > Appearance');
};

function deleteV5SelectedRows() {
  if (!V5State.gridApi) return;

  const selectedRows = V5State.gridApi.getSelectedRows();
  if (selectedRows.length === 0) return;

  if (!confirm(`Delete ${selectedRows.length} selected transaction(s)?`)) return;

  captureState();

  const selectedIds = selectedRows.map(r => r.id);
  V5State.gridData = V5State.gridData.filter(r => !selectedIds.includes(r.id));

  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  saveData();

  // PART 3: Silent operation - no toast
  console.log(`🗑️ Deleted ${selectedRows.length} transaction(s)`);
}

function updateSelectionCount() {
  if (!V5State.gridApi) return;
  const count = V5State.gridApi.getSelectedRows().length;
}

// ============================================
// DATA PERSISTENCE
// ============================================

async function saveData() {
  await window.CacheManager.saveTransactions(V5State.gridData);

  // Background sync to Supabase
  if (window.CacheManager.syncToSupabase) {
    window.CacheManager.syncToSupabase(V5State.gridData);
  }
}

async function loadData() {
  const cached = await window.CacheManager.getTransactions();

  if (cached && cached.length > 0) {
    V5State.gridData = cached;
    initV5Grid();
  } else {
    // Show empty state
    document.getElementById('v5-empty-state').style.display = 'flex';
  }
}

// ============================================
// CACHE RESTORE HELPERS
// ============================================

window.restorePreviousImport = async function () {
  // Remove banner
  document.getElementById('v5-restore-banner')?.remove();

  // Load cached data
  await loadData();

  console.log('Previous import restored');
};

window.startFreshImport = async function () {
  // Remove banner
  document.getElementById('v5-restore-banner')?.remove();

  // Clear all caches
  await window.CacheManager.clearAll();
  await window.BrainStorage.clearAllFileHashes();

  // Reset grid
  V5State.gridData = [];
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', []);
  }

  console.log('Ready for new import');
};

// ============================================
// AUTO-INITIALIZE
// ============================================

window.initTxnImportV5Grid = async function () {
  // Auto-clear caches on page load for smooth UX
  console.log('🔄 Auto-clearing caches...');
  try {
    await window.BrainStorage.clearAllFileHashes();
    await window.CacheManager.clearAll();
  } catch (e) {
    console.warn('Could not clear caches:', e);
  }

  // Show empty state - no cache restore
  document.getElementById('v5-empty-state').style.display = 'flex';
};

console.log('📄 Txn Import V5: Module ready');

// FIX 4B: Initialize persistence systems on page load
window.addEventListener('DOMContentLoaded', () => {
  console.log('🚀 V5 Persistence Init');

  setTimeout(() => {
    // 1. Load saved grid data
    const savedData = localStorage.getItem('ab_v5_grid_data');
    if (savedData && typeof loadSavedData === 'function') {
      loadSavedData();
    }

    // 2. Load import history
    if (typeof renderV5History === 'function') {
      setTimeout(() => renderV5History(), 200);
    }

    // 3. Load theme
    const savedTheme = localStorage.getItem('v5_grid_theme');
    if (savedTheme && savedTheme !== 'default' && typeof setGridTheme === 'function') {
      setTimeout(() => setGridTheme(savedTheme), 400);
    }
  }, 600);
});

// ============================================
// AUTO-LOAD SESSION ON PAGE READY
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  console.log('🔄 Checking for saved session...');

  const sessionData = localStorage.getItem('ab_import_session');
  if (sessionData) {
    try {
      const session = JSON.parse(sessionData);

      if (session.parsedData && session.parsedData.data && session.parsedData.data.length > 0) {
        console.log('✅ Auto-loading session:', session.parsedData.data.length, 'transactions');

        // Restore state
        V5State.gridData = session.parsedData.data;
        V5State.accountType = session.forcedAccountType || 'BANK';
        V5State.openingBalance = session.parsedData.openingBalance || 0;
        V5State.accountName = session.accountName || 'CHECKING';

        // Initialize grid with restored data
        initV5Grid();
        updateReconciliationCard();

        console.log('✅ Session restored successfully');
      } else {
        console.log('ℹ️ Session exists but has no transactions');
      }
    } catch (e) {
      console.error('❌ Failed to load session:', e);
    }
  } else {
    console.log('ℹ️ No saved session found');
  }

  // Load history using new function  
  if (typeof renderV5History === 'function') {
    setTimeout(() => renderV5History(), 200);
  }
});

// Expand/Collapse All (based on SO example)
window.expandAllV5 = function () {
  // Show history zone
  const zone = document.getElementById('v5-history-zone');
  if (zone) {
    zone.style.display = 'block';
    zone.classList.remove('collapsed');
  }
  console.log('✅ Expanded all collapsible sections');
};

window.collapseAllV5 = function () {
  // Hide history zone
  const zone = document.getElementById('v5-history-zone');
  if (zone) {
    zone.style.display = 'none';
    zone.classList.add('collapsed');
  }
  console.log('✅ Collapsed all collapsible sections');
};

// Hybrid Drag-Drop Handler (for blue button)
window.handleV5DragDrop = function (event) {
  event.preventDefault();
  event.stopPropagation();

  const btn = event.currentTarget;
  btn.classList.remove('drag-over');

  const files = event.dataTransfer?.files;
  if (files && files.length > 0) {
    // Create a fake event to reuse existing file handler
    const fakeEvent = { target: { files: files } };
    handleV5FileSelect(fakeEvent);
  }
};
