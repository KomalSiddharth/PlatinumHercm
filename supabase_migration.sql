-- Supabase Database Migration Script for Platinum HRCM Dashboard
-- Run this script in Supabase SQL Editor to create all required tables
-- Generated: October 30, 2025

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  course_sheet_url VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Approved Emails Table
CREATE TABLE IF NOT EXISTS approved_emails (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name VARCHAR,
  email VARCHAR UNIQUE NOT NULL,
  status VARCHAR DEFAULT 'active' NOT NULL,
  access_count INTEGER DEFAULT 0 NOT NULL,
  zoom_link VARCHAR,
  last_access_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 3. HRCM Weeks Table (CRITICAL - All dashboard data)
CREATE TABLE IF NOT EXISTS hercm_weeks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  week_number INTEGER NOT NULL,
  year INTEGER NOT NULL,
  
  -- Current Week Ratings
  current_h INTEGER,
  current_e INTEGER,
  current_r INTEGER,
  current_c INTEGER,
  current_m INTEGER,
  
  -- Target Ratings
  target_h INTEGER,
  target_e INTEGER,
  target_r INTEGER,
  target_c INTEGER,
  target_m INTEGER,
  
  -- Next Week Goals
  next_week_h INTEGER,
  next_week_e INTEGER,
  next_week_r INTEGER,
  next_week_c INTEGER,
  next_week_m INTEGER,
  
  -- Improvement Calculations
  improvement_h INTEGER,
  improvement_e INTEGER,
  improvement_r INTEGER,
  improvement_c INTEGER,
  improvement_m INTEGER,
  
  -- Overall Metrics
  overall_score INTEGER,
  achievement_rate INTEGER,
  week_status VARCHAR DEFAULT 'active' NOT NULL,
  
  -- Emotion Scores
  health_emotion_score INTEGER,
  relationship_emotion_score INTEGER,
  career_emotion_score INTEGER,
  money_emotion_score INTEGER,
  
  -- Health Fields
  health_problems VARCHAR,
  health_current_feelings VARCHAR,
  health_current_belief VARCHAR,
  health_current_actions VARCHAR,
  health_result VARCHAR,
  health_next_feelings VARCHAR,
  health_next_target VARCHAR,
  health_next_actions VARCHAR,
  health_assignment JSONB,
  health_checklist JSONB,
  health_result_checklist JSONB,
  health_feelings_checklist JSONB,
  health_beliefs_checklist JSONB,
  health_actions_checklist JSONB,
  
  -- Relationship Fields
  relationship_problems VARCHAR,
  relationship_current_feelings VARCHAR,
  relationship_current_belief VARCHAR,
  relationship_current_actions VARCHAR,
  relationship_result VARCHAR,
  relationship_next_feelings VARCHAR,
  relationship_next_target VARCHAR,
  relationship_next_actions VARCHAR,
  relationship_assignment JSONB,
  relationship_checklist JSONB,
  relationship_result_checklist JSONB,
  relationship_feelings_checklist JSONB,
  relationship_beliefs_checklist JSONB,
  relationship_actions_checklist JSONB,
  
  -- Career Fields
  career_problems VARCHAR,
  career_current_feelings VARCHAR,
  career_current_belief VARCHAR,
  career_current_actions VARCHAR,
  career_result VARCHAR,
  career_next_feelings VARCHAR,
  career_next_target VARCHAR,
  career_next_actions VARCHAR,
  career_assignment JSONB,
  career_checklist JSONB,
  career_result_checklist JSONB,
  career_feelings_checklist JSONB,
  career_beliefs_checklist JSONB,
  career_actions_checklist JSONB,
  
  -- Money Fields
  money_problems VARCHAR,
  money_current_feelings VARCHAR,
  money_current_belief VARCHAR,
  money_current_actions VARCHAR,
  money_result VARCHAR,
  money_next_feelings VARCHAR,
  money_next_target VARCHAR,
  money_next_actions VARCHAR,
  money_assignment JSONB,
  money_checklist JSONB,
  money_result_checklist JSONB,
  money_feelings_checklist JSONB,
  money_beliefs_checklist JSONB,
  money_actions_checklist JSONB,
  
  -- Unified Assignment
  unified_assignment JSONB,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 4. Platinum Progress Table
CREATE TABLE IF NOT EXISTS platinum_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL,
  badges JSONB DEFAULT '[]'::jsonb,
  platinum_achieved BOOLEAN DEFAULT false NOT NULL,
  platinum_achieved_at TIMESTAMP,
  last_reset_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Rituals Table
CREATE TABLE IF NOT EXISTS rituals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title VARCHAR NOT NULL,
  description VARCHAR,
  category VARCHAR NOT NULL,
  frequency VARCHAR DEFAULT 'daily' NOT NULL,
  points INTEGER DEFAULT 50 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 6. Ritual Completions Table
CREATE TABLE IF NOT EXISTS ritual_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ritual_id VARCHAR NOT NULL REFERENCES rituals(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  completed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  date VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 7. Courses Table
CREATE TABLE IF NOT EXISTS courses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  week_number INTEGER NOT NULL,
  category VARCHAR NOT NULL,
  course_name VARCHAR NOT NULL,
  course_link VARCHAR,
  match_score INTEGER,
  match_reasons JSONB,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 8. Rating Progression Table
CREATE TABLE IF NOT EXISTS rating_progression (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
  
  -- Maximum allowed ratings
  health_max_rating INTEGER DEFAULT 7 NOT NULL,
  relationship_max_rating INTEGER DEFAULT 7 NOT NULL,
  career_max_rating INTEGER DEFAULT 7 NOT NULL,
  money_max_rating INTEGER DEFAULT 7 NOT NULL,
  
  -- Weeks at max
  health_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  relationship_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  career_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  money_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  
  -- Last ratings
  health_last_rating INTEGER DEFAULT 0 NOT NULL,
  relationship_last_rating INTEGER DEFAULT 0 NOT NULL,
  career_last_rating INTEGER DEFAULT 0 NOT NULL,
  money_last_rating INTEGER DEFAULT 0 NOT NULL,
  
  -- Last counted weeks
  health_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  relationship_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  career_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  money_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 9. Course Videos Table
CREATE TABLE IF NOT EXISTS course_videos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  course_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  video_url VARCHAR NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 10. Course Video Completions Table
CREATE TABLE IF NOT EXISTS course_video_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  video_id VARCHAR NOT NULL,
  completed_at TIMESTAMP DEFAULT NOW()
);

-- 11. Admin Course Recommendations Table
CREATE TABLE IF NOT EXISTS admin_course_recommendations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  admin_id VARCHAR NOT NULL REFERENCES users(id),
  hrcm_area VARCHAR NOT NULL,
  course_id VARCHAR NOT NULL,
  course_name VARCHAR NOT NULL,
  lesson_id VARCHAR,
  lesson_name VARCHAR,
  lesson_url VARCHAR,
  reason VARCHAR,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 12. Platinum Standards Table
CREATE TABLE IF NOT EXISTS platinum_standards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  category VARCHAR NOT NULL,
  standard_text VARCHAR(500) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 13. Emotional Trackers Table
CREATE TABLE IF NOT EXISTS emotional_trackers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  date VARCHAR NOT NULL,
  time_slot VARCHAR NOT NULL,
  positive_emotions VARCHAR(500),
  negative_emotions VARCHAR(500),
  repeating_emotions VARCHAR(500),
  missing_emotions VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 14. User Persistent Assignments Table
CREATE TABLE IF NOT EXISTS user_persistent_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  hrcm_area VARCHAR NOT NULL,
  course_id VARCHAR NOT NULL,
  course_name VARCHAR(500) NOT NULL,
  lesson_id VARCHAR,
  lesson_name VARCHAR(500),
  url VARCHAR(1000),
  source VARCHAR NOT NULL,
  recommendation_id VARCHAR,
  completed BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 15. Access Logs Table
CREATE TABLE IF NOT EXISTS access_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::text,
  email VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  ip_address VARCHAR,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 16. Sessions Table (for Replit Auth)
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- Create index on session expiration for cleanup
CREATE INDEX IF NOT EXISTS idx_session_expire ON sessions(expire);

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ All tables created successfully in Supabase!';
  RAISE NOTICE '📊 Total tables: 16';
  RAISE NOTICE '🔒 Ready for backup sync from Replit PostgreSQL';
END $$;
