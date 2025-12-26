/**
 * Merchant Dictionary Page
 * Manage merchants and their description patterns
 */

function renderMerchantDictionaryPage() {
    return `
        <div class="page merchant-dictionary-page">
            <div class="page-header">
                <div>
                    <h1 class="page-title">🏢 Merchant Dictionary</h1>
                    <p class="page-subtitle">Manage merchants and learned description patterns</p>
                </div>
                <div class="page-actions">
                    <button class="btn-secondary" onclick="exportMerchantDictionary()">
                        📥 Export
                    </button>
                    <button class="btn-primary" onclick="showAddMerchantDialog()">
                        ➕ Add Merchant
                    </button>
                </div>
            </div>

            <!-- Stats Cards -->
            <div class="merchant-stats">
                <div class="stat-card">
                    <div class="stat-icon">🏢</div>
                    <div class="stat-content">
                        <div class="stat-value" id="total-merchants">0</div>
                        <div class="stat-label">Total Merchants</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">📝</div>
                    <div class="stat-content">
                        <div class="stat-value" id="total-patterns">0</div>
                        <div class="stat-label">Learned Patterns</div>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon">💾</div>
                    <div class="stat-content">
                        <div class="stat-value" id="total-raw-descriptions">0</div>
                        <div class="stat-label">Raw Descriptions</div>
                    </div>
                </div>
            </div>

            <!-- Search & Filter -->
            <div class="merchant-filters">
                <input type="text" id="search-merchants" placeholder="Search merchants..." 
                       oninput="filterMerchants()" />
                <select id="filter-category" onchange="filterMerchants()">
                    <option value="">All Categories</option>
                </select>
            </div>

            <!-- Merchants List -->
            <div class="merchants-container">
                <table class="merchants-table">
                    <thead>
                        <tr>
                            <th>Merchant</th>
                            <th>Patterns</th>
                            <th>Raw Examples</th>
                            <th>Category</th>
                            <th>Account</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="merchants-body">
                        <tr>
                            <td colspan="6" class="loading">Loading merchants...</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- Merchant Detail Modal -->
            <div id="merchant-detail-modal" class="modal" style="display: none;">
                <div class="modal-content large">
                    <div class="modal-header">
                        <h2 id="merchant-detail-name">Merchant Details</h2>
                        <button class="modal-close" onclick="closeMerchantDetail()">×</button>
                    </div>
                    <div class="modal-body" id="merchant-detail-body">
                        <!-- Populated dynamically -->
                    </div>
                </div>
            </div>
        </div>
    `;
}

// Load and display merchants
async function loadMerchants() {
    try {
        const merchants = await window.merchantDictionary.getAllMerchants();
        const stats = await window.merchantDictionary.getStats();

        // Update stats
        document.getElementById('total-merchants').textContent = stats.total_merchants;
        document.getElementById('total-patterns').textContent = stats.total_patterns;
        document.getElementById('total-raw-descriptions').textContent = stats.total_raw_descriptions;

        // Populate category filter
        const categoryFilter = document.getElementById('filter-category');
        const categories = Object.keys(stats.merchants_by_category);
        categoryFilter.innerHTML = '<option value="">All Categories</option>' +
            categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

        // Display merchants
        const tbody = document.getElementById('merchants-body');
        if (merchants.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data">No merchants found. Import transactions to start learning!</td></tr>';
            return;
        }

        tbody.innerHTML = merchants.map(merchant => `
            <tr>
                <td class="merchant-name">
                    <strong>${merchant.display_name}</strong>
                    ${merchant.industry ? `<br><small>${merchant.industry}</small>` : ''}
                </td>
                <td class="text-center">${merchant.stats?.unique_patterns || 0}</td>
                <td class="text-center">${merchant.stats?.unique_raw_descriptions || 0}</td>
                <td>${merchant.default_category || '-'}</td>
                <td>${merchant.default_account || '-'}</td>
                <td class="actions">
                    <button class="btn-sm btn-primary" onclick="viewMerchantDetail('${merchant.id}')">
                        View
                    </button>
                    <button class="btn-sm btn-secondary" onclick="editMerchant('${merchant.id}')">
                        Edit
                    </button>
                </td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Failed to load merchants:', error);
        document.getElementById('merchants-body').innerHTML =
            '<tr><td colspan="6" class="error">Failed to load merchants</td></tr>';
    }
}

// View merchant details
async function viewMerchantDetail(merchantId) {
    try {
        const details = await window.merchantDictionary.getMerchantDetails(merchantId);

        if (!details) {
            alert('Merchant not found');
            return;
        }

        const modal = document.getElementById('merchant-detail-modal');
        const nameEl = document.getElementById('merchant-detail-name');
        const bodyEl = document.getElementById('merchant-detail-body');

        nameEl.textContent = details.merchant.display_name;

        bodyEl.innerHTML = `
            <div class="merchant-detail-content">
                <!-- Merchant Info -->
                <div class="detail-section">
                    <h3>Merchant Information</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <label>Category:</label>
                            <span>${details.merchant.default_category || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Account:</label>
                            <span>${details.merchant.default_account || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Industry:</label>
                            <span>${details.merchant.industry || '-'}</span>
                        </div>
                        <div class="detail-item">
                            <label>Website:</label>
                            <span>${details.merchant.website || '-'}</span>
                        </div>
                    </div>
                </div>

                <!-- Learned Patterns -->
                <div class="detail-section">
                    <h3>Learned Patterns (${details.patterns.length})</h3>
                    <div class="patterns-list">
                        ${details.patterns.map(p => `
                            <div class="pattern-item">
                                <div class="pattern-header">
                                    <strong>${p.pattern}</strong>
                                    <span class="badge">${p.match_count} matches</span>
                                </div>
                                <div class="pattern-details">
                                    <small>
                                        First seen: ${new Date(p.first_seen).toLocaleDateString()} | 
                                        Last seen: ${new Date(p.last_seen).toLocaleDateString()} |
                                        Source: ${p.learned_from}
                                    </small>
                                </div>
                                <div class="pattern-examples">
                                    <details>
                                        <summary>Raw Examples (${p.total_raw_examples})</summary>
                                        <ul>
                                            ${p.raw_examples.map(ex => `<li><code>${ex}</code></li>`).join('')}
                                            ${p.total_raw_examples > p.raw_examples.length ?
                `<li><em>... and ${p.total_raw_examples - p.raw_examples.length} more</em></li>` : ''}
                                        </ul>
                                    </details>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                <!-- Statistics -->
                <div class="detail-section">
                    <h3>Statistics</h3>
                    <div class="stats-grid">
                        <div class="stat-box">
                            <div class="stat-number">${details.stats.unique_patterns || 0}</div>
                            <div class="stat-label">Unique Patterns</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">${details.stats.unique_raw_descriptions || 0}</div>
                            <div class="stat-label">Raw Descriptions</div>
                        </div>
                    </div>
                </div>

                <!-- Actions -->
                <div class="detail-actions">
                    <button class="btn-secondary" onclick="bulkRecategorizeMerchant('${merchantId}')">
                        🔄 Bulk Recategorize
                    </button>
                    <button class="btn-danger" onclick="deleteMerchant('${merchantId}')">
                        🗑️ Delete Merchant
                    </button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';

    } catch (error) {
        console.error('Failed to load merchant details:', error);
        alert('Failed to load merchant details');
    }
}

function closeMerchantDetail() {
    document.getElementById('merchant-detail-modal').style.display = 'none';
}

// Filter merchants
function filterMerchants() {
    const searchTerm = document.getElementById('search-merchants').value.toLowerCase();
    const category = document.getElementById('filter-category').value;

    const rows = document.querySelectorAll('#merchants-body tr');
    rows.forEach(row => {
        const merchantName = row.querySelector('.merchant-name')?.textContent.toLowerCase() || '';
        const merchantCategory = row.cells[3]?.textContent || '';

        const matchesSearch = merchantName.includes(searchTerm);
        const matchesCategory = !category || merchantCategory === category;

        row.style.display = (matchesSearch && matchesCategory) ? '' : 'none';
    });
}

// Bulk recategorize
async function bulkRecategorizeMerchant(merchantId) {
    const newCategory = prompt('Enter new category:');
    if (!newCategory) return;

    const newAccount = prompt('Enter new account code:');
    if (!newAccount) return;

    try {
        const result = await window.merchantDictionary.bulkRecategorize(
            merchantId,
            newCategory,
            newAccount
        );

        if (result.success) {
            alert(`Successfully updated ${result.merchant}\nFrom: ${result.from.category}\nTo: ${result.to.category}`);
            closeMerchantDetail();
            await loadMerchants();
        } else {
            alert('Failed to recategorize: ' + result.error);
        }
    } catch (error) {
        console.error('Bulk recategorize failed:', error);
        alert('Failed to recategorize merchant');
    }
}

// Delete merchant
async function deleteMerchant(merchantId) {
    if (!confirm('Are you sure you want to delete this merchant? This cannot be undone.')) {
        return;
    }

    try {
        const success = await window.merchantDictionary.deleteMerchant(merchantId);
        if (success) {
            alert('Merchant deleted successfully');
            closeMerchantDetail();
            await loadMerchants();
        } else {
            alert('Failed to delete merchant');
        }
    } catch (error) {
        console.error('Delete failed:', error);
        alert('Failed to delete merchant');
    }
}

// Export dictionary
async function exportMerchantDictionary() {
    try {
        const merchants = await window.merchantDictionary.getAllMerchants();
        const json = JSON.stringify(merchants, null, 2);

        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `merchant-dictionary-${Date.now()}.json`;
        a.click();

        console.log('✅ Merchant dictionary exported');
    } catch (error) {
        console.error('Export failed:', error);
        alert('Failed to export dictionary');
    }
}

// Initialize
window.renderMerchantDictionaryPage = renderMerchantDictionaryPage;
window.loadMerchants = loadMerchants;
window.viewMerchantDetail = viewMerchantDetail;
window.closeMerchantDetail = closeMerchantDetail;
window.filterMerchants = filterMerchants;
window.bulkRecategorizeMerchant = bulkRecategorizeMerchant;
window.deleteMerchant = deleteMerchant;
window.exportMerchantDictionary = exportMerchantDictionary;

// Add merchant dialog
async function showAddMerchantDialog() {
    const name = prompt('Enter merchant name:');
    if (!name) return;

    const category = prompt('Enter default category (optional):');
    const account = prompt('Enter default account code (optional):');

    try {
        const merchant = await window.merchantDictionary.createMerchant({
            display_name: name,
            default_category: category || null,
            default_account: account || null
        });

        alert(`Merchant "${merchant.display_name}" created successfully!`);
        await loadMerchants();
    } catch (error) {
        console.error('Failed to create merchant:', error);
        alert('Failed to create merchant');
    }
}

window.showAddMerchantDialog = showAddMerchantDialog;

// Edit merchant
async function editMerchant(merchantId) {
    const merchant = await window.merchantDictionary.getMerchant(merchantId);
    if (!merchant) {
        alert('Merchant not found');
        return;
    }

    const newName = prompt('Enter new name:', merchant.display_name);
    if (!newName) return;

    const newCategory = prompt('Enter new category:', merchant.default_category || '');
    const newAccount = prompt('Enter new account:', merchant.default_account || '');

    try {
        await window.merchantDictionary.updateMerchant(merchantId, {
            display_name: newName,
            default_category: newCategory || null,
            default_account: newAccount || null
        });

        alert('Merchant updated successfully!');
        await loadMerchants();
    } catch (error) {
        console.error('Failed to update merchant:', error);
        alert('Failed to update merchant');
    }
}

window.editMerchant = editMerchant;
