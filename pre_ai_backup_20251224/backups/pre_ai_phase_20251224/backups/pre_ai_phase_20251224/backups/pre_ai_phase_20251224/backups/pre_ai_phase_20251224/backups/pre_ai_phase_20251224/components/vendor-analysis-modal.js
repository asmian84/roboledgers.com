
/**
 * Vendor Analysis Modal Component
 * Displays grouped vendors and allows bulk-editing accounts.
 */

window.VendorAnalysisModal = {
    modal: null,
    currentGroups: [],

    init: function () {
        if (this.modal) return; // Already initialized

        const html = `
        <div id="vendorAnalysisModal" class="modal large-modal" style="display: none; z-index: 1000000005;">
            <div class="modal-content" style="width: 900px; max-width: 95vw; height: 85vh; display: flex; flex-direction: column;">
                
                <!-- HEADER -->
                <div class="modal-header" style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 20px 24px;">
                    <h2 style="color: white; margin: 0; font-size: 1.25rem; display: flex; align-items: center; gap: 10px;">
                        <span>📊</span> Vendor Analysis
                    </h2>
                    <button class="modal-close" style="color: white; opacity: 0.8;">&times;</button>
                </div>

                <!-- BODY (Scrollable) -->
                <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 0; background: #f8fafc;">
                    <table class="uc-table" style="width: 100%;">
                        <thead style="position: sticky; top: 0; z-index: 10;">
                            <tr>
                                <th style="width: 40%">VENDOR NAME (NORMALIZED)</th>
                                <th style="width: 10%; text-align: center;">COUNT</th>
                                <th style="width: 50%">ACCOUNT ASSIGNMENT</th>
                            </tr>
                        </thead>
                        <tbody id="vendorAnalysisBody">
                            <!-- Rows injected here -->
                        </tbody>
                    </table>
                </div>

                <!-- FOOTER -->
                <div class="modal-footer" style="padding: 16px 24px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 12px; background: white;">
                    <button class="uc-btn uc-btn-primary" onclick="VendorAnalysisModal.close()">Done</button>
                </div>
            </div>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', html);
        this.modal = document.getElementById('vendorAnalysisModal');

        // Close handlers
        this.modal.querySelector('.modal-close').onclick = () => this.close();
        this.modal.onclick = (e) => {
            if (e.target === this.modal) this.close();
        };
    },

    show: function () {
        this.init();

        // 1. Get Data & Group
        const txns = window.transactionData || [];
        this.currentGroups = window.VendorAnalysis.groupTransactions(txns);

        // 2. Render
        this.renderTable();

        // 3. Show Modal
        this.modal.style.display = 'flex';
        this.modal.classList.add('active');
    },

    close: function () {
        if (this.modal) {
            this.modal.style.display = 'none';
            this.modal.classList.remove('active');
            // Refresh main grid to show changes
            if (window.initTransactionGrid) {
                // Determine if we need full init or just refresh
                // window.renderTransactions(); // Re-render logic might be heavy
                const app = document.getElementById('app');
                if (app && window.renderTransactions) app.innerHTML = window.renderTransactions();
            }
        }
    },

    renderTable: function () {
        const tbody = document.getElementById('vendorAnalysisBody');
        tbody.innerHTML = '';

        this.currentGroups.forEach((group, index) => {
            const tr = document.createElement('tr');
            tr.style.background = 'white';

            // Suggest Logic
            const suggestedId = window.VendorAnalysis.getSuggestedAccount(group);

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: #1e293b;">${group.name}</div>
                    <div style="font-size: 0.75rem; color: #64748b;">${group.originalRows.length > 1 ? group.originalRows[0].description + '...' : ''}</div>
                </td>
                <td style="text-align: center;">
                    <span style="background: #e0e7ff; color: #4338ca; padding: 2px 8px; border-radius: 12px; font-weight: 600; font-size: 0.8rem;">
                        ${group.count}
                    </span>
                </td>
                <td style="padding: 8px;">
                    <div class="smart-dropdown-wrapper" id="dropdown-${index}">
                       <!-- Dropdown injected dynamically to handle huge lists efficiently -->
                    </div>
                </td>
            `;

            tbody.appendChild(tr);

            // Inject Custom Dropdown logic
            this.renderDropdown(document.getElementById(`dropdown-${index}`), group, suggestedId);
        });
    },

    renderDropdown: function (container, group, currentAccountId) {
        // Simplified Select for v1
        // In v2 we can make this the fancy "Smart Combo"

        const select = document.createElement('select');
        select.className = "input-box";
        select.style.width = "100%";

        // Default Option
        const defOpt = document.createElement('option');
        defOpt.value = "";
        defOpt.text = "Select Account...";
        select.appendChild(defOpt);

        // Populate from Global COA
        const accounts = window.COA || [];

        // Sort: Suggested First? 
        // For now, let's just stick to standard alpha list but PRE-SELECT the suggested one.

        accounts.forEach(acc => {
            const opt = document.createElement('option');
            opt.value = acc.id; // Or code? Transaction data uses ID or unique key? 
            // Checking existing data: typically '109ba...' UUIDs.
            opt.text = `${acc.accountNumber} - ${acc.name}`;
            if (acc.id === currentAccountId) opt.selected = true;
            select.appendChild(opt);
        });

        select.onchange = (e) => {
            this.handleBulkUpdate(group, e.target.value);
        };

        container.appendChild(select);
    },

    handleBulkUpdate: async function (group, newAccountId) {
        if (!newAccountId) return;

        console.log(`🔄 Bulk Updating ${group.count} transactions for ${group.name} to Account ${newAccountId}`);

        // 1. Update In-Memory Data
        // We have reference to original rows in group.originalRows
        // But we need to update 'window.transactionData' persistently.

        // Find account details for display
        const account = window.COA.find(a => a.id === newAccountId);
        const accLabel = account ? `${account.accountNumber} - ${account.name}` : '';

        group.originalRows.forEach(txn => {
            txn.accountId = newAccountId;
            txn.accountDescription = accLabel;

            // Status update
            txn.status = 'reviewed';
        });

        // 2. Persist (Save to LocalStorage/Supabase)
        if (window.saveTransactions) window.saveTransactions();

        // 3. Feedback
        if (window.showToast) showToast(`Updated ${group.count} items for ${group.name}`, 'success');
    }
};
