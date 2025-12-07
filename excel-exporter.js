// Excel Export Functionality

const ExcelExporter = {
    // Export to QuickBooks IIF format
    exportQuickBooks(transactions) {
        const workbook = XLSX.utils.book_new();

        // Prepare data for QuickBooks format
        const qbData = [];

        // Add header row
        qbData.push({
            'Date': 'Date',
            'Ref #': 'Ref #',
            'Account': 'Account',
            'Description': 'Description',
            'Debit': 'Debit',
            'Credit': 'Credit'
        });

        // Add journal entries
        const entries = AccountAllocator.generateJournalEntries(transactions);

        for (const entry of entries) {
            const dateStr = Utils.formatDate(entry.date, 'MM/DD/YYYY');

            // Debit line
            const debitAccount = AccountAllocator.getAccountByCode(entry.debitAccount);
            qbData.push({
                'Date': dateStr,
                'Ref #': entry.ref,
                'Account': debitAccount ? debitAccount.fullName : entry.debitAccount,
                'Description': entry.description,
                'Debit': entry.debitAmount.toFixed(2),
                'Credit': ''
            });

            // Credit line
            const creditAccount = AccountAllocator.getAccountByCode(entry.creditAccount);
            qbData.push({
                'Date': dateStr,
                'Ref #': entry.ref,
                'Account': creditAccount ? creditAccount.fullName : entry.creditAccount,
                'Description': entry.description,
                'Debit': '',
                'Credit': entry.creditAmount.toFixed(2)
            });
        }

        const worksheet = XLSX.utils.json_to_sheet(qbData, { skipHeader: true });

        // Set column widths
        worksheet['!cols'] = [
            { wch: 12 }, // Date
            { wch: 12 }, // Ref
            { wch: 35 }, // Account
            { wch: 40 }, // Description
            { wch: 12 }, // Debit
            { wch: 12 }  // Credit
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Journal Entries');

        // Generate Excel file with Chrome file:// protocol compatibility
        const filename = `QuickBooks_Import_${this.getDateString()}.xlsx`;

        // Use base64 for maximum Chrome compatibility
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        // Convert base64 to blob
        const byteCharacters = atob(wbout);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Download using data URL for Chrome file:// compatibility
        const reader = new FileReader();
        reader.onloadend = function () {
            const a = document.createElement('a');
            a.href = reader.result;
            a.download = filename;
            a.click();
        };
        reader.readAsDataURL(blob);
    },

    // Export to CASEWARE format (Trial Balance)
    exportCaseware(transactions) {
        const workbook = XLSX.utils.book_new();

        // Calculate trial balance
        const trialBalance = AccountAllocator.calculateTrialBalance(transactions);
        const summary = AccountAllocator.generateSummary(transactions);

        const tbData = [];

        // Add header
        tbData.push({
            'Account Code': 'Account Code',
            'Account Name': 'Account Name',
            'Account Type': 'Account Type',
            'Debit': 'Debit',
            'Credit': 'Credit',
            'Balance': 'Balance'
        });

        // Add account summaries
        for (const entry of summary) {
            tbData.push({
                'Account Code': entry.code,
                'Account Name': entry.name,
                'Account Type': entry.type,
                'Debit': entry.debits.toFixed(2),
                'Credit': entry.credits.toFixed(2),
                'Balance': (entry.debits - entry.credits).toFixed(2)
            });
        }

        // Add totals
        const totals = trialBalance.getTotals();
        tbData.push({
            'Account Code': '',
            'Account Name': 'TOTAL',
            'Account Type': '',
            'Debit': totals.debits.toFixed(2),
            'Credit': totals.credits.toFixed(2),
            'Balance': totals.difference.toFixed(2)
        });

        const worksheet = XLSX.utils.json_to_sheet(tbData, { skipHeader: true });

        // Set column widths
        worksheet['!cols'] = [
            { wch: 15 }, // Account Code
            { wch: 40 }, // Account Name
            { wch: 15 }, // Account Type
            { wch: 15 }, // Debit
            { wch: 15 }, // Credit
            { wch: 15 }  // Balance
        ];

        // Add bold formatting to header and totals (if supported)

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Trial Balance');

        // Generate Excel file with Chrome file:// protocol compatibility
        const filename = `CASEWARE_TrialBalance_${this.getDateString()}.xlsx`;

        // Use base64 for maximum Chrome compatibility
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        // Convert base64 to blob
        const byteCharacters = atob(wbout);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Download using data URL for Chrome file:// compatibility
        const reader = new FileReader();
        reader.onloadend = function () {
            const a = document.createElement('a');
            a.href = reader.result;
            a.download = filename;
            a.click();
        };
        reader.readAsDataURL(blob);
    },

    // Export General Ledger format (Simplified)
    exportGeneralLedger(transactions) {
        const workbook = XLSX.utils.book_new();

        // Get opening balance from reconciliation panel (or default to 0)
        const openingBalanceInput = document.getElementById('expectedOpeningBalance');
        let runningBalance = openingBalanceInput ?
            (parseFloat(openingBalanceInput.value) || 0) : 0;

        const glData = [];

        // Add header
        glData.push({
            'Ref#': 'Ref#',
            'Debits': 'Debits',
            'Credits': 'Credits',
            'Balance': 'Balance',
            'Account #': 'Account #',
            'Account Name': 'Account Name'
        });

        // Sort transactions by date (chronological order)
        const sortedTransactions = [...transactions].sort((a, b) => {
            return new Date(a.date) - new Date(b.date);
        });

        // Process each transaction
        sortedTransactions.forEach((txn, index) => {
            // Determine debit and credit amounts
            let debit = 0;
            let credit = 0;

            if (txn.debits && txn.debits > 0) {
                debit = txn.debits;
            } else if (txn.credits && txn.credits > 0) {
                credit = txn.credits;
            } else if (txn.amount) {
                // Fallback to amount field if debits/credits not set
                if (txn.amount > 0) {
                    debit = txn.amount;
                } else {
                    credit = Math.abs(txn.amount);
                }
            }

            // Calculate running balance (Bank Account logic: Credits add, Debits subtract)
            runningBalance += credit;
            runningBalance -= debit;

            // Generate Ref# with leading zeros and optional prefix
            const prefix = TransactionGrid.refPrefix || '';
            const num = String(index + 1).padStart(3, '0');
            const refNum = prefix ? `${prefix}-${num}` : num;

            // Extract account number and name separately
            let accountNumber = '';
            let accountName = '';

            if (txn.allocatedAccount && txn.allocatedAccountName) {
                accountNumber = txn.allocatedAccount;
                accountName = txn.allocatedAccountName;
            } else if (txn.allocatedAccount) {
                accountNumber = txn.allocatedAccount;
                accountName = '';
            } else {
                accountNumber = '';
                accountName = 'Unallocated';
            }

            glData.push({
                'Ref#': refNum,
                'Debits': debit > 0 ? debit.toFixed(2) : '',
                'Credits': credit > 0 ? credit.toFixed(2) : '',
                'Balance': runningBalance.toFixed(2),
                'Account #': accountNumber,
                'Account Name': accountName
            });
        });

        const worksheet = XLSX.utils.json_to_sheet(glData, { skipHeader: true });

        // Set column widths
        worksheet['!cols'] = [
            { wch: 8 },   // Ref#
            { wch: 12 },  // Debits
            { wch: 12 },  // Credits
            { wch: 12 },  // Balance
            { wch: 12 },  // Account #
            { wch: 35 }   // Account Name
        ];

        // Format currency cells
        const range = XLSX.utils.decode_range(worksheet['!ref']);
        for (let R = 1; R <= range.e.r; ++R) {
            // Format Debits column (B)
            const debitCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 1 })];
            if (debitCell && debitCell.v && debitCell.v !== 'Debits') {
                debitCell.z = '$#,##0.00';
            }

            // Format Credits column (C)
            const creditCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 2 })];
            if (creditCell && creditCell.v && creditCell.v !== 'Credits') {
                creditCell.z = '$#,##0.00';
            }

            // Format Balance column (D)
            const balanceCell = worksheet[XLSX.utils.encode_cell({ r: R, c: 3 })];
            if (balanceCell && balanceCell.v !== 'Balance') {
                balanceCell.z = '$#,##0.00';
            }
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, 'General Ledger');

        // Generate Excel file with Chrome file:// protocol compatibility
        const filename = `General_Ledger_${this.getDateString()}.xlsx`;

        // Use base64 for maximum Chrome compatibility
        const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });

        // Convert base64 to blob
        const byteCharacters = atob(wbout);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Download using data URL for Chrome file:// compatibility
        const reader = new FileReader();
        reader.onloadend = function () {
            const a = document.createElement('a');
            a.href = reader.result;
            a.download = filename;
            a.click();
        };
        reader.readAsDataURL(blob);
    },

    // Add summary sheet to workbook
    addSummarySheet(workbook, transactions) {
        const summary = AccountAllocator.generateSummary(transactions);
        const stats = AccountAllocator.getStats(transactions);

        const summaryData = [];

        // Statistics
        summaryData.push({ 'A': 'TRANSACTION SUMMARY' });
        summaryData.push({ 'A': '' });
        summaryData.push({ 'A': 'Total Transactions:', 'B': stats.total });
        summaryData.push({ 'A': 'Allocated:', 'B': stats.allocated });
        summaryData.push({ 'A': 'Unallocated:', 'B': stats.unallocated });
        summaryData.push({ 'A': 'Allocation Rate:', 'B': stats.allocationRate + '%' });
        summaryData.push({ 'A': '' });
        summaryData.push({ 'A': 'Total Debits:', 'B': Utils.formatCurrency(stats.totalDebits) });
        summaryData.push({ 'A': 'Total Credits:', 'B': Utils.formatCurrency(stats.totalCredits) });
        summaryData.push({ 'A': 'Difference:', 'B': Utils.formatCurrency(stats.difference) });
        summaryData.push({ 'A': 'Balanced:', 'B': stats.isBalanced ? 'YES' : 'NO' });
        summaryData.push({ 'A': '' });
        summaryData.push({ 'A': '' });

        // Account summary
        summaryData.push({ 'A': 'SUMMARY BY ACCOUNT' });
        summaryData.push({ 'A': '' });
        summaryData.push({
            'A': 'Account Code',
            'B': 'Account Name',
            'C': 'Type',
            'D': 'Debits',
            'E': 'Credits',
            'F': 'Net',
            'G': 'Count'
        });

        for (const entry of summary) {
            summaryData.push({
                'A': entry.code,
                'B': entry.name,
                'C': entry.type,
                'D': entry.debits.toFixed(2),
                'E': entry.credits.toFixed(2),
                'F': (entry.debits - entry.credits).toFixed(2),
                'G': entry.count
            });
        }

        const worksheet = XLSX.utils.json_to_sheet(summaryData, { skipHeader: true });

        worksheet['!cols'] = [
            { wch: 20 },
            { wch: 35 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 15 },
            { wch: 10 }
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, 'Summary');
    },

    // Get current date string for filename
    getDateString() {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}${month}${day}`;
    }
};
