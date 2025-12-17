// ========================================
// SETTINGS2 ROUTE HANDLERS
// Clean route-based settings implementation
// ========================================

// Helper function to show Settings2 page with specific panel
function showSettings2Panel(panelName) {
    console.log(`⚙️ Loading Settings2 - ${panelName} panel`);

    // Hide all pages
    document.querySelectorAll('[data-page]').forEach(page => {
        page.style.display = 'none';
    });

    // Show Settings2 page
    const settings2Page = document.getElementById('settings2Page');
    if (settings2Page) {
        settings2Page.style.display = 'block';

        // Hide all panels
        document.querySelectorAll('.settings2-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        // Show requested panel
        const targetPanel = document.getElementById(`settings2-panel-${panelName}`);
        if (targetPanel) {
            targetPanel.style.display = 'block';
        }

        // Update sidebar active state
        document.querySelectorAll('.settings2-nav-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.panel === panelName) {
                item.classList.add('active');
            }
        });
    }
}

// Register Settings routes (formerly Settings2, now default)
AppRouter.register('/settings', () => {
    showSettings2Panel('general');
});

AppRouter.register('/settings/appearance', () => {
    showSettings2Panel('appearance');
});

AppRouter.register('/settings/data', () => {
    showSettings2Panel('data');
});

AppRouter.register('/settings/subscription', () => {
    showSettings2Panel('subscription');
});

AppRouter.register('/settings/about', () => {
    showSettings2Panel('about');
});

// Settings2 Event Handlers (initialized after DOM ready)
document.addEventListener('DOMContentLoaded', () => {
    // Font size slider
    const fontSlider = document.getElementById('fontSize2');
    const fontValue = document.getElementById('fontSizeValue2');
    if (fontSlider && fontValue) {
        fontSlider.addEventListener('input', (e) => {
            fontValue.textContent = `${e.target.value}%`;
            document.documentElement.style.setProperty('--font-scale', e.target.value / 100);
            localStorage.setItem('fontSize', e.target.value);
        });
    }

    // Theme selector
    const themeSelect = document.getElementById('theme2');
    if (themeSelect) {
        themeSelect.addEventListener('change', (e) => {
            document.documentElement.setAttribute('data-theme', e.target.value);
            localStorage.setItem('theme', e.target.value);
        });
    }

    // Export data
    const exportBtn = document.getElementById('exportData2');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = {
                transactions: JSON.parse(localStorage.getItem('transactions') || '[]'),
                vendors: JSON.parse(localStorage.getItem('vendors') || '[]'),
                accounts: JSON.parse(localStorage.getItem('chart_of_accounts') || '[]'),
                settings: {
                    companyName: localStorage.getItem('companyName'),
                    fiscalYear: localStorage.getItem('fiscalYear'),
                    theme: localStorage.getItem('theme'),
                    fontSize: localStorage.getItem('fontSize')
                }
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `roboledgers-backup-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        });
    }

    // Clear data
    const clearBtn = document.getElementById('clearData2');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('⚠️ Are you sure you want to delete ALL data? This cannot be undone!')) {
                if (confirm('🛑 FINAL WARNING: This will permanently delete everything!')) {
                    localStorage.clear();
                    location.reload();
                }
            }
        });
    }

    // Company name autosave
    const companyInput = document.getElementById('companyName2');
    if (companyInput) {
        companyInput.value = localStorage.getItem('companyName') || '';
        companyInput.addEventListener('blur', (e) => {
            localStorage.setItem('companyName', e.target.value);
        });
    }

    // Fiscal year autosave
    const fiscalInput = document.getElementById('fiscalYear2');
    if (fiscalInput) {
        fiscalInput.value = localStorage.getItem('fiscalYear') || '';
        fiscalInput.addEventListener('change', (e) => {
            localStorage.setItem('fiscalYear', e.target.value);
        });
    }

    console.log('✅ Settings2 event handlers initialized');
});
