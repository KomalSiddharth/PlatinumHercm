import { supabase, isSupabaseConfigured } from './supabase.js';
import { db } from './db.js';
import { users, hercmWeeks, dailyRituals, emotionalTrackers, courseProgress, userPersistentAssignments, platinumStandards } from '@shared/schema.js';
import { eq } from 'drizzle-orm';

/**
 * Backup Service for syncing Replit PostgreSQL data to Supabase
 * Preserves historical data for 30K users
 */

export interface BackupResult {
  success: boolean;
  message: string;
  stats?: {
    users?: number;
    hercmWeeks?: number;
    dailyRituals?: number;
    emotionalTrackers?: number;
    courseProgress?: number;
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
      dailyRituals: 0,
      emotionalTrackers: 0,
      courseProgress: 0,
      assignments: 0,
      platinumStandards: 0,
    };

    // 1. Backup Users
    const allUsers = await db.select().from(users);
    if (allUsers.length > 0) {
      const { error: usersError } = await supabase!
        .from('users')
        .upsert(allUsers, { onConflict: 'id' });
      
      if (usersError) throw new Error(`Users backup failed: ${usersError.message}`);
      stats.users = allUsers.length;
    }

    // 2. Backup HRCM Weeks
    const allHercmWeeks = await db.select().from(hercmWeeks);
    if (allHercmWeeks.length > 0) {
      const { error: hercmError } = await supabase!
        .from('hercm_weeks')
        .upsert(allHercmWeeks, { onConflict: 'id' });
      
      if (hercmError) throw new Error(`HRCM weeks backup failed: ${hercmError.message}`);
      stats.hercmWeeks = allHercmWeeks.length;
    }

    // 3. Backup Daily Rituals
    const allDailyRituals = await db.select().from(dailyRituals);
    if (allDailyRituals.length > 0) {
      const { error: ritualsError } = await supabase!
        .from('daily_rituals')
        .upsert(allDailyRituals, { onConflict: 'id' });
      
      if (ritualsError) throw new Error(`Daily rituals backup failed: ${ritualsError.message}`);
      stats.dailyRituals = allDailyRituals.length;
    }

    // 4. Backup Emotional Trackers
    const allEmotionalTrackers = await db.select().from(emotionalTrackers);
    if (allEmotionalTrackers.length > 0) {
      const { error: trackersError } = await supabase!
        .from('emotional_trackers')
        .upsert(allEmotionalTrackers, { onConflict: 'id' });
      
      if (trackersError) throw new Error(`Emotional trackers backup failed: ${trackersError.message}`);
      stats.emotionalTrackers = allEmotionalTrackers.length;
    }

    // 5. Backup Course Progress
    const allCourseProgress = await db.select().from(courseProgress);
    if (allCourseProgress.length > 0) {
      const { error: progressError } = await supabase!
        .from('course_progress')
        .upsert(allCourseProgress, { onConflict: 'id' });
      
      if (progressError) throw new Error(`Course progress backup failed: ${progressError.message}`);
      stats.courseProgress = allCourseProgress.length;
    }

    // 6. Backup User Assignments
    const allAssignments = await db.select().from(userPersistentAssignments);
    if (allAssignments.length > 0) {
      const { error: assignmentsError } = await supabase!
        .from('user_persistent_assignments')
        .upsert(allAssignments, { onConflict: 'id' });
      
      if (assignmentsError) throw new Error(`Assignments backup failed: ${assignmentsError.message}`);
      stats.assignments = allAssignments.length;
    }

    // 7. Backup Platinum Standards
    const allStandards = await db.select().from(platinumStandards);
    if (allStandards.length > 0) {
      const { error: standardsError } = await supabase!
        .from('platinum_standards')
        .upsert(allStandards, { onConflict: 'id' });
      
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
      dailyRituals: 0,
      emotionalTrackers: 0,
      courseProgress: 0,
      assignments: 0,
    };

    // 1. User data
    const userData = await db.select().from(users).where(eq(users.id, userId));
    if (userData.length > 0) {
      await supabase!.from('users').upsert(userData, { onConflict: 'id' });
      stats.users = 1;
    }

    // 2. HRCM weeks
    const userHercm = await db.select().from(hercmWeeks).where(eq(hercmWeeks.userId, userId));
    if (userHercm.length > 0) {
      await supabase!.from('hercm_weeks').upsert(userHercm, { onConflict: 'id' });
      stats.hercmWeeks = userHercm.length;
    }

    // 3. Daily rituals
    const userRituals = await db.select().from(dailyRituals).where(eq(dailyRituals.userId, userId));
    if (userRituals.length > 0) {
      await supabase!.from('daily_rituals').upsert(userRituals, { onConflict: 'id' });
      stats.dailyRituals = userRituals.length;
    }

    // 4. Emotional trackers
    const userTrackers = await db.select().from(emotionalTrackers).where(eq(emotionalTrackers.userId, userId));
    if (userTrackers.length > 0) {
      await supabase!.from('emotional_trackers').upsert(userTrackers, { onConflict: 'id' });
      stats.emotionalTrackers = userTrackers.length;
    }

    // 5. Course progress
    const userProgress = await db.select().from(courseProgress).where(eq(courseProgress.userId, userId));
    if (userProgress.length > 0) {
      await supabase!.from('course_progress').upsert(userProgress, { onConflict: 'id' });
      stats.courseProgress = userProgress.length;
    }

    // 6. Assignments
    const userAssignments = await db.select().from(userPersistentAssignments).where(eq(userPersistentAssignments.userId, userId));
    if (userAssignments.length > 0) {
      await supabase!.from('user_persistent_assignments').upsert(userAssignments, { onConflict: 'id' });
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
      supabase!.from('daily_rituals').select('*', { count: 'exact', head: true }),
      supabase!.from('emotional_trackers').select('*', { count: 'exact', head: true }),
      supabase!.from('course_progress').select('*', { count: 'exact', head: true }),
      supabase!.from('user_persistent_assignments').select('*', { count: 'exact', head: true }),
      supabase!.from('platinum_standards').select('*', { count: 'exact', head: true }),
    ]);

    return {
      success: true,
      message: 'Backup statistics retrieved',
      stats: {
        users: usersCount.count || 0,
        hercmWeeks: hercmCount.count || 0,
        dailyRituals: ritualsCount.count || 0,
        emotionalTrackers: trackersCount.count || 0,
        courseProgress: progressCount.count || 0,
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
