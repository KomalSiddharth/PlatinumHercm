# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application for tracking and improving Health, Relationship, Career, and Money (HRCM) life areas. It combines goal tracking with personal growth, using weekly HRCM scoring, daily ritual tracking, and course progress monitoring. The system drives engagement through a "Platinum Streak" for consistent activity, real-time feedback, leaderboards, and a progression system. It features AI-powered course recommendations and automated suggestions for problems, feelings, and actions, aiming to provide a structured and engaging approach to personal development.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard uses a clean, responsive "New York" style design with shadcn/ui components and the Inter font, supporting light/dark modes. The primary color is Teal, and the accent color is Coral. It features optimized column widths, reorganized dashboard elements, row-wise daily rituals, and an enhanced admin panel. The HRCM rating system is standards-based, scaled out of 10.

**HRCM Card Color Scheme (Oct 26, 2025)**: Consistent color palette across all HRCM area cards:
- **Health**: Green (`hsl(142 57% 37%)`) with green gradient background
- **Relationship**: Purple (`hsl(265 85% 58%)`) with purple gradient background
- **Career**: Blue (`hsl(221 83% 53%)`) with blue gradient background
- **Money**: Purple (`hsl(265 85% 58%)`) with purple gradient background - matching Relationship color for visual consistency

**Mobile Responsive Design (Oct 22, 2025)**: Comprehensive mobile-first responsive implementation across entire application:
- **Dashboard Layout**: Responsive padding `p-3 sm:p-4 md:p-6`, spacing `space-y-6 sm:space-y-8 md:space-y-12`, text sizes `text-2xl md:text-3xl`, and grid layouts `grid-cols-1 md:grid-cols-2` for adaptive content flow.
- **DashboardHeader**: Compact mobile header with `h-14 sm:h-16` height, responsive logo sizing `w-8 h-8 sm:w-10 sm:h-10`, optimized gaps `gap-2 sm:gap-3`, touch-friendly icon buttons `h-8 w-8 sm:h-9 sm:w-9`, hamburger menu for mobile navigation, and hidden admin button on small screens.
- **UnifiedHRCMTable**: Horizontal scroll (`overflow-x-auto`) for wide tables, responsive header padding `p-2 sm:p-2.5 md:p-3`, cell padding `p-1.5 sm:p-2 md:p-2.5`, button sizes `h-7 w-7 sm:h-8 sm:w-8`, icon sizes `h-3 w-3 sm:h-3.5 sm:w-3.5 md:h-4 md:w-4`, text `text-xs sm:text-sm`, and min-widths for key columns `min-w-[80px] sm:min-w-[100px]`.
- **EmotionalTracker**: Fully responsive table with header padding `p-3 sm:p-4 md:p-6`, card content `p-3 sm:p-4 md:p-6`, table headers `p-1.5 sm:p-2 md:p-3`, abbreviated column labels on mobile (`Positive` vs `Positive Emotions`), cell padding `p-1 sm:p-1.5 md:p-2`, and compact date navigation buttons `h-8 w-8 sm:h-9 sm:w-9`.
- **Touch-Friendly Interactions**: All interactive elements optimized for touch with minimum 44px tap targets, appropriate spacing, and mobile-optimized hover states.
- **Design Pattern**: Mobile-first approach using Tailwind breakpoints (`sm:`, `md:`, `lg:`) - smaller sizes default, progressively larger on bigger screens. Ensures optimal UX on phones, tablets, and desktops.

### Technical Implementations
- **Frontend**: React with Vite, shadcn/ui, Tailwind CSS, TanStack Query, and Wouter for routing.
- **Backend**: Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM (`@neondatabase/serverless`), and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` and role-based access control.
- **Data Storage**: Drizzle ORM with an `IStorage` interface, Zod validation for schemas, and Drizzle Kit for migrations. **UPSERT Logic (Oct 24, 2025)**: Checkbox saves now use UPSERT pattern - check if week exists → UPDATE existing row, else CREATE new. This prevents duplicate database rows and ensures Platinum Standards checkboxes persist correctly across page refresh/login cycles. **Deduplication Scoring**: When multiple database rows exist for the same week, the system selects the most complete row using a scoring formula: `healthChecklist (10 pts) + relationshipChecklist (10 pts) + careerChecklist (10 pts) + moneyChecklist (10 pts) + unifiedAssignment (10 pts) + timestamp/10000000000000 (~0.17 tiebreaker)`. This ensures admin recommendations in `unifiedAssignment` are preserved during row selection.

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking, comprehensive course progress monitoring with persistent course lesson checkboxes (saved to `course_video_completions` table, auto-loaded on mount), and **Daily Emotional Tracker** with 9 time slots (7am-1am) tracking 4 emotion categories (positive, negative, repeating, missing). **Calendar History Navigation (Oct 27, 2025)**: Current Week table header includes Previous/Next date navigation buttons and calendar picker for viewing historical HRCM data. System automatically refetches and displays data when dates are selected - no page refresh needed.
- **Life Problems & Life Skill Map (Oct 27, 2025)**: Excel-like tabular structure positioned below HRCM section displaying problem-to-skill mappings. Features **common** Coral Red "Problems" header (#ff6b6b) and Emerald Green "Life Skills" header (#10b981) at the top (sticky), matching Current Week and Next Week Target table colors. Collapsible course categories shown below: Basic LOA (7 mappings), Health Mastery (5), Wealth Mastery (25), NLP (18), Relationship Mastery (10), Lead Self (16), Lead People (19), Train The Trainer (8), Digital Coaching System (7), and Practical Spirituality (10). Each category section has centered headings, rounded/curvy borders matching HRCM tables, scrollable content (max-height 400px), and compact design. Left column lists life problems, right column lists corresponding life skills/solutions with clickable links. Includes sticky common headers, alternating row colors, purple-pink gradient theme matching Emotional Tracker, and full responsive design support.
- **Goal Management**: "Platinum Streak" for consistent engagement, "Platinum Standards" badge for sustained high performance (8+ average across HRCM for 4 consecutive weeks), and a rating increment constraint system (max rating of 7, progressing to 8).
- **Personalization & AI**: AI-powered course recommendations, AI-driven auto-fill for "Next Week Target" suggestions (problems, feelings, actions), and smart AI insights for HRCM patterns.
- **Reporting & Analytics**: PDF export for weekly/monthly HRCM reports, detailed weekly progress analytics with graphical representations (Bar Chart and Line Chart with 0-100% Y-axis domain matching Progress column values), and team analytics with period filtering and top 10 leaderboard (shows only approved users with proper names, no emails). Leaderboard points calculation includes both weekly ritual points and course lesson completion points (10 points per lesson). **Chart Fix (Oct 24, 2025)**: Weekly Progress Bar Chart Y-axis now shows proper 0-100 percentage scale (was auto-calculated to max data value). Both Bar and Line charts use checklist completion % matching Progress column.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System" with auto-conversion of text to interactive checkpoints, and manual checkpoint management.
- **Emotional Tracking**: Daily Emotional Tracker displays 9 two-hour time slots (7am-9am through 11pm-1am) with 4 emotion categories per slot. Features auto-save on blur, color-coded inputs (green-positive, red-negative, blue-repeating, orange-missing), purple-pink gradient theme, and full data persistence across page refresh/login cycles. Stored in `emotional_trackers` table with unique constraint on (userId, date, timeSlot).
- **User Interface**: Compact views with tooltips for efficient data display, popup dialog editing for Current Week fields, hover popup cards for long lists (Platinum Standards, Assignment column), and **Calendar History Navigation** - calendar icon in Current Week table header allows selecting any previous date to view historical HRCM data. System finds and displays the most recent week snapshot created on or before the selected date (Oct 22, 2025 fix).
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management (add/delete), approved email filtering for all analytics, ability to recommend courses that persist in users' Assignment column across sessions, and **User Dashboards tab** that displays complete user dashboard view including Current Week HRCM data, Next Week Target tables, Daily Rituals, Badges, and Daily Emotional Tracker (Admin View) with all-time leaderboard points calculation. **Security Fix (Oct 22, 2025)**: All admin routes now properly protected with `isAdmin` middleware - prevents unauthorized access to admin panel features (approved emails, course recommendations, user dashboards).
- **Assignment Column**: Unified Assignment column with dual-source display (user-selected Course Lessons in cyan + admin-recommended in pink). Compact view shows first 2 items per category with "+ X more items..." indicator. Hover triggers popup card (w-96, max-h-400px) showing complete list with checkboxes, clickable links, and delete buttons. All assignments persist across refresh/login via `unifiedAssignment` JSONB field with `source` and `recommendationId` tracking. **Week Generation Fix (Oct 22, 2025)**: `unifiedAssignment` now properly carries forward to next week when generating new weeks, preserving admin recommendations.
- **Notifications**: Optional email reminders and Platinum badge notifications.
- **Authentication**: Strict authentication for dashboard and admin panel with role-based access.
- **Ready for Live Publication**: All features tested with real approved users, proper name display throughout (leaderboard, analytics), and reliable data persistence. Emotional Tracker feature fully tested and operational (Oct 21, 2025).

## External Dependencies

- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns`.
- **Third-Party Services**:
    - OpenAI (gpt-5 model) for AI-powered features.
    - Google Sheets for user-specific course data.
    - Email Service (Resend/SendGrid) for notifications.
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron`.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.