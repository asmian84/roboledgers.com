// Keyboard Shortcuts Handler
// Navigate and edit transaction grid with keyboard

const KeyboardHandler = {
    activeCell: null,
    isEditing: false,

    initialize() {
        console.log('⌨️ Initializing keyboard shortcuts...');

        // Listen for keyboard events
        document.addEventListener('keydown', (e) => this.handleKeyDown(e));

        // Track active cell when clicking grid
        document.addEventListener('click', (e) => {
            const cell = e.target.closest('.ag-cell');
            if (cell) {
                this.setActiveCell(cell);
            }
        });
    },

    handleKeyDown(e) {
        // Don't interfere with input fields or modals
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') {
            return;
        }

        // Modal is open - don't handle keys
        if (document.querySelector('.modal.active')) {
            return;
        }

        // Handle shortcuts
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                this.navigateCell('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateCell('down');
                break;
            case 'ArrowLeft':
                e.preventDefault();
                this.navigateCell('left');
                break;
            case 'ArrowRight':
                e.preventDefault();
                this.navigateCell('right');
                break;
            case 'Enter':
                e.preventDefault();
                this.handleEnter();
                break;
            case 'Escape':
                e.preventDefault();
                this.handleEscape();
                break;
            case 'Tab':
                e.preventDefault();
                this.navigateCell(e.shiftKey ? 'left' : 'right');
                break;
            case 'Delete':
            case 'Backspace':
                if (!this.isEditing) {
                    e.preventDefault();
                    this.handleDelete();
                }
                break;
            case 's':
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.handleSave();
                }
                break;
        }
    },

    navigateCell(direction) {
        if (!this.activeCell) {
            // No cell selected, select first editable cell
            const firstCell = document.querySelector('.ag-cell[col-id="description"]');
            if (firstCell) {
                this.setActiveCell(firstCell);
            }
            return;
        }

        const row = this.activeCell.closest('.ag-row');
        if (!row) return;

        let targetCell = null;

        switch (direction) {
            case 'up': {
                const prevRow = row.previousElementSibling;
                if (prevRow) {
                    const colId = this.activeCell.getAttribute('col-id');
                    targetCell = prevRow.querySelector(`.ag-cell[col-id="${colId}"]`);
                }
                break;
            }
            case 'down': {
                const nextRow = row.nextElementSibling;
                if (nextRow) {
                    const colId = this.activeCell.getAttribute('col-id');
                    targetCell = nextRow.querySelector(`.ag-cell[col-id="${colId}"]`);
                }
                break;
            }
            case 'left': {
                targetCell = this.activeCell.previousElementSibling;
                // Skip checkbox column
                while (targetCell && targetCell.getAttribute('col-id') === 'select') {
                    targetCell = targetCell.previousElementSibling;
                }
                break;
            }
            case 'right': {
                targetCell = this.activeCell.nextElementSibling;
                break;
            }
        }

        if (targetCell) {
            this.setActiveCell(targetCell);
            targetCell.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    },

    setActiveCell(cell) {
        // Remove highlight from previous cell
        if (this.activeCell) {
            this.activeCell.classList.remove('keyboard-active');
        }

        this.activeCell = cell;
        this.activeCell.classList.add('keyboard-active');

        // Add CSS class for highlighting if not exists
        if (!document.getElementById('keyboardHighlight')) {
            const style = document.createElement('style');
            style.id = 'keyboardHighlight';
            style.textContent = `
                .ag-cell.keyboard-active {
                    outline: 2px solid var(--primary-color) !important;
                    outline-offset: -2px;
                }
            `;
            document.head.appendChild(style);
        }
    },

    handleEnter() {
        if (!this.activeCell) return;

        const colId = this.activeCell.getAttribute('col-id');

        // Don't allow editing readonly columns
        if (['date', 'debit', 'credit', 'balance', 'select'].includes(colId)) {
            console.log('Column not editable:', colId);
            return;
        }

        // Get row data
        const row = this.activeCell.closest('.ag-row');
        const rowIndex = Array.from(row.parentElement.children).indexOf(row);
        const transaction = App.transactions[rowIndex];

        if (!transaction) return;

        // Start editing
        this.isEditing = true;
        const currentValue = this.activeCell.textContent.trim();

        if (colId === 'allocatedAccount') {
            // Show account picker
            this.showAccountPicker(transaction, currentValue);
        } else {
            // Inline text edit
            this.activeCell.contentEditable = true;
            this.activeCell.focus();

            // Select all text
            const range = document.createRange();
            range.selectNodeContents(this.activeCell);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);

            // Save on blur
            this.activeCell.addEventListener('blur', () => {
                this.saveEdit(transaction, colId, currentValue);
            }, { once: true });
        }
    },

    handleEscape() {
        if (this.isEditing && this.activeCell) {
            this.activeCell.contentEditable = false;
            this.isEditing = false;

            // Reload grid to restore original value
            TransactionGrid.loadTransactions(App.transactions);
        }
    },

    handleDelete() {
        if (!this.activeCell) return;

        const colId = this.activeCell.getAttribute('col-id');
        if (['date', 'debit', 'credit', 'balance', 'select'].includes(colId)) {
            return;
        }

        const row = this.activeCell.closest('.ag-row');
        const rowIndex = Array.from(row.parentElement.children).indexOf(row);
        const transaction = App.transactions[rowIndex];

        if (!transaction) return;

        // Record undo action
        const oldValue = transaction[colId];

        // Clear the field
        transaction[colId] = '';

        // Record for undo
        UndoManager.recordAction('edit', {
            rowId: transaction.id,
            field: colId,
            oldValue: oldValue,
            newValue: ''
        });

        Storage.saveTransactions(App.transactions);
        TransactionGrid.loadTransactions(App.transactions);
    },

    saveEdit(transaction, field, oldValue) {
        this.activeCell.contentEditable = false;
        this.isEditing = false;

        const newValue = this.activeCell.textContent.trim();

        if (newValue === oldValue) {
            console.log('No change, skipping save');
            return;
        }

        // Record for undo
        UndoManager.recordAction('edit', {
            rowId: transaction.id,
            field: field,
            oldValue: oldValue,
            newValue: newValue
        });

        // Update transaction
        transaction[field] = newValue;
        Storage.saveTransactions(App.transactions);
        TransactionGrid.loadTransactions(App.transactions);
    },

    showAccountPicker(transaction, currentAccount) {
        // TODO: Show account dropdown
        // For now, just allow text input
        this.isEditing = true;
        this.activeCell.contentEditable = true;
        this.activeCell.focus();

        const oldValue = currentAccount;

        this.activeCell.addEventListener('blur', () => {
            const newAccount = this.activeCell.textContent.trim();

            if (newAccount !== oldValue) {
                UndoManager.recordAction('edit', {
                    rowId: transaction.id,
                    field: 'allocatedAccount',
                    oldValue: oldValue,
                    newValue: newAccount
                });

                transaction.allocatedAccount = newAccount;
                Storage.saveTransactions(App.transactions);
                TransactionGrid.loadTransactions(App.transactions);
            }

            this.activeCell.contentEditable = false;
            this.isEditing = false;
        }, { once: true });
    },

    handleSave() {
        // Trigger export/download
        console.log('💾 Ctrl+S: Save shortcut (export functionality TBD)');
        alert('Export feature coming soon!');
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => KeyboardHandler.initialize());
} else {
    KeyboardHandler.initialize();
}

console.log('✅ Keyboard Handler loaded');
