// Settings Manager for UI Customization

const Settings = {
    defaults: {
        companyName: '',
        fontSize: 'medium',
        fontFamily: 'Inter',
        theme: 'arctic-dawn',
        accentColor: 'blue',
        uiScale: '1.0',
        gridTheme: 'default',
        textCase: 'sentence',
        googleApiKey: 'AIzaSyDNWQtND6ISB_LFyoOQbAycGzFdSPFN604',
        googleSearchCx: '61ed0fb52fe154bcf'
    },

    current: {
        theme: 'arctic-dawn',
        companyName: '',
        gridColorScheme: 'rainbow',
        gridFontFamily: 'Arial',
        gridFontSize: 12,
        googleApiKey: 'AIzaSyDNWQtND6ISB_LFyoOQbAycGzFdSPFN604',
        googleSearchCx: '61ed0fb52fe154bcf'
    },

    initialize() {
        // Load settings from storage
        const saved = Storage.loadSettings();
        this.current = { ...this.defaults, ...saved };

        // FORCE MIGRATION: If theme is 'cyber-night' or 'dark', force 'arctic-dawn'
        if (this.current.theme === 'cyber-night' || this.current.theme === 'dark') {
            console.log('🔄 Migrating theme to Arctic Dawn...');
            this.current.theme = 'arctic-dawn';
            this.save();
        }

        this.apply();
        this.updateThemePicker();
        this.bindEvents();
    },

    apply() {
        // Apply font settings
        const root = document.documentElement;

        // Font family
        const fontFamilies = {
            'Inter': "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
            'San Francisco': "-apple-system, BlinkMacSystemFont, 'SF Pro Display', sans-serif",
            'Helvetica': "'Helvetica Neue', Helvetica, Arial, sans-serif",
            'Georgia': "Georgia, 'Times New Roman', serif",
            'Monospace': "'SF Mono', 'Monaco', 'Courier New', monospace"
        };

        root.style.setProperty('--font-family', fontFamilies[this.current.fontFamily] || fontFamilies['Inter']);

        // Font size
        const fontSizes = {
            'small': '0.9',
            'medium': '1.0',
            'large': '1.1',
            'xlarge': '1.2'
        };

        root.style.setProperty('--font-scale', fontSizes[this.current.fontSize] || '1.0');

        // Apply theme
        this.applyTheme();

        // Apply UI Scale
        if (this.current.uiScale) {
            document.body.style.zoom = this.current.uiScale;
        }

        // Apply Appearance Classes
        document.body.classList.remove('grid-theme-vanilla', 'grid-theme-classic', 'grid-theme-ledger', 'grid-theme-postit', 'grid-theme-rainbow');
        if (this.current.gridTheme && this.current.gridTheme !== 'default') {
            document.body.classList.add(`grid-theme-${this.current.gridTheme}`);
        }

        document.body.classList.remove('text-case-uppercase', 'text-case-lowercase', 'text-case-sentence');
        if (this.current.textCase) {
            document.body.classList.add(`text-case-${this.current.textCase}`);
        }

        // Theme colors (for accent color picker - secondary to theme)
        const accentColors = {
            'blue': { hue: 230, sat: 85, light: 55 },
            'purple': { hue: 280, sat: 70, light: 60 },
            'green': { hue: 160, sat: 75, light: 50 },
            'orange': { hue: 25, sat: 90, light: 55 },
            'pink': { hue: 330, sat: 75, light: 60 }
        };

        const accent = accentColors[this.current.accentColor] || accentColors['blue'];
        root.style.setProperty('--primary-hue', accent.hue);
        root.style.setProperty('--primary-sat', accent.sat + '%');
        root.style.setProperty('--primary-light', accent.light + '%');

        // Apply company name if set
        this.updateCompanyName();
    },

    applyTheme() {
        // Set theme data attribute on body AND html (to override legacy ThemeManager)
        const theme = this.current.theme || 'arctic-dawn';
        document.body.setAttribute('data-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    },

    setTheme(themeName) {
        this.current.theme = themeName;
        this.applyTheme();
        this.updateThemePicker();
        Storage.saveSettings(this.current);
    },

    updateThemePicker() {
        // Update active state in theme picker
        const themeOptions = document.querySelectorAll('.theme-option');
        themeOptions.forEach(option => {
            if (option.dataset.theme === this.current.theme) {
                option.classList.add('active');
            } else {
                option.classList.remove('active');
            }
        });
    },

    updateCompanyName() {
        const companyNameEl = document.getElementById('companyName');
        const companyInput = document.getElementById('companyNameInput');

        if (companyNameEl) {
            if (this.current.companyName) {
                companyNameEl.textContent = this.current.companyName;
                companyNameEl.style.display = 'block';
            } else {
                companyNameEl.style.display = 'none';
            }
        }
        if (companyInput) companyInput.value = this.current.companyName || '';

        if (companyInput) companyInput.value = this.current.companyName || '';
    },

    bindEvents() {
        // --- Settings Sidebar Navigation (Scoped to Settings Page) ---
        const settingsSection = document.getElementById('settingsSection');
        if (!settingsSection) return;

        const navItems = settingsSection.querySelectorAll('.settings-nav-item');
        const panels = settingsSection.querySelectorAll('.settings-panel');

        console.log(`🔧 Settings: Found ${navItems.length} nav items and ${panels.length} panels.`);

        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const panelName = item.dataset.panel;
                console.log(`🔧 Settings: Clicked ${panelName}`);

                // 1. Update Active Nav
                navItems.forEach(n => n.classList.remove('active'));
                item.classList.add('active');

                // 2. Show Target Panel
                const targetId = `panel-${panelName}`;
                panels.forEach(p => {
                    if (p.id === targetId) {
                        p.classList.add('active');
                    } else {
                        p.classList.remove('active');
                    }
                });
            });
        });

        // --- Wired Settings Page Buttons ---

        // 1. Vendor Dictionary Manager (VDM)
        const vendorBtn = document.getElementById('settingsVendorDictBtn');
        if (vendorBtn) {
            vendorBtn.addEventListener('click', () => {
                if (window.VendorManager) {
                    VendorManager.showModal();
                } else {
                    console.error('Settings: VendorManager not found');
                }
            });
        }

        // 2. Chart of Accounts (COA/VSM)
        const coaBtn = document.getElementById('settingsAccountsBtn');
        if (coaBtn) {
            coaBtn.addEventListener('click', () => {
                if (window.ChartManager) {
                    ChartManager.showModal();
                } else {
                    console.error('Settings: ChartManager not found');
                }
            });
        }

        // 3. Bank Account Manager (VGI/BAM)
        const bankBtn = document.getElementById('settingsBankAccountsBtn');
        if (bankBtn) {
            bankBtn.addEventListener('click', () => {
                if (window.BankAccountManager) {
                    BankAccountManager.showModal();
                } else {
                    console.error('Settings: BankAccountManager not found');
                }
            });
        }

        // Tab Switching Logic
        const tabs = document.querySelectorAll('.settings-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                // Remove active from all tabs
                tabs.forEach(t => t.classList.remove('active'));
                // Add to clicked
                tab.classList.add('active');

                // Hide all panels
                document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'));

                // Show target panel
                const panelName = tab.getAttribute('data-tab');
                const targetPanel = document.querySelector(`.settings-panel[data-panel="${panelName}"]`);
                if (targetPanel) targetPanel.classList.add('active');
            });
        });

        // Theme Radio Inputs
        const themeInputs = document.querySelectorAll('input[name="theme"]');
        themeInputs.forEach(input => {
            input.addEventListener('change', (e) => {
                this.setTheme(e.target.value);
            });
        });


        // --- Appearance Inputs ---

        // 1. UI Scale
        const scaleSelect = document.getElementById('uiScaleSelect');
        if (scaleSelect) {
            scaleSelect.value = this.current.uiScale || '1.0';
            scaleSelect.addEventListener('change', (e) => {
                this.set('uiScale', e.target.value);
            });
        }

        // 2. Grid Theme
        const gridThemeSelect = document.getElementById('gridThemeSelect');
        if (gridThemeSelect) {
            gridThemeSelect.value = this.current.gridTheme || 'default';
            gridThemeSelect.addEventListener('change', (e) => {
                this.set('gridTheme', e.target.value);
            });
        }

        // 3. Text Case Buttons
        const caseBtns = document.querySelectorAll('.btn-group-item[data-case]');
        caseBtns.forEach(btn => {
            const caseType = btn.dataset.case;
            if (caseType === (this.current.textCase || 'sentence')) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }

            btn.addEventListener('click', () => {
                // UI Toggle
                caseBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Logic
                this.set('textCase', caseType);
            });
        });

    },

    set(key, value) {
        this.current[key] = value;
        this.apply();
        Storage.saveSettings(this.current);
    },

    get(key) {
        return this.current[key];
    },

    save() {
        Storage.saveSettings(this.current);
    }
};

// Expose to window for global access
window.Settings = Settings;
