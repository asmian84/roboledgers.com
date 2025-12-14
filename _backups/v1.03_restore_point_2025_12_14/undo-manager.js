// Undo/Redo Manager
// Tracks changes and allows reverting actions

const UndoManager = {
    undoStack: [],
    redoStack: [],
    maxStackSize: 20,
    enabled: true,

    // Record an action before making changes
    recordAction(type, data) {
        if (!this.enabled) return;

        const action = {
            type,          // 'edit', 'delete', 'categorize', 'bulk'
            timestamp: Date.now(),
            data: JSON.parse(JSON.stringify(data))  // Deep clone
        };

        this.undoStack.push(action);

        // Limit stack size
        if (this.undoStack.length > this.maxStackSize) {
            this.undoStack.shift();
        }

        // Clear redo stack when new action is recorded
        this.redoStack = [];

        console.log(`📝 Action recorded: ${type}`, action);
    },

    // Undo last action
    undo() {
        if (this.undoStack.length === 0) {
            console.log('⚠️ Nothing to undo');
            this.showToast('Nothing to undo');
            return false;
        }

        const action = this.undoStack.pop();
        console.log('↩️ Undoing:', action.type);

        // Apply the undo based on action type
        const success = this.applyUndo(action);

        if (success) {
            this.redoStack.push(action);
            this.showToast(`Undone: ${this.getActionName(action)}`);
        }

        return success;
    },

    // Redo last undone action
    redo() {
        if (this.redoStack.length === 0) {
            console.log('⚠️ Nothing to redo');
            this.showToast('Nothing to redo');
            return false;
        }

        const action = this.redoStack.pop();
        console.log('↪️ Redoing:', action.type);

        // Apply the redo
        const success = this.applyRedo(action);

        if (success) {
            this.undoStack.push(action);
            this.showToast(`Redone: ${this.getActionName(action)}`);
        }

        return success;
    },

    // Apply undo operation
    applyUndo(action) {
        switch (action.type) {
            case 'edit':
                return this.undoEdit(action.data);
            case 'bulk':
                return this.undoBulk(action.data);
            case 'categorize':
                return this.undoCategorize(action.data);
            default:
                console.warn('Unknown action type:', action.type);
                return false;
        }
    },

    // Apply redo operation
    applyRedo(action) {
        switch (action.type) {
            case 'edit':
                return this.redoEdit(action.data);
            case 'bulk':
                return this.redoBulk(action.data);
            case 'categorize':
                return this.redoCategorize(action.data);
            default:
                console.warn('Unknown action type:', action.type);
                return false;
        }
    },

    // Undo single cell edit
    undoEdit(data) {
        const { rowId, field, oldValue } = data;
        const transaction = App.transactions.find(t => t.id === rowId);

        if (!transaction) return false;

        transaction[field] = oldValue;
        Storage.saveTransactions(App.transactions);
        TransactionGrid.loadTransactions(App.transactions);

        return true;
    },

    // Redo single cell edit
    redoEdit(data) {
        const { rowId, field, newValue } = data;
        const transaction = App.transactions.find(t => t.id === rowId);

        if (!transaction) return false;

        transaction[field] = newValue;
        Storage.saveTransactions(App.transactions);
        TransactionGrid.loadTransactions(App.transactions);

        return true;
    },

    // Undo bulk categorization
    undoBulk(data) {
        const { changes } = data;

        for (const change of changes) {
            const transaction = App.transactions.find(t => t.id === change.rowId);
            if (transaction) {
                transaction.allocatedAccount = change.oldAccount;
                transaction.allocatedAccountName = change.oldAccountName;
            }
        }

        Storage.saveTransactions(App.transactions);
        TransactionGrid.loadTransactions(App.transactions);
        App.updateStatistics();

        return true;
    },

    // Redo bulk categorization
    redoBulk(data) {
        const { changes } = data;

        for (const change of changes) {
            const transaction = App.transactions.find(t => t.id === change.rowId);
            if (transaction) {
                transaction.allocatedAccount = change.newAccount;
                transaction.allocatedAccountName = change.newAccountName;
            }
        }

        Storage.saveTransactions(App.transactions);
        TransactionGrid.loadTransactions(App.transactions);
        App.updateStatistics();

        return true;
    },

    // Undo AI categorization
    undoCategorize(data) {
        // Similar to bulk undo
        return this.undoBulk(data);
    },

    // Redo AI categorization
    redoCategorize(data) {
        // Similar to bulk redo
        return this.redoBulk(data);
    },

    // Get human-readable action name
    getActionName(action) {
        switch (action.type) {
            case 'edit':
                return `Edit ${action.data.field}`;
            case 'bulk':
                return `Bulk categorize ${action.data.changes.length} transactions`;
            case 'categorize':
                return 'AI Re-think';
            default:
                return action.type;
        }
    },

    // Show toast notification
    showToast(message) {
        let toast = document.getElementById('undoToast');

        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'undoToast';
            toast.style.cssText = `
                position: fixed;
                bottom: 2rem;
                right: 2rem;
                background: var(--surface-color);
                color: var(--text-color);
                padding: 1rem 1.5rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                opacity: 0;
                transition: opacity 0.3s;
                font-size: 14px;
                border: 1px solid var(--border-color);
            `;
            document.body.appendChild(toast);
        }

        toast.textContent = message;
        toast.style.opacity = '1';

        // Hide after 2 seconds
        setTimeout(() => {
            toast.style.opacity = '0';
        }, 2000);
    },

    // Clear all history
    clear() {
        this.undoStack = [];
        this.redoStack = [];
        console.log('🗑️ Undo history cleared');
    }
};

// Setup keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl+Z or Cmd+Z for undo
    if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        UndoManager.undo();
    }

    // Ctrl+Y or Cmd+Shift+Z for redo
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        UndoManager.redo();
    }
});

console.log('✅ Undo Manager loaded');
