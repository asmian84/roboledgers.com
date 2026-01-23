# Ground Truth - Bank Statement Transactions (Updated with Amex)

## Amex Business Platinum (Jun-Jul 2023)

**Format Note:** Credit cards show CHARGES as positive, PAYMENTS as negative

```json
[
  {
    "date": "2023-07-19",
    "description": "PAYMENT RECEIVED - THANK YOU",
    "debit": null,
    "credit": 918.62,
    "note": "Payment = money IN to account = reduces balance"
  },
  {
    "date": "2023-06-27",
    "description": "SHELL C00208 CALGARY",
    "debit": 30.00,
    "credit": null,
    "note": "Charge = money OUT = increases balance owed"
  },
  {
    "date": "2023-06-27",
    "description": "TIM HORTONS #2709 CALGARY",
    "debit": 7.84,
    "credit": null,
    "note": "Charge = money OUT"
  }
]
```

## Critical Parsing Rule for Credit Cards

**Amex/Visa/Mastercard statements:**
- **Positive amounts** or **amounts without sign** = CHARGES → map to `debit`
- **Negative amounts** or **labeled "Payment"** = PAYMENTS → map to `credit`

This is OPPOSITE of bank accounts where:
- Debits = money leaving YOUR account
- Credits = money entering YOUR account

For credit cards, we flip it:
- Charges (spending) = `debit` (money you owe)
- Payments (paying off) = `credit` (reducing what you owe)

---

## BMO Chequing (Jul-Aug 2022)

```json
[
  {
    "date": "2022-07-11",
    "description": "INTERAC e-Transfer Sent",
    "debit": 300.00,
    "credit": null,
    "balance": 84.67
  },
  {
    "date": "2022-07-11",
    "description": "INTERAC e-Transfer Received",
    "debit": null,
    "credit": 1536.00,
    "balance": 1620.67
  },
  {
    "date": "2022-07-13",
    "description": "Online Bill Payment, CRA 2021 RETURN",
    "debit": 500.00,
    "credit": null,
    "balance": 420.67
  }
]
```

## CIBC Chequing (Apr 2021)

```json
[
  {
    "date": "2021-04-01",
    "description": "TAXES CALGARY TIPP",
    "debit": 193.00,
    "credit": null,
    "balance": 53937.43
  },
  {
    "date": "2021-04-05",
    "description": "MISC PAYMENT STRIPE",
    "debit": null,
    "credit": 496.41,
    "balance": 54429.84
  },
  {
    "date": "2021-04-05",
    "description": "E-TRANSFER COLE KUSSMAN",
    "debit": null,
    "credit": 2300.00,
    "balance": 56729.84
  }
]
```

## RBC Chequing (Feb-Mar 2017)

```json
[
  {
    "date": "2017-02-28",
    "description": "Deposit",
    "debit": null,
    "credit": 59523.90,
    "balance": 508772.52
  },
  {
    "date": "2017-03-01",
    "description": "INTERAC e-Transfer-1435",
    "debit": 3000.00,
    "credit": null,
    "balance": 505772.52
  },
  {
    "date": "2017-03-06",
    "description": "BRTOBR-2699",
    "debit": 49307.50,
    "credit": null,
    "balance": 461163.52
  }
]
```

## Scotia Chequing (Jul-Aug 2023)

```json
[
  {
    "date": "2023-08-02",
    "description": "TRANSFER TO 31369 00222 25 MB-TRANSFER",
    "debit": 270.00,
    "credit": null,
    "balance": 1996.69
  },
  {
    "date": "2023-08-08",
    "description": "DEBIT MEMO INTERAC E-TRANSFER",
    "debit": 1485.00,
    "credit": null,
    "balance": 511.69
  },
  {
    "date": "2023-08-14",
    "description": "TRANSFER FROM 31369 00222 25 MB-TRANSFER",
    "debit": null,
    "credit": 2650.00,
    "balance": 3160.69
  }
]
```

## TD Chequing (Sep-Oct 2024)

```json
[
  {
    "date": "2024-10-01",
    "description": "Robert Half Can MSP",
    "debit": null,
    "credit": 2953.13,
    "balance": 77051.59
  },
  {
    "date": "2024-10-03",
    "description": "SEND E-TFR",
    "debit": 5000.00,
    "credit": null,
    "balance": 72051.59
  },
  {
    "date": "2024-10-08",
    "description": "Robert Half Can MSP",
    "debit": null,
    "credit": 2401.88,
    "balance": 72450.47
  }
]
```

---

## Validation Rules

For EACH transaction:
1. ✅ Either `debit` OR `credit` is null (never both filled)
2. ✅ Balance must match statement value exactly (for bank accounts)
3. ✅ Date must be in YYYY-MM-DD format
4. ✅ Description must be clean (merged multi-line if needed)
5. ✅ Amounts must be positive (sign handled by debit/credit column)
6. ✅ Credit cards: charges=debit, payments=credit
