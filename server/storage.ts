// Replit Auth + Database Storage implementation
import {
  users,
  hercmWeeks,
  platinumProgress,
  approvedEmails,
  adminUsers,
  accessLogs,
  rituals,
  ritualCompletions,
  courses,
  type User,
  type UpsertUser,
  type HercmWeek,
  type InsertHercmWeek,
  type PlatinumProgress,
  type InsertPlatinumProgress,
  type ApprovedEmail,
  type InsertApprovedEmail,
  type AdminUser,
  type InsertAdminUser,
  type AccessLog,
  type InsertAccessLog,
  type Ritual,
  type InsertRitual,
  type RitualCompletion,
  type InsertRitualCompletion,
  type Course,
  type InsertCourse,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserCourseSheet(userId: string, sheetUrl: string): Promise<User>;
  
  // HERCM Week operations
  getHercmWeek(userId: string, weekNumber: number): Promise<HercmWeek | undefined>;
  getHercmWeeksByUser(userId: string): Promise<HercmWeek[]>;
  createHercmWeek(week: InsertHercmWeek): Promise<HercmWeek>;
  updateHercmWeek(id: string, week: Partial<InsertHercmWeek>): Promise<HercmWeek>;
  
  // Platinum Progress operations
  getPlatinumProgress(userId: string): Promise<PlatinumProgress | undefined>;
  createPlatinumProgress(progress: InsertPlatinumProgress): Promise<PlatinumProgress>;
  updatePlatinumProgress(userId: string, progress: Partial<InsertPlatinumProgress>): Promise<PlatinumProgress>;
  upsertPlatinumProgress(progress: InsertPlatinumProgress): Promise<PlatinumProgress>;
  
  // Approved Emails operations
  getApprovedEmail(email: string): Promise<ApprovedEmail | undefined>;
  getAllApprovedEmails(): Promise<ApprovedEmail[]>;
  addApprovedEmail(email: InsertApprovedEmail): Promise<ApprovedEmail>;
  bulkAddApprovedEmails(emails: string[]): Promise<ApprovedEmail[]>;
  deleteApprovedEmail(id: string): Promise<void>;
  deleteAllApprovedEmails(): Promise<void>;
  incrementAccessCount(email: string): Promise<void>;
  getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalAccess: number;
    failedAttempts: number;
  }>;
  
  // Admin Users operations
  getAllAdminUsers(): Promise<AdminUser[]>;
  getAdminUser(email: string): Promise<AdminUser | undefined>;
  addAdminUser(admin: InsertAdminUser): Promise<AdminUser>;
  updateAdminUser(id: string, admin: Partial<InsertAdminUser>): Promise<AdminUser>;
  deleteAdminUser(id: string): Promise<void>;
  
  // Access Logs operations
  getAllAccessLogs(): Promise<AccessLog[]>;
  createAccessLog(log: InsertAccessLog): Promise<AccessLog>;
  
  // Rituals operations
  getRitualsByUser(userId: string): Promise<Ritual[]>;
  getRitualsByUserAndCategory(userId: string, category: string): Promise<Ritual[]>;
  createRitual(ritual: InsertRitual): Promise<Ritual>;
  updateRitual(id: string, userId: string, ritual: Partial<InsertRitual>): Promise<Ritual | undefined>;
  deleteRitual(id: string, userId: string): Promise<number>;
  
  // Ritual Completions operations
  getRitualCompletionsByDate(userId: string, date: string): Promise<RitualCompletion[]>;
  createRitualCompletion(completion: InsertRitualCompletion): Promise<RitualCompletion>;
  deleteRitualCompletion(ritualId: string, userId: string, date: string): Promise<number>;
  
  // Courses operations
  getCoursesByUserAndWeek(userId: string, weekNumber: number): Promise<Course[]>;
  getCoursesByUserCategoryWeek(userId: string, category: string, weekNumber: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
}

export class DatabaseStorage implements IStorage {
  // User operations (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists first
    const existingUser = await this.getUser(userData.id!);
    
    if (existingUser) {
      // User exists - update it
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userData.id!))
        .returning();
      return user;
    } else {
      // User doesn't exist - create it
      const [user] = await db
        .insert(users)
        .values(userData)
        .returning();
      return user;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserCourseSheet(userId: string, sheetUrl: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ courseSheetUrl: sheetUrl, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // HERCM Week operations
  async getHercmWeek(userId: string, weekNumber: number): Promise<HercmWeek | undefined> {
    const [week] = await db
      .select()
      .from(hercmWeeks)
      .where(and(
        eq(hercmWeeks.userId, userId),
        eq(hercmWeeks.weekNumber, weekNumber)
      ));
    return week;
  }

  async getHercmWeeksByUser(userId: string): Promise<HercmWeek[]> {
    return await db
      .select()
      .from(hercmWeeks)
      .where(eq(hercmWeeks.userId, userId))
      .orderBy(desc(hercmWeeks.weekNumber));
  }

  async createHercmWeek(weekData: InsertHercmWeek): Promise<HercmWeek> {
    const [week] = await db
      .insert(hercmWeeks)
      .values(weekData as any)
      .returning();
    return week;
  }

  async updateHercmWeek(id: string, weekData: Partial<InsertHercmWeek>): Promise<HercmWeek> {
    const [week] = await db
      .update(hercmWeeks)
      .set({ ...weekData, updatedAt: new Date() } as any)
      .where(eq(hercmWeeks.id, id))
      .returning();
    return week;
  }

  // Platinum Progress operations
  async getPlatinumProgress(userId: string): Promise<PlatinumProgress | undefined> {
    const [progress] = await db
      .select()
      .from(platinumProgress)
      .where(eq(platinumProgress.userId, userId));
    return progress;
  }

  async createPlatinumProgress(progressData: InsertPlatinumProgress): Promise<PlatinumProgress> {
    const [progress] = await db
      .insert(platinumProgress)
      .values(progressData as any)
      .returning();
    return progress;
  }

  async updatePlatinumProgress(userId: string, progressData: Partial<InsertPlatinumProgress>): Promise<PlatinumProgress> {
    const [progress] = await db
      .update(platinumProgress)
      .set({ ...progressData, updatedAt: new Date() } as any)
      .where(eq(platinumProgress.userId, userId))
      .returning();
    return progress;
  }

  async upsertPlatinumProgress(progressData: InsertPlatinumProgress): Promise<PlatinumProgress> {
    const [progress] = await db
      .insert(platinumProgress)
      .values(progressData as any)
      .onConflictDoUpdate({
        target: platinumProgress.userId,
        set: {
          ...progressData,
          updatedAt: new Date(),
        } as any,
      })
      .returning();
    return progress;
  }

  // User by email
  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  // Approved Emails operations
  async getApprovedEmail(email: string): Promise<ApprovedEmail | undefined> {
    const [approvedEmail] = await db
      .select()
      .from(approvedEmails)
      .where(eq(approvedEmails.email, email));
    return approvedEmail;
  }

  async getAllApprovedEmails(): Promise<ApprovedEmail[]> {
    return await db
      .select()
      .from(approvedEmails)
      .orderBy(desc(approvedEmails.createdAt));
  }

  async addApprovedEmail(emailData: InsertApprovedEmail): Promise<ApprovedEmail> {
    const [email] = await db
      .insert(approvedEmails)
      .values(emailData as any)
      .returning();
    return email;
  }

  async bulkAddApprovedEmails(emails: string[]): Promise<ApprovedEmail[]> {
    const values = emails.map(email => ({
      email,
      status: 'active' as const,
    }));

    const results = await db
      .insert(approvedEmails)
      .values(values)
      .onConflictDoNothing()
      .returning();
    
    return results;
  }

  async deleteApprovedEmail(id: string): Promise<void> {
    await db
      .delete(approvedEmails)
      .where(eq(approvedEmails.id, id));
  }

  async deleteAllApprovedEmails(): Promise<void> {
    await db.delete(approvedEmails);
  }

  async incrementAccessCount(email: string): Promise<void> {
    await db
      .update(approvedEmails)
      .set({ 
        accessCount: sql`${approvedEmails.accessCount} + 1`,
        lastAccessAt: new Date(),
        updatedAt: new Date()
      } as any)
      .where(eq(approvedEmails.email, email));
  }

  async getAdminStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    totalAccess: number;
    failedAttempts: number;
  }> {
    const totalUsersResult = await db
      .select({ count: count() })
      .from(approvedEmails);
    
    const activeUsersResult = await db
      .select({ count: count() })
      .from(approvedEmails)
      .where(eq(approvedEmails.status, 'active'));

    const allEmails = await db
      .select()
      .from(approvedEmails);
    
    const totalAccess = allEmails.reduce((sum, email) => sum + email.accessCount, 0);

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      totalAccess,
      failedAttempts: 0,
    };
  }

  // Admin Users operations
  async getAllAdminUsers(): Promise<AdminUser[]> {
    return await db
      .select()
      .from(adminUsers)
      .orderBy(desc(adminUsers.createdAt));
  }

  async getAdminUser(email: string): Promise<AdminUser | undefined> {
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email));
    return admin;
  }

  async addAdminUser(adminData: InsertAdminUser): Promise<AdminUser> {
    const [admin] = await db
      .insert(adminUsers)
      .values(adminData as any)
      .returning();
    return admin;
  }

  async updateAdminUser(id: string, adminData: Partial<InsertAdminUser>): Promise<AdminUser> {
    const [admin] = await db
      .update(adminUsers)
      .set({ ...adminData, updatedAt: new Date() } as any)
      .where(eq(adminUsers.id, id))
      .returning();
    return admin;
  }

  async deleteAdminUser(id: string): Promise<void> {
    await db
      .delete(adminUsers)
      .where(eq(adminUsers.id, id));
  }

  // Access Logs operations
  async getAllAccessLogs(): Promise<AccessLog[]> {
    return await db
      .select()
      .from(accessLogs)
      .orderBy(desc(accessLogs.createdAt))
      .limit(100);
  }

  async createAccessLog(logData: InsertAccessLog): Promise<AccessLog> {
    const [log] = await db
      .insert(accessLogs)
      .values(logData as any)
      .returning();
    return log;
  }

  // Rituals operations
  async getRitualsByUser(userId: string): Promise<Ritual[]> {
    return await db
      .select()
      .from(rituals)
      .where(eq(rituals.userId, userId))
      .orderBy(desc(rituals.createdAt));
  }

  async getRitualsByUserAndCategory(userId: string, category: string): Promise<Ritual[]> {
    return await db
      .select()
      .from(rituals)
      .where(and(
        eq(rituals.userId, userId),
        eq(rituals.category, category),
        eq(rituals.isActive, true)
      ));
  }

  async createRitual(ritualData: InsertRitual): Promise<Ritual> {
    const [ritual] = await db
      .insert(rituals)
      .values(ritualData as any)
      .returning();
    return ritual;
  }

  async updateRitual(id: string, userId: string, ritualData: Partial<InsertRitual>): Promise<Ritual | undefined> {
    const [ritual] = await db
      .update(rituals)
      .set({ ...ritualData, updatedAt: new Date() } as any)
      .where(and(
        eq(rituals.id, id),
        eq(rituals.userId, userId)
      ))
      .returning();
    return ritual;
  }

  async deleteRitual(id: string, userId: string): Promise<number> {
    // First delete all ritual completions for this ritual
    await db
      .delete(ritualCompletions)
      .where(and(
        eq(ritualCompletions.ritualId, id),
        eq(ritualCompletions.userId, userId)
      ));
    
    // Then delete the ritual itself
    const result = await db
      .delete(rituals)
      .where(and(
        eq(rituals.id, id),
        eq(rituals.userId, userId)
      ))
      .returning();
    return result.length;
  }

  // Ritual Completions operations
  async getRitualCompletionsByDate(userId: string, date: string): Promise<RitualCompletion[]> {
    return await db
      .select()
      .from(ritualCompletions)
      .where(and(
        eq(ritualCompletions.userId, userId),
        eq(ritualCompletions.date, date)
      ));
  }

  async createRitualCompletion(completionData: InsertRitualCompletion): Promise<RitualCompletion> {
    const [completion] = await db
      .insert(ritualCompletions)
      .values(completionData as any)
      .returning();
    return completion;
  }

  async deleteRitualCompletion(ritualId: string, userId: string, date: string): Promise<number> {
    const result = await db
      .delete(ritualCompletions)
      .where(and(
        eq(ritualCompletions.ritualId, ritualId),
        eq(ritualCompletions.userId, userId),
        eq(ritualCompletions.date, date)
      ))
      .returning();
    return result.length;
  }

  // Courses operations
  async getCoursesByUserAndWeek(userId: string, weekNumber: number): Promise<Course[]> {
    return await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.userId, userId),
        eq(courses.weekNumber, weekNumber),
        eq(courses.isActive, true)
      ));
  }

  async getCoursesByUserCategoryWeek(userId: string, category: string, weekNumber: number): Promise<Course | undefined> {
    const [course] = await db
      .select()
      .from(courses)
      .where(and(
        eq(courses.userId, userId),
        eq(courses.category, category),
        eq(courses.weekNumber, weekNumber),
        eq(courses.isActive, true)
      ));
    return course;
  }

  async createCourse(courseData: InsertCourse): Promise<Course> {
    const [course] = await db
      .insert(courses)
      .values(courseData as any)
      .returning();
    return course;
  }

  async updateCourse(id: string, courseData: Partial<InsertCourse>): Promise<Course> {
    const [course] = await db
      .update(courses)
      .set({ ...courseData, updatedAt: new Date() } as any)
      .where(eq(courses.id, id))
      .returning();
    return course;
  }
}

export const storage = new DatabaseStorage();
