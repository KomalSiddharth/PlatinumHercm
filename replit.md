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

**Enhanced Data Safety & Error Handling (Nov 6, 2025):**
- **Visual Save Status Indicator**: Real-time badge in HRCM table header showing "Saving..." (with spinner), "Saved ✓", or "Save Failed ✗" states. Badge auto-hides after 2 seconds on success.
- **Auto-Retry Logic**: Failed saves automatically retry up to 3 times with exponential backoff (1s, 2s, 3s delays). Prevents silent data loss from temporary network issues.
- **Error Notifications**: Toast notifications alert users when saves fail after max retries, with clear error messages and actionable instructions.
- **Comprehensive Logging**: All save operations log detailed information including user ID, week number, text field contents with character counts, rating values, and whether operation was CREATE or UPDATE. Verification logs confirm what was actually saved to database.
- **Automatic Supabase Backup**: Every successful save triggers immediate backup to Supabase external database, ensuring dual-redundancy. Backup includes all HRCM data with proper dateString column and snake_case transformation.
- **Data Integrity Safeguards**: UPSERT logic preserves historical dateString and createdAt timestamps during updates, preventing data from being incorrectly tagged with wrong dates during auto-save operations.
- **Checkpoint Data Persistence Fix (Nov 6, 2025)**: Fixed critical frontend bug where Current Week and Next Week Target checkpoint data (problemsChecklist, feelingsCurrentChecklist, beliefsCurrentChecklist, actionsCurrentChecklist) was not loading from database after browser refresh. Frontend smart merge now properly preserves all checkpoint fields when processing weekData from backend.
- **Click-Outside-to-Save Dialogs (Nov 6, 2025)**: All checkpoint dialogs (First Checkpoint Dialog, Add Checkpoint Dialog, and Edit Checkpoint Dialog) now auto-save when user clicks outside, matching Google-level UX. No need to click "Save" button - simply typing text and clicking away automatically saves the checkpoint.
- **Popup Dialog Editing (Nov 6, 2025)**: Checkpoint editing now opens in popup dialog (matching first-time creation UX) instead of inline textarea. Clicking any checkpoint text in hover list opens a full popup dialog with color-coded styling matching the checkpoint type (Problems, Feelings, Beliefs, Actions). All three dialogs (First Checkpoint, Add Checkpoint, Edit Checkpoint) share consistent UX with auto-save on click-outside.

**Daily Auto-Copy & Real-Time Auto-Sync (Nov 6, 2025):**
- **Daily Auto-Copy Feature**: When user views current day and no data exists, system automatically fetches previous day's data via `/api/hercm/previous-day/:date` endpoint, copies it to current day, and auto-saves. Enables seamless daily continuity (e.g., Thursday data → Friday, Friday → Saturday). **Critical Fix**: Each day's data is preserved as a separate database record using `(userId, weekNumber, dateString)` unique combination, ensuring Thursday's data remains visible in calendar while Friday gets a fresh copy.
- **Real-Time Auto-Sync**: Automatic synchronization from Current Week to Next Week Target in real-time as user types. Mapping: Current Week Problems → Next Week Results, Current Week Feelings → Next Week Feelings, Current Week Beliefs → Next Week Beliefs/Reasons, Current Week Actions → Next Week Actions. Includes checkpoint checklists synchronization.
- **Update Button**: Located in Next Week Target header. Clicking "Update" clears all Next Week Target fields and checklists, disables auto-sync (sets `manualNextWeekMode = true`), and allows manual planning without auto-sync interference.
- **Auto-Sync Reset**: When user navigates to different date, `manualNextWeekMode` resets to `false`, automatically re-enabling auto-sync for the new date.
- **Backend Endpoint**: `/api/hercm/previous-day/:date` fetches most recent HRCM data before the specified date, ordered by dateString descending, supporting the daily auto-copy workflow.
- **Database UPSERT Fix**: New `getHercmWeekByDate()` storage function checks by `(userId, weekNumber, dateString)` instead of just `(userId, weekNumber)`, preventing auto-copy from overwriting previous dates' data. Each calendar date maintains its own historical record.

**Google-Level Instant Optimistic Updates (Nov 6, 2025):**
- **Zero-Delay Checkbox Response**: All checkboxes (Course Tracker lessons, Assignment Column) use TanStack Query's optimistic updates for instant visual feedback before server confirmation, eliminating any perceived lag or glitches.
- **Instant Points Update**: Header points counter updates immediately (+10/-10) when any checkbox is toggled, with automatic rollback if server request fails.
- **Error Recovery**: Failed mutations automatically rollback UI to previous state, preserving data integrity and preventing inconsistent states.
- **Real-Time Synchronization**: After optimistic updates, background refetch ensures UI stays in sync with server without blocking user interaction.

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking with complete monthly calendar history, comprehensive course progress monitoring with persistent lesson checkboxes, and a Daily Emotional Tracker across 9 time slots. Includes read-only history mode for past dates.
- **Course Tracker (Life Problems & Life Skill Map)**: Fully integrated Google Sheets-powered course tracking system (Sheet ID: 1na9ioh9uT8wxSkjTMxG61hUF75JxuSTF). Uses empty Column B to identify course headings, and non-empty Column B (URLs) for lessons. Features dark navy theme (#1a2942 background, border-2 border-primary/40, #0f1c2e inner content), collapsible course sections with chevron indicators, progress bars showing completion percentage (X/Y lessons, Z%), clickable lesson links (blue text), interactive checkboxes for marking completion, and "10 pts" indicators. **Overall Progress Bar (Nov 6, 2025)**: Displays total completion percentage across ALL courses below section heading, showing "X/Y lessons (Z%)" with real-time updates and teal-colored progress bar. Skill Map button in header uses teal-to-coral gradient matching header buttons (bg-gradient-to-r from-primary to-accent). Lesson completions persist across sessions in courseVideoCompletions database table. **Flat Course Structure (Nov 7, 2025)**: ALL courses now display as top-level courses with no subcategories or nesting. Previously nested subcourses (Health Mastery sub-courses, Career Mastery sub-courses, DMP recordings, Platinum Weekly Call sessions, etc.) are now separate independent courses. This creates a simple, flat list of ~34 courses, each with its own lessons and progress tracking. Progress bars automatically update based on checked lessons in real-time.
- **Goal Management**: Includes a "Platinum Streak" for consistent engagement, "Platinum Standards" for sustained performance, and a rating increment constraint system.
- **Personalization & AI**: AI-powered course recommendations and AI-driven auto-fill suggestions for "Next Week Target" (problems, feelings, actions) and smart HRCM pattern insights.
- **Reporting & Analytics**: PDF export for reports, monthly progress analytics with bar charts, line charts, and summary view. Weekly Progress badge shows true 7-day average (Friday-Thursday) instead of daily snapshot. Team leaderboard with real-time updates.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System," popup dialog editing, hover popup cards, and calendar history navigation.
- **Emotional Tracking**: Daily Emotional Tracker with 9 time slots, color-coded inputs, auto-save, and data persistence.
- **User Interface**: Compact views with tooltips, popup editing, hover cards, and calendar history navigation. Fixed-height table cells with overflow-hidden. Current Week table features a checkpoint system identical to Next Week Target table, with color-coded themes.
- **Platinum User Progress**: A team member dashboard viewer allowing users and admins to view latest week's HRCM data (auto-detected), daily rituals, emotional tracker, and earned badges of other team members, with search functionality. Automatically displays most recent week without manual week selection.
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management, approved email filtering, and a comprehensive user dashboard viewer with protected routes. Includes performance-optimized tab switching, real-time polling for user feedback, and side-by-side progress comparison.
- **Assignment Column**: Persistent assignments from course tracking, admin recommendations, and user additions, visible and editable by regular users. **Points System (Nov 6, 2025)**: Checking assignment recommendations awards 10 points; unchecking subtracts 10 points, matching the course tracker points system.
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