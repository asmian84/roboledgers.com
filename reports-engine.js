// Reports Engine - Financial Report Calculations

const ReportsEngine = {
    // Get transactions within a date range
    getTransactionsForPeriod(transactions, startDate, endDate) {
        return transactions.filter(t => {
            const date = new Date(t.date);
            return date >= startDate && date <= endDate;
        });
    },

    // Calculate period dates based on year-end
    calculatePeriodDates(periodType, yearEndDate) {
        const endDate = new Date(yearEndDate);
        let startDate = new Date(endDate);

        switch (periodType) {
            case 'monthly':
                // Last month before year-end
                startDate.setMonth(startDate.getMonth() - 1);
                startDate.setDate(startDate.getDate() + 1);
                break;

            case 'quarterly':
                // Last 3 months before year-end
                startDate.setMonth(startDate.getMonth() - 3);
                startDate.setDate(startDate.getDate() + 1);
                break;

            case 'yearly':
                // Full fiscal year
                startDate.setFullYear(startDate.getFullYear() - 1);
                startDate.setDate(startDate.getDate() + 1);
                break;
        }

        return { startDate, endDate };
    },

    // Group transactions by account
    groupByAccount(transactions) {
        const grouped = {};

        transactions.forEach(t => {
            const account = t.allocatedAccount || '9970';
            const accountName = t.allocatedAccountName || 'Unallocated';

            if (!grouped[account]) {
                grouped[account] = {
                    account,
                    accountName,
                    debits: 0,
                    credits: 0,
                    transactions: []
                };
            }

            grouped[account].debits += (t.debits || 0);
            grouped[account].credits += (t.amount || 0);
            grouped[account].transactions.push(t);
        });

        return Object.values(grouped);
    },

    // Generate Income Statement
    generateIncomeStatement(transactions) {
        const grouped = this.groupByAccount(transactions);

        // Revenue accounts (4000-4999) - credit balances
        const revenue = grouped
            .filter(g => g.account >= '4000' && g.account < '5000')
            .map(g => ({
                ...g,
                balance: g.credits - g.debits
            }));

        // Expense accounts (5000-9999) - debit balances  
        const expenses = grouped
            .filter(g => g.account >= '5000')
            .map(g => ({
                ...g,
                balance: g.debits - g.credits
            }));

        const totalRevenue = revenue.reduce((sum, r) => sum + r.balance, 0);
        const totalExpenses = expenses.reduce((sum, e) => sum + e.balance, 0);
        const netIncome = totalRevenue - totalExpenses;

        return {
            revenue,
            expenses,
            totalRevenue,
            totalExpenses,
            netIncome
        };
    },

    // Generate Balance Sheet
    generateBalanceSheet(transactions) {
        const grouped = this.groupByAccount(transactions);

        // Assets (1000-1999) - debit balances
        const assets = grouped
            .filter(g => g.account >= '1000' && g.account < '2000')
            .map(g => ({
                ...g,
                balance: g.debits - g.credits
            }));

        // Liabilities (2000-2999) - credit balances
        const liabilities = grouped
            .filter(g => g.account >= '2000' && g.account < '3000')
            .map(g => ({
                ...g,
                balance: g.credits - g.debits
            }));

        // Equity (3000-3999) - credit balances
        const equity = grouped
            .filter(g => g.account >= '3000' && g.account < '4000')
            .map(g => ({
                ...g,
                balance: g.credits - g.debits
            }));

        const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
        const totalLiabilities = liabilities.reduce((sum, l) => sum + l.balance, 0);
        const totalEquity = equity.reduce((sum, e) => sum + e.balance, 0);

        const balanced = Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01;

        return {
            assets,
            liabilities,
            equity,
            totalAssets,
            totalLiabilities,
            totalEquity,
            balanced
        };
    },

    // Generate Trial Balance
    generateTrialBalance(transactions) {
        const grouped = this.groupByAccount(transactions);

        const accounts = grouped.map(g => ({
            ...g,
            debitBalance: g.debits > g.credits ? g.debits - g.credits : 0,
            creditBalance: g.credits > g.debits ? g.credits - g.debits : 0
        }));

        const totalDebits = accounts.reduce((sum, a) => sum + a.debitBalance, 0);
        const totalCredits = accounts.reduce((sum, a) => sum + a.creditBalance, 0);
        const balanced = Math.abs(totalDebits - totalCredits) < 0.01;

        return {
            accounts,
            totalDebits,
            totalCredits,
            balanced
        };
    },

    // Format currency
    formatCurrency(amount) {
        return '$' + Math.abs(amount).toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    },

    // Render Income Statement HTML
    renderIncomeStatement(data) {
        let html = `
            <div class="report-container">
                <h3 style="text-align: center; margin-bottom: 2rem;">Income Statement</h3>
                
                <div class="report-section">
                    <h4>Revenue</h4>
                    <table class="report-table">
                        <thead>
                            <tr>
                                <th>Account</th>
                                <th>Description</th>
                                <th style="text-align: right;">Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.revenue.map(r => `
                                <tr class="clickable-row" data-account="${r.account}">
                                    <td>${r.account}</td>
                                    <td>${r.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(r.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2"><strong>Total Revenue</strong></td>
                                <td style="text-align: right;"><strong>${this.formatCurrency(data.totalRevenue)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="report-section">
                    <h4>Expenses</h4>
                    <table class="report-table">
                        <tbody>
                            ${data.expenses.map(e => `
                                <tr class="clickable-row" data-account="${e.account}">
                                    <td>${e.account}</td>
                                    <td>${e.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(e.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2"><strong>Total Expenses</strong></td>
                                <td style="text-align: right;"><strong>${this.formatCurrency(data.totalExpenses)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="report-section" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid var(--border-color);">
                    <table class="report-table">
                        <tr class="net-income-row" style="font-size: 1.1rem;">
                            <td colspan="2"><strong>Net ${data.netIncome >= 0 ? 'Income' : 'Loss'}</strong></td>
                            <td style="text-align: right; color: ${data.netIncome >= 0 ? '#22c55e' : '#ef4444'};"><strong>${this.formatCurrency(data.netIncome)}</strong></td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        return html;
    },

    // Render Balance Sheet HTML
    renderBalanceSheet(data) {
        let html = `
            <div class="report-container">
                <h3 style="text-align: center; margin-bottom: 2rem;">Balance Sheet</h3>
                
                <div class="report-section">
                    <h4>Assets</h4>
                    <table class="report-table">
                        <tbody>
                            ${data.assets.map(a => `
                                <tr class="clickable-row" data-account="${a.account}">
                                    <td>${a.account}</td>
                                    <td>${a.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(a.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2"><strong>Total Assets</strong></td>
                                <td style="text-align: right;"><strong>${this.formatCurrency(data.totalAssets)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="report-section">
                    <h4>Liabilities</h4>
                    <table class="report-table">
                        <tbody>
                            ${data.liabilities.map(l => `
                                <tr class="clickable-row" data-account="${l.account}">
                                    <td>${l.account}</td>
                                    <td>${l.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(l.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2"><strong>Total Liabilities</strong></td>
                                <td style="text-align: right;"><strong>${this.formatCurrency(data.totalLiabilities)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="report-section">
                    <h4>Equity</h4>
                    <table class="report-table">
                        <tbody>
                            ${data.equity.map(e => `
                                <tr class="clickable-row" data-account="${e.account}">
                                    <td>${e.account}</td>
                                    <td>${e.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(e.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td colspan="2"><strong>Total Equity</strong></td>
                                <td style="text-align: right;"><strong>${this.formatCurrency(data.totalEquity)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="report-section" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid var(--border-color);">
                    <p style="text-align: center; color: ${data.balanced ? '#22c55e' : '#ef4444'};">
                        ${data.balanced ? '✅ Balanced' : '❌ Imbalanced'} - Assets = Liabilities + Equity
                    </p>
                </div>
            </div>
        `;

        return html;
    },

    // Render Trial Balance HTML
    renderTrialBalance(data) {
        let html = `
            <div class="report-container">
                <h3 style="text-align: center; margin-bottom: 2rem;">Trial Balance</h3>
                
                <table class="report-table">
                    <thead>
                        <tr>
                            <th>Account</th>
                            <th>Description</th>
                            <th style="text-align: right;">Debit</th>
                            <th style="text-align: right;">Credit</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.accounts.map(a => `
                            <tr class="clickable-row" data-account="${a.account}">
                                <td>${a.account}</td>
                                <td>${a.accountName}</td>
                                <td style="text-align: right;">${a.debitBalance > 0 ? this.formatCurrency(a.debitBalance) : ''}</td>
                                <td style="text-align: right;">${a.creditBalance > 0 ? this.formatCurrency(a.creditBalance) : ''}</td>
                            </tr>
                        `).join('')}
                        <tr class="total-row">
                            <td colspan="2"><strong>Totals</strong></td>
                            <td style="text-align: right;"><strong>${this.formatCurrency(data.totalDebits)}</strong></td>
                            <td style="text-align: right;"><strong>${this.formatCurrency(data.totalCredits)}</strong></td>
                        </tr>
                    </tbody>
                </table>

                <div class="report-section" style="margin-top: 2rem; text-align: center;">
                    <p style="color: ${data.balanced ? '#22c55e' : '#ef4444'};">
                        ${data.balanced ? '✅ Balanced' : '❌ Imbalanced'} - Total Debits = Total Credits
                    </p>
                </div>
            </div>
        `;

        return html;
    }
};
