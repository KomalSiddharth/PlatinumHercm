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
  
  // Health
  healthCurrentBelief: varchar("health_current_belief"),
  healthNextTarget: varchar("health_next_target"),
  healthCourseSuggestion: varchar("health_course_suggestion"),
  healthAffirmation: varchar("health_affirmation"),
  healthChecklist: jsonb("health_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Relationship
  relationshipCurrentBelief: varchar("relationship_current_belief"),
  relationshipNextTarget: varchar("relationship_next_target"),
  relationshipCourseSuggestion: varchar("relationship_course_suggestion"),
  relationshipAffirmation: varchar("relationship_affirmation"),
  relationshipChecklist: jsonb("relationship_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Career
  careerCurrentBelief: varchar("career_current_belief"),
  careerNextTarget: varchar("career_next_target"),
  careerCourseSuggestion: varchar("career_course_suggestion"),
  careerAffirmation: varchar("career_affirmation"),
  careerChecklist: jsonb("career_checklist").$type<{ id: string; text: string; checked: boolean }[]>(),
  
  // Money
  moneyCurrentBelief: varchar("money_current_belief"),
  moneyNextTarget: varchar("money_next_target"),
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
