/**
 * V5 PDF Viewer
 * Internal viewer for Phase 4 Audit Features
 */
(function () {
  window.renderV5PdfViewer = function () {
    return `
      <div class="page v5-pdf-viewer-page" style="height: 100vh; display: flex; flex-direction: column; overflow: hidden; background: #f8fafc;">
        <style>
          @keyframes v5-pulse {
            0% { background: rgba(139, 92, 246, 0.1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.4); }
            50% { background: rgba(139, 92, 246, 0.25); box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
            100% { background: rgba(139, 92, 246, 0.1); box-shadow: 0 0 0 0 rgba(139, 92, 246, 0); }
          }
        </style>
        <!-- Header / Toolbar -->
        <div class="page-header" style="padding: 0.75rem 1.5rem; background: white; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; z-index: 100; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
          <div style="display: flex; align-items: center; gap: 1rem;">
            <button class="v5-back-btn" onclick="window.history.back()" style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 6px; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; cursor: pointer; color: #475569; transition: all 0.2s;">
              <i class="ph ph-arrow-left" style="font-size: 1.1rem;"></i>
            </button>
            <div>
              <h1 class="page-title" id="v5-pdf-title" style="font-size: 1rem; margin-bottom: 0; font-weight: 600; color: #1e293b; max-width: 400px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">Loading PDF...</h1>
              <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: #64748b;">
                <i class="ph ph-shield-check"></i> Verified Audit Source
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 0.75rem; align-items: center;">
            <div id="v5-pdf-pagination" style="font-size: 0.8rem; font-weight: 500; color: #475569; background: #f1f5f9; padding: 6px 14px; border-radius: 20px; border: 1px solid #e2e8f0;">
              Page <span id="v5-pdf-current-page" style="color: #1e293b;">-</span> / <span id="v5-pdf-total-pages">-</span>
            </div>
            <button class="btn-primary" onclick="window.print()" style="padding: 6px 14px; font-size: 0.8rem; border-radius: 20px; background: #0f172a;">
              <i class="ph ph-printer"></i> Print
            </button>
          </div>
        </div>

        <!-- Viewer Container -->
        <div id="v5-pdf-scroll-container" style="flex: 1; overflow-y: auto; background: #cbd5e1; padding: 3rem 1rem; display: flex; flex-direction: column; align-items: center; scroll-behavior: smooth;">
           <div id="v5-pdf-page-wrapper" style="position: relative; background: white; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04); border-radius: 4px; line-height: 0;">
             <canvas id="v5-pdf-canvas"></canvas>
             <!-- Highlight Overlay -->
             <!-- Highlight Overlay (Dynamic) -->
           </div>

           <!-- Navigation Helper -->
           <div id="v5-pdf-empty-state" style="display: none; text-align: center; margin-top: 4rem;">
              <i class="ph ph-file-dashed" style="font-size: 4rem; color: #94a3b8; margin-bottom: 1.5rem;"></i>
              <h2 style="color: #1e293b; font-size: 1.25rem; font-weight: 600;">File Not Found</h2>
              <p style="color: #64748b; max-width: 320px; margin: 0.5rem auto 1.5rem;">The requested PDF is no longer in the active script memory.</p>
              <button class="btn-primary" onclick="window.router.navigate('/txn-import-v5')">Return to Transactions</button>
           </div>
        </div>
      </div>
    `;
  };

  window.initV5PdfViewer = async function (overrides = null) {
    // 1. Extract Params
    let fileName, targetPage, targetY, targetHeight;
    let params = null; // Declare early for scope access

    if (overrides) {
      fileName = overrides.file;
      targetPage = parseInt(overrides.page || '1');
      targetY = parseFloat(overrides.y || '0');
      targetHeight = parseFloat(overrides.height || '15');
    } else {
      const hashParts = window.location.hash.split('?');
      params = new URLSearchParams(hashParts[1] || '');
      fileName = params.get('file');
      targetPage = parseInt(params.get('page') || '1');
      targetY = parseFloat(params.get('y') || '0');
      targetHeight = parseFloat(params.get('h') || '15');
    }

    // Define container in wider scope for error handling
    const container = document.getElementById('v5-pdf-scroll-container');

    if (!fileName) {
      this.showError('No file specified in URL');
      return;
    }

    // 2. Update Header
    document.getElementById('v5-pdf-title').textContent = fileName;

    // 4. Find File in Memory (V5State)
    const file = (window.V5State.selectedFiles && window.V5State.selectedFiles.find(f => f.name === fileName)) ||
      (window.V5State.fileCache && window.V5State.fileCache.find(f => f.name === fileName));

    if (!file) {
      document.getElementById('v5-pdf-page-wrapper').style.display = 'none';
      document.getElementById('v5-pdf-pagination').style.display = 'none';
      document.getElementById('v5-pdf-empty-state').style.display = 'block';
      document.getElementById('v5-pdf-title').textContent = 'File Memory Warning';
      return;
    }

    // 5. Render PDF
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;

      const totalPages = pdf.numPages;
      document.getElementById('v5-pdf-total-pages').textContent = totalPages;

      const pageToRender = Math.min(Math.max(1, targetPage), totalPages);
      const page = await pdf.getPage(pageToRender);

      if (!container) throw new Error('PDF Scroll Container not found in DOM');

      const containerWidth = container.clientWidth - 80;
      const initialViewport = page.getViewport({ scale: 1 });
      const scale = containerWidth / initialViewport.width;
      const viewport = page.getViewport({ scale: Math.min(scale, 1.5) });

      const canvas = document.getElementById('v5-pdf-canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      await page.render({ canvasContext: ctx, viewport: viewport }).promise;
      document.getElementById('v5-pdf-current-page').textContent = pageToRender;

      // 6. Apply Highlights
      const highlightYs = [];

      // Primary Target
      if (targetY > 0) highlightYs.push({ y: targetY, h: targetHeight || 20 });

      // Extra Highlights from URL only if params exists
      if (params) {
        const highlightsParam = params.get('highlights');
        if (highlightsParam) {
          highlightsParam.split(',').forEach(h => {
            const parsed = parseFloat(h);
            if (!isNaN(parsed) && parsed > 0) highlightYs.push({ y: parsed, h: 20 });
          });
        }
      }

      // Render Highlights
      if (highlightYs.length > 0) {
        const wrapper = document.getElementById('v5-pdf-page-wrapper');
        const pageHeightPt = page.view[3];

        let firstTopPx = null;

        highlightYs.forEach((item, index) => {
          // Convert PDF Y (bottom-up) to Viewport Y (top-down)
          // Y=0 is bottom left in PDF.
          const yFromTopPt = pageHeightPt - item.y;

          // CRITICAL DEBUG: Let's see all the values
          console.log(`🔍 [COORDINATE DEBUG] Transaction highlight:`);
          console.log(`   PDF pageHeightPt: ${pageHeightPt}`);
          console.log(`   PDF item.y (from parser): ${item.y}`);
          console.log(`   PDF item.h (height): ${item.h}`);
          console.log(`   Calculated yFromTopPt: ${yFromTopPt}`);
          console.log(`   Scale factor: ${scale}`);

          // Try BOTH formulas and log results
          const topPx_v1 = (yFromTopPt * scale) - (item.h * scale);
          const topPx_v2 = yFromTopPt * scale;
          const topPx_v3 = (yFromTopPt - item.h) * scale;

          console.log(`   Formula V1 (original): ${topPx_v1}px`);
          console.log(`   Formula V2 (no height): ${topPx_v2}px`);
          console.log(`   Formula V3 (subtract before scale): ${topPx_v3}px`);

          // Use V1 for now
          const topPx = topPx_v1;
          const heightPx = (item.h || 20) * scale;

          // 🐛 DEBUG LOGGING
          console.group(`🔍 PDF Highlight #${index + 1} Debug`);
          console.log('📄 PDF Coordinates (bottom-up):', {
            targetY: item.y,
            targetHeight: item.h,
            pageHeightPt: pageHeightPt
          });
          console.log('🔄 Conversion to Top-Down:', {
            yFromTopPt: yFromTopPt,
            formula: `${pageHeightPt} - ${item.y} = ${yFromTopPt}`
          });
          console.log('📐 Scale & Pixel Calculation:', {
            scale: scale,
            topPx: topPx,
            heightPx: heightPx,
            formula: `(${yFromTopPt} * ${scale}) - (${item.h} * ${scale}) = ${topPx}`
          });
          console.log('🎯 Final CSS Position:', {
            top: `${topPx}px`,
            height: `${heightPx}px`
          });
          console.groupEnd();

          if (firstTopPx === null || topPx < firstTopPx) {
            firstTopPx = topPx;
          }

          const highlightBox = document.createElement('div');
          highlightBox.className = 'v5-pdf-highlight-dynamic';
          highlightBox.style.cssText = `
            position: absolute; 
            left: 0; 
            right: 0; 
            top: ${topPx}px; 
            height: ${heightPx}px;
            background: rgba(255, 255, 0, 0.2); 
            border: 2px solid rgba(255, 0, 0, 0.6);
            pointer-events: none; 
            z-index: 10; 
          `;
          wrapper.appendChild(highlightBox);
        });

        // Scroll Logic
        if (firstTopPx !== null && container) {
          setTimeout(() => {
            container.scrollTo({
              top: Math.max(0, firstTopPx - 150),
              behavior: 'smooth'
            });
          }, 300);
        }
      }

    } catch (err) {
      console.error('❌ PDF Hub Error:', err);
      if (container) {
        container.innerHTML = `<div style="color: #ef4444; padding: 2rem;">Error loading PDF: ${err.message}</div>`;
      }
    }
  };

  window.showError = function (msg) {
    const title = document.getElementById('v5-pdf-title');
    if (title) title.textContent = 'Error';
    const container = document.getElementById('v5-pdf-container');
    if (container) container.innerHTML = `<div style="color: #ef4444; padding: 2rem;">${msg}</div>`;
  };

})();
