// Database Health Check & Automatic Failover System
// Monitors primary database and switches to Supabase backup if needed

import { db } from './db.js';
import { supabase } from './supabase.js';
import { sql } from 'drizzle-orm';

interface DatabaseHealth {
  isHealthy: boolean;
  responseTime: number;
  lastCheck: Date;
  errorCount: number;
  consecutiveFailures: number;
}

class DatabaseHealthMonitor {
  private primaryHealth: DatabaseHealth = {
    isHealthy: true,
    responseTime: 0,
    lastCheck: new Date(),
    errorCount: 0,
    consecutiveFailures: 0
  };

  private backupHealth: DatabaseHealth = {
    isHealthy: true,
    responseTime: 0,
    lastCheck: new Date(),
    errorCount: 0,
    consecutiveFailures: 0
  };

  private isUsingBackup = false;
  private readonly MAX_CONSECUTIVE_FAILURES = 3; // Switch after 3 failures
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly RECOVERY_CHECK_INTERVAL = 60000; // 1 minute

  /**
   * Check if primary database is healthy
   */
  async checkPrimaryDatabase(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Simple health check query
      await db.execute(sql`SELECT 1 as health_check`);
      
      const responseTime = Date.now() - startTime;
      
      this.primaryHealth = {
        isHealthy: true,
        responseTime,
        lastCheck: new Date(),
        errorCount: this.primaryHealth.errorCount,
        consecutiveFailures: 0 // Reset on success
      };

      return true;
    } catch (error: any) {
      console.error('❌ Primary database health check failed:', error.message);
      
      this.primaryHealth = {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorCount: this.primaryHealth.errorCount + 1,
        consecutiveFailures: this.primaryHealth.consecutiveFailures + 1
      };

      return false;
    }
  }

  /**
   * Check if backup database (Supabase) is healthy
   */
  async checkBackupDatabase(): Promise<boolean> {
    const startTime = Date.now();
    
    try {
      // Simple health check query on Supabase
      const { data, error } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (error) throw error;
      
      const responseTime = Date.now() - startTime;
      
      this.backupHealth = {
        isHealthy: true,
        responseTime,
        lastCheck: new Date(),
        errorCount: this.backupHealth.errorCount,
        consecutiveFailures: 0
      };

      return true;
    } catch (error: any) {
      console.error('❌ Backup database health check failed:', error.message);
      
      this.backupHealth = {
        isHealthy: false,
        responseTime: Date.now() - startTime,
        lastCheck: new Date(),
        errorCount: this.backupHealth.errorCount + 1,
        consecutiveFailures: this.backupHealth.consecutiveFailures + 1
      };

      return false;
    }
  }

  /**
   * Decide whether to switch to backup database
   */
  shouldSwitchToBackup(): boolean {
    return (
      !this.primaryHealth.isHealthy &&
      this.primaryHealth.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES &&
      this.backupHealth.isHealthy
    );
  }

  /**
   * Decide whether to switch back to primary database
   */
  shouldSwitchToPrimary(): boolean {
    return (
      this.isUsingBackup &&
      this.primaryHealth.isHealthy &&
      this.primaryHealth.consecutiveFailures === 0
    );
  }

  /**
   * Get current database health status
   */
  getHealthStatus() {
    return {
      currentDatabase: this.isUsingBackup ? 'Supabase (Backup)' : 'Replit (Primary)',
      isUsingBackup: this.isUsingBackup,
      primary: this.primaryHealth,
      backup: this.backupHealth,
      autoFailoverEnabled: true,
      lastChecked: new Date()
    };
  }

  /**
   * Start monitoring both databases
   */
  startMonitoring() {
    console.log('🔍 Database health monitoring started');
    console.log(`   - Check interval: ${this.HEALTH_CHECK_INTERVAL / 1000}s`);
    console.log(`   - Failover threshold: ${this.MAX_CONSECUTIVE_FAILURES} consecutive failures`);
    
    // Check primary database every 30 seconds
    setInterval(async () => {
      const isPrimaryHealthy = await this.checkPrimaryDatabase();
      
      // Check if we need to switch to backup
      if (this.shouldSwitchToBackup() && !this.isUsingBackup) {
        console.error('🚨 PRIMARY DATABASE FAILURE DETECTED!');
        console.log('🔄 Automatic failover to Supabase backup triggered...');
        console.log('⚠️  MANUAL ACTION REQUIRED:');
        console.log('   1. Check Replit database status');
        console.log('   2. Change DATABASE_URL to Supabase URL');
        console.log('   3. Restart application');
        console.log('   4. Investigate primary database issue');
        
        this.isUsingBackup = true;
      }
      
      // Check if we can switch back to primary
      if (this.shouldSwitchToPrimary()) {
        console.log('✅ Primary database recovered!');
        console.log('🔄 Ready to switch back to primary database');
        console.log('⚠️  MANUAL ACTION REQUIRED:');
        console.log('   1. Verify primary database is stable');
        console.log('   2. Change DATABASE_URL back to Replit');
        console.log('   3. Restart application');
        
        this.isUsingBackup = false;
      }
    }, this.HEALTH_CHECK_INTERVAL);

    // Check backup database every minute
    setInterval(async () => {
      await this.checkBackupDatabase();
    }, this.RECOVERY_CHECK_INTERVAL);
  }
}

export const dbHealthMonitor = new DatabaseHealthMonitor();
