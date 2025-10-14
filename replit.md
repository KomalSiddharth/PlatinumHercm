# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to help users track and improve their Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking with personal growth principles, utilizing weekly HRCM scoring, daily ritual tracking, and course progress monitoring. The system aims to foster consistent engagement through a "Platinum Streak" for activity completion, real-time feedback, leaderboards, and a progression system. Key capabilities include AI-powered course recommendations based on Google Sheets data and automated suggestions for problems, feelings, and actions. The project envisions significant market potential by empowering users with a structured and engaging approach to personal development.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard employs a clean, responsive "New York" style design using shadcn/ui components and the Inter font, supporting both light and dark modes. The color palette is Teal (Primary) and Coral (Accent). Key UI elements include a reorganized dashboard layout, row-wise daily rituals, and an enhanced admin panel. The HRCM rating system is standards-based, with all categories (Health, Relationship, Career, Money) scaled out of 10, calculated via predefined standards selected in a dialog. Column widths are optimized to prevent horizontal scrolling.

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
- **Date-Based HRCM History**: Every HRCM table save creates a new timestamped snapshot, providing a complete edit history. The history section is automatically visible on page load with the newest snapshot selected.
- **Rating Increment Constraint System**: Users start with a max rating of 7, which progressively increases by 1 after maintaining the current max for 4 consecutive weeks, up to a maximum of 10. This is tracked independently per category.
- **Weekly Progress Analytics**: Redesigned analytics focus on weekly data across all weeks, including overall progress trends, HRCM area comparisons, and current week progress with graphical bars. Monthly views have been removed.
- **Team Activity Search**: A new "Team Activity" tab in the user dashboard allows users to search and view team members' HRCM progress with compact user cards.
- **Simplified Daily Rituals**: Rituals are always active, cannot be edited after creation, and automatically allocate 10 points.
- **Course Section Enhancement**: Removed time display and "Update" button. Includes a video checklist functionality where progress bars automatically update based on video completion percentage.

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