# Changelog

## [2.1.0] - 2025-12-15
### Added
- **Global Modal Manager**: Centralized system for handling all modals (click-outside, ESC key).
- **Auto-Restore**: New `SessionManager` automatically loads the last session on startup.
- **Version Explorer**: View and restore the last 3 sessions from the Upload area.
- **Standardized Modals**: All modals (Bank Accounts, Reports, Vendor Dictionary, etc.) now use `super-modal.css` for consistent UI/UX.

### Changed
- **Renaming**: 
    - `vendorModal` -> `VDMModal` (Vendor Dictionary Modal)
    - `drillDownModal` -> `VSMModal` (Vendor Sub Modal)
    - `vendorSummaryModal` -> `VIGModal` (Vendor In Grid Modal)
- **UI Cleanup**: Removed "Cloud Icon" column from grids.
- **Navigation**: Moved "Reconciliation" button to Sidebar.
- **CSS**: Cleaned up `styles.css` to remove legacy modal styles.

### Fixed
- Fixed "Zoom" animation on modal close.
- Fixed `manageAccountsModal` closing logic.
