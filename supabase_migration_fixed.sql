-- Supabase Database Migration Script (CORRECTED with camelCase columns)
-- This matches the exact Drizzle schema from Replit PostgreSQL
-- Generated: October 30, 2025

-- STEP 1: Drop existing tables (if any)
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS user_persistent_assignments CASCADE;
DROP TABLE IF EXISTS emotional_trackers CASCADE;
DROP TABLE IF EXISTS platinum_standards CASCADE;
DROP TABLE IF EXISTS admin_course_recommendations CASCADE;
DROP TABLE IF EXISTS course_video_completions CASCADE;
DROP TABLE IF EXISTS course_videos CASCADE;
DROP TABLE IF EXISTS rating_progression CASCADE;
DROP TABLE IF NOT EXISTS courses CASCADE;
DROP TABLE IF EXISTS ritual_completions CASCADE;
DROP TABLE IF EXISTS rituals CASCADE;
DROP TABLE IF EXISTS platinum_progress CASCADE;
DROP TABLE IF EXISTS hercm_weeks CASCADE;
DROP TABLE IF EXISTS approved_emails CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- STEP 2: Create tables with EXACT camelCase column names from Drizzle

-- 1. Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE,
  "firstName" TEXT,
  "lastName" TEXT,
  "profileImageUrl" TEXT,
  "isAdmin" BOOLEAN DEFAULT false NOT NULL,
  "courseSheetUrl" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 2. Approved Emails Table
CREATE TABLE approved_emails (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' NOT NULL,
  "accessCount" INTEGER DEFAULT 0 NOT NULL,
  "zoomLink" TEXT,
  "lastAccessAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 3. HRCM Weeks Table (CRITICAL)
CREATE TABLE hercm_weeks (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "weekNumber" INTEGER NOT NULL,
  year INTEGER NOT NULL,
  "currentH" INTEGER, "currentE" INTEGER, "currentR" INTEGER, "currentC" INTEGER, "currentM" INTEGER,
  "targetH" INTEGER, "targetE" INTEGER, "targetR" INTEGER, "targetC" INTEGER, "targetM" INTEGER,
  "nextWeekH" INTEGER, "nextWeekE" INTEGER, "nextWeekR" INTEGER, "nextWeekC" INTEGER, "nextWeekM" INTEGER,
  "improvementH" INTEGER, "improvementE" INTEGER, "improvementR" INTEGER, "improvementC" INTEGER, "improvementM" INTEGER,
  "overallScore" INTEGER, "achievementRate" INTEGER, "weekStatus" TEXT DEFAULT 'active' NOT NULL,
  "healthEmotionScore" INTEGER, "relationshipEmotionScore" INTEGER, "careerEmotionScore" INTEGER, "moneyEmotionScore" INTEGER,
  "healthProblems" TEXT, "healthCurrentFeelings" TEXT, "healthCurrentBelief" TEXT, "healthCurrentActions" TEXT,
  "healthResult" TEXT, "healthNextFeelings" TEXT, "healthNextTarget" TEXT, "healthNextActions" TEXT,
  "healthAssignment" JSONB, "healthChecklist" JSONB, "healthResultChecklist" JSONB, "healthFeelingsChecklist" JSONB, "healthBeliefsChecklist" JSONB, "healthActionsChecklist" JSONB,
  "relationshipProblems" TEXT, "relationshipCurrentFeelings" TEXT, "relationshipCurrentBelief" TEXT, "relationshipCurrentActions" TEXT,
  "relationshipResult" TEXT, "relationshipNextFeelings" TEXT, "relationshipNextTarget" TEXT, "relationshipNextActions" TEXT,
  "relationshipAssignment" JSONB, "relationshipChecklist" JSONB, "relationshipResultChecklist" JSONB, "relationshipFeelingsChecklist" JSONB, "relationshipBeliefsChecklist" JSONB, "relationshipActionsChecklist" JSONB,
  "careerProblems" TEXT, "careerCurrentFeelings" TEXT, "careerCurrentBelief" TEXT, "careerCurrentActions" TEXT,
  "careerResult" TEXT, "careerNextFeelings" TEXT, "careerNextTarget" TEXT, "careerNextActions" TEXT,
  "careerAssignment" JSONB, "careerChecklist" JSONB, "careerResultChecklist" JSONB, "careerFeelingsChecklist" JSONB, "careerBeliefsChecklist" JSONB, "careerActionsChecklist" JSONB,
  "moneyProblems" TEXT, "moneyCurrentFeelings" TEXT, "moneyCurrentBelief" TEXT, "moneyCurrentActions" TEXT,
  "moneyResult" TEXT, "moneyNextFeelings" TEXT, "moneyNextTarget" TEXT, "moneyNextActions" TEXT,
  "moneyAssignment" JSONB, "moneyChecklist" JSONB, "moneyResultChecklist" JSONB, "moneyFeelingsChecklist" JSONB, "moneyBeliefsChecklist" JSONB, "moneyActionsChecklist" JSONB,
  "unifiedAssignment" JSONB,
  "createdAt" TIMESTAMP DEFAULT NOW(), "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 4. Platinum Progress Table
CREATE TABLE platinum_progress (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES users(id),
  "currentStreak" INTEGER DEFAULT 0 NOT NULL,
  "totalPoints" INTEGER DEFAULT 0 NOT NULL,
  badges JSONB DEFAULT '[]'::jsonb,
  "platinumAchieved" BOOLEAN DEFAULT false NOT NULL,
  "platinumAchievedAt" TIMESTAMP,
  "lastResetDate" TIMESTAMP DEFAULT NOW(),
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 5. Rituals Table
CREATE TABLE rituals (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  frequency TEXT DEFAULT 'daily' NOT NULL,
  points INTEGER DEFAULT 50 NOT NULL,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "isDefault" BOOLEAN DEFAULT false NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 6. Ritual Completions Table
CREATE TABLE ritual_completions (
  id TEXT PRIMARY KEY,
  "ritualId" TEXT NOT NULL REFERENCES rituals(id),
  "userId" TEXT NOT NULL REFERENCES users(id),
  "completedAt" TIMESTAMP DEFAULT NOW() NOT NULL,
  date TEXT NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 7. Courses Table
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "weekNumber" INTEGER NOT NULL,
  category TEXT NOT NULL,
  "courseName" TEXT NOT NULL,
  "courseLink" TEXT,
  "matchScore" INTEGER,
  "matchReasons" JSONB,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 8. Rating Progression Table
CREATE TABLE rating_progression (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL UNIQUE REFERENCES users(id),
  "healthMaxRating" INTEGER DEFAULT 7 NOT NULL,
  "relationshipMaxRating" INTEGER DEFAULT 7 NOT NULL,
  "careerMaxRating" INTEGER DEFAULT 7 NOT NULL,
  "moneyMaxRating" INTEGER DEFAULT 7 NOT NULL,
  "healthWeeksAtMax" INTEGER DEFAULT 0 NOT NULL,
  "relationshipWeeksAtMax" INTEGER DEFAULT 0 NOT NULL,
  "careerWeeksAtMax" INTEGER DEFAULT 0 NOT NULL,
  "moneyWeeksAtMax" INTEGER DEFAULT 0 NOT NULL,
  "healthLastRating" INTEGER DEFAULT 0 NOT NULL,
  "relationshipLastRating" INTEGER DEFAULT 0 NOT NULL,
  "careerLastRating" INTEGER DEFAULT 0 NOT NULL,
  "moneyLastRating" INTEGER DEFAULT 0 NOT NULL,
  "healthLastCountedWeek" INTEGER DEFAULT 0 NOT NULL,
  "relationshipLastCountedWeek" INTEGER DEFAULT 0 NOT NULL,
  "careerLastCountedWeek" INTEGER DEFAULT 0 NOT NULL,
  "moneyLastCountedWeek" INTEGER DEFAULT 0 NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 9. Course Videos Table
CREATE TABLE course_videos (
  id TEXT PRIMARY KEY,
  "courseId" TEXT NOT NULL,
  title TEXT NOT NULL,
  "videoUrl" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 10. Course Video Completions Table
CREATE TABLE course_video_completions (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "videoId" TEXT NOT NULL,
  "completedAt" TIMESTAMP DEFAULT NOW()
);

-- 11. Admin Course Recommendations Table
CREATE TABLE admin_course_recommendations (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "adminId" TEXT NOT NULL REFERENCES users(id),
  "hrcmArea" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseName" TEXT NOT NULL,
  "lessonId" TEXT,
  "lessonName" TEXT,
  "lessonUrl" TEXT,
  reason TEXT,
  status TEXT DEFAULT 'pending' NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 12. Platinum Standards Table
CREATE TABLE platinum_standards (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  "standardText" TEXT NOT NULL,
  "orderIndex" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 13. Emotional Trackers Table
CREATE TABLE emotional_trackers (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id),
  date TEXT NOT NULL,
  "timeSlot" TEXT NOT NULL,
  "positiveEmotions" TEXT,
  "negativeEmotions" TEXT,
  "repeatingEmotions" TEXT,
  "missingEmotions" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 14. User Persistent Assignments Table
CREATE TABLE user_persistent_assignments (
  id TEXT PRIMARY KEY,
  "userId" TEXT NOT NULL REFERENCES users(id),
  "hrcmArea" TEXT NOT NULL,
  "courseId" TEXT NOT NULL,
  "courseName" TEXT NOT NULL,
  "lessonId" TEXT,
  "lessonName" TEXT,
  url TEXT,
  source TEXT NOT NULL,
  "recommendationId" TEXT,
  completed BOOLEAN DEFAULT false NOT NULL,
  "createdAt" TIMESTAMP DEFAULT NOW(),
  "updatedAt" TIMESTAMP DEFAULT NOW()
);

-- 15. Access Logs Table
CREATE TABLE access_logs (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  status TEXT NOT NULL,
  "ipAddress" TEXT,
  "userAgent" TEXT,
  "createdAt" TIMESTAMP DEFAULT NOW()
);

-- 16. Sessions Table
CREATE TABLE sessions (
  sid TEXT PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

CREATE INDEX idx_session_expire ON sessions(expire);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All tables created successfully with camelCase columns!';
  RAISE NOTICE '📊 Total tables: 16';
  RAISE NOTICE '🔒 Ready for backup sync from Replit PostgreSQL';
  RAISE NOTICE '✨ Column naming matches Drizzle schema perfectly!';
END $$;
