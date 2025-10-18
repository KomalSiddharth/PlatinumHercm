# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application for tracking and improving Health, Relationship, Career, and Money (HRCM) life areas. It combines goal tracking with personal growth, using weekly HRCM scoring, daily ritual tracking, and course progress monitoring. The system drives engagement through a "Platinum Streak" for consistent activity, real-time feedback, leaderboards, and a progression system. It features AI-powered course recommendations and automated suggestions for problems, feelings, and actions, aiming to provide a structured and engaging approach to personal development.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard uses a clean, responsive "New York" style design with shadcn/ui components and the Inter font, supporting light/dark modes. The primary color is Teal, and the accent color is Coral. It features optimized column widths, reorganized dashboard elements, row-wise daily rituals, and an enhanced admin panel. The HRCM rating system is standards-based, scaled out of 10.

### Technical Implementations
- **Frontend**: React with Vite, shadcn/ui, Tailwind CSS, TanStack Query, and Wouter for routing.
- **Backend**: Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM (`@neondatabase/serverless`), and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` and role-based access control.
- **Data Storage**: Drizzle ORM with an `IStorage` interface, Zod validation for schemas, and Drizzle Kit for migrations.

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking, and comprehensive course progress monitoring.
- **Goal Management**: "Platinum Streak" for consistent engagement, "Platinum Standards" badge for sustained high performance (8+ average across HRCM for 4 consecutive weeks), and a rating increment constraint system (max rating of 7, progressing to 8).
- **Personalization & AI**: AI-powered course recommendations, AI-driven auto-fill for "Next Week Target" suggestions (problems, feelings, actions), and smart AI insights for HRCM patterns.
- **Reporting & Analytics**: PDF export for weekly/monthly HRCM reports, detailed weekly progress analytics with graphical representations, and team analytics with period filtering and a top 10 leaderboard.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System" with auto-conversion of text to interactive checkpoints, and manual checkpoint management.
- **User Interface**: Compact views with tooltips for efficient data display, and popup dialog editing for Current Week fields.
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management (add/delete), and approved email filtering for all analytics.
- **Notifications**: Optional email reminders and Platinum badge notifications.
- **Authentication**: Strict authentication for dashboard and admin panel with role-based access.

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