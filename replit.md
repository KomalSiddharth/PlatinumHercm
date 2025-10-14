# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application that helps users track and improve four key life areas: Health, Relationship, Career, and Money (HRCM). It integrates goal tracking with principles like the Law of Attraction and the 6 Human Needs to foster personal growth. Users engage in weekly HRCM scoring, daily ritual tracking, and course progress monitoring to achieve a "Platinum Streak" through consistent activity completion. The system provides real-time feedback, leaderboards, and a progression system to encourage sustained engagement. The application also supports AI-powered course recommendations based on user-specific Google Sheets data and automates problem/feeling/action suggestions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard features a clean, responsive design with "New York" style shadcn/ui components and the Inter font, supporting both light and dark modes. Key UI elements include a reorganized dashboard layout, row-wise daily rituals, and an enhanced admin panel for coaches/trainers. The HRCM rating system is standards-based, with all categories (Health, Relationship, Career, Money) scaled to a rating out of 10, calculated by selected predefined standards via a dialog.

### Frontend Architecture
- **Framework**: React with Vite
- **UI Component System**: shadcn/ui (Radix UI primitives) and Tailwind CSS
- **State Management**: TanStack Query
- **Routing**: Wouter
- **Design System**: Modular components, Teal (Primary) and Coral (Accent) color palette, responsive grid layouts.

### Backend Architecture
- **Framework**: Express.js with TypeScript (ES Modules)
- **Storage Layer**: Abstracted `IStorage` interface, designed for Drizzle ORM
- **API Structure**: REST API (`/api` prefix) with logging and error handling
- **Authentication**: Session-based authentication via `/auth` route, with planned role-based access control (`isAdmin` role) and `bcrypt` for password hashing.
- **Data Storage**: PostgreSQL with Drizzle ORM (`@neondatabase/serverless`), using `connect-pg-simple` for session management. Schema includes `users` table with UUIDs and Zod validation. Migrations managed by Drizzle Kit.

### Core Features
- **Auto-Save**: Changes save automatically on field blur; manual save buttons removed.
- **Automatic Week Progression**: System automatically moves to the next week after 7 days from week creation, saving data and providing a blank template for the new week.
- **PDF Export System**: Generates weekly and monthly HRCM reports.
- **Email Notification Service**: Optional weekly check-in reminders and Platinum badge notifications (requires API key).
- **Platinum Badge System**: Awards "Platinum Standards" badge for monthly progress exceeding 80%.
- **Smart AI Insights**: ML-powered analysis of HRCM patterns, trends, predictions, and recommendations.
- **ML-Based Target Recommendations**: Intelligent target suggestions based on historical performance.

## External Dependencies

- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns` (default timezone: Asia/Kolkata).
- **Third-Party Services**:
    - OpenAI (gpt-5 model) via Replit AI Integrations for course recommendations, auto-fill, smart insights, and ML-based target predictions.
    - Google Sheets for user-specific course data.
    - Email Service (Resend/SendGrid) for notifications (optional, requires `RESEND_API_KEY` or `SENDGRID_API_KEY`).
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron` for automated reminders and badge checks.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.

## Recent Changes

### October 14, 2025 - Rating Increment Constraint System

**New Rating Progression System**
- **Initial Max Rating**: All users start with a maximum rating of 7 for all HRCM categories
- **Progressive Increment**: After maintaining the maximum rating for 4 consecutive weeks, the allowed maximum increases by 1
- **Category-Specific Tracking**: Each category (Health, Relationship, Career, Money) tracks progression independently

**Rating Constraint Logic:**
1. **Week 1-4**: Max rating capped at 7 (even if checklist completion suggests higher)
2. **After 4 Consecutive Weeks at 7**: Max rating automatically increments to 8
3. **Weeks 5-8 at 8**: Max rating increments to 9
4. **Pattern Continues**: Maximum rating can eventually reach 10

**Progression Tracking:**
- New database table `rating_progression` tracks user-specific max ratings and weeks at max
- Backend automatically validates and caps ratings based on user's current allowed maximum
- Frontend displays current max and progression status (e.g., "7/7" with "3/4 weeks" badge)
- Ratings reset if user doesn't maintain max for 4 consecutive weeks

**User Experience:**
- Rating buttons show "current/max" (e.g., "7/7" instead of "7/10")
- Small badge appears showing progression status when at max (e.g., "2/4 weeks")
- System automatically increments max rating after 4 consecutive weeks
- Each HRCM category progresses independently

**API Endpoints:**
- `GET /api/rating-progression/caps` - Get current max ratings for all categories
- `GET /api/rating-progression/status` - Get detailed progression status (weeks at max, last rating, etc.)
- Auto-tracking happens during week save operations

**Security & Integrity:**
- **Replay Protection**: System tracks `lastCountedWeek` to prevent users from repeatedly saving the same week to manipulate progression
- **Consecutive Week Validation**: Only consecutive weeks (weekNumber - 1) count toward the 4-week requirement
- **Historical Edit Protection**: Editing old weeks does not affect progression once a later week has been saved
- **Strict Progression**: Users must genuinely maintain max rating for 4 consecutive weeks to unlock the next level

### October 14, 2025 - Team Activity Search in User Dashboard

**New Team Activity Feature in User Dashboard**
- Added "Team Activity" navigation tab in user dashboard
- Users can search and view team members' HRCM progress
- Same compact card interface as admin panel
- Accessible to all authenticated users (not just admins)

**Navigation & Access:**
1. **Dashboard Navigation**: New "Team Activity" tab alongside HRCM, Daily Rituals, and Courses
2. **Scroll-to-Section**: Clicking navigation scrolls to Team Activity section
3. **Purple-themed Section**: Distinct purple background and borders for Team Activity

**Search Functionality:**
1. **Search by Name/Email**: Case-insensitive search across all team members
2. **Real-time Results**: Instant display of matching users
3. **Compact User Cards**:
   - User avatar, name, and email
   - Current week number and total weeks tracked
   - Overall score with color-coded badge (green ≥8, amber ≥5, red <5)
   - HRCM ratings grid: Health 💪, Relationship ❤️, Career 💼, Money 💰
   - Color-coded rating badges (0-10 scale)
   - Problem descriptions (truncated to 2 lines)

**Backend APIs:**
- `GET /api/team/search-users?name={query}` - User dashboard endpoint (all authenticated users)
- `GET /api/admin/search-user-by-name?name={query}` - Admin panel endpoint (admin only)
- Both return: user info, latest week ratings, problems, and total weeks

**Implementation Details:**
- `UserActivitySearch` component accepts optional `apiEndpoint` prop
- Defaults to `/api/team/search-users` for user dashboard
- Uses `/api/admin/search-user-by-name` when in admin panel
- Protected by `isAuthenticated` middleware (team endpoint) or `isAdmin` (admin endpoint)
- **Search History Limit**: Only shows last 2 unique searched users (most recent searches)
- Automatically removes duplicates and maintains chronological order

### October 14, 2025 - Daily Rituals Simplification

**Simplified Daily Rituals Interface**
- Removed pause/resume button - rituals are always active
- Removed edit button - rituals cannot be edited after creation
- Removed points allocation option - all rituals auto-allocated 10 points
- Updated all existing rituals to have 10 points

**Daily Rituals Changes:**
1. **Auto-Point Allocation**: All new rituals automatically receive 10 points
2. **Simplified Controls**: Only history and delete buttons visible on ritual cards
3. **Database Update**: Executed SQL to update all existing rituals to 10 points
4. **Add Button Updated**: Changed from "Add" to "Add (10 pts)" to indicate fixed points
5. **Code Cleanup**: Removed unused handlers and mutations (toggleActive, edit, save)

**User Impact:**
- Simpler, cleaner ritual management interface
- No need to choose points when adding rituals
- Consistent 10-point system across all rituals
- Cannot pause or edit rituals after creation (only delete)

### October 13, 2025 - UI Improvements and Column Width Optimization

**Column Width Optimization**
- Reduced column widths in Current Week and Next Week tables to eliminate horizontal scrolling
- Progress column: 100px → 70px
- Rating column: 80px → 60px  
- Other columns optimized to fit all columns on screen without scrolling

**UI Simplification**
- Removed AI Auto-Fill button for cleaner interface
- Maintains automatic week progression feature (moves to next week after 7 days)

**Week Display Behavior**
- Current week clearly displayed at top (e.g., "Week 1 - HRCM Tracker")
- Automatic progression to next week after 7 days from week creation
- Previous week data automatically saved before progression
- New week starts with blank columns for fresh data entry