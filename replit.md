# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to help users track and improve their Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking with personal growth principles, utilizing weekly HRCM scoring, daily ritual tracking, and course progress monitoring. The system aims to foster consistent engagement through a "Platinum Streak" for activity completion, real-time feedback, leaderboards, and a progression system. Key capabilities include AI-powered course recommendations based on Google Sheets data and automated suggestions for problems, feelings, and actions, with the business vision of empowering users with a structured and engaging approach to personal development.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard employs a clean, responsive "New York" style design using shadcn/ui components and the Inter font, supporting both light and dark modes. The primary color is Teal, and the accent color is Coral. The design includes a reorganized dashboard, row-wise daily rituals, and an enhanced admin panel. The HRCM rating system is standards-based, scaled out of 10, calculated via predefined standards. Column widths are optimized to prevent horizontal scrolling. Achievements and Badges sections feature a bright, welcoming color palette with gradient text and optimized text colors for readability.

### Technical Implementations
- **Frontend**: React with Vite, shadcn/ui (Radix UI primitives), Tailwind CSS, TanStack Query for state management, and Wouter for routing.
- **Backend**: Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM (`@neondatabase/serverless`), and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` for password hashing and role-based access control.
- **Data Storage**: Abstracted `IStorage` interface for Drizzle ORM, with Zod validation for `users` table schema. Drizzle Kit manages migrations.

### Feature Specifications
- **Auto-Save**: Changes automatically save on field blur.
- **Automatic Week Progression**: The system automatically advances to the next week after 7 days, saving data and providing a new template, auto-prefilling with previous week's affirmations and checklist items.
- **PDF Export**: Generates weekly and monthly HRCM reports.
- **Email Notifications**: Optional weekly check-in reminders and Platinum badge notifications.
- **Platinum Badge System**: Awards a "Platinum Standards" badge for maintaining an average rating of 8+ across all 4 HRCM categories for 4 consecutive weeks.
- **Smart AI Insights**: ML-powered analysis of HRCM patterns, trends, predictions, and recommendations, including target suggestions.
- **Strict Authentication**: Dashboard and Admin Panel are protected, requiring authentication with automatic redirects to the login page. Admin Panel is accessible only to admin users.
- **Date-Based HRCM History**: Every HRCM table save creates a new timestamped snapshot, providing a complete edit history accessible via a calendar date picker in the History Modal.
- **Rating Increment Constraint System**: Users start with a max rating of 7, progressing to 8 after maintaining 7 for 4 consecutive weeks, with a permanent hard cap at 8 per category. Current Week rating is user-editable with this logic enforced.
- **Platinum Standards**: Each HRCM area has 4 predefined platinum standards (e.g., Health: Eat clean meals, Drink 8–10 glasses water, Move 30 mins daily, Sleep 7–8 hrs no late screens).
- **Weekly Progress Analytics**: Redesigned analytics focus on weekly data across all weeks, including overall progress trends, HRCM area comparisons, and current week progress with graphical bars, accessible via a detailed dialog with multiple chart types.
- **Team Activity Search**: A "Team Activity" tab allows users to search and view team members' HRCM progress.
- **Simplified Daily Rituals**: Rituals are always active, cannot be edited, and automatically allocate 10 points.
- **Course Tracker System**: Comprehensive course library with 19 courses, featuring collapsible module dropdowns with checkbox tracking, real-time progress bars, and color-coded categories. Modules display point values that contribute to the user's total score.
- **Assignment Column with AI & Course Tracker Integration**: Replaced text-based affirmations with a dynamic, unified Assignment column in the Next Week table. This column integrates AI-powered course recommendations (inverse rating logic) and allows direct import of lessons from the Course Tracker via checkboxes.
- **Top 10 Leaderboard Display**: Displays the top 10 users based on daily ritual points; current user is shown at the end if outside the top 10.
- **Next Week Target Checklist System**: Next Week Target columns (Results, Feelings, Beliefs/Reasons, Actions) automatically convert multi-line text entries to interactive, toggleable checkpoint items, stored as `jsonb` in the database.
- **Restored HRCM Dashboard UI**: Includes header buttons for "Save Week" (now "History"), "AI Auto-Fill Next Week", and "Generate Next Week". The "AI Auto-Fill Next Week" button is relocated to the Next Week Target table heading for contextual placement.
- **Auto-Checkpoint Conversion**: Next Week Target columns automatically convert multi-line text inputs to interactive checkpoints, splitting content by newlines and intelligently parsing large entries.
- **AI-Powered Next Week Auto-Fill** (Oct 2025): AI Auto-Fill button analyzes Current Week data (Rating, Results, Feelings, Beliefs/Reasons, Actions) across all 4 HRCM areas and intelligently generates Next Week Target suggestions in checkbox format. Uses OpenAI GPT-5 to provide 2-4 specific, actionable items for each column based on current week performance. Suggestions automatically appear as interactive checkboxes in Results, Feelings, Beliefs, and Actions columns. Endpoint `/api/hercm/ai-autofill-next-week` processes all HRCM areas simultaneously and auto-saves generated checklists. AI analyzes current problems to suggest realistic improvements, transforms negative feelings into positive ones, converts limiting beliefs into empowering affirmations, and provides concrete action steps for the upcoming week.
- **Compact View with Tooltips** (Oct 2025): Both Current Week and Next Week Target tables feature ultra-compact text display with intelligent tooltips. Text in Results, Feelings, Beliefs/Reasons, and Actions columns displays only 2 lines with proper word wrapping and ellipsis for overflow. Long text (50+ characters) automatically shows a tooltip on hover with full content. This prevents table expansion and maintains clean design even with extensive text entries. Current Week columns use simple text with tooltip; Next Week columns use editable checkpoints with tooltip support for items longer than 50 characters.
- **Manual Checkpoint Management** (Oct 2025): Next Week Target table includes "+ Add Checkpoint" buttons in Results, Feelings, Beliefs/Reasons, and Actions columns. Users can manually add checkpoints with inline editing, toggle completion status, and view compact lists showing first 2 items with "X more items..." tooltip for additional entries. All checkpoints are editable inline and auto-save on blur.

## External Dependencies

- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns` (default timezone: Asia/Kolkata).
- **Third-Party Services**:
    - OpenAI (gpt-5 model) via Replit AI Integrations for course recommendations, auto-fill, smart insights, and ML-based target predictions.
    - Google Sheets for user-specific course data.
    - Email Service (Resend/SendGrid) for notifications.
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron` for automated reminders and badge checks.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.