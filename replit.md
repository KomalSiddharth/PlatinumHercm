# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to track and enhance personal development across Health, Relationship, Career, and Money (HRCM) life areas. It integrates goal tracking, daily ritual monitoring, and course progress into a single system. Key features include a "Platinum Streak" for consistent activity, real-time feedback, leaderboards, and a progression system to motivate users. The dashboard leverages AI for course recommendations and automated suggestions to address personal challenges, providing a structured and engaging path to personal growth and self-improvement. The project aims to empower users to achieve their personal goals through a gamified and data-driven approach.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard features a clean, responsive "New York" style design utilizing shadcn/ui components and the Inter font, with support for both light and dark modes. The primary color is Teal, and the accent is Coral. It includes optimized layouts, a standards-based HRCM rating system scaled out of 10, and a consistent color palette for HRCM cards (Health: Green, Relationship: Purple, Career: Blue, Money: Purple). The application is built with a mobile-first approach, ensuring optimal user experience across various devices through responsive padding, spacing, text sizes, and grid layouts. Interactive elements are touch-friendly, and specific components like the `UnifiedHRCMTable` and `EmotionalTracker` are designed for responsive display.

### Technical Implementations
The frontend is built with React, Vite, Tailwind CSS, TanStack Query, and Wouter for routing. The backend uses Express.js with TypeScript (ES Modules), PostgreSQL with Drizzle ORM, and `connect-pg-simple` for session management. Authentication is session-based with `bcrypt` and implements role-based access control. Data persistence is managed via Drizzle ORM with an `IStorage` interface, Zod validation, and Drizzle Kit for migrations. The system employs an UPSERT logic for saving checkbox states to prevent duplicate database entries and ensures data integrity. A deduplication scoring mechanism selects the most complete weekly data when multiple entries exist.

### Feature Specifications
- **Core Tracking**: Weekly HRCM scoring, daily ritual tracking, comprehensive course progress monitoring with persistent lesson checkboxes, and a Daily Emotional Tracker across 9 time slots. Calendar history navigation allows users to view past HRCM data.
- **Life Problems & Life Skill Map**: An Excel-like tabular structure mapping problems to skills, with collapsible course categories and clickable links, featuring distinct color headers and a responsive design.
- **Goal Management**: "Platinum Streak" for consistent engagement, "Platinum Standards" badge for sustained performance, and a rating increment constraint system.
- **Personalization & AI**: AI-powered course recommendations, AI-driven auto-fill for "Next Week Target" suggestions (problems, feelings, actions), and smart AI insights for HRCM patterns.
- **Reporting & Analytics**: PDF export for reports, detailed weekly progress analytics with graphical representations (Bar and Line Charts with 0-100% Y-axis), and a team leaderboard. The analytics tab includes pagination, displays complete weekly history, and auto-updates upon changes to approved emails. Data cascade deletion ensures all associated user data is removed when an approved email is deleted.
- **Interactive Elements**: Auto-save on field blur, automatic week progression, "Next Week Target Checklist System," popup dialog editing, and hover popup cards for efficient data display.
- **Emotional Tracking**: Daily Emotional Tracker with 9 time slots, color-coded inputs, auto-save, and data persistence, stored with a unique constraint.
- **User Interface**: Compact views with tooltips, popup editing, hover cards, and calendar history navigation to view historical HRCM data.
- **Team Dashboard Search (Oct 27, 2025)**: Complete team member dashboard viewer available to BOTH admin users (in Admin Panel → User Dashboards) AND regular users (in User Dashboard → Team Dashboard Search). Users can search team members by name/email and view their complete dashboard. Features **Week Selector dropdown** allowing users to choose which specific week's HRCM data to view (instead of showing all weeks at once), automatically defaulting to latest week. Dashboard includes: Selected week's HRCM table data, Daily Rituals section with read-only checkboxes matching exact user dashboard appearance (blue background #00008c, points badges, pause badges, AND working history button with Clock icon showing current month's completion calendar), Daily Emotional Tracker displaying all 9 time slots with emotion data, and Earned Badges section. Search results show user avatar, name, latest week stats, overall score, and HRCM ratings before viewing full dashboard. Course Progress section is intentionally excluded from team search view for user-facing dashboard (only visible in Admin User Dashboard Viewer for admin panel access).
- **Admin Functionality**: Enhanced admin panel with user analytics, course recommendation management, approved email filtering, and a comprehensive user dashboard viewer. Admin routes are protected, and the panel includes help documentation for metrics.
- **Assignment Column**: Unified assignment column displaying user-selected and admin-recommended items, with compact views and detailed hover popups. Assignments persist across sessions.
- **Notifications**: Optional email reminders and Platinum badge notifications.
- **Authentication**: Strict authentication with role-based access for both dashboard and admin panel.

## External Dependencies
- **UI Component Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time Handling**: `date-fns`.
- **Third-Party Services**: OpenAI (gpt-5 model), Google Sheets, Email Service (Resend/SendGrid).
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron`.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.