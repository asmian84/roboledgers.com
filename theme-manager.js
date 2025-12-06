// Theme Manager for Dark/Light Mode

const ThemeManager = {
    currentTheme: 'dark',

    initialize() {
        // Load saved theme
        const saved = localStorage.getItem('theme') || 'dark';
        this.setTheme(saved, false);

        // Setup toggle button
        const toggleBtn = document.getElementById('themeToggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.toggleTheme();
            });
        }
    },

    setTheme(theme, save = true) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);

        // Update icon
        const icon = document.getElementById('themeIcon');
        if (icon) {
            if (theme === 'light') {
                // Sun icon for light mode
                icon.innerHTML = '<circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>';
            } else {
                // Moon icon for dark mode
                icon.innerHTML = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>';
            }
        }

        if (save) {
            localStorage.setItem('theme', theme);
        }
    },

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    },

    getTheme() {
        return this.currentTheme;
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.initialize();
});
