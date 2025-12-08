// Visual Report Builder Integration
// This script adds the Visual Report Builder modal to the page and wires it up

document.addEventListener('DOMContentLoaded', function () {
    // Create and inject the Visual Report Builder modal HTML
    const modalHTML = `
    <div id="visualReportBuilderModal" class="modal">
        <div class="modal-content modal-large">
            <div class="modal-header">
                <button class="modal-close" id="closeVisualReportBuilder">&times;</button>
            </div>
            <div class="modal-body">
                <div class="visual-report-builder">
                    
                    <!-- Template Selection -->
                    <div class="vrb-section">
                        <div class="vrb-section-header">SELECT TEMPLATE</div>
                        <div class="vrb-template-grid">
                            <div class="vrb-template-card selected" data-template="balance">
                                <div class="vrb-template-icon">💰</div>
                                <div class="vrb-template-name">Balance Sheet</div>
                            </div>
                            <div class="vrb-template-card" data-template="income">
                                <div class="vrb-template-icon">📊</div>
                                <div class="vrb-template-name">Income Statement</div>
                            </div>
                            <div class="vrb-template-card" data-template="trial">
                                <div class="vrb-template-icon">⚖️</div>
                                <div class="vrb-template-name">Trial Balance</div>
                            </div>
                            <div class="vrb-template-card disabled" data-template="cashflow">
                                <div class="vrb-template-icon">💵</div>
                                <div class="vrb-template-name">Cash Flow</div>
                            </div>
                        </div>
                    </div>

                    <!-- Period Configuration -->
                    <div class="vrb-section">
                        <div class="vrb-section-header">CONFIGURE PERIODS</div>
                        <div class="vrb-period-container">
                            <div class="vrb-period-row">
                                <div class="vrb-period-field">
                                    <label class="vrb-period-label">Primary Period</label>
                                    <select id="vrbPrimaryPeriod" class="vrb-period-select">
                                        <option value="Q1_2024">Q1 2024 (Jan - Mar)</option>
                                        <option value="Q2_2024">Q2 2024 (Apr - Jun)</option>
                                        <option value="Q3_2024">Q3 2024 (Jul - Sep)</option>
                                        <option value="Q4_2024" selected>Q4 2024 (Oct - Dec)</option>
                                        <option value="FY_2024">Fiscal Year 2024</option>
                                        <option value="MTD">Month-to-Date</option>
                                        <option value="YTD">Year-to-Date</option>
                                    </select>
                                </div>
                            </div>
                            <div class="vrb-period-row">
                                <div class="vrb-period-field">
                                    <label class="vrb-period-label">Comparison Period (Optional)</label>
                                    <select id="vrbComparisonPeriod" class="vrb-period-select">
                                        <option value="">None</option>
                                        <option value="Q1_2024">Q1 2024 (Jan - Mar)</option>
                                        <option value="Q2_2024">Q2 2024 (Apr - Jun)</option>
                                        <option value="Q3_2024">Q3 2024 (Jul - Sep)</option>
                                        <option value="Q4_2024">Q4 2024 (Oct - Dec)</option>
                                        <option value="FY_2024">Fiscal Year 2024</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Dimensions -->
                    <div class="vrb-section">
                        <div class="vrb-section-header">ADD DIMENSIONS</div>
                        <div class="vrb-dimensions-container">
                            <div class="vrb-dimension-row">
                                <div class="vrb-dimension-label">By Segment</div>
                                <div class="vrb-toggle active" data-dimension="bySegment">
                                    <div class="vrb-toggle-slider"></div>
                                </div>
                            </div>
                            <div class="vrb-dimension-row disabled">
                                <div class="vrb-dimension-label">By Geography</div>
                                <div class="vrb-toggle disabled" data-dimension="byGeography">
                                    <div class="vrb-toggle-slider"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Generate Button -->
                    <div class="vrb-section">
                        <button id="vrbGenerateBtn" class="vrb-generate-btn">
                            Generate Report →
                        </button>
                    </div>

                </div>
            </div>
        </div>
    </div>
    `;

    // Inject modal into page
    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Wire up Reports button to open Visual Report Builder
    const reportsBtn = document.getElementById('reportsBtn');
    if (reportsBtn) {
        reportsBtn.addEventListener('click', () => {
            const vrbModal = document.getElementById('visualReportBuilderModal');
            if (vrbModal) {
                vrbModal.classList.add('active');
            }
        });
    }

    // Wire up close button
    const closeBtn = document.getElementById('closeVisualReportBuilder');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const vrbModal = document.getElementById('visualReportBuilderModal');
            if (vrbModal) {
                vrbModal.classList.remove('active');
            }
        });
    }

    // Initialize Visual Report Builder after modal is injected
    if (typeof VisualReportBuilder !== 'undefined') {
        // Give it a moment to properly inject
        setTimeout(() => VisualReportBuilder.initialize(), 100);
    }
});
