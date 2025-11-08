# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to track and enhance personal development across Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking, daily ritual monitoring, and course progress into a single system. The project aims to empower users to achieve personal goals through gamification, real-time feedback, leaderboards, and AI-driven recommendations for structured self-improvement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard features a clean, responsive "New York" style design using shadcn/ui components and the Inter font, with support for both light and dark modes. The primary color is Teal, and the accent is Coral. It includes optimized layouts, a standards-based HRCM rating system scaled out of 10, and a consistent color palette for HRCM cards. The application is built with a mobile-first approach, ensuring optimal user experience across various devices.

### Technical Implementations
The frontend is built with React, Vite, Tailwind CSS, TanStack Query, and Wouter for routing. The backend uses Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM, and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` and implements role-based access control. Data persistence is managed via Drizzle ORM, Zod validation, and Drizzle Kit for migrations. The system employs UPSERT logic and a deduplication scoring mechanism for data integrity. Real-time synchronization is implemented using `queryClient.refetchQueries()`. HRCM calendar and emotional tracker navigation utilize exact date matching for data retrieval using the `dateString` column (stored in local timezone, not UTC) to prevent timezone mismatches. All date helper functions compute dates using the browser's local timezone. Rate limiting is configured with `express-rate-limit`.

Enhanced data safety includes a visual save status indicator, auto-retry logic for failed saves, toast notifications for errors, and comprehensive logging of all save operations. An automatic Supabase backup is triggered on every successful save, ensuring dual-redundancy. UPSERT logic preserves historical `dateString` and `createdAt` timestamps during updates. Checkpoint data (problems, feelings, beliefs, actions) now properly loads from the database after a browser refresh, and all checkpoint dialogs auto-save on click-outside, with editing opening in consistent popup dialogs.

Daily auto-copy functionality fetches and copies previous day's data when the current day is viewed and no data exists, ensuring seamless daily continuity, with each day's data preserved as a separate database record. Real-time auto-sync maps Current Week data to Next Week Target, including checkpoint checklists, and functions universally across all dates. An "Update" button allows for manual planning by clearing Next Week Target fields and disabling auto-sync. `manualNextWeekMode` resets to `false` when navigating to a different date. A critical fix ensures all save operations include `dateString` to preserve date-specific data integrity.

Google-level instant optimistic updates are implemented for all checkboxes (Course Tracker lessons, Assignment Column) and points updates, providing instant visual feedback before server confirmation. Failed mutations automatically rollback the UI. Background refetch ensures UI sync with the server. A bug where course lesson checkboxes were non-functional has been fixed.

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking with complete monthly calendar history, comprehensive course progress monitoring with persistent lesson checkboxes, and a Daily Emotional Tracker across 9 time slots. Includes read-only history mode for past dates.
- **Course Tracker**: Hardcoded course structure with 6 courses: "Manifest with Chakra by Mitesh Khatri" (19 lessons), "AI Course by Mitesh Khatri" (10 lessons), "Depression To Celebration" (2 lessons), "Basic Law of Attraction Level 1" (16 lessons), "Advance Law of Attraction" (15 lessons), and "Wealth Mastery" (21 lessons). Features a dark navy theme, an overall progress bar, and persistent lesson completions. It utilizes a compact, scrollable layout. **Critical Backend Fix (Nov 8, 2025)**: Fixed inverted toggle logic where backend incorrectly treated `completed` parameter as desired state instead of current state.
- **Goal Management**: Includes a "Platinum Streak" for consistent engagement, "Platinum Standards" for sustained performance, and a rating increment constraint system.
- **Personalization & AI**: AI-powered course recommendations and AI-driven auto-fill suggestions for "Next Week Target" (problems, feelings, actions) and smart HRCM pattern insights.
- **Reporting & Analytics**: PDF export for reports, monthly progress analytics with bar charts, line charts, and summary view. Weekly Progress badge shows true 7-day average. Team leaderboard with real-time updates.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System," popup dialog editing, hover popup cards, and calendar history navigation.
- **Emotional Tracking**: Daily Emotional Tracker with 9 time slots, color-coded inputs, auto-save, and data persistence.
- **User Interface**: Compact views with tooltips, popup editing, hover cards, and calendar history navigation. Fixed-height table cells with overflow-hidden. Current Week table features a checkpoint system identical to Next Week Target table, with color-coded themes.
- **Platinum User Progress**: A team member dashboard viewer allowing users and admins to view Week 1 HRCM data, daily rituals, emotional tracker, and earned badges of other team members, with search functionality.
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management, approved email filtering, and a comprehensive user dashboard viewer with protected routes, including performance-optimized tab switching, real-time polling, and side-by-side progress comparison.
- **Assignment Column**: Persistent assignments from course tracking, admin recommendations, and user additions, with a points system for checking/unchecking recommendations.
- **User Feedback System**: A comprehensive feedback collection system with a floating feedback button, categorized feedback types, related feature tagging, priority levels, status tracking, and admin management panel.
- **Notifications**: Optional email reminders and Platinum badge notifications.
- **Authentication**: Strict authentication with role-based access for both dashboard and admin panel.
- **Current Week Checkpoint System**: Implemented checkpoint system for Current Week table columns (Problems, Feelings, Beliefs, Actions) with color-coded CompactChecklistView component, add/edit/toggle/delete operations, and auto-save.
- **Auto-Sync: Current Week → Next Week Target**: Implemented real-time automatic synchronization from Current Week checkpoints to Next Week Target checkpoints, replacing Next Week data with Current Week data.

## External Dependencies
- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns`.
- **Third-Party Services**: OpenAI (gpt-5 model), Google Sheets (connection ID: conn_google-sheet_01K74607BYX5MY2A2CV03919GD), Email Service (Resend/SendGrid).
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron`.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.
- **External Backup System**: Supabase for automated, high-frequency external database backups covering all 15 tables, with UPSERT operations and camelCase to snake_case transformation.