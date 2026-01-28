# AutoBookkeeping V4 - Product Roadmap

## Current Version: 4.1.0

## 🎯 Vision
Build a self-learning bookkeeping brain that:
1. Learns from AI once, remembers forever (cost-optimized)
2. Learns from community (multi-user intelligence)
3. Learns from corrections (supervised learning)

---

## ✅ Phase 1: Self-Learning Foundation (COMPLETE)
**Status:** ✅ Shipped (Jan 2026)  
**Cost Impact:** 99.9% AI cost reduction

### Features
- [x] Brain-first lookup (dictionary)
- [x] AI fallback (Google Gemini)
- [x] Auto-learning (save AI results)
- [x] Fuzzy matching (vendor name variants)
- [x] Vendor name extraction (clean descriptions)

### Metrics
- Dictionary lookup: ~200ms
- AI call: ~2000ms + $0.001
- Target cache hit rate: >95%

---

## ✅ Phase 1.1: Extreme Reliability & Metadata Wiring (COMPLETE)
**Status:** ✅ Shipped (Jan 2026)  
**Goal:** 100% accurate bank metadata & sub-ledger stability

### Features
- [x] **"Big 5" Metadata Support**: Automatic Transit/Account extraction for RBC, TD, BMO, CIBC, Scotiabank.
- [x] **"Loud" Console Diagnostics**: Red/Warn block logs for transparent parsing visibility.
- [x] **Extreme Proximity Scanning**: Recovers fragmented PDF metadata via proximity & raw pattern logic.
- [x] **Sub-Ledger Integrity**: Case-normalized account creation to prevent storage validation crashes.
- [x] **Metadata UI Highlighting**: Visual red alerts in UI if transit/account numbers are missing.
- [x] **Dynamic Assignment UI**: Searchable, grouped COA dropdown in the assignment banner.

---

## 🚧 Phase 2: Pattern Recognition (Q1 2026)
**Goal:** One vendor = Many patterns

### Features
- [ ] Multi-pattern vendor storage
  - Example: "AMZN MKTP", "AMAZON.COM", "Amazon Prime" → Amazon
- [ ] Common abbreviation expansion
  - "MSFT" → "Microsoft", "GOOG" → "Google"
- [ ] Industry-standard MCC mapping
  - Extract likely MCC from description
- [ ] Transaction ID removal
  - "*2F8KL3", "#123456" → clean vendor name

### Success Criteria
- 98% cache hit rate after 1 month
- <2% AI calls for duplicate vendors

---

## 🔮 Phase 3: Multi-User Learning (Q2 2026)
**Goal:** Community intelligence (QuickBooks model)

### Features
- [ ] Anonymous category voting
  - User A: "Starbucks" → Food & Dining
  - User B: "Starbucks" → Food & Dining
  - Consensus: 95% confidence boost
- [ ] Cloud sync of categorization votes
- [ ] Privacy-safe data sharing
  - Only: vendor name + category (no amounts)
  - User opt-out option
- [ ] Confidence scoring from consensus
  - 100 users vote → 99% confidence
  - 10 users vote → 80% confidence

### ROI Model
- 10 users × 1000 vendors = ~100 AI calls (90% shared learning)
- 100 users × 1000 vendors = ~10 AI calls (99% shared learning)

---

## 📊 Phase 4: Advanced Features (Q3 2026)

### 4.1 Supervised Learning
- [ ] User correction tracking
- [ ] Feedback loop to AI
- [ ] Pattern reinforcement
- [ ] Confidence adjustment

### 4.2 Excel Export
- [ ] One-click export
- [ ] QuickBooks format compatibility
- [ ] Caseware format compatibility
- [ ] Custom column mapping

### 4.3 Dashboard Intelligence
- [ ] Revenue vs Expenses (monthly)
- [ ] Top 5 expense categories
- [ ] Cash flow trends (6 months)
- [ ] GL account summaries
- [ ] Reconciliation status

### 4.4 Reconciliation Workflow
- [ ] Mark transactions as reviewed
- [ ] Bulk approve categorizations
- [ ] Flag mismatches
- [ ] Audit trail

---

## 🎨 Phase 5: UX Polish (Q4 2026)

### 5.1 Grid Enhancements
- [ ] Column auto-fit
- [ ] Custom column sets
- [ ] Saved filters
- [ ] Bulk edit improvements

### 5.2 Performance
- [ ] Virtual scrolling (10k+ rows)
- [ ] Background processing
- [ ] Lazy loading
- [ ] Cache optimization

### 5.3 Mobile Support
- [ ] Responsive breakpoints
- [ ] Touch-optimized controls
- [ ] Mobile reconciliation view

---

## 💡 Future Innovations

### Machine Learning Enhancements
- Fine-tune custom BERT model on user data
- Vector embeddings for semantic search
- Anomaly detection (unusual expenses)

### Integration Ecosystem
- QuickBooks API sync
- Xero integration
- Plaid for bank connections
- Stripe/PayPal revenue tracking

### AI Cost Optimization
- Local LLM option (Llama 3)
- Hybrid cloud/local inference
- Batch processing discounts

---

## 📈 Success Metrics

| Metric | Current | Target (6 mo) |
|--------|---------|---------------|
| AI Cost per User | $10/mo | <$1/mo |
| Cache Hit Rate | 50% | >95% |
| Categorization Accuracy | 75% | >90% |
| Avg Processing Time | 5s/txn | <1s/txn |
| User Satisfaction | - | 4.5/5 |

---

## 🔧 Technical Debt

### Priority 1 (This Quarter)
- [ ] Migrate from file:// to local dev server (fix CORS properly)
- [ ] Add comprehensive error handling
- [ ] Implement proper logging service
- [ ] Add unit tests for core logic

### Priority 2 (Next Quarter)
- [ ] Refactor global window objects to modules
- [ ] Implement proper state management
- [ ] Add TypeScript definitions
- [ ] Performance profiling

### Priority 3 (Future)
- [ ] Migrate to React/Vue framework
- [ ] Server-side rendering
- [ ] Offline-first architecture
- [ ] Progressive Web App (PWA)

---

**Last Updated:** 2026-01-13  
**Next Review:** 2026-02-01
