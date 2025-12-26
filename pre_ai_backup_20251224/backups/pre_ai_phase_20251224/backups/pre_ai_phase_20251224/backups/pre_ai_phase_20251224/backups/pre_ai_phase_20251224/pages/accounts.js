/**
 * Chart of Accounts Page - 5-Section Card Layout
 */

// Route function - returns page HTML
window.renderAccounts = function () {
  return `
    <div class="page accounts-page" style="height: 100%; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc;">
      <!-- Fixed Header -->
      <div class="page-header" style="flex-shrink: 0; padding: 24px 32px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 2px rgba(0,0,0,0.02); z-index: 20;">
        <div>
            <h1 style="margin: 0; font-size: 1.5rem; font-weight: 700; color: #1e293b;">Chart of Accounts</h1>
            <div style="color: #64748b; margin-top: 4px; font-size: 0.85rem;">Structure your financial ledger</div>
        </div>
        <div class="header-actions">
            <button class="btn-primary" onclick="addNewAccount()" style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">
                <span style="font-size: 1.1rem;">+</span> Add Account
            </button>
        </div>
      </div>
      
      <!-- Scrollable Content Area -->
      <div class="content-scroll" style="flex-grow: 1; overflow-y: auto; padding: 24px; display: flex; flex-direction: column; gap: 16px;">
         <div id="coa-container" style="max-width: 600px; transition: max-width 0.5s cubic-bezier(0.2, 0.8, 0.2, 1); margin: 0 auto; width: 100%; display: flex; flex-direction: column; gap: 12px;">
            <!-- Content Injected Here -->
            <div style="text-align:center; padding: 40px;"><div class="spinner"></div></div>
         </div>
         <div style="height: 40px;"></div> <!-- Spacer -->
      </div>
    </div>
    
    <script>
      setTimeout(renderCoALists, 50);
    </script>
  `;
};

// Render the 5 Sections manually
window.renderCoALists = function () {
  console.log('📚 Rendering CoA Lists...');
  const container = document.getElementById('coa-container');
  if (!container) return;

  // Load Data
  const rawDefault = window.DEFAULT_CHART_OF_ACCOUNTS || [];
  let rawCustom = [];
  try { rawCustom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }
  let allAccounts = [...rawDefault, ...rawCustom];

  // Fallback if empty
  if (allAccounts.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:#94a3b8;">No accounts found. Use "Import" or checks defaults.</div>';
    return;
  }

  // Sort by Code
  allAccounts.sort((a, b) => (parseInt(a.code) || 0) - (parseInt(b.code) || 0));

  // Group by Type
  const groups = {
    'Asset': [],
    'Liability': [],
    'Equity': [],
    'Revenue': [],
    'Expense': []
  };

  allAccounts.forEach(acc => {
    // Normalize type
    let type = (acc.type || 'other').charAt(0).toUpperCase() + (acc.type || 'other').slice(1);
    if (type === 'Income') type = 'Revenue'; // Normalize
    if (!groups[type]) groups[type] = [];
    groups[type].push(acc);
  });

  // Helper to render a section
  const renderSection = (title, colorClass, accounts) => {
    if (accounts.length === 0) return '';

    const colorMap = {
      'Asset': '#10b981', // Green
      'Liability': '#ef4444', // Red
      'Equity': '#8b5cf6', // Purple
      'Revenue': '#3b82f6', // Blue
      'Expense': '#f59e0b', // Orange (Amber)
    };

    const pluralMap = {
      'Asset': 'Assets',
      'Liability': 'Liabilities',
      'Equity': 'Equities',
      'Revenue': 'Revenues',
      'Expense': 'Expenses'
    };

    const accentColor = colorMap[title] || '#64748b';
    const displayTitle = pluralMap[title] || title + 's';

    return `
        <div class="coa-section" id="section-${title}" style="background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%); border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03); overflow: hidden; transition: all 0.2s;">
            <div class="coa-header" onclick="toggleSection('${title}')" style="background: transparent; padding: 14px 20px; border-bottom: 0px solid #f1f5f9; display: flex; align-items: center; gap: 12px; cursor: pointer; user-select: none;">
                <div style="width: 4px; height: 14px; background: ${accentColor}; border-radius: 2px;"></div>
                <h3 style="margin: 0; font-size: 0.95rem; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; flex: 1;">${displayTitle}</h3>
                <span style="background: rgba(255,255,255,0.8); border: 1px solid #e2e8f0; color: #64748b; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; margin-right: 8px;">${accounts.length}</span>
                <span class="chevron" style="color: #94a3b8; font-size: 0.8rem; transition: transform 0.2s;">▼</span>
            </div>
            <div class="coa-table-container" style="display: none; border-top: 1px solid #e2e8f0; background: white;">
                <table class="uc-table" style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr>
                            <th style="width: 120px; padding: 12px 24px; text-align: left; color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Code</th>
                            <th style="padding: 12px 24px; text-align: left; color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Account Name</th>
                            <th style="width: 200px; padding: 12px 24px; text-align: left; color: #94a3b8; font-size: 0.75rem; font-weight: 600; text-transform: uppercase;">Category</th>
                            <th style="width: 80px;"></th>
                        </tr>
                    </thead>
                    <tbody>
                        ${accounts.map(acc => `
                            <tr style="border-bottom: 1px solid #f1f5f9; transition: background 0.1s;">
                                <td style="padding: 12px 24px; font-family: monospace; font-weight: 600; color: #475569;">${acc.code}</td>
                                <td style="padding: 12px 24px; font-weight: 500; color: #1e293b;">${acc.name.replace(/^\d{4} - /, '')}</td> <!-- Double Clean -->
                                <td style="padding: 12px 24px; color: #64748b; font-size: 0.9rem;">${acc.category || '-'}</td>
                                <td style="padding: 12px 24px; text-align: right;">
                                    <button onclick="window.deleteAccount('${acc.code}', event)" style="opacity: 0.3; cursor: pointer; border: none; background: none; font-size: 1.2rem; color: #ef4444;" onmouseover="this.style.opacity=1" onmouseout="this.style.opacity=0.3">×</button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
        `;
  };

  let html = '';
  // Defined order
  ['Asset', 'Liability', 'Equity', 'Revenue', 'Expense'].forEach(type => {
    html += renderSection(type, '', groups[type] || []);
  });

  container.innerHTML = html;
};

// Accordion Toggle Logic
window.toggleSection = function (id) {
  const allSections = document.querySelectorAll('.coa-section');
  const targetSection = document.getElementById(`section-${id}`);
  const container = document.getElementById('coa-container');

  // Close all others
  allSections.forEach(sec => {
    if (sec !== targetSection) {
      sec.querySelector('.coa-table-container').style.display = 'none';
      sec.querySelector('.chevron').style.transform = 'rotate(0deg)';
    }
  });

  // Toggle target
  const content = targetSection.querySelector('.coa-table-container');
  const chevron = targetSection.querySelector('.chevron');

  if (content.style.display === 'none') {
    content.style.display = 'block';
    chevron.style.transform = 'rotate(180deg)';
  } else {
    content.style.display = 'none';
    chevron.style.transform = 'rotate(0deg)';
  }

  // Dynamic Width Logic: Check if ANY are open
  const isAnyOpen = Array.from(document.querySelectorAll('.coa-table-container')).some(el => el.style.display === 'block');

  if (isAnyOpen) {
    container.style.maxWidth = '1000px';
  } else {
    container.style.maxWidth = '600px';
  }
};

// Global delete function
window.deleteAccount = function (code, event) {
  if (event) event.stopPropagation(); // Prevent accordion toggle
  if (confirm('Delete account ' + code + '? This is a preview. Custom accounts will be removed from local storage.')) {
    // Try to delete from Custom List
    let custom = [];
    try { custom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }

    const initialLen = custom.length;
    custom = custom.filter(a => a.code !== code);

    if (custom.length < initialLen) {
      // It was a custom account
      localStorage.setItem('ab3_custom_coa', JSON.stringify(custom));
      if (window.showToast) window.showToast('Account deleted.', 'success');
      // Re-render
      window.renderCoALists();
    } else {
      alert("Cannot delete system default accounts in this preview.");
    }
  }
}

// --- Add New Account (Ad-Hoc) ---
window.addNewAccount = function () {
  if (!window.ModalService) {
    console.error('ModalService missing');
    return;
  }

  // HTML form for the modal body
  const formHtml = `
      <div style="display: flex; flex-direction: column; gap: 12px;">
         <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Account Code (e.g., 6050)</label>
            <input type="text" id="new-acc-code" class="modal-input" placeholder="####" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
         </div>
         <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Account Name</label>
            <input type="text" id="new-acc-name" class="modal-input" placeholder="e.g., Office Supplies" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px;">
         </div>
         <div>
            <label style="font-weight: 600; font-size: 0.85rem; color: #64748b;">Type</label>
            <select id="new-acc-type" class="modal-input" style="width: 100%; padding: 8px; border: 1px solid #e2e8f0; border-radius: 6px; background:white;">
              <option value="asset">Asset</option>
              <option value="liability">Liability</option>
              <option value="equity">Equity</option>
              <option value="revenue">Revenue</option>
              <option value="expense">Expense</option>
            </select>
         </div>
      </div>
    `;

  // Use ModalService
  window.ModalService.confirm(
    'Add New Account',
    formHtml,
    async () => {
      // On Confirm Logic
      const code = document.getElementById('new-acc-code').value.trim();
      const name = document.getElementById('new-acc-name').value.trim();
      const type = document.getElementById('new-acc-type').value;

      if (!code || !name) {
        if (window.showToast) window.showToast('Code and Name are required.', 'error');
        return;
      }

      // 1. Save to Storage Service (Source of Truth)
      if (window.storage) {
        try {
          await window.storage.createAccount({
            accountNumber: code,
            name: name,
            type: type,
            active: true
          });
          if (window.showToast) window.showToast(`Account ${code} created.`, 'success');
        } catch (e) {
          console.error('Storage create failed', e);
        }
      }

      // 2. Also save to Custom List for Dropdown Helper (Legacy support)
      const newAcc = { code, name, type, category: type };
      let custom = [];
      try { custom = JSON.parse(localStorage.getItem('ab3_custom_coa') || '[]'); } catch (e) { }

      if (!custom.find(a => a.code === code)) {
        custom.push(newAcc);
        localStorage.setItem('ab3_custom_coa', JSON.stringify(custom));
      }

      // Re-render List
      window.renderCoALists();
    },
    'primary'
  );

  // Hack: Change button text
  setTimeout(() => {
    const btn = document.getElementById('global-modal-confirm-btn');
    if (btn) btn.innerText = 'Create Account';
  }, 10);
};
