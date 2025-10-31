# 🚨 DATABASE CRASH DETECTION & RECOVERY GUIDE

## 📊 HOW TO DETECT DATABASE CRASH

### 1️⃣ **Health Check Endpoint (Automated)**

**Endpoint:** `GET /api/health/database`

**Healthy Response (200):**
```json
{
  "status": "healthy",
  "database": "connected",
  "responseTime": "45ms",
  "timestamp": "2025-10-31T10:30:00.000Z",
  "message": "Replit database is operational"
}
```

**Crashed Response (503):**
```json
{
  "status": "unhealthy",
  "database": "disconnected",
  "error": "connection refused",
  "timestamp": "2025-10-31T10:30:00.000Z",
  "message": "🚨 DATABASE CRASH DETECTED! Consider switching to Supabase backup."
}
```

---

### 2️⃣ **Backup Logs Monitoring**

Check workflow logs for consecutive backup failures:

**Normal (Healthy):**
```
[BACKUP SCHEDULER] ✓ Backup completed successfully: { users: 12, ... }
[BACKUP SCHEDULER] ✓ Backup completed successfully: { users: 12, ... }
```

**🚨 CRASH INDICATORS:**
```
[BACKUP SCHEDULER] ✗ Backup failed: Connection refused
[BACKUP SCHEDULER] ✗ Backup failed: ECONNREFUSED
[BACKUP SCHEDULER] ✗ Backup failed: Database timeout
[BACKUP SCHEDULER] ✗ Backup failed: Connection refused  ← 3+ consecutive = CRASH!
```

**Rule:** **3 consecutive backup failures = Database is DOWN** 🔴

---

### 3️⃣ **Application Symptoms**

**User-Facing Issues:**
- ❌ Login fails with "Database error"
- ❌ Pages load but show no data
- ❌ "500 Internal Server Error" on all pages
- ❌ Dashboard shows loading forever
- ❌ "Cannot connect to database" alerts

**Backend Errors:**
```
Error: connect ECONNREFUSED
Error: Connection timeout
Error: database "..." does not exist
```

---

## ⏱️ HOW LONG TO WAIT BEFORE SWITCHING TO SUPABASE?

### **Decision Timeline:**

| Time Elapsed | Action | Reasoning |
|--------------|--------|-----------|
| **0-3 mins** | ⏳ **WAIT** | Could be temporary network issue or Replit restart |
| **3-5 mins** | 🔍 **INVESTIGATE** | Check health endpoint, backup logs, Replit status |
| **5-10 mins** | ⚠️ **PREPARE** | Get Supabase credentials ready, notify users |
| **10+ mins** | 🚨 **SWITCH NOW** | Database is down, switch to Supabase immediately |

### **Quick Decision Rule:**

```
IF health check fails for 3 consecutive attempts (3 minutes)
   AND backup logs show 3+ failures
   AND users cannot access app
THEN → SWITCH TO SUPABASE
```

**⚠️ DO NOT WAIT MORE THAN 10 MINUTES** if all indicators show crash!

---

## 🔄 HOW TO SWITCH TO SUPABASE (DISASTER RECOVERY)

### **Step 1: Verify Supabase Has Latest Data**

1. Login to Supabase dashboard
2. Check each table has recent data (within 1 minute)
3. Verify record counts match expected values

**Quick Check:**
```sql
-- Run in Supabase SQL editor
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM hercm_weeks;
SELECT MAX(created_at) FROM hercm_weeks; -- Should be very recent
```

---

### **Step 2: Update DATABASE_URL Environment Variable**

**In Replit Secrets:**

**OLD VALUE (Replit DB):**
```
DATABASE_URL=postgresql://user:pass@replit-db-host:5432/database
```

**NEW VALUE (Supabase):**
```
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@[PROJECT-REF].supabase.co:5432/postgres
```

**How to find Supabase connection string:**
1. Go to Supabase Dashboard → Project Settings → Database
2. Copy "Connection string" (URI format)
3. Replace `[YOUR-PASSWORD]` with your actual database password

---

### **Step 3: Restart Application**

```bash
# Click "Stop" then "Run" in Replit
# OR use shell:
killall node
npm run dev
```

---

### **Step 4: Verify Application is Working**

1. ✅ Login works
2. ✅ Dashboard shows user data
3. ✅ Health check returns healthy: `GET /api/health/database`
4. ✅ Users can create new HRCM entries
5. ✅ Backup logs show successful backups

---

## 🛡️ PREVENTION & MONITORING

### **Setup Automated Monitoring (Optional)**

**Option 1: Use a free uptime monitoring service**
- UptimeRobot (https://uptimerobot.com)
- Pingdom
- StatusCake

Monitor: `https://your-app.replit.app/api/health/database`

**Alert on:** 3 consecutive failures (3 minutes down)

---

**Option 2: Internal Health Check Script**

Create a simple monitoring script (if you want):

```javascript
// healthMonitor.js
setInterval(async () => {
  try {
    const response = await fetch('http://localhost:5000/api/health/database');
    const data = await response.json();
    
    if (data.status !== 'healthy') {
      console.error('🚨 DATABASE UNHEALTHY!', data);
      // Send alert (email, Slack, etc.)
    }
  } catch (error) {
    console.error('🚨 HEALTH CHECK FAILED!', error);
  }
}, 60000); // Check every minute
```

---

## 📞 EMERGENCY CONTACT PLAN

### **When Database Crashes:**

1. **Notify Users** (if you have notification system)
   - "We're experiencing technical difficulties"
   - "Service will be restored shortly"

2. **Switch to Supabase** (follow steps above)

3. **Monitor Recovery:**
   - Check health endpoint every minute
   - Watch backup logs
   - Verify user functionality

4. **Document Incident:**
   - What time did it crash?
   - How long was downtime?
   - What caused it? (if known)
   - How much data was lost? (Max 1 minute)

---

## 🔍 POST-RECOVERY CHECKLIST

After switching to Supabase:

- [ ] Health check returns healthy
- [ ] Users can login
- [ ] Data is visible on dashboard
- [ ] New data can be created
- [ ] Backup system is running (now backing up Supabase → Supabase, redundant but safe)
- [ ] Admin panel accessible
- [ ] All 3000 users can access their data

---

## 💡 KEY TAKEAWAYS

✅ **Your data is safe** - Supabase has backup within 1 minute
✅ **Maximum data loss** - Only 1 minute of data (last backup to crash time)
✅ **Switch quickly** - Don't wait more than 10 minutes
✅ **Monitor proactively** - Use health check endpoint
✅ **Trust your backup** - That's why we built it! 🎯

---

## 📊 EXPECTED DOWNTIME DURING SWITCH

| Task | Time |
|------|------|
| Detect crash | 1-3 mins |
| Verify Supabase data | 2 mins |
| Update DATABASE_URL | 1 min |
| Restart application | 1-2 mins |
| Verify functionality | 2 mins |
| **TOTAL DOWNTIME** | **7-10 minutes** |

**Your users will experience:** 7-10 minutes of downtime, but **ZERO data loss** (max 1 min)! 🎉

---

## 🆘 TROUBLESHOOTING

### **Problem: Supabase connection fails after switch**

**Check:**
1. Connection string is correct
2. Password is correct (no special characters issue)
3. Supabase project is not paused
4. IP whitelist allows connections (should be "All IPs")

### **Problem: Data is missing in Supabase**

**Check:**
1. Look at table names - are they snake_case? (correct: `hercm_weeks`)
2. Check if backup logs showed success before crash
3. Verify you're looking at correct Supabase project

### **Problem: Application won't start with Supabase**

**Check:**
1. DATABASE_URL format is correct (starts with `postgresql://`)
2. Try `npm run db:push` to sync schema
3. Check Drizzle migration errors in logs

---

## 🎯 FINAL RECOMMENDATION

**For 3000 Users with 1-Minute Backups:**

**Switch to Supabase if:**
- ❌ 3+ consecutive health check failures (3 minutes)
- ❌ Users reporting "database error"
- ❌ Backup logs show 3+ failures

**DO NOT switch if:**
- ✅ Only 1-2 backup failures (could be temporary)
- ✅ Health check still responding
- ✅ Users can still access app

**When in doubt:** Wait 5 minutes, then switch. Better safe than sorry! 🛡️

---

**Your backup system is rock-solid. Trust it!** 💪✨
