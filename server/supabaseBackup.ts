import { supabase, isSupabaseConfigured } from './supabase.js';
import { db } from './db.js';
import { 
  users, 
  approvedEmails, 
  hercmWeeks, 
  platinumProgress, 
  rituals, 
  ritualCompletions,
  courses,
  ratingProgression,
  courseVideos,
  courseVideoCompletions,
  adminCourseRecommendations,
  platinumStandards,
  emotionalTrackers,
  userPersistentAssignments,
  accessLogs
} from '@shared/schema.js';

type BackupResult = {
  table: string;
  status: 'success' | 'error' | 'skipped';
  recordsProcessed: number;
  message?: string;
};

type BackupOptions = {
  includeAccessLogs?: boolean;
  incrementalSince?: Date;
};

export class SupabaseBackupService {
  private isConfigured: boolean;

  constructor() {
    this.isConfigured = isSupabaseConfigured();
    if (!this.isConfigured) {
      console.warn('⚠️ Supabase not configured. Backup service disabled.');
    }
  }

  async backupTable<T extends Record<string, any>>(
    tableName: string,
    localData: T[],
    options?: { incrementalSince?: Date }
  ): Promise<BackupResult> {
    if (!this.isConfigured || !supabase) {
      return {
        table: tableName,
        status: 'skipped',
        recordsProcessed: 0,
        message: 'Supabase not configured'
      };
    }

    try {
      console.log(`📦 Backing up ${tableName}... (${localData.length} records)`);

      if (localData.length === 0) {
        return {
          table: tableName,
          status: 'success',
          recordsProcessed: 0,
          message: 'No data to backup'
        };
      }

      // Upsert data to Supabase (insert or update based on primary key)
      const { data, error } = await supabase
        .from(tableName)
        .upsert(localData as any, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        });

      if (error) {
        console.error(`❌ Error backing up ${tableName}:`, error);
        return {
          table: tableName,
          status: 'error',
          recordsProcessed: 0,
          message: error.message
        };
      }

      console.log(`✅ Successfully backed up ${tableName}: ${localData.length} records`);
      return {
        table: tableName,
        status: 'success',
        recordsProcessed: localData.length,
        message: 'Backup successful'
      };
    } catch (error: any) {
      console.error(`❌ Exception backing up ${tableName}:`, error);
      return {
        table: tableName,
        status: 'error',
        recordsProcessed: 0,
        message: error.message
      };
    }
  }

  async backupAllTables(options: BackupOptions = {}): Promise<BackupResult[]> {
    if (!this.isConfigured) {
      console.warn('⚠️ Supabase not configured. Skipping backup.');
      return [];
    }

    console.log('🚀 Starting full database backup to Supabase...');
    const startTime = Date.now();
    const results: BackupResult[] = [];

    try {
      // 1. Backup Users
      const usersData = await db.select().from(users);
      results.push(await this.backupTable('users', usersData));

      // 2. Backup Approved Emails
      const approvedEmailsData = await db.select().from(approvedEmails);
      results.push(await this.backupTable('approvedEmails', approvedEmailsData));

      // 3. Backup HRCM Weeks (CRITICAL - All dashboard data)
      const hercmWeeksData = await db.select().from(hercmWeeks);
      results.push(await this.backupTable('hrcmWeeks', hercmWeeksData));

      // 4. Backup Platinum Progress
      const platinumProgressData = await db.select().from(platinumProgress);
      results.push(await this.backupTable('platinumProgress', platinumProgressData));

      // 5. Backup Rituals
      const ritualsData = await db.select().from(rituals);
      results.push(await this.backupTable('rituals', ritualsData));

      // 6. Backup Ritual Completions
      const ritualCompletionsData = await db.select().from(ritualCompletions);
      results.push(await this.backupTable('ritualCompletions', ritualCompletionsData));

      // 7. Backup Courses
      const coursesData = await db.select().from(courses);
      results.push(await this.backupTable('courses', coursesData));

      // 8. Backup Rating Progression
      const ratingProgressionData = await db.select().from(ratingProgression);
      results.push(await this.backupTable('ratingProgression', ratingProgressionData));

      // 9. Backup Course Videos
      const courseVideosData = await db.select().from(courseVideos);
      results.push(await this.backupTable('courseVideos', courseVideosData));

      // 10. Backup Course Video Completions
      const courseVideoCompletionsData = await db.select().from(courseVideoCompletions);
      results.push(await this.backupTable('courseVideoCompletions', courseVideoCompletionsData));

      // 11. Backup Admin Course Recommendations
      const adminCourseRecommendationsData = await db.select().from(adminCourseRecommendations);
      results.push(await this.backupTable('adminCourseRecommendations', adminCourseRecommendationsData));

      // 12. Backup Platinum Standards
      const platinumStandardsData = await db.select().from(platinumStandards);
      results.push(await this.backupTable('platinumStandards', platinumStandardsData));

      // 13. Backup Emotional Trackers
      const emotionalTrackersData = await db.select().from(emotionalTrackers);
      results.push(await this.backupTable('emotionalTrackers', emotionalTrackersData));

      // 14. Backup User Persistent Assignments
      const userPersistentAssignmentsData = await db.select().from(userPersistentAssignments);
      results.push(await this.backupTable('userPersistentAssignments', userPersistentAssignmentsData));

      // 15. Backup Access Logs (optional)
      if (options.includeAccessLogs) {
        const accessLogsData = await db.select().from(accessLogs);
        results.push(await this.backupTable('accessLogs', accessLogsData));
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const successCount = results.filter(r => r.status === 'success').length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);

      console.log(`✅ Backup completed in ${duration}s`);
      console.log(`📊 ${successCount}/${results.length} tables backed up successfully`);
      console.log(`📝 Total records backed up: ${totalRecords}`);

      return results;
    } catch (error: any) {
      console.error('❌ Fatal error during backup:', error);
      throw error;
    }
  }

  async getBackupStatus(): Promise<{
    configured: boolean;
    lastBackup?: Date;
    tablesInSupabase?: string[];
  }> {
    if (!this.isConfigured || !supabase) {
      return { configured: false };
    }

    try {
      // Get list of tables in Supabase
      const { data, error } = await supabase.rpc('get_table_names');
      
      return {
        configured: true,
        tablesInSupabase: data || [],
      };
    } catch (error) {
      return {
        configured: true,
        tablesInSupabase: [],
      };
    }
  }

  async restoreFromBackup(tableName: string): Promise<any[]> {
    if (!this.isConfigured || !supabase) {
      throw new Error('Supabase not configured');
    }

    console.log(`🔄 Restoring ${tableName} from Supabase...`);

    const { data, error } = await supabase
      .from(tableName)
      .select('*');

    if (error) {
      throw new Error(`Failed to restore ${tableName}: ${error.message}`);
    }

    console.log(`✅ Restored ${data?.length || 0} records from ${tableName}`);
    return data || [];
  }
}

export const backupService = new SupabaseBackupService();
