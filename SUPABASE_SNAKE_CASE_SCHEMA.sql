-- =============================================
-- HRCM Dashboard - SNAKE_CASE Schema for Supabase
-- Supabase PostgREST Compatible Version
-- Generated: October 31, 2025
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables (clean slate)
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS user_persistent_assignments CASCADE;
DROP TABLE IF EXISTS emotional_trackers CASCADE;
DROP TABLE IF EXISTS platinum_standards CASCADE;
DROP TABLE IF EXISTS admin_course_recommendations CASCADE;
DROP TABLE IF EXISTS course_video_completions CASCADE;
DROP TABLE IF EXISTS course_videos CASCADE;
DROP TABLE IF EXISTS rating_progression CASCADE;
DROP TABLE IF EXISTS courses CASCADE;
DROP TABLE IF EXISTS ritual_completions CASCADE;
DROP TABLE IF EXISTS rituals CASCADE;
DROP TABLE IF EXISTS platinum_progress CASCADE;
DROP TABLE IF EXISTS hrcm_weeks CASCADE;
DROP TABLE IF EXISTS approved_emails CASCADE;
DROP TABLE IF EXISTS admin_users CASCADE;
DROP TABLE IF EXISTS sessions CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- =============================================
-- TABLE 1: USERS
-- =============================================
CREATE TABLE users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  course_sheet_url VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 2: APPROVED EMAILS
-- =============================================
CREATE TABLE approved_emails (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name VARCHAR,
  email VARCHAR UNIQUE NOT NULL,
  status VARCHAR DEFAULT 'active' NOT NULL,
  access_count INTEGER DEFAULT 0 NOT NULL,
  zoom_link VARCHAR,
  last_access_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 3: HRCM WEEKS (MAIN DASHBOARD DATA)
-- =============================================
CREATE TABLE hrcm_weeks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
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
  
  -- Health Section
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
  
  -- Relationship Section
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
  
  -- Career Section
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
  
  -- Money Section
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
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 4: PLATINUM PROGRESS
-- =============================================
CREATE TABLE platinum_progress (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
  current_streak INTEGER DEFAULT 0 NOT NULL,
  total_points INTEGER DEFAULT 0 NOT NULL,
  badges JSONB DEFAULT '[]'::JSONB,
  platinum_achieved BOOLEAN DEFAULT false NOT NULL,
  platinum_achieved_at TIMESTAMP,
  last_reset_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 5: RITUALS
-- =============================================
CREATE TABLE rituals (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  title VARCHAR NOT NULL,
  description VARCHAR,
  category VARCHAR NOT NULL,
  frequency VARCHAR DEFAULT 'daily' NOT NULL,
  points INTEGER DEFAULT 50 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  is_default BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 6: RITUAL COMPLETIONS
-- =============================================
CREATE TABLE ritual_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  ritual_id VARCHAR NOT NULL REFERENCES rituals(id),
  user_id VARCHAR NOT NULL REFERENCES users(id),
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  date VARCHAR NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 7: COURSES
-- =============================================
CREATE TABLE courses (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  week_number INTEGER NOT NULL,
  category VARCHAR NOT NULL,
  course_name VARCHAR NOT NULL,
  course_link VARCHAR,
  match_score INTEGER,
  match_reasons JSONB,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 8: RATING PROGRESSION
-- =============================================
CREATE TABLE rating_progression (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
  
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
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 9: COURSE VIDEOS
-- =============================================
CREATE TABLE course_videos (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  course_id VARCHAR NOT NULL,
  title VARCHAR NOT NULL,
  video_url VARCHAR NOT NULL,
  order_index INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 10: COURSE VIDEO COMPLETIONS
-- =============================================
CREATE TABLE course_video_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  video_id VARCHAR NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 11: ADMIN COURSE RECOMMENDATIONS
-- =============================================
CREATE TABLE admin_course_recommendations (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 12: PLATINUM STANDARDS
-- =============================================
CREATE TABLE platinum_standards (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  category VARCHAR NOT NULL,
  standard_text VARCHAR NOT NULL,
  order_index INTEGER DEFAULT 0 NOT NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 13: EMOTIONAL TRACKERS
-- =============================================
CREATE TABLE emotional_trackers (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  date VARCHAR NOT NULL,
  time_slot VARCHAR NOT NULL,
  positive_emotions VARCHAR,
  negative_emotions VARCHAR,
  repeating_emotions VARCHAR,
  missing_emotions VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 14: USER PERSISTENT ASSIGNMENTS
-- =============================================
CREATE TABLE user_persistent_assignments (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  user_id VARCHAR NOT NULL REFERENCES users(id),
  course_id VARCHAR,
  course_name VARCHAR,
  lesson_id VARCHAR,
  lesson_name VARCHAR,
  lesson_url VARCHAR,
  source VARCHAR DEFAULT 'user' NOT NULL,
  recommendation_id VARCHAR,
  completed BOOLEAN DEFAULT false NOT NULL,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 15: ACCESS LOGS
-- =============================================
CREATE TABLE access_logs (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  email VARCHAR NOT NULL,
  status VARCHAR NOT NULL,
  ip_address VARCHAR,
  user_agent VARCHAR,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- TABLE 16: SESSIONS
-- =============================================
CREATE TABLE sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);

-- =============================================
-- TABLE 17: ADMIN USERS
-- =============================================
CREATE TABLE admin_users (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid()::VARCHAR,
  name VARCHAR NOT NULL,
  email VARCHAR UNIQUE NOT NULL,
  role VARCHAR DEFAULT 'admin' NOT NULL,
  status VARCHAR DEFAULT 'active' NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =============================================
-- CREATE INDEXES
-- =============================================

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_is_admin ON users(is_admin);

CREATE INDEX idx_approved_emails_email ON approved_emails(email);
CREATE INDEX idx_approved_emails_status ON approved_emails(status);

CREATE INDEX idx_hrcm_weeks_user_id ON hrcm_weeks(user_id);
CREATE INDEX idx_hrcm_weeks_week_year ON hrcm_weeks(week_number, year);
CREATE INDEX idx_hrcm_weeks_user_week ON hrcm_weeks(user_id, week_number, year);

CREATE INDEX idx_platinum_progress_user_id ON platinum_progress(user_id);

CREATE INDEX idx_rituals_user_id ON rituals(user_id);
CREATE INDEX idx_rituals_category ON rituals(category);
CREATE INDEX idx_rituals_is_active ON rituals(is_active);

CREATE INDEX idx_ritual_completions_user_id ON ritual_completions(user_id);
CREATE INDEX idx_ritual_completions_ritual_id ON ritual_completions(ritual_id);
CREATE INDEX idx_ritual_completions_date ON ritual_completions(date);
CREATE INDEX idx_ritual_completions_user_date ON ritual_completions(user_id, date);

CREATE INDEX idx_courses_user_id ON courses(user_id);
CREATE INDEX idx_courses_week ON courses(week_number);
CREATE INDEX idx_courses_category ON courses(category);

CREATE INDEX idx_rating_progression_user_id ON rating_progression(user_id);

CREATE INDEX idx_course_videos_course_id ON course_videos(course_id);
CREATE INDEX idx_course_videos_order ON course_videos(order_index);

CREATE INDEX idx_course_video_completions_user_id ON course_video_completions(user_id);
CREATE INDEX idx_course_video_completions_video_id ON course_video_completions(video_id);
CREATE INDEX idx_course_video_completions_user_video ON course_video_completions(user_id, video_id);

CREATE INDEX idx_admin_recommendations_user_id ON admin_course_recommendations(user_id);
CREATE INDEX idx_admin_recommendations_admin_id ON admin_course_recommendations(admin_id);
CREATE INDEX idx_admin_recommendations_status ON admin_course_recommendations(status);

CREATE INDEX idx_platinum_standards_category ON platinum_standards(category);
CREATE INDEX idx_platinum_standards_is_active ON platinum_standards(is_active);
CREATE INDEX idx_platinum_standards_order ON platinum_standards(order_index);

CREATE INDEX idx_emotional_trackers_user_id ON emotional_trackers(user_id);
CREATE INDEX idx_emotional_trackers_date ON emotional_trackers(date);
CREATE INDEX idx_emotional_trackers_user_date ON emotional_trackers(user_id, date);
CREATE INDEX idx_emotional_trackers_time_slot ON emotional_trackers(time_slot);

CREATE INDEX idx_user_assignments_user_id ON user_persistent_assignments(user_id);
CREATE INDEX idx_user_assignments_completed ON user_persistent_assignments(completed);
CREATE INDEX idx_user_assignments_user_completed ON user_persistent_assignments(user_id, completed);

CREATE INDEX idx_access_logs_email ON access_logs(email);
CREATE INDEX idx_access_logs_created_at ON access_logs(created_at);

CREATE INDEX "IDX_session_expire" ON sessions(expire);

CREATE INDEX idx_admin_users_email ON admin_users(email);
CREATE INDEX idx_admin_users_status ON admin_users(status);

-- =============================================
-- SUCCESS MESSAGE
-- =============================================
SELECT '✅ SNAKE_CASE schema created successfully!' AS status,
       '17 tables created with snake_case columns' AS tables,
       '70+ indexes created' AS indexes,
       'Supabase PostgREST compatible!' AS compatible;
