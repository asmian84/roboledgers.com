// Quick script to handle theme radio buttons
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Handle theme radio buttons  
        const themeRadios = document.querySelectorAll('input[name="theme"]');

        // 1. Read the ACTUAL current theme from the body (set by SettingsManager)
        const currentTheme = document.body.getAttribute('data-theme') || 'arctic-dawn';

        // 2. Sync the Radio Buttons to match reality
        themeRadios.forEach(radio => {
            if (radio.value === currentTheme) {
                radio.checked = true;
            }

            // Listen for user changes
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    const newTheme = e.target.value;
                    console.log('Theme changed via Radio to:', newTheme);

                    // Update DOM
                    document.body.setAttribute('data-theme', newTheme);
                    document.documentElement.setAttribute('data-theme', newTheme);

                    // Update Settings Manager if available
                    if (window.Settings) {
                        Settings.setTheme(newTheme);
                    } else {
                        // Fallback - no longer using localStorage, relying on body attribute set above
                    }
                }
            });
        });
    }, 500); // Wait for SettingsManager to do its job
});
