/**
 * Txn Import V5 - Unified Transaction Import Page
 * VERSION 5.1.0 (Clean House Cleanup)
 * Consolidates all logic, fixes categorization wiring, and implements Audit Mode.
 */

// console.log('🚀 Loading Txn Import V5...');

// ============================================
// STATE MANAGEMENT
// ============================================

// Check if V5State already exists to preserve data during navigation
if (!window.V5State) {
  window.V5State = {
    activeAuditRowId: null, // Track currently audited row
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
    refPrefix: '', // For Ref# column (e.g., "CHQ" -> CHQ-001, CHQ-002...)
    pendingStatements: [], // [NEW] Free-float statements before assignment
    multiLedgerData: {},    // [NEW] Assigned ledger data by account code
    currentAccountCode: null, // [NEW] Track active ledger for breadcrumbs
    auditModeActiveRowId: null, // [NEW] Track which row has audit details expanded

    // [PHASE 2] Settings Panel Configuration
    settings: {
      appearance: {
        theme: 'light',
        fontSize: 14,
        rowDensity: 'comfortable' // compact | comfortable | spacious
      },
      columns: {
        visible: ['date', 'description', 'debit', 'credit', 'balance', 'account', 'refNumber'],
        salesTax: false, // GST ITC (2155) / GST Collected (2160)
        foreignBalance: false // Show foreign currency amounts with live rates
      },
      autoCategorize: {
        enabled: true,
        confidenceThreshold: 75,
        showScores: false,
        reviewBeforeApply: false
      },
      importPrefs: {
        defaultRefPrefix: 'REF', // Default, auto-updates to detected bank
        dateFormat: 'MM/DD/YYYY',
        province: 'ON', // Default to Ontario
        autoExpandRows: false
      },
      currency: {
        home: 'CAD',
        foreignPairs: ['USD', 'EUR', 'GBP', 'JPY', 'AUD'],
        rates: {}, // Populated from API
        lastUpdated: null,
        autoRefresh: true,
        refreshInterval: 3600000 // 1 hour in ms
      },
      performance: {
        rowsPerPage: 100,
        virtualization: true,
        autoSaveInterval: 60000 // 1 minute
      },
      exportFormat: 'xlsx',
      validation: {
        duplicateDetection: true,
        balanceAlerts: true,
        negativeWarnings: true
      },
      shortcuts: {
        refBox: true,
        autoCat: true,
        search: true,
        undo: false,
        history: false,
        startOver: false,
        popout: false
      },
      shortcutsOrder: ['refBox', 'undo', 'history', 'startOver', 'popout', 'autoCat', 'search']
    }
  };
}

const V5State = window.V5State;

const V5_MAX_UNDO_STEPS = 10;

const V5_BANK_LOGOS = {
  'TD': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="12" fill="#008a00"/><text x="50" y="65" font-family="Arial" font-weight="900" font-size="55" fill="white" text-anchor="middle">TD</text></svg>`,
  'RBC': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="12" fill="#005da4"/><path d="M30 30 L70 30 L70 40 L55 40 L55 50 L65 50 L65 60 L55 60 L55 80 L30 80 Z" fill="#ffd200"/></svg>`,
  'BMO': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" fill="#0035ad"/><text x="50" y="68" font-family="Arial" font-weight="900" font-size="50" fill="white" text-anchor="middle">M</text></svg>`,
  'CIBC': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="12" fill="#93001e"/><path d="M25 30 L75 30 L75 45 L45 45 L45 55 L75 55 L75 70 L25 70 Z" fill="white"/></svg>`,
  'Scotiabank': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="48" fill="#ee1c25"/><path d="M50 20 L80 50 L50 80 L20 50 Z" fill="white"/></svg>`,
  'Tangerine': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="12" fill="#ff671b"/><path d="M30 30 Q50 20 70 30 L70 70 Q50 80 30 70 Z" fill="white"/></svg>`,
  'Amex': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="4" fill="#006fcf"/><text x="50" y="65" font-family="Arial" font-weight="900" font-size="35" fill="white" text-anchor="middle">AMEX</text></svg>`,
  'HSBC': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="12" fill="#db0011"/><path d="M20 50 L50 20 L80 50 L50 80 Z" fill="white"/></svg>`,
  'ATB': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="12" fill="#00a3e0"/><text x="50" y="65" font-family="Arial" font-weight="900" font-size="35" fill="white" text-anchor="middle">ATB</text></svg>`,
  'default': `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><rect width="100" height="100" rx="12" fill="#64748b"/><path d="M30 70 L50 30 L70 70 Z" fill="white"/></svg>`
};

const V5_CANADIAN_TAX_RATES = {
  'AB': { total: 0.05, label: 'Alberta (5% GST)' },
  'BC': { total: 0.12, label: 'British Columbia (5% GST + 7% PST)' },
  'MB': { total: 0.12, label: 'Manitoba (5% GST + 7% PST)' },
  'NB': { total: 0.15, label: 'New Brunswick (15% HST)' },
  'NL': { total: 0.15, label: 'Newfoundland and Labrador (15% HST)' },
  'NS': { total: 0.15, label: 'Nova Scotia (15% HST)' },
  'ON': { total: 0.13, label: 'Ontario (13% HST)' },
  'PE': { total: 0.15, label: 'Prince Edward Island (15% HST)' },
  'QC': { total: 0.14975, label: 'Quebec (5% GST + 9.975% QST)' },
  'SK': { total: 0.11, label: 'Saskatchewan (5% GST + 6% PST)' },
  'NT': { total: 0.05, label: 'Northwest Territories (5% GST)' },
  'NU': { total: 0.05, label: 'Nunavut (5% GST)' },
  'YT': { total: 0.05, label: 'Yukon (5% GST)' }
};

const bankLogos = {
  'TD': 'https://upload.wikimedia.org/wikipedia/commons/a/a4/TD_logo.svg',
  'TD Canada Trust': 'https://upload.wikimedia.org/wikipedia/commons/a/a4/TD_logo.svg',
  'RBC': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/RBC_Royal_Bank_logo.svg',
  'Royal Bank of Canada': 'https://upload.wikimedia.org/wikipedia/commons/b/b8/RBC_Royal_Bank_logo.svg',
  'BMO': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Bank_of_Montreal_logo.svg',
  'Bank of Montreal': 'https://upload.wikimedia.org/wikipedia/commons/4/4e/Bank_of_Montreal_logo.svg',
  'CIBC': 'https://upload.wikimedia.org/wikipedia/commons/c/cc/CIBC_logo.svg',
  'CIBC Canada': 'https://upload.wikimedia.org/wikipedia/commons/c/cc/CIBC_logo.svg',
  'Scotiabank': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Scotiabank.svg',
  'Scotiabank of Canada': 'https://upload.wikimedia.org/wikipedia/commons/5/5f/Scotiabank.svg',
  'Tangerine': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Tangerine_Bank_logo.svg',
  'Tangerine Bank': 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Tangerine_Bank_logo.svg',
  'Amex': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
  'American Express Can': 'https://upload.wikimedia.org/wikipedia/commons/f/fa/American_Express_logo_%282018%29.svg',
  'default': 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/googlecloud/googlecloud-original.svg'
};

const popoverOptions = {
  bank: [
    { value: 'TD', label: 'TD Canada Trust' },
    { value: 'RBC', label: 'Royal Bank of Canada' },
    { value: 'BMO', label: 'Bank of Montreal' },
    { value: 'CIBC', label: 'CIBC Canada' },
    { value: 'Scotiabank', label: 'Scotiabank of Canada' },
    { value: 'Tangerine', label: 'Tangerine Bank' },
    { value: 'Amex', label: 'American Express Can' },
    { value: 'ATB', label: 'ATB Financial' },
    { value: 'HSBC', label: 'HSBC Bank Canada' }
  ],
  tag: [
    { value: 'Chequing', label: 'Chequing', icon: 'ph-money' },
    { value: 'Savings', label: 'Savings', icon: 'ph-bank' },
    { value: 'Visa', label: 'Visa', icon: 'ph-credit-card' },
    { value: 'Mastercard', label: 'Mastercard', icon: 'ph-credit-card' },
    { value: 'Amex', label: 'Amex', icon: 'ph-credit-card' }
  ]
};

const V5_BASELINE_COA = [
  { code: 1000, name: 'General Operating Bank Account', type: 'Bank' },
  { code: 1010, name: 'Savings Account', type: 'Bank' },
  { code: 2100, name: 'Visa Credit Card', type: 'Liability' },
  { code: 2110, name: 'Mastercard Credit Card', type: 'Liability' },
  { code: 5000, name: 'General Office Expense', type: 'Expense' }
];

// ============================================
// DATA IDENTITY (Blockchain-style signatures)
// ============================================

/**
 * Generates a unique "block signature" for a transaction.
 * Ensures perfect deduplication (Idempotency).
 */
function generateTransactionSignature(tx) {
  const parts = [
    tx.Date || '',
    tx.Description || tx.Payee || '',
    (tx.Amount || 0).toFixed(2),
    tx._inst || '---',
    tx._transit || '-----',
    tx._acct || '-----'
  ];
  const raw = parts.join('|').toLowerCase().replace(/\s+/g, '');

  // Simple hash for identity
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(i);
    hash = hash & hash;
  }
  return 'txsig-' + Math.abs(hash).toString(36);
}

// ============================================
// COA HELPERS (5-Tier Compressed)
// ============================================

function get5TierCoAAccounts() {
  // Try multiple sources for accounts
  let accounts = [];

  // Source 1: window.storage (preferred)
  if (window.storage?.getAccountsSync) {
    accounts = window.storage.getAccountsSync();
  }

  // Source 2: localStorage fallback
  if (accounts.length === 0) {
    accounts = JSON.parse(localStorage.getItem('ab3_accounts') || localStorage.getItem('ab_chart_of_accounts') || '[]');
  }

  // Baseline Injection if still empty
  if (accounts.length === 0) {
    console.log('💡 Storage empty, injecting baseline COA...');
    accounts = V5_BASELINE_COA;
  }

  if (accounts.length === 0) {
    console.warn('⚠️ No COA accounts found! Account dropdown will be empty.');
  }

  // Group into 5 tiers (ROBUST MATCHING)
  const tiers = {
    ASSETS: [],
    LIABILITIES: [],
    EQUITY: [],
    REVENUE: [],
    EXPENSES: []
  };

  accounts.forEach(acc => {
    // Robust property access
    const codeStr = acc.code || acc.account_number || acc.accountNumber || '';
    const code = parseInt(codeStr);
    const name = acc.name || acc.account_name || '';
    const type = acc.type || acc.account_type || '';

    // Normalize for internal use
    const normalized = {
      code: codeStr,
      name: name,
      type: type
    };

    if (code >= 1000 && code < 2000) tiers.ASSETS.push(normalized);
    else if (code >= 2000 && code < 3000) tiers.LIABILITIES.push(normalized);
    else if (code >= 3000 && code < 4000) tiers.EQUITY.push(normalized);
    else if (code >= 4000 && code < 5000) tiers.REVENUE.push(normalized);
    else if (code >= 5000 && code < 10000) tiers.EXPENSES.push(normalized);
  });

  return tiers;
}

/**
 * [RESCUED] GroupedAccountEditor Class
 * Required for AG Grid category selection
 */
class V5GroupedAccountEditor {
  init(params) {
    this.params = params;
    this.value = params.value || 'Uncategorized';

    // Main Container
    this.container = document.createElement('div');
    this.container.className = 'custom-coa-menu';
    // FIX: Added background, border, shadow for visibility
    this.container.style.cssText = 'width: 380px; max-height: 500px; position: relative; display: flex; flex-direction: column; overflow: hidden; background-color: #ffffff; border: 1px solid #d1d5db; border-radius: 8px; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04); font-family: "Inter", sans-serif;';

    console.log('[V5GroupedAccountEditor] Initialized');

    // 1. Search Box
    const searchWrapper = document.createElement('div');
    searchWrapper.className = 'coa-search-box-wrapper';
    this.searchInput = document.createElement('input');
    this.searchInput.className = 'coa-search-input';
    this.searchInput.placeholder = 'Search accounts...';
    searchWrapper.appendChild(this.searchInput);
    this.container.appendChild(searchWrapper);

    // 2. List Container (Scrollable)
    this.listContainer = document.createElement('div');
    this.listContainer.className = 'coa-list-scroll';
    this.container.appendChild(this.listContainer);

    // Initial Populate
    this.renderList();

    // Search Logic
    this.searchInput.addEventListener('input', (e) => {
      this.renderList(e.target.value);
    });

    // Handle Keyboard
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const firstItem = this.listContainer.querySelector('.coa-item');
        if (firstItem) firstItem.click();
      }
    });

    // Auto-focus search after a tiny delay for ag-grid lifecycle
    setTimeout(() => this.searchInput.focus(), 100);
  }

  renderList(filterText = '') {
    this.listContainer.innerHTML = '';
    const lowerFilter = filterText.toLowerCase();
    const cats = window.get5TierCoAAccounts ? window.get5TierCoAAccounts() : {};
    const usedCodes = window.V5State ? Object.keys(window.V5State.multiLedgerData || {}) : [];
    const coaSource = JSON.parse(localStorage.getItem('ab3_accounts') || localStorage.getItem('ab_chart_of_accounts') || '[]');

    let html = '';

    // A. ACTIVE LEDGERS (Prioritized)
    const filteredUsed = usedCodes.filter(code => {
      const acct = coaSource.find(a => (a.code || a.account_number) == code);
      const name = acct ? acct.name : code;
      return `${code} ${name}`.toLowerCase().includes(lowerFilter);
    });

    if (filteredUsed.length > 0) {
      html += `<div class="coa-group-header expanded" style="background:#ecfdf5; color:#059669; font-size:11px;">
                <i class="ph ph-lightning-fill"></i> ACTIVE LEDGERS
               </div>
               <div class="coa-group-items expanded">`;
      filteredUsed.forEach(code => {
        const acct = coaSource.find(a => (a.code || a.account_number) == code);
        const name = acct ? acct.name : code;
        const label = `${code} - ${name}`;
        html += `<div class="coa-item" onclick="this.parentElement.dataset.val='${label}'; this.dispatchEvent(new CustomEvent('select', {detail:'${label}'}))">
                  ${label}
                 </div>`;
      });
      html += `</div>`;
    }

    // B. CATEGORIZED GROUPS
    const tierLabels = { ASSETS: 'Assets', LIABILITIES: 'Liabilities', EQUITY: 'Equity', REVENUE: 'Revenue', EXPENSES: 'Expenses' };
    Object.keys(cats).forEach(tierKey => {
      const items = cats[tierKey].filter(a => `${a.code} ${a.name}`.toLowerCase().includes(lowerFilter));
      if (items.length > 0) {
        html += `<div class="coa-group-header expanded">
                  <i class="ph ph-caret-right"></i> ${tierLabels[tierKey] || tierKey}
                 </div>
                 <div class="coa-group-items expanded">`;
        items.forEach(item => {
          const label = item.code ? `${item.code} - ${item.name}` : item.name;
          html += `<div class="coa-item" onclick="this.parentElement.dataset.val='${label}'; this.dispatchEvent(new CustomEvent('select', {detail:'${label}'}))">
                    ${label}
                   </div>`;
        });
        html += `</div>`;
      }
    });

    this.listContainer.innerHTML = html;

    // Attach click handlers manually to capture selection
    this.listContainer.querySelectorAll('.coa-item').forEach(el => {
      el.onclick = () => {
        this.value = el.innerText.trim();
        this.params.stopEditing();
      };
    });
  }

  getGui() { return this.container; }
  getValue() { return this.value; }
  isPopup() { return true; }
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


// Column Visibility Wiring
window.toggleV5Column = function (columnId, visible) {
  console.log('[Settings:Columns] Toggling column:', columnId, 'to', visible);

  if (!V5State.gridApi) return;

  V5State.gridApi.setColumnVisible(columnId, visible);

  // Keep state in sync
  const visibleCols = V5State.settings.columns.visible;
  if (visible && !visibleCols.includes(columnId)) {
    visibleCols.push(columnId);
  } else if (!visible) {
    V5State.settings.columns.visible = visibleCols.filter(c => c !== columnId);
  }
}

window.toggleV5SalesTax = function (enabled) {
  console.log('[Settings:Columns] Toggling Sales Tax Column:', enabled);
  V5State.settings.columns.salesTax = enabled;
  // TODO: Implement dynamic column addition for GST
  if (V5State.gridApi) {
    // For now just refresh, actual logic in Phase 3
    V5State.gridApi.refreshHeader();
  }
}

window.toggleV5ForeignBalance = function (enabled) {
  console.log('[Settings:Columns] Toggling Foreign Balance Column:', enabled);
  V5State.settings.columns.foreignBalance = enabled;
  if (V5State.gridApi) {
    V5State.gridApi.refreshHeader();
  }
}

// Auto-Cat Wiring
window.toggleV5AutoCat = function (enabled) {
  console.log('[Settings:AutoCat] Auto-categorization enabled:', enabled);
  V5State.settings.autoCategorize.enabled = enabled;
}

window.updateV5ConfidenceThreshold = function (val) {
  console.log('[Settings:AutoCat] Confidence threshold set to:', val + '%');
  V5State.settings.autoCategorize.confidenceThreshold = parseInt(val);
  const displayVal = document.getElementById('v5-confidence-value');
  if (displayVal) displayVal.textContent = val + '%';
}

// Utility to sync UI controls with V5State values
window.syncV5SettingsUI = function () {
  console.log('[Settings:Init] Syncing UI with current state');
  const s = V5State.settings;
  if (!s) return;

  // Appearance
  const themeEl = document.getElementById('v5-setting-theme');
  if (themeEl) themeEl.value = s.appearance.theme;

  const fontEl = document.getElementById('v5-setting-fontsize');
  if (fontEl) {
    fontEl.value = s.appearance.fontSize;
    const fontDisplay = document.getElementById('v5-fontsize-value');
    if (fontDisplay) fontDisplay.textContent = s.appearance.fontSize + 'px';
  }

  const densityEls = document.getElementsByName('row-density');
  densityEls.forEach(el => {
    if (el.value === s.appearance.rowDensity) el.checked = true;
  });

  // Columns
  const cols = s.columns?.visible || [];
  if (document.getElementById('col-date')) document.getElementById('col-date').checked = cols.includes('date');
  if (document.getElementById('col-description')) document.getElementById('col-description').checked = cols.includes('description');
  if (document.getElementById('col-debit')) document.getElementById('col-debit').checked = cols.includes('debit');
  if (document.getElementById('col-credit')) document.getElementById('col-credit').checked = cols.includes('credit');
  if (document.getElementById('col-balance')) document.getElementById('col-balance').checked = cols.includes('balance');
  if (document.getElementById('col-account')) document.getElementById('col-account').checked = cols.includes('account');
  if (document.getElementById('col-refnumber')) document.getElementById('col-refnumber').checked = cols.includes('refNumber');

  if (document.getElementById('col-salestax')) document.getElementById('col-salestax').checked = s.columns.salesTax;
  if (document.getElementById('col-foreign')) document.getElementById('col-foreign').checked = s.columns.foreignBalance;

  // Auto-Cat
  if (document.getElementById('v5-setting-autocat-enabled'))
    document.getElementById('v5-setting-autocat-enabled').checked = s.autoCategorize.enabled;

  const confEl = document.getElementById('v5-setting-confidence');
  if (confEl) {
    confEl.value = s.autoCategorize.confidenceThreshold;
    const confDisplay = document.getElementById('v5-confidence-value');
    if (confDisplay) confDisplay.textContent = s.autoCategorize.confidenceThreshold + '%';
  }

  if (document.getElementById('v5-setting-show-scores'))
    document.getElementById('v5-setting-show-scores').checked = s.autoCategorize.showScores;
  if (document.getElementById('v5-setting-review-before'))
    document.getElementById('v5-setting-review-before').checked = s.autoCategorize.reviewBeforeApply;

  // Preferences
  const refPrefix = (s.importPrefs?.defaultRefPrefix || 'REF');
  if (document.getElementById('v5-setting-refprefix'))
    document.getElementById('v5-setting-refprefix').value = refPrefix;

  // Also sync the toolbar input (Phase 5 request)
  if (document.getElementById('v5-ref-prefix'))
    document.getElementById('v5-ref-prefix').value = refPrefix;

  if (document.getElementById('v5-setting-dateformat'))
    document.getElementById('v5-setting-dateformat').value = (s.importPrefs?.dateFormat || 'MM/DD/YYYY');
  if (document.getElementById('v5-setting-province'))
    document.getElementById('v5-setting-province').value = (s.importPrefs?.province || 'ON');
  if (document.getElementById('v5-setting-autoexpand'))
    document.getElementById('v5-setting-autoexpand').checked = s.importPrefs?.autoExpandRows || false;

  // Advanced
  if (document.getElementById('v5-setting-rowsperpage'))
    document.getElementById('v5-setting-rowsperpage').value = s.performance.rowsPerPage;
  if (document.getElementById('v5-setting-virtualization'))
    document.getElementById('v5-setting-virtualization').checked = s.performance.virtualization;

  const autosaveEls = document.getElementsByName('autosave');
  autosaveEls.forEach(el => {
    if (parseInt(el.value) === s.performance.autoSaveInterval) el.checked = true;
  });

  if (document.getElementById('v5-setting-duplicates'))
    document.getElementById('v5-setting-duplicates').checked = s.validation.duplicateDetection;
  if (document.getElementById('v5-setting-balance-alerts'))
    document.getElementById('v5-setting-balance-alerts').checked = s.validation.balanceAlerts;
  if (document.getElementById('v5-setting-negative-warnings'))
    document.getElementById('v5-setting-negative-warnings').checked = s.validation.negativeWarnings;

  // [NEW] Shortcuts
  if (s.shortcuts) {
    Object.keys(s.shortcuts).forEach(key => {
      const el = document.getElementById(`v5-setting-shortcut-${key}`);
      if (el) el.checked = s.shortcuts[key];
    });
  }

  // Export Format
  if (document.getElementById('v5-setting-exportformat'))
    document.getElementById('v5-setting-exportformat').value = s.exportFormat || 'xlsx';
}

// Global Application logic
window.applyAllV5Settings = function () {
  console.log('[Settings:Apply] Applying all settings to live grid');
  const s = V5State.settings;
  if (!s || !V5State.gridApi) return;

  // 1. Theme
  window.applyV5Theme(s.appearance.theme);

  // 2. Font Size
  window.applyV5FontSize(s.appearance.fontSize);

  // 3. Row Density
  window.applyV5RowDensity(s.appearance.rowDensity);

  // 4. Column Visibility
  const allCols = ['checkbox', 'refNumber', 'date', 'description', 'debit', 'credit', 'balance', 'account', 'salesTax', 'foreignBalance'];
  allCols.forEach(c => {
    if (c === 'checkbox') return; // Always visible
    let visible = false;
    if (c === 'salesTax') visible = s.columns.salesTax;
    else if (c === 'foreignBalance') visible = s.columns.foreignBalance;
    else visible = s.columns.visible.includes(c);

    V5State.gridApi.setColumnVisible(c, visible);
  });

  // 5. Pagination
  V5State.gridApi.setGridOption('paginationPageSize', s.performance.rowsPerPage);

  // [NEW] 6. Shortcuts Ordered Rendering
  window.renderV5Shortcuts();

  console.log('[Settings:Apply] All settings applied');
}

// Handler function implementations
window.toggleV5ShowScores = val => { V5State.settings.autoCategorize.showScores = val; };
window.toggleV5ReviewBefore = val => { V5State.settings.autoCategorize.reviewBeforeApply = val; };
window.setV5DefaultRefPrefix = val => {
  window.updateRefPrefix(val);
};
window.setV5DateFormat = val => { V5State.settings.importPrefs.dateFormat = val; if (V5State.gridApi) V5State.gridApi.refreshCells({ columns: ['date'], force: true }); };
window.toggleV5AutoExpand = val => { V5State.settings.importPrefs.autoExpandRows = val; };
window.setV5RowsPerPage = val => {
  V5State.settings.performance.rowsPerPage = val;
  if (V5State.gridApi) V5State.gridApi.setGridOption('paginationPageSize', val);
};
window.toggleV5Virtualization = val => { V5State.settings.performance.virtualization = val; };
window.setV5AutoSaveInterval = val => { V5State.settings.performance.autoSaveInterval = val; };
window.toggleV5DuplicateDetection = val => { V5State.settings.validation.duplicateDetection = val; };
window.toggleV5BalanceAlerts = val => { V5State.settings.validation.balanceAlerts = val; };
window.toggleV5NegativeWarnings = val => { V5State.settings.validation.negativeWarnings = val; };
window.setV5Province = val => {
  V5State.settings.importPrefs.province = val;
  if (V5State.gridApi) {
    V5State.gridApi.refreshCells({ columns: ['salesTax'], force: true });
  }
};
window.toggleV5CurrencyPair = (code, val) => {
  const pairs = V5State.settings.currency.foreignPairs;
  if (val && !pairs.includes(code)) pairs.push(code);
  else if (!val) V5State.settings.currency.foreignPairs = pairs.filter(p => p !== code);
};

window.toggleV5Shortcut = (key, val) => {
  if (!V5State.settings.shortcuts) V5State.settings.shortcuts = {};
  V5State.settings.shortcuts[key] = val;

  // Re-render shortcuts to apply visibility and order
  window.renderV5Shortcuts();
};

window.renderV5Shortcuts = function () {
  const container = document.getElementById('v5-shortcuts-container');
  if (!container) return;

  const s = V5State.settings;
  const order = s.shortcutsOrder || ['refBox', 'undo', 'history', 'startOver', 'popout', 'autoCat', 'search'];
  const visibility = s.shortcuts || {};

  // Ensure the Action Bar itself is visible if we have data
  const actionBar = document.getElementById('v5-action-bar');
  if (actionBar && V5State.gridData && V5State.gridData.length > 0) {
    actionBar.style.display = 'flex';
    actionBar.classList.add('show-data');
    if (window.updateReconciliationCard) window.updateReconciliationCard();
  }

  // Clear container
  container.innerHTML = '';

  let activeCount = 0;
  const MAX_CAPACITY = 6; // "Comfortable" limit before warning

  order.forEach(key => {
    if (visibility[key]) {
      const template = document.getElementById(`v5-shortcut-${key}`);
      if (template) {
        const clone = template.cloneNode(true);
        // Remove ID from clone to prevent collisions
        clone.removeAttribute('id');

        // Ensure inputs maintain their values/handlers if cloned
        if (key === 'refBox') {
          const inp = clone.querySelector('input');
          const origInp = template.querySelector('input');
          if (inp && origInp) {
            inp.value = origInp.value || V5State.refPrefix || '';
            inp.oninput = origInp.oninput;
          }
        }
        if (key === 'search') {
          const inp = clone.querySelector('input');
          const origInp = template.querySelector('input');
          if (inp && origInp) {
            inp.value = origInp.value;
            inp.oninput = origInp.oninput;
          }
        }

        clone.style.display = (['search', 'refBox'].includes(key)) ? 'flex' : 'inline-flex';
        container.appendChild(clone);
        activeCount++;
      }
    }
  });

  // Overflow Check
  const warning = document.getElementById('v5-shortcut-warning');
  if (warning) {
    warning.style.display = activeCount > MAX_CAPACITY ? 'flex' : 'none';
  }
};

// Drag and Drop Handlers
let draggedShortcutKey = null;

window.handleV5ShortcutDragStart = function (e) {
  const id = e.currentTarget.id;
  draggedShortcutKey = id.replace('v5-shortcut-', '');
  e.dataTransfer.effectAllowed = 'move';
  e.currentTarget.style.opacity = '0.5';
};

window.handleV5ShortcutDragOver = function (e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
};

window.handleV5ShortcutDrop = function (e) {
  e.preventDefault();
  const targetId = e.currentTarget.id;
  const targetKey = targetId.replace('v5-shortcut-', '');
  e.currentTarget.style.opacity = '1';

  if (draggedShortcutKey && draggedShortcutKey !== targetKey) {
    const order = V5State.settings.shortcutsOrder;
    const fromIndex = order.indexOf(draggedShortcutKey);
    const toIndex = order.indexOf(targetKey);

    if (fromIndex !== -1 && toIndex !== -1) {
      // Reorder array
      order.splice(fromIndex, 1);
      order.splice(toIndex, 0, draggedShortcutKey);

      // Save and Render
      window.renderV5Shortcuts();
      if (window.saveV5SettingsSilently) window.saveV5SettingsSilently();
    }
  }
  draggedShortcutKey = null;
};

window.refreshV5ExchangeRates = async function () {
  console.log('[Settings:Currency] Fetching latest rates...');
  const label = document.getElementById('v5-rates-updated');
  if (label) label.textContent = 'Updating...';

  try {
    // Mock API call for now
    const mockRates = { 'USD': 0.74, 'EUR': 0.68, 'GBP': 0.58, 'JPY': 110.5, 'AUD': 1.12 };
    V5State.settings.currency.rates = mockRates;
    V5State.settings.currency.lastUpdated = new Date().toLocaleString();

    if (label) label.textContent = 'Last updated: ' + V5State.settings.currency.lastUpdated;
    if (V5State.gridApi) V5State.gridApi.refreshHeader();
    console.log('[Settings:Currency] Rates updated:', mockRates);
  } catch (e) {
    console.error('Rate update failed:', e);
    if (label) label.textContent = 'Error updating rates';
  }
};

window.resetV5SettingsToDefaults = function () {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) return;
  localStorage.removeItem('v5_settings_v4');
  location.reload();
};

window.saveV5Settings = function () {
  console.log('[Settings:Storage] Saving settings to localStorage');
  try {
    localStorage.setItem('v5_settings_v4', JSON.stringify(V5State.settings));
    if (window.showToast) window.showToast('Settings saved successfully', 'success');
    window.closeV5SettingsPanel();
    // Apply immediately to grid
    window.applyAllV5Settings();
  } catch (e) {
    console.error('[Settings:Storage] Save failed:', e);
  }
}

window.loadV5SettingsFromStorage = function () {
  console.log('[Settings:Storage] Loading settings');
  try {
    const saved = localStorage.getItem('v5_settings_v4');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults
      V5State.settings = Object.assign({}, V5State.settings, parsed);
      console.log('[Settings:Storage] Settings loaded');
      // Apply immediately
      if (V5State.gridApi) window.applyAllV5Settings();
    }
  } catch (e) {
    console.warn('[Settings:Storage] Load failed, using defaults');
  }
}

window.filterV5Grid = function (searchText) {
  if (!V5State.gridApi) return;

  V5State.gridApi.setQuickFilter(searchText);
}

window.filterV5ByRef = function (refText) {
  if (!V5State.gridApi) return;

  const filterModel = V5State.gridApi.getFilterModel() || {};
  if (refText) {
    // We use 'contains' for flexible matching (e.g. typing "005")
    filterModel.refNumber = { filterType: 'text', type: 'contains', filter: refText };
  } else {
    delete filterModel.refNumber;
  }

  V5State.gridApi.setFilterModel(filterModel);
}



// Settings panel - Open the Phase 2 slide-in panel
window.toggleV5Settings = function () {
  console.log('[Settings:Init] Opening settings panel');
  window.openV5SettingsPanel();
}

window.openV5SettingsPanel = function () {
  const panel = document.getElementById('v5-settings-panel');
  if (!panel) return;

  console.log('[Settings:Init] Displaying panel');
  panel.style.display = 'flex';
  // Small timeout to allow display change before triggering animation
  setTimeout(() => {
    panel.classList.add('active');
  }, 10);

  // Sync UI with current state
  window.syncV5SettingsUI();
}

window.closeV5SettingsPanel = function () {
  const panel = document.getElementById('v5-settings-panel');
  if (!panel) return;

  console.log('[Settings:Init] Closing panel');
  panel.classList.remove('active');
  // Wait for animation to finish before hiding
  setTimeout(() => {
    panel.style.display = 'none';
  }, 300);
}

window.switchV5SettingsTab = function (tabName, btn) {
  console.log('[Settings:Tab] Switching to tab:', tabName);

  // Update button active states (Sidebar or Tabs)
  const allBtns = document.querySelectorAll('.v5-nav-item, .v5-tab-btn');
  allBtns.forEach(b => b.classList.remove('active'));

  if (btn) {
    btn.classList.add('active');
  } else {
    // Fallback search
    allBtns.forEach(b => {
      const dataTab = b.getAttribute('data-tab') || (b.getAttribute('onclick')?.includes(tabName) ? tabName : null);
      if (dataTab === tabName) b.classList.add('active');
    });
  }

  // Update content
  document.querySelectorAll('.v5-settings-tab-content').forEach(content => {
    if (content.getAttribute('data-tab-content') === tabName) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });
}

// Appearance Wiring
window.applyV5Theme = function (theme) {
  console.log('[Settings:Appearance] Applying theme:', theme);
  V5State.settings.appearance.theme = theme;

  const gridContainer = document.getElementById('v5-grid-container');
  const container = document.querySelector('.txn-import-v5-container');
  if (!gridContainer || !container) return;

  // 1. Clear previous theme-related classes
  const classesToRemove = [
    'ag-theme-alpine', 'ag-theme-alpine-dark',
    'v5-theme-frosted', 'v5-theme-swiss', 'v5-theme-midnight',
    'theme-vanilla', 'theme-classic', 'theme-ledger-pad',
    'theme-postit', 'theme-spectrum', 'theme-vintage', 'theme-rainbow',
    'theme-subliminal', 'theme-subtle', 'theme-tracker', 'theme-webapp',
    'theme-social', 'theme-wave', 'theme-default'
  ];
  gridContainer.classList.remove(...classesToRemove);
  container.classList.remove('v5-layout-frosted', 'v5-layout-swiss', 'v5-layout-midnight');

  // 2. Map theme to AG Grid and Custom classes
  if (theme === 'dark') {
    gridContainer.classList.add('ag-theme-alpine-dark');
  } else if (['vanilla', 'classic', 'ledger-pad', 'postit', 'spectrum', 'vintage', 'rainbow', 'subliminal', 'subtle', 'tracker', 'webapp', 'social', 'wave', 'default'].includes(theme)) {
    gridContainer.classList.add('ag-theme-alpine');
    gridContainer.classList.add('theme-' + theme);
  } else if (theme === 'frosted') {
    gridContainer.classList.add('v5-theme-frosted');
    container.classList.add('v5-layout-frosted');
  } else if (theme === 'swiss') {
    gridContainer.classList.add('v5-theme-swiss');
    container.classList.add('v5-layout-swiss');
  } else if (theme === 'midnight') {
    gridContainer.classList.add('v5-theme-midnight');
    container.classList.add('v5-layout-midnight');
  } else {
    // Default light
    gridContainer.classList.add('ag-theme-alpine');
  }
}

window.applyV5FontSize = function (size) {
  console.log('[Settings:Appearance] Applying font size:', size + 'px');
  V5State.settings.appearance.fontSize = size;

  const displayVal = document.getElementById('v5-fontsize-value');
  if (displayVal) displayVal.textContent = size + 'px';

  const gridContainer = document.getElementById('v5-grid-container');
  if (gridContainer) {
    gridContainer.style.fontSize = size + 'px';
    // Tell AG Grid to recalculate row heights if needed
    if (V5State.gridApi) {
      V5State.gridApi.resetRowHeights();
    }
  }
}

window.applyV5RowDensity = function (density) {
  console.log('[Settings:Appearance] Applying row density:', density);
  V5State.settings.appearance.rowDensity = density;

  if (!V5State.gridApi) return;

  const rowHeights = {
    'compact': 30,
    'comfortable': 42,
    'spacious': 56
  };

  const height = rowHeights[density] || 42;
  V5State.gridApi.forEachNode(node => {
    node.setRowHeight(height);
  });
  V5State.gridApi.onRowHeightChanged();
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
      
      .v5-breadcrumb-logo {
        width: 18px;
        height: 18px;
        object-fit: contain;
        border-radius: 4px;
        flex-shrink: 0;
        margin-right: 2px;
        vertical-align: middle;
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

      /* NATURAL FLOW: PULSING WARNING & LINKAGE BANNER */
      @keyframes v5-pulse {
        0% { opacity: 0.6; transform: scale(0.98); }
        50% { opacity: 1; transform: scale(1.02); }
        100% { opacity: 0.6; transform: scale(0.98); }
      }
      .v5-pending-pulse {
        color: #f97316 !important;
        font-weight: 700 !important;
        animation: v5-pulse 2s infinite;
      }

      #v5-assignment-banner {
        display: none;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
        margin: 1.5rem 1.5rem 0.5rem 1.5rem;
        background: rgba(255, 255, 255, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(59, 130, 246, 0.2);
        border-radius: 12px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
        color: #1e293b;
        font-size: 0.875rem;
        gap: 1.5rem;
        z-index: 50;
        animation: slideInDown 0.3s ease-out;
      }
      @keyframes slideInDown {
        from { transform: translateY(-20px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }
      #v5-assignment-banner .banner-left { display: flex; align-items: center; gap: 0.75rem; }
      #v5-assignment-banner .banner-right { display: flex; align-items: center; gap: 1rem; }
      #v5-assignment-banner select {
        padding: 0.5rem 1rem;
        border: 1px solid #cbd5e1;
        border-radius: 8px;
        background: white;
        font-size: 0.8125rem;
        min-width: 250px;
        outline: none;
      }
      #v5-assignment-banner select:focus { border-color: #3b82f6; box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
      #btn-complete-assignment {
        background: #3b82f6;
        color: white;
        border: none;
        padding: 0.5rem 1.25rem;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }
      #btn-complete-assignment:hover { background: #2563eb; transform: translateY(-1px); }

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
      .ag-theme-alpine.theme-subliminal { 
        --ag-background-color: #111827;
        --ag-foreground-color: #e5e7eb;
        --ag-header-background-color: #0f172a !important;
        --ag-header-foreground-color: #38bdf8 !important;
        --ag-border-color: #374151;
      }
      .ag-theme-alpine.theme-subtle {
        --ag-background-color: #fcfcfc;
        --ag-foreground-color: #64748b;
        --ag-header-background-color: #f1f5f9 !important;
        --ag-header-foreground-color: #475569 !important;
        --ag-border-color: #e2e8f0;
      }
      .ag-theme-alpine.theme-tracker { 
        --ag-background-color: #f0fdf4;
        --ag-foreground-color: #14532d;
        --ag-header-background-color: #dcfce7 !important;
        --ag-header-foreground-color: #15803d !important;
        --ag-border-color: #86efac;
      }
      .ag-theme-alpine.theme-vanilla { 
        --ag-background-color: #fffef8;
        --ag-foreground-color: #333333;
        --ag-header-background-color: #f5f0e8 !important;
        --ag-header-foreground-color: #5a5a5a !important;
        --ag-border-color: #e0ddd5;
      }
      .ag-theme-alpine.theme-vintage { 
        --ag-background-color: #262626;
        --ag-foreground-color: #d4d4d4;
        --ag-header-background-color: #171717 !important;
        --ag-header-foreground-color: #f59e0b !important;
        --ag-border-color: #404040;
      }
      .ag-theme-alpine.theme-wave { 
        --ag-background-color: #f0f9ff;
        --ag-foreground-color: #0c4a6e;
        --ag-header-background-color: #e0f2fe !important;
        --ag-header-foreground-color: #0ea5e9 !important;
        --ag-border-color: #7dd3fc;
      }
      .ag-theme-alpine.theme-webapp {
        --ag-background-color: #ffffff;
        --ag-foreground-color: #1e293b;
        --ag-header-background-color: #2563eb !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-border-color: #cbd5e1;
        --ag-row-hover-color: #f1f5f9;
        --ag-header-height: 48px;
        --ag-header-column-separator-display: block;
      }

      /* --- NEW PHASE 2 PREMIUM THEMES --- */

      /* 1. Frosted Finance (Glassmorphism) */
      .v5-layout-frosted {
        background: radial-gradient(circle at top left, #1e40af, #7c3aed, #ec4899) !important;
        background-attachment: fixed !important;
      }
      .v5-theme-frosted {
        --ag-background-color: rgba(255, 255, 255, 0.1) !important;
        --ag-foreground-color: #ffffff !important;
        --ag-header-background-color: rgba(255, 255, 255, 0.2) !important;
        --ag-header-foreground-color: #ffffff !important;
        --ag-border-color: rgba(255, 255, 255, 0.2) !important;
        --ag-row-hover-color: rgba(255, 255, 255, 0.15) !important;
        border-radius: 25px !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        color: white !important;
      }
      .v5-theme-frosted .ag-header-cell-label { color: white !important; font-weight: 700 !important; }
      .v5-theme-frosted .ag-row { border-bottom: 1px solid rgba(255, 255, 255, 0.1) !important; }

      /* 2. Swiss Minimalist (Clean & Airy) */
      .v5-layout-swiss { background: #ffffff !important; font-family: 'Inter', sans-serif !important; }
      .v5-theme-swiss {
        --ag-background-color: #ffffff !important;
        --ag-foreground-color: #000000 !important;
        --ag-header-background-color: #ffffff !important;
        --ag-header-foreground-color: #000000 !important;
        --ag-border-color: #f3f4f6 !important;
        --ag-row-hover-color: #f9fafb !important;
        --ag-header-column-separator-display: none !important;
      }
      .v5-theme-swiss .ag-header { border-bottom: 2px solid #2563eb !important; }
      .v5-theme-swiss .ag-cell { font-weight: 400 !important; }

      /* 3. Midnight Executive (Exquisite Dark) */
      .v5-layout-midnight { background: #000000 !important; }
      .v5-theme-midnight {
        --ag-background-color: #0d0d0d !important;
        --ag-foreground-color: #e5e7eb !important;
        --ag-header-background-color: #1a1a1a !important;
        --ag-header-foreground-color: #d4af37 !important; /* Metallic Gold */
        --ag-border-color: #262626 !important;
        --ag-row-hover-color: #1f1f1f !important;
      }
      .v5-theme-midnight .ag-cell { font-family: 'Courier New', monospace !important; color: #a855f7 !important; } /* Neon Purple */
      .v5-theme-midnight .ag-header-cell-label { color: #d4af37 !important; text-transform: uppercase !important; letter-spacing: 1px !important; }
      .v5-theme-midnight .ag-row { border-left: 2px solid transparent; }
      .v5-theme-midnight .ag-row-hover { border-left: 2px solid #d4af37; }

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

      /* Hide old inventory tray */
      #v5-inventory-tray { display: none !important; }
      
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
      
      /* ========================================
         PHASE 6: STATEMENT INVENTORY TRAY
         ======================================== */
      .v5-inventory-tray {
        background: #f8fafc;
        border-bottom: 1px solid #e2e8f0;
        padding: 0.75rem 1.5rem;
        display: none; /* Hidden until files exist */
        flex-direction: column;
        gap: 0.75rem;
        animation: slideDown 0.3s ease-out;
      }
      
      .v5-inventory-tray.v5-active {
        display: flex;
      }
      
      .v5-inventory-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      
      .v5-inventory-title {
        font-size: 0.75rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }
      
      .v5-inventory-items {
        display: flex;
        gap: 0.75rem;
        overflow-x: auto;
        padding-bottom: 4px;
        scrollbar-width: thin;
      }
      
      .v5-inventory-card {
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 0.75rem;
        min-width: 240px;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        transition: all 0.2s;
        position: relative;
        box-shadow: 0 1px 2px rgba(0,0,0,0.05);
      }
      
      .v5-inventory-card:hover {
        border-color: #3b82f6;
        box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);
      }
      
      .v5-inventory-card.v5-duplicate {
        border-left: 4px solid #f97316;
      }
      
      .v5-card-top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
      }
      
      .v5-card-filename {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #1e293b;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 160px;
      }
      
      .v5-card-meta {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .v5-card-bank {
        font-size: 0.7rem;
        color: #64748b;
        display: flex;
        align-items: center;
        gap: 4px;
      }
      
      .v5-card-range {
        font-size: 0.65rem;
        color: #94a3b8;
        font-family: 'Public Sans', sans-serif;
      }
      
      .v5-card-actions {
        display: flex;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }
      
      .btn-inventory {
        padding: 4px 8px;
        font-size: 0.7rem;
        font-weight: 600;
        border-radius: 4px;
        cursor: pointer;
        transition: all 0.2s;
        border: 1px solid transparent;
      }
      
      .btn-inventory-assign {
        background: #3b82f6;
        color: white;
      }
      
      .btn-inventory-assign:hover {
        background: #2563eb;
      }
      
      .btn-inventory-delete {
        background: transparent;
        color: #ef4444;
        border-color: #fecaca;
      }
      
      .btn-inventory-delete:hover {
        background: #fef2f2;
      }
      
      .v5-duplicate-badge {
        background: #fff7ed;
        color: #f97316;
        border: 1px solid #ffedd5;
        padding: 2px 6px;
        border-radius: 9999px;
        font-size: 0.6rem;
        font-weight: 700;
      }

      /* Floating Details Button - REFINED */
      .v5-details-btn {
        position: absolute;
        right: 12px;
        top: 50%;
        transform: translateY(-50%);
        opacity: 0;
        visibility: hidden;
        background: #f1f5f9; /* Slate 100 */
        color: #64748b; /* Slate 500 */
        border: 1px solid #e2e8f0;
        padding: 3px 10px;
        border-radius: 9999px; /* Pill shape */
        font-size: 0.6rem;
        font-weight: 700;
        cursor: pointer;
        z-index: 10;
        transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        text-transform: uppercase;
        letter-spacing: 0.05em;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
      }
      .ag-cell:hover .v5-details-btn {
        opacity: 1;
        visibility: visible;
      }
      .v5-details-btn:hover {
        background: #1e293b;
        transform: translateY(-50%) scale(1.05);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      }
      .v5-details-btn:active {
        transform: translateY(-50%) scale(0.95);
      }
      
      @keyframes slideDown {
        from { transform: translateY(-10px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      @keyframes v5-pulse {
        0% { opacity: 1; }
        50% { opacity: 0.5; }
        100% { opacity: 1; }
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

      /* LEDGER SWITCHER - New Component */
      .v5-ledger-switcher-wrapper {
        display: flex;
        align-items: center;
        gap: 8px;
        background: white;
        border: 1.5px solid #e2e8f0;
        border-radius: 8px;
        padding: 0 10px;
        height: 36px;
        min-width: 200px;
        transition: all 0.2s;
      }
      .v5-ledger-switcher-wrapper:hover { border-color: #3b82f6; }
      .v5-ledger-switcher-wrapper label {
        font-size: 0.65rem;
        font-weight: 700;
        color: #64748b;
        text-transform: uppercase;
        white-space: nowrap;
      }
      .v5-ledger-select {
        border: none;
        background: transparent;
        font-size: 13px;
        font-weight: 600;
        color: #1e293b;
        width: 100%;
        cursor: pointer;
        padding: 4px 0;
      }
      .v5-ledger-select:focus { outline: none; }
      
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
        gap: 0.85rem;
        padding: 0.5rem 0.75rem;
        background: transparent;
        border-radius: 6px;
        flex-shrink: 0;
        margin-left: auto; /* Right-align */
      }
      
      .v5-balance-item {
        display: flex;
        flex-direction: column;
        gap: 0.15rem;
        min-width: 70px;
      }
      
      .v5-balance-label {
        font-size: 0.55rem;
        font-weight: 700;
        color: #6B7280;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      .v5-balance-value {
        font-size: 0.8rem;
        font-weight: 800;
        color: #1e293b;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
      }
      
      #v5-opening-bal {
        background: transparent;
        border: 1px dashed #cbd5e1;
        border-radius: 4px;
        padding: 1px 4px;
        width: 80px;
        color: #1e293b;
        text-align: right;
        cursor: pointer;
        transition: all 0.2s;
      }
      #v5-opening-bal:hover { border-color: #94a3b8; background: rgba(241, 245, 249, 0.5); }
      #v5-opening-bal:focus { border-color: #3b82f6; border-style: solid; outline: none; background: #fff; }

      .v5-balance-value.positive { color: #10b981; }
      .v5-balance-value.negative { color: #ef4444; }
      
      .v5-balance-item.ending {
        border-left: 1px solid #e2e8f0;
        padding-left: 1rem;
        margin-left: 0.5rem;
      }
      
      #v5-ending-bal {
        color: #2563eb;
        font-size: 0.95rem; /* Slightly larger for emphasis but still small */
      }
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
        height: 80px !important; /* Adjusted to be slightly more compact but fit content */
        min-height: 80px !important;
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
        font-size: 1.0rem;
        font-weight: 500;
        letter-spacing: -0.5px;
        color: #000000 !important; /* Robust Black */
      }
      
      .v5-subtitle {
        font-size: 0.76rem !important;
        margin: 2px 0 0 0 !important;
        font-weight: 500 !important;
        display: flex !important;
        align-items: center !important;
        gap: 0 !important;
        /* text-transform: uppercase !important; REMOVED per user request for sentence case */
        min-height: 1.35rem;
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

      /* --- Breadcrumb Popover UI --- */
      .v5-breadcrumb {
        display: flex;
        align-items: center;
        gap: 0;
        font-family: 'Inter', sans-serif;
      }
      
      .v5-breadcrumb-item {
        display: none; /* Hide until data is loaded */
        color: #003580;
        font-weight: 500;
        cursor: pointer;
        padding: 4px 9px;
        border-radius: 7px;
        transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        white-space: nowrap;
        align-items: center;
        gap: 7px;
        border: 1px solid transparent;
        font-size: 0.76rem; /* Increased by ~10% from 0.68rem */
      }
      
      .v5-breadcrumb-item:hover {
        background: rgba(255, 255, 255, 0.8);
        border-color: rgba(0, 53, 128, 0.1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        color: #2563eb;
      }

      .v5-breadcrumb-logo {
        width: 16px;
        height: 16px;
        object-fit: contain;
        border-radius: 4px;
        flex-shrink: 0;
      }
      
      .v5-breadcrumb-separator {
        display: none; /* Hide until data is loaded */
        color: #94a3b8;
        font-weight: 400;
        margin: 0 4px;
        user-select: none;
        font-size: 0.76rem;
      }
      
      .v5-breadcrumb-item.v5-auto-detected {
        color: #059669; /* Emerald for auto-detection */
      }
      
      .v5-breadcrumb-item.v5-auto-detected:hover {
        background: rgba(5, 150, 105, 0.05);
      }

      /* Popover Container */
      .v5-popover {
        position: fixed; /* Use fixed to match getBoundingClientRect exactly */
        z-index: 10000;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(20px) saturate(180%);
        -webkit-backdrop-filter: blur(20px) saturate(180%);
        border: 1px solid rgba(255, 255, 255, 0.6);
        border-radius: 12px;
        box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1);
        width: 240px;
        padding: 8px;
        display: none;
        flex-direction: column;
        animation: popoverFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        transform-origin: top left;
        transform: none !important; /* Prevent any unintended shifts */
      }
      
      @keyframes popoverFadeIn {
        from { opacity: 0; transform: scale(0.95) translateY(-10px); }
        to { opacity: 1; transform: scale(1) translateY(0); }
      }
      
      .v5-popover-search {
        padding: 8px 12px;
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        font-size: 0.85rem;
        margin-bottom: 8px;
        outline: none;
        background: rgba(255, 255, 255, 0.5);
      }
      
      .v5-popover-search:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }
      
      .v5-popover-list {
        max-height: 300px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      
      .v5-popover-option {
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.85rem;
        cursor: pointer;
        transition: background 0.1s;
        color: #1e293b;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .v5-popover-option:hover {
        background: rgba(59, 130, 246, 0.1);
        color: #2563eb;
      }
      
      .v5-popover-option.selected {
        background: #3b82f6;
        color: white;
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

      .v5-popover-option {
        padding: 10px 12px;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 12px;
        color: #1e293b;
        font-size: 0.9rem;
      }

      .v5-popover-logo {
        width: 20px;
        height: 20px;
        object-fit: contain;
        border-radius: 4px;
        flex-shrink: 0;
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

      /* Custom Collapsible COA Dropdown */
      .custom-coa-dropdown {
        position: relative;
        flex: 1;
        max-width: 400px;
      }

      .custom-coa-trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 14px;
        background: rgba(255, 255, 255, 0.9);
        backdrop-filter: blur(10px);
        border: 1.5px solid rgba(148, 163, 184, 0.3);
        border-radius: 10px;
        cursor: pointer;
        font-size: 0.875rem;
        color: #1e293b;
        transition: all 0.2s ease;
      }

      .custom-coa-trigger:hover {
        border-color: #a855f7;
        box-shadow: 0 0 0 3px rgba(168, 85, 247, 0.1);
      }

      .custom-coa-trigger i {
        font-size: 1rem;
        color: #64748b;
        transition: transform 0.2s ease;
      }

      .custom-coa-trigger.open i {
        transform: rotate(180deg);
      }

      .custom-coa-menu {
        position: absolute;
        top: calc(100% + 4px);
        left: 0;
        right: 0;
        max-height: 400px;
        overflow: hidden; /* Search box stays at top */
        display: flex;
        flex-direction: column;
        background: white;
        border: 1px solid #cbd5e1;
        border-radius: 10px;
        box-shadow: 0 10px 30px -5px rgba(0, 0, 0, 0.2);
        z-index: 1000;
      }

      .coa-search-box-wrapper {
        padding: 8px;
        border-bottom: 1px solid #e2e8f0;
        background: #f8fafc;
      }

      .coa-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        font-size: 0.85rem;
        outline: none;
        transition: border-color 0.2s;
      }

      .coa-search-input:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .coa-list-scroll {
        flex: 1;
        overflow-y: auto;
        max-height: 350px;
      }

      .coa-group {
        border-bottom: 1px solid #f1f5f9;
      }

      .coa-group:last-child {
        border-bottom: none;
      }

      .coa-group-header {
        display: flex;
        align-items: center;
        gap: 8px; /* Gap for the caret */
        padding: 8px 12px;
        background: #f8fafc;
        cursor: pointer;
        font-weight: 700;
        font-size: 0.75rem;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.025em;
        transition: all 0.2s ease;
        user-select: none;
        border-top: 1px solid #f1f5f9;
      }

      .coa-group-header:hover {
        background: #f1f5f9;
        color: #1e293b;
      }

      .coa-group-header i {
        font-size: 10px;
        color: #94a3b8;
        transition: transform 0.2s ease;
      }

      .coa-group-header.expanded i {
        transform: rotate(90deg); /* Sideways to Down or vice versa */
      }

      .coa-group-items {
        display: none;
        background: white;
      }

      .coa-group-items.expanded {
        display: block;
      }

      .coa-item {
        padding: 8px 16px 8px 32px; /* Indented from header */
        cursor: pointer;
        font-size: 0.85rem;
        color: #334155;
        transition: all 0.15s ease;
        border-left: 3px solid transparent;
      }

      .coa-item:hover {
        background: #f8f9fa;
        border-left-color: #a855f7;
        padding-left: 20px;
      }

      .coa-item.selected {
        background: #f3e8ff;
        border-left-color: #a855f7;
        font-weight: 600;
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
        display: inline-flex;
        align-items: center !important;
        font-size: 0.65rem !important;
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
        font-size: 0.6rem !important;
        color: #64748b !important;
        margin-top: 5px !important;
        text-transform: uppercase !important;
        letter-spacing: 0.9px !important;
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
            <h1 style="margin-bottom: 4px;">Transactions</h1>
            <div class="v5-breadcrumb" id="v5-header-breadcrumb">
              <div class="v5-breadcrumb-item" id="v5-breadcrumb-bank" onclick="showV5Popover('bank', event)">
                <i class="ph ph-bank"></i>
                <span class="v5-breadcrumb-label" data-value="">Select Bank</span>
              </div>
              <span class="v5-breadcrumb-separator">/</span>
              <div class="v5-breadcrumb-item" id="v5-breadcrumb-tag" onclick="showV5Popover('tag', event)">
                <i class="ph ph-tag"></i>
                <span class="v5-breadcrumb-label" data-value="">Select Account</span>
              </div>
              <span id="v5-status-text" class="v5-status" style="margin-left: 12px;">WAITING TO GET STARTED<span class="v5-loading-dots"></span></span>
            </div>
            <p id="v5-account-info-line" class="v5-account-info-line" style="margin-top: 4px; font-size: 0.75rem; color: #64748b; font-family: 'Inter', sans-serif;">
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
            <button class="btn-browse" onclick="console.log('[DEBUG] Browse button clicked'); event.stopPropagation(); document.getElementById('v5-file-input').click()">Browse files</button>
          </div>
          <input type="file" id="v5-file-input" multiple accept=".pdf,.csv" 
                 style="display: none;" onchange="handleV5FileSelect(event)">
        </div>
        
        <!-- Right: Action Icons -->
        <div class="v5-header-actions">
          <!-- Kebab menu removed - all options moved to Settings gear -->
        </div>
      </div>

      <!-- PHASE 6: STATEMENT INVENTORY TRAY -->
      <div class="v5-inventory-tray" id="v5-inventory-tray">
        <div class="v5-inventory-header">
          <div class="v5-inventory-title">
            <i class="ph ph-briefcase"></i>
            Statement Inventory
          </div>
          <div class="v5-inventory-stats" id="v5-inventory-stats" style="font-size: 0.7rem; color: #94a3b8;">
            0 statements pending
          </div>
        </div>
        <div class="v5-inventory-items" id="v5-inventory-items">
          <!-- Populated dynamically via renderV5Inventory() -->
          <div style="padding: 1rem; color: #94a3b8; font-size: 0.8rem; font-style: italic;">
            No statements uploaded yet...
          </div>
        </div>
      </div>
      
      <!-- Action Bar - Only shown when grid has data -->
      <div class="v5-action-bar v5-control-toolbar" id="v5-action-bar" style="display: none;">
        
        <!-- Draggable Shortcuts Container -->
        <div id="v5-shortcuts-container" style="display: flex; align-items: center; gap: 8px; flex-wrap: nowrap; overflow: hidden; max-width: 100%;">
          <!-- Shortcuts will be rendered here by window.renderV5Shortcuts() -->
        </div>

        <!-- Hidden Templates for Shortcuts -->
        <div style="display: none;">
          <!-- Far Left: Ref# Prefix Input -->
          <div class="v5-ref-input-wrapper" id="v5-shortcut-refBox" draggable="true" ondragstart="window.handleV5ShortcutDragStart(event)" ondragover="window.handleV5ShortcutDragOver(event)" ondrop="window.handleV5ShortcutDrop(event)" style="display: flex; align-items: center; gap: 8px; cursor: move;">
            <label style="font-size: 0.75rem; font-weight: 600; color: #6b7280; text-transform: uppercase;">Ref#</label>
            <input type="text" 
                   id="v5-ref-prefix" 
                   class="v5-ref-input" 
                   placeholder="REF" 
                   style="width: 80px; padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; height: 32px; font-weight: 600; text-align: center; font-family: 'Courier New', monospace; text-transform: uppercase;"
                   oninput="window.updateRefPrefix(this.value)">
          </div>

          <!-- New Primary Shortcuts -->
          <button class="btn-icon-secondary" id="v5-shortcut-undo" draggable="true" ondragstart="window.handleV5ShortcutDragStart(event)" ondragover="window.handleV5ShortcutDragOver(event)" ondrop="window.handleV5ShortcutDrop(event)" onclick="undoV5()" title="Undo" style="cursor: move;">
            <i class="ph ph-arrow-counter-clockwise"></i>
          </button>
          <button class="btn-icon-secondary" id="v5-shortcut-history" draggable="true" ondragstart="window.handleV5ShortcutDragStart(event)" ondragover="window.handleV5ShortcutDragOver(event)" ondrop="window.handleV5ShortcutDrop(event)" onclick="toggleV5History()" title="History" style="cursor: move;">
            <i class="ph ph-clock-counter-clockwise"></i>
          </button>
          <button class="btn-icon-secondary" id="v5-shortcut-startOver" draggable="true" ondragstart="window.handleV5ShortcutDragStart(event)" ondragover="window.handleV5ShortcutDragOver(event)" ondrop="window.handleV5ShortcutDrop(event)" onclick="startOverV5()" title="Start Over" style="cursor: move;">
            <i class="ph ph-arrows-counter-clockwise"></i>
          </button>
          <button class="btn-icon-secondary" id="v5-shortcut-popout" draggable="true" ondragstart="window.handleV5ShortcutDragStart(event)" ondragover="window.handleV5ShortcutDragOver(event)" ondrop="window.handleV5ShortcutDrop(event)" onclick="popOutV5Grid()" title="Pop Out Grid" style="cursor: move;">
            <i class="ph ph-arrow-square-out"></i>
          </button>
          
          <button class="btn-action-blue" id="v5-shortcut-autoCat" draggable="true" ondragstart="window.handleV5ShortcutDragStart(event)" ondragover="window.handleV5ShortcutDragOver(event)" ondrop="window.handleV5ShortcutDrop(event)" onclick="autoCategorizeV5()" style="cursor: move;">
            <i class="ph ph-magic-wand"></i>
            Auto-Categorize
          </button>

          <div class="v5-search-compact" id="v5-shortcut-search" draggable="true" ondragstart="window.handleV5ShortcutDragStart(event)" ondragover="window.handleV5ShortcutDragOver(event)" ondrop="window.handleV5ShortcutDrop(event)" style="cursor: move;">
            <i class="ph ph-magnifying-glass"></i>
            <input type="text" 
                   id="v5-search-input" 
                   placeholder="Search..." 
                   oninput="filterV5Grid(this.value)">
          </div>
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
        </div>
        
        <!-- Right: Menu -->
        <div class="v5-actions-right">
          <!-- RECONCILIATION BAR (MVP REFINED) -->
          <div class="v5-balances-card" id="v5-balances-card" style="display: none;">
            <div class="v5-balance-item">
              <div class="v5-balance-label">Opening</div>
              <input type="text" id="v5-opening-bal" class="v5-balance-value" 
                     onchange="window.handleOpeningBalanceChange(this)">
            </div>
            <div class="v5-balance-item">
              <div class="v5-balance-label">In</div>
              <div class="v5-balance-value positive" id="v5-total-in">$0.00</div>
            </div>
            <div class="v5-balance-item">
              <div class="v5-balance-label">Out</div>
              <div class="v5-balance-value negative" id="v5-total-out">$0.00</div>
            </div>
            <div class="v5-balance-item ending">
              <div class="v5-balance-label">Ending</div>
              <div class="v5-balance-value" id="v5-ending-bal">$0.00</div>
            </div>
          </div>

          <!-- Overflow Warning (Hidden) -->
          <div id="v5-shortcut-warning" style="display: none; color: #ef4444; font-size: 0.7rem; font-weight: 600; align-items: center; gap: 4px; border: 1px solid #fee2e2; background: #fef2f2; padding: 4px 8px; border-radius: 4px; margin-right: 8px;">
            <i class="ph ph-warning"></i> Max Capacity
          </div>
          
          <!-- Settings Icon with dropdown menu -->
          <div style="position: relative; overflow: visible;">
            <button class="btn-icon" onclick="window.toggleV5Settings()" title="Settings">
              <i class="ph ph-gear"></i>
            </button>
            <div class="v5-dropdown-menu" id="v5-dropdown-menu" style="display: none; position: absolute; right: 0; top: 100%; margin-top: 8px; min-width: 200px; background: white; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 9999;">
              <button class="menu-item" onclick="window.showV5Appearance(); window.toggleV5Settings();" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; width: 100%; border: none; background: none; cursor: pointer; font-size: 14px; color: #334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                <i class="ph ph-palette"></i>
                Grid Appearance
              </button>
              <button class="menu-item" onclick="undoV5(); window.toggleV5Settings();" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; width: 100%; border: none; background: none; cursor: pointer; font-size: 14px; color: #334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                <i class="ph ph-arrow-counter-clockwise"></i>
                Undo
              </button>
              <button class="menu-item" onclick="startOverV5(); window.toggleV5Settings();" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; width: 100%; border: none; background: none; cursor: pointer; font-size: 14px; color: #334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                <i class="ph ph-arrows-counter-clockwise"></i>
                Start Over
              </button>
              <button class="menu-item" onclick="toggleV5History(); window.toggleV5Settings();" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; width: 100%; border: none; background: none; cursor: pointer; font-size: 14px; color: #334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                <i class="ph ph-clock-counter-clockwise"></i>
                Toggle History
              </button>
              <button class="menu-item" onclick="popOutV5Grid(); window.toggleV5Settings();" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; width: 100%; border: none; background: none; cursor: pointer; font-size: 14px; color: #334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                <i class="ph ph-arrow-square-out"></i>
                Pop Out Grid
              </button>
              <button class="menu-item" onclick="showKeyboardShortcuts(); window.toggleV5Settings();" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; width: 100%; border: none; background: none; cursor: pointer; font-size: 14px; color: #334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                <i class="ph ph-question"></i>
                Keyboard Shortcuts
              </button>
              <hr style="margin: 8px 0; border: none; border-top: 1px solid #e5e7eb;">
              <button class="menu-item" onclick="window.showV5SettingsPanel(); window.toggleV5Settings();" style="display: flex; align-items: center; gap: 8px; padding: 10px 16px; width: 100%; border: none; background: none; cursor: pointer; font-size: 14px; color: #334155;" onmouseover="this.style.background='#f1f5f9'" onmouseout="this.style.background='none'">
                <i class="ph ph-gear"></i>
                Advanced Settings
              </button>
            </div>
          </div>
        </div>
      </div>

      <div id="v5-assignment-banner" style="display:none;">
        <div class="banner-left">
          <i class="ph ph-link" style="color: #3b82f6; font-size: 1.25rem;"></i>
          <span class="banner-text">📋 1 statement uploaded. Link to account:</span>
        </div>
        <div class="banner-right" style="display: flex; align-items: center; gap: 12px;">
          <div id="v5-banner-assign-dropdown-wrapper" style="display: none; position: relative;">
            <input type="hidden" id="v5-banner-assign-value" value="">
            <div id="v5-banner-coa-trigger" class="custom-coa-trigger" onclick="window.toggleV5BannerCOADropdown()" style="min-width: 280px;">
              <i class="ph ph-hand-pointing"></i>
              <span id="v5-banner-coa-selected-text">Choose account...</span>
              <i class="ph ph-caret-down"></i>
            </div>
            <div id="v5-banner-coa-menu" class="custom-coa-menu" style="display: none;">
              <div class="coa-search-box-wrapper">
                <input type="text" class="coa-search-input" placeholder="Search accounts..." oninput="window.filterV5BannerCOA(this.value)" onclick="event.stopPropagation()">
              </div>
              <div id="v5-banner-coa-list" class="coa-list-scroll">
                <!-- Populated dynamically -->
              </div>
            </div>
          </div>
          <button id="btn-complete-assignment" onclick="window.v5CompleteAssignment()" style="display: none;">Link to Ledger</button>
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
            <button class="btn-bulk" onclick="enterBulkAssignMode()" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);">
              <i class="ph ph-briefcase"></i> Assign
            </button>
            <button class="btn-bulk btn-bulk-delete" onclick="bulkDeleteRows()">
              <i class="ph ph-trash"></i> Delete
            </button>
          </div>
          
          <!-- STATE 2: Categorize - Show COA Custom Dropdown + Apply -->
          <div id="bulk-state-categorize" class="bulk-state" style="display: none;">
            <!-- Custom Collapsible Dropdown -->
            <div class="custom-coa-dropdown">
              <div class="custom-coa-trigger" id="coa-dropdown-trigger" onclick="toggleCustomDropdown()">
                <span id="coa-selected-text">Choose account to categorize...</span>
                <i class="ph ph-caret-down"></i>
              </div>
              <div class="custom-coa-menu" id="coa-dropdown-menu" style="display: none;">
                <!-- Populated by JavaScript -->
              </div>
            </div>
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
          <button class="btn-bulk-cancel" onclick="window.closeV5Appearance()" style="margin-left: auto; min-width: 32px; padding: 6px; border: 1px solid #cbd5e1; color: #64748b; font-size: 16px; cursor: pointer; transition: all 0.2s;" onmouseover="this.style.background='#f1f5f9'; this.style.borderColor='#94a3b8';" onmouseout="this.style.background='transparent'; this.style.borderColor='#cbd5e1';">
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

    <!-- [PHASE 2] Settings Panel - Slide-in from Right -->
    <div id="v5-settings-panel" class="v5-settings-panel" style="display: none;">
      <div class="v5-settings-overlay" onclick="window.closeV5SettingsPanel()"></div>
      
      <div class="v5-settings-drawer">
        <!-- Header -->
        <div class="v5-settings-header">
          <h2>Settings</h2>
          <button class="v5-settings-close" onclick="window.closeV5SettingsPanel()">
            <i class="ph ph-x"></i>
          </button>
        </div>

        <!-- Top Navigation Tabs (Restored to Drawer) -->
        <nav class="v5-settings-tabs">
          <button class="v5-tab-btn active" onclick="window.switchV5SettingsTab('appearance', this)">
            Appearance
          </button>
          <button class="v5-tab-btn" onclick="window.switchV5SettingsTab('columns', this)">
            Columns
          </button>
          <button class="v5-tab-btn" onclick="window.switchV5SettingsTab('autocat', this)">
            Auto-Cat
          </button>
          <button class="v5-tab-btn" onclick="window.switchV5SettingsTab('preferences', this)">
            Preferences
          </button>
          <button class="v5-tab-btn" onclick="window.switchV5SettingsTab('advanced', this)">
            Advanced
          </button>
        </nav>

        <div class="v5-settings-body">
          
          <!-- TAB: Appearance -->
          <div class="v5-settings-tab-content active" data-tab-content="appearance">
            <div class="v5-settings-section">
              <h3>Grid Appearance</h3>
              
              <div class="v5-setting-item">
                <label>Theme</label>
                <select id="v5-setting-theme" onchange="window.applyV5Theme(this.value)">
                  <option value="light">Light Theme</option>
                  <option value="dark">Dark Theme</option>
                  <option value="classic">Classic Blue</option>
                  <option value="default">Default Grey</option>
                  <option value="ledger-pad">Ledger Pad (Green)</option>
                  <option value="postit">Post-it Note</option>
                  <option value="rainbow">Rainbow</option>
                  <option value="social">Social Blue</option>
                  <option value="spectrum">Spectrum (Excel)</option>
                  <option value="subliminal">Subliminal Dark</option>
                  <option value="subtle">Subtle Neutral</option>
                  <option value="tracker">Tracker Green</option>
                  <option value="vanilla">Vanilla (Caseware)</option>
                  <option value="vintage">Vintage Gold</option>
                  <option value="wave">Wave Blue</option>
                  <option value="webapp">WebApp Modern</option>
                  <optgroup label="Experimental Designs">
                    <option value="frosted">Frosted Finance</option>
                    <option value="swiss">Swiss Minimalist</option>
                    <option value="midnight">Midnight Executive</option>
                  </optgroup>
                </select>
              </div>

              <div class="v5-setting-item">
                <label>Font Size</label>
                <div class="v5-slider-container">
                  <input type="range" id="v5-setting-fontsize" min="12" max="18" value="14" 
                         oninput="window.applyV5FontSize(this.value)">
                  <span id="v5-fontsize-value">14px</span>
                </div>
              </div>

              <div class="v5-setting-item">
                <label>Row Density</label>
                <div class="v5-radio-group">
                  <label class="v5-radio-label">
                    <input type="radio" name="row-density" value="compact" onchange="window.applyV5RowDensity(this.value)">
                    <span>Compact</span>
                  </label>
                  <label class="v5-radio-label">
                    <input type="radio" name="row-density" value="comfortable" checked onchange="window.applyV5RowDensity(this.value)">
                    <span>Comfortable</span>
                  </label>
                  <label class="v5-radio-label">
                    <input type="radio" name="row-density" value="spacious" onchange="window.applyV5RowDensity(this.value)">
                    <span>Spacious</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- TAB: Columns -->
          <div class="v5-settings-tab-content" data-tab-content="columns">
            <div class="v5-settings-section">
              <h3>Column Visibility</h3>
              <p class="v5-setting-desc">Show or hide columns in the transaction grid</p>
              
              <div class="v5-toggle-list">
                <label class="v5-toggle-item">
                  <span>Date</span>
                  <input type="checkbox" id="col-date" checked onchange="window.toggleV5Column('date', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Description</span>
                  <input type="checkbox" id="col-description" checked onchange="window.toggleV5Column('description', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Debit</span>
                  <input type="checkbox" id="col-debit" checked onchange="window.toggleV5Column('debit', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Credit</span>
                  <input type="checkbox" id="col-credit" checked onchange="window.toggleV5Column('credit', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Balance</span>
                  <input type="checkbox" id="col-balance" checked onchange="window.toggleV5Column('balance', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Account</span>
                  <input type="checkbox" id="col-account" checked onchange="window.toggleV5Column('account', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Ref#</span>
                  <input type="checkbox" id="col-refnumber" checked onchange="window.toggleV5Column('refNumber', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
              </div>

              <h3 style="margin-top: 24px;">Additional Columns</h3>
              <div class="v5-toggle-list">
                <label class="v5-toggle-item">
                  <span>Sales Tax (GST)</span>
                  <input type="checkbox" id="col-salestax" onchange="window.toggleV5SalesTax(this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Foreign Balance</span>
                  <input type="checkbox" id="col-foreign" onchange="window.toggleV5ForeignBalance(this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- TAB: Auto-Categorization -->
          <div class="v5-settings-tab-content" data-tab-content="autocat">
            <div class="v5-settings-section">
              <h3>Auto-Categorization Settings</h3>
              
              <label class="v5-toggle-item">
                <span>Enable Auto-Categorize</span>
                <input type="checkbox" id="v5-setting-autocat-enabled" checked onchange="window.toggleV5AutoCat(this.checked)">
                <span class="v5-toggle-switch"></span>
              </label>

              <div class="v5-setting-item" style="margin-top: 16px;">
                <label>Confidence Threshold</label>
                <div class="v5-slider-container">
                  <input type="range" id="v5-setting-confidence" min="50" max="95" value="75" 
                         oninput="window.updateV5ConfidenceThreshold(this.value)">
                  <span id="v5-confidence-value">75%</span>
                </div>
                <p class="v5-setting-desc">Only auto-assign if confidence is above this threshold</p>
              </div>

              <div class="v5-checkbox-group">
                <label class="v5-checkbox-label">
                  <input type="checkbox" id="v5-setting-show-scores" onchange="window.toggleV5ShowScores(this.checked)">
                  <span>Show confidence scores in grid</span>
                </label>
                <label class="v5-checkbox-label">
                  <input type="checkbox" id="v5-setting-review-before" onchange="window.toggleV5ReviewBefore(this.checked)">
                  <span>Review before apply</span>
                </label>
              </div>
            </div>
          </div>

          <!-- TAB: Preferences -->
          <div class="v5-settings-tab-content" data-tab-content="preferences">
            <div class="v5-settings-section">
              <h3>Import Preferences</h3>
              
              <div class="v5-setting-item">
                <label>Default Ref# Prefix</label>
                <input type="text" id="v5-setting-refprefix" value="REF" 
                       placeholder="REF" 
                       onchange="window.setV5DefaultRefPrefix(this.value)"
                       style="width: 100%; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px;">
                <p class="v5-setting-desc">Auto-updates when bank is detected</p>
              </div>

              <div class="v5-setting-item">
                <label>Date Format</label>
                <select id="v5-setting-dateformat" onchange="window.setV5DateFormat(this.value)">
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div class="v5-setting-item">
                <label>Province (Tax Calculation)</label>
                <select id="v5-setting-province" onchange="window.setV5Province(this.value)">
                  <option value="AB">Alberta (5% GST)</option>
                  <option value="BC">British Columbia (12%)</option>
                  <option value="MB">Manitoba (12%)</option>
                  <option value="NB">New Brunswick (15% HST)</option>
                  <option value="NL">Newfoundland (15% HST)</option>
                  <option value="NS">Nova Scotia (15% HST)</option>
                  <option value="ON">Ontario (13% HST)</option>
                  <option value="PE">PEI (15% HST)</option>
                  <option value="QC">Quebec (14.975%)</option>
                  <option value="SK">Saskatchewan (11%)</option>
                  <option value="NT">NW Territories (5%)</option>
                  <option value="NU">Nunavut (5%)</option>
                  <option value="YT">Yukon (5%)</option>
                </select>
                <p class="v5-setting-desc">Used for the Sales Tax column calculations (Amount / (1+r) * r)</p>
              </div>

              <label class="v5-checkbox-label">
                <input type="checkbox" id="v5-setting-autoexpand" onchange="window.toggleV5AutoExpand(this.checked)">
                <span>Auto-expand rows on import</span>
              </label>
            </div>

            <div class="v5-settings-section">
              <h3>Currency Settings</h3>
              
              <div class="v5-setting-item">
                <label>Home Currency</label>
                <select id="v5-setting-homecurrency" disabled>
                  <option value="CAD" selected>CAD - Canadian Dollar</option>
                </select>
                <p class="v5-setting-desc">Currently locked to CAD</p>
              </div>

              <div class="v5-setting-item">
                <label>Foreign Currency Pairs</label>
                <div class="v5-checkbox-group">
                  <label class="v5-checkbox-label">
                    <input type="checkbox" value="USD" checked onchange="window.toggleV5CurrencyPair('USD', this.checked)">
                    <span>USD - US Dollar</span>
                  </label>
                  <label class="v5-checkbox-label">
                    <input type="checkbox" value="EUR" checked onchange="window.toggleV5CurrencyPair('EUR', this.checked)">
                    <span>EUR - Euro</span>
                  </label>
                  <label class="v5-checkbox-label">
                    <input type="checkbox" value="GBP" checked onchange="window.toggleV5CurrencyPair('GBP', this.checked)">
                    <span>GBP - British Pound</span>
                  </label>
                  <label class="v5-checkbox-label">
                    <input type="checkbox" value="JPY" checked onchange="window.toggleV5CurrencyPair('JPY', this.checked)">
                    <span>JPY - Japanese Yen</span>
                  </label>
                  <label class="v5-checkbox-label">
                    <input type="checkbox" value="AUD" checked onchange="window.toggleV5CurrencyPair('AUD', this.checked)">
                    <span>AUD - Australian Dollar</span>
                  </label>
                </div>
              </div>

              <div class="v5-setting-item">
                <button class="btn-secondary" onclick="window.refreshV5ExchangeRates()" 
                        style="width: 100%; padding: 10px;">
                  <i class="ph ph-arrows-clockwise"></i> Refresh Exchange Rates
                </button>
                <p class="v5-setting-desc" id="v5-rates-updated">Last updated: Never</p>
              </div>
            </div>
          </div>

          <!-- TAB: Advanced -->
          <div class="v5-settings-tab-content" data-tab-content="advanced">
            <div class="v5-settings-section">
              <h3>Performance</h3>
              
              <div class="v5-setting-item">
                <label>Rows Per Page</label>
                <select id="v5-setting-rowsperpage" onchange="window.setV5RowsPerPage(parseInt(this.value))">
                  <option value="50">50</option>
                  <option value="100" selected>100</option>
                  <option value="200">200</option>
                  <option value="500">500</option>
                </select>
              </div>

              <label class="v5-toggle-item">
                <span>Enable Virtualization</span>
                <input type="checkbox" id="v5-setting-virtualization" checked onchange="window.toggleV5Virtualization(this.checked)">
                <span class="v5-toggle-switch"></span>
              </label>
              <p class="v5-setting-desc">Improves performance for large datasets (1000+ rows)</p>

              <div class="v5-setting-item" style="margin-top: 16px;">
                <label>Auto-save Interval</label>
                <div class="v5-radio-group">
                  <label class="v5-radio-label">
                    <input type="radio" name="autosave" value="30000" onchange="window.setV5AutoSaveInterval(parseInt(this.value))">
                    <span>30s</span>
                  </label>
                  <label class="v5-radio-label">
                    <input type="radio" name="autosave" value="60000" checked onchange="window.setV5AutoSaveInterval(parseInt(this.value))">
                    <span>1min</span>
                  </label>
                  <label class="v5-radio-label">
                    <input type="radio" name="autosave" value="300000" onchange="window.setV5AutoSaveInterval(parseInt(this.value))">
                    <span>5min</span>
                  </label>
                </div>
              </div>
            </div>

            <div class="v5-settings-section">
              <h3>Validation & Alerts</h3>
              
              <div class="v5-toggle-list">
                <label class="v5-toggle-item">
                  <span>Duplicate Detection</span>
                  <input type="checkbox" id="v5-setting-duplicates" checked onchange="window.toggleV5DuplicateDetection(this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Balance Reconciliation Alerts</span>
                  <input type="checkbox" id="v5-setting-balance-alerts" checked onchange="window.toggleV5BalanceAlerts(this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Negative Balance Warnings</span>
                  <input type="checkbox" id="v5-setting-negative-warnings" checked onchange="window.toggleV5NegativeWarnings(this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
              </div>
            </div>

            <div class="v5-settings-section">
              <h3>Export Format</h3>
              
              <div class="v5-setting-item">
                <label>Format</label>
                <select id="v5-setting-exportformat">
                  <option value="xlsx">XLSX (Excel) - Preferred</option>
                  <option value="standard">Standard CSV</option>
                  <option value="quickbooks">QuickBooks Format</option>
                  <option value="sage">Sage Format</option>
                </select>
              </div>

              <div style="display: flex; gap: 8px; margin-top: 12px;">
                <button class="btn-secondary" onclick="window.exportV5WithFilters()" style="flex: 1; padding: 8px;">
                  Export with Filters
                </button>
                <button class="btn-secondary" onclick="window.exportV5AllData()" style="flex: 1; padding: 8px;">
                  Export All Data
                </button>
              </div>
            </div>

            <div class="v5-settings-section">
              <h3>Action Bar Shortcuts</h3>
              <p class="v5-setting-desc">Toggle tools in the top toolbar</p>
              
              <div class="v5-toggle-list">
                <label class="v5-toggle-item">
                  <span>Ref# Box</span>
                  <input type="checkbox" id="v5-setting-shortcut-refBox" onchange="window.toggleV5Shortcut('refBox', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Expand/Collapse</span>
                  <input type="checkbox" id="v5-setting-shortcut-expandAll" onchange="window.toggleV5Shortcut('expandAll', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Auto-Categorize</span>
                  <input type="checkbox" id="v5-setting-shortcut-autoCat" onchange="window.toggleV5Shortcut('autoCat', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Search Bar</span>
                  <input type="checkbox" id="v5-setting-shortcut-search" onchange="window.toggleV5Shortcut('search', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Undo Button</span>
                  <input type="checkbox" id="v5-setting-shortcut-undo" onchange="window.toggleV5Shortcut('undo', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>History Toggle</span>
                  <input type="checkbox" id="v5-setting-shortcut-history" onchange="window.toggleV5Shortcut('history', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Start Over</span>
                  <input type="checkbox" id="v5-setting-shortcut-startOver" onchange="window.toggleV5Shortcut('startOver', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
                <label class="v5-toggle-item">
                  <span>Pop Out Grid</span>
                  <input type="checkbox" id="v5-setting-shortcut-popout" onchange="window.toggleV5Shortcut('popout', this.checked)">
                  <span class="v5-toggle-switch"></span>
                </label>
              </div>
            </div>
          </div>

        </div><!-- end v5-settings-body -->

        <!-- Footer -->
        <div class="v5-settings-footer">
          <button class="btn-secondary" onclick="window.resetV5SettingsToDefaults()">
            Reset to Defaults
          </button>
          <button class="btn-primary" onclick="window.saveV5Settings()">
            Save Settings
          </button>
        </div>

      </div><!-- end v5-settings-drawer -->
    </div><!-- end v5-settings-panel -->

    <!-- CSS for Settings Panel -->
    <style>
      /* Settings Panel - Overlay and Drawer */
      .v5-settings-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
        display: flex;
        justify-content: flex-end; /* Slide from right */
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
      }

      .v5-settings-panel.active {
        opacity: 1;
        pointer-events: all;
      }

      .v5-settings-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.5);
        backdrop-filter: blur(4px);
      }

      .v5-settings-drawer {
        position: absolute; /* Change relative to absolute */
        top: 0;
        right: 0; /* Anchored to right edge */
        width: 450px; /* Narrower width */
        max-width: 100vw;
        height: 100%;
        background: white;
        box-shadow: -10px 0 30px rgba(0, 0, 0, 0.1);
        display: flex;
        flex-direction: column;
        transform: translateX(100%);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10001;
        overflow: hidden;
      }

      .v5-settings-panel.active .v5-settings-drawer {
        transform: translateX(0);
      }

      /* Header */
      .v5-settings-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 24px 32px;
        border-bottom: 1px solid #f1f5f9;
      }

      .v5-settings-header h2 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: #111827;
      }

      .v5-settings-close {
        background: none;
        border: none;
        font-size: 24px;
        color: #94a3b8;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        transition: all 0.2s;
      }

      .v5-settings-close:hover {
        background: #f1f5f9;
        color: #111827;
      }

      /* Top Navigation Tabs (Restored to Drawer) */
      .v5-settings-tabs {
        display: flex;
        padding: 0 12px; /* Reduced from 16px/32px to fix truncation */
        justify-content: flex-start;
        gap: 12px; /* Reduced gap from 16px/24px to fit 450px width */
        background: white;
        border-bottom: 1px solid #f1f5f9;
        margin-bottom: 0;
        overflow-x: auto;
        scrollbar-width: none;
      }
      .v5-settings-tabs::-webkit-scrollbar { display: none; }

      .v5-tab-btn {
        padding: 16px 0;
        border: none;
        background: none;
        font-size: 15px;
        font-weight: 600;
        color: #64748b;
        cursor: pointer;
        position: relative;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .v5-tab-btn:hover {
        color: #111827;
      }

      .v5-tab-btn.active {
        color: #2563eb;
      }

      .v5-tab-btn.active::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        width: 100%;
        height: 2px;
        background: #2563eb;
      }

      /* Body */
      .v5-settings-body {
        flex: 1;
        overflow-y: auto;
        padding: 24px 32px;
      }

      .v5-settings-tab-content {
        display: none;
      }

      .v5-settings-tab-content.active {
        display: block;
      }

      /* Footer */
      .v5-settings-footer {
        padding: 24px 32px;
        background: #f9fafb;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
        align-items: center; /* Prevent vertical stretch */
        gap: 12px;
        margin-top: auto;
      }

      /* Sections */
      .v5-settings-section {
        margin-bottom: 32px;
      }

      .v5-settings-section:last-child {
        margin-bottom: 0;
      }

      .v5-settings-section h3 {
        font-size: 16px;
        font-weight: 600;
        color: #111827;
        margin: 0 0 16px 0;
      }

      /* Setting Items */
      .v5-setting-item {
        margin-bottom: 20px;
      }

      .v5-setting-item label {
        display: block;
        font-size: 14px;
        font-weight: 500;
        color: #374151;
        margin-bottom: 8px;
      }

      .v5-setting-item select,
      .v5-setting-item input[type="text"] {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s;
      }

      .v5-setting-item select:focus,
      .v5-setting-item input[type="text"]:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
      }

      .v5-setting-desc {
        font-size: 12px;
        color: #6b7280;
        margin: 4px 0 0 0;
      }

      /* Slider */
      .v5-slider-container {
        display: flex;
        align-items: center;
        gap: 12px;
      }

      .v5-slider-container input[type="range"] {
        flex: 1;
        height: 6px;
        border-radius: 3px;
        background: #e5e7eb;
        outline: none;
        -webkit-appearance: none;
      }

      .v5-slider-container input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: #3b82f6;
        cursor: pointer;
        transition: transform 0.2s;
      }

      .v5-slider-container input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.1);
      }

      .v5-slider-container span {
        font-size: 14px;
        font-weight: 600;
        color: #3b82f6;
        min-width: 50px;
        text-align: right;
      }

      /* Radio Group */
      .v5-radio-group {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .v5-radio-label {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 8px 16px;
        border: 1px solid #d1d5db;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
      }

      .v5-radio-label:hover {
        border-color: #3b82f6;
        background: #eff6ff;
      }

      .v5-radio-label input {
        margin: 0;
      }

      .v5-radio-label span {
        font-size: 14px;
        color: #374151;
      }

      /* Toggle List */
      .v5-toggle-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .v5-toggle-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 12px;
        background: #f9fafb;
        border-radius: 8px;
        cursor: pointer;
        transition: background 0.2s;
      }

      .v5-toggle-item:hover {
        background: #f3f4f6;
      }

      .v5-toggle-item span:first-child {
        font-size: 14px;
        color: #374151;
        font-weight: 500;
      }

      .v5-toggle-item input[type="checkbox"] {
        display: none;
      }

      .v5-toggle-switch {
        position: relative;
        width: 44px;
        height: 24px;
        background: #d1d5db;
        border-radius: 12px;
        transition: background 0.2s;
      }

      .v5-toggle-switch::after {
        content: '';
        position: absolute;
        top: 2px;
        left: 2px;
        width: 20px;
        height: 20px;
        background: white;
        border-radius: 50%;
        transition: transform 0.2s;
      }

      .v5-toggle-item input[type="checkbox"]:checked + .v5-toggle-switch {
        background: #3b82f6;
      }

      .v5-toggle-item input[type="checkbox"]:checked + .v5-toggle-switch::after {
        transform: translateX(20px);
      }

      /* Checkbox Group */
      .v5-checkbox-group {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .v5-checkbox-label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }

      .v5-checkbox-label input {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .v5-checkbox-label span {
        font-size: 14px;
        color: #374151;
      }

      /* Footer */
      .v5-settings-footer {
        display: flex;
        gap: 12px;
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        background: #f9fafb;
      }

      .v5-settings-footer button {
        flex: 1;
        padding: 10px 16px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .btn-secondary {
        background: white;
        border: 1px solid #d1d5db;
        color: #374151;
      }

      .btn-secondary:hover {
        background: #f9fafb;
        border-color: #9ca3af;
      }

      .btn-primary {
        background: #3b82f6;
        border: none;
        color: white;
      }

      .btn-primary:hover {
        background: #2563eb;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }
    </style>

    <!-- Popover Elements (Shared) - Moved outside sticky header for fixed positioning -->
    <div id="v5-header-popover" class="v5-popover">
      <input type="text" class="v5-popover-search" placeholder="Search..." oninput="window.filterV5Popover(this.value)">
      <div class="v5-popover-list" id="v5-popover-list">
        <!-- Populated dynamically -->
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

window.toggleV5ActionMenu = function (event, rowId) {
  // Legacy function - will be shadowed by the main one below or removed.
  // Actually, let's just remove this one as it's a duplicate.
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

  // 1. ALWAYS update the source data first (Source of Truth)
  if (V5State.gridData && V5State.gridData.length > 0) {
    V5State.gridData.forEach((txn, index) => {
      const debit = parseFloat(txn.debit || txn.Debit) || 0;
      const credit = parseFloat(txn.credit || txn.Credit) || 0;
      runningBalance = runningBalance - debit + credit;
      txn.balance = parseFloat(runningBalance.toFixed(2));
      txn.Balance = txn.balance;

      // If no refNumber yet, give it a sequence
      if (!txn.refNumber) {
        txn.refNumber = String(index + 1).padStart(3, '0');
      }
    });
  }

  // 2. If grid is ready, sync the grid state
  if (V5State.gridApi) {
    // Refresh the grid but also RE-SEQUENCE if sorted/filtered
    let seq = 1;
    let gridRunningBalance = openingVal;

    // We iterate the VISIBLE nodes to ensure the refNumber matches the visual order
    V5State.gridApi.forEachNodeAfterFilterAndSort((node) => {
      const txn = node.data;
      const debit = parseFloat(txn.debit || txn.Debit) || 0;
      const credit = parseFloat(txn.credit || txn.Credit) || 0;

      gridRunningBalance = gridRunningBalance - debit + credit;
      txn.balance = parseFloat(gridRunningBalance.toFixed(2));
      txn.Balance = txn.balance;
      txn.refNumber = String(seq++).padStart(3, '0');
    });

    // Final push to UI
    V5State.gridApi.refreshCells({ columns: ['balance', 'refNumber'], force: true });
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

  // CRITICAL SYNC: Ensure accountId and account name match for UI "brick" update
  categorized.forEach(txn => {
    if (txn.accountId && txn.accountId !== 'Uncategorized') {
      // Sync the field that resolveAccountName uses
      txn.account = txn.accountId;
    }
  });

  V5State.gridData = categorized;
  V5State.gridApi?.setGridOption('rowData', [...categorized]);
  updateReconciliationCard();

  // Toast removed
};

window.reviewMatchesV5 = function () {
  /** Resolve account ID/code to clean name (NO HYPHENS) */
  window.resolveAccountName = function (val) {
    if (!val) return 'Uncategorized';
    const accounts = window.storage?.getAccountsSync?.() || [];
    const found = accounts.find(a => a.code === val || a.name === val);
    // CLEAN DISPLAY: Only return the name, no hyphenated code
    return found ? found.name : val;
  };
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

  if (openingEl) {
    openingEl.value = fmt(openingBal); // Changed from textContent to value
  }
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
  const prefix = (value || '').toUpperCase().trim();
  V5State.refPrefix = prefix;

  // Ensure settings are updated
  if (V5State.settings && V5State.settings.importPrefs) {
    V5State.settings.importPrefs.defaultRefPrefix = prefix;
  }

  // Sync toolbar input clones (querySelectorAll handles multiple)
  const inputs = document.querySelectorAll('#v5-ref-prefix');
  inputs.forEach(inp => {
    if (inp.value.toUpperCase() !== prefix) {
      inp.value = prefix;
    }
  });

  // Sync settings panel input if open
  const settingsInput = document.getElementById('v5-setting-refprefix');
  if (settingsInput && settingsInput.value.toUpperCase() !== prefix) {
    settingsInput.value = prefix;
  }

  // Refresh grid to show new Ref# values
  if (V5State.gridApi) {
    V5State.gridApi.refreshCells({ columns: ['refNumber'], force: true });
  }
};

// ============================================
// SYSTEM A: GRID DATA PERSISTENCE (FIXED)
// ============================================

// Consolidated Save Data (Sync wrapper for main async function)
window.saveData = function () {
  // Use the global async version but don't wait 
  // Avoid calling 'saveData' directly to prevent infinite recursion
  if (typeof window.saveDataAsync === 'function') {
    window.saveDataAsync();
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
    V5State.openingBalance = parseFloat(localStorage.getItem('ab_v5_opening_balance')) || 0;
    V5State.refPrefix = localStorage.getItem('ab_v5_ref_prefix') || '';

    // Initialize grid with loaded data
    if (V5State.gridData.length > 0) {
      window.initV5();

      // Update UI elements
      const refInp = document.getElementById('v5-ref-prefix');
      if (refInp) refInp.value = V5State.refPrefix;

      // Show toolbar ONLY when data exists
      const toolbar = document.getElementById('v5-action-bar');
      if (toolbar) {
        toolbar.classList.add('show-data');
        toolbar.style.display = 'flex';
        window.renderV5Shortcuts(); // Ensure shortcuts are rendered
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
      window.initV5();
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
  if (!row) {
    console.warn('Source file not found for fileId:', fileId);
    return;
  }

  const fileName = row.sourceFileName;
  window.router.navigate(`/txn-import-v5/pdf-viewer?file=${encodeURIComponent(fileName)}`);
  console.log(`📂 Navigating to internal PDF viewer: ${fileName}`);
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

  const cats = get5TierCoAAccounts();
  const coa = Object.values(cats).flat();

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
  console.log('[V5-V2] File(s) dropped');

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
  console.log('[DEBUG] File input change event triggered');
  const files = Array.from(e.target.files);
  console.log(`[V5-V2] ${files.length} file(s) selected via browse`);
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
    progressContainer.style.display = 'block'; // Explicitly set to block
  }

  try {
    // Use ProcessingEngine for background parsing - LOOPING TO PRESERVE FILE SOURCE
    let allTransactions = [];
    let earliestDate = null;
    let autoOpeningBalance = 0;

    // Process files sequentially to ensure we can tag them correctly
    for (let i = 0; i < V5State.selectedFiles.length; i++) {
      const file = V5State.selectedFiles[i];
      updateV5Progress(i, V5State.selectedFiles.length, `Parsing ${file.name}...`);

      const startTime = performance.now();

      try {
        // Parse single file
        const parseResult = await window.ProcessingEngine.parseFiles([file], () => { });
        const fileTxns = parseResult.transactions || [];
        const fileOpeningBal = parseResult.openingBalance || 0;

        const endTime = performance.now();
        console.log(`[V5-V2] File ${i + 1}/${V5State.selectedFiles.length} (${file.name}) took ${(endTime - startTime).toFixed(2)}ms`);

        // Generate ID for this specific file
        const fileId = `file-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 9)}`;
        const fileType = file.name.toLowerCase().endsWith('.pdf') ? 'pdf' : 'csv';

        // Tag transactions immediately with THIS file's info
        fileTxns.forEach((txn, txnIdx) => {
          // ENSURE UNIQUE ID FOR UI STATE (Audit Mode)
          txn.id = `${fileId}-${txnIdx}`;

          txn.sourceFileId = fileId;
          txn.sourceFileName = file.name;
          txn.sourceFileBlob = file;
          txn.sourceFileType = fileType;
        });

        allTransactions = allTransactions.concat(fileTxns);

        // Track earliest statement's opening balance
        if (fileTxns.length > 0) {
          const fileEarliestDate = fileTxns.reduce((min, t) => {
            const d = t.Date || t.date;
            return (!min || d < min) ? d : min;
          }, null);

          if (!earliestDate || fileEarliestDate < earliestDate) {
            earliestDate = fileEarliestDate;
            autoOpeningBalance = fileOpeningBal;
            console.log(`[V5-V2] New earliest statement detected: ${file.name}, Date: ${earliestDate}, Opening Balance: ${autoOpeningBalance}`);
          }
        }

        // Add to import history (one entry per file)
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
        V5State.recentImports = currentHistory;

      } catch (fileErr) {
        console.error(`❌ Failed to parse ${file.name}:`, fileErr);
      }

      // Yield to UI between files
      await new Promise(r => setTimeout(r, 0));
    }

    // If no transactions found after all files
    if (allTransactions.length === 0) {
      throw new Error('No transactions found in selected files');
    }

    const transactions = allTransactions;

    // Auto-populate opening balance from earliest statement
    if (autoOpeningBalance !== 0) {
      console.log(`[V5-V2] Auto-populating opening balance: ${autoOpeningBalance}`);
      V5State.openingBalance = autoOpeningBalance;
      const openingBalInput = document.getElementById('v5-opening-bal');
      if (openingBalInput) {
        openingBalInput.value = '$' + autoOpeningBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    }

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
      prefix: firstTxn._prefix || 'TXN',
      institutionCode: firstTxn._inst || '---',
      transit: firstTxn._transit || '-----',
      accountNumber: firstTxn._acct || '-----',
      fingerprint: firstTxn._fingerprint || null
    };

    console.log('🔍 [V5-V2] Brand Detection Debug:');
    console.table(brandDetection);

    // VERIFY FIRST TRANSACTION METADATA
    if (transactions.length > 0) {
      console.log('🔍 [V5-V2] First Transaction Sample:', {
        desc: firstTxn.Description || firstTxn.description,
        inst: firstTxn._inst,
        transit: firstTxn._transit,
        acct: firstTxn._acct
      });
    }

    // Categorize using all 7 methods
    updateV5Progress(0, 1, 'Categorizing transactions...');
    const categorized = await window.ProcessingEngine.categorizeTransactions(
      transactions,
      (progress, message) => {
        updateV5Progress(progress, 100, message);
      }
    );

    // Track for later assignment
    const statementId = `stmt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    V5State.pendingStatements.push({
      id: statementId,
      filename: V5State.selectedFiles[0]?.name || 'Unknown Statement',
      bank: brandDetection.brand,
      tag: brandDetection.tag,
      prefix: brandDetection.prefix,
      institutionCode: brandDetection.institutionCode,
      transit: brandDetection.transit,
      accountNumber: brandDetection.accountNumber,
      fingerprint: brandDetection.fingerprint,
      count: categorized.length,
      dateRange: {
        start: categorized[0]?.Date || '',
        end: categorized[categorized.length - 1]?.Date || ''
      },
      status: 'pending',
      transactions: categorized // Store transactions in the statement object!
    });

    // NATURAL FLOW: Set grid data (don't append categorized again if parseV5Files is called multiple times without reset)
    // Actually, categorized already contains allTransactions. 
    // If V5State.gridData already had data from previous calls, the spread below would double it.
    V5State.gridData = categorized;
    V5State.currentAccountCode = null; // Reset to "Pending" state

    // Initialize or Update Grid
    if (!V5State.gridApi) {
      window.initTxnImportV5Grid(); // FIX TYPO: initV5Grid -> initTxnImportV5Grid
    } else {
      V5State.gridApi.setGridOption('rowData', V5State.gridData);
    }

    // UPDATE UI: Breadcrumbs & Header
    if (window.updateV5PageHeader) {
      window.updateV5PageHeader({
        brand: brandDetection.brand,
        subType: brandDetection.tag,
        prefix: brandDetection.prefix,
        institutionCode: brandDetection.institutionCode,
        transit: brandDetection.transit,
        accountNumber: brandDetection.accountNumber,
        source: 'auto_detected'
      });
    }

    // EXTRACT OPENING BALANCE from first (oldest) statement
    // This runs on EVERY upload to ensure opening balance is always from the first statement
    if (V5State.gridData && V5State.gridData.length > 0) {
      // Find the earliest transaction date across ALL transactions
      const dates = V5State.gridData.map(t => new Date(t.date || t.Date));
      const earliestDate = new Date(Math.min(...dates));

      console.log(`📅 Earliest transaction date in grid: ${earliestDate.toISOString().split('T')[0]}`);

      // If this upload has an opening balance, use it
      if (brandDetection.openingBalance || autoOpeningBalance) {
        const ob = brandDetection.openingBalance || autoOpeningBalance;
        V5State.openingBalance = ob;
        console.log(`💰 Opening balance set from statement: ${ob}`);

        // Ensure the input field is updated
        const openingBalInput = document.getElementById('v5-opening-bal');
        if (openingBalInput) {
          openingBalInput.value = '$' + parseFloat(ob).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }

        // Update reconciliation card
        if (window.updateReconciliationCard) {
          window.updateReconciliationCard();
        }

      }

      // ALWAYS recalculate after setting gridData
      if (window.recalculateAllBalances) {
        window.recalculateAllBalances();
      }
    }

    // Hide empty state if visible
    const emptyState = document.getElementById('v5-empty-state');
    if (emptyState) emptyState.style.display = 'none';

    // Show control toolbar and ensure visibility
    showControlToolbar();
    if (window.showV5AssignmentBanner) window.showV5AssignmentBanner();

    // SUCCESS: Clear files and stop processing
    // clearV5Files(); // DISABLED: Keep files in memory for Audit/PDF Viewer

  } catch (err) {
    console.error('❌ [V5-V2] parseV5Files Critical Error:', err);
    // Error notification would go here
  } finally {
    V5State.isProcessing = false;
    const progressContainer = document.getElementById('v5-progress-container');
    if (progressContainer) {
      progressContainer.classList.remove('v5-active');
      progressContainer.style.display = 'none';
    }
  }
};

/** Render the Statement Inventory Tray */
window.renderV5Inventory = function () {
  const container = document.getElementById('v5-inventory-items');
  const stats = document.getElementById('v5-inventory-stats');
  if (!container) return;

  const count = V5State.pendingStatements.length;
  if (stats) stats.textContent = `${count} statement${count !== 1 ? 's' : ''} pending`;

  if (count === 0) {
    container.innerHTML = `<div style="padding: 1rem; color: #94a3b8; font-size: 0.8rem; font-style: italic;">No statements uploaded yet...</div>`;
    document.getElementById('v5-inventory-tray')?.classList.remove('v5-active');
    return;
  }

  container.innerHTML = V5State.pendingStatements.map(stmt => `
    <div class="v5-inventory-card" id="card-${stmt.id}">
      <div class="v5-card-top">
        <span class="v5-card-filename" title="${stmt.filename}">${stmt.filename}</span>
        ${stmt.isDuplicate ? '<span class="v5-duplicate-badge">DUPLICATE</span>' : ''}
      </div>
      <div class="v5-card-meta">
        <span class="v5-card-bank">
          <i class="ph ph-bank"></i> ${stmt.bank} • ${stmt.tag}
        </span>
        <span class="v5-card-range">
          ${stmt.dateRange.start} — ${stmt.dateRange.end}
        </span>
      </div>
      <div class="v5-card-actions">
        <button class="btn-inventory btn-inventory-assign" onclick="assignPendingStatement('${stmt.id}')">
          Assign to Account
        </button>
        <button class="btn-inventory btn-inventory-delete" onclick="deletePendingStatement('${stmt.id}')">
          Dismiss
        </button>
      </div>
    </div>
  `).join('');
};

/** Delete a statement from inventory before assignment */
window.deletePendingStatement = function (id) {
  V5State.pendingStatements = V5State.pendingStatements.filter(s => s.id !== id);
  renderV5Inventory();
  console.log(`🗑️ Statement ${id} dismissed from inventory`);
};

/** Assign statement to grid (Account Selector) */
window.assignPendingStatement = function (id) {
  const stmt = V5State.pendingStatements.find(s => s.id === id);
  if (!stmt) return;

  const cats = get5TierCoAAccounts();
  let opts = '<select id="assign-acct-select" style="width:100%;padding:0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:14px;background:white;margin-bottom:1rem"><option value="">Select Target Account...</option>';

  Object.keys(cats).forEach(cat => {
    if (cats[cat].length > 0) {
      opts += `<optgroup label="${cat}">`;
      cats[cat].forEach(a => {
        opts += `<option value="${a.code}">${a.code} - ${a.name}</option>`;
      });
      opts += '</optgroup>';
    }
  });
  opts += '</select>';

  const m = document.createElement('div');
  m.id = 'v5-assign-modal';
  m.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:20000;animation:fadeIn 0.2s;';
  m.innerHTML = `
    <div style="background:white;border-radius:12px;padding:2rem;width:450px;max-width:90vw;box-shadow:0 20px 25px -5px rgba(0,0,0,0.1);">
      <h2 style="margin:0 0 0.5rem 0;font-size:1.25rem;font-weight:700;">Assign Statement</h2>
      <p style="color:#64748b;margin:0 0 1.5rem 0;font-size:0.875rem;">Select which account this statement (<b>${stmt.filename}</b>) belongs to.</p>
      
      <div id="v5-assign-dropdown-group" style="margin-bottom:1rem;">
        <label style="display:block;font-weight:600;margin-bottom:0.5rem;font-size:0.75rem;color:#475569;text-transform:uppercase;">CHART OF ACCOUNTS</label>
        ${opts}
      </div>

      <div id="v5-assign-manual-group" style="display:none;margin-bottom:1rem;">
        <label style="display:block;font-weight:600;margin-bottom:0.5rem;font-size:0.75rem;color:#475569;text-transform:uppercase;">MANUAL ACCOUNT CODE</label>
        <input type="text" id="assign-acct-manual" placeholder="e.g. 1001" style="width:100%;padding:0.75rem;border:1px solid #d1d5db;border-radius:8px;font-size:14px;">
      </div>

      <div style="margin-bottom:1.5rem;">
        <label style="display:inline-flex;align-items:center;gap:8px;font-size:0.875rem;color:#475569;cursor:pointer;">
          <input type="checkbox" onchange="document.getElementById('v5-assign-dropdown-group').style.display = this.checked ? 'none' : 'block'; document.getElementById('v5-assign-manual-group').style.display = this.checked ? 'block' : 'none';">
          Manual Entry (Override COA)
        </label>
      </div>

      <div style="display:flex;gap:12px;justify-content:flex-end;">
        <button onclick="this.closest('#v5-assign-modal').remove()" style="padding:0.625rem 1.25rem;border:1px solid #e2e8f0;background:white;border-radius:8px;cursor:pointer;font-weight:600;color:#64748b;">Cancel</button>
        <button onclick="executeV5Assignment('${stmt.id}')" style="padding:0.625rem 1.25rem;border:none;background:#3b82f6;color:white;border-radius:8px;cursor:pointer;font-weight:600;">Complete Assignment</button>
      </div>
    </div>
  `;
  document.body.appendChild(m);
};

/** Render/Update Account Switcher in toolbar */
window.renderV5LedgerSwitcher = function () {
  const container = document.getElementById('v5-ledger-switcher-container');
  const select = document.getElementById('v5-ledger-select');
  if (!container || !select) return;

  const accounts = Object.keys(V5State.multiLedgerData);
  if (accounts.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'flex';

  const coa = JSON.parse(localStorage.getItem('ab_accounts') || '[]');

  let html = '';
  accounts.forEach(code => {
    const acct = coa.find(a => a.code == code);
    const label = acct ? `${code} - ${acct.name}` : code;
    const selected = code === V5State.currentAccountCode ? 'selected' : '';
    html += `<option value="${code}" ${selected}>${label}</option>`;
  });

  select.innerHTML = html;
};

/** Switch between ledgers */
window.switchV5Ledger = function (accountCode) {
  if (!accountCode || !V5State.multiLedgerData[accountCode]) return;

  console.log(`🔄 Switching to Ledger: ${accountCode}`);

  V5State.currentAccountCode = accountCode;
  V5State.gridData = V5State.multiLedgerData[accountCode];

  // Refresh Grid
  if (V5State.gridApi) {
    V5State.gridApi.setGridOption('rowData', V5State.gridData);
  }

  // Update Breadcrumbs/Header
  const coa = JSON.parse(localStorage.getItem('ab_accounts') || '[]');
  const acct = coa.find(a => a.code == accountCode);

  if (window.updateV5PageHeader) {
    // We don't have the detection object here anymore, so we construct a minimal one
    // or we look into the transactions to find metadata
    const firstTxn = V5State.gridData[0] || {};

    window.updateV5PageHeader({
      brand: firstTxn._brand || firstTxn._bank || 'Unknown Bank',
      subType: acct ? acct.name : (firstTxn._tag || 'Chequing'),
      accountCode: accountCode,
      institutionCode: firstTxn._inst,
      transit: firstTxn._transit,
      accountNumber: firstTxn._acct,
      confidence: 1.0,
      source: 'switch'
    });
  }

  // Persist
  saveData();
};

/** Finalize assignment to ledger */
window.executeV5Assignment = function (stmtId) {
  const select = document.getElementById('assign-acct-select');
  const manual = document.getElementById('assign-acct-manual');
  const accountCode = manual.value.trim() || select.value;

  if (!accountCode) {
    alert('Please select an account or enter a manual code.');
    return;
  }

  const stmt = V5State.pendingStatements.find(s => s.id === stmtId);
  if (!stmt) return;

  // Initialize ledger if new
  if (!V5State.multiLedgerData[accountCode]) {
    V5State.multiLedgerData[accountCode] = [];
  }

  // Add transactions to this ledger
  // Add metadata to transactions if missing
  const txnsWithMeta = stmt.transactions.map(t => ({
    ...t,
    _brand: stmt.bank,
    _bank: stmt.bank,
    _tag: stmt.tag,
    _inst: stmt.institutionCode,
    _transit: stmt.transit,
    _acct: stmt.accountNumber
  }));

  V5State.multiLedgerData[accountCode] = [...V5State.multiLedgerData[accountCode], ...txnsWithMeta];

  // Sort ledger by date
  V5State.multiLedgerData[accountCode].sort((a, b) => new Date(a.Date) - new Date(b.Date));

  // Set as active ledger
  V5State.currentAccountCode = accountCode;
  V5State.gridData = V5State.multiLedgerData[accountCode];

  // Update Ref# sequence
  V5State.gridData.forEach((txn, idx) => {
    txn.refNumber = String(idx + 1).padStart(3, '0');
  });

  // Show action bar and update reconciliation
  const actionBar = document.getElementById('v5-action-bar');
  if (actionBar) {
    actionBar.classList.add('show-data');
    actionBar.style.display = 'flex';
    if (window.updateReconciliationCard) window.updateReconciliationCard();
  }

  // Save State
  saveData();
};

/**
 * Helper to get or create a sub-account for a specific bank statement.
 * Maps (Bank, Transit, AccountNumber) -> Sub-Account Code.
 */
window.getOrCreateSubAccount = function (parentCode, statement) {
  const bank = statement.bank || 'Unknown Bank';
  const transit = statement.transit || '-----';
  const acctNum = statement.accountNumber || '-----';
  const last4 = acctNum.length > 4 ? acctNum.slice(-4) : acctNum;

  // 1. Check existing mappings in localStorage
  const mappings = JSON.parse(localStorage.getItem('v5_subledger_mappings') || '{}');
  const mappingKey = `${bank}_${transit}_${acctNum}`.replace(/\s+/g, '_');

  if (mappings[mappingKey]) {
    console.log(`[SubLedger] Found existing mapping: ${mappingKey} -> ${mappings[mappingKey]}`);
    return mappings[mappingKey];
  }

  // 2. If no mapping, create a new sub-account under parentCode
  console.log(`[SubLedger] Creating new sub-account for ${bank} ...${last4} under parent ${parentCode}`);

  const cats = window.get5TierCoAAccounts();
  const allAccounts = Object.values(cats).flat(); // FLATTEN THE OBJECT INTO A SINGLE ARRAY
  const parentBase = Math.floor(parseInt(parentCode) / 1000) * 1000;

  // Find next available code (parentCode + 1, +2, etc.)
  let nextCode = parseInt(parentCode) + 1;
  while (allAccounts.some(a => (a.code || a.account_number) == String(nextCode))) {
    nextCode++;
  }

  const newAccountName = `${bank} ...${last4}`;
  const newAccount = {
    code: String(nextCode),
    account_number: acctNum, // Store full number for global search
    name: newAccountName,
    type: (allAccounts.find(a => (a.code || a.account_number) == parentCode)?.type || 'asset').toLowerCase(),
    parent_code: parentCode
  };

  // 3. Persist new account to storage
  if (window.storage?.createAccount) {
    window.storage.createAccount(newAccount);
  } else {
    // Fallback if storage service isn't available/ready
    const localCoA = JSON.parse(localStorage.getItem('ab3_accounts') || '[]');
    localCoA.push(newAccount);
    localStorage.setItem('ab3_accounts', JSON.stringify(localCoA));
  }

  // 4. Save mapping
  mappings[mappingKey] = String(nextCode);
  localStorage.setItem('v5_subledger_mappings', JSON.stringify(mappings));

  // 5. Sync to Cloud (Silent)
  if (window.supabaseService && window.supabaseService.isOnline) {
    window.supabaseService.from('subledger_mappings').upsert([{
      key: mappingKey,
      account_code: String(nextCode),
      metadata: { bank, transit, acctNum }
    }]).then(() => console.log('[SubLedger] Synced mapping to cloud'));
  }

  return String(nextCode);
};

/** Complete linkage for all pending statements from banner */
window.v5CompleteAssignment = function () {
  const valInput = document.getElementById('v5-banner-assign-value');
  const selectedCode = valInput?.value;
  if (!selectedCode) {
    alert('Please choose an account to link.');
    return;
  }

  console.log(`🚀 Processing assignment for ${V5State.pendingStatements.length} statements to: ${selectedCode}`);

  // We need to process each statement. 
  // If selectedCode is a "Parent" (multiples of 1000 usually), we create sub-accounts.
  // Otherwise, we just use the selectedCode.

  const isParent = parseInt(selectedCode) % 1000 === 0;

  V5State.pendingStatements.forEach(stmt => {
    let targetCode = selectedCode;

    if (isParent) {
      targetCode = window.getOrCreateSubAccount(selectedCode, stmt);
    }

    console.log(`[Assignment] Statement ${stmt.filename} -> Account ${targetCode}`);

    if (!V5State.multiLedgerData[targetCode]) {
      V5State.multiLedgerData[targetCode] = [];
    }

    // Add transactions from this specific statement to the target ledger
    const txnsWithMeta = stmt.transactions.map(t => {
      const augmented = {
        ...t,
        _brand: stmt.bank,
        _bank: stmt.bank,
        _tag: stmt.tag,
        _inst: stmt.institutionCode,
        _transit: stmt.transit,
        _acct: stmt.accountNumber,
        _parentAcct: isParent ? selectedCode : (allAccounts.find(a => (a.code || a.account_number) == targetCode)?.parent_code || null)
      };
      // Assign the unique "Block Signature"
      augmented._sig = generateTransactionSignature(augmented);
      return augmented;
    });

    V5State.multiLedgerData[targetCode] = [...V5State.multiLedgerData[targetCode], ...txnsWithMeta];

    // Switch to the LAST processed ledger as the current view
    V5State.currentAccountCode = targetCode;

    // Learn this association for future auto-detection
    if (window.bankLearningService && stmt.fingerprint) {
      window.bankLearningService.learn(stmt.fingerprint, {
        brand: stmt.bank,
        accountType: stmt.tag,
        accountCode: targetCode,
        parserName: `${stmt.bank}${stmt.tag}`
      });
      console.log(`[LEARNING] Associated fingerprint with account ${targetCode}`);
    }
  });

  // Sort and Dedupe All Ledgers that were touched (Using Blockchain-style Signatures)
  Object.keys(V5State.multiLedgerData).forEach(code => {
    // 1. Sort by Date
    V5State.multiLedgerData[code].sort((a, b) => new Date(a.Date) - new Date(b.Date));

    // 2. Dedupe using the unique transaction signature
    V5State.multiLedgerData[code] = V5State.multiLedgerData[code].filter((txn, index, self) =>
      index === self.findIndex((t) => (
        (t._sig && t._sig === txn._sig) ||
        (!t._sig && t.Date === txn.Date && t.Payee === txn.Payee && t.Amount === txn.Amount)
      ))
    );
  });

  V5State.pendingStatements = []; // Clear pending
  V5State.gridData = V5State.multiLedgerData[V5State.currentAccountCode] || [];

  // Hide banner
  window.hideV5AssignmentBanner();

  // Update UIs
  renderV5LedgerSwitcher();
  switchV5Ledger(V5State.currentAccountCode);

  saveData();
  console.log(`✅ All statements assigned and processed.`);
};

/** Show assignment modal for specific rows */
window.enterBulkAssignMode = function () {
  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  if (selectedRows.length === 0) return;

  // Show the banner if hidden, or show a simpler modal
  const banner = document.getElementById('v5-assignment-banner');
  if (banner) {
    banner.style.display = 'flex';
    banner.scrollIntoView({ behavior: 'smooth' });
    // Highlight the banner briefly
    banner.style.boxShadow = '0 0 20px rgba(59, 130, 246, 0.4)';
    setTimeout(() => banner.style.boxShadow = '', 2000);
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



// ---------------------------------------------------------
// ACTION MENU LOGIC (Attached to Window for global access)
// ---------------------------------------------------------
if (!document.getElementById('v5-action-menu-styles')) {
  const style = document.createElement('style');
  style.id = 'v5-action-menu-styles';
  style.innerHTML = `
      .kebab-btn { background: transparent; border: none; color: #6B7280; cursor: pointer; padding: 4px; border-radius: 4px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; transition: background 0.15s; width: 28px; height: 28px; }
      .kebab-btn:hover { background: #F3F4F6; color: #111827; }
      
      /* DROPDOWN FIX: Force downward expansion */
      .v5-action-dropdown { 
        position: fixed; 
        z-index: 9999; 
        background: white; 
        border: 1px solid #E5E7EB; 
        border-radius: 8px; 
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); 
        min-width: 180px; 
        display: none; 
        flex-direction: column; 
        padding: 4px 0; 
        animation: fadeIn 0.1s ease-out;
        transform-origin: top !important; /* Force downward appearance */
      }
      
      .v5-action-item { display: flex; align-items: center; gap: 10px; padding: 8px 12px; font-size: 0.9rem; color: #374151; cursor: pointer; transition: background 0.1s; background: none; border: none; width: 100%; text-align: left; }
      .v5-action-item:hover { background: #F9FAFB; }
      .v5-action-item i { font-size: 1.1rem; }
      .v5-action-item.delete { color: #EF4444; }
      .v5-action-item.delete:hover { background: #FEF2F2; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      
      /* Audit Detail Panel Styling */
      .v5-audit-detail { padding: 16px; background: #f8fafc; border-top: 1px solid #e2e8f0; font-size: 0.85rem; border-radius: 0 0 8px 8px; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02); }
      .v5-audit-grid { display: grid; grid-template-columns: 120px 1fr; gap: 8px; margin-bottom: 12px; }
      .v5-audit-label { color: #64748b; font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.025em; font-weight: 600; }
      .v5-audit-value { color: #1e293b; font-family: 'JetBrains Mono', 'Roboto Mono', monospace; }
      
      .v5-audit-crop-container { 
        margin-top: 12px; 
        border: 1px solid #e2e8f0; 
        border-radius: 6px; 
        overflow: hidden; 
        background: white;
        position: relative;
        height: 100px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .v5-audit-crop-canvas { width: 100%; height: auto; image-rendering: high-quality; }
      .v5-audit-crop-loading { position: absolute; color: #94a3b8; font-size: 0.75rem; font-style: italic; }
      
      /* Right Align Header Fix */
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

// Global Toggle Function - Updates for consolidated actions
window.toggleV5ActionMenu = (event, rowId, sourceFileId, fileType, fileName) => {
  if (event && event.stopPropagation) event.stopPropagation();

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
      <button class="v5-action-item" onclick="window.toggleV5Audit('${rowId}'); document.getElementById('v5-action-menu').style.display='none';">
        <i class="ph ph-magnifying-glass" style="color: #8B5CF6;"></i>
        Toggle Audit View
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

/** NEW: Toggle Audit View for Community compatibility */
/** NEW: Toggle Audit View for Community compatibility */
window.toggleV5Audit = (rowId) => {
  if (!V5State.auditModeActiveRowIds) V5State.auditModeActiveRowIds = [];

  if (V5State.auditModeActiveRowIds.includes(rowId)) {
    V5State.auditModeActiveRowIds = V5State.auditModeActiveRowIds.filter(id => id !== rowId);
  } else {
    V5State.auditModeActiveRowIds.push(rowId);
  }

  if (V5State.gridApi) {
    V5State.gridApi.redrawRows();
  }
};

/** [PHASE 4] Render literal crop from source PDF */
window.renderAuditCrop = async (rowId, canvasId, auditData) => {
  if (!auditData || !auditData.page) return;
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  const row = V5State.gridData.find(r => r.id === rowId);
  if (!row || !row.sourceFileName) return;

  const file = (V5State.selectedFiles && V5State.selectedFiles.find(f => f.name === row.sourceFileName)) ||
    (V5State.fileCache && V5State.fileCache.find(f => f.name === row.sourceFileName));

  if (!file) {
    console.warn('⚠️ File for crop not found in memory:', row.sourceFileName);
    return;
  }

  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const page = await pdf.getPage(auditData.page);

    const scale = 3.0; // Increased from 2.0 for larger, sharper crops
    const viewport = page.getViewport({ scale });

    const renderCanvas = document.createElement('canvas');
    renderCanvas.width = viewport.width;
    renderCanvas.height = viewport.height;

    await page.render({
      canvasContext: renderCanvas.getContext('2d'),
      viewport: viewport
    }).promise;

    // Extract slice centered at auditData.y
    // PDF coordinates are bottom-up, Viewport is top-down
    const canvasCtx = canvas.getContext('2d');
    const boxHeight = 150; // Increased from 100 for better visibility
    canvas.width = viewport.width;
    canvas.height = boxHeight * scale;

    // Calculate slice Y in viewport pixels
    const pageHeightPt = page.view[3];
    const yFromBottomPt = auditData.y;
    const yFromTopPt = pageHeightPt - yFromBottomPt;

    const sliceCenterY = yFromTopPt * scale;
    const sliceTop = sliceCenterY - (canvas.height / 2);

    canvasCtx.drawImage(
      renderCanvas,
      0, sliceTop, viewport.width, canvas.height,
      0, 0, viewport.width, canvas.height
    );

    // Clean up ref
    renderCanvas.width = 0;
    renderCanvas.height = 0;

    // Hide loading text
    const loading = canvas.parentElement.querySelector('.v5-audit-crop-loading');
    if (loading) loading.style.display = 'none';

  } catch (err) {
    console.error('Audit Crop Error:', err);
  }
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

// ---------------------------------------------------------
// SMART POPPER LOGIC (Glassmorphism Audit)
// ---------------------------------------------------------

// Inject CSS
const popperStyle = document.createElement('style');
popperStyle.textContent = `
    .v5-smart-popper {
      position: fixed;
      z-index: 10000;
      background: rgba(255, 255, 255, 0.95);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 2px solid rgba(139, 92, 246, 0.3);
      box-shadow: 
        0 4px 6px -1px rgba(0, 0, 0, 0.1), 
        0 2px 4px -1px rgba(0, 0, 0, 0.06),
        0 20px 25px -5px rgba(0, 0, 0, 0.2), 
        0 10px 10px -5px rgba(0, 0, 0, 0.08);
      border-radius: 12px;
      padding: 16px;
      width: 400px;
      max-width: 90vw;
      font-family: 'Inter', sans-serif;
      opacity: 0;
      pointer-events: none;
      transform: translateY(10px) scale(0.98);
      transition: opacity 0.2s cubic-bezier(0.4, 0, 0.2, 1), 
                  transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    
    .v5-smart-popper.visible {
      opacity: 1;
      pointer-events: auto;
      transform: translateY(0) scale(1);
    }

    .v5-smart-popper-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(0,0,0,0.05);
      margin-bottom: 4px;
    }

    .v5-smart-popper-title {
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #64748b;
    }

    .v5-smart-popper-ref {
      font-family: monospace;
      font-size: 0.75rem;
      background: #f1f5f9;
      padding: 2px 6px;
      border-radius: 4px;
      color: #475569;
    }

    .v5-smart-popper-raw {
      font-family: 'JetBrains Mono', 'Fira Code', monospace;
      font-size: 1.04rem;
      color: #1e293b;
      background: rgba(255, 255, 255, 0.6);
      padding: 10px;
      border-radius: 6px;
      border: 1px solid rgba(0,0,0,0.05);
      white-space: pre-wrap;
      word-break: break-word;
      line-height: 1.4;
    }

    .v5-smart-popper-meta {
      display: flex;
      gap: 12px;
      font-size: 0.75rem;
      color: #64748b;
    }

    .v5-smart-popper-pill {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .v5-audit-icon {
      color: #94a3b8;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
      transition: all 0.2s;
      margin-right: 6px;
    }
    
    .v5-audit-icon:hover, .v5-audit-icon.active {
      color: #3b82f6;
      background: rgba(59, 130, 246, 0.1);
    }
  `;
document.head.appendChild(popperStyle);

// Create Global Popper Element
let smartPopper = document.getElementById('v5-smart-popper');
if (!smartPopper) {
  smartPopper = document.createElement('div');
  smartPopper.id = 'v5-smart-popper';
  smartPopper.className = 'v5-smart-popper';
  document.body.appendChild(smartPopper);
}

let popperHideTimer = null;

// Helper: Render Visual Audit Crop
window.renderVisualAudit = async (row, containerId) => {
  const container = document.getElementById(containerId);
  if (!container) return;

  try {
    if (!row.sourceFileName) {
      container.innerHTML = `<div class="v5-smart-popper-loading" style="color:#ef4444;">No source file linked</div>`;
      return;
    }

    // 1. Resolve File
    let file = null;
    if (row.sourceFileBlob) {
      file = row.sourceFileBlob;
    } else if (V5State.selectedFiles || V5State.fileCache) {
      file = (V5State.selectedFiles?.find(f => f.name === row.sourceFileName)) ||
        (V5State.fileCache?.find(f => f.name === row.sourceFileName));
    }

    if (!file) {
      container.innerHTML = `<div class="v5-smart-popper-loading" style="color:#ef4444;">Source file not found in memory</div>`;
      return;
    }

    // 2. Load PDF
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const pageNum = row.audit?.page || 1;
    const page = await pdf.getPage(pageNum);

    // 3. Setup Canvas for High-Res Crop
    const scale = 2.0;
    const viewport = page.getViewport({ scale });

    // 4. Calculate Crop Coordinates
    // audit.y is typically numeric (from PDF parsing)
    // If audit.y is missing, we default to showing the top of the page or specific coordinates
    let cropY = 0;
    let cropHeight = 100 * scale; // Default height

    if (row.audit && typeof row.audit.y === 'number') {
      const pdfY = row.audit.y;
      const auditHeight = row.audit.height || 14;

      // PDF Coordinates: 0,0 is Bottom-Left. Y increases upwards.
      // Canvas Coordinates: 0,0 is Top-Left. Y increases downwards.
      // pdfY is usually the baseline of the text.
      // We want to capture from slightly above the baseline (for ascenders) downwards.

      const padding = 30; // Increased context padding

      // PDF Coordinates: 0,0 is Bottom-Left. Y increases upwards.
      // Text coordinates (y) usually refer to the baseline of the line.
      // For multi-line blocks, we need to capture ABOVE the baseline (upward).
      const topPdf = pdfY + auditHeight + padding;
      const bottomPdf = pdfY - padding;

      // Convert to Canvas Y (Top-Down)
      // Canvas Y = ViewportHeight - (PDF_Y * scale)
      const canvasTop = viewport.height - (topPdf * scale);
      const canvasBottom = viewport.height - (bottomPdf * scale);

      cropY = Math.max(0, canvasTop);
      cropHeight = Math.abs(canvasBottom - canvasTop);
    }

    // 5. Render Full Page to Temp Canvas (Expensive but accurate)
    // Optimization: In real-world, render only the slice if possible, but PDFJS renders whole pages.
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = viewport.width;
    tempCanvas.height = viewport.height;

    await page.render({
      canvasContext: tempCanvas.getContext('2d'),
      viewport: viewport
    }).promise;

    // 6. Draw Crop to Target Canvas
    const finalCanvas = document.createElement('canvas');
    finalCanvas.width = viewport.width; // Keep full width to show context
    finalCanvas.height = cropHeight;

    const ctx = finalCanvas.getContext('2d');
    // Draw background white
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);

    ctx.drawImage(
      tempCanvas,
      0, cropY, viewport.width, cropHeight, // Source
      0, 0, viewport.width, cropHeight      // Dest
    );

    // 7. Output
    container.innerHTML = '';

    // Create a wrapper for zoom
    const zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'v5-audit-zoom-wrapper';
    zoomWrapper.style.cssText = `
      position: relative;
      width: 100%;
      overflow: hidden;
      border-radius: 8px;
      cursor: zoom-in;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
    `;

    finalCanvas.style.width = '100%';
    finalCanvas.style.height = 'auto';
    finalCanvas.style.display = 'block';
    finalCanvas.style.transition = 'transform 0.2s ease-out, transform-origin 0.05s linear';

    zoomWrapper.appendChild(finalCanvas);
    container.appendChild(zoomWrapper);

    // Zoom Logic
    zoomWrapper.onmousemove = (e) => {
      const rect = zoomWrapper.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;

      finalCanvas.style.transformOrigin = `${x}% ${y}%`;
      finalCanvas.style.transform = 'scale(2.5)';
    };

    zoomWrapper.onmouseleave = () => {
      finalCanvas.style.transform = 'scale(1)';
    };

  } catch (err) {
    console.error('Visual Audit Render Error:', err);
    container.innerHTML = `<div class="v5-smart-popper-loading" style="color:#ef4444;">Error rendering audit image</div>`;
  }
};

const gridOptions = {
  pagination: true,
  paginationPageSize: V5State.settings.performance.rowsPerPage,
  rowBuffer: V5State.settings.performance.virtualization ? 10 : 0,
  getRowId: (params) => {
    const data = params.data || {};
    if (data.id) return data.id;
    const idx = V5State.gridData.indexOf(data);
    return 'v5-' + (data.date || 'nodate') + '-' + (data.description || 'nodesc') + '-' + (data.debit || data.credit || 0) + '-' + idx;
  },
  masterDetail: false,
  suppressRowClickSelection: true,
  rowSelection: 'multiple',
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
      width: 80,
      minWidth: 80,
      suppressSizeToFit: true,
      comparator: (a, b) => (parseInt(a) || 0) - (parseInt(b) || 0),
      valueGetter: params => {
        const p = V5State.refPrefix || '';
        const num = String(params.node.rowIndex + 1).padStart(3, '0');
        return p ? p + '-' + num : num;
      },
      cellStyle: { fontWeight: '600', color: '#6B7280' }
    },
    {
      colId: 'date',
      headerName: 'Date',
      field: 'date',
      width: 100,
      minWidth: 100,
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
      flex: 1,
      minWidth: 200,
      editable: true,
      cellEditor: 'agTextCellEditor',
      valueGetter: params => params.data.description || params.data.Description || '',
      cellRenderer: params => {
        const val = params.value || '';
        const rowId = params.node.id;
        const status = params.data.auditStatus;

        let statusIcon = '';
        if (status === 'verified') statusIcon = '<i class="ph-fill ph-check-circle" style="color: #10B981; margin-right: 8px; font-size: 1.1rem;"></i>';
        else if (status === 'flagged') statusIcon = '<i class="ph-fill ph-warning-circle" style="color: #EF4444; margin-right: 8px; font-size: 1.1rem;"></i>';
        else statusIcon = '<i class="ph ph-circle" style="color: #CBD5E1; margin-right: 8px; font-size: 1.1rem;"></i>';

        let content = '<div style="position: relative; width: 100%; min-height: 100%; display: flex; flex-direction: row; align-items: center;" onclick="window.openV5AuditDrawer(\'' + rowId + '\')">';
        content += '<div style="flex-shrink: 0; display: flex; align-items: center;">' + statusIcon + '</div>';
        content += '<div style="flex: 1; min-width: 0; cursor: pointer;">';

        if (val.indexOf(',') === -1) {
          content += '<div style="word-break: break-all; white-space: normal; font-weight: 500;">' + val + '</div>';
        } else {
          const parts = val.split(',');
          content += '<div style="line-height: 1.3; word-break: break-all; white-space: normal;">' +
            '<div style="font-weight: 600;">' + parts[0].trim() + '</div>' +
            '<div style="font-size: 0.85em; color: #6B7280;">' + parts.slice(1).join(',').trim() + '</div>' +
            '</div>';
        }

        content += '</div></div>';
        return content;
      },
      autoHeight: true,
      cellStyle: { 'white-space': 'normal', 'word-break': 'break-all', 'padding-top': '8px', 'padding-bottom': '8px' }
    },
    {
      colId: 'debit',
      headerName: 'Debit',
      field: 'debit',
      width: 100,
      minWidth: 100,
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
        window.recalculateAllBalances?.();
        return true;
      }
    },
    {
      colId: 'credit',
      headerName: 'Credit',
      field: 'credit',
      width: 100,
      minWidth: 100,
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
        window.recalculateAllBalances?.();
        return true;
      }
    },
    {
      colId: 'balance',
      headerName: 'Balance',
      field: 'balance',
      width: 110,
      minWidth: 110,
      suppressSizeToFit: true,
      headerClass: 'ag-right-aligned-header',
      cellStyle: { fontWeight: '700', 'text-align': 'right', 'justify-content': 'flex-end', 'display': 'flex', 'align-items': 'center' },
      valueGetter: params => params.data.balance || params.data.Balance || 0,
      valueFormatter: params => {
        const val = parseFloat(params.value) || 0;
        return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
    },
    {
      colId: 'account',
      headerName: 'Account',
      field: 'account',
      width: 160,
      minWidth: 160,
      suppressSizeToFit: true,
      cellEditor: V5GroupedAccountEditor
    }
  ],
  rowData: V5State.gridData,
  defaultColDef: {
    sortable: true,
    filter: true,
    resizable: true,
    minWidth: 50
  },
  onSortChanged: () => window.recalculateAllBalances?.(),
  onFilterChanged: () => window.recalculateAllBalances?.(),
  onCellValueChanged: (params) => {
    saveData();
    window.recalculateAllBalances?.();
  },
  onGridReady: (params) => {
    V5State.gridApi = params.api;
    params.api.sizeColumnsToFit();
    window.recalculateAllBalances?.();
  }
};

// ============================================
// ACTION HANDLERS
// ============================================

// Keyboard Shortcuts Legend
window.showKeyboardShortcuts = function () {
  const modal = document.createElement('div');
  modal.style.cssText = `
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;
  `;

  modal.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 2rem; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h2 style="margin: 0; font-size: 1.25rem;">⌨️ Keyboard Shortcuts</h2>
                <button onclick="this.closest('#v5-shortcuts-modal').remove()" style="border: none; background: none; font-size: 24px; cursor: pointer; color: #6b7280;">&times;</button>
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
                <strong>Actions:</strong><br>• Click <strong>⇄</strong> to swap Debit/Credit<br>• Click <strong>&times;</strong> to delete row
            </div>
    </div>
  `;

  modal.id = 'v5-shortcuts-modal';
  document.body.appendChild(modal);

  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

  // ESC key to close
  const escHandler = (e) => {
    if (e.key === 'Escape') {
      modal.remove();
      document.removeEventListener('keydown', escHandler);
    }
  };
  document.addEventListener('keydown', escHandler);
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
      ⚠️ Clear All Data ?
    </div >
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
  const controlToolbar = document.getElementById('v5-action-bar');
  if (controlToolbar) {
    controlToolbar.classList.remove('show-data');
    controlToolbar.style.display = 'none';
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
    </div >
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
          color: #0f172a;
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
        if (params.data._refNum) return params.data._refNum;
        // STRICTLY DYNAMIC: Always re-count based on row index to ensure no gaps
        const prefix = V5State.refPrefix || '';
        const num = String(params.node.rowIndex + 1).padStart(3, '0');
        return prefix ? `${prefix}-${num}` : num;
      },
      onCellValueChanged: (params) => {
        console.log('📝 Cell value changed:', params.colDef.field, params.oldValue, '->', params.newValue);
        if (params.colDef.field === 'account') {
          // Sync accountId for balancing logic if needed
          const coa = JSON.parse(localStorage.getItem('ab_accounts') || '[]');
          const found = coa.find(a => a.name === params.newValue);
          if (found) params.data.accountId = found.code;
        }
        saveData();
        window.updateV5BalancingSummary(); // REFRESH TRIAL BALANCE
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

window.printV5Preview = function () {
  const header = document.createElement('div');
  header.className = 'print-statement-header';
  header.style.display = 'none';

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
  window.print();
  setTimeout(() => header.remove(), 100);
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
  // Rename local to avoid collision with global declaration if needed
  const coreSave = async () => {
    // Save to CacheManager (IndexedDB)
    if (window.CacheManager?.saveTransactions) {
      await window.CacheManager.saveTransactions(V5State.gridData);
    }

    // Also save to localStorage as backup
    try {
      const dataToSave = V5State.gridData.map(({ sourceFileBlob, ...rest }) => rest);
      localStorage.setItem('ab_v5_grid_data', JSON.stringify(dataToSave));
      localStorage.setItem('ab_v5_opening_balance', V5State.openingBalance || 0);
      localStorage.setItem('ab_v5_ref_prefix', V5State.refPrefix || '');

      // [PHASE 6] Persist Multi-Ledger State
      const multiLedgerToSave = {};
      Object.keys(V5State.multiLedgerData).forEach(acct => {
        multiLedgerToSave[acct] = V5State.multiLedgerData[acct].map(({ sourceFileBlob, ...rest }) => rest);
      });
      localStorage.setItem('ab_v5_multi_ledger', JSON.stringify(multiLedgerToSave));
      localStorage.setItem('ab_v5_current_account', V5State.currentAccountCode);
    } catch (e) {
      console.warn('Could not save to localStorage:', e);
    }

    // Background sync to Supabase
    if (window.CacheManager?.syncToSupabase) {
      window.CacheManager.syncToSupabase(V5State.gridData);
    }
  };

  await coreSave();
}
// Alias for global access
window.saveDataAsync = saveData;

async function loadData() {
  const cached = await window.CacheManager.getTransactions();

  // [PHASE 6] Restore Multi-Ledger State
  const multiLedgerRaw = localStorage.getItem('ab_v5_multi_ledger');
  if (multiLedgerRaw) {
    try {
      V5State.multiLedgerData = JSON.parse(multiLedgerRaw);
    } catch (e) { console.error('Failed to parse multi-ledger', e); }
  }
  V5State.openingBalance = parseFloat(localStorage.getItem('ab_v5_opening_balance')) || 0;
  V5State.refPrefix = localStorage.getItem('ab_v5_ref_prefix') || '';
  const currentAcct = localStorage.getItem('ab_v5_current_account');
  if (currentAcct) V5State.currentAccountCode = currentAcct;

  if (cached && cached.length > 0) {
    V5State.gridData = cached;
    window.initV5();
    renderV5LedgerSwitcher();
  } else if (V5State.currentAccountCode && V5State.multiLedgerData[V5State.currentAccountCode]) {
    // Fallback to localized ledger if CacheManager empty but multi-ledger exists
    V5State.gridData = V5State.multiLedgerData[V5State.currentAccountCode];
    window.initV5();
    renderV5LedgerSwitcher();
  } else {
    // Show empty state
    const emptyState = document.getElementById('v5-empty-state');
    if (emptyState) emptyState.style.display = 'flex';
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

// Helper to show the toolbar safely - AND ENSURE GRID IS VISIBLE
function showControlToolbar() {
  const toolbar = document.getElementById('v5-action-bar');
  if (toolbar) {
    toolbar.style.display = 'flex'; // Robustness
    toolbar.classList.add('show-data');
    window.renderV5Shortcuts();
    console.log('✅ Control toolbar shown');
  }

  // FORCE GRID INITIALIZATION & VISIBILITY
  // This ensures the grid appears immediately after processing finish
  if (window.V5State.gridData.length > 0) {
    const container = document.getElementById('v5-grid-container');
    const emptyState = document.querySelector('.v5-empty-state-info'); // Correct selector

    if (container) {
      container.style.display = 'block';
      container.style.visibility = 'visible';
    }
    if (emptyState) emptyState.style.display = 'none';

    // Always try to init or refresh grid
    if (!window.V5State.gridApi) {
      console.log('⚡ [Toolbar] Init V5 Grid triggered from showControlToolbar');
      window.initTxnImportV5Grid(); // Use the robust init function
    } else {
      // If API exists, just push data
      console.log('⚡ [Toolbar] Refreshing existing grid with data');
      if (window.V5State.gridApi.setGridOption) {
        window.V5State.gridApi.setGridOption('rowData', window.V5State.gridData);
      } else {
        window.V5State.gridApi.setRowData(window.V5State.gridData);
      }
      requestAnimationFrame(() => window.V5State.gridApi.sizeColumnsToFit());
    }
  }
}

window.initV5 = async function () {
  // PHASE 2: Load settings first
  window.loadV5SettingsFromStorage();
  // CRITICAL: If grid already has data and API exists, skip
  if (window.V5State && window.V5State.gridData && window.V5State.gridData.length > 0) {
    if (V5State.gridApi) {
      console.log('🏁 Grid already has data and API, skipping re-initialization.');
      return;
    } else {
      console.log('🔄 Grid has data but no API, initializing grid...');
      window.initTxnImportV5Grid();
      return;
    }
  }

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
        return tx && tx.date && tx.date !== 'Invalid Date' &&
          typeof tx.date === 'string' && tx.date.match(/^\d{4}-\d{2}-\d{2}$/) &&
          tx.description && tx.description.length < 500;
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

  // Ensure neutral header state on boot if no data is loaded
  updateBrandDisplay(null);
};

// HELPER: Actually apply the data
window.applyV5Restoration = function (restoredData) {
  V5State.gridData = restoredData;

  // [PHASE 6] Restore Multi-Ledger State
  const multiLedgerRaw = localStorage.getItem('ab_v5_multi_ledger');
  if (multiLedgerRaw) {
    try {
      V5State.multiLedgerData = JSON.parse(multiLedgerRaw);
    } catch (e) { }
  }
  V5State.currentAccountCode = localStorage.getItem('ab_v5_current_account');

  // Re-detect account type as it might not be persisted
  if (!V5State.accountType && typeof detectAccountType === 'function') {
    V5State.accountType = detectAccountType(restoredData);
  }

  // Update status header
  if (window.updateV5PageHeader) {
    const firstTxn = restoredData[0] || {};
    const bank = firstTxn._brand || firstTxn._bank || 'Bank Statement';
    window.updateV5PageHeader({
      brand: bank,
      subType: V5State.accountType || 'Chequing',
      accountCode: V5State.currentAccountCode,
      institutionCode: firstTxn._inst,
      transit: firstTxn._transit,
      accountNumber: firstTxn._acct,
      source: 'restoration'
    });
  }

  window.initTxnImportV5Grid();
  renderV5LedgerSwitcher();
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

    // Ensure neutral header state when starting fresh
    updateBrandDisplay(null);
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
        window.initV5();
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

// Expand/Collapse All (AUDIT MODE)
window.expandAllV5 = function () {
  console.log('🔵 [UI] expandAllV5() triggered');
  if (V5State.gridApi) {
    V5State.auditModeActiveRowIds = V5State.gridData.map(r => r.id).filter(id => !!id);
    console.log(`  ✓ IDs to expand: ${V5State.auditModeActiveRowIds.length}`);
    V5State.gridApi.redrawRows();
    console.log('✅ Expanded all inline audits');
  } else {
    console.warn('  ⚠️ gridApi not ready for expandAll');
  }
};

window.collapseAllV5 = function () {
  V5State.auditModeActiveRowIds = [];
  if (V5State.gridApi) V5State.gridApi.redrawRows();
  console.log('✅ Collapsed all inline audits');
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
  // This is now handled by initTxnImportV5Grid
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

/**
 * Breadcrumb Popover Logic
 */
let currentPopoverType = null;

window.showV5Popover = function (type, event) {
  event.stopPropagation();
  const popover = document.getElementById('v5-header-popover');
  const searchInput = popover.querySelector('.v5-popover-search');

  if (currentPopoverType === type && popover.style.display === 'flex') {
    popover.style.display = 'none';
    return;
  }

  currentPopoverType = type;
  window.populateV5Popover(type);

  // Position popover below the clicked item
  // Using fixed coordinates relative to viewport
  const rect = event.currentTarget.getBoundingClientRect();
  popover.style.top = `${rect.bottom + 8}px`;
  popover.style.left = `${rect.left}px`;
  popover.style.display = 'flex';

  searchInput.value = '';
  setTimeout(() => searchInput.focus(), 10);
};

window.populateV5Popover = function (type, filter = '') {
  const list = document.getElementById('v5-popover-list');
  const options = popoverOptions[type];
  const currentVal = document.querySelector(`#v5-breadcrumb-${type} .v5-breadcrumb-label`).dataset.value;

  list.innerHTML = '';
  const filtered = options.filter(opt =>
    opt.label.toLowerCase().includes(filter.toLowerCase()) ||
    opt.value.toLowerCase().includes(filter.toLowerCase())
  );

  filtered.forEach(opt => {
    const div = document.createElement('div');
    div.className = `v5-popover-option ${opt.value === currentVal ? 'selected' : ''}`;

    if (type === 'bank') {
      const logoData = getV5LogoDataURI(opt.value) || getV5LogoDataURI(opt.label);
      div.innerHTML = `<img src="${logoData}" class="v5-popover-logo"> <span>${opt.label}</span>`;
    } else {
      div.innerHTML = `<i class="ph ${opt.icon || 'ph-tag'}"></i> <span>${opt.label}</span>`;
    }

    div.onclick = () => selectV5PopoverOption(type, opt.value, opt.label);
    list.appendChild(div);
  });
};

window.filterV5Popover = function (term) {
  window.populateV5Popover(currentPopoverType, term);
};

window.selectV5PopoverOption = function (type, value, label) {
  const item = document.getElementById(`v5-breadcrumb-${type}`);
  const labelEl = item.querySelector('.v5-breadcrumb-label');

  labelEl.innerText = label;
  labelEl.dataset.value = value;

  // Update Icon/Logo in breadcrumb
  if (type === 'bank') {
    const logoData = getV5LogoDataURI(value) || getV5LogoDataURI(label);
    const img = Object.assign(document.createElement('img'), {
      src: logoData,
      className: 'v5-breadcrumb-logo'
    });
    item.querySelector('i, img')?.replaceWith(img);
  }

  item.classList.remove('v5-auto-detected');

  document.getElementById('v5-header-popover').style.display = 'none';
  console.log(`✅ Selected ${type}: ${value} (${label})`);

  // Trigger onBankTagChange replacement logic
  const brand = document.querySelector('#v5-breadcrumb-bank .v5-breadcrumb-label').dataset.value;
  const tag = document.querySelector('#v5-breadcrumb-tag .v5-breadcrumb-label').dataset.value;

  if (brand && tag) {
    if (window.onBankTagChange) window.onBankTagChange();
    else if (window.updateV5PageHeader) window.updateV5PageHeader({ brand, subType: tag, source: 'manual' });
  }
};

// Close popover when clicking outside
document.addEventListener('click', (e) => {
  const popover = document.getElementById('v5-header-popover');
  if (popover && !popover.contains(e.target)) {
    popover.style.display = 'none';
  }
});

// Main function to update dropdowns and confidence badge
function updateBrandDisplay(detection) {
  const bankItem = document.getElementById('v5-breadcrumb-bank');
  const tagItem = document.getElementById('v5-breadcrumb-tag');
  const status = document.getElementById('v5-status-text');
  const infoLine = document.getElementById('v5-account-info-line');

  if (!bankItem || !tagItem) return;

  // Store detection globally
  window.V5State.currentDetection = detection;
  localStorage.setItem('v5_current_detection', JSON.stringify(detection));

  // PENDING ASSIGNMENT STATE: If we have statements but NO active ledger
  const isPendingAssignment = V5State.pendingStatements.length > 0 && !V5State.currentAccountCode;

  if (!detection || !detection.brand) {
    if (isPendingAssignment) {
      // Show "Pending Assignment" state in breadcrumbs
      const firstStmt = V5State.pendingStatements[0];

      bankItem.style.display = 'flex';
      tagItem.style.display = 'flex';
      document.querySelectorAll('.v5-breadcrumb-separator').forEach(s => s.style.display = 'inline');

      const bankLabelEl = bankItem.querySelector('.v5-breadcrumb-label');
      const tagLabelEl = tagItem.querySelector('.v5-breadcrumb-label');

      // Update Bank Logo
      const logoData = getV5LogoDataURI(firstStmt.bank) || getV5LogoDataURI(firstStmt.brand);
      const existingBankIcon = bankItem.querySelector('i, .v5-breadcrumb-logo');
      if (existingBankIcon) {
        const newLogo = document.createElement('img');
        newLogo.src = logoData;
        newLogo.className = 'v5-breadcrumb-logo';
        existingBankIcon.replaceWith(newLogo);
      }

      bankLabelEl.innerText = firstStmt.bank || 'Unknown Bank';
      tagLabelEl.innerHTML = '<span class="v5-pending-pulse">⚠️ PENDING LINKAGE</span>';

      status.style.display = 'none';
      if (infoLine) infoLine.style.display = 'none';
      return;
    }

    bankItem.style.display = 'none';
    tagItem.style.display = 'none';
    // Use the specific separator class
    document.querySelectorAll('.v5-breadcrumb-separator').forEach(s => s.style.display = 'none');

    status.innerHTML = 'WAITING TO GET STARTED<span class="v5-loading-dots"></span>';
    status.style.display = 'inline-flex';
    if (infoLine) infoLine.style.display = 'none';
    return;
  }

  // Sync Ref# Prefix if detected - Use updateRefPrefix for full sync
  if (detection.prefix && detection.prefix !== V5State.refPrefix) {
    console.log(`🏷️ Auto-setting Ref# prefix from detection: ${detection.prefix}`);
    window.updateRefPrefix(detection.prefix);
  }

  const bankVal = detection.brand;
  const tagVal = detection.subType || detection.accountType || detection.tag;

  const bankOpt = popoverOptions.bank.find(o => o.value === bankVal);
  const tagOpt = popoverOptions.tag.find(o => o.value === tagVal);

  const bankLabelEl = bankItem.querySelector('.v5-breadcrumb-label');
  const tagLabelEl = tagItem.querySelector('.v5-breadcrumb-label');

  // Update Bank Logo
  const logoData = getV5LogoDataURI(bankVal) || getV5LogoDataURI(bankOpt?.label);
  const existingBankIcon = bankItem.querySelector('i, .v5-breadcrumb-logo');
  if (existingBankIcon) {
    const newLogo = Object.assign(document.createElement('img'), {
      src: logoData,
      className: 'v5-breadcrumb-logo'
    });
    existingBankIcon.replaceWith(newLogo);
  }

  // SPECIAL AMEX BRANDING: "American Express / Amex Platinum"
  if (bankVal === 'Amex' || bankVal === 'American Express') {
    bankLabelEl.innerText = 'American Express';
    bankLabelEl.dataset.value = 'American Express';

    const cardType = detection._cardType || detection.tag || detection.subType || 'Amex';
    const tagDisplay = cardType.toLowerCase().includes('amex') ? cardType : `Amex ${cardType}`;

    if (detection.accountCode) {
      tagLabelEl.innerHTML = `<b>${detection.accountCode}</b> - ${tagDisplay}`;
    } else {
      tagLabelEl.innerText = tagDisplay;
    }
    tagLabelEl.dataset.value = cardType;
  } else {
    bankLabelEl.innerText = bankOpt ? bankOpt.label : (bankVal || 'Select Bank');
    bankLabelEl.dataset.value = bankVal || '';

    // Case: User assigned to an account
    if (detection.accountCode) {
      tagLabelEl.innerHTML = `<b>${detection.accountCode}</b> - ${tagVal}`;
    } else {
      tagLabelEl.innerText = tagOpt ? tagOpt.label : (tagVal || 'Select Account');
    }
    tagLabelEl.dataset.value = tagVal || '';
  }

  const isAuto = (detection.source === 'auto_detected' || detection.source === 'auto' || !detection.source);
  if (isAuto) {
    bankItem.classList.add('v5-auto-detected');
    tagItem.classList.add('v5-auto-detected');
  } else {
    bankItem.classList.remove('v5-auto-detected');
    tagItem.classList.remove('v5-auto-detected');
  }

  bankItem.style.display = 'flex';
  tagItem.style.display = 'flex';
  document.querySelectorAll('.v5-breadcrumb-separator').forEach(s => s.style.display = 'inline');
  status.style.display = 'none';

  updateConfidenceBadge(detection.confidence || 0.7, detection.source);

  if (infoLine) {
    const inst = detection.institutionCode || detection.institution_code || detection._inst || '---';
    const transit = detection.transit || detection._transit || '-----';
    const account = detection.accountNumber || detection.account_digits || detection._acct || '-----';

    // DEBUG UI HINT: If transit/account are still placeholders after my "Total Fix", highlight them
    const transitStyle = transit === '-----' ? 'color: #ef4444; font-weight: 800;' : 'font-weight: 700;';
    const accountStyle = account === '-----' ? 'color: #ef4444; font-weight: 800;' : 'font-weight: 700;';

    const isCreditCard = (tagVal && (
      tagVal.toUpperCase().includes('VISA') ||
      tagVal.toUpperCase().includes('MASTERCARD') ||
      tagVal.toUpperCase().includes('CREDIT') ||
      tagVal.toUpperCase().includes('AMEX')
    ));

    if (isCreditCard) {
      // CLEAN UI FOR CREDIT CARDS
      const bankDisplay = (bankVal === 'Amex' || bankVal === 'American Express') ? 'American Express' : bankVal;
      const cardType = detection._cardType || detection.tag || detection.subType || 'Credit Card';
      const tagDisplay = (bankVal === 'Amex' || bankVal === 'American Express') && !cardType.toLowerCase().includes('amex') ? `Amex ${cardType}` : cardType;

      infoLine.innerHTML = `
        <span style="font-weight: 600; color: #334155; opacity: 0.8;">
          <i class="ph ph-credit-card" style="margin-right: 4px;"></i>
          ${bankDisplay} / ${tagDisplay}
        </span>
      `;
    } else {
      // STANDARD UI FOR BANK ACCOUNTS (Chequing/Savings)
      infoLine.innerHTML = `
        <span>INST: <b>${inst}</b></span>
        <span class="sep">|</span>
        <span>TRANSIT: <b style="${transitStyle}">${transit}</b></span>
        <span class="sep">|</span>
        <span>ACCOUNT: <b style="${accountStyle}">${account}</b></span>
      `;
    }
    infoLine.style.display = 'flex';
  }
}

window.updateBrandDisplay = updateBrandDisplay;
window.updateV5PageHeader = updateBrandDisplay;

/** Show the inline assignment banner */
window.showV5AssignmentBanner = function () {
  const banner = document.getElementById('v5-assignment-banner');
  if (!banner) return;

  const count = V5State.pendingStatements.length;
  if (count === 0 && !V5State.currentAccountCode) {
    banner.style.display = 'none';
    return;
  }

  const text = banner.querySelector('.banner-text');
  if (text) {
    if (V5State.currentAccountCode) {
      const coa = JSON.parse(localStorage.getItem('ab_accounts') || '[]');
      const acct = coa.find(a => a.code == V5State.currentAccountCode);
      const name = acct ? acct.name : V5State.currentAccountCode;
      text.innerHTML = `Linked to: <b>${V5State.currentAccountCode} - ${name}</b>. Change link: `;
    } else {
      text.innerHTML = `<b>${count}</b> statement${count !== 1 ? 's' : ''} uploaded. Link to account: `;
    }
  }

  // Replace old select logic with custom dropdown population
  const usedCodes = Object.keys(V5State.multiLedgerData);
  window.populateV5BannerCOA();

  // If we have a current account, update the trigger text
  if (V5State.currentAccountCode) {
    const coa = JSON.parse(localStorage.getItem('ab3_accounts') || localStorage.getItem('ab_chart_of_accounts') || '[]');
    const acct = coa.find(a => (a.code || a.account_number) == V5State.currentAccountCode);
    if (acct) {
      const valInput = document.getElementById('v5-banner-assign-value');
      const triggerText = document.getElementById('v5-banner-coa-selected-text');
      if (valInput) valInput.value = V5State.currentAccountCode;
      if (triggerText) triggerText.textContent = `${acct.code} - ${acct.name} `;
    }
  }

  // Make it ALWAYS visible
  const dropdownGroup = document.getElementById('v5-banner-assign-dropdown-wrapper');
  if (dropdownGroup) {
    dropdownGroup.style.display = 'flex';
  }
  const submitBtn = document.getElementById('btn-complete-assignment');
  if (submitBtn) {
    submitBtn.style.display = 'inline-block';
  }

  // Remove toggle button if it somehow still exists from legacy calls
  document.getElementById('v5-banner-toggle')?.remove();

  banner.style.display = 'flex';
};

/** Supporting functions for the Banner Custom Dropdown */
window.toggleV5BannerCOADropdown = function () {
  const menu = document.getElementById('v5-banner-coa-menu');
  const trigger = document.getElementById('v5-banner-coa-trigger');
  if (!menu || !trigger) return;

  const isOpen = menu.style.display === 'block';
  if (isOpen) {
    menu.style.display = 'none';
    trigger.classList.remove('open');
  } else {
    window.populateV5BannerCOA();
    menu.style.display = 'block';
    trigger.classList.add('open');
    setTimeout(() => menu.querySelector('.coa-search-input')?.focus(), 50);
  }
};

window.populateV5BannerCOA = function (filterText = '') {
  const listContainer = document.getElementById('v5-banner-coa-list');
  if (!listContainer) return;

  const cats = window.get5TierCoAAccounts();
  const usedCodes = Object.keys(V5State.multiLedgerData);
  const coa = JSON.parse(localStorage.getItem('ab3_accounts') || localStorage.getItem('ab_chart_of_accounts') || '[]');
  const lowerFilter = filterText.toLowerCase();

  let html = '';

  // 1. Used Accounts (Active Ledgers)
  const filteredUsed = usedCodes.filter(code => {
    const acct = coa.find(a => (a.code || a.account_number) == code);
    const name = acct ? acct.name : code;
    return `${code} ${name} `.toLowerCase().includes(lowerFilter);
  });

  if (filteredUsed.length > 0) {
    html += `
    <div class="coa-group" data-group="used">
        <div class="coa-group-header expanded" onclick="window.toggleV5BannerCOAGroup('used')">
          <i class="ph ph-caret-right"></i>
          <span>✅ ACTIVE LEDGERS</span>
        </div>
        <div class="coa-group-items expanded" id="v5-banner-coa-group-used">
          ${filteredUsed.map(code => {
      const acct = coa.find(a => (a.code || a.account_number) == code);
      const name = acct ? acct.name : code;
      return `
              <div class="coa-item ${code == V5State.currentAccountCode ? 'selected' : ''}" onclick="window.selectV5BannerCOAAccount('${code}', '${name.replace(/'/g, "\\'")}')">
                ${code} - ${name}
              </div>
            `;
    }).join('')}
        </div>
      </div>
    `;
  }

  // 2. Unused Accounts (5 Categories)
  const tierLabels = {
    ASSETS: 'Assets',
    LIABILITIES: 'Liabilities',
    EQUITY: 'Equity',
    REVENUE: 'Revenue',
    EXPENSES: 'Expenses'
  };

  Object.keys(cats).forEach(tierKey => {
    const unusedInTier = cats[tierKey].filter(a => !usedCodes.includes(a.code));
    const filteredUnused = unusedInTier.filter(a => `${a.code} ${a.name} `.toLowerCase().includes(lowerFilter));

    if (filteredUnused.length > 0) {
      const label = tierLabels[tierKey] || tierKey;
      const isFilterActive = filterText.length > 0;
      html += `
    <div class="coa-group" data-group="${tierKey}">
          <div class="coa-group-header ${isFilterActive ? 'expanded' : ''}" onclick="window.toggleV5BannerCOAGroup('${tierKey}')">
            <i class="ph ph-caret-right"></i>
            <span>${label}</span>
          </div>
          <div class="coa-group-items ${isFilterActive ? 'expanded' : ''}" id="v5-banner-coa-group-${tierKey}">
            ${filteredUnused.map(a => {
        const isParent = parseInt(a.code) % 1000 === 0;
        const style = isParent ? 'font-weight:700; color:#2563eb;' : '';
        const prefix = isParent ? '⚡ ' : '';
        return `
                <div class="coa-item" style="${style}" onclick="window.selectV5BannerCOAAccount('${a.code}', '${a.name.replace(/'/g, "\\'")}')">
                  ${prefix}${a.code} - ${a.name}
                </div>
              `;
      }).join('')}
          </div>
        </div>
    `;
    }
  });

  listContainer.innerHTML = html;
};

window.filterV5BannerCOA = function (val) {
  window.populateV5BannerCOA(val);
};

window.toggleV5BannerCOAGroup = function (groupId) {
  const items = document.getElementById(`v5-banner-coa-group-${groupId}`);
  const header = items?.previousElementSibling;
  if (items && header) {
    items.classList.toggle('expanded');
    header.classList.toggle('expanded');
  }
};

window.selectV5BannerCOAAccount = function (code, name) {
  const valInput = document.getElementById('v5-banner-assign-value');
  const triggerText = document.getElementById('v5-banner-coa-selected-text');
  if (valInput) valInput.value = code;
  if (triggerText) triggerText.textContent = `${code} - ${name} `;

  const menu = document.getElementById('v5-banner-coa-menu');
  const trigger = document.getElementById('v5-banner-coa-trigger');
  if (menu) menu.style.display = 'none';
  if (trigger) trigger.classList.remove('open');
};

/** Hide the assignment banner */
window.hideV5AssignmentBanner = function () {
  const banner = document.getElementById('v5-assignment-banner');
  if (banner) banner.style.display = 'none';
};

/** Grid Linking Trigger */
window.gridLinkingV5 = function () {
  const banner = document.getElementById('v5-assignment-banner');
  if (!banner) return;

  if (banner.style.display === 'flex') {
    banner.style.display = 'none';
  } else {
    window.showV5AssignmentBanner();
  }
};

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
        // Populate initial balancing bar
        window.updateV5BalancingSummary();
      }
    } else {
      updateBrandDisplay(null);
    }
  } catch (e) {
    console.error('❌ Failed to restore header state:', e);
    updateBrandDisplay(null);
  }
};

window.updateV5PageHeader = updateBrandDisplay;
window.updateBrandDisplay = updateBrandDisplay;


/**
 * Update confidence badge text and color
 */
function updateConfidenceBadge(confidence, source) {
  const status = document.getElementById('v5-status-text');
  if (!status) return;

  // HIDE badge completely per user request
  status.style.display = 'none';
}

/**
 * Handle bank/tag dropdown changes
 */
window.onBankTagChange = async function () {
  const bankLabel = document.querySelector('#v5-breadcrumb-bank .v5-breadcrumb-label');
  const tagLabel = document.querySelector('#v5-breadcrumb-tag .v5-breadcrumb-label');

  if (!bankLabel || !tagLabel) return;

  const bank = bankLabel.dataset.value;
  const tag = tagLabel.dataset.value;

  if (!bank || !tag) return;

  console.log('[UI] Breadcrumb selection change detected:', bank, '-', tag);

  // Update V5State and persistence
  const detection = window.V5State.currentDetection || {};
  detection.brand = bank;
  detection.subType = tag;
  detection.source = 'user_override';
  detection.confidence = 1.0;

  window.V5State.currentDetection = detection;
  localStorage.setItem('v5_current_detection', JSON.stringify(detection));

  // Sync Ref# Prefix from signatures if bank changed
  if (window.brandDetector && window.brandDetector.bankSignatures) {
    const sig = window.brandDetector.bankSignatures.find(s => s.id === bank);
    if (sig && sig.prefix) {
      detection.prefix = sig.prefix;
      if (window.updateRefPrefix) window.updateRefPrefix(sig.prefix);
      const refInput = document.getElementById('v5-ref-input');
      if (refInput) refInput.value = sig.prefix;
    }
  }

  // Learn this association
  if (window.bankLearningService && detection.fingerprint) {
    window.bankLearningService.learn(detection.fingerprint, {
      brand: bank,
      accountType: tag,
      parserName: `${bank}${tag} `
    });
    console.log('[LEARNING] Saved user choice');
  }

  // Update confidence badge
  updateConfidenceBadge(1.0, 'user_override');

  // Trigger grid refresh or other updates if needed
  if (window.V5State.gridApi) {
    // maybe refresh cells to show new tag/brand?
  }
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
    html += `< option value = "${desc}" > `;
  });

  datalist.innerHTML = html;
  console.log(`  ✓ Populated autocomplete with ${descriptions.size} unique descriptions`);
}

/** Populate AND Show custom collapsible COA dropdown with ALL accounts */
window.populateGlassCOA = function () {
  console.log('🔵 [BULK] populateGlassCOA()');

  const menuContainer = document.getElementById('coa-dropdown-menu');
  if (!menuContainer) {
    console.error('  ❌ Custom dropdown menu container not found');
    return;
  }

  // CRITICAL: Use exact same data source as grid's Account column dropdown
  const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
  let rawCustom = [];
  try {
    rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]');
  } catch (e) {
    console.warn('  ⚠️ Error loading custom COA:', e);
  }

  const all = [...rawDefault, ...rawCustom];
  console.log(`  📊 Loaded ${rawDefault.length} default + ${rawCustom.length} custom = ${all.length} total accounts`);

  if (all.length === 0) {
    console.error('  ❌ No COA found - please configure Chart of Accounts first');
    alert('No Chart of Accounts found. Please configure your accounts first.');
    return;
  }

  // Group accounts by type (matching getGroupedCoA logic)
  const groups = {
    'ASSETS': [],
    'LIABILITIES': [],
    'EQUITY': [],
    'REVENUE': [],
    'EXPENSES': []
  };

  all.forEach(acc => {
    if (!acc.name || acc.name.toString().toLowerCase().includes("invalid")) return;

    const type = (acc.type || '').toLowerCase();
    const cat = (acc.category || '').toLowerCase();
    const displayName = acc.code ? acc.code + ' - ' + acc.name : acc.name;

    if (type.includes('asset') || cat.includes('asset')) groups['ASSETS'].push(displayName);
    else if (type.includes('liabil') || cat.includes('liabil')) groups['LIABILITIES'].push(displayName);
    else if (type.includes('equity') || cat.includes('equity')) groups['EQUITY'].push(displayName);
    else if (type.includes('revenue') || type.includes('income') || cat.includes('revenue')) groups['REVENUE'].push(displayName);
    else if (type.includes('expense') || cat.includes('expense')) groups['EXPENSES'].push(displayName);
  });

  console.log('  📂 Category breakdown:');
  Object.keys(groups).forEach(groupName => {
    console.log(`    - ${groupName}: ${groups[groupName].length} accounts`);
  });

  // Build custom dropdown HTML with collapsible groups
  let html = '';

  Object.keys(groups).forEach(groupName => {
    const accounts = groups[groupName];
    if (accounts.length === 0) return;

    html += `
    <div class="coa-group" data-group="${groupName}">
        <div class="coa-group-header" onclick="toggleCOAGroup('${groupName}')">
          <span>${groupName}</span>
          <i class="ph ph-caret-down"></i>
        </div>
        <div class="coa-group-items" id="coa-group-${groupName}">
          ${accounts.map(acc => `
            <div class="coa-item" onclick="selectCOAAccount('${acc.replace(/'/g, "\\'")}')">
              ${acc}
            </div>
          `).join('')}
        </div>
      </div>
    `;
  });

  menuContainer.innerHTML = html;
  console.log(`  ✓ Custom dropdown populated with ${all.length} accounts in ${Object.keys(groups).filter(g => groups[g].length > 0).length} groups(all collapsed)`);
};

/** Toggle COA group expand/collapse */
window.toggleCOAGroup = function (groupName) {
  console.log(`🔵[BULK] toggleCOAGroup(${groupName})`);

  const header = document.querySelector(`.coa-group[data-group="${groupName}"] .coa-group-header`);
  const items = document.getElementById(`coa-group-${groupName}`);

  if (!header || !items) return;

  const isExpanded = items.classList.contains('expanded');

  if (isExpanded) {
    // Collapse
    items.classList.remove('expanded');
    header.classList.remove('expanded');
    console.log(`  ▲ Collapsed ${groupName} `);
  } else {
    // Expand
    items.classList.add('expanded');
    header.classList.add('expanded');
    console.log(`  ▼ Expanded ${groupName} `);
  }
};

/** Select a COA account from custom dropdown */
window.selectCOAAccount = function (accountFullName) {
  console.log(`🔵[BULK] selectCOAAccount("${accountFullName}")`);

  // Update trigger text
  const triggerText = document.getElementById('coa-selected-text');
  if (triggerText) {
    triggerText.textContent = accountFullName;
  }

  // Store selection
  window.selectedCOAAccount = accountFullName;

  // Close dropdown
  closeCustomDropdown();

  console.log(`  ✓ Selected: ${accountFullName} `);
};

/** Open/close custom dropdown */
window.toggleCustomDropdown = function () {
  const trigger = document.getElementById('coa-dropdown-trigger');
  const menu = document.getElementById('coa-dropdown-menu');

  if (!trigger || !menu) return;

  const isOpen = menu.style.display === 'block';

  if (isOpen) {
    closeCustomDropdown();
  } else {
    menu.style.display = 'block';
    trigger.classList.add('open');
    console.log('🔵 [BULK] Opened COA dropdown');
  }
};

/** Close custom dropdown */
function closeCustomDropdown() {
  const trigger = document.getElementById('coa-dropdown-trigger');
  const menu = document.getElementById('coa-dropdown-menu');

  if (trigger) trigger.classList.remove('open');
  if (menu) menu.style.display = 'none';
  console.log('🔵 [BULK] Closed COA dropdown');
}

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

  // Reset custom dropdown selection
  window.selectedCOAAccount = null;
  const triggerText = document.getElementById('coa-selected-text');
  if (triggerText) triggerText.textContent = 'Choose account to categorize...';

  // Clear rename inputs
  const findInput = document.getElementById('bulk-find-input');
  const replaceInput = document.getElementById('bulk-replace-input');
  if (findInput) findInput.value = '';
  if (replaceInput) replaceInput.value = '';
};

/** Apply bulk categorize from dropdown selection */
window.applyBulkCategorize = function () {
  console.log('🔵 [BULK] applyBulkCategorize() called');

  // Get selected account from custom dropdown
  const fullAccountName = window.selectedCOAAccount;

  if (!fullAccountName || fullAccountName === 'Choose account to categorize...') {
    alert('Please select an account from the dropdown first.');
    console.warn('  ⚠️ No account selected');
    return;
  }

  console.log(`  📁 Selected account: ${fullAccountName} `);

  const selectedRows = V5State.gridApi?.getSelectedRows() || [];
  console.log(`  📋 Applying to ${selectedRows.length} selected rows`);

  if (selectedRows.length === 0) {
    alert('No rows selected.');
    console.warn('  ⚠️ No rows to apply to');
    return;
  }

  // Show inline confirmation
  enterConfirmMode(
    `Apply "${fullAccountName}" to ${selectedRows.length} transaction(s) ? `,
    () => executeBulkCategorize(fullAccountName, selectedRows)
  );
};

/** Execute bulk categorize after confirmation */
function executeBulkCategorize(fullAccountName, selectedRows) {
  console.log(`  📁 Executing categorize: ${fullAccountName} `);

  // Apply to all selected rows
  selectedRows.forEach((row, idx) => {
    row.account = fullAccountName;
    row.category = fullAccountName.split(' - ')[1] || fullAccountName;
    console.log(`    [${idx + 1}/${selectedRows.length}] Updated row ${row.id}: ${fullAccountName} `);
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

  console.log(`✅[BULK] Successfully applied ${fullAccountName} to ${selectedRows.length} transactions`);
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

  console.log(`  🔍 Find: "${findText}"(blank = rename all)`);
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
    ? `Replace ALL ${selectedRows.length} descriptions with "${replaceText}" ? `
    : `Find & replace "${findText}" in ${selectedRows.length} transaction(s) ? `;

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
        console.log(`    [${idx + 1}/${selectedRows.length}] No match in row ${row.id} `);
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

  console.log(`✅[BULK] Successfully updated ${updatedCount}/${selectedRows.length} descriptions`);
  // Removed alert - confirmation is inline
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
  // Removed alert - confirmation is inline
};


/** Helper to generate Data URI from embedded SVG or path to local icon */
function getV5LogoDataURI(bankKey) {
  if (!bankKey) return getV5LogoDataURI('default');

  // Priority 1: Local PNG Assets
  const localAssets = {
    'TD': 'src/assets/banks/td.png',
    'RBC': 'src/assets/banks/rbc.png',
    'BMO': 'src/assets/banks/bmo.png',
    'CIBC': 'src/assets/banks/cibc.png',
    'Scotiabank': 'src/assets/banks/scotia.png',
    'Tangerine': 'src/assets/banks/tangerine.png',
    'Amex': 'src/assets/banks/amex.png'
  };

  if (localAssets[bankKey]) return localAssets[bankKey];

  // Priority 2: Embedded SVG Fallback
  const svg = V5_BANK_LOGOS[bankKey] || V5_BANK_LOGOS['default'];
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}


/** 
 * DEEP DEBUGGING SUITE 
 * Called via window.debugV5()
 */
window.debugV5 = function () {
  console.group('%c 🕵️ V5 Deep State Debug ', 'background: #3b82f6; color: white; padding: 4px; border-radius: 4px;');

  console.log('📍 Current State:', {
    currentAccountCode: V5State.currentAccountCode,
    gridDataLength: V5State.gridData.length,
    pendingStatements: V5State.pendingStatements.length,
    multiLedgerKeys: Object.keys(V5State.multiLedgerData)
  });

  console.log('🏦 Active Detection:', V5State.currentDetection);

  const tiers = get5TierCoAAccounts();
  const totalAcc = Object.values(tiers).reduce((sum, t) => sum + t.length, 0);
  console.log(`📋 COA Retrieval (${totalAcc} accounts found):`, tiers);

  if (V5State.gridData.length > 0) {
    console.log('🔍 Sample Row:', V5State.gridData[0]);
    const id = V5State.gridData[0].id;
    if (!id) console.error('❌ CRITICAL: Row missing stable ID!');
  }

  console.log('--- Storage Snapshot ---');
  console.log('ab3_accounts:', (localStorage.getItem('ab3_accounts') || '').slice(0, 50) + '...');
  console.log('ab_chart_of_accounts:', (localStorage.getItem('ab_chart_of_accounts') || '').slice(0, 50) + '...');
  console.log('v5_current_detection:', !!localStorage.getItem('v5_current_detection'));

  console.groupEnd();
  return 'Verification complete. Check console logs for details.';
};

/** Force Refresh Chart of Accounts */
window.reinitCOAs = function () {
  console.log('🔄 Manually re-initializing COA...');
  const tiers = get5TierCoAAccounts();
  const count = Object.values(tiers).reduce((a, b) => a + b.length, 0);
  console.log(`✅ Loaded ${count} accounts across 5 tiers.`);

  if (V5State.pendingStatements.length > 0) {
    console.log('📄 Pending statements detected during COA init');
    showV5AssignmentBanner();
  }

  return tiers;
};

// ============================================
// CRITICAL: GRID INITIALIZATION & RE-HYDRATION
// ============================================

// RESTORED GRID OPTIONS (Rescue)
// Use global gridOptions defined at line 7411

window.initTxnImportV5Grid = function () {
  console.group('🚀 [GRID DIAGNOSTIC] Initialization Start');
  console.log('📦 V5State:', window.V5State);
  console.log('📊 Data Length:', window.V5State?.gridData?.length);
  console.log('📚 agGrid Library:', typeof agGrid !== 'undefined' ? 'Found (v' + (agGrid.version || 'unknown') + ')' : 'MISSING!');

  const gridDiv = document.getElementById('v5-grid-container');
  if (!gridDiv) {
    console.error('❌ [Init] Grid container #v5-grid-container NOT FOUND in DOM.');
    console.groupEnd();
    return;
  }

  // DIAGNOSTIC: Check parent visibility
  let parent = gridDiv.parentElement;
  while (parent && parent !== document.body) {
    const style = window.getComputedStyle(parent);
    if (style.display === 'none') {
      console.error(`❌ [Init] Parent <${parent.tagName}> #${parent.id} is hidden with display:none!`, parent);
    }
    if (parseFloat(style.height) === 0 && style.overflow === 'hidden') {
      console.warn(`⚠️ [Init] Parent <${parent.tagName}> #${parent.id} has 0px height and overflow:hidden.`, parent);
    }
    parent = parent.parentElement;
  }

  const containerStyle = window.getComputedStyle(gridDiv);
  console.log('📐 Container Dimensions:', {
    width: gridDiv.offsetWidth,
    height: gridDiv.offsetHeight,
    display: containerStyle.display,
    visibility: containerStyle.visibility,
    opacity: containerStyle.opacity
  });

  // Initialize AG Grid if empty
  // Check if we need to create or recreate the grid
  // A grid instance is "dead" if the API exists but isDestroyed() returns true
  let needsRecreation = false;

  if (gridDiv.innerHTML === '') {
    needsRecreation = true;
    console.log('✨ [Init] Grid container empty, creating new grid...');
  } else if (V5State.gridApi && typeof V5State.gridApi.isDestroyed === 'function' && V5State.gridApi.isDestroyed()) {
    needsRecreation = true;
    console.log('🔄 [Init] Grid instance destroyed, recreating...');
    gridDiv.innerHTML = ''; // Clear old DOM
  } else if (!V5State.gridApi) {
    needsRecreation = true;
    console.log('🔄 [Init] No grid API reference, recreating...');
    gridDiv.innerHTML = ''; // Clear old DOM
  } else {
    console.log('✅ [Init] Grid container populated with active instance.');
  }

  if (needsRecreation) {
    try {
      new agGrid.Grid(gridDiv, gridOptions);
      V5State.gridApi = gridOptions.api;
      if (!V5State.gridApi) {
        console.warn('⚠️ [Init] gridOptions.api not immediately available, checking gridOptions object...');
        V5State.gridApi = gridOptions.api; // Try again as it might be populated after constructor
      }
      console.log('✅ [Init] Grid created successfully');
    } catch (e) {
      console.error('❌ [Init] AG Grid init failed:', e);
    }
  }

  // RE-HYDRATION & VISIBILITY LOGIC
  const gridContainer = document.getElementById('v5-grid-container');
  const emptyStateInfo = document.querySelector('.v5-empty-state-info');

  if (V5State.gridData && V5State.gridData.length > 0) {
    console.log(`♻️ [Init] Restoring ${V5State.gridData.length} rows from V5State persistence...`);

    // VISIBILITY: Show Grid, Hide Empty State
    if (gridContainer) {
      gridContainer.style.display = 'block';
      gridContainer.style.visibility = 'visible';
      gridContainer.style.opacity = '1';

      // FIX: Ensure ag-theme-alpine is present (required for ag-grid styling)
      if (!gridContainer.classList.contains('ag-theme-alpine')) {
        gridContainer.classList.add('ag-theme-alpine');
      }

      // FORCE HEIGHT RESTORATION - Fixed invalid calc syntax and added fallback
      gridContainer.style.height = '600px';
      gridContainer.style.minHeight = '500px';

      console.log('✨ [Init] Grid visibility forced to block/600px');
    }
    if (emptyStateInfo) emptyStateInfo.style.display = 'none';

    // Safety check for API
    if (!V5State.gridApi) {
      console.warn('⚠️ [Init] V5State.gridApi is missing. Attempting to recover from gridOptions...');
      if (gridOptions && gridOptions.api) {
        V5State.gridApi = gridOptions.api;
      } else {
        // [FINAL ATTEMPT] If we have a container, we can try to get the grid from it?
        // But better to just re-init if possible.
        console.error('❌ [Init] Cannot restore data: Grid API not found.');
      }
    }

    if (V5State.gridApi) {
      V5State.gridApi.setGridOption('rowData', V5State.gridData);
      V5State.gridApi.sizeColumnsToFit();
      console.log('📊 [Init] Grid re-hydrated with data, sizeColumnsToFit called.');

      // Forced Visibility Sanity Check
      setTimeout(() => {
        if (gridDiv.offsetHeight < 10) {
          console.warn('⚠️ [Init] Grid still 0px. Forcing hard-coded height/display.');
          gridDiv.style.height = '600px';
          gridDiv.style.display = 'block';
          gridDiv.style.visibility = 'visible';
        }
      }, 500);
    }

    // Restore Data
    try {
      // Use setGridOption for rowData to avoid deprecation warning
      if (V5State.gridApi.setGridOption) {
        V5State.gridApi.setGridOption('rowData', V5State.gridData);
      } else {
        V5State.gridApi.setRowData(V5State.gridData);
      }

      // Restore UI State (e.g. Action Bar)
      setTimeout(() => {
        const actionBar = document.getElementById('v5-action-bar');
        if (actionBar) {
          actionBar.style.display = 'flex';
          actionBar.classList.add('show-data');
        }
        if (window.updateReconciliationCard) window.updateReconciliationCard();

        // Restore columns size - WAIT FOR PAINT
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            if (V5State.gridApi) {
              try {
                // V5State.gridApi.autoSizeAllColumns(); // Can be noisy
                V5State.gridApi.sizeColumnsToFit();
                console.log('✅ [Init] Restoration complete & columns resized.');
              } catch (e) {
                console.warn('⚠️ [Init] Column resize failed:', e);
              }
            }
          });
        });
      }, 50);
    } catch (e) {
      console.error('❌ [Init] Error restoring grid data:', e);
    }
  } else {
    // NO DATA -> Show Empty State, Hide Grid
    console.log('ℹ️ [Init] No cached data found - showing empty state');
    console.log('✨ [Init] Fresh start - waiting for file upload.');

    if (gridContainer) gridContainer.style.display = 'none';
    if (emptyStateInfo) emptyStateInfo.style.display = 'block'; // Or flex, depending on CSS
  }
  console.groupEnd();
};


// Start initialization
window.initV5();

// ============================================
// MODAL PDF VIEWER (Overlay - No Navigation)
// ============================================

// Inject modal HTML into page
(function initPDFModal() {
  if (document.getElementById('v5-pdf-modal')) return; // Already exists

  const modalHTML = `
    <div id="v5-pdf-modal" style="display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.85); z-index:10000; backdrop-filter:blur(4px);">
      <div style="position:absolute; top:20px; right:20px; display:flex; gap:12px; z-index:10001;">
        <button id="v5-pdf-popout-btn" style="background:white; border:none; border-radius:8px; padding:12px 20px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px;">
          <i class="ph ph-arrow-square-out"></i> Popout
        </button>
        <button id="v5-pdf-close-btn" style="background:white; border:none; border-radius:8px; padding:12px 20px; cursor:pointer; font-weight:600; display:flex; align-items:center; gap:8px;">
          <i class="ph ph-x"></i> Close
        </button>
      </div>
      <div id="v5-pdf-modal-content" style="width:90%; height:90%; margin:5vh auto; background:white; border-radius:12px; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
        <!-- PDF viewer content will be rendered here -->
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  // Close button
  document.getElementById('v5-pdf-close-btn').addEventListener('click', () => {
    document.getElementById('v5-pdf-modal').style.display = 'none';
    document.getElementById('v5-pdf-modal-content').innerHTML = ''; // Clear content
  });

  // Popout button
  document.getElementById('v5-pdf-popout-btn').addEventListener('click', () => {
    if (window._currentPDFUrl) {
      window.open(window._currentPDFUrl, 'PDFViewer', 'width=1200,height=900');
      document.getElementById('v5-pdf-close-btn').click();
    }
  });

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const modal = document.getElementById('v5-pdf-modal');
      if (modal && modal.style.display === 'block') {
        document.getElementById('v5-pdf-close-btn').click();
      }
    }
  });
})();

// Override viewSourcePDF to use modal instead of navigation
// ============================================
// AUDIT DRAWER (Right Side Panel)
// ============================================

(function initAuditDrawer() {
  if (document.getElementById('v5-audit-drawer')) return;

  const drawerHTML = `
    <div id="v5-audit-drawer" class="v5-drawer">
      <div class="v5-drawer-header">
        <h2 id="v5-audit-title">Audit Detail</h2>
        <button onclick="window.closeV5AuditDrawer()" class="v5-drawer-close">&times;</button>
      </div>
      <div class="v5-drawer-content">
        <div id="v5-audit-evidence" class="v5-audit-section">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
            <h3>Visual Evidence</h3>
            <button onclick="window.viewSourcePDF(V5State.activeAuditRowId)" class="v5-btn-source-pdf">
              <i class="ph ph-file-pdf"></i> View Source PDF
            </button>
          </div>
          <div id="v5-audit-img-container" class="v5-audit-img-box">
             <div class="v5-audit-placeholder">Select a transaction to view evidence</div>
          </div>
        </div>
        
        <div id="v5-audit-receipt" class="v5-audit-section">
          <h3>Match Receipt / Support</h3>
          <div id="v5-receipt-dropzone" class="v5-receipt-box" ondragover="event.preventDefault()" ondrop="window.handleReceiptDrop(event)">
             <i class="ph ph-upload-simple"></i>
             <span>Drop receipt here or click to upload</span>
             <input type="file" id="v5-receipt-input" style="display:none" onchange="window.handleReceiptFile(this.files[0])">
          </div>
          <div id="v5-matched-receipt-view" style="display:none">
             <!-- Matched receipt will show here -->
          </div>
        </div>

        <div class="v5-audit-section">
          <h3>Raw Extraction</h3>
          <pre id="v5-audit-raw" class="v5-raw-box"></pre>
        </div>

        <div class="v5-audit-section metadata-grid">
           <div>
             <label>Transit</label>
             <span id="v5-meta-transit">-</span>
           </div>
           <div>
             <label>Page</label>
             <span id="v5-meta-page">-</span>
           </div>
           <div>
             <label>Confidence</label>
             <span id="v5-meta-confidence">98%</span>
           </div>
        </div>
      </div>
      <div class="v5-drawer-footer">
        <button onclick="window.verifyActiveRow()" class="v5-btn-verify">Verify (V)</button>
        <button onclick="window.flagActiveRow()" class="v5-btn-flag">Flag (F)</button>
      </div>
    </div>
    <style>
      .v5-drawer {
        position: fixed;
        top: 0;
        right: -450px;
        width: 420px;
        height: 100vh;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(12px);
        box-shadow: -10px 0 30px rgba(0,0,0,0.1);
        z-index: 9000;
        transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        display: flex;
        flex-direction: column;
        border-left: 1px solid rgba(59, 130, 246, 0.2);
      }
      .v5-drawer.open { right: 0; }
      .v5-drawer-header {
        padding: 20px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #eee;
      }
      .v5-drawer-header h2 { margin: 0; font-size: 1.25rem; font-weight: 700; color: #1e293b; }
      .v5-drawer-close { background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #64748b; }
      .v5-drawer-content { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
      .v5-audit-section h3 { margin: 0 0 10px 0; font-size: 0.85rem; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
      .v5-audit-img-box {
        width: 100%;
        min-height: 150px;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        overflow: hidden;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .v5-receipt-box {
        border: 2px dashed #cbd5e1;
        border-radius: 8px;
        padding: 20px;
        text-align: center;
        color: #64748b;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .v5-receipt-box:hover { border-color: #3b82f6; background: rgba(59, 130, 246, 0.05); color: #3b82f6; }
      .v5-raw-box {
        background: #0f172a;
        color: #10b981;
        padding: 12px;
        border-radius: 6px;
        font-family: 'JetBrains Mono', 'Fira Code', monospace;
        font-size: 0.75rem;
        white-space: pre-wrap;
        margin: 0;
      }
      .metadata-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; border-top: 1px solid #eee; padding-top: 15px; }
      .metadata-grid div { display: flex; flex-direction: column; gap: 4px; }
      .metadata-grid label { font-size: 0.7rem; color: #94a3b8; font-weight: 600; }
      .metadata-grid span { font-size: 0.9rem; color: #1e293b; font-weight: 700; }
      .v5-drawer-footer { padding: 20px; border-top: 1px solid #eee; display: flex; gap: 12px; background: #fff; }
      .v5-btn-verify { flex: 1; padding: 12px; background: #10b981; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
      .v5-btn-flag { flex: 1; padding: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
      .v5-btn-verify:hover { background: #059669; }
      .v5-btn-flag:hover { background: #dc2626; }
    </style>
  `;

  document.body.insertAdjacentHTML('beforeend', drawerHTML);

  // Click dropzone to trigger input
  document.getElementById('v5-receipt-dropzone').onclick = () => document.getElementById('v5-receipt-input').click();
})();

window.openV5AuditDrawer = function (rowId) {
  const row = V5State.gridData.find(r => r.id === rowId);
  if (!row) return;

  V5State.activeAuditRowId = rowId;
  const drawer = document.getElementById('v5-audit-drawer');
  drawer.classList.add('open');

  // Update Content
  document.getElementById('v5-audit-title').textContent = row.description?.split(',')[0] || 'Audit Detail';
  document.getElementById('v5-audit-raw').textContent = row.rawText || 'No raw extraction available';
  document.getElementById('v5-meta-transit').textContent = row._transit || '-';
  document.getElementById('v5-meta-page').textContent = row.audit?.page || '-';

  // Trigger Evidence Render
  const imgContainer = document.getElementById('v5-audit-img-container');
  imgContainer.innerHTML = `<div class="v5-loading-dots">Loading Evidence</div>`;
  window.renderVisualAudit(row, 'v5-audit-img-container');

  // Trigger Receipt Render
  window.renderMatchedReceipt(rowId);
};

window.closeV5AuditDrawer = function () {
  document.getElementById('v5-audit-drawer').classList.remove('open');
  V5State.activeAuditRowId = null;
};

window.verifyActiveRow = function () {
  const rowId = V5State.activeAuditRowId;
  const row = V5State.gridData.find(r => r.id === rowId);
  if (row) {
    row.auditStatus = 'verified';
    saveData();
    if (V5State.gridApi) V5State.gridApi.applyTransaction({ update: [row] });
    console.log('✅ Row Verified:', rowId);
  }
  moveToNextAuditRow();
};

window.flagActiveRow = function () {
  const rowId = V5State.activeAuditRowId;
  const row = V5State.gridData.find(r => r.id === rowId);
  if (row) {
    row.auditStatus = 'flagged';
    saveData();
    if (V5State.gridApi) V5State.gridApi.applyTransaction({ update: [row] });
    console.log('🚩 Row Flagged:', rowId);
  }
  moveToNextAuditRow();
};

function moveToNextAuditRow() {
  if (!V5State.gridApi) return;
  const allNodes = [];
  V5State.gridApi.forEachNode(node => allNodes.push(node));
  const currentIndex = allNodes.findIndex(n => n.id === V5State.activeAuditRowId);
  if (currentIndex !== -1 && currentIndex < allNodes.length - 1) {
    const nextNode = allNodes[currentIndex + 1];
    window.openV5AuditDrawer(nextNode.id);
    nextNode.setSelected(true);
    V5State.gridApi.ensureIndexVisible(currentIndex + 1);
  } else {
    window.closeV5AuditDrawer();
  }
}

// Keyboard Listeners for V and F
document.addEventListener('keydown', (e) => {
  const drawer = document.getElementById('v5-audit-drawer');
  if (!drawer || !drawer.classList.contains('open')) return;

  // Ignore if typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

  if (e.key.toLowerCase() === 'v') {
    window.verifyActiveRow();
  } else if (e.key.toLowerCase() === 'f') {
    window.flagActiveRow();
  } else if (e.key === 'Escape') {
    window.closeV5AuditDrawer();
  }
});

window.viewSourcePDF = (rowId) => {
  const row = V5State.gridData.find(r => r.id === rowId);
  if (!row || !row.audit) {
    console.warn('[PDF Modal] No audit data for row:', rowId);
    return;
  }

  const modal = document.getElementById('v5-pdf-modal');
  const contentDiv = document.getElementById('v5-pdf-modal-content');

  // Store URL for popout
  window._currentPDFUrl = `#/txn-import-v5/pdf-viewer?file=${encodeURIComponent(row.sourceFileName)}&page=${row.audit.page}&y=${row.audit.y}`;

  // Render PDF viewer directly in modal (no iframe, no navigation)
  if (window.renderV5PdfViewer) {
    contentDiv.innerHTML = window.renderV5PdfViewer();
    modal.style.display = 'block';

    // Initialize PDF viewer with parameters
    setTimeout(() => {
      if (window.initV5PdfViewer) {
        window.initV5PdfViewer({
          file: row.sourceFileName,
          page: row.audit.page,
          y: row.audit.y,
          height: row.audit.height // Pass calculated height
        });
      }
    }, 100);
  } else {
    console.error('[PDF Modal] renderV5PdfViewer not found');
  }

  console.log('[PDF Modal] Opened:', window._currentPDFUrl);
};

// ============================================
// RECEIPT HANDLING LOGIC
// ============================================

window.handleReceiptDrop = function (e) {
  e.preventDefault();
  const file = e.dataTransfer.files[0];
  if (file) window.handleReceiptFile(file);
};

window.handleReceiptFile = async function (file) {
  const rowId = V5State.activeAuditRowId;
  if (!rowId || !file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64 = e.target.result;
    const row = V5State.gridData.find(r => r.id === rowId);
    if (row) {
      row.receipt = {
        name: file.name,
        type: file.type,
        data: base64,
        timestamp: new Date().toISOString()
      };

      window.renderMatchedReceipt(rowId);
      saveData();

      if (V5State.gridApi) {
        V5State.gridApi.applyTransaction({ update: [row] });
      }
    }
  };
  reader.readAsDataURL(file);
};

window.renderMatchedReceipt = function (rowId) {
  const row = V5State.gridData.find(r => r.id === rowId);
  const matchedView = document.getElementById('v5-matched-receipt-view');
  const dropzone = document.getElementById('v5-receipt-dropzone');

  if (row && row.receipt) {
    dropzone.style.display = 'none';
    matchedView.style.display = 'block';
    matchedView.innerHTML = `
      <div class="v5-receipt-card">
        <div class="v5-receipt-preview">
          ${row.receipt.type.startsWith('image/') ? `<img src="${row.receipt.data}">` : `<i class="ph ph-file-pdf"></i>`}
        </div>
        <div class="v5-receipt-info">
          <span class="v5-receipt-name">${row.receipt.name}</span>
          <button onclick="window.removeReceipt('${rowId}')" title="Remove Match" class="v5-remove-receipt">&times;</button>
        </div>
      </div>
    `;
  } else {
    dropzone.style.display = 'flex';
    matchedView.style.display = 'none';
  }
};

window.removeReceipt = function (rowId) {
  const row = V5State.gridData.find(r => r.id === rowId);
  if (row) {
    delete row.receipt;
    window.renderMatchedReceipt(rowId);
    saveData();
    if (V5State.gridApi) {
      V5State.gridApi.applyTransaction({ update: [row] });
    }
  }
};

// CSS for receipt card
(function initReceiptStyles() {
  const style = document.createElement('style');
  style.textContent = `
        .v5-receipt-card {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .v5-receipt-preview {
            width: 48px;
            height: 48px;
            background: #fff;
            border: 1px solid #eee;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
        }
        .v5-receipt-preview img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        .v5-receipt-preview i {
            font-size: 1.5rem;
            color: #ef4444;
        }
        .v5-receipt-info {
            flex: 1;
            min-width: 0;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .v5-receipt-name {
            font-size: 0.85rem;
            font-weight: 500;
            color: #1e293b;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .v5-remove-receipt {
            background: none;
            border: none;
            font-size: 1.25rem;
            color: #94a3b8;
            cursor: pointer;
            padding: 0 4px;
            line-height: 1;
        }
        .v5-btn-source-pdf {
            background: #f1f5f9;
            border: 1px solid #e2e8f0;
            color: #475569;
            font-size: 0.75rem;
            font-weight: 600;
            padding: 4px 10px;
            border-radius: 6px;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 6px;
            transition: all 0.2s;
        }
        .v5-btn-source-pdf:hover {
            background: #e2e8f0;
            color: #1e293b;
        }
        .v5-btn-source-pdf i {
            font-size: 0.9rem;
            color: #ef4444;
        }
        .v5-remove-receipt:hover { color: #ef4444; }
    `;
  document.head.appendChild(style);
})();
