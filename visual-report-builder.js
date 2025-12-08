// Visual Report Builder - Simplified version that IS the Reports Modal
// This replaces the old reports modal completely

const VisualReportBuilder = {
    selectedTemplate: 'balance',
    periods: {
        primary: 'Q4_2024',
        comparison: null
    },
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

        // Period dropdowns
        const primaryPeriod = document.getElementById('vrbPrimaryPeriod');
        const comparisonPeriod = document.getElementById('vrbComparisonPeriod');

        if (primaryPeriod) {
            primaryPeriod.addEventListener('change', (e) => {
                this.periods.primary = e.target.value;
            });
        }

        if (comparisonPeriod) {
            comparisonPeriod.addEventListener('change', (e) => {
                this.periods.comparison = e.target.value || null;
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
        if (generateBtn) {
            generateBtn.addEventListener('click', () => {
                this.generateReport();
            });
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
        const periods = {
            'Q1_2024': { start: new Date(2024, 0, 1), end: new Date(2024, 2, 31) },
            'Q2_2024': { start: new Date(2024, 3, 1), end: new Date(2024, 5, 30) },
            'Q3_2024': { start: new Date(2024, 6, 1), end: new Date(2024, 8, 30) },
            'Q4_2024': { start: new Date(2024, 9, 1), end: new Date(2024, 11, 31) },
            'FY_2024': { start: new Date(2024, 0, 1), end: new Date(2024, 11, 31) },
            'MTD': (() => {
                const now = new Date();
                return { start: new Date(now.getFullYear(), now.getMonth(), 1), end: now };
            })(),
            'YTD': (() => {
                const now = new Date();
                return { start: new Date(now.getFullYear(), 0, 1), end: now };
            })()
        };

        return periods[periodCode] || periods['Q4_2024'];
    },

    async generateReport() {
        const btn = document.getElementById('vrbGenerateBtn');
        if (!btn) return;

        // Show loading state
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            // Get transactions
            const transactions = TransactionGrid.transactions || [];
            if (transactions.length === 0) {
                alert('⚠️ No transactions loaded. Please upload a CSV file first.');
                return;
            }

            // Get period dates
            const periodDates = this.getPeriodDates(this.periods.primary);

            // Generate report based on template
            let reportHTML = '';

            switch (this.selectedTemplate) {
                case 'balance':
                    reportHTML = ReportsEngine.generateBalanceSheet(
                        transactions,
                        periodDates.end
                    );
                    break;

                case 'income':
                    reportHTML = ReportsEngine.generateIncomeStatement(
                        transactions,
                        periodDates.start,
                        periodDates.end
                    );
                    break;

                case 'trial':
                    reportHTML = ReportsEngine.generateTrialBalance(
                        transactions,
                        periodDates.end
                    );
                    break;

                default:
                    alert('⚠️ Coming soon!');
                    return;
            }

            // Create report display modal
            this.showReportResults(reportHTML);

        } catch (error) {
            console.error('Error generating report:', error);
            alert('❌ Error generating report: ' + error.message);
        } finally {
            // Remove loading state
            btn.classList.remove('loading');
            btn.disabled = false;
        }
    },

    showReportResults(html) {
        // Display results in the same modal by replacing content
        const modal = document.getElementById('visualReportBuilderModal');
        if (!modal) return;

        // Store the original builder HTML
        const builder = document.querySelector('.visual-report-builder');
        if (!builder) return;

        const originalHTML = builder.innerHTML;

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
                builder.innerHTML = originalHTML;
                // Re-initialize event listeners
                this.setupEventListeners();
                this.updateUI();
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
