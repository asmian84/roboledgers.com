/**
 * Home/Dashboard Page
 */

window.renderHome = function () {
  return `
    <style>
      /* VIEWPORT-CONSTRAINED LAYOUT - NO SCROLLBAR */
      .home-container {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: calc(100vh - 60px); /* Account for nav bar */
        max-height: calc(100vh - 60px);
        overflow: hidden;
        padding: 1vh 1.5vw;
        box-sizing: border-box;
      }

      .home-header {
        text-align: center;
        margin-bottom: 1vh;
        flex-shrink: 0;
        animation: fadeInDown 0.8s ease-out;
      }

      .home-header h1 {
        font-size: clamp(1.5rem, 3.5vh, 2.5rem);
        font-weight: 800;
        background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #3b82f6) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin: 0 0 0.5vh 0;
        letter-spacing: -0.02em;
      }

      .home-header p {
        font-size: clamp(0.75rem, 1.8vh, 1rem);
        color: var(--text-secondary, #64748b);
        font-weight: 500;
        margin: 0;
      }

      /* TWO-COLUMN LAYOUT - FITS VIEWPORT */
      .home-main-content {
        display: grid;
        grid-template-columns: 1fr;
        gap: 1.5vw;
        flex: 1;
        min-height: 0;
        animation: fadeInUp 0.8s ease-out 0.2s both;
      }

      @media (min-width: 1024px) {
        .home-main-content {
          grid-template-columns: 1.2fr 1fr;
          gap: 2vw;
        }
      }

      /* LEFT SIDE - CIRCULAR SDLC WORKFLOW */
      .workflow-section {
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border: 2px solid var(--border-color, #e2e8f0);
        border-radius: 20px;
        padding: 2vh 1.5vw;
        position: relative;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 0;
      }

      .workflow-section::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 80%;
        height: 80%;
        background: radial-gradient(circle, rgba(59, 130, 246, 0.08) 0%, transparent 70%);
        border-radius: 50%;
        pointer-events: none;
      }

      .workflow-title {
        text-align: center;
        font-size: clamp(1rem, 2vh, 1.3rem);
        font-weight: 700;
        color: var(--text-primary, #0f172a);
        margin-bottom: 1.5vh;
        position: relative;
        z-index: 1;
        flex-shrink: 0;
      }

      /* CIRCULAR SDLC LAYOUT - RESPONSIVE TO CONTAINER */
      .sdlc-circle {
        position: relative;
        width: 100%;
        max-width: min(50vh, 90%);
        aspect-ratio: 1;
        margin: 0 auto;
        z-index: 1;
        flex-shrink: 1;
      }

      /* Center Hub */
      .sdlc-center {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: clamp(80px, 12vh, 120px);
        height: clamp(80px, 12vh, 120px);
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: 700;
        font-size: clamp(0.7rem, 1.5vh, 0.95rem);
        box-shadow: 0 8px 30px rgba(59, 130, 246, 0.4);
        z-index: 10;
        line-height: 1.3;
        text-align: center;
        padding: 0.8vh;
      }

      .sdlc-center-icon {
        font-size: clamp(1.2rem, 2.5vh, 1.8rem);
        margin-bottom: 0.3vh;
      }

      /* Workflow Steps Positioned in Circle */
      .sdlc-step {
        position: absolute;
        width: clamp(75px, 10vh, 105px);
        background: white;
        border: 2px solid var(--border-color, #e2e8f0);
        border-radius: 14px;
        padding: 1vh 0.8vw;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        cursor: pointer;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      }

      .sdlc-step:hover {
        transform: scale(1.12);
        box-shadow: 0 12px 30px rgba(59, 130, 246, 0.25);
        border-color: var(--primary-color, #3b82f6);
        background: linear-gradient(135deg, #ffffff 0%, #f0f9ff 100%);
        z-index: 20;
      }

      /* Position each step around the circle */
      .sdlc-step:nth-child(1) { top: 0; left: 50%; transform: translateX(-50%); }
      .sdlc-step:nth-child(2) { top: 15%; right: 8%; }
      .sdlc-step:nth-child(3) { top: 50%; right: 0; transform: translateY(-50%); }
      .sdlc-step:nth-child(4) { bottom: 15%; right: 8%; }
      .sdlc-step:nth-child(5) { bottom: 0; left: 50%; transform: translateX(-50%); }
      .sdlc-step:nth-child(6) { bottom: 15%; left: 8%; }
      .sdlc-step:nth-child(7) { top: 50%; left: 0; transform: translateY(-50%); }
      .sdlc-step:nth-child(8) { top: 15%; left: 8%; }

      .sdlc-icon {
        width: clamp(32px, 4.5vh, 44px);
        height: clamp(32px, 4.5vh, 44px);
        margin: 0 auto 0.5vh;
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(1rem, 2vh, 1.3rem);
        color: white;
        transition: all 0.3s ease;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
      }

      .sdlc-step:hover .sdlc-icon {
        transform: rotate(10deg);
        box-shadow: 0 6px 20px rgba(59, 130, 246, 0.5);
      }

      .sdlc-label {
        font-size: clamp(0.65rem, 1.3vh, 0.8rem);
        font-weight: 700;
        color: var(--text-primary, #0f172a);
        margin-bottom: 0.2vh;
        line-height: 1.2;
      }

      .sdlc-desc {
        font-size: clamp(0.55rem, 1.1vh, 0.65rem);
        color: var(--text-secondary, #64748b);
        line-height: 1.3;
      }

      /* Connecting Lines */
      .sdlc-circle::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 68%;
        height: 68%;
        border: 2px dashed rgba(59, 130, 246, 0.2);
        border-radius: 50%;
        z-index: 0;
      }

      /* RIGHT SIDE - COMPACT FEATURE TILES */
      .features-section {
        display: flex;
        flex-direction: column;
        gap: 0.8vh;
        min-height: 0;
        overflow: hidden;
      }

      .features-header {
        font-size: clamp(1rem, 2vh, 1.3rem);
        font-weight: 700;
        color: var(--text-primary, #0f172a);
        margin: 0 0 0.8vh 0;
        flex-shrink: 0;
      }

      .features-grid {
        display: grid;
        grid-template-columns: 1fr;
        gap: 0.8vh;
        overflow-y: auto;
        overflow-x: hidden;
        flex: 1;
        min-height: 0;
        padding-right: 0.5vw;
      }

      /* Custom scrollbar for features */
      .features-grid::-webkit-scrollbar {
        width: 6px;
      }

      .features-grid::-webkit-scrollbar-track {
        background: var(--bg-secondary, #f8fafc);
        border-radius: 3px;
      }

      .features-grid::-webkit-scrollbar-thumb {
        background: var(--border-color, #cbd5e1);
        border-radius: 3px;
      }

      .features-grid::-webkit-scrollbar-thumb:hover {
        background: var(--primary-color, #3b82f6);
      }

      @media (min-width: 640px) and (max-width: 1023px) {
        .features-grid {
          grid-template-columns: repeat(2, 1fr);
        }
      }

      .feature-tile {
        background: var(--bg-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 10px;
        padding: 1vh 1vw;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: flex;
        align-items: flex-start;
        gap: 1vw;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
        cursor: pointer;
        flex-shrink: 0;
      }

      .feature-tile:hover {
        transform: translateX(6px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
        border-color: var(--primary-color, #3b82f6);
      }

      .feature-tile-icon {
        width: clamp(36px, 4vh, 44px);
        height: clamp(36px, 4vh, 44px);
        min-width: clamp(36px, 4vh, 44px);
        background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: clamp(1rem, 2vh, 1.3rem);
        color: var(--primary-color, #3b82f6);
        transition: all 0.3s ease;
        flex-shrink: 0;
      }

      .feature-tile:hover .feature-tile-icon {
        transform: scale(1.15) rotate(5deg);
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        color: white;
      }

      .feature-tile-content {
        flex: 1;
        min-width: 0;
      }

      .feature-tile h3 {
        font-size: clamp(0.75rem, 1.5vh, 0.9rem);
        font-weight: 700;
        margin: 0 0 0.3vh 0;
        color: var(--text-primary, #0f172a);
      }

      .feature-tile p {
        font-size: clamp(0.65rem, 1.3vh, 0.75rem);
        color: var(--text-secondary, #64748b);
        line-height: 1.4;
        margin: 0;
      }

      .home-footer {
        text-align: center;
        margin-top: 1vh;
        padding: 1vh 1.5vw;
        background: var(--bg-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 10px;
        color: var(--text-tertiary, #94a3b8);
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        flex-shrink: 0;
        font-size: clamp(0.7rem, 1.4vh, 0.85rem);
      }

      .home-footer p {
        margin: 0;
      }

      /* Animations */
      @keyframes fadeInDown {
        from { opacity: 0; transform: translateY(-20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      @keyframes fadeInUp {
        from { opacity: 0; transform: translateY(20px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Mobile responsive - stack vertically */
      @media (max-width: 1023px) {
        .home-container {
          height: auto;
          max-height: none;
          overflow-y: auto;
        }

        .home-main-content {
          grid-template-columns: 1fr;
        }

        .workflow-section {
          min-height: 400px;
        }

        .sdlc-circle {
          max-width: 350px;
        }

        .features-grid {
          overflow-y: visible;
          max-height: none;
        }
      }
    </style>

    <div class="home-container">
      <header class="home-header">
        <h1>RoboLedgers 4.0</h1>
        <p>Zero-Knowledge Financial Intelligence</p>
      </header>

      <div class="home-main-content">
        <!-- LEFT: CIRCULAR SDLC WORKFLOW -->
        <section class="workflow-section">
          <h2 class="workflow-title">🔄 Data Processing Lifecycle</h2>
          <div class="sdlc-circle">
            <!-- Center Hub -->
            <div class="sdlc-center">
              <div class="sdlc-center-icon">🎯</div>
              <div>Continuous<br/>Flow</div>
            </div>

            <!-- Step 1: Upload (Top) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-upload-simple"></i>
              </div>
              <div class="sdlc-label">Upload</div>
              <div class="sdlc-desc">PDF, CSV, Bank Import</div>
            </div>

            <!-- Step 2: Parse (Top Right) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-file-magnifying-glass"></i>
              </div>
              <div class="sdlc-label">Parse</div>
              <div class="sdlc-desc">Extract Data</div>
            </div>

            <!-- Step 3: Review (Right) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-magnifying-glass"></i>
              </div>
              <div class="sdlc-label">Review</div>
              <div class="sdlc-desc">Verify Accuracy</div>
            </div>

            <!-- Step 4: Categorize (Bottom Right) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-brain"></i>
              </div>
              <div class="sdlc-label">AI Categorize</div>
              <div class="sdlc-desc">Auto-ML Matching</div>
            </div>

            <!-- Step 5: Report (Bottom) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-chart-line"></i>
              </div>
              <div class="sdlc-label">Report</div>
              <div class="sdlc-desc">P&L, Balance Sheet</div>
            </div>

            <!-- Step 6: Export (Bottom Left) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-export"></i>
              </div>
              <div class="sdlc-label">Export</div>
              <div class="sdlc-desc">Caseware, Excel</div>
            </div>

            <!-- Step 7: Dashboard (Left) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-monitor"></i>
              </div>
              <div class="sdlc-label">Monitor</div>
              <div class="sdlc-desc">Track Activity</div>
            </div>

            <!-- Step 8: Sync (Top Left) -->
            <div class="sdlc-step">
              <div class="sdlc-icon">
                <i class="ph ph-arrows-merge"></i>
              </div>
              <div class="sdlc-label">Sync</div>
              <div class="sdlc-desc">Cloud Backup</div>
            </div>
          </div>
        </section>

        <!-- RIGHT: COMPACT FEATURE TILES -->
        <section class="features-section">
          <h2 class="features-header">✨ Key Features</h2>
          <div class="features-grid">
            <div class="feature-tile">
              <div class="feature-tile-icon">
                <i class="ph ph-file-pdf"></i>
              </div>
              <div class="feature-tile-content">
                <h3>Smart PDF Parsing</h3>
                <p>Extracts transactions from bank statements using local OCR technology.</p>
              </div>
            </div>

            <div class="feature-tile">
              <div class="feature-tile-icon">
                <i class="ph ph-brain"></i>
              </div>
              <div class="feature-tile-content">
                <h3>AI Categorization</h3>
                <p>Learns from corrections to auto-categorize 95% of transactions.</p>
              </div>
            </div>

            <div class="feature-tile">
              <div class="feature-tile-icon">
                <i class="ph ph-shield-check"></i>
              </div>
              <div class="feature-tile-content">
                <h3>Local-First Privacy</h3>
                <p>All data stays on your device with optional encrypted cloud sync.</p>
              </div>
            </div>

            <div class="feature-tile">
              <div class="feature-tile-icon">
                <i class="ph ph-lightning"></i>
              </div>
              <div class="feature-tile-content">
                <h3>Headless Processing</h3>
                <p>Batch process thousands of files in seconds via CLI.</p>
              </div>
            </div>

            <div class="feature-tile">
              <div class="feature-tile-icon">
                <i class="ph ph-chart-pie-slice"></i>
              </div>
              <div class="feature-tile-content">
                <h3>Visual Analytics</h3>
                <p>AG Grid integration for instant drill-down and filtering.</p>
              </div>
            </div>

            <div class="feature-tile">
              <div class="feature-tile-icon">
                <i class="ph ph-database"></i>
              </div>
              <div class="feature-tile-content">
                <h3>Multi-Format Export</h3>
                <p>Export to Caseware, QuickBooks, Excel, and more.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <footer class="home-footer">
        <p>🚀 Ready to begin? Select a module from the sidebar to start working.</p>
      </footer>
    </div>
  `;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
