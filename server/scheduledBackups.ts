import cron from 'node-cron';
import { backupService } from './supabaseBackup.js';

export function initializeScheduledBackups() {
  // Schedule daily backup at 2 AM (server time)
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Running scheduled daily backup to Supabase...');
    try {
      const results = await backupService.backupAllTables({
        includeAccessLogs: false // Exclude access logs from automated backups
      });
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      console.log(`✅ Scheduled backup complete: ${successCount} success, ${errorCount} errors`);
    } catch (error: any) {
      console.error('❌ Scheduled backup failed:', error.message);
    }
  });

  // Schedule weekly full backup (including access logs) every Sunday at 3 AM
  cron.schedule('0 3 * * 0', async () => {
    console.log('🕐 Running scheduled weekly FULL backup to Supabase (including access logs)...');
    try {
      const results = await backupService.backupAllTables({
        includeAccessLogs: true // Include access logs in weekly backup
      });
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      console.log(`✅ Weekly full backup complete: ${successCount} success, ${errorCount} errors`);
    } catch (error: any) {
      console.error('❌ Weekly backup failed:', error.message);
    }
  });

  console.log('✅ Scheduled backups initialized:');
  console.log('   - Daily backup: 2:00 AM (excludes access logs)');
  console.log('   - Weekly full backup: Sunday 3:00 AM (includes access logs)');
}
