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
  userPlatinumStandardRatings,
  userHrcmUnlockProgress,
  emotionalTrackers,
  userPersistentAssignments,
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
  type UserPlatinumStandardRating,
  type InsertUserPlatinumStandardRating,
  type UserHrcmUnlockProgress,
  type InsertUserHrcmUnlockProgress,
  type EmotionalTracker,
  type InsertEmotionalTracker,
  type UserPersistentAssignment,
  type InsertUserPersistentAssignment,
  userFeedback,
  type UserFeedback,
  type InsertUserFeedback,
  nextWeekSnapshots,
  type NextWeekSnapshot,
  type InsertNextWeekSnapshot,
  gratitudeJournals,
  type GratitudeJournal,
  type InsertGratitudeJournal,
  gratitudePosts,
  type GratitudePost,
  type InsertGratitudePost,
  goalsAffirmations,
  type GoalAffirmation,
  type InsertGoalAffirmation,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, asc, and, or, count, sql, gte, lte, offset } from "drizzle-orm";

export interface IStorage {
  // User operations (Required for Replit Auth)
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserCourseSheet(userId: string, sheetUrl: string): Promise<User>;
  
  // HERCM Week operations
  getHercmWeek(userId: string, weekNumber: number): Promise<HercmWeek | undefined>;
  getHercmWeekByDate(userId: string, weekNumber: number, dateString: string): Promise<HercmWeek | undefined>;
  getHercmWeekById(id: string): Promise<HercmWeek | undefined>;
  getHercmWeeksByUser(userId: string): Promise<HercmWeek[]>;
  createHercmWeek(week: InsertHercmWeek): Promise<HercmWeek>;
  updateHercmWeek(id: string, week: Partial<InsertHercmWeek>): Promise<HercmWeek>;
  
  // Platinum Progress operations
  getPlatinumProgress(userId: string): Promise<PlatinumProgress | undefined>;
  createPlatinumProgress(progress: InsertPlatinumProgress): Promise<PlatinumProgress>;
  updatePlatinumProgress(userId: string, progress: Partial<InsertPlatinumProgress>): Promise<PlatinumProgress>;
  upsertPlatinumProgress(progress: InsertPlatinumProgress): Promise<PlatinumProgress>;
  addPointsToUser(userId: string, points: number): Promise<void>;
  
  // Approved Emails operations
  getApprovedEmail(email: string): Promise<ApprovedEmail | undefined>;
  getApprovedEmailById(id: string): Promise<ApprovedEmail | undefined>;
  getAllApprovedEmails(): Promise<ApprovedEmail[]>;
  addApprovedEmail(email: InsertApprovedEmail): Promise<ApprovedEmail>;
  bulkAddApprovedEmails(entries: Array<{ email: string; name?: string }>): Promise<ApprovedEmail[]>;
  deleteApprovedEmail(id: string): Promise<void>;
  deleteAllUserData(userEmail: string): Promise<void>;
  updateApprovedEmail(id: string, data: { email: string; name?: string | null; status: string }): Promise<void>;
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
  seedDefaultRituals(userId: string): Promise<void>;
  
  // Ritual Completions operations
  getAllRitualCompletions(userId: string): Promise<RitualCompletion[]>;
  getRitualCompletionsByDate(userId: string, date: string): Promise<RitualCompletion[]>;
  getRitualCompletionsByDateRange(userId: string, startDate: string, endDate: string): Promise<RitualCompletion[]>;
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
  getAllCourseVideoCompletions(userId: string): Promise<CourseVideoCompletion[]>;
  toggleVideoCompletion(userId: string, videoId: string): Promise<{ completed: boolean }>;
  markLessonComplete(userId: string, lessonId: string): Promise<void>;
  markLessonIncomplete(userId: string, lessonId: string): Promise<void>;
  getUserLessonCompletions(userId: string): Promise<Set<string>>;
  
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
    allRitualCompletions: RitualCompletion[];
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
  getPlatinumStandardById(id: string): Promise<PlatinumStandard | undefined>;
  getAllPlatinumStandardsByCategory(category: string): Promise<PlatinumStandard[]>;
  getPlatinumStandardsByCategory(category: string): Promise<PlatinumStandard[]>;
  addPlatinumStandard(standard: InsertPlatinumStandard): Promise<PlatinumStandard>;
  updatePlatinumStandard(id: string, standard: Partial<InsertPlatinumStandard>): Promise<PlatinumStandard>;
  deletePlatinumStandard(id: string): Promise<void>;
  reorderPlatinumStandards(updates: Array<{ id: string; orderIndex: number }>): Promise<void>;
  
  // User Platinum Standard Ratings operations
  getUserPlatinumStandardRatingsByDate(userId: string, dateString: string): Promise<UserPlatinumStandardRating[]>;
  upsertPlatinumStandardRating(rating: InsertUserPlatinumStandardRating): Promise<UserPlatinumStandardRating>;
  
  // HRCM Unlock Progress operations
  getHrcmUnlockProgress(userId: string, hrcmArea: string): Promise<UserHrcmUnlockProgress | undefined>;
  upsertHrcmUnlockProgress(progress: InsertUserHrcmUnlockProgress): Promise<UserHrcmUnlockProgress>;
  calculateUnlockStatus(userId: string, hrcmArea: string, dateString: string): Promise<UserHrcmUnlockProgress>;
  
  // Emotional Tracker operations
  getEmotionalTrackersByDate(userId: string, date: string): Promise<EmotionalTracker[]>;
  upsertEmotionalTracker(tracker: InsertEmotionalTracker): Promise<EmotionalTracker>;
  deleteEmotionalTracker(id: string, userId: string): Promise<void>;
  
  // User Persistent Assignment operations
  getUserPersistentAssignments(userId: string): Promise<UserPersistentAssignment[]>;
  addPersistentAssignment(assignment: InsertUserPersistentAssignment): Promise<UserPersistentAssignment>;
  togglePersistentAssignmentCompletion(id: string, userId: string): Promise<UserPersistentAssignment>;
  updateCustomAssignment(id: string, userId: string, customText: string): Promise<UserPersistentAssignment>;
  deletePersistentAssignment(id: string, userId: string): Promise<void>;
  deleteCompletedAssignments(userId: string): Promise<void>;
  deleteAllPersistentAssignments(userId: string): Promise<void>;
  
  // User Feedback operations
  getAllFeedback(): Promise<UserFeedback[]>;
  getUserFeedback(userId: string): Promise<UserFeedback[]>;
  createFeedback(feedback: InsertUserFeedback): Promise<UserFeedback>;
  updateFeedbackStatus(id: string, status: string, adminResponse?: string, priority?: string): Promise<UserFeedback>;
  deleteFeedback(id: string): Promise<void>;
  clearAllFeedback(): Promise<void>;
  
  // Next Week Snapshot operations - Friday continuity system
  getActiveSnapshot(userId: string): Promise<NextWeekSnapshot | undefined>;
  getSnapshotByDate(userId: string, date: string): Promise<NextWeekSnapshot | undefined>;
  createSnapshot(snapshot: InsertNextWeekSnapshot): Promise<NextWeekSnapshot>;
  archiveSnapshot(id: string): Promise<void>;
  archiveAllUserSnapshots(userId: string): Promise<void>;
  
  // Gratitude Posts operations - Shared feed
  getGratitudePosts(limit?: number): Promise<GratitudePost[]>;
  getArchivedPosts(limit?: number, offset?: number): Promise<GratitudePost[]>;
  getArchivedPostsCount(): Promise<number>;
  archiveOldPosts(): Promise<number>;
  createGratitudePost(post: InsertGratitudePost): Promise<GratitudePost>;
  deleteGratitudePost(id: string, userId: string): Promise<void>;
  
  // Goals & Affirmations operations
  getGoalsAffirmations(userId: string): Promise<GoalAffirmation[]>;
  createGoalAffirmation(goal: InsertGoalAffirmation): Promise<GoalAffirmation>;
  toggleGoalCompletion(id: string, userId: string): Promise<GoalAffirmation>;
  deleteGoalAffirmation(id: string, userId: string): Promise<void>;
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
    // Get ALL snapshots for this week number and pick the BEST one
    const allWeeks = await db
      .select()
      .from(hercmWeeks)
      .where(and(
        eq(hercmWeeks.userId, userId),
        eq(hercmWeeks.weekNumber, weekNumber)
      ))
      .orderBy(desc(hercmWeeks.createdAt));
    
    if (allWeeks.length === 0) return undefined;
    
    // Calculate completeness score for each entry
    const calculateCompleteness = (week: HercmWeek): number => {
      let score = 0;
      // Score based on checklist data presence AND unifiedAssignment
      if (week.healthChecklist && Array.isArray(week.healthChecklist) && week.healthChecklist.length > 0) score += 10;
      if (week.relationshipChecklist && Array.isArray(week.relationshipChecklist) && week.relationshipChecklist.length > 0) score += 10;
      if (week.careerChecklist && Array.isArray(week.careerChecklist) && week.careerChecklist.length > 0) score += 10;
      if (week.moneyChecklist && Array.isArray(week.moneyChecklist) && week.moneyChecklist.length > 0) score += 10;
      if (week.unifiedAssignment && Array.isArray(week.unifiedAssignment) && week.unifiedAssignment.length > 0) score += 10;
      
      // Prefer NEWER data - timestamp is now primary tiebreaker
      // Divide by smaller number so timestamp weighs more (max ~1.7 vs max 50 from checklists+assignment)
      score += week.createdAt ? new Date(week.createdAt).getTime() / 10000000000000 : 0;
      return score;
    };
    
    // Find the entry with the highest completeness score
    let bestWeek = allWeeks[0];
    let bestScore = calculateCompleteness(bestWeek);
    
    for (const week of allWeeks) {
      const score = calculateCompleteness(week);
      if (score > bestScore) {
        bestWeek = week;
        bestScore = score;
      }
    }
    
    return bestWeek;
  }

  // Get HRCM week by userId, weekNumber AND dateString (for daily auto-copy fix)
  async getHercmWeekByDate(userId: string, weekNumber: number, dateString: string): Promise<HercmWeek | undefined> {
    const [week] = await db
      .select()
      .from(hercmWeeks)
      .where(and(
        eq(hercmWeeks.userId, userId),
        eq(hercmWeeks.weekNumber, weekNumber),
        eq(hercmWeeks.dateString, dateString)
      ))
      .orderBy(desc(hercmWeeks.createdAt));
    return week;
  }

  async getHercmWeekById(id: string): Promise<HercmWeek | undefined> {
    const [week] = await db
      .select()
      .from(hercmWeeks)
      .where(eq(hercmWeeks.id, id));
    return week;
  }

  // Get ALL weeks for a user with date strings (no deduplication by week number)
  async getAllHercmWeeksByUserWithDates(userId: string): Promise<any[]> {
    // Use stored dateString column (in LOCAL timezone) instead of computing from createdAt (UTC)
    // This fixes timezone bugs where IST users saw blank tables after refresh
    const allWeeks = await db
      .select()
      .from(hercmWeeks)
      .where(eq(hercmWeeks.userId, userId))
      .orderBy(desc(hercmWeeks.createdAt));
    
    return allWeeks;
  }

  async getHercmWeeksByUser(userId: string): Promise<any[]> {
    // Get ALL weeks and then filter to latest per week number
    // Use stored dateString column (in LOCAL timezone) instead of computing from createdAt (UTC)
    const allWeeks = await db
      .select()
      .from(hercmWeeks)
      .where(eq(hercmWeeks.userId, userId))
      .orderBy(desc(hercmWeeks.createdAt));
    
    // Keep only the BEST entry for each week number
    // Score each entry based on completeness (prefer more complete data)
    const weekMap = new Map<number, any>();
    
    const calculateCompleteness = (week: any): number => {
      let score = 0;
      const hasHealthChecklist = week.healthChecklist && Array.isArray(week.healthChecklist) && week.healthChecklist.length > 0;
      const hasRelationshipChecklist = week.relationshipChecklist && Array.isArray(week.relationshipChecklist) && week.relationshipChecklist.length > 0;
      const hasCareerChecklist = week.careerChecklist && Array.isArray(week.careerChecklist) && week.careerChecklist.length > 0;
      const hasMoneyChecklist = week.moneyChecklist && Array.isArray(week.moneyChecklist) && week.moneyChecklist.length > 0;
      const hasUnifiedAssignment = week.unifiedAssignment && Array.isArray(week.unifiedAssignment) && week.unifiedAssignment.length > 0;
      
      // CRITICAL: Also check CHECKPOINT data (Current Week checkpoints)
      const hasHealthProblemsChecklist = week.healthProblemsChecklist && Array.isArray(week.healthProblemsChecklist) && week.healthProblemsChecklist.length > 0;
      const hasHealthFeelingsCurrentChecklist = week.healthFeelingsCurrentChecklist && Array.isArray(week.healthFeelingsCurrentChecklist) && week.healthFeelingsCurrentChecklist.length > 0;
      const hasHealthBeliefsCurrentChecklist = week.healthBeliefsCurrentChecklist && Array.isArray(week.healthBeliefsCurrentChecklist) && week.healthBeliefsCurrentChecklist.length > 0;
      const hasHealthActionsCurrentChecklist = week.healthActionsCurrentChecklist && Array.isArray(week.healthActionsCurrentChecklist) && week.healthActionsCurrentChecklist.length > 0;
      
      const hasRelationshipProblemsChecklist = week.relationshipProblemsChecklist && Array.isArray(week.relationshipProblemsChecklist) && week.relationshipProblemsChecklist.length > 0;
      const hasRelationshipFeelingsCurrentChecklist = week.relationshipFeelingsCurrentChecklist && Array.isArray(week.relationshipFeelingsCurrentChecklist) && week.relationshipFeelingsCurrentChecklist.length > 0;
      const hasRelationshipBeliefsCurrentChecklist = week.relationshipBeliefsCurrentChecklist && Array.isArray(week.relationshipBeliefsCurrentChecklist) && week.relationshipBeliefsCurrentChecklist.length > 0;
      const hasRelationshipActionsCurrentChecklist = week.relationshipActionsCurrentChecklist && Array.isArray(week.relationshipActionsCurrentChecklist) && week.relationshipActionsCurrentChecklist.length > 0;
      
      const hasCareerProblemsChecklist = week.careerProblemsChecklist && Array.isArray(week.careerProblemsChecklist) && week.careerProblemsChecklist.length > 0;
      const hasCareerFeelingsCurrentChecklist = week.careerFeelingsCurrentChecklist && Array.isArray(week.careerFeelingsCurrentChecklist) && week.careerFeelingsCurrentChecklist.length > 0;
      const hasCareerBeliefsCurrentChecklist = week.careerBeliefsCurrentChecklist && Array.isArray(week.careerBeliefsCurrentChecklist) && week.careerBeliefsCurrentChecklist.length > 0;
      const hasCareerActionsCurrentChecklist = week.careerActionsCurrentChecklist && Array.isArray(week.careerActionsCurrentChecklist) && week.careerActionsCurrentChecklist.length > 0;
      
      const hasMoneyProblemsChecklist = week.moneyProblemsChecklist && Array.isArray(week.moneyProblemsChecklist) && week.moneyProblemsChecklist.length > 0;
      const hasMoneyFeelingsCurrentChecklist = week.moneyFeelingsCurrentChecklist && Array.isArray(week.moneyFeelingsCurrentChecklist) && week.moneyFeelingsCurrentChecklist.length > 0;
      const hasMoneyBeliefsCurrentChecklist = week.moneyBeliefsCurrentChecklist && Array.isArray(week.moneyBeliefsCurrentChecklist) && week.moneyBeliefsCurrentChecklist.length > 0;
      const hasMoneyActionsCurrentChecklist = week.moneyActionsCurrentChecklist && Array.isArray(week.moneyActionsCurrentChecklist) && week.moneyActionsCurrentChecklist.length > 0;
      
      // Score based on checklist data presence AND unifiedAssignment AND checkpoint data
      if (hasHealthChecklist) score += 10;
      if (hasRelationshipChecklist) score += 10;
      if (hasCareerChecklist) score += 10;
      if (hasMoneyChecklist) score += 10;
      if (hasUnifiedAssignment) score += 10;  // Add 10 points for having assignment data
      
      // Add 5 points per checkpoint field (checkpoint data is valuable!)
      if (hasHealthProblemsChecklist) score += 5;
      if (hasHealthFeelingsCurrentChecklist) score += 5;
      if (hasHealthBeliefsCurrentChecklist) score += 5;
      if (hasHealthActionsCurrentChecklist) score += 5;
      if (hasRelationshipProblemsChecklist) score += 5;
      if (hasRelationshipFeelingsCurrentChecklist) score += 5;
      if (hasRelationshipBeliefsCurrentChecklist) score += 5;
      if (hasRelationshipActionsCurrentChecklist) score += 5;
      if (hasCareerProblemsChecklist) score += 5;
      if (hasCareerFeelingsCurrentChecklist) score += 5;
      if (hasCareerBeliefsCurrentChecklist) score += 5;
      if (hasCareerActionsCurrentChecklist) score += 5;
      if (hasMoneyProblemsChecklist) score += 5;
      if (hasMoneyFeelingsCurrentChecklist) score += 5;
      if (hasMoneyBeliefsCurrentChecklist) score += 5;
      if (hasMoneyActionsCurrentChecklist) score += 5;
      
      // Prefer NEWER data - timestamp is now primary tiebreaker
      // Divide by smaller number so timestamp weighs more (max ~1.7 vs max 130 from checklists+assignment+checkpoints)
      score += week.createdAt ? new Date(week.createdAt).getTime() / 10000000000000 : 0;
      
      return score;
    };
    
    for (const week of allWeeks) {
      if (!weekMap.has(week.weekNumber)) {
        weekMap.set(week.weekNumber, week);
      } else {
        const existing = weekMap.get(week.weekNumber)!;
        const existingScore = calculateCompleteness(existing);
        const newScore = calculateCompleteness(week);
        
        // Replace if new entry has higher completeness score
        if (newScore > existingScore) {
          weekMap.set(week.weekNumber, week);
        }
      }
    }
    
    // Convert back to array, sorted by week number descending
    return Array.from(weekMap.values()).sort((a, b) => b.weekNumber - a.weekNumber);
  }

  async createHercmWeek(weekData: InsertHercmWeek): Promise<HercmWeek> {
    // AUTO-SET dateString using LOCAL date (not UTC) to fix timezone bugs
    // This ensures admin and user views always match the correct date
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const localDateString = `${year}-${month}-${day}`;
    
    const [week] = await db
      .insert(hercmWeeks)
      .values({ ...weekData, dateString: localDateString } as any)
      .returning();
    return week;
  }

  async updateHercmWeek(id: string, weekData: Partial<InsertHercmWeek>): Promise<HercmWeek> {
    // CRITICAL FIX: ALLOW dateString update to reflect when data was last edited
    // When user edits Nov 5 data, dateString should be Nov 5 (not preserved from old date)
    // This ensures data filled on Nov 5 appears on Nov 5 after refresh
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

  async addPointsToUser(userId: string, points: number): Promise<void> {
    // Get or create platinum progress
    let progress = await this.getPlatinumProgress(userId);
    
    if (!progress) {
      // Create initial progress record
      progress = await this.createPlatinumProgress({
        userId,
        totalPoints: points,
        currentStreak: 0,
        badges: [],
        platinumAchieved: false,
      });
    } else {
      // Update existing progress
      const newTotalPoints = Math.max(0, (progress.totalPoints || 0) + points);
      await db
        .update(platinumProgress)
        .set({ 
          totalPoints: newTotalPoints,
          updatedAt: new Date()
        })
        .where(eq(platinumProgress.userId, userId));
    }
  }

  // User by email (case-insensitive)
  async getUserByEmail(email: string): Promise<User | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const [user] = await db.select().from(users).where(sql`LOWER(${users.email}) = ${normalizedEmail}`);
    return user;
  }

  // Approved Emails operations (case-insensitive)
  async getApprovedEmail(email: string): Promise<ApprovedEmail | undefined> {
    const normalizedEmail = email.toLowerCase().trim();
    const [approvedEmail] = await db
      .select()
      .from(approvedEmails)
      .where(sql`LOWER(${approvedEmails.email}) = ${normalizedEmail}`);
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

  async bulkAddApprovedEmails(entries: Array<{ email: string; name?: string }>): Promise<ApprovedEmail[]> {
    const values = entries.map(entry => ({
      email: entry.email,
      name: entry.name || null,
      status: 'active' as const,
    }));

    // Use UPSERT to merge duplicates by email
    const results = await db
      .insert(approvedEmails)
      .values(values)
      .onConflictDoUpdate({
        target: approvedEmails.email,
        set: {
          name: sql`COALESCE(EXCLUDED.name, ${approvedEmails.name})`, // Keep new name if provided, else keep old
          updatedAt: sql`CURRENT_TIMESTAMP`,
        }
      })
      .returning();
    
    return results;
  }

  async getApprovedEmailById(id: string): Promise<ApprovedEmail | undefined> {
    const [approvedEmail] = await db
      .select()
      .from(approvedEmails)
      .where(eq(approvedEmails.id, id));
    return approvedEmail;
  }

  async deleteApprovedEmail(id: string): Promise<void> {
    await db
      .delete(approvedEmails)
      .where(eq(approvedEmails.id, id));
  }

  async deleteAllUserData(userEmail: string): Promise<void> {
    console.log(`[CASCADE DELETE] Starting deletion for user: ${userEmail}`);
    
    // Get the user record
    const user = await this.getUserByEmail(userEmail);
    if (!user) {
      console.log(`[CASCADE DELETE] No user found for email: ${userEmail}`);
      return;
    }
    
    const userId = user.id;
    console.log(`[CASCADE DELETE] Found userId: ${userId} for email: ${userEmail}`);
    
    // Delete from all tables in order
    // 1. Delete HERCM weeks
    await db.delete(hercmWeeks).where(eq(hercmWeeks.userId, userId));
    console.log(`[CASCADE DELETE] Deleted HERCM weeks`);
    
    // 2. Delete ritual completions
    await db.delete(ritualCompletions).where(eq(ritualCompletions.userId, userId));
    console.log(`[CASCADE DELETE] Deleted ritual completions`);
    
    // 3. Delete rituals
    await db.delete(rituals).where(eq(rituals.userId, userId));
    console.log(`[CASCADE DELETE] Deleted rituals`);
    
    // 4. Delete course video completions
    await db.delete(courseVideoCompletions).where(eq(courseVideoCompletions.userId, userId));
    console.log(`[CASCADE DELETE] Deleted course video completions`);
    
    // 5. Delete courses
    await db.delete(courses).where(eq(courses.userId, userId));
    console.log(`[CASCADE DELETE] Deleted courses`);
    
    // 6. Delete emotional trackers
    await db.delete(emotionalTrackers).where(eq(emotionalTrackers.userId, userId));
    console.log(`[CASCADE DELETE] Deleted emotional trackers`);
    
    // 7. Delete course recommendations (where user is recipient OR where user is the admin who created them)
    await db.delete(adminCourseRecommendations).where(
      or(
        eq(adminCourseRecommendations.userId, userId),
        eq(adminCourseRecommendations.adminId, userId)
      )
    );
    console.log(`[CASCADE DELETE] Deleted course recommendations`);
    
    // 8. Delete platinum progress
    await db.delete(platinumProgress).where(eq(platinumProgress.userId, userId));
    console.log(`[CASCADE DELETE] Deleted platinum progress`);
    
    // 9. Delete rating progression
    await db.delete(ratingProgression).where(eq(ratingProgression.userId, userId));
    console.log(`[CASCADE DELETE] Deleted rating progressions`);
    
    // 10. Delete user persistent assignments
    await db.delete(userPersistentAssignments).where(eq(userPersistentAssignments.userId, userId));
    console.log(`[CASCADE DELETE] Deleted user persistent assignments`);
    
    // 11. Delete user feedback
    await db.delete(userFeedback).where(eq(userFeedback.userId, userId));
    console.log(`[CASCADE DELETE] Deleted user feedback submissions`);
    
    // 12. Finally, delete the user record itself
    await db.delete(users).where(eq(users.id, userId));
    console.log(`[CASCADE DELETE] Deleted user record`);
    
    console.log(`[CASCADE DELETE] Successfully completed deletion for user: ${userEmail}`);
  }

  async updateApprovedEmail(id: string, data: { email: string; name?: string | null; status: string }): Promise<void> {
    await db
      .update(approvedEmails)
      .set({ 
        email: data.email,
        name: data.name !== undefined ? data.name : undefined,
        status: data.status,
        updatedAt: new Date()
      })
      .where(eq(approvedEmails.id, id));
  }

  async deleteAllApprovedEmails(): Promise<void> {
    await db.delete(approvedEmails);
  }

  async incrementAccessCount(email: string): Promise<void> {
    const normalizedEmail = email.toLowerCase().trim();
    await db
      .update(approvedEmails)
      .set({ 
        accessCount: sql`${approvedEmails.accessCount} + 1`,
        lastAccessAt: new Date(),
        updatedAt: new Date()
      } as any)
      .where(sql`LOWER(${approvedEmails.email}) = ${normalizedEmail}`);
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

    // Count failed login attempts from access logs
    const failedAttemptsResult = await db
      .select({ count: count() })
      .from(accessLogs)
      .where(eq(accessLogs.status, 'failed'));

    return {
      totalUsers: totalUsersResult[0]?.count || 0,
      activeUsers: activeUsersResult[0]?.count || 0,
      totalAccess,
      failedAttempts: failedAttemptsResult[0]?.count || 0,
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
    const normalizedEmail = email.toLowerCase().trim();
    const [admin] = await db
      .select()
      .from(adminUsers)
      .where(sql`LOWER(${adminUsers.email}) = ${normalizedEmail}`);
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
      .orderBy(asc(rituals.order), desc(rituals.createdAt));
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
    // Get the maximum order for this user to add new ritual below all existing ones
    const maxOrderResult = await db
      .select({ maxOrder: sql<number>`MAX(CAST("order" AS INTEGER))` })
      .from(rituals)
      .where(eq(rituals.userId, ritualData.userId));
    
    const maxOrder = maxOrderResult[0]?.maxOrder || 0;
    const nextOrder = (maxOrder || 0) + 1;

    const [ritual] = await db
      .insert(rituals)
      .values({ ...ritualData, order: nextOrder } as any)
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
    // Check if ritual is a default ritual (non-deletable)
    const ritual = await db
      .select()
      .from(rituals)
      .where(and(
        eq(rituals.id, id),
        eq(rituals.userId, userId)
      ))
      .limit(1);

    if (ritual.length > 0 && ritual[0].isDefault) {
      // Return 0 to indicate deletion failed (or throw error)
      throw new Error('Cannot delete default rituals');
    }

    const result = await db
      .delete(rituals)
      .where(and(
        eq(rituals.id, id),
        eq(rituals.userId, userId)
      ))
      .returning();
    return result.length;
  }

  async seedDefaultRituals(userId: string): Promise<void> {
    const defaultRitualsData = [
      { title: 'Evening Support Call', url: 'https://zoom.miteshkhatri.com/event/pprac', category: 'Relationship', order: 1 },
    ];

    for (const ritualData of defaultRitualsData) {
      const existingRitual = await db.select().from(rituals).where(and(
        eq(rituals.userId, userId),
        eq(rituals.title, ritualData.title)
      )).limit(1);

      if (existingRitual.length === 0) {
        await db.insert(rituals).values({
          userId,
          title: ritualData.title,
          description: '',
          category: ritualData.category,
          frequency: 'daily',
          points: 1,
          url: ritualData.url,
          isActive: true,
          isDefault: true,
          order: ritualData.order,
        });
      } else if (!existingRitual[0].isDefault) {
        // Update existing ritual to mark as default and set order if not already
        await db.update(rituals)
          .set({ isDefault: true, order: ritualData.order, updatedAt: new Date() } as any)
          .where(and(
            eq(rituals.userId, userId),
            eq(rituals.title, ritualData.title)
          ));
      }
    }
    
    // Normalize ALL user rituals to 1 point (unified reward system)
    await db.update(rituals)
      .set({ points: 1, updatedAt: new Date() } as any)
      .where(eq(rituals.userId, userId));
  }

  // Ritual Completions operations
  async getAllRitualCompletions(userId: string): Promise<RitualCompletion[]> {
    return await db
      .select()
      .from(ritualCompletions)
      .where(eq(ritualCompletions.userId, userId));
  }

  async getRitualCompletionsByDate(userId: string, date: string): Promise<RitualCompletion[]> {
    return await db
      .select()
      .from(ritualCompletions)
      .where(and(
        eq(ritualCompletions.userId, userId),
        eq(ritualCompletions.date, date)
      ));
  }

  async getRitualCompletionsByDateRange(userId: string, startDate: string, endDate: string): Promise<RitualCompletion[]> {
    return await db
      .select()
      .from(ritualCompletions)
      .where(and(
        eq(ritualCompletions.userId, userId),
        sql`${ritualCompletions.date} >= ${startDate}`,
        sql`${ritualCompletions.date} <= ${endDate}`
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

  async getAllCourseVideoCompletions(userId: string): Promise<CourseVideoCompletion[]> {
    // Get all video completions for this user across all courses
    return await db
      .select()
      .from(courseVideoCompletions)
      .where(eq(courseVideoCompletions.userId, userId));
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

  async markLessonComplete(userId: string, lessonId: string): Promise<void> {
    // Check if already exists
    const [existing] = await db
      .select()
      .from(courseVideoCompletions)
      .where(and(
        eq(courseVideoCompletions.userId, userId),
        eq(courseVideoCompletions.videoId, lessonId)
      ));

    if (!existing) {
      // Create completion record
      await db
        .insert(courseVideoCompletions)
        .values({ userId, videoId: lessonId } as any);
    }
  }

  async markLessonIncomplete(userId: string, lessonId: string): Promise<void> {
    // Delete completion record
    await db
      .delete(courseVideoCompletions)
      .where(and(
        eq(courseVideoCompletions.userId, userId),
        eq(courseVideoCompletions.videoId, lessonId)
      ));
  }

  async getUserLessonCompletions(userId: string): Promise<Set<string>> {
    const completions = await this.getAllCourseVideoCompletions(userId);
    return new Set(completions.map(c => c.videoId));
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
    
    // Get ALL ritual completions for points calculation
    const allRitualCompletions = await this.getAllRitualCompletions(userId);
    
    // Platinum badges from platinum progress (if achieved)
    const userPlatinumBadges: any[] = [];
    if (platinumProgress?.platinumAchievedAt) {
      userPlatinumBadges.push({
        id: platinumProgress.id,
        badgeName: 'Platinum Standards',
        achievedAt: platinumProgress.platinumAchievedAt,
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
      allRitualCompletions,
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
    // Get approved emails - count directly from approved_emails table
    const allApprovedEmailsList = await db.select().from(approvedEmails);
    const activeApprovedEmailsList = allApprovedEmailsList.filter(ae => ae.status === 'active');
    
    // Count total and active users from approved_emails (not users table)
    const totalUsers = allApprovedEmailsList.length;
    const activeUsers = activeApprovedEmailsList.length;
    
    const approvedEmailSet = new Set(activeApprovedEmailsList.map(ae => ae.email));
    
    // Get all users and filter by approved emails
    const allUsers = await this.getAllUsers();
    const approvedUsers = allUsers.filter(u => u.email && approvedEmailSet.has(u.email));
    
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
      
      // Get firstName/lastName - fallback to approved_emails.name if user doesn't have them
      let firstName = user?.firstName || '';
      let lastName = user?.lastName || '';
      
      if (!firstName && !lastName && user) {
        // Try to get name from approved_emails
        const approvedEmail = activeApprovedEmailsList.find(ae => ae.email === user.email || ae.email === user.id);
        if (approvedEmail && approvedEmail.name) {
          const nameParts = approvedEmail.name.trim().split(' ');
          firstName = nameParts[0] || '';
          lastName = nameParts.slice(1).join(' ') || '';
        }
      }
      
      userAverages.set(week.userId, {
        total: existing.total + avg,
        count: existing.count + 1,
        email: user?.email || week.userId,
        firstName,
        lastName,
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
      .orderBy(asc(platinumStandards.category), asc(platinumStandards.orderIndex));
  }

  async getActivePlatinumStandards(): Promise<PlatinumStandard[]> {
    return await db
      .select()
      .from(platinumStandards)
      .where(eq(platinumStandards.isActive, true))
      .orderBy(asc(platinumStandards.category), asc(platinumStandards.orderIndex));
  }

  async getPlatinumStandardsByCategory(category: string): Promise<PlatinumStandard[]> {
    return await db
      .select()
      .from(platinumStandards)
      .where(and(
        eq(platinumStandards.category, category),
        eq(platinumStandards.isActive, true)
      ))
      .orderBy(asc(platinumStandards.orderIndex));
  }

  async getPlatinumStandardById(id: string): Promise<PlatinumStandard | undefined> {
    const [standard] = await db
      .select()
      .from(platinumStandards)
      .where(eq(platinumStandards.id, id))
      .limit(1);
    return standard;
  }

  async getAllPlatinumStandardsByCategory(category: string): Promise<PlatinumStandard[]> {
    // Returns ALL standards in category (active AND inactive) for re-numbering
    return await db
      .select()
      .from(platinumStandards)
      .where(eq(platinumStandards.category, category))
      .orderBy(asc(platinumStandards.orderIndex));
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
    console.error('[REORDER STORAGE] ========== reorderPlatinumStandards CALLED ==========');
    console.error('[REORDER STORAGE] Received', updates.length, 'updates');
    console.error('[REORDER STORAGE] Full updates payload:', JSON.stringify(updates, null, 2));
    
    // Update all standards in parallel using Promise.all
    const updatePromises = updates.map((update, idx) => {
      console.error(`[REORDER STORAGE] [${idx}] Preparing UPDATE for ID: ${update.id} → orderIndex: ${update.orderIndex}`);
      return db
        .update(platinumStandards)
        .set({ 
          orderIndex: update.orderIndex,
          updatedAt: new Date(),
        })
        .where(eq(platinumStandards.id, update.id))
        .returning();
    });
    
    console.error(`[REORDER STORAGE] Executing ${updatePromises.length} updates with Promise.all...`);
    try {
      const results = await Promise.all(updatePromises);
      console.error(`[REORDER STORAGE] ✅ Promise.all completed! Results count:`, results.length);
      
      // Check each result
      results.forEach((r, i) => {
        if (r.length === 0) {
          console.error(`[REORDER STORAGE] ⚠️  WARNING: Update ${i} (ID: ${updates[i].id}) returned ZERO rows!`);
        } else {
          console.error(`[REORDER STORAGE] ✅ Update ${i} (ID: ${updates[i].id}) SUCCESS - orderIndex now: ${r[0].orderIndex}`);
        }
      });
      
      console.error('[REORDER STORAGE] ========== reorderPlatinumStandards COMPLETE ==========');
    } catch (error) {
      console.error('[REORDER STORAGE] ❌ FATAL ERROR in Promise.all:', error);
      throw error;
    }
  }

  // User Platinum Standard Ratings operations
  async getUserPlatinumStandardRatingsByDate(userId: string, dateString: string): Promise<UserPlatinumStandardRating[]> {
    return await db
      .select()
      .from(userPlatinumStandardRatings)
      .where(and(
        eq(userPlatinumStandardRatings.userId, userId),
        eq(userPlatinumStandardRatings.dateString, dateString)
      ));
  }

  async upsertPlatinumStandardRating(rating: InsertUserPlatinumStandardRating): Promise<UserPlatinumStandardRating> {
    // Check if entry exists for this user, standard, and date
    const [existing] = await db
      .select()
      .from(userPlatinumStandardRatings)
      .where(and(
        eq(userPlatinumStandardRatings.userId, rating.userId),
        eq(userPlatinumStandardRatings.standardId, rating.standardId),
        eq(userPlatinumStandardRatings.dateString, rating.dateString)
      ));

    if (existing) {
      // Update existing entry
      const [updated] = await db
        .update(userPlatinumStandardRatings)
        .set({
          rating: rating.rating,
          updatedAt: new Date(),
        })
        .where(eq(userPlatinumStandardRatings.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new entry
      const [created] = await db
        .insert(userPlatinumStandardRatings)
        .values(rating)
        .returning();
      return created;
    }
  }

  // HRCM Unlock Progress operations
  async getHrcmUnlockProgress(userId: string, hrcmArea: string): Promise<UserHrcmUnlockProgress | undefined> {
    const [progress] = await db
      .select()
      .from(userHrcmUnlockProgress)
      .where(and(
        eq(userHrcmUnlockProgress.userId, userId),
        eq(userHrcmUnlockProgress.hrcmArea, hrcmArea)
      ));
    return progress;
  }

  async upsertHrcmUnlockProgress(progress: InsertUserHrcmUnlockProgress): Promise<UserHrcmUnlockProgress> {
    const existing = await this.getHrcmUnlockProgress(progress.userId, progress.hrcmArea);

    if (existing) {
      // Update existing entry
      const [updated] = await db
        .update(userHrcmUnlockProgress)
        .set({
          consecutivePerfectDays: progress.consecutivePerfectDays,
          lastPerfectDate: progress.lastPerfectDate,
          isUnlocked: progress.isUnlocked,
          updatedAt: new Date(),
        })
        .where(eq(userHrcmUnlockProgress.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new entry
      const [created] = await db
        .insert(userHrcmUnlockProgress)
        .values(progress)
        .returning();
      return created;
    }
  }

  async calculateUnlockStatus(userId: string, hrcmArea: string, dateString: string): Promise<UserHrcmUnlockProgress> {
    console.log(`[UNLOCK] Calculating unlock status for user ${userId}, area ${hrcmArea}, date ${dateString}`);
    
    // Get all standards for this category
    const categoryStandards = await this.getPlatinumStandardsByCategory(hrcmArea);
    console.log(`[UNLOCK] Found ${categoryStandards.length} standards for ${hrcmArea}`);
    
    // Get ratings for today
    const todayRatings = await this.getUserPlatinumStandardRatingsByDate(userId, dateString);
    console.log(`[UNLOCK] Found ${todayRatings.length} ratings for date ${dateString}`);
    
    // Check if all standards have rating of 7 for today
    const allPerfectToday = categoryStandards.every(standard => {
      const rating = todayRatings.find(r => r.standardId === standard.id);
      return rating && rating.rating === 7;
    });
    
    console.log(`[UNLOCK] All standards perfect today? ${allPerfectToday}`);
    
    // Get current unlock progress
    const currentProgress = await this.getHrcmUnlockProgress(userId, hrcmArea);
    
    if (!allPerfectToday) {
      // Reset streak if any standard is not 7
      console.log(`[UNLOCK] Resetting streak to 0 (not all standards are 7)`);
      return await this.upsertHrcmUnlockProgress({
        userId,
        hrcmArea,
        consecutivePerfectDays: 0,
        lastPerfectDate: null,
        isUnlocked: false,
      });
    }
    
    // All standards are 7 today - check if consecutive
    let newStreak = 1;
    
    if (currentProgress && currentProgress.lastPerfectDate) {
      // Calculate date difference
      const lastDate = new Date(currentProgress.lastPerfectDate);
      const currentDate = new Date(dateString);
      const diffTime = currentDate.getTime() - lastDate.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      console.log(`[UNLOCK] Last perfect date: ${currentProgress.lastPerfectDate}, Diff: ${diffDays} days`);
      
      if (diffDays === 1) {
        // Consecutive day - increment streak
        newStreak = currentProgress.consecutivePerfectDays + 1;
        console.log(`[UNLOCK] Consecutive day! New streak: ${newStreak}`);
      } else if (diffDays === 0) {
        // Same day - keep current streak
        newStreak = currentProgress.consecutivePerfectDays;
        console.log(`[UNLOCK] Same day, keeping streak: ${newStreak}`);
      } else {
        // Gap detected - reset streak to 1
        console.log(`[UNLOCK] Gap detected (${diffDays} days), resetting to 1`);
        newStreak = 1;
      }
    }
    
    const isUnlocked = newStreak >= 7;
    console.log(`[UNLOCK] Final streak: ${newStreak}, Unlocked: ${isUnlocked}`);
    
    return await this.upsertHrcmUnlockProgress({
      userId,
      hrcmArea,
      consecutivePerfectDays: newStreak,
      lastPerfectDate: dateString,
      isUnlocked,
    });
  }

  // Emotional Tracker operations
  async getEmotionalTrackersByDate(userId: string, date: string): Promise<EmotionalTracker[]> {
    return await db
      .select()
      .from(emotionalTrackers)
      .where(and(
        eq(emotionalTrackers.userId, userId),
        eq(emotionalTrackers.date, date)
      ))
      .orderBy(emotionalTrackers.timeSlot);
  }

  async upsertEmotionalTracker(tracker: InsertEmotionalTracker): Promise<EmotionalTracker> {
    // Check if entry exists for this user, date, and timeSlot
    const [existing] = await db
      .select()
      .from(emotionalTrackers)
      .where(and(
        eq(emotionalTrackers.userId, tracker.userId),
        eq(emotionalTrackers.date, tracker.date),
        eq(emotionalTrackers.timeSlot, tracker.timeSlot)
      ));

    if (existing) {
      // Update existing entry
      const [updated] = await db
        .update(emotionalTrackers)
        .set({
          ...tracker,
          updatedAt: new Date(),
        })
        .where(eq(emotionalTrackers.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new entry
      const [newTracker] = await db
        .insert(emotionalTrackers)
        .values(tracker)
        .returning();
      return newTracker;
    }
  }

  async deleteEmotionalTracker(id: string, userId: string): Promise<void> {
    await db
      .delete(emotionalTrackers)
      .where(and(
        eq(emotionalTrackers.id, id),
        eq(emotionalTrackers.userId, userId)
      ));
  }

  // User Persistent Assignment operations
  async getUserPersistentAssignments(userId: string): Promise<UserPersistentAssignment[]> {
    return await db
      .select()
      .from(userPersistentAssignments)
      .where(eq(userPersistentAssignments.userId, userId))
      .orderBy(desc(userPersistentAssignments.createdAt));
  }

  async addPersistentAssignment(assignment: InsertUserPersistentAssignment): Promise<UserPersistentAssignment> {
    // DUPLICATE PREVENTION: Check for existing assignment with same userId, courseId, and lessonId
    const [existing] = await db
      .select()
      .from(userPersistentAssignments)
      .where(and(
        eq(userPersistentAssignments.userId, assignment.userId),
        eq(userPersistentAssignments.courseId, assignment.courseId),
        eq(userPersistentAssignments.lessonId, assignment.lessonId)
      ))
      .limit(1);

    if (existing) {
      console.log('[DUPLICATE PREVENTION] Assignment already exists, returning existing:', {
        userId: assignment.userId,
        courseName: assignment.courseName,
        lessonName: assignment.lessonName
      });
      return existing;
    }

    // No duplicate found, insert new assignment
    const [newAssignment] = await db
      .insert(userPersistentAssignments)
      .values(assignment)
      .returning();
    
    console.log('[NEW ASSIGNMENT] Created:', {
      userId: assignment.userId,
      courseName: assignment.courseName,
      lessonName: assignment.lessonName
    });
    
    return newAssignment;
  }

  async togglePersistentAssignmentCompletion(id: string, userId: string): Promise<UserPersistentAssignment> {
    // First get the current assignment
    const [current] = await db
      .select()
      .from(userPersistentAssignments)
      .where(and(
        eq(userPersistentAssignments.id, id),
        eq(userPersistentAssignments.userId, userId)
      ));

    if (!current) {
      throw new Error('Assignment not found');
    }

    const wasCompleted = current.completed;
    const willBeCompleted = !wasCompleted;

    // Toggle the completion status
    const [updated] = await db
      .update(userPersistentAssignments)
      .set({ 
        completed: willBeCompleted,
        updatedAt: new Date()
      })
      .where(and(
        eq(userPersistentAssignments.id, id),
        eq(userPersistentAssignments.userId, userId)
      ))
      .returning();

    // Award/subtract 10 points based on completion status change
    if (willBeCompleted && !wasCompleted) {
      // Marking as completed → Award 10 points
      await this.addPointsToUser(userId, 10);
      console.log(`✅ [ASSIGNMENT POINTS] Added 10 points to user ${userId} for completing assignment: ${current.lessonName}`);
    } else if (!willBeCompleted && wasCompleted) {
      // Unmarking (completed → incomplete) → Subtract 10 points
      await this.addPointsToUser(userId, -10);
      console.log(`❌ [ASSIGNMENT POINTS] Subtracted 10 points from user ${userId} for unchecking assignment: ${current.lessonName}`);
    }

    return updated;
  }
  
  async updateCustomAssignment(id: string, userId: string, customText: string): Promise<UserPersistentAssignment> {
    const [updated] = await db
      .update(userPersistentAssignments)
      .set({ 
        customText: customText,
        updatedAt: new Date()
      })
      .where(and(
        eq(userPersistentAssignments.id, id),
        eq(userPersistentAssignments.userId, userId)
      ))
      .returning();
    
    if (!updated) {
      throw new Error('Assignment not found');
    }
    
    return updated;
  }

  async deletePersistentAssignment(id: string, userId: string): Promise<void> {
    await db
      .delete(userPersistentAssignments)
      .where(and(
        eq(userPersistentAssignments.id, id),
        eq(userPersistentAssignments.userId, userId)
      ));
  }

  async deleteCompletedAssignments(userId: string): Promise<void> {
    await db
      .delete(userPersistentAssignments)
      .where(and(
        eq(userPersistentAssignments.userId, userId),
        eq(userPersistentAssignments.completed, true)
      ));
  }

  async deleteAllPersistentAssignments(userId: string): Promise<void> {
    await db
      .delete(userPersistentAssignments)
      .where(eq(userPersistentAssignments.userId, userId));
  }

  // User Feedback operations
  async getAllFeedback(): Promise<UserFeedback[]> {
    return await db
      .select()
      .from(userFeedback)
      .orderBy(desc(userFeedback.createdAt));
  }

  async getUserFeedback(userId: string): Promise<UserFeedback[]> {
    return await db
      .select()
      .from(userFeedback)
      .where(eq(userFeedback.userId, userId))
      .orderBy(desc(userFeedback.createdAt));
  }

  async createFeedback(feedback: InsertUserFeedback): Promise<UserFeedback> {
    const [newFeedback] = await db
      .insert(userFeedback)
      .values(feedback)
      .returning();
    return newFeedback;
  }

  async updateFeedbackStatus(id: string, status: string, adminResponse?: string, priority?: string): Promise<UserFeedback> {
    const updateData: any = { 
      status, 
      updatedAt: new Date() 
    };
    
    if (adminResponse !== undefined) {
      updateData.adminResponse = adminResponse;
    }
    
    if (priority !== undefined) {
      updateData.priority = priority;
    }
    
    if (status === 'resolved') {
      updateData.resolvedAt = new Date();
    }

    const [updated] = await db
      .update(userFeedback)
      .set(updateData)
      .where(eq(userFeedback.id, id))
      .returning();
    
    return updated;
  }

  async deleteFeedback(id: string): Promise<void> {
    await db
      .delete(userFeedback)
      .where(eq(userFeedback.id, id));
  }

  async clearAllFeedback(): Promise<void> {
    await db.delete(userFeedback);
  }

  // Next Week Snapshot operations - Friday continuity system
  async getActiveSnapshot(userId: string): Promise<NextWeekSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(nextWeekSnapshots)
      .where(
        and(
          eq(nextWeekSnapshots.userId, userId),
          eq(nextWeekSnapshots.archived, false)
        )
      )
      .orderBy(desc(nextWeekSnapshots.createdAt))
      .limit(1);
    
    return snapshot;
  }

  async getSnapshotByDate(userId: string, date: string): Promise<NextWeekSnapshot | undefined> {
    const [snapshot] = await db
      .select()
      .from(nextWeekSnapshots)
      .where(
        and(
          eq(nextWeekSnapshots.userId, userId),
          eq(nextWeekSnapshots.snapshotDate, date)
        )
      )
      .limit(1);
    
    return snapshot;
  }

  async createSnapshot(snapshot: InsertNextWeekSnapshot): Promise<NextWeekSnapshot> {
    const [newSnapshot] = await db
      .insert(nextWeekSnapshots)
      .values(snapshot)
      .returning();
    
    return newSnapshot;
  }

  async archiveSnapshot(id: string): Promise<void> {
    await db
      .update(nextWeekSnapshots)
      .set({ 
        archived: true,
        archivedAt: new Date()
      })
      .where(eq(nextWeekSnapshots.id, id));
  }

  async archiveAllUserSnapshots(userId: string): Promise<void> {
    await db
      .update(nextWeekSnapshots)
      .set({ 
        archived: true,
        archivedAt: new Date()
      })
      .where(
        and(
          eq(nextWeekSnapshots.userId, userId),
          eq(nextWeekSnapshots.archived, false)
        )
      );
  }

  // Gratitude Journal operations
  async getGratitudeEntry(userId: string, date: string): Promise<GratitudeJournal | undefined> {
    const [entry] = await db
      .select()
      .from(gratitudeJournals)
      .where(
        and(
          eq(gratitudeJournals.userId, userId),
          eq(gratitudeJournals.date, date)
        )
      )
      .limit(1);
    return entry;
  }

  async getAllGratitudeEntries(userId: string): Promise<GratitudeJournal[]> {
    return await db
      .select()
      .from(gratitudeJournals)
      .where(eq(gratitudeJournals.userId, userId))
      .orderBy(desc(gratitudeJournals.date));
  }

  async upsertGratitudeEntry(entry: InsertGratitudeJournal): Promise<GratitudeJournal> {
    // Check if entry exists for this date
    const existing = await this.getGratitudeEntry(entry.userId, entry.date);
    
    if (existing) {
      // Update existing entry
      const [updated] = await db
        .update(gratitudeJournals)
        .set({
          gratitudeText: entry.gratitudeText,
          updatedAt: new Date()
        })
        .where(eq(gratitudeJournals.id, existing.id))
        .returning();
      return updated;
    } else {
      // Create new entry
      const [newEntry] = await db
        .insert(gratitudeJournals)
        .values(entry)
        .returning();
      return newEntry;
    }
  }

  async deleteGratitudeEntry(userId: string, date: string): Promise<void> {
    await db
      .delete(gratitudeJournals)
      .where(
        and(
          eq(gratitudeJournals.userId, userId),
          eq(gratitudeJournals.date, date)
        )
      );
  }

  // Gratitude Posts operations - Shared feed
  async getGratitudePosts(limit: number = 50): Promise<GratitudePost[]> {
    // Get only recent month's posts (last 30 days), most recent first, not archived
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    return await db
      .select()
      .from(gratitudePosts)
      .where(and(
        eq(gratitudePosts.isPublic, true),
        eq(gratitudePosts.isArchived, false),
        gte(gratitudePosts.createdAt, thirtyDaysAgo)
      ))
      .orderBy(desc(gratitudePosts.createdAt))
      .limit(limit);
  }

  async archiveOldPosts(): Promise<number> {
    // Archive posts older than 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const result = await db
      .update(gratitudePosts)
      .set({ isArchived: true })
      .where(and(
        eq(gratitudePosts.isArchived, false),
        lte(gratitudePosts.createdAt, thirtyDaysAgo)
      ))
      .returning();
    
    return result.length;
  }

  async getArchivedPosts(limit: number = 20, offset: number = 0): Promise<GratitudePost[]> {
    // Get archived posts with pagination (oldest first within archive)
    return await db
      .select()
      .from(gratitudePosts)
      .where(and(
        eq(gratitudePosts.isPublic, true),
        eq(gratitudePosts.isArchived, true)
      ))
      .orderBy(desc(gratitudePosts.createdAt))
      .limit(limit)
      .offset(offset);
  }

  async getArchivedPostsCount(): Promise<number> {
    // Get total count of archived posts
    const [result] = await db
      .select({ count: count() })
      .from(gratitudePosts)
      .where(and(
        eq(gratitudePosts.isPublic, true),
        eq(gratitudePosts.isArchived, true)
      ));
    return result?.count || 0;
  }

  async createGratitudePost(post: InsertGratitudePost): Promise<GratitudePost> {
    const [newPost] = await db
      .insert(gratitudePosts)
      .values(post)
      .returning();
    return newPost;
  }

  async deleteGratitudePost(id: string, userId: string): Promise<void> {
    await db
      .delete(gratitudePosts)
      .where(
        and(
          eq(gratitudePosts.id, id),
          eq(gratitudePosts.userId, userId)
        )
      );
  }

  // Goals & Affirmations operations
  async getGoalsAffirmations(userId: string): Promise<GoalAffirmation[]> {
    return await db
      .select()
      .from(goalsAffirmations)
      .where(eq(goalsAffirmations.userId, userId))
      .orderBy(desc(goalsAffirmations.createdAt));
  }

  async createGoalAffirmation(goal: InsertGoalAffirmation): Promise<GoalAffirmation> {
    const [newGoal] = await db
      .insert(goalsAffirmations)
      .values(goal)
      .returning();
    return newGoal;
  }

  async toggleGoalCompletion(id: string, userId: string): Promise<GoalAffirmation> {
    // First get the current goal
    const [goal] = await db
      .select()
      .from(goalsAffirmations)
      .where(
        and(
          eq(goalsAffirmations.id, id),
          eq(goalsAffirmations.userId, userId)
        )
      );
    
    if (!goal) {
      throw new Error('Goal not found');
    }
    
    // Toggle completion status
    const [updated] = await db
      .update(goalsAffirmations)
      .set({
        completed: !goal.completed,
        completedAt: !goal.completed ? new Date() : null,
        updatedAt: new Date()
      })
      .where(eq(goalsAffirmations.id, id))
      .returning();
    
    return updated;
  }

  async deleteGoalAffirmation(id: string, userId: string): Promise<void> {
    await db
      .delete(goalsAffirmations)
      .where(
        and(
          eq(goalsAffirmations.id, id),
          eq(goalsAffirmations.userId, userId)
        )
      );
  }
}

export const storage = new DatabaseStorage();
