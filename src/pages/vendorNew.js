/**
 * New Vendor Page - Form to create new vendor
 */

window.renderVendorNew = function () {
    return `
    <div class="vendor-new-page">
      <div class="page-header-section">
        <div>
          <button class="btn-back" onclick="router.navigate('/vendors')">
            ← Back to Vendors
          </button>
          <h1 class="page-title">Add New Vendor</h1>
          <p class="page-subtitle">Create a new vendor profile</p>
        </div>
      </div>

      <div class="vendor-form-container">
        <form id="new-vendor-form" onsubmit="createNewVendor(event)">
          <div class="form-section">
            <h3>Basic Information</h3>
            
            <div class="form-group">
              <label>Vendor Name *</label>
              <input 
                type="text" 
                id="new-vendor-name" 
                required 
                placeholder="Enter vendor name"
                oninput="checkVendorDuplicates(this.value)"
              >
              <div id="duplicate-warning" class="duplicate-warning" style="display: none;"></div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <input 
                  type="text" 
                  id="new-vendor-category" 
                  list="category-suggestions-new"
                  placeholder="Auto-suggested based on name"
                >
                <datalist id="category-suggestions-new">
                  <option value="Office Supplies">
                  <option value="Utilities">
                  <option value="Professional Services">
                  <option value="Meals & Entertainment">
                  <option value="Travel">
                  <option value="Vehicle">
                  <option value="Insurance">
                  <option value="Marketing">
                </datalist>
              </div>
              
              <div class="form-group">
                <label>Default Account</label>
                <select id="new-vendor-account">
                  <option value="">Select account...</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Contact Information</h3>
            
            <div class="form-row">
              <div class="form-group">
                <label>Email</label>
                <input type="email" id="new-vendor-email" placeholder="vendor@example.com">
              </div>
              
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="new-vendor-phone" placeholder="(555) 123-4567">
              </div>
            </div>
          </div>
          
          <div class="form-section">
            <h3>Additional Details</h3>
            
            <div class="form-group">
              <label>Notes</label>
              <textarea id="new-vendor-notes" rows="4" placeholder="Optional notes about this vendor"></textarea>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="submit" class="btn-primary">💾 Save Vendor</button>
            <button type="button" class="btn-secondary" onclick="router.navigate('/vendors')">Cancel</button>
          </div>
        </form>
      </div>
    </div>
    
    <script>
      if (typeof initNewVendorPage === 'function') {
        setTimeout(initNewVendorPage, 100);
      }
    </script>
  `;
};

// ==================================================
// NEW VENDOR PAGE LOGIC
// ==================================================

let existingVendors = [];
let debounceTimer = null;

async function initNewVendorPage() {
    console.log('🚀 Initializing New Vendor Page...');

    try {
        // Load existing vendors for duplicate check
        existingVendors = await window.storage.getVendors();

        // Load accounts for dropdown
        const accounts = await window.storage.getAccounts();
        const select = document.getElementById('new-vendor-account');

        accounts.forEach(a => {
            const option = document.createElement('option');
            option.value = a.id;
            option.textContent = `${a.accountNumber} - ${a.name}`;
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Failed to initialize new vendor page:', error);
    }
}

function checkVendorDuplicates(name) {
    // Debounce to avoid too many checks
    clearTimeout(debounceTimer);

    debounceTimer = setTimeout(() => {
        if (!name || name.length < 2) {
            document.getElementById('duplicate-warning').style.display = 'none';
            return;
        }

        // Check for duplicates using vendor matcher
        const result = window.VendorMatcher.checkForDuplicates(name, existingVendors);
        const warningDiv = document.getElementById('duplicate-warning');

        if (result.isDuplicate) {
            warningDiv.innerHTML = `
        <strong>⚠️ Similar vendors found:</strong>
        <ul>
          ${result.suggestions.map(s =>
                `<li>${s.name} (${s.similarity} match) 
             <a href="#/vendors/${s.id}">View</a></li>`
            ).join('')}
        </ul>
        <p>Are you sure you want to create a new vendor?</p>
      `;
            warningDiv.style.display = 'block';
        } else {
            warningDiv.style.display = 'none';
        }

        // Auto-suggest category
        const suggestedCategory = window.VendorMatcher.suggestCategory(name);
        if (suggestedCategory && !document.getElementById('new-vendor-category').value) {
            document.getElementById('new-vendor-category').value = suggestedCategory;
        }
    }, 500);
}

async function createNewVendor(event) {
    event.preventDefault();

    try {
        const vendorData = {
            name: document.getElementById('new-vendor-name').value,
            category: document.getElementById('new-vendor-category').value || '',
            defaultAccountId: document.getElementById('new-vendor-account').value || null,
            email: document.getElementById('new-vendor-email').value || '',
            phone: document.getElementById('new-vendor-phone').value || '',
            notes: document.getElementById('new-vendor-notes').value || ''
        };

        const newVendor = await window.storage.createVendor(vendorData);

        console.log('✅ Vendor created:', newVendor);

        // Navigate to the new vendor's detail page
        router.navigate(`/vendors/${newVendor.id}`);

    } catch (error) {
        console.error('Failed to create vendor:', error);
        alert('Failed to create vendor: ' + error.message);
    }
}
