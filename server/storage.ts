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
  ratingProgression,
  courseVideos,
  courseVideoCompletions,
  adminCourseRecommendations,
  platinumStandards,
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
  type RatingProgression,
  type InsertRatingProgression,
  type CourseVideo,
  type InsertCourseVideo,
  type CourseVideoCompletion,
  type InsertCourseVideoCompletion,
  type AdminCourseRecommendation,
  type InsertAdminCourseRecommendation,
  type PlatinumStandard,
  type InsertPlatinumStandard,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, count, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserCourseSheet(userId: string, sheetUrl: string): Promise<User>;
  
  // HERCM Week operations
  getHercmWeek(userId: string, weekNumber: number): Promise<HercmWeek | undefined>;
  getHercmWeekById(id: string): Promise<HercmWeek | undefined>;
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
  updateApprovedEmail(id: string, data: { email: string; status: string }): Promise<void>;
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
  deleteAllAccessLogs(): Promise<void>;
  
  // Rituals operations
  getRitualsByUser(userId: string): Promise<Ritual[]>;
  getRitualsByUserAndCategory(userId: string, category: string): Promise<Ritual[]>;
  createRitual(ritual: InsertRitual): Promise<Ritual>;
  updateRitual(id: string, userId: string, ritual: Partial<InsertRitual>): Promise<Ritual | undefined>;
  deleteRitual(id: string, userId: string): Promise<number>;
  
  // Ritual Completions operations
  getRitualCompletionsByDate(userId: string, date: string): Promise<RitualCompletion[]>;
  getRitualCompletionsByMonth(userId: string, year: number, month: number): Promise<RitualCompletion[]>;
  createRitualCompletion(completion: InsertRitualCompletion): Promise<RitualCompletion>;
  deleteRitualCompletion(ritualId: string, userId: string, date: string): Promise<number>;
  
  // Courses operations
  getCoursesByUserAndWeek(userId: string, weekNumber: number): Promise<Course[]>;
  getCoursesByUserCategoryWeek(userId: string, category: string, weekNumber: number): Promise<Course | undefined>;
  createCourse(course: InsertCourse): Promise<Course>;
  updateCourse(id: string, course: Partial<InsertCourse>): Promise<Course>;
  updateCourseProgress(courseId: string, progress: number): Promise<Course>;
  
  // Course Videos operations
  getCourseVideos(courseId: string): Promise<CourseVideo[]>;
  createCourseVideo(video: InsertCourseVideo): Promise<CourseVideo>;
  
  // Course Video Completions operations
  getCourseVideoCompletions(userId: string, courseId: string): Promise<CourseVideoCompletion[]>;
  toggleVideoCompletion(userId: string, videoId: string): Promise<{ completed: boolean }>;
  
  // Rating Progression operations
  getRatingProgression(userId: string): Promise<RatingProgression | undefined>;
  upsertRatingProgression(userId: string, progression: Partial<InsertRatingProgression>): Promise<RatingProgression>;
  updateRatingProgression(userId: string, progression: Partial<InsertRatingProgression>): Promise<RatingProgression>;
  
  // Admin Analytics operations
  getUserDashboardData(userId: string): Promise<{
    user: User | undefined;
    currentWeek: HercmWeek | undefined;
    allWeeks: HercmWeek[];
    platinumProgress: PlatinumProgress | undefined;
    completedLessons: CourseVideoCompletion[];
    rituals: Ritual[];
    todayCompletions: RitualCompletion[];
    platinumBadges: any[];
  }>;
  getUserAnalytics(userId: string, period: 'weekly' | 'monthly' | 'yearly'): Promise<{
    ratings: Array<{ date: string; health: number; relationship: number; career: number; money: number }>;
    courseProgress: { total: number; completed: number };
    averageRatings: { health: number; relationship: number; career: number; money: number };
    platinumStatus: { achieved: boolean; weeksAtEight: number };
  }>;
  getTeamAnalytics(period: 'weekly' | 'monthly' | 'yearly'): Promise<{
    totalUsers: number;
    activeUsers: number;
    averageRatings: { health: number; relationship: number; career: number; money: number };
    growthMetrics: { newUsers: number; percentChange: number };
    topPerformers: Array<{ userId: string; email: string; averageRating: number }>;
    completionRates: { courses: number; rituals: number };
  }>;
  
  // Admin Course Recommendations operations
  addCourseRecommendation(recommendation: any): Promise<any>;
  getUserRecommendations(userId: string): Promise<any[]>;
  getAllCourseRecommendations(): Promise<any[]>;
  updateRecommendationStatus(id: string, status: string): Promise<any>;
  deleteRecommendation(id: string): Promise<void>;
  deleteAllRecommendations(): Promise<void>;
  
  // Platinum Standards operations
  getAllPlatinumStandards(): Promise<PlatinumStandard[]>;
  getActivePlatinumStandards(): Promise<PlatinumStandard[]>;
  getPlatinumStandardsByCategory(category: string): Promise<PlatinumStandard[]>;
  addPlatinumStandard(standard: InsertPlatinumStandard): Promise<PlatinumStandard>;
  updatePlatinumStandard(id: string, standard: Partial<InsertPlatinumStandard>): Promise<PlatinumStandard>;
  deletePlatinumStandard(id: string): Promise<void>;
  reorderPlatinumStandards(updates: Array<{ id: string; orderIndex: number }>): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // User operations (Required for Replit Auth)
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // Check if user exists by ID first, then by email
    let existingUser = await this.getUser(userData.id!);
    
    // If not found by ID but we have an email, try finding by email
    if (!existingUser && userData.email) {
      existingUser = await this.getUserByEmail(userData.email);
    }
    
    if (existingUser) {
      // User exists - update it (use existing user's ID to maintain consistency)
      const [user] = await db
        .update(users)
        .set({
          ...userData,
          id: existingUser.id, // Preserve existing ID
          updatedAt: new Date(),
        })
        .where(eq(users.id, existingUser.id))
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
    // Get the LATEST snapshot for this week number (for displaying current week)
    const [week] = await db
      .select()
      .from(hercmWeeks)
      .where(and(
        eq(hercmWeeks.userId, userId),
        eq(hercmWeeks.weekNumber, weekNumber)
      ))
      .orderBy(desc(hercmWeeks.createdAt))
      .limit(1);
    return week;
  }

  async getHercmWeekById(id: string): Promise<HercmWeek | undefined> {
    const [week] = await db
      .select()
      .from(hercmWeeks)
      .where(eq(hercmWeeks.id, id));
    return week;
  }

  async getHercmWeeksByUser(userId: string): Promise<HercmWeek[]> {
    // Get ALL snapshots sorted by date (newest first) for history display
    return await db
      .select()
      .from(hercmWeeks)
      .where(eq(hercmWeeks.userId, userId))
      .orderBy(desc(hercmWeeks.createdAt));
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

  async updateApprovedEmail(id: string, data: { email: string; status: string }): Promise<void> {
    await db
      .update(approvedEmails)
      .set({ 
        email: data.email, 
        status: data.status,
        updatedAt: new Date()
      })
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

  async deleteAllAccessLogs(): Promise<void> {
    await db.delete(accessLogs);
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
    // Check if this is a default ritual (non-deletable)
    const [ritual] = await db
      .select()
      .from(rituals)
      .where(and(
        eq(rituals.id, id),
        eq(rituals.userId, userId)
      ));
    
    if (!ritual) {
      return 0;
    }
    
    // Prevent deletion of default rituals
    if (ritual.isDefault) {
      return 0;
    }
    
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

  async getRitualCompletionsByMonth(userId: string, year: number, month: number): Promise<RitualCompletion[]> {
    // Month is 0-indexed in JS Date, so we need to format it correctly
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month
    
    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];
    
    return await db
      .select()
      .from(ritualCompletions)
      .where(and(
        eq(ritualCompletions.userId, userId),
        sql`${ritualCompletions.date} >= ${startDateStr}`,
        sql`${ritualCompletions.date} <= ${endDateStr}`
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

  async updateCourseProgress(courseId: string, progress: number): Promise<Course> {
    const [course] = await db
      .update(courses)
      .set({ progress, updatedAt: new Date() } as any)
      .where(eq(courses.id, courseId))
      .returning();
    
    if (!course) {
      throw new Error(`Course with id ${courseId} not found`);
    }
    
    return course;
  }

  // Course Videos operations
  async getCourseVideos(courseId: string): Promise<CourseVideo[]> {
    return await db
      .select()
      .from(courseVideos)
      .where(eq(courseVideos.courseId, courseId))
      .orderBy(courseVideos.orderIndex);
  }

  async createCourseVideo(videoData: InsertCourseVideo): Promise<CourseVideo> {
    const [video] = await db
      .insert(courseVideos)
      .values(videoData as any)
      .returning();
    return video;
  }

  // Course Video Completions operations
  async getCourseVideoCompletions(userId: string, courseId: string): Promise<CourseVideoCompletion[]> {
    // Get all completions for this user where videoId starts with courseId
    // (Since courses are frontend-only, we use videoId pattern matching)
    return await db
      .select()
      .from(courseVideoCompletions)
      .where(and(
        eq(courseVideoCompletions.userId, userId),
        sql`${courseVideoCompletions.videoId} LIKE ${courseId + '-%'}`
      ));
  }

  async toggleVideoCompletion(userId: string, videoId: string): Promise<{ completed: boolean }> {
    // Check if completion already exists
    const [existing] = await db
      .select()
      .from(courseVideoCompletions)
      .where(and(
        eq(courseVideoCompletions.userId, userId),
        eq(courseVideoCompletions.videoId, videoId)
      ));

    if (existing) {
      // Delete completion (uncomplete)
      await db
        .delete(courseVideoCompletions)
        .where(and(
          eq(courseVideoCompletions.userId, userId),
          eq(courseVideoCompletions.videoId, videoId)
        ));
      return { completed: false };
    } else {
      // Create completion (complete)
      await db
        .insert(courseVideoCompletions)
        .values({ userId, videoId } as any);
      return { completed: true };
    }
  }

  // Rating Progression operations
  async getRatingProgression(userId: string): Promise<RatingProgression | undefined> {
    const [progression] = await db
      .select()
      .from(ratingProgression)
      .where(eq(ratingProgression.userId, userId));
    return progression;
  }

  async upsertRatingProgression(userId: string, progressionData: Partial<InsertRatingProgression>): Promise<RatingProgression> {
    const existing = await this.getRatingProgression(userId);
    
    if (existing) {
      return await this.updateRatingProgression(userId, progressionData);
    } else {
      const [progression] = await db
        .insert(ratingProgression)
        .values({ userId, ...progressionData } as any)
        .returning();
      return progression;
    }
  }

  async updateRatingProgression(userId: string, progressionData: Partial<InsertRatingProgression>): Promise<RatingProgression> {
    const [progression] = await db
      .update(ratingProgression)
      .set({ ...progressionData, updatedAt: new Date() } as any)
      .where(eq(ratingProgression.userId, userId))
      .returning();
    return progression;
  }

  // Admin Analytics operations
  async getUserDashboardData(userId: string) {
    const user = await this.getUser(userId);
    const allWeeks = await this.getHercmWeeksByUser(userId);
    const currentWeek = allWeeks.length > 0 ? allWeeks[0] : undefined;
    const platinumProgress = await this.getPlatinumProgress(userId);
    const completedLessons = await db
      .select()
      .from(courseVideoCompletions)
      .where(eq(courseVideoCompletions.userId, userId));
    
    // Get user's rituals
    const userRituals = await this.getRitualsByUser(userId);
    
    // Get today's ritual completions
    const today = new Date().toISOString().split('T')[0];
    const todayCompletions = await this.getRitualCompletionsByDate(userId, today);
    
    // Platinum badges from platinum progress (if achieved)
    const userPlatinumBadges: any[] = [];
    if (platinumProgress?.achievedAt) {
      userPlatinumBadges.push({
        id: platinumProgress.id,
        badgeName: 'Platinum Standards',
        achievedAt: platinumProgress.achievedAt,
        userId: platinumProgress.userId,
      });
    }

    return {
      user,
      currentWeek,
      allWeeks,
      platinumProgress,
      completedLessons,
      rituals: userRituals,
      todayCompletions,
      platinumBadges: userPlatinumBadges,
    };
  }

  async getUserAnalytics(userId: string, period: 'weekly' | 'monthly' | 'yearly') {
    const weeks = await this.getHercmWeeksByUser(userId);
    const completedLessons = await db
      .select()
      .from(courseVideoCompletions)
      .where(eq(courseVideoCompletions.userId, userId));
    const platinumProgress = await this.getPlatinumProgress(userId);

    // Filter weeks based on period
    const now = new Date();
    const filteredWeeks = weeks.filter(week => {
      if (!week.createdAt) return false;
      const weekDate = new Date(week.createdAt);
      if (period === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekDate >= weekAgo;
      } else if (period === 'monthly') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return weekDate >= monthAgo;
      } else {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return weekDate >= yearAgo;
      }
    });

    // Calculate ratings over time
    const ratings = filteredWeeks.map(week => ({
      date: week.createdAt?.toISOString() || '',
      health: week.currentH || 0,
      relationship: week.currentE || 0,
      career: week.currentR || 0,
      money: week.currentC || 0,
    }));

    // Calculate average ratings
    const avgHealth = filteredWeeks.reduce((sum, w) => sum + (w.currentH || 0), 0) / (filteredWeeks.length || 1);
    const avgRelationship = filteredWeeks.reduce((sum, w) => sum + (w.currentE || 0), 0) / (filteredWeeks.length || 1);
    const avgCareer = filteredWeeks.reduce((sum, w) => sum + (w.currentR || 0), 0) / (filteredWeeks.length || 1);
    const avgMoney = filteredWeeks.reduce((sum, w) => sum + (w.currentC || 0), 0) / (filteredWeeks.length || 1);

    return {
      ratings,
      courseProgress: {
        total: 100, // Placeholder - calculate from course data
        completed: completedLessons.length,
      },
      averageRatings: {
        health: Math.round(avgHealth * 10) / 10,
        relationship: Math.round(avgRelationship * 10) / 10,
        career: Math.round(avgCareer * 10) / 10,
        money: Math.round(avgMoney * 10) / 10,
      },
      platinumStatus: {
        achieved: platinumProgress?.platinumAchieved || false,
        weeksAtEight: 0, // This would need to be calculated from rating progression
      },
    };
  }

  async getTeamAnalytics(period: 'weekly' | 'monthly' | 'yearly') {
    // Get approved emails
    const approvedEmailsList = await db.select().from(approvedEmails).where(eq(approvedEmails.status, 'active'));
    const approvedEmailSet = new Set(approvedEmailsList.map(ae => ae.email));
    
    // Get all users and filter by approved emails
    const allUsers = await this.getAllUsers();
    const approvedUsers = allUsers.filter(u => approvedEmailSet.has(u.email));
    const totalUsers = approvedUsers.length;
    
    // Get both user IDs and emails from approved users (some weeks use email as userId)
    const approvedUserIds = new Set(approvedUsers.map(u => u.id));
    const approvedUserEmails = new Set(approvedUsers.map(u => u.email));

    // Get all weeks for approved users only (match by ID OR email)
    const allWeeksData = await db.select().from(hercmWeeks);
    const approvedWeeksData = allWeeksData.filter(w => 
      approvedUserIds.has(w.userId) || approvedUserEmails.has(w.userId)
    );

    // Filter based on period
    const now = new Date();
    const filteredWeeks = approvedWeeksData.filter(week => {
      if (!week.createdAt) return false;
      const weekDate = new Date(week.createdAt);
      if (period === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return weekDate >= weekAgo;
      } else if (period === 'monthly') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return weekDate >= monthAgo;
      } else {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return weekDate >= yearAgo;
      }
    });

    // Calculate active users (ALL approved users with active status, regardless of data)
    const activeUsers = approvedUsers.length;  // All approved users are active

    // Calculate average ratings across all users
    const avgHealth = filteredWeeks.reduce((sum, w) => sum + (w.currentH || 0), 0) / (filteredWeeks.length || 1);
    const avgRelationship = filteredWeeks.reduce((sum, w) => sum + (w.currentE || 0), 0) / (filteredWeeks.length || 1);
    const avgCareer = filteredWeeks.reduce((sum, w) => sum + (w.currentR || 0), 0) / (filteredWeeks.length || 1);
    const avgMoney = filteredWeeks.reduce((sum, w) => sum + (w.currentC || 0), 0) / (filteredWeeks.length || 1);

    // Calculate growth metrics (only for approved users)
    const newUsers = approvedUsers.filter(u => {
      if (!u.createdAt) return false;
      const userDate = new Date(u.createdAt);
      if (period === 'weekly') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return userDate >= weekAgo;
      } else if (period === 'monthly') {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return userDate >= monthAgo;
      } else {
        const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        return userDate >= yearAgo;
      }
    }).length;

    // Calculate top performers (only approved users)
    const userAverages = new Map<string, { total: number; count: number; email: string; firstName: string; lastName: string }>();
    for (const week of filteredWeeks) {
      const avg = ((week.currentH || 0) + (week.currentE || 0) + (week.currentR || 0) + (week.currentC || 0)) / 4;
      const existing = userAverages.get(week.userId) || { total: 0, count: 0, email: '', firstName: '', lastName: '' };
      // Match by ID OR email (handles both userId formats)
      const user = approvedUsers.find(u => u.id === week.userId || u.email === week.userId);
      userAverages.set(week.userId, {
        total: existing.total + avg,
        count: existing.count + 1,
        email: user?.email || week.userId,
        firstName: user?.firstName || '',
        lastName: user?.lastName || '',
      });
    }

    const topPerformers = Array.from(userAverages.entries())
      .map(([userId, data]) => ({
        userId,
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        averageRating: Math.round((data.total / data.count) * 10) / 10,
      }))
      .filter(p => p.averageRating > 0)  // Only show users with actual ratings
      .sort((a, b) => b.averageRating - a.averageRating)
      .slice(0, 5);  // Top 5 performers only

    return {
      totalUsers,
      activeUsers,
      averageRatings: {
        health: Math.round(avgHealth * 10) / 10,
        relationship: Math.round(avgRelationship * 10) / 10,
        career: Math.round(avgCareer * 10) / 10,
        money: Math.round(avgMoney * 10) / 10,
      },
      growthMetrics: {
        newUsers,
        percentChange: totalUsers > 0 ? Math.round((newUsers / totalUsers) * 100) : 0,
      },
      topPerformers,
      completionRates: {
        courses: 0, // Placeholder
        rituals: 0, // Placeholder
      },
    };
  }

  // Admin Course Recommendations operations
  async addCourseRecommendation(recommendation: InsertAdminCourseRecommendation): Promise<AdminCourseRecommendation> {
    const [rec] = await db
      .insert(adminCourseRecommendations)
      .values(recommendation as any)
      .returning();
    return rec;
  }

  async getUserRecommendations(userId: string): Promise<AdminCourseRecommendation[]> {
    return await db
      .select()
      .from(adminCourseRecommendations)
      .where(eq(adminCourseRecommendations.userId, userId))
      .orderBy(desc(adminCourseRecommendations.createdAt));
  }

  async getAllCourseRecommendations(): Promise<any[]> {
    const recs = await db
      .select({
        id: adminCourseRecommendations.id,
        userId: adminCourseRecommendations.userId,
        adminId: adminCourseRecommendations.adminId,
        hrcmArea: adminCourseRecommendations.hrcmArea,
        courseId: adminCourseRecommendations.courseId,
        courseName: adminCourseRecommendations.courseName,
        lessonId: adminCourseRecommendations.lessonId,
        lessonName: adminCourseRecommendations.lessonName,
        lessonUrl: adminCourseRecommendations.lessonUrl,
        reason: adminCourseRecommendations.reason,
        status: adminCourseRecommendations.status,
        createdAt: adminCourseRecommendations.createdAt,
        userEmail: users.email,
      })
      .from(adminCourseRecommendations)
      .leftJoin(users, eq(adminCourseRecommendations.userId, users.id))
      .orderBy(desc(adminCourseRecommendations.createdAt));
    return recs;
  }

  async updateRecommendationStatus(id: string, status: string): Promise<AdminCourseRecommendation> {
    const [rec] = await db
      .update(adminCourseRecommendations)
      .set({ status } as any)
      .where(eq(adminCourseRecommendations.id, id))
      .returning();
    return rec;
  }

  async deleteRecommendation(id: string): Promise<void> {
    await db
      .delete(adminCourseRecommendations)
      .where(eq(adminCourseRecommendations.id, id));
  }

  async deleteAllRecommendations(): Promise<void> {
    await db.delete(adminCourseRecommendations);
  }

  // Platinum Standards operations
  async getAllPlatinumStandards(): Promise<PlatinumStandard[]> {
    return await db
      .select()
      .from(platinumStandards)
      .orderBy(platinumStandards.category, platinumStandards.orderIndex);
  }

  async getActivePlatinumStandards(): Promise<PlatinumStandard[]> {
    return await db
      .select()
      .from(platinumStandards)
      .where(eq(platinumStandards.isActive, true))
      .orderBy(platinumStandards.category, platinumStandards.orderIndex);
  }

  async getPlatinumStandardsByCategory(category: string): Promise<PlatinumStandard[]> {
    return await db
      .select()
      .from(platinumStandards)
      .where(and(
        eq(platinumStandards.category, category),
        eq(platinumStandards.isActive, true)
      ))
      .orderBy(platinumStandards.orderIndex);
  }

  async addPlatinumStandard(standard: InsertPlatinumStandard): Promise<PlatinumStandard> {
    const [newStandard] = await db
      .insert(platinumStandards)
      .values({
        ...standard,
        updatedAt: new Date(),
      })
      .returning();
    return newStandard;
  }

  async updatePlatinumStandard(id: string, standard: Partial<InsertPlatinumStandard>): Promise<PlatinumStandard> {
    const [updated] = await db
      .update(platinumStandards)
      .set({
        ...standard,
        updatedAt: new Date(),
      })
      .where(eq(platinumStandards.id, id))
      .returning();
    return updated;
  }

  async deletePlatinumStandard(id: string): Promise<void> {
    await db
      .delete(platinumStandards)
      .where(eq(platinumStandards.id, id));
  }

  async reorderPlatinumStandards(updates: Array<{ id: string; orderIndex: number }>): Promise<void> {
    // Update each standard's order index
    for (const update of updates) {
      await db
        .update(platinumStandards)
        .set({ 
          orderIndex: update.orderIndex,
          updatedAt: new Date(),
        })
        .where(eq(platinumStandards.id, update.id));
    }
  }
}

export const storage = new DatabaseStorage();
