/**
 * Brain Training Dashboard
 * Allows user to ingest bulk historical data to train the CategorizationEngine.
 */
window.renderTrainingPage = async function (container) {
    if (!container) return;

    container.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">
                <i class="ph ph-brain"></i> AI Training Center
            </h1>
        </div>

        <div class="card" style="padding: 32px; text-align: center; border: 2px dashed #cbd5e1; border-radius: 12px; background: #f8fafc; margin-bottom: 24px;">
            <i class="ph ph-files" style="font-size: 48px; color: #64748b; margin-bottom: 16px;"></i>
            <h2 style="font-size: 1.25rem; margin-bottom: 8px;">Feed the Brain</h2>
            <p style="color: #64748b; margin-bottom: 24px;">Drop "Tons of Data" (PDF, CSV, XLS) here to ingest history.<br>We will extract patterns without importing transactions.</p>
            
            <input type="file" id="training-files" multiple accept=".csv,.xlsx,.xls,.pdf" style="display: none;">
            <button class="btn btn-primary" onclick="document.getElementById('training-files').click()">
                <i class="ph ph-upload-simple"></i> Select Files
            </button>
        </div>

        <div id="training-log" style="background: #1e293b; color: #10b981; padding: 16px; border-radius: 8px; font-family: monospace; height: 300px; overflow-y: auto; display: none;">
            <div>> AI Training Console initialized...</div>
        </div>
    `;

    // Handlers
    const fileInput = document.getElementById('training-files');
    const logDiv = document.getElementById('training-log');

    const log = (msg) => {
        logDiv.style.display = 'block';
        const line = document.createElement('div');
        line.innerText = `> ${msg}`;
        logDiv.appendChild(line);
        logDiv.scrollTop = logDiv.scrollHeight;
    };

    fileInput.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        log(`Queueing ${files.length} files for ingestion...`);

        if (!window.SmartCSVParser) {
            log('ERROR: parser not available.');
            return;
        }

        let totalLearned = 0;

        for (const file of files) {
            log(`Reading ${file.name}...`);
            try {
                // Reuse existing parser logic
                const result = await window.SmartCSVParser.parse(file);
                if (result.data && result.data.length > 0) {
                    const count = await trainFromData(result.data);
                    log(`  + Extracted ${count} patterns.`);
                    totalLearned += count;
                } else {
                    log(`  - No usable data found.`);
                }
            } catch (err) {
                log(`  ! Error: ${err.message}`);
            }
        }

        log('-----------------------------------');
        log(`SESSION COMPLETE. Total New Patterns: ${totalLearned}`);
        log('BrainStorage syncing...');

        // Force save
        if (window.CategorizationEngine) {
            window.CategorizationEngine._autoSave(); // Trigger debounce save
            setTimeout(() => log('BrainStorage synced successfully. 🧠'), 2500);
        }
    });

    async function trainFromData(transactions) {
        let count = 0;
        if (!window.CategorizationEngine) return 0;

        // Force feed the engine
        // We use a slightly modified 'learn' loop here
        transactions.forEach(txn => {
            const desc = txn.Description || txn.description;
            // Try to find a category column
            // Prioritize 'Spend Categories' (CIBC) as it is a trusted bank source
            const cat = txn['Spend Categories'] || txn.Category || txn.category || txn['Mapped Category'];

            if (desc && cat && cat !== 'Uncategorized' && cat !== 'Ask My Accountant') {
                window.CategorizationEngine.learn(desc, cat);
                count++;
            }
        });
        return count;
    }
};
