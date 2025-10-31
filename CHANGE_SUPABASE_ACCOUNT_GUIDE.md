# 🔄 Supabase Account Change Guide

**Complete step-by-step guide to switch to a new Supabase account**

---

## 📋 **Prerequisites**

Before starting:
- [ ] New Supabase account access
- [ ] Access to Replit Secrets
- [ ] Current backup data (optional, for migration)

---

## 🎯 **STEP 1: Create New Supabase Project**

### **1.1 Sign Up / Login to Supabase**

1. **Go to:** https://supabase.com
2. **Click:** "Start your project" or "Sign In"
3. **Login with:**
   - GitHub account (recommended)
   - Google account
   - Email/Password

### **1.2 Create New Project**

1. **Click:** "New Project" button
2. **Fill Details:**
   ```
   Project Name: HRCM-Dashboard-Backup
   Database Password: [STRONG PASSWORD - SAVE THIS!]
   Region: Mumbai (ap-south-1) - CLOSEST TO INDIA
   Pricing Plan: Free tier
   ```
3. **Click:** "Create new project"
4. **Wait:** 2-3 minutes for setup to complete

### **1.3 Note Down Project Details**

Project is ready! Now save these:

**Project URL:**
```
https://XXXXXXXXXXXXXXXX.supabase.co
```

**Project Reference ID:**
```
[Example: vdtoxkwwengntgbsjcro]
```

**Database Password:**
```
[The password you set in step 1.2 - SAVE IT!]
```

---

## 🔑 **STEP 2: Get New Supabase Credentials**

### **2.1 Get API Keys**

1. **In Supabase Dashboard:**
   - Left sidebar → **"Project Settings"** (gear icon)
   - Click **"API"** tab

2. **Copy These Keys:**

   **Project URL:**
   ```
   https://XXXXXXXXXXXXXXXX.supabase.co
   ```
   
   **Anon Public Key (for SUPABASE_ANON_KEY):**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ...
   ```

### **2.2 Get Database Connection String**

1. **In Supabase Dashboard:**
   - **Project Settings** → **"Database"** tab
   - Scroll down to **"Connection string"**
   - Select **"Transaction"** mode (recommended for backups)

2. **Copy Connection String:**
   ```
   postgresql://postgres.XXXXX:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```

3. **Replace `[YOUR-PASSWORD]`** with your actual database password

**Final Connection String Example:**
```
postgresql://postgres.abc123xyz:[YOUR-DB-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

---

## 🗄️ **STEP 3: Setup Database Schema in New Supabase**

### **3.1 Open SQL Editor**

1. **In Supabase Dashboard:**
   - Left sidebar → **"SQL Editor"**
   - Click **"New query"**

### **3.2 Run Schema Migration**

**Copy this SQL script and run it:**

```sql
-- =============================================
-- HRCM Dashboard - Supabase Schema Migration
-- camelCase version for Drizzle ORM compatibility
-- =============================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  "passwordHash" VARCHAR(255) NOT NULL,
  "firstName" VARCHAR(100),
  "lastName" VARCHAR(100),
  role VARCHAR(20) DEFAULT 'user',
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Approved Emails
CREATE TABLE IF NOT EXISTS "approvedEmails" (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  "addedBy" INTEGER REFERENCES users(id),
  "addedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. HRCM Weeks
CREATE TABLE IF NOT EXISTS "hrcmWeeks" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "weekStart" DATE NOT NULL,
  "weekEnd" DATE NOT NULL,
  health INTEGER,
  relationship INTEGER,
  career INTEGER,
  money INTEGER,
  "overallScore" DECIMAL(5,2),
  problems TEXT,
  feelings TEXT,
  "nextWeekActions" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "weekStart")
);

-- 4. Platinum Progress
CREATE TABLE IF NOT EXISTS "platinumProgress" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  "currentStreak" INTEGER DEFAULT 0,
  "longestStreak" INTEGER DEFAULT 0,
  "totalWeeksCompleted" INTEGER DEFAULT 0,
  "lastCompletedDate" DATE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Rituals
CREATE TABLE IF NOT EXISTS rituals (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  "isActive" BOOLEAN DEFAULT true,
  "displayOrder" INTEGER,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Ritual Completions
CREATE TABLE IF NOT EXISTS "ritualCompletions" (
  id SERIAL PRIMARY KEY,
  "ritualId" INTEGER NOT NULL REFERENCES rituals(id) ON DELETE CASCADE,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  completed BOOLEAN DEFAULT false,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("ritualId", date)
);

-- 7. Courses
CREATE TABLE IF NOT EXISTS courses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Rating Progression
CREATE TABLE IF NOT EXISTS "ratingProgression" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "weekStart" DATE NOT NULL,
  area VARCHAR(50) NOT NULL,
  "previousRating" INTEGER,
  "currentRating" INTEGER,
  "incrementApplied" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "weekStart", area)
);

-- 9. Course Videos
CREATE TABLE IF NOT EXISTS "courseVideos" (
  id SERIAL PRIMARY KEY,
  "courseId" INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  "videoUrl" VARCHAR(500),
  "videoDuration" INTEGER,
  description TEXT,
  "displayOrder" INTEGER,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 10. Course Video Completions
CREATE TABLE IF NOT EXISTS "courseVideoCompletions" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "videoId" INTEGER NOT NULL REFERENCES "courseVideos"(id) ON DELETE CASCADE,
  completed BOOLEAN DEFAULT false,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "videoId")
);

-- 11. Admin Course Recommendations
CREATE TABLE IF NOT EXISTS "adminCourseRecommendations" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "courseTitle" VARCHAR(255) NOT NULL,
  "recommendedBy" INTEGER REFERENCES users(id),
  reason TEXT,
  status VARCHAR(50) DEFAULT 'pending',
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 12. Platinum Standards
CREATE TABLE IF NOT EXISTS "platinumStandards" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "weekStart" DATE NOT NULL,
  health INTEGER,
  relationship INTEGER,
  career INTEGER,
  money INTEGER,
  "meetsStandard" BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", "weekStart")
);

-- 13. Emotional Trackers
CREATE TABLE IF NOT EXISTS "emotionalTrackers" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  "timeSlot" INTEGER NOT NULL CHECK ("timeSlot" BETWEEN 1 AND 9),
  emotion VARCHAR(50),
  intensity INTEGER CHECK (intensity BETWEEN 1 AND 10),
  notes TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE("userId", date, "timeSlot")
);

-- 14. User Persistent Assignments
CREATE TABLE IF NOT EXISTS "userPersistentAssignments" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "assignmentText" TEXT NOT NULL,
  source VARCHAR(50) DEFAULT 'user',
  "courseTitle" VARCHAR(255),
  completed BOOLEAN DEFAULT false,
  "completedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 15. Access Logs (for daily backup only)
CREATE TABLE IF NOT EXISTS "accessLogs" (
  id SERIAL PRIMARY KEY,
  "userId" INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  "ipAddress" VARCHAR(45),
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_hrcm_weeks_user_date ON "hrcmWeeks"("userId", "weekStart");
CREATE INDEX IF NOT EXISTS idx_rituals_user ON rituals("userId");
CREATE INDEX IF NOT EXISTS idx_ritual_completions_date ON "ritualCompletions"(date);
CREATE INDEX IF NOT EXISTS idx_emotional_trackers_user_date ON "emotionalTrackers"("userId", date);
CREATE INDEX IF NOT EXISTS idx_assignments_user ON "userPersistentAssignments"("userId", completed);

-- Success message
SELECT 'Schema migration completed successfully! 🎉' AS status;
```

### **3.3 Verify Schema Creation**

After running the SQL:

1. **Check Tables:**
   - Left sidebar → **"Table Editor"**
   - You should see 15 tables created

2. **Look for Success Message:**
   ```
   Schema migration completed successfully! 🎉
   ```

✅ **Schema is ready!**

---

## 🔐 **STEP 4: Update Replit Secrets**

### **4.1 Open Replit Secrets**

1. **In Replit Dashboard:**
   - Left sidebar → **"Tools"**
   - Click → **"Secrets"**

### **4.2 Update SUPABASE_URL**

1. **Find:** `SUPABASE_URL` in secrets list
2. **Click:** Edit button (pencil icon)
3. **Replace with:** Your new Supabase project URL
   ```
   https://XXXXXXXXXXXXXXXX.supabase.co
   ```
4. **Click:** Save

### **4.3 Update SUPABASE_ANON_KEY**

1. **Find:** `SUPABASE_ANON_KEY` in secrets list
2. **Click:** Edit button
3. **Replace with:** Your new Supabase anon key
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ...
   ```
4. **Click:** Save

### **4.4 Add SUPABASE_DATABASE_URL (For Future Failover)**

**Optional but Recommended:**

1. **Click:** "Add new secret"
2. **Key:** `SUPABASE_DATABASE_URL`
3. **Value:** Your complete connection string
   ```
   postgresql://postgres.XXXXX:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
4. **Click:** Add

---

## 🔄 **STEP 5: Restart Application**

### **5.1 Automatic Restart**

After changing secrets, Replit will automatically restart your app.

**Wait 10-20 seconds**

### **5.2 Manual Restart (if needed)**

1. **Click:** Stop button (top-right)
2. **Click:** Run button
3. **Or keyboard:** `Ctrl + Enter`

---

## ✅ **STEP 6: Verify New Supabase Connection**

### **6.1 Check Console Logs**

Look for this message in console:
```
✅ Scheduled backups initialized:
   - Real-time backup: EVERY 1 MINUTE
   - Daily full backup: 2:00 AM IST
   - Maximum data loss: Only 1 MINUTE!
```

### **6.2 Test Backup API**

**Open in browser:**
```
https://your-app.replit.app/api/admin/backup/trigger
```

**Login as admin**, then check response:
```json
{
  "success": true,
  "message": "Manual backup completed",
  "tablesBackedUp": 14,
  "recordsBackedUp": [number]
}
```

### **6.3 Check Supabase Dashboard**

1. **Go to:** Your new Supabase project
2. **Click:** "Table Editor"
3. **Check:** Tables should start showing data
4. **Verify:** Backup data is being inserted

✅ **If you see data in tables → SUCCESS!**

---

## 📊 **STEP 7: Verify Data in New Supabase**

### **7.1 Wait for First Backup**

Wait **1-2 minutes** for first backup to complete.

### **7.2 Check Tables in Supabase**

1. **In Supabase Dashboard:**
   - **Table Editor** → **users** table
   - You should see your user records

2. **Check Other Tables:**
   - `hrcmWeeks` - Should have HRCM data
   - `rituals` - Should have ritual data
   - `emotionalTrackers` - Should have emotion data

### **7.3 Count Records**

Run this SQL in Supabase SQL Editor:
```sql
SELECT 
  (SELECT COUNT(*) FROM users) as users_count,
  (SELECT COUNT(*) FROM "hrcmWeeks") as hrcm_count,
  (SELECT COUNT(*) FROM rituals) as rituals_count,
  (SELECT COUNT(*) FROM "emotionalTrackers") as emotions_count;
```

**Expected result:** Should match your production database counts!

---

## 🎯 **STEP 8: Migration Complete Checklist**

### **Final Verification:**

- [ ] ✅ New Supabase project created
- [ ] ✅ Database schema migrated (15 tables)
- [ ] ✅ SUPABASE_URL updated in Replit Secrets
- [ ] ✅ SUPABASE_ANON_KEY updated in Replit Secrets
- [ ] ✅ Application restarted successfully
- [ ] ✅ Backup running every 1 minute
- [ ] ✅ Data appearing in new Supabase tables
- [ ] ✅ Old Supabase account can be deleted (optional)

---

## 🗑️ **STEP 9: Delete Old Supabase Account (Optional)**

**ONLY do this after confirming new account works for 2-3 days!**

### **9.1 Verify New System Working**

1. ✅ Check backups running for 2-3 days
2. ✅ Verify all data being backed up
3. ✅ Test failover once (optional but recommended)

### **9.2 Delete Old Project**

1. **Go to:** Old Supabase dashboard
2. **Project Settings** → **General**
3. **Scroll down** → "Pause project" or "Delete project"
4. **Confirm deletion**

⚠️ **WARNING:** This is permanent! Make sure new system is working first!

---

## 🚨 **Troubleshooting**

### **Problem 1: Schema Migration Failed**

**Error:** "relation already exists"

**Solution:**
1. Drop all tables in Supabase SQL Editor:
   ```sql
   DROP SCHEMA public CASCADE;
   CREATE SCHEMA public;
   ```
2. Re-run schema migration SQL

### **Problem 2: No Data in New Supabase**

**Possible causes:**
- ❌ Wrong credentials in Replit Secrets
- ❌ App not restarted after secret change
- ❌ Backup service not running

**Solution:**
1. Check console logs for errors
2. Verify SUPABASE_URL and SUPABASE_ANON_KEY
3. Restart app manually
4. Wait 1-2 minutes for backup to run

### **Problem 3: "Invalid API Key" Error**

**Solution:**
- Double-check SUPABASE_ANON_KEY is correct
- Make sure you copied "anon public" key, not "service_role" key
- Regenerate API keys if needed

---

## 💡 **Pro Tips**

1. **Keep Both Accounts Active Initially:**
   - Run new Supabase for 2-3 days
   - Verify everything works
   - Then delete old account

2. **Save Credentials Safely:**
   - Use a password manager
   - Keep database password in secure location
   - Don't share connection strings

3. **Monitor Both Dashboards:**
   - Check new Supabase daily for first week
   - Verify backup counts match production
   - Watch for any errors

4. **Test Failover:**
   - After 1 week, test switching DATABASE_URL to new Supabase
   - Verify app works with backup database
   - Switch back to Replit primary

---

## 📞 **Quick Reference - All Credentials**

**Keep This Information Safe:**

### **New Supabase Project:**
```
Project URL: https://XXXXXXXXXXXXXXXX.supabase.co
Project Ref: [Your project reference ID]
Database Password: [Your chosen password]
Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Connection String: postgresql://postgres.XXXXX:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### **Replit Secrets Updated:**
```
SUPABASE_URL = https://XXXXXXXXXXXXXXXX.supabase.co
SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_DATABASE_URL = postgresql://postgres.XXXXX:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

---

## ⏱️ **Expected Timeline**

| Step | Time Required |
|------|---------------|
| Create Supabase project | 3-5 minutes |
| Get credentials | 2-3 minutes |
| Setup database schema | 2-3 minutes |
| Update Replit secrets | 2-3 minutes |
| Restart & verify | 5-10 minutes |
| **TOTAL** | **15-25 minutes** |

---

## ✅ **Success Indicators**

You'll know migration is successful when:

1. ✅ Console shows: "1-min backup: 14/14 tables, [X] records"
2. ✅ Supabase tables have data
3. ✅ Backup count increases every minute
4. ✅ Dashboard loads normally
5. ✅ No errors in console logs

---

**Congratulations! Your new Supabase account is now active!** 🎉

*Last Updated: October 31, 2025*
*Estimated Time: 15-25 minutes*
*Difficulty: Easy-Medium*
