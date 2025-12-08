// Visual Report Builder - Simplified version that IS the Reports Modal
// This replaces the old reports modal completely

const VisualReportBuilder = {
    selectedTemplate: 'balance',
    period: 'QUARTERLY',
    dimensions: {
        bySegment: false,
        byGeography: false
    },

    initialize() {
        console.log('🎨 Initializing Visual Report Builder...');
        this.setupEventListeners();
        this.updateUI();
    },

    setupEventListeners() {
        // Template card clicks
        document.querySelectorAll('.vrb-template-card:not(.disabled)').forEach(card => {
            card.addEventListener('click', () => {
                const template = card.dataset.template;
                this.selectTemplate(template);
            });
        });

        // Period dropdown
        const periodSelect = document.getElementById('vrbPrimaryPeriod');
        if (periodSelect) {
            periodSelect.addEventListener('change', (e) => {
                this.period = e.target.value;
                console.log('📊 Period changed to:', this.period);
            });
        }

        // Dimension toggles
        document.querySelectorAll('.vrb-toggle:not(.disabled)').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const dimension = toggle.dataset.dimension;
                this.toggleDimension(dimension);
            });
        });

        // Generate button
        const generateBtn = document.getElementById('vrbGenerateBtn');
        console.log('🔍 Generate button found:', !!generateBtn);
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                console.log('🎯 Generate button clicked!');
                this.generateReport();
            });
        } else {
            console.error('❌ Generate button not found in DOM!');
        }

        // Close button
        const closeBtn = document.getElementById('closeVisualReportBuilder');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                const modal = document.getElementById('visualReportBuilderModal');
                if (modal) modal.classList.remove('active');
            });
        }

        // Click outside to close
        const modal = document.getElementById('visualReportBuilderModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target.id === 'visualReportBuilderModal') {
                    modal.classList.remove('active');
                }
            });
        }
    },

    selectTemplate(template) {
        this.selectedTemplate = template;
        this.updateUI();
    },

    toggleDimension(dimension) {
        if (this.dimensions.hasOwnProperty(dimension)) {
            this.dimensions[dimension] = !this.dimensions[dimension];
            this.updateUI();
        }
    },

    updateUI() {
        // Update selected template card
        document.querySelectorAll('.vrb-template-card').forEach(card => {
            if (card.dataset.template === this.selectedTemplate) {
                card.classList.add('selected');
            } else {
                card.classList.remove('selected');
            }
        });

        // Update dimension toggles
        Object.keys(this.dimensions).forEach(dim => {
            const toggle = document.querySelector(`.vrb-toggle[data-dimension="${dim}"]`);
            if (toggle) {
                if (this.dimensions[dim]) {
                    toggle.classList.add('active');
                } else {
                    toggle.classList.remove('active');
                }
            }
        });
    },

    getPeriodDates(periodCode) {
        const now = new Date();
        const currentYear = now.getFullYear();

        // Get year-end date from settings, default to Dec 31
        const yearEndSetting = localStorage.getItem('yearEndDate');
        const yearEnd = yearEndSetting ? new Date(yearEndSetting) : new Date(currentYear, 11, 31);

        let start, end;

        switch (periodCode) {
            case 'YEARLY':
                // Full fiscal year
                start = new Date(yearEnd);
                start.setFullYear(start.getFullYear() - 1);
                start.setDate(start.getDate() + 1);
                end = new Date(yearEnd);
                break;

            case 'QUARTERLY':
                // Last complete quarter
                const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
                end = new Date(currentYear, quarterMonth + 3, 0); // Last day of quarter
                start = new Date(currentYear, quarterMonth, 1); // First day of quarter
                break;

            case 'MONTHLY':
                // Current month-to-date
                start = new Date(currentYear, now.getMonth(), 1);
                end = now;
                break;

            default:
                // Default to quarterly
                const qMonth = Math.floor(now.getMonth() / 3) * 3;
                end = new Date(currentYear, qMonth + 3, 0);
                start = new Date(currentYear, qMonth, 1);
        }

        console.log(`📅 Period ${periodCode}: ${start.toLocaleDateString()} to ${end.toLocaleDateString()}`);
        return { start, end };
    },

    async generateReport() {
        const btn = document.getElementById('vrbGenerateBtn');
        if (!btn) return;

        // Show loading state
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            // Get transactions
            const transactions = TransactionGrid?.transactions || [];
            if (transactions.length === 0) {
                alert('⚠️ No transactions loaded. Please upload a CSV file first.');
                return;
            }

            // Get period dates
            const periodDates = this.getPeriodDates(this.period);

            console.log('📊 Generating report:', {
                template: this.selectedTemplate,
                period: this.period,
                dates: periodDates,
                totalTransactions: transactions.length
            });

            // Generate report based on template
            let reportHTML = '';

            // Check if ReportsEngine exists
            if (typeof ReportsEngine === 'undefined') {
                throw new Error('Reports engine not loaded');
            }

            // CRITICAL: Filter transactions by period FIRST
            const filteredTransactions = ReportsEngine.getTransactionsForPeriod(
                transactions,
                periodDates.start,
                periodDates.end
            );

            console.log(`✅ Filtered to ${filteredTransactions.length} transactions in period`);

            // Generate report based on template using FILTERED transactions
            let reportHTML = '';

            switch (this.selectedTemplate) {
                case 'balance':
                    const balanceData = ReportsEngine.generateBalanceSheet(filteredTransactions);
                    reportHTML = ReportsEngine.renderBalanceSheet(balanceData);
                    break;

                case 'income':
                    const incomeData = ReportsEngine.generateIncomeStatement(filteredTransactions);
                    reportHTML = ReportsEngine.renderIncomeStatement(incomeData);
                    break;

                case 'trial':
                    const trialData = ReportsEngine.generateTrialBalance(filteredTransactions);
                    reportHTML = ReportsEngine.renderTrialBalance(trialData);
                    break;

                default:
                    alert('⚠️ Coming soon!');
                    return;
            }

            console.log('✅ Report generated, HTML length:', reportHTML?.length);

            // Verify we got valid HTML
            if (!reportHTML || typeof reportHTML !== 'string') {
                throw new Error('Report generation returned invalid data');
            }

            // Display the report
            this.showReportResults(reportHTML);

        } catch (error) {
            console.error('❌ Error generating report:', error);
            alert('❌ Error generating report: ' + error.message + '\n\nCheck console for details.');
        } finally {
            // Remove loading state
            if (btn) {
                btn.classList.remove('loading');
                btn.disabled = false;
            }
        }
    },

    showReportResults(html) {
        // Display results in the same modal by replacing content
        const modal = document.getElementById('visualReportBuilderModal');
        if (!modal) return;

        // Store the original builder HTML
        const builder = document.querySelector('.visual-report-builder');
        if (!builder) return;

        // Store original HTML - we need to capture it fresh each time
        if (!this._originalBuilderHTML) {
            this._originalBuilderHTML = builder.innerHTML;
        }

        // Replace builder content with report
        builder.innerHTML = `
            <div class="report-results-container">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="color: var(--text-primary); margin: 0;">Report Results</h3>
                    <button class="btn-secondary" id="backToBuilderBtn" style="padding: 8px 16px;">
                        ← Back to Builder
                    </button>
                </div>
                <div class="report-content">
                    ${html}
                </div>
            </div>
        `;

        // Wire up back button
        const backBtn = document.getElementById('backToBuilderBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Restore original HTML
                builder.innerHTML = this._originalBuilderHTML;

                // Re-initialize event listeners and UI
                setTimeout(() => {
                    this.setupEventListeners();
                    this.updateUI();

                    // Make sure loading state is cleared
                    const generateBtn = document.getElementById('vrbGenerateBtn');
                    if (generateBtn) {
                        generateBtn.classList.remove('loading');
                        generateBtn.disabled = false;
                    }
                }, 50);
            });
        }
    }
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof VisualReportBuilder !== 'undefined') {
            VisualReportBuilder.initialize();
        }
    });
} else {
    // DOM already loaded
    if (typeof VisualReportBuilder !== 'undefined') {
        VisualReportBuilder.initialize();
    }
}
