import { supabase, isSupabaseConfigured } from './supabase.js';
import { db } from './db.js';
import { users, hercmWeeks, ritualCompletions, emotionalTrackers, courseVideoCompletions, userPersistentAssignments, platinumStandards } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Backup Service for syncing Replit PostgreSQL data to Supabase
 * Preserves historical data for 3K users
 */

/**
 * Universal transformer: camelCase → snake_case for Supabase
 * Handles all tables and columns automatically
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
        const snakeKey = toSnakeCase(key);
        transformed[snakeKey] = transformToSnakeCase(obj[key]);
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
      
      if (hercmError) throw new Error(`HRCM weeks backup failed: ${hercmError.message}`);
      stats.hercmWeeks = allHercmWeeks.length;
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
    const [usersCount, hercmCount, ritualsCount, trackersCount, progressCount, assignmentsCount, standardsCount] = await Promise.all([
      supabase!.from('users').select('*', { count: 'exact', head: true }),
      supabase!.from('hercm_weeks').select('*', { count: 'exact', head: true }),
      supabase!.from('ritual_completions').select('*', { count: 'exact', head: true }),
      supabase!.from('emotional_trackers').select('*', { count: 'exact', head: true }),
      supabase!.from('course_video_completions').select('*', { count: 'exact', head: true }),
      supabase!.from('user_persistent_assignments').select('*', { count: 'exact', head: true }),
      supabase!.from('platinum_standards').select('*', { count: 'exact', head: true }),
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
