# Bank Statement Format Analysis

## Test Corpus (10 PDFs)

| Bank | Account Type | File | Status |
|:-----|:-------------|:-----|:-------|
| BMO | Chequing | BMO Chq.pdf | ⏳ Analyzing |
| BMO | Mastercard | BMO MC.pdf | ⏳ Pending |
| CIBC | Chequing | CIBC Chq.pdf | ⏳ Analyzing |
| CIBC | Visa | CIBC VISA.pdf | ⏳ Pending |
| RBC | Chequing | RBC Chq.pdf | ⏳ Analyzing |
| RBC | Visa | RBC Visa.pdf | ⏳ Pending |
| Scotiabank | Chequing | Scotia CHq.pdf | ⏳ Pending |
| Scotiabank | Mastercard | Scotia MC.pdf | ⏳ Pending |
| TD | Chequing | TD Chq.pdf | ⏳ Pending |
| TD | Visa | TD Visa.pdf | ⏳ Pending |

## Format Patterns (Being Analyzed...)

### Expected Formats

**Chequing Accounts:**
- Date | Description | Debit | Credit | Balance

**Credit Cards:**
- Date | Description | Amount (negative = purchase, positive = payment)
OR
- Date | Description | Charges | Payments | Balance

## Next Steps

1. Extract sample transactions from each
2. Identify column structure
3. Create ground truth JSON for 3 transactions per file
4. Build test harness
5. Refine AI prompt until 100% pass rate
