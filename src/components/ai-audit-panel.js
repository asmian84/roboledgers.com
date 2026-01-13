// AI Audit Panel System - Inline UX Replacement for Popups
// This file contains helper functions for the AI Audit workflow

/**
 * Show inline AI Audit panel (replaces confirm popups)
 */
window.showAIAuditPanel = function (targets, mode) {
  // Create or get panel
  let panel = document.getElementById('ai-audit-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'ai-audit-panel';
    document.body.appendChild(panel);
  }

  const modeLabel = mode === 'selected' ? `${targets.length} Selected Vendors` : `${targets.length} Uncategorized Vendors`;

  panel.innerHTML = `
    <div style="position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.5); backdrop-filter: blur(4px); z-index: 99999; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.2s ease;" onclick="if(event.target === this) window.closeAIAuditPanel()">
      <div style="background: white; border-radius: 16px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25); max-width: 500px; width: 90%; animation: slideUp 0.3s ease;" onclick="event.stopPropagation()">
        
        <!-- Header -->
        <div style="padding: 24px 24px 16px; border-bottom: 1px solid #f1f5f9;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 8px; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); padding: 6px 14px; border-radius: 20px; margin-bottom: 12px;">
                <i class="ph ph-sparkle" style="color: white; font-size: 16px;"></i>
                <span style="color: white; font-weight: 700; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">AI Audit</span>
              </div>
              <h3 style="margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a;">Categorize Vendors</h3>
              <p style="margin: 6px 0 0; color: #64748b; font-size: 0.9rem;">${modeLabel} ready for analysis</p>
            </div>
            <button onclick="window.closeAIAuditPanel()" style="border: none; background: #f1f5f9; width: 32px; height: 32px; border-radius: 8px; cursor: pointer; color: #64748b; font-size: 20px; transition: all 0.2s;" onmouseover="this.style.background='#e2e8f0'; this.style.color='#1e293b'" onmouseout="this.style.background='#f1f5f9'; this.style.color='#64748b'">×</button>
          </div>
        </div>
        
        <!-- Body -->
        <div style="padding: 24px;">
          <div style="margin-bottom: 20px;">
            <label style="display: block; font-weight: 700; font-size: 0.85rem; color: #334155; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Choose AI Engine</label>
            
            <!-- Google AI Option -->
            <label style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s; margin-bottom: 10px;" 
                   id="ai-option-google"
                   onmouseover="if(!this.querySelector('input').checked) this.style.border='2px solid #e0e7ff'"
                   onmouseout="if(!this.querySelector('input').checked) this.style.border='2px solid transparent'">
              <input type="radio" name="ai-engine" value="google" checked
                     style="width: 20px; height: 20px; cursor: pointer; accent-color: #8b5cf6;"
                     onchange="document.getElementById('ai-option-google').style.border='2px solid #8b5cf6'; document.getElementById('ai-option-google').style.background='#f5f3ff'; document.getElementById('ai-option-local').style.border='2px solid transparent'; document.getElementById('ai-option-local').style.background='transparent';">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <i class="ph ph-sparkle" style="color: #8b5cf6; font-size: 18px;"></i>
                  <span style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">Google Gemini AI</span>
                  <span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 12px; font-size: 0.7rem; font-weight: 700;">RECOMMENDED</span>
                </div>
                <p style="margin: 0; font-size: 0.8rem; color: #64748b;">High accuracy, industry-aware categorization (slower)</p>
              </div>
            </label>
            
            <!-- Local Logic Option -->
            <label style="display: flex; align-items: center; gap: 12px; padding: 16px; border: 2px solid transparent; border-radius: 12px; cursor: pointer; transition: all 0.2s;"
                   id="ai-option-local"
                   onmouseover="if(!this.querySelector('input').checked) this.style.border='2px solid #e0e7ff'"
                   onmouseout="if(!this.querySelector('input').checked) this.style.border='2px solid transparent'">
              <input type="radio" name="ai-engine" value="local"
                     style="width: 20px; height: 20px; cursor: pointer; accent-color: #8b5cf6;"
                     onchange="document.getElementById('ai-option-local').style.border='2px solid #8b5cf6'; document.getElementById('ai-option-local').style.background='#f5f3ff'; document.getElementById('ai-option-google').style.border='2px solid transparent'; document.getElementById('ai-option-google').style.background='transparent';">
              <div style="flex: 1;">
                <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                  <i class="ph ph-lightning" style="color: #f59e0b; font-size: 18px;"></i>
                  <span style="font-weight: 700; font-size: 0.95rem; color: #1e293b;">Local Logic</span>
                </div>
                <p style="margin: 0; font-size: 0.8rem; color: #64748b;">Pattern-based matching, instant results</p>
              </div>
            </label>
          </div>
        </div>
        
        <!-- Footer -->
        <div style="padding: 16px 24px 24px; display: flex; gap: 12px; justify-content: flex-end;">
          <button onclick="window.closeAIAuditPanel()" 
                  style="padding: 10px 20px; border: 1px solid #e2e8f0; background: white; color: #64748b; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 0.9rem; transition: all 0.2s;"
                  onmouseover="this.style.background='#f8fafc'; this.style.borderColor='#cbd5e1'"
                  onmouseout="this.style.background='white'; this.style.borderColor='#e2e8f0'">
            Cancel
          </button>
          <button id="ai-audit-start-btn"
                  style="padding: 10px 24px; border: none; background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); color: white; border-radius: 8px; cursor: pointer; font-weight: 700; font-size: 0.9rem; box-shadow: 0 4px 6px -1px rgba(139, 92, 246, 0.3); transition: all 0.2s;"
                  onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 6px 8px -1px rgba(139, 92, 246, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 6px -1px rgba(139, 92, 246, 0.3)'">
            <i class="ph ph-play" style="margin-right: 6px;"></i> Start AI Audit
          </button>
        </div>
        
      </div>
    </div>
  `;

  // Store targets in panel for later retrieval
  panel.dataset.targets = JSON.stringify(targets.map(t => t.id));

  // Set initial state for Google option
  setTimeout(() => {
    const googleOption = document.getElementById('ai-option-google');
    if (googleOption) {
      googleOption.style.border = '2px solid #8b5cf6';
      googleOption.style.background = '#f5f3ff';
    }

    // Attach event listener to start button
    const startBtn = document.getElementById('ai-audit-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        const targetIds = JSON.parse(panel.dataset.targets || '[]');
        window.startAIAudit(targetIds);
      });
    }
  }, 100);
};

/**
 * Close AI Audit panel
 */
window.closeAIAuditPanel = function () {
  const panel = document.getElementById('ai-audit-panel');
  if (panel) {
    panel.style.opacity = '0';
    setTimeout(() => panel.remove(), 200);
  }
};

/**
 * Start the AI audit process
 */
window.startAIAudit = async function (targetIds) {
  const engineInput = document.querySelector('input[name="ai-engine"]:checked');
  const useGoogleAI = engineInput && engineInput.value === 'google';

  window.closeAIAuditPanel();

  if (useGoogleAI && !window.GoogleAICategorizer) {
    if (window.toast) {
      window.toast.error('Google AI Service not loaded. Please configure your API key in Settings.', { duration: 5000 });
    }
    return;
  }

  const all = await window.merchantDictionary.getAllMerchants();
  const targets = all.filter(m => targetIds.includes(m.id));

  const overlay = document.getElementById('v-loading-overlay');
  if (overlay) overlay.style.display = 'flex';
  const textEl = overlay ? overlay.querySelector('p') : null;

  try {
    let updatedMerchants = [];
    let successCount = 0;
    let errorCount = 0;

    if (useGoogleAI) {
      // Delegate to CategorizeAI's internal batch processor
      if (!window.CategorizeAI) await import('./services/categorize-ai.js');

      const { results, successCount: success, errorCount: errors } = await window.CategorizeAI.analyzeBatch(
        targets,
        (processed, total) => {
          if (textEl) {
            textEl.textContent = `🧠 AI Analysis: ${processed}/${total} (${Math.round(processed / total * 100)}%)`;
          }
        }
      );

      updatedMerchants = results;
      successCount = success;
      errorCount = errors;

    } else {
      // Local logic mode
      for (const row of targets) {
        try {
          const result = window.merchantCategorizer.cleanTransaction(row.display_name);
          updatedMerchants.push({ ...row, ...result });
          successCount++;
        } catch {
          errorCount++;
        }
      }
    }

    // Save in batches
    if (textEl) textEl.textContent = "💾 Saving updates...";

    const SAVE_BATCH_SIZE = 100;
    for (let i = 0; i < updatedMerchants.length; i += SAVE_BATCH_SIZE) {
      const saveBatch = updatedMerchants.slice(i, i + SAVE_BATCH_SIZE);
      await window.merchantDictionary.bulkSaveMerchants(saveBatch, null, false);

      if (textEl && updatedMerchants.length > SAVE_BATCH_SIZE) {
        const saveProgress = Math.min(100, Math.round((i + saveBatch.length) / updatedMerchants.length * 100));
        textEl.textContent = `💾 Saving: ${saveProgress}%`;
      }
    }

    // Full grid data refresh with normalization
    if (window.vendorsGridApi) {
      let allVendors = await window.merchantDictionary.getAllMerchants();
      // Normalize for filtering
      allVendors = allVendors.map(v => ({
        ...v,
        default_account: v.default_account || v.default_gl_account || '9970'
      }));
      window.vendorsGridApi.setGridOption('rowData', allVendors);

      // Refresh distribution panel
      if (window.accountDistPanel) {
        window.accountDistPanel.refresh(allVendors);
      }
    }

    // Inline message card
    const msg = document.createElement('div');
    msg.style.cssText = `position: fixed; top: 80px; right: 20px; background: ${errorCount > 0 ? '#fef3c7' : '#d1fae5'}; border: 2px solid ${errorCount > 0 ? '#fbbf24' : '#10b981'}; border-radius: 12px; padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 9999; max-width: 400px; font-weight: 600; color: ${errorCount > 0 ? '#92400e' : '#065f46'};`;
    msg.innerHTML = `<div style="display: flex; gap: 12px;"><span style="font-size: 24px;">${errorCount > 0 ? '⚠️' : '✅'}</span><div><div style="font-size: 16px;">${errorCount > 0 ? 'Complete with Errors' : 'Analysis Complete!'}</div><div style="font-size: 13px; opacity: 0.9;">${errorCount > 0 ? `${successCount} done, ${errorCount} failed` : `${successCount} vendors categorized`}</div></div><button onclick="this.parentElement.parentElement.remove()" style="border: none; background: transparent; font-size: 20px; cursor: pointer;">×</button></div>`;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 10000);

  } catch (err) {
    // Inline error message
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = 'position: fixed; top: 80px; right: 20px; background: #fee2e2; border: 2px solid #ef4444; border-radius: 12px; padding: 16px 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); z-index: 9999; max-width: 400px; font-weight: 600; color: #991b1b;';
    errorDiv.innerHTML = `<div style="display: flex; gap: 12px;"><span style="font-size: 24px;">❌</span><div><div>Processing Error</div><div style="font-size: 13px;">${err.message}</div></div><button onclick="this.parentElement.parentElement.remove()" style="border: none; background: transparent; font-size: 20px; cursor: pointer;">×</button></div>`;
    document.body.appendChild(errorDiv);
    setTimeout(() => errorDiv.remove(), 10000);
  } finally {
    if (overlay) overlay.style.display = 'none';
  }
};
