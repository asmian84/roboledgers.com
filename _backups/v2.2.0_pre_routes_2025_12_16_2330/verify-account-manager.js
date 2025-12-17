// Verification Script for Account Manager
// Run this in the browser console to verify functionality

console.log("🧪 Starting Account Manager Verification...");

// 0. Initialize
if (typeof BankAccountManager !== 'undefined') {
    BankAccountManager.initialize();
} else {
    console.error("❌ BankAccountManager is not defined!");
}

// 1. Initial State Check
console.log("Step 1: Checking initial state...");
const accounts = BankAccountManager.getAllAccounts();
console.log(`Initial accounts count: ${accounts.length}`);

// 2. Add Account
console.log("Step 2: Adding test account...");
// Note: BankAccountManager.addAccount takes (name, type) and generates ID internally
// It doesn't return the object directly usually, but pushes to array.
const initialCount = accounts.length;
BankAccountManager.addAccount("Test Chequing", "CHECKING");

const newAccounts = BankAccountManager.getAllAccounts();
const newAccount = newAccounts.find(a => a.name === "Test Chequing" && a.isNew === true); // isNew is set by addAccount

if (newAccounts.length === initialCount + 1 && newAccount) {
    console.log(`Added account: ${newAccount.name} (${newAccount.id})`);
} else {
    console.error("❌ Add Account FAILED");
}

// 3. Verify Persistence
console.log("Step 3: Verifying persistence...");
const stored = JSON.parse(localStorage.getItem('autobookkeeping_bank_accounts') || '[]');
const storedAccount = stored.find(a => a.name === "Test Chequing");

if (storedAccount) {
    console.log("✅ Persistence VALID");
} else {
    console.error("❌ Persistence FAILED");
    console.log("Stored contents:", stored);
}

// 4. Update Account (Rename)
console.log("Step 4: Updating account...");
if (newAccount) {
    BankAccountManager.updateAccountName(newAccount.id, "Updated Chequing");
    const updated = BankAccountManager.getAccountById(newAccount.id);

    if (updated && updated.name === "Updated Chequing") {
        console.log("✅ Update VALID");
    } else {
        console.error("❌ Update FAILED");
    }

    // 5. Delete Account (Cleanup)
    console.log("Step 5: Deleting account...");
    BankAccountManager.deleteAccount(newAccount.id);
    const finalCount = BankAccountManager.getAllAccounts().length;

    if (finalCount === initialCount) {
        console.log("✅ Delete VALID");
        console.log("🎉 All tests passed!");
    } else {
        console.error("❌ Delete FAILED");
    }
} else {
    console.error("❌ Skipping update/delete tests due to add failure");
}
