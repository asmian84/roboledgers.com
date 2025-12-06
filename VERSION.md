# AutoBookkeeping v1.02 - Release Notes

**Release Date:** December 5, 2024

## 🎯 Critical Fix in v1.02

### Bulk Dictionary Indexing Enhancement
**Problem Fixed:** Bulk indexing was not properly learning account mappings from historical CSV files.

**Solution:** Modified `bulk-indexer.js` to correctly use the `Account` column from CSV transactions for vendor-to-account mapping.

**Impact:** The system now properly learns:
- Which vendors should be allocated to which account numbers
- Account mappings based on your historical transaction data
- Cross-references transaction descriptions/payees with account numbers from your chart of accounts

**Code Change:**
```javascript
// Now correctly uses txn.account (the Account column from CSV)
const accountFromCSV = txn.account;
if (accountFromCSV) {
    const currentCount = vendorData.accounts.get(accountFromCSV) || 0;
    vendorData.accounts.set(accountFromCSV, currentCount + 1);
}
```

This means when you bulk index historical CSV files, the system will automatically build vendor dictionary entries with the correct account allocations based on the Account column in your CSV.

---

## 🚧 In Progress (v1.1 Planned)

### Settings Panel & UI Customization
Foundation work started for comprehensive settings:

**Created:**
- `settings-manager.js` - Core settings management with localStorage
- `settings-modal.html` - UI template with tabs (Appearance, Company, Data)
- CSS variables for dynamic font scaling and theming

**Planned Features:**
- Font family selection (Inter, San Francisco, Helvetica, Georgia, Monospace)
- Font size adjustment (Small, Medium, Large, Extra Large)
- Accent color themes (Blue, Purple, Green, Orange, Pink)
- Company name display above Transaction Review
- Consolidated settings panel for all controls
- Apple-style UI refinements

**Status:** Infrastructure in place, integration pending for next release.

---

## 📋 Version Comparison

### v1.01 → v1.02
- ✅ Fixed: Bulk indexing now uses Account column from CSV
- ✅ Added: Settings manager foundation
- ✅ Enhanced: CSS with customization variables
- 🚧 Started: Apple-style settings panel (incomplete)

---

## 🐛 Known Issues

1. `index.html` has some formatting inconsistencies from edit conflicts
2. Settings modal HTML created but not integrated into main HTML
3. Settings UI JavaScript not yet wired to manager

**Workaround:** System is fully functional for core bookkeeping tasks. Settings enhancements coming in v1.1.

---

## 📦 Files Modified in v1.02

- `bulk-indexer.js` - Critical fix for account mapping
- `settings-manager.js` - NEW: Settings core logic
- `vendor-name-utils.js` - Enhanced vendor name extraction
- `styles.css` - Added customization variables
- `settings-modal.html` - NEW: Settings UI template

---

## ⬆️ Upgrade Notes

If upgrading from v1.01:
1. The bulk indexing fix is automatic - just use the app
2. Re-index your historical CSVs to take advantage of improved account learning
3. Settings features will be available in v1.1

---

## 🔜 Roadmap for v1.1

**High Priority:**
- Complete Settings panel integration
- Apple-style UI polish
- Company name display
- Theme customization

**Medium Priority:**
- OCR PDF upload capability
- Enhanced reporting
- Export template customization

---

**Status:** v1.02 - Core functionality ready ✅  
**Next Release:** v1.1 - Settings & UI enhancements
