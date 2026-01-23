# Final Ground Truth - All 11 Bank Statements ✅

## CREDIT CARDS (6)

### 1. Amex Business Platinum
```json
[
  {"date": "2023-07-19", "description": "PAYMENT RECEIVED - THANK YOU", "debit": null, "credit": 918.62},
  {"date": "2023-06-27", "description": "SHELL C00208 CALGARY", "debit": 30.00, "credit": null},
  {"date": "2023-06-27", "description": "TIM HORTONS #2709 CALGARY", "debit": 7.84, "credit": null}
]
```

### 2. BMO Mastercard
```json
[
  {"date": "2024-05-02", "description": "TIM HORTONS #4664 ST-HUBERT QC", "debit": 1.75, "credit": null},
  {"date": "2024-05-03", "description": "Subway67763 Montreal QC", "debit": 9.53, "credit": null},
  {"date": "2024-05-06", "description": "FIDO Mobile", "debit": 102.88, "credit": null}
]
```

### 3. CIBC Visa
```json
[
  {"date": "2021-08-11", "description": "PAYMENT THANK YOU", "debit": null, "credit": 9690.96},
  {"date": "2021-07-28", "description": "LGC DOORDASH GIFTCARD", "debit": 100.00, "credit": null},
  {"date": "2021-07-28", "description": "IN ZOON GROUP INC", "debit": 447.36, "credit": null}
]
```

### 4. RBC Visa
```json
[
  {"date": "2023-12-18", "description": "PAYMENT - THANK YOU", "debit": null, "credit": 1000.00},
  {"date": "2023-12-06", "description": "THE HOME DEPOT #7067 CALGARY AB", "debit": 182.23, "credit": null},
  {"date": "2023-12-07", "description": "SHELL C10151 CALGARY AB", "debit": 102.01, "credit": null}
]
```

### 5. Scotia Momentum Mastercard 
```json
[
  {"date": "2022-03-02", "description": "MB-CREDIT CARD/LOC PAY FROM", "debit": null, "credit": 79.00},
  {"date": "2022-03-07", "description": "JERUSALEM SHAWARMA AND BA CALGARY AB", "debit": 52.08, "credit": null},
  {"date": "2022-03-07", "description": "GATE OF INDIA INC. CALGARY AB", "debit": 32.50, "credit": null}
]
```

### 6. TD Visa
```json
[
  {"date": "2024-10-22", "description": "CPA-CELL CALGARY", "debit": 100.00, "credit": null},
  {"date": "2024-11-05", "description": "PAYMENT - THANK YOU", "debit": null, "credit": 263.19},
  {"date": "2024-11-05", "description": "ANNUAL CASHBACK CREDIT", "debit": null, "credit": 32.92}
]
```

---

## CHEQUING ACCOUNTS (5)

### 7. BMO Chequing
```json
[
  {"date": "2022-07-11", "description": "INTERAC e-Transfer Sent", "debit": 300.00, "credit": null},
  {"date": "2022-07-11", "description": "INTERAC e-Transfer Received", "debit": null, "credit": 1536.00},
  {"date": "2022-07-13", "description": "Online Bill Payment, CRA 2021 RETURN", "debit": 500.00, "credit": null}
]
```

### 8. CIBC Chequing
```json
[
  {"date": "2021-04-01", "description": "TAXES CALGARY TIPP", "debit": 193.00, "credit": null},
  {"date": "2021-04-05", "description": "MISC PAYMENT STRIPE", "debit": null, "credit": 496.41},
  {"date": "2021-04-05", "description": "E-TRANSFER COLE KUSSMAN", "debit": null, "credit": 2300.00}
]
```

### 9. RBC Chequing
```json
[
  {"date": "2017-02-28", "description": "Deposit", "debit": null, "credit": 59523.90},
  {"date": "2017-03-01", "description": "INTERAC e-Transfer-1435", "debit": 3000.00, "credit": null},
  {"date": "2017-03-06", "description": "BRTOBR-2699", "debit": 49307.50, "credit": null}
]
```

### 10. Scotia Chequing
```json
[
  {"date": "2023-08-02", "description": "TRANSFER TO MB-TRANSFER", "debit": 270.00, "credit": null},
  {"date": "2023-08-08", "description": "DEBIT MEMO INTERAC E-TRANSFER", "debit": 1485.00, "credit": null},
  {"date": "2023-08-14", "description": "TRANSFER FROM MB-TRANSFER", "debit": null, "credit": 2650.00}
]
```

### 11. TD Chequing
```json
[
  {"date": "2024-10-01", "description": "Robert Half Can MSP", "debit": null, "credit": 2953.13},
  {"date": "2024-10-03", "description": "SEND E-TFR", "debit": 5000.00, "credit": null},
  {"date": "2024-10-08", "description": "Robert Half Can MSP", "debit": null, "credit": 2401.88}
]
```

---

## VALIDATION TARGET: 33/33 Transactions ✅

**Coverage:**
- ✅ 6 Credit Cards (Amex, BMO MC, CIBC Visa, RBC Visa, Scotia MC, TD Visa)
- ✅ 5 Chequing Accounts (BMO, CIBC, RBC, Scotia, TD)
- ✅ 33 Total Transactions (3 per statement)

**Test Success Criteria:**
- Account type detected correctly (Visa/Mastercard/Amex/Chequing)
- Debit/credit never both filled for same transaction
- All amounts are positive numbers
- Dates in YYYY-MM-DD format
- Descriptions are clean (no multi-line mess)
