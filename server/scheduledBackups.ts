import cron from 'node-cron';
import { backupService } from './supabaseBackup.js';

export function initializeScheduledBackups() {
  // Schedule real-time backup EVERY MINUTE for maximum data protection
  cron.schedule('* * * * *', async () => {
    console.log('🔄 Running 1-minute interval backup to Supabase...');
    try {
      const results = await backupService.backupAllTables({
        includeAccessLogs: false // Exclude access logs from frequent backups
      });
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
      
      console.log(`✅ 1-min backup: ${successCount}/${results.length} tables, ${totalRecords} records`);
      
      if (errorCount > 0) {
        console.error(`⚠️  ${errorCount} tables had errors during backup`);
      }
    } catch (error: any) {
      console.error('❌ 1-minute backup failed:', error.message);
    }
  });

  // Schedule daily full backup at 2 AM for comprehensive snapshot
  cron.schedule('0 2 * * *', async () => {
    console.log('🕐 Running scheduled daily FULL backup to Supabase...');
    try {
      const results = await backupService.backupAllTables({
        includeAccessLogs: true // Include access logs in daily comprehensive backup
      });
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
      
      console.log(`✅ Daily full backup complete: ${successCount} success, ${errorCount} errors, ${totalRecords} total records`);
    } catch (error: any) {
      console.error('❌ Daily backup failed:', error.message);
    }
  });

  console.log('✅ Scheduled backups initialized:');
  console.log('   - Real-time backup: EVERY 1 MINUTE (excludes access logs)');
  console.log('   - Daily full backup: 2:00 AM (includes access logs)');
  console.log('   - Maximum data loss: Only 1 MINUTE!');
  console.log('   - Total backups per day: 1440 + 1 daily full = 1441 backups!');
}
