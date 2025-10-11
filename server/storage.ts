// Replit Auth + Database Storage implementation
import {
  users,
  hercmWeeks,
  platinumProgress,
  approvedEmails,
  type User,
  type UpsertUser,
  type HercmWeek,
  type InsertHercmWeek,
  type PlatinumProgress,
  type InsertPlatinumProgress,
  type ApprovedEmail,
  type InsertApprovedEmail,
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
}

export class DatabaseStorage implements IStorage {
  // User operations (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
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
}

export const storage = new DatabaseStorage();
