import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  boolean,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Updated for Replit Auth with admin role support
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  isAdmin: boolean("is_admin").default(false).notNull(),
  courseSheetUrl: varchar("course_sheet_url"), // User's Google Sheet URL for courses
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Approved Emails - Admin manages which emails can access the system
export const approvedEmails = pgTable("approved_emails", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name"), // User's name
  email: varchar("email").unique().notNull(),
  status: varchar("status").default('active').notNull(), // 'active' or 'inactive'
  accessCount: integer("access_count").default(0).notNull(),
  zoomLink: varchar("zoom_link"), // Optional Zoom link for user
  lastAccessAt: timestamp("last_access_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertApprovedEmailSchema = createInsertSchema(approvedEmails).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertApprovedEmail = z.infer<typeof insertApprovedEmailSchema>;
export type ApprovedEmail = typeof approvedEmails.$inferSelect;

// HRCM Weekly Data Storage
export const hercmWeeks = pgTable("hercm_weeks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  
  // Current Week Ratings (H-R-C-M 1-5 scale)
  currentH: integer("current_h"), // Health
  currentE: integer("current_e"), // Relationship (Emotion)
  currentR: integer("current_r"), // Respect (Career)
  currentC: integer("current_c"), // Courage (Money)
  currentM: integer("current_m"), // (unused - legacy)
  
  // Target Ratings (from previous week's next week goals)
  targetH: integer("target_h"),
  targetE: integer("target_e"),
  targetR: integer("target_r"),
  targetC: integer("target_c"),
  targetM: integer("target_m"),
  
  // Next Week Goals (auto-filled suggestions)
  nextWeekH: integer("next_week_h"),
  nextWeekE: integer("next_week_e"),
  nextWeekR: integer("next_week_r"),
  nextWeekC: integer("next_week_c"),
  nextWeekM: integer("next_week_m"),
  
  // Improvement Calculations (current - target)
  improvementH: integer("improvement_h"),
  improvementE: integer("improvement_e"),
  improvementR: integer("improvement_r"),
  improvementC: integer("improvement_c"),
  improvementM: integer("improvement_m"),
  
  // Overall Metrics
  overallScore: integer("overall_score"), // Average of current ratings
  achievementRate: integer("achievement_rate"), // Percentage of goals achieved
  weekStatus: varchar("week_status").default('active').notNull(), // 'active', 'locked', 'completed'
  
  // Emotion Scores (1-10 scale for tracking emotional state)
  healthEmotionScore: integer("health_emotion_score"), // Health emotional state
  relationshipEmotionScore: integer("relationship_emotion_score"), // Relationship emotional state
  careerEmotionScore: integer("career_emotion_score"), // Career emotional state
  moneyEmotionScore: integer("money_emotion_score"), // Money emotional state
  
  // Health
  healthProblems: varchar("health_problems"),
  healthCurrentFeelings: varchar("health_current_feelings"),
  healthCurrentBelief: varchar("health_current_belief"),
  healthCurrentActions: varchar("health_current_actions"),
  healthResult: varchar("health_result"),
  healthNextFeelings: varchar("health_next_feelings"),
  healthNextTarget: varchar("health_next_target"),
  healthNextActions: varchar("health_next_actions"),
  healthAssignment: jsonb("health_assignment").$type<{ courses: { id: string; courseName: string; link: string; completed: boolean }[]; lessons: { id: string; courseId: string; courseName: string; lessonName: string; url: string; completed: boolean }[] }>(),
  healthChecklist: jsonb("health_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  healthResultChecklist: jsonb("health_result_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  healthFeelingsChecklist: jsonb("health_feelings_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  healthBeliefsChecklist: jsonb("health_beliefs_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  healthActionsChecklist: jsonb("health_actions_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Relationship
  relationshipProblems: varchar("relationship_problems"),
  relationshipCurrentFeelings: varchar("relationship_current_feelings"),
  relationshipCurrentBelief: varchar("relationship_current_belief"),
  relationshipCurrentActions: varchar("relationship_current_actions"),
  relationshipResult: varchar("relationship_result"),
  relationshipNextFeelings: varchar("relationship_next_feelings"),
  relationshipNextTarget: varchar("relationship_next_target"),
  relationshipNextActions: varchar("relationship_next_actions"),
  relationshipAssignment: jsonb("relationship_assignment").$type<{ courses: { id: string; courseName: string; link: string; completed: boolean }[]; lessons: { id: string; courseId: string; courseName: string; lessonName: string; url: string; completed: boolean }[] }>(),
  relationshipChecklist: jsonb("relationship_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  relationshipResultChecklist: jsonb("relationship_result_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  relationshipFeelingsChecklist: jsonb("relationship_feelings_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  relationshipBeliefsChecklist: jsonb("relationship_beliefs_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  relationshipActionsChecklist: jsonb("relationship_actions_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Career
  careerProblems: varchar("career_problems"),
  careerCurrentFeelings: varchar("career_current_feelings"),
  careerCurrentBelief: varchar("career_current_belief"),
  careerCurrentActions: varchar("career_current_actions"),
  careerResult: varchar("career_result"),
  careerNextFeelings: varchar("career_next_feelings"),
  careerNextTarget: varchar("career_next_target"),
  careerNextActions: varchar("career_next_actions"),
  careerAssignment: jsonb("career_assignment").$type<{ courses: { id: string; courseName: string; link: string; completed: boolean }[]; lessons: { id: string; courseId: string; courseName: string; lessonName: string; url: string; completed: boolean }[] }>(),
  careerChecklist: jsonb("career_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  careerResultChecklist: jsonb("career_result_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  careerFeelingsChecklist: jsonb("career_feelings_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  careerBeliefsChecklist: jsonb("career_beliefs_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  careerActionsChecklist: jsonb("career_actions_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Money
  moneyProblems: varchar("money_problems"),
  moneyCurrentFeelings: varchar("money_current_feelings"),
  moneyCurrentBelief: varchar("money_current_belief"),
  moneyCurrentActions: varchar("money_current_actions"),
  moneyResult: varchar("money_result"),
  moneyNextFeelings: varchar("money_next_feelings"),
  moneyNextTarget: varchar("money_next_target"),
  moneyNextActions: varchar("money_next_actions"),
  moneyAssignment: jsonb("money_assignment").$type<{ courses: { id: string; courseName: string; link: string; completed: boolean }[]; lessons: { id: string; courseId: string; courseName: string; lessonName: string; url: string; completed: boolean }[] }>(),
  moneyChecklist: jsonb("money_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  moneyResultChecklist: jsonb("money_result_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  moneyFeelingsChecklist: jsonb("money_feelings_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  moneyBeliefsChecklist: jsonb("money_beliefs_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  moneyActionsChecklist: jsonb("money_actions_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Unified Assignment (for all areas) - includes both user-selected and admin-recommended courses
  unifiedAssignment: jsonb("unified_assignment").$type<{ id: string; courseId: string; courseName: string; lessonName: string; url: string; completed: boolean; source?: 'user' | 'admin'; recommendationId?: string }[]>(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertHercmWeekSchema = createInsertSchema(hercmWeeks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertHercmWeek = z.infer<typeof insertHercmWeekSchema>;
export type HercmWeek = typeof hercmWeeks.$inferSelect;

// Platinum Progress (Streaks, Badges, Points)
export const platinumProgress = pgTable("platinum_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  currentStreak: integer("current_streak").default(0).notNull(),
  totalPoints: integer("total_points").default(0).notNull(),
  badges: jsonb("badges").$type<{ id: string; name: string; achievedAt: string; description: string }[]>().default([]),
  platinumAchieved: boolean("platinum_achieved").default(false).notNull(),
  platinumAchievedAt: timestamp("platinum_achieved_at"),
  lastResetDate: timestamp("last_reset_date").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatinumProgressSchema = createInsertSchema(platinumProgress).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatinumProgress = z.infer<typeof insertPlatinumProgressSchema>;
export type PlatinumProgress = typeof platinumProgress.$inferSelect;

// Course Recommendation Types (from Google Sheets)
export const courseRecommendationSchema = z.object({
  courseName: z.string(),
  link: z.string().url(),
  hrcmAreas: z.array(z.enum(['Health', 'Relationship', 'Career', 'Money'])),
  keywords: z.array(z.string()),
  targetProblems: z.array(z.string()),
  targetFeelings: z.array(z.string()),
  beliefTargets: z.array(z.string()),
  actionSuggestions: z.array(z.string()),
  difficulty: z.string().optional(),
  duration: z.string().optional(),
});

export type CourseRecommendation = z.infer<typeof courseRecommendationSchema>;

// Course Recommendation Request/Response
export const recommendCoursesRequestSchema = z.object({
  category: z.enum(['Health', 'Relationship', 'Career', 'Money']),
  currentRating: z.number(),
  problems: z.string(),
  feelings: z.string(),
  beliefs: z.string(),
  actions: z.string(),
  excludeCourseNames: z.array(z.string()).optional(), // Exclude previously recommended courses for variety
});

export type RecommendCoursesRequest = z.infer<typeof recommendCoursesRequestSchema>;

export const recommendedCourseSchema = z.object({
  course: courseRecommendationSchema,
  score: z.number(),
  matchReasons: z.array(z.string()),
});

export type RecommendedCourse = z.infer<typeof recommendedCourseSchema>;

// Admin Users - Manage who has admin panel access
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name").notNull(),
  email: varchar("email").unique().notNull(),
  role: varchar("role").default('admin').notNull(), // 'admin' or 'super_admin'
  status: varchar("status").default('active').notNull(), // 'active' or 'inactive'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Access Logs - Track user login attempts
export const accessLogs = pgTable("access_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").notNull(),
  status: varchar("status").notNull(), // 'success' or 'failed'
  ipAddress: varchar("ip_address"),
  userAgent: varchar("user_agent"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAccessLogSchema = createInsertSchema(accessLogs).omit({
  id: true,
  createdAt: true,
});

export type InsertAccessLog = z.infer<typeof insertAccessLogSchema>;
export type AccessLog = typeof accessLogs.$inferSelect;

// Rituals - Daily habits/practices for personal development
export const rituals = pgTable("rituals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title").notNull(),
  description: varchar("description"),
  category: varchar("category").notNull(), // 'Health', 'Relationship', 'Career', 'Money'
  frequency: varchar("frequency").default('daily').notNull(), // 'daily', 'weekly'
  points: integer("points").default(50).notNull(), // Custom points for each ritual
  isActive: boolean("is_active").default(true).notNull(),
  isDefault: boolean("is_default").default(false).notNull(), // System default rituals (non-deletable)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRitualSchema = createInsertSchema(rituals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRitual = z.infer<typeof insertRitualSchema>;
export type Ritual = typeof rituals.$inferSelect;

// Ritual Completions - Track daily ritual completion
export const ritualCompletions = pgTable("ritual_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  ritualId: varchar("ritual_id").notNull().references(() => rituals.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  completedAt: timestamp("completed_at").defaultNow().notNull(),
  date: varchar("date").notNull(), // YYYY-MM-DD format for easy date queries
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertRitualCompletionSchema = createInsertSchema(ritualCompletions).omit({
  id: true,
  createdAt: true,
});

export type InsertRitualCompletion = z.infer<typeof insertRitualCompletionSchema>;
export type RitualCompletion = typeof ritualCompletions.$inferSelect;

// Courses - AI-recommended courses stored in database
export const courses = pgTable("courses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  category: varchar("category").notNull(), // 'Health', 'Relationship', 'Career', 'Money'
  courseName: varchar("course_name").notNull(),
  courseLink: varchar("course_link"),
  matchScore: integer("match_score"), // 0-100 percentage match
  matchReasons: jsonb("match_reasons").$type<string[]>(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCourseSchema = createInsertSchema(courses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCourse = z.infer<typeof insertCourseSchema>;
export type Course = typeof courses.$inferSelect;

// Rating Progression - Track allowed max ratings and consecutive weeks
export const ratingProgression = pgTable("rating_progression", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  
  // Maximum allowed rating for each category (starts at 7)
  healthMaxRating: integer("health_max_rating").default(7).notNull(),
  relationshipMaxRating: integer("relationship_max_rating").default(7).notNull(),
  careerMaxRating: integer("career_max_rating").default(7).notNull(),
  moneyMaxRating: integer("money_max_rating").default(7).notNull(),
  
  // Consecutive weeks at current max rating for each category
  healthWeeksAtMax: integer("health_weeks_at_max").default(0).notNull(),
  relationshipWeeksAtMax: integer("relationship_weeks_at_max").default(0).notNull(),
  careerWeeksAtMax: integer("career_weeks_at_max").default(0).notNull(),
  moneyWeeksAtMax: integer("money_weeks_at_max").default(0).notNull(),
  
  // Last rating achieved for tracking consistency
  healthLastRating: integer("health_last_rating").default(0).notNull(),
  relationshipLastRating: integer("relationship_last_rating").default(0).notNull(),
  careerLastRating: integer("career_last_rating").default(0).notNull(),
  moneyLastRating: integer("money_last_rating").default(0).notNull(),
  
  // Last week number counted for progression (to prevent replaying same week)
  healthLastCountedWeek: integer("health_last_counted_week").default(0).notNull(),
  relationshipLastCountedWeek: integer("relationship_last_counted_week").default(0).notNull(),
  careerLastCountedWeek: integer("career_last_counted_week").default(0).notNull(),
  moneyLastCountedWeek: integer("money_last_counted_week").default(0).notNull(),
  
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertRatingProgressionSchema = createInsertSchema(ratingProgression).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertRatingProgression = z.infer<typeof insertRatingProgressionSchema>;
export type RatingProgression = typeof ratingProgression.$inferSelect;

// Course Videos - Videos for each course (provided by admin/coach)
export const courseVideos = pgTable("course_videos", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  courseId: varchar("course_id").notNull(), // Course identifier (e.g., 'health-mastery')
  title: varchar("title").notNull(),
  videoUrl: varchar("video_url").notNull(),
  orderIndex: integer("order_index").notNull(), // Display order
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertCourseVideoSchema = createInsertSchema(courseVideos).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertCourseVideo = z.infer<typeof insertCourseVideoSchema>;
export type CourseVideo = typeof courseVideos.$inferSelect;

// Course Video Completions - Track which videos users have completed
export const courseVideoCompletions = pgTable("course_video_completions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  videoId: varchar("video_id").notNull(), // No FK constraint - courses are frontend-only
  completedAt: timestamp("completed_at").defaultNow(),
});

export const insertCourseVideoCompletionSchema = createInsertSchema(courseVideoCompletions).omit({
  id: true,
  completedAt: true,
});

export type InsertCourseVideoCompletion = z.infer<typeof insertCourseVideoCompletionSchema>;
export type CourseVideoCompletion = typeof courseVideoCompletions.$inferSelect;

// Admin Course Recommendations - Track courses recommended by admin to users
export const adminCourseRecommendations = pgTable("admin_course_recommendations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id), // User who receives recommendation
  adminId: varchar("admin_id").notNull().references(() => users.id), // Admin who recommended
  hrcmArea: varchar("hrcm_area").notNull(), // 'health', 'relationship', 'career', 'money'
  courseId: varchar("course_id").notNull(), // Frontend course ID
  courseName: varchar("course_name").notNull(),
  lessonId: varchar("lesson_id"), // Optional specific lesson
  lessonName: varchar("lesson_name"),
  lessonUrl: varchar("lesson_url"),
  reason: varchar("reason"), // Optional reason for recommendation
  status: varchar("status").default('pending').notNull(), // 'pending', 'accepted', 'completed'
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdminCourseRecommendationSchema = createInsertSchema(adminCourseRecommendations).omit({
  id: true,
  createdAt: true,
});

export type InsertAdminCourseRecommendation = z.infer<typeof insertAdminCourseRecommendationSchema>;
export type AdminCourseRecommendation = typeof adminCourseRecommendations.$inferSelect;

// Platinum Standards - Global standards manageable by admin
export const platinumStandards = pgTable("platinum_standards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  category: varchar("category").notNull(), // 'health', 'relationship', 'career', 'money'
  standardText: varchar("standard_text", { length: 500 }).notNull(),
  orderIndex: integer("order_index").notNull().default(0), // Display order
  isActive: boolean("is_active").default(true).notNull(), // Enable/disable without deleting
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPlatinumStandardSchema = createInsertSchema(platinumStandards).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertPlatinumStandard = z.infer<typeof insertPlatinumStandardSchema>;
export type PlatinumStandard = typeof platinumStandards.$inferSelect;

// Emotional Habit Tracker - Track emotions throughout the day in 2-hour time slots
export const emotionalTrackers = pgTable("emotional_trackers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  date: varchar("date").notNull(), // Format: YYYY-MM-DD
  timeSlot: varchar("time_slot").notNull(), // e.g., "7am - 9am", "9am - 11am", etc.
  positiveEmotions: varchar("positive_emotions", { length: 500 }),
  negativeEmotions: varchar("negative_emotions", { length: 500 }),
  repeatingEmotions: varchar("repeating_emotions", { length: 500 }),
  missingEmotions: varchar("missing_emotions", { length: 500 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertEmotionalTrackerSchema = createInsertSchema(emotionalTrackers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertEmotionalTracker = z.infer<typeof insertEmotionalTrackerSchema>;
export type EmotionalTracker = typeof emotionalTrackers.$inferSelect;

// User Persistent Assignments - User-level assignment list (independent of dates)
export const userPersistentAssignments = pgTable("user_persistent_assignments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  hrcmArea: varchar("hrcm_area").notNull(), // 'health', 'relationship', 'career', 'money'
  courseId: varchar("course_id").notNull(),
  courseName: varchar("course_name", { length: 500 }).notNull(),
  lessonId: varchar("lesson_id"), // Optional - specific lesson ID
  lessonName: varchar("lesson_name", { length: 500 }),
  url: varchar("url", { length: 1000 }), // Optional URL to the lesson/course
  source: varchar("source").notNull(), // 'user' (self-added) or 'admin' (recommended by admin)
  recommendationId: varchar("recommendation_id"), // Optional - links to adminCourseRecommendations if from admin
  completed: boolean("completed").default(false).notNull(), // Track completion
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserPersistentAssignmentSchema = createInsertSchema(userPersistentAssignments).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InsertUserPersistentAssignment = z.infer<typeof insertUserPersistentAssignmentSchema>;
export type UserPersistentAssignment = typeof userPersistentAssignments.$inferSelect;
