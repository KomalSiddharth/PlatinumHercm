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

// HERCM Weekly Data Storage
export const hercmWeeks = pgTable("hercm_weeks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  weekNumber: integer("week_number").notNull(),
  year: integer("year").notNull(),
  
  // Current Week Ratings (H-E-R-C-M 1-5 scale)
  currentH: integer("current_h"), // Hope
  currentE: integer("current_e"), // Energy
  currentR: integer("current_r"), // Respect
  currentC: integer("current_c"), // Courage
  currentM: integer("current_m"), // Maturity
  
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
  
  // Health
  healthProblems: varchar("health_problems"),
  healthCurrentFeelings: varchar("health_current_feelings"),
  healthCurrentBelief: varchar("health_current_belief"),
  healthCurrentActions: varchar("health_current_actions"),
  healthResult: varchar("health_result"),
  healthNextFeelings: varchar("health_next_feelings"),
  healthNextTarget: varchar("health_next_target"),
  healthNextActions: varchar("health_next_actions"),
  healthCourseSuggestion: varchar("health_course_suggestion"),
  healthAffirmation: varchar("health_affirmation"),
  healthChecklist: jsonb("health_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Relationship
  relationshipProblems: varchar("relationship_problems"),
  relationshipCurrentFeelings: varchar("relationship_current_feelings"),
  relationshipCurrentBelief: varchar("relationship_current_belief"),
  relationshipCurrentActions: varchar("relationship_current_actions"),
  relationshipResult: varchar("relationship_result"),
  relationshipNextFeelings: varchar("relationship_next_feelings"),
  relationshipNextTarget: varchar("relationship_next_target"),
  relationshipNextActions: varchar("relationship_next_actions"),
  relationshipCourseSuggestion: varchar("relationship_course_suggestion"),
  relationshipAffirmation: varchar("relationship_affirmation"),
  relationshipChecklist: jsonb("relationship_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Career
  careerProblems: varchar("career_problems"),
  careerCurrentFeelings: varchar("career_current_feelings"),
  careerCurrentBelief: varchar("career_current_belief"),
  careerCurrentActions: varchar("career_current_actions"),
  careerResult: varchar("career_result"),
  careerNextFeelings: varchar("career_next_feelings"),
  careerNextTarget: varchar("career_next_target"),
  careerNextActions: varchar("career_next_actions"),
  careerCourseSuggestion: varchar("career_course_suggestion"),
  careerAffirmation: varchar("career_affirmation"),
  careerChecklist: jsonb("career_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Money
  moneyProblems: varchar("money_problems"),
  moneyCurrentFeelings: varchar("money_current_feelings"),
  moneyCurrentBelief: varchar("money_current_belief"),
  moneyCurrentActions: varchar("money_current_actions"),
  moneyResult: varchar("money_result"),
  moneyNextFeelings: varchar("money_next_feelings"),
  moneyNextTarget: varchar("money_next_target"),
  moneyNextActions: varchar("money_next_actions"),
  moneyCourseSuggestion: varchar("money_course_suggestion"),
  moneyAffirmation: varchar("money_affirmation"),
  moneyChecklist: jsonb("money_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
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
  badges: jsonb("badges").$type<string[]>().default([]),
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
  hercmAreas: z.array(z.enum(['Health', 'Relationship', 'Career', 'Money'])),
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
  isActive: boolean("is_active").default(true).notNull(),
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
