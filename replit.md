# Platinum HRCM Dashboard

## Overview

The Platinum HRCM Dashboard is a gamified web application designed to help users track and improve four key life areas: Health, Relationship, Career, and Money (HRCM). It integrates goal tracking with principles like the Law of Attraction and the 6 Human Needs to foster personal growth. Users engage in weekly HRCM scoring, daily ritual tracking, course progress monitoring, and strive for a "Platinum Streak" through consistent activity completion. The system provides real-time feedback, leaderboards, and a progression system to encourage sustained engagement and achievement. The application also supports AI-powered course recommendations based on user-specific Google Sheets data and automates problem/feeling/action suggestions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework**: React with Vite
**UI Component System**: shadcn/ui (Radix UI primitives) with Tailwind CSS, using the "New York" style variant and Inter font. Supports light/dark modes.
**State Management**: TanStack Query for server state and data fetching.
**Routing**: Wouter for lightweight client-side routing, supporting Dashboard, Auth, and NotFound routes.
**Component Architecture**: Modular, reusable components with composition using Radix UI primitives.
**Design System**: Color palette includes Primary (Teal), Accent (Coral), and category-specific colors for HRCM. Employs responsive grid layouts.

### Backend Architecture

**Framework**: Express.js with TypeScript (ES Modules).
**Storage Layer**: Abstracted `IStorage` interface, currently with `MemStorage` and designed for Drizzle ORM integration.
**API Structure**: REST API with `/api` prefix, including request/response logging and error handling middleware.
**Development Features**: Vite middleware for HMR, runtime error overlay, and Replit-specific plugins.

### Data Storage Solutions

**Database**: PostgreSQL with Drizzle ORM, using `@neondatabase/serverless` for connection.
**Schema Design**: `users` table with UUID primary key, username, and password fields. Zod integration for runtime validation.
**Migration Strategy**: Drizzle Kit for PostgreSQL, migrations managed in `./migrations`.
**Session Management**: `connect-pg-simple` for PostgreSQL-backed sessions.

### Authentication and Authorization

**Authentication**: Planned session-based authentication with username/password, handled via an `/auth` route.
**Authorization**: Role-based access control is planned, with an `isAdmin` role for specific UI components and protected routes. Admin panel enhanced for coach/trainer use with user drill-down views and access logs.
**Security**: Planned HTTPS enforcement and bcrypt for password hashing.

### UI/UX Decisions

- **Week Comparison**: Moved to a modal triggered by a "Weekly Progress" badge.
- **Next Week Target Rating**: Auto-calculated as current rating + 1, displayed as a read-only badge.
- **Blank Week Generation**: Week 1 shows demo data, subsequent weeks are blank templates.
- **Monthly Analytics**: Displays all 12 months with Week 1-4 analytics, handling months without data gracefully.
- **Admin Panel**: Transformed into a coach/trainer dashboard with enhanced analytics (summary cards, comparison charts) and user drill-down views.

## External Dependencies

**UI Component Libraries**:
- Radix UI primitives (`accordion`, `dialog`, `dropdown`, `select`, `toast`, `tooltip`, etc.)
- `cmdk` for command palette
- `embla-carousel-react` for carousels
- `class-variance-authority` and `clsx` for styling
- `lucide-react` for icons
- `recharts` for charts in admin dashboard

**Date/Time Handling**:
- `date-fns` for date manipulation and formatting, with Asia/Kolkata as default timezone.

**Third-Party Services**:
- OpenAI (gpt-5 model) via Replit AI Integrations for course recommendations, auto-fill, smart insights, and ML-based target predictions.
- Google Sheets for user-specific course data.
- Email Service (Resend/SendGrid) for weekly reminders and badge notifications (optional - requires RESEND_API_KEY or SENDGRID_API_KEY).

**PDF Generation**:
- `pdfkit` for generating weekly and monthly HRCM reports.

**Scheduled Tasks**:
- `node-cron` for automated weekly email reminders and Platinum badge checks.

**Database Driver**:
- `@neondatabase/serverless` for PostgreSQL connection.

## Recent Changes

### October 13, 2025 - Auto-Save and Automatic Week Progression

**Auto-Save Implementation**
- Removed manual "Save Week" button
- All changes now save automatically on field blur (when clicking outside text boxes)
- Users no longer need to manually save their progress

**Automatic Week Progression**
- Removed manual "Generate Next Week" button
- System automatically moves to next week after 7 days from week creation
- Auto-progression only applies to the latest/current week (not when viewing history)
- Data is saved to backend before progressing to ensure no data loss
- Only progresses once per week using ref-based tracking to prevent multiple triggers
- Shows success notification when moving to new week
- New week starts with blank template for fresh data entry

### October 13, 2025 - Dashboard Layout and Daily Rituals UI Updates

**Dashboard Layout Reorganization**
- Moved Achievements & Badges section to bottom of dashboard
- Integrated Leaderboard directly into Achievements & Badges card component
- Leaderboard now appears as a section within the golden achievements card with:
  - Border separator between badges and leaderboard
  - Consistent golden/yellow theme styling
  - Trophy icons for top 3 positions
  - Special highlighting for current user
- New order: HRCM Table → Daily Rituals → Course Tracker → Achievements/Badges (with integrated Leaderboard)

**Daily Rituals Section Styling**
- Changed section background color to #00008c (deep blue)
- Updated text colors to white for better contrast on dark background
- Border color set to #0000cc for visual consistency
- Fixed accessibility: All text meets WCAG AA contrast requirements (9.7:1 ratio)

### October 13, 2025 - Text Box and Daily Rituals Updates

**Text Box Behavior Change**
- Removed Enter key save functionality from all text boxes in HRCM tables
- Enter key now creates new line (standard behavior)
- Save only occurs on blur (clicking outside text box)
- Escape key still cancels edit and restores original value

**Daily Rituals Row-Wise Layout with Default Options**
- Changed Daily Rituals display from grid cards to row-wise list layout
- Added 4 default rituals that appear for all users automatically:
  1. "Attend Live DMP Everyday" (Health, Daily, 50 points)
  2. "Attend Morning Fitness Everyday" (Health, Daily, 50 points)
  3. "Attend Platinum Live Support Calls" (Career, Daily, 50 points)
  4. "Joined Magic of 6" (Career, Daily, 50 points)
- Default rituals are automatically created on first access
- Default rituals cannot be deleted (only paused/resumed)
- New `isDefault` field in rituals schema to mark system rituals
- Row-wise layout shows checkbox, title, badges, and action buttons inline
- Maintains all existing functionality: complete, pause/resume, edit, delete, view history

### October 13, 2025 - Health Standards Rating System

**Standards-Based Health Rating**
- Implemented a new health rating system where users rate their health by selecting from 10 specific health standards via checkboxes in a popup dialog
- Rating automatically calculates based on number of standards selected (1 standard = 1 point, max 10)
- Health rating cell displays a button that opens the standards dialog
- Standards are predefined with specific health habits and promises
- Automatic migration from old checklist format to new 10-standard system
- Preserves user selections when reopening the dialog

**Health Standards (10 Total):**
1. I started my Day with Magic Water
2. I started my Day with 10 Mins of Musical Workout for Squats & Pushups
3. I started my Day with Healthy Breakfast
4. I completed 100 Pushups & Squats today
5. I Promise to say Cancel-Cancel every time I say something Negative
6. I Promise to check my Emotional Frequency every 2 hours by Alarm
7. I Promise to say this Affirmation – "I Am Responsible for my Feelings" 10 times today
8. I Promise to Be Aware of my Emotional Rules and Make Positive Emotions Easy and Negative Emotions Difficult
9. I Promise to Believe in myself more than Anybody else
10. I Promise to Practice Walking-Talking Affirmations before doing any task today

### October 12, 2025

### New Features Implemented:

1. **PDF Export System**
   - Weekly HRCM reports: `/api/export/week/:weekNumber/pdf`
   - Monthly progress reports: `/api/export/monthly/:month/:year/pdf`
   - Professional formatting with category breakdown and insights

2. **Email Notification Service** (Optional)
   - Weekly HRCM check-in reminders (automated - every Monday 9:00 AM IST)
   - Platinum badge achievement notifications (automated - checked every Sunday 11:59 PM IST)
   - Requires `RESEND_API_KEY` or `SENDGRID_API_KEY` environment variable
   - Set `EMAIL_FROM` for sender address (default: noreply@hrcm.app)
   - Gracefully degrades if no API key is provided (logs warnings only)

3. **Platinum Badge System**
   - Automatically awards "Platinum Standards" badge when monthly progress > 80%
   - Email notification sent on badge achievement
   - Badge tracking in `platinum_progress` table with `platinumAchieved` flag
   - API: `POST /api/badges/check-platinum` with `{ month, year }`

4. **Smart AI Insights**
   - ML-powered analysis of HRCM patterns: `GET /api/insights/smart`
   - Returns insights, trends, predictions, and recommendations
   - Requires at least 2 weeks of data

5. **ML-Based Target Recommendations**
   - Intelligent target suggestions based on historical performance
   - API: `POST /api/insights/ml-targets`
   - Considers improvement rate, momentum, and realistic achievability

### Email Service Setup (Optional):

**For Resend:**
```bash
export RESEND_API_KEY="your_api_key"
export EMAIL_FROM="noreply@yourdomain.com"
```

**For SendGrid:**
```bash
export SENDGRID_API_KEY="your_api_key"
export EMAIL_FROM="noreply@yourdomain.com"
```

Note: Email service is optional. If not configured, the system will log warnings but continue functioning without email notifications.