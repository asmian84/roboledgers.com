# AutoBookkeeping V4 - Supabase Upgrade

## 🎯 What is V4?

Clean copy of AutoBookkeeping v3 with Supabase integration ready to go.

**v3 (Original)**: `G:\My Drive\AutoBookkeeping\AutoBookkeeping-v3`  
**v4 (Upgrade)**: `G:\My Drive\AutoBookkeeping\AutoBookkeeping-V4` ← You are here

---

## ✅ What's Included

### From v3 (All Features)
- ✅ Smart CSV parser (paranoid mode)
- ✅ Vendor matching engine
- ✅ AG Grid integration
- ✅ Multi-account support
- ✅ PDF import service
- ✅ Vendor analysis
- ✅ Audit log
- ✅ All UI components

### New in v4
- ✅ Supabase storage adapter (`src/data/supabase-storage.js`)
- ✅ External repos cloned (`../external-repos/`)
- ✅ `.env.example` for configuration
- ✅ Feature flag for gradual migration

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Supabase Project
1. Go to https://supabase.com
2. Create new project: "autobookkeeping-v4"
3. Copy URL and anon key

### 3. Configure Environment
```bash
# Copy example
cp .env.example .env

# Edit .env and add your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4. Run Database Schema
```bash
# In Supabase SQL Editor, run:
# supabase/schema.sql
```

### 5. Start Development
```bash
# Start with localStorage (v3 mode)
npm run dev

# Or start with Supabase (v4 mode)
# Set VITE_USE_SUPABASE=true in .env
npm run dev
```

---

## 🔄 Migration Strategy

### Gradual Migration (Recommended)
1. Start with `VITE_USE_SUPABASE=false` (localStorage)
2. Test everything works
3. Switch one page at a time to Supabase
4. When all working, set `VITE_USE_SUPABASE=true`

### Feature Flag
```javascript
// In any page
const USE_SUPABASE = import.meta.env.VITE_USE_SUPABASE === 'true';

const storage = USE_SUPABASE 
  ? await import('./data/supabase-storage.js')
  : await import('./data/storage.js');
```

---

## 📁 Folder Structure

```
AutoBookkeeping-V4/
├── src/
│   ├── data/
│   │   ├── storage.js              ← Original (localStorage)
│   │   └── supabase-storage.js     ← NEW (Supabase)
│   ├── services/
│   │   └── supabase-client.js      ← Already exists!
│   └── ... (all v3 files)
├── supabase/
│   └── schema.sql                  ← Database schema
├── .env.example                    ← NEW
└── package.json
```

---

## 🎯 External Repos

Located in: `G:\My Drive\AutoBookkeeping\external-repos\`

- **ledger-tools**: Report generation (P&L, Balance Sheet, Cash Flow)
- **SimpleAccounting**: Double-entry bookkeeping patterns
- **cpedict**: Vendor name normalization

---

## 🔙 Rollback to v3

If anything goes wrong:
```bash
cd "G:\My Drive\AutoBookkeeping\AutoBookkeeping-v3"
npm run dev
```

v3 is completely untouched and still works!

---

## 📊 Next Steps

1. ✅ V4 folder created
2. ✅ Supabase adapter ready
3. ✅ External repos cloned
4. 🔜 Create Supabase project
5. 🔜 Run schema
6. 🔜 Test connection
7. 🔜 Start migration

---

**Status**: V4 ready for Supabase upgrade!  
**v3**: Safe and untouched  
**v4**: Ready to upgrade
