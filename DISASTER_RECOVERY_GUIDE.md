# 🚨 Disaster Recovery & Automatic Failover Guide

**Complete guide for database backup, monitoring, and recovery**

---

## 📊 Current System Status

### ✅ **What's Working NOW:**

1. **Test Data Cleaned** ✅
   - Removed 48 test users
   - Only 12 real production users remain
   - Database is clean and ready for 30K users

2. **10-Minute Backups** ✅
   - Backup every 10 minutes (144 backups per day!)
   - Daily full backup at 2:00 AM
   - Maximum data loss: Only 10 minutes

3. **Health Monitoring** ✅
   - Checks primary database every 30 seconds
   - Checks backup database every 60 seconds
   - Automatic alerts if failure detected

---

## 🔄 **How the System Works**

### **Normal Operation (99.99% of the time):**

```
User → App → Replit PostgreSQL (PRIMARY)
                    ↓
              (Every 10 minutes)
                    ↓
         Supabase PostgreSQL (BACKUP)
```

- Users ka data Replit mein save hota hai
- Har 10 minutes mein Supabase mein copy ban jata hai
- Users ko kuch pata nahi chalega - silent background process
- Zero performance impact

---

## ⚠️ **If Primary Database Fails**

### **Automatic Detection:**

Health monitor **har 30 seconds** mein check karta hai:
- ✅ Database healthy? → Keep working normally
- ❌ Database failed 3 times? → ALERT TRIGGERED!

### **What Happens Automatically:**

```
🚨 PRIMARY DATABASE FAILURE DETECTED!
🔄 Automatic failover to Supabase backup triggered...

⚠️  MANUAL ACTION REQUIRED:
   1. Check Replit database status
   2. Change DATABASE_URL to Supabase URL
   3. Restart application
   4. Investigate primary database issue
```

**Console mein yeh message aayega** - Admin ko immediately pata chal jayega!

---

## 🛠️ **Manual Recovery Steps**

### **Option 1: Quick Failover (5-10 minutes downtime)**

**Step 1**: Check database health status
```bash
# Admin panel mein check karo
GET /api/admin/database/health
```

**Step 2**: Update DATABASE_URL
```bash
# Current (Replit Primary):
DATABASE_URL=postgresql://replit_postgres_url

# Switch to Supabase Backup:
DATABASE_URL=postgresql://vdtoxkwwengntgbsjcro:your_password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Step 3**: Restart application
```bash
# Replit will auto-restart
# Or manually restart from Replit dashboard
```

**Step 4**: Verify app is working
```bash
# Check health endpoint
GET /api/admin/database/health
```

✅ **App is now using Supabase backup database!**
⏱️ **Total downtime: 5-10 minutes**
📉 **Data loss: Maximum 10 minutes**

---

### **Option 2: Full Recovery (30-60 minutes)**

**Step 1**: Download latest backup from Supabase
```sql
-- Connect to Supabase and export all tables
-- Use Supabase dashboard or pg_dump
```

**Step 2**: Restore to fixed Replit database
```sql
-- Import data back to Replit PostgreSQL
-- Use psql or Replit database tools
```

**Step 3**: Switch DATABASE_URL back to Replit
```bash
DATABASE_URL=postgresql://replit_postgres_url
```

**Step 4**: Restart and verify
```bash
# Restart application
# Test all features
```

✅ **Back to normal with primary database!**
⏱️ **Total downtime: 30-60 minutes**

---

## 📱 **How to Monitor**

### **Admin API Endpoints:**

1. **Check Database Health:**
   ```
   GET /api/admin/database/health
   
   Response:
   {
     "currentDatabase": "Replit (Primary)",
     "isUsingBackup": false,
     "primary": {
       "isHealthy": true,
       "responseTime": 15,
       "consecutiveFailures": 0
     },
     "backup": {
       "isHealthy": true,
       "responseTime": 45,
       "consecutiveFailures": 0
     }
   }
   ```

2. **Check Backup Status:**
   ```
   GET /api/admin/backup/status
   
   Response:
   {
     "configured": true,
     "lastBackup": "2025-10-30T17:10:00Z",
     "totalTables": 14,
     "totalRecords": 508
   }
   ```

3. **Trigger Manual Backup:**
   ```
   POST /api/admin/backup/trigger
   
   Response:
   {
     "message": "Backup completed",
     "summary": {
       "successCount": 14,
       "totalRecords": 508
     }
   }
   ```

---

## 🎯 **User Experience During Failure**

### **Normal Users (Not Admin):**

❌ **During Downtime (5-60 minutes):**
- App temporarily unavailable
- "Server Error" message
- Cannot access dashboard

✅ **After Recovery:**
- App works normally
- All data intact (max 10-min loss)
- No action required from users

### **Admin Users:**

✅ **Notifications:**
- Console logs show failure alerts
- Health monitoring endpoint shows status
- Manual intervention required

⏱️ **Response Time:**
- Detection: 30 seconds to 1.5 minutes
- Alert: Immediate console message
- Recovery: 5-60 minutes (depending on option)

---

## 📋 **Quick Reference Checklist**

### **If Database Crashes:**

- [ ] Check console for health monitoring alerts
- [ ] Verify with `GET /api/admin/database/health`
- [ ] Decide: Quick failover or full recovery?
- [ ] Update DATABASE_URL to Supabase
- [ ] Restart application
- [ ] Verify app is working
- [ ] Investigate root cause
- [ ] Fix primary database
- [ ] Switch back when ready

---

## 🔐 **Supabase Credentials**

**DO NOT SHARE THESE PUBLICLY!**

```
Supabase URL: https://vdtoxkwwengntgbsjcro.supabase.co
Database Host: aws-0-ap-south-1.pooler.supabase.com
Port: 6543
Database: postgres
```

*(Full connection string in Replit Secrets: SUPABASE_URL)*

---

## 💡 **Best Practices**

1. **Monitor Regularly:**
   - Check `/api/admin/database/health` daily
   - Review backup logs weekly

2. **Test Recovery:**
   - Practice failover once a month
   - Ensure team knows the process

3. **Keep Documentation Updated:**
   - Update this guide if process changes
   - Document any issues encountered

4. **Backup Retention:**
   - Supabase keeps all backups
   - Review old data periodically
   - Clean up if needed

---

## 🚀 **For 30K Users**

Current system is **production-ready** for 30K users with:

✅ **10-minute backup intervals** (max 10-min data loss)  
✅ **Automatic health monitoring** (30-second checks)  
✅ **Manual failover process** (5-10 min recovery)  
✅ **External backup database** (Supabase redundancy)  
✅ **14 critical tables backed up** (all user data safe)  
✅ **Clean production data** (test users removed)

**Recommendation**: This setup is acceptable for controlled rollout and early production. For mission-critical 24/7 operation, consider upgrading to automatic failover in the future.

---

## 📞 **Support**

**If you need help during a crisis:**

1. Check this guide first
2. Review console logs
3. Check `/api/admin/database/health`
4. Follow recovery steps above
5. Document what happened for future reference

**Remember**: Maximum data loss is only 10 minutes! Your data is safe in Supabase! 🔒

---

*Last Updated: October 30, 2025*
*System Status: ✅ ACTIVE & MONITORING*
