/**
 * Product Roadmap Page
 * Visual timeline of past achievements, current work, and future vision
 */

function renderRoadmap() {
    return `
        <div class="page roadmap-page">
            <div class="page-header">
                <h1 class="page-title">🗺️ Product Roadmap</h1>
                <p class="page-subtitle">Our journey from concept to the future of automated bookkeeping</p>
            </div>

            <!-- Timeline Navigation -->
            <div class="timeline-nav">
                <button class="timeline-tab active" data-period="past">
                    <i class="ph ph-check-circle"></i>
                    <span>Past Achievements</span>
                </button>
                <button class="timeline-tab" data-period="present">
                    <i class="ph ph-code"></i>
                    <span>Current Development</span>
                </button>
                <button class="timeline-tab" data-period="future">
                    <i class="ph ph-rocket-launch"></i>
                    <span>Future Vision</span>
                </button>
            </div>

            <!-- PAST: Achievements -->
            <div class="timeline-section" id="timeline-past">
                <div class="timeline-header">
                    <h2>✅ Past Achievements</h2>
                    <p>What we've built so far</p>
                </div>

                <div class="timeline">
                    <!-- Phase 1: Foundation -->
                    <div class="timeline-item completed">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">Q4 2025</div>
                            <h3>Phase 1: Foundation & Core Features</h3>
                            <div class="timeline-details">
                                <h4>✅ Core Data Layer</h4>
                                <ul>
                                    <li>IndexedDB storage with 10k+ transaction capacity</li>
                                    <li>Chart of Accounts (1000-9999 structure)</li>
                                    <li>Vendor management system</li>
                                    <li>Transaction grid with AG Grid</li>
                                </ul>

                                <h4>✅ Import System V1</h4>
                                <ul>
                                    <li>CSV import with smart column mapping</li>
                                    <li>Excel (.xlsx) file support</li>
                                    <li>Duplicate detection via file hashing</li>
                                    <li>Upload history tracking</li>
                                </ul>

                                <h4>✅ Basic Reports</h4>
                                <ul>
                                    <li>Profit & Loss statement</li>
                                    <li>Balance Sheet</li>
                                    <li>Cash Flow statement</li>
                                    <li>Vendor analysis</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 2: AI Engine -->
                    <div class="timeline-item completed">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">December 2025</div>
                            <h3>Phase 2: AI Auto-Categorization Engine</h3>
                            <div class="timeline-details">
                                <h4>✅ Knowledge Injection (Layer 1)</h4>
                                <ul>
                                    <li>Global Vendor Database (100+ common vendors)</li>
                                    <li>Pre-mapped vendor → account associations</li>
                                    <li>Instant categorization for known vendors</li>
                                </ul>

                                <h4>✅ Intuition Engine (Layer 2)</h4>
                                <ul>
                                    <li>Keyword clustering for semantic analysis</li>
                                    <li>Heuristic scoring (vendor + keywords + amount)</li>
                                    <li>Multi-factor confidence scoring</li>
                                </ul>

                                <h4>✅ Tax Estimation Module</h4>
                                <ul>
                                    <li>Integrated tax calculations in P&L reports</li>
                                    <li>Business income tax estimation</li>
                                    <li>Provincial tax support</li>
                                </ul>

                                <h4>✅ UI Enhancements</h4>
                                <ul>
                                    <li>AI auto-categorization on import</li>
                                    <li>Manual AI trigger button</li>
                                    <li>Simplified Add Transaction modal</li>
                                    <li>Import history with collapsible categories</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 3: Smart PDF Parser -->
                    <div class="timeline-item completed">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">December 24, 2025</div>
                            <h3>Phase 3: Smart Multi-Faceted PDF Parser</h3>
                            <div class="timeline-details">
                                <h4>✅ Pattern Analysis</h4>
                                <ul>
                                    <li><strong>26 Canadian bank statement types</strong> analyzed</li>
                                    <li>Multi-currency support (CAD/USD)</li>
                                    <li>Bank identification from 9 institutions</li>
                                </ul>
                                <h4>✅ Universal Metadata</h4>
                                <ul>
                                    <li>Account number masking & period extraction</li>
                                    <li>Multi-line description support</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 4: UI Snugging -->
                    <div class="timeline-item completed">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">January 2026</div>
                            <h3>Phase 4: RoboLedgers 4.0 UI "Snugging"</h3>
                            <div class="timeline-details">
                                <h4>✅ The "Yellow Box" Standard</h4>
                                <ul>
                                    <li>Narrow 520px settings cards for focus</li>
                                    <li>High-density layouts across all 7 panels</li>
                                    <li>3x2 Grid standard for theme selection</li>
                                </ul>
                                <h4>✅ Performance UI</h4>
                                <ul>
                                    <li>Micro-animations and slide-up transitions</li>
                                    <li>Standardized typography system</li>
                                    <li>Ultra-compact mode for heavy data users</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- PRESENT: Current Work -->
            <div class="timeline-section" id="timeline-present" style="display: none;">
                <div class="timeline-header">
                    <h2>🔄 Current Development</h2>
                    <p>What we're working on right now</p>
                </div>

                <div class="timeline">
                    <!-- Partner Ecosystem -->
                    <div class="timeline-item in-progress">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">January 2026</div>
                            <h3>Partner Ecosystem & Integrations</h3>
                            <div class="timeline-details">
                                <h4>🔄 Integration Layer</h4>
                                <ul>
                                    <li><strong>Supabase DB:</strong> Real-time ledger sync</li>
                                    <li><strong>QuickBooks:</strong> Bi-directional export</li>
                                    <li><strong>Stripe:</strong> Payment fee auto-matching</li>
                                    <li><strong>Xero:</strong> Ledger bridge</li>
                                </ul>
                                <h4>🔄 Partner Expansion</h4>
                                <ul>
                                    <li>Shopify, Sage, and Wave placeholders</li>
                                    <li>Partner API documentation</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Layout Polish -->
                    <div class="timeline-item in-progress">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">Active Refinement</div>
                            <h3>Layout Root-Cause Optimization</h3>
                            <div class="timeline-details">
                                <h4>🔄 Scrollbar-Free UI</h4>
                                <ul>
                                    <li>Standardizing viewport heights</li>
                                    <li>Eliminating redundant browser scrollbars</li>
                                    <li>Fixing overflow logic in nested grids</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Next Sprint -->
                    <div class="timeline-item planned">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">Weeks 2-3 (Jan 2026)</div>
                            <h3>Folder Batch Processing</h3>
                            <div class="timeline-details">
                                <h4>📋 Planned Features</h4>
                                <ul>
                                    <li><strong>Folder Scanner:</strong> Point to folder, process all statements</li>
                                    <li><strong>Auto-Detection:</strong> Detect accounts from folder structure</li>
                                    <li><strong>Chronological Processing:</strong> Sort and process in order</li>
                                    <li><strong>Progress Tracking:</strong> Real-time UI with file-by-file status</li>
                                    <li><strong>Error Handling:</strong> Skip failed files, continue processing</li>
                                    <li><strong>Results Summary:</strong> Show accounts, transactions, date range</li>
                                </ul>

                                <h4>💡 User Experience</h4>
                                <ul>
                                    <li>One-click processing (vs 50+ manual uploads)</li>
                                    <li>Automatic account linking</li>
                                    <li>Consolidated reporting</li>
                                    <li>Time savings: Hours → Minutes</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- FUTURE: Vision -->
            <div class="timeline-section" id="timeline-future" style="display: none;">
                <div class="timeline-header">
                    <h2>🚀 Future Vision</h2>
                    <p>The 10,000-foot view of where we're going</p>
                </div>

                <div class="timeline">
                    <!-- Phase 4: Cloud Platform -->
                    <div class="timeline-item future">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">Q1 2026</div>
                            <h3>Phase 4: Cloud Platform & Multi-User</h3>
                            <div class="timeline-details">
                                <h4>☁️ Supabase Migration</h4>
                                <ul>
                                    <li>Cloud database (PostgreSQL)</li>
                                    <li>Real-time sync across devices</li>
                                    <li>Offline support with sync queue</li>
                                    <li>Row-level security (RLS)</li>
                                </ul>

                                <h4>👥 Multi-User System</h4>
                                <ul>
                                    <li><strong>Business Owner Tier:</strong> Full analytics, reports, tax estimation</li>
                                    <li><strong>Accountant Tier:</strong> Multi-client management, bulk processing</li>
                                    <li><strong>Enterprise Tier:</strong> White-label, API access, custom COA</li>
                                </ul>

                                <h4>🏦 Multi-Account Support</h4>
                                <ul>
                                    <li>Account registry (10+ accounts per business)</li>
                                    <li>Auto-detection from statements</li>
                                    <li>Consolidated dashboard</li>
                                    <li>Per-account filtering</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 5: Machine Learning -->
                    <div class="timeline-item future">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">Q2 2026</div>
                            <h3>Phase 5: Comprehensive Learning System</h3>
                            <div class="timeline-details">
                                <h4>🧠 5 Learning Domains</h4>
                                <ul>
                                    <li><strong>Statement Format Learning:</strong> Auto-adapt to new PDF/CSV layouts</li>
                                    <li><strong>Vendor Recognition:</strong> Normalize names, learn aliases</li>
                                    <li><strong>COA/GIFI Mapping:</strong> Canadian tax codes, industry COAs</li>
                                    <li><strong>Transaction Categorization:</strong> Multi-factor scoring</li>
                                    <li><strong>Data Source Integration:</strong> Bank feeds, APIs</li>
                                </ul>

                                <h4>⚡ Performance Architecture</h4>
                                <ul>
                                    <li><strong>Hot Storage:</strong> In-memory cache (<10ms)</li>
                                    <li><strong>Warm Storage:</strong> Supabase indexed (<100ms)</li>
                                    <li><strong>Cold Storage:</strong> Archived data (rare access)</li>
                                    <li><strong>Background Workers:</strong> Heavy learning tasks async</li>
                                </ul>

                                <h4>📊 Continuous Improvement</h4>
                                <ul>
                                    <li>Learn from every transaction</li>
                                    <li>User corrections improve system</li>
                                    <li>Global knowledge sharing</li>
                                    <li>Confidence scoring (>95% accuracy target)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 6: Advanced Features -->
                    <div class="timeline-item future">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">Q3 2026</div>
                            <h3>Phase 6: Advanced Automation</h3>
                            <div class="timeline-details">
                                <h4>🔌 Bank Feed Integration</h4>
                                <ul>
                                    <li>Direct bank connections (Plaid, Flinks)</li>
                                    <li>Real-time transaction sync</li>
                                    <li>Automatic reconciliation</li>
                                    <li>Multi-bank aggregation</li>
                                </ul>

                                <h4>📱 Mobile App</h4>
                                <ul>
                                    <li>iOS & Android apps</li>
                                    <li>Receipt scanning (OCR)</li>
                                    <li>On-the-go categorization</li>
                                    <li>Push notifications</li>
                                </ul>

                                <h4>🤖 AI Assistant</h4>
                                <ul>
                                    <li>Natural language queries</li>
                                    <li>Automated insights & alerts</li>
                                    <li>Predictive cash flow</li>
                                    <li>Tax optimization suggestions</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- Phase 7: Enterprise -->
                    <div class="timeline-item future">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">Q4 2026</div>
                            <h3>Phase 7: Enterprise & Ecosystem</h3>
                            <div class="timeline-details">
                                <h4>🏢 Enterprise Features</h4>
                                <ul>
                                    <li>White-label platform</li>
                                    <li>Custom branding</li>
                                    <li>Advanced permissions</li>
                                    <li>Audit trails</li>
                                    <li>SSO integration</li>
                                </ul>

                                <h4>🔗 Integrations</h4>
                                <ul>
                                    <li>QuickBooks sync</li>
                                    <li>Xero integration</li>
                                    <li>Sage compatibility</li>
                                    <li>API for third-party apps</li>
                                </ul>

                                <h4>🌍 Global Expansion</h4>
                                <ul>
                                    <li>Multi-currency support (beyond CAD/USD)</li>
                                    <li>International bank formats</li>
                                    <li>Country-specific tax codes</li>
                                    <li>Localization (FR, ES, etc.)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <!-- The Vision -->
                    <div class="timeline-item vision">
                        <div class="timeline-marker"></div>
                        <div class="timeline-content">
                            <div class="timeline-date">2027 & Beyond</div>
                            <h3>🌟 The Ultimate Vision</h3>
                            <div class="timeline-details">
                                <h4>💡 Mission</h4>
                                <p class="vision-statement">
                                    <strong>"Make bookkeeping so automated that business owners never think about it."</strong>
                                </p>

                                <h4>🎯 Goals</h4>
                                <ul>
                                    <li><strong>Zero Manual Entry:</strong> 100% automated transaction import</li>
                                    <li><strong>Perfect Categorization:</strong> 99%+ accuracy with AI</li>
                                    <li><strong>Real-Time Insights:</strong> Know your financial position instantly</li>
                                    <li><strong>Predictive Intelligence:</strong> AI that anticipates needs</li>
                                    <li><strong>Global Standard:</strong> The go-to platform for SMB bookkeeping</li>
                                </ul>

                                <h4>📈 Success Metrics</h4>
                                <ul>
                                    <li>10,000+ active businesses</li>
                                    <li>1,000+ accountant partners</li>
                                    <li>$1M+ ARR</li>
                                    <li>95%+ customer satisfaction</li>
                                    <li>Industry recognition & awards</li>
                                </ul>

                                <h4>🚀 Impact</h4>
                                <ul>
                                    <li>Save business owners 20+ hours/month</li>
                                    <li>Reduce bookkeeping overhead by 90% via AI</li>
                                    <li>Automated Tax Filing for Canadian SMBs</li>
                                    <li>Real-time Financial Health Score</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Stats Summary -->
            <div class="roadmap-stats">
                <div class="stat-card">
                    <div class="stat-number">26</div>
                    <div class="stat-label">Statement Types Supported</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">9</div>
                    <div class="stat-label">Financial Institutions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">100+</div>
                    <div class="stat-label">Vendors in Knowledge Base</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number">95%+</div>
                    <div class="stat-label">Target Accuracy</div>
                </div>
            </div>
        </div>
    `;
}

// Initialize roadmap page
function initRoadmap() {
    // Tab switching
    const tabs = document.querySelectorAll('.timeline-tab');
    const sections = document.querySelectorAll('.timeline-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const period = tab.dataset.period;

            // Update active tab
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // Show corresponding section
            sections.forEach(section => {
                section.style.display = 'none';
            });
            document.getElementById(`timeline-${period}`).style.display = 'block';
        });
    });
}

// Export for router
window.renderRoadmap = renderRoadmap;
window.initRoadmap = initRoadmap;
