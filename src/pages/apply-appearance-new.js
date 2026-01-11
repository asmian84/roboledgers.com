window.applyAppearance = function () {
    const themeDropdown = document.getElementById('v5-theme-dropdown');
    const fontDropdown = document.getElementById('v5-font-dropdown');
    const sizeDropdown = document.getElementById('v5-size-dropdown');

    const theme = themeDropdown ? themeDropdown.value : '';
    const font = fontDropdown ? fontDropdown.value : '';
    const size = sizeDropdown ? sizeDropdown.value : 'm';

    const grid = document.querySelector('.ag-theme-alpine');
    if (!grid) return;

    // Reset to base alpine class
    grid.className = 'ag-theme-alpine';

    // Apply 9 dramatically different color themes using CSS variables
    if (theme === 'dark') {
        grid.style.setProperty('--ag-background-color', '#1e293b');
        grid.style.setProperty('--ag-foreground-color', '#e2e8f0');
        grid.style.setProperty('--ag-header-background-color', '#0f172a');
        grid.style.setProperty('--ag-header-foreground-color', '#ffffff');
        grid.style.setProperty('--ag-odd-row-background-color', '#334155');
    } else if (theme === 'blue') {
        grid.style.setProperty('--ag-background-color', '#eff6ff');
        grid.style.setProperty('--ag-foreground-color', '#1e3a8a');
        grid.style.setProperty('--ag-header-background-color', '#2563eb');
        grid.style.setProperty('--ag-header-foreground-color', '#ffffff');
        grid.style.setProperty('--ag-odd-row-background-color', '#dbeafe');
    } else if (theme === 'green') {
        grid.style.setProperty('--ag-background-color', '#f0fdf4');
        grid.style.setProperty('--ag-foreground-color', '#166534');
        grid.style.setProperty('--ag-header-background-color', '#16a34a');
        grid.style.setProperty('--ag-header-foreground-color', '#ffffff');
        grid.style.setProperty('--ag-odd-row-background-color', '#dcfce7');
    } else if (theme === 'contrast') {
        grid.style.setProperty('--ag-background-color', '#ffffff');
        grid.style.setProperty('--ag-foreground-color', '#000000');
        grid.style.setProperty('--ag-header-background-color', '#000000');
        grid.style.setProperty('--ag-header-foreground-color', '#ffffff');
        grid.style.setProperty('--ag-border-color', '#000000');
        grid.style.setProperty('--ag-odd-row-background-color', '#f5f5f5');
    } else if (theme === 'excel') {
        grid.style.setProperty('--ag-background-color', '#f9fafb');
        grid.style.setProperty('--ag-foreground-color', '#374151');
        grid.style.setProperty('--ag-header-background-color', '#d1d5db');
        grid.style.setProperty('--ag-header-foreground-color', '#1f2937');
        grid.style.setProperty('--ag-border-color', '#9ca3af');
        grid.style.setProperty('--ag-odd-row-background-color', '#ffffff');
    } else if (theme === 'purple') {
        grid.style.setProperty('--ag-background-color', '#faf5ff');
        grid.style.setProperty('--ag-foreground-color', '#6b21a8');
        grid.style.setProperty('--ag-header-background-color', '#9333ea');
        grid.style.setProperty('--ag-header-foreground-color', '#ffffff');
        grid.style.setProperty('--ag-odd-row-background-color', '#f3e8ff');
    } else if (theme === 'orange') {
        grid.style.setProperty('--ag-background-color', '#fff7ed');
        grid.style.setProperty('--ag-foreground-color', '#9a3412');
        grid.style.setProperty('--ag-header-background-color', '#ea580c');
        grid.style.setProperty('--ag-header-foreground-color', '#ffffff');
        grid.style.setProperty('--ag-odd-row-background-color', '#ffedd5');
    } else if (theme === 'teal') {
        grid.style.setProperty('--ag-background-color', '#f0fdfa');
        grid.style.setProperty('--ag-foreground-color', '#115e59');
        grid.style.setProperty('--ag-header-background-color', '#0d9488');
        grid.style.setProperty('--ag-header-foreground-color', '#ffffff');
        grid.style.setProperty('--ag-odd-row-background-color', '#ccfbf1');
    } else {
        // Default - remove all custom properties
        grid.style.removeProperty('--ag-background-color');
        grid.style.removeProperty('--ag-foreground-color');
        grid.style.removeProperty('--ag-header-background-color');
        grid.style.removeProperty('--ag-header-foreground-color');
        grid.style.removeProperty('--ag-border-color');
        grid.style.removeProperty('--ag-odd-row-background-color');
    }

    // Apply 9 dramatically different fonts  
    const fonts = {
        'arial': 'Arial, Helvetica, sans-serif',
        'verdana': 'Verdana, Geneva, sans-serif',
        'georgia': 'Georgia, "Times New Roman", serif',
        'times': '"Times New Roman", Times, serif',
        'courier': '"Courier New", Courier, monospace',
        'trebuchet': '"Trebuchet MS", Helvetica, sans-serif',
        'impact': 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif',
        'comic': '"Comic Sans MS", "Comic Sans", cursive'
    };
    grid.style.fontFamily = fonts[font] || '';

    // Apply size
    const sizes = { xs: '11px', s: '12px', m: '13px', l: '14px', xl: '16px' };
    grid.style.fontSize = sizes[size] || '13px';

    // Save to localStorage
    localStorage.setItem('v5_grid_appearance', JSON.stringify({ theme, font, size }));

    console.log('✅ Appearance applied:', { theme, font, size });
};
