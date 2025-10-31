# 🏢 Office Supabase Account Migration Guide

## ✅ Complete Migration in 5 Steps (10 Minutes Total)

---

## 📋 **STEP 1: Create New Office Supabase Account** (2 min)

1. Go to https://supabase.com
2. Sign up with **office email**
3. Create new project:
   - Name: `hrcm-dashboard-prod`
   - Database Password: (save this securely!)
   - Region: Choose closest to your users
4. Wait for project to initialize (~1 min)

---

## 🔑 **STEP 2: Get API Credentials** (1 min)

1. In your new Supabase project, click **Settings** (gear icon)
2. Go to **API** section
3. Copy these 2 values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon/public key** (looks like: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

---

## 💾 **STEP 3: Run SQL Schema** (2 min)

1. In Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Copy-paste the **ENTIRE content** from `SUPABASE_PRODUCTION_SCHEMA.sql` file
4. Click **Run** (bottom right)
5. Wait for success message: ✅ "Complete production schema created successfully!"

**What this creates:**
- ✅ 17 tables with complete structure
- ✅ 70+ performance indexes
- ✅ All JSONB fields, constraints, foreign keys
- ✅ Ready for 30K users!

---

## 🔧 **STEP 4: Configure Replit Secrets** (1 min)

1. In Replit, click **Secrets** (🔒 icon in left sidebar)
2. Update these 2 secrets:

```
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

3. Click **Save**

---

## ⚙️ **STEP 5: Disable Row Level Security (RLS)** (1 min)

**CRITICAL:** Supabase RLS blocks backup service by default.

1. In Supabase, go to **Table Editor**
2. For EACH table (use SQL Editor for bulk disable):

```sql
-- Disable RLS for ALL tables (run this in SQL Editor)
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE "approvedEmails" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "hrcmWeeks" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "platinumProgress" DISABLE ROW LEVEL SECURITY;
ALTER TABLE rituals DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ritualCompletions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE "ratingProgression" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "courseVideos" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "courseVideoCompletions" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "adminCourseRecommendations" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "platinumStandards" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "emotionalTrackers" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "userPersistentAssignments" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "accessLogs" DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;
ALTER TABLE "adminUsers" DISABLE ROW LEVEL SECURITY;
```

3. Click **Run**

---

## 🚀 **STEP 6: Restart Application & Test** (3 min)

1. Application will auto-restart when you save secrets
2. Check logs for:
   ```
   ✅ Supabase backup service configured successfully
   ✅ 1-min backup: 14/14 tables, XXX records
   ```
3. Verify in Supabase **Table Editor**:
   - Click on any table (e.g., `users`)
   - You should see backup data appearing!

---

## ✅ **Verification Checklist**

- [ ] New office Supabase project created
- [ ] SQL schema executed successfully (17 tables)
- [ ] SUPABASE_URL and SUPABASE_ANON_KEY updated in Replit
- [ ] RLS disabled for all 17 tables
- [ ] Application restarted
- [ ] Backup logs showing success (14/14 tables)
- [ ] Data visible in Supabase Table Editor

---

## 📊 **Expected Results**

**Before Migration:**
```
❌ Error backing up users: "Could not find column..."
📊 2/14 tables backed up successfully
```

**After Migration:**
```
✅ 1-min backup: 14/14 tables, 338 records
📊 14/14 tables backed up successfully
```

---

## 🆘 **Troubleshooting**

### Problem: "Could not find column" errors
**Solution:** RLS is still enabled. Run Step 5 again.

### Problem: "JWT token expired"
**Solution:** Wrong SUPABASE_ANON_KEY. Double-check Step 2.

### Problem: No data in Supabase tables
**Solution:** 
1. Wait 1 minute for next backup
2. Check if RLS is disabled
3. Check logs for error messages

### Problem: "Table does not exist"
**Solution:** SQL schema not run properly. Re-run Step 3.

---

## 🎯 **Success Indicators**

1. **Logs:** `✅ 1-min backup: 14/14 tables, XXX records`
2. **Supabase UI:** Data visible in all tables
3. **No Errors:** Clean backup logs every minute
4. **Data Loss:** Maximum 1 minute!

---

## 📞 **Need Help?**

If any step fails, check:
1. Supabase project is fully initialized (green status)
2. API keys are copied exactly (no extra spaces)
3. SQL ran without errors (scroll to bottom of output)
4. RLS is disabled (critical!)

---

## 🎉 **Migration Complete!**

Your office Supabase account is now:
- ✅ Receiving backups every 1 minute
- ✅ Complete production schema (500+ columns)
- ✅ Ready for 30K users (FREE tier <500 users)
- ✅ Professional disaster recovery system

**Old personal account:** Can be safely deleted after verifying new backups work for 24 hours.

**Next Steps:**
1. Monitor backups for 24 hours
2. Test disaster recovery (optional)
3. Upgrade to PRO tier when user count > 500
