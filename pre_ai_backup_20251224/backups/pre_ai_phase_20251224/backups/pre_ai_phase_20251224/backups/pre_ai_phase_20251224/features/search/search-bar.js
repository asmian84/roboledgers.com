/**
 * Header Search Bar
 * Compact search bar in header that opens search modal
 */

class SearchBar {
    constructor() {
        this.searchBar = null;
        this.init();
    }

    init() {
        // Create search bar HTML for header
        const searchBarHTML = `
      <div class="header-search-bar" id="headerSearchBar">
        <span class="search-icon-compact">🔍</span>
        <input 
          type="text" 
          placeholder="Search... (Ctrl+K)" 
          readonly
          id="headerSearchInput"
        />
        <kbd class="search-kbd">Ctrl+K</kbd>
      </div>
    `;

        // Find header and insert search bar
        const header = document.querySelector('header') || document.querySelector('.app-header');
        if (header) {
            // Insert before last child (usually user menu)
            const insertPoint = header.querySelector('.user-menu') || header.lastElementChild;
            if (insertPoint) {
                insertPoint.insertAdjacentHTML('beforebegin', searchBarHTML);
            } else {
                header.insertAdjacentHTML('beforeend', searchBarHTML);
            }
        }

        this.searchBar = document.getElementById('headerSearchBar');
        const input = document.getElementById('headerSearchInput');

        // Click to open modal
        if (this.searchBar) {
            this.searchBar.addEventListener('click', () => {
                window.searchModal?.open();
            });
        }

        // Also make input focusable but open modal instead
        if (input) {
            input.addEventListener('focus', () => {
                window.searchModal?.open();
                input.blur(); // Remove focus from readonly input
            });
        }

        // Register Ctrl+K shortcut
        document.addEventListener('keydown', (e) => {
            // Ctrl+K or Cmd+K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                window.searchModal?.toggle();
            }

            // Forward slash (/) to open search
            if (e.key === '/' && !this.isInputFocused()) {
                e.preventDefault();
                window.searchModal?.open();
            }
        });

        this.injectStyles();
        console.log('🔍 Search Bar loaded');
    }

    isInputFocused() {
        const active = document.activeElement;
        return active && (
            active.tagName === 'INPUT' ||
            active.tagName === 'TEXTAREA' ||
            active.isContentEditable
        );
    }

    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
      .header-search-bar {
        position: relative;
        display: flex;
        align-items: center;
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 6px 12px;
        min-width: 240px;
        cursor: pointer;
        transition: all 0.2s;
        margin: 0 1rem;
      }

      .header-search-bar:hover {
        background: white;
        border-color: #cbd5e1;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .search-icon-compact {
        font-size: 1.1rem;
        margin-right: 8px;
        color: #64748b;
      }

      #headerSearchInput {
        flex: 1;
        border: none;
        background: transparent;
        outline: none;
        font-size: 0.9rem;
        color: #64748b;
        cursor: pointer;
      }

      #headerSearchInput::placeholder {
        color: #94a3b8;
      }

      .search-kbd {
        font-size: 0.75rem;
        padding: 2px 6px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        color: #64748b;
        font-family: system-ui;
        margin-left: 8px;
      }

      /* Responsive: hide on mobile */
      @media (max-width: 768px) {
        .header-search-bar {
          min-width: 40px;
          padding: 6px;
        }
        
        #headerSearchInput,
        .search-kbd {
          display: none;
        }
      }
    `;
        document.head.appendChild(style);
    }
}

// Initialize search bar when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.searchBar = new SearchBar();
    });
} else {
    window.searchBar = new SearchBar();
}

console.log('🔍 Search Bar module loaded');
