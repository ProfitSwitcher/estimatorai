# Database Migration Guide

## Quick Start

### Option 1: Supabase CLI (Recommended)
```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 2: Supabase Dashboard (Manual)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `supabase/migrations/001_company_profiles.sql`
5. Paste into the editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify success message

### Option 3: Local PostgreSQL
If running locally with Supabase local:
```bash
cd /path/to/estimatorai
supabase start
supabase db reset
```

---

## Verify Migration Success

Run these queries in Supabase SQL Editor to verify:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('company_profiles', 'agent_memory', 'estimate_feedback');

-- Should return 3 rows

-- Check if estimates table has new column
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'estimates' 
AND column_name = 'conversation_state';

-- Should return 1 row

-- Check RLS policies
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('company_profiles', 'agent_memory', 'estimate_feedback');

-- Should return 9 rows (3 tables × 3 policies each)
```

---

## If Migration Fails

### Common Issues:

#### 1. "relation 'users' does not exist"
**Solution:** Create users table first (should already exist from initial setup)

#### 2. "relation 'estimates' does not exist"
**Solution:** Check if estimates table exists. If not, you may need to run initial migrations first.

#### 3. "extension 'uuid-ossp' does not exist"
**Solution:** Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

#### 4. "type memory_type already exists"
**Solution:** Migration was already run (partially). Either:
- Drop and recreate (destructive)
- Or skip duplicate commands

#### 5. RLS policy errors
**Solution:** Ensure auth schema exists and session functions are available

---

## Rollback (If Needed)

To undo the migration:

```sql
-- Drop tables (WARNING: Deletes all data in these tables)
DROP TABLE IF EXISTS estimate_feedback CASCADE;
DROP TABLE IF EXISTS agent_memory CASCADE;
DROP TABLE IF EXISTS company_profiles CASCADE;

-- Drop enum type
DROP TYPE IF EXISTS memory_type CASCADE;

-- Remove column from estimates
ALTER TABLE estimates DROP COLUMN IF EXISTS conversation_state;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
```

---

## Post-Migration Steps

1. **Verify RLS is active:**
```sql
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('company_profiles', 'agent_memory', 'estimate_feedback');
-- All should show rowsecurity = true
```

2. **Test with a user account:**
   - Register a new test user
   - Complete onboarding
   - Check that data appears in company_profiles table

3. **Monitor logs:**
   - Watch Supabase logs for any RLS violations
   - Check for foreign key constraint errors

---

## Migration Details

### Tables Created:
1. **company_profiles** (14 columns) - Contractor business profile
2. **agent_memory** (5 columns) - AI learning data
3. **estimate_feedback** (7 columns) - User edits for learning

### Indexes Created:
- `idx_agent_memory_user_id`
- `idx_agent_memory_type`
- `idx_agent_memory_created_at`
- `idx_estimate_feedback_estimate_id`
- `idx_estimate_feedback_user_id`
- `idx_estimate_feedback_created_at`

### Triggers Created:
- `update_company_profiles_updated_at` - Auto-updates timestamp

### RLS Policies:
- 9 total policies (SELECT, INSERT, UPDATE, DELETE on 3 tables)
- All policies enforce user_id = auth.uid()

---

## Testing the Migration

```bash
# After migration, test locally:
npm run dev

# Navigate to:
http://localhost:3000/register

# Create account, should redirect to /onboarding
# Complete all 5 steps
# Verify data in Supabase:
```

```sql
-- Check if your profile was created
SELECT * FROM company_profiles LIMIT 1;

-- Should see your company data
```

---

## Need Help?

If migration fails:
1. Check Supabase project logs
2. Verify you have admin/service role permissions
3. Ensure no active connections are blocking schema changes
4. Try running individual statements to isolate the error
5. Check if using Supabase free tier (limits may apply)

---

**Migration file:** `supabase/migrations/001_company_profiles.sql`  
**Lines:** 178  
**Size:** ~5.2 KB  
**Estimated run time:** < 5 seconds
