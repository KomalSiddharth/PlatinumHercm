# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to track and enhance personal development across Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking, daily ritual monitoring, and course progress into a single system. The project aims to empower users to achieve personal goals through gamification, real-time feedback, leaderboards, and AI-driven recommendations for structured self-improvement.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### UI/UX Decisions
The dashboard features a clean, responsive "New York" style design using shadcn/ui components and the Inter font, with support for both light and dark modes. The primary color is Teal, and the accent is Coral. It includes optimized layouts, a standards-based HRCM rating system scaled out of 10, and a consistent color palette for HRCM cards. The application is built with a mobile-first approach, ensuring optimal user experience across various devices.

### Technical Implementations
The frontend is built with React, Vite, Tailwind CSS, TanStack Query, and Wouter for routing. The backend uses Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM, and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` and implements role-based access control. Data persistence is managed via Drizzle ORM, Zod validation, and Drizzle Kit for migrations, employing UPSERT logic and a deduplication scoring mechanism. Real-time synchronization uses `queryClient.refetchQueries()`. HRCM calendar and emotional tracker navigation utilize exact date matching with local timezone dates. Rate limiting is configured with `express-rate-limit`.
Enhanced data safety includes a visual save status indicator, auto-retry logic, toast notifications, comprehensive logging, and automatic Supabase backup on every successful save. UPSERT logic preserves historical timestamps. Checkpoint data loads correctly after refresh, and dialogs auto-save on click-outside. Daily auto-copy fetches previous day's data, ensuring continuity, with intelligent auto-sync detection that maintains user planning workflow. Google-level instant optimistic updates are implemented for checkboxes and points, with automatic UI rollback on failed mutations and background refetch for synchronization.

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking with monthly calendar history, comprehensive course progress monitoring, and a Daily Emotional Tracker across 9 time slots. Includes read-only history mode. ALL platinum standards (Health, Relationship, Career, Money) feature a unified 0-7 rating system with descriptive heading "How many days in this week did you follow the standards?", rating input positioned left of standard text, date-specific persistence and auto-save.
- **Course Tracker**: Dynamic Google Sheets integration fetches 47 courses in real-time with natural sheet ordering, zero caching, and auto-polling every 30 seconds. Includes course merging for related content and UI enhancements like improved plus icon visibility and external navigation links.
- **Goal Management**: "Platinum Streak" for consistent engagement, "Platinum Standards" for sustained performance with date-specific persistence and rating increment constraint system, with auto-save on checkbox toggle. Platinum standards and ratings are read-only for previous dates.
- **Progressive Unlock System (All HRCM Areas)**: Users must maintain 7/7 rating across ALL platinum standards for each HRCM area (Health, Relationship, Career, Money) for 7 consecutive days to unlock the ability to rate 7 in the main HRCM rating column for that area. Features real-time unlock progress tracking with visual indicators (e.g., "3/7 days → unlock 7"), automatic streak reset if any standard drops below 7, and persistent unlock status stored in `user_hrcm_unlock_progress` table. Rating is capped at 6 until unlock condition is met. Each HRCM area maintains independent unlock progress tracking.
- **Weekly Progress Calculation**: Weekly Progress badge displays the average progress across all 4 HRCM areas (Health, Relationship, Career, Money) for 7 consecutive days. Daily progress for each area is calculated based on platinum standards rated 7 (Standards rated 7 ÷ Total standards × 100%). The weekly average is computed by averaging daily progress across the entire week, providing comprehensive insight into overall HRCM performance.
- **Personalization & AI**: AI-powered course recommendations and AI-driven auto-fill suggestions for "Next Week Target" (problems, feelings, actions) and smart HRCM pattern insights.
- **Reporting & Analytics**: PDF export for reports, monthly progress analytics with interactive charts (Bar Chart, Line Chart, Summary) based on platinum standards ratings (not checklist completion), summary view, weekly progress badge (platinum standards-based), and a real-time team leaderboard. Analytics graphs display data from the Progress column calculation using platinum standards: each HRCM area's progress = (Standards rated 7 ÷ Total standards) × 100%, averaged across all days in the selected period. Fixed analytics endpoint to properly fetch and calculate progress data using correct database schema.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System," popup dialog editing, hover popup cards, and calendar history navigation.
- **Emotional Tracking**: Daily Emotional Tracker with 9 time slots, color-coded inputs, auto-save, and data persistence.
- **User Interface**: Compact views with tooltips, popup editing, hover cards, and calendar history navigation. Clickable date navigation for calendar popup. Read-only historical data popup for checkpoint details. Current Week table displays selected date in heading, while Next Week Target table shows 7 days ahead automatically. HRCM Standards cells are fully clickable (entire area, not just badge) to open platinum standards popup. Optimized save behavior prevents UI flickering during rating updates. Platinum standards feature instant optimistic updates with no loading indicators for smooth, responsive rating changes.
- **Platinum User Progress**: A team member dashboard viewer with search functionality, allowing viewing of Week 1 HRCM data, daily rituals, emotional tracker, and earned badges.
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management, approved email filtering, and a comprehensive user dashboard viewer with protected routes. Features multi-select bulk operations (delete) for approved emails, team management, and platinum standards, with confirmation dialogs and optimistic UI updates. Includes intuitive drag-and-drop reordering for Platinum Standards using `@dnd-kit` with visual feedback and instant updates.
- **Assignment Column**: Persistent assignments from course tracking, admin recommendations, and user additions, with a points system.
- **User Feedback System**: Comprehensive feedback collection with a floating button, categorized types, priority levels, status tracking, and admin management.
- **Notifications**: Optional email reminders and Platinum badge notifications.
- **Authentication**: Strict authentication with role-based access for both dashboard and admin panel.
- **Current Week Checkpoint System**: Checkpoint system for Current Week table columns (Problems, Feelings, Beliefs, Actions) with color-coded view, add/edit/toggle/delete operations, and auto-save.
- **Auto-Sync: Current Week → Next Week Target**: Real-time automatic synchronization from Current Week checkpoints to Next Week Target checkpoints.

## External Dependencies
- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns`.
- **Third-Party Services**: OpenAI (gpt-5 model), Google Sheets, Email Service (Resend/SendGrid).
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron`.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.
- **External Backup System**: Supabase for automated, high-frequency external database backups.