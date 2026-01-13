/**
 * COA Balance Verification Utility
 * Run this in the browser console to verify COA has balances
 */

window.verifyCoABalances = function () {
    console.group('🔍 COA Balance Verification');

    // 1. Check if COA exists
    const coa = JSON.parse(localStorage.getItem('ab3_coa') || '[]');
    console.log(`📊 Total COA Accounts: ${coa.length}`);

    // 2. Check if balances exist
    const accountsWithBalances = coa.filter(a => a.balance !== undefined && a.balance !== null);
    console.log(`✅ Accounts with balance field: ${accountsWithBalances.length}`);

    // 3. Check for non-zero balances
    const accountsWithActivity = coa.filter(a => Math.abs(parseFloat(a.balance) || 0) > 0);
    console.log(`💰 Accounts with non-zero balance: ${accountsWithActivity.length}`);

    // 4. Show sample accounts
    console.log('\n📋 Sample Accounts (first 5 with balances):');
    accountsWithActivity.slice(0, 5).forEach(acc => {
        console.log(`  ${acc.code} - ${acc.name}: $${acc.balance} (${acc.transactionCount || 0} txns)`);
    });

    // 5. Calculate totals by type
    if (window.AccountBalances) {
        const summary = window.AccountBalances.getBalancesByType();
        console.log('\n💼 Balance Summary by Type:');
        console.table(summary);
    }

    // 6. Check transactions
    const txns = JSON.parse(localStorage.getItem('ab3_transactions') || '[]');
    const categorized = txns.filter(t => t.accountDescription && t.accountDescription !== 'Uncategorized');
    console.log(`\n📝 Transactions: ${txns.length} total, ${categorized.length} categorized`);

    console.groupEnd();

    return {
        totalAccounts: coa.length,
        accountsWithBalances: accountsWithBalances.length,
        accountsWithActivity: accountsWithActivity.length,
        totalTransactions: txns.length,
        categorizedTransactions: categorized.length
    };
};

// console.log('✅ COA Verification loaded. Run window.verifyCoABalances() to check balances.');
