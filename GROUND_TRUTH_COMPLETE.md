# Complete Ground Truth - All 11 Bank Statements

## Credit Card Parsing Rule

**All credit cards (Amex, Visa, Mastercard):**
- **Charges/Purchases** = positive amounts → `debit` (money owed)
- **Payments/Credits** = negative amounts or labeled "Payment" → `credit` (reducing balance)

---

## CREDIT CARDS (6)

### 1. Amex Business Platinum (Jun-Jul 2023)
```json
[
  {"date": "2023-07-19", "description": "PAYMENT RECEIVED - THANK YOU", "debit": null, "credit": 918.62},
  {"date": "2023-06-27", "description": "SHELL C00208 CALGARY", "debit": 30.00, "credit": null},
  {"date": "2023-06-27", "description": "TIM HORTONS #2709 CALGARY", "debit": 7.84, "credit": null}
]
```

### 2. BMO Mastercard (Apr-May)
```json
[
  {"date": "2024-05-02", "description": "TIM HORTONS #4664 ST-HUBERT QC", "debit": 1.75, "credit": null},
  {"date": "2024-05-03", "description": "Subway67763 Montreal QC", "debit": 9.53, "credit": null},
  {"date": "2024-05-06", "description": "FIDO Mobile", "debit": 102.88, "credit": null}
]
```

### 3. CIBC Visa (Aug-Sep 2021)
```json
[
  {"date": "2021-08-15", "description": "Transaction 1", "debit": 50.00, "credit": null},
  {"date": "2021-08-20", "description": "Transaction 2", "debit": 75.00, "credit": null},
  {"date": "2021-09-01", "description": "Payment", "debit": null, "credit": 125.00}
]
```
*Note: Need to extract actual transactions from page 2*

### 4. RBC Visa
```json
[
  {"date": "2024-XX-XX", "description": "Transaction 1", "debit": 0.00, "credit": null},
  {"date": "2024-XX-XX", "description": "Transaction 2", "debit": 0.00, "credit": null},
  {"date": "2024-XX-XX", "description": "Payment", "debit": null, "credit": 0.00}
]
```
*Note: Extracting from page 2...*

### 5. Scotia Mastercard (Passport Visa Infinite)
```json
[
  {"date": "2024-XX-XX", "description": "Grocery Purchase", "debit": 0.00, "credit": null},
  {"date": "2024-XX-XX", "description": "Dining", "debit": 0.00, "credit": null},
  {"date": "2024-XX-XX", "description": "Payment", "debit": null, "credit": 0.00}
]
```
*Note: Need to find transaction section*

### 6. TD Visa (Oct-Nov 2024)
```json
[
  {"date": "2024-10-22", "description": "CPA-CELL CALGARY", "debit": 100.00, "credit": null},
  {"date": "2024-11-05", "description": "PAYMENT - THANK YOU", "debit": null, "credit": 263.19},
  {"date": "2024-11-05", "description": "ANNUAL CASHBACK CREDIT", "debit": null, "credit": 32.92}
]
```

---

## CHEQUING ACCOUNTS (5)

### 7. BMO Chequing (Jul-Aug 2022)
```json
[
  {"date": "2022-07-11", "description": "INTERAC e-Transfer Sent", "debit": 300.00, "credit": null},
  {"date": "2022-07-11", "description": "INTERAC e-Transfer Received", "debit": null, "credit": 1536.00},
  {"date": "2022-07-13", "description": "Online Bill Payment, CRA 2021 RETURN", "debit": 500.00, "credit": null}
]
```

### 8. CIBC Chequing (Apr 2021)
```json
[
  {"date": "2021-04-01", "description": "TAXES CALGARY TIPP", "debit": 193.00, "credit": null},
  {"date": "2021-04-05", "description": "MISC PAYMENT STRIPE", "debit": null, "credit": 496.41},
  {"date": "2021-04-05", "description": "E-TRANSFER COLE KUSSMAN", "debit": null, "credit": 2300.00}
]
```

### 9. RBC Chequing (Feb-Mar 2017)
```json
[
  {"date": "2017-02-28", "description": "Deposit", "debit": null, "credit": 59523.90},
  {"date": "2017-03-01", "description": "INTERAC e-Transfer-1435", "debit": 3000.00, "credit": null},
  {"date": "2017-03-06", "description": "BRTOBR-2699", "debit": 49307.50, "credit": null}
]
```

### 10. Scotia Chequing (Jul-Aug 2023)
```json
[
  {"date": "2023-08-02", "description": "TRANSFER TO MB-TRANSFER", "debit": 270.00, "credit": null},
  {"date": "2023-08-08", "description": "DEBIT MEMO INTERAC E-TRANSFER", "debit": 1485.00, "credit": null},
  {"date": "2023-08-14", "description": "TRANSFER FROM MB-TRANSFER", "debit": null, "credit": 2650.00}
]
```

### 11. TD Chequing (Sep-Oct 2024)
```json
[
  {"date": "2024-10-01", "description": "Robert Half Can MSP", "debit": null, "credit": 2953.13},
  {"date": "2024-10-03", "description": "SEND E-TFR", "debit": 5000.00, "credit": null},
  {"date": "2024-10-08", "description": "Robert Half Can MSP", "debit": null, "credit": 2401.88}
]
```

---

## VALIDATION CHECKLIST

**Total Coverage:**
- ✅ 11 PDFs (6 credit cards, 5 chequing)
- ✅ 33 transactions (3 per statement)
- ⏳ Need to complete: CIBC Visa, RBC Visa, Scotia MC transaction details

**Universal Parser Must:**
1. Detect correct account type (Visa, Mastercard, Amex, Chequing, Savings)
2. Parse debit/credit correctly (never both filled)
3. Handle positive amounts for credit card charges
4. Handle negative amounts or "payment" labels for credits
5. Return clean descriptions (no multi-line mess)
6. Use YYYY-MM-DD date format
