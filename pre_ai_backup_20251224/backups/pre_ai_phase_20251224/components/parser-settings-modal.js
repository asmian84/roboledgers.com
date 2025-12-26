/**
 * Parser Settings Modal (MoneyThumb Style)
 * Configure the PDF Import Engine with advanced rules.
 */

// Initialize Global Config from LocalStorage or Default
window.parserConfig = JSON.parse(localStorage.getItem('parserConfig')) || window.PdfImportService.DEFAULT_CONFIG;

function createParserSettingsModal() {
    const modalHTML = `
    <div id="parser-settings-modal" class="modern-modal-overlay" style="display: none; z-index: 10000;">
      <div class="modern-modal-card" style="max-width: 800px; width: 90%;">
        <div class="modern-modal-header">
          <h2>⚙️ Import Settings</h2>
          <button class="modern-modal-close" onclick="closeParserSettings()">×</button>
        </div>

        <div class="settings-tabs">
            <button class="tab-btn active" onclick="switchSettingsTab('cleanup')">Payee Cleanup</button>
            <button class="tab-btn" onclick="switchSettingsTab('strategy')">PDF Strategy</button>
            <button class="tab-btn" onclick="switchSettingsTab('sections')">Section Identification</button>
        </div>

        <div class="modern-modal-body" style="padding: 0; max-height: 60vh; overflow-y: auto;">
            
            <!-- Tab: Cleanup Rules -->
            <div id="tab-cleanup" class="settings-tab-content">
                <div class="settings-group">
                    <h3>Text Filters (Regex)</h3>
                    <div class="checkbox-grid">
                        <label><input type="checkbox" id="rule-removeDates" checked> Remove Dates from Payee</label>
                        <label><input type="checkbox" id="rule-removePhone" checked> Remove Phone Numbers</label>
                        <label><input type="checkbox" id="rule-removeState" checked> Remove State Abbrevs (e.g. " CA")</label>
                        <label><input type="checkbox" id="rule-removeSpecials" checked> Remove Special Characters</label>
                        <label><input type="checkbox" id="rule-removeShort" checked> Remove Short Numbers (< 4 digits)</label>
                    </div>
                </div>
                <div class="settings-group">
                    <h3>Formatting</h3>
                    <label>Text Casing:</label>
                    <select id="rule-casing" class="form-control">
                        <option value="Title">Title Case (Start Case)</option>
                        <option value="UPPER">UPPERCASE</option>
                        <option value="lower">lowercase</option>
                        <option value="Original">Original</option>
                    </select>
                </div>
            </div>

            <!-- Tab: Parsing Strategy -->
            <div id="tab-strategy" class="settings-tab-content" style="display: none;">
                <div class="form-row">
                    <div class="form-group">
                        <label>Account Type</label>
                        <select id="strat-accountType" class="form-control">
                            <option value="Checking">Checking / Bank</option>
                            <option value="CreditCard">Credit Card</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Sign Logic (+/-)</label>
                        <select id="strat-signLogic" class="form-control">
                            <option value="Normal">Normal (Charges are Negative)</option>
                            <option value="Switched">Switched (Charges are Positive)</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Date Format (Read)</label>
                        <select id="strat-dateFormat" class="form-control">
                            <option value="auto">Auto-Detect</option>
                            <option value="MM-DD">MM-DD (US)</option>
                            <option value="DD-MM">DD-MM (International)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Spacing Factor (Layout)</label>
                        <input type="number" id="strat-spacing" class="form-control" value="1.0" step="0.1" min="0.5" max="3.0">
                        <small>Increase if columns are being merged.</small>
                    </div>
                </div>
                <div class="form-group">
                    <label><input type="checkbox" id="strat-multiline" checked> Combine Multiline Descriptions</label>
                </div>
            </div>

            <!-- Tab: Sections -->
            <div id="tab-sections" class="settings-tab-content" style="display: none;">
                <p>Keywords used to identify statement sections.</p>
                <div class="form-group">
                    <label>Credit Keywords (Deposits)</label>
                    <input type="text" id="sect-credits" class="form-control" placeholder="deposits, credits...">
                </div>
                <div class="form-group">
                    <label>Debit Keywords (Withdrawals)</label>
                    <input type="text" id="sect-debits" class="form-control" placeholder="withdrawals, charges...">
                </div>
            </div>

        </div>

        <div class="modern-modal-footer">
            <button class="btn-secondary" onclick="closeParserSettings()">Cancel</button>
            <button class="btn-primary" onclick="saveParserSettings()">💾 Save & Re-Apply</button>
        </div>
      </div>
    </div>
    <style>
        .settings-tabs { display: flex; border-bottom: 1px solid #e2e8f0; background: #f8fafc; padding: 0 20px; }
        .tab-btn { background: none; border: none; padding: 15px 20px; cursor: pointer; border-bottom: 2px solid transparent; font-weight: 500; color: #64748b; }
        .tab-btn.active { border-bottom-color: #3b82f6; color: #3b82f6; }
        .settings-tab-content { padding: 20px; }
        .settings-group { margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9; }
        .settings-group h3 { margin-top: 0; font-size: 1rem; color: #334155; margin-bottom: 12px; }
        .checkbox-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .form-row { display: flex; gap: 20px; margin-bottom: 15px; }
        .form-group { flex: 1; margin-bottom: 15px; }
        .form-group label { display: block; margin-bottom: 6px; font-size: 0.9rem; font-weight: 500; }
        .form-control { width: 100%; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px; }
    </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
}

// Open Modal & Hydrate Form
window.openCleanupSettings = function () {
    if (!document.getElementById('parser-settings-modal')) {
        createParserSettingsModal();
    }
    document.getElementById('parser-settings-modal').style.display = 'flex';
    hydrateSettingsForm();
};

function closeParserSettings() {
    document.getElementById('parser-settings-modal').style.display = 'none';
}

function switchSettingsTab(tabId) {
    document.querySelectorAll('.settings-tab-content').forEach(el => el.style.display = 'none');
    document.getElementById('tab-' + tabId).style.display = 'block';

    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    event.target.classList.add('active');
}

function hydrateSettingsForm() {
    const cfg = window.parserConfig;

    // Cleanup Rules
    document.getElementById('rule-removeDates').checked = cfg.cleaningRules.filters.removeDatesFromPayee;
    document.getElementById('rule-removePhone').checked = cfg.cleaningRules.filters.removePhoneNumbers;
    document.getElementById('rule-removeState').checked = cfg.cleaningRules.filters.removeStateAbbrevs;
    document.getElementById('rule-removeSpecials').checked = cfg.cleaningRules.filters.removeSpecialChars;
    document.getElementById('rule-removeShort').checked = cfg.cleaningRules.filters.removeShortNumbers;
    document.getElementById('rule-casing').value = cfg.cleaningRules.formatting.casing;

    // Strategy
    document.getElementById('strat-accountType').value = cfg.parsingStrategy.accountType;
    document.getElementById('strat-signLogic').value = cfg.parsingStrategy.signLogic;
    document.getElementById('strat-dateFormat').value = cfg.parsingStrategy.dateFormatRead;
    document.getElementById('strat-spacing').value = cfg.parsingStrategy.layout.spacingFactor;
    document.getElementById('strat-multiline').checked = cfg.parsingStrategy.layout.combineMultilineDescriptions;

    // Sections
    document.getElementById('sect-credits').value = cfg.sectionIdentifiers.sections.credits.join(', ');
    document.getElementById('sect-debits').value = cfg.sectionIdentifiers.sections.debits.join(', ');
}

window.saveParserSettings = function () {
    // Read from DOM
    const cfg = window.parserConfig; // Mutate existing object structure

    // Cleanup
    cfg.cleaningRules.filters.removeDatesFromPayee = document.getElementById('rule-removeDates').checked;
    cfg.cleaningRules.filters.removePhoneNumbers = document.getElementById('rule-removePhone').checked;
    cfg.cleaningRules.filters.removeStateAbbrevs = document.getElementById('rule-removeState').checked;
    cfg.cleaningRules.filters.removeSpecialChars = document.getElementById('rule-removeSpecials').checked;
    cfg.cleaningRules.filters.removeShortNumbers = document.getElementById('rule-removeShort').checked;
    cfg.cleaningRules.formatting.casing = document.getElementById('rule-casing').value;

    // Strategy
    cfg.parsingStrategy.accountType = document.getElementById('strat-accountType').value;
    cfg.parsingStrategy.signLogic = document.getElementById('strat-signLogic').value;
    cfg.parsingStrategy.dateFormatRead = document.getElementById('strat-dateFormat').value;
    cfg.parsingStrategy.layout.spacingFactor = parseFloat(document.getElementById('strat-spacing').value);
    cfg.parsingStrategy.layout.combineMultilineDescriptions = document.getElementById('strat-multiline').checked;

    // Sections (Split by comma)
    cfg.sectionIdentifiers.sections.credits = document.getElementById('sect-credits').value.split(',').map(s => s.trim()).filter(Boolean);
    cfg.sectionIdentifiers.sections.debits = document.getElementById('sect-debits').value.split(',').map(s => s.trim()).filter(Boolean);

    // Save
    window.parserConfig = cfg;
    localStorage.setItem('parserConfig', JSON.stringify(cfg));

    closeParserSettings();

    // Trigger Re-Import if file exists (We need to store the file object somewhere to support this...)
    // For now, prompt user. 
    // BUT! csv-import-modal *has* the file, but it's not global. 
    // We can expose a "reprocessCurrentFile()" in csv-import-modal.
    if (window.reprocessCurrentFile) {
        window.reprocessCurrentFile();
    } else {
        alert('Settings saved. Please re-select your PDF to apply changes.');
    }

    // Also, if "Switch Signs" was toggled in main modal, it might conflict, but this source of truth is better.
};
