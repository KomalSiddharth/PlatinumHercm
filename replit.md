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
- OpenAI (gpt-5 model) via Replit AI Integrations for course recommendations and auto-fill.
- Google Sheets for user-specific course data.

**Database Driver**:
- `@neondatabase/serverless` for PostgreSQL connection.