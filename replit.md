# Platinum HRCM Dashboard

## Overview
The Platinum HRCM Dashboard is a gamified web application designed to help users track and improve their Health, Relationships, Career, and Money (HRCM) aspects of life. It integrates goal tracking with personal growth principles, enabling users to achieve a "Platinum Streak" through consistent engagement with weekly HRCM scoring, daily rituals, and course progress. The system provides real-time feedback, leaderboards, a progression system, and AI-powered recommendations to foster sustained personal development. The application supports AI-driven course recommendations based on user Google Sheets data and automates problem/feeling/action suggestions.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
The dashboard features a clean, responsive "New York" style design using shadcn/ui components and the Inter font, with both light and dark mode support. The layout is optimized for clarity, including row-wise daily rituals and an enhanced admin panel. The HRCM rating system is standardized, with all categories rated out of 10 based on user-selected predefined criteria.

### Technical Implementations
- **Frontend**: React with Vite, shadcn/ui (Radix UI, Tailwind CSS), TanStack Query for state management, and Wouter for routing. Uses a modular design system with a Teal and Coral color palette.
- **Backend**: Express.js with TypeScript (ES Modules) providing a REST API. It includes session-based authentication with `bcrypt` for password hashing and planned role-based access control.
- **Data Storage**: PostgreSQL with Drizzle ORM (`@neondatabase/serverless`), managing migrations via Drizzle Kit. `connect-pg-simple` handles session storage.

### Feature Specifications
- **Auto-Save**: Automatic saving on field blur.
- **Automatic Week Progression**: System progresses to the next week after 7 days, saving previous data and providing a new template.
- **Reporting**: PDF export for weekly and monthly HRCM reports.
- **Notifications**: Optional email notifications for weekly check-ins and Platinum badge awards.
- **Gamification**: "Platinum Standards" badge awarded for monthly progress exceeding 80%.
- **AI Integration**: AI-powered insights for HRCM patterns, trends, predictions, and ML-based target recommendations using OpenAI.
- **Rating Progression System**: Users start with a max rating of 7 in HRCM categories, which can progressively increase by 1 after maintaining the max rating for 4 consecutive weeks per category.
- **Simplified Daily Rituals**: Rituals are always active, cannot be edited post-creation, and automatically allocate 10 points.
- **Course Section Enhancement**: Includes a video checklist feature where course progress is automatically updated based on video completion percentage.
- **Weekly Progress Analytics**: Redesigned analytics to show all weeks' data, focusing on overall progress trends and current week performance with graphical progress bars.
- **Team Activity Search**: A "Team Activity" section in the user dashboard allows searching and viewing team members' HRCM progress with compact user cards.

### System Design Choices
- Abstracted `IStorage` interface for data layer flexibility.
- Robust API with logging and error handling.
- UUIDs for user identification and Zod for validation.
- Scheduled tasks via `node-cron` for automated processes.

## External Dependencies

- **UI/Charting Libraries**: Radix UI, `cmdk`, `embla-carousel-react`, `class-variance-authority`, `clsx`, `lucide-react`, `recharts`.
- **Date/Time**: `date-fns` (default timezone: Asia/Kolkata).
- **File Upload**: `@uppy/core`, `@uppy/react`, `@uppy/aws-s3`, `@uppy/dashboard` for profile picture uploads.
- **Third-Party Services**:
    - OpenAI (gpt-5 model) via Replit AI Integrations for course recommendations, auto-fill, smart insights, and ML-based target predictions.
    - Google Sheets for user-specific course data.
    - Replit Object Storage (Google Cloud Storage backend) for profile picture storage.
    - Email Service (Resend/SendGrid) for notifications.
- **PDF Generation**: `pdfkit`.
- **Scheduled Tasks**: `node-cron`.
- **Database Driver**: `@neondatabase/serverless` for PostgreSQL.