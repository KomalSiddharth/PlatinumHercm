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