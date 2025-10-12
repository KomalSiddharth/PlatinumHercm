# Platinum HERCM Dashboard

## Overview

The Platinum HERCM Dashboard is a gamified personal development web application that helps users track and improve four key life areas: Health, Relationship, Career, and Money (HERCM). Users engage with weekly HERCM scoring, daily ritual tracking, course progress monitoring, and achievement of "Platinum Streak" status through consistent completion of personal development activities.

The application combines goal tracking with behavioral psychology principles (Law of Attraction, 6 Human Needs, emotional frequency) to create a comprehensive personal growth system. The dashboard provides real-time feedback, leaderboards, and a progression system that encourages sustained engagement through weekly rollovers and achievement milestones.

## User Preferences

Preferred communication style: Simple, everyday language.

## Recent Changes

**October 12, 2025 - Session 2: Full Persistence & AI Integration Complete**
- **✅ Database Schema Extended**: Added `rituals`, `ritual_completions`, and `courses` tables with proper foreign key relationships
- **✅ Rituals & Courses Persistence**: Complete CRUD operations for rituals (create, update, delete, toggle completion) with database storage; Dashboard now fetches rituals from database instead of local state
- **✅ OpenAI Integration Live**: AI-powered course recommendations and auto-fill (Problems/Feelings/Actions) using gpt-5 model via Replit AI Integrations
- **✅ Critical UPSERT Bug Fix**: Fixed duplicate week creation - save endpoint now properly updates existing weeks instead of creating duplicates
  - Changed `upsertUser` conflict target from `users.id` to `users.email` to prevent duplicate user errors
  - Implemented proper UPSERT logic in `/api/hercm/save-with-comparison`: checks if week exists, updates if found, creates if not
- **✅ Data Transformation Fix**: GET `/api/hercm/week/:weekNumber` now transforms database flat columns back to beliefs array format for UI
  - Database stores: healthProblems, relationshipCurrentFeelings, careerCurrentActions, etc.
  - Frontend expects: beliefs array with category objects
  - Transformation ensures saved data displays correctly after page reload
- **✅ Security Enhancements**: All update/delete operations verify userId ownership; unauthorized access returns 404
- **✅ E2E Test Validation**: Complete test suite confirms no duplicate weeks, data persists across reloads, UI displays database values correctly
- **Removed**: "(auto: X+1)" text from Next Week Target Rating display (now just shows blue badge)

**October 12, 2025 - Session 1**
- **Complete Data Persistence Implementation**: All HERCM data now saves to database and displays in History modal
  - **Database Mapping**: Problems/Feelings/Actions fields map to category-specific columns (healthProblems, relationshipCurrentFeelings, careerCurrentActions, etc.)
  - **H-E-R-C-M Default Values**: All rating columns (currentH/E/R/C/M) default to 1 to prevent NaN errors in calculations
  - **Save Mutation**: UnifiedHERCMTable POST to /api/hercm/save-with-comparison endpoint successfully saves edits to database
  - **User Auto-Creation**: Login flow uses upsertUser to create user record if not exists, preventing foreign key violations
  - **History Modal Fix**: Removed week filter (weekNumber < currentWeek) so ALL saved weeks including current Week 1 display in History modal
  - **E2E Test Success**: All 17 test steps passing - users can edit Problems/Feelings/Actions, save to database, view in History modal
- **Next Week Target Rating Auto-Calculation**: Fixed to be read-only and auto-calculated as currentRating + 1
  - **Read-Only Display**: Replaced editable input with blue badge showing target rating
  - **Auto-Calculate Logic**: When current rating changes, target automatically updates to current+1 (e.g., 4→5, 7→8)
  - **Visual Indicator**: Shows "(auto: X+1)" text to indicate it's calculated automatically
  - **User Prevention**: Users cannot manually edit target rating - it's always exactly 1 point higher than current rating

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
- **Platinum Streak Section Removal**: Completely removed PlatinumProgress component from Dashboard - no more Platinum Streak Progress card or week progression indicators
- **History Modal Cleanup**: Removed all analytics (charts, graphs) from History modal - now shows only week-wise table snapshots; title changed to "HERCM History"
- **History Modal Table Format Update**: Updated History modal to show exact Current Week table format with all columns (Rating, Problems, Feelings, Beliefs/Reasons, Actions, AI Course, Checklist, Progress) matching the main Current Week table design
- **Monthly Analytics Enhancement**: Monthly Progress Analytics now displays all 12 months (January-December) in the month selector dropdown; dropdown shows only month names (no week ranges); each month's analytics shows Week 1-4 (relative to that month, not cumulative); line chart, bar chart, and improvement summary all display weeks as 1-4 for any selected month; gracefully handles months without data by using template fallbacks
- **Admin Panel Enhancement - Coach/Trainer Platform**: Transformed admin panel into professional coach/trainer dashboard (rated 9/10 by user)
  - **Enhanced Analytics Dashboard**: Added summary cards (Total Users, Avg Achievement, Top Performers, Need Support) and comparison bar charts (Achievement Rate, Score Distribution) using Recharts
  - **User Drill-Down View**: Added UserDetailDialog showing complete HERCM history for any user with summary cards, week-by-week breakdown, and progress trend line chart - enables coach to verify user claims with proof
  - **Access Log Tracking**: Admin login now creates access_logs entries for audit trail (email, status, IP, user agent, timestamp)
  - **Route Fix**: Added /admin → /admin/login redirect in App.tsx for better UX
  - **Auth Middleware Fix**: Updated isAdmin middleware to support both session-based admin auth (req.session.isAdmin) and OIDC auth (req.user.claims) for dual authentication support
  - **Approved Emails System**: Working access control - only approved emails can login to user dashboard

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