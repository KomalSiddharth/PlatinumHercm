// Replit Auth + Database Storage implementation
import {
  users,
  hercmWeeks,
  platinumProgress,
  type User,
  type UpsertUser,
  type HercmWeek,
  type InsertHercmWeek,
  type PlatinumProgress,
  type InsertPlatinumProgress,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
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
}

export const storage = new DatabaseStorage();
