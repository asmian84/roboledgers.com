/**
 * Data Migration Tool
 * Imports existing vendor database, COA, and transactions from old system to v3
 */

window.DataMigration = {

    // Import vendor dictionary from old system
    async importVendorDictionary() {
        console.log('📦 Migrating Vendor Dictionary...');

        try {
            // Check if old VendorMatcher exists
            if (window.VendorMatcher && VendorMatcher.getAllVendors) {
                const oldVendors = VendorMatcher.getAllVendors();
                console.log(`Found ${oldVendors.length} vendors in old system`);

                // Store in v3 format
                const migratedVendors = oldVendors.map(v => ({
                    id: v.id || this.generateId(),
                    name: v.name,
                    patterns: v.patterns || [],
                    defaultAccount: v.defaultAccount || '9970',
                    category: v.category || 'General',
                    notes: v.notes || '',
                    createdAt: v.createdAt || new Date().toISOString(),
                    matchCount: v.matchCount || 0
                }));

                localStorage.setItem('ab3_vendors', JSON.stringify(migratedVendors));

                return {
                    success: true,
                    count: migratedVendors.length,
                    vendors: migratedVendors
                };
            }

            return { success: false, error: 'No vendor data found' };

        } catch (error) {
            console.error('Vendor migration error:', error);
            return { success: false, error: error.message };
        }
    },

    // Import Chart of Accounts
    async importChartOfAccounts() {
        console.log('📊 Migrating Chart of Accounts...');

        try {
            // Use the comprehensive COA we just created
            if (window.DEFAULT_CHART_OF_ACCOUNTS) {
                const accounts = window.DEFAULT_CHART_OF_ACCOUNTS.map(acc => ({
                    ...acc,
                    id: acc.code,
                    balance: 0,
                    isActive: true
                }));

                localStorage.setItem('ab3_accounts', JSON.stringify(accounts));

                return {
                    success: true,
                    count: accounts.length,
                    accounts: accounts
                };
            }

            return { success: false, error: 'No COA data found' };

        } catch (error) {
            console.error('COA migration error:', error);
            return { success: false, error: error.message };
        }
    },

    // Import transactions from old system
    async importTransactions() {
        console.log('💰 Migrating Transactions...');

        try {
            // Check for existing transactions in various possible locations
            const sources = [
                'transactions',
                'ab_transactions',
                'app_transactions'
            ];

            let oldTransactions = [];

            for (const key of sources) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            oldTransactions = parsed;
                            console.log(`Found ${oldTransactions.length} transactions in ${key}`);
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            if (oldTransactions.length === 0) {
                return { success: false, error: 'No transactions found' };
            }

            // Convert to v3 format
            const migratedTransactions = oldTransactions.map(tx => ({
                id: tx.id || this.generateId(),
                date: tx.date || tx.transactionDate || new Date().toISOString().split('T')[0],
                description: tx.description || tx.payee || '',
                vendor: tx.vendor || '',
                amount: this.parseAmount(tx.amount || tx.debits || tx.credits || 0),
                type: this.determineType(tx),
                category: tx.category || tx.allocatedAccount || 'Uncategorized',
                accountId: tx.accountId || tx.account || 'default',
                reconciled: tx.reconciled || false,
                notes: tx.notes || '',
                importedFrom: 'migration',
                createdAt: tx.createdAt || new Date().toISOString()
            }));

            localStorage.setItem('ab3_transactions', JSON.stringify(migratedTransactions));

            return {
                success: true,
                count: migratedTransactions.length,
                transactions: migratedTransactions
            };

        } catch (error) {
            console.error('Transaction migration error:', error);
            return { success: false, error: error.message };
        }
    },

    // Import bank accounts
    async importBankAccounts() {
        console.log('🏦 Migrating Bank Accounts...');

        try {
            const sources = ['bankAccounts', 'ab_bankAccounts'];
            let oldAccounts = [];

            for (const key of sources) {
                const data = localStorage.getItem(key);
                if (data) {
                    try {
                        const parsed = JSON.parse(data);
                        if (Array.isArray(parsed)) {
                            oldAccounts = parsed;
                            break;
                        }
                    } catch (e) {
                        continue;
                    }
                }
            }

            if (oldAccounts.length === 0) {
                // Create default account
                oldAccounts = [{
                    id: 'default',
                    name: 'Main Account',
                    type: 'checking',
                    balance: 0
                }];
            }

            const migratedAccounts = oldAccounts.map(acc => ({
                id: acc.id || this.generateId(),
                name: acc.name || 'Unnamed Account',
                type: acc.type || 'checking',
                balance: parseFloat(acc.balance || 0),
                currency: acc.currency || 'CAD',
                isActive: acc.isActive !== false
            }));

            localStorage.setItem('ab3_bankAccounts', JSON.stringify(migratedAccounts));

            return {
                success: true,
                count: migratedAccounts.length,
                accounts: migratedAccounts
            };

        } catch (error) {
            console.error('Bank account migration error:', error);
            return { success: false, error: error.message };
        }
    },

    // Import settings
    async importSettings() {
        console.log('⚙️ Migrating Settings...');

        try {
            const oldSettings = localStorage.getItem('appSettings') || localStorage.getItem('settings');

            if (oldSettings) {
                const parsed = JSON.parse(oldSettings);

                const migratedSettings = {
                    companyName: parsed.companyName || '',
                    fiscalYearEnd: parsed.fiscalYearEnd || '12-31',
                    currency: parsed.currency || 'CAD',
                    theme: parsed.theme || 'cyber-night',
                    ...parsed
                };

                localStorage.setItem('ab3_settings', JSON.stringify(migratedSettings));

                return { success: true, settings: migratedSettings };
            }

            return { success: false, error: 'No settings found' };

        } catch (error) {
            console.error('Settings migration error:', error);
            return { success: false, error: error.message };
        }
    },

    // Run complete migration
    async runFullMigration() {
        console.log('🚀 Starting Full Data Migration...');

        const results = {
            vendors: await this.importVendorDictionary(),
            accounts: await this.importChartOfAccounts(),
            transactions: await this.importTransactions(),
            bankAccounts: await this.importBankAccounts(),
            settings: await this.importSettings()
        };

        // Summary
        const summary = {
            timestamp: new Date().toISOString(),
            vendors: results.vendors.success ? results.vendors.count : 0,
            accounts: results.accounts.success ? results.accounts.count : 0,
            transactions: results.transactions.success ? results.transactions.count : 0,
            bankAccounts: results.bankAccounts.success ? results.bankAccounts.count : 0,
            errors: []
        };

        // Collect errors
        Object.entries(results).forEach(([key, result]) => {
            if (!result.success) {
                summary.errors.push({ type: key, error: result.error });
            }
        });

        // Save migration log
        localStorage.setItem('ab3_migration_log', JSON.stringify(summary));

        console.log('✅ Migration Complete:', summary);

        return {
            success: summary.errors.length === 0,
            summary,
            results
        };
    },

    // Export current v3 data for backup
    exportV3Data() {
        const exportData = {
            version: '3.0.0',
            exportDate: new Date().toISOString(),
            vendors: JSON.parse(localStorage.getItem('ab3_vendors') || '[]'),
            accounts: JSON.parse(localStorage.getItem('ab3_accounts') || '[]'),
            transactions: JSON.parse(localStorage.getItem('ab3_transactions') || '[]'),
            bankAccounts: JSON.parse(localStorage.getItem('ab3_bankAccounts') || '[]'),
            settings: JSON.parse(localStorage.getItem('ab3_settings') || '{}')
        };

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `autobookkeeping-v3-backup-${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);

        return exportData;
    },

    // Import from backup file
    async importFromBackup(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);

                    if (data.vendors) localStorage.setItem('ab3_vendors', JSON.stringify(data.vendors));
                    if (data.accounts) localStorage.setItem('ab3_accounts', JSON.stringify(data.accounts));
                    if (data.transactions) localStorage.setItem('ab3_transactions', JSON.stringify(data.transactions));
                    if (data.bankAccounts) localStorage.setItem('ab3_bankAccounts', JSON.stringify(data.bankAccounts));
                    if (data.settings) localStorage.setItem('ab3_settings', JSON.stringify(data.settings));

                    resolve({
                        success: true,
                        imported: {
                            vendors: data.vendors?.length || 0,
                            accounts: data.accounts?.length || 0,
                            transactions: data.transactions?.length || 0,
                            bankAccounts: data.bankAccounts?.length || 0
                        }
                    });
                } catch (error) {
                    reject(error);
                }
            };

            reader.onerror = reject;
            reader.readAsText(file);
        });
    },

    // Helper: Generate unique ID
    generateId() {
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    // Helper: Parse amount from various formats
    parseAmount(value) {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') {
            return parseFloat(value.replace(/[^0-9.-]/g, '')) || 0;
        }
        return 0;
    },

    // Helper: Determine transaction type
    determineType(tx) {
        if (tx.type) return tx.type;

        const amount = this.parseAmount(tx.amount || tx.debits || tx.credits || 0);

        if (amount > 0) return 'income';
        if (amount < 0) return 'expense';

        return 'other';
    }
};

// Add migration UI to Settings page
function showMigrationModal() {
    const modalHtml = `
    <div id="migrationModal" class="auth-modal" style="display: flex;">
      <div class="auth-modal-content" style="max-width: 600px;">
        <div class="auth-header">
          <h2>📦 Data Migration Tool</h2>
          <p>Import your existing data into AutoBookkeeping v3.0</p>
        </div>
        
        <div style="padding: 1.5rem; max-height: 400px; overflow-y: auto;">
          <div style="margin-bottom: 1.5rem;">
            <h3 style="margin-bottom: 0.5rem;">Migration Options:</h3>
            
            <button onclick="runMigration()" class="btn-primary" style="width: 100%; margin-bottom: 1rem;">
              🚀 Run Full Migration
            </button>
            
            <button onclick="importBackupFile()" class="btn-secondary" style="width: 100%; margin-bottom: 1rem;">
              📁 Import from Backup File
            </button>
            
            <button onclick="exportV3Backup()" class="btn-secondary" style="width: 100%;">
              💾 Export v3 Backup
            </button>
          </div>
          
          <div id="migrationResults" style="display: none; padding: 1rem; background: var(--bg-secondary); border-radius: 6px; margin-top: 1rem;">
            <h4>Migration Results:</h4>
            <div id="migrationResultsContent"></div>
          </div>
        </div>
        
        <div style="padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end;">
          <button onclick="closeMigrationModal()" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function runMigration() {
    const resultsDiv = document.getElementById('migrationResults');
    const contentDiv = document.getElementById('migrationResultsContent');

    resultsDiv.style.display = 'block';
    contentDiv.innerHTML = '<p>⏳ Migrating data...</p>';

    const result = await DataMigration.runFullMigration();

    if (result.success) {
        contentDiv.innerHTML = `
      <p style="color: #10b981; font-weight: 600;">✅ Migration Successful!</p>
      <ul style="margin: 1rem 0;">
        <li>Vendors: ${result.summary.vendors}</li>
        <li>Accounts: ${result.summary.accounts}</li>
        <li>Transactions: ${result.summary.transactions}</li>
        <li>Bank Accounts: ${result.summary.bankAccounts}</li>
      </ul>
      <p style="color: var(--text-secondary); font-size: 0.875rem;">Refresh the page to see your migrated data.</p>
    `;
    } else {
        contentDiv.innerHTML = `
      <p style="color: #ef4444; font-weight: 600;">❌ Migration Incomplete</p>
      <p>${result.summary.errors.map(e => e.type + ': ' + e.error).join('<br>')}</p>
    `;
    }
}

function exportV3Backup() {
    DataMigration.exportV3Data();
    alert('✅ Backup exported successfully!');
}

function importBackupFile() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';

    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (file) {
            try {
                const result = await DataMigration.importFromBackup(file);
                alert(`✅ Imported:\n${result.imported.vendors} vendors\n${result.imported.accounts} accounts\n${result.imported.transactions} transactions`);
                location.reload();
            } catch (error) {
                alert('❌ Import failed: ' + error.message);
            }
        }
    };

    input.click();
}

function closeMigrationModal() {
    const modal = document.getElementById('migrationModal');
    if (modal) modal.remove();
}
