// Server routes with Replit Auth integration
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { fetchCourseData, findMatchingCourse, recommendCourses, fetchEnhancedCourseData } from "./googleSheets";
import { parseCourseCSV } from "./csvCourseParser";
import { recommendCoursesRequestSchema, insertCourseVideoSchema } from "@shared/schema";
import { getAIRecommendations, generateAffirmation } from "./aiRecommendations";
import { generateHRCMWeeklyPDF, generateMonthlyProgressPDF } from "./pdfExport";
import { emailService } from "./emailService";
import { validateAndCapRating, updateRatingProgression, getRatingCaps, getRatingProgressionStatus } from "./ratingProgression";
import OpenAI from "openai";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Extend express-session to include custom session fields
declare module 'express-session' {
  interface SessionData {
    userEmail?: string;
    isAdmin?: boolean;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup Replit Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      // Prioritize email-based session auth to match login flow
      const userId = req.session.userEmail || req.user?.claims?.sub;
      console.log(`[AUTH/USER] Fetching user - session.userEmail=${req.session.userEmail}, claims.sub=${req.user?.claims?.sub}, userId=${userId}`);
      
      if (!userId) {
        console.log('[AUTH/USER] No userId found - returning 401');
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Try to get user by ID first
      let user = await storage.getUser(userId);
      
      // If not found and userId looks like an email, try getUserByEmail
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        console.log(`[AUTH/USER] User not found by ID, trying email lookup for ${userId}`);
        user = await storage.getUserByEmail(userId);
      }
      
      console.log(`[AUTH/USER] User lookup result for ${userId}:`, user ? 'Found' : 'Not found');
      
      // If user not found, return 404 instead of empty response
      if (!user) {
        console.log(`[AUTH/USER] User not found for userId=${userId} - returning 404`);
        return res.status(404).json({ message: "User not found" });
      }
      
      console.log(`[AUTH/USER] Returning user:`, user.id);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User HRCM routes (protected)
  app.get('/api/hercm/weeks', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get actual user to ensure we use correct user ID
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const weeks = await storage.getHercmWeeksByUser(user.id);
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching HRCM weeks:", error);
      res.status(500).json({ message: "Failed to fetch weeks" });
    }
  });

  app.get('/api/hercm/week/:weekNumber', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get actual user to ensure we use correct user ID
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const weekNumber = parseInt(req.params.weekNumber);
      let week = await storage.getHercmWeek(user.id, weekNumber);
      
      if (!week) {
        return res.json(null);
      }

      // Check if 7 days have passed since week creation
      const weekCreatedAt = week.createdAt ? new Date(week.createdAt) : new Date();
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - weekCreatedAt.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff >= 7) {
        // Auto-create new week with empty current week and prefilled next week
        const newWeekNumber = weekNumber + 1;
        
        // Check if next week already exists
        const existingNextWeek = await storage.getHercmWeek(userId, newWeekNumber);
        
        if (!existingNextWeek) {
          // Create new week with prefilled next week data from previous week's next week section
          const newWeekData = {
            userId,
            weekNumber: newWeekNumber,
            year: now.getFullYear(),
            
            // Current week - empty ratings (will be set manually)
            currentH: 0,
            currentE: 0,
            currentR: 0,
            currentC: 0,
            
            // Next week - prefilled from previous week's next week section
            targetH: week.targetH || 0,
            targetE: week.targetE || 0,
            targetR: week.targetR || 0,
            targetC: week.targetC || 0,
            
            // Next week assignments and checklist from previous week
            healthAssignment: week.healthAssignment || { courses: [], lessons: [] },
            healthChecklist: week.healthChecklist || [],
            relationshipAssignment: week.relationshipAssignment || { courses: [], lessons: [] },
            relationshipChecklist: week.relationshipChecklist || [],
            careerAssignment: week.careerAssignment || { courses: [], lessons: [] },
            careerChecklist: week.careerChecklist || [],
            moneyAssignment: week.moneyAssignment || { courses: [], lessons: [] },
            moneyChecklist: week.moneyChecklist || [],
          };
          
          await storage.createHercmWeek(newWeekData);
        }
        
        // Return the new week data with indicator for frontend
        week = await storage.getHercmWeek(userId, newWeekNumber) || week;
      }
      
      // Transform database format back to beliefs array for frontend
      const beliefs = [
        {
          category: 'Health',
          currentRating: week.currentH || 1,
          targetRating: week.targetH || 1,
          problems: week.healthProblems || '',
          currentFeelings: week.healthCurrentFeelings || '',
          currentBelief: week.healthCurrentBelief || '',
          currentActions: week.healthCurrentActions || '',
          result: week.healthResult || '',
          nextFeelings: week.healthNextFeelings || '',
          nextWeekTarget: week.healthNextTarget || '',
          nextActions: week.healthNextActions || '',
          checklist: week.healthChecklist || [],
          assignment: week.healthAssignment || { courses: [], lessons: [] },
          resultChecklist: week.healthResultChecklist || [],
          feelingsChecklist: week.healthFeelingsChecklist || [],
          beliefsChecklist: week.healthBeliefsChecklist || [],
          actionsChecklist: week.healthActionsChecklist || []
        },
        {
          category: 'Relationship',
          currentRating: week.currentE || 1,
          targetRating: week.targetE || 1,
          problems: week.relationshipProblems || '',
          currentFeelings: week.relationshipCurrentFeelings || '',
          currentBelief: week.relationshipCurrentBelief || '',
          currentActions: week.relationshipCurrentActions || '',
          result: week.relationshipResult || '',
          nextFeelings: week.relationshipNextFeelings || '',
          nextWeekTarget: week.relationshipNextTarget || '',
          nextActions: week.relationshipNextActions || '',
          checklist: week.relationshipChecklist || [],
          assignment: week.relationshipAssignment || { courses: [], lessons: [] },
          resultChecklist: week.relationshipResultChecklist || [],
          feelingsChecklist: week.relationshipFeelingsChecklist || [],
          beliefsChecklist: week.relationshipBeliefsChecklist || [],
          actionsChecklist: week.relationshipActionsChecklist || []
        },
        {
          category: 'Career',
          currentRating: week.currentR || 1,
          targetRating: week.targetR || 1,
          problems: week.careerProblems || '',
          currentFeelings: week.careerCurrentFeelings || '',
          currentBelief: week.careerCurrentBelief || '',
          currentActions: week.careerCurrentActions || '',
          result: week.careerResult || '',
          nextFeelings: week.careerNextFeelings || '',
          nextWeekTarget: week.careerNextTarget || '',
          nextActions: week.careerNextActions || '',
          checklist: week.careerChecklist || [],
          assignment: week.careerAssignment || { courses: [], lessons: [] },
          resultChecklist: week.careerResultChecklist || [],
          feelingsChecklist: week.careerFeelingsChecklist || [],
          beliefsChecklist: week.careerBeliefsChecklist || [],
          actionsChecklist: week.careerActionsChecklist || []
        },
        {
          category: 'Money',
          currentRating: week.currentC || 1,
          targetRating: week.targetC || 1,
          problems: week.moneyProblems || '',
          currentFeelings: week.moneyCurrentFeelings || '',
          currentBelief: week.moneyCurrentBelief || '',
          currentActions: week.moneyCurrentActions || '',
          result: week.moneyResult || '',
          nextFeelings: week.moneyNextFeelings || '',
          nextWeekTarget: week.moneyNextTarget || '',
          nextActions: week.moneyNextActions || '',
          checklist: week.moneyChecklist || [],
          assignment: week.moneyAssignment || { courses: [], lessons: [] },
          resultChecklist: week.moneyResultChecklist || [],
          feelingsChecklist: week.moneyFeelingsChecklist || [],
          beliefsChecklist: week.moneyBeliefsChecklist || [],
          actionsChecklist: week.moneyActionsChecklist || []
        }
      ];
      
      res.json({ ...week, beliefs });
    } catch (error) {
      console.error("Error fetching HERCM week:", error);
      res.status(500).json({ message: "Failed to fetch week" });
    }
  });

  app.post('/api/hercm/weeks', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const weekData = { ...req.body, userId };
      const week = await storage.createHercmWeek(weekData);
      res.json(week);
    } catch (error) {
      console.error("Error creating HERCM week:", error);
      res.status(500).json({ message: "Failed to create week" });
    }
  });

  // Generate Next Week - carries forward unchecked assignments
  app.post('/api/hercm/generate-next-week', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { weekNumber, beliefs } = req.body;
      const nextWeekNumber = weekNumber + 1;
      
      // Get unchecked lessons from current week's assignments
      const uncheckedAssignments: any = {
        health: { courses: [], lessons: [] },
        relationship: { courses: [], lessons: [] },
        career: { courses: [], lessons: [] },
        money: { courses: [], lessons: [] }
      };
      
      if (beliefs && Array.isArray(beliefs)) {
        beliefs.forEach((belief: any) => {
          const category = belief.category.toLowerCase();
          if (belief.assignment && belief.assignment.lessons) {
            // Filter only unchecked lessons
            const uncheckedLessons = belief.assignment.lessons.filter((l: any) => !l.completed);
            uncheckedAssignments[category] = {
              courses: belief.assignment.courses || [],
              lessons: uncheckedLessons
            };
          }
        });
      }
      
      // Create new week with carried-forward assignments
      const newWeekData = {
        userId,
        weekNumber: nextWeekNumber,
        year: new Date().getFullYear(),
        currentH: 1,
        currentE: 1,
        currentR: 1,
        currentC: 1,
        currentM: 1,
        healthAssignment: uncheckedAssignments.health,
        relationshipAssignment: uncheckedAssignments.relationship,
        careerAssignment: uncheckedAssignments.career,
        moneyAssignment: uncheckedAssignments.money
      };
      
      await storage.createHercmWeek(newWeekData as any);
      
      res.json({ success: true, weekNumber: nextWeekNumber });
    } catch (error) {
      console.error("Error generating next week:", error);
      res.status(500).json({ message: "Failed to generate next week" });
    }
  });

  // Auto-fill next week goals based on current week data
  app.post('/api/hercm/auto-fill-goals', isAuthenticated, async (req: any, res) => {
    try {
      const { currentH, currentE, currentR, currentC, currentM } = req.body;
      
      // Auto-fill logic: +1 if below 5, maintain if 5, +2 if very low
      const autoFill = (rating: number) => {
        if (!rating) return 3; // Default if no rating
        if (rating >= 5) return 5; // Maintain max
        if (rating <= 2) return Math.min(rating + 2, 5); // Aggressive improvement for low ratings
        return Math.min(rating + 1, 5); // Normal increment
      };
      
      const suggestions = {
        nextWeekH: autoFill(currentH),
        nextWeekE: autoFill(currentE),
        nextWeekR: autoFill(currentR),
        nextWeekC: autoFill(currentC),
        nextWeekM: autoFill(currentM),
      };
      
      res.json(suggestions);
    } catch (error) {
      console.error("Error auto-filling goals:", error);
      res.status(500).json({ message: "Failed to auto-fill goals" });
    }
  });

  // Save current week with comparison calculation
  app.post('/api/hercm/save-with-comparison', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Ensure user exists in users table (create if doesn't exist) - fixes FK constraint for rating_progression
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        const userEmail = typeof userId === 'string' && userId.includes('@') ? userId : req.session.userEmail;
        const claims = req.user?.claims;
        await storage.upsertUser({
          id: userId,
          email: userEmail || userId,
          firstName: claims?.first_name || null,
          lastName: claims?.last_name || null,
          profileImageUrl: claims?.profile_image_url || null,
        });
      }
      
      const weekData = { 
        ...req.body, 
        userId,
        year: req.body.year || new Date().getFullYear() // Add current year if not provided
      };
      
      // Map beliefs array to category-specific database columns
      if (weekData.beliefs && Array.isArray(weekData.beliefs)) {
        // Initialize default values for all H-E-R-C-M columns
        weekData.currentH = 1;
        weekData.targetH = 1;
        weekData.currentE = 1;
        weekData.targetE = 1;
        weekData.currentR = 1;
        weekData.targetR = 1;
        weekData.currentC = 1;
        weekData.targetC = 1;
        weekData.currentM = 1; // Default for unused Maturity column
        weekData.targetM = 1;
        
        weekData.beliefs.forEach((belief: any) => {
          const prefix = belief.category.toLowerCase(); // 'health', 'relationship', 'career', 'money'
          
          // Map rating fields to H-E-R-C-M format
          if (belief.category === 'Health') {
            weekData.currentH = belief.currentRating || 1;
            weekData.targetH = belief.targetRating || 1;
          } else if (belief.category === 'Relationship') {
            weekData.currentE = belief.currentRating || 1;
            weekData.targetE = belief.targetRating || 1;
          } else if (belief.category === 'Career') {
            weekData.currentR = belief.currentRating || 1;
            weekData.targetR = belief.targetRating || 1;
          } else if (belief.category === 'Money') {
            weekData.currentC = belief.currentRating || 1;
            weekData.targetC = belief.targetRating || 1;
          }
          
          // Map problems, feelings, actions fields
          weekData[`${prefix}Problems`] = belief.problems || '';
          weekData[`${prefix}CurrentFeelings`] = belief.currentFeelings || '';
          weekData[`${prefix}CurrentBelief`] = belief.currentBelief || '';
          weekData[`${prefix}CurrentActions`] = belief.currentActions || '';
          
          // Map next week fields (result, feelings, target, actions)
          weekData[`${prefix}Result`] = belief.result || '';
          weekData[`${prefix}NextFeelings`] = belief.nextFeelings || '';
          weekData[`${prefix}NextTarget`] = belief.nextWeekTarget || '';
          weekData[`${prefix}NextActions`] = belief.nextActions || '';
          
          // Map assignment
          weekData[`${prefix}Assignment`] = belief.assignment || { courses: [], lessons: [] };
          
          // Map checklist (Current Week Platinum Standards)
          weekData[`${prefix}Checklist`] = belief.checklist || [];
          
          // Map Next Week Target checklists
          weekData[`${prefix}ResultChecklist`] = belief.resultChecklist || [];
          weekData[`${prefix}FeelingsChecklist`] = belief.feelingsChecklist || [];
          weekData[`${prefix}BeliefsChecklist`] = belief.beliefsChecklist || [];
          weekData[`${prefix}ActionsChecklist`] = belief.actionsChecklist || [];
        });
      }
      
      // Apply rating caps before calculating improvements
      if (weekData.currentH !== null) {
        const healthResult = await validateAndCapRating(userId, 'health', weekData.currentH);
        weekData.currentH = healthResult.cappedRating;
      }
      if (weekData.currentE !== null) {
        const relationshipResult = await validateAndCapRating(userId, 'relationship', weekData.currentE);
        weekData.currentE = relationshipResult.cappedRating;
      }
      if (weekData.currentR !== null) {
        const careerResult = await validateAndCapRating(userId, 'career', weekData.currentR);
        weekData.currentR = careerResult.cappedRating;
      }
      if (weekData.currentC !== null) {
        const moneyResult = await validateAndCapRating(userId, 'money', weekData.currentC);
        weekData.currentC = moneyResult.cappedRating;
      }
      
      // Calculate improvements if targets exist
      if (weekData.targetH !== null && weekData.currentH !== null) {
        weekData.improvementH = weekData.currentH - (weekData.targetH || 0);
        weekData.improvementE = weekData.currentE - (weekData.targetE || 0);
        weekData.improvementR = weekData.currentR - (weekData.targetR || 0);
        weekData.improvementC = weekData.currentC - (weekData.targetC || 0);
        weekData.improvementM = weekData.currentM - (weekData.targetM || 0);
        
        // Calculate overall score and achievement rate
        const current = [weekData.currentH, weekData.currentE, weekData.currentR, weekData.currentC, weekData.currentM];
        weekData.overallScore = Math.round(current.reduce((a, b) => a + (b || 0), 0) / 5);
        
        // Achievement rate: percentage of goals achieved or exceeded
        const achievements = [
          weekData.improvementH >= 0 ? 1 : 0,
          weekData.improvementE >= 0 ? 1 : 0,
          weekData.improvementR >= 0 ? 1 : 0,
          weekData.improvementC >= 0 ? 1 : 0,
          weekData.improvementM >= 0 ? 1 : 0,
        ];
        weekData.achievementRate = Math.round((achievements.reduce((a, b) => a + b, 0) / 5) * 100);
      }
      
      // SNAPSHOT logic: Always create a new record with timestamp for date-wise history
      // This allows users to see all edits/saves in the history section
      const week = await storage.createHercmWeek(weekData);
      
      // Update rating progression after saving (pass weekNumber to prevent replay attacks)
      if (weekData.currentH !== null) {
        await updateRatingProgression(userId, 'health', weekData.currentH, weekData.weekNumber);
      }
      if (weekData.currentE !== null) {
        await updateRatingProgression(userId, 'relationship', weekData.currentE, weekData.weekNumber);
      }
      if (weekData.currentR !== null) {
        await updateRatingProgression(userId, 'career', weekData.currentR, weekData.weekNumber);
      }
      if (weekData.currentC !== null) {
        await updateRatingProgression(userId, 'money', weekData.currentC, weekData.weekNumber);
      }
      
      res.json(week);
    } catch (error) {
      console.error("Error saving week with comparison:", error);
      res.status(500).json({ message: "Failed to save week" });
    }
  });

  // Get comparison data for a specific week
  app.get('/api/hercm/comparison/:weekId', isAuthenticated, async (req: any, res) => {
    try {
      const { weekId } = req.params;
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const weeks = await storage.getHercmWeeksByUser(userId);
      const week = weeks.find((w: any) => w.id === weekId);
      
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }
      
      const comparison = {
        Hope: { target: week.targetH, actual: week.currentH, improvement: week.improvementH },
        Energy: { target: week.targetE, actual: week.currentE, improvement: week.improvementE },
        Respect: { target: week.targetR, actual: week.currentR, improvement: week.improvementR },
        Courage: { target: week.targetC, actual: week.currentC, improvement: week.improvementC },
        Maturity: { target: week.targetM, actual: week.currentM, improvement: week.improvementM },
        overallScore: week.overallScore,
        achievementRate: week.achievementRate,
      };
      
      res.json(comparison);
    } catch (error) {
      console.error("Error fetching comparison:", error);
      res.status(500).json({ message: "Failed to fetch comparison" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { viewType, year, month, week } = req.query;
      const weeks = await storage.getHercmWeeksByUser(userId);

      if (viewType === 'weekly') {
        // Group by week and calculate averages
        const weeklyData: Array<{ week: string; Health: number; Relationship: number; Career: number; Money: number }> = [];
        
        // Calculate progress based on ACTUAL checklist length, not hardcoded 4
        const calculateProgress = (checklistData: any) => {
          if (!checklistData) {
            console.log('[ANALYTICS] Checklist data is null/undefined');
            return 0;
          }
          // Handle both JSON string and already-parsed array
          const checklist = typeof checklistData === 'string' 
            ? JSON.parse(checklistData) 
            : checklistData;
          if (!Array.isArray(checklist) || checklist.length === 0) {
            console.log('[ANALYTICS] Checklist is not array or empty:', checklist);
            return 0;
          }
          const checked = checklist.filter((c: any) => c.checked).length;
          const progress = (checked / checklist.length) * 100;
          console.log('[ANALYTICS] Checklist progress:', { checked, total: checklist.length, progress });
          return progress;
        };
        
        // For each unique week number, calculate progress
        weeks.forEach((week: any) => {
          // Skip if we already processed this week
          if (weeklyData.some(w => w.week === `W${week.weekNumber}`)) {
            return;
          }
          
          console.log(`[ANALYTICS] Processing Week ${week.weekNumber}`);
          const healthProgress = calculateProgress(week.healthChecklist);
          const relationshipProgress = calculateProgress(week.relationshipChecklist);
          const careerProgress = calculateProgress(week.careerChecklist);
          const moneyProgress = calculateProgress(week.moneyChecklist);

          weeklyData.push({
            week: `W${week.weekNumber}`,
            Health: Math.round(healthProgress),
            Relationship: Math.round(relationshipProgress),
            Career: Math.round(careerProgress),
            Money: Math.round(moneyProgress),
          });
        });

        console.log('[ANALYTICS] Final weeklyData:', weeklyData);
        res.json({ weeklyData: weeklyData.slice(-5) }); // Last 5 weeks
      } else if (viewType === 'monthly') {
        // Group by month and calculate averages
        const monthlyData: Array<{ month: string; Health: number; Relationship: number; Career: number; Money: number }> = [];
        const monthMap = new Map();

        weeks.forEach((w: any) => {
          const createdDate = new Date(w.createdAt);
          const monthKey = `${createdDate.getFullYear()}-${createdDate.getMonth()}`;
          if (!monthMap.has(monthKey)) {
            monthMap.set(monthKey, []);
          }
          monthMap.get(monthKey).push(w);
        });

        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        // Helper to calculate progress based on ACTUAL checklist length
        const calculateProgress = (checklistData: any) => {
          if (!checklistData) return 0;
          // Handle both JSON string and already-parsed array
          const checklist = typeof checklistData === 'string' 
            ? JSON.parse(checklistData) 
            : checklistData;
          if (!Array.isArray(checklist) || checklist.length === 0) return 0;
          const checked = checklist.filter((c: any) => c.checked).length;
          return (checked / checklist.length) * 100;
        };
        
        Array.from(monthMap.entries()).forEach(([monthKey, monthWeeks]) => {
          const [year, month] = monthKey.split('-');
          const avgHealth = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            return sum + calculateProgress(w.healthChecklist);
          }, 0) / monthWeeks.length);

          const avgRelationship = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            return sum + calculateProgress(w.relationshipChecklist);
          }, 0) / monthWeeks.length);

          const avgCareer = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            return sum + calculateProgress(w.careerChecklist);
          }, 0) / monthWeeks.length);

          const avgMoney = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            return sum + calculateProgress(w.moneyChecklist);
          }, 0) / monthWeeks.length);

          monthlyData.push({
            month: monthNames[parseInt(month)],
            Health: avgHealth,
            Relationship: avgRelationship,
            Career: avgCareer,
            Money: avgMoney,
          });
        });

        res.json({ monthlyData: monthlyData.slice(-12) }); // Last 12 months
      } else {
        res.json({ weeklyData: [], monthlyData: [] });
      }
    } catch (error) {
      console.error("Error fetching analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Platinum Progress routes
  app.get('/api/platinum/progress', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const progress = await storage.getPlatinumProgress(userId);
      res.json(progress || { userId, currentStreak: 0, totalPoints: 0, badges: [] });
    } catch (error) {
      console.error("Error fetching platinum progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Rating Progression routes
  app.get('/api/rating-progression/caps', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const caps = await getRatingCaps(userId);
      res.json(caps);
    } catch (error) {
      console.error("Error fetching rating caps:", error);
      res.status(500).json({ message: "Failed to fetch rating caps" });
    }
  });

  app.get('/api/rating-progression/status', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const status = await getRatingProgressionStatus(userId);
      res.json(status || {
        healthMaxRating: 7,
        relationshipMaxRating: 7,
        careerMaxRating: 7,
        moneyMaxRating: 7,
        healthWeeksAtMax: 0,
        relationshipWeeksAtMax: 0,
        careerWeeksAtMax: 0,
        moneyWeeksAtMax: 0,
      });
    } catch (error) {
      console.error("Error fetching rating progression status:", error);
      res.status(500).json({ message: "Failed to fetch rating progression status" });
    }
  });

  // Admin routes (protected)
  app.get('/api/admin/users', isAuthenticated, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Search user by email
  app.get('/api/admin/search-user', isAuthenticated, async (req, res) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ message: "Email parameter required" });
      }

      const users = await storage.getAllUsers();
      const matchedUser = users.find(u => 
        u.email?.toLowerCase().includes(email.toLowerCase())
      );

      if (!matchedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json(matchedUser);
    } catch (error) {
      console.error("Error searching user:", error);
      res.status(500).json({ message: "Failed to search user" });
    }
  });

  // Admin: Search user by name with compact activity
  app.get('/api/admin/search-user-by-name', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name parameter required" });
      }

      const users = await storage.getAllUsers();
      const matchedUsers = users.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const searchTerm = name.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
      });

      if (matchedUsers.length === 0) {
        return res.status(404).json({ message: "No users found" });
      }

      // Get compact activity for each matched user
      const usersWithActivity = await Promise.all(
        matchedUsers.map(async (user) => {
          const weeks = await storage.getHercmWeeksByUser(user.id);
          const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
          
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            latestWeek: latestWeek ? {
              weekNumber: latestWeek.weekNumber,
              healthRating: latestWeek.currentH || 0,
              relationshipRating: latestWeek.currentE || 0,
              careerRating: latestWeek.currentR || 0,
              moneyRating: latestWeek.currentC || 0,
              healthProblem: latestWeek.healthProblems || '',
              relationshipProblem: latestWeek.relationshipProblems || '',
              careerProblem: latestWeek.careerProblems || '',
              moneyProblem: latestWeek.moneyProblems || '',
              overallScore: latestWeek.overallScore || 0,
            } : null,
            totalWeeks: weeks.length,
          };
        })
      );

      res.json(usersWithActivity);
    } catch (error) {
      console.error("Error searching user by name:", error);
      res.status(500).json({ message: "Failed to search user" });
    }
  });

  // User: Search team members by name with compact activity (accessible to all authenticated users)
  app.get('/api/team/search-users', isAuthenticated, async (req, res) => {
    try {
      const { name } = req.query;
      if (!name || typeof name !== 'string') {
        return res.status(400).json({ message: "Name parameter required" });
      }

      const users = await storage.getAllUsers();
      const matchedUsers = users.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase();
        const email = (u.email || '').toLowerCase();
        const searchTerm = name.toLowerCase();
        return fullName.includes(searchTerm) || email.includes(searchTerm);
      });

      if (matchedUsers.length === 0) {
        return res.status(404).json({ message: "No users found" });
      }

      // Get compact activity for each matched user
      const usersWithActivity = await Promise.all(
        matchedUsers.map(async (user) => {
          const weeks = await storage.getHercmWeeksByUser(user.id);
          const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
          
          return {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            latestWeek: latestWeek ? {
              weekNumber: latestWeek.weekNumber,
              healthRating: latestWeek.currentH || 0,
              relationshipRating: latestWeek.currentE || 0,
              careerRating: latestWeek.currentR || 0,
              moneyRating: latestWeek.currentC || 0,
              healthProblem: latestWeek.healthProblems || '',
              relationshipProblem: latestWeek.relationshipProblems || '',
              careerProblem: latestWeek.careerProblems || '',
              moneyProblem: latestWeek.moneyProblems || '',
              overallScore: latestWeek.overallScore || 0,
            } : null,
            totalWeeks: weeks.length,
          };
        })
      );

      res.json(usersWithActivity);
    } catch (error) {
      console.error("Error searching team users:", error);
      res.status(500).json({ message: "Failed to search team users" });
    }
  });

  app.get('/api/admin/user/:userId/weeks', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const weeks = await storage.getHercmWeeksByUser(userId);
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching user weeks:", error);
      res.status(500).json({ message: "Failed to fetch user weeks" });
    }
  });

  // Admin: Get specific user's detailed analytics (rituals, badges, progress)
  app.get('/api/admin/user/:userId/analytics', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get HRCM weeks
      const weeks = await storage.getHercmWeeksByUser(userId);
      
      // Get rituals
      const rituals = await storage.getRitualsByUser(userId);
      
      // Get today's completions
      const todayDate = new Date().toISOString().split('T')[0];
      const todayCompletions = await storage.getRitualCompletionsByDate(userId, todayDate);
      
      // Calculate ritual points
      const ritualPoints = rituals.reduce((sum, ritual) => {
        const isCompleted = todayCompletions.some(c => c.ritualId === ritual.id);
        if (!isCompleted || !ritual.isActive) return sum;
        const points = ritual.frequency === 'daily' ? 50 : 75;
        return sum + points;
      }, 0);
      
      // Get platinum progress/badges
      const platinumProgress = await storage.getPlatinumProgress(userId);
      
      // Calculate weekly analytics
      const weeklyAnalytics = weeks.map(week => ({
        weekNumber: week.weekNumber,
        overallScore: week.overallScore,
        achievementRate: week.achievementRate,
        currentH: week.currentH,
        currentE: week.currentE,
        currentR: week.currentR,
        currentC: week.currentC,
      }));
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isAdmin: user.isAdmin,
        },
        weeks: weeklyAnalytics,
        rituals: rituals.map(r => ({
          id: r.id,
          title: r.title,
          frequency: r.frequency,
          isActive: r.isActive,
          completed: todayCompletions.some(c => c.ritualId === r.id),
        })),
        ritualPoints,
        platinumProgress: platinumProgress || { badges: [], currentStreak: 0, totalPoints: 0 },
      });
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ message: "Failed to fetch user analytics" });
    }
  });

  // Admin: Get enhanced user detailed analytics with emotion trends and regularity
  app.get('/api/admin/user/:userId/detailed-analytics', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Get all HRCM weeks
      const weeks = await storage.getHercmWeeksByUser(userId);
      const sortedWeeks = weeks.sort((a, b) => a.weekNumber - b.weekNumber);
      
      // Get rituals and platinum progress
      const rituals = await storage.getRitualsByUser(userId);
      const platinumProgress = await storage.getPlatinumProgress(userId);
      
      // Calculate emotion trends
      const emotionTrends = sortedWeeks.map(week => ({
        weekNumber: week.weekNumber,
        healthEmotion: week.healthEmotionScore || 5,
        relationshipEmotion: week.relationshipEmotionScore || 5,
        careerEmotion: week.careerEmotionScore || 5,
        moneyEmotion: week.moneyEmotionScore || 5,
      }));
      
      // Calculate HRCM rating trends
      const hrcmTrends = sortedWeeks.map(week => ({
        weekNumber: week.weekNumber,
        health: week.currentH || 0,
        relationship: week.currentE || 0,
        career: week.currentR || 0,
        money: week.currentC || 0,
      }));
      
      // Calculate regularity/irregularity - count unique weeks only (not duplicate entries)
      const uniqueWeekNumbers = new Set(sortedWeeks.map(w => w.weekNumber));
      const totalWeeks = uniqueWeekNumbers.size;
      
      // Calculate expected weeks based on actual time since first week
      let expectedWeeks = 0;
      if (sortedWeeks.length > 0 && sortedWeeks[0].createdAt && sortedWeeks[sortedWeeks.length - 1].createdAt) {
        const firstWeekDate = new Date(sortedWeeks[0].createdAt as Date);
        const lastWeekDate = new Date(sortedWeeks[sortedWeeks.length - 1].createdAt as Date);
        const daysDiff = Math.floor((lastWeekDate.getTime() - firstWeekDate.getTime()) / (1000 * 60 * 60 * 24));
        expectedWeeks = Math.floor(daysDiff / 7) + 1; // +1 to include the first week
      }
      
      const regularity = expectedWeeks > 0 ? Math.round((totalWeeks / expectedWeeks) * 100) : 0;
      const missedWeeks = Math.max(0, expectedWeeks - totalWeeks);
      
      // Calculate weekly gaps
      const gaps = [];
      for (let i = 1; i < sortedWeeks.length; i++) {
        const gap = sortedWeeks[i].weekNumber - sortedWeeks[i - 1].weekNumber - 1;
        if (gap > 0) {
          gaps.push({
            afterWeek: sortedWeeks[i - 1].weekNumber,
            beforeWeek: sortedWeeks[i].weekNumber,
            gapSize: gap,
          });
        }
      }
      
      // Progress summary
      // Score Calculation: overallScore = average of (currentH + currentE + currentR + currentC) / 4
      // Achievement Rate: achievementRate = percentage of targets met for the week
      const latestWeek = sortedWeeks[sortedWeeks.length - 1] || null;
      
      // Count only earned badges (badges with earnedAt date)
      const earnedBadges = platinumProgress?.badges?.filter((b: any) => b.earnedAt) || [];
      
      const progressSummary = latestWeek ? {
        currentWeek: latestWeek.weekNumber,
        overallScore: latestWeek.overallScore || 0, // Average HRCM rating (out of 10)
        achievementRate: latestWeek.achievementRate || 0, // % of targets achieved
        currentStreak: platinumProgress?.currentStreak || 0,
        totalBadges: earnedBadges.length, // Only count earned badges
      } : null;
      
      // Compact weekly data - group by date and show only last updated per date
      const weeksByDate = new Map<string, typeof sortedWeeks[0]>();
      for (const week of sortedWeeks) {
        if (!week.createdAt) continue;
        const dateKey = new Date(week.createdAt).toISOString().split('T')[0]; // YYYY-MM-DD
        const existing = weeksByDate.get(dateKey);
        if (!existing || (week.updatedAt && existing.updatedAt && new Date(week.updatedAt) > new Date(existing.updatedAt))) {
          weeksByDate.set(dateKey, week);
        }
      }
      
      const compactWeeklyData = Array.from(weeksByDate.values())
        .filter(week => week.createdAt !== null)
        .sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return aDate - bDate;
        })
        .map(week => ({
          week: week.weekNumber,
          date: week.createdAt,
          h: week.currentH || 0,
          r: week.currentE || 0,
          c: week.currentR || 0,
          m: week.currentC || 0,
          score: week.overallScore || 0,
          achievement: week.achievementRate || 0,
        }));
      
      res.json({
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        progressSummary,
        emotionTrends,
        hrcmTrends,
        regularity: {
          percentage: regularity,
          totalWeeks,
          expectedWeeks,
          missedWeeks,
          gaps,
          status: regularity >= 80 ? 'regular' : regularity >= 50 ? 'semi-regular' : 'irregular',
        },
        compactWeeklyData,
        badges: earnedBadges, // Only return earned badges (not Platinum Standards if not earned)
        rituals: rituals.map(r => ({
          id: r.id,
          title: r.title,
          category: r.category,
          isActive: r.isActive,
        })),
      });
    } catch (error) {
      console.error("Error fetching detailed analytics:", error);
      res.status(500).json({ message: "Failed to fetch detailed analytics" });
    }
  });

  // Admin analytics - Get all users progress summary (approved users only)
  app.get('/api/admin/users-analytics', isAuthenticated, async (req, res) => {
    try {
      // Get approved emails
      const approvedEmailsList = await storage.getAllApprovedEmails();
      const approvedEmailSet = new Set(approvedEmailsList.filter(ae => ae.status === 'active').map(ae => ae.email));
      
      // Get all users and filter by approved emails
      // Match by either user.email OR user.id (since some users have userId = email but email field is null)
      const allUsers = await storage.getAllUsers();
      const matchedUsers = allUsers.filter(u => 
        (u.email && approvedEmailSet.has(u.email)) || approvedEmailSet.has(u.id)
      );
      
      // Deduplicate users by email (prefer user with HRCM data, then non-admin dashboard user)
      const usersByEmail = new Map<string, any>();
      
      for (const user of matchedUsers) {
        const emailKey = user.email || user.id;
        
        if (!usersByEmail.has(emailKey)) {
          usersByEmail.set(emailKey, user);
        } else {
          // If duplicate, prefer the user with more HRCM weeks
          const existingUser = usersByEmail.get(emailKey);
          const existingWeeks = await storage.getHercmWeeksByUser(existingUser.id);
          const currentWeeks = await storage.getHercmWeeksByUser(user.id);
          
          // Prefer user with HRCM data, or if both have data, prefer the dashboard user (email field is null)
          if (currentWeeks.length > existingWeeks.length || 
              (currentWeeks.length === existingWeeks.length && !user.email && existingUser.email)) {
            usersByEmail.set(emailKey, user);
          }
        }
      }
      
      const users = Array.from(usersByEmail.values());
      const analytics = [];
      
      for (const user of users) {
        const weeks = await storage.getHercmWeeksByUser(user.id);
        
        // Count unique weeks (not duplicate entries)
        const uniqueWeekNumbers = new Set(weeks.map(w => w.weekNumber));
        const totalWeeks = uniqueWeekNumbers.size;
        
        // Show all approved users, even if they haven't started tracking yet
        const latestWeek = weeks.length > 0 ? weeks[weeks.length - 1] : null;
        const overallScore = latestWeek?.overallScore || 0;
        const achievementRate = latestWeek?.achievementRate || 0;
        
        // Calculate trend (compare last 2 weeks)
        let trend = 0;
        if (weeks.length >= 2) {
          const prevWeek = weeks[weeks.length - 2];
          const prevScore = prevWeek.overallScore || 0;
          trend = overallScore - prevScore;
        }
        
        // Use email if available, otherwise use userId (which is often the email)
        const displayEmail = user.email || user.id;
        
        analytics.push({
          userId: user.id,
          email: displayEmail,
          firstName: user.firstName,
          lastName: user.lastName,
          totalWeeks, // Now using unique week count, not total records
          latestWeekNumber: latestWeek?.weekNumber || 0,
          overallScore,
          achievementRate,
          trend, // positive = improving, negative = declining
          status: achievementRate >= 70 ? 'excellent' : achievementRate >= 50 ? 'good' : 'needs_support',
        });
      }
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching users analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Google Sheets course suggestions
  app.get('/api/courses/suggestions', isAuthenticated, async (req, res) => {
    try {
      const sheetUrl = "https://docs.google.com/spreadsheets/d/1pZaS2wnzwgk6VqB7KvchX2bfCmucvrhTf3Q6qAJG7Cw/edit?gid=314426355#gid=314426355";
      const courses = await fetchCourseData(sheetUrl);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching course suggestions:", error);
      res.status(500).json({ message: "Failed to fetch course suggestions" });
    }
  });

  app.post('/api/courses/match', isAuthenticated, async (req, res) => {
    try {
      const { category, currentBelief } = req.body;
      const sheetUrl = "https://docs.google.com/spreadsheets/d/1pZaS2wnzwgk6VqB7KvchX2bfCmucvrhTf3Q6qAJG7Cw/edit?gid=314426355#gid=314426355";
      const courses = await fetchCourseData(sheetUrl);
      const match = findMatchingCourse(courses, category, currentBelief);
      res.json(match || { courseName: "No matching course found", description: "" });
    } catch (error) {
      console.error("Error matching course:", error);
      res.status(500).json({ message: "Failed to match course" });
    }
  });

  // AI-powered course recommendations based on HERCM data
  app.post('/api/courses/recommend', isAuthenticated, async (req: any, res) => {
    try {
      // Validate request
      const validatedData = recommendCoursesRequestSchema.parse(req.body);
      
      // Fetch courses from CSV file
      const courses = await parseCourseCSV();
      
      // Get AI-powered recommendations
      const recommendations = await getAIRecommendations(courses, {
        category: validatedData.category,
        rating: validatedData.currentRating,
        problems: validatedData.problems,
        feelings: validatedData.feelings,
        beliefs: validatedData.beliefs,
        actions: validatedData.actions,
      }, 3, validatedData.excludeCourseNames || []);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error recommending courses:", error);
      res.status(500).json({ message: "Failed to recommend courses", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Get rating-based AI course recommendations for HRCM table
  app.post('/api/courses/recommend-single', isAuthenticated, async (req: any, res) => {
    try {
      const { category, currentRating, problems, feelings, beliefs, actions, excludeCourseNames } = req.body;
      
      // Validate inputs
      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }
      
      // Calculate number of courses based on rating (inverse relationship)
      // Lower rating = More courses (beginners need more options)
      // Higher rating = Less courses (advanced need focused learning)
      const rating = Math.max(1, Math.min(currentRating || 1, 7)); // Clamp between 1-7
      
      let numberOfCourses: number;
      if (rating < 3) {
        numberOfCourses = 5; // Rating 1-2: 5 courses
      } else if (rating < 5) {
        numberOfCourses = 3; // Rating 3-4: 3 courses
      } else {
        numberOfCourses = 2; // Rating 5-7: 2 courses
      }
      
      // Fetch courses from CSV file
      const courses = await parseCourseCSV();
      
      // Get AI-powered recommendations (rating-based count)
      const recommendations = await getAIRecommendations(courses, {
        category,
        rating: rating,
        problems: problems || '',
        feelings: feelings || '',
        beliefs: beliefs || '',
        actions: actions || '',
      }, numberOfCourses, excludeCourseNames || []);
      
      if (recommendations.length === 0) {
        return res.json({ 
          courses: []
        });
      }
      
      // Map recommendations to course format and ensure uniqueness
      const seenCourseNames = new Set<string>();
      const mappedCourses = recommendations
        .filter(rec => {
          // Remove duplicates by course name
          if (seenCourseNames.has(rec.course.courseName)) {
            return false;
          }
          seenCourseNames.add(rec.course.courseName);
          return true;
        })
        .map((rec, index) => ({
          id: `course-${index + 1}`,
          name: rec.course.courseName,
          link: rec.course.link,
          completed: false
        }));
      
      res.json({
        courses: mappedCourses
      });
    } catch (error) {
      console.error("Error getting AI course recommendation:", error);
      res.status(500).json({ 
        message: "Failed to get course recommendation",
        courses: []
      });
    }
  });

  // AI Auto-fill next week goals based on current week data (ALL 4 HRCM areas)
  app.post('/api/hercm/ai-autofill-next-week', isAuthenticated, async (req: any, res) => {
    try {
      const { beliefs } = req.body; // Array of all 4 HRCM beliefs with current week data
      
      console.log('[AI Auto-Fill] Starting request');
      
      const prompt = `Analyze current week data and suggest next week targets.

Current Week:
${beliefs.map((belief: any) => `
${belief.category}: Rating ${belief.currentRating}/10
Problems: ${belief.problems || 'None'}
Feelings: ${belief.currentFeelings || 'None'}
Beliefs: ${belief.currentBelief || 'None'}  
Actions: ${belief.currentActions || 'None'}
`).join('\n')}

Return ONLY a JSON object with "suggestions" array containing 4 objects:
{
  "suggestions": [
    {
      "category": "Health",
      "result": ["specific result 1", "specific result 2"],
      "feelings": ["positive feeling 1", "positive feeling 2"],
      "target": ["empowering belief 1", "empowering belief 2"],
      "actions": ["action 1", "action 2", "action 3"]
    },
    {
      "category": "Relationship",
      "result": ["result 1", "result 2"],
      "feelings": ["feeling 1", "feeling 2"],
      "target": ["belief 1", "belief 2"],
      "actions": ["action 1", "action 2", "action 3"]
    },
    {
      "category": "Career",
      "result": ["result 1", "result 2"],
      "feelings": ["feeling 1", "feeling 2"],
      "target": ["belief 1", "belief 2"],
      "actions": ["action 1", "action 2", "action 3"]
    },
    {
      "category": "Money",
      "result": ["result 1", "result 2"],
      "feelings": ["feeling 1", "feeling 2"],
      "target": ["belief 1", "belief 2"],
      "actions": ["action 1", "action 2", "action 3"]
    }
  ]
}`;

      console.log('[AI Auto-Fill] Calling OpenAI');
      
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: "You are a life coach. Return ONLY valid JSON in the exact format requested, no markdown, no other text." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });

      console.log('[AI Auto-Fill] Response received');
      
      let responseText = completion.choices[0]?.message?.content || '{"suggestions":[]}';
      console.log('[AI Auto-Fill] Raw response:', responseText);
      
      // Clean and parse
      responseText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      
      const parsed = JSON.parse(responseText);
      // Handle both "suggestions" and "data" keys (OpenAI sometimes uses different keys)
      const aiSuggestions = parsed.suggestions || parsed.data || [];
      
      console.log('[AI Auto-Fill] Success! Parsed', aiSuggestions.length, 'suggestions');
      
      res.json(aiSuggestions);
    } catch (error) {
      console.error("[AI Auto-Fill] ERROR:", error instanceof Error ? error.message : error);
      
      // Fallback: simple suggestions for all 4 areas
      const fallback = [
        {
          category: "Health",
          result: ["Improve physical energy", "Better sleep quality"],
          feelings: ["Energetic", "Refreshed"],
          target: ["I prioritize my health", "I make healthy choices daily"],
          actions: ["Exercise 30 mins daily", "Eat nutritious meals", "Sleep 7-8 hours"]
        },
        {
          category: "Relationship",
          result: ["Stronger connections", "Better communication"],
          feelings: ["Connected", "Appreciated"],
          target: ["I nurture my relationships", "I communicate with love"],
          actions: ["Quality time with loved ones", "Active listening", "Express appreciation daily"]
        },
        {
          category: "Career",
          result: ["Increased productivity", "Skill improvement"],
          feelings: ["Focused", "Accomplished"],
          target: ["I am valuable and capable", "I create meaningful impact"],
          actions: ["Complete key projects", "Learn new skill", "Network with peers"]
        },
        {
          category: "Money",
          result: ["Better financial decisions", "Increased savings"],
          feelings: ["Abundant", "Secure"],
          target: ["Money flows to me easily", "I am financially wise"],
          actions: ["Track expenses", "Save portion of income", "Invest in growth"]
        }
      ];
      
      res.json(fallback);
    }
  });

  // AI-powered affirmation generation
  app.post('/api/affirmations/generate', isAuthenticated, async (req: any, res) => {
    try {
      const { category, currentRating, problems, currentFeelings, currentBelief, currentActions, nextWeekTarget } = req.body;
      
      const affirmation = await generateAffirmation(
        category,
        currentRating || 1,
        problems || '',
        currentFeelings || '',
        currentBelief || '',
        currentActions || '',
        nextWeekTarget || ''
      );
      
      res.json({ affirmation });
    } catch (error) {
      console.error("Error generating affirmation:", error);
      res.status(500).json({ message: "Failed to generate affirmation", error: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Update user's Google Sheet URL
  app.post('/api/user/course-sheet', isAuthenticated, async (req: any, res) => {
    try {
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      const { sheetUrl } = req.body;
      
      await storage.updateUserCourseSheet(userId, sheetUrl);
      res.json({ success: true, message: "Course sheet URL updated" });
    } catch (error) {
      console.error("Error updating course sheet:", error);
      res.status(500).json({ message: "Failed to update course sheet" });
    }
  });

  // Email-based authentication routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check if user is an admin first
      const adminUser = await storage.getAdminUser(email);
      const isAdmin = adminUser && adminUser.status === 'active';
      
      // If not admin, check approved emails
      if (!isAdmin) {
        const approvedEmail = await storage.getApprovedEmail(email);
        
        if (!approvedEmail || approvedEmail.status !== 'active') {
          // Log failed attempt
          await storage.createAccessLog({
            email,
            status: 'failed',
            ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
            userAgent: req.headers['user-agent'] || 'unknown'
          });
          return res.status(403).json({ message: "Your email is not approved. Please contact admin." });
        }
      }

      await storage.incrementAccessCount(email);
      
      // Log successful attempt
      await storage.createAccessLog({
        email,
        status: 'success',
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      
      // Check if user exists, create only if doesn't exist
      const existingUser = await storage.getUserByEmail(email);
      console.log(`[LOGIN] User lookup for ${email}:`, existingUser ? 'Found' : 'Not found');
      
      if (!existingUser) {
        console.log(`[LOGIN] Creating new user with id=${email}, email=${email}`);
        const newUser = await storage.upsertUser({
          id: email,
          email: email,
          isAdmin: isAdmin || false,
        });
        console.log(`[LOGIN] User created:`, newUser);
      }
      
      req.session.userEmail = email;
      req.session.isAdmin = isAdmin || false;
      console.log(`[LOGIN] Session set: userEmail=${email}, isAdmin=${isAdmin}`);
      
      // Save session before responding to ensure it's written to store
      req.session.save((err) => {
        if (err) {
          console.error('[LOGIN] Session save error:', err);
          return res.status(500).json({ message: "Failed to save session" });
        }
        console.log('[LOGIN] Session saved successfully');
        res.json({ success: true, message: "Login successful" });
      });
    } catch (error) {
      console.error("Error during login:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/auth/admin-login', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Check admin users table first
      const adminUser = await storage.getAdminUser(email);
      
      // Check if user is in admin users table with active status
      let isAuthorized = adminUser && adminUser.status === 'active';
      
      // If not in admin users table, check regular users table for isAdmin flag
      if (!isAuthorized) {
        const regularUser = await storage.getUserByEmail(email);
        isAuthorized = regularUser?.isAdmin === true;
      }
      
      if (!isAuthorized) {
        // Log failed admin login attempt
        await storage.createAccessLog({
          email,
          status: 'failed',
          ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
          userAgent: req.headers['user-agent'] || 'unknown',
        });
        return res.status(403).json({ message: "You are not authorized as admin" });
      }

      req.session.userEmail = email;
      req.session.isAdmin = true;
      
      // Log successful admin login
      await storage.createAccessLog({
        email,
        status: 'success',
        ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
      });
      
      res.json({ success: true, message: "Admin login successful" });
    } catch (error) {
      console.error("Error during admin login:", error);
      res.status(500).json({ message: "Admin login failed" });
    }
  });

  app.get('/api/auth/me', async (req, res) => {
    try {
      if (!req.session.userEmail) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      // Check if admin first
      if (req.session.isAdmin) {
        const adminUser = await storage.getAdminUser(req.session.userEmail);
        
        if (adminUser) {
          // Extract first name from admin's name
          const firstName = adminUser.name.split(' ')[0];
          return res.json({ 
            email: adminUser.email, 
            firstName,
            lastName: adminUser.name.split(' ').slice(1).join(' ') || ''
          });
        }
      }

      // Regular user
      const user = await storage.getUserByEmail(req.session.userEmail);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ 
        email: user.email, 
        firstName: user.firstName, 
        lastName: user.lastName 
      });
    } catch (error) {
      console.error("Error fetching current user:", error);
      res.status(500).json({ message: "Failed to fetch user info" });
    }
  });

  // Admin email management routes
  app.get('/api/admin/approved-emails', async (req, res) => {
    try {
      const emails = await storage.getAllApprovedEmails();
      res.json(emails);
    } catch (error) {
      console.error("Error fetching approved emails:", error);
      res.status(500).json({ message: "Failed to fetch approved emails" });
    }
  });

  app.post('/api/admin/approved-emails', async (req, res) => {
    try {
      const { email, name, zoomLink } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const newEmail = await storage.addApprovedEmail({ email, name, zoomLink, status: 'active' });
      res.json(newEmail);
    } catch (error: any) {
      console.error("Error adding approved email:", error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return res.status(400).json({ message: "Email already exists" });
      }
      res.status(500).json({ message: "Failed to add email" });
    }
  });

  app.post('/api/admin/bulk-upload', async (req, res) => {
    try {
      const { emails } = req.body;
      
      if (!Array.isArray(emails) || emails.length === 0) {
        return res.status(400).json({ message: "Emails array is required" });
      }

      const results = await storage.bulkAddApprovedEmails(emails);
      res.json({ success: true, added: results.length, message: "Emails uploaded successfully" });
    } catch (error) {
      console.error("Error bulk uploading emails:", error);
      res.status(500).json({ message: "Failed to upload emails" });
    }
  });

  // Delete all emails - MUST come before /:id route
  app.delete('/api/admin/approved-emails/all', async (req, res) => {
    try {
      await storage.deleteAllApprovedEmails();
      res.json({ success: true, message: "All emails deleted" });
    } catch (error) {
      console.error("Error deleting all emails:", error);
      res.status(500).json({ message: "Failed to delete all emails" });
    }
  });

  app.delete('/api/admin/approved-emails/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteApprovedEmail(id);
      res.json({ success: true, message: "Email deleted" });
    } catch (error) {
      console.error("Error deleting approved email:", error);
      res.status(500).json({ message: "Failed to delete email" });
    }
  });

  app.put('/api/admin/approved-emails/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { email, status } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      await storage.updateApprovedEmail(id, { email, status });
      res.json({ success: true, message: "Email updated successfully" });
    } catch (error) {
      console.error("Error updating approved email:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  app.get('/api/admin/stats', async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin Users (Team Management) endpoints
  app.get('/api/admin/team', async (req, res) => {
    try {
      const admins = await storage.getAllAdminUsers();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  app.post('/api/admin/team', async (req, res) => {
    try {
      const { name, email, role, status } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: "Name and email are required" });
      }

      const newAdmin = await storage.addAdminUser({ 
        name, 
        email, 
        role: role || 'admin',
        status: status || 'active'
      });
      res.json(newAdmin);
    } catch (error: any) {
      console.error("Error adding admin user:", error);
      if (error.message?.includes('duplicate') || error.code === '23505') {
        return res.status(400).json({ message: "Email already exists" });
      }
      res.status(500).json({ message: "Failed to add admin user" });
    }
  });

  app.put('/api/admin/team/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { name, email, role, status } = req.body;
      
      const updatedAdmin = await storage.updateAdminUser(id, { name, email, role, status });
      res.json(updatedAdmin);
    } catch (error) {
      console.error("Error updating admin user:", error);
      res.status(500).json({ message: "Failed to update admin user" });
    }
  });

  app.delete('/api/admin/team/:id', async (req, res) => {
    try {
      const { id } = req.params;
      await storage.deleteAdminUser(id);
      res.json({ success: true, message: "Admin user deleted" });
    } catch (error) {
      console.error("Error deleting admin user:", error);
      res.status(500).json({ message: "Failed to delete admin user" });
    }
  });

  // Access Logs endpoints
  app.get('/api/admin/access-logs', async (req, res) => {
    try {
      const logs = await storage.getAllAccessLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  app.delete('/api/admin/access-logs', async (req, res) => {
    try {
      await storage.deleteAllAccessLogs();
      res.json({ success: true, message: "All access logs deleted successfully" });
    } catch (error) {
      console.error("Error deleting access logs:", error);
      res.status(500).json({ message: "Failed to delete access logs" });
    }
  });

  // New Admin Analytics & Dashboard Routes
  
  // Get user's complete dashboard data (for admin to view any user's dashboard)
  app.get('/api/admin/user/:userId/dashboard', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const dashboardData = await storage.getUserDashboardData(userId);
      res.json(dashboardData);
    } catch (error) {
      console.error("Error fetching user dashboard data:", error);
      res.status(500).json({ message: "Failed to fetch user dashboard data" });
    }
  });

  // Admin: Get specific user's HRCM week data
  app.get('/api/admin/user/:userId/hercm/week/:weekNumber', isAuthenticated, async (req, res) => {
    try {
      const { userId, weekNumber: weekNumStr } = req.params;
      const weekNumber = parseInt(weekNumStr);
      
      const week = await storage.getHercmWeek(userId, weekNumber);
      
      if (!week) {
        return res.json(null);
      }
      
      // Transform database format to beliefs array (same as regular user route)
      const beliefs = [
        {
          category: 'Health',
          currentRating: week.currentH || 1,
          targetRating: week.targetH || 1,
          problems: week.healthProblems || '',
          currentFeelings: week.healthCurrentFeelings || '',
          currentBelief: week.healthCurrentBelief || '',
          currentActions: week.healthCurrentActions || '',
          result: week.healthResult || '',
          nextFeelings: week.healthNextFeelings || '',
          nextWeekTarget: week.healthNextTarget || '',
          nextActions: week.healthNextActions || '',
          checklist: week.healthChecklist || [],
          assignment: week.healthAssignment || { courses: [], lessons: [] },
          resultChecklist: week.healthResultChecklist || [],
          feelingsChecklist: week.healthFeelingsChecklist || [],
          beliefsChecklist: week.healthBeliefsChecklist || [],
          actionsChecklist: week.healthActionsChecklist || []
        },
        {
          category: 'Relationship',
          currentRating: week.currentE || 1,
          targetRating: week.targetE || 1,
          problems: week.relationshipProblems || '',
          currentFeelings: week.relationshipCurrentFeelings || '',
          currentBelief: week.relationshipCurrentBelief || '',
          currentActions: week.relationshipCurrentActions || '',
          result: week.relationshipResult || '',
          nextFeelings: week.relationshipNextFeelings || '',
          nextWeekTarget: week.relationshipNextTarget || '',
          nextActions: week.relationshipNextActions || '',
          checklist: week.relationshipChecklist || [],
          assignment: week.relationshipAssignment || { courses: [], lessons: [] },
          resultChecklist: week.relationshipResultChecklist || [],
          feelingsChecklist: week.relationshipFeelingsChecklist || [],
          beliefsChecklist: week.relationshipBeliefsChecklist || [],
          actionsChecklist: week.relationshipActionsChecklist || []
        },
        {
          category: 'Career',
          currentRating: week.currentR || 1,
          targetRating: week.targetR || 1,
          problems: week.careerProblems || '',
          currentFeelings: week.careerCurrentFeelings || '',
          currentBelief: week.careerCurrentBelief || '',
          currentActions: week.careerCurrentActions || '',
          result: week.careerResult || '',
          nextFeelings: week.careerNextFeelings || '',
          nextWeekTarget: week.careerNextTarget || '',
          nextActions: week.careerNextActions || '',
          checklist: week.careerChecklist || [],
          assignment: week.careerAssignment || { courses: [], lessons: [] },
          resultChecklist: week.careerResultChecklist || [],
          feelingsChecklist: week.careerFeelingsChecklist || [],
          beliefsChecklist: week.careerBeliefsChecklist || [],
          actionsChecklist: week.careerActionsChecklist || []
        },
        {
          category: 'Money',
          currentRating: week.currentC || 1,
          targetRating: week.targetC || 1,
          problems: week.moneyProblems || '',
          currentFeelings: week.moneyCurrentFeelings || '',
          currentBelief: week.moneyCurrentBelief || '',
          currentActions: week.moneyCurrentActions || '',
          result: week.moneyResult || '',
          nextFeelings: week.moneyNextFeelings || '',
          nextWeekTarget: week.moneyNextTarget || '',
          nextActions: week.moneyNextActions || '',
          checklist: week.moneyChecklist || [],
          assignment: week.moneyAssignment || { courses: [], lessons: [] },
          resultChecklist: week.moneyResultChecklist || [],
          feelingsChecklist: week.moneyFeelingsChecklist || [],
          beliefsChecklist: week.moneyBeliefsChecklist || [],
          actionsChecklist: week.moneyActionsChecklist || []
        }
      ];
      
      res.json({ ...week, beliefs });
    } catch (error) {
      console.error("Error fetching admin user HRCM week:", error);
      res.status(500).json({ message: "Failed to fetch week data" });
    }
  });

  // Get user analytics with period filter (weekly/monthly/yearly)
  app.get('/api/admin/user/:userId/analytics-period', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const { period = 'monthly' } = req.query;
      
      if (!['weekly', 'monthly', 'yearly'].includes(period as string)) {
        return res.status(400).json({ message: "Invalid period. Use: weekly, monthly, or yearly" });
      }
      
      const analytics = await storage.getUserAnalytics(userId, period as 'weekly' | 'monthly' | 'yearly');
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ message: "Failed to fetch user analytics" });
    }
  });

  // Get team analytics with period filter (weekly/monthly/yearly)
  app.get('/api/admin/team-analytics', isAuthenticated, async (req, res) => {
    try {
      const { period = 'monthly' } = req.query;
      
      if (!['weekly', 'monthly', 'yearly'].includes(period as string)) {
        return res.status(400).json({ message: "Invalid period. Use: weekly, monthly, or yearly" });
      }
      
      const analytics = await storage.getTeamAnalytics(period as 'weekly' | 'monthly' | 'yearly');
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching team analytics:", error);
      res.status(500).json({ message: "Failed to fetch team analytics" });
    }
  });

  // Admin course recommendations - Get all recommendations
  app.get('/api/admin/recommendations', isAuthenticated, async (req, res) => {
    try {
      const recommendations = await storage.getAllCourseRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching all recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Admin course recommendations - Create recommendation
  app.post('/api/admin/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const adminEmail = req.user?.claims?.sub || req.session.userEmail;
      console.log('[DEBUG] POST /api/admin/recommendations - adminEmail:', adminEmail);
      
      if (!adminEmail) {
        return res.status(401).json({ message: "Admin not authenticated" });
      }

      // Get admin user ID from email
      const admin = await storage.getUserByEmail(adminEmail);
      console.log('[DEBUG] POST /api/admin/recommendations - admin user:', admin);
      
      if (!admin) {
        return res.status(401).json({ message: "Admin user not found" });
      }

      const { userEmail, hrcmArea, courseName, reason } = req.body;
      console.log('[DEBUG] POST /api/admin/recommendations - request body:', { userEmail, hrcmArea, courseName, reason });
      
      if (!userEmail || !hrcmArea || !courseName) {
        return res.status(400).json({ message: "Missing required fields: userEmail, hrcmArea, courseName" });
      }

      // Check if email is approved first (more flexible - works for any approved user)
      const approvedEmail = await storage.getApprovedEmail(userEmail);
      console.log('[DEBUG] POST /api/admin/recommendations - approved email check:', approvedEmail);
      
      if (!approvedEmail || approvedEmail.status !== 'active') {
        return res.status(400).json({ 
          message: "User email not found in approved list. Please add the email to Approved Emails first." 
        });
      }

      // Try to get existing user, or create a placeholder user for approved emails
      let user = await storage.getUserByEmail(userEmail);
      console.log('[DEBUG] POST /api/admin/recommendations - target user from email:', user);
      
      let userId = userEmail;
      
      if (user) {
        // If the user found is an admin, check if there's a non-admin dashboard user with id=email
        if (user.isAdmin) {
          const dashboardUser = await storage.getUser(userEmail);
          console.log('[DEBUG] POST /api/admin/recommendations - checking for dashboard user:', dashboardUser);
          
          if (dashboardUser && !dashboardUser.isAdmin) {
            console.log('[DEBUG] POST /api/admin/recommendations - using non-admin dashboard user');
            userId = dashboardUser.id;
          } else {
            userId = userEmail;
          }
        } else {
          userId = user.id;
        }
      } else {
        // Auto-create a placeholder user for this approved email
        // This allows recommendations to work even if the user hasn't logged in yet
        console.log('[DEBUG] POST /api/admin/recommendations - Creating placeholder user for:', userEmail);
        try {
          // Split name from approved email into firstName and lastName
          const fullName = approvedEmail.name || '';
          const nameParts = fullName.trim().split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          
          const placeholderUser = await storage.upsertUser({
            id: userEmail,
            email: userEmail,
            firstName,
            lastName,
            password: '', // No password - they'll use OIDC login
            isAdmin: false,
          });
          userId = placeholderUser.id;
          console.log('[DEBUG] POST /api/admin/recommendations - Placeholder user created successfully with ID:', userId, 'Name:', firstName, lastName);
        } catch (error) {
          console.error('[DEBUG] POST /api/admin/recommendations - Error creating placeholder user:', error);
          // If creation fails, this is a critical error
          return res.status(500).json({ message: "Failed to create user account for recommendation" });
        }
      }

      console.log('[DEBUG] POST /api/admin/recommendations - Creating recommendation with userId:', userId);
      
      const recommendation = await storage.addCourseRecommendation({
        userId: userId,
        adminId: admin.id,
        hrcmArea,
        courseId: courseName.toLowerCase().replace(/\s+/g, '-'),
        courseName,
        reason,
        status: 'pending',
      });

      console.log('[DEBUG] POST /api/admin/recommendations - Created recommendation:', recommendation);
      res.json(recommendation);
    } catch (error) {
      console.error("Error adding course recommendation:", error);
      res.status(500).json({ message: "Failed to add course recommendation" });
    }
  });

  // Admin delete ALL course recommendations
  app.delete('/api/admin/recommendations/all', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteAllRecommendations();
      res.json({ message: "All recommendations deleted successfully" });
    } catch (error) {
      console.error("Error deleting all recommendations:", error);
      res.status(500).json({ message: "Failed to delete all recommendations" });
    }
  });

  // Admin delete course recommendation
  app.delete('/api/admin/recommendations/:id', isAuthenticated, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteRecommendation(id);
      res.json({ message: "Recommendation deleted successfully" });
    } catch (error) {
      console.error("Error deleting recommendation:", error);
      res.status(500).json({ message: "Failed to delete recommendation" });
    }
  });

  // Admin add course recommendation to user
  app.post('/api/admin/recommend-course', isAuthenticated, async (req: any, res) => {
    try {
      const adminId = req.user?.claims?.sub || req.session.userEmail;
      if (!adminId) {
        return res.status(401).json({ message: "Admin not authenticated" });
      }

      const { userId, hrcmArea, courseId, courseName, lessonId, lessonName, lessonUrl, reason } = req.body;
      
      if (!userId || !hrcmArea || !courseId || !courseName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const recommendation = await storage.addCourseRecommendation({
        userId,
        adminId,
        hrcmArea,
        courseId,
        courseName,
        lessonId,
        lessonName,
        lessonUrl,
        reason,
        status: 'pending',
      });

      res.json(recommendation);
    } catch (error) {
      console.error("Error adding course recommendation:", error);
      res.status(500).json({ message: "Failed to add course recommendation" });
    }
  });

  // Get user's recommendations
  app.get('/api/admin/user/:userId/recommendations', isAuthenticated, async (req, res) => {
    try {
      const { userId } = req.params;
      const recommendations = await storage.getUserRecommendations(userId);
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Update recommendation status
  app.put('/api/admin/recommendation/:id/status', isAuthenticated, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      if (!['pending', 'accepted', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const recommendation = await storage.updateRecommendationStatus(id, status);
      res.json(recommendation);
    } catch (error) {
      console.error("Error updating recommendation status:", error);
      res.status(500).json({ message: "Failed to update recommendation status" });
    }
  });

  // ===== PLATINUM STANDARDS ROUTES (Admin) =====
  
  // Get all platinum standards (admin view)
  app.get('/api/admin/platinum-standards', isAuthenticated, async (req, res) => {
    try {
      const standards = await storage.getAllPlatinumStandards();
      res.json(standards);
    } catch (error) {
      console.error("Error fetching platinum standards:", error);
      res.status(500).json({ message: "Failed to fetch platinum standards" });
    }
  });

  // Get active platinum standards (public endpoint for users)
  app.get('/api/platinum-standards', isAuthenticated, async (req, res) => {
    try {
      const standards = await storage.getActivePlatinumStandards();
      res.json(standards);
    } catch (error) {
      console.error("Error fetching active platinum standards:", error);
      res.status(500).json({ message: "Failed to fetch platinum standards" });
    }
  });

  // Get platinum standards by category
  app.get('/api/platinum-standards/:category', isAuthenticated, async (req, res) => {
    try {
      const { category } = req.params;
      const standards = await storage.getPlatinumStandardsByCategory(category);
      res.json(standards);
    } catch (error) {
      console.error("Error fetching platinum standards by category:", error);
      res.status(500).json({ message: "Failed to fetch platinum standards" });
    }
  });

  // Add new platinum standard (admin only)
  app.post('/api/admin/platinum-standards', isAuthenticated, async (req: any, res) => {
    try {
      const adminEmail = req.user?.claims?.sub || req.session.userEmail;
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { category, standardText, orderIndex, isActive } = req.body;
      
      if (!category || !standardText) {
        return res.status(400).json({ message: "Missing required fields: category, standardText" });
      }

      const newStandard = await storage.addPlatinumStandard({
        category,
        standardText,
        orderIndex: orderIndex || 0,
        isActive: isActive !== undefined ? isActive : true,
      });

      res.json(newStandard);
    } catch (error) {
      console.error("Error adding platinum standard:", error);
      res.status(500).json({ message: "Failed to add platinum standard" });
    }
  });

  // Update platinum standard (admin only)
  app.put('/api/admin/platinum-standards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminEmail = req.user?.claims?.sub || req.session.userEmail;
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      const updates = req.body;
      
      const updatedStandard = await storage.updatePlatinumStandard(id, updates);
      res.json(updatedStandard);
    } catch (error) {
      console.error("Error updating platinum standard:", error);
      res.status(500).json({ message: "Failed to update platinum standard" });
    }
  });

  // Delete platinum standard (admin only)
  app.delete('/api/admin/platinum-standards/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminEmail = req.user?.claims?.sub || req.session.userEmail;
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { id } = req.params;
      await storage.deletePlatinumStandard(id);
      res.json({ message: "Platinum standard deleted successfully" });
    } catch (error) {
      console.error("Error deleting platinum standard:", error);
      res.status(500).json({ message: "Failed to delete platinum standard" });
    }
  });

  // Reorder platinum standards (admin only)
  app.put('/api/admin/platinum-standards/reorder', isAuthenticated, async (req: any, res) => {
    try {
      const adminEmail = req.user?.claims?.sub || req.session.userEmail;
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { updates } = req.body; // Array of { id, orderIndex }
      
      if (!Array.isArray(updates)) {
        return res.status(400).json({ message: "Updates must be an array" });
      }

      await storage.reorderPlatinumStandards(updates);
      res.json({ message: "Platinum standards reordered successfully" });
    } catch (error) {
      console.error("Error reordering platinum standards:", error);
      res.status(500).json({ message: "Failed to reorder platinum standards" });
    }
  });

  // User-facing: Get current user's pending recommendations
  app.get('/api/user/recommendations', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      console.log('[DEBUG] /api/user/recommendations - userId from auth:', userId);
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Try to get user by ID first, then by email if ID doesn't work
      let user = await storage.getUser(userId);
      console.log('[DEBUG] /api/user/recommendations - user from getUser:', user);
      
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        // If userId is an email, try to find user by email
        user = await storage.getUserByEmail(userId);
        console.log('[DEBUG] /api/user/recommendations - user from getUserByEmail:', user);
      }

      if (!user) {
        console.log('[DEBUG] /api/user/recommendations - no user found, returning empty array');
        return res.json([]); // Return empty array if user not found
      }

      // Get recommendations by the user's database ID
      const recommendations = await storage.getUserRecommendations(user.id);
      console.log('[DEBUG] /api/user/recommendations - recommendations for user.id', user.id, ':', recommendations);
      
      // Filter to show only pending recommendations to the user
      const pendingRecommendations = recommendations.filter((r: any) => r.status === 'pending');
      console.log('[DEBUG] /api/user/recommendations - pending recommendations:', pendingRecommendations);
      
      res.json(pendingRecommendations);
    } catch (error) {
      console.error("Error fetching user recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // User-facing: Accept a recommendation (changes status to accepted and adds to Assignment)
  app.post('/api/user/recommendations/:id/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      const { weekNumber = 1 } = req.body; // Get week number from request body
      
      // Try to get user by ID first, then by email if ID doesn't work
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the recommendation and verify it belongs to this user
      const recommendations = await storage.getUserRecommendations(user.id);
      const recommendation = recommendations.find((r: any) => r.id === id);
      
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      if (recommendation.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to accept this recommendation" });
      }

      // Update status to accepted
      await storage.updateRecommendationStatus(id, 'accepted');

      // Get user's week by week number
      let weeks = await storage.getHercmWeeksByUser(user.id);
      let currentWeek = weeks.find((w: any) => w.weekNumber === weekNumber);

      // If the week doesn't exist, create it
      if (!currentWeek) {
        const newWeek = await storage.createHercmWeek({
          userId: user.id,
          weekNumber: weekNumber,
          year: new Date().getFullYear(),
          weekStatus: 'active',
        });
        currentWeek = newWeek;
      }

      // Map HRCM area to assignment field
      const categoryFieldMap: Record<string, string> = {
        'health': 'healthAssignment',
        'relationship': 'relationshipAssignment',
        'career': 'careerAssignment',
        'money': 'moneyAssignment'
      };
      
      const assignmentField = categoryFieldMap[recommendation.hrcmArea.toLowerCase()];
      
      if (!assignmentField) {
        return res.status(400).json({ message: "Invalid HRCM area in recommendation" });
      }
      
      // Get current assignment array for this category
      const currentAssignment = (currentWeek as any)[assignmentField] || { courses: [], lessons: [] };
      const currentLessons = currentAssignment.lessons || [];
      
      // Create new lesson item for category assignment with source='admin' for recommendations
      const newLesson = {
        id: recommendation.lessonId || recommendation.courseId,
        courseId: recommendation.courseId,
        courseName: recommendation.courseName,
        lessonName: recommendation.lessonName || recommendation.courseName,
        url: recommendation.lessonUrl || '',
        completed: false,
        source: 'admin' as const,  // Mark as admin-recommended
        recommendationId: recommendation.id  // Track original recommendation
      };

      // Add the recommended course to category assignment lessons array
      const updatedLessons = [...currentLessons, newLesson];

      // ALSO add to unifiedAssignment so it shows in the UI
      const currentUnifiedAssignment = (currentWeek as any).unifiedAssignment || [];
      const updatedUnifiedAssignment = [...currentUnifiedAssignment, newLesson];

      // Update the week with BOTH category assignment AND unified assignment
      await storage.updateHercmWeek(currentWeek.id, {
        [assignmentField]: {
          ...currentAssignment,
          lessons: updatedLessons
        },
        unifiedAssignment: updatedUnifiedAssignment
      });

      res.json({ message: "Recommendation accepted and added to Assignment", recommendation });
    } catch (error) {
      console.error("Error accepting recommendation:", error);
      res.status(500).json({ message: "Failed to accept recommendation" });
    }
  });

  // User-facing: Dismiss a recommendation (changes status to dismissed)
  app.post('/api/user/recommendations/:id/dismiss', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { id } = req.params;
      
      // Try to get user by ID first, then by email if ID doesn't work
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get the recommendation and verify it belongs to this user
      const recommendations = await storage.getUserRecommendations(user.id);
      const recommendation = recommendations.find((r: any) => r.id === id);
      
      if (!recommendation) {
        return res.status(404).json({ message: "Recommendation not found" });
      }

      if (recommendation.userId !== user.id) {
        return res.status(403).json({ message: "Not authorized to dismiss this recommendation" });
      }

      // Update status to dismissed (we'll need to add this status to the schema)
      await storage.updateRecommendationStatus(id, 'completed'); // Using 'completed' as dismissed for now

      res.json({ message: "Recommendation dismissed", recommendation });
    } catch (error) {
      console.error("Error dismissing recommendation:", error);
      res.status(500).json({ message: "Failed to dismiss recommendation" });
    }
  });

  // Rituals endpoints
  app.get('/api/rituals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get actual user to ensure we use correct user ID
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Define default rituals that should exist for all users
      const defaultRituals = [
        {
          title: "Attend Live DMP Everyday",
          description: "Daily morning practice",
          category: "Health",
          frequency: "daily",
          points: 50,
          isDefault: true,
        },
        {
          title: "Attend Morning Fitness Everyday",
          description: "Morning fitness routine",
          category: "Health",
          frequency: "daily",
          points: 50,
          isDefault: true,
        },
        {
          title: "Attend Platinum Live Support Calls",
          description: "Join support sessions",
          category: "Career",
          frequency: "daily",
          points: 50,
          isDefault: true,
        },
        {
          title: "Joined Magic of 6",
          description: "Magic of 6 practice",
          category: "Career",
          frequency: "daily",
          points: 50,
          isDefault: true,
        },
      ];
      
      // Get existing rituals
      const existingRituals = await storage.getRitualsByUser(user.id);
      
      // Check which default rituals are missing
      const existingTitles = new Set(existingRituals.map(r => r.title));
      const missingDefaults = defaultRituals.filter(d => !existingTitles.has(d.title));
      
      // Create missing default rituals
      for (const defaultRitual of missingDefaults) {
        await storage.createRitual({
          ...defaultRitual,
          userId: user.id,
        });
      }
      
      // Fetch all rituals again if we created any defaults
      const allRituals = missingDefaults.length > 0 
        ? await storage.getRitualsByUser(user.id)
        : existingRituals;
      
      res.json(allRituals);
    } catch (error) {
      console.error("Error fetching rituals:", error);
      res.status(500).json({ message: "Failed to fetch rituals" });
    }
  });

  app.post('/api/rituals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get actual user to ensure we use correct user ID
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const ritualData = { ...req.body, userId: user.id };
      const ritual = await storage.createRitual(ritualData);
      res.json(ritual);
    } catch (error) {
      console.error("Error creating ritual:", error);
      res.status(500).json({ message: "Failed to create ritual" });
    }
  });

  app.patch('/api/rituals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { id } = req.params;
      const ritual = await storage.updateRitual(id, userId, req.body);
      
      if (!ritual) {
        return res.status(404).json({ message: "Ritual not found or access denied" });
      }
      
      res.json(ritual);
    } catch (error) {
      console.error("Error updating ritual:", error);
      res.status(500).json({ message: "Failed to update ritual" });
    }
  });

  app.delete('/api/rituals/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Get actual user to ensure we use correct user ID
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { id } = req.params;
      
      // Check if ritual is a default ritual before attempting deletion
      const rituals = await storage.getRitualsByUser(user.id);
      const ritual = rituals.find(r => r.id === id);
      
      if (!ritual) {
        return res.status(404).json({ message: "Ritual not found" });
      }
      
      if (ritual.isDefault) {
        return res.status(403).json({ message: "Default rituals cannot be deleted. You can pause them instead." });
      }
      
      const deletedCount = await storage.deleteRitual(id, user.id);
      
      if (deletedCount === 0) {
        return res.status(404).json({ message: "Ritual not found or access denied" });
      }
      
      res.json({ success: true, message: "Ritual deleted" });
    } catch (error) {
      console.error("Error deleting ritual:", error);
      res.status(500).json({ message: "Failed to delete ritual" });
    }
  });

  // Ritual Completions endpoints
  app.get('/api/ritual-completions/:date', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { date } = req.params;
      const completions = await storage.getRitualCompletionsByDate(userId, date);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching ritual completions:", error);
      res.status(500).json({ message: "Failed to fetch ritual completions" });
    }
  });

  app.get('/api/ritual-completions/month/:year/:month', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { year, month } = req.params;
      const completions = await storage.getRitualCompletionsByMonth(userId, parseInt(year), parseInt(month));
      res.json(completions);
    } catch (error) {
      console.error("Error fetching monthly ritual completions:", error);
      res.status(500).json({ message: "Failed to fetch monthly ritual completions" });
    }
  });

  // Get ritual completions for a date range (used for weekly cumulative points)
  app.get('/api/ritual-completions/week/:startDate/:endDate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { startDate, endDate } = req.params;
      const completions = await storage.getRitualCompletionsByDateRange(userId, startDate, endDate);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching weekly ritual completions:", error);
      res.status(500).json({ message: "Failed to fetch weekly ritual completions" });
    }
  });

  app.post('/api/ritual-completions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const completionData = { ...req.body, userId };
      const completion = await storage.createRitualCompletion(completionData);
      res.json(completion);
    } catch (error) {
      console.error("Error creating ritual completion:", error);
      res.status(500).json({ message: "Failed to create ritual completion" });
    }
  });

  app.delete('/api/ritual-completions/:ritualId/:date', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { ritualId, date } = req.params;
      const deletedCount = await storage.deleteRitualCompletion(ritualId, userId, date);
      
      if (deletedCount === 0) {
        return res.status(404).json({ message: "Ritual completion not found or access denied" });
      }
      
      res.json({ success: true, message: "Ritual completion deleted" });
    } catch (error) {
      console.error("Error deleting ritual completion:", error);
      res.status(500).json({ message: "Failed to delete ritual completion" });
    }
  });

  // Leaderboard endpoint - Multi-user ritual points (Approved users only) - WEEKLY CUMULATIVE
  app.get('/api/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub || req.session.userEmail;
      
      // Calculate current week's start and end dates (Monday to Sunday)
      const today = new Date();
      const day = today.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const diffToSunday = day === 0 ? 0 : 7 - day;
      
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() + diffToMonday);
      const weekStartDate = weekStart.toISOString().split('T')[0];
      
      const weekEnd = new Date(today);
      weekEnd.setDate(today.getDate() + diffToSunday);
      const weekEndDate = weekEnd.toISOString().split('T')[0];
      
      // Get approved emails and filter for active users only
      const approvedEmailsList = await storage.getAllApprovedEmails();
      const approvedEmailSet = new Set(approvedEmailsList.filter(ae => ae.status === 'active').map(ae => ae.email));
      
      // Get all users and filter by approved emails
      const allUsers = await storage.getAllUsers();
      const approvedUsers = allUsers.filter(u => 
        (u.email && approvedEmailSet.has(u.email)) || approvedEmailSet.has(u.id)
      );
      
      // Calculate WEEKLY CUMULATIVE points for each approved user
      const leaderboardData = await Promise.all(
        approvedUsers.map(async (user) => {
          const userRituals = await storage.getRitualsByUser(user.id);
          const weeklyCompletions = await storage.getRitualCompletionsByDateRange(user.id, weekStartDate, weekEndDate);
          
          // Calculate cumulative points from all weekly completions
          const points = weeklyCompletions.reduce((sum, completion) => {
            const ritual = userRituals.find(r => r.id === completion.ritualId);
            if (!ritual || !ritual.isActive) return sum;
            
            // Use custom points from database, fallback to 50 if not set
            const ritualPoints = ritual.points || 50;
            return sum + ritualPoints;
          }, 0);
          
          // Get display name - prioritize firstName/lastName, then approved email name, then email
          let displayName = '';
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          
          if (fullName) {
            displayName = fullName;
          } else {
            // If no firstName/lastName, try to get name from approved_emails
            const approvedEmail = approvedEmailsList.find(ae => 
              ae.email === user.email || ae.email === user.id
            );
            if (approvedEmail && approvedEmail.name) {
              displayName = approvedEmail.name;
            } else {
              displayName = user.email || 'Unknown User';
            }
          }
          
          return {
            userId: user.id,
            name: displayName,
            email: user.email,
            points,
            isCurrentUser: user.id === currentUserId,
          };
        })
      );
      
      // Sort by points descending (highest first)
      leaderboardData.sort((a, b) => b.points - a.points);
      
      // Add rank to ALL users first
      const rankedLeaderboard = leaderboardData.map((entry, index) => ({
        rank: index + 1,
        ...entry,
      }));
      
      // Return only top 10 OR include current user if not in top 10
      const top10 = rankedLeaderboard.slice(0, 10);
      const currentUserEntry = rankedLeaderboard.find(entry => entry.userId === currentUserId);
      
      // If current user not in top 10, add them at the end
      if (currentUserEntry && currentUserEntry.rank > 10) {
        top10.push(currentUserEntry);
      }
      
      res.json(top10);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      res.status(500).json({ message: "Failed to fetch leaderboard" });
    }
  });

  // Get Health Mastery course modules from CSV (MUST be before /:weekNumber route!)
  app.get('/api/courses/health-mastery-modules', isAuthenticated, async (req: any, res) => {
    try {
      // Fetch all courses from CSV
      const courses = await parseCourseCSV();
      
      // Filter for Health Mastery courses only
      const healthMasteryCourses = courses.filter(course => 
        course.courseName.toLowerCase().includes('health mastery')
      );
      
      // Map to module format
      const modules = healthMasteryCourses.map((course, index) => ({
        id: `hm-module-${index + 1}`,
        title: course.courseName,
        url: course.link && !course.link.includes('April') ? course.link : undefined // Exclude placeholder links
      }));
      
      res.json({ modules });
    } catch (error) {
      console.error("Error fetching Health Mastery modules:", error);
      res.status(500).json({ message: "Failed to fetch modules", modules: [] });
    }
  });

  // Get Wealth Mastery course modules from CSV (MUST be before /:weekNumber route!)
  app.get('/api/courses/wealth-mastery-modules', isAuthenticated, async (req: any, res) => {
    try {
      // Fetch all courses from CSV
      const courses = await parseCourseCSV();
      
      // Filter for Wealth Mastery courses only
      const wealthMasteryCourses = courses.filter(course => 
        course.courseName.toLowerCase().includes('wealth mastery')
      );
      
      // Map to module format
      const modules = wealthMasteryCourses.map((course, index) => ({
        id: `wm-module-${index + 1}`,
        title: course.courseName,
        url: course.link || undefined
      }));
      
      res.json({ modules });
    } catch (error) {
      console.error("Error fetching Wealth Mastery modules:", error);
      res.status(500).json({ message: "Failed to fetch modules", modules: [] });
    }
  });

  // Get Relationship Mastery course modules from CSV (MUST be before /:weekNumber route!)
  app.get('/api/courses/relationship-mastery-modules', isAuthenticated, async (req: any, res) => {
    try {
      // Fetch all courses from CSV
      const courses = await parseCourseCSV();
      
      // Filter for Relationship Mastery courses only
      const relationshipMasteryCourses = courses.filter(course => 
        course.courseName.toLowerCase().includes('relationship mastery')
      );
      
      // Map to module format
      const modules = relationshipMasteryCourses.map((course, index) => ({
        id: `rm-module-${index + 1}`,
        title: course.courseName,
        url: course.link || undefined
      }));
      
      res.json({ modules });
    } catch (error) {
      console.error("Error fetching Relationship Mastery modules:", error);
      res.status(500).json({ message: "Failed to fetch modules", modules: [] });
    }
  });

  // Get Career Mastery course modules from CSV (MUST be before /:weekNumber route!)
  app.get('/api/courses/career-mastery-modules', isAuthenticated, async (req: any, res) => {
    try {
      // Fetch all courses from CSV
      const courses = await parseCourseCSV();
      
      // Filter for Career Mastery courses only
      const careerMasteryCourses = courses.filter(course => 
        course.courseName.toLowerCase().includes('career mastery')
      );
      
      // Map to module format
      const modules = careerMasteryCourses.map((course, index) => ({
        id: `cm-module-${index + 1}`,
        title: course.courseName,
        url: course.link && course.link !== '#' ? course.link : undefined
      }));
      
      res.json({ modules });
    } catch (error) {
      console.error("Error fetching Career Mastery modules:", error);
      res.status(500).json({ message: "Failed to fetch modules", modules: [] });
    }
  });

  // Courses endpoints
  app.get('/api/courses/:weekNumber', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const weekNumber = parseInt(req.params.weekNumber);
      const courses = await storage.getCoursesByUserAndWeek(userId, weekNumber);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching courses:", error);
      res.status(500).json({ message: "Failed to fetch courses" });
    }
  });

  app.post('/api/courses', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const courseData = { ...req.body, userId };
      const course = await storage.createCourse(courseData);
      res.json(course);
    } catch (error) {
      console.error("Error creating course:", error);
      res.status(500).json({ message: "Failed to create course" });
    }
  });

  // Course Videos endpoints
  app.get('/api/course-videos/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const courseId = req.params.courseId;
      const videos = await storage.getCourseVideos(courseId);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching course videos:", error);
      res.status(500).json({ message: "Failed to fetch course videos" });
    }
  });

  app.post('/api/course-videos', isAuthenticated, async (req: any, res) => {
    try {
      const videoData = insertCourseVideoSchema.parse(req.body);
      const video = await storage.createCourseVideo(videoData);
      res.json(video);
    } catch (error) {
      console.error("Error creating course video:", error);
      res.status(500).json({ message: "Failed to create course video" });
    }
  });

  // Course Video Completions endpoints
  app.get('/api/course-video-completions/:courseId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const courseId = req.params.courseId;
      const completions = await storage.getCourseVideoCompletions(userId, courseId);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching video completions:", error);
      res.status(500).json({ message: "Failed to fetch video completions" });
    }
  });

  app.post('/api/course-video-completions/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { videoId, courseId } = req.body;
      if (!videoId || !courseId) {
        return res.status(400).json({ message: "videoId and courseId are required" });
      }
      
      // Toggle the completion (no need to verify course as courses are frontend-only)
      const result = await storage.toggleVideoCompletion(userId, videoId);
      
      // Get completed count for this course
      const completedVideos = await storage.getCourseVideoCompletions(userId, courseId);
      
      res.json({ 
        ...result, 
        completedCount: completedVideos.length
      });
    } catch (error) {
      console.error("Error toggling video completion:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to toggle video completion";
      res.status(500).json({ message: errorMessage });
    }
  });

  // AI auto-fill endpoint for Problems/Feelings/Actions
  app.post('/api/ai/auto-fill', isAuthenticated, async (req: any, res) => {
    try {
      const { category, currentRating, problems, feelings, beliefs, actions } = req.body;
      
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a personal development coach helping users improve their ${category}. Based on the current state, suggest specific improvements for Problems, Feelings, and Actions. Be concise and actionable.`
          },
          {
            role: "user",
            content: `Category: ${category}\nCurrent Rating: ${currentRating}/10\nProblems: ${problems || 'Not specified'}\nFeelings: ${feelings || 'Not specified'}\nBeliefs: ${beliefs || 'Not specified'}\nActions: ${actions || 'Not specified'}\n\nSuggest improvements for the next week.`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192
      });

      const suggestions = JSON.parse(completion.choices[0].message.content || '{}');
      res.json(suggestions);
    } catch (error) {
      console.error("Error generating AI suggestions:", error);
      res.status(500).json({ message: "Failed to generate AI suggestions" });
    }
  });

  // AI course recommendation endpoint
  app.post('/api/ai/recommend-course', isAuthenticated, async (req: any, res) => {
    try {
      const { category, currentRating, problems, feelings, beliefs, actions } = req.body;
      
      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: `You are a course recommendation expert. Based on the user's ${category} goals and challenges, recommend ONE specific online course that would help them most. Include course name, a brief description, and match percentage (0-100).`
          },
          {
            role: "user",
            content: `Category: ${category}\nCurrent Rating: ${currentRating}/10\nProblems: ${problems || 'Not specified'}\nFeelings: ${feelings || 'Not specified'}\nBeliefs/Reasons: ${beliefs || 'Not specified'}\nCurrent Actions: ${actions || 'Not specified'}\n\nRecommend the best course. Return JSON with: { "courseName": "...", "description": "...", "matchScore": 85 }`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192
      });

      const recommendation = JSON.parse(completion.choices[0].message.content || '{}');
      res.json(recommendation);
    } catch (error) {
      console.error("Error generating course recommendation:", error);
      res.status(500).json({ message: "Failed to generate course recommendation" });
    }
  });

  // PDF Export endpoints
  app.get('/api/export/week/:weekNumber/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const weekNumber = parseInt(req.params.weekNumber);
      const user = await storage.getUser(userId);
      const week = await storage.getHercmWeek(userId, weekNumber);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="HRCM-Week-${weekNumber}.pdf"`);

      generateHRCMWeeklyPDF(user, week, res);
    } catch (error) {
      console.error("Error generating weekly PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  app.get('/api/export/monthly/:month/:year/pdf', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const month = parseInt(req.params.month);
      const year = parseInt(req.params.year);
      const user = await storage.getUser(userId);
      const allWeeks = await storage.getHercmWeeksByUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Filter weeks for the specified month/year
      const monthlyWeeks = allWeeks.filter(w => {
        if (!w.createdAt) return false;
        const weekDate = new Date(w.createdAt);
        return weekDate.getMonth() + 1 === month && weekDate.getFullYear() === year;
      });

      if (monthlyWeeks.length === 0) {
        return res.status(404).json({ message: "No data for this month" });
      }

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="HRCM-Monthly-${month}-${year}.pdf"`);

      generateMonthlyProgressPDF(user, monthlyWeeks, month, year, res);
    } catch (error) {
      console.error("Error generating monthly PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });

  // Smart Insights endpoint - ML-based analysis
  app.get('/api/insights/smart', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const weeks = await storage.getHercmWeeksByUser(userId);
      
      if (weeks.length < 2) {
        return res.json({
          insights: ["Start tracking for at least 2 weeks to get AI insights"],
          trends: [],
          recommendations: []
        });
      }

      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          {
            role: "system",
            content: "You are an expert life coach analyzing HRCM (Health, Relationship, Career, Money) progress data. Provide actionable insights, identify patterns, and predict future outcomes based on historical data."
          },
          {
            role: "user",
            content: `Analyze this user's HRCM progress data and provide smart insights:
            
${weeks.map((w, i) => `Week ${w.weekNumber}: Health=${w.currentH}/5, Relationship=${w.currentE}/5, Career=${w.currentR}/5, Money=${w.currentC}/5, Achievement=${w.achievementRate}%`).join('\n')}

Return JSON with:
{
  "insights": ["key insight 1", "key insight 2", ...],
  "trends": [{ "category": "Health|Relationship|Career|Money", "direction": "improving|declining|stable", "confidence": 0-100 }],
  "predictions": [{ "category": "...", "nextWeekPrediction": 1-5, "reasoning": "..." }],
  "recommendations": ["actionable recommendation 1", ...]
}`
          }
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192
      });

      const analysis = JSON.parse(completion.choices[0].message.content || '{}');
      res.json(analysis);
    } catch (error) {
      console.error("Error generating smart insights:", error);
      res.status(500).json({ message: "Failed to generate insights" });
    }
  });

  // ML-based target recommendations
  app.post('/api/insights/ml-targets', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { category, currentRating, historicalData } = req.body;
      
      if (!category || currentRating === undefined) {
        return res.status(400).json({ message: "Category and currentRating are required" });
      }

      const weeks = await storage.getHercmWeeksByUser(userId);

      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const completion = await Promise.race([
        openai.chat.completions.create({
          model: "gpt-5",
          messages: [
            {
              role: "system",
              content: "You are a machine learning expert specializing in goal-setting and achievement prediction. Based on historical performance data, recommend realistic yet challenging targets."
            },
            {
              role: "user",
              content: `Category: ${category}
Current Rating: ${currentRating}/5
Historical Data: ${JSON.stringify(historicalData || weeks.slice(-4))}

Recommend a target rating for next week based on ML analysis. Consider:
1. Historical improvement rate
2. Current momentum
3. Realistic achievability (80% probability of success)
4. Challenge level to maintain engagement

Return JSON: { "recommendedTarget": 1-5, "confidence": 0-100, "reasoning": "...", "tips": ["tip1", "tip2"] }`
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 8192
        }),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 25000)
        )
      ]);

      const recommendation = JSON.parse(completion.choices[0].message.content || '{}');
      res.json(recommendation);
    } catch (error: any) {
      console.error("Error generating ML target:", error);
      if (error.message === 'Request timeout') {
        return res.status(504).json({ message: "AI request timeout - please try again" });
      }
      res.status(500).json({ message: "Failed to generate target recommendation" });
    }
  });

  // Badge check and award - Check consecutive 4 weeks with rating 8+ and award Platinum badge
  app.post('/api/badges/check-platinum', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const allWeeks = await storage.getHercmWeeksByUser(userId);
      
      // Group by weekNumber and keep only the latest snapshot per week
      const weekMap = new Map<number, typeof allWeeks[0]>();
      allWeeks.forEach(week => {
        const existing = weekMap.get(week.weekNumber);
        if (!existing || (week.createdAt && existing.createdAt && new Date(week.createdAt) > new Date(existing.createdAt))) {
          weekMap.set(week.weekNumber, week);
        }
      });
      
      // Sort unique weeks by week number
      const uniqueWeeks = Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);

      if (uniqueWeeks.length < 4) {
        return res.json({ 
          eligible: false, 
          progress: 0, 
          weeksCount: uniqueWeeks.length,
          message: uniqueWeeks.length === 0 
            ? "Complete your first week to start tracking progress" 
            : `${uniqueWeeks.length}/4 weeks completed. Keep going!`
        });
      }

      // Calculate average rating for each unique week (Health, Relationship, Career, Money)
      const weeksWithAvgRating = uniqueWeeks.map(week => {
        const ratings = [
          week.currentH || 0,
          week.currentE || 0, 
          week.currentR || 0,
          week.currentC || 0
        ];
        const avgRating = ratings.reduce((sum, r) => sum + r, 0) / 4;
        return {
          weekNumber: week.weekNumber,
          avgRating,
          createdAt: week.createdAt
        };
      });

      // Find consecutive 4 weeks with rating 8+
      let consecutiveCount = 0;
      let startWeek = 0;
      let isPlatinum = false;

      for (let i = 0; i < weeksWithAvgRating.length; i++) {
        if (weeksWithAvgRating[i].avgRating >= 8) {
          if (consecutiveCount === 0) {
            startWeek = weeksWithAvgRating[i].weekNumber;
          }
          consecutiveCount++;
          
          // Check if consecutive (week numbers should be sequential)
          if (i > 0 && weeksWithAvgRating[i].weekNumber !== weeksWithAvgRating[i - 1].weekNumber + 1) {
            consecutiveCount = 1; // Reset if not consecutive
            startWeek = weeksWithAvgRating[i].weekNumber;
          }
          
          if (consecutiveCount >= 4) {
            isPlatinum = true;
            break;
          }
        } else {
          consecutiveCount = 0;
        }
      }

      // Calculate current progress (last 4 weeks average rating)
      const last4Weeks = weeksWithAvgRating.slice(-4);
      const currentProgress = last4Weeks.reduce((sum, w) => sum + w.avgRating, 0) / last4Weeks.length;

      if (isPlatinum) {
        // Award Platinum badge
        const progress = await storage.getPlatinumProgress(userId) || await storage.createPlatinumProgress({ userId });
        
        const platinumBadge = {
          id: `platinum-consecutive-${startWeek}-${startWeek + 3}`,
          name: 'Platinum Standards',
          achievedAt: new Date().toISOString(),
          description: `Achieved 8+ rating for 4 consecutive weeks (Week ${startWeek}-${startWeek + 3})`
        };

        const existingBadges = progress.badges || [];
        const alreadyHas = existingBadges.some(b => b.id === platinumBadge.id);

        if (!alreadyHas) {
          await storage.updatePlatinumProgress(userId, {
            badges: [...existingBadges, platinumBadge],
            platinumAchieved: true,
            platinumAchievedAt: new Date()
          });

          // Send email notification
          await emailService.sendPlatinumBadgeNotification(user);
        }

        res.json({ 
          eligible: true, 
          progress: currentProgress, 
          badge: platinumBadge,
          alreadyAwarded: alreadyHas 
        });
      } else {
        res.json({ 
          eligible: false, 
          progress: currentProgress,
          consecutiveWeeks: consecutiveCount,
          message: `${consecutiveCount}/4 consecutive weeks with 8+ rating`
        });
      }
    } catch (error) {
      console.error("Error checking platinum badge:", error);
      res.status(500).json({ message: "Failed to check badge eligibility" });
    }
  });

  // Add course lessons to Assignment column (using weekNumber)
  app.post('/api/assignment/add-lessons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { weekNumber, category, lessons } = req.body;

      if (!weekNumber || !category || !lessons || !Array.isArray(lessons)) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch the week by weekNumber
      const weeks = await storage.getHercmWeeksByUser(userId);
      const week = weeks.find((w: any) => w.weekNumber === weekNumber);
      
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Get the assignment field for the category
      const prefix = category.toLowerCase();
      const assignmentField = `${prefix}Assignment` as keyof typeof week;
      const currentAssignment = (week[assignmentField] as any) || { courses: [], lessons: [] };

      // Add lessons to the assignment
      // Merge with existing lessons (avoid duplicates)
      const existingLessonIds = new Set(currentAssignment.lessons?.map((l: any) => l.id) || []);
      const filteredNewLessons = lessons.filter((l: any) => !existingLessonIds.has(l.id));

      const updatedAssignment = {
        courses: currentAssignment.courses || [],
        lessons: [...(currentAssignment.lessons || []), ...filteredNewLessons]
      };

      // Update the week
      const updateData: any = {};
      updateData[assignmentField] = updatedAssignment;
      
      await storage.updateHercmWeek(week.id, updateData);

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error adding lessons to assignment:", error);
      res.status(500).json({ message: "Failed to add lessons" });
    }
  });

  // Legacy endpoint (using weekId) - keeping for compatibility
  app.post('/api/hercm/assignment/add-lessons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { weekId, category, courseId, courseName, lessons } = req.body;

      if (!weekId || !category || !lessons || !Array.isArray(lessons)) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch the current week
      const week = await storage.getHercmWeekById(weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Get the assignment field for the category
      const prefix = category.toLowerCase();
      const assignmentField = `${prefix}Assignment` as keyof typeof week;
      const currentAssignment = (week[assignmentField] as any) || { courses: [], lessons: [] };

      // Add lessons to the assignment
      const newLessons = lessons.map((lesson: any) => ({
        id: lesson.id,
        courseId: courseId,
        courseName: courseName,
        lessonName: lesson.title,
        url: lesson.url,
        completed: false
      }));

      // Merge with existing lessons (avoid duplicates)
      const existingLessonIds = new Set(currentAssignment.lessons?.map((l: any) => l.id) || []);
      const filteredNewLessons = newLessons.filter((l: any) => !existingLessonIds.has(l.id));

      const updatedAssignment = {
        courses: currentAssignment.courses || [],
        lessons: [...(currentAssignment.lessons || []), ...filteredNewLessons]
      };

      // Update the week
      const updateData: any = {};
      updateData[assignmentField] = updatedAssignment;
      
      await storage.updateHercmWeek(weekId, updateData);

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error adding lessons to assignment:", error);
      res.status(500).json({ message: "Failed to add lessons" });
    }
  });

  // Toggle assignment lesson completion
  app.post('/api/hercm/assignment/toggle-lesson', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { weekId, category, lessonId } = req.body;

      if (!weekId || !category || !lessonId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch the current week
      const week = await storage.getHercmWeekById(weekId);
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Get the assignment field for the category
      const prefix = category.toLowerCase();
      const assignmentField = `${prefix}Assignment` as keyof typeof week;
      const currentAssignment = (week[assignmentField] as any) || { courses: [], lessons: [] };

      // Toggle the lesson completion
      const updatedLessons = (currentAssignment.lessons || []).map((lesson: any) => 
        lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson
      );

      const updatedAssignment = {
        ...currentAssignment,
        lessons: updatedLessons
      };

      // Update the week
      const updateData: any = {};
      updateData[assignmentField] = updatedAssignment;
      
      await storage.updateHercmWeek(weekId, updateData);

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error toggling lesson:", error);
      res.status(500).json({ message: "Failed to toggle lesson" });
    }
  });

  // Get AI course recommendations for Assignment (Next Week)
  app.post('/api/courses/recommend-assignment', isAuthenticated, async (req: any, res) => {
    try {
      const { category, currentRating, problems, feelings, beliefs, actions } = req.body;
      
      if (!category) {
        return res.status(400).json({ message: "Category is required" });
      }
      
      // Use same logic as Current Week AI Course recommendations
      const rating = Math.max(1, Math.min(currentRating || 1, 7));
      
      let numberOfCourses: number;
      if (rating < 3) {
        numberOfCourses = 5;
      } else if (rating < 5) {
        numberOfCourses = 3;
      } else {
        numberOfCourses = 2;
      }
      
      const courses = await parseCourseCSV();
      const recommendations = await getAIRecommendations(courses, {
        category,
        rating: rating,
        problems: problems || '',
        feelings: feelings || '',
        beliefs: beliefs || '',
        actions: actions || '',
      }, numberOfCourses, []);
      
      if (recommendations.length === 0) {
        return res.json({ courses: [] });
      }
      
      const seenCourseNames = new Set<string>();
      const mappedCourses = recommendations
        .filter(rec => {
          if (seenCourseNames.has(rec.course.courseName)) {
            return false;
          }
          seenCourseNames.add(rec.course.courseName);
          return true;
        })
        .map((rec, index) => ({
          id: `assignment-course-${index + 1}`,
          courseName: rec.course.courseName,
          link: rec.course.link,
          completed: false
        }));
      
      res.json({ courses: mappedCourses });
    } catch (error) {
      console.error("Error getting assignment course recommendation:", error);
      res.status(500).json({ 
        message: "Failed to get course recommendation",
        courses: []
      });
    }
  });

  // Unified Assignment Endpoints (single column for all HRCM areas)
  
  // Add lesson to category assignment (auto-add when checked in Course Tracker)
  app.post('/api/unified-assignment/add-lesson', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { weekNumber, lesson, category } = req.body;

      if (!weekNumber || !lesson) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch the week by weekNumber
      const weeks = await storage.getHercmWeeksByUser(userId);
      const week = weeks.find((w: any) => w.weekNumber === weekNumber);
      
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Map category to assignment field name
      const categoryMap: Record<string, string> = {
        'Health': 'healthAssignment',
        'Relationship': 'relationshipAssignment',
        'Career': 'careerAssignment',
        'Money': 'moneyAssignment'
      };

      const assignmentField = category ? categoryMap[category] : null;
      
      if (!assignmentField) {
        // If no category, fall back to unified assignment
        const currentAssignment = (week.unifiedAssignment as any) || [];
        const lessonExists = currentAssignment.some((l: any) => l.id === lesson.id);
        
        if (lessonExists) {
          return res.json({ success: true, assignment: currentAssignment, message: "Lesson already in assignment" });
        }

        const updatedAssignment = [...currentAssignment, { 
          id: lesson.id,
          courseId: lesson.courseId,
          courseName: lesson.courseName,
          lessonName: lesson.lessonName,
          url: lesson.url || '',
          completed: false,
          source: 'user' as const
        }];

        await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });
        return res.json({ success: true, assignment: updatedAssignment });
      }

      // Get current category assignment
      const currentAssignment = (week[assignmentField as keyof typeof week] as any) || { courses: [], lessons: [] };
      const currentLessons = currentAssignment.lessons || [];

      // Check if lesson already exists
      const lessonExists = currentLessons.some((l: any) => l.id === lesson.id);
      
      if (lessonExists) {
        return res.json({ success: true, assignment: currentAssignment, message: "Lesson already in assignment" });
      }

      // Add lesson to category assignment
      const updatedAssignment = {
        courses: currentAssignment.courses || [],
        lessons: [...currentLessons, { 
          id: lesson.id,
          courseId: lesson.courseId,
          courseName: lesson.courseName,
          lessonName: lesson.lessonName,
          url: lesson.url || '',
          completed: false
        }]
      };

      // Update the week with category-specific assignment
      const updateData: any = {};
      updateData[assignmentField] = updatedAssignment;
      await storage.updateHercmWeek(week.id, updateData);

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error adding lesson to assignment:", error);
      res.status(500).json({ message: "Failed to add lesson" });
    }
  });

  // Toggle lesson completion in unified assignment
  app.post('/api/unified-assignment/toggle-lesson', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { weekNumber, lessonId } = req.body;

      if (!weekNumber || !lessonId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch the week by weekNumber
      const weeks = await storage.getHercmWeeksByUser(userId);
      const week = weeks.find((w: any) => w.weekNumber === weekNumber);
      
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Get current unified assignment
      const currentAssignment = (week.unifiedAssignment as any) || [];

      // Toggle the lesson completion
      const updatedAssignment = currentAssignment.map((lesson: any) => 
        lesson.id === lessonId ? { ...lesson, completed: !lesson.completed } : lesson
      );

      // Update the week
      await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error toggling lesson in unified assignment:", error);
      res.status(500).json({ message: "Failed to toggle lesson" });
    }
  });

  // Remove lesson from category assignment
  app.post('/api/unified-assignment/remove-lesson', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { weekNumber, lessonId, category } = req.body;

      if (!weekNumber || !lessonId) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Fetch the week by weekNumber
      const weeks = await storage.getHercmWeeksByUser(userId);
      const week = weeks.find((w: any) => w.weekNumber === weekNumber);
      
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }

      // Map category to assignment field name
      const categoryMap: Record<string, string> = {
        'Health': 'healthAssignment',
        'Relationship': 'relationshipAssignment',
        'Career': 'careerAssignment',
        'Money': 'moneyAssignment'
      };

      const assignmentField = category ? categoryMap[category] : null;
      
      if (!assignmentField) {
        // If no category, fall back to unified assignment
        const currentAssignment = (week.unifiedAssignment as any) || [];
        const updatedAssignment = currentAssignment.filter((lesson: any) => lesson.id !== lessonId);
        await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });
        return res.json({ success: true, assignment: updatedAssignment });
      }

      // Get current category assignment
      const currentAssignment = (week[assignmentField as keyof typeof week] as any) || { courses: [], lessons: [] };
      const currentLessons = currentAssignment.lessons || [];

      // Remove the lesson
      const updatedAssignment = {
        courses: currentAssignment.courses || [],
        lessons: currentLessons.filter((lesson: any) => lesson.id !== lessonId)
      };

      // Update the week with category-specific assignment
      const updateData: any = {};
      updateData[assignmentField] = updatedAssignment;
      await storage.updateHercmWeek(week.id, updateData);

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error removing lesson from assignment:", error);
      res.status(500).json({ message: "Failed to remove lesson" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
