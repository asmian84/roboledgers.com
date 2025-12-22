/**
 * Keyboard Shortcuts Help Modal
 * Shows all available shortcuts (triggered by ? key)
 */

class ShortcutsModal {
    constructor() {
        this.modal = null;
        this.isOpen = false;
        this.init();
    }

    init() {
        const modalHTML = `
      <div id="shortcutsHelpModal" class="shortcuts-modal" style="display: none;">
        <div class="shortcuts-backdrop"></div>
        <div class="shortcuts-content">
          <div class="shortcuts-header">
            <h2>⌨️ Keyboard Shortcuts</h2>
            <button class="shortcuts-close" title="Close (Esc)">×</button>
          </div>
          
          <div class="shortcuts-body" id="shortcutsBody">
            <!-- Will be populated dynamically -->
          </div>
          
          <div class="shortcuts-footer">
            <span class="shortcuts-hint">Press <kbd>?</kbd> to toggle this help</span>
          </div>
        </div>
      </div>
    `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);

        this.modal = document.getElementById('shortcutsHelpModal');
        this.body = document.getElementById('shortcutsBody');

        // Attach listeners
        this.attachListeners();
        this.injectStyles();

        console.log('⌨️ Shortcuts Help Modal loaded');
    }

    attachListeners() {
        // Close button
        const closeBtn = this.modal.querySelector('.shortcuts-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Backdrop click
        const backdrop = this.modal.querySelector('.shortcuts-backdrop');
        if (backdrop) {
            backdrop.addEventListener('click', () => this.close());
        }

        // Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isOpen) {
                this.close();
            }
        });
    }

    open() {
        this.renderShortcuts();
        this.modal.style.display = 'flex';
        this.isOpen = true;
    }

    close() {
        this.modal.style.display = 'none';
        this.isOpen = false;
    }

    toggle() {
        if (this.isOpen) {
            this.close();
        } else {
            this.open();
        }
    }

    renderShortcuts() {
        if (!window.keyboardManager) {
            this.body.innerHTML = '<div class="shortcuts-empty">Keyboard manager not loaded</div>';
            return;
        }

        const shortcuts = window.keyboardManager.getAllShortcuts();

        // Group shortcuts by category
        const categories = {
            'Search': [],
            'Navigation': [],
            'Actions': [],
            'Import/Export': [],
            'Editing': []
        };

        shortcuts.forEach(shortcut => {
            const desc = shortcut.description.toLowerCase();

            if (desc.includes('search')) {
                categories['Search'].push(shortcut);
            } else if (desc.includes('go to') || desc.includes('navigate')) {
                categories['Navigation'].push(shortcut);
            } else if (desc.includes('new ') || desc.includes('add')) {
                categories['Actions'].push(shortcut);
            } else if (desc.includes('import') || desc.includes('export')) {
                categories['Import/Export'].push(shortcut);
            } else if (desc.includes('undo') || desc.includes('redo')) {
                categories['Editing'].push(shortcut);
            } else {
                categories['Actions'].push(shortcut);
            }
        });

        let html = '';

        for (const [category, items] of Object.entries(categories)) {
            if (items.length === 0) continue;

            html += `
        <div class="shortcuts-category">
          <h3 class="shortcuts-category-title">${category}</h3>
          <div class="shortcuts-list">
            ${items.map(item => `
              <div class="shortcuts-item">
                <div class="shortcuts-keys">
                  ${this.formatKeys(item.keys)}
                </div>
                <div class="shortcuts-description">${item.description}</div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
        }

        this.body.innerHTML = html;
    }

    formatKeys(keysString) {
        // Split by ' then ' for sequences or '+' for combinations
        if (keysString.includes(' then ')) {
            return keysString.split(' then ')
                .map(key => `<kbd>${key.toUpperCase()}</kbd>`)
                .join(' <span class="then-separator">then</span> ');
        } else {
            return keysString.split('+')
                .map(key => `<kbd>${key}</kbd>`)
                .join('<span class="plus-separator">+</span>');
        }
    }

    injectStyles() {
        const style = document.createElement('style');
        style.innerHTML = `
      .shortcuts-modal {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 10002;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .shortcuts-backdrop {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.6);
        backdrop-filter: blur(4px);
      }

      .shortcuts-content {
        position: relative;
        width: 700px;
        max-width: 90vw;
        max-height: 85vh;
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        overflow: hidden;
      }

      .shortcuts-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 1.5rem 2rem;
        border-bottom: 1px solid #e2e8f0;
      }

      .shortcuts-header h2 {
        margin: 0;
        font-size: 1.5rem;
        color: #1e293b;
      }

      .shortcuts-close {
        width: 32px;
        height: 32px;
        border: none;
        background: #f1f5f9;
        border-radius: 6px;
        font-size: 1.5rem;
        color: #64748b;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }

      .shortcuts-close:hover {
        background: #e2e8f0;
        color: #334155;
      }

      .shortcuts-body {
        flex: 1;
        overflow-y: auto;
        padding: 1.5rem 2rem;
      }

      .shortcuts-category {
        margin-bottom: 2rem;
      }

      .shortcuts-category:last-child {
        margin-bottom: 0;
      }

      .shortcuts-category-title {
        font-size: 0.85rem;
        font-weight: 600;
        text-transform: uppercase;
        color: #64748b;
        letter-spacing: 0.5px;
        margin: 0 0 1rem 0;
      }

      .shortcuts-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .shortcuts-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1rem;
        background: #f8fafc;
        border-radius: 6px;
        transition: background 0.15s;
      }

      .shortcuts-item:hover {
        background: #f1f5f9;
      }

      .shortcuts-keys {
        display: flex;
        align-items: center;
        gap: 4px;
        min-width: 180px;
      }

      .shortcuts-keys kbd {
        display: inline-block;
        padding: 4px 8px;
        background: white;
        border: 1px solid #cbd5e1;
        border-radius: 4px;
        font-family: 'Segoe UI', system-ui, sans-serif;
        font-size: 0.85rem;
        font-weight: 500;
        color: #334155;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        min-width: 28px;
        text-align: center;
      }

      .plus-separator,
      .then-separator {
        color: #94a3b8;
        font-size: 0.85rem;
        padding: 0 2px;
      }

      .then-separator {
        font-style: italic;
        padding: 0 6px;
      }

      .shortcuts-description {
        color: #475569;
        font-size: 0.95rem;
      }

      .shortcuts-footer {
        padding: 1rem 2rem;
        border-top: 1px solid #e2e8f0;
        background: #f8fafc;
        text-align: center;
      }

      .shortcuts-hint {
        font-size: 0.9rem;
        color: #64748b;
      }

      .shortcuts-hint kbd {
        display: inline-block;
        padding: 2px 6px;
        background: white;
        border: 1px solid #e2e8f0;
        border-radius: 4px;
        font-family: system-ui;
        font-size: 0.8rem;
        margin: 0 4px;
      }

      .shortcuts-empty {
        text-align: center;
        padding: 3rem;
        color: #94a3b8;
      }

      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
        document.head.appendChild(style);
    }
}

// Initialize shortcuts modal
window.shortcutsModal = new ShortcutsModal();

console.log('⌨️ Shortcuts Help Modal loaded');
