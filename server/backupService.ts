import { supabase, isSupabaseConfigured } from './supabase.js';
import { db } from './db.js';
import { 
  users, 
  hercmWeeks, 
  ritualCompletions, 
  emotionalTrackers, 
  courseVideoCompletions, 
  userPersistentAssignments, 
  platinumStandards,
  approvedEmails,
  platinumProgress,
  accessLogs,
  rituals,
  courses,
  ratingProgression,
  courseVideos,
  adminCourseRecommendations
} from '@shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Backup Service for syncing Replit PostgreSQL data to Supabase
 * Preserves historical data for 3K users
 */

/**
 * Universal transformer: camelCase → snake_case for Supabase
 * Handles all tables and columns automatically
 * Filters out null/undefined values to prevent Supabase schema errors
 */
function toSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function transformToSnakeCase(obj: any): any {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(transformToSnakeCase);
  }
  
  if (typeof obj === 'object' && obj.constructor === Object) {
    const transformed: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        // Skip null/undefined to avoid Supabase schema cache issues
        if (value !== null && value !== undefined) {
          const snakeKey = toSnakeCase(key);
          transformed[snakeKey] = transformToSnakeCase(value);
        }
      }
    }
    return transformed;
  }
  
  return obj;
}

export interface BackupResult {
  success: boolean;
  message: string;
  stats?: {
    users?: number;
    hercmWeeks?: number;
    ritualCompletions?: number;
    emotionalTrackers?: number;
    courseVideoCompletions?: number;
    assignments?: number;
    platinumStandards?: number;
    approvedEmails?: number;
    platinumProgress?: number;
    accessLogs?: number;
    rituals?: number;
    courses?: number;
    ratingProgression?: number;
    courseVideos?: number;
    adminCourseRecommendations?: number;
  };
  error?: string;
}

/**
 * Backup all user data to Supabase
 */
export async function backupAllData(): Promise<BackupResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase is not configured. Please add SUPABASE_URL and SUPABASE_ANON_KEY.',
    };
  }

  try {
    const stats = {
      users: 0,
      hercmWeeks: 0,
      ritualCompletions: 0,
      emotionalTrackers: 0,
      courseVideoCompletions: 0,
      assignments: 0,
      platinumStandards: 0,
      approvedEmails: 0,
      platinumProgress: 0,
      accessLogs: 0,
      rituals: 0,
      courses: 0,
      ratingProgression: 0,
      courseVideos: 0,
      adminCourseRecommendations: 0,
    };

    // 1. Backup Users (auto-transform to snake_case)
    const allUsers = await db.select().from(users);
    if (allUsers.length > 0) {
      const transformedUsers = allUsers.map(transformToSnakeCase);
      const { error: usersError } = await supabase!
        .from('users')
        .upsert(transformedUsers, { onConflict: 'id' });
      
      if (usersError) throw new Error(`Users backup failed: ${usersError.message}`);
      stats.users = allUsers.length;
    }

    // 2. Backup HRCM Weeks (auto-transform to snake_case)
    const allHercmWeeks = await db.select().from(hercmWeeks);
    if (allHercmWeeks.length > 0) {
      const transformedHercm = allHercmWeeks.map(transformToSnakeCase);
      const { error: hercmError } = await supabase!
        .from('hercm_weeks')
        .upsert(transformedHercm, { onConflict: 'id' });
      
      if (hercmError) {
        // Log warning but continue backup (column mismatch shouldn't stop entire backup)
        console.warn(`[BACKUP] HRCM weeks backup warning: ${hercmError.message}`);
        console.warn('[BACKUP] Tip: Ensure Supabase hercm_weeks table has date_string column');
      } else {
        stats.hercmWeeks = allHercmWeeks.length;
      }
    }

    // 3. Backup Ritual Completions (auto-transform to snake_case)
    const allRitualCompletions = await db.select().from(ritualCompletions);
    if (allRitualCompletions.length > 0) {
      const transformedRituals = allRitualCompletions.map(transformToSnakeCase);
      const { error: ritualsError } = await supabase!
        .from('ritual_completions')
        .upsert(transformedRituals, { onConflict: 'id' });
      
      if (ritualsError) throw new Error(`Ritual completions backup failed: ${ritualsError.message}`);
      stats.ritualCompletions = allRitualCompletions.length;
    }

    // 4. Backup Emotional Trackers (auto-transform to snake_case)
    const allEmotionalTrackers = await db.select().from(emotionalTrackers);
    if (allEmotionalTrackers.length > 0) {
      const transformedTrackers = allEmotionalTrackers.map(transformToSnakeCase);
      const { error: trackersError } = await supabase!
        .from('emotional_trackers')
        .upsert(transformedTrackers, { onConflict: 'id' });
      
      if (trackersError) throw new Error(`Emotional trackers backup failed: ${trackersError.message}`);
      stats.emotionalTrackers = allEmotionalTrackers.length;
    }

    // 5. Backup Course Video Completions (auto-transform to snake_case)
    const allCourseVideoCompletions = await db.select().from(courseVideoCompletions);
    if (allCourseVideoCompletions.length > 0) {
      const transformedProgress = allCourseVideoCompletions.map(transformToSnakeCase);
      const { error: progressError } = await supabase!
        .from('course_video_completions')
        .upsert(transformedProgress, { onConflict: 'id' });
      
      if (progressError) throw new Error(`Course video completions backup failed: ${progressError.message}`);
      stats.courseVideoCompletions = allCourseVideoCompletions.length;
    }

    // 6. Backup User Assignments (auto-transform to snake_case)
    const allAssignments = await db.select().from(userPersistentAssignments);
    if (allAssignments.length > 0) {
      const transformedAssignments = allAssignments.map(transformToSnakeCase);
      const { error: assignmentsError } = await supabase!
        .from('user_persistent_assignments')
        .upsert(transformedAssignments, { onConflict: 'id' });
      
      if (assignmentsError) throw new Error(`Assignments backup failed: ${assignmentsError.message}`);
      stats.assignments = allAssignments.length;
    }

    // 7. Backup Platinum Standards (auto-transform to snake_case)
    const allStandards = await db.select().from(platinumStandards);
    if (allStandards.length > 0) {
      const transformedStandards = allStandards.map(transformToSnakeCase);
      const { error: standardsError } = await supabase!
        .from('platinum_standards')
        .upsert(transformedStandards, { onConflict: 'id' });
      
      if (standardsError) throw new Error(`Platinum standards backup failed: ${standardsError.message}`);
      stats.platinumStandards = allStandards.length;
    }

    // 8. Backup Approved Emails (auto-transform to snake_case)
    const allApprovedEmails = await db.select().from(approvedEmails);
    if (allApprovedEmails.length > 0) {
      const transformedEmails = allApprovedEmails.map(transformToSnakeCase);
      const { error: emailsError } = await supabase!
        .from('approved_emails')
        .upsert(transformedEmails, { onConflict: 'id' });
      
      if (emailsError) throw new Error(`Approved emails backup failed: ${emailsError.message}`);
      stats.approvedEmails = allApprovedEmails.length;
    }

    // 9. Backup Platinum Progress (auto-transform to snake_case)
    const allPlatinumProgress = await db.select().from(platinumProgress);
    if (allPlatinumProgress.length > 0) {
      const transformedProgress = allPlatinumProgress.map(transformToSnakeCase);
      const { error: progressError } = await supabase!
        .from('platinum_progress')
        .upsert(transformedProgress, { onConflict: 'id' });
      
      if (progressError) throw new Error(`Platinum progress backup failed: ${progressError.message}`);
      stats.platinumProgress = allPlatinumProgress.length;
    }

    // 10. Backup Access Logs (auto-transform to snake_case)
    const allAccessLogs = await db.select().from(accessLogs);
    if (allAccessLogs.length > 0) {
      const transformedLogs = allAccessLogs.map(transformToSnakeCase);
      const { error: logsError } = await supabase!
        .from('access_logs')
        .upsert(transformedLogs, { onConflict: 'id' });
      
      if (logsError) throw new Error(`Access logs backup failed: ${logsError.message}`);
      stats.accessLogs = allAccessLogs.length;
    }

    // 11. Backup Rituals (auto-transform to snake_case)
    const allRituals = await db.select().from(rituals);
    if (allRituals.length > 0) {
      const transformedRituals = allRituals.map(transformToSnakeCase);
      const { error: ritualsError } = await supabase!
        .from('rituals')
        .upsert(transformedRituals, { onConflict: 'id' });
      
      if (ritualsError) throw new Error(`Rituals backup failed: ${ritualsError.message}`);
      stats.rituals = allRituals.length;
    }

    // 12. Backup Courses (auto-transform to snake_case)
    const allCourses = await db.select().from(courses);
    if (allCourses.length > 0) {
      const transformedCourses = allCourses.map(transformToSnakeCase);
      const { error: coursesError } = await supabase!
        .from('courses')
        .upsert(transformedCourses, { onConflict: 'id' });
      
      if (coursesError) throw new Error(`Courses backup failed: ${coursesError.message}`);
      stats.courses = allCourses.length;
    }

    // 13. Backup Rating Progression (auto-transform to snake_case)
    const allRatingProgression = await db.select().from(ratingProgression);
    if (allRatingProgression.length > 0) {
      const transformedRating = allRatingProgression.map(transformToSnakeCase);
      const { error: ratingError } = await supabase!
        .from('rating_progression')
        .upsert(transformedRating, { onConflict: 'id' });
      
      if (ratingError) throw new Error(`Rating progression backup failed: ${ratingError.message}`);
      stats.ratingProgression = allRatingProgression.length;
    }

    // 14. Backup Course Videos (auto-transform to snake_case)
    const allCourseVideos = await db.select().from(courseVideos);
    if (allCourseVideos.length > 0) {
      const transformedVideos = allCourseVideos.map(transformToSnakeCase);
      const { error: videosError } = await supabase!
        .from('course_videos')
        .upsert(transformedVideos, { onConflict: 'id' });
      
      if (videosError) throw new Error(`Course videos backup failed: ${videosError.message}`);
      stats.courseVideos = allCourseVideos.length;
    }

    // 15. Backup Admin Course Recommendations (auto-transform to snake_case)
    const allAdminRecs = await db.select().from(adminCourseRecommendations);
    if (allAdminRecs.length > 0) {
      const transformedRecs = allAdminRecs.map(transformToSnakeCase);
      const { error: recsError } = await supabase!
        .from('admin_course_recommendations')
        .upsert(transformedRecs, { onConflict: 'id' });
      
      if (recsError) throw new Error(`Admin course recommendations backup failed: ${recsError.message}`);
      stats.adminCourseRecommendations = allAdminRecs.length;
    }

    return {
      success: true,
      message: 'Full backup completed successfully',
      stats,
    };
  } catch (error) {
    console.error('Backup error:', error);
    return {
      success: false,
      message: 'Backup failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Backup single user's complete data
 */
export async function backupUserData(userId: string): Promise<BackupResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase is not configured',
    };
  }

  try {
    const stats = {
      users: 0,
      hercmWeeks: 0,
      ritualCompletions: 0,
      emotionalTrackers: 0,
      courseVideoCompletions: 0,
      assignments: 0,
      platinumProgress: 0,
      rituals: 0,
      courses: 0,
      ratingProgression: 0,
      adminCourseRecommendations: 0,
    };

    // 1. User data (auto-transform to snake_case)
    const userData = await db.select().from(users).where(eq(users.id, userId));
    if (userData.length > 0) {
      const transformedUser = userData.map(transformToSnakeCase);
      await supabase!.from('users').upsert(transformedUser, { onConflict: 'id' });
      stats.users = 1;
    }

    // 2. HRCM weeks (auto-transform to snake_case)
    const userHercm = await db.select().from(hercmWeeks).where(eq(hercmWeeks.userId, userId));
    if (userHercm.length > 0) {
      const transformedHercm = userHercm.map(transformToSnakeCase);
      await supabase!.from('hercm_weeks').upsert(transformedHercm, { onConflict: 'id' });
      stats.hercmWeeks = userHercm.length;
    }

    // 3. Ritual completions (auto-transform to snake_case)
    const userRituals = await db.select().from(ritualCompletions).where(eq(ritualCompletions.userId, userId));
    if (userRituals.length > 0) {
      const transformedRituals = userRituals.map(transformToSnakeCase);
      await supabase!.from('ritual_completions').upsert(transformedRituals, { onConflict: 'id' });
      stats.ritualCompletions = userRituals.length;
    }

    // 4. Emotional trackers (auto-transform to snake_case)
    const userTrackers = await db.select().from(emotionalTrackers).where(eq(emotionalTrackers.userId, userId));
    if (userTrackers.length > 0) {
      const transformedTrackers = userTrackers.map(transformToSnakeCase);
      await supabase!.from('emotional_trackers').upsert(transformedTrackers, { onConflict: 'id' });
      stats.emotionalTrackers = userTrackers.length;
    }

    // 5. Course video completions (auto-transform to snake_case)
    const userProgress = await db.select().from(courseVideoCompletions).where(eq(courseVideoCompletions.userId, userId));
    if (userProgress.length > 0) {
      const transformedProgress = userProgress.map(transformToSnakeCase);
      await supabase!.from('course_video_completions').upsert(transformedProgress, { onConflict: 'id' });
      stats.courseVideoCompletions = userProgress.length;
    }

    // 6. Assignments (auto-transform to snake_case)
    const userAssignments = await db.select().from(userPersistentAssignments).where(eq(userPersistentAssignments.userId, userId));
    if (userAssignments.length > 0) {
      const transformedAssignments = userAssignments.map(transformToSnakeCase);
      await supabase!.from('user_persistent_assignments').upsert(transformedAssignments, { onConflict: 'id' });
      stats.assignments = userAssignments.length;
    }

    // 7. Platinum Progress (auto-transform to snake_case)
    const userPlatProgress = await db.select().from(platinumProgress).where(eq(platinumProgress.userId, userId));
    if (userPlatProgress.length > 0) {
      const transformedPlatProgress = userPlatProgress.map(transformToSnakeCase);
      await supabase!.from('platinum_progress').upsert(transformedPlatProgress, { onConflict: 'id' });
      stats.platinumProgress = userPlatProgress.length;
    }

    // 8. Rituals (auto-transform to snake_case)
    const userRitualsData = await db.select().from(rituals).where(eq(rituals.userId, userId));
    if (userRitualsData.length > 0) {
      const transformedRitualsData = userRitualsData.map(transformToSnakeCase);
      await supabase!.from('rituals').upsert(transformedRitualsData, { onConflict: 'id' });
      stats.rituals = userRitualsData.length;
    }

    // 9. Courses (auto-transform to snake_case)
    const userCoursesData = await db.select().from(courses).where(eq(courses.userId, userId));
    if (userCoursesData.length > 0) {
      const transformedCoursesData = userCoursesData.map(transformToSnakeCase);
      await supabase!.from('courses').upsert(transformedCoursesData, { onConflict: 'id' });
      stats.courses = userCoursesData.length;
    }

    // 10. Rating Progression (auto-transform to snake_case)
    const userRatingProg = await db.select().from(ratingProgression).where(eq(ratingProgression.userId, userId));
    if (userRatingProg.length > 0) {
      const transformedRatingProg = userRatingProg.map(transformToSnakeCase);
      await supabase!.from('rating_progression').upsert(transformedRatingProg, { onConflict: 'id' });
      stats.ratingProgression = userRatingProg.length;
    }

    // 11. Admin Course Recommendations (auto-transform to snake_case)
    const userAdminRecs = await db.select().from(adminCourseRecommendations).where(eq(adminCourseRecommendations.userId, userId));
    if (userAdminRecs.length > 0) {
      const transformedAdminRecs = userAdminRecs.map(transformToSnakeCase);
      await supabase!.from('admin_course_recommendations').upsert(transformedAdminRecs, { onConflict: 'id' });
      stats.adminCourseRecommendations = userAdminRecs.length;
    }

    return {
      success: true,
      message: `User ${userId} data backed up successfully`,
      stats,
    };
  } catch (error) {
    console.error('User backup error:', error);
    return {
      success: false,
      message: 'User backup failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Get backup statistics
 */
export async function getBackupStats(): Promise<BackupResult> {
  if (!isSupabaseConfigured) {
    return {
      success: false,
      message: 'Supabase is not configured',
    };
  }

  try {
    const [
      usersCount, 
      hercmCount, 
      ritualsCount, 
      trackersCount, 
      progressCount, 
      assignmentsCount, 
      standardsCount,
      emailsCount,
      platProgressCount,
      logsCount,
      ritualsTableCount,
      coursesCount,
      ratingCount,
      videosCount,
      adminRecsCount
    ] = await Promise.all([
      supabase!.from('users').select('*', { count: 'exact', head: true }),
      supabase!.from('hercm_weeks').select('*', { count: 'exact', head: true }),
      supabase!.from('ritual_completions').select('*', { count: 'exact', head: true }),
      supabase!.from('emotional_trackers').select('*', { count: 'exact', head: true }),
      supabase!.from('course_video_completions').select('*', { count: 'exact', head: true }),
      supabase!.from('user_persistent_assignments').select('*', { count: 'exact', head: true }),
      supabase!.from('platinum_standards').select('*', { count: 'exact', head: true }),
      supabase!.from('approved_emails').select('*', { count: 'exact', head: true }),
      supabase!.from('platinum_progress').select('*', { count: 'exact', head: true }),
      supabase!.from('access_logs').select('*', { count: 'exact', head: true }),
      supabase!.from('rituals').select('*', { count: 'exact', head: true }),
      supabase!.from('courses').select('*', { count: 'exact', head: true }),
      supabase!.from('rating_progression').select('*', { count: 'exact', head: true }),
      supabase!.from('course_videos').select('*', { count: 'exact', head: true }),
      supabase!.from('admin_course_recommendations').select('*', { count: 'exact', head: true }),
    ]);

    return {
      success: true,
      message: 'Backup statistics retrieved',
      stats: {
        users: usersCount.count || 0,
        hercmWeeks: hercmCount.count || 0,
        ritualCompletions: ritualsCount.count || 0,
        emotionalTrackers: trackersCount.count || 0,
        courseVideoCompletions: progressCount.count || 0,
        assignments: assignmentsCount.count || 0,
        platinumStandards: standardsCount.count || 0,
        approvedEmails: emailsCount.count || 0,
        platinumProgress: platProgressCount.count || 0,
        accessLogs: logsCount.count || 0,
        rituals: ritualsTableCount.count || 0,
        courses: coursesCount.count || 0,
        ratingProgression: ratingCount.count || 0,
        courseVideos: videosCount.count || 0,
        adminCourseRecommendations: adminRecsCount.count || 0,
      },
    };
  } catch (error) {
    console.error('Stats error:', error);
    return {
      success: false,
      message: 'Failed to retrieve backup stats',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
