/**
 * AIWorker - Background Service for "Always-On" Categorization
 * Runs continuously to optimize transactions without user intervention.
 */
window.AIWorker = {
    isRunning: false,
    interval: null,
    tickRate: 3000, // Check every 3 seconds

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        console.log('🤖 AI Worker Started (Background Mode)');

        this.interval = setInterval(() => {
            this.processTick();
        }, this.tickRate);
    },

    stop() {
        this.isRunning = false;
        if (this.interval) clearInterval(this.interval);
        console.log('🤖 AI Worker Stopped');
    },

    processTick() {
        if (!window.TransactionGrid || !window.GridStream) return;



        // Get live transactions directly from internal storage or grid
        // We use TransactionGrid.transactions to ensure we are looking at the source of truth
        const transactions = window.TransactionGrid.transactions || [];
        if (transactions.length === 0) return;

        const updates = [];
        const accounts = AccountAllocator.getAllAccounts();

        transactions.forEach(tx => {
            // Skip already locked/verified transactions if implemented?
            // For now, checks if we can improve the classification

            const currentAccount = tx.allocatedAccount;
            const newValues = this.analyzeTransaction(tx, accounts);

            if (newValues && newValues.allocatedAccount !== currentAccount) {
                // Change detected!
                updates.push({
                    ...tx,
                    ...newValues,
                    status: 'ai_matched' // Mark as touched by AI
                });
            }
        });

        if (updates.length > 0) {
            console.log(`🤖 AI Worker: Improving ${updates.length} transactions...`);
            GridStream.pushBatchUpdate(updates);
        }
    },

    /**
     * The "5-Point Approach" Logic extracted from app.js
     */
    analyzeTransaction(tx, accounts) {
        // 1. Vendor Match
        const match = VendorMatcher.matchPayee(tx.payee);
        if (!match || !match.vendor) return null;

        const vendorName = match.vendor.name.toLowerCase();
        let assignedAccount = null;

        // 2. Regex Patterns & Specific Overrides (The "Brain")

        // Specific Overrides (Highest Priority)
        if (/monument\s*develo/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '4001'); // Revenue/Sales
        } else if (/matthew\s*mckinnon/i.test(vendorName) && /online\s*transfer/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '2650'); // Shareholder Loan #1
        }

        // General Patterns
        else if (/wcb.*alberta|workers\s*comp/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '9750');
        } else if (/pay[-\s]?file|file\s*fee/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '7700');
        } else if (/sec\s*reg|lien/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '6800');
        } else if (/loan\s*(payment|credit|pmt)/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '2710');
        } else if ((vendorName.includes('loan') && vendorName.includes('interest'))) {
            assignedAccount = accounts.find(a => a.code === '7700');
        } else if (/mobile\s*.*\s*deposit/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '4001');
        } else if (/(received|rcvd).*(e-transfer|interac)/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '4001');
        } else if (/(sent|transfer).*(e-transfer|interac)/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '8950');
        } else if (/online\s*.*\s*transfer/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '2101');
        } else if (/gst[-\s]?[a-z]/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '2170');
        } else if (/abcit/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '2620');
        } else if (/commercial\s*tax/i.test(vendorName)) {
            assignedAccount = accounts.find(a => a.code === '2600');
        } else {
            // 3. Vendor Default Fallback
            assignedAccount = match.vendor.defaultAccount ?
                accounts.find(a => a.code === match.vendor.defaultAccount) : null;
        }

        if (assignedAccount) {
            return {
                vendor: match.vendor.name, // Normalize name too
                allocatedAccount: assignedAccount.code,
                allocatedAccountName: assignedAccount.name,
                category: match.vendor.category
            };
        } else {
            // Fallback to "Unusual item" if known vendor but no account
            return {
                vendor: match.vendor.name,
                allocatedAccount: match.vendor.defaultAccount || '9970',
                allocatedAccountName: match.vendor.defaultAccountName || 'Unusual item',
                category: match.vendor.category
            };
        }
    }
};
