// Quick script to handle theme radio buttons
document.addEventListener('DOMContentLoaded', () => {
    // Handle theme radio buttons  
    const themeRadios = document.querySelectorAll('input[name="theme"]');
    const savedTheme = localStorage.getItem('selectedTheme') || 'cyber-night';

    // Set initial theme
    document.body.className = savedTheme;

    // Set saved theme as checked
    themeRadios.forEach(radio => {
        if (radio.value === savedTheme) {
            radio.checked = true;
        }

        // Listen for changes
        radio.addEventListener('change', (e) => {
            if (e.target.checked) {
                document.body.className = e.target.value;
                localStorage.setItem('selectedTheme', e.target.value);
            }
        });
    });
});
