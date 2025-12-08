const ReportsModal = {
    initialize() {
        this.setupEventListeners();
    },

    setupEventListeners() {
        // Reports button is handled by reports-button-fix.js
        // This module just handles modal interior controls

        // Close button
        const closeBtn = document.getElementById('closeReportsModal');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hide();
            });
        }

        // Export PDF button
        const exportBtn = document.getElementById('exportReportPDF');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportToPDF();
            });
        }

        // Tab switching
        const tabs = document.querySelectorAll('[data-report]');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // Generate report button
        const generateBtn = document.getElementById('generateReportBtn');
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateReport();
            });
        }

        // Click outside to close
        const modal = document.getElementById('reportsModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'reportsModal') {
                    this.hide();
                }
            });
        }

        // ESC key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('reportsModal');
                if (modal && modal.classList.contains('active')) {
                    this.hide();
                }
            }
        });
    },

    exportToPDF() {
        // Set document title for PDF filename
        const companyName = localStorage.getItem('companyName') || 'Company';
        const activeTab = document.querySelector('[data-report].active');
        const reportType = activeTab?.dataset.report || 'report';
        const date = new Date().toISOString().split('T')[0];

        document.title = `${companyName} - ${reportType} - ${date}`;

        // Trigger browser print dialog
        window.print();

        // Restore original title
        setTimeout(() => {
            document.title = 'RoboLedgers - AI-Powered Smart Bookkeeping';
        }, 500);
    },

    show() {
        const modal = document.getElementById('reportsModal');
        if (!modal) return;

        // Set default end date to year-end or today
        const yearEndDate = localStorage.getItem('yearEndDate');
        const endDateInput = document.getElementById('reportEndDate');
        if (endDateInput) {
            if (yearEndDate) {
                endDateInput.value = yearEndDate.split('T')[0];
            } else {
                endDateInput.value = new Date().toISOString().split('T')[0];
            }
        }

        modal.classList.add('active');
    },

    hide() {
        const modal = document.getElementById('reportsModal');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    generateReport() {
        // Get transactions from App
        const transactions = App.transactions;

        if (!transactions || transactions.length === 0) {
            alert('No transactions loaded. Please upload a CSV file first.');
            return;
        }

        // Get active report type
        const activeTab = document.querySelector('[data-report].active');
        const reportType = activeTab?.dataset.report || 'income';

        // Get period and date
        const period = document.getElementById('reportPeriod')?.value || 'yearly';
        const endDateInput = document.getElementById('reportEndDate');
        const endDate = endDateInput?.value ? new Date(endDateInput.value) : new Date();


        // Add click handlers for drill-down
        const clickableRows = reportDisplay.querySelectorAll('.clickable-row');
        clickableRows.forEach(row => {
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                const account = e.currentTarget.dataset.account;
                this.showAccountDrillDown(account, periodTransactions);
            });
        });
    }
} catch (error) {
    console.error('Error generating report:', error);
    alert('Error generating report. Check console for details.');
}
        } else {
    // Yearly - single period (existing logic)
    if (!ReportsEngine || typeof ReportsEngine.calculatePeriodDates !== 'function') {
        console.error('ReportsEngine.calculatePeriodDates is not available!');
        alert('Error: Report engine not loaded properly. Please refresh the page.');
        return;
    }

    const periodData = ReportsEngine.calculatePeriodDates(period, endDate);
    const startDate = periodData.startDate;

    const periodTransactions = ReportsEngine.getTransactionsForPeriod(
        transactions,
        startDate,
        endDate
    );

    if (periodTransactions.length === 0) {
        alert('No transactions found for the selected period.');
        return;
    }

    // Generate and render report
    let html = '';
    try {
        if (reportType === 'income') {
            const data = ReportsEngine.generateIncomeStatement(periodTransactions);
            html = ReportsEngine.renderIncomeStatement(data);
        } else if (reportType === 'balance') {
            const data = ReportsEngine.generateBalanceSheet(periodTransactions);
            html = ReportsEngine.renderBalanceSheet(data);
        } else if (reportType === 'trial') {
            const data = ReportsEngine.generateTrialBalance(periodTransactions);
            html = ReportsEngine.renderTrialBalance(data);
        }

        // Display report
        const reportDisplay = document.getElementById('reportDisplay');
        if (reportDisplay) {
            reportDisplay.innerHTML = html;

            // Add click handlers for drill-down
            const clickableRows = reportDisplay.querySelectorAll('.clickable-row');
            clickableRows.forEach(row => {
                row.style.cursor = 'pointer';
                row.addEventListener('click', (e) => {
                    const account = e.currentTarget.dataset.account;
                    this.showAccountDrillDown(account, periodTransactions);
                });
            });
        }
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Error generating report. Check console for details.');
    }
}
    },

showAccountDrillDown(account, periodTransactions) {
    const accountTransactions = periodTransactions.filter(t =>
        (t.allocatedAccount || '9970') === account
    );

    if (accountTransactions.length === 0) {
        alert('No transactions found for this account.');
        return;
    }

    const accountName = accountTransactions[0].allocatedAccountName || 'Unallocated';
    const html = `
            <div class="modal active" id="drillDownModal" style="z-index: 1001;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h2>Account: ${account} - ${accountName}</h2>
                        <button class="modal-close" onclick="document.getElementById('drillDownModal').remove()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background: var(--panel-bg);">
                                    <th style="padding: 0.75rem; text-align: left;">Date</th>
                                    <th style="padding: 0.75rem; text-align: left;">Description</th>
                                    <th style="padding: 0.75rem; text-align: right;">Debit</th>
                                    <th style="padding: 0.75rem; text-align: right;">Credit</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${accountTransactions.map(t => `
                                    <tr style="border-bottom: 1px solid var(--border-color);">
                                        <td style="padding: 0.5rem;">${new Date(t.date).toLocaleDateString()}</td>
                                        <td style="padding: 0.5rem;">${t.payee || ''}</td>
                                        <td style="padding: 0.5rem; text-align: right;">${t.debits > 0 ? ReportsEngine.formatCurrency(t.debits) : ''}</td>
                                        <td style="padding: 0.5rem; text-align: right;">${t.amount > 0 ? ReportsEngine.formatCurrency(t.amount) : ''}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

    document.body.insertAdjacentHTML('beforeend', html);
}
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        ReportsModal.initialize();
    });
} else {
    ReportsModal.initialize();
}
