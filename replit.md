# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to track and enhance personal development across Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking, daily ritual monitoring, and course progress into a single system. The project aims to empower users to achieve personal goals through gamification, real-time feedback, leaderboards, and AI-driven recommendations for structured self-improvement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard features a clean, responsive "New York" style design using shadcn/ui components and the Inter font, with support for both light and dark modes. The primary color is Teal, and the accent is Coral. It includes optimized layouts, a standards-based HRCM rating system scaled out of 10, and a consistent color palette for HRCM cards. The application is built with a mobile-first approach, ensuring optimal user experience across various devices.

### Technical Implementations
The frontend is built with React, Vite, Tailwind CSS, TanStack Query, and Wouter for routing. The backend uses Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM, and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` and implements role-based access control. Data persistence is managed via Drizzle ORM, Zod validation, and Drizzle Kit for migrations. The system employs UPSERT logic and a deduplication scoring mechanism for data integrity. Real-time synchronization is implemented for admin-defined "Platinum Standards" using `queryClient.refetchQueries()`. Course tracking is fully integrated with Google Sheets API via Replit's Google Sheets connection (connection ID: conn_google-sheet_01K74607BYX5MY2A2CV03919GD), featuring bold text detection for course headings, automatic lesson parsing, and persistent completion tracking. HRCM calendar and emotional tracker navigation utilize exact date matching for data retrieval using the `dateString` column (stored in local timezone, not UTC) to prevent timezone mismatches. All date helper functions compute dates using the browser's local timezone. Rate limiting is configured with `express-rate-limit` for various routes.

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking with complete monthly calendar history, comprehensive course progress monitoring with persistent lesson checkboxes, and a Daily Emotional Tracker across 9 time slots. Includes read-only history mode for past dates.
- **Course Tracker (Life Problems & Life Skill Map)**: Fully integrated Google Sheets-powered course tracking system (Sheet ID: 1na9ioh9uT8wxSkjTMxG61hUF75JxuSTF). Uses bold text detection in Column A (Question) to identify course headings, and normal text for lessons with URLs in Column B (Answer). Features dark navy theme (#1a2942 background, border-2 border-primary/40, #0f1c2e inner content), collapsible course sections with chevron indicators, progress bars showing completion percentage (X/Y lessons, Z%), clickable lesson links (blue text), interactive checkboxes for marking completion, and "10 pts" indicators. Skill Map button in header uses teal-to-coral gradient matching header buttons (bg-gradient-to-r from-primary to-accent). Lesson completions persist across sessions in courseVideoCompletions database table. Supports three-level hierarchical nesting: main courses (dark navy #1a2942), subcategories (cyan/blue gradient with 🔸), and sub-sub-categories (purple/violet gradient with 🔹). The "Platinum Fast Track" course contains 4 mastery subcategories (Health, Relationship, Career, DMP), which further contain 21 total sub-sub-courses. Progress bars automatically update based on checked lessons in real-time.
- **Goal Management**: Includes a "Platinum Streak" for consistent engagement, "Platinum Standards" for sustained performance, and a rating increment constraint system.
- **Personalization & AI**: AI-powered course recommendations and AI-driven auto-fill suggestions for "Next Week Target" (problems, feelings, actions) and smart HRCM pattern insights.
- **Reporting & Analytics**: PDF export for reports, detailed weekly progress analytics with graphical representations, and a team leaderboard.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System," popup dialog editing, hover popup cards, and calendar history navigation.
- **Emotional Tracking**: Daily Emotional Tracker with 9 time slots, color-coded inputs, auto-save, and data persistence.
- **User Interface**: Compact views with tooltips, popup editing, hover cards, and calendar history navigation. Fixed-height table cells with overflow-hidden. Current Week table features a checkpoint system identical to Next Week Target table, with color-coded themes.
- **Platinum User Progress**: A team member dashboard viewer allowing users and admins to view selected week's HRCM data, daily rituals, emotional tracker, and earned badges of other team members, with search functionality.
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management, approved email filtering, and a comprehensive user dashboard viewer with protected routes. Includes performance-optimized tab switching, real-time polling for user feedback, and side-by-side progress comparison.
- **Assignment Column**: Persistent assignments from course tracking, admin recommendations, and user additions, visible and editable by regular users.
- **User Feedback System**: A comprehensive feedback collection system with a floating feedback button, categorized feedback types, related feature tagging, priority levels, status tracking, and admin management panel.
- **Notifications**: Optional email reminders and Platinum badge notifications.
- **Authentication**: Strict authentication with role-based access for both dashboard and admin panel.
- **Current Week Checkpoint System**: Implemented checkpoint system for Current Week table columns (Problems, Feelings, Beliefs, Actions) with color-coded CompactChecklistView component, add/edit/toggle/delete operations, and auto-save.
- **Auto-Sync: Current Week → Next Week Target**: Implemented real-time automatic synchronization from Current Week checkpoints to Next Week Target checkpoints, replacing Next Week data with Current Week data.

## External Dependencies
- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns`.
- **Third-Party Services**: OpenAI (gpt-5 model), Google Sheets, Email Service (Resend/SendGrid).
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron`.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.
- **External Backup System**: Supabase for automated, high-frequency external database backups covering all 15 tables, with UPSERT operations and camelCase to snake_case transformation.