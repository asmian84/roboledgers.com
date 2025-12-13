// Settings Manager for UI Customization

const Settings = {
    defaults: {
        companyName: '',
        fontSize: 'medium',
        fontFamily: 'Inter',
        theme: 'cyber-night',
        accentColor: 'blue',
        googleApiKey: 'AIzaSyDNWQtND6ISB_LFyoOQbAycGzFdSPFN604',
        googleSearchCx: '61ed0fb52fe154bcf'
    },

    current: {
        theme: 'cyber-night',
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
        // Set theme data attribute on body
        document.body.setAttribute('data-theme', this.current.theme || 'cyber-night');
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
    },

    set(key, value) {
        this.current[key] = value;
        this.apply();
        Storage.saveSettings(this.current);
    },

    get(key) {
        return this.current[key];
    }
};

// Expose to window for global access
window.Settings = Settings;
