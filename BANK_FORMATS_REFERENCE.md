# Bank Statement Format Reference

## Chequing Accounts (All 5-Column Format)

### BMO Chequing
**Columns:** Date | Description | Amounts deducted | Amounts added | Balance
```
Jul11 INTERAC e-Transfer Sent        300.00              84.67
Jul11 INTERAC e-Transfer Received             1,536.00  1,620.67
```

### CIBC Chequing  
**Columns:** Date | Description | Withdrawals ($) | Deposits ($) | Balance ($)
```
Apr 1 TAXES CALGARY TIPP          193.00                53,937.43
Apr 5 MISC PAYMENT STRIPE                      496.41    54,429.84
```

### RBC Chequing
**Columns:** Date | Description | Cheques & Debits ($) | Deposits & Credits ($) | Balance ($)
```
06Mar BRTOBR-2699                49,307.50                      461,163.52
28Feb Deposit                                  59,523.90       508,772.52
```

### Scotiabank Chequing
**Expected:** Date | Description | Withdrawals | Deposits | Balance
*(Analyzing...)*

### TD Chequing
**Expected:** Date | Description | Withdrawals | Deposits | Balance
*(Analyzing...)*

---

## Credit Cards (Variable Format)

### BMO Mastercard
**Expected:** Date | Date | Description | Reference | Amount
*(Analyzing...)*

### CIBC Visa
**Expected:** Date | Description | Charges | Payments | Balance
*(Analyzing...)*

### RBC Visa
**Expected:** Date | Description | Amount (or Debit/Credit split)
*(Analyzing...)*

### Scotiabank Mastercard
**Expected:** Date | Description | Amount
*(Analyzing...)*

### TD Visa
**Expected:** Date | Description | Amount
*(Analyzing...)*

---

## Key Insight

**ALL chequing accounts use 5 columns:**
- Date
- Description  
- Money OUT (debit/withdrawal/deducted)
- Money IN (credit/deposit/added)
- Running Balance

**Terminology varies but structure is identical.**

This means our AI parser can use ONE prompt template for all formats!
