# RoboLedger v2.0 - Supabase Setup Guide

## Quick Start

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Click "New Project"
3. Choose organization
4. Project name: `roboledger-v2`
5. Database password: (save securely)
6. Region: `Canada (Central)` or closest to you
7. Pricing: **Free tier** (500MB) or **Pro** ($25/mo, 8GB)

### 2. Run Database Schema

1. In Supabase Dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy entire contents of `schema.sql`
4. Click "Run"
5. Verify: Check **Table Editor** - should see 12 tables

### 3. Get API Keys

1. Go to **Settings** → **API**
2. Copy:
   - `Project URL`: `https://xxxxx.supabase.co`
   - `anon public key`: `eyJhbGc...`
   - `service_role key`: `eyJhbGc...` (keep secret!)

### 4. Configure Application

Create `src/config/supabase.js`:

```javascript
export const supabaseConfig = {
  url: 'YOUR_PROJECT_URL',
  anonKey: 'YOUR_ANON_KEY'
};
```

## Database Structure

### Core Tables

**bank_accounts** - Multi-account support (CHQ, SAV, CC, INV, LOAN)
**upload_batches** - File import tracking with AI detection
**raw_transactions** - Immutable audit trail
**transactions** - Processed & categorized
**vendors** - Canadian vendor dictionary
**chart_of_accounts** - 1000-9999 accounting structure

### AI Tables

**ai_training_data** - User corrections for learning

### Security

All tables have **Row Level Security (RLS)** enabled:
- Users can only access their own data
- Vendors & COA are shared (read-only)
- Automatic user_id filtering

## Testing

### Create Test Account

```sql
-- In Supabase SQL Editor
INSERT INTO bank_accounts (user_id, account_name, account_type, opening_balance)
VALUES (auth.uid(), 'Test Checking', 'CHQ', 1000.00);
```

### Insert Test Transaction

```sql
INSERT INTO transactions (
  bank_account_id,
  posting_date,
  description,
  amount,
  transaction_type,
  account_number
)
VALUES (
  (SELECT id FROM bank_accounts WHERE account_name = 'Test Checking' LIMIT 1),
  CURRENT_DATE,
  'Test Purchase',
  50.00,
  'DEBIT',
  6300
);
```

## Migration from localStorage

See `migration-guide.md` for step-by-step instructions.

## Backup & Restore

Supabase automatically backs up your database daily (Pro tier).

Manual backup:
1. Go to **Database** → **Backups**
2. Click "Download backup"

## Support

- Supabase Docs: https://supabase.com/docs
- RoboLedger Issues: (your repo)
