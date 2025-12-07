// Quick script to handle theme radio buttons
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        // Handle theme radio buttons  
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        const savedTheme = localStorage.getItem('selectedTheme') || 'cyber-night';

        // Set initial theme using data-theme attribute
        document.body.setAttribute('data-theme', savedTheme);

        // Set saved theme as checked
        themeRadios.forEach(radio => {
            if (radio.value === savedTheme) {
                radio.checked = true;
            }

            // Listen for changes
            radio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    console.log('Theme changed to:', e.target.value);
                    // Use data-theme attribute for compatibility with existing CSS
                    document.body.setAttribute('data-theme', e.target.value);
                    localStorage.setItem('selectedTheme', e.target.value);
                }
            });
        });
    }, 100);
});
