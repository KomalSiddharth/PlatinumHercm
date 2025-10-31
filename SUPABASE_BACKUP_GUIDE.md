# Supabase Backup System - Complete Guide

## Overview
The HRCM Dashboard now includes automated external database backup to Supabase, ensuring your 30K users' data is safely preserved with historical redundancy.

## Features
- ✅ **Automated Daily Backups** - Runs at 2:00 AM IST every day
- ✅ **Manual Backup Controls** - Admin can trigger backups anytime
- ✅ **Full Data Coverage** - Backs up all user dashboards, HRCM data, emotional trackers, courses, and more
- ✅ **Real-Time Statistics** - View backup status and data counts
- ✅ **Individual User Backup** - Backup specific users on demand

## Setup Instructions

### Step 1: Create Supabase Project
1. Go to [https://supabase.com](https://supabase.com)
2. Click "Start your project" and sign up/login
3. Create a new project:
   - Enter project name (e.g., "HRCM Backup")
   - Set a strong database password
   - Select region (choose closest to India for best performance)
   - Click "Create new project"

### Step 2: Get Your Credentials
1. Once project is created, go to **Settings** (gear icon)
2. Click **API** section
3. Copy these values:
   - **Project URL** (looks like: `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### Step 3: Add Credentials to Replit
1. The system has already asked you for these credentials
2. They are now stored securely as environment variables:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`

### Step 4: Create Database Tables in Supabase
You need to create the following tables in your Supabase project to match your Replit database structure:

**Option A: Using Supabase SQL Editor (Recommended)**
1. In Supabase dashboard, go to **SQL Editor**
2. Create each table using the SQL commands below

**Option B: Using Supabase Table Editor**
1. Go to **Table Editor** → **New Table**
2. Manually create each table with the specified columns

### Required Tables

#### 1. users
```sql
CREATE TABLE users (
  id VARCHAR PRIMARY KEY,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  course_sheet_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 2. hercm_weeks
```sql
CREATE TABLE hercm_weeks (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  current_h INTEGER,
  current_e INTEGER,
  current_r INTEGER,
  current_c INTEGER,
  current_m INTEGER,
  target_h INTEGER,
  target_e INTEGER,
  target_r INTEGER,
  target_c INTEGER,
  target_m INTEGER,
  next_week_h INTEGER,
  next_week_e INTEGER,
  next_week_r INTEGER,
  next_week_c INTEGER,
  next_week_m INTEGER,
  improvement_h INTEGER,
  improvement_e INTEGER,
  improvement_r INTEGER,
  improvement_c INTEGER,
  improvement_m INTEGER,
  overall_score INTEGER,
  achievement_rate INTEGER,
  week_status VARCHAR DEFAULT 'active' NOT NULL,
  health_emotion_score INTEGER,
  relationship_emotion_score INTEGER,
  career_emotion_score INTEGER,
  money_emotion_score INTEGER,
  health_problems TEXT,
  health_current_feelings TEXT,
  health_current_belief TEXT,
  health_current_actions TEXT,
  health_result TEXT,
  health_next_feelings TEXT,
  health_next_target TEXT,
  health_next_actions TEXT,
  health_assignment JSONB,
  health_checklist JSONB,
  health_result_checklist JSONB,
  health_feelings_checklist JSONB,
  health_beliefs_checklist JSONB,
  health_actions_checklist JSONB,
  relationship_problems TEXT,
  relationship_current_feelings TEXT,
  relationship_current_belief TEXT,
  relationship_current_actions TEXT,
  relationship_result TEXT,
  relationship_next_feelings TEXT,
  relationship_next_target TEXT,
  relationship_next_actions TEXT,
  relationship_assignment JSONB,
  relationship_checklist JSONB,
  relationship_result_checklist JSONB,
  relationship_feelings_checklist JSONB,
  relationship_beliefs_checklist JSONB,
  relationship_actions_checklist JSONB,
  career_problems TEXT,
  career_current_feelings TEXT,
  career_current_belief TEXT,
  career_current_actions TEXT,
  career_result TEXT,
  career_next_feelings TEXT,
  career_next_target TEXT,
  career_next_actions TEXT,
  career_assignment JSONB,
  career_checklist JSONB,
  career_result_checklist JSONB,
  career_feelings_checklist JSONB,
  career_beliefs_checklist JSONB,
  career_actions_checklist JSONB,
  money_problems TEXT,
  money_current_feelings TEXT,
  money_current_belief TEXT,
  money_current_actions TEXT,
  money_result TEXT,
  money_next_feelings TEXT,
  money_next_target TEXT,
  money_next_actions TEXT,
  money_assignment JSONB,
  money_checklist JSONB,
  money_result_checklist JSONB,
  money_feelings_checklist JSONB,
  money_beliefs_checklist JSONB,
  money_actions_checklist JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 3. emotional_trackers
```sql
CREATE TABLE emotional_trackers (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  date VARCHAR NOT NULL,
  slot_4am TEXT,
  slot_8am TEXT,
  slot_12pm TEXT,
  slot_4pm TEXT,
  slot_8pm TEXT,
  slot_12am TEXT,
  slot_morning TEXT,
  slot_afternoon TEXT,
  slot_evening TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, date)
);
```

#### 4. ritual_completions
```sql
CREATE TABLE ritual_completions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  ritual_id VARCHAR NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### 5. course_video_completions
```sql
CREATE TABLE course_video_completions (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  course_id VARCHAR NOT NULL,
  video_id VARCHAR NOT NULL,
  completed_at TIMESTAMP NOT NULL
);
```

#### 6. user_persistent_assignments
```sql
CREATE TABLE user_persistent_assignments (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  hrcm_area VARCHAR,
  course_id VARCHAR,
  course_name VARCHAR,
  lesson_id VARCHAR NOT NULL,
  lesson_name VARCHAR NOT NULL,
  url VARCHAR NOT NULL,
  source VARCHAR DEFAULT 'user' NOT NULL,
  completed BOOLEAN DEFAULT false NOT NULL,
  recommendation_id VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### 7. platinum_standards
```sql
CREATE TABLE platinum_standards (
  id VARCHAR PRIMARY KEY,
  hrcm_area VARCHAR NOT NULL,
  standard_text VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Using the Backup System

### Admin API Endpoints

#### 1. Check Backup Status
```
GET /api/backup/status
```
Returns whether Supabase is configured and ready.

#### 2. Get Backup Statistics
```
GET /api/backup/stats
```
Returns record counts from Supabase for all tables.

#### 3. Manual Full Backup
```
POST /api/backup/full
```
Backs up ALL data from ALL users immediately.

**Example Response:**
```json
{
  "success": true,
  "message": "Full backup completed successfully",
  "stats": {
    "users": 30000,
    "hercmWeeks": 150000,
    "ritualCompletions": 500000,
    "emotionalTrackers": 200000,
    "courseVideoCompletions": 1000000,
    "assignments": 100000,
    "platinumStandards": 50
  }
}
```

#### 4. Backup Specific User
```
POST /api/backup/user/:userId
```
Backs up data for a specific user only.

### Automated Backups

The system automatically backs up ALL data every day at **2:00 AM IST** (Indian Standard Time).

You'll see this in the logs:
```
[BACKUP SCHEDULER] ✓ Daily backup scheduled at 2:00 AM IST
[BACKUP SCHEDULER] Starting scheduled backup at 2:00 AM IST...
[BACKUP SCHEDULER] ✓ Backup completed successfully: { users: 30000, ... }
```

### Testing Your Setup

1. **Test Connection:**
   - Login as admin
   - Call `GET /api/backup/status`
   - Should return `configured: true`

2. **Test Manual Backup:**
   - Call `POST /api/backup/full`
   - Wait for completion (may take a few minutes for 30K users)
   - Check Supabase dashboard to see data

3. **Verify Data:**
   - Go to Supabase → Table Editor
   - Check each table has records
   - Compare counts with your Replit database

## Important Notes

1. **First Backup**: The first full backup may take 5-10 minutes depending on data volume
2. **Subsequent Backups**: Use UPSERT so existing records are updated, new ones inserted
3. **Data Integrity**: All user data, HRCM history, emotional trackers, and course progress is preserved
4. **No Duplicates**: The system uses primary key matching to avoid duplicates
5. **Admin Only**: All backup endpoints are protected - only admin users can access them

## Troubleshooting

### "Supabase not configured" message
- Check that SUPABASE_URL starts with `https://`
- Verify SUPABASE_ANON_KEY is set correctly
- Restart the application after adding credentials

### Tables not found error
- Make sure you created all 7 tables in Supabase
- Check table names match exactly (lowercase with underscores)
- Verify column names match the schema

### Backup fails
- Check Supabase project is active (not paused)
- Verify database password is correct
- Check network connectivity
- Look at server logs for detailed error messages

## Benefits

✅ **Historical Preservation** - All user data backed up daily
✅ **Disaster Recovery** - External backup protects against database loss
✅ **Data Redundancy** - Multiple copies ensure data safety
✅ **Easy Restoration** - Data can be restored from Supabase if needed
✅ **Audit Trail** - Track data changes over time
✅ **Scalability** - Supabase handles 30K+ users efficiently

## Next Steps

Once setup is complete:
1. Verify first backup completes successfully
2. Monitor daily automated backups in logs
3. Periodically check Supabase dashboard to confirm data sync
4. Consider setting up Supabase alerts for monitoring
5. Test data restoration process with sample user

## Support

If you need help:
- Check the logs: `[BACKUP]` and `[BACKUP SCHEDULER]` messages
- Verify Supabase project status
- Contact support with specific error messages
