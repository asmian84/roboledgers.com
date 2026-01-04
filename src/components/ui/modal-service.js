/**
 * Global Modal Service
 * Replaces native alert/confirm/prompt with modern UI.
 */
window.ModalService = {
  initialized: false,

  init() {
    if (this.initialized) return;

    // Inject Modal DOM
    const modalHTML = `
      <div id="global-modal" class="custom-modal-backdrop" style="display: none;">
        <div class="custom-modal-container">
          <div class="custom-modal-header">
            <h3 id="global-modal-title">Title</h3>
            <button class="custom-modal-close" onclick="ModalService.close()">&times;</button>
          </div>
          <div class="custom-modal-body" id="global-modal-body">
            <!-- Content -->
          </div>
          <div class="custom-modal-footer" id="global-modal-footer">
            <!-- Buttons -->
          </div>
        </div>
      </div>
      <style>
        .custom-modal-backdrop {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          z-index: 99999;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.2s ease-out;
        }
        .custom-modal-container {
          background: white;
          width: 90%;
          max-width: 500px;
          border-radius: 12px;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
          overflow: hidden;
          animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .custom-modal-header {
          padding: 1.25rem 1.5rem;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f8fafc;
        }
        .custom-modal-header h3 {
          margin: 0;
          font-size: 1.1rem;
          color: #1e293b;
          font-weight: 600;
        }
        .custom-modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: #64748b;
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .custom-modal-body {
          padding: 1.5rem;
          color: #334155;
          font-size: 0.95rem;
          line-height: 1.5;
        }
        .custom-modal-footer {
          padding: 1rem 1.5rem;
          background: #f8fafc;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: flex-end;
          gap: 12px;
        }
        .btn-modal {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          border: 1px solid transparent;
        }
        .btn-modal-cancel {
          background: white;
          border-color: #cbd5e1;
          color: #475569;
        }
        .btn-modal-cancel:hover { background: #f1f5f9; }
        .btn-modal-primary {
          background: #3b82f6;
          color: white;
        }
        .btn-modal-primary:hover { background: #2563eb; }
        .btn-modal-danger {
          background: #ef4444;
          color: white;
        }
        .btn-modal-danger:hover { background: #dc2626; }
        
        .modal-input {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          font-size: 1rem;
          margin-top: 0.5rem;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      </style>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);
    this.modal = document.getElementById('global-modal');
    this.titleCtx = document.getElementById('global-modal-title');
    this.bodyCtx = document.getElementById('global-modal-body');
    this.footerCtx = document.getElementById('global-modal-footer');

    this.initialized = true;
    console.log('✅ ModalService initialized');
  },

  close() {
    if (this.modal) this.modal.style.display = 'none';
  },

  /**
   * Show a confirmation dialog
   * @param {string} title 
   * @param {string} message 
   * @param {Function} onConfirm - Callback if confirmed
   * @param {string} type - 'primary' or 'danger'
   */
  confirm(title, message, onConfirm, type = 'primary') {
    if (!this.initialized) this.init();

    this.titleCtx.innerText = title;
    this.bodyCtx.innerHTML = `<p>${message}</p>`;

    const confirmBtnClass = type === 'danger' ? 'btn-modal-danger' : 'btn-modal-primary';
    const confirmLabel = type === 'danger' ? 'Yes, Delete' : 'Confirm';

    this.footerCtx.innerHTML = `
      <button class="btn-modal btn-modal-cancel" onclick="ModalService.close()">Cancel</button>
      <button class="btn-modal ${confirmBtnClass}" id="global-modal-confirm-btn">${confirmLabel}</button>
    `;

    document.getElementById('global-modal-confirm-btn').onclick = () => {
      this.close();
      if (onConfirm) onConfirm();
    };

    this.modal.style.display = 'flex';
  },

  /**
   * Show a prompt with an input field
   * @param {string} title 
   * @param {string} label 
   * @param {string} defaultValue 
   * @param {Function} onConfirm - Callback(value)
   */
  prompt(title, label, defaultValue = '', onConfirm) {
    if (!this.initialized) this.init();

    this.titleCtx.innerText = title;
    this.bodyCtx.innerHTML = `
      <label style="display:block; margin-bottom: 4px; font-weight: 500;">${label}</label>
      <input type="text" class="modal-input" id="global-modal-input" value="${defaultValue}" autocomplete="off">
    `;

    this.footerCtx.innerHTML = `
      <button class="btn-modal btn-modal-cancel" onclick="ModalService.close()">Cancel</button>
      <button class="btn-modal btn-modal-primary" id="global-modal-submit-btn">Submit</button>
    `;

    const input = document.getElementById('global-modal-input');

    // Auto-focus input
    setTimeout(() => {
      input.focus();
      input.select();
    }, 100);

    const submit = () => {
      const val = input.value;
      if (val) {
        this.close();
        onConfirm(val);
      }
    };

    document.getElementById('global-modal-submit-btn').onclick = submit;
    input.onkeydown = (e) => { if (e.key === 'Enter') submit(); };

    this.modal.style.display = 'flex';
  },

  /**
   * Alert replacement (rarely used, prefer toasts)
   */
  alert(title, message) {
    if (!this.initialized) this.init();
    this.titleCtx.innerText = title;
    this.bodyCtx.innerHTML = `<p>${message}</p>`;
    this.footerCtx.innerHTML = `
       <button class="btn-modal btn-modal-primary" onclick="ModalService.close()">OK</button>
     `;
    this.modal.style.display = 'flex';
  },

  /**
   * Show a form dialog with multiple inputs
   * @param {string} title 
   * @param {Array<{label:string, name:string, value:string, placeholder:string}>} inputs 
   * @param {Function} onConfirm - Callback(valuesObject)
   */
  form(title, inputs, onConfirm) {
    if (!this.initialized) this.init();
    this.titleCtx.innerText = title;

    let html = '<div style="display:flex; flex-direction:column; gap:16px;">';
    inputs.forEach(field => {
      html += `
                <div>
                    <label style="display:block; margin-bottom: 4px; font-weight: 500; font-size:0.9rem;">${field.label}</label>
                    <input type="text" class="modal-input" name="${field.name}" 
                           value="${field.value || ''}" 
                           placeholder="${field.placeholder || ''}" 
                           autocomplete="off">
                </div>
            `;
    });
    html += '</div>';

    this.bodyCtx.innerHTML = html;

    this.footerCtx.innerHTML = `
            <button class="btn-modal btn-modal-cancel" onclick="ModalService.close()">Cancel</button>
            <button class="btn-modal btn-modal-primary" id="global-modal-submit-btn">Run Search/Replace</button>
        `;

    const inputsEls = this.bodyCtx.querySelectorAll('input');

    // Auto-focus first input
    setTimeout(() => { if (inputsEls[0]) inputsEls[0].focus(); }, 100);

    const submit = () => {
      const values = {};
      inputsEls.forEach(el => values[el.name] = el.value);
      this.close();
      onConfirm(values);
    };

    document.getElementById('global-modal-submit-btn').onclick = submit;
    inputsEls.forEach(el => {
      el.onkeydown = (e) => { if (e.key === 'Enter') submit(); };
    });

    this.modal.style.display = 'flex';
  }
};

// Auto-init definition
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => ModalService.init());
} else {
  ModalService.init();
}
