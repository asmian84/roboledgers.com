✅ App.js loaded and event listeners set up app.js:1041:13
✅ Opening balance listener attached transaction-grid.js:743:21
AG Grid: setRowData is deprecated. Please use 'api.setGridOption('rowData', newValue)' or 'api.updateGridOptions({ rowData: newValue })' instead. ag-grid-community.min.js:8:23889
📂 Restored session: 219 transactions session-manager.js:61:21
AG Grid: debounceMs is ignored when apply button is present 7 ag-grid-community.min.js:8:206208
🔢 AUTO-CALCULATING BALANCES for 219 transactions transaction-grid.js:336:21
Starting balance calculation from opening: 0 transaction-grid.js:648:17
Txn 1: Debit=0, Credit=2250, Balance=2250 transaction-grid.js:663:25
Txn 2: Debit=1000, Credit=0, Balance=1250 transaction-grid.js:663:25
Txn 3: Debit=23.16, Credit=0, Balance=1226.84 transaction-grid.js:663:25
🔍 updateReconciliation called. Transaction count: 219 app.js:492:17
📊 Sample transaction: 
Object { id: "txn_1765497847699_e9z1s390x", ref: "", date: "2023-12-27T07:00:00.000Z", payee: "LOAN CREDIT", debits: 0, amount: 2250, balance: 2250, account: "", vendor: "Loan Credit", vendorId: "vnd_1765407724398_4fdwj8cs7", … }
app.js:494:21
💰 Reconciliation data: 
Object { totalCredits: 364721.88, totalDebits: 362478.5600000001, calculatedEnding: 2243.3199999999965 }
app.js:505:21
Balance calculation complete. Final balance: 2243.3199999999965 transaction-grid.js:681:17
✅ Bulk actions initialized transaction-grid.js:626:17
🔍 updateReconciliation called. Transaction count: 219 app.js:492:17
📊 Sample transaction: 
Object { id: "txn_1765497847699_e9z1s390x", ref: "", date: "2023-12-27T07:00:00.000Z", payee: "LOAN CREDIT", debits: 0, amount: 2250, balance: 2250, account: "", vendor: "Loan Credit", vendorId: "vnd_1765407724398_4fdwj8cs7", … }
app.js:494:21
💰 Reconciliation data: 
Object { totalCredits: 364721.88, totalDebits: 362478.5600000001, calculatedEnding: 2243.3199999999965 }
app.js:505:21
✅ Session restored successfully session-manager.js:152:21
// DIAGNOSTIC TOOL - Test WCB Pattern Matching

console.log('='.repeat(60));
console.log('🔬 WCB PATTERN MATCHING DIAGNOSTIC');
console.log('='.repeat(60));…
============================================================ debugger eval code:3:9
🔬 WCB PATTERN MATCHING DIAGNOSTIC debugger eval code:4:9
============================================================ debugger eval code:5:9

📋 Testing pattern: 
/wcb|workers comp/i
debugger eval code:19:9
<empty string> debugger eval code:20:9
Test: "WCB ALBERTA" debugger eval code:26:13
  Lowercase: "wcb alberta" debugger eval code:27:13
  Pattern match: ✅ YES debugger eval code:28:13
<empty string> debugger eval code:29:13
Test: "Misc Payment WCB ALBERTA" debugger eval code:26:13
  Lowercase: "misc payment wcb alberta" debugger eval code:27:13
  Pattern match: ✅ YES debugger eval code:28:13
<empty string> debugger eval code:29:13
Test: "wcb alberta" debugger eval code:26:13
  Lowercase: "wcb alberta" debugger eval code:27:13
  Pattern match: ✅ YES debugger eval code:28:13
<empty string> debugger eval code:29:13
Test: "WCB-ALBERTA" debugger eval code:26:13
  Lowercase: "wcb-alberta" debugger eval code:27:13
  Pattern match: ✅ YES debugger eval code:28:13
<empty string> debugger eval code:29:13
Test: "Workers Comp Board" debugger eval code:26:13
  Lowercase: "workers comp board" debugger eval code:27:13
  Pattern match: ✅ YES debugger eval code:28:13
<empty string> debugger eval code:29:13

🧪 Testing with real VendorAI.suggestAccount(): debugger eval code:34:13
<empty string> debugger eval code:35:13
🔍 suggestAccount called with: WCB ALBERTA | category: undefined vendor-ai.js:193:17
  "WCB ALBERTA" → 9750 (Workers compensation) debugger eval code:39:17
🔍 suggestAccount called with: Misc Payment WCB ALBERTA | category: undefined vendor-ai.js:193:17
  "Misc Payment WCB ALBERTA" → 9750 (Workers compensation) debugger eval code:39:17
🔍 suggestAccount called with: wcb alberta | category: undefined vendor-ai.js:193:17
  "wcb alberta" → 9750 (Workers compensation) debugger eval code:39:17
