// Server routes with Replit Auth integration
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { fetchCourseData, findMatchingCourse, recommendCourses, fetchEnhancedCourseData } from "./googleSheets";
import { parseCourseCSV } from "./csvCourseParser";
import { recommendCoursesRequestSchema, insertCourseVideoSchema, type RitualCompletion } from "@shared/schema";
import { getAIRecommendations, generateAffirmation } from "./aiRecommendations";
import { generateHRCMWeeklyPDF, generateMonthlyProgressPDF } from "./pdfExport";
import { emailService } from "./emailService";
import { validateAndCapRating, updateRatingProgression, getRatingCaps, getRatingProgressionStatus } from "./ratingProgression";
import { backupAllData, backupUserData, getBackupStats } from "./backupService";
import { isSupabaseConfigured, checkSupabaseHealth } from "./supabase";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";

// WebSocket clients management
const wsClients = new Map<string, WebSocket>();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Rate Limiting Configuration for Security
// Prevents brute force attacks and API abuse

// General API rate limiter: 5000 requests per 15 minutes (increased for admin panel heavy usage)
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5000, // Limit each IP to 5000 requests per window (admin panel needs high limit)
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: (req) => {
    // Skip rate limiting for admin routes (already protected by authentication)
    return req.path.startsWith('/api/admin/');
  }
});

// Strict rate limiter for auth endpoints: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 requests per window
  message: 'Too many authentication attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
});

// File upload rate limiter: 20 uploads per hour
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit each IP to 20 uploads per hour
  message: 'Too many file uploads, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
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

  // Apply general rate limiting to all API routes
  app.use('/api/', apiLimiter);

  // Auth routes - no rate limiting to allow immediate re-login after logout
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
      
      console.log(`[AUTH/USER] Returning user - id: ${user.id}, firstName: ${user.firstName}, lastName: ${user.lastName}`);
      console.log(`[AUTH/USER] Full user object:`, JSON.stringify(user));
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

  // Get HRCM data by specific date (like Emotional Tracker)
  app.get('/api/hercm/by-date/:date', isAuthenticated, async (req: any, res) => {
    try {
      // CRITICAL: Disable ALL caching to prevent showing wrong date's data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      let user = await storage.getUser(userId);
      if (!user && typeof userId === 'string' && userId.includes('@')) {
        user = await storage.getUserByEmail(userId);
      }
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const requestedDate = req.params.date;
      
      // Get ALL weeks for user (no week number deduplication)
      const allWeeks = await storage.getAllHercmWeeksByUserWithDates(user.id);
      
      console.log(`[HERCM BY-DATE] Requested date: ${requestedDate}, Total weeks found: ${allWeeks?.length || 0}`);
      
      if (!allWeeks || allWeeks.length === 0) {
        console.log(`[HERCM BY-DATE] No weeks found for user ${user.id}`);
        return res.json(null);
      }
      
      // Log all week dates for debugging
      allWeeks.forEach((week: any, index: number) => {
        console.log(`[HERCM BY-DATE] Week ${index + 1}: createdAt=${week.createdAt}, dateString=${week.dateString}, weekNumber=${week.weekNumber}`);
      });
      
      // CRITICAL: Check if requested date is in the FUTURE using LOCAL timezone (NOT UTC)
      // Using UTC caused bug: IST 3rd Nov 1:30 AM → UTC 2nd Nov 8 PM → thought 3rd was future!
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const todayStr = `${year}-${month}-${day}`;  // Local date, not UTC!
      
      const requestedDateTime = new Date(requestedDate).getTime();
      const todayTime = new Date(todayStr).getTime();
      
      console.log(`[BY-DATE DEBUG] Today (LOCAL): ${todayStr}, Requested: ${requestedDate}, Is Future: ${requestedDateTime > todayTime}`);
      
      if (requestedDateTime > todayTime) {
        // FUTURE DATE - Return null (blank table)
        console.log(`[BY-DATE DEBUG] Future date detected - returning null`);
        return res.json(null);
      }
      
      // NOT FUTURE (Past or Today) - Show data
      // Step 1: Try exact date match using dateString from SQL
      const exactMatchWeeks = allWeeks.filter((week: any) => {
        const isMatch = week.dateString === requestedDate;
        console.log(`[HERCM BY-DATE] Comparing ${week.dateString} === ${requestedDate}: ${isMatch}`);
        return isMatch;
      });
      
      let week;
      
      if (exactMatchWeeks.length > 0) {
        // Found exact match - return most recent entry for that date
        console.log(`[BY-DATE DEBUG] Exact match found for ${requestedDate}`);
        week = exactMatchWeeks.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
      } else {
        // No exact match - return NULL (show blank table for dates without data)
        console.log(`[BY-DATE DEBUG] No exact match for ${requestedDate}, returning null (blank table)`);
        return res.json(null);
      }
      
      console.log(`[BY-DATE DEBUG] Selected week - createdAt: ${week.createdAt}, healthProblems: ${week.healthProblems}, healthCurrentFeelings: ${week.healthCurrentFeelings}`);
      
      // Transform to beliefs format (same as week endpoint)
      const beliefs = [
        {
          category: 'Health',
          currentRating: week.currentH || 0,
          targetRating: week.targetH || 0,
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
          currentRating: week.currentE || 0,
          targetRating: week.targetE || 0,
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
          currentRating: week.currentR || 0,
          targetRating: week.targetR || 0,
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
          currentRating: week.currentC || 0,
          targetRating: week.targetC || 0,
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
      
      res.json({ beliefs, createdAt: week.createdAt, weekNumber: week.weekNumber });
    } catch (error) {
      console.error("Error fetching HRCM data by date:", error);
      res.status(500).json({ message: "Failed to fetch HRCM data" });
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
      console.log('[API DEBUG] healthChecklist from DB:', week.healthChecklist);
      console.log('[API DEBUG] healthChecklist type:', typeof week.healthChecklist);
      console.log('[API DEBUG] healthChecklist is array:', Array.isArray(week.healthChecklist));
      console.log('[API DEBUG] healthChecklist length:', week.healthChecklist?.length);
      
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
      
      // Get current week to preserve unifiedAssignment
      const currentWeek = await storage.getHercmWeek(userId, weekNumber);
      
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
      
      // Preserve unifiedAssignment from current week (filter out completed items)
      let unifiedAssignment: any[] = [];
      if (currentWeek && currentWeek.unifiedAssignment && Array.isArray(currentWeek.unifiedAssignment)) {
        // Carry forward only uncompleted items
        unifiedAssignment = currentWeek.unifiedAssignment.filter((item: any) => !item.completed);
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
        moneyAssignment: uncheckedAssignments.money,
        unifiedAssignment: unifiedAssignment
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
        
        // Calculate overall score (H, E, R, C = 4 areas, NOT 5)
        // currentM is legacy/unused - only use H, E(Relationship), R(Career), C(Money)
        const current = [weekData.currentH, weekData.currentE, weekData.currentR, weekData.currentC];
        weekData.overallScore = Math.round(current.reduce((a, b) => a + (b || 0), 0) / 4);
        
        // Achievement rate: WEEKLY PROGRESS percentage (checklist completion across all 4 HRCM areas)
        // This matches the "Progress" column shown in dashboard
        const calculateChecklistProgress = (checklist: any[]): number => {
          if (!checklist || checklist.length === 0) return 0;
          const completed = checklist.filter((item: any) => item.checked).length;
          return (completed / checklist.length) * 100;
        };
        
        const healthProgress = calculateChecklistProgress(weekData.healthChecklist || []);
        const relationshipProgress = calculateChecklistProgress(weekData.relationshipChecklist || []);
        const careerProgress = calculateChecklistProgress(weekData.careerChecklist || []);
        const moneyProgress = calculateChecklistProgress(weekData.moneyChecklist || []);
        
        // Average progress across all 4 areas
        weekData.achievementRate = Math.round((healthProgress + relationshipProgress + careerProgress + moneyProgress) / 4);
      }
      
      // UPSERT logic: Check if week already exists for this user+weekNumber
      // If exists, UPDATE it (preserves checked states across refresh)
      // If not exists, CREATE new week
      const existingWeek = await storage.getHercmWeek(userId, weekData.weekNumber);
      
      let week;
      if (existingWeek) {
        // Week exists - UPDATE it to preserve data and avoid duplicate rows
        console.log(`[SAVE DEBUG] Week ${weekData.weekNumber} exists (id: ${existingWeek.id}) - updating`);
        console.log(`[SAVE DEBUG] Existing createdAt: ${existingWeek.createdAt}, preserving it`);
        
        // CRITICAL FIX: Exclude createdAt and updatedAt to prevent overwriting original creation date
        const { createdAt, updatedAt, ...updateData } = weekData;
        week = await storage.updateHercmWeek(existingWeek.id, updateData);
      } else {
        // Week doesn't exist - CREATE new
        console.log(`[SAVE DEBUG] Week ${weekData.weekNumber} does not exist - creating new`);
        week = await storage.createHercmWeek(weekData);
      }
      
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
      
      // Broadcast WebSocket event to all admin panels viewing this user's dashboard
      // This enables instant real-time sync - admins see changes immediately without delay
      try {
        console.log(`[WEBSOCKET] Broadcasting HRCM data change for user ${userId}, week ${weekData.weekNumber}`);
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({
              type: 'hrcm_data_changed',
              userId: userId,
              weekNumber: weekData.weekNumber,
              timestamp: new Date().toISOString()
            }));
          }
        });
      } catch (wsError) {
        console.error('[WEBSOCKET] Error broadcasting HRCM change:', wsError);
        // Don't fail the save if WebSocket broadcast fails
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
        // Use Progress column values (checklist completion %) - same as shown in Current Week table
        const weeklyData: Array<{ week: string; Health: number; Relationship: number; Career: number; Money: number }> = [];
        
        // Calculate progress from checklist completion (matches Progress column)
        const calculateProgress = (checklistData: any) => {
          if (!checklistData) return 0;
          const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
          if (!Array.isArray(checklist) || checklist.length === 0) return 0;
          const checked = checklist.filter((c: any) => c.checked).length;
          return Math.round((checked / checklist.length) * 100);
        };
        
        // Deduplication: Use scoring system to pick most complete row when duplicates exist
        const scoreWeek = (week: any) => {
          let score = 0;
          // Count non-empty checklists (each worth 10 points)
          try {
            if (week.healthChecklist) {
              const parsed = typeof week.healthChecklist === 'string' ? JSON.parse(week.healthChecklist) : week.healthChecklist;
              if (Array.isArray(parsed) && parsed.length > 0) score += 10;
            }
            if (week.relationshipChecklist) {
              const parsed = typeof week.relationshipChecklist === 'string' ? JSON.parse(week.relationshipChecklist) : week.relationshipChecklist;
              if (Array.isArray(parsed) && parsed.length > 0) score += 10;
            }
            if (week.careerChecklist) {
              const parsed = typeof week.careerChecklist === 'string' ? JSON.parse(week.careerChecklist) : week.careerChecklist;
              if (Array.isArray(parsed) && parsed.length > 0) score += 10;
            }
            if (week.moneyChecklist) {
              const parsed = typeof week.moneyChecklist === 'string' ? JSON.parse(week.moneyChecklist) : week.moneyChecklist;
              if (Array.isArray(parsed) && parsed.length > 0) score += 10;
            }
            if (week.unifiedAssignment) score += 10;
          } catch (e) {
            // If parsing fails, just use timestamp
            console.error('[ANALYTICS] Error scoring week:', e);
          }
          // Timestamp tiebreaker (most recent wins in case of tie)
          score += new Date(week.createdAt).getTime() / 10000000000000;
          return score;
        };
        
        // Group by week number and pick best row
        const weekMap = new Map();
        weeks.forEach((week: any) => {
          if (!weekMap.has(week.weekNumber) || scoreWeek(week) > scoreWeek(weekMap.get(week.weekNumber))) {
            weekMap.set(week.weekNumber, week);
          }
        });
        
        // Process deduplicated weeks
        const selectedWeekNumber = week ? parseInt(week as string) : null;
        
        Array.from(weekMap.values()).forEach((week: any) => {
          // If specific week requested, only process that week
          if (selectedWeekNumber && week.weekNumber !== selectedWeekNumber) {
            return; // Skip weeks that don't match selection
          }
          
          // Calculate progress for each area (same as Progress column)
          const healthProgress = calculateProgress(week.healthChecklist);
          const relationshipProgress = calculateProgress(week.relationshipChecklist);
          const careerProgress = calculateProgress(week.careerChecklist);
          const moneyProgress = calculateProgress(week.moneyChecklist);
          
          // Only add week if it has ANY checklist data (skip empty weeks)
          if (week.healthChecklist || week.relationshipChecklist || week.careerChecklist || week.moneyChecklist) {
            console.log(`[ANALYTICS] Week ${week.weekNumber} Progress - H:${healthProgress}%, R:${relationshipProgress}%, C:${careerProgress}%, M:${moneyProgress}%`);
            weeklyData.push({
              week: `W${week.weekNumber}`,
              Health: healthProgress,
              Relationship: relationshipProgress,
              Career: careerProgress,
              Money: moneyProgress,
            });
          } else {
            console.log(`[ANALYTICS] Week ${week.weekNumber} - Skipping (no data)`);
          }
        });

        console.log('[ANALYTICS] Final weeklyData:', weeklyData);
        // If specific week requested, return that week only. Otherwise return last 5 weeks
        res.json({ weeklyData: selectedWeekNumber ? weeklyData : weeklyData.slice(-5) });
      } else if (viewType === 'monthly') {
        // Use Progress column values (checklist completion %) for monthly view too
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
        
        // Calculate progress from checklist completion
        const calculateProgress = (checklistData: any) => {
          if (!checklistData) return 0;
          const checklist = typeof checklistData === 'string' ? JSON.parse(checklistData) : checklistData;
          if (!Array.isArray(checklist) || checklist.length === 0) return 0;
          const checked = checklist.filter((c: any) => c.checked).length;
          return (checked / checklist.length) * 100;
        };
        
        Array.from(monthMap.entries()).forEach(([monthKey, monthWeeks]) => {
          const [year, month] = monthKey.split('-');
          
          // Calculate average progress for each area
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
  app.get('/api/admin/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching all users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  // Admin: Search user by email
  app.get('/api/admin/search-user', isAdmin, async (req, res) => {
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
  app.get('/api/admin/search-user-by-name', isAdmin, async (req, res) => {
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

  app.get('/api/admin/user/:userId/weeks', isAdmin, async (req, res) => {
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
  app.get('/api/admin/user/:userId/analytics', isAdmin, async (req, res) => {
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
        const points = ritual.points || 10;
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
  app.get('/api/admin/user/:userId/detailed-analytics', isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get user info
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // 🔥 FIX: Get ALL HRCM weeks WITHOUT deduplication (to show first AND latest for each week)
      const weeks = await storage.getAllHercmWeeksByUserWithDates(userId);
      const sortedWeeks = weeks.sort((a, b) => a.weekNumber - b.weekNumber);
      
      console.log(`[SORTED WEEKS DEBUG] userId: ${userId}, total rows: ${sortedWeeks.length}, week numbers: ${sortedWeeks.map(w => w.weekNumber).join(', ')}, dates: ${sortedWeeks.map(w => w.dateString).join(', ')}`);
      
      // Get rituals and platinum progress
      const rituals = await storage.getRitualsByUser(userId);
      const platinumProgress = await storage.getPlatinumProgress(userId);
      
      // Calculate emotion trends - USE CURRENT WEEK RATINGS (not emotionScore fields)
      // This matches what users see in their Current Week HRCM table
      const emotionTrends = sortedWeeks.map(week => ({
        weekNumber: week.weekNumber,
        healthEmotion: week.currentH || 5,
        relationshipEmotion: week.currentE || 5,
        careerEmotion: week.currentR || 5,
        moneyEmotion: week.currentC || 5,
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
      
      // Helper to calculate checklist completion percentage
      const calculateChecklistProgress = (checklist: any[]): number => {
        if (!checklist || checklist.length === 0) return 0;
        const completed = checklist.filter((item: any) => item.checked).length;
        return Math.round((completed / checklist.length) * 100);
      };
      
      // Progress summary
      // Score Calculation: overallScore = average of (currentH + currentE + currentR + currentC) / 4
      // Achievement Rate: achievementRate = percentage of checklist completion (matches dashboard)
      
      // Find most recent week WITH checklist data (not just latest week number)
      let latestWeek = null;
      for (let i = sortedWeeks.length - 1; i >= 0; i--) {
        const week = sortedWeeks[i];
        // Check if week has checklist data
        if (week.healthChecklist || week.relationshipChecklist || week.careerChecklist || week.moneyChecklist) {
          latestWeek = week;
          break;
        }
      }
      
      console.log(`[DETAILED ANALYTICS DEBUG] userId: ${userId}, sortedWeeks.length: ${sortedWeeks.length}`);
      if (latestWeek) {
        console.log(`[DETAILED ANALYTICS DEBUG] latestWeek:`, {
          weekNumber: latestWeek.weekNumber,
          overallScore: latestWeek.overallScore,
          healthChecklist: latestWeek.healthChecklist?.length,
          relationshipChecklist: latestWeek.relationshipChecklist?.length,
          careerChecklist: latestWeek.careerChecklist?.length,
          moneyChecklist: latestWeek.moneyChecklist?.length,
        });
      }
      
      // Count only earned badges (badges with earnedAt date)
      const earnedBadges = platinumProgress?.badges?.filter((b: any) => b.earnedAt) || [];
      
      // RECALCULATE achievement from checklist completion (match User Analytics table)
      let achievementRate = 0;
      if (latestWeek) {
        const healthProgress = calculateChecklistProgress(latestWeek.healthChecklist || []);
        const relationshipProgress = calculateChecklistProgress(latestWeek.relationshipChecklist || []);
        const careerProgress = calculateChecklistProgress(latestWeek.careerChecklist || []);
        const moneyProgress = calculateChecklistProgress(latestWeek.moneyChecklist || []);
        achievementRate = Math.round((healthProgress + relationshipProgress + careerProgress + moneyProgress) / 4);
        
        console.log(`[DETAILED ANALYTICS DEBUG] Progress calculation:`, {
          healthProgress,
          relationshipProgress,
          careerProgress,
          moneyProgress,
          achievementRate
        });
      }
      
      const progressSummary = latestWeek ? {
        currentWeek: latestWeek.weekNumber,
        overallScore: latestWeek.overallScore || 0, // Average HRCM rating (out of 10)
        achievementRate, // NOW: Fresh calculated from checklists (matches table)
        currentStreak: platinumProgress?.currentStreak || 0,
        totalBadges: earnedBadges.length, // Only count earned badges
      } : null;
      
      console.log(`[DETAILED ANALYTICS DEBUG] progressSummary:`, progressSummary);
      
      // 🔥 NEW: Group by week number and return BOTH first and latest for each week
      const weeksByNumber = new Map<number, Array<typeof sortedWeeks[0]>>();
      for (const week of sortedWeeks) {
        if (!week.weekNumber) continue;
        const weekKey = week.weekNumber;
        if (!weeksByNumber.has(weekKey)) {
          weeksByNumber.set(weekKey, []);
        }
        weeksByNumber.get(weekKey)!.push(week);
      }
      
      console.log(`[COMPACT WEEKLY DEBUG] weeksByNumber size: ${weeksByNumber.size}, keys: ${Array.from(weeksByNumber.keys()).join(', ')}`);
      
      // For each week number, extract first and latest entries
      const compactWeeklyData: any[] = [];
      Array.from(weeksByNumber.entries())
        .sort(([weekA], [weekB]) => weekA - weekB) // Sort by week number
        .forEach(([weekNumber, weeks]) => {
          // 🔥 FIX: Sort by createdAt for "first", but use dateString for "latest"
          // First = earliest entry created (original data)
          // Latest = most recent date's data (could be today's update)
          const sortedByCreatedAt = [...weeks].sort((a, b) => 
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          
          const sortedByDateString = [...weeks].sort((a, b) => {
            const dateA = a.dateString || '1970-01-01';
            const dateB = b.dateString || '1970-01-01';
            return dateA.localeCompare(dateB);
          });
          
          const firstWeek = sortedByCreatedAt[0];
          const latestWeek = sortedByDateString[sortedByDateString.length - 1];
          
          // Helper function to create week data object
          const createWeekData = (week: typeof sortedWeeks[0], label: string) => {
            const healthProgress = calculateChecklistProgress(week.healthChecklist || []);
            const relationshipProgress = calculateChecklistProgress(week.relationshipChecklist || []);
            const careerProgress = calculateChecklistProgress(week.careerChecklist || []);
            const moneyProgress = calculateChecklistProgress(week.moneyChecklist || []);
            const achievement = Math.round((healthProgress + relationshipProgress + careerProgress + moneyProgress) / 4);
            
            // 🔥 FIX: Use dateString for "latest" (most recent update), createdAt for "first" (original entry)
            const displayDate = label === 'latest' && week.dateString 
              ? new Date(week.dateString + 'T00:00:00') // Convert YYYY-MM-DD to Date
              : week.createdAt;
            
            return {
              week: weekNumber,
              label, // "first" or "latest"
              date: displayDate,
              h: week.currentH || 0,
              r: week.currentE || 0,
              c: week.currentR || 0,
              m: week.currentC || 0,
              score: week.overallScore || 0,
              achievement,
            };
          };
          
          // If only one entry for this week, show it as "only"
          if (weeks.length === 1) {
            compactWeeklyData.push(createWeekData(firstWeek, 'only'));
          } else {
            // Show both first and latest
            compactWeeklyData.push(createWeekData(firstWeek, 'first'));
            compactWeeklyData.push(createWeekData(latestWeek, 'latest'));
          }
        });
      
      console.log(`[COMPACT WEEKLY DEBUG] compactWeeklyData length: ${compactWeeklyData.length}, weeks: ${compactWeeklyData.map(w => w.week).join(', ')}`);
      
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
  app.get('/api/admin/users-analytics', isAdmin, async (req, res) => {
    try {
      // Get ALL approved emails (including those who haven't logged in yet)
      const approvedEmailsList = await storage.getAllApprovedEmails();
      const activeApprovedEmails = approvedEmailsList.filter(ae => ae.status === 'active');
      
      // Get all users from users table
      const allUsers = await storage.getAllUsers();
      
      // Create a map: email -> user data (ONLY for approved emails)
      const usersByEmail = new Map<string, any>();
      
      // Start with ALL approved emails (even if they haven't logged in)
      for (const approvedEmail of activeApprovedEmails) {
        const nameParts = approvedEmail.name ? approvedEmail.name.trim().split(' ') : [];
        usersByEmail.set(approvedEmail.email, {
          id: approvedEmail.email, // Use email as ID placeholder (will be replaced if user exists)
          email: approvedEmail.email,
          firstName: nameParts[0] || '',
          lastName: nameParts.slice(1).join(' ') || '',
          isPlaceholder: true, // Mark as placeholder
        });
      }
      
      // Now, overlay user data from users table (ONLY for approved emails)
      for (const user of allUsers) {
        const emailKey = user.email || user.id;
        
        // Only process if this email is in approved list
        if (usersByEmail.has(emailKey)) {
          const existing = usersByEmail.get(emailKey);
          
          // Replace placeholder with actual user data (first match wins - avoids expensive DB queries)
          if (existing.isPlaceholder) {
            usersByEmail.set(emailKey, user);
          }
          // Skip duplicate checking - it was causing 42-second delays with thousands of DB queries
        }
      }
      
      // Helper to calculate checklist completion percentage
      const calculateChecklistProgress = (checklist: any[]): number => {
        if (!checklist || checklist.length === 0) return 0;
        const completed = checklist.filter((item: any) => item.checked).length;
        return Math.round((completed / checklist.length) * 100);
      };
      
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
        
        // RECALCULATE achievement from checklist completion (match dashboard Weekly Progress)
        let achievementRate = 0;
        if (latestWeek) {
          const healthProgress = calculateChecklistProgress(latestWeek.healthChecklist || []);
          const relationshipProgress = calculateChecklistProgress(latestWeek.relationshipChecklist || []);
          const careerProgress = calculateChecklistProgress(latestWeek.careerChecklist || []);
          const moneyProgress = calculateChecklistProgress(latestWeek.moneyChecklist || []);
          achievementRate = Math.round((healthProgress + relationshipProgress + careerProgress + moneyProgress) / 4);
        }
        
        // Calculate trend (compare last 2 weeks)
        let trend = 0;
        if (weeks.length >= 2) {
          const prevWeek = weeks[weeks.length - 2];
          const prevScore = prevWeek.overallScore || 0;
          trend = overallScore - prevScore;
        } else if (weeks.length === 1) {
          // For first week, use achievement rate as baseline trend
          // High achievement (>70%) = positive trend, Low (<50%) = negative trend
          if (achievementRate >= 70) {
            trend = 2; // Strong positive
          } else if (achievementRate >= 50) {
            trend = 1; // Moderate positive
          } else if (achievementRate >= 30) {
            trend = -1; // Moderate negative
          } else {
            trend = -2; // Strong negative
          }
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
          achievementRate, // NOW: Fresh calculated from checklists (matches dashboard 36%)
          trend, // positive = improving, negative = declining
          // Status based on Achievement Rate (Weekly Progress percentage)
          // 70%+ = excellent, 50-69% = good, <50% = needs support
          status: achievementRate >= 70 ? 'excellent' : achievementRate >= 50 ? 'good' : 'needs_support',
        });
      }
      
      res.json(analytics);
    } catch (error) {
      console.error("Error fetching users analytics:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  // Google Sheets course tracking - fetch all courses and lessons
  app.get('/api/courses/tracking', isAuthenticated, async (req, res) => {
    try {
      const sheetUrl = "https://docs.google.com/spreadsheets/d/13UN1Az5GyUPxj7tKSc26rjvPtNINMkS_C_VoYcuzDHg/edit?usp=sharing";
      const { fetchCourseTrackingData, clearCourseTrackingCache } = await import('./googleSheets');
      
      // Clear cache if requested via query param
      if (req.query.clearCache === 'true') {
        clearCourseTrackingCache();
      }
      
      const courses = await fetchCourseTrackingData(sheetUrl);
      res.json(courses);
    } catch (error) {
      console.error("Error fetching course tracking data:", error);
      res.status(500).json({ message: "Failed to fetch courses", error: error instanceof Error ? error.message : 'Unknown error' });
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
      const { email: rawEmail } = req.body;
      
      if (!rawEmail) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Normalize email to lowercase for case-insensitive matching
      const email = rawEmail.toLowerCase().trim();

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
      
      // Get name from approved emails or admin users table
      let userName = '';
      if (isAdmin && adminUser) {
        userName = adminUser.name || '';
      } else {
        const approvedEmail = await storage.getApprovedEmail(email);
        userName = approvedEmail?.name || '';
      }

      // Split name into firstName and lastName
      const nameParts = userName.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Check if user exists, create or update with name
      const existingUser = await storage.getUserByEmail(email);
      console.log(`[LOGIN] User lookup for ${email}:`, existingUser ? 'Found' : 'Not found');
      
      if (!existingUser) {
        console.log(`[LOGIN] Creating new user with id=${email}, email=${email}, name=${userName}`);
        const newUser = await storage.upsertUser({
          id: email,
          email: email,
          firstName: firstName,
          lastName: lastName,
          isAdmin: isAdmin || false,
        });
        console.log(`[LOGIN] User created:`, newUser);
      } else {
        // Update existing user with latest name from approved_emails
        console.log(`[LOGIN] Updating user ${email} with name=${userName}`);
        await storage.upsertUser({
          id: email,
          email: email,
          firstName: firstName,
          lastName: lastName,
          isAdmin: isAdmin || false,
        });
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
  app.get('/api/admin/approved-emails', isAdmin, async (req, res) => {
    try {
      const emails = await storage.getAllApprovedEmails();
      res.json(emails);
    } catch (error) {
      console.error("Error fetching approved emails:", error);
      res.status(500).json({ message: "Failed to fetch approved emails" });
    }
  });

  app.post('/api/admin/approved-emails', isAdmin, async (req, res) => {
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

  app.post('/api/admin/bulk-upload', uploadLimiter, isAdmin, async (req, res) => {
    try {
      const { entries } = req.body;
      
      if (!Array.isArray(entries) || entries.length === 0) {
        return res.status(400).json({ message: "Entries array is required" });
      }

      const results = await storage.bulkAddApprovedEmails(entries);
      res.json({ success: true, added: results.length, message: "Emails uploaded successfully" });
    } catch (error) {
      console.error("Error bulk uploading emails:", error);
      res.status(500).json({ message: "Failed to upload emails" });
    }
  });

  // Delete all emails - MUST come before /:id route
  app.delete('/api/admin/approved-emails/all', isAdmin, async (req, res) => {
    try {
      await storage.deleteAllApprovedEmails();
      res.json({ success: true, message: "All emails deleted" });
    } catch (error) {
      console.error("Error deleting all emails:", error);
      res.status(500).json({ message: "Failed to delete all emails" });
    }
  });

  app.delete('/api/admin/approved-emails/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      console.log(`[DELETE EMAIL] Starting deletion for ID: ${id}`);
      
      // First, get the email to find associated user data
      const approvedEmail = await storage.getApprovedEmailById(id);
      if (!approvedEmail) {
        console.log(`[DELETE EMAIL] Email not found for ID: ${id}`);
        return res.status(404).json({ message: "Email not found" });
      }
      
      const userEmail = approvedEmail.email;
      console.log(`[CASCADE DELETE] Removing all data for user: ${userEmail}`);
      
      // Delete all user data (CASCADE)
      await storage.deleteAllUserData(userEmail);
      console.log(`[CASCADE DELETE] User data deleted for: ${userEmail}`);
      
      // Finally, delete the approved email entry
      await storage.deleteApprovedEmail(id);
      console.log(`[CASCADE DELETE] Approved email entry deleted for: ${userEmail}`);
      
      console.log(`[CASCADE DELETE] Successfully completed deletion for: ${userEmail}`);
      res.json({ success: true, message: "Email and all associated data deleted" });
    } catch (error: any) {
      console.error("Error deleting approved email:", error);
      console.error("Error stack:", error?.stack);
      console.error("Error message:", error?.message);
      res.status(500).json({ 
        message: "Failed to delete email",
        error: error?.message || "Unknown error"
      });
    }
  });

  app.put('/api/admin/approved-emails/:id', isAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { email, name, status } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      await storage.updateApprovedEmail(id, { email, name, status });
      res.json({ success: true, message: "Email updated successfully" });
    } catch (error) {
      console.error("Error updating approved email:", error);
      res.status(500).json({ message: "Failed to update email" });
    }
  });

  app.get('/api/admin/stats', isAdmin, async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin Users (Team Management) endpoints
  app.get('/api/admin/team', isAdmin, async (req, res) => {
    try {
      const admins = await storage.getAllAdminUsers();
      res.json(admins);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch admin users" });
    }
  });

  app.post('/api/admin/team', isAdmin, async (req, res) => {
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

  app.put('/api/admin/team/:id', isAdmin, async (req, res) => {
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

  app.delete('/api/admin/team/:id', isAdmin, async (req, res) => {
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
  app.get('/api/admin/access-logs', isAdmin, async (req, res) => {
    try {
      const logs = await storage.getAllAccessLogs();
      res.json(logs);
    } catch (error) {
      console.error("Error fetching access logs:", error);
      res.status(500).json({ message: "Failed to fetch access logs" });
    }
  });

  app.delete('/api/admin/access-logs', isAdmin, async (req, res) => {
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
  app.get('/api/admin/user/:userId/dashboard', isAdmin, async (req, res) => {
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
  app.get('/api/admin/user/:userId/hercm/week/:weekNumber', isAdmin, async (req, res) => {
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

  // Admin: Get all weeks for a specific user (for calendar history)
  app.get('/api/admin/user/:userId/hercm/weeks', isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const weeks = await storage.getHercmWeeksByUser(userId);
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching admin user all HRCM weeks:", error);
      res.status(500).json({ message: "Failed to fetch weeks data" });
    }
  });

  // Admin: Get HRCM data by specific date for a user (like Emotional Tracker)
  app.get('/api/admin/user/:userId/hercm/by-date/:date', isAdmin, async (req, res) => {
    try {
      // CRITICAL: Disable ALL caching to prevent showing wrong date's data
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      
      const { userId, date: requestedDate } = req.params;
      
      console.log(`[ADMIN HERCM BY-DATE] Admin requesting data for userId: ${userId}, date: ${requestedDate}`);
      
      // Get all weeks for the specified user
      const allWeeks = await storage.getAllHercmWeeksByUserWithDates(userId);
      
      console.log(`[ADMIN HERCM BY-DATE] Found ${allWeeks?.length || 0} weeks for user ${userId}`);
      
      if (!allWeeks || allWeeks.length === 0) {
        return res.json(null);
      }
      
      // Log all week dates for debugging
      allWeeks.forEach((week: any, index: number) => {
        console.log(`[ADMIN HERCM BY-DATE] Week ${index + 1}: dateString=${week.dateString}, weekNumber=${week.weekNumber}, healthProblems=${week.healthProblems?.substring(0, 50) || 'empty'}`);
      });
      
      // EXACT DATE MATCHING ONLY (same as user route)
      const exactMatchWeeks = allWeeks.filter((week: any) => {
        const isMatch = week.dateString === requestedDate;
        console.log(`[ADMIN HERCM BY-DATE] Comparing ${week.dateString} === ${requestedDate}: ${isMatch}`);
        return isMatch;
      });
      
      console.log(`[ADMIN HERCM BY-DATE] Exact matches found: ${exactMatchWeeks.length}`);
      
      let week;
      
      if (exactMatchWeeks.length > 0) {
        // Found exact match - return most recent entry for that date
        week = exactMatchWeeks.sort((a: any, b: any) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        console.log(`[ADMIN HERCM BY-DATE] Selected week - healthProblems: ${week.healthProblems?.substring(0, 100) || 'empty'}`);
      } else {
        // No exact match - return NULL (show blank table for dates without data)
        console.log(`[ADMIN HERCM BY-DATE] No exact match for ${requestedDate}, returning null`);
        return res.json(null);
      }
      
      // Transform to beliefs format
      const beliefs = [
        {
          category: 'Health',
          currentRating: week.currentH || 0,
          targetRating: week.targetH || 0,
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
          currentRating: week.currentE || 0,
          targetRating: week.targetE || 0,
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
          currentRating: week.currentR || 0,
          targetRating: week.targetR || 0,
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
          currentRating: week.currentC || 0,
          targetRating: week.targetC || 0,
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
      
      res.json({ beliefs, createdAt: week.createdAt, weekNumber: week.weekNumber });
    } catch (error) {
      console.error("Error fetching admin user HRCM data by date:", error);
      res.status(500).json({ message: "Failed to fetch HRCM data" });
    }
  });

  // Admin: Get persistent assignments for a specific user
  app.get('/api/admin/user/:userId/persistent-assignments', isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      
      // Get all uncompleted persistent assignments for the specified user
      const assignments = await storage.getUserPersistentAssignments(userId);
      
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching admin user persistent assignments:", error);
      res.status(500).json({ message: "Failed to fetch persistent assignments" });
    }
  });

  // Get user analytics with period filter (weekly/monthly/yearly)
  app.get('/api/admin/user/:userId/analytics-period', isAdmin, async (req, res) => {
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
  app.get('/api/admin/team-analytics', isAdmin, async (req, res) => {
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
  app.get('/api/admin/recommendations', isAdmin, async (req, res) => {
    try {
      const recommendations = await storage.getAllCourseRecommendations();
      res.json(recommendations);
    } catch (error) {
      console.error("Error fetching all recommendations:", error);
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Admin course recommendations - Create recommendation
  app.post('/api/admin/recommendations', isAdmin, async (req: any, res) => {
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
      
      // Also create a persistent assignment so user can see it immediately in their dashboard
      try {
        const persistentAssignment = await storage.addPersistentAssignment({
          userId: userId,
          courseId: courseName.toLowerCase().replace(/\s+/g, '-'),
          courseName,
          hrcmArea: hrcmArea, // Include HRCM area from recommendation
          lessonName: null, // Course-level assignment, not lesson-specific
          url: null,
          completed: false,
          source: 'admin',
          recommendationId: recommendation.id,
        });
        console.log('[DEBUG] POST /api/admin/recommendations - Created persistent assignment:', persistentAssignment);
      } catch (assignmentError) {
        console.error('[DEBUG] POST /api/admin/recommendations - Failed to create persistent assignment:', assignmentError);
        // Don't fail the whole request if assignment creation fails
      }
      
      res.json(recommendation);
    } catch (error) {
      console.error("Error adding course recommendation:", error);
      res.status(500).json({ message: "Failed to add course recommendation" });
    }
  });

  // Admin delete ALL course recommendations
  app.delete('/api/admin/recommendations/all', isAdmin, async (req: any, res) => {
    try {
      // First get all recommendations to find related persistent assignments
      const recommendations = await storage.getAllCourseRecommendations();
      
      // Delete all related persistent assignments
      for (const recommendation of recommendations) {
        try {
          const assignments = await storage.getUserPersistentAssignments(recommendation.userId);
          const relatedAssignment = assignments.find((a: any) => 
            a.source === 'admin' &&
            (a.recommendationId === recommendation.id || a.courseName === recommendation.courseName)
          );
          
          if (relatedAssignment) {
            console.log('[DEBUG] Deleting related persistent assignment for:', recommendation.courseName);
            await storage.deletePersistentAssignment(relatedAssignment.id, recommendation.userId);
          }
        } catch (error) {
          console.error('[DEBUG] Failed to delete related assignment:', error);
          // Continue with other deletions even if one fails
        }
      }
      
      // Delete all recommendations
      await storage.deleteAllRecommendations();
      res.json({ message: "All recommendations and related assignments deleted successfully" });
    } catch (error) {
      console.error("Error deleting all recommendations:", error);
      res.status(500).json({ message: "Failed to delete all recommendations" });
    }
  });

  // Admin delete course recommendation
  app.delete('/api/admin/recommendations/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      // First, get the recommendation details to find related persistent assignment
      const recommendations = await storage.getAllCourseRecommendations();
      const recommendation = recommendations.find((r: any) => r.id === id);
      
      if (recommendation) {
        // Find and delete the related persistent assignment
        const assignments = await storage.getUserPersistentAssignments(recommendation.userId);
        const relatedAssignment = assignments.find((a: any) => 
          a.source === 'admin' &&
          (a.recommendationId === recommendation.id || a.courseName === recommendation.courseName)
        );
        
        if (relatedAssignment) {
          console.log('[DEBUG] Deleting related persistent assignment:', relatedAssignment.id);
          await storage.deletePersistentAssignment(relatedAssignment.id, recommendation.userId);
        }
        
        // Send real-time notification to user about deletion
        console.log('[WebSocket] Sending deletion notification to user:', recommendation.userId);
        notifyUser(recommendation.userId, 'course_recommendation_deleted', {
          courseName: recommendation.courseName,
          hrcmArea: recommendation.hrcmArea,
          message: `Course recommendation removed: ${recommendation.courseName}`,
        });
      } else {
        console.warn('[WebSocket] Recommendation not found for deletion notification');
      }
      
      // Delete the recommendation
      await storage.deleteRecommendation(id);
      res.json({ message: "Recommendation and related assignment deleted successfully" });
    } catch (error) {
      console.error("Error deleting recommendation:", error);
      res.status(500).json({ message: "Failed to delete recommendation" });
    }
  });

  // Admin add course recommendation to user
  app.post('/api/admin/recommend-course', isAdmin, async (req: any, res) => {
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

      // Send real-time notification to user
      notifyUser(userId, 'course_recommended', {
        recommendation,
        message: `New course recommended: ${courseName}`,
      });

      res.json(recommendation);
    } catch (error) {
      console.error("Error adding course recommendation:", error);
      res.status(500).json({ message: "Failed to add course recommendation" });
    }
  });

  // Get user's recommendations
  app.get('/api/admin/user/:userId/recommendations', isAdmin, async (req, res) => {
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
  app.put('/api/admin/recommendation/:id/status', async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      
      console.log('[REALTIME DEBUG] PUT /api/admin/recommendation/:id/status called:', { id, status });
      
      // Allow pending, accepted, rejected, and completed statuses
      if (!['pending', 'accepted', 'rejected', 'completed'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const recommendation = await storage.updateRecommendationStatus(id, status);
      
      console.log('[REALTIME DEBUG] Recommendation after update:', {
        id: recommendation.id,
        status: recommendation.status,
        adminId: recommendation.adminId,
        userId: recommendation.userId,
        courseName: recommendation.courseName
      });
      
      // Send real-time notification to admin about status change
      if (recommendation.adminId) {
        console.log('[REALTIME DEBUG] About to send WebSocket to admin:', recommendation.adminId);
        
        const wsPayload = {
          recommendationId: id,
          courseName: recommendation.courseName,
          status: status,
          userId: recommendation.userId,
          message: `User ${status} course: ${recommendation.courseName}`,
        };
        
        console.log('[REALTIME DEBUG] WebSocket payload:', wsPayload);
        
        notifyUser(recommendation.adminId, 'recommendation_status_changed', wsPayload);
        
        console.log('[REALTIME DEBUG] WebSocket notification sent successfully!');
      } else {
        console.warn('[REALTIME DEBUG] ERROR: No adminId found in recommendation!', recommendation);
      }
      
      res.json(recommendation);
    } catch (error) {
      console.error("[REALTIME DEBUG] Error updating recommendation status:", error);
      res.status(500).json({ message: "Failed to update recommendation status" });
    }
  });

  // ===== PLATINUM STANDARDS ROUTES (Admin) =====
  
  // Get all platinum standards (admin view)
  app.get('/api/admin/platinum-standards', isAdmin, async (req, res) => {
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
      // PERMANENT FIX: Disable HTTP caching for instant admin updates
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Surrogate-Control': 'no-store'
      });
      
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
  app.post('/api/admin/platinum-standards', isAdmin, async (req: any, res) => {
    try {

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
  app.put('/api/admin/platinum-standards/:id', isAdmin, async (req: any, res) => {
    try {

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
  app.delete('/api/admin/platinum-standards/:id', isAdmin, async (req: any, res) => {
    try {

      const { id } = req.params;
      await storage.deletePlatinumStandard(id);
      res.json({ message: "Platinum standard deleted successfully" });
    } catch (error) {
      console.error("Error deleting platinum standard:", error);
      res.status(500).json({ message: "Failed to delete platinum standard" });
    }
  });

  // Reorder platinum standards (admin only)
  app.put('/api/admin/platinum-standards/reorder', isAdmin, async (req: any, res) => {
    try {

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
      
      // INSTANT UPDATE FIX: Disable HTTP caching to ensure admin recommendations appear immediately
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
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
      const updatedRecommendation = await storage.updateRecommendationStatus(id, 'accepted');

      // NOTE: Assignment is already created when admin makes the recommendation
      // We don't need to create it again here - just update the status
      // This prevents duplicate assignments from being created

      console.log('[REALTIME DEBUG] POST /api/user/recommendations/:id/accept - Status updated to accepted');
      console.log('[REALTIME DEBUG] Recommendation after update:', {
        id: updatedRecommendation.id,
        status: updatedRecommendation.status,
        adminId: updatedRecommendation.adminId,
        userId: updatedRecommendation.userId,
        courseName: updatedRecommendation.courseName
      });

      // Send real-time notification to admin about status change
      if (updatedRecommendation.adminId) {
        console.log('[REALTIME DEBUG] About to send WebSocket to admin:', updatedRecommendation.adminId);
        
        const wsPayload = {
          recommendationId: id,
          courseName: updatedRecommendation.courseName,
          status: 'accepted',
          userId: updatedRecommendation.userId,
          message: `User accepted course: ${updatedRecommendation.courseName}`,
        };
        
        console.log('[REALTIME DEBUG] WebSocket payload:', wsPayload);
        
        notifyUser(updatedRecommendation.adminId, 'recommendation_status_changed', wsPayload);
        
        console.log('[REALTIME DEBUG] WebSocket notification sent successfully!');
      } else {
        console.warn('[REALTIME DEBUG] ERROR: No adminId found in recommendation!', updatedRecommendation);
      }

      res.json({ 
        message: "Recommendation accepted", 
        recommendation: updatedRecommendation
      });
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

      // Update status to rejected (dismissed = rejected)
      const updatedRecommendation = await storage.updateRecommendationStatus(id, 'rejected');

      console.log('[REALTIME DEBUG] POST /api/user/recommendations/:id/dismiss - Status updated to rejected');
      
      // Send real-time notification to admin about status change
      if (updatedRecommendation.adminId) {
        console.log('[REALTIME DEBUG] Sending WebSocket to admin:', updatedRecommendation.adminId);
        
        notifyUser(updatedRecommendation.adminId, 'recommendation_status_changed', {
          recommendationId: id,
          courseName: updatedRecommendation.courseName,
          status: 'rejected',
          userId: updatedRecommendation.userId,
          message: `User rejected course: ${updatedRecommendation.courseName}`,
        });
        
        console.log('[REALTIME DEBUG] WebSocket notification sent successfully!');
      }

      res.json({ message: "Recommendation dismissed", recommendation: updatedRecommendation });
    } catch (error) {
      console.error("Error dismissing recommendation:", error);
      res.status(500).json({ message: "Failed to dismiss recommendation" });
    }
  });

  // Admin: Sync accepted recommendations to unifiedAssignment (one-time migration)
  app.post('/api/admin/sync-recommendations', isAdmin, async (req: any, res) => {
    try {
      const adminEmail = req.user?.claims?.sub || req.session.userEmail;
      const admin = await storage.getUserByEmail(adminEmail);
      
      if (!admin?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const allUsers = await storage.getAllUsers();
      let syncedCount = 0;
      const results: any[] = [];

      for (const user of allUsers) {
        // Get all accepted recommendations for this user
        const recommendations = await storage.getUserRecommendations(user.id);
        const acceptedRecs = recommendations.filter((r: any) => r.status === 'accepted');

        if (acceptedRecs.length === 0) continue;

        // Get current week (week 1) for this user
        let weeks = await storage.getHercmWeeksByUser(user.id);
        let currentWeek = weeks.find((w: any) => w.weekNumber === 1);

        // If week doesn't exist, create it
        if (!currentWeek) {
          currentWeek = await storage.createHercmWeek({
            userId: user.id,
            weekNumber: 1,
            year: new Date().getFullYear(),
            weekStatus: 'active',
          });
        }

        // Build unified assignment from accepted recommendations
        const currentUnifiedAssignment = (currentWeek as any).unifiedAssignment || [];
        const existingIds = new Set(currentUnifiedAssignment.map((item: any) => item.id));
        
        const newItems = acceptedRecs
          .filter((rec: any) => !existingIds.has(rec.lessonId || rec.courseId))
          .map((rec: any) => ({
            id: rec.lessonId || rec.courseId,
            courseId: rec.courseId,
            courseName: rec.courseName,
            lessonName: rec.lessonName || rec.courseName,
            url: rec.lessonUrl || '',
            completed: false,
            source: 'admin' as const,
            recommendationId: rec.id,
          }));

        if (newItems.length > 0) {
          const updatedUnifiedAssignment = [...currentUnifiedAssignment, ...newItems];
          await storage.updateHercmWeek(currentWeek.id, {
            unifiedAssignment: updatedUnifiedAssignment
          });
          
          syncedCount += newItems.length;
          results.push({
            userId: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            syncedItems: newItems.length
          });
        }
      }

      res.json({ 
        message: `Successfully synced ${syncedCount} accepted recommendations to unifiedAssignment`,
        totalUsers: results.length,
        results
      });
    } catch (error) {
      console.error("Error syncing recommendations:", error);
      res.status(500).json({ message: "Failed to sync recommendations" });
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
          points: 10,
          isDefault: true,
        },
        {
          title: "Attend Morning Fitness Everyday",
          description: "Morning fitness routine",
          category: "Health",
          frequency: "daily",
          points: 10,
          isDefault: true,
        },
        {
          title: "Attend Platinum Live Support Calls",
          description: "Join support sessions",
          category: "Career",
          frequency: "daily",
          points: 10,
          isDefault: true,
        },
        {
          title: "Joined Magic of 6",
          description: "Magic of 6 practice",
          category: "Career",
          frequency: "daily",
          points: 10,
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
  // Get all ritual completions for user (for history navigation)
  app.get('/api/ritual-completions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const completions = await storage.getAllRitualCompletions(userId);
      res.json(completions);
    } catch (error) {
      console.error("Error fetching all ritual completions:", error);
      res.status(500).json({ message: "Failed to fetch all ritual completions" });
    }
  });

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
      
      // Calculate ALL-TIME TOTAL points for each approved user (same as header)
      const leaderboardData = await Promise.all(
        approvedUsers.map(async (user) => {
          const userRituals = await storage.getRitualsByUser(user.id);
          const allRitualCompletions = await storage.getAllRitualCompletions(user.id);
          
          // Calculate total ritual points from ALL completions (not just weekly)
          const ritualPoints = allRitualCompletions.reduce((sum, completion) => {
            const ritual = userRituals.find(r => r.id === completion.ritualId);
            if (!ritual || !ritual.isActive) return sum;
            
            // Use custom points from database, fallback to 10 if not set
            const points = ritual.points || 10;
            return sum + points;
          }, 0);
          
          // Get all course lesson completions for this user (each lesson = 10 points)
          const lessonCompletions = await storage.getAllCourseVideoCompletions(user.id);
          const lessonPoints = lessonCompletions.length * 10;
          
          // Total all-time points = ritual points + lesson points (same as header)
          const points = ritualPoints + lessonPoints;
          
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

  // Get user's all-time cumulative points (all ritual completions + all course lessons)
  app.get('/api/user/total-points', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get ALL ritual completions (not just current week)
      const userRituals = await storage.getRitualsByUser(userId);
      const allRitualCompletions = await storage.getAllRitualCompletions(userId);
      
      // Calculate total ritual points from ALL completions
      const ritualPoints = allRitualCompletions.reduce((sum: number, completion: RitualCompletion) => {
        const ritual = userRituals.find(r => r.id === completion.ritualId);
        if (!ritual || !ritual.isActive) return sum;
        const points = ritual.points || 10;
        return sum + points;
      }, 0);
      
      // Get all course lesson completions (each lesson = 10 points)
      const lessonCompletions = await storage.getAllCourseVideoCompletions(userId);
      const lessonPoints = lessonCompletions.length * 10;
      
      // Total all-time points
      const totalPoints = ritualPoints + lessonPoints;
      
      res.json({ 
        totalPoints,
        ritualPoints,
        lessonPoints,
        ritualCount: allRitualCompletions.length,
        lessonCount: lessonCompletions.length
      });
    } catch (error) {
      console.error("Error fetching total points:", error);
      res.status(500).json({ message: "Failed to fetch total points" });
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
      
      const { videoId, courseId, courseName, lessonName, lessonUrl, completed, weekNumber } = req.body;
      if (!videoId || !courseId) {
        return res.status(400).json({ message: "videoId and courseId are required" });
      }
      
      // Toggle the completion (no need to verify course as courses are frontend-only)
      const result = await storage.toggleVideoCompletion(userId, videoId);
      
      // Get completed count for this course
      const completedVideos = await storage.getCourseVideoCompletions(userId, courseId);
      
      // ALSO update unifiedAssignment if lesson details provided
      if (weekNumber && courseName && lessonName) {
        const weeks = await storage.getHercmWeeksByUser(userId);
        const week = weeks.find((w: any) => w.weekNumber === weekNumber);
        
        if (week) {
          const currentAssignment = (week.unifiedAssignment as any) || [];
          const lessonId = videoId; // Use videoId as unique lesson ID
          
          if (completed) {
            // ADD lesson to unifiedAssignment (if not already present)
            const lessonExists = currentAssignment.some((item: any) => item.id === lessonId);
            if (!lessonExists) {
              const newLesson = {
                id: lessonId,
                courseId,
                courseName,
                lessonName,
                url: lessonUrl || '',
                completed: false, // Start as unchecked in Assignment column
                source: 'user', // User-selected lesson (cyan color)
              };
              const updatedAssignment = [...currentAssignment, newLesson];
              await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });
              console.log(`[COURSE] Added "${lessonName}" to Assignment column for Week ${weekNumber}`);
            }
          } else {
            // REMOVE lesson from unifiedAssignment
            const updatedAssignment = currentAssignment.filter((item: any) => item.id !== lessonId);
            await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });
            console.log(`[COURSE] Removed "${lessonName}" from Assignment column for Week ${weekNumber}`);
          }
        }
      }
      
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

  // Sync existing checked lessons to Assignment column (one-time migration)
  app.post('/api/course-video-completions/sync-to-assignment', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }
      
      const { coursesData, weekNumber } = req.body;
      if (!coursesData || !weekNumber) {
        return res.status(400).json({ message: "coursesData and weekNumber required" });
      }
      
      // Get current week
      const weeks = await storage.getHercmWeeksByUser(userId);
      const week = weeks.find((w: any) => w.weekNumber === weekNumber);
      
      if (!week) {
        return res.status(404).json({ message: "Week not found" });
      }
      
      // Get all video completions for this user
      const allCompletions: Record<string, any[]> = {};
      for (const course of coursesData) {
        const completions = await storage.getCourseVideoCompletions(userId, course.id);
        allCompletions[course.id] = completions;
      }
      
      // Build lessons to add to unifiedAssignment
      const lessonsToAdd: any[] = [];
      for (const course of coursesData) {
        const courseCompletions = allCompletions[course.id] || [];
        
        for (const completion of courseCompletions) {
          const videoId = completion.videoId;
          const moduleId = videoId.replace(`${course.id}-`, '');
          const lesson = course.lessons?.find((l: any) => l.id === moduleId);
          
          if (lesson) {
            lessonsToAdd.push({
              id: videoId,
              courseId: course.id,
              courseName: course.title,
              lessonName: lesson.title,
              url: lesson.url || '',
              completed: false, // Start as unchecked in Assignment column
              source: 'user', // User-selected lesson
            });
          }
        }
      }
      
      // Add to unifiedAssignment (avoid duplicates)
      const currentAssignment = (week.unifiedAssignment as any) || [];
      const existingIds = new Set(currentAssignment.map((item: any) => item.id));
      const newLessons = lessonsToAdd.filter(lesson => !existingIds.has(lesson.id));
      
      if (newLessons.length > 0) {
        const updatedAssignment = [...currentAssignment, ...newLessons];
        await storage.updateHercmWeek(week.id, { unifiedAssignment: updatedAssignment });
        console.log(`[SYNC] Added ${newLessons.length} lessons to Assignment column for Week ${weekNumber}`);
      }
      
      res.json({ 
        success: true, 
        addedCount: newLessons.length,
        totalLessons: lessonsToAdd.length
      });
    } catch (error) {
      console.error("Error syncing lessons to assignment:", error);
      res.status(500).json({ message: "Failed to sync lessons" });
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

  // Emotional Tracker endpoints
  app.get('/api/emotional-trackers/:date', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      const { date } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const trackers = await storage.getEmotionalTrackersByDate(userId, date);
      res.json(trackers);
    } catch (error) {
      console.error("Error fetching emotional trackers:", error);
      res.status(500).json({ message: "Failed to fetch emotional trackers" });
    }
  });

  app.post('/api/emotional-trackers', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const tracker = await storage.upsertEmotionalTracker({
        ...req.body,
        userId,
      });
      
      res.json(tracker);
    } catch (error) {
      console.error("Error upserting emotional tracker:", error);
      res.status(500).json({ message: "Failed to save emotional tracker" });
    }
  });

  app.delete('/api/emotional-trackers/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      await storage.deleteEmotionalTracker(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting emotional tracker:", error);
      res.status(500).json({ message: "Failed to delete emotional tracker" });
    }
  });

  // Admin: Get emotional trackers for any user
  app.get('/api/admin/emotional-trackers/:userId/:date', isAdmin, async (req: any, res) => {
    try {

      const { userId, date } = req.params;
      
      const trackers = await storage.getEmotionalTrackersByDate(userId, date);
      res.json(trackers);
    } catch (error) {
      console.error("Error fetching emotional trackers for admin:", error);
      res.status(500).json({ message: "Failed to fetch emotional trackers" });
    }
  });

  // ========== User Persistent Assignments Routes ==========
  // Get user's persistent assignments (date-independent)
  app.get('/api/persistent-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // INSTANT UPDATE FIX: Disable HTTP caching to ensure admin changes appear immediately
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      const assignments = await storage.getUserPersistentAssignments(userId);
      res.json(assignments);
    } catch (error) {
      console.error("Error fetching persistent assignments:", error);
      res.status(500).json({ message: "Failed to fetch persistent assignments" });
    }
  });

  // Add new persistent assignment
  app.post('/api/persistent-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const assignmentData = {
        ...req.body,
        userId,
        completed: req.body.completed !== undefined ? req.body.completed : false
      };

      const newAssignment = await storage.addPersistentAssignment(assignmentData);
      res.json(newAssignment);
    } catch (error) {
      console.error("Error adding persistent assignment:", error);
      res.status(500).json({ message: "Failed to add persistent assignment" });
    }
  });

  // Toggle assignment completion
  app.put('/api/persistent-assignments/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const updated = await storage.togglePersistentAssignmentCompletion(id, userId);
      res.json(updated);
    } catch (error) {
      console.error("Error toggling assignment completion:", error);
      res.status(500).json({ message: "Failed to toggle assignment completion" });
    }
  });

  // Delete single assignment
  app.delete('/api/persistent-assignments/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      const { id } = req.params;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      await storage.deletePersistentAssignment(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting persistent assignment:", error);
      res.status(500).json({ message: "Failed to delete persistent assignment" });
    }
  });

  // Delete all completed assignments
  app.delete('/api/persistent-assignments/completed', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      await storage.deleteCompletedAssignments(userId);
      res.json({ success: true, message: "All completed assignments deleted" });
    } catch (error) {
      console.error("Error deleting completed assignments:", error);
      res.status(500).json({ message: "Failed to delete completed assignments" });
    }
  });

  // One-time migration endpoint: Migrate old unified_assignment data to persistent assignments
  app.post('/api/migrate-assignments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Get user's latest HRCM week with unified_assignment data
      const weeks = await storage.getHercmWeeksByUser(userId);
      
      if (!weeks || weeks.length === 0) {
        return res.json({ success: true, migratedCount: 0, message: "No week data found to migrate" });
      }

      // Find most recent week with unified_assignment data
      const weekWithAssignments = weeks
        .filter((w: any) => w.unifiedAssignment && Array.isArray(w.unifiedAssignment) && w.unifiedAssignment.length > 0)
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];

      if (!weekWithAssignments) {
        return res.json({ success: true, migratedCount: 0, message: "No assignments found to migrate" });
      }

      const oldAssignments = weekWithAssignments.unifiedAssignment || [];
      
      // Check existing persistent assignments to avoid duplicates
      const existingAssignments = await storage.getUserPersistentAssignments(userId);
      const existingLessonIds = new Set(existingAssignments.map((a: any) => a.lessonId || a.id));

      let migratedCount = 0;

      // Migrate each assignment that doesn't already exist
      for (const assignment of oldAssignments) {
        // Skip if already migrated
        if (existingLessonIds.has(assignment.id)) {
          continue;
        }

        // Determine hrcmArea based on course name or default to 'health'
        let hrcmArea = 'health';
        const courseLower = (assignment.courseName || '').toLowerCase();
        if (courseLower.includes('relationship') || courseLower.includes('communication')) {
          hrcmArea = 'relationship';
        } else if (courseLower.includes('career') || courseLower.includes('business')) {
          hrcmArea = 'career';
        } else if (courseLower.includes('money') || courseLower.includes('wealth') || courseLower.includes('financial')) {
          hrcmArea = 'money';
        }

        // Create persistent assignment
        await storage.addPersistentAssignment({
          userId,
          hrcmArea,
          courseId: assignment.courseId || '',
          courseName: assignment.courseName || '',
          lessonId: assignment.id || '',
          lessonName: assignment.lessonName || '',
          url: assignment.url || '',
          source: assignment.source || 'user',
          completed: assignment.completed || false,
          recommendationId: assignment.recommendationId || null
        });

        migratedCount++;
      }

      res.json({ 
        success: true, 
        migratedCount, 
        message: `Successfully migrated ${migratedCount} assignments to persistent storage` 
      });
    } catch (error) {
      console.error("Error migrating assignments:", error);
      res.status(500).json({ message: "Failed to migrate assignments" });
    }
  });

  // ==========================================
  // DATABASE HEALTH CHECK (Public)
  // ==========================================

  // Database health check endpoint - helps detect crashes
  app.get('/api/health/database', async (req, res) => {
    try {
      const startTime = Date.now();
      
      // Try a simple query to verify database connectivity
      await storage.getAllApprovedEmails();
      
      const responseTime = Date.now() - startTime;
      
      res.json({
        status: 'healthy',
        database: 'connected',
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
        message: 'Replit database is operational'
      });
    } catch (error) {
      console.error("[HEALTH CHECK] Database error:", error);
      res.status(503).json({
        status: 'unhealthy',
        database: 'disconnected',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
        message: '🚨 DATABASE CRASH DETECTED! Consider switching to Supabase backup.'
      });
    }
  });

  // Supabase backup database health check endpoint
  app.get('/api/health/supabase', async (req, res) => {
    try {
      const healthStatus = await checkSupabaseHealth();
      
      if (healthStatus.status === 'healthy') {
        res.json(healthStatus);
      } else if (healthStatus.status === 'unconfigured') {
        res.status(503).json(healthStatus);
      } else {
        res.status(503).json(healthStatus);
      }
    } catch (error) {
      console.error("[SUPABASE HEALTH] Error:", error);
      res.status(500).json({
        status: 'error',
        message: 'Failed to check Supabase health',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ==========================================
  // SUPABASE BACKUP ROUTES (Admin Only)
  // ==========================================

  // Get backup configuration status
  app.get('/api/backup/status', isAuthenticated, isAdmin, async (req, res) => {
    try {
      res.json({
        configured: isSupabaseConfigured,
        message: isSupabaseConfigured 
          ? 'Supabase backup is configured and ready' 
          : 'Supabase credentials not found. Add SUPABASE_URL and SUPABASE_ANON_KEY to enable backup.'
      });
    } catch (error) {
      console.error("Error checking backup status:", error);
      res.status(500).json({ message: "Failed to check backup status" });
    }
  });

  // Get backup statistics
  app.get('/api/backup/stats', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const result = await getBackupStats();
      res.json(result);
    } catch (error) {
      console.error("Error fetching backup stats:", error);
      res.status(500).json({ message: "Failed to fetch backup stats" });
    }
  });

  // Manual full backup - all users and data
  app.post('/api/backup/full', isAuthenticated, isAdmin, async (req, res) => {
    try {
      console.log('[BACKUP] Starting full backup to Supabase...');
      const result = await backupAllData();
      console.log('[BACKUP] Full backup completed:', result);
      res.json(result);
    } catch (error) {
      console.error("Error during full backup:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to complete backup",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Backup specific user data
  app.post('/api/backup/user/:userId', isAuthenticated, isAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      console.log(`[BACKUP] Starting backup for user ${userId}...`);
      const result = await backupUserData(userId);
      console.log(`[BACKUP] User backup completed:`, result);
      res.json(result);
    } catch (error) {
      console.error("Error during user backup:", error);
      res.status(500).json({ 
        success: false,
        message: "Failed to backup user data",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // ========== User Feedback Routes ==========
  // Submit user feedback
  app.post('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const feedbackData = {
        ...req.body,
        userId,
      };

      const newFeedback = await storage.createFeedback(feedbackData);
      res.json(newFeedback);
    } catch (error) {
      console.error("Error creating feedback:", error);
      res.status(500).json({ message: "Failed to submit feedback" });
    }
  });

  // Get user's own feedback
  app.get('/api/feedback', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub || req.session.userEmail;
      
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const feedback = await storage.getUserFeedback(userId);
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching user feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Admin: Get all feedback
  app.get('/api/admin/feedback', isAdmin, async (req: any, res) => {
    try {
      const feedback = await storage.getAllFeedback();
      res.json(feedback);
    } catch (error) {
      console.error("Error fetching all feedback:", error);
      res.status(500).json({ message: "Failed to fetch feedback" });
    }
  });

  // Admin: Update feedback status
  app.patch('/api/admin/feedback/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, adminResponse } = req.body;

      const updated = await storage.updateFeedbackStatus(id, status, adminResponse);
      res.json(updated);
    } catch (error) {
      console.error("Error updating feedback status:", error);
      res.status(500).json({ message: "Failed to update feedback" });
    }
  });

  // Admin: Clear all feedback (must be before :id route)
  app.delete('/api/admin/feedback/clear-all', isAdmin, async (req: any, res) => {
    try {
      await storage.clearAllFeedback();
      res.json({ success: true, message: "All feedback cleared successfully" });
    } catch (error) {
      console.error("Error clearing all feedback:", error);
      res.status(500).json({ message: "Failed to clear all feedback" });
    }
  });

  // Admin: Delete feedback
  app.delete('/api/admin/feedback/:id', isAdmin, async (req: any, res) => {
    try {
      const { id } = req.params;
      await storage.deleteFeedback(id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting feedback:", error);
      res.status(500).json({ message: "Failed to delete feedback" });
    }
  });

  const httpServer = createServer(app);
  
  // Setup WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  wss.on('connection', (ws: WebSocket, req) => {
    console.log('[WebSocket] New client connected');
    
    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Register client with userId
        if (data.type === 'register' && data.userId) {
          wsClients.set(data.userId, ws);
          console.log(`[WebSocket] Client registered: ${data.userId}`);
          ws.send(JSON.stringify({ type: 'registered', userId: data.userId }));
        }
      } catch (error) {
        console.error('[WebSocket] Error parsing message:', error);
      }
    });
    
    ws.on('close', () => {
      // Remove client from map
      for (const [userId, client] of Array.from(wsClients.entries())) {
        if (client === ws) {
          wsClients.delete(userId);
          console.log(`[WebSocket] Client disconnected: ${userId}`);
          break;
        }
      }
    });
    
    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
    });
  });
  
  console.log('[WebSocket] Server initialized');
  
  return httpServer;
}

// Helper function to send real-time notifications to specific user
export function notifyUser(userId: string, event: string, data: any) {
  const client = wsClients.get(userId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify({ type: event, data }));
    console.log(`[WebSocket] Sent ${event} to user ${userId}`);
    return true;
  }
  return false;
}
