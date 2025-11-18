# Platinum HRCM Dashboard - API Documentation

## Table of Contents
- [Overview](#overview)
- [Authentication](#authentication)
- [Base URL](#base-url)
- [Response Format](#response-format)
- [Error Handling](#error-handling)
- [Endpoints](#endpoints)
  - [Authentication](#authentication-endpoints)
  - [HRCM Data](#hrcm-data-endpoints)
  - [Platinum Standards](#platinum-standards-endpoints)
  - [Daily Rituals](#daily-rituals-endpoints)
  - [Emotional Tracker](#emotional-tracker-endpoints)
  - [Course Tracking](#course-tracking-endpoints)
  - [Team & User Management](#team--user-management-endpoints)
  - [Analytics](#analytics-endpoints)
  - [Admin](#admin-endpoints)

---

## Overview

The Platinum HRCM Dashboard API provides endpoints for managing personal development tracking across Health, Relationship, Career, and Money (HRCM) life areas. The API supports gamification features, course tracking, team collaboration, and comprehensive analytics.

**Version:** 1.0.0  
**Protocol:** REST  
**Data Format:** JSON

---

## Authentication

### Session-Based Authentication
The API uses session-based authentication with Express Session and Passport.js.

**Session Cookie:** `connect.sid`  
**Storage:** PostgreSQL (connect-pg-simple)  
**Expiry:** 7 days

### Authentication Flow
1. User submits credentials via `/api/auth/login`
2. Server validates against approved emails whitelist
3. Session cookie is set on successful authentication
4. Cookie is sent with all subsequent requests

### Protected Routes
All routes except `/api/auth/login` and `/api/auth/register` require authentication.

---

## Base URL

**Development:** `http://localhost:5000`  
**Production:** `https://your-replit-app.replit.app`

---

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response
```json
{
  "error": "Error message description"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

---

## Error Handling

All errors return a JSON object with an `error` field:
```json
{
  "error": "Detailed error message"
}
```

Common errors:
- **401 Unauthorized:** No valid session or login required
- **403 Forbidden:** Email not approved or insufficient permissions
- **500 Internal Server Error:** Server-side error (check logs)

---

## Endpoints

---

## Authentication Endpoints

### POST /api/auth/register
Register a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "isAdmin": false
  }
}
```

**Validation:**
- Email must be approved in `approved_emails` table
- Password minimum 6 characters
- Email must be unique

---

### POST /api/auth/login
Authenticate a user and create a session.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200):**
```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "isAdmin": false
  }
}
```

**Errors:**
- `401` - Invalid credentials
- `403` - Email not approved

---

### POST /api/auth/logout
Destroy the current session.

**Response (200):**
```json
{
  "success": true
}
```

---

### GET /api/auth/user
Get current authenticated user information.

**Response (200):**
```json
{
  "id": 1,
  "email": "user@example.com",
  "name": "John Doe",
  "isAdmin": false
}
```

**Response (401):**
```json
{
  "error": "Not authenticated"
}
```

---

## HRCM Data Endpoints

### GET /api/hrcm-data/:date
Get HRCM data for a specific date.

**Parameters:**
- `date` (path) - Date string in format `YYYY-MM-DD`

**Response (200):**
```json
{
  "beliefs": [
    {
      "category": "Health",
      "currentRating": 5,
      "targetRating": 7,
      "problems": "Inconsistent sleep schedule",
      "currentFeelings": "Tired, low energy",
      "currentBelief": "Sleep is less important than work",
      "currentActions": "Set bedtime alarm, limit screen time",
      "result": "Improved energy levels by 30%",
      "nextFeelings": "Energized and focused",
      "nextWeekTarget": "Consistent 7-hour sleep",
      "nextActions": "Maintain sleep schedule",
      "checklist": [
        {
          "id": "uuid",
          "text": "Get 7 hours of sleep",
          "isChecked": true
        }
      ]
    }
  ]
}
```

**Query Parameters (optional):**
- `viewAsUserId` - View another user's data (team/admin only)

---

### POST /api/hrcm-data/:date
Save or update HRCM data for a specific date.

**Parameters:**
- `date` (path) - Date string in format `YYYY-MM-DD`

**Request Body:**
```json
{
  "category": "Health",
  "currentRating": 5,
  "targetRating": 7,
  "problems": "Inconsistent sleep schedule",
  "currentFeelings": "Tired",
  "currentBelief": "Sleep is less important than work",
  "currentActions": "Set bedtime alarm",
  "result": "Improved energy",
  "nextFeelings": "Energized",
  "nextWeekTarget": "Consistent sleep",
  "nextActions": "Maintain schedule"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Validation:**
- `category`: Must be one of "Health", "Relationship", "Career", "Money"
- `currentRating`: Integer 0-10
- `targetRating`: Integer 0-10

---

## Platinum Standards Endpoints

### GET /api/platinum-standards
Get all platinum standards for all HRCM categories.

**Response (200):**
```json
{
  "Health": [
    {
      "id": "h1",
      "category": "Health",
      "text": "Sleep 7-8 hours daily",
      "order": 1
    }
  ],
  "Relationship": [...],
  "Career": [...],
  "Money": [...]
}
```

---

### GET /api/platinum-standard-ratings/:dateString
Get platinum standard ratings for the authenticated user on a specific date.

**Parameters:**
- `dateString` (path) - Date in format `YYYY-MM-DD`

**Response (200):**
```json
{
  "Health": [
    {
      "standardId": "h1",
      "rating": 7
    }
  ],
  "Relationship": [...],
  "Career": [...],
  "Money": [...]
}
```

**Rating Scale:** 0-7 (How many days in the week the standard was followed)

---

### POST /api/platinum-standard-ratings/:dateString
Save platinum standard ratings for a specific date.

**Parameters:**
- `dateString` (path) - Date in format `YYYY-MM-DD`

**Request Body:**
```json
{
  "category": "Health",
  "ratings": [
    {
      "standardId": "h1",
      "rating": 7
    },
    {
      "standardId": "h2",
      "rating": 6
    }
  ]
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Features:**
- UPSERT logic preserves historical timestamps
- Auto-backup to Supabase on every save
- Updates unlock progress tracking

---

### GET /api/team/user/:userId/platinum-standard-ratings/:dateString
Get platinum standard ratings for a specific user (team member viewing).

**Parameters:**
- `userId` (path) - User's email address
- `dateString` (path) - Date in format `YYYY-MM-DD`

**Response (200):**
```json
{
  "Health": [
    {
      "standardId": "h1",
      "rating": 7
    }
  ],
  "Relationship": [...],
  "Career": [...],
  "Money": [...]
}
```

**Access:** Requires authenticated user (team member access)

---

### GET /api/admin/user/:userId/platinum-standard-ratings/:dateString
Get platinum standard ratings for a specific user (admin viewing).

**Parameters:**
- `userId` (path) - User's email address
- `dateString` (path) - Date in format `YYYY-MM-DD`

**Response (200):**
Same as team endpoint

**Access:** Requires `isAdmin: true`

---

### GET /api/unlock-progress/:category
Get unlock progress for a specific HRCM category.

**Parameters:**
- `category` (path) - One of "Health", "Relationship", "Career", "Money"

**Response (200):**
```json
{
  "category": "Health",
  "consecutiveDays": 5,
  "unlocked7Rating": false,
  "daysRemaining": 2
}
```

**Unlock Logic:**
- Requires 7/7 rating on ALL standards for 7 consecutive days
- Unlocks ability to rate 7 in main HRCM column
- Independent tracking per category

---

## Daily Rituals Endpoints

### GET /api/daily-rituals
Get all daily rituals for the authenticated user.

**Response (200):**
```json
{
  "rituals": [
    {
      "id": 1,
      "userId": "user@example.com",
      "ritualName": "Joined Magic of 6",
      "points": 10,
      "createdAt": "2025-11-18T10:00:00.000Z"
    }
  ]
}
```

---

### POST /api/daily-rituals
Create a new daily ritual.

**Request Body:**
```json
{
  "ritualName": "Morning Meditation",
  "points": 10
}
```

**Response (201):**
```json
{
  "success": true,
  "ritual": {
    "id": 2,
    "userId": "user@example.com",
    "ritualName": "Morning Meditation",
    "points": 10
  }
}
```

---

### GET /api/daily-rituals/:date
Get ritual completion status for a specific date.

**Parameters:**
- `date` (path) - Date in format `YYYY-MM-DD`

**Response (200):**
```json
{
  "completedRituals": [
    {
      "ritualId": 1,
      "ritualName": "Joined Magic of 6",
      "completed": true,
      "points": 10
    }
  ]
}
```

---

### POST /api/daily-rituals/:date/toggle
Toggle completion status of a ritual for a specific date.

**Parameters:**
- `date` (path) - Date in format `YYYY-MM-DD`

**Request Body:**
```json
{
  "ritualId": 1,
  "completed": true
}
```

**Response (200):**
```json
{
  "success": true,
  "pointsChange": 10
}
```

**Features:**
- Instant optimistic updates
- Auto-save on toggle
- Points system integration

---

## Emotional Tracker Endpoints

### GET /api/emotional-tracker/:date
Get emotional tracker data for a specific date.

**Parameters:**
- `date` (path) - Date in format `YYYY-MM-DD`

**Response (200):**
```json
{
  "date": "2025-11-18",
  "slot_6_9": "Energetic and ready",
  "slot_9_12": "Focused on work",
  "slot_12_3": "Productive",
  "slot_3_6": "Slightly tired",
  "slot_6_9_pm": "Relaxed",
  "slot_9_12_am": "Calm",
  "slot_12_3_am": "Sleeping",
  "slot_3_6_am": "Deep sleep",
  "slot_overall": "Great day overall"
}
```

---

### POST /api/emotional-tracker/:date
Save emotional tracker data for a specific date.

**Parameters:**
- `date` (path) - Date in format `YYYY-MM-DD`

**Request Body:**
```json
{
  "slot_6_9": "Energetic and ready",
  "slot_9_12": "Focused on work",
  "slot_overall": "Great day overall"
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Features:**
- Auto-save on blur
- Color-coded slots
- All slots optional

---

## Course Tracking Endpoints

### GET /api/courses/tracking
Get real-time course data from Google Sheets.

**Response (200):**
```json
{
  "courses": [
    {
      "id": "platinum-dmp",
      "name": "Platinum DMP",
      "url": "https://example.com/course",
      "lessons": [
        {
          "id": "lesson-1",
          "title": "Introduction",
          "url": "https://example.com/lesson-1"
        }
      ],
      "order": 1
    }
  ]
}
```

**Features:**
- Real-time Google Sheets sync
- 30-second polling
- Zero caching
- Natural sheet ordering
- Course merging for related content

---

### GET /api/courses/progress
Get user's course completion progress.

**Response (200):**
```json
{
  "progress": {
    "platinum-dmp": {
      "completedLessons": 45,
      "totalLessons": 63,
      "percentage": 71
    }
  }
}
```

---

### POST /api/courses/progress
Update course lesson completion status.

**Request Body:**
```json
{
  "courseId": "platinum-dmp",
  "lessonId": "lesson-1",
  "completed": true
}
```

**Response (200):**
```json
{
  "success": true,
  "pointsAwarded": 5
}
```

**Features:**
- Auto-sync to Assignment column
- Points system integration
- Optimistic updates

---

## Team & User Management Endpoints

### GET /api/team/search-users
Search for team members by name or email.

**Query Parameters:**
- `q` (required) - Search query string

**Example:** `/api/team/search-users?q=komal`

**Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "email": "komal@example.com",
      "name": "Komal Sharma",
      "isAdmin": false
    }
  ]
}
```

**Features:**
- Case-insensitive search
- Searches name and email fields
- Minimum 2 characters required

---

### GET /api/team/user/:userId/hrcm-data/:date
View another team member's HRCM data.

**Parameters:**
- `userId` (path) - User's email address
- `date` (path) - Date in format `YYYY-MM-DD`

**Response (200):**
Same format as `/api/hrcm-data/:date`

**Access:** All authenticated users

---

## Analytics Endpoints

### GET /api/analytics/:month
Get monthly analytics data.

**Parameters:**
- `month` (path) - Month in format `YYYY-MM` (e.g., `2025-11`)

**Response (200):**
```json
{
  "month": "2025-11",
  "dailyProgress": [
    {
      "date": "2025-11-01",
      "Health": 71,
      "Relationship": 85,
      "Career": 60,
      "Money": 78,
      "average": 73.5
    }
  ],
  "summary": {
    "averageProgress": 73.5,
    "bestDay": "2025-11-15",
    "worstDay": "2025-11-03",
    "totalDaysTracked": 18
  }
}
```

**Progress Calculation Formula:**
```
Progress = (Average of all ratings ÷ 7) × 100%
```

---

### GET /api/weekly-progress/:startDate
Get weekly progress for 7 consecutive days.

**Parameters:**
- `startDate` (path) - Start date in format `YYYY-MM-DD`

**Response (200):**
```json
{
  "weeklyAverage": 75.5,
  "dailyBreakdown": [
    {
      "date": "2025-11-14",
      "Health": 71,
      "Relationship": 85,
      "Career": 60,
      "Money": 78,
      "average": 73.5
    }
  ]
}
```

**Features:**
- Averages 7 consecutive days
- Uses platinum standards ratings
- Instant calculation with 30s cache

---

## Admin Endpoints

### GET /api/admin/users
Get all users (admin only).

**Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "email": "user@example.com",
      "name": "John Doe",
      "isAdmin": false,
      "createdAt": "2025-11-01T10:00:00.000Z"
    }
  ]
}
```

**Access:** Requires `isAdmin: true`

---

### POST /api/admin/approved-emails
Add an approved email address.

**Request Body:**
```json
{
  "email": "newuser@example.com"
}
```

**Response (201):**
```json
{
  "success": true
}
```

**Access:** Requires `isAdmin: true`

---

### DELETE /api/admin/approved-emails/:email
Remove an approved email address.

**Parameters:**
- `email` (path) - Email address to remove

**Response (200):**
```json
{
  "success": true
}
```

**Access:** Requires `isAdmin: true`

---

### POST /api/admin/platinum-standards
Create or update platinum standards.

**Request Body:**
```json
{
  "category": "Health",
  "text": "Exercise 30 minutes daily",
  "order": 5
}
```

**Response (201):**
```json
{
  "success": true,
  "standard": {
    "id": "h5",
    "category": "Health",
    "text": "Exercise 30 minutes daily",
    "order": 5
  }
}
```

**Access:** Requires `isAdmin: true`

---

### PUT /api/admin/platinum-standards/reorder
Reorder platinum standards (drag-and-drop).

**Request Body:**
```json
{
  "category": "Health",
  "orderedIds": ["h1", "h3", "h2", "h4"]
}
```

**Response (200):**
```json
{
  "success": true
}
```

**Access:** Requires `isAdmin: true`

---

## Rate Limiting

All API endpoints are rate-limited to prevent abuse:

**Limits:**
- **General endpoints:** 100 requests per 15 minutes
- **Login endpoint:** 5 requests per 15 minutes
- **Course tracking:** Unlimited (cached with 30s polling)

**Response (429):**
```json
{
  "error": "Too many requests, please try again later."
}
```

---

## Data Models

### User
```typescript
{
  id: number
  email: string (unique)
  name: string
  hashedPassword: string
  isAdmin: boolean
  createdAt: timestamp
}
```

### HRCM Data
```typescript
{
  id: number
  userId: string
  date: date
  category: "Health" | "Relationship" | "Career" | "Money"
  currentRating: number (0-10)
  targetRating: number (0-10)
  problems: text
  currentFeelings: text
  currentBelief: text
  currentActions: text
  result: text
  nextFeelings: text
  nextWeekTarget: text
  nextActions: text
}
```

### Platinum Standard Rating
```typescript
{
  id: number
  userId: string
  date: date
  category: "Health" | "Relationship" | "Career" | "Money"
  standardId: string
  rating: number (0-7)
  createdAt: timestamp
  updatedAt: timestamp
}
```

---

## Webhooks & Real-time Features

### WebSocket Connection
The application uses WebSocket for real-time updates:

**URL:** `ws://localhost:5000` (dev) or `wss://your-app.replit.app` (prod)

**Events:**
- `registered` - User connected
- `hrcm-update` - HRCM data changed
- `points-update` - Points balance changed

---

## Best Practices

### 1. Date Handling
- Always use `YYYY-MM-DD` format
- Use local timezone for date calculations
- Past dates are read-only

### 2. Error Handling
- Always check for `error` field in response
- Handle `401` by redirecting to login
- Handle `403` by showing access denied message

### 3. Optimistic Updates
- Update UI immediately
- Roll back on failure
- Show toast notifications for errors

### 4. Caching
- Platinum standards: Cache for 5 minutes
- Course data: 30-second polling
- User data: Session-based

---

## Examples

### Complete HRCM Workflow

```javascript
// 1. Get today's HRCM data
const today = new Date().toISOString().split('T')[0];
const response = await fetch(`/api/hrcm-data/${today}`);
const data = await response.json();

// 2. Update Health data
await fetch(`/api/hrcm-data/${today}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'Health',
    currentRating: 7,
    problems: 'Inconsistent sleep',
    currentActions: 'Set bedtime alarm'
  })
});

// 3. Update platinum standards
await fetch(`/api/platinum-standard-ratings/${today}`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    category: 'Health',
    ratings: [
      { standardId: 'h1', rating: 7 },
      { standardId: 'h2', rating: 6 }
    ]
  })
});

// 4. Get weekly progress
const weekStart = '2025-11-14';
const progress = await fetch(`/api/weekly-progress/${weekStart}`);
const weeklyData = await progress.json();
```

---

## Support

For issues or questions:
- Check server logs for detailed error messages
- Verify session cookie is being sent with requests
- Ensure date formats match `YYYY-MM-DD`
- Confirm user has required permissions

---

**Last Updated:** November 18, 2025  
**API Version:** 1.0.0
