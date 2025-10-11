// Server routes with Replit Auth integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";
import { fetchCourseData, findMatchingCourse, recommendCourses } from "./googleSheets";
import { recommendCoursesRequestSchema } from "@shared/schema";

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

  // Enhanced course recommendations based on HERCM data
  app.post('/api/courses/recommend', isAuthenticated, async (req: any, res) => {
    try {
      // Validate request
      const validatedData = recommendCoursesRequestSchema.parse(req.body);
      
      // Get user's sheet URL or use default
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      const sheetUrl = user?.courseSheetUrl || "https://docs.google.com/spreadsheets/d/1pZaS2wnzwgk6VqB7KvchX2bfCmucvrhTf3Q6qAJG7Cw/edit?gid=314426355#gid=314426355";
      
      // Get recommendations
      const recommendations = await recommendCourses(sheetUrl, {
        category: validatedData.category,
        problems: validatedData.problems,
        feelings: validatedData.feelings,
        beliefs: validatedData.beliefs,
        actions: validatedData.actions,
      });
      
      res.json(recommendations);
    } catch (error) {
      console.error("Error recommending courses:", error);
      res.status(500).json({ message: "Failed to recommend courses", error: error instanceof Error ? error.message : 'Unknown error' });
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

  const httpServer = createServer(app);
  return httpServer;
}
