# AutoBookkeeping - Product Roadmap (Dec 2025)

**Last Updated:** December 8, 2025

---

## 🎯 Strategic Vision

**Positioning:** Privacy-First, Local-First Bookkeeping Tool

**vs Competitors:**
- bookeeping.ai = SaaS with bank sync ($$$)
- RoboLedger = Enterprise knowledge graph platform (AWS/Neo4j)
- **AutoBookkeeping** = Free, private, simple CSV processor

**Our Advantage:** "The Notepad to their Microsoft Word" - 10 features people use daily, zero bloat.

---

## 🆕 Recently Completed (Dec 5-8, 2025)

✅ **Settings Module Refactor** - Modular structure, clean CSS (Dec 7)
✅ **Undo/Redo System** - Ctrl+Z/Ctrl+Y support (Dec 6)
✅ **Keyboard Navigation** - Full arrow key control (Dec 6)
✅ **Session Persistence** - Continue/Start Over(Dec 5)
✅ **AI Re-think Performance** - Batch saves, <1 sec for 183 txns (Dec 5)
✅ **Vendor Import/Export** - Backend complete (Dec 6)
✅ **BankAccount Data Model** - Multi-account foundation (Dec 8)

---

## 🚧 In Progress

### 1. Multi-Account Support (Priority #1)
**Status:** Phase 1 started - BankAccount class added
**Timeline:** 4 weeks total

**Why:** Credit cards need reversed logic, aggregate reporting needed

**Phases:**
- ✅ Week 1: Data model (BankAccount class done)
- 🚧 Week 1: Storage refactor + AccountManager
- ⏳ Week 2: Progressive UI (dropdown, add button)
- ⏳ Week 3: Account-specific logic
- ⏳ Week 4: Aggregate reporting + dashboard

### 2. Bug Testing
- Reports module validation
- Company name persistence check
- AI Re-think end-to-end testing

---

## ⚡ Priority Features (Post Multi-Account)

### Quick Wins (High Value, Low Complexity)

1. **📄 PDF Report Export** (1-2 days)
   - Export Income Statement, Balance Sheet, Trial Balance
   - Use jsPDF library
   - Professional formatting

2. **🔍 Duplicate Detection** (2-3 days)
   - Auto-detect duplicate transactions
   - Highlight based on date + amount + description
   - One-click merge/delete

3. **📎 Transaction Notes** (1 day)
   - Add notes to transactions
   - Attach image URLs (receipts)
   - Context for audits

4. **📥 Multi-CSV Import** (2 days)
   - Upload multiple CSVs at once
   - Merge chronologically
   - Detect/handle overlaps

5. **🔎 Full-Text Search** (1 day)
   - Search all transaction fields
   - Instant results
   - Search history

---

## 🏦 Multi-Account Detailed Roadmap

### Account Types Supported
- 🏦 Checking Account
- 💰 Savings Account  
- 💳 Credit Card (reversed debit/credit logic)
- 📊 Line of Credit (reversed debit/credit logic)

### Key Features
- **Progressive Disclosure:** Single account = simple UI, 2+ = dropdown appears
- **Ctrl+Shift+A:** Quick switch keyboard shortcut
- **Account-Specific Logic:** Credit cards auto-detect reversed accounting
- **Aggregate Reporting:** Consolidated financials across all accounts
- **Optional Dashboard:** Power user view with account cards

### UX Flow
```
First Upload → Create Account → Grid
Second Account → "+ Add Account" appears → Dropdown shows
Multiple Accounts → Full features unlocked
```

---

## 🎯 Strategic Priorities

### ✅ KEEP Building
- Multi-account support (competitive necessity)
- PDF export (table stakes)
- Better CSV handling (core workflow)
- Vendor dictionary (differentiator)
- Privacy-first architecture (competitive advantage)

### ❌ DON'T Build
- Bank API sync (kills privacy advantage)
- Knowledge graphs (enterprise overkill)
- AI agents/chat (too complex, not our market)
- QuickBooks API integration (SaaS complexity)
- Multi-user/collaboration (privacy conflict)

### 📢 Marketing Focus
- **100% Private** - Data never leaves browser
- **100% Free** - No subscriptions ever
- **10-Minute Setup** - Upload, categorize, export
- **Works Offline** - No internet required
- **Accountant-Friendly** - Export to QB/CASEWARE

---

## 🚀 Future Expansion (Selective)

### Reports & Analytics
- Cash Flow Statement
- Year-over-year comparisons
- Tax reports (GST/HST)
- Custom report builder
- Department/project tracking

### CSV & Import
- Multi-bank format support (TD, RBC, BMO, etc.)
- Better date format detection
- Bulk import (multiple months)
- Recurring transaction templates

### Smart Features
- Enhanced AI categorization rules
- Spending pattern analysis
- Budget vs actual comparisons
- Anomaly detection

### Export
- **PDF reports** (TOP PRIORITY)
- Sage 50 format
- Xero format
- Wave Accounting format
- JSON/XML for custom systems

---

## 💡 Won't Build (Competitive Analysis)

Based on bookeeping.ai and RoboLedger analysis:

❌ **AI Chat Interface** - Too complex, not our market
❌ **Bank Sync** - Requires backend, kills privacy
❌ **Invoice Generation** - Out of scope
❌ **Payment Processing** - SaaS complexity
❌ **E-signatures** - Not bookkeeping core
❌ **Multi-tenant SaaS** - Against privacy mission
❌ **Mobile Apps** - Web-first sufficient
❌ **Blockchain/Crypto** - Gimmick

---

## 🎯 Target Market

### Primary Users
- Solo entrepreneurs & freelancers
- Small businesses (1-10 employees)
- Privacy-conscious users
- DIY accountants
- CSV workflow fans

### NOT Targeting
- Large enterprises (use RoboLedger)
- SaaS seekers (use bookeeping.ai)
- Bank sync dependents
- Collaboration-heavy teams

---

## 📊 Current Stats

- **50+** Implemented Features
- **100+** Planned Features (culled to ~15 priority)
- **6** Themes available
- **4** Export formats (CSV, QB, CASEWARE, Excel)
- **183** transactions processed in <1 second
- **100%** Privacy (local-only storage)
- **$0** Cost forever

---

## 🗓️ Next 30 Days

### Week 1 (Dec 9-15)
- Complete AccountManager module
- Refactor storage.js for multi-account
- Auto-migration testing

### Week 2 (Dec 16-22)
- Progressive UI implementation
- Account selec tor dropdown
- "+ Add Account" button
- Account creation dialog

### Week 3 (Dec 23-29)
- Credit card logic implementation
- CSV import per account
- Testing & debugging

### Week 4 (Dec 30 - Jan 5)
- Aggregate reporting
- Optional dashboard
- Documentation
- Release v2.0

---

## 📈 Success Metrics

**Development:**
- ✅ Zero breaking changes for existing users
- ✅ Backwards compatible data migration
- ✅ Phase rollout without UI disruption

**Product:**
- Support 4 account types seamlessly
- Aggregate reports combining all accounts
- Maintain <1 second transaction processing
- Stay 100% local-only (privacy)

**Market:**
- Position as privacy alternative
- Target solo/small business
- Avoid feature creep
- Maximize simplicity

---

**Next Review:** January 1, 2026
**Version:** 2.0 (Multi-Account Release)
