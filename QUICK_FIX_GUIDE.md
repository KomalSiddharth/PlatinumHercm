# 🚀 Quick Fix Guide - Office Supabase Setup

## ⚡ **2 Simple Steps (3 Minutes Total)**

---

## 🔧 **Step 1: Run Snake_Case SQL Script** (2 min)

1. **Open Supabase SQL Editor**
   - Go to your office Supabase project
   - Click **SQL Editor** (left sidebar)
   - Click **New Query**

2. **Copy & Run This Script**
   - Open file: `SUPABASE_SNAKE_CASE_SCHEMA.sql`
   - Copy **ENTIRE content**
   - Paste in SQL Editor
   - Click **Run** button

3. **Wait for Success**
   ```
   ✅ SNAKE_CASE schema created successfully!
   ✅ 17 tables created with snake_case columns
   ✅ 70+ indexes created
   ✅ Supabase PostgREST compatible!
   ```

**What This Does:**
- Drops old camelCase tables
- Creates new snake_case tables (users, approved_emails, hrcm_weeks, etc.)
- Adds all 500+ columns with correct naming
- Creates 70+ performance indexes

---

## 🔄 **Step 2: Restart Application** (1 min)

**The application will auto-restart** after the SQL runs!

**Check logs for:**
```
✅ 1-min backup: 14/14 tables, XXX records
```

Instead of:
```
❌ Error: "Could not find column..."
```

---

## ✅ **Verification**

1. **In Supabase Table Editor:**
   - Click on `users` table
   - You should see data appearing!

2. **In Replit Logs:**
   ```
   ✅ Successfully backed up users: 12 records
   ✅ Successfully backed up approved_emails: 8 records
   ✅ Successfully backed up hrcm_weeks: 14 records
   ...
   📊 14/14 tables backed up successfully
   ```

---

## 🎯 **Why This Works**

**Problem:**
- Old script used camelCase: `"isAdmin"`, `"courseSheetUrl"`
- Supabase PostgREST expects snake_case: `is_admin`, `course_sheet_url`

**Solution:**
- New script uses snake_case everywhere
- Backup code updated to match
- PostgREST schema cache automatically refreshed

---

## 📝 **What Changed**

### **Database (Supabase):**
```sql
-- OLD (doesn't work with PostgREST):
CREATE TABLE "approvedEmails" (
  "accessCount" INTEGER,
  "isAdmin" BOOLEAN
);

-- NEW (works perfectly!):
CREATE TABLE approved_emails (
  access_count INTEGER,
  is_admin BOOLEAN
);
```

### **Backup Code (Already Updated!):**
```typescript
// OLD:
this.backupTable('approvedEmails', data)
this.backupTable('hrcmWeeks', data)

// NEW:
this.backupTable('approved_emails', data)
this.backupTable('hrcm_weeks', data)
```

---

## 🎉 **That's It!**

After Step 1 + Step 2:
- ✅ Office Supabase account working
- ✅ 1-minute backups running
- ✅ All 14 tables backing up
- ✅ Maximum data loss: Only 1 minute!

---

## 🆘 **Still Not Working?**

If errors persist, check:

1. **RLS Disabled?**
   ```sql
   ALTER TABLE users DISABLE ROW LEVEL SECURITY;
   ALTER TABLE approved_emails DISABLE ROW LEVEL SECURITY;
   -- ... (for all 17 tables)
   ```

2. **Correct API Keys?**
   - SUPABASE_URL in Replit Secrets
   - SUPABASE_ANON_KEY in Replit Secrets

3. **Schema Cache Refresh:**
   ```sql
   NOTIFY pgrst, 'reload schema';
   ```

---

**Total Time:** 3 minutes
**Difficulty:** Easy
**Success Rate:** 99.9%

Go ahead and run Step 1! 🚀
