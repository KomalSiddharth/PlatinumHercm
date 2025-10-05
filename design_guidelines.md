# Platinum HERCM Dashboard - Design Guidelines

## Design Approach
**Selected**: Design System + Productivity App (Linear/Notion/Asana patterns)  
**Principles**: Clarity First | Minimal Friction | Consistent Trust | Purposeful Motion

---

## Visual Foundation

### Color Palette
**Light Mode**
- Primary (Teal): `hsl(174 86% 24%)` - Actions, headers, active states
- Accent (Coral): `hsl(12 100% 65%)` - CTAs, achievements
- Background: `hsl(30 33% 96%)` #F6F0EA
- Surface: `hsl(0 0% 100%)` - Cards, modals
- Success: `hsl(142 57% 37%)` #2E9E4E

**Dark Mode** (auto-adjusted)
- Primary: `hsl(174 86% 35%)` | Accent: `hsl(12 100% 70%)`
- Background: `hsl(210 11% 12%)` | Surface: `hsl(210 11% 18%)`
- Success: `hsl(142 57% 45%)`

**Category Colors**
Health: Green `142 57% 37%` | Relationship: Purple `265 85% 58%`  
Career: Blue `221 83% 53%` | Money: Gold `45 93% 47%`  
Warning: `38 92% 50%` | Error: `0 84% 60%`

### Typography (Inter Font)
- **Display**: 700/48px (mobile: 32px) - Dashboard title
- **H1**: 600/32px (mobile: 24px) - Section headers
- **H2**: 600/24px (mobile: 20px) - Card titles
- **H3**: 600/18px (mobile: 16px) - Subsections
- **Body**: 400/16px (large), 400/14px (regular)
- **Caption**: 400/12px - Metadata, timestamps
- **Metrics**: 700/36px - Score displays  
Line-height: 1.5 body, 1.2 headings

### Layout System
**Spacing** (Tailwind units): 2, 4, 6, 8, 12, 16
- Micro: `p-2 gap-2` | Standard: `p-4 gap-4 p-6`  
- Section: `py-8 py-12 py-16` | Large: `mt-12 mb-16`

**Containers**
- Wrapper: `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`
- Content: `max-w-6xl mx-auto` | Text: `max-w-4xl mx-auto`

**Grids**
- HERCM: `grid-cols-1 md:grid-cols-2 gap-6`
- Rituals: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4`
- Courses: `grid-cols-1 md:grid-cols-2 gap-6`

---

## Component Specifications

### Navigation Header (h-16)
- Sticky, shadow on scroll
- Left: Logo 40×40 + "Platinum HERCM" (hide mobile)
- Center: Section pills (HERCM | Rituals | Courses) with active indicator
- Right: Points badge, avatar 32×32, admin link
- Mobile: Hamburger → slide-in drawer

### Cards (Primary Container)
- Background: white/surface, `rounded-xl`, 1px border (gray-200/gray-700)
- Hover: `shadow-md` elevation
- Padding: `p-6` standard, `p-4` compact
- Structure: Header (title+action) | Content | Footer (metadata)

### HERCM Tracker Cards
- Large score 1-10 center-top with circular progress ring (category color)
- Target field below with "+1" badge + lock icon
- "View Checklist" button (secondary)
- 4px left border in category color
- Subtle gradient background (white → 5% category tint)

### Checklist Modal
- Backdrop blur, centered `max-w-2xl`
- Header: checklist name prominent
- Items: `p-4` each, strikethrough + green checkmark when done
- Server timestamp (small gray) on completed
- Progress bar top: "X of Y completed"
- "Complete Checklist" CTA (enabled when all checked)

### Ritual Cards
- Horizontal: checkbox left, title center, points badge right
- Recurrence pill ("Daily", "Mon-Fri")
- History icon (clock) → 7-day calendar
- Active: full opacity | Paused: 40% + label
- Checkbox animation: scale + color transition 300ms

### Course Cards
- Thumbnail 16:9 (gradient + title first letter)
- Title (H3), source badge, tag pills
- Progress bar + percentage
- Status badge (Not Started=gray, In Progress=blue, Completed=green)
- "Update Progress" → slider modal 0-100%
- Estimated hours (clock icon)

### Buttons
- **Primary**: `bg-primary text-white rounded-lg px-6 py-3 font-medium`
- **Secondary**: `border-primary text-primary hover:bg-primary/10`
- **Ghost**: `text-gray-600 hover:bg-gray-100`
- **Icon**: 40×40 square, `rounded-lg`, centered
- **Disabled**: 50% opacity, `cursor-not-allowed`

### Form Inputs
- Height: `h-12`, Border: 2px gray-300 (focus: primary)
- `rounded-lg`, dark: border-gray-600 bg-surface
- Label: font-medium text-sm mb-2 above
- Error: border-error + red message below

### Leaderboard Table
- Striped rows, fixed header with sort indicators
- User row: `bg-primary/10` highlight
- Top 3: visual medal badges (gold/silver/bronze)
- Columns: Avatar + Name + Points

### Platinum Progress Tracker
- 4-step stepper: horizontal (desktop), vertical (mobile)
- Nodes: circular with week number, connecting lines
- Completed: `bg-success` filled | Current: pulsing | Incomplete: outlined
- Title: "Platinum Streak Progress" + status (e.g., "2/4 weeks")
- Criteria checklist below each step

### Admin Panel
- Split: user search 30% left, detail 70% right
- Activity timeline (most recent first)
- Export buttons top-right (CSV, PDF)
- Manual award form: points input, badge dropdown, reason textarea

---

## Animations & Interactions

**Minimal Strategy**
- Card hover: shadow elevation 150ms ease
- Button press: scale 0.98 active state 100ms
- Checkbox: draw + bounce 300ms
- Modal: fade + scale 200ms ease-out
- Toast: slide from top-right 250ms

**Platinum Achievement** (exception)
- Confetti burst (3s canvas/lottie)
- Badge reveal: scale + shine
- Points counter animate +500
- Success modal + optional sound

---

## Section Layouts

### HERCM Tracker
- Week selector (prev/next arrows, date range centered)
- 2×2 grid desktop, stack mobile
- "Weekly Summary" card: completion % across 4 areas
- Target tooltip: "Server enforces +1 rule for audit"

### Daily Rituals
- Add bar top: inline form (title, recurrence, points, Add)
- Filter tabs: All | Active | Completed Today
- Grid with instant checkbox feedback + points animation
- 7-day completion chart below

### Course Tracker
- Filter/sort bar: status + tag filters
- "Recommended" section top (3 cards + "Why" tooltip)
- Main grid below
- Add button (secondary) → form modal
- Detail modal: full info, notes, progress slider, links

---

## Responsive Breakpoints

**Mobile (<768px)**
- Hamburger nav, vertical stacking
- HERCM: compact (score+target row, button below)
- Modals: full-screen slide-up
- Padding: `p-4` vs `p-6`
- Optional: sticky bottom nav (3 icons)

**Tablet (768-1024px)**
- 2-column grids
- Optional collapsible sidebar
- HERCM: 2×2 maintained

**Desktop (>1024px)**
- Full layouts, hover states active
- 3-column grids where applicable
- Tooltips on hover (tap on mobile)

---

## Accessibility & Standards

**Dark Mode**
- Toggle in profile (moon/sun icon), persist localStorage
- Maintain WCAG AA contrast ratios
- Elevated surfaces use surface color

**A11y Requirements**
- Semantic HTML (`nav`, `main`, `section`, `article`)
- ARIA labels on icon buttons
- Keyboard: logical tab order, Enter/Space activates
- Focus: 2px primary ring with offset
- Skip-to-content link (hidden until focused)
- Screen reader announcements for dynamic updates

**Iconography**: Heroicons outline style, custom only for HERCM categories (matching brand line art)

**Empty States**: Simple line drawings (primary color) + encouraging copy + CTA

**Loading**: Skeleton screens (pulsing gray), spinners only for critical ops, optimistic UI (revert on error with toast)

---

**Logo**: Circular "P" with upward arrow (teal + coral accent)  
**Data Viz**: Minimal grids, clear labels, category colors, circular progress rings  
**Streaks**: Fire icon badge, orange→gold color progression