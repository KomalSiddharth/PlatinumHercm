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

  // 🔥 NEW: Daily auto-copy data for all users - Every day at 12:01 AM IST
  cron.schedule('1 0 * * *', async () => {
    try {
      console.log('[DAILY AUTO-COPY] Starting daily data copy job at midnight...');
      
      const now = new Date();
      const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      
      console.log(`[DAILY AUTO-COPY] Current date: ${todayStr}`);
      
      const allUsers = await storage.getAllUsers();
      console.log(`[DAILY AUTO-COPY] Processing ${allUsers.length} users...`);
      
      let copiedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      
      for (const user of allUsers) {
        try {
          // Check if today's data already exists
          const allWeeks = await storage.getAllHercmWeeksByUserWithDates(user.id);
          const todayData = allWeeks?.filter((w: any) => w.dateString === todayStr);
          
          if (todayData && todayData.length > 0) {
            console.log(`[DAILY AUTO-COPY] User ${user.email}: Today's data already exists, skipping`);
            skippedCount++;
            continue;
          }
          
          // Find last available data (search backward up to 7 days)
          let sourceData = null;
          let sourceDate = '';
          
          for (let i = 1; i <= 7; i++) {
            const searchDateTime = new Date(todayStr);
            searchDateTime.setDate(searchDateTime.getDate() - i);
            const searchDate = `${searchDateTime.getFullYear()}-${String(searchDateTime.getMonth() + 1).padStart(2, '0')}-${String(searchDateTime.getDate()).padStart(2, '0')}`;
            
            const previousData = allWeeks?.filter((w: any) => w.dateString === searchDate);
            
            if (previousData && previousData.length > 0) {
              sourceData = previousData.sort((a: any, b: any) => 
                new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )[0];
              sourceDate = searchDate;
              break;
            }
          }
          
          if (!sourceData) {
            console.log(`[DAILY AUTO-COPY] User ${user.email}: No previous data found in last 7 days, skipping`);
            skippedCount++;
            continue;
          }
          
          console.log(`[DAILY AUTO-COPY] User ${user.email}: Copying data from ${sourceDate} to ${todayStr}`);
          
          // 🔥 SMART AUTO-DETECTION: Check if previous data had auto-sync enabled
          const hadAutoSync = (
            // Check if CW == NWT for all 4 HRCM areas
            sourceData.healthProblems === sourceData.healthResult &&
            sourceData.healthCurrentFeelings === sourceData.healthNextFeelings &&
            sourceData.healthCurrentBelief === sourceData.healthNextTarget &&
            sourceData.healthCurrentActions === sourceData.healthNextActions &&
            sourceData.relationshipProblems === sourceData.relationshipResult &&
            sourceData.relationshipCurrentFeelings === sourceData.relationshipNextFeelings &&
            sourceData.relationshipCurrentBelief === sourceData.relationshipNextTarget &&
            sourceData.relationshipCurrentActions === sourceData.relationshipNextActions &&
            sourceData.careerProblems === sourceData.careerResult &&
            sourceData.careerCurrentFeelings === sourceData.careerNextFeelings &&
            sourceData.careerCurrentBelief === sourceData.careerNextTarget &&
            sourceData.careerCurrentActions === sourceData.careerNextActions &&
            sourceData.moneyProblems === sourceData.moneyResult &&
            sourceData.moneyCurrentFeelings === sourceData.moneyNextFeelings &&
            sourceData.moneyCurrentBelief === sourceData.moneyNextTarget &&
            sourceData.moneyCurrentActions === sourceData.moneyNextActions &&
            // Check if checklists also match
            JSON.stringify(sourceData.healthProblemsChecklist || []) === JSON.stringify(sourceData.healthResultChecklist || []) &&
            JSON.stringify(sourceData.healthFeelingsCurrentChecklist || []) === JSON.stringify(sourceData.healthFeelingsChecklist || []) &&
            JSON.stringify(sourceData.healthBeliefsCurrentChecklist || []) === JSON.stringify(sourceData.healthBeliefsChecklist || []) &&
            JSON.stringify(sourceData.healthActionsCurrentChecklist || []) === JSON.stringify(sourceData.healthActionsChecklist || []) &&
            JSON.stringify(sourceData.relationshipProblemsChecklist || []) === JSON.stringify(sourceData.relationshipResultChecklist || []) &&
            JSON.stringify(sourceData.relationshipFeelingsCurrentChecklist || []) === JSON.stringify(sourceData.relationshipFeelingsChecklist || []) &&
            JSON.stringify(sourceData.relationshipBeliefsCurrentChecklist || []) === JSON.stringify(sourceData.relationshipBeliefsChecklist || []) &&
            JSON.stringify(sourceData.relationshipActionsCurrentChecklist || []) === JSON.stringify(sourceData.relationshipActionsChecklist || []) &&
            JSON.stringify(sourceData.careerProblemsChecklist || []) === JSON.stringify(sourceData.careerResultChecklist || []) &&
            JSON.stringify(sourceData.careerFeelingsCurrentChecklist || []) === JSON.stringify(sourceData.careerFeelingsChecklist || []) &&
            JSON.stringify(sourceData.careerBeliefsCurrentChecklist || []) === JSON.stringify(sourceData.careerBeliefsChecklist || []) &&
            JSON.stringify(sourceData.careerActionsCurrentChecklist || []) === JSON.stringify(sourceData.careerActionsChecklist || []) &&
            JSON.stringify(sourceData.moneyProblemsChecklist || []) === JSON.stringify(sourceData.moneyResultChecklist || []) &&
            JSON.stringify(sourceData.moneyFeelingsCurrentChecklist || []) === JSON.stringify(sourceData.moneyFeelingsChecklist || []) &&
            JSON.stringify(sourceData.moneyBeliefsCurrentChecklist || []) === JSON.stringify(sourceData.moneyBeliefsChecklist || []) &&
            JSON.stringify(sourceData.moneyActionsCurrentChecklist || []) === JSON.stringify(sourceData.moneyActionsChecklist || [])
          );
          
          // Set manualNextWeekMode based on smart detection
          const detectedManualMode = !hadAutoSync;
          
          if (hadAutoSync) {
            console.log(`[DAILY AUTO-COPY] 🔄 Previous data had auto-sync enabled (CW == NWT) → Enabling auto-sync for ${todayStr}`);
          } else {
            console.log(`[DAILY AUTO-COPY] 📝 Previous data had manual planning (CW != NWT) → Preserving separate Next Week Target for ${todayStr}`);
          }
          
          // Create new record with today's date
          const newWeekData = {
            userId: user.id,
            weekNumber: sourceData.weekNumber,
            year: now.getFullYear(),
            dateString: todayStr,
            currentH: sourceData.currentH,
            currentE: sourceData.currentE,
            currentR: sourceData.currentR,
            currentC: sourceData.currentC,
            targetH: sourceData.targetH,
            targetE: sourceData.targetE,
            targetR: sourceData.targetR,
            targetC: sourceData.targetC,
            healthProblems: sourceData.healthProblems,
            healthCurrentFeelings: sourceData.healthCurrentFeelings,
            healthCurrentBelief: sourceData.healthCurrentBelief,
            healthCurrentActions: sourceData.healthCurrentActions,
            healthResult: sourceData.healthResult,
            healthNextFeelings: sourceData.healthNextFeelings,
            healthNextTarget: sourceData.healthNextTarget,
            healthNextActions: sourceData.healthNextActions,
            healthChecklist: sourceData.healthChecklist,
            healthAssignment: sourceData.healthAssignment,
            healthProblemsChecklist: sourceData.healthProblemsChecklist,
            healthFeelingsCurrentChecklist: sourceData.healthFeelingsCurrentChecklist,
            healthBeliefsCurrentChecklist: sourceData.healthBeliefsCurrentChecklist,
            healthActionsCurrentChecklist: sourceData.healthActionsCurrentChecklist,
            healthResultChecklist: sourceData.healthResultChecklist,
            healthFeelingsChecklist: sourceData.healthFeelingsChecklist,
            healthBeliefsChecklist: sourceData.healthBeliefsChecklist,
            healthActionsChecklist: sourceData.healthActionsChecklist,
            relationshipProblems: sourceData.relationshipProblems,
            relationshipCurrentFeelings: sourceData.relationshipCurrentFeelings,
            relationshipCurrentBelief: sourceData.relationshipCurrentBelief,
            relationshipCurrentActions: sourceData.relationshipCurrentActions,
            relationshipResult: sourceData.relationshipResult,
            relationshipNextFeelings: sourceData.relationshipNextFeelings,
            relationshipNextTarget: sourceData.relationshipNextTarget,
            relationshipNextActions: sourceData.relationshipNextActions,
            relationshipChecklist: sourceData.relationshipChecklist,
            relationshipAssignment: sourceData.relationshipAssignment,
            relationshipProblemsChecklist: sourceData.relationshipProblemsChecklist,
            relationshipFeelingsCurrentChecklist: sourceData.relationshipFeelingsCurrentChecklist,
            relationshipBeliefsCurrentChecklist: sourceData.relationshipBeliefsCurrentChecklist,
            relationshipActionsCurrentChecklist: sourceData.relationshipActionsCurrentChecklist,
            relationshipResultChecklist: sourceData.relationshipResultChecklist,
            relationshipFeelingsChecklist: sourceData.relationshipFeelingsChecklist,
            relationshipBeliefsChecklist: sourceData.relationshipBeliefsChecklist,
            relationshipActionsChecklist: sourceData.relationshipActionsChecklist,
            careerProblems: sourceData.careerProblems,
            careerCurrentFeelings: sourceData.careerCurrentFeelings,
            careerCurrentBelief: sourceData.careerCurrentBelief,
            careerCurrentActions: sourceData.careerCurrentActions,
            careerResult: sourceData.careerResult,
            careerNextFeelings: sourceData.careerNextFeelings,
            careerNextTarget: sourceData.careerNextTarget,
            careerNextActions: sourceData.careerNextActions,
            careerChecklist: sourceData.careerChecklist,
            careerAssignment: sourceData.careerAssignment,
            careerProblemsChecklist: sourceData.careerProblemsChecklist,
            careerFeelingsCurrentChecklist: sourceData.careerFeelingsCurrentChecklist,
            careerBeliefsCurrentChecklist: sourceData.careerBeliefsCurrentChecklist,
            careerActionsCurrentChecklist: sourceData.careerActionsCurrentChecklist,
            careerResultChecklist: sourceData.careerResultChecklist,
            careerFeelingsChecklist: sourceData.careerFeelingsChecklist,
            careerBeliefsChecklist: sourceData.careerBeliefsChecklist,
            careerActionsChecklist: sourceData.careerActionsChecklist,
            moneyProblems: sourceData.moneyProblems,
            moneyCurrentFeelings: sourceData.moneyCurrentFeelings,
            moneyCurrentBelief: sourceData.moneyCurrentBelief,
            moneyCurrentActions: sourceData.moneyCurrentActions,
            moneyResult: sourceData.moneyResult,
            moneyNextFeelings: sourceData.moneyNextFeelings,
            moneyNextTarget: sourceData.moneyNextTarget,
            moneyNextActions: sourceData.moneyNextActions,
            moneyChecklist: sourceData.moneyChecklist,
            moneyAssignment: sourceData.moneyAssignment,
            moneyProblemsChecklist: sourceData.moneyProblemsChecklist,
            moneyFeelingsCurrentChecklist: sourceData.moneyFeelingsCurrentChecklist,
            moneyBeliefsCurrentChecklist: sourceData.moneyBeliefsCurrentChecklist,
            moneyActionsCurrentChecklist: sourceData.moneyActionsCurrentChecklist,
            moneyResultChecklist: sourceData.moneyResultChecklist,
            moneyFeelingsChecklist: sourceData.moneyFeelingsChecklist,
            moneyBeliefsChecklist: sourceData.moneyBeliefsChecklist,
            moneyActionsChecklist: sourceData.moneyActionsChecklist,
            unifiedAssignment: sourceData.unifiedAssignment,
            manualNextWeekMode: detectedManualMode
          };
          
          // Save the new record (UPSERT logic: delete existing + create new)
          const existingData = await storage.getHercmWeekByDate(user.id, newWeekData.weekNumber, todayStr);
          if (existingData) {
            console.log(`[DAILY AUTO-COPY] Deleting existing data for ${todayStr} before copying`);
            await storage.updateHercmWeek(existingData.id, newWeekData);
          } else {
            await storage.createHercmWeek(newWeekData);
          }
          
          // 🔥 COPY PLATINUM STANDARDS RATINGS from source date to today
          try {
            const sourcePlatinumRatings = await storage.getUserPlatinumStandardRatingsByDate(user.id, sourceDate);
            
            if (sourcePlatinumRatings && sourcePlatinumRatings.length > 0) {
              console.log(`[DAILY AUTO-COPY] Copying ${sourcePlatinumRatings.length} platinum standard ratings from ${sourceDate} to ${todayStr}`);
              
              for (const rating of sourcePlatinumRatings) {
                // Copy each rating to today's date
                await storage.upsertPlatinumStandardRating({
                  userId: user.id,
                  standardId: rating.standardId,
                  dateString: todayStr,
                  rating: rating.rating
                });
              }
              
              console.log(`[DAILY AUTO-COPY] ✅ Platinum standards ratings copied successfully`);
            } else {
              console.log(`[DAILY AUTO-COPY] No platinum standards ratings found for ${sourceDate}`);
            }
          } catch (error) {
            console.error(`[DAILY AUTO-COPY] Error copying platinum standards ratings:`, error);
            // Don't fail the entire job if ratings copy fails
          }
          
          console.log(`[DAILY AUTO-COPY] ✅ User ${user.email}: Successfully copied data from ${sourceDate} to ${todayStr}`);
          copiedCount++;
          
        } catch (error) {
          console.error(`[DAILY AUTO-COPY] ❌ Error processing user ${user.email}:`, error);
          errorCount++;
        }
      }
      
      console.log(`[DAILY AUTO-COPY] Job completed: ${copiedCount} copied, ${skippedCount} skipped, ${errorCount} errors`);
    } catch (error) {
      console.error('[DAILY AUTO-COPY] Error in daily auto-copy job:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  // 🗑️ AUTO-DELETE EXPIRED EVENTS - Runs every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[SCHEDULER] Running expired events cleanup...');
    try {
      const deletedCount = await storage.deleteExpiredEvents();
      if (deletedCount > 0) {
        console.log(`[SCHEDULER] ✅ Deleted ${deletedCount} expired event(s)`);
      }
    } catch (error) {
      console.error('[SCHEDULER] ❌ Failed to delete expired events:', error);
    }
  }, {
    timezone: 'Asia/Kolkata'
  });

  console.log('Scheduled tasks initialized:');
  console.log('  - Weekly HRCM reminders: Every Monday 9:00 AM IST');
  console.log('  - Platinum badge check: Every Sunday 11:59 PM IST');
  console.log('  - Daily auto-copy data: Every day at 12:01 AM IST');
  console.log('  - Expired events cleanup: Every hour at :00 IST');
}
