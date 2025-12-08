// Reports Engine - Financial Report Calculations

const ReportsEngine = {
    // Get transactions within a date range
    getTransactionsForPeriod(transactions, startDate, endDate) {
        console.log(`🔍 Filtering ${transactions.length} transactions between ${startDate.toISOString()} and ${endDate.toISOString()}`);

        const filtered = transactions.filter(t => {
            const date = new Date(t.date);
            const inRange = date >= startDate && date <= endDate;
            return inRange;
        });

        console.log(`✅ Found ${filtered.length} transactions in period`);
        if (filtered.length > 0) {
            console.log(`   First: ${new Date(filtered[0].date).toLocaleDateString()}`);
            console.log(`   Last: ${new Date(filtered[filtered.length - 1].date).toLocaleDateString()}`);
        }

        return filtered;
    },

    // Generate multiple periods for comparative reports
    generateComparativePeriods(periodType, yearEndDate) {
        const periods = [];
        const endDate = new Date(yearEndDate);

        if (periodType === 'monthly') {
            // Generate 12 months ending on year-end
            for (let i = 11; i >= 0; i--) {
                const periodEnd = new Date(endDate);
                periodEnd.setMonth(endDate.getMonth() - i);

                const periodStart = new Date(periodEnd);
                periodStart.setMonth(periodStart.getMonth() - 1);
                periodStart.setDate(periodStart.getDate() + 1);

                // Format: "Jan/31/24"
                const label = periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(',', '');

                periods.push({ startDate: periodStart, endDate: periodEnd, label });
            }
        } else if (periodType === 'quarterly') {
            // Generate 4 quarters ending on year-end
            for (let i = 3; i >= 0; i--) {
                const periodEnd = new Date(endDate);
                periodEnd.setMonth(endDate.getMonth() - (i * 3));

                const periodStart = new Date(periodEnd);
                periodStart.setMonth(periodStart.getMonth() - 3);
                periodStart.setDate(periodStart.getDate() + 1);

                const quarter = 4 - i;
                const label = `Q${quarter} ${periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }).replace(',', '')}`;

                periods.push({ startDate: periodStart, endDate: periodEnd, label });
            }
        } else {
            // Yearly - single period
            const periodStart = new Date(endDate);
            periodStart.setFullYear(periodStart.getFullYear() - 1);
            periodStart.setDate(periodStart.getDate() + 1);

            const label = 'Year Ended';
            periods.push({ startDate: periodStart, endDate: endDate, label });
        }

        console.log(`📊 Generated ${periods.length} periods for ${periodType}`);
        return periods;
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

                    < h4 > Revenue</h4>
    <table class="report-table">
        <thead>
            <tr>
                <th>Description</th>
                <th style="text-align: right;">Amount</th>
            </tr>
        </thead>
        <tbody>
            ${data.revenue.map(r => `
                                <tr class="clickable-row" data-account="${r.account}">
                                    <td>${r.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(r.balance)}</td>
                                </tr>
                            `).join('')}
            <tr class="total-row">
                <td><strong>Total Revenue</strong></td>
                <td style="text-align: right;"><strong>${this.formatCurrency(data.totalRevenue)}</strong></td>
            </tr>
        </tbody>
    </table>
                </div >

                <div class="report-section">
                    <h4>Expenses</h4>
                    <table class="report-table">
                        <tbody>
                            ${data.expenses.map(e => `
                                <tr class="clickable-row" data-account="${e.account}">
                                    <td>${e.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(e.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td><strong>Total Expenses</strong></td>
                                <td style="text-align: right;"><strong>${this.formatCurrency(data.totalExpenses)}</strong></td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="report-section" style="margin-top: 2rem; padding-top: 1rem; border-top: 2px solid var(--border-color);">
                    <table class="report-table">
                        <tr class="net-income-row" style="font-size: 1.1rem;">
                            <td><strong>Net ${data.netIncome >= 0 ? 'Income' : 'Loss'}</strong></td>
                            <td style="text-align: right; color: ${data.netIncome >= 0 ? '#22c55e' : '#ef4444'};"><strong>${this.formatCurrency(data.netIncome)}</strong></td>
                        </tr>
                    </table>
                </div>
            </div >
    `;

        return html;
    },

    // Render Balance Sheet HTML
    renderBalanceSheet(data) {
        const header = this.formatReportHeader('Balance Sheet');

        let html = `
    < div class="report-container" >
        ${ header }
                
                <div class="report-section">
                    <h4>Assets</h4>
                    <table class="report-table">
                        <tbody>
                            ${data.assets.map(a => `
                                <tr class="clickable-row" data-account="${a.account}">
                                    <td>${a.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(a.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td><strong>Total Assets</strong></td>
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
                                    <td>${l.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(l.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td><strong>Total Liabilities</strong></td>
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
                                    <td>${e.accountName}</td>
                                    <td style="text-align: right;">${this.formatCurrency(e.balance)}</td>
                                </tr>
                            `).join('')}
                            <tr class="total-row">
                                <td><strong>Total Equity</strong></td>
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
            </div >
    `;

        return html;
    },

    // Render Trial Balance HTML
    renderTrialBalance(data) {
        const header = this.formatReportHeader('Trial Balance');

        let html = `
    < div class="report-container" >
        ${ header }
                
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
            </div >
    `;

        return html;
    }
};
