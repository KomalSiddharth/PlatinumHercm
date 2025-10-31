-- ============================================
-- SUPABASE BACKUP - 8 NEW TABLES
-- Run this SQL in Supabase SQL Editor
-- ============================================

-- 1. APPROVED EMAILS
DROP TABLE IF EXISTS approved_emails CASCADE;

CREATE TABLE approved_emails (
  id VARCHAR PRIMARY KEY,
  name VARCHAR,
  email VARCHAR UNIQUE NOT NULL,
  status VARCHAR DEFAULT 'active' NOT NULL,
  access_count INTEGER DEFAULT 0 NOT NULL,
  zoom_link VARCHAR,
  last_access_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_approved_emails_email ON approved_emails(email);

-- 2. PLATINUM PROGRESS
DROP TABLE IF EXISTS platinum_progress CASCADE;

CREATE TABLE platinum_progress (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL,
  badges JSONB DEFAULT '[]',
  platinum_achieved BOOLEAN DEFAULT false NOT NULL,
  platinum_achieved_at TIMESTAMP,
  last_reset_date TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platinum_progress_user ON platinum_progress(user_id);

-- 3. ACCESS LOGS
DROP TABLE IF EXISTS access_logs CASCADE;

CREATE TABLE access_logs (
  id VARCHAR PRIMARY KEY,
  email VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  ip_address VARCHAR,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_access_logs_email ON access_logs(email);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

-- 4. RITUALS
DROP TABLE IF EXISTS rituals CASCADE;

CREATE TABLE rituals (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
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

CREATE INDEX idx_rituals_user ON rituals(user_id);
CREATE INDEX idx_rituals_category ON rituals(category);

-- 5. COURSES
DROP TABLE IF EXISTS courses CASCADE;

CREATE TABLE courses (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
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

CREATE INDEX idx_courses_user ON courses(user_id);
CREATE INDEX idx_courses_week ON courses(week_number);

-- 6. RATING PROGRESSION
DROP TABLE IF EXISTS rating_progression CASCADE;

CREATE TABLE rating_progression (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL UNIQUE,
  health_max_rating INTEGER DEFAULT 7 NOT NULL,
  relationship_max_rating INTEGER DEFAULT 7 NOT NULL,
  career_max_rating INTEGER DEFAULT 7 NOT NULL,
  money_max_rating INTEGER DEFAULT 7 NOT NULL,
  health_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  relationship_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  career_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  money_weeks_at_max INTEGER DEFAULT 0 NOT NULL,
  health_last_rating INTEGER DEFAULT 0 NOT NULL,
  relationship_last_rating INTEGER DEFAULT 0 NOT NULL,
  career_last_rating INTEGER DEFAULT 0 NOT NULL,
  money_last_rating INTEGER DEFAULT 0 NOT NULL,
  health_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  relationship_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  career_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  money_last_counted_week INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_rating_progression_user ON rating_progression(user_id);

-- 7. COURSE VIDEOS
DROP TABLE IF EXISTS course_videos CASCADE;

CREATE TABLE course_videos (
  id VARCHAR PRIMARY KEY,
  course_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  video_url VARCHAR NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_course_videos_course ON course_videos(course_id);

-- 8. ADMIN COURSE RECOMMENDATIONS
DROP TABLE IF EXISTS admin_course_recommendations CASCADE;

CREATE TABLE admin_course_recommendations (
  id VARCHAR PRIMARY KEY,
  user_id VARCHAR NOT NULL,
  admin_id VARCHAR NOT NULL,
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

CREATE INDEX idx_admin_course_rec_user ON admin_course_recommendations(user_id);
CREATE INDEX idx_admin_course_rec_admin ON admin_course_recommendations(admin_id);

-- ============================================
-- SUCCESS! All 8 tables created
-- ============================================
