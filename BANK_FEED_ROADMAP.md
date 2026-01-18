# Bank Feed Integration - Roadmap

## Current State (✅ Implemented)

**PDF Upload Flow:**
```
1. User uploads PDF statement
2. Extract text using pdfplumber
3. BrandDetector identifies bank
4. ParserRouter routes to specific parser
5. Brand-specific parser extracts transactions
6. Display in UI with brand name + account type
```

**Supported:**
- 11 bank/account combinations
- Zero generalization (bank-specific parsers)
- Manual upload only

---

## Future State (📅 Planned)

**Bank Feed Flow:**
```
1. User connects bank account (OAuth)
2. BankFeedService syncs transactions automatically
3. Same brand detection + parsing logic
4. Auto-categorization via existing AI brain
5. Real-time sync (daily or on-demand)
```

**Benefits:**
- ✅ No manual PDF downloads
- ✅ Real-time transaction updates
- ✅ Multi-account support
- ✅ Historical data backfill

---

## Integration Options

### Option 1: Plaid (Recommended for North America)
- **Pros:** Comprehensive bank coverage, reliable, well-documented
- **Cons:** ~$0.25-0.50 per connected account/month
- **Coverage:** 11,000+ institutions (US/Canada)
- **Best for:** US/Canadian users

### Option 2: Flinks (Canadian Focus)
- **Pros:** Canadian-specific, good for local banks
- **Cons:** Smaller coverage than Plaid
- **Coverage:** Major Canadian banks
- **Best for:** Canada-only deployment

### Option 3: Yodlee
- **Pros:** Enterprise-grade, global coverage
- **Cons:** More expensive, complex setup
- **Best for:** Large-scale deployment

### Option 4: Open Banking APIs (Future)
- **Pros:** Free, direct bank APIs
- **Cons:** Each bank has different API
- **Status:** Emerging in Canada

---

## Implementation Phases

### Phase 1: Infrastructure (2-3 weeks)
- [ ] Choose aggregator (Plaid vs Flinks)
- [ ] Set up API accounts
- [ ] Implement OAuth flow
- [ ] Store encrypted credentials

### Phase 2: Core Functionality (2-3 weeks)
- [ ] Connect bank accounts
- [ ] Fetch transactions
- [ ] Normalize data format
- [ ] Handle refresh tokens

### Phase 3: Integration (1 week)
- [ ] Merge with existing parser logic
- [ ] Update UI (toggle PDF vs Feed)
- [ ] Add sync schedule
- [ ] Error handling

### Phase 4: Testing (1 week)
- [ ] Test with all 6 banks
- [ ] Validate transaction accuracy
- [ ] Handle edge cases
- [ ] Security audit

---

## Data Flow Comparison

| Step | PDF Upload | Bank Feed |
|:-----|:-----------|:----------|
| **Source** | Manual PDF download | Automated API sync |
| **Text Extraction** | pdfplumber | N/A (JSON from API) |
| **Brand Detection** | AI (BrandDetector) | From connection metadata |
| **Parsing** | Brand-specific AI parser | Normalize API response |
| **Categorization** | Same (AI brain) | Same (AI brain) |
| **Frequency** | Manual | Automatic (daily/real-time) |

---

## Security Considerations

- ✅ **Credential Storage:** Encrypted vault (not plaintext)
- ✅ **Tokens:** Rotate refresh tokens regularly
- ✅ **Audit Log:** Track all API calls
- ✅ **User Control:** Easy disconnect/revoke access
- ✅ **Compliance:** SOC 2, PCI DSS if storing payment info

---

## Cost Estimate

**Plaid Pricing (example):**
- Development: Free (sandbox)
- Production: $0.25/month per connected account
- 100 users × 2 accounts = $50/month
- 1,000 users × 2 accounts = $500/month

**Break-even:** Users prefer convenience over manual uploads

---

## Placeholder Files

- [`BankFeedService.js`](file:///C:/Projects/AutoBookkeeping-V4/src/services/BankFeedService.js) - Service skeleton (ready for implementation)

## Status

🚧 **Placeholder created** - Ready for future implementation when budget/timeline allows.
