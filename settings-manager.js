// Settings Manager for UI Customization

const Settings = {
    defaults: {
        companyName: '',
        fontSize: 'medium',
        fontFamily: 'Inter',
        theme: 'arctic-dawn',
        accentColor: 'blue',
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
        const btn = document.getElementById('settingsBtn');
        const modal = document.getElementById('settingsModal');
        const closeBtn = document.getElementById('closeSettingsModal');

        if (btn && modal) {
            btn.addEventListener('click', () => {
                modal.classList.add('active'); // Use active class for animation
                modal.style.display = 'flex';
                this.updateThemePicker(); // Refresh UI state
            });
        }

        if (closeBtn && modal) {
            closeBtn.addEventListener('click', () => {
                modal.classList.remove('active');
                modal.style.display = 'none';
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
