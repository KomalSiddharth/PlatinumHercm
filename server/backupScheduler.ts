import cron, { type ScheduledTask } from 'node-cron';
import { backupAllData } from './backupService.js';
import { isSupabaseConfigured } from './supabase.js';

/**
 * Automated Backup Scheduler
 * Runs backups every 1 minute for maximum data protection
 */

let backupTask: ScheduledTask | null = null;

export function startBackupScheduler() {
  if (!isSupabaseConfigured) {
    console.log('[BACKUP SCHEDULER] Supabase not configured. Automated backups disabled.');
    return;
  }

  // Schedule backup every 1 minute
  // Cron format: minute hour day month weekday
  // * * * * * = every minute
  backupTask = cron.schedule('* * * * *', async () => {
    console.log('[BACKUP SCHEDULER] Starting scheduled backup (every 1 minute)...');
    try {
      const result = await backupAllData();
      if (result.success) {
        console.log('[BACKUP SCHEDULER] ✓ Backup completed successfully:', result.stats);
      } else {
        console.error('[BACKUP SCHEDULER] ✗ Backup failed:', result.error);
      }
    } catch (error) {
      console.error('[BACKUP SCHEDULER] ✗ Backup error:', error);
    }
  }, {
    timezone: 'Asia/Kolkata' // IST timezone
  });

  console.log('[BACKUP SCHEDULER] ✓ Backup scheduled every 1 minute (max 1 min data loss)');
}

export function stopBackupScheduler() {
  if (backupTask) {
    backupTask.stop();
    backupTask = null;
    console.log('[BACKUP SCHEDULER] Stopped');
  }
}

export function getSchedulerStatus() {
  return {
    running: backupTask !== null,
    configured: isSupabaseConfigured,
    schedule: 'Every 1 minute (max 1 min data loss)',
  };
}
