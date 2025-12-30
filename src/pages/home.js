/**
 * Home/Dashboard Page
 */

window.renderHome = function () {
  return `
    <style>
      .home-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 2rem;
        margin-top: 3rem;
        padding: 0 1rem;
      }

      .feature-card {
        background: var(--bg-surface, #fff);
        border: 1px solid var(--border-color, #e2e8f0);
        border-radius: 16px;
        padding: 2.5rem 2rem;
        text-align: center;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .feature-card:hover {
        transform: translateY(-5px);
        box-shadow: 0 10px 30px rgba(0,0,0,0.05);
        border-color: var(--primary, #3b82f6);
      }

      .feature-icon-wrapper {
        width: 80px;
        height: 80px;
        background: var(--bg-subtle, #f8fafc);
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        margin: 0 auto 1.5rem auto;
      }

      .feature-icon {
        font-size: 2.5rem;
        color: var(--primary, #3b82f6);
      }

      .feature-card h3 {
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
        color: var(--text-primary, #1e293b);
      }

      .feature-card p {
        color: var(--text-secondary, #64748b);
        line-height: 1.6;
        font-size: 0.95rem;
      }

      .home-footer {
        text-align: center;
        margin-top: 4rem;
        color: var(--text-tertiary, #94a3b8);
        font-size: 0.9rem;
      }
    </style>

    <div class="page">
      <div class="page-header" style="text-align: center; margin-bottom: 1rem;">
        <h1 class="page-title" style="font-size: 2.5rem;">AutoBookkeeping v4.0</h1>
        <p class="page-subtitle">Zero-Knowledge Financial Intelligence</p>
      </div>
      
      <div class="home-grid">
        <!-- Feature 1 -->
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-file-pdf feature-icon"></i>
          </div>
          <h3>Smart Parsing</h3>
          <p>Extracts transactions from any bank PDF instantly using local OCR technology.</p>
        </div>

        <!-- Feature 2 -->
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-brain feature-icon"></i>
          </div>
          <h3>AI Categorization</h3>
          <p>Learns from your corrections to categorize 95% of future transactions automatically.</p>
        </div>

        <!-- Feature 3 -->
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-shield-check feature-icon"></i>
          </div>
          <h3>Local Privacy</h3>
          <p>Your financial data stays 100% on your device. No cloud storage, no leaks.</p>
        </div>

        <!-- Feature 4 -->
        <div class="feature-card">
          <div class="feature-icon-wrapper">
            <i class="ph ph-lightning feature-icon"></i>
          </div>
          <h3>Headless Mode</h3>
          <p>Power through thousands of files in seconds with the new Node.js CLI scanner.</p>
        </div>
      </div>

      <div class="home-footer">
        <p>Ready to begin? Select a module from the sidebar to start working.</p>
      </div>
    </div>
  `;
}

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { render };
}
