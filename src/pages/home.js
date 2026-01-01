/**
 * Home/Dashboard Page
 */

window.renderHome = function () {
  return `
    <style>
      .home-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 2rem 1rem;
        zoom: 0.7; /* User requested 30% scale down */
      }

      .home-header {
        text-align: center;
        margin-bottom: 4rem;
        animation: fadeInDown 0.8s ease-out;
      }

      .home-header h1 {
        font-size: clamp(2.5rem, 8vw, 4rem);
        font-weight: 800;
        background: linear-gradient(135deg, var(--text-primary, #1e293b) 0%, var(--primary, #3b82f6) 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        margin-bottom: 0.5rem;
        letter-spacing: -0.02em;
      }

      .home-header p {
        font-size: clamp(1rem, 3vw, 1.25rem);
        color: var(--text-secondary, #64748b);
        font-weight: 500;
      }

      .home-grid {
        display: grid;
        grid-template-columns: repeat(1, 1fr);
        gap: 2rem;
        width: 100%;
        animation: fadeInUp 0.8s ease-out 0.2s both;
      }

      /* Responsive Breakpoints */
      @media (min-width: 640px) {
        .home-grid { grid-template-columns: repeat(2, 1fr); }
      }

      @media (min-width: 1024px) {
        .home-grid { grid-template-columns: repeat(3, 1fr); }
      }

      .feature-card {
        position: relative;
        /* Use properly themed background from styles.css */
        background: var(--bg-primary, #ffffff);
        /* Subtle border that works in light/dark modes */
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 16px;
        padding: 2.5rem 2rem;
        text-align: center;
        transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        display: flex;
        flex-direction: column;
        align-items: center;
        /* Cleaner, sleeker shadow */
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);
        overflow: hidden;
      }

      /* Hover State: "Sleek" Lift & Glow */
      .feature-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 15px 30px -5px rgba(0, 0, 0, 0.1);
        border-color: var(--primary-color, #3b82f6);
      }

      /* Icon styling */
      .feature-icon-wrapper {
        width: 64px;
        height: 64px;
        background: var(--bg-secondary, #f8fafc);
        border-radius: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 1.5rem;
        transition: transform 0.3s ease, background 0.3s ease;
        color: var(--primary-color, #3b82f6);
      }

      .feature-card:hover .feature-icon-wrapper {
        transform: scale(1.1);
        background: var(--bg-tertiary, #f1f5f9);
      }

      .feature-icon {
        font-size: 2rem;
        /* Inherit color from wrapper for easy theming */
        color: inherit; 
      }

      .feature-card h3 {
        font-size: 1.25rem;
        font-weight: 700;
        margin-bottom: 0.75rem;
        color: var(--text-primary, #0f172a);
        letter-spacing: -0.01em;
      }

      .feature-card p {
        color: var(--text-secondary, #64748b);
        line-height: 1.6;
        font-size: 0.95rem;
      }

      .home-footer {
        text-align: center;
        margin-top: 5rem;
        padding: 2rem;
        /* Subtle themed container */
        background: var(--bg-primary, #ffffff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 12px;
        width: 100%;
        max-width: 600px;
        color: var(--text-tertiary, #94a3b8);
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
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
    </style>

    <div class="home-container">
      <header class="home-header">
        <h1>RoboLedgers 4.0</h1>
        <p>Zero-Knowledge Financial Intelligence</p>
      </header>
      
      <div class="home-grid">
        <!-- Feature 1 -->
        <article class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-file-pdf feature-icon"></i>
          </div>
          <h3>Smart Parsing</h3>
          <p>Extracts transactions from any bank PDF instantly using local OCR technology. No data ever leaves your machine.</p>
        </article>

        <!-- Feature 2 -->
        <article class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-brain feature-icon"></i>
          </div>
          <h3>AI Categorization</h3>
          <p>Learns from your corrections to categorize 95% of future transactions automatically with deep neural mapping.</p>
        </article>

        <!-- Feature 3 -->
        <article class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-shield-check feature-icon"></i>
          </div>
          <h3>Local Privacy</h3>
          <p>Your financial data stays 100% on your device. We use end-to-end encryption for cloud sync proxies.</p>
        </article>

        <!-- Feature 4: New/Refined -->
        <article class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-lightning feature-icon"></i>
          </div>
          <h3>Headless Mode</h3>
          <p>Power through thousands of files in seconds with the new server-side scanning architecture.</p>
        </article>

        <!-- Feature 5: New -->
        <article class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-chart-pie-slice feature-icon"></i>
          </div>
          <h3>Visual Analytics</h3>
          <p>Dynamic AG Grid integration provides instant drill-down into every expense category and vendor.</p>
        </article>

        <!-- Feature 6: New -->
        <article class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-arrows-merge feature-icon"></i>
          </div>
          <h3>Cloud Sync</h3>
          <p>Optional Supabase integration keeps your ledger synchronized across all your authorized devices.</p>
        </article>
      </div>

      <footer class="home-footer">
        <p>Ready to begin? Select a module from the sidebar to start working.</p>
      </footer>
    </div>
  `;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
