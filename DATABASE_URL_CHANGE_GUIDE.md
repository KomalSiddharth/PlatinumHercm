# 🔧 DATABASE_URL Change Guide - Step by Step

**Complete guide for switching between Replit and Supabase databases**

---

## 🚨 **SCENARIO 1: Replit Database Crashed - Switch to Supabase**

### **Step 1: Confirm Database Failure**

Aapko yeh console message dikhega:
```
🚨 PRIMARY DATABASE FAILURE DETECTED!
🔄 Automatic failover to Supabase backup triggered...

⚠️  MANUAL ACTION REQUIRED:
   1. Check Replit database status
   2. Change DATABASE_URL to Supabase URL
   3. Restart application
```

### **Step 2: Replit Secrets Mein Jao**

1. **Replit Dashboard** open karo
2. Left sidebar mein **"Tools"** click karo
3. **"Secrets"** option select karo
4. Ya direct URL: `https://replit.com/@YOUR_USERNAME/YOUR_PROJECT_NAME#secrets`

### **Step 3: DATABASE_URL Ko Change Karo**

**Current Value (Replit):**
```
DATABASE_URL=postgresql://user:password@db.replit.com:5432/yourdb
```

**New Value (Supabase Backup):**
```
DATABASE_URL=postgresql://postgres.vdtoxkwwengntgbsjcro:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Exact Steps:**
1. ✏️ **Edit** button click karo `DATABASE_URL` ke samne
2. 🗑️ **Delete** karo purana Replit URL
3. 📋 **Copy-paste** karo Supabase URL (neeche diya hai)
4. 💾 **Save** karo

**⚠️ IMPORTANT:** Password `[YOUR-PASSWORD]` ko actual Supabase password se replace karo!

### **Step 4: Find Supabase Password**

**Option A - Replit Secrets Mein:**
```
SUPABASE_URL already hai Secrets mein
```

**Option B - Supabase Dashboard:**
1. Supabase Dashboard open karo: https://supabase.com/dashboard
2. **Project Settings** → **Database** → **Connection String**
3. Password copy karo

**Full Connection String (with password):**
```
postgresql://postgres.vdtoxkwwengntgbsjcro:eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZkdG94a3d3ZW5nbnRnYnNqY3JvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzA4NzE0MjEsImV4cCI6MjA0NjQ0NzQyMX0.ACTUAL_PASSWORD_HERE@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### **Step 5: Restart Application**

**Automatic Restart:**
- Replit automatically restart karega jab aap Secret change karoge
- Wait 10-20 seconds

**Manual Restart (if needed):**
1. Top-right corner mein **"Stop"** button click karo
2. Phir **"Run"** button click karo
3. Ya keyboard shortcut: `Ctrl + Enter`

### **Step 6: Verify App Is Working**

1. **Open Dashboard**: https://your-app.replit.app
2. **Login** karo
3. **Check Data**: HRCM data dikhai dena chahiye
4. **Console Check**: Logs mein error nahi hona chahiye

**Success Message:**
```
✅ App is now using Supabase backup database!
⏱️ Downtime: 5-10 minutes
📉 Data loss: Maximum 1 minute
```

---

## ✅ **SCENARIO 2: Replit Database Recovered - Switch Back**

### **Step 1: Verify Replit Database Is Healthy**

**Health Check API:**
```bash
GET /api/admin/database/health

Response should show:
{
  "primary": {
    "isHealthy": true,
    "consecutiveFailures": 0
  }
}
```

### **Step 2: Replit Secrets Mein Jao (Same Process)**

1. **Replit Dashboard** → **Tools** → **Secrets**

### **Step 3: DATABASE_URL Ko WAPAS Change Karo**

**Current Value (Supabase):**
```
DATABASE_URL=postgresql://postgres.vdtoxkwwengntgbsjcro:password@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

**Original Value (Replit) - WAPAS LAGA DO:**
```
DATABASE_URL=postgresql://user:password@db.replit.com:5432/yourdb
```

**⚠️ IMPORTANT:** Original Replit URL kahin save karke rakho backup mein!

### **Step 4: Sync Latest Data (Optional but Recommended)**

Agar Supabase pe naya data aaya tha, toh:

1. **Supabase se data export** karo (latest backup)
2. **Replit mein import** karo
3. **Verify** data consistency

**Or Simple Method:**
- Last backup se pehle ka data Replit mein hai
- Last 1 minute ka data Supabase backup mein hai
- Usually sync nahi chahiye if crash quickly recover hua

### **Step 5: Restart Application**

Same process as Scenario 1:
- Automatic restart hoga
- Ya manually Stop → Run

### **Step 6: Verify Everything**

1. ✅ **Dashboard working** on Replit database
2. ✅ **All data intact**
3. ✅ **Backups resuming** to Supabase
4. ✅ **Health monitoring** showing green

---

## 📋 **Quick Reference - Important URLs**

### **Replit Secrets Page:**
```
https://replit.com/@YOUR_USERNAME/YOUR_PROJECT_NAME#secrets
```

### **Supabase Dashboard:**
```
https://supabase.com/dashboard/project/vdtoxkwwengntgbsjcro
```

### **Health Monitoring Endpoint:**
```
GET https://your-app.replit.app/api/admin/database/health
```

### **Backup Status Endpoint:**
```
GET https://your-app.replit.app/api/admin/backup/status
```

---

## 🔑 **Important Information to Save**

**Keep These Safe (Private Document):**

### **Replit Database URL:**
```
DATABASE_URL=<YOUR_REPLIT_POSTGRES_URL>
```

### **Supabase Database URL:**
```
DATABASE_URL=postgresql://postgres.vdtoxkwwengntgbsjcro:[PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```

### **Supabase Credentials:**
```
Host: aws-0-ap-south-1.pooler.supabase.com
Port: 6543
Database: postgres
User: postgres.vdtoxkwwengntgbsjcro
Password: [FROM SUPABASE DASHBOARD]
```

---

## ⚠️ **Common Mistakes to Avoid**

❌ **Wrong:**
- Password include karna bhool gaye
- Typo in connection string
- Wrong port number
- Missing `postgresql://` prefix

✅ **Correct:**
- Complete connection string with password
- Double-check spelling
- Use port 6543 for Supabase
- Start with `postgresql://`

---

## 💡 **Pro Tips**

1. **Save Both URLs:**
   - Keep Replit URL in a safe text file
   - Keep Supabase URL in same file
   - Easy to switch back and forth

2. **Test Before Crisis:**
   - Practice switching once
   - Make sure you know the process
   - Verify app works after switch

3. **Monitor Regularly:**
   - Check health endpoint daily
   - Review backup logs weekly
   - Stay prepared

4. **Document Changes:**
   - Note down when you switched
   - Why you switched
   - How long downtime was

---

## 🎯 **Summary - Kahan Kya Change Karna Hai**

### **DATABASE_URL Change Kahan Hota Hai:**
✅ **Replit Secrets** (Tools → Secrets)

### **Kab Change Karni Hai:**
✅ **Crash time**: Replit → Supabase  
✅ **Recovery time**: Supabase → Replit

### **Kitni Baar Change Karni Hai:**
✅ **2 times total**:
   1. Switch to Supabase (crash)
   2. Switch back to Replit (recovery)

### **Total Time Lagta Hai:**
✅ **5-10 minutes** for complete switch

---

*Last Updated: October 30, 2025*
*Maximum Data Loss: Only 1 MINUTE!*
