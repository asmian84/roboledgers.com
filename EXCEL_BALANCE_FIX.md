# Excel Export Issue Summary

## The Problem:
Your transactions have both `debits` and `credits` populated. Credits are stored as **NEGATIVE values** (like -$3,014.31).

## Current Code Issues (lines 215-228):
```javascript
if (txn.credits && txn.credits > 0) {  // ❌ This checks if > 0, but credits are NEGATIVE!
    credit = txn.credits;
}

runningBalance += credit;  // ❌ Wrong formula
runningBalance -= debit;
```

## The Fix Needed:
**Line 215:** Change `if (txn.credits && txn.credits > 0)` to `if (txn.credits)`
**Lines 227-228:** Change to:
```javascript
runningBalance += debit;
runningBalance += credit;  // Credit is negative, so adding it subtracts
```

## Why This Works:
- Debit: +$976.39 (positive)
- Credit: -$3,014.31 (negative)  
- Balance = 0 + 976.39 + (-3014.31) = -$2,037.92 ✓

The editing tools keep corrupting the file. The user may need to make this change manually or we need a different approach.
