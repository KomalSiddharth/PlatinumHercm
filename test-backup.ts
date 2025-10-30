// Test script to trigger Supabase backup manually
import { backupService } from './server/supabaseBackup.js';

async function testBackup() {
  console.log('🚀 Starting manual backup test...\n');
  
  try {
    // Trigger full backup
    const results = await backupService.backupAllTables({
      includeAccessLogs: false
    });
    
    console.log('\n📊 BACKUP RESULTS:\n');
    console.log('='.repeat(60));
    
    // Summary
    const successCount = results.filter(r => r.status === 'success').length;
    const errorCount = results.filter(r => r.status === 'error').length;
    const skippedCount = results.filter(r => r.status === 'skipped').length;
    const totalRecords = results.reduce((sum, r) => sum + r.recordsProcessed, 0);
    
    console.log(`\n✅ Success: ${successCount} tables`);
    console.log(`❌ Errors: ${errorCount} tables`);
    console.log(`⏭️  Skipped: ${skippedCount} tables`);
    console.log(`📝 Total records backed up: ${totalRecords}\n`);
    
    console.log('='.repeat(60));
    console.log('\nDETAILED RESULTS:\n');
    
    // Detailed results
    results.forEach((result, index) => {
      const icon = result.status === 'success' ? '✅' : result.status === 'error' ? '❌' : '⏭️';
      console.log(`${icon} ${index + 1}. ${result.table}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Records: ${result.recordsProcessed}`);
      if (result.message) {
        console.log(`   Message: ${result.message}`);
      }
      console.log('');
    });
    
    console.log('='.repeat(60));
    console.log('\n🎉 Backup test completed!\n');
    
    if (errorCount > 0) {
      console.error('⚠️  Some tables had errors. Check Supabase logs for details.');
      process.exit(1);
    } else {
      console.log('✅ All tables backed up successfully!');
      process.exit(0);
    }
  } catch (error: any) {
    console.error('\n❌ FATAL ERROR during backup:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run the test
testBackup();
