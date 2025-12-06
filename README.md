# AutoBookkeeping

**Version 1.03** - Intelligent Bank Statement Processor

## Overview
AutoBookkeeping automatically processes bank statement CSV files, matches transactions to vendors, allocates accounts using AI, and exports properly formatted General Ledger files for accounting software.

## Features

### Core Functionality
- **CSV Import**: Drag & drop CSV bank statement files
- **Smart Vendor Matching**: Automatically matches transactions to vendor dictionary
- **AI-Powered Allocation**: Suggests account codes based on vendor names and categories
- **Interactive Review**: Edit transactions in spreadsheet-like grid with real-time updates
- **Bank Reconciliation**: Automatic balance validation and discrepancy detection
- **General Ledger Export**: Export to Excel with proper Debit/Credit/Balance columns

### Version 1.03 (Latest)
- ✅ **Chronological Ref# Numbering**: Transactions numbered 001, 002, 003...
- ✅ **Responsive Grid Layout**: Properly adapts to window resizing
- ✅ **Simplified Excel Export**: Only exports essential columns (Ref#, Debits, Credits, Balance, Account)
- ✅ **Running Balance Calculation**: Accurate cumulative balance in exports

### Version 1.02
- ✅ Fixed transaction grid initialization errors
- ✅ Fixed file processing element ID mismatches
- ✅ Restored all missing grid methods

### Version 1.01
- ✅ Bi-directional Vendor Learning: Manual allocations update vendor dictionary
- ✅ AI Re-think Feature: Batch optimize unallocated transactions
- ✅ Bank Reconciliation Panel: Validate opening/ending balances
- ✅ Dark/Light Theme Toggle
- ✅ Fully Editable Vendor Dictionary

## Quick Start

1. **Open Application**
   - Open `index.html` in a modern web browser
   - For best results, use a local web server:
     ```
     python -m http.server 8000
     ```
   - Navigate to `http://localhost:8000`

2. **Upload CSV File**
   - Drag & drop your bank statement CSV onto the upload zone
   - Or click to browse and select file

3. **Review Transactions**
   - View auto-matched vendors and allocated accounts
   - Edit any transaction directly in the grid
   - Manual edits automatically update vendor dictionary

4. **Export**
   - Click "Export XLS" to download General Ledger
   - Format: Ref#, Debits, Credits, Balance, Account

## Excel Export Format

The General Ledger export contains only 5 columns:
- **Ref#**: Sequential transaction number (001, 002, 003...)
- **Debits**: Positive transaction amounts
- **Credits**: Negative transaction amounts (as positive numbers)
- **Balance**: Running cumulative balance
- **Account**: Account code and description

## File Structure

```
AutoBookkeeping/
├── index.html              # Main application
├── app.js                  # Application controller
├── transaction-grid.js     # Transaction grid with AG Grid
├── excel-exporter.js       # Excel export functionality
├── csv-parser.js           # CSV file parsing
├── vendor-matcher.js       # Vendor matching logic
├── vendor-ai.js            # AI categorization
├── account-allocator.js    # Account allocation
├── reconciliation.js       # Bank reconciliation
├── theme-manager.js        # Theme switching
└── styles.css              # Application styles
```

## Browser Compatibility

- Chrome 90+ (recommended)
- Firefox 88+
- Edge 90+
- Safari 14+

## Technologies

- **AG Grid Community**: High-performance data grid
- **SheetJS (XLSX)**: Excel file generation
- **Vanilla JavaScript**: No framework dependencies

## Changelog

### v1.03 (2025-12-06)
- Added chronological Ref# numbering to transaction grid
- Fixed responsive grid layout issues
- Completely rewrote Excel export to simplified General Ledger format
- Removed unnecessary columns from export
- Implemented proper running balance calculation

### v1.02 (2025-12-06)
- Fixed critical initialization errors
- Restored missing TransactionGrid methods
- Fixed file processing element ID references

### v1.01 (2025-12-05)
- Added bi-directional vendor learning
- Added AI Re-think batch optimization feature
- Added bank reconciliation panel
- Improved UI/UX

### v1.0 (2025-12-04)
- Initial release
- CSV import and parsing
- Vendor dictionary management
- Account allocation
- Excel export

## License

Proprietary - For Internal Use Only

## Support

For issues or questions, contact the development team.
