# Vendor Indexing Feature - Implementation Summary

## What Was Created:

**File:** `vendor-indexer.js` - Complete vendor indexing module

## What It Does:

1. **Import Multiple CSVs** - User can select multiple categorized CSV files
2. **Extract Vendor Data** - Pulls vendor name, account code, account name from each transaction
3. **AI Name Cleanup** - Uses fuzzy matching to consolidate similar names (e.g., "AMZN Marketplace" → "Amazon")
4. **Remove Duplicates** - Consolidates vendors with >85% name similarity
5. **Build Dictionary** - Adds/updates vendor mappings in VendorMatcher

## How To Integrate:

### Step 1: Add Script Tag
In `index.html` after `vendor-import-export.js`:
```html
<script src="vendor-indexer.js"></script>
```

### Step 2: Add Button in Settings
In Settings → Data Management section, ADD THIS BUTTON FIRST:
```html
<button id="settingsVendorIndexBtn" class="settings-btn settings-btn-primary">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        style="width: 20px; height: 20px;">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
    Vendor Indexing
</button>
<p class="settings-hint">Import multiple CSV files to build vendor dictionary</p>
```

### Step 3: Wire Up Button Event
In `app.js` (around line 1000):
```javascript
// Vendor Indexing button
document.getElementById('settingsVendorIndexBtn')?.addEventListener('click', () => {
    document.getElementById('settingsModal').classList.remove('show');
    VendorIndexer.showIndexingDialog();
});
```

## User Workflow:

1. User clicks "Vendor Indexing" in settings
2. Modal opens asking for CSV files
3. User selects multiple previously-categorized CSVs
4. Click "Start Indexing"
5. System:
   - Reads all files
   - Extracts vendor names from payee field
   - Cleans up names (removes transaction IDs, etc.)
   - Groups similar names (fuzzy matching)
   - Maps to account codes from allocatedAccount field
   - Adds to vendor dictionary
6. Shows results: "Added X vendors, Updated Y vendors"

## Benefits:

✅ **Bulk Import** - Process years of historical data at once
✅ **AI Cleanup** - Automatically fixes messy vendor names
✅ **Consolidation** - Merges "Amazon", "AMZN", "Amazon.com" into one
✅ **Time Savings** - Build entire dictionary from past work
✅ **No Manual Entry** - Zero vendor-by-vendor data entry

## vs Current Import/Export:

**Old Import/Export:**
- Imports vendor dictionary JSON/CSV
- For sharing between users
- Manual format

**New Vendor Indexing:**
- Imports transaction CSVs
- Extracts vendor mappings automatically
- Builds dictionary from historical data

## Category Field Note:

The indexer does NOT use the `category` field - only:
- `payee` (to extract vendor name)
- `allocatedAccount` (account code)
- `allocatedAccountName` (account name)

Category is ignored per user request.

---

**Status:** Code ready, just needs HTML integration (3 small edits above)
