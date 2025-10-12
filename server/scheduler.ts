import cron from 'node-cron';
import { storage } from './storage';
import { emailService } from './emailService';

export function setupScheduledTasks() {
  // Weekly HRCM reminder - Every Monday at 9:00 AM IST
  cron.schedule('0 9 * * 1', async () => {
    try {
      console.log('Running weekly HRCM reminder job...');
      
      const allUsers = await storage.getAllUsers();
      const currentWeek = Math.ceil((Date.now() - new Date(new Date().getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      
      for (const user of allUsers) {
        if (user.email) {
          try {
            const sent = await emailService.sendWeeklyReminder(user, currentWeek);
            if (sent) {
              console.log(`Weekly reminder sent to ${user.email}`);
            }
          } catch (error) {
            console.error(`Failed to send reminder to ${user.email}:`, error);
          }
        }
      }
      
      console.log('Weekly reminder job completed');
    } catch (error) {
      console.error('Error in weekly reminder job:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // Check for Platinum badges - Every Sunday at 11:59 PM IST (end of week)
  cron.schedule('59 23 * * 0', async () => {
    try {
      console.log('Running Platinum badge check job...');
      
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();
      
      const allUsers = await storage.getAllUsers();
      
      for (const user of allUsers) {
        try {
          const weeks = await storage.getHercmWeeksByUser(user.id);
          const monthlyWeeks = weeks.filter(w => {
            const weekDate = new Date(w.createdAt);
            return weekDate.getMonth() + 1 === month && weekDate.getFullYear() === year;
          });
          
          if (monthlyWeeks.length === 0) continue;
          
          const avgAchievement = monthlyWeeks.reduce((sum, w) => sum + (w.achievementRate || 0), 0) / monthlyWeeks.length;
          
          if (avgAchievement > 80) {
            const progress = await storage.getPlatinumProgress(user.id) || await storage.createPlatinumProgress({ userId: user.id });
            
            const badgeId = `platinum-${month}-${year}`;
            const existingBadges = progress.badges || [];
            const alreadyHas = existingBadges.some((b: any) => b.id === badgeId);
            
            if (!alreadyHas) {
              const platinumBadge = {
                id: badgeId,
                name: 'Platinum Standards',
                achievedAt: new Date().toISOString(),
                description: `Achieved ${avgAchievement.toFixed(0)}% monthly progress in ${month}/${year}`
              };
              
              await storage.updatePlatinumProgress(user.id, {
                badges: [...existingBadges, platinumBadge],
                platinumAchieved: true,
                platinumAchievedAt: new Date()
              });
              
              // Send email notification
              if (user.email) {
                await emailService.sendPlatinumBadgeNotification(user);
                console.log(`Platinum badge awarded and email sent to ${user.email}`);
              }
            }
          }
        } catch (error) {
          console.error(`Error checking platinum for user ${user.id}:`, error);
        }
      }
      
      console.log('Platinum badge check job completed');
    } catch (error) {
      console.error('Error in platinum badge check job:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('Scheduled tasks initialized:');
  console.log('  - Weekly HRCM reminders: Every Monday 9:00 AM IST');
  console.log('  - Platinum badge check: Every Sunday 11:59 PM IST');
}
