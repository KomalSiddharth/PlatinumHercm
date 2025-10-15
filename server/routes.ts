// Server routes with Replit Auth integration
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
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
      // Handle both OIDC auth (req.user.claims.sub) and email-based auth (req.session.userEmail)
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const user = await storage.getUser(userId);
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
      
      const weeks = await storage.getHercmWeeksByUser(userId);
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
      
      const weekNumber = parseInt(req.params.weekNumber);
      let week = await storage.getHercmWeek(userId, weekNumber);
      
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
        const weeklyData = [];
        const weekMap = new Map();

        weeks.forEach((w: any) => {
          if (!weekMap.has(w.weekNumber)) {
            weekMap.set(w.weekNumber, []);
          }
          weekMap.get(w.weekNumber).push(w);
        });

        for (const [weekNum, weekData] of weekMap.entries()) {
          const latest = weekData[weekData.length - 1]; // Get latest snapshot
          const healthProgress = latest.healthChecklist ? JSON.parse(latest.healthChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;
          const relationshipProgress = latest.relationshipChecklist ? JSON.parse(latest.relationshipChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;
          const careerProgress = latest.careerChecklist ? JSON.parse(latest.careerChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;
          const moneyProgress = latest.moneyChecklist ? JSON.parse(latest.moneyChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;

          weeklyData.push({
            week: `W${weekNum}`,
            Health: Math.round(healthProgress),
            Relationship: Math.round(relationshipProgress),
            Career: Math.round(careerProgress),
            Money: Math.round(moneyProgress),
          });
        }

        res.json({ weeklyData: weeklyData.slice(-5) }); // Last 5 weeks
      } else if (viewType === 'monthly') {
        // Group by month and calculate averages
        const monthlyData = [];
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
        
        for (const [monthKey, monthWeeks] of monthMap.entries()) {
          const [year, month] = monthKey.split('-');
          const avgHealth = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            const progress = w.healthChecklist ? JSON.parse(w.healthChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;
            return sum + progress;
          }, 0) / monthWeeks.length);

          const avgRelationship = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            const progress = w.relationshipChecklist ? JSON.parse(w.relationshipChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;
            return sum + progress;
          }, 0) / monthWeeks.length);

          const avgCareer = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            const progress = w.careerChecklist ? JSON.parse(w.careerChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;
            return sum + progress;
          }, 0) / monthWeeks.length);

          const avgMoney = Math.round(monthWeeks.reduce((sum: number, w: any) => {
            const progress = w.moneyChecklist ? JSON.parse(w.moneyChecklist).filter((c: any) => c.checked).length / 4 * 100 : 0;
            return sum + progress;
          }, 0) / monthWeeks.length);

          monthlyData.push({
            month: monthNames[parseInt(month)],
            Health: avgHealth,
            Relationship: avgRelationship,
            Career: avgCareer,
            Money: avgMoney,
          });
        }

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
  app.get('/api/admin/users', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Search user by email
  app.get('/api/admin/search-user', isAuthenticated, isAdmin, async (req, res) => {
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
  app.get('/api/admin/search-user-by-name', isAuthenticated, isAdmin, async (req, res) => {
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

  app.get('/api/admin/user/:userId/weeks', isAuthenticated, isAdmin, async (req, res) => {
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
  app.get('/api/admin/user/:userId/analytics', isAuthenticated, isAdmin, async (req, res) => {
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
  app.get('/api/admin/user/:userId/detailed-analytics', isAuthenticated, isAdmin, async (req, res) => {
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
      
      // Calculate regularity/irregularity
      const totalWeeks = sortedWeeks.length;
      const expectedWeeks = totalWeeks > 0 ? sortedWeeks[sortedWeeks.length - 1].weekNumber : 0;
      const regularity = expectedWeeks > 0 ? Math.round((totalWeeks / expectedWeeks) * 100) : 0;
      const missedWeeks = expectedWeeks - totalWeeks;
      
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
      const latestWeek = sortedWeeks[sortedWeeks.length - 1] || null;
      const progressSummary = latestWeek ? {
        currentWeek: latestWeek.weekNumber,
        overallScore: latestWeek.overallScore || 0,
        achievementRate: latestWeek.achievementRate || 0,
        currentStreak: platinumProgress?.currentStreak || 0,
        totalBadges: platinumProgress?.badges?.length || 0,
      } : null;
      
      // Compact weekly data (all weeks in summary format)
      const compactWeeklyData = sortedWeeks.map(week => ({
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
        badges: platinumProgress?.badges || [],
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

  // Admin analytics - Get all users progress summary
  app.get('/api/admin/users-analytics', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      const analytics = [];
      
      for (const user of users) {
        const weeks = await storage.getHercmWeeksByUser(user.id);
        
        if (weeks.length > 0) {
          const latestWeek = weeks[weeks.length - 1];
          const overallScore = latestWeek.overallScore || 0;
          const achievementRate = latestWeek.achievementRate || 0;
          
          // Calculate trend (compare last 2 weeks)
          let trend = 0;
          if (weeks.length >= 2) {
            const prevWeek = weeks[weeks.length - 2];
            const prevScore = prevWeek.overallScore || 0;
            trend = overallScore - prevScore;
          }
          
          analytics.push({
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            totalWeeks: weeks.length,
            latestWeekNumber: latestWeek.weekNumber,
            overallScore,
            achievementRate,
            trend, // positive = improving, negative = declining
            status: achievementRate >= 70 ? 'excellent' : achievementRate >= 50 ? 'good' : 'needs_support',
          });
        }
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

  // AI Auto-fill next week goals based on current week data
  app.post('/api/hercm/auto-fill-next-week', isAuthenticated, async (req: any, res) => {
    try {
      const { category, currentRating, problems, currentFeelings, currentBelief, currentActions } = req.body;
      
      const prompt = `You are an expert life coach helping users set realistic and achievable goals for next week.

**User's Current Week Data (${category}):**
- Current Rating: ${currentRating}/10
- Problems: ${problems}
- Current Feelings: ${currentFeelings}
- Current Beliefs: ${currentBelief}
- Current Actions: ${currentActions}

**Task:**
Based on their current situation, suggest realistic next week goals that will help them improve incrementally.

Provide the following:
1. **Target Rating**: Suggest a realistic target rating for next week (current + 1 or 2 points max, never more than 10)
2. **Expected Result**: What tangible outcome should they expect if they follow through (be specific and realistic)
3. **Target Feelings**: Transform their negative feelings into positive ones (e.g., "Lazy" → "Active, Energetic")
4. **Next Week Target**: A positive belief or affirmation to work towards (transform their limiting belief)
5. **Next Actions**: 3-4 specific, actionable steps they should take next week
6. **Affirmation**: A powerful, personal affirmation to support their transformation

Return ONLY valid JSON in this exact format:
{
  "targetRating": 5,
  "expectedResult": "...",
  "targetFeelings": "...",
  "nextWeekTarget": "...",
  "nextActions": "...",
  "affirmation": "..."
}`;

      // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
      const completion = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: "You are an expert life coach providing personalized goal suggestions. Always return valid JSON." },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
      });

      const responseText = completion.choices[0]?.message?.content || '{}';
      
      // Parse AI response
      const aiSuggestion = JSON.parse(responseText);
      
      res.json(aiSuggestion);
    } catch (error) {
      console.error("Error auto-filling next week goals:", error);
      
      // Fallback: simple incremental logic
      const fallback = {
        targetRating: Math.min((req.body.currentRating || 1) + 1, 10),
        expectedResult: "Incremental improvement in this area",
        targetFeelings: "Positive, Motivated",
        nextWeekTarget: "I am making progress every day",
        nextActions: "Take small steps daily towards improvement",
        affirmation: "I am capable of positive change"
      };
      
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
      if (!existingUser) {
        await storage.upsertUser({
          id: email,
          email: email,
        });
      }
      
      req.session.userEmail = email;
      req.session.isAdmin = false;
      
      res.json({ success: true, message: "Login successful" });
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

  app.delete('/api/admin/approved-emails/all', async (req, res) => {
    try {
      await storage.deleteAllApprovedEmails();
      res.json({ success: true, message: "All emails deleted" });
    } catch (error) {
      console.error("Error deleting all emails:", error);
      res.status(500).json({ message: "Failed to delete all emails" });
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

  // Rituals endpoints
  app.get('/api/rituals', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      // Ensure user exists in users table (create if doesn't exist)
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        // For admin users logging via email, use email as both id and email
        const userEmail = typeof userId === 'string' && userId.includes('@') ? userId : req.session.userEmail;
        await storage.upsertUser({
          id: userId,
          email: userEmail || userId,
        });
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
      const existingRituals = await storage.getRitualsByUser(userId);
      
      // Check which default rituals are missing
      const existingTitles = new Set(existingRituals.map(r => r.title));
      const missingDefaults = defaultRituals.filter(d => !existingTitles.has(d.title));
      
      // Create missing default rituals
      for (const defaultRitual of missingDefaults) {
        await storage.createRitual({
          ...defaultRitual,
          userId,
        });
      }
      
      // Fetch all rituals again if we created any defaults
      const allRituals = missingDefaults.length > 0 
        ? await storage.getRitualsByUser(userId)
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
      
      const ritualData = { ...req.body, userId };
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
      
      const { id } = req.params;
      
      // Check if ritual is a default ritual before attempting deletion
      const rituals = await storage.getRitualsByUser(userId);
      const ritual = rituals.find(r => r.id === id);
      
      if (!ritual) {
        return res.status(404).json({ message: "Ritual not found" });
      }
      
      if (ritual.isDefault) {
        return res.status(403).json({ message: "Default rituals cannot be deleted. You can pause them instead." });
      }
      
      const deletedCount = await storage.deleteRitual(id, userId);
      
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

  // Leaderboard endpoint - Multi-user ritual points
  app.get('/api/leaderboard', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user?.claims?.sub || req.session.userEmail;
      const todayDate = new Date().toISOString().split('T')[0];
      
      // Get all users
      const allUsers = await storage.getAllUsers();
      
      // Calculate points for each user
      const leaderboardData = await Promise.all(
        allUsers.map(async (user) => {
          const userRituals = await storage.getRitualsByUser(user.id);
          const todayCompletions = await storage.getRitualCompletionsByDate(user.id, todayDate);
          
          // Calculate points using actual ritual.points from database
          const points = userRituals.reduce((sum, ritual) => {
            const isCompleted = todayCompletions.some(c => c.ritualId === ritual.id);
            if (!isCompleted || !ritual.isActive) return sum;
            
            // Use custom points from database, fallback to 50 if not set
            const ritualPoints = ritual.points || 50;
            return sum + ritualPoints;
          }, 0);
          
          const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim();
          return {
            userId: user.id,
            name: fullName || user.email || 'Unknown User',
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
      
      // Verify course exists
      const allVideos = await storage.getCourseVideos(courseId);
      if (allVideos.length === 0) {
        return res.status(404).json({ message: "Course or videos not found" });
      }
      
      // Toggle the completion
      const result = await storage.toggleVideoCompletion(userId, videoId);
      
      // Recalculate course progress
      const completedVideos = await storage.getCourseVideoCompletions(userId, courseId);
      const progress = Math.round((completedVideos.length / allVideos.length) * 100);
      
      // Update the course progress
      await storage.updateCourseProgress(courseId, progress);
      
      res.json({ 
        ...result, 
        progress,
        completedCount: completedVideos.length,
        totalCount: allVideos.length
      });
    } catch (error) {
      console.error("Error toggling video completion:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to toggle video completion";
      
      // Check if it's a "not found" error
      if (errorMessage.includes('not found')) {
        return res.status(404).json({ message: errorMessage });
      }
      
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
        return res.json({ eligible: false, progress: 0, message: "Need at least 4 weeks of data" });
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
  
  // Add lesson to unified assignment (auto-add when checked in Course Tracker)
  app.post('/api/unified-assignment/add-lesson', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { weekNumber, lesson } = req.body;

      if (!weekNumber || !lesson) {
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

      // Check if lesson already exists
      const lessonExists = currentAssignment.some((l: any) => l.id === lesson.id);
      
      if (lessonExists) {
        return res.json({ success: true, assignment: currentAssignment, message: "Lesson already in assignment" });
      }

      // Add lesson to unified assignment
      const updatedAssignment = [...currentAssignment, { 
        id: lesson.id,
        courseId: lesson.courseId,
        courseName: lesson.courseName,
        lessonName: lesson.lessonName,
        url: lesson.url || '',
        completed: false
      }];

      // Update the week
      await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error adding lesson to unified assignment:", error);
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

  // Remove lesson from unified assignment
  app.post('/api/unified-assignment/remove-lesson', isAuthenticated, async (req: any, res) => {
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

      // Remove the lesson
      const updatedAssignment = currentAssignment.filter((lesson: any) => lesson.id !== lessonId);

      // Update the week
      await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });

      res.json({ success: true, assignment: updatedAssignment });
    } catch (error) {
      console.error("Error removing lesson from unified assignment:", error);
      res.status(500).json({ message: "Failed to remove lesson" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
