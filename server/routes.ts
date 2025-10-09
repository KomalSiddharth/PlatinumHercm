// Server routes with Replit Auth integration
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, isAdmin } from "./replitAuth";

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

  const httpServer = createServer(app);
  return httpServer;
}
