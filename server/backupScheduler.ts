import cron, { type ScheduledTask } from 'node-cron';
import { backupAllData } from './backupService.js';
import { isSupabaseConfigured } from './supabase.js';

/**
 * Automated Backup Scheduler
 * Runs daily backups at 2 AM IST (Indian Standard Time)
 */

let backupTask: ScheduledTask | null = null;

export function startBackupScheduler() {
  if (!isSupabaseConfigured) {
    console.log('[BACKUP SCHEDULER] Supabase not configured. Automated backups disabled.');
    return;
  }

  // Schedule daily backup at 2:00 AM IST
  // Cron format: minute hour day month weekday
  // 30 20 * * * = 8:30 PM UTC = 2:00 AM IST (IST is UTC+5:30)
  backupTask = cron.schedule('30 20 * * *', async () => {
    console.log('[BACKUP SCHEDULER] Starting scheduled backup at 2:00 AM IST...');
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

  console.log('[BACKUP SCHEDULER] ✓ Daily backup scheduled at 2:00 AM IST');
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
    schedule: '2:00 AM IST daily',
  };
}
