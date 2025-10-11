// Server routes with Replit Auth integration
import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { fetchCourseData, findMatchingCourse, recommendCourses, fetchEnhancedCourseData } from "./googleSheets";
import { recommendCoursesRequestSchema } from "@shared/schema";
import { getAIRecommendations } from "./aiRecommendations";
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
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // User HERCM routes (protected)
  app.get('/api/hercm/weeks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const weeks = await storage.getHercmWeeksByUser(userId);
      res.json(weeks);
    } catch (error) {
      console.error("Error fetching HERCM weeks:", error);
      res.status(500).json({ message: "Failed to fetch weeks" });
    }
  });

  app.post('/api/hercm/weeks', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const weekData = { ...req.body, userId };
      
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
      
      const week = await storage.createHercmWeek(weekData);
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
      const userId = req.user.claims.sub;
      
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

  // Platinum Progress routes
  app.get('/api/platinum/progress', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const progress = await storage.getPlatinumProgress(userId);
      res.json(progress || { userId, currentStreak: 0, totalPoints: 0, badges: [] });
    } catch (error) {
      console.error("Error fetching platinum progress:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
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
      
      // Get user's sheet URL or use default
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const sheetUrl = user?.courseSheetUrl || "https://docs.google.com/spreadsheets/d/1pZaS2wnzwgk6VqB7KvchX2bfCmucvrhTf3Q6qAJG7Cw/edit?gid=314426355#gid=314426355";
      
      // Fetch courses from Google Sheets
      const courses = await fetchEnhancedCourseData(sheetUrl);
      
      // Get AI-powered recommendations
      const recommendations = await getAIRecommendations(courses, {
        category: validatedData.category,
        rating: validatedData.currentRating,
        problems: validatedData.problems,
        feelings: validatedData.feelings,
        beliefs: validatedData.beliefs,
        actions: validatedData.actions,
      }, 3);
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error recommending courses:", error);
      res.status(500).json({ message: "Failed to recommend courses", error: error instanceof Error ? error.message : 'Unknown error' });
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

      const completion = await openai.chat.completions.create({
        model: "gpt-5-mini",
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

  // Update user's Google Sheet URL
  app.post('/api/user/course-sheet', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      // Check admin users table
      const adminUser = await storage.getAdminUser(email);
      
      if (!adminUser || adminUser.status !== 'active') {
        return res.status(403).json({ message: "You are not authorized as admin" });
      }

      req.session.userEmail = email;
      req.session.isAdmin = true;
      
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

  const httpServer = createServer(app);
  return httpServer;
}
