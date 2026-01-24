/**
 * Txn Import V5 - Unified Transaction Import Page
 * Combines: InlineImport Zone + AG Grid + 7-Method Categorization + Background Processing
 */

// console.log('🚀 Loading Txn Import V5...');

// ============================================
// STATE MANAGEMENT
// ============================================

window.V5State = {
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

const V5State = window.V5State;

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
    // console.log('📊 Loaded', accounts.length, 'accounts from window.storage');
  }

  // Source 2: localStorage fallback
  if (accounts.length === 0) {
    accounts = JSON.parse(localStorage.getItem('ab_accounts') || '[]');
    // console.log('📊 Loaded', accounts.length, 'accounts from localStorage');
  }

  // Source 3: window.chartOfAccounts fallback
  if (accounts.length === 0 && window.chartOfAccounts) {
    accounts = window.chartOfAccounts;
    // console.log('📊 Loaded', accounts.length, 'accounts from window.chartOfAccounts');
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
// ============================================
// Phase 2 account editor will go here
// ============================================

// GroupedAccountEditor and getGroupedCoA already defined in transactions-import.js


// ============================================
// GRID APPEARANCE FUNCTIONS (Must be early for inline onclick)
// ============================================

window.openAppearanceModal = function () {
  console.log('🎨 openAppearanceModal called!');
  const panel = document.getElementById('v5-appearance-panel');
  const bulkBar = document.getElementById('v5-bulk-bar');

  if (!panel) {
    console.error('❌ Appearance panel not found!');
    return;
  }

  // Hide bulk bar, show appearance panel
  if (bulkBar) bulkBar.style.display = 'none';
  panel.style.display = 'flex';

  // Load saved settings
  const saved = JSON.parse(localStorage.getItem('v5_grid_appearance') || '{}');
  const themeDropdown = document.getElementById('v5-theme-dropdown');
  const fontDropdown = document.getElementById('v5-font-dropdown');
  const sizeDropdown = document.getElementById('v5-size-dropdown');

  if (themeDropdown && saved.theme) themeDropdown.value = saved.theme || '';
  if (fontDropdown && saved.font) fontDropdown.value = saved.font || '';
  if (sizeDropdown && saved.size) sizeDropdown.value = saved.size || 'm';

  // Apply current settings
  window.applyAppearance();
};

window.closeAppearanceModal = function () {
  const panel = document.getElementById('v5-appearance-panel');
  if (panel) panel.style.display = 'none';
};

// CRITICAL: Unified Appearance Logic moved to bottom (Line 5373)

// ====================================================================================
// MAIN RENDER FUNCTION
// ============================================

window.renderTxnImportV5Page = function () {
  return `
    <style id="v5-theme-styles">
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Open+Sans:wght@400;600&family=Roboto:wght@400;500&family=Public+Sans:wght@400;600&family=EB+Garamond:wght@400;500&family=Libre+Baskerville:wght@400;700&display=swap');
      
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


      /* Caseware-Inspired Color Schemes (Real Theme Names) - APPLIES TO ALL SCREEN SIZES */
      .ag-theme-alpine.theme-vanilla {
        --ag-background-color: #fffef8;
        --ag-foreground-color: #333333;
        --ag-header-background-color: #f5f0e8 !important;
        --ag-header-foreground-color: #5a5a5a !important;
        --ag-odd-row-background-color: #faf8f2;
        --ag-border-color: #e0ddd5;
      }
      
      .ag-theme-alpine.theme-classic {
        --ag-background-color: #f8f9fa;
        --ag-foreground-color: #212529;
        --ag-header-background-color: #2c5aa0 !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-odd-row-background-color: #e9ecef;
        --ag-border-color: #d1d5db;
      }
      
      .ag-theme-alpine.theme-default {
        --ag-background-color: #f5f5f5;
        --ag-foreground-color: #2c2c2c;
        --ag-header-background-color: #e0e0e0 !important;
        --ag-header-foreground-color: #424242 !important;
        --ag-odd-row-background-color: #ebebeb;
        --ag-border-color: #cccccc;
      }
      
      .ag-theme-alpine.theme-ledger-pad {
        --ag-background-color: #f0f8e8;
        --ag-foreground-color: #1a3a1a;
        --ag-header-background-color: #00a652 !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-odd-row-background-color: #e6f2e0;
        --ag-border-color: #c5d9c5;
      }
      
      .ag-theme-alpine.theme-postit {
        --ag-background-color: #fffbcc;
        --ag-foreground-color: #5a4a00;
        --ag-header-background-color: #ffd700 !important;
        --ag-header-foreground-color: #5a4a00 !important;
        --ag-odd-row-background-color: #fff8b3;
        --ag-border-color: #e6d68a;
      }
      
      .ag-theme-alpine.theme-rainbow {
        --ag-background-color: #fef5ff;
        --ag-foreground-color: #2d1b2e;
        --ag-header-background-color: #9b59b6 !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-odd-row-background-color: #f9ebff;
        --ag-border-color: #d5a6e8;
      }
      
      .ag-theme-alpine.theme-social {
        --ag-background-color: #e8f4f8;
        --ag-foreground-color: #0d3b66;
        --ag-header-background-color: #1da1f2 !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-odd-row-background-color: #d4e9f0;
        --ag-border-color: #b8d8e5;
      }
      
      .ag-theme-alpine.theme-spectrum {
        --ag-background-color: #ffffff;
        --ag-foreground-color: #333333;
        --ag-header-background-color: #217346 !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-odd-row-background-color: #f2f2f2;
        --ag-border-color: #d0d0d0;
      }
      
      .ag-theme-alpine.theme-wave {
        --ag-background-color: #e6f2ff;
        --ag-foreground-color: #003d66;
        --ag-header-background-color: #0066cc !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-odd-row-background-color: #cce5ff;
        --ag-border-color: #99ccff;
      }
      
      .ag-theme-alpine.theme-vintage {
        --ag-background-color: #1e1e1e;
        --ag-foreground-color: #e0e0e0;
        --ag-header-background-color: #2d4356 !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-odd-row-background-color: #252525;
        --ag-border-color: #3a3a3a;
      }

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

      /* APPEARANCE DROPDOWN - Compact Live Preview */
      .v5-appearance-panel {
        display: none;
        position: fixed;
        right: 20px;
        top: 200px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);
        padding: 1rem;
        min-width: 600px;
        max-width: 90vw;
        z-index: 10000;
      }
      
      .v5-appearance-panel .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.75rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid #e5e7eb;
      }
      
      .v5-appearance-panel .panel-header h4 {
        margin: 0;
        font-size: 0.875rem;
        font-weight: 600;
        color: #1f2937;
      }
      
      .v5-appearance-panel .btn-close-panel {
        background: none;
        border: none;
        color: #6b7280;
        cursor: pointer;
        padding: 0.25rem;
        font-size: 1.25rem;
        line-height: 1;
      }
      
      .v5-appearance-panel .btn-close-panel:hover {
        color: #1f2937;
      }
      
      .v5-appearance-panel .panel-controls {
        display: flex;
        gap: 1.5rem;
        align-items: center;
      }
      
      .v5-appearance-panel .control-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .v5-appearance-panel .control-group label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        min-width: 70px;
      }
      
      .v5-appearance-panel select {
        padding: 0.375rem 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 0.8125rem;
        background: white;
        cursor: pointer;
        min-width: 120px;
      }
      
      .v5-appearance-panel select:hover {
        border-color: #3b82f6;
      }
      
      .v5-appearance-panel select:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      /* AG Grid - Hide vertical lines between columns */
      .ag-theme-alpine .ag-cell {
        border-right-color: transparent !important;
      }

      /* AG GRID THEMES - Impactful & Industry-Standard */
      
      /* Dark Mode - True dark theme */
      .ag-theme-alpine.theme-dark {
        background: #1f2937;
        color: #e5e7eb;
      }
      .ag-theme-alpine.theme-dark .ag-header {
        background: #111827;
        color: white;
        border-bottom: 2px solid #374151;
      }
      .ag-theme-alpine.theme-dark .ag-row {
        border-bottom: 1px solid #374151;
      }
      .ag-theme-alpine.theme-dark .ag-cell {
        color: #e5e7eb;
      }
      
      /* Mint Fresh - Soothing green theme */
      .ag-theme-alpine.theme-mint {
        background: #f0fdf4;
      }
      .ag-theme-alpine.theme-mint .ag-header {
        background: #dcfce7;
        border-bottom: 2px solid #86efac;
      }
      .ag-theme-alpine.theme-mint .ag-row {
        border-bottom: 1px solid #d1fae5;
      }
      .ag-theme-alpine.theme-mint .ag-row-even {
        background: #ecfdf5;
      }
      
      /* High Contrast - Accessibility theme */
      .ag-theme-alpine.theme-contrast {
        background: white;
      }
      .ag-theme-alpine.theme-contrast .ag-header {
        background: #000;
        color: #fff;
        font-weight: 700;
        border-bottom: 3px solid #000;
      }
      .ag-theme-alpine.theme-contrast .ag-row {
        border-bottom: 2px solid #000;
      }
      .ag-theme-alpine.theme-contrast .ag-cell {
        font-weight: 600;
        color: #000;
      }
      
      /* Legacy themes kept for compatibility */
      .ag-theme-alpine.theme-ledger { background: #f5f5dc; }
      .ag-theme-alpine.theme-ledger .ag-row { border-bottom: 1px solid #8b7355; }
      .ag-theme-alpine.theme-ledger .ag-header { background: #d2b48c; }
      
      .ag-theme-alpine.theme-postit { background: #ffff88; }
      .ag-theme-alpine.theme-postit .ag-row { border-bottom: 1px dashed #e6e600; }
      
      .ag-theme-alpine.theme-rainbow .ag-row:nth-child(7n+1) { background: #ff000015; }
      .ag-theme-alpine.theme-rainbow .ag-row:nth-child(7n+2) { background: #ff7f0015; }
      .ag-theme-alpine.theme-rainbow .ag-row:nth-child(7n+3) { background: #ffff0015; }
      .ag-theme-alpine.theme-rainbow .ag-row:nth-child(7n+4) { background: #00ff0015; }
      .ag-theme-alpine.theme-rainbow .ag-row:nth-child(7n+5) { background: #0000ff15; }
      .ag-theme-alpine.theme-rainbow .ag-row:nth-child(7n+6) { background: #4b008215; }
      .ag-theme-alpine.theme-rainbow .ag-row:nth-child(7n+7) { background: #9400d315; }
      
      .ag-theme-alpine.theme-spectrum { background: linear-gradient(135deg, #667eea22 0%, #764ba222 50%, #f093fb22 100%); }
      .ag-theme-alpine.theme-subliminal { background: #1f2937; color: #e5e7eb; }
      .ag-theme-alpine.theme-subliminal .ag-header { background: #111827; color: white; }
      .ag-theme-alpine.theme-tracker { background: #f0fdf4; }
      .ag-theme-alpine.theme-tracker .ag-row-even { background: #dcfce7; }
      .ag-theme-alpine.theme-vanilla { background: #fef3c7; }
      .ag-theme-alpine.theme-vintage { background: #d4a574; filter: sepia(0.3); }
      .ag-theme-alpine.theme-wave { background: linear-gradient(180deg, #f0fdfa 0%, #ccfbf1 100%); }

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
      
      /* UPLOAD ZONE - Sleeker (15% reduction) */
      .compact-upload-zone {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 6px 14px; /* Reduced by 15% from 7px 16px */
        background: linear-gradient(135deg, #f9fafb 0%, #ffffff 100%);
        border: 1.5px dashed #cbd5e1;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 12px; /* Reduced by 15% from 14px */
      }
      
      .compact-upload-zone:hover {
        border-color: #3b82f6;
        background: #f8fafc;
      }
      
      .upload-icon {
        flex-shrink: 0;
        color: #3b82f6;
        width: 20px;
        height: 20px;
      }
      
      .upload-text {
        flex: 1;
        min-width: 0;
      }
      
      .upload-main {
        display: block;
        font-weight: 600;
        color: #0f172a;
        font-size: 0.85rem;
      }
      
      .upload-sub {
        display: block;
        font-size: 0.7rem;
        color: #64748b;
        margin-top: 2px;
      }

      .btn-browse {
        background: linear-gradient(135deg, #3b82f6, #2563eb);
        color: white;
        border: none;
        padding: 0.5rem 1rem;
        border-radius: 6px;
        font-weight: 600;
        font-size: 0.8rem;
        cursor: pointer;
        transition: all 0.2s;
        white-space: nowrap;
        flex-shrink: 0;
      }
      
      .btn-browse:hover {
        background: linear-gradient(135deg, #2563eb, #1d4ed8);
        transform: translateY(-1px);
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
        overflow: hidden;
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
      
      /* MODAL SYSTEM - INLINE DROPDOWN (7% reduced) */
      .modal-overlay {
        position: absolute;
        top: 100%;
        right: 0;
        margin-top: 8px;
        z-index: 1000;
        transform: scale(0.93);
        transform-origin: top right;
      }
      .modal-card {
        background: white;
        border-radius: 12px;
        width: 340px;
        box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
        border: 1px solid #e2e8f0;
      }
      .modal-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8fafc;
      }
      .modal-header h3 { margin: 0; font-size: 0.95rem; color: #1e293b; font-weight: 600; }
      .btn-icon-sm {
        background: none;
        border: none;
        font-size: 1.3rem;
        color: #64748b;
        cursor: pointer;
        padding: 0;
        line-height: 1;
      }
      .modal-body { padding: 1.25rem; color: #334155; font-size: 0.875rem; }
      .modal-actions {
        padding: 0.85rem 1.25rem;
        background: #f8fafc;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      }
      .modal-select {
        width: 100%;
        padding: 0.55rem;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.875rem;
        background: white;
        cursor: pointer;
      }
      .modal-select:focus { outline: none; border-color: #3b82f6; }

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
        display: none !important; /* Force hide - override any external CSS */
        align-items: center;
        gap: 1rem;
        padding: 1rem 1.5rem;
        background: #ffffff;
        border-bottom: 1px solid #E5E7EB;
        margin: 0;
      }
      
      .v5-control-toolbar.show-data {
        display: flex !important; /* Override the forced hide */
      }
      
      /* Ref# Input - Horizontal alignment with Search */
      .v5-ref-input-wrapper {
        display: flex;
        flex-direction: row !important; /* Force horizontal */
        align-items: center !important;
        gap: 8px;
        flex-shrink: 0;
        height: 36px;
      }
      
      /* Opening Balance Input - Invisible until hover, compact */
      .v5-opening-bal-input {
        border: 1px solid transparent;
        background: transparent;
        cursor: pointer;
        transition: all 0.2s;
        max-width: 86px; /* 10% smaller than 96px */
        padding: 2px 4px; /* Tighter padding */
      }
      
      .v5-opening-bal-input:hover {
        border-color: #e5e7eb;
        background: #f9fafb;
        border-radius: 4px;
      }
      
      .v5-opening-bal-input:focus {
        outline: none;
        border-color: #3b82f6;
        background: white;
        border-radius: 4px;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        cursor: text;
      }
      
      .v5-ref-input-wrapper label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #6b7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        line-height: 1;
        margin: 0;
      }
      
      .v5-ref-input {
        width: 80px;
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        height: 32px;
        font-weight: 600;
        text-align: center;
        font-family: 'Courier New', monospace;
        transition: all 0.2s;
        text-transform: uppercase; /* Force uppercase display */
      }
      
      .v5-ref-input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      /* MAIN CONTAINER - Standard positioning like Analytics */
      .txn-import-v5-container {
        padding: 0;
        width: 100%;
        height: 100%;
      }

      /* Page Container - removed, using above instead */
      .v5-page-container {
        padding: 1.5rem;
        padding-top: 90px; /* Prevent navbar overlap */
        max-width: 100%;
        margin: 0 auto;
      }
      
      /* Search Bar - Clean minimal design */
      .v5-search-wrapper {
        flex: 1;
        max-width: 450px;
        position: relative;
        display: flex;
        align-items: center;
      }
      
      .v5-search-wrapper i {
        position: absolute;
        right: 16px; /* Icon on the right */
        color: #9ca3af;
        pointer-events: none;
        font-size: 18px;
      }
      
      .v5-search-input {
        width: 100%;
        padding: 10px 16px 10px 50px; /* More space for icon - prevent overlap */
        border: 1px solid #e5e7eb;
        border-radius: 24px; /* Rounded corners like mockup */
        font-size: 14px;
        height: 44px;
        background: #ffffff;
        transition: all 0.2s;
      }
      
      .v5-search-input:focus {
        outline: none;
        border-color: #d1d5db;
        box-shadow: 0 0 0 3px rgba(209, 213, 219, 0.1);
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
        margin-left: auto; /* Right-align */
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
      
      /* Sleek Inline Appearance Bar */
      .v5-appearance-bar {
        display: flex;
        align-items: center;
        gap: 1.5rem;
        padding: 0.875rem 1.5rem;
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-bottom: 1px solid #e2e8f0;
        transition: all 0.2s ease;
      }
      
      .v5-appearance-controls {
        display: flex;
        gap: 1.25rem;
        align-items: center;
        flex: 1;
      }
      
      .v5-ref-input-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      /* Main Header - Clean Background with Gradient Text */
      .v5-main-header {
        background: #ffffff;
        padding: 16px 24px;
        border-bottom: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        position: sticky;
        top: 0;
        z-index: 100;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        box-sizing: border-box !important;
        height: 100px !important; /* Reverted to 100px */
        min-height: 100px !important;
        max-height: 100px !important;
      }
      
      .v5-title-section {
        display: flex;
        align-items: center;
        gap: 12px;
      }
      
      .v5-page-icon {
        width: 40px;
        height: 40px;
        background: linear-gradient(135deg, #60a5fa, #3b82f6);
        color: white;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        flex-shrink: 0;
      }
      
      .v5-title-text h1 {
        margin: 0;
        font-size: 1.12rem;
        font-weight: 500;
        letter-spacing: -0.5px;
        color: #000000 !important; /* Robust Black */
      }
      
      .v5-subtitle {
        font-size: 0.84rem !important;
        margin: 2px 0 0 0 !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 0 !important;
        text-transform: uppercase !important;
        min-height: 1.5rem;
        color: #003580 !important; /* Default Navy for manual/placeholder */
      }

      /* Premium Emerald for Auto-Detected Brand/Tag */
      .v5-auto-detected {
        color: #059669 !important; /* Robust Emerald Solid (Gradient-clip fails on select) */
        font-weight: 500 !important;
        display: inline-block;
      }
      
      /* Standard Black for manually edited or placeholder text */
      .v5-manual-color {
        color: #000000 !important;
        font-weight: 500 !important;
        display: inline-block;
      }
      
      .v5-search-wrapper input {
        padding: 6px 10px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        height: 32px;
        flex: 1;
      }
      
      /* Appearance Controls in Bulk Bar - Horizontal Layout */
      .v5-control-group {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 6px; /* Tighter gap */
      }
      
      .v5-control-group label {
        font-size: 10px; /* Smaller label */
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        white-space: nowrap;
      }
      
      .v5-control-group select {
        padding: 6px 12px;
        border: 2px solid #3b82f6;
        border-radius: 6px;
        background: white;
        font-size: 13px;
        color: #1e293b;
        cursor: pointer;
        min-width: 130px;
        transition: all 0.2s;
        box-shadow: 0 1px 2px rgba(59, 130, 246, 0.1);
      }
      
      .v5-control-group select:hover {
        border-color: #2563eb;
        box-shadow: 0 2px 4px rgba(59, 130, 246, 0.2);
      }
      
      .v5-control-group select:focus {
        outline: none;
        border-color: #1d4ed8;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
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
      }
      
      .v5-inline-bar .v5-ref-input-wrapper,
      .v5-inline-bar .v5-search-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        height: 40px; /* Consistent height */
      }
      
      .v5-inline-bar .v5-ref-input-wrapper input,
      .v5-inline-bar .v5-search-wrapper input {
        height: 32px;
        padding: 6px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
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
      }
      /* Bulk Operations Bar - Modern Clean Design */
      .v5-bulk-bar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px 20px;
        background: linear-gradient(to right, #ffffff, #f8fafc);
        border-bottom: 1px solid #e5e7eb;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        gap: 16px;
      }
      
      .v5-bulk-info {
        display: flex;
        align-items: center;
        gap: 10px;
        font-weight: 600;
        color: #1e293b;
        font-size: 13px;
      }
      
      .v5-bulk-info i {
        font-size: 18px;
        color: #3b82f6;
      }
      
      .v5-bulk-actions {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
        justify-content: flex-end;
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
          flex-wrap: wrap; /* Only affect flex when visible */
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
         GLASSMORPHISM BULK ACTIONS BAR (INLINE)
         ======================================== */
      .bulk-actions-bar {
        position: relative;
        width: 100%;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        color: #1e293b;
        padding: 0;
        border-radius: 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08), 
                    inset 0 1px 0 rgba(255, 255, 255, 0.8);
        border-top: 1.5px solid rgba(148, 163, 184, 0.3);
        border-bottom: 1.5px solid rgba(148, 163, 184, 0.3);
        z-index: 100;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        animation: glassSlideDown 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        margin: 0;
      }

      @keyframes glassSlideDown {
        from {
          opacity: 0;
          max-height: 0;
          transform: translateY(-10px);
        }
        to {
          opacity: 1;
          max-height: 500px;
          transform: translateY(0);
        }
      }

      .bulk-actions-bar:hover {
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1), 
                    inset 0 1px 0 rgba(255, 255, 255, 0.9);
      }

      /* Main collapsed content */
      .glass-bulk-content {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 14px 20px;
      }

      .selection-label {
        font-size: 0.9rem;
        font-weight: 600;
        color: #334155;
        padding-right: 12px;
        border-right: 1.5px solid rgba(148, 163, 184, 0.3);
      }

      .btn-bulk {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
        border: none;
        padding: 9px 18px;
        border-radius: 12px;
        cursor: pointer;
        font-size: 0.875rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 7px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(59, 130, 246, 0.25),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .btn-bulk:hover {
        background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .btn-bulk:active {
        transform: translateY(0);
      }

      .btn-bulk i {
        font-size: 1.1rem;
      }

      .btn-bulk-categorize {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
      }

      .btn-bulk-rename {
        background: linear-gradient(135deg, #64748b 0%, #475569 100%);
      }

      .btn-bulk-rename:hover {
        background: linear-gradient(135deg, #475569 0%, #334155 100%);
        box-shadow: 0 4px 12px rgba(71, 85, 105, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .btn-bulk-cancel {
        background: rgba(148, 163, 184, 0.15);
        color: #64748b;
        padding: 8px 12px;
        border-radius: 10px;
        width: 36px;
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.2rem;
        border: 1px solid rgba(148, 163, 184, 0.2);
        box-shadow: none;
      }

      .btn-bulk-cancel:hover {
        background: rgba(239, 68, 68, 0.12);
        color: #ef4444;
        border-color: rgba(239, 68, 68, 0.3);
        box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
      }

      /* Expandable panel */
      .glass-bulk-panel {
        display: none;
        padding: 16px 20px;
        border-top: 1.5px solid rgba(148, 163, 184, 0.2);
        background: rgba(248, 250, 252, 0.6);
        border-radius: 0 0 16px 16px;
        animation: panelExpand 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      @keyframes panelExpand {
        from {
          opacity: 0;
          max-height: 0;
          padding-top: 0;
          padding-bottom: 0;
        }
        to {
          opacity: 1;
          max-height: 500px;
          padding-top: 16px;
          padding-bottom: 16px;
        }
      }

      .glass-bulk-panel.active {
        display: block;
      }

      /* Panel header */
      .glass-panel-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .glass-panel-title {
        font-size: 0.85rem;
        font-weight: 700;
        color: #1e293b;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .glass-panel-close {
        background: none;
        border: none;
        color: #94a3b8;
        cursor: pointer;
        font-size: 1.3rem;
        padding: 0;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: all 0.2s;
      }

      .glass-panel-close:hover {
        background: rgba(148, 163, 184, 0.15);
        color: #64748b;
      }

      /* Inputs in panel */
      .glass-input,
      .glass-select {
        width: 100%;
        padding: 10px 14px;
        border: 1.5px solid rgba(148, 163, 184, 0.3);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.8);
        backdrop-filter: blur(10px);
        font-size: 0.9rem;
        color: #1e293b;
        transition: all 0.2s;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .glass-input:focus,
      .glass-select:focus {
        outline: none;
        border-color: #3b82f6;
        background: rgba(255, 255, 255, 0.95);
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1),
                    inset 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .glass-input::placeholder {
        color: #94a3b8;
      }

      /* Single-line COA dropdown */
      .glass-coa-select {
        flex: 1;
        max-width: 400px;
        padding: 9px 14px;
        border: 1.5px solid rgba(148, 163, 184, 0.3);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        font-size: 0.875rem;
        color: #1e293b;
        transition: all 0.2s;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
        cursor: pointer;
      }

      .glass-coa-select:focus {
        outline: none;
        border-color: #3b82f6;
        background: white;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1),
                    inset 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .glass-coa-select option {
        padding: 8px 12px;
      }

      .glass-coa-select optgroup {
        font-weight: 700;
        color: #475569;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      /* Inline input fields for rename */
      .glass-input-inline {
        flex: 1;
        max-width: 200px;
        padding: 9px 14px;
        border: 1.5px solid rgba(148, 163, 184, 0.3);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        font-size: 0.875rem;
        color: #1e293b;
        transition: all 0.2s;
        box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .glass-input-inline:focus {
        outline: none;
        border-color: #3b82f6;
        background: white;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1),
                    inset 0 1px 2px rgba(0, 0, 0, 0.05);
      }

      .glass-input-inline::placeholder {
        color: #94a3b8;
        font-size: 0.85rem;
      }

      /* State containers */
      .bulk-state {
        display: flex;
        align-items: center;
        gap: 12px;
        flex: 1;
      }

      /* Delete button styling */
      .btn-bulk-delete {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }

      .btn-bulk-delete:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      /* Apply button in single line */
      .btn-bulk-apply {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .btn-bulk-apply:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      /* Confirmation state buttons */
      .btn-bulk-yes {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      }

      .btn-bulk-yes:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .btn-bulk-no {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      }

      .btn-bulk-no:hover {
        background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
        box-shadow: 0 4px 12px rgba(239, 68, 68, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .confirm-message {
        font-weight: 600;
        color: #1e293b;
        font-size: 0.95rem;
      }


      /* Categorize panel specific */
      .glass-coa-wrapper {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      /* Rename panel specific */
      .glass-rename-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }

      .glass-rename-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }

      .glass-rename-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        letter-spacing: 0.3px;
      }

      /* Apply button in panel */
      .glass-apply-btn {
        width: 100%;
        margin-top: 12px;
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        border: none;
        padding: 11px 20px;
        border-radius: 10px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2);
        border: 1px solid rgba(255, 255, 255, 0.2);
      }

      .glass-apply-btn:hover {
        background: linear-gradient(135deg, #059669 0%, #047857 100%);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(16, 185, 129, 0.35),
                    inset 0 1px 0 rgba(255, 255, 255, 0.3);
      }

      .glass-apply-btn:active {
        transform: translateY(0);
      }

      .glass-apply-btn i {
        font-size: 1.1rem;
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
        
        
        
        /* GRID CONTAINER - Fixed height for 20 rows */
        .v5-grid-container,
        #v5-grid-container {
          height: 1000px !important; /* Fixed height to show ~20 rows */
          min-height: 1000px !important;
          max-height: 1000px !important;
          overflow-y: auto !important; /* Enable vertical scroll */
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

      /* BANK/TAG DROPDOWNS - "True Blended" Style (Matches mockup exactly) */
      .v5-inline-dropdown {
        appearance: none !important;
        -webkit-appearance: none !important;
        -moz-appearance: none !important;
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        margin: 0 !important;
        color: inherit !important; /* Use navy from subtitle */
        font-weight: inherit !important;
        font-size: inherit !important;
        font-family: inherit !important;
        cursor: pointer !important;
        outline: none !important;
        text-transform: uppercase !important;
        height: auto !important;
        line-height: 1 !important;
        display: inline-block;
        vertical-align: baseline !important;
        width: auto !important;
        transition: opacity 0.2s ease !important;
      }

      .v5-inline-dropdown:hover {
        opacity: 0.7 !important;
        text-decoration: underline dotted !important;
      }

      .v5-inline-dropdown:focus {
        outline: none !important;
      }

      /* Confidence badge styling - "Mockup Pill" style */
      .v5-status {
        display: inline-flex !important;
        align-items: center !important;
        font-size: 0.72rem !important;
        padding: 0 !important;
        border-radius: 4px !important;
        font-weight: 500 !important;
        text-transform: uppercase !important;
        letter-spacing: 0.8px !important;
        margin-left: 0 !important; /* No margin when it's just a status message */
        vertical-align: middle !important;
        color: #94a3b8 !important; /* Lighter gray for "WAITING" */
      }

      /* Apply pill styles only when a confidence class is added */
      .v5-status.confidence-high,
      .v5-status.confidence-learned,
      .v5-status.confidence-medium,
      .v5-status.confidence-low {
        padding: 3px 10px !important;
        margin-left: 12px !important;
        font-weight: 800 !important;
        color: white !important; /* Default, overridden by specific classes */
      }

      .v5-status.confidence-high {
        background: #059669 !important;
        color: white !important;
        display: inline-flex !important;
      }

      .v5-status.confidence-medium {
        display: none !important; /* Remove VERIFY text as requested */
      }

      .v5-status.confidence-low {
        background: #fee2e2 !important;
        color: #991b1b !important;
      }

      .v5-status.confidence-learned {
        background: #f3e8ff !important;
        color: #6b21a8 !important;
      }

      /* Metadata line styling */
      .v5-account-info-line {
        font-size: 0.58rem !important;
        color: #64748b !important;
        margin-top: 6px !important;
        text-transform: uppercase !important;
        letter-spacing: 1px !important;
        font-weight: 500 !important;
        display: flex;
        gap: 12px;
        align-items: center;
      }
      .v5-account-info-line b {
        color: #64748b !important;
        font-weight: 700 !important;
      }
      .v5-account-info-line span.sep {
        margin: 0 4px;
        color: #cbd5e1;
      }

      /* PROGRESS CONTAINER - Stable Layout */
      .v5-progress-container {
        display: none; /* Default hidden */
        padding: 1.5rem;
        background: white;
        border-top: 1px solid #e5e7eb;
      }
      
      .v5-progress-container.v5-active {
        display: block !important;
        animation: none !important; /* No animation to prevent flicker */
      }
      
      .v5-progress-content {
        max-width: 600px;
        margin: 0 auto;
      }
      
      #v5-progress-message {
        text-align: center;
        margin-bottom: 0.75rem;
        font-weight: 500;
        color: #4b5563;
        font-size: 0.9rem;
      }
      
      .v5-progress-bar {
        height: 8px;
        background: #f3f4f6;
        border-radius: 4px;
        overflow: hidden;
      }
      
      .v5-progress-fill {
        height: 100%;
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
        width: 0%;
        transition: width 0.2s ease;
      }
      
      @keyframes v5-dots {
        0% { content: ''; }
        25% { content: '.'; }
        50% { content: '..'; }
        75% { content: '...'; }
        100% { content: ''; }
      }
      .v5-loading-dots::after {
        content: '';
        animation: v5-dots 2s infinite;
        display: inline-block;
        width: 12px;
        text-align: left;
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
            <h1>Transactions</h1>
            <p class="v5-subtitle">
              <select id="v5-bank-brand-select" class="v5-inline-dropdown" style="display: none;">
                <option value="">SELECT BANK</option>
                <option value="TD">TD CANADA TRUST</option>
                <option value="RBC">RBC ROYAL BANK</option>
                <option value="BMO">BMO</option>
                <option value="CIBC">CIBC</option>
                <option value="Scotiabank">SCOTIABANK</option>
                <option value="Tangerine">TANGERINE</option>
                <option value="Amex">AMEX CANADA</option>
              </select>
              <span id="v5-bank-dash" style="display: none;">&nbsp;-&nbsp;</span>
              <select id="v5-account-tag-select" class="v5-inline-dropdown" style="display: none;">
                <option value="">SELECT ACCOUNT</option>
                <option value="Chequing">CHEQUING</option>
                <option value="Savings">SAVINGS</option>
                <option value="Visa">VISA</option>
                <option value="Mastercard">MASTERCARD</option>
                <option value="Amex">AMEX</option>
              </select>
              <span id="v5-status-text" class="v5-status">WAITING TO GET STARTED<span class="v5-loading-dots"></span></span>
            </p>
            <p id="v5-account-info-line" class="v5-account-info-line">
              <!-- Populated dynamically -->
            </p>
          </div>
        </div>
        
        <!-- Center: Upload Zone (from data-import.js - responsive) -->
        <div class="v5-browse-section">
          <div id="v5-upload-zone" class="compact-upload-zone" 
               onclick="document.getElementById('v5-file-input').click()"
               ondragover="event.preventDefault(); this.style.borderColor='#3b82f6'; this.style.background='#f8fafc';"
               ondragleave="this.style.borderColor='#cbd5e1'; this.style.background='linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)';"
               ondrop="handleV5DragDrop(event); this.style.borderColor='#cbd5e1'; this.style.background='linear-gradient(135deg, #f9fafb 0%, #ffffff 100%)';">
            <svg class="upload-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <div class="upload-text">
              <span class="upload-main">Drag and drop files here</span>
              <span class="upload-sub">Limit 200MB per file • PDF, CSV, Excel</span>
            </div>
            <button class="btn-browse" onclick="event.stopPropagation(); document.getElementById('v5-file-input').click()">Browse files</button>
          </div>
          <input type="file" id="v5-file-input" multiple accept=".pdf,.csv" 
                 style="display: none;" onchange="handleV5FileSelect(event)">
        </div>
        
        <!-- Right: Action Icons -->
        <div class="v5-header-actions">
          <div class="v5-menu-wrapper" style="position:relative;">
            <button class="btn-icon v5-menu-toggle" onclick="toggleV5Menu(event)">
              <i class="ph ph-dots-three-vertical"></i>
            </button>
            <div class="v5-dropdown-menu" id="v5-dropdown-menu" style="display: none;">
              <button class="menu-item" onclick="window.showV5Appearance(); toggleV5Menu(event);">
                <i class="ph ph-palette"></i>
                Grid Appearance
              </button>
              <button class="menu-item" onclick="undoV5(); toggleV5Menu(event);">
                <i class="ph ph-arrow-counter-clockwise"></i>
                Undo
              </button>
              <button class="menu-item" onclick="startOverV5(); toggleV5Menu(event);">
                <i class="ph ph-arrows-counter-clockwise"></i>
                Start Over
              </button>
              <button class="menu-item" onclick="toggleV5History(); toggleV5Menu(event);">
                <i class="ph ph-clock-counter-clockwise"></i>
                Toggle History
              </button>
              <button class="menu-item" onclick="popOutV5Grid(); toggleV5Menu(event);">
                <i class="ph ph-arrow-square-out"></i>
                Pop Out Grid
              </button>
              <button class="menu-item" onclick="showKeyboardShortcuts(); toggleV5Menu(event);">
                <i class="ph ph-question"></i>
                Keyboard Shortcuts
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
                 oninput="window.updateRefPrefix(this.value)"
                 title="Reference number prefix (max 4 characters)">
        </div>
        
        <!-- Center: Search Bar -->
        <div class="v5-search-wrapper">
          <i class="ph ph-magnifying-glass"></i>
          <input type="text" 
                 id="v5-search-input" 
                 class="v5-search-input" 
                 placeholder="Search transactions..."
                 oninput="window.handleV5Search(event)">
        </div>
        
        <!-- Right: Balances (Moved from header) -->
        <div class="v5-balances-card" id="v5-balances-card">
          <div class="v5-balance-item">
            <div class="v5-balance-label">OPENING</div>
            <input 
              type="text" 
              id="v5-opening-bal" 
              class="v5-balance-value v5-opening-bal-input"
              value="$0.00"
              onblur="window.handleOpeningBalanceChange(this)"
              onkeypress="if(event.key==='Enter'){this.blur();}"
            />
          </div>
          <div class="v5-balance-item">
            <div class="v5-balance-label">TOTAL OUT</div>
            <div class="v5-balance-value negative" id="v5-total-out">-$0.00</div>
          </div>
          <div class="v5-balance-item">
            <div class="v5-balance-label">TOTAL IN</div>
            <div class="v5-balance-value positive" id="v5-total-in">+$0.00</div>
          </div>
          <div class="v5-balance-item ending">
            <div class="v5-balance-label">ENDING</div>
            <div class="v5-balance-value" id="v5-ending-bal">$0.00</div>
          </div>
        </div>
      </div>
      
      <!-- GLASSMORPHISM BULK ACTIONS BAR (STATE-BASED) -->
      <div class="bulk-actions-bar" id="v5-bulk-bar" style="display: none;">
        <div class="glass-bulk-content">
          <span class="selection-label" id="v5-bulk-count">0 selected</span>
          
          <!-- STATE 1: Initial - Show 3 action buttons -->
          <div id="bulk-state-initial" class="bulk-state">
            <button class="btn-bulk btn-bulk-categorize" onclick="enterCategorizeMode()">
              <i class="ph ph-tag"></i> Categorize
            </button>
            <button class="btn-bulk btn-bulk-rename" onclick="enterRenameMode()">
              <i class="ph ph-pencil"></i> Rename
            </button>
            <button class="btn-bulk btn-bulk-delete" onclick="bulkDeleteRows()">
              <i class="ph ph-trash"></i> Delete
            </button>
          </div>
          
          <!-- STATE 2: Categorize - Show dropdown + Apply -->
          <div id="bulk-state-categorize" class="bulk-state" style="display: none;">
            <select id="glass-coa-dropdown" class="glass-coa-select">
              <option value="">Choose account to categorize...</option>
              <!-- Populated dynamically -->
            </select>
            <button class="btn-bulk btn-bulk-apply" onclick="applyBulkCategorize()">
              <i class="ph ph-check"></i> Apply
            </button>
          </div>
          
          <!-- STATE 3: Rename - Show Find/Replace + Apply -->
          <div id="bulk-state-rename" class="bulk-state" style="display: none;">
            <input 
              type="text" 
              id="bulk-find-input" 
              class="glass-input-inline" 
              placeholder="Find (leave blank to rename all)..."
              list="bulk-find-autocomplete"
            >
            <datalist id="bulk-find-autocomplete">
              <!-- Populated with existing description values -->
            </datalist>
            <input 
              type="text" 
              id="bulk-replace-input" 
              class="glass-input-inline" 
              placeholder="Replace with..."
            >
            <button class="btn-bulk btn-bulk-apply" onclick="applyBulkRename()">
              <i class="ph ph-check"></i> Apply
            </button>
          </div>
          
          <!-- STATE 4: Confirmation - Show confirmation message + Yes/No -->
          <div id="bulk-state-confirm" class="bulk-state" style="display: none;">
            <span class="confirm-message" id="bulk-confirm-message">Are you sure?</span>
            <button class="btn-bulk btn-bulk-yes" onclick="confirmBulkAction()">
              <i class="ph ph-check"></i> Yes
            </button>
            <button class="btn-bulk btn-bulk-no" onclick="cancelConfirmation()">
              <i class="ph ph-x"></i> Cancel
            </button>
          </div>
          
          <button class="btn-bulk-cancel" onclick="cancelBulk()" title="Close and clear selection">
            ✕
          </button>
        </div>
      </div>


      <!-- SHARED INLINE MODULE BAR - Grid Appearance -->
      <div id="v5-appearance-panel" class="v5-bulk-bar" style="display: none;">
        <div class="v5-bulk-actions" style="display: flex; flex-direction: row; gap: 1rem; flex: 1; justify-content: flex-end;">
          <div class="v5-control-group" style="display: flex; flex-direction: row; align-items: center; gap: 6px;">
            <label>Theme</label>
            <select id="v5-theme-dropdown" onchange="window.applyAppearance()">
              <option value="">Alpine (Default AG Grid)</option>
              <option value="vanilla">Vanilla</option>
              <option value="classic">Classic (Caseware Blue)</option>
              <option value="default">Default (Gray)</option>
              <option value="ledger-pad">Ledger Pad (Green)</option>
              <option value="postit">Post-it Note (Yellow)</option>
              <option value="rainbow" selected>Rainbow</option>
              <option value="social">Social (Blue)</option>
              <option value="spectrum">Spectrum (Excel Gray)</option>
              <option value="wave">Wave (Ocean Blue)</option>
              <option value="vintage">Vintage (Dark)</option>
            </select>
          </div>
          <div class="v5-control-group" style="display: flex; flex-direction: row; align-items: center; gap: 6px;">
            <label>Font</label>
            <select id="v5-font-dropdown" onchange="window.applyAppearance()">
              <option value="inter">Inter (Default)</option>
              <optgroup label="Sans-Serif">
                <option value="neue-haas">Helvetica / Neue Haas</option>
                <option value="arial">Arial</option>
                <option value="verdana">Verdana</option>
                <option value="open-sans">Open Sans</option>
                <option value="roboto">Roboto</option>
                <option value="public-sans">Public Sans</option>
              </optgroup>
              <optgroup label="Serif">
                <option value="garamond">Garamond</option>
                <option value="times">Times New Roman</option>
                <option value="libre-baskerville">Libre Baskerville</option>
                <option value="georgia">Georgia</option>
              </optgroup>
            </select>
          </div>
          <div class="v5-control-group" style="display: flex; flex-direction: row; align-items: center; gap: 6px;">
            <label>Size</label>
            <select id="v5-size-dropdown" onchange="window.applyAppearance()">
              <option value="xs">XS (11px)</option>
              <option value="s">S (12px)</option>
              <option value="m" selected>M (13px)</option>
              <option value="l">L (14px)</option>
              <option value="xl">XL (16px)</option>
            </select>
          </div>
          <button class="btn-bulk-cancel" onclick="window.closeV5Appearance()" style="margin-left: auto; min-width: 32px; padding: 6px; border-radius: 4px; background: transparent; border: 1px solid #cbd5e1; color: #64748b; font-size: 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='transparent'; this.style.borderColor='#cbd5e1';">
            ✕
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
            <h1>Transactions</h1>
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
        /* CRITICAL: Force AG Grid wrapper to 900px for ~15 rows */
        #v5-grid-container .ag-root-wrapper {
          height: 900px !important;
          min-height: 900px !important;
          max-height: 900px !important;
        }
        
      /* Grid Container - FULL HEIGHT to 1px from bottom */
      /* Grid Container - FIXED 900px HEIGHT for ~15 rows */
      .v5-grid-container {
        width: 100%;
        height: 900px !important;
        min-height: 900px !important;
        max-height: 900px !important;
        margin-top: 0.5rem;
        padding: 0 !important;
      }
        
        @media (max-width: 768px) {
          #v5-grid-container {
            height: 900px !important;
            min-height: 900px !important;
          }
        }
        
        @media (min-width: 1400px) {
          #v5-grid-container {
            height: 900px !important;
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
      
      <!-- Recovery Prompt Modal (In-Page) -->
      <div id="v5-recovery-modal" class="v5-modal-overlay" style="display: none;">
        <div class="v5-modal-content">
          <div class="v5-modal-header">
            <i class="ph-duotone ph-clock-counter-clockwise" style="font-size: 2rem; color: var(--primary);"></i>
            <h3>Restore Previous Session?</h3>
          </div>
          <p>We found data from your last session. Would you like to load it or start fresh?</p>
          <div class="v5-modal-actions">
            <button onclick="window.confirmV5Recovery(true)" class="btn-modal-primary">Yes, Restore Data</button>
            <button onclick="window.confirmV5Recovery(false)" class="btn-modal-secondary">No, Start Fresh</button>
          </div>
        </div>
      </div>

      <style>
        .v5-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
        }
        .v5-modal-content {
          background: white;
          padding: 2rem;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          max-width: 450px;
          width: 90%;
          text-align: center;
          border: 1px solid #E5E7EB;
        }
        .v5-modal-header {
          margin-bottom: 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
        }
        .v5-modal-actions {
          display: flex;
          gap: 1rem;
          margin-top: 1.5rem;
          justify-content: center;
        }
        .btn-modal-primary {
          background: var(--primary);
          color: white;
          border: none;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-modal-primary:hover {
          filter: brightness(1.1);
          transform: translateY(-1px);
        }
        .btn-modal-secondary {
          background: #F3F4F6;
          color: #374151;
          border: 1px solid #D1D5DB;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
        }
        .btn-modal-secondary:hover {
          background: #E5E7EB;
        }
      </style>

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

window.recalculateAllBalances = function () {
  const openingVal = parseFloat(V5State.openingBalance) || 0;
  let runningBalance = openingVal;

  if (V5State.gridApi) {
    // Recalculate based on VISIBLE / SORTED order (Live Basis)
    let seq = 1;
    V5State.gridApi.forEachNodeAfterFilterAndSort((node) => {
      const txn = node.data;
      const debit = parseFloat(txn.debit || txn.Debit) || 0;
      const credit = parseFloat(txn.credit || txn.Credit) || 0;

      runningBalance = runningBalance - debit + credit;
      txn.balance = parseFloat(runningBalance.toFixed(2));
      txn.Balance = txn.balance;

      // Dynamic Ref# Sequencing (001, 002, 003...) - Resets on sort/filter
      txn.refNumber = String(seq++).padStart(3, '0');
    });

    // Refresh balance and refNumber columns
    V5State.gridApi.refreshCells({ columns: ['balance', 'refNumber'], force: true });
  } else {
    // Fallback if grid not ready
    V5State.gridData.forEach(txn => {
      const debit = parseFloat(txn.debit || txn.Debit) || 0;
      const credit = parseFloat(txn.credit || txn.Credit) || 0;
      runningBalance = runningBalance - debit + credit;
      txn.balance = parseFloat(runningBalance.toFixed(2));
      txn.Balance = txn.balance;
    });
  }

  if (window.updateReconciliationCard) window.updateReconciliationCard();
};

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
      // console.log(`Progress: ${progress}% - ${message}`);
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

  if (selectedCount > 1) {
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

window.updateReconciliationCard = function () {
  const gridData = V5State.gridData || [];
  const balanceCard = document.getElementById('v5-balances-card');

  // Hide card if no data
  if (gridData.length === 0) {
    if (balanceCard) balanceCard.style.display = 'none';
    // console.log('⚠️ No grid data - hiding balance card');
    return;
  }

  // Show card when data exists
  if (balanceCard) balanceCard.style.display = 'flex';

  // Calculate totals from Debit/Credit columns
  let totalIn = 0;  // Credits = money IN
  let totalOut = 0; // Debits = money OUT

  gridData.forEach(txn => {
    const credit = parseFloat(txn.Credit || txn.credit) || 0;
    const debit = parseFloat(txn.Debit || txn.debit) || 0;

    totalIn += credit;
    totalOut += debit;
  });

  const openingBal = parseFloat(V5State.openingBalance) || 0.00;
  const endingBal = openingBal + totalIn - totalOut;

  // Update balance card elements
  const openingEl = document.getElementById('v5-opening-bal');
  const totalInEl = document.getElementById('v5-total-in');
  const totalOutEl = document.getElementById('v5-total-out');
  const endingEl = document.getElementById('v5-ending-bal');

  const fmt = (v) => '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  if (openingEl) openingEl.value = fmt(openingBal); // Changed from textContent to value
  if (totalInEl) totalInEl.textContent = '+$' + totalIn.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (totalOutEl) totalOutEl.textContent = '-$' + totalOut.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (endingEl) endingEl.textContent = fmt(endingBal);

  // Add superscript counts
  const creditCount = gridData.filter(t => (parseFloat(t.Credit || t.credit) || 0) > 0).length;
  const debitCount = gridData.filter(t => (parseFloat(t.Debit || t.debit) || 0) > 0).length;

  const totalInLabel = document.querySelector('.v5-balance-item:nth-child(2) .v5-balance-label');
  const totalOutLabel = document.querySelector('.v5-balance-item:nth-child(3) .v5-balance-label');

  if (totalInLabel) totalInLabel.innerHTML = `Total In<sup style="font-size:0.65em; margin-left:3px; color:#10b981;">${creditCount}</sup>`;
  if (totalOutLabel) totalOutLabel.innerHTML = `Total Out<sup style="font-size:0.65em; margin-left:3px; color:#ef4444;">${debitCount}</sup>`;

  // console.log('✅ Balance card updated (V2):', { openingBal, totalIn, totalOut, endingBal });
};

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
    // console.log('🔍 Search cleared - showing all rows');
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
  // console.log(`🔍 Searching for "${searchTerm}" - ${rowCount} results`);
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
  // console.log(`✅ Categorized ${rows.length} to ${acct.name}`);
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

  // console.log(`✅ Ref# prefix updated: "${V5State.refPrefix}"`);
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

    // console.log(`💾 Saved ${cleanData.length} transactions (blobs filtered)`);
    return true;
  } catch (error) {
    // Silently fail if quota exceeded - data still works in memory
    return false;
  }
};

window.loadSavedData = function () {
  try {
    const savedData = localStorage.getItem('ab_v5_grid_data');
    if (!savedData) {
      // console.log('📂 No saved data found');
      return false;
    }

    V5State.gridData = JSON.parse(savedData);
    // console.log(`📂 Loaded ${V5State.gridData.length} transactions from storage`);

    // Initialize grid with loaded data
    if (V5State.gridData.length > 0) {
      initV5Grid();

      // Show toolbar ONLY when data exists
      const toolbar = document.getElementById('v5-control-toolbar');
      if (toolbar) {
        toolbar.classList.add('show-data');
        // console.log('✅ Control toolbar shown - data loaded');
      }

      // Update reconciliation card
      window.updateReconciliationCard?.();
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
    // console.log(`📦 getImportHistory returning ${parsed.length} items`);
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

  // Save to localStorage (silently fail if quota exceeded)
  try {
    localStorage.setItem('ab_import_history', JSON.stringify(history));
  } catch (error) {
    // Quota exceeded - history still works in memory for this session
  }

  // CRITICAL: Sync V5State.recentImports with localStorage
  V5State.recentImports = history;

  // console.log(`✅ Saved to history: ${file.name} (${parsedData.length} txns) - Total history: ${history.length} items`);
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
  // Toast removed
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
    // Toast removed
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

  // console.log(`📋 Populated COA dropdown with 5 categories`);
};

// ============================================
// SECTION 5: GRID THEMING
// ============================================

// ============================================
// SYSTEM C: GRID THEMING (FIXED)
// ============================================

window.setGridTheme = function (theme) {
  // console.log(`🎨 Setting theme to: ${theme}`);

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
  // console.log(`✅ Theme applied. Container classes:`, container.className);
  // console.log(`💾 Theme saved to localStorage: ${theme}`);
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
  m.innerHTML = `<div style="background:white;border-radius:12px;padding:24px;width:500px;max-width:90vw;box-shadow:0 10px 25px rgba(0,0,0,0.1)">
    <h2 style="margin:0 0 8px 0;font-size:20px;font-weight:700">Bulk Categorize</h2>
    <p style="color:#64748b;margin:0 0 20px 0;font-size:14px">${selectedRows.length} items selected</p>
    
    <div style="margin-bottom:16px">
        <input type="text" id="bulk-cat-search" placeholder="Search accounts (e.g. 'meals')..." 
               style="width:100%;padding:10px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;margin-bottom:8px"
               onkeyup="filterBulkDropdown()">
        <label style="display:block;font-weight:600;margin-bottom:6px;font-size:13px;color:#475569">Choose Account:</label>
        ${opts}
    </div>

    <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:24px">
        <button onclick="this.closest('div[style*=fixed]').remove()" style="padding:10px 20px;border:1px solid #e2e8f0;background:white;border-radius:8px;cursor:pointer;font-weight:500;color:#475569">Cancel</button>
        <button onclick="window.applyBulkCat()" style="padding:10px 20px;border:none;background:#3b82f6;color:white;border-radius:8px;cursor:pointer;font-weight:600">Apply Category</button>
    </div>
  </div>`;
  document.body.appendChild(m);

  // Focus search
  setTimeout(() => document.getElementById('bulk-cat-search').focus(), 100);

  // Search Filter Logic
  window.filterBulkDropdown = function () {
    const input = document.getElementById('bulk-cat-search');
    const filter = input.value.toUpperCase();
    const select = document.getElementById('bulk-acct');
    const options = select.getElementsByTagName('option');
    const groups = select.getElementsByTagName('optgroup');

    // Expand all groups logic (browser handles search usually, but we can try to help)
    // Browsers often limit <select> styling. A custom UL/LI is better for full search, 
    // but standard select with native search is often sufficient. 
    // However, to strictly meet "search opens dropdown" we would need a custom widget.
    // For now, this filter helps visual matching if we implemented a custom list, 
    // but with standard <select>, we can only filter by hiding options or relying on browser.
    // OPTIMIZATION: Just let browser native search work on the focused select, 
    // OR implement option hiding.

    for (let i = 0; i < options.length; i++) {
      const txtValue = options[i].textContent || options[i].innerText;
      if (txtValue.toUpperCase().indexOf(filter) > -1) {
        options[i].style.display = "";
      } else {
        options[i].style.display = "none";
      }
    }
  };
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
  // console.log(`✅ Categorized ${rows.length} to ${acct.name}`);
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
    // console.log('❌ Bulk selection cancelled');
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

  // Re-entry Guard: Prevent multiple parsing triggers
  if (V5State.isProcessing) {
    console.warn('⚠️ Parsing already in progress, ignoring duplicate trigger.');
    return;
  }

  V5State.isProcessing = true;

  // Use class-based toggle for stability
  const progressContainer = document.getElementById('v5-progress-container');
  if (progressContainer) {
    progressContainer.classList.add('v5-active');
    // Ensure inline style doesn't override class
    progressContainer.style.display = '';
  }

  try {
    // Use ProcessingEngine for background parsing - LOOPING TO PRESERVE FILE SOURCE
    let allTransactions = [];

    // Process files sequentially to ensure we can tag them correctly
    for (let i = 0; i < V5State.selectedFiles.length; i++) {
      const file = V5State.selectedFiles[i];
      updateV5Progress(i, V5State.selectedFiles.length, `Parsing ${file.name}...`);

      try {
        // Parse single file
        const fileTxns = await window.ProcessingEngine.parseFiles([file], () => { });

        // Generate ID for this specific file
        const fileId = `file-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv';

        // Tag transactions immediately with THIS file's info
        fileTxns.forEach(txn => {
          txn.sourceFileId = fileId;
          txn.sourceFileName = file.name;
          txn.sourceFileBlob = file; // Store blob for opening
          txn.sourceFileType = fileType;
        });

        allTransactions = allTransactions.concat(fileTxns);

        // Add to import history (one entry per file)
        // Save to history using proper function
        const currentHistory = getImportHistory();
        currentHistory.unshift({
          id: fileId,
          filename: file.name,
          date: new Date().toISOString(),
          count: fileTxns.length,
          status: 'Success'
        });
        if (currentHistory.length > 20) currentHistory.pop();
        localStorage.setItem('ab_import_history', JSON.stringify(currentHistory));
        V5State.recentImports = currentHistory; // Keep in sync

      } catch (fileErr) {
        console.error(`❌ Failed to parse ${file.name}:`, fileErr);
        // Continue with other files...
      }
    }

    // If no transactions found after all files
    if (allTransactions.length === 0) {
      throw new Error('No transactions found in selected files');
    }

    const transactions = allTransactions;

    // CRITICAL: Capture brand detection BEFORE categorization wipes it
    const firstTxn = transactions[0] || {};

    // console.log('🔍 DEBUG: First transaction FULL:', firstTxn);
    // console.log('🔍 DEBUG: firstTxn._brand:', firstTxn._brand);
    // console.log('🔍 DEBUG: firstTxn._bank:', firstTxn._bank);
    // console.log('🔍 DEBUG: firstTxn._tag:', firstTxn._tag);
    // console.log('🔍 DEBUG: firstTxn._accountType:', firstTxn._accountType);
    // console.log('🔍 DEBUG: firstTxn._prefix:', firstTxn._prefix);

    const brandDetection = {
      brand: firstTxn._brand || firstTxn._bank || 'Unknown Bank',
      tag: firstTxn._tag || firstTxn._accountType || 'CHECKING',
      prefix: firstTxn._prefix || 'TXN'
    };

    console.log('🔍 DEBUG: brandDetection:', brandDetection);

    // Categorize using all 7 methods
    updateV5Progress(0, 1, 'Categorizing transactions...');
    const categorized = await window.ProcessingEngine.categorizeTransactions(
      transactions,
      (progress, message) => {
        updateV5Progress(progress, 100, message);
      }
    );

    // Load into grid
    V5State.gridData = categorized;

    // AUTO-DETECT account type from transaction patterns
    V5State.accountType = detectAccountType(categorized);

    // Update Header with Bank and Tag from CAPTURED brand detection
    const detectedBank = brandDetection.brand;
    const detectedTag = brandDetection.tag;
    const detectedPrefix = brandDetection.prefix;

    // Set the Ref# prefix from brand detection
    if (detectedPrefix) {
      V5State.refPrefix = detectedPrefix;
      console.log(`🏷️ Ref# prefix set to: ${detectedPrefix}`);
      // Update the UI input field if it exists
      const refInput = document.getElementById('v5-ref-input');
      if (refInput) refInput.value = detectedPrefix;
    }

    if (window.updateV5PageHeader) {
      // Pass the COMPLETE brandDetection object to enable Line 3 (metadata)
      const detection = transactions[0]?.brandDetection || brandDetection;
      window.updateV5PageHeader(detection);
    }

    console.log(`📊 Detected: ${detectedBank} - ${detectedTag} (Prefix: ${detectedPrefix})`);

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
      // PRESERVE debit/credit if already set by the parser (check BOTH cases!)
      const parsedDebit = parseFloat(txn.debit || txn.Debit) || 0;
      const parsedCredit = parseFloat(txn.credit || txn.Credit) || 0;
      const parsedBalance = parseFloat(txn.balance || txn.Balance) || null;

      if (parsedDebit > 0 || parsedCredit > 0) {
        // Parser already set values - use them!
        txn.debit = parsedDebit;
        txn.Debit = parsedDebit;
        txn.credit = parsedCredit;
        txn.Credit = parsedCredit;
        runningBalance += parsedCredit - parsedDebit;
      } else {
        // Fallback: Calculate from amount field
        const amount = Math.abs(parseFloat(txn.amount || txn.Amount) || 0);

        // Check if Smart Parser provided a 'type' field
        const txnType = (txn.type || txn.Type || '').toLowerCase();

        // Determine if this is a debit or credit
        let isDebit = false;

        if (txnType === 'debit') {
          isDebit = true;
        } else if (txnType === 'credit') {
          isDebit = false;
        } else {
          // No type specified - use description keywords
          const desc = (txn.description || txn.Description || '').toLowerCase();
          const debitKeywords = /withdrawal|abm|atm|debit|purchase|payment|fee|charge|cheque|chq|transfer\s+out|e-?transfer\s+sent|pre-?authorized/i;
          const creditKeywords = /deposit|credit|refund|payroll|salary|interest|e-?transfer\s+received/i;

          if (debitKeywords.test(desc)) {
            isDebit = true;
          } else if (creditKeywords.test(desc)) {
            isDebit = false;
          } else if (isCreditCard) {
            // Credit card: positive = charge (debit from user perspective)
            isDebit = amount > 0;
          } else {
            // Bank account: default to debit for unknown
            isDebit = true;
          }
        }

        if (isDebit) {
          txn.debit = amount;
          txn.Debit = amount;
          txn.credit = 0;
          txn.Credit = 0;
          runningBalance -= amount;
        } else {
          txn.credit = amount;
          txn.Credit = amount;
          txn.debit = 0;
          txn.Debit = 0;
          runningBalance += amount;
        }
      }

      // Use parsed balance if available, otherwise use running balance
      txn.balance = parsedBalance !== null ? parsedBalance : runningBalance;
      txn.Balance = txn.balance;
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
      // console.log(`✅ Created ${V5State.selectedFiles.length} chips for ${V5State.selectedFiles.length} files`);
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

    // Clear files (but CACHE them first for viewer!)
    if (!V5State.fileCache) V5State.fileCache = [];
    if (V5State.selectedFiles) {
      console.log('📦 Caching files for viewer access before clearing UI...');
      V5State.selectedFiles.forEach(f => {
        // Avoid duplicates in cache
        if (!V5State.fileCache.some(existing => existing.name === f.name)) {
          V5State.fileCache.push(f);
        }
      });
    }

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
    const progressContainer = document.getElementById('v5-progress-container');
    if (progressContainer) {
      progressContainer.classList.remove('v5-active');
    }
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
    // Grid container not ready - silent return
    return;
  }

  // IMPORTANT: Hide empty state, show grid
  const emptyState = document.getElementById('v5-empty-state');
  if (emptyState) emptyState.style.display = 'none';
  container.style.display = 'block';

  console.log('✅ Grid initialized successfully with', V5State.gridData.length, 'rows');

  // Update statement badge based on data
  if (typeof updateStatementBadge === 'function') {
    updateStatementBadge();
  }
  console.log('📊 First 3 transactions:', V5State.gridData.slice(0, 3));

  // DEBUG: Log full structure of first transaction
  if (V5State.gridData.length > 0) {
    const first = V5State.gridData[0];
    console.log('🔍 FULL FIRST TRANSACTION:', JSON.stringify(first, null, 2));
    console.log('🔍 Keys:', Object.keys(first));

    // DEBUG: Check ALL descriptions for commas
    console.log('🔍 DESCRIPTION COMMA CHECK:');
    V5State.gridData.slice(0, 20).forEach((txn, idx) => {
      const desc = txn.Description || txn.description || '';
      const hasComma = desc.includes(',');
      const status = hasComma ? '✅' : '❌';
      console.log(`  ${status} Row ${String(idx + 1).padStart(3, '0')}: "${desc.substring(0, 60)}..."`);
    });
  }

  // NOTE: Column definitions are now defined INLINE inside gridOptions below.
  // This consolidation ensures a single source of truth for all column properties.

  // ---------------------------------------------------------
  // ACTION MENU LOGIC (Attached to Window for global access)
  // ---------------------------------------------------------
  if (!document.getElementById('v5-action-menu-styles')) {
    const style = document.createElement('style');
    style.id = 'v5-action-menu-styles';
    style.innerHTML = `
      .kebab-btn { background: transparent; border: none; color: #6B7280; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: background 0.15s; width: 28px; height: 28px; }
      .kebab-btn:hover { background: #F3F4F6; color: #111827; }
      .v5-action-dropdown { position: fixed; z-index: 9999; background: white; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); min-width: 180px; display: none; flex-direction: column; padding: 4px 0; animation: fadeIn 0.1s ease-out; }
      .v5-action-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; font-size: 0.9rem; color: #374151; cursor: pointer; transition: background 0.1s; background: none; border: none; width: 100%; text-align: left; }
      .v5-action-item:hover { background: #F9FAFB; }
      .v5-action-item i { font-size: 1.1rem; }
      .v5-action-item.delete { color: #EF4444; }
      .v5-action-item.delete:hover { background: #FEF2F2; }
      @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      /* Right Align Header Fix - Uses flex-START because AG Grid headers use row-REVERSE direction */
      .ag-right-aligned-header .ag-header-cell-label { justify-content: flex-start !important; }
    `;
    document.head.appendChild(style);
  }

  // Create Menu Element if missing
  if (!document.getElementById('v5-action-menu')) {
    const menu = document.createElement('div');
    menu.id = 'v5-action-menu';
    menu.className = 'v5-action-dropdown';
    document.body.appendChild(menu);
    window.addEventListener('click', (e) => {
      if (!e.target.closest('.kebab-btn') && !e.target.closest('.v5-action-dropdown')) {
        menu.style.display = 'none';
      }
    });

    window.addEventListener('scroll', () => { menu.style.display = 'none'; }, true);
  }

  // Global Toggle Function - Updates to use ID
  window.toggleV5ActionMenu = (event, rowId, sourceFileId, fileType, fileName) => {
    event.stopPropagation();
    const menu = document.getElementById('v5-action-menu');
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();

    const isPdf = fileType && (fileType === 'pdf' || fileType.includes('pdf'));
    const pdfItem = isPdf ?
      `<button class="v5-action-item" onclick="openSourceFile('${sourceFileId}'); document.getElementById('v5-action-menu').style.display='none';"><i class="ph ph-file-pdf" style="color: #EF4444;"></i>View Source PDF</button>` :
      `<div class="v5-action-item" style="color: #9CA3AF; cursor: default;"><i class="ph ph-file-dashed"></i>No Source File</div>`;

    menu.innerHTML = `
      ${pdfItem}
      <button class="v5-action-item" onclick="window.swapDebitCredit('${rowId}'); document.getElementById('v5-action-menu').style.display='none';">
        <i class="ph ph-arrows-left-right" style="color: #3B82F6;"></i>
        Swap Debit/Credit
      </button>
      <div style="height: 1px; background: #E5E7EB; margin: 4px 0;"></div>
      <button class="v5-action-item delete" onclick="window.deleteV5Row('${rowId}'); document.getElementById('v5-action-menu').style.display='none';">
        <i class="ph ph-trash"></i>
        Delete Transaction
      </button>
    `;

    menu.style.display = 'flex';
    menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
    menu.style.left = `${rect.right - 180}px`;
  };

  // Column definition logging moved to onGridReady for accuracy

  // ---------------------------------------------------------
  // FLOATING HOVER ACTION BUTTON LOGIC
  // ---------------------------------------------------------
  const setupHoverActionButton = () => {
    if (document.getElementById('v5-hover-btn')) return;

    const btn = document.createElement('button');
    btn.id = 'v5-hover-btn';
    btn.innerHTML = '<i class="ph ph-dots-three-vertical"></i>';
    btn.style.cssText = `
      position: fixed;
      display: none;
      z-index: 999;
      background: white;
      border: 1px solid #E5E7EB;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
      border-radius: 4px;
      cursor: pointer;
      color: #6B7280;
      width: 28px;
      height: 28px;
      align-items: center;
      justify-content: center;
      transition: all 0.1s;
    `;
    btn.onmouseenter = () => {
      btn.style.background = '#F3F4F6';
      btn.style.color = '#111827';
      // Keep clear of hiding logic
      clearTimeout(window.v5HoverTimer);
    };
    btn.onmouseleave = () => {
      btn.style.background = 'white';
      btn.style.color = '#6B7280';
      // Hide after delay if leaving button (Increased to at least 300ms to stop flicker)
      window.v5HoverTimer = setTimeout(() => {
        btn.style.display = 'none';
      }, 300);
    };

    // ACTION ON CLICK
    btn.onclick = (e) => {
      const rowId = btn.dataset.rowId;
      if (!rowId) return;

      // Use Global Toggle
      window.toggleV5ActionMenu(
        e,
        rowId,
        btn.dataset.sourceFileId,
        btn.dataset.sourceFileType,
        btn.dataset.sourceFileName
      );
    };

    document.body.appendChild(btn);
  };

  // Run Setup
  setupHoverActionButton();

  const gridOptions = {
    getRowId: (params) => params.data.id,
    columnDefs: [
      {
        colId: 'checkbox',
        headerName: '',
        checkboxSelection: true,
        headerCheckboxSelection: true,
        headerCheckboxSelectionFilteredOnly: true,
        width: 40,
        minWidth: 40,
        maxWidth: 40,
        resizable: false,
        suppressSizeToFit: true
      },
      {
        colId: 'refNumber',
        headerName: 'Ref#',
        field: 'refNumber',
        width: 120,
        minWidth: 120,
        suppressSizeToFit: true,
        comparator: (a, b) => (parseInt(a) || 0) - (parseInt(b) || 0),
        valueGetter: params => {
          const p = V5State.refPrefix || '';
          return p ? `${p}-${params.data.refNumber}` : params.data.refNumber;
        },
        cellStyle: { fontWeight: '600', color: '#6B7280' }
      },
      {
        colId: 'date',
        headerName: 'Date',
        field: 'date',
        width: 110,
        minWidth: 110,
        suppressSizeToFit: true,
        editable: true,
        valueGetter: params => params.data.date || params.data.Date || '',
        valueFormatter: params => {
          try { return params.value ? new Date(params.value).toLocaleDateString() : ''; }
          catch (e) { return params.value; }
        }
      },
      {
        colId: 'description',
        headerName: 'Description',
        field: 'description',
        flex: 1, // ABSORB ALL REMAINING SPACE (Wall-to-Wall)
        minWidth: 250,
        editable: true,
        cellEditor: 'agTextCellEditor',
        valueGetter: params => params.data.description || params.data.Description || '',
        cellRenderer: params => {
          const val = params.value || '';
          if (!val.includes(',')) return `<div style="word-break: break-all; white-space: normal;">${val}</div>`;
          const parts = val.split(',');
          return `<div style="line-height: 1.3; word-break: break-all; white-space: normal;">
          <div style="font-weight: 500;">${parts[0].trim()}</div>
          <div style="font-size: 0.85em; color: #6B7280;">${parts.slice(1).join(',').trim()}</div>
        </div>`;
        },
        autoHeight: true,
        cellStyle: { 'white-space': 'normal', 'word-break': 'break-all' }
      },
      {
        colId: 'debit',
        headerName: 'Debit',
        field: 'debit',
        minWidth: 80,
        suppressSizeToFit: true,
        type: 'numericColumn',
        headerClass: 'ag-right-aligned-header',
        cellStyle: { color: '#EF4444', 'text-align': 'right', 'justify-content': 'flex-end', 'display': 'flex', 'align-items': 'center' },
        editable: true,
        valueGetter: params => {
          const val = parseFloat(params.data.debit || params.data.Debit) || 0;
          return val > 0 ? val : 0;
        },
        valueFormatter: params => {
          const val = parseFloat(params.value) || 0;
          return val > 0 ? '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        },
        valueSetter: params => {
          const val = parseFloat(params.newValue) || 0;
          params.data.debit = val;
          params.data.Debit = val;
          params.data.credit = 0;
          params.data.Credit = 0;
          window.recalculateAllBalances();
          return true;
        }
      },
      {
        colId: 'credit',
        headerName: 'Credit',
        field: 'credit',
        minWidth: 80,
        suppressSizeToFit: true,
        type: 'numericColumn',
        headerClass: 'ag-right-aligned-header',
        cellStyle: { color: '#10B981', 'text-align': 'right', 'justify-content': 'flex-end', 'display': 'flex', 'align-items': 'center' },
        editable: true,
        valueGetter: params => {
          const val = parseFloat(params.data.credit || params.data.Credit) || 0;
          return val > 0 ? val : 0;
        },
        valueFormatter: params => {
          const val = parseFloat(params.value) || 0;
          return val > 0 ? '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
        },
        valueSetter: params => {
          const val = parseFloat(params.newValue) || 0;
          params.data.credit = val;
          params.data.Credit = val;
          params.data.debit = 0;
          params.data.Debit = 0;
          window.recalculateAllBalances();
          return true;
        }
      },
      {
        colId: 'balance',
        headerName: 'Balance',
        field: 'balance',
        minWidth: 110, // Wider for running balance
        suppressSizeToFit: true,
        type: 'numericColumn',
        headerClass: 'ag-right-aligned-header',
        editable: false,
        valueFormatter: params => parseFloat(params.value || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
        cellStyle: { color: '#111827', 'text-align': 'right', 'justify-content': 'flex-end', 'display': 'flex', 'align-items': 'center' }
      },

      {
        colId: 'account',
        headerName: 'Account',
        field: 'account',
        minWidth: 160,
        suppressSizeToFit: true,
        editable: true,
        cellEditor: GroupedAccountEditor,
        valueGetter: params => params.data.account || params.data.Category || params.data.AccountId || 'Uncategorized',
        valueFormatter: params => resolveAccountName(params.value)
      },
      {
        colId: 'action',
        headerName: 'Action',
        width: 110,
        minWidth: 110,
        suppressMenu: true,
        sortable: false,
        filter: false,
        resizable: false,
        cellStyle: { 'text-align': 'center', 'display': 'flex', 'justify-content': 'center', 'align-items': 'center', 'padding': '0', 'border': 'none' },
        cellRenderer: (params) => {
          if (!params.data) return '';
          return `
            <div style="display:flex; gap:6px;">
              <button onclick="event.stopPropagation(); window.viewSourcePDF('${params.data.id}')" title="View Source PDF" style="background:none; border:none; color:#6b7280; cursor:pointer; font-size:15px; padding:4px;">📄</button>
              <button onclick="event.stopPropagation(); window.swapDebitCredit('${params.data.id}')" title="Swap Debit/Credit" style="background:none; border:none; color:#3b82f6; cursor:pointer; font-size:16px; padding:4px;">⇄</button>
              <button onclick="event.stopPropagation(); window.deleteV5Row('${params.data.id}')" title="Delete Row" style="background:none; border:none; color:#ef4444; cursor:pointer; font-size:16px; padding:4px;">✕</button>
            </div>
          `;
        }
      }
    ],
    rowData: V5State.gridData,
    headerHeight: 48,
    rowHeight: 44,
    rowSelection: 'multiple',
    animateRows: true,
    defaultColDef: {
      sortable: true,
      filter: true,
      resizable: true,
      minWidth: 50,
      suppressMenu: true
    },

    // LIVE BALANCE RECALCULATION
    onSortChanged: (params) => {
      console.log('🔄 Sort changed - recalculating live balances');
      window.recalculateAllBalances();
    },
    onFilterChanged: (params) => {
      console.log('🔍 Filter changed - recalculating live balances');
      window.recalculateAllBalances();
    },
    onCellValueChanged: (params) => {
      captureState();
      saveData();
      if (params.colDef.field === 'account') {
        window.ProcessingEngine.learnFromUserAction('category_change', {
          description: params.data.description,
          newCategory: params.newValue
        });
      }
      window.recalculateAllBalances();
    },
    onRowSelected: (event) => {
      // DEBUG: Selection UI with modern floating bar
      const selected = event.api.getSelectedRows();
      console.log('🔘 Selection changed:', selected.length, 'items');

      const modernBar = document.getElementById('v5-bulk-bar'); // Modern floating pill
      const inlineBar = document.getElementById('v5-inline-bar'); // Old yellow strip
      const bulkModeBar = document.getElementById('bulk-mode-bar');
      const bulkCountSpan = document.getElementById('v5-bulk-count'); // For modern bar

      console.log('📊 Elements found:', {
        modernBar: !!modernBar,
        inlineBar: !!inlineBar,
        bulkModeBar: !!bulkModeBar,
        bulkCountSpan: !!bulkCountSpan
      });

      // ALWAYS hide the old inline bar
      if (inlineBar) {
        inlineBar.style.display = 'none';
        console.log('✅ Hid inline bar');
      }
      if (bulkModeBar) {
        bulkModeBar.style.display = 'none';
      }

      // Show/hide modern bar based on selection
      if (selected.length > 1) {
        if (modernBar) {
          modernBar.style.display = 'flex';
          console.log('✅ Showing modern bar');
        } else {
          console.error('❌ Modern bar (#v5-bulk-bar) not found!');
        }
        if (bulkCountSpan) {
          bulkCountSpan.textContent = `${selected.length} selected`;
        }
      } else {
        if (modernBar) {
          modernBar.style.display = 'none';
          console.log('✅ Hiding modern bar (selection <= 1)');
        }
      }
    },

    onGridReady: (params) => {
      V5State.gridApi = params.api;
      console.log('✅ Grid Ready');

      // EXCEL-STYLE FITTING: 
      // 1. Auto-size all columns tightly to content
      // 2. Expand only the Description column to fill remaining void
      // 3. Ensure "Action" column is visible
      params.api.autoSizeAllColumns();
      setTimeout(() => params.api.sizeColumnsToFit(), 50);

      window.recalculateAllBalances();
      window.addEventListener('resize', () => {
        params.api.sizeColumnsToFit();
      });
    },

    onBodyScroll: () => {
      // No-op
    }
  };

  // RESTORED ACTION HELPERS (ID-Based)
  // PDF VIEWER HELPER (DEBUG ENABLED)
  window.viewSourcePDF = (rowId) => {
    const row = V5State.gridData.find(r => r.id === rowId);
    if (!row) {
      console.error('❌ Row not found:', rowId);
      return;
    }

    console.log('📄 Requesting PDF for row:', rowId);
    console.log('   Target File:', row.sourceFileName);

    // Debug State
    console.log('   Memory State:', {
      selectedFiles: V5State.selectedFiles ? V5State.selectedFiles.length : 0,
      fileCache: V5State.fileCache ? V5State.fileCache.length : 0
    });

    if (row.sourceFileName) {
      let file = null;
      let source = 'none';

      // 1. Check Active Selection
      if (!file && V5State.selectedFiles) {
        file = V5State.selectedFiles.find(f => f.name === row.sourceFileName);
        if (file) source = 'selectedFiles';
      }

      // 2. Check File Cache
      if (!file && V5State.fileCache) {
        file = V5State.fileCache.find(f => f.name === row.sourceFileName);
        if (file) source = 'fileCache';
      }

      if (file) {
        console.log(`✅ File found in [${source}]:`, file.name, file.size);
        const fileURL = URL.createObjectURL(file);
        window.open(fileURL, '_blank');
        return;
      }

      // 3. Last Resort: BrainStorage
      console.log('⚠️ File not in memory, checking BrainStorage...');
      if (window.BrainStorage && window.BrainStorage.getFile) {
        window.BrainStorage.getFile(row.sourceFileName).then(file => {
          if (file) {
            console.log('✅ File retrieved from BrainStorage');
            const fileURL = URL.createObjectURL(file);
            window.open(fileURL, '_blank');
          } else {
            console.error('❌ File not found in BrainStorage');
            alert(`File "${row.sourceFileName}" not found in cache.\nPlease re-upload to view.`);
          }
        }).catch(e => {
          console.error('❌ BrainStorage Error:', e);
          alert(`Error retrieving file: ${e.message}`);
        });
        return;
      }

      alert(`File "${row.sourceFileName}" not found in current session.\n(Reloading the page clears file memory)`);
    } else {
      alert('No source file linked to this transaction.');
    }
  };

  // RESTORED ACTION HELPERS (ID-Based)
  window.deleteV5Row = (rowId) => {
    // Custom In-Page Confirmation
    const existingModal = document.getElementById('v5-delete-modal');
    if (existingModal) existingModal.remove();

    const row = V5State.gridData.find(r => r.id === rowId);
    if (!row) return;

    const modal = document.createElement('div');
    modal.id = 'v5-delete-modal';
    modal.style.cssText = `
        position: fixed; top: 0; left: 0; right: 0; bottom: 0;
        background: rgba(0,0,0,0.5); z-index: 10000;
        display: flex; align-items: center; justify-content: center;
    `;
    modal.innerHTML = `
        <div style="background: white; padding: 24px; border-radius: 12px; max-width: 400px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
            <h3 style="margin: 0 0 12px 0; font-size: 18px; font-weight: 600; color: #1f2937;">Delete Transaction?</h3>
            <p style="margin: 0 0 20px 0; color: #4b5563; font-size: 14px;">
                Are you sure you want to delete <strong>${row.description}</strong>? This cannot be undone unless you use the Undo function immediately.
            </p>
            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button onclick="document.getElementById('v5-delete-modal').remove()" 
                    style="padding: 8px 16px; background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    Cancel
                </button>
                <button onclick="confirmDeleteV5Row('${rowId}')" 
                    style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 500;">
                    Delete
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
  };

  window.confirmDeleteV5Row = (rowId) => {
    document.getElementById('v5-delete-modal')?.remove();

    // Find and remove
    const idx = V5State.gridData.findIndex(r => r.id === rowId);
    if (idx === -1) return;

    const deletedRow = V5State.gridData[idx];

    // PUSH TO UNDO STACK
    V5State.undoStack.push({
      type: 'delete',
      row: { ...deletedRow },
      index: idx
    });
    updateUndoButton();

    V5State.gridData.splice(idx, 1);

    const rowNode = V5State.gridApi.getRowNode(rowId);
    if (rowNode) {
      V5State.gridApi.applyTransaction({ remove: [rowNode.data] });
    } else {
      V5State.gridApi.setGridOption('rowData', V5State.gridData);
    }

    recalculateAllBalances();
    saveData();
    console.log('🗑️ Deleted row ID:', rowId);
  };

  window.swapDebitCredit = (rowId) => {
    const row = V5State.gridData.find(r => r.id === rowId);
    if (!row) return;

    // PUSH TO UNDO STACK implies we want to reverse this later
    // The "reverse" of a swap is just another swap on the same row!
    V5State.undoStack.push({
      type: 'swap',
      rowId: rowId
    });
    updateUndoButton();

    const oldDebit = parseFloat(row.debit || 0);
    const oldCredit = parseFloat(row.credit || 0);

    row.debit = oldCredit;
    row.Debit = oldCredit;
    row.credit = oldDebit;
    row.Credit = oldDebit;
    row.type = row.debit > 0 ? 'Debit' : 'Credit';

    updateRowBalance(row);

    const res = V5State.gridApi.applyTransaction({ update: [row] });
    if (!res || res.updated.length === 0) {
      V5State.gridApi.refreshCells({ force: true });
    }

    saveData();
    console.log('🔄 Swapped D/C for row ID:', rowId);
  };

  // ROBUST UNDO FUNCTION
  window.undoLastAction = () => {
    if (V5State.undoStack.length === 0) return;

    const action = V5State.undoStack.pop();
    updateUndoButton();
    console.log('↩️ Undoing action:', action.type);

    if (action.type === 'delete') {
      const row = action.row;
      // Insert back at original index if possible, or push
      if (action.index >= 0 && action.index <= V5State.gridData.length) {
        V5State.gridData.splice(action.index, 0, row);
      } else {
        V5State.gridData.push(row);
      }

      V5State.gridApi.applyTransaction({ add: [row], addIndex: action.index });
      console.log('↩️ Restored deleted row:', row.id);

    } else if (action.type === 'swap') {
      // Just call swap again to reverse it
      // But DON'T push to undo stack this time (to avoid loop)
      // We manually swap logic here without calling window.swapDebitCredit
      const row = V5State.gridData.find(r => r.id === action.rowId);
      if (row) {
        const oldDebit = parseFloat(row.debit || 0);
        const oldCredit = parseFloat(row.credit || 0);
        row.debit = oldCredit;
        row.Debit = oldCredit;
        row.credit = oldDebit;
        row.Credit = oldDebit;
        row.type = row.debit > 0 ? 'Debit' : 'Credit';

        updateRowBalance(row);
        V5State.gridApi.applyTransaction({ update: [row] });
      }
    }

    recalculateAllBalances();
    saveData();
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
  const gridContainer = document.getElementById('v5-grid-container');
  if (!gridContainer || gridContainer.style.display === 'none') return;

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

    <!-- GRID APPEARANCE MODAL (Simple Working Version) -->
    <div id="v5-appearance-modal" style="display:none; position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.5); z-index:9999;">
      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); background:white; border-radius:12px; padding:2rem; min-width:500px; max-width:600px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
          <h3 style="margin:0; font-size:1.25rem;"> Grid Appearance</h3>
          <button onclick="closeAppearanceModal()" style="background:none; border:none; font-size:1.5rem; cursor:pointer; color:#666;">&times;</button>
        </div>
        
        <div style="display:flex; flex-direction:column; gap:1rem;">
          <div>
            <label style="display:block; font-weight:600; margin-bottom:0.5rem; font-size:0.875rem;">Theme</label>
            <select id="v5-theme-dropdown" onchange="applyAppearance()" style="width:100%; padding:0.5rem; border:1px solid #ddd; border-radius:6px;">
              <option value="">Default (Gray)</option>
              <option value="vanilla">Vanilla</option>
              <option value="classic">Classic Blue</option>
              <option value="ledger-pad">Ledger Pad</option>
              <option value="postit">Post-it Note</option>
              <option value="rainbow" selected>Rainbow</option>
              <option value="spectrum">Spectrum (Excel)</option>
              <option value="vintage">Vintage Dark</option>
            </select>
          </div>
          
          <div>
            <label style="display:block; font-weight:600; margin-bottom:0.5rem; font-size:0.875rem;">Font</label>
            <select id="v5-font-dropdown" onchange="applyAppearance()" style="width:100%; padding:0.5rem; border:1px solid #ddd; border-radius:6px;">
              <option value="inter">Inter (Default)</option>
              <optgroup label="Sans-Serif">
                <option value="neue-haas">Helvetica / Neue Haas</option>
                <option value="arial">Arial</option>
                <option value="verdana">Verdana</option>
                <option value="open-sans">Open Sans</option>
                <option value="roboto">Roboto</option>
                <option value="public-sans">Public Sans</option>
              </optgroup>
              <optgroup label="Serif">
                <option value="garamond">Garamond</option>
                <option value="times">Times New Roman</option>
                <option value="libre-baskerville">Libre Baskerville</option>
                <option value="georgia">Georgia</option>
              </optgroup>
            </select>
          </div>
          
          <div>
            <label style="display:block; font-weight:600; margin-bottom:0.5rem; font-size:0.875rem;">Text Size</label>
            <select id="v5-size-dropdown" onchange="applyAppearance()" style="width:100%; padding:0.5rem; border:1px solid #ddd; border-radius:6px;">
              <option value="xs">Extra Small</option>
              <option value="s">Small</option>
              <option value="m" selected>Medium</option>
              <option value="l">Large</option>
              <option value="xl">Extra Large</option>
            </select>
          </div>
        </div>
              <option value="xl">XL</option>
            </select>
          </div>
        </div>
        <div style="margin-top:1.5rem; text-align:right;">
          <button onclick="window.closeAppearanceModal()" style="padding:0.5rem 1rem; border:1px solid #ddd; background:white; border-radius:6px; cursor:pointer;">Close</button>
        </div>
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
  const gridContainer = document.getElementById('v5-grid-container');
  if (!gridContainer) {
    console.error('Grid container not found');
    return;
  }

  // CRITICAL: Don't allow popup on empty grid
  if (!V5State.gridData || V5State.gridData.length === 0) {
    console.warn('⚠️ No grid to popout - Please load transaction data first');
    return;
  }

  console.log('✅ Pop Out Grid: V5State.gridData has', V5State.gridData.length, 'rows');

  // Hide in-page grid
  gridContainer.style.display = 'none';

  // Show Pop-In overlay
  const popInOverlay = document.createElement('div');
  popInOverlay.id = 'v5-popin-overlay';
  popInOverlay.style.cssText = `
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 400px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    margin: 2rem;
    cursor: pointer;
  `;
  popInOverlay.innerHTML = `
    <div style="text-align: center; color: white;">
      <i class="ph ph-arrow-square-in" style="font-size: 64px; margin-bottom: 1rem;"></i>
      <h2 style="margin: 0 0 0.5rem 0; font-size: 24px;">Grid Popped Out</h2>
      <p style="margin: 0; opacity: 0.9; font-size: 14px;">Click here to bring it back</p>
    </div>
  `;
  popInOverlay.onclick = () => window.popInV5Grid();
  gridContainer.parentElement.insertBefore(popInOverlay, gridContainer);

  // Get current appearance settings from main window
  const currentTheme = document.getElementById('v5-theme-dropdown')?.value || 'rainbow';
  const currentFont = document.getElementById('v5-font-dropdown')?.value || '';
  const currentSize = document.getElementById('v5-size-dropdown')?.value || 'm';

  // SAFELY SERIALIZE DATA FOR TEMPLATE INJECTION
  const safeGridData = JSON.stringify(V5State.gridData).replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const safeRefPrefix = JSON.stringify(V5State.refPrefix || '').replace(/`/g, '\\`').replace(/\$/g, '\\$');
  const safeOpeningBalance = JSON.stringify(V5State.openingBalance || 0);

  // GATHER MAIN THEME CSS BLOCKS FOR INJECTION
  const themeStyles = document.getElementById('v5-theme-styles')?.innerHTML || '';
  const safeThemeStyles = themeStyles.replace(/`/g, '\\`').replace(/\$/g, '\\$');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>V5 Transactions Popout</title>
      <script src="https://unpkg.com/@phosphor-icons/web"></script>
      <style>
        /* CRITICAL: Use Inter as primary font stack */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Open+Sans:wght@400;600&family=Roboto:wght@400;500&family=Public+Sans:wght@400;600&family=EB+Garamond:wght@400;500&family=Libre+Baskerville:wght@400;700&display=swap');
        
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          margin: 0;
          padding: 20px;
          background: #f8fafc;
          overflow-x: hidden;
        }

        .v5-popout-container {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* Cloudy Card Style */
        .v5-cloudy-card {
          background: white;
          border: 1.5px solid rgba(59, 130, 246, 0.08);
          border-radius: 12px;
          padding: 1.5rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.02), 0 2px 4px -2px rgba(0, 0, 0, 0.02);
        }

        /* ===== HEADER SECTION ===== */
        .v5-main-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .v5-title-group {
          display: flex;
          align-items: center;
          gap: 16px;
        }

        .v5-branded-icon {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .v5-branded-icon i {
          color: white;
          font-size: 24px;
        }

        .v5-title-section h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .v5-subtitle {
          margin: 4px 0 0 0;
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 6px;
          font-weight: 500;
        }

        .v5-subtitle .v5-account-type {
          color: #3b82f6;
          font-weight: 700;
        }

        .v5-header-actions {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        /* Modal-like Menu Button */
        .v5-more-actions-btn {
          width: 36px;
          height: 36px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          background: white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
        }

        .v5-more-actions-btn:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
          color: #0f172a;
        }

        .v5-actions-dropdown {
          position: absolute;
          top: 60px;
          right: 32px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
          z-index: 10000;
          min-width: 220px;
          padding: 8px;
          display: none;
        }

        .v5-actions-dropdown.show {
          display: block;
          animation: menuFadeIn 0.2s ease-out;
        }

        @keyframes menuFadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .v5-menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          color: #334155;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .v5-menu-item i {
          font-size: 18px;
          color: #64748b;
        }

        .v5-menu-item:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .v5-menu-item:hover i {
          color: #0f172a;
        }

        .appearance-bar {
          display: flex;
          gap: 8px;
          /* align-items: center; */
        }
        /* ===== TOOLBAR SECTION ===== */
        .v5-control-toolbar {
          display: flex;
          align-items: center;
          gap: 24px;
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          padding: 12px 24px;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 0px; /* Flush with grid */
        }

        /* Hidden Appearance Settings Panel */
        .v5-appearance-settings {
          display: none; /* Toggled by menu */
          background: #f8fafc;
          padding: 12px 24px;
          border-bottom: 1px solid #e2e8f0;
          gap: 16px;
          align-items: center;
        }

        .v5-appearance-settings.show {
          display: flex;
        }

        .v5-ref-section {
          display: flex;
          align-items: center;
          gap: 8px;
          white-space: nowrap;
        }

        .v5-ref-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .v5-ref-box {
          width: 60px;
          padding: 8px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          text-align: center;
          font-family: monospace;
          font-weight: 700;
          color: #475569;
          font-size: 14px;
          background: #fdfdfd;
        }

        .v5-search-wrapper {
          flex: 1;
          position: relative;
          display: flex;
          align-items: center;
        }

        .v5-search-wrapper i {
          position: absolute;
          right: 12px;
          color: #94a3b8;
          font-size: 16px;
        }

        .v5-search-input {
          width: 100%;
          padding: 10px 40px 10px 16px;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
          font-size: 14px;
          transition: all 0.2s;
          color: #475569;
        }

        .v5-search-input::placeholder { color: #94a3b8; }

        .v5-search-input:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
          outline: none;
        }

        .v5-balances-card {
          display: flex;
          gap: 1.5rem;
          padding: 0.75rem 1.25rem;
          background: transparent;
          border-radius: 6px;
          flex-shrink: 0;
          margin-left: auto;
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

        .v5-balance-label sup {
          font-size: 0.65em;
          margin-left: 3px;
          color: inherit;
          opacity: 0.8;
        }

        .v5-balance-value {
          font-size: 0.875rem;
          font-weight: 700;
          color: #1F2937;
          font-family: 'Courier New', monospace;
        }

        .v5-balance-value.positive { color: #10b981; }
        .v5-balance-value.negative { color: #ef4444; }

        .v5-balance-item.ending .v5-balance-value {
          font-size: 1rem;
          color: #60a5fa;
        }

        /* Override specific ID colors for 1:1 parity */
        #popup-total-in { color: #10b981; } 
        #popup-total-out { color: #ef4444; }
        #popup-ending-bal { color: #60a5fa; }

        /* ===== BULK ACTIONS ===== */
        .bulk-actions-bar {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          background: #1e293b;
          color: white;
          padding: 12px 24px;
          border-radius: 99px;
          display: none;
          align-items: center;
          gap: 20px;
          box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04);
          z-index: 1000;
        }

        .selection-label {
          font-size: 14px;
          font-weight: 600;
          color: #94a3b8;
        }

        .btn-bulk {
          padding: 8px 16px;
          border-radius: 99px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          display: flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .btn-bulk-categorize { background: #3b82f6; color: white; }
        .btn-bulk-delete { background: #ef4444; color: white; }
        .btn-bulk-cancel { background: #475569; color: white; }

        /* ===== GRID STYLING ===== */
        #popout-grid {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
          height: calc(100vh - 280px) !important;
          width: 100%;
        }

        /* ===== APPEARANCE PANEL OVERLAY ===== */
        /* This section is now handled by .v5-appearance-settings */
        .control-group {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .control-group select {
          padding: 6px 12px;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
          background: white;
          cursor: pointer;
        }

        .btn-icon {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          width: 36px;
          height: 36px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-icon:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        /* ===== AG-GRID UI REFINEMENTS (BLUE HEADER) ===== */
        /* ===== AG-GRID UI REFINEMENTS (BLUE HEADER) ===== */
        .ag-theme-alpine {
          --ag-font-family: 'Inter', sans-serif;
          --ag-foreground-color: #334155;
          --ag-background-color: #ffffff;
          --ag-header-background-color: #0066cc !important;
          --ag-header-foreground-color: #ffffff !important;
          --ag-odd-row-background-color: #fcfcfc;
          --ag-row-hover-background-color: #f0f9ff;
          --ag-selected-row-background-color: #e0f2fe;
          --ag-border-color: #e2e8f0;
          --ag-row-border-color: #f1f5f9;
          --ag-cell-horizontal-padding: 16px;
          --ag-grid-size: 4px;
          --ag-font-size: 14px;
          border: 1.5px solid rgba(59, 130, 246, 0.08);
          border-radius: 12px;
          overflow: hidden;
        }
        
        /* Force White Header Icons */
        .ag-header-cell-icon { color: white !important; }
        .ag-header-cell-label { color: white !important; font-weight: 600 !important; }
        
        /* Header Vertical Separators */
        .ag-header-cell {
          border-right: 1px solid rgba(255,255,255,0.2) !important;
        }
        
        /* Remove Pinned Border to blend Ref# */
        .ag-pinned-left-header, 
        .ag-horizontal-left-spacer, 
        .ag-pinned-left-cols-container {
          border-right: none !important;
        }

        /* Balance colors */
        .balance-positive { color: #10b981 !important; font-weight: 700; }
        .balance-negative { color: #ef4444 !important; font-weight: 700; }

        /* Custom cell editor styling */
        .ag-popup-editor {
          z-index: 9999 !important;
        }

        /* INJECTED MAIN THEME CSS */
        ${safeThemeStyles}
      </style>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ag-grid-community/styles@31.0.0/ag-grid.css">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@ag-grid-community/styles@31.0.0/ag-theme-alpine.css">
    </head>
    <body>
      <div class="v5-popout-container">
        
        <div class="v5-main-header v5-cloudy-card">
          <div class="v5-title-group">
            <div class="v5-branded-icon">
              <i class="ph ph-arrow-square-down"></i>
            </div>
            <div class="v5-title-section">
              <h1>Transactions</h1>
              <p class="v5-subtitle">
                <span class="v5-account-type">CHECKING</span>
                <span>•</span>
                <span class="v5-status">Ready for Review</span>
              </p>
            </div>
          </div>
          
          <div class="v5-header-actions">
            <button class="v5-more-actions-btn" onclick="sendToParent('popInV5Grid')" title="Pop In">
              <i class="ph-bold ph-arrow-square-in"></i>
            </button>

            <div class="v5-more-actions-btn" id="menu-btn" title="More Actions">
              <i class="ph-bold ph-dots-three-vertical"></i>
            </div>

            <div class="v5-actions-dropdown" id="actions-menu">
              <div class="v5-menu-item" onclick="toggleAppearancePanel()">
                <i class="ph ph-palette"></i>
                <span>Grid Appearance</span>
              </div>
              <div class="v5-menu-item" onclick="alert('Undo')">
                <i class="ph ph-arrow-counter-clockwise"></i>
                <span>Undo</span>
              </div>
              <div class="v5-menu-item" onclick="alert('Keyboard Shortcuts')">
                <i class="ph ph-keyboard"></i>
                <span>Keyboard Shortcuts</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Appearance Settings (Initially Hidden) -->
        <div class="v5-appearance-settings v5-cloudy-card" id="appearance-panel" style="padding: 12px 24px;">
          <div style="display: flex; gap: 24px; align-items: center;">
            <div class="control-group" style="display: flex; align-items: center; gap: 10px;">
              <label class="v5-ref-label">Theme</label>
              <select id="popup-theme-dropdown-panel" class="modal-select" style="width: 140px;" onchange="applyAppearance()">
              <option value="vanilla" ${V5State.currentTheme === 'vanilla' ? 'selected' : ''}>Vanilla</option>
              <option value="classic" ${V5State.currentTheme === 'classic' ? 'selected' : ''}>Classic Blue</option>
              <option value="ledger-pad" ${V5State.currentTheme === 'ledger-pad' ? 'selected' : ''}>Ledger Pad</option>
              <option value="postit" ${V5State.currentTheme === 'postit' ? 'selected' : ''}>Post-It</option>
              <option value="spectrum" ${V5State.currentTheme === 'spectrum' ? 'selected' : ''}>Spectrum (Excel)</option>
              <option value="vintage" ${V5State.currentTheme === 'vintage' ? 'selected' : ''}>Vintage Dark</option>
              <option value="rainbow" ${(!V5State.currentTheme || V5State.currentTheme === 'rainbow') ? 'selected' : ''}>Rainbow</option>
              </select>
            </div>
            <div class="control-group" style="display: flex; align-items: center; gap: 10px;">
              <label class="v5-ref-label">Font</label>
              <select id="popup-font-dropdown-panel" class="modal-select" style="width: 160px;" onchange="applyAppearance()">
                <option value="inter" ${(!V5State.currentFont || V5State.currentFont === 'inter') ? 'selected' : ''}>Inter (Default)</option>
                <optgroup label="Sans-Serif">
                  <option value="neue-haas">Helvetica / Neue Haas</option>
                  <option value="arial">Arial</option>
                  <option value="verdana">Verdana</option>
                  <option value="open-sans">Open Sans</option>
                  <option value="roboto">Roboto</option>
                  <option value="public-sans">Public Sans</option>
                </optgroup>
                <optgroup label="Serif">
                  <option value="garamond">Garamond</option>
                  <option value="times">Times New Roman</option>
                  <option value="libre-baskerville">Libre Baskerville</option>
                  <option value="georgia">Georgia</option>
                </optgroup>
              </select>
            </div>
            <div class="control-group" style="display: flex; align-items: center; gap: 10px;">
              <label class="v5-ref-label">Size</label>
              <select id="popup-size-dropdown-panel" class="modal-select" style="width: 100px;" onchange="applyAppearance()">
                <option value="s" ${V5State.currentSize === 's' ? 'selected' : ''}>Small</option>
                <option value="m" ${(!V5State.currentSize || V5State.currentSize === 'm') ? 'selected' : ''}>Medium</option>
                <option value="l" ${V5State.currentSize === 'l' ? 'selected' : ''}>Large</option>
                <option value="xl" ${V5State.currentSize === 'xl' ? 'selected' : ''}>X-Large</option>
              </select>
            </div>
          </div>
        </div>

        <div class="v5-control-toolbar v5-cloudy-card" style="padding: 12px 24px;">
          <div class="v5-ref-section">
            <span class="v5-ref-label">REF#</span>
            <input type="text" id="popup-ref-input" class="v5-ref-box" placeholder="####" value="${V5State.refPrefix || ''}">
          </div>

          <div class="v5-search-wrapper">
            <input type="text" id="popup-search-input" class="v5-search-input" placeholder="Search transactions...">
            <i class="ph ph-magnifying-glass"></i>
          </div>
          
          <div class="v5-balances-card">
            <div class="v5-balance-item">
              <div class="v5-balance-label">Opening</div>
              <div class="v5-balance-value" id="popup-opening">$0.00</div>
            </div>
            <div class="v5-balance-item">
              <div class="v5-balance-label val-in-label">Total In<sup id="popup-count-in">0</sup></div>
              <div class="v5-balance-value" id="popup-total-in">$0.00</div>
            </div>
            <div class="v5-balance-item">
              <div class="v5-balance-label val-out-label">Total Out<sup id="popup-count-out">0</sup></div>
              <div class="v5-balance-value" id="popup-total-out">$0.00</div>
            </div>
            <div class="v5-balance-item">
              <div class="v5-balance-label">Ending</div>
              <div class="v5-balance-value" id="popup-ending-bal">$0.00</div>
            </div>
          </div>
        </div>

        <div id="popout-grid" class="ag-theme-alpine"></div>

        <div class="bulk-actions-bar" id="popup-bulk-bar">
          <span class="selection-label" id="popup-selection-count">0 selected</span>
          <button class="btn-bulk btn-bulk-categorize" onclick="bulkCategorize()">
            <i class="ph ph-sparkle"></i> Categorize
          </button>
          <button class="btn-bulk btn-bulk-delete" onclick="bulkDelete()">
            <i class="ph ph-trash"></i> Delete
          </button>
          <button class="btn-bulk btn-bulk-cancel" onclick="clearSelection()">Cancel</button>
        </div>
        
        <!-- DEBUG PANEL (Collapsible) -->
        <details style="margin-top: 20px; background: white; border-radius: 8px; padding: 10px; border: 1px solid #e2e8f0;">
          <summary style="cursor: pointer; font-size: 12px; font-weight: 600; color: #64748b;">Debug Information</summary>
          <div id="debug-content" style="font-family: monospace; font-size: 11px; color: #10b981; margin-top: 10px;"></div>
        </details>

      </div>

      <script src="https://cdn.jsdelivr.net/npm/ag-grid-community@31.0.0/dist/ag-grid-community.min.js"></script>
      <script>
        const gridData = ${safeGridData};
        const openingBalance = ${safeOpeningBalance};
        let refPrefix = ${safeRefPrefix};
        let gridApi;

        // ===== COA DATA & HELPERS =====
        function getGroupedCoA() {
          const rawDefault = window.opener.DEFAULT_CHART_OF_ACCOUNTS || [];
          let rawCustom = [];
          try { rawCustom = JSON.parse(window.opener.localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
          const all = [...rawDefault, ...rawCustom];

          const groups = {
            'Assets': [], 'Liabilities': [], 'Equity': [], 'Revenue': [], 'Expenses': []
          };

          all.forEach(acc => {
            if (!acc.name || acc.name.toString().toLowerCase().includes("invalid")) return;
            const type = (acc.type || '').toLowerCase();
            const cat = (acc.category || '').toLowerCase();
            const displayName = acc.code ? acc.code + ' - ' + acc.name : acc.name;

            if (type.includes('asset') || cat.includes('asset')) groups['Assets'].push(displayName);
            else if (type.includes('liabil') || cat.includes('liabil')) groups['Liabilities'].push(displayName);
            else if (type.includes('equity') || cat.includes('equity')) groups['Equity'].push(displayName);
            else if (type.includes('revenue') || type.includes('income') || cat.includes('revenue')) groups['Revenue'].push(displayName);
            else if (type.includes('expense') || cat.includes('expense')) groups['Expenses'].push(displayName);
          });
          return groups;
        }

        function resolveAccountName(val) {
          if (!val) return 'Uncategorized';
          val = val.toString().trim();
          if (val.toLowerCase().includes("invalid")) return 'Uncategorized';

          if (val.match(/^\\d{4}$/)) {
            const rawDefault = window.opener.DEFAULT_CHART_OF_ACCOUNTS || [];
            let rawCustom = [];
            try { rawCustom = JSON.parse(window.opener.localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
            const match = [...rawDefault, ...rawCustom].find(a => a.code === val);
            if (match && match.name) return match.name;
          }
          return val.replace(/^\\d{4}\\b\\s*/, '');
        }

        // ===== CUSTOM ACCOUNT EDITOR =====
        class GroupedAccountEditor {
          init(params) {
            this.params = params;
            this.value = params.value || 'Uncategorized';
            this.groupedData = getGroupedCoA();
            this.value = params.value;
            this.container = document.createElement('div');
            this.container.style.cssText = 'background:white; border:1px solid #cbd5e1; border-radius:8px; box-shadow:0 10px 15px -3px rgba(0,0,0,0.1); width:280px; max-height:400px; overflow-y:auto; z-index:10000;';
            const coa = getGroupedCoA();
            Object.entries(coa).forEach(([group, items]) => {
              if (items.length) {
                const header = document.createElement('div');
                header.style.cssText = 'padding:8px 12px; background:#f8fafc; font-weight:700; font-size:11px; color:#64748b; text-transform:uppercase;';
                header.innerText = group;
                this.container.appendChild(header);
                items.forEach(item => {
                  const div = document.createElement('div');
                  div.style.cssText = 'padding:8px 16px; font-size:13px; color: #334155; cursor:pointer;';
                  div.innerText = item;
                  div.onclick = () => { this.value = item; this.params.stopEditing(); };
                  this.container.appendChild(div);
                });
              }
            });
          }
          getGui() { return this.container; }
          getValue() { return this.value; }
          isPopup() { return true; }
        }

        // ===== ACTIONS RENDERER =====
        class ActionCellRenderer {
          init(params) {
            this.eGui = document.createElement('div');
            this.eGui.style.cssText = 'display:flex; gap:8px; align-items:center; height:100%;';
            const createBtn = (icon, color, bg, title, onClick) => {
              const btn = document.createElement('button');
              btn.innerHTML = '<i class="ph ph-' + icon + '"></i>';
              btn.style.cssText = 'border:none; background:' + bg + '; color:' + color + '; border-radius:4px; width:28px; height:28px; cursor:pointer; display:flex; align-items:center; justify-content:center; font-size:16px;';
              btn.title = title;
              btn.onclick = (e) => { e.stopPropagation(); onClick(); };
              return btn;
            };
            this.eGui.appendChild(createBtn('trash', '#ef4444', '#fee2e2', 'Delete', () => {
              if (confirm('Delete transaction?')) {
                const idx = gridData.findIndex(r => r.id === params.data.id);
                if (idx !== -1) {
                  gridData.splice(idx, 1);
                  gridApi.setGridOption('rowData', gridData);
                  sendToParent('updateV5DataFromPopout', gridData);
                  updateBalances();
                  renumberRows();
                }
              }
            }));
          }
          getGui() { return this.eGui; }
        }

        // ===== GRID CONFIG =====
        const columnDefs = [
          { headerName: '', width: 40, checkboxSelection: true, headerCheckboxSelection: true, pinned: 'left' },
          { 
            headerName: 'Ref#', 
            field: 'refNumber', 
            width: 80, 
            cellStyle: { color: '#64748b', fontWeight: '600', fontFamily: 'monospace' },
            valueGetter: (params) => {
              if (!params.data.refNumber) return '';
              return refPrefix ? (refPrefix + '-' + params.data.refNumber) : params.data.refNumber;
            }
          },
          { headerName: 'Date', field: 'date', width: 100, sort: 'asc' },
          { headerName: 'Description', field: 'description', flex: 2, minWidth: 150, editable: true },
          { headerName: 'Debit', field: 'debit', width: 90, editable: true, 
             valueFormatter: params => params.value > 0 ? '$' + params.value.toLocaleString() : '' },
          { headerName: 'Credit', field: 'credit', width: 90, editable: true,
             valueFormatter: params => params.value > 0 ? '$' + params.value.toLocaleString() : '' },
          { headerName: 'Balance', field: 'balance', width: 110, 
             valueFormatter: params => '$' + (params.value || 0).toLocaleString(),
             cellClass: params => (params.value || 0) < 0 ? 'balance-negative' : 'balance-positive'
          },
          { headerName: 'Account', field: 'account', flex: 1.5, editable: true, cellEditor: GroupedAccountEditor },
          { headerName: 'Actions', width: 80, cellRenderer: ActionCellRenderer }
        ];

        const gridOptions = {
          columnDefs,
          rowData: gridData,
          defaultColDef: { sortable: true, filter: true, resizable: true, minWidth: 50 },
          suppressHorizontalScroll: true,
          autoSizeStrategy: { type: 'fitGridWidth' },
          rowSelection: 'multiple',
          rowHeight: 48,
          onGridReady: (params) => {
            gridApi = params.api;
            // Defer slightly to ensure initial draw is complete and prevent draw-interruption warnings
            setTimeout(() => {
              renumberRows();
              updateBalances();
              applyAppearance();
            }, 0);
          },
          onSortChanged: () => renumberRows(),
          onFilterChanged: () => renumberRows(),
          onSelectionChanged: () => {
            const count = gridApi.getSelectedNodes().length;
            document.getElementById('popup-bulk-bar').style.display = count > 0 ? 'flex' : 'none';
            document.getElementById('popup-selection-count').innerText = count + ' selected';
          },
          onCellValueChanged: () => {
            sendToParent('updateV5DataFromPopout', gridData);
            updateBalances();
          }
        };

        function renumberRows() {
          if (!gridApi) return;
          setTimeout(() => {
            const displayed = [];
            gridApi.forEachNodeAfterFilterAndSort(node => displayed.push(node.data));
            displayed.forEach((row, i) => {
              row.refNumber = String(i + 1).padStart(3, '0');
            });
            gridApi.refreshCells({ force: true });
          }, 50);
        }

        function updateBalances() {
          let tIn = 0, tOut = 0, cIn = 0, cOut = 0;
          gridData.forEach(t => {
            const cr = parseFloat(t.credit) || 0;
            const dr = parseFloat(t.debit) || 0;
            if (cr > 0) { tIn += cr; cIn++; }
            if (dr > 0) { tOut += dr; cOut++; }
          });
          const end = (parseFloat(openingBalance) || 0) + tIn - tOut;
          const fmt = (n) => n.toLocaleString('en-US', { minimumFractionDigits:2 });
          document.getElementById('popup-opening').innerText = '$' + fmt(openingBalance);
          document.getElementById('popup-total-in').innerText = '+$' + fmt(tIn);
          document.getElementById('popup-count-in').innerText = cIn;
          document.getElementById('popup-total-out').innerText = '-$' + fmt(tOut);
          document.getElementById('popup-count-out').innerText = cOut;
          document.getElementById('popup-ending-bal').innerText = '$' + fmt(end);
        }

        function applyAppearance() {
          const theme = document.getElementById('popup-theme-dropdown-panel').value;
          const font = document.getElementById('popup-font-dropdown-panel').value;
          const size = document.getElementById('popup-size-dropdown-panel').value;
          const grid = document.getElementById('popout-grid');
          
          // 1. Reset classes and apply base theme + custom theme class
          grid.className = 'ag-theme-alpine';
          grid.classList.add('theme-' + theme);

          // 2. Synchronized Font Map (1:1 with main)
          const fonts = {
            'neue-haas': '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
            'arial': 'Arial, sans-serif',
            'verdana': 'Verdana, sans-serif',
            'open-sans': '"Open Sans", sans-serif',
            'roboto': '"Roboto", sans-serif',
            'public-sans': '"Public Sans", sans-serif',
            'garamond': '"EB Garamond", serif',
            'times': '"Times New Roman", Times, serif',
            'libre-baskerville': '"Libre Baskerville", serif',
            'georgia': 'Georgia, serif',
            'inter': '"Inter", sans-serif'
          };
          grid.style.fontFamily = fonts[font] || '"Inter", sans-serif';

          // 3. Synchronized Size Map (1:1 with main)
          const sizeMap = { 'xs': '11px', 's': '12px', 'm': '13px', 'l': '14px', 'xl': '16px' };
          const fs = sizeMap[size] || '13px';
          
          let styleTag = document.getElementById('dynamic-fs-v5');
          if (!styleTag) { 
            styleTag = document.createElement('style'); 
            styleTag.id = 'dynamic-fs-v5'; 
            document.head.appendChild(styleTag); 
          }
          styleTag.innerHTML = '.ag-theme-alpine { --ag-font-size: ' + fs + ' !important; } ' +
                             '.ag-theme-alpine .ag-header-cell-text, .ag-theme-alpine .ag-cell { font-size: ' + fs + ' !important; }';
          
          if (gridApi) setTimeout(() => gridApi.sizeColumnsToFit(), 50);
          sendToParent('syncV5Appearance', { theme, font, size });
        }

        function toggleAppearancePanel() { 
          document.getElementById('appearance-panel').classList.toggle('show'); 
        }

        document.getElementById('popup-search-input').oninput = (e) => gridApi.setGridOption('quickFilterText', e.target.value);
        document.getElementById('popup-ref-input').oninput = (e) => {
          refPrefix = e.target.value.toUpperCase();
          gridApi.refreshCells({ columns: ['refNumber'], force: true });
          sendToParent('syncV5RefPrefix', refPrefix);
        };

        const menuBtn = document.getElementById('menu-btn');
        const actionsMenu = document.getElementById('actions-menu');
        menuBtn.onclick = (e) => { e.stopPropagation(); actionsMenu.classList.toggle('show'); };
        window.onclick = () => actionsMenu.classList.remove('show');

        // COMMUNICATION
        function sendToParent(type, data = {}) {
          if (window.opener && !window.opener.closed) window.opener.postMessage({ type, data }, '*');
        }

        function bulkDelete() {
          const rows = gridApi.getSelectedRows();
          if (!rows.length || !confirm('Delete ' + rows.length + ' items?')) return;
          const ids = rows.map(r => r.id);
          const newData = gridData.filter(r => !ids.includes(r.id));
          gridData.length = 0; newData.forEach(r => gridData.push(r));
          gridApi.setGridOption('rowData', gridData);
          sendToParent('updateV5DataFromPopout', gridData);
          updateBalances(); renumberRows();
        }

        function bulkCategorize() {
          const rows = gridApi.getSelectedRows();
          if (!rows.length) return;
          const cat = prompt('Category:');
          if (cat) {
            rows.forEach(r => r.account = cat);
            gridApi.refreshCells({ force: true });
            sendToParent('updateV5DataFromPopout', gridData);
          }
        }

        function clearSelection() { gridApi.deselectAll(); }

        // Start grid
        agGrid.createGrid(document.getElementById('popout-grid'), gridOptions);
      </script>
    </body>
    </html>
  `;

  const blob = new Blob([htmlContent], { type: 'text/html' });
  const url = URL.createObjectURL(blob);

  // Create popout window
  const popOutWindow = window.open(url, 'V5GridPopOut', 'width=1600,height=1000');

  if (!popOutWindow) {
    alert('Popup blocked! Please allow popups for this site.');
    return;
  }

  // Store reference and monitor closure
  V5State.popoutWindow = popOutWindow;

  // Backup monitor for immediate response
  const monitor = setInterval(() => {
    if (popOutWindow.closed) {
      clearInterval(monitor);
      window.popInV5Grid();
    }
  }, 300);
};




// ====================================================================================
// POP-IN / POP-OUT ORCHESTRATION BRIDGE
// ====================================================================================

window.addEventListener('message', (event) => {
  const { type, data } = event.data;
  if (!type) return;

  console.log('📬 Parent received message:', type, data);

  switch (type) {
    case 'syncV5Appearance':
      window.syncV5Appearance(data.theme, data.size);
      break;
    case 'syncV5RefPrefix':
      window.updateRefPrefix(data);
      break;
    case 'updateV5DataFromPopout':
      window.updateV5DataFromPopout(data);
      break;
    case 'popInV5Grid':
      window.popInV5Grid();
      break;
  }
});

window.syncV5Appearance = function (theme, size) {
  const mainTheme = document.getElementById('v5-theme-dropdown');
  const mainSize = document.getElementById('v5-size-dropdown');
  if (mainTheme) mainTheme.value = theme;
  if (mainSize) mainSize.value = size;
  if (window.applyAppearance) window.applyAppearance();
};

window.popInV5Grid = function () {
  // Clear reference immediately to avoid recursion
  const win = V5State.popoutWindow;
  V5State.popoutWindow = null;

  // Close popout if it's still open
  if (win && !win.closed) {
    try { win.close(); } catch (e) { }
  }

  // Remove Pop-In overlay
  const overlay = document.getElementById('v5-popin-overlay');
  if (overlay) overlay.remove();

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

// CRITICAL: Sync appearance settings FROM popup TO main window
window.syncAppearanceFromPopup = function (theme, font, size) {
  const mainTheme = document.getElementById('v5-theme-dropdown');
  const mainFont = document.getElementById('v5-font-dropdown');
  const mainSize = document.getElementById('v5-size-dropdown');

  if (mainTheme) mainTheme.value = theme || '';
  if (mainFont) mainFont.value = font || '';
  if (mainSize) mainSize.value = size || 'm';

  // Apply appearance to main window grid so both windows stay in sync
  window.applyAppearance();
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
  const panel = document.getElementById('v5-appearance-panel');
  const menu = document.getElementById('v5-header-dropdown');

  if (panel) {
    panel.style.display = 'flex';
    console.log('✅ Appearance panel shown');
  }

  if (menu) {
    menu.style.display = 'none'; // Close dropdown menu
  }
};

window.closeV5Appearance = function () {
  const panel = document.getElementById('v5-appearance-panel');
  if (panel) {
    panel.style.display = 'none';
    console.log('✅ Appearance panel hidden');
  }
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
  // Save to CacheManager (IndexedDB)
  await window.CacheManager.saveTransactions(V5State.gridData);

  // Also save to localStorage as backup
  try {
    const dataToSave = V5State.gridData.map(({ sourceFileBlob, ...rest }) => rest);
    localStorage.setItem('ab_v5_grid_data', JSON.stringify(dataToSave));
  } catch (e) {
    console.warn('Could not save to localStorage:', e);
  }

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

// Helper to show the toolbar safely
function showControlToolbar() {
  const toolbar = document.getElementById('v5-control-toolbar');
  if (toolbar) {
    toolbar.style.display = 'flex';
  } else {
    console.warn('Control toolbar element not found');
  }
}

window.initTxnImportV5Grid = async function () {
  console.log('🔄 Checking for cached grid data...');

  try {
    let restoredData = null;

    // Try to restore from CacheManager
    const cached = await window.CacheManager?.getTransactions();
    if (cached && cached.length > 0) restoredData = cached;

    // Try localStorage fallback if CacheManager empty
    if (!restoredData) {
      const localData = localStorage.getItem('ab_v5_grid_data');
      if (localData) {
        const parsed = JSON.parse(localData);
        if (parsed && parsed.length > 0) restoredData = parsed;
      }
    }

    if (restoredData) {
      // VALIDATION: Check for garbage data
      const isValid = restoredData.every(tx => {
        return tx.date !== 'Invalid Date' && tx.date.match(/^\d{4}-\d{2}-\d{2}$/) && tx.description.length < 500;
      });

      if (isValid) {
        console.log(`💡 Found ${restoredData.length} transactions in cache. Prompting for recovery...`);

        // PAUSE: Show modal instead of auto-restoring
        const modal = document.getElementById('v5-recovery-modal');
        if (modal) {
          modal.style.display = 'flex';
          // Store the data temporarily for the confirmation handler
          window._pendingV5Restoration = restoredData;
          return;
        } else {
          // Fallback if modal not found
          window.applyV5Restoration(restoredData);
          return;
        }
      }
    }
  } catch (e) {
    console.warn('Could not check cached data:', e);
  }

  // No cached data or declined - show empty state
  console.log('ℹ️ No cached data found - showing empty state');
  const emptyState = document.getElementById('v5-empty-state');
  if (emptyState) emptyState.style.display = 'flex';
};

// HELPER: Actually apply the data
window.applyV5Restoration = function (restoredData) {
  V5State.gridData = restoredData;

  // Re-detect account type as it might not be persisted
  if (!V5State.accountType && typeof detectAccountType === 'function') {
    V5State.accountType = detectAccountType(restoredData);
  }

  // Update status header
  if (window.updateV5PageHeader) {
    const bank = restoredData[0]?._bank || 'Bank Statement';
    window.updateV5PageHeader(bank, V5State.accountType);
  }

  initV5Grid();
  showControlToolbar();

  // Hide empty state if visible
  const emptyState = document.getElementById('v5-empty-state');
  if (emptyState) emptyState.style.display = 'none';
};

// HANDLER: Recovery Modal Actions
window.confirmV5Recovery = async function (shouldRestore) {
  const modal = document.getElementById('v5-recovery-modal');
  if (modal) modal.style.display = 'none';

  if (shouldRestore && window._pendingV5Restoration) {
    window.applyV5Restoration(window._pendingV5Restoration);
  } else {
    // START FRESH
    console.log('🧹 Clearing cache as requested');
    localStorage.removeItem('ab_v5_grid_data');
    localStorage.removeItem('ab_import_session');
    if (window.CacheManager) await window.CacheManager.clearAll();

    const emptyState = document.getElementById('v5-empty-state');
    if (emptyState) emptyState.style.display = 'flex';
  }

  delete window._pendingV5Restoration;
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

// THEME PICKER FUNCTIONS
// ============================================
// GRID APPEARANCE - SIMPLE WORKING VERSION
// ============================================

window.openAppearanceModal = function () {
  const modal = document.getElementById('v5-appearance-modal');
  if (!modal) return;

  modal.style.display = 'flex';

  // Load saved settings
  const saved = JSON.parse(localStorage.getItem('v5_grid_appearance') || '{}');
  document.getElementById('v5-theme-dropdown').value = saved.theme || 'rainbow';
  if (saved.font) document.getElementById('v5-font-dropdown').value = saved.font || '';
  if (saved.size) document.getElementById('v5-size-dropdown').value = saved.size || 'm';

  // Apply current settings
  applyAppearance();
};

window.closeAppearanceModal = function () {
  const modal = document.getElementById('v5-appearance-modal');
  if (modal) modal.style.display = 'none';
};

window.applyAppearance = function () {
  const theme = document.getElementById('v5-theme-dropdown')?.value || 'rainbow';
  const font = document.getElementById('v5-font-dropdown')?.value || 'inter';
  const size = document.getElementById('v5-size-dropdown')?.value || 'm';

  const grid = document.querySelector('.ag-theme-alpine');
  if (!grid) return;

  // 1. Remove ALL existing theme-* classes
  const classesToRemove = Array.from(grid.classList).filter(cls => cls.startsWith('theme-'));
  classesToRemove.forEach(cls => grid.classList.remove(cls));

  // 2. Add new theme class
  grid.classList.add(`theme-${theme}`);

  // 3. Apply font family
  const fonts = {
    'neue-haas': '"Helvetica Neue", "Helvetica", "Arial", sans-serif',
    'arial': 'Arial, sans-serif',
    'verdana': 'Verdana, sans-serif',
    'open-sans': '"Open Sans", sans-serif',
    'roboto': '"Roboto", sans-serif',
    'public-sans': '"Public Sans", sans-serif',
    'garamond': '"EB Garamond", serif',
    'times': '"Times New Roman", Times, serif',
    'libre-baskerville': '"Libre Baskerville", serif',
    'georgia': 'Georgia, serif',
    'inter': '"Inter", sans-serif'
  };
  grid.style.fontFamily = fonts[font] || '"Inter", sans-serif';

  // 4. Apply font size
  const sizeMap = { 'xs': '11px', 's': '12px', 'm': '13px', 'l': '14px', 'xl': '16px' };
  const cssSize = sizeMap[size] || '13px';

  let styleEl = document.getElementById('v5-grid-size-override');
  if (styleEl) styleEl.remove();

  styleEl = document.createElement('style');
  styleEl.id = 'v5-grid-size-override';
  styleEl.textContent = `
    .ag-theme-alpine { --ag-font-size: ${cssSize} !important; }
    .ag-theme-alpine .ag-header-cell-text,
    .ag-theme-alpine .ag-cell { font-size: ${cssSize} !important; }
  `;
  document.head.appendChild(styleEl);

  // 5. Save to localStorage
  localStorage.setItem('v5_grid_appearance', JSON.stringify({ theme, font, size }));
};

// Load on page init
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    // SAFEGUARD: Only run if elements exist (prevent cross-page errors)
    const themeDropdown = document.getElementById('v5-theme-dropdown');
    if (!themeDropdown) return;

    const saved = JSON.parse(localStorage.getItem('v5_grid_appearance') || '{}');
    if (saved.theme) themeDropdown.value = saved.theme;
    if (saved.font) {
      const fontDropdown = document.getElementById('v5-font-dropdown');
      if (fontDropdown) fontDropdown.value = saved.font;
    }
    if (saved.size) {
      const sizeDropdown = document.getElementById('v5-size-dropdown');
      if (sizeDropdown) sizeDropdown.value = saved.size;
    }

    // Always apply appearance to ensure "Rainbow" default if no saved theme
    applyAppearance();
  }, 1000);
});


// FIX 4: Ref# input uppercase
document.addEventListener('DOMContentLoaded', () => {
  const refInput = document.getElementById('v5-ref-input');
  if (refInput) {
    refInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.toUpperCase();
    });
  }
});

// FIX 5: Dynamic statement badge
window.updateStatementBadge = function () {
  const badge = document.getElementById('v5-statement-badge');
  if (!badge) return;

  // Default to TBD if no data
  if (!V5State.gridData || V5State.gridData.length === 0) {
    badge.textContent = 'TBD';
    badge.style.background = '#6b7280';
    return;
  }

  const firstRef = V5State.gridData[0]?.refNumber || '';
  const prefix = V5State.refPrefix || '';
  const fullRef = prefix || firstRef.split('-')[0];

  if (fullRef.startsWith('CHQ')) {
    badge.textContent = 'CHECKING';
    badge.style.background = '#ef4444';
  } else if (fullRef.startsWith('CC')) {
    badge.textContent = 'CREDIT CARD';
    badge.style.background = '#8b5cf6';
  } else if (fullRef.startsWith('LOC')) {
    badge.textContent = 'LINE OF CREDIT';
    badge.style.background = '#f59e0b';
  } else {
    badge.textContent = 'BANK STATEMENT';
    badge.style.background = '#3b82f6';
  }
};

// FIX 6: Clean description - strip leading dates
function cleanV5Description(desc) { if (!desc) return ''; return desc.replace(/^\d{1,2}\s+\w{3,9}\s+/i, '').replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s+/, '').trim(); }

// AUTO-UPPERCASE REF# INPUT + BIDIRECTIONAL SYNC
document.addEventListener('DOMContentLoaded', () => {
  const refInput = document.getElementById('v5-ref-input');
  if (refInput) {
    // 1. Force Uppercase
    refInput.addEventListener('input', (e) => {
      const val = e.target.value.toUpperCase();
      e.target.value = val;

      // 2. Update V5State prefix
      if (window.V5State) {
        window.V5State.refPrefix = val;
        console.log(`🏷️ Ref# Sync: Prefix updated to ${val}`);
      }
    });
  }

  // 3. Ensure Header stays in Neutral State on Load (Strictly hidden)
  if (typeof updateBrandDisplay === 'function') {
    updateBrandDisplay(null);
  }
});

// ESC key to close bulk bar
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    const bulkBar = document.getElementById('v5-bulk-bar');
    if (bulkBar && bulkBar.style.display !== 'none') {
      bulkBar.style.display = 'none';
      if (V5State.gridApi) {
        V5State.gridApi.deselectAll();
      }
    }
  }
});

// ============================================
// BULK CATEGORIZATION (Phase 2)
// ============================================

window.bulkV5Categorize = function () {
  if (!V5State.gridApi) return;
  const selectedNodes = V5State.gridApi.getSelectedNodes();
  if (selectedNodes.length < 2) return;

  const groupedData = getGroupedCoA();
  const allAccounts = [];
  Object.values(groupedData).forEach(arr => allAccounts.push(...arr));

  const category = prompt(`Categorize ${selectedNodes.length} transactions to (enter account):`);
  if (category) {
    selectedNodes.forEach(node => {
      node.data.account = category;
    });
    V5State.gridApi.refreshCells({ force: true });
    // Toast removed
  }
};

// Handle Opening Balance Change
window.handleOpeningBalanceChange = function (input) {
  // Remove currency formatting
  let value = input.value.replace(/[$,]/g, '').trim();

  // Parse as float
  const numValue = parseFloat(value);

  if (isNaN(numValue)) {
    // Invalid input - reset to current value
    const currentBal = parseFloat(V5State.openingBalance) || 0;
    input.value = '$' + currentBal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return;
  }

  // Update state
  V5State.openingBalance = numValue;

  // Format input value
  input.value = '$' + numValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  // Recalculate all balances with new opening balance
  if (window.recalculateAllBalances) {
    window.recalculateAllBalances();
  }

  // Update reconciliation card
  if (window.updateReconciliationCard) {
    window.updateReconciliationCard();
  }

  console.log('✅ Opening balance updated to:', numValue);
};

console.log('✅ txn-import-v5.js loaded successfully!');

// =====================================================
// BANK/TAG DROPDOWN INTEGRATION WITH LEARNING
// =====================================================

let currentDetection = null;

/**
 * Update brand/tag display - NEW VERSION with dropdowns
 * This is the global entry point for both old string calls and new object calls
 */
window.updateV5PageHeader = function (brand, type, detection = null) {
  // Overload 1: detection object passed as first argument
  if (typeof brand === 'object' && brand !== null && brand.brand) {
    updateBrandDisplay(brand);
  } else {
    // Overload 2: string arguments (legacy flow)
    updateBrandDisplay({
      brand: brand,
      subType: type || 'Chequing',
      confidence: 1.0,
      source: 'auto'
    });
  }
};

// Main function to update dropdowns and confidence badge
function updateBrandDisplay(detection) {
  const bankSelect = document.getElementById('v5-bank-brand-select');
  const tagSelect = document.getElementById('v5-account-tag-select');
  const dash = document.getElementById('v5-bank-dash');
  const status = document.getElementById('v5-status-text');
  const infoLine = document.getElementById('v5-account-info-line');

  if (!bankSelect || !tagSelect || !status) {
    console.warn('[UI] Brand dropdown elements not found');
    return;
  }

  // Reset classes to ensure clean state
  bankSelect.classList.remove('v5-auto-detected', 'v5-manual-color');
  tagSelect.classList.remove('v5-auto-detected', 'v5-manual-color');
  if (dash) dash.classList.remove('v5-auto-detected', 'v5-manual-color');

  if (!detection || !detection.brand) {
    // Neutral State: ABSOLUTELY HIDE everything except "Waiting" status
    bankSelect.style.display = 'none';
    tagSelect.style.display = 'none';
    if (dash) dash.style.display = 'none';

    status.innerHTML = 'WAITING TO GET STARTED<span class="v5-loading-dots"></span>';
    status.className = 'v5-status';
    status.style.display = 'inline-flex';

    if (infoLine) {
      infoLine.innerHTML = '';
      infoLine.style.display = 'none';
    }

    // Explicitly hide dropdowns and clear values to be safe
    bankSelect.value = '';
    tagSelect.value = '';

    return;
  }

  // Store detection globally
  currentDetection = detection;
  localStorage.setItem('v5_current_detection', JSON.stringify(detection));

  // Sync Ref# Prefix if detected
  if (detection.prefix && detection.prefix !== V5State.refPrefix) {
    V5State.refPrefix = detection.prefix;
    const refInput = document.getElementById('v5-ref-input');
    if (refInput) {
      refInput.value = detection.prefix;
      console.log(`🏷️ Persisted Ref# Sync: ${detection.prefix}`);
    }
  }

  // Set dropdown values
  bankSelect.value = detection.brand;
  tagSelect.value = detection.subType || detection.accountType || detection.tag;

  // Apply color class based on source
  if (detection.source === 'auto_detected' || detection.source === 'auto' || !detection.source) {
    bankSelect.classList.add('v5-auto-detected');
    tagSelect.classList.add('v5-auto-detected');
    if (dash) dash.classList.add('v5-auto-detected');
  } else {
    bankSelect.classList.add('v5-manual-color');
    tagSelect.classList.add('v5-manual-color');
    if (dash) dash.classList.add('v5-manual-color');
  }

  // Show EVERYTHING inline
  bankSelect.style.display = 'inline-block';
  tagSelect.style.display = 'inline-block';
  if (dash) dash.style.display = 'inline-block';
  status.style.display = 'inline-flex';

  // Update confidence badge
  updateConfidenceBadge(detection.confidence || 0.7, detection.source);

  // Line 3: Account Info
  if (infoLine) {
    const parts = [];
    if (detection.accountNumber) parts.push(`ACCOUNT#: <b>${detection.accountNumber}</b>`);
    if (detection.transit) parts.push(`TRANSIT#: <b>${detection.transit}</b>`);
    if (detection.institutionCode) parts.push(`INST#: <b>${detection.institutionCode}</b>`);

    if (parts.length > 0) {
      infoLine.innerHTML = parts.join(' • ');
      infoLine.style.display = 'flex';
    } else {
      infoLine.style.display = 'none';
    }
  }

}

/**
 * RESTORER: Loads last detection from localStorage on boot
 */
window.restoreV5HeaderState = function () {
  // Prevent flickering if we are in the middle of processing new files
  if (V5State.isProcessing) return;

  try {
    const saved = localStorage.getItem('v5_current_detection');
    if (saved) {
      const detection = JSON.parse(saved);
      // Only restore if it looks like a real detection and we have data in the grid
      if (detection && detection.brand && V5State.gridData.length > 0) {
        console.log('♻️ Restoring Header State:', detection.brand);
        updateV5PageHeader(detection);
      } else {
        // Fallback to neutral state if no data or invalid detection
        console.log('♻️ No active grid data - Enforcing neutral header state');
        updateBrandDisplay(null);
      }
    } else {
      updateBrandDisplay(null);
    }
  } catch (e) {
    console.error('❌ Failed to restore header state:', e);
    updateBrandDisplay(null);
  }
};


/**
 * Update confidence badge text and color
 */
function updateConfidenceBadge(confidence, source) {
  const status = document.getElementById('v5-status-text');
  if (!status) return;

  // Remove any existing confidence classes
  status.className = 'v5-status';

  if (source === 'user_learned') {
    status.innerHTML = '🎓 LEARNED';
    status.classList.add('confidence-learned');
  } else if (source === 'user_override' || source === 'manual') {
    status.innerHTML = '✓ MANUAL';
    status.classList.add('confidence-learned'); // Reuse purple for manual/learned
    status.style.color = '#8b5cf6';
  } else if (confidence >= 0.95) {
    status.innerHTML = '✓ AUTO-DETECTED';
    status.classList.add('confidence-high');
  } else if (confidence >= 0.70) {
    status.innerHTML = '⚠ VERIFY';
    status.classList.add('confidence-medium');
  } else {
    status.innerHTML = '❌ SELECT';
    status.classList.add('confidence-low');
  }
}

/**
 * Handle bank/tag dropdown changes
 */
async function onBankTagChange() {
  const bankSelect = document.getElementById('v5-bank-brand-select');
  const tagSelect = document.getElementById('v5-account-tag-select');

  if (!bankSelect || !tagSelect) return;

  const bank = bankSelect.value;
  const tag = tagSelect.value;

  if (!bank || !tag) return;

  console.log('[UI] User changed bank/tag to:', bank, '-', tag);

  // Update currentDetection object and persistence
  if (currentDetection) {
    currentDetection.brand = bank;
    currentDetection.subType = tag;
    currentDetection.source = 'user_override';
    currentDetection.confidence = 1.0;

    // Remove gradient and apply manual color on change
    bankSelect.classList.remove('v5-auto-detected');
    tagSelect.classList.remove('v5-auto-detected');
    bankSelect.classList.add('v5-manual-color');
    tagSelect.classList.add('v5-manual-color');

    const dash = document.getElementById('v5-bank-dash');
    if (dash) {
      dash.classList.remove('v5-auto-detected');
      dash.classList.add('v5-manual-color');
    }

    // Sync Ref# Prefix from signatures if bank changed
    if (window.brandDetector && window.brandDetector.bankSignatures[bank]) {
      const sig = window.brandDetector.bankSignatures[bank];
      if (sig.prefix) {
        currentDetection.prefix = sig.prefix;
        if (window.updateRefPrefix) window.updateRefPrefix(sig.prefix);
        const refInput = document.getElementById('v5-ref-input');
        if (refInput) refInput.value = sig.prefix;
      }
    }

    localStorage.setItem('v5_current_detection', JSON.stringify(currentDetection));
  }

  // Learn this association
  if (window.bankLearningService && currentDetection?.fingerprint) {
    window.bankLearningService.learn(currentDetection.fingerprint, {
      brand: bank,
      accountType: tag,
      parserName: `${bank}${tag}`
    });
    console.log('[LEARNING] Saved user choice');
  }

  // Update confidence badge
  updateConfidenceBadge(1.0, 'user_override');
}

// ========================================
// GLASSMORPHISM INLINE BULK ACTIONS (STATE MACHINE)
// ========================================

/** State machine for bulk actions */
const BulkState = {
  current: 'initial', // 'initial', 'categorize', 'rename', 'confirm'
  pendingAction: null, // Function to call when confirmed
  pendingMessage: '', // Confirmation message
};

/** Reset to initial state (show 3 buttons) */
function resetToInitialState() {
  console.log('🔵 [BULK] resetToInitialState()');
  BulkState.current = 'initial';
  BulkState.pendingAction = null;

  document.getElementById('bulk-state-initial').style.display = 'flex';
  document.getElementById('bulk-state-categorize').style.display = 'none';
  document.getElementById('bulk-state-rename').style.display = 'none';
  document.getElementById('bulk-state-confirm').style.display = 'none';
}

/** Enter Categorize Mode */
window.enterCategorizeMode = function () {
  console.log('🔵 [BULK] enterCategorizeMode()');
  BulkState.current = 'categorize';

  // Hide other states
  document.getElementById('bulk-state-initial').style.display = 'none';
  document.getElementById('bulk-state-rename').style.display = 'none';
  document.getElementById('bulk-state-confirm').style.display = 'none';

  // Show categorize state
  document.getElementById('bulk-state-categorize').style.display = 'flex';

  // Populate COA dropdown
  populateGlassCOA();
};

/** Enter Rename Mode */
window.enterRenameMode = function () {
  console.log('🔵 [BULK] enterRenameMode()');
  BulkState.current = 'rename';

  // Hide other states
  document.getElementById('bulk-state-initial').style.display = 'none';
  document.getElementById('bulk-state-categorize').style.display = 'none';
  document.getElementById('bulk-state-confirm').style.display = 'none';

  // Show rename state
  document.getElementById('bulk-state-rename').style.display = 'flex';

  // Populate autocomplete for Find input with existing description values
  populateFindAutocomplete();

  // Focus Find input
  setTimeout(() => {
    const findInput = document.getElementById('bulk-find-input');
    if (findInput) {
      findInput.focus();
      console.log('  ✓ Focused find input');
    }
  }, 100);
};

/** Enter Confirmation Mode */
function enterConfirmMode(message, action) {
  console.log('🔵 [BULK] enterConfirmMode()');
  BulkState.current = 'confirm';
  BulkState.pendingAction = action;
  BulkState.pendingMessage = message;

  // Hide other states
  document.getElementById('bulk-state-initial').style.display = 'none';
  document.getElementById('bulk-state-categorize').style.display = 'none';
  document.getElementById('bulk-state-rename').style.display = 'none';

  // Show confirm state
  const confirmState = document.getElementById('bulk-state-confirm');
  if (confirmState) {
    confirmState.style.display = 'flex';
    const confirmMessageElement = document.getElementById('bulk-confirm-message');
    if (confirmMessageElement) {
      confirmMessageElement.innerHTML = message;
    }
  }
}

/** Execute pending action from confirmation */
window.confirmBulkAction = function () {
  console.log('🔵 [BULK] confirmBulkAction() - YES clicked');
  if (BulkState.pendingAction) {
    BulkState.pendingAction();
    BulkState.pendingAction = null;
  } else {
    console.warn('  ⚠️ No pending action');
  }
};

/** Cancel confirmation and return to appropriate state */
window.cancelConfirmation = function () {
  console.log('🔵 [BULK] cancelConfirmation() - Cancel clicked');
  // Return to the previous state (categorize or rename)
  // For simplicity, just reset to initial
  resetToInitialState();
};

/** Populate autocomplete datalist with existing description values */
function populateFindAutocomplete() {
  console.log('🔵 [BULK] populateFindAutocomplete()');

  const datalist = document.getElementById('bulk-find-autocomplete');
  if (!datalist) {
    console.error('  ❌ bulk-find-autocomplete not found!');
    return;
  }

  // Get unique description values from grid data
  const descriptions = new Set();
  V5State.gridData.forEach(row => {
    if (row.description && row.description.trim()) {
      descriptions.add(row.description.trim());
    }
  });

  // Populate datalist
  let html = '';
  descriptions.forEach(desc => {
    html += `<option value="${desc}">`;
  });

  datalist.innerHTML = html;
  console.log(`  ✓ Populated autocomplete with ${descriptions.size} unique descriptions`);
}

/** Populate ALL COA accounts in dropdown (called when entering categorize mode) */
window.populateGlassCOA = function () {
  console.log('🔵 [GLASS] populateGlassCOA() called');

  const dropdown = document.getElementById('glass-coa-dropdown');
  if (!dropdown) {
    console.error('  ❌ glass-coa-dropdown not found!');
    return;
  }

  let coa = JSON.parse(localStorage.getItem('ab_chart_of_accounts') || '[]');
  console.log(`  📊 Loaded ${coa.length} COA entries from localStorage`);

  // FALLBACK: If no COA found, use default accounts
  if (coa.length === 0) {
    console.warn('  ⚠️ No COA in localStorage, using fallback accounts');
    coa = [
      { code: 1000, name: 'Cash and Cash Equivalents' },
      { code: 1100, name: 'Accounts Receivable' },
      { code: 1500, name: 'Inventory' },
      { code: 2000, name: 'Accounts Payable' },
      { code: 2100, name: 'Credit Card Payable' },
      { code: 3000, name: 'Owner\'s Equity' },
      { code: 4000, name: 'Sales Revenue' },
      { code: 4100, name: 'Service Revenue' },
      { code: 5000, name: 'Cost of Goods Sold' },
      { code: 5100, name: 'Rent Expense' },
      { code: 5110, name: 'Meals and Entertainment' },
      { code: 5120, name: 'Office Supplies' },
      { code: 5200, name: 'Utilities' },
      { code: 5300, name: 'Insurance' },
      { code: 5400, name: 'Professional Fees' },
      { code: 5500, name: 'Bank Charges' }
    ];
  }

  // Categorize ALL accounts
  const cats = {
    'ASSETS': coa.filter(a => a.code >= 1000 && a.code < 2000),
    'LIABILITIES': coa.filter(a => a.code >= 2000 && a.code < 3000),
    'EQUITY': coa.filter(a => a.code >= 3000 && a.code < 4000),
    'REVENUE': coa.filter(a => a.code >= 4000 && a.code < 5000),
    'EXPENSES': coa.filter(a => a.code >= 5000 && a.code < 10000)
  };

  console.log('  📂 Category breakdown:');
  Object.keys(cats).forEach(cat => {
    console.log(`    - ${cat}: ${cats[cat].length} accounts`);
  });

  // Build dropdown with ALL accounts
  let html = '<option value="">Choose account to categorize...</option>';
  let totalOptions = 0;

  Object.keys(cats).forEach(cat => {
    if (cats[cat].length > 0) {
      html += `<optgroup label="${cat}">`;
      cats[cat].forEach(a => {
        html += `<option value="${a.code}" data-full="${a.code} - ${a.name}">${a.code} - ${a.name}</option>`;
        totalOptions++;
      });
      html += '</optgroup>';
    }
  });

  dropdown.innerHTML = html;
  console.log(`  ✅ Populated dropdown with ${totalOptions} total accounts`);
};

/** Cancel bulk selection */
window.cancelBulk = function () {
  console.log('🔵 [BULK] cancelBulk() called');

  if (V5State.gridApi) {
    V5State.gridApi.deselectAll();
    console.log('  ✓ Deselected all rows');
  }

  // Reset to initial state
  resetToInitialState();

  // Hide bulk bar
  const bulkBar = document.getElementById('v5-bulk-bar');
  if (bulkBar) {
    bulkBar.style.display = 'none';
    console.log('  ✓ Hidden bulk bar');
  }

  // Reset dropdown
  const dropdown = document.getElementById('glass-coa-dropdown');
  if (dropdown) dropdown.value = '';

  // Clear rename inputs
  const findInput = document.getElementById('bulk-find-input');
  const replaceInput = document.getElementById('bulk-replace-input');
  if (findInput) findInput.value = '';
  if (replaceInput) replaceInput.value = '';
};

/** Apply bulk categorize from dropdown selection */
window.applyBulkCategorize = function () {
  console.log('🔵 [BULK] applyBulkCategorize() called');

  const dropdown = document.getElementById('glass-coa-dropdown');
  const selectedCode = dropdown?.value;

  if (!selectedCode) {
    alert('Please select an account from the dropdown first.');
    console.warn('  ⚠️ No account selected');
    return;
  }

  const selectedOption = dropdown.options[dropdown.selectedIndex];
  const fullAccountName = selectedOption.getAttribute('data-full') || selectedOption.text;

  console.log(`  📁 Selected account: ${fullAccountName}`);

  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  console.log(`  📋 Applying to ${selectedRows.length} selected rows`);

  if (selectedRows.length === 0) {
    alert('No rows selected.');
    console.warn('  ⚠️ No rows to apply to');
    return;
  }

  // Show inline confirmation
  enterConfirmMode(
    `Apply "${fullAccountName}" to ${selectedRows.length} transaction(s)?`,
    () => executeBulkCategorize(fullAccountName, selectedRows)
  );
};

/** Execute bulk categorize after confirmation */
function executeBulkCategorize(fullAccountName, selectedRows) {
  console.log(`  📁 Executing categorize: ${fullAccountName}`);

  // Apply to all selected rows
  selectedRows.forEach((row, idx) => {
    row.account = fullAccountName;
    row.category = fullAccountName.split(' - ')[1] || fullAccountName;
    console.log(`    [${idx + 1}/${selectedRows.length}] Updated row ${row.id}: ${fullAccountName}`);
  });

  // Refresh grid
  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  V5State.gridApi.deselectAll();
  V5State.gridApi.refreshCells({ force: true }); // Added refreshCells
  console.log('  ✓ Grid refreshed, selections cleared');

  // Save
  saveData();
  console.log('  💾 Data saved');

  // Hide bar
  const bulkBar = document.getElementById('v5-bulk-bar');
  if (bulkBar) bulkBar.style.display = 'none';

  // Reset state
  resetToInitialState();
  const dropdown = document.getElementById('glass-coa-dropdown'); // Re-declare dropdown for scope
  if (dropdown) dropdown.value = '';

  console.log(`✅ [BULK] Successfully applied ${fullAccountName} to ${selectedRows.length} transactions`);
};

/** Apply bulk rename (find/replace with autocomplete) */
window.applyBulkRename = function () {
  console.log('🔵 [BULK] applyBulkRename() called');

  const findInput = document.getElementById('bulk-find-input');
  const replaceInput = document.getElementById('bulk-replace-input');

  const findText = findInput?.value || '';
  const replaceText = replaceInput?.value || '';

  if (!replaceText) {
    alert('Please enter replacement text.');
    console.warn('  ⚠️ Replace text is empty');
    return;
  }

  console.log(`  🔍 Find: "${findText}" (blank = rename all)`);
  console.log(`  ✏️ Replace: "${replaceText}"`);

  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  console.log(`  📋 Applying to ${selectedRows.length} selected rows`);

  if (selectedRows.length === 0) {
    alert('No rows selected.');
    console.warn('  ⚠️ No rows to apply to');
    return;
  }

  // Show inline confirmation
  const confirmMsg = findText.trim() === ''
    ? `Replace ALL ${selectedRows.length} descriptions with "${replaceText}"?`
    : `Find & replace "${findText}" in ${selectedRows.length} transaction(s)?`;

  enterConfirmMode(confirmMsg, () => executeBulkRename(findText, replaceText, selectedRows));
};

/** Execute bulk rename after confirmation */
function executeBulkRename(findText, replaceText, selectedRows) {
  console.log(`  ✏️ Executing rename: "${findText}" → "${replaceText}"`);

  let updatedCount = 0;

  if (findText.trim() === '') {
    // If find is blank, replace ALL descriptions
    console.log('  📝 Find is blank - replacing ALL descriptions');
    selectedRows.forEach((row, idx) => {
      const originalDesc = row.description || '';
      row.description = replaceText;
      updatedCount++;
      console.log(`    [${idx + 1}/${selectedRows.length}] Updated row ${row.id}: "${originalDesc}" → "${row.description}"`);
    });
  } else {
    // Standard find & replace
    selectedRows.forEach((row, idx) => {
      const originalDesc = row.description || '';
      if (originalDesc.includes(findText)) {
        row.description = originalDesc.replace(new RegExp(findText, 'g'), replaceText);
        updatedCount++;
        console.log(`    [${idx + 1}/${selectedRows.length}] Updated row ${row.id}: "${originalDesc}" → "${row.description}"`);
      } else {
        console.log(`    [${idx + 1}/${selectedRows.length}] No match in row ${row.id}`);
      }
    });
  }

  // Refresh grid
  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  V5State.gridApi.deselectAll();
  V5State.gridApi.refreshCells({ force: true }); // Added refreshCells
  console.log('  ✓ Grid refreshed, selections cleared');

  // Save
  saveData();
  console.log('  💾 Data saved');

  // Hide bar
  const bulkBar = document.getElementById('v5-bulk-bar');
  if (bulkBar) bulkBar.style.display = 'none';

  // Reset state
  resetToInitialState();
  const findInput = document.getElementById('bulk-find-input'); // Re-declare for scope
  const replaceInput = document.getElementById('bulk-replace-input'); // Re-declare for scope
  if (findInput) findInput.value = '';
  if (replaceInput) replaceInput.value = '';

  console.log(`✅ [BULK] Successfully updated ${updatedCount}/${selectedRows.length} descriptions`);
  alert(`Updated ${updatedCount} description(s).`);
};

/** Bulk delete selected rows */
window.bulkDeleteRows = function () {
  console.log('🔵 [BULK] bulkDeleteRows() called');

  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  console.log(`  📋 ${selectedRows.length} rows selected for deletion`);

  if (selectedRows.length === 0) {
    alert('No rows selected.');
    console.warn('  ⚠️ No rows to delete');
    return;
  }

  enterConfirmMode(
    `Are you sure you want to delete ${selectedRows.length} transaction(s)?`,
    () => executeBulkDelete(selectedRows)
  );
};

/** Execute bulk delete after confirmation */
function executeBulkDelete(selectedRows) {
  console.log('  🗑️ Executing bulk delete');

  // Get IDs of selected rows
  const idsToDelete = selectedRows.map(r => r.id);
  console.log(`  🗑️ Deleting IDs: ${idsToDelete.join(', ')}`);

  // Filter out deleted rows
  const beforeCount = V5State.gridData.length;
  V5State.gridData = V5State.gridData.filter(r => !idsToDelete.includes(r.id));
  const afterCount = V5State.gridData.length;
  const deletedCount = beforeCount - afterCount;

  // Refresh grid
  V5State.gridApi.setGridOption('rowData', V5State.gridData);
  V5State.gridApi.refreshCells({ force: true });
  console.log(`  ✓ Deleted ${deletedCount} rows, grid refreshed`);

  // Recalculate balances
  updateBalanceSummary();
  console.log('  ✓ Balances recalculated');

  // Save
  saveData();
  console.log('  💾 Data saved');

  // Hide bar
  const bulkBar = document.getElementById('v5-bulk-bar');
  if (bulkBar) bulkBar.style.display = 'none';

  // Reset state
  resetToInitialState();

  console.log(`✅ [BULK] Successfully deleted ${deletedCount} transactions`);
  alert(`Deleted ${deletedCount} transaction(s).`);
};


// Attach event listeners once DOM elements exist
function attachBrandDropdownListeners() {
  const bankSelect = document.getElementById('v5-bank-brand-select');
  const tagSelect = document.getElementById('v5-account-tag-select');

  if (bankSelect && tagSelect) {
    bankSelect.addEventListener('change', onBankTagChange);
    tagSelect.addEventListener('change', onBankTagChange);
    console.log('[UI] ✅ Bank/tag dropdown handlers attached');
  } else {
    // Retry after a short delay (DOM might not be ready)
    setTimeout(attachBrandDropdownListeners, 100);
  }
}

// Initialize listeners
attachBrandDropdownListeners();

// Expose globally for backward compatibility
// Note: updateBrandDisplay deprecated, use updateV5PageHeader instead

