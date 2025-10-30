import cron from 'node-cron';
import { backupService } from './supabaseBackup.js';

export function initializeScheduledBackups() {
  // Schedule real-time backup every 10 minutes for maximum data protection
  cron.schedule('*/10 * * * *', async () => {
    console.log('🔄 Running 10-minute interval backup to Supabase...');
    try {
      const results = await backupService.backupAllTables({
        includeAccessLogs: false // Exclude access logs from frequent backups
      });
      
      const successCount = results.filter(r => r.status === 'success').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
      
      console.log(`✅ 10-min backup: ${successCount}/${results.length} tables, ${totalRecords} records`);
      
      if (errorCount > 0) {
        console.error(`⚠️  ${errorCount} tables had errors during backup`);
      }
    } catch (error: any) {
      console.error('❌ 10-minute backup failed:', error.message);
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
  console.log('   - Real-time backup: Every 10 minutes (excludes access logs)');
  console.log('   - Daily full backup: 2:00 AM (includes access logs)');
  console.log('   - Maximum data loss: 10 minutes');
}
