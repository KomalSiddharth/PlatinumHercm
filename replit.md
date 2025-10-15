# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to help users track and improve their Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking with personal growth principles, utilizing weekly HRCM scoring, daily ritual tracking, and course progress monitoring. The system aims to foster consistent engagement through a "Platinum Streak" for activity completion, real-time feedback, leaderboards, and a progression system. Key capabilities include AI-powered course recommendations based on Google Sheets data and automated suggestions for problems, feelings, and actions. The project envisions significant market potential by empowering users with a structured and engaging approach to personal development.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard employs a clean, responsive "New York" style design using shadcn/ui components and the Inter font, supporting both light and dark modes. The color palette is Teal (Primary) and Coral (Accent). Key UI elements include a reorganized dashboard layout, row-wise daily rituals, and an enhanced admin panel. The HRCM rating system is standards-based, with all categories (Health, Relationship, Career, Money) scaled out of 10, calculated via predefined standards selected in a dialog. Column widths are optimized to prevent horizontal scrolling.

**Achievement & Badges Section** (Oct 2025): Redesigned with light yellow theme (from-yellow-50 to-amber-100, dark:from-yellow-950/20 to-amber-950/20) featuring a bright, welcoming color palette. Headings use gradient text (from-primary to-accent) matching the ritual points header styling. User points displayed with same background as ritual points in header (bg-gradient-to-r from-primary to-accent). All text colors optimized for readability using gray tones (gray-800, gray-700 for light mode; gray-200, gray-300 for dark mode).

### Technical Implementations
- **Frontend**: React with Vite, shadcn/ui (Radix UI primitives) and Tailwind CSS, TanStack Query for state management, and Wouter for routing.
- **Backend**: Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM (`@neondatabase/serverless`), and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` for password hashing and planned role-based access control.
- **Data Storage**: Abstracted `IStorage` interface for Drizzle ORM, with Zod validation for `users` table schema (UUIDs). Migrations are managed by Drizzle Kit.

### Feature Specifications
- **Auto-Save**: Changes automatically save on field blur.
- **Automatic Week Progression**: The system automatically advances to the next week after 7 days from creation, saving data and providing a new template.
- **PDF Export**: Generates weekly and monthly HRCM reports.
- **Email Notifications**: Optional weekly check-in reminders and Platinum badge notifications.
- **Platinum Badge System**: Awards a "Platinum Standards" badge for maintaining an average rating of 8+ across all 4 HRCM categories for 4 consecutive weeks.
- **Smart AI Insights**: ML-powered analysis of HRCM patterns, trends, predictions, and recommendations.
- **ML-Based Target Recommendations**: Intelligent target suggestions based on historical performance.
- **Next Week Target Rating**: Uses the same standards-based logic as Current Week rating, with progression badges displaying when at max rating.
- **Weekly Auto-Reset** (Oct 2025): After exactly 7 days from week creation, the system automatically creates a new empty week. Current Week table becomes empty for fresh data entry. Next Week Target table auto-prefills with the previous week's affirmations and checklist items for seamless weekly progression.
- **Strict Authentication** (Oct 2025): Dashboard and Admin Panel are now strictly protected. Users cannot access these pages via direct URL without authentication - automatic redirect to login page enforced. Admin Panel accessible only to admin users; regular users are redirected to dashboard.
- **Date-Based HRCM History**: Every HRCM table save creates a new timestamped snapshot, providing a complete edit history. The history section is automatically visible on page load with the newest snapshot selected.
- **Rating Increment Constraint System**: Users start with a max rating of 7, which progressively increases to 8 after maintaining a rating of 7 for 4 consecutive weeks. The maximum rating is permanently capped at 8 - users can never achieve a rating of 9 or 10, regardless of checklist completion. This is tracked independently per category. The UI displays ratings out of 10, but the backend enforces the hard cap at 8.
- **Platinum Standards (4 per area)**: Each HRCM area has exactly 4 predefined platinum standards for consistency:
  - **Health**: Eat clean meals, Drink 8–10 glasses water, Move 30 mins daily, Sleep 7–8 hrs no late screens
  - **Relationship**: Communicated with respect and kindness, Practiced active and empathetic listening, Showed appreciation and gratitude to others, Resolved conflicts peacefully and constructively
  - **Career**: Added significant value in all work tasks, Focused on serving others and contributing positively, Invested time in developing professional skills, Maintained positive and productive work mindset
  - **Money**: Practiced abundance mindset and generosity, Developed money-making skills and opportunities, Made wise and conscious financial decisions, Expressed gratitude for financial blessings
- **Weekly Progress Analytics**: Redesigned analytics focus on weekly data across all weeks, including overall progress trends, HRCM area comparisons, and current week progress with graphical bars. Monthly views have been removed.
- **Team Activity Search**: A new "Team Activity" tab in the user dashboard allows users to search and view team members' HRCM progress with compact user cards.
- **Simplified Daily Rituals**: Rituals are always active, cannot be edited after creation, and automatically allocate 10 points.
- **Course Section Enhancement**: Removed time display and "Update" button. Includes a video checklist functionality where progress bars automatically update based on video completion percentage.
- **AI Course Module Checkboxes** (Oct 2025): Course suggestions now stored as jsonb with structured module data. Each course displays 5 modules with checkboxes for completion tracking. Module completion state auto-saves on toggle. History section displays course data properly. User auto-creation prevents FK constraint violations during OIDC auth.
- **Course Tracker System** (Oct 2025): Comprehensive course library with 19 courses including LOA, NLP, Health, Wealth, Relationship, Career, and specialized certifications. Each course card features collapsible module dropdowns with checkbox tracking, real-time progress bars, and color-coded categories. Progress auto-calculates based on completed modules. Modules structure ready for lesson data integration.
- **Assignment Column with AI & Course Tracker Integration** (Oct 2025): Replaced text-based affirmations with dynamic Assignment column in Next Week table. Features AI-powered course recommendations (inverse rating logic: 1-2 rating→5 courses, 3-4→3 courses, 5-7→2 courses) and Course Tracker lesson imports. Each HRCM category stores assignment as jsonb with courses and lessons arrays. UI includes cyan-styled course cards with checkboxes, progress bars, refresh buttons, and category selection dialog for importing lessons. Auto-saves on checkbox toggle. **Auto-Assignment Feature**: When users check any lesson in Course Tracker, a category selection dialog automatically appears, allowing instant addition to Assignment column. Endpoints: `/api/courses/recommend-assignment` for AI suggestions, `/api/assignment/add-lessons` for Course Tracker integration.
- **Top 10 Leaderboard Display** (Oct 2025): Leaderboard now displays top 10 users (increased from top 5) based on daily ritual points. If current user is outside top 10, they are displayed at the end for visibility.
- **Checkbox UI Enhancements** (Oct 2025): Removed strikethrough styling from all checked items across Current Week Platinum Standards, Next Week Assignment, and Next Week Platinum Standards columns for cleaner visual presentation. Next Week Target columns (Results, Feelings, Beliefs/Reasons, Actions) convert multi-line text entries to checkbox items automatically with direct click-to-edit functionality (no separate Edit button).
- **Next Week Target Checklist System** (Oct 2025): Added database columns and backend logic to properly save and display Next Week Target checkboxes. Each HRCM area now has 4 separate checklist fields (resultChecklist, feelingsChecklist, beliefsChecklist, actionsChecklist) stored as jsonb in database. Multi-line text entries are automatically converted to persistent checkboxes on save.

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