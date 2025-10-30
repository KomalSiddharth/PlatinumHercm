# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to track and enhance personal development across Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking, daily ritual monitoring, and course progress into a single system, motivating users with features like a "Platinum Streak," real-time feedback, leaderboards, and a progression system. The dashboard leverages AI for course recommendations and automated suggestions to address personal challenges, providing a structured and engaging path to personal growth and self-improvement. The project aims to empower users to achieve personal goals through a gamified and data-driven approach.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard features a clean, responsive "New York" style design using shadcn/ui components and the Inter font, with support for both light and dark modes. The primary color is Teal, and the accent is Coral. It includes optimized layouts, a standards-based HRCM rating system scaled out of 10, and a consistent color palette for HRCM cards (Health: Green, Relationship: Purple, Career: Blue, Money: Purple). The application is built with a mobile-first approach, ensuring optimal user experience across various devices through responsive design and touch-friendly interactive elements.

### Technical Implementations
The frontend is built with React, Vite, Tailwind CSS, TanStack Query, and Wouter for routing. The backend uses Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM, and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` and implements role-based access control. Data persistence is managed via Drizzle ORM with an `IStorage` interface, Zod validation, and Drizzle Kit for migrations. The system employs UPSERT logic for saving checkbox states and a deduplication scoring mechanism for weekly data. Platinum Standards and Google Sheets-powered course tracking integrate real-time data synchronization. The system also automatically merges all Daily Magic Practice (DMP) recording lessons into a single course using an advanced merge strategy.

**Disaster Recovery & Backup System (Updated: Oct 30, 2025):**
- **Primary Database**: Replit PostgreSQL (production data)
- **External Backup**: Supabase PostgreSQL (automated backups)
- **Backup Frequency**: Every 1 MINUTE + daily full backup at 2 AM (1441 backups/day!)
- **Health Monitoring**: Automatic database health checks every 30 seconds
- **Failover Detection**: Alert triggered after 3 consecutive failures
- **Maximum Data Loss**: Only 1 MINUTE!
- **Recovery Time**: 5-60 minutes (depending on method)
- **Production Data**: Cleaned and optimized (test users removed, 12 real users)
- **Coverage**: 14 critical tables backed up automatically
- **Manual Control**: Admin can trigger backups and monitor health via API endpoints
- **Supabase Tier**: FREE (suitable for <500 users), upgrade to PRO ($25-35/month) for 30K users

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking, comprehensive course progress monitoring with persistent lesson checkboxes, and a Daily Emotional Tracker across 9 time slots. Includes calendar date navigation with exact date matching for historical data viewing in a read-only mode.
- **Life Problems & Life Skill Map**: Dynamically populated Excel-like tabular structure powered by the Course Tracking API, displaying courses as collapsible categories with lessons as clickable "Life Skills" links. Features a responsive design, scrollable lesson containers, and a distinct color scheme.
- **Goal Management**: "Platinum Streak" for consistent engagement, "Platinum Standards" badge for sustained performance, and a rating increment constraint system.
- **Personalization & AI**: AI-powered course recommendations and AI-driven auto-fill for "Next Week Target" suggestions (problems, feelings, actions).
- **Reporting & Analytics**: PDF export for reports, detailed weekly progress analytics with graphical representations, pagination, and a team leaderboard.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System," popup dialog editing, hover popup cards, and calendar history navigation.
- **Emotional Tracking**: Daily Emotional Tracker with 9 time slots, color-coded inputs, auto-save, and data persistence with unique constraints.
- **User Interface**: Compact views with tooltips, popup editing, hover cards, and calendar history navigation.
- **Platinum User Progress**: A team member dashboard viewer available to both admin and regular users, allowing them to search and view selected week's HRCM data, daily rituals, emotional tracker, and earned badges.
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management, approved email filtering, and a comprehensive user dashboard viewer.
- **Assignment Column**: Persistent assignments from course tracking, admin recommendations, and user additions persist across all dates until completed or deleted. Users can edit assignments on any date, and the frontend displays only pending assignments.
- **Notifications**: Optional email reminders and Platinum badge notifications.
- **Authentication**: Strict authentication with role-based access for both dashboard and admin panel.

## External Dependencies
- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns`.
- **Third-Party Services**: OpenAI (gpt-5 model), Google Sheets, Email Service (Resend/SendGrid), Supabase (external backup).
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron`.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.
- **External Backup**: `@supabase/supabase-js` for Supabase integration, providing automated 10-minute interval backups plus daily full backups for disaster recovery and redundancy.

## Disaster Recovery
Complete disaster recovery system implemented with automatic health monitoring and external backup redundancy. See `DISASTER_RECOVERY_GUIDE.md` for detailed recovery procedures, `DATABASE_URL_CHANGE_GUIDE.md` for failover instructions, `SUPABASE_PRICING_ANALYSIS.md` for cost analysis, and `PUBLISHING_GUIDE.md` for deployment details. System supports 30K users with maximum 1-minute data loss and 5-60 minute recovery time.