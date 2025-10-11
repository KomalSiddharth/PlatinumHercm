# Platinum HERCM Dashboard

## Overview

The Platinum HERCM Dashboard is a gamified personal development web application that helps users track and improve four key life areas: Health, Relationship, Career, and Money (HERCM). Users engage with weekly HERCM scoring, daily ritual tracking, course progress monitoring, and achievement of "Platinum Streak" status through consistent completion of personal development activities.

The application combines goal tracking with behavioral psychology principles (Law of Attraction, 6 Human Needs, emotional frequency) to create a comprehensive personal growth system. The dashboard provides real-time feedback, leaderboards, and a progression system that encourages sustained engagement through weekly rollovers and achievement milestones.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 11, 2025**
- **Week Comparison Display**: Moved week-over-week comparison from main page to Dialog modal, triggered by clicking the "Weekly Progress" badge (shows for Week 2+)
- **History Data Consistency**: Fixed HERCMHistoryModal to show accurate Week 1 demo data matching the main table
- **Blank Week Generation**: Fixed next week generation logic - Week 1 shows demo data, all subsequent weeks (2, 3, 4+) start with blank templates for user to fill (manually or via AI auto-fill)
- **Data Display Logic**: Both UnifiedHERCMTable and HERCMHistoryModal now follow consistent pattern: Week 1 = demo/sample data, Week 2+ = blank state
- **Next Week Target Placeholders**: Added "Click to add..." placeholder text to all Next Week Target table fields (Result, Feelings, Beliefs, Actions) for better UX when fields are empty
- **Authentication Fix**: Fixed email-based authentication middleware to properly support session-based login alongside OIDC auth - all API routes now support both OIDC (req.user?.claims?.sub) and email-based auth (req.session.userEmail)
- **API Route Addition**: Added `/api/hercm/week/:weekNumber` endpoint to fetch individual week data
- **History Modal Analytics Fix**: Fixed generateHistoricalData fallback to properly calculate progress from checklist items instead of hardcoding 0% - Week 1 now shows 33% progress, Week 2 shows 50%, Week 3+ shows 67%, enabling bar graphs and improvement summary to display meaningful data
- **Week 2 Demo Data**: Added complete demo data for Week 2 showing continuity from Week 1 - Week 1's nextWeekTarget matches Week 2's currentBelief for realistic 100% comparison match
- **Analytics in Comparison Dialog**: Added full analytics section (line chart, bar chart, improvement summary) to the Weekly Progress comparison dialog - same analytics that appear in History modal now also visible in week-over-week comparison for easier access

## System Architecture

### Frontend Architecture

**Framework**: React with Vite as the build tool and development server

**UI Component System**: shadcn/ui (Radix UI primitives) with Tailwind CSS for styling
- Component library follows the "New York" style variant
- Uses CSS variables for theming with support for light/dark modes
- Inter font family for all typography
- Design system emphasizes clarity, minimal friction, and consistent trust

**State Management**: TanStack Query (React Query) for server state and data fetching
- Custom query client configuration with disabled refetching and infinite stale time
- Custom fetch wrapper with credentials support and 401 handling options

**Routing**: Wouter for lightweight client-side routing
- Three main routes: Dashboard (`/`), Auth (`/auth`), and NotFound
- Single-page application pattern with route-based code splitting

**Component Architecture**:
- Modular component structure with isolated, reusable UI components
- Example components provided for development reference
- Components follow controlled/uncontrolled pattern with optional callback props
- Heavy use of composition with Radix UI primitives

**Design System**:
- Color palette: Primary (Teal HSL 174 86% 24%), Accent (Coral HSL 12 100% 65%)
- Category-specific colors for Health (Green), Relationship (Purple), Career (Blue), Money (Gold)
- Responsive grid layouts: HERCM (2-column on md+), Rituals (3-column on lg+)
- Spacing scale based on Tailwind units (2, 4, 6, 8, 12, 16)

### Backend Architecture

**Framework**: Express.js with TypeScript
- ES Modules configuration (`"type": "module"`)
- Custom Vite integration for development with HMR support
- Production build uses esbuild for server bundling

**Storage Layer**: Abstracted storage interface pattern
- `IStorage` interface defines CRUD operations
- `MemStorage` in-memory implementation for development/testing
- Designed to be swapped with Drizzle ORM database implementation
- Currently implements basic user operations (getUser, getUserByUsername, createUser)

**API Structure**: REST API with `/api` prefix
- Routes registered through `registerRoutes` function
- Request/response logging middleware with 80-character truncation
- Error handling middleware with status code and message extraction
- HTTP server created with Node's native `http.createServer`

**Development Features**:
- Vite middleware integration for hot module replacement
- Runtime error overlay plugin
- Replit-specific plugins (cartographer, dev-banner) in development mode
- Request duration logging for API endpoints

### Data Storage Solutions

**Database**: PostgreSQL with Drizzle ORM
- Connection via Neon Database serverless driver (`@neondatabase/serverless`)
- Schema-first approach with Drizzle's TypeScript schema definition
- Zod integration for runtime validation (`drizzle-zod`)

**Schema Design**:
- `users` table with UUID primary key (generated via `gen_random_uuid()`)
- Username and password fields (passwords intended for bcrypt hashing)
- Schema exported as TypeScript types for type safety

**Migration Strategy**:
- Drizzle Kit configured for PostgreSQL dialect
- Migrations output to `./migrations` directory
- Schema source: `./shared/schema.ts`
- Database URL from environment variable `DATABASE_URL`

**Session Management**: 
- `connect-pg-simple` dependency suggests PostgreSQL-backed sessions
- Credentials included in fetch requests (`credentials: "include"`)

### Authentication and Authorization

**Authentication Approach**: Planned implementation (scaffolding in place)
- User schema includes username/password fields
- Auth route (`/auth`) with login/signup modes
- `AuthForm` component handles both authentication flows
- Session-based authentication (cookie credentials in API requests)

**Authorization**: Role-based access control planned
- Admin role detection in UI components (`isAdmin` prop in DashboardHeader)
- 401 handling strategy in query client (configurable return null or throw)
- Protected routes intended for admin verification and data export

**Security Considerations**:
- Server-side timestamp generation (mentioned in requirements)
- HTTPS enforcement intended
- Bcrypt for password hashing (planned)
- No client-side trust for audit data

### External Dependencies

**UI Component Libraries**:
- Radix UI primitives (accordion, dialog, dropdown, select, toast, tooltip, etc.)
- `cmdk` for command palette functionality
- `embla-carousel-react` for carousel components
- `class-variance-authority` and `clsx` for conditional styling
- `lucide-react` for icons

**Date/Time Handling**:
- `date-fns` library for date manipulation and formatting
- Asia/Kolkata timezone as default for calculations

**Development Tools**:
- Replit-specific plugins for development experience
- Vite plugins for error handling and dev tooling
- ESLint and Prettier (mentioned in requirements, not in package.json)

**Monitoring & Analytics**: Not yet implemented

**Third-Party Services**: None currently integrated (Supabase Auth mentioned as option but not implemented)

**Cron/Scheduling**: 
- Weekly rollover job intended as server script
- No scheduler integration visible in current codebase

**Testing Framework**: 
- Playwright for E2E testing (mentioned in requirements)
- Unit tests intended for critical functions
- No test files present in current structure