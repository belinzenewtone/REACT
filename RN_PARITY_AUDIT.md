# COMPREHENSIVE PARITY AUDIT — React Native Rewrite
## Complete Gap Analysis for 100% Feature, Logic, and UI Equivalence

**Status:** 🔴 CRITICAL GAPS IDENTIFIED  
**Version:** 2.0 (Complete)  
**Date:** 2026-06-30  
**Target:** 100% Parity Across All Dimensions

---

## TABLE OF CONTENTS
1. [Feature Completeness Audit](#1-feature-completeness-audit)
2. [Business Logic Mapping](#2-business-logic-mapping)
3. [UI/UX Component Audit](#3-ui-ux-component-audit)
4. [Data Model & Schema Audit](#4-data-model--schema-audit)
5. [Navigation & Routing Audit](#5-navigation--routing-audit)
6. [Platform-Specific Features](#6-platform-specific-features)
7. [State Management & Data Flow](#7-state-management--data-flow)
8. [Performance & Optimization](#8-performance--optimization)
9. [Testing & Validation](#9-testing--validation)
10. [Migration & Upgrade Path](#10-migration--upgrade-path)
11. [Error Handling & Edge Cases](#11-error-handling--edge-cases)
12. [Accessibility & Localization](#12-accessibility--localization)
13. [Security & Privacy](#13-security--privacy)
14. [Build, Release & Deployment](#14-build-release--deployment)
15. [Documentation Requirements](#15-documentation-requirements)

---

## 1. FEATURE COMPLETENESS AUDIT

### 1.1 Home / Dashboard Screen
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 4.1

#### Deliverables (DETAILED)
- [ ] **Spending Metrics Card**
  - [ ] Total spend (this month)
  - [ ] Total income (this month)
  - [ ] Net (income - spend)
  - [ ] Comparison to last month (% change, arrow indicator)
  - [ ] Animation on metric update
  - [ ] Tap to see detailed breakdown (daily, by category)
  
- [ ] **Budget Status Widget**
  - [ ] Top 3 budgets by utilization
  - [ ] Progress bar per budget (color: green < 50%, yellow 50-80%, red > 80%)
  - [ ] Percentage spent vs. limit
  - [ ] Tap to navigate to budget detail
  - [ ] "View all budgets" link
  
- [ ] **Agenda Card** (upcoming 7 days)
  - [ ] List of tasks due in next 7 days (sorted by due date)
  - [ ] List of events in next 7 days
  - [ ] Task completion toggle (in-line swipe or checkbox)
  - [ ] Event detail on tap
  - [ ] Time display (time of day for events, "Today" / "Tomorrow" / date for tasks)
  
- [ ] **Weekly Ritual Card**
  - [ ] Weekly goals / habits (if implemented in Kotlin app)
  - [ ] Completion status per day (M-Su)
  - [ ] Tap to add/edit ritual entry
  
- [ ] **Quick Action Buttons**
  - [ ] "Add Transaction" (primary button, large)
  - [ ] "Add Task" (secondary)
  - [ ] "View Finance" (tertiary)
  
- [ ] **Recent Transactions Snippet**
  - [ ] Last 3-5 transactions (scrollable)
  - [ ] Transaction amount, counterparty, timestamp
  - [ ] Category icon + color
  - [ ] Tap to see full transaction detail
  - [ ] "See all" link to Finance screen
  
- [ ] **Seasonal/Contextual Cards**
  - [ ] If any recurring rules trigger today, show notification
  - [ ] If budget alert triggered, highlight budget card
  - [ ] If balance < warning threshold, show low-balance card

#### Interactions
- [ ] **Pull-to-refresh:** Refresh spending metrics, refresh recent transactions
- [ ] **Empty state:** If no transactions/tasks/events, show appropriate empty state
- [ ] **Loading state:** Skeleton loaders for metrics, transactions
- [ ] **Offline support:** Cache metrics; show stale data with "offline" indicator

#### Styling
- [ ] Glass-morphism cards matching Kotlin app (blur, translucency)
- [ ] Color palette matches Kotlin (theme-aware: light/dark/system)
- [ ] Typography: matching font sizes, weights, line heights
- [ ] Spacing/padding: matches Kotlin design grid

#### Edge Cases
- [ ] User has $0 spent (show metric as "0", no comparison)
- [ ] User has no transactions (empty recent transactions list)
- [ ] Metrics for partial month (e.g., app installed mid-month)
- [ ] Locale: currency formatting (KES, USD, etc. based on user setting)
- [ ] Floating-point precision: all amounts shown with correct decimal places (KES: 2 decimals)

---

### 1.2 Finance / Transactions Screen
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 4.2

#### Deliverables (DETAILED)
- [ ] **Transaction List View**
  - [ ] Virtualized/lazy list (FlatList with 1000+ items)
  - [ ] Transaction items: amount, category icon, counterparty, timestamp, status badge
  - [ ] Status badges: ✅ completed, ⏳ pending, ❌ failed, 🔄 reversed
  - [ ] Pull-to-refresh
  - [ ] Infinite scroll / pagination (load 50 at a time)
  
- [ ] **Transaction Grouping** (by date)
  - [ ] Group header: "Today", "Yesterday", "This Week", "This Month", date
  - [ ] Swipe actions (tap transaction to edit/delete)
  - [ ] Tap transaction → detail view
  
- [ ] **Filter & Search Bar**
  - [ ] Search by: counterparty, description, MPESA code
  - [ ] Filter by: date range, amount range, category, transaction type (income/expense)
  - [ ] Active filter indicator (badge on filter button)
  - [ ] Clear filters button
  - [ ] Save filter presets (optional; if in Kotlin app)
  
- [ ] **Sort Options**
  - [ ] Sort by: date (newest first, oldest first), amount (highest first, lowest first)
  - [ ] Persistence: remember last sort order
  
- [ ] **Category Selector**
  - [ ] Horizontal scroll of categories
  - [ ] "All" category (shows all transactions)
  - [ ] Tap category → filter to that category
  - [ ] Visual indicator of selected category
  
- [ ] **Add Transaction Flow**
  - [ ] Manual entry: amount, counterparty, category, date/time, description, notes
  - [ ] MPESA auto-import (Android only): parse SMS, confirm, save
  - [ ] CSV import: upload file, map columns, preview, import
  - [ ] Form validation: amount > 0, required fields
  - [ ] Date/time picker (native)
  - [ ] Category picker (list or grid)
  - [ ] Merchant autocomplete (recent merchants)
  
- [ ] **Transaction Detail Screen**
  - [ ] Full transaction data: amount, counterparty, category, date, time, description, notes, MPESA code (if applicable)
  - [ ] Balance before & after (if available)
  - [ ] Fuliza balance (if Fuliza transaction)
  - [ ] Edit button → edit transaction
  - [ ] Delete button → confirm delete (soft delete)
  - [ ] Share button → share transaction as text/image
  - [ ] Related transactions (same counterparty, same category)
  - [ ] Links to merchant detail (if tapped)
  
- [ ] **Edit Transaction**
  - [ ] Pre-filled with existing data
  - [ ] Save changes
  - [ ] Cancel without saving
  - [ ] Delete transaction from edit screen
  
- [ ] **Merchant Detail Popup**
  - [ ] Merchant name, total spent with this merchant, # transactions
  - [ ] Recent transactions with merchant
  - [ ] Assigned category (if default category set)
  - [ ] Tap to edit merchant default category (optional)
  
- [ ] **Fee Analytics** (if shown in Kotlin app)
  - [ ] Total fees charged by bank/Fuliza
  - [ ] Breakdown by transaction type
  - [ ] Trend (this month vs. last month)
  
- [ ] **CSV Import Screen**
  - [ ] File picker (select CSV)
  - [ ] Column mapping (user selects which column = amount, counterparty, etc.)
  - [ ] Preview first 10 rows
  - [ ] Validation errors (required fields, data type mismatches)
  - [ ] Confirm import
  - [ ] Progress indicator
  - [ ] Success message with record count

#### Interactions
- [ ] Swipe transaction left → delete option
- [ ] Long-press transaction → bulk select (if bulk actions exist)
- [ ] Tap category badge → filter to category
- [ ] Pull-to-refresh → reload transactions
- [ ] Infinite scroll → load more transactions

#### Styling
- [ ] Transaction item: glass card, category icon (left), amount (right, red for expense, green for income)
- [ ] Date headers: subtle, smaller font
- [ ] Selected/highlighted state for filters

#### Edge Cases
- [ ] User has 0 transactions → empty state ("No transactions. Add one to get started.")
- [ ] Filter returns 0 results → "No transactions match your filter"
- [ ] CSV import with duplicate MPESA codes → skip or warn
- [ ] Transaction with missing category → show "Uncategorized"
- [ ] Very large amounts ($1M+) → formatting doesn't break layout
- [ ] Floating-point precision: all amounts with 2 decimals

---

### 1.3 Calendar & Events Screen
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 4.3

#### Deliverables (DETAILED)
- [ ] **Calendar Month View**
  - [ ] Month navigation (prev/next month)
  - [ ] Current month header (month name + year)
  - [ ] Week rows (Mon-Sun, or configurable)
  - [ ] Day cells with: date, visual indicator if events/tasks present
  - [ ] Visual indicators: colored dots for events, checkmark for completed tasks
  - [ ] Today highlighted (circle or background)
  - [ ] Selected date highlighted
  - [ ] Tap date → show day detail (events + tasks for that day)
  
- [ ] **Events Tab**
  - [ ] List of events for selected date/range
  - [ ] Event details: title, start time, end time, location, description, recurrence
  - [ ] Event color/category (if applicable)
  - [ ] Add event button
  - [ ] Tap event → edit/detail view
  
- [ ] **Tasks Tab**
  - [ ] List of tasks for selected date/range
  - [ ] Task details: title, due date, priority, completed status
  - [ ] Priority indicator (high/medium/low, via color or icon)
  - [ ] Add task button
  - [ ] Tap task → edit/detail view
  - [ ] Checkbox to toggle completion (in-line)
  
- [ ] **Add Event Flow**
  - [ ] Modal/overlay form
  - [ ] Title (required)
  - [ ] Date picker (native)
  - [ ] Start time picker (native)
  - [ ] End time picker (native)
  - [ ] Location field (optional)
  - [ ] Description field (optional)
  - [ ] Recurrence selector (if events can recur): none, daily, weekly, monthly, yearly
  - [ ] Recurrence end date (if recurrence selected)
  - [ ] Notification/reminder selector (15 min before, 1 hour, 1 day, etc.)
  - [ ] Save button
  - [ ] Cancel button
  
- [ ] **Add Task Flow**
  - [ ] Modal/overlay form
  - [ ] Title (required)
  - [ ] Due date picker (native)
  - [ ] Optional: due time picker
  - [ ] Priority selector (high/medium/low)
  - [ ] Description field (optional)
  - [ ] Category/project (optional; if in Kotlin app)
  - [ ] Reminder selector (1 day before, 1 hour, at time of task, etc.)
  - [ ] Save button
  - [ ] Cancel button
  
- [ ] **Edit Event**
  - [ ] Pre-filled form with existing event data
  - [ ] Save changes
  - [ ] Delete event (with confirmation)
  - [ ] For recurring events: "Edit this occurrence" vs. "Edit all occurrences" (if supported)
  
- [ ] **Edit Task**
  - [ ] Pre-filled form with existing task data
  - [ ] Mark complete/incomplete (checkbox)
  - [ ] Save changes
  - [ ] Delete task (with confirmation)

#### Interactions
- [ ] Tap date cell → show day detail
- [ ] Month swipe (left/right) → prev/next month
- [ ] Tap event → detail/edit view
- [ ] Long-press event → quick actions (delete, duplicate)
- [ ] Swipe task → mark complete or delete
- [ ] Tap "+" button → add event/task modal

#### Styling
- [ ] Calendar grid: matching Kotlin design
- [ ] Event color coding: if categories have colors
- [ ] Task priority colors: red (high), yellow (medium), blue (low)
- [ ] Today indicator: distinct visual (circle, background)

#### Edge Cases
- [ ] User has 0 events/tasks → empty state
- [ ] Month view on small screen (< 360px width) → adjust layout
- [ ] All-day event (no start/end time) → display differently
- [ ] Recurring event (e.g., every weekday) → show on all applicable dates
- [ ] Event spanning multiple days → visual indicator
- [ ] Conflicting events (overlapping times) → show all (stack or list)
- [ ] Past event/task → visual indicator (crossed out, dimmed, "past" label)

---

### 1.4 Tasks Screen (Dedicated)
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 4.3

#### Deliverables (DETAILED)
- [ ] **Task List View**
  - [ ] All tasks (or filtered by status: active/completed)
  - [ ] Task items: title, due date, priority, completion checkbox
  - [ ] Grouped by: status (active/completed), due date, priority
  - [ ] Swipe task left → delete
  - [ ] Swipe task right → mark complete
  - [ ] Tap task → detail/edit view
  
- [ ] **Priority Filtering**
  - [ ] Filter by priority (high/medium/low)
  - [ ] Filter by status (active/completed)
  - [ ] Filter by due date (overdue, today, this week, later)
  
- [ ] **Sorting**
  - [ ] Sort by: due date, priority, date created, alphabetical
  - [ ] Persistence: remember last sort
  
- [ ] **Task Time Tracking** (if in Kotlin app)
  - [ ] Start timer button (on task detail)
  - [ ] Timer display (hh:mm:ss)
  - [ ] Pause/resume timer
  - [ ] Stop timer (saves time spent to task)
  - [ ] View total time spent on task
  - [ ] Edit time spent (manual entry)

#### Interactions
- [ ] Swipe task → delete or mark complete
- [ ] Tap task → detail view
- [ ] Checkbox → toggle completion (in-line)
- [ ] Long-press task → quick actions (edit, duplicate, delete)
- [ ] Pull-to-refresh → reload tasks

#### Styling
- [ ] Priority colors: visual indicator
- [ ] Completed task: strikethrough text, dimmed
- [ ] Overdue task: red or bold indicator
- [ ] Time tracking: timer display with clear typography

#### Edge Cases
- [ ] User has 0 tasks → empty state
- [ ] Task with no due date → show as "No due date"
- [ ] Overdue task → visual indicator + badge
- [ ] Task completed → move to completed section or hide (depending on filter)

---

### 1.5 Planner Hub Screen
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 4.4

#### Deliverables (DETAILED)
- [ ] **Planner Hub Navigation**
  - [ ] Tab bar or segmented control: Budget, Income, Recurring, Bills, Loans, Goals, Export
  - [ ] OR: Horizontal scroll of category cards (each is a link)
  - [ ] OR: Grid layout of tiles (each is a category)
  
- [ ] **Budget Management**
  - [ ] List of all budgets (by category)
  - [ ] Budget item: category name, allocated amount, spent amount, progress bar
  - [ ] Color coding: green < 50%, yellow 50-80%, red > 80%
  - [ ] Add budget button
  - [ ] Tap budget → detail/edit view
  - [ ] Edit budget: allocated amount, category, alert threshold
  - [ ] Delete budget
  - [ ] Reset budget (for recurring monthly budgets)
  
- [ ] **Income Management**
  - [ ] List of all income entries
  - [ ] Income item: source, amount, date, frequency
  - [ ] Add income button
  - [ ] Tap income → detail/edit view
  - [ ] Edit income: source, amount, date, recurrence
  - [ ] Delete income
  
- [ ] **Recurring Rules Management**
  - [ ] List of all recurring rules
  - [ ] Rule item: description, frequency, next run date, status (active/inactive)
  - [ ] Add rule button
  - [ ] Tap rule → detail/edit view
  - [ ] Edit rule: description, frequency, amount, category, active/inactive toggle
  - [ ] Delete rule
  - [ ] Preview rule (show next 5 occurrences)
  
- [ ] **Bills Management** (if separate from recurring rules)
  - [ ] List of bills
  - [ ] Bill item: name, amount, due date, frequency, paid status
  - [ ] Add bill button
  - [ ] Tap bill → detail/edit view
  - [ ] Mark bill as paid
  - [ ] Delete bill
  
- [ ] **Loans / Fuliza Management** (if separate)
  - [ ] List of active loans
  - [ ] Loan item: lender, principal, balance, interest rate, next payment due
  - [ ] Add loan button
  - [ ] Tap loan → detail/edit view
  - [ ] Log payment (creates transaction)
  - [ ] Delete loan (when fully paid)
  - [ ] Amortization schedule (optional)
  
- [ ] **Goals Management** (if in Kotlin app)
  - [ ] List of goals
  - [ ] Goal item: name, target amount, current savings, progress bar, target date
  - [ ] Add goal button
  - [ ] Tap goal → detail/edit view
  - [ ] Log contribution to goal (creates transaction)
  - [ ] Edit goal (target amount, target date)
  - [ ] Archive goal (when completed)
  
- [ ] **Export Management**
  - [ ] List of past exports
  - [ ] Export item: date, file size, format (JSON/CSV/PDF)
  - [ ] Download export
  - [ ] Share export
  - [ ] Create new export button
  - [ ] Export format selector (JSON/CSV/PDF)
  - [ ] Export preview (first 10 rows)
  
- [ ] **Search (Planner-wide)**
  - [ ] Search across all planner entities: budgets, income, rules, bills, loans, goals
  - [ ] Filter by type (budget, income, rule, etc.)
  - [ ] Search results: entity name, type, snippet

#### Interactions
- [ ] Tap category/tab → navigate to that section
- [ ] Add button → open form modal
- [ ] Tap entity → detail/edit view
- [ ] Edit button → edit form
- [ ] Delete button → confirmation → delete
- [ ] Toggle switch → activate/deactivate rule

#### Styling
- [ ] Category colors (if budgets have colors)
- [ ] Progress bars: visual representation
- [ ] Active/inactive visual distinction

#### Edge Cases
- [ ] No budgets created → empty state
- [ ] Budget with $0 spent → progress bar at 0%
- [ ] Income with no recurrence (one-time) → show as "Once"
- [ ] Recurring rule with past due date → visual warning

---

### 1.6 Assistant Screen
**Kotlin Status:** ✅ Implemented (rule-based, offline)  
**RN Target:** ✅ Phase 4.5

#### Deliverables (DETAILED)
- [ ] **Chat UI**
  - [ ] Message list (virtualized for large conversations)
  - [ ] Message bubbles: user message (right, blue), assistant message (left, gray)
  - [ ] Message content: text, inline amounts/numbers highlighted
  - [ ] Message metadata: timestamp (optional), read status
  - [ ] Scroll to bottom button (if not at bottom)
  - [ ] Pull-to-load-earlier messages (pagination)
  
- [ ] **Message Input**
  - [ ] Text input field (multiline)
  - [ ] Send button (enabled only if text is non-empty)
  - [ ] Placeholder text ("Ask me anything...")
  - [ ] Character counter (optional, if Kotlin app has limit)
  
- [ ] **Assistant Response Engine** (offline, rule-based)
  - [ ] Parse user message (natural language)
  - [ ] Match against predefined rules
  - [ ] Generate response based on matched rule
  - [ ] If no rule matches, fallback response
  - [ ] Actions/suggestions: buttons or links to app features (e.g., "View Finance", "Add Budget")
  
- [ ] **Action Proposals**
  - [ ] Assistant proposes actions based on user message
  - [ ] Tap action → execute (e.g., "Add $X to budget Y")
  - [ ] Confirmation before executing
  - [ ] Feedback after execution
  
- [ ] **Conversation History**
  - [ ] Store all conversations locally (WatermelonDB)
  - [ ] Conversation list: most recent first
  - [ ] Tap conversation → open chat history
  - [ ] Delete conversation (with confirmation)
  - [ ] Clear all conversations (with confirmation)
  
- [ ] **Assistant Rules Documentation** (export to docs)
  - [ ] All rule patterns (e.g., "How much did I spend?")
  - [ ] Expected response per pattern
  - [ ] Fallback responses
  - [ ] Action categories (budget, transaction, goal, etc.)

#### Interactions
- [ ] Type message → send button enabled
- [ ] Tap send → message appears, assistant responds
- [ ] Tap action button → confirm action → execute
- [ ] Long-press message → copy, delete options
- [ ] Swipe conversation → delete option

#### Styling
- [ ] Message bubbles: distinct colors for user/assistant
- [ ] Timestamps: subtle, optional
- [ ] Action buttons: prominent, tappable

#### Edge Cases
- [ ] User message is ambiguous → show clarification options
- [ ] Assistant rule returns no match → fallback message ("I didn't understand. Try asking...")
- [ ] No conversation history → empty state ("Start by asking me something!")
- [ ] Very long message → text wrapping, readable formatting

---

### 1.7 Analytics & Insights Screen
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 4.6

#### Deliverables (DETAILED)
- [ ] **Analytics Dashboard**
  - [ ] Top metrics: total spend, total income, net, average transaction
  - [ ] Comparison to last month (% change, trend arrow)
  - [ ] Summary cards (glass-morphism)
  
- [ ] **Charts** (canvas, SVG, or library)
  - [ ] **Weekly Spend Trend** (line chart)
    - [ ] Last 12 weeks
    - [ ] X-axis: week label (W1, W2, etc.)
    - [ ] Y-axis: amount
    - [ ] Tap point → show weekly breakdown by category
    
  - [ ] **Category Breakdown** (pie or doughnut chart)
    - [ ] All categories, spend per category
    - [ ] Tap segment → filter transactions by category
    - [ ] Show category color coding
    
  - [ ] **Monthly Spend Trend** (bar chart)
    - [ ] Last 12 months
    - [ ] X-axis: month label (Jan, Feb, etc.)
    - [ ] Y-axis: amount
    - [ ] Color: red for expense, green for income (or separate bars)
    - [ ] Tap bar → show month breakdown by category
    
  - [ ] **Budget vs. Actual** (horizontal bar chart)
    - [ ] Top 5 budgets
    - [ ] Budgeted amount vs. spent amount
    - [ ] Color: green if under, red if over
    - [ ] Tap → detail view
    
  - [ ] **Merchant Spending** (top 10 merchants)
    - [ ] Bar chart or list
    - [ ] Spend per merchant
    - [ ] Tap → filter transactions by merchant
  
- [ ] **Filters & Drill-Down**
  - [ ] Date range selector (this month, last month, last 3 months, custom)
  - [ ] Category filter
  - [ ] Transaction type filter (income/expense)
  - [ ] Update charts based on filters
  
- [ ] **Review Digest / Insights**
  - [ ] Auto-generated insights: "You spent 15% more this month than last month"
  - [ ] Insights card: insight text, relevant chart/metric
  - [ ] Archive insight (mark as read)
  - [ ] Swipe to dismiss
  
- [ ] **Comparison Views**
  - [ ] This month vs. last month (side-by-side metrics)
  - [ ] This year vs. last year (monthly breakdown)
  - [ ] Category trends (how spending per category changed over time)

#### Interactions
- [ ] Tap chart → drill down (see category breakdown, merchant list, etc.)
- [ ] Date range selector → filter all charts
- [ ] Tap metric → show detailed breakdown
- [ ] Swipe insight → dismiss

#### Styling
- [ ] Charts: clear, readable, theme-aware (light/dark)
- [ ] Colors: category colors matching app color scheme
- [ ] Typography: clear labels, readable legend
- [ ] Animations: chart values animate on load/update

#### Edge Cases
- [ ] No transactions in selected date range → empty state
- [ ] All transactions in one category → show 100% in pie chart
- [ ] Very large values (>$1M) → formatting doesn't break layout
- [ ] Screen rotation → charts adapt to width
- [ ] Offline → show cached data with "offline" indicator

---

### 1.8 Search (GLOBAL)
**Kotlin Status:** ✅ Implemented  
**RN Target:** 🔴 MISSING FROM PLAN (Allocate Phase 4, 2-3 weeks)

#### Deliverables (DETAILED)
- [ ] **Global Search Bar**
  - [ ] Present on most screens (Home, Finance, Calendar, Planner)
  - [ ] OR: dedicated search screen (tab on bottom nav)
  - [ ] Search icon (opens search modal/screen)
  - [ ] Search input field
  - [ ] Clear button (X icon)
  - [ ] Mic button (voice search; optional)
  
- [ ] **Search Results**
  - [ ] Real-time results as user types (debounced, 300ms delay)
  - [ ] Results grouped by type:
    - [ ] **Transactions** (matching counterparty, description, MPESA code, amount)
    - [ ] **Tasks** (matching title, description)
    - [ ] **Events** (matching title, location, description)
    - [ ] **Budgets** (matching category name)
    - [ ] **Merchants** (matching merchant name, category)
    - [ ] **Recurring Rules** (matching description)
    - [ ] **Goals** (matching goal name)
    
  - [ ] Result count per type
  - [ ] Tap result → navigate to detail/edit view
  
- [ ] **Advanced Search** (optional; if in Kotlin app)
  - [ ] Filters: date range, amount range, category, type
  - [ ] Save search filters (history)
  - [ ] Recent searches (list of previous searches)
  - [ ] Clear search history
  
- [ ] **Search Performance**
  - [ ] Search <500ms for 10k records
  - [ ] Debouncing (avoid over-searching)
  - [ ] Indexing (SQLite FTS or WatermelonDB search)
  
- [ ] **Voice Search** (optional)
  - [ ] Mic button → record user speech
  - [ ] Transcribe to text
  - [ ] Search with transcribed text
  - [ ] Fallback if transcription fails

#### Interactions
- [ ] Type in search → results update real-time
- [ ] Tap result → navigate to detail/edit
- [ ] Tap filter button → show advanced filters
- [ ] Clear history → clear all past searches
- [ ] Mic button → record voice

#### Styling
- [ ] Search bar: prominent, accessible touch target
- [ ] Results list: clear grouping, icons per type
- [ ] Highlighting: search term highlighted in results

#### Edge Cases
- [ ] No results → empty state ("No results for 'xyz'")
- [ ] Search with special characters → escape/sanitize
- [ ] Very long search query → truncate in display
- [ ] Offline → search local data only, no API calls

---

### 1.9 Settings Screen
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 5

#### Deliverables (DETAILED)
- [ ] **Theme Settings**
  - [ ] Theme selector: Light, Dark, System (default)
  - [ ] Preview theme change (in real-time)
  - [ ] Persistence: save selection
  
- [ ] **Notification Settings**
  - [ ] Toggle notifications (on/off)
  - [ ] Notification types: reminders, budget alerts, daily digest, recurring rules
  - [ ] Per-type toggle (enable/disable individual types)
  - [ ] Notification sound toggle
  - [ ] Notification vibration toggle
  - [ ] Quiet hours (do not disturb time range; optional)
  
- [ ] **Screen Lock Settings**
  - [ ] Biometric lock toggle (on/off)
  - [ ] Biometric type: face, fingerprint, PIN fallback
  - [ ] Lock timeout options: 1 min, 5 min, 15 min, 30 min, never
  - [ ] Test biometric (show lock overlay, require unlock to continue)
  - [ ] Change PIN (alternative to biometric)
  
- [ ] **Data Settings**
  - [ ] Fuliza limit (max Fuliza balance user wants to see)
  - [ ] Default transaction category (for manual entry)
  - [ ] Currency (KES, USD, etc.; if multi-currency supported)
  - [ ] Date format (DD/MM/YYYY, MM/DD/YYYY, etc.)
  - [ ] Time format (12h, 24h)
  - [ ] Decimal precision (2 or 3 decimals; if variable)
  
- [ ] **Backup & Export**
  - [ ] Manual export button → export all data as JSON
  - [ ] Auto-backup toggle (optional; if Kotlin app supports)
  - [ ] Backup frequency selector (daily, weekly, monthly)
  - [ ] Backup status (last backup time)
  
- [ ] **About & Legal**
  - [ ] App version
  - [ ] Build number
  - [ ] "Check for updates" button → check OTA/store for new version
  - [ ] Privacy policy link
  - [ ] Terms of service link
  - [ ] Open source licenses link
  
- [ ] **Advanced Settings** (optional)
  - [ ] Debug mode toggle (if enabled: show raw data, API calls, etc.)
  - [ ] Clear cache button
  - [ ] Reset app (clear all data; with confirmation)
  - [ ] Log export (for debugging)

#### Interactions
- [ ] Toggle switches → change setting immediately
- [ ] Dropdown selector → select option
- [ ] Button tap → open modal/view (color picker, theme preview, etc.)
- [ ] Save button → persist settings

#### Styling
- [ ] Settings list: clear sections, icons, descriptions
- [ ] Toggle switches: large touch targets
- [ ] Dividers: between sections

#### Edge Cases
- [ ] User changes theme → app recompiles theme and updates all screens
- [ ] User disables notifications → background tasks respect this flag
- [ ] User changes currency → all amounts update in display
- [ ] Biometric not available → PIN fallback shown

---

### 1.10 Profile Screen
**Kotlin Status:** ✅ Implemented (Android, iOS equivalent)  
**RN Target:** ✅ Phase 5

#### Deliverables (DETAILED)
- [ ] **User Profile Info**
  - [ ] User name (display name, if user can edit)
  - [ ] User avatar (local image or placeholder)
  - [ ] Email address (if applicable)
  - [ ] Phone number (if applicable)
  - [ ] Edit profile button → edit modal
  
- [ ] **Account Statistics**
  - [ ] Total transactions (all-time)
  - [ ] Total spend (all-time)
  - [ ] Total income (all-time)
  - [ ] Largest transaction
  - [ ] Most common merchant
  - [ ] Average transaction
  - [ ] Account creation date
  
- [ ] **Actions**
  - [ ] Edit profile button → edit name, avatar
  - [ ] View activity log (optional; if in Kotlin app)
  - [ ] View backup history (optional)
  - [ ] Settings link (shortcut to Settings screen)
  - [ ] Support / Help link
  - [ ] Logout button (if multi-user supported)
  
- [ ] **Changelog / Updates**
  - [ ] Latest app version features (what's new in this version)
  - [ ] Version history (previous versions)
  - [ ] "Check for updates" button
  - [ ] Automatic update notification (in-app banner)

#### Interactions
- [ ] Tap edit button → edit modal
- [ ] Tap statistics → drill down (e.g., tap "largest transaction" → show it)
- [ ] Tap link → navigate to linked screen
- [ ] Logout → confirmation → logout

#### Styling
- [ ] Avatar: circular, centered
- [ ] Statistics: cards with icons, clear typography
- [ ] Profile header: glass-morphism card

#### Edge Cases
- [ ] No profile picture → show placeholder avatar (initials or default icon)
- [ ] User name not set → show "User" or email
- [ ] No statistics data → show "—" or "N/A"

---

### 1.11 Onboarding Flow
**Kotlin Status:** ✅ Implemented  
**RN Target:** ✅ Phase 1 (placeholder), Phase 4 (full implementation)

#### Deliverables (DETAILED)
- [ ] **Welcome Screen**
  - [ ] App logo
  - [ ] "Welcome to BELTECH" headline
  - [ ] Brief tagline/description
  - [ ] "Get Started" button
  - [ ] "Already have data? Import" link (optional)
  
- [ ] **Setup Flow** (4-6 screens)
  - [ ] **Screen 1: Import Data**
    - [ ] "Do you have data from our app?"
    - [ ] Yes → file picker (select JSON export)
    - [ ] No → skip
    
  - [ ] **Screen 2: Theme Preference**
    - [ ] "Choose your theme"
    - [ ] Light / Dark / System
    - [ ] Preview
    
  - [ ] **Screen 3: Notifications**
    - [ ] "Enable notifications?"
    - [ ] Toggle notifications
    - [ ] Explain benefits
    
  - [ ] **Screen 4: Biometric Setup**
    - [ ] "Secure your data with biometric lock?"
    - [ ] Face/Fingerprint options
    - [ ] Setup / Skip
    
  - [ ] **Screen 5: Default Settings**
    - [ ] Currency
    - [ ] Date format
    - [ ] Default category (optional)
    
  - [ ] **Screen 6: Completion**
    - [ ] "All set!"
    - [ ] "Start adding transactions"
    - [ ] "View tutorial" button (optional)
    - [ ] "Go to home" button
  
- [ ] **Data Import** (from Kotlin app export)
  - [ ] File picker
  - [ ] Validate JSON format
  - [ ] Progress indicator
  - [ ] Success message with record count
  - [ ] Error handling (invalid file, corrupted data)

#### Interactions
- [ ] Swipe next/prev (between screens)
- [ ] Tap next button → advance to next screen
- [ ] Tap skip button → skip step
- [ ] Tap "Already have data?" → file picker
- [ ] File selected → validate and import

#### Styling
- [ ] Clean, minimal design
- [ ] Large touch targets
- [ ] Progress indicator (dots or bar)
- [ ] CTA buttons: prominent, high contrast

#### Edge Cases
- [ ] User cancels import → ask to confirm
- [ ] Import fails → show error, offer retry
- [ ] User goes back → preserve selections
- [ ] User skips entire onboarding → show full home screen

---

### 1.12 Learning Sessions (if in Kotlin app)
**Kotlin Status:** ✅ (possibly minimal)  
**RN Target:** 🔴 UNCLEAR — Mentioned in inventory but not in feature plan

#### Gaps to Clarify:
- [ ] What is a learning session? (financial education? product feature? analytics?)
- [ ] Where are they displayed? (separate screen? profile screen? assistant suggestions?)
- [ ] What data does a session contain? (title, description, duration, content?)
- [ ] Can users create sessions? (or only view pre-made ones?)
- [ ] Is there progress tracking? (% complete, time spent?)

#### Decision Required:
- [ ] **Option A:** Include as Phase 4 sub-feature (1 week)
- [ ] **Option B:** Defer to Phase 9 (post-release)
- [ ] **Option C:** Remove from 1:1 parity (if not critical in Kotlin app)

---

### 1.13 Bills Management (detailed)
**Kotlin Status:** ✅ Implemented  
**RN Target:** 🟡 LISTED as "Phase 4 extensions" — needs clarification

#### Gaps to Clarify:
- [ ] Are bills separate from recurring rules? (or subset of recurring?)
- [ ] Bill fields: name, amount, due date, frequency, paid status, creditor, account?
- [ ] Can bills recur? (monthly utility, annual insurance, etc.?)
- [ ] Notification: reminder before due date?
- [ ] Payment tracking: log payment, update paid status?
- [ ] Overdue indicator: if payment is past due date?

#### Decision Required:
- [ ] **Option A:** Bills are subset of recurring rules (combine in Phase 4.4)
- [ ] **Option B:** Bills are separate entity (dedicated bills screen in Phase 4.4)
- [ ] **Option C:** Bills are deferred (Phase 9)

---

### 1.14 Loans / Fuliza (detailed)
**Kotlin Status:** ✅ Implemented  
**RN Target:** 🟡 LISTED as "Phase 4 extensions" — needs clarification

#### Gaps to Clarify:
- [ ] Fuliza fields: current balance, max limit, interest rate, status?
- [ ] Loan fields: principal, current balance, lender, interest rate, term, next payment?
- [ ] Amortization schedule: show breakdown of principal vs. interest?
- [ ] Payment logging: track payments, update balance?
- [ ] Alert: low balance warning, overspend warning?
- [ ] History: view all loans (active and paid-off)?

#### Decision Required:
- [ ] **Option A:** Fuliza is separate entity (dedicated Fuliza card in Planner)
- [ ] **Option B:** Loans are separate entity (dedicated loans screen in Planner)
- [ ] **Option C:** Both combined in one "Liabilities" screen
- [ ] **Option D:** Defer to Phase 9

---

### 1.15 Goals (detailed)
**Kotlin Status:** ✅ (possibly)  
**RN Target:** 🟡 LISTED as "Phase 4 extensions" — needs clarification

#### Gaps to Clarify:
- [ ] Goal fields: name, target amount, current savings, target date, category?
- [ ] Goal tracking: automatically sum contributions by category?
- [ ] Progress visualization: progress bar, % complete?
- [ ] Goal notifications: completion reminder, milestone notification?
- [ ] Goal archival: mark as complete, hide from active goals?
- [ ] Goal history: view completed goals?

#### Decision Required:
- [ ] **Option A:** Goals as first-class entity (dedicated goals screen in Planner)
- [ ] **Option B:** Goals are deferred (Phase 9)
- [ ] **Option C:** Goals are informational only (display in Profile)

---

### 1.16 SMS Auto-Import (Android only)
**Kotlin Status:** ✅ Android  
**RN Target:** ✅ Phase 3 (Parser), Phase 4 (UI integration)

#### Deliverables (DETAILED)
- [ ] **SMS Reader Native Module (Android)**
  - [ ] Query SMS from default SMS provider
  - [ ] Filter MPESA messages (from M-Pesa operator)
  - [ ] Permission handling (READ_SMS)
  - [ ] Return list of SMS messages (text, sender, timestamp)
  - [ ] Periodic sync (triggered by background task)
  
- [ ] **SMS Parsing Integration**
  - [ ] Feed SMS into TypeScript parser
  - [ ] Deduplicate (avoid re-parsing same SMS)
  - [ ] Categorize (routine, review, quarantine)
  - [ ] Save to database (Transaction table)
  
- [ ] **SMS Review Queue**
  - [ ] Low-confidence transactions flagged for review
  - [ ] Review screen: show parsed data, allow edit before save
  - [ ] Approve/reject buttons
  - [ ] Bulk operations (approve all, reject all)
  
- [ ] **iOS Manual Entry Equivalent**
  - [ ] Form-based transaction entry (since iOS has no SMS access)
  - [ ] Pre-filled with common merchants/amounts (from history)
  - [ ] Quick-add templates (e.g., "Safaricom topup")

#### Interactions
- [ ] Background sync: runs periodically (frequency configurable)
- [ ] Notification: "New MPESA transaction detected" (if enabled)
- [ ] Review queue: user taps notification → review screen
- [ ] Approve/edit: user confirms or modifies parsed data

#### Edge Cases
- [ ] SMS with typos → parser confidence < 80% → review queue
- [ ] Duplicate SMS (received twice) → deduplication engine skips
- [ ] SMS from spoofer → validation rules reject
- [ ] Offline SMS sync → queue messages, process on next sync
- [ ] Permission denied (user revoked SMS permission) → show error, explain why needed

---

## 2. BUSINESS LOGIC MAPPING

### 2.1 MPESA Parser Rules (DETAILED)
**Status:** 🔴 COMPLETELY MISSING FROM PLAN

Create a detailed parser rules document with each of the **11 rules**:

#### Rule 1: Normal Transaction
```
Pattern: "LN?\d{9}[A-Z]?.*?(sent|received|paid|withdrawn|deposited|transferred|sent to)?.*?(?:to|from)?\s*(.+?)\s*(?:on|at)?\s*(\d+\/\d+\/\d+)?.*?Ksh([\d,]+\.?\d*)"
Expected Output: {
  code: "LN123456789A",
  type: "SEND" | "RECEIVE" | "WITHDRAW" | "DEPOSIT",
  counterparty: "John Doe" | "Safaricom",
  amount: 1000.50,
  balanceAfter: 5000.00,
  date: "2026-06-30T14:30:00Z",
  confidence: 0.95,
  category: "TRANSPORT" | "UTILITIES" | "GROCERIES" | etc.
}
```

#### Rule 2–11: (Document each similarly)
- Rule 2: Fuliza Borrow
- Rule 3: Fuliza Repay
- Rule 4: Reversal
- Rule 5: Failed Transaction
- Rule 6: Fee Transaction
- Rule 7: Interest Charge
- Rule 8: Bank Transfer (via M-Pesa)
- Rule 9: Bulk/Business Transaction
- Rule 10: Merchant Payment
- Rule 11: Airtime/Subscription

#### Confidence Scoring Algorithm
```
confidence = baseConfidence * regexMatch * fieldValidation * deduplication
where:
  - baseConfidence = 0.85 for normal match, 0.70 for ambiguous
  - regexMatch = 0–1 (how well regex matched the SMS)
  - fieldValidation = 0.8–1.0 (all fields valid? date realistic? amount > 0?)
  - deduplication = 1.0 if new, 0.2 if duplicate
```

#### Semantic Hash Algorithm
```
semanticHash = SHA256(
  normalizeAmount(amount) +
  normalizeName(counterparty) +
  normalizeDate(date)
)
Used to detect duplicates across SMS from different sources
```

#### Deduplication Rules
- If semanticHash matches recent (< 24h) transaction: mark as duplicate
- If MPESA code matches: 100% duplicate
- If amount + counterparty + date within 5 min: likely duplicate

---

### 2.2 Recurring Rule Execution Algorithm (DETAILED)
**Status:** 🟡 VAGUE IN PLAN

#### Recurring Rule Schema (WatermelonDB)
```typescript
interface RecurringRule {
  id: string;
  userId: string;
  description: string;
  amount: number;
  category: string;
  type: "INCOME" | "EXPENSE" | "TASK";
  
  // Recurrence pattern
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
  dayOfWeek?: 0–6 (0=Sunday); // for WEEKLY
  dayOfMonth?: 1–31; // for MONTHLY
  monthOfYear?: 1–12; // for YEARLY
  
  // Skip pattern
  skipWeekends: boolean;
  skipHolidays: boolean; // if holiday calendar exists
  skipList: string[]; // ISO dates to skip (e.g., "2026-07-04")
  
  // Timezone
  timezone: string; // "Africa/Nairobi", "America/New_York", etc.
  
  // Execution
  nextRunAt: ISO8601 timestamp;
  lastRunAt?: ISO8601 timestamp;
  isActive: boolean;
  
  // End condition
  endDate?: ISO8601 date;
  occurrences?: number; // stop after N occurrences
  
  // Timestamps
  createdAt: ISO8601;
  updatedAt: ISO8601;
  deletedAt?: ISO8601; // soft delete
}
```

#### Execution Algorithm
```
function executeRecurringRules() {
  rules = getActiveRules()
  for each rule in rules:
    if rule.nextRunAt <= NOW() and rule.isActive:
      if canExecuteInTimezone(rule.timezone):
        if not shouldSkipDate(rule, NOW()):
          createTransactionFromRule(rule)
          advanceNextRunAt(rule)
          
function advanceNextRunAt(rule):
  currentNextRun = rule.nextRunAt
  loop:
    if rule.frequency == "DAILY":
      nextRun = currentNextRun + 1 day
    else if rule.frequency == "WEEKLY":
      nextRun = currentNextRun + 7 days
      if rule.dayOfWeek != null and dayOfWeek(nextRun) != rule.dayOfWeek:
        nextRun = nextDayOfWeek(currentNextRun, rule.dayOfWeek)
    else if rule.frequency == "MONTHLY":
      nextRun = addMonths(currentNextRun, 1)
      if rule.dayOfMonth != null and dayOfMonth(nextRun) != rule.dayOfMonth:
        nextRun = setDayOfMonth(nextRun, rule.dayOfMonth)
        if dayOfMonth(nextRun) != rule.dayOfMonth: // invalid day (e.g., Feb 30)
          nextRun = lastDayOfMonth(nextRun)
    // ... similar for YEARLY
    
    if shouldSkipDate(rule, nextRun):
      currentNextRun = nextRun
      continue loop
    else:
      break loop
  
  rule.nextRunAt = nextRun
  if endConditionMet(rule, nextRun):
    rule.isActive = false
  save(rule)
```

#### Edge Cases
- **DST Transitions:** If rule runs at 02:00 on day of DST change, handle gracefully (duplicate execution or skip; document choice)
- **End-of-month:** If rule is "monthly on day 31" and February is next month, run on Feb 28/29
- **Timezone changes:** If user changes timezone, recalculate nextRunAt
- **Offline:** If app offline when rule should execute, execute on next online + sync
- **Past due:** If rule is 5 days past nextRunAt (user didn't run app), execute once and advance (no catch-up)

---

### 2.3 Budget Alert Logic (DETAILED)
**Status:** 🟡 VAGUE IN PLAN

#### Budget Alert Schema
```typescript
interface Budget {
  id: string;
  category: string;
  allocatedAmount: number;
  alertThreshold: number; // % of budget (default 80%)
  alertFrequency: "ONCE" | "DAILY" | "PER_TRANSACTION"; // how often to alert
  lastAlertAt?: ISO8601;
  isActive: boolean;
}

interface BudgetAlert {
  id: string;
  budgetId: string;
  triggeredAt: ISO8601;
  reason: string; // "80% threshold reached", "110% over budget", etc.
  currentSpend: number;
  allocatedAmount: number;
  percentageUsed: number;
  dismissed: boolean; // user has seen this alert
}
```

#### Alert Execution Algorithm
```
function checkBudgets():
  for each budget in getActiveBudgets():
    currentSpend = sumTransactionsByCategory(budget.category, thisMonth)
    percentageUsed = currentSpend / budget.allocatedAmount
    
    if percentageUsed >= budget.alertThreshold:
      if shouldCreateAlert(budget):
        createBudgetAlert(budget, currentSpend, percentageUsed)
        scheduleNotification(budget)

function shouldCreateAlert(budget):
  lastAlert = budget.lastAlertAt
  now = NOW()
  
  if budget.alertFrequency == "ONCE":
    return lastAlert == null or different_month(lastAlert, now)
  else if budget.alertFrequency == "DAILY":
    return lastAlert == null or different_day(lastAlert, now)
  else if budget.alertFrequency == "PER_TRANSACTION":
    return lastAlert == null or > 1 hour since lastAlert
  else:
    return false
```

#### Edge Cases
- **Budget $0:** User sets budget to $0 (edge case); treat as "no spending allowed"
- **Spending exactly at threshold:** If threshold is 80% and user spends exactly 80%, trigger alert
- **User dismisses alert:** Don't re-alert until next period or next threshold breach
- **Budget updated mid-month:** Recalculate immediately
- **Multiple budgets:** If transaction affects multiple budgets, alert for each one over threshold

---

### 2.4 Categorization Rules (DETAILED)
**Status:** 🟡 PARTIALLY SPECIFIED

#### Categories Enum (from Kotlin app)
List all categories available in Kotlin app:
```
FOOD, GROCERIES, RESTAURANTS, TRANSPORT, TAXI, PUBLIC_TRANSPORT, FUEL,
UTILITIES, ELECTRICITY, WATER, INTERNET, PHONE, ENTERTAINMENT, GAMING,
MOVIES, BOOKS, SHOPPING, CLOTHING, HOME_SUPPLIES, HEALTH, MEDICAL,
PHARMACY, EDUCATION, TUITION, FEES, SUPPLIES, SUBSCRIPTIONS, FITNESS,
LEISURE, TRAVEL, ACCOMMODATION, INSURANCE, SAVINGS, INVESTMENTS,
INSURANCE, LOAN_PAYMENT, TRANSFER, BUSINESS, WORK_EXPENSE, OTHER
```

#### Auto-Categorization Rules
```
if (counterparty.includes("Safaricom") or counterparty.includes("Airtel")) => PHONE
else if (counterparty.includes("KRA") or counterparty.includes("Revenue")) => TAXES
else if (amount < 100) => likely FOOD, TRANSPORT, or SHOPPING
else if (amount > 5000) => likely major purchase or transfer
else if (dayOfMonth == 1 and amount > 10000) => likely SALARY (INCOME)
else => OTHER (user must categorize)
```

#### Merchant-to-Category Mapping
```
// Merchant default categories (user-configurable)
"Tuskys" => GROCERIES
"Nakumatt" => GROCERIES
"Uber" => TRANSPORT
"Safaricom" => UTILITIES
"Netflix" => ENTERTAINMENT
// ... hundreds more
```

#### Logic:
1. Check if transaction has explicit category → use it
2. Parse merchant name from counterparty
3. Check merchant-category mapping
4. If found, use mapped category
5. If not found, apply auto-categorization heuristics
6. If still ambiguous, assign UNCATEGORIZED and flag for review

---

### 2.5 Soft Delete Logic (DETAILED)
**Status:** 🟡 MENTIONED but NOT SPECIFIED

#### Soft Delete Fields
```
deleted_at: ISO8601 | null
deleted_by: string (user_id) | null
deletion_reason: string | null // "user-deleted", "duplicate", etc.
```

#### Query Logic
```
// All queries should filter out soft-deleted records by default
SELECT * FROM transactions WHERE deleted_at IS NULL

// Admin queries can include soft-deleted
SELECT * FROM transactions // include deleted

// Recovery: undelete a record
UPDATE transactions SET deleted_at = null WHERE id = ?
```

#### Soft Delete Behavior per Entity
- **Transaction:** Soft delete, allow undelete within 30 days, then permanent delete
- **Task:** Soft delete, hide from active list
- **Budget:** Soft delete, don't show in active budgets but preserve historical data
- **Recurring Rule:** Soft delete, don't execute but preserve history

#### Edge Cases
- User soft-deletes a recurring rule → do not execute from deletion date forward
- User soft-deletes a transaction → still included in historical analytics? (decision needed)
- Recovery after 30 days → permanent delete (cron job)

---

### 2.6 Sync State Logic (DETAILED)
**Status:** 🔴 UNDEFINED (Needed for future Supabase sync)

#### Sync State Enum
```
LOCAL: Created on device, not yet synced
PENDING: Queued for sync, waiting for network
SYNCED: Successfully synced to backend
FAILED: Sync failed (will retry)
CONFLICT: Server version differs from local (awaiting conflict resolution)
```

#### Sync State Transitions
```
LOCAL → PENDING (on save)
PENDING → SYNCED (on successful sync)
PENDING → FAILED (on sync error)
FAILED → PENDING (retry)
SYNCED → PENDING (local edit)
SYNCED → CONFLICT (server changed)
```

#### Conflict Resolution Logic
```
if localRecord.revision > serverRecord.revision:
  // Local is newer, overwrite server
  syncState = SYNCED
else if serverRecord.revision > localRecord.revision:
  // Server is newer, ask user
  showConflictResolution()
else:
  // Same revision, likely network duplicate
  syncState = SYNCED
```

---

## 3. UI/UX COMPONENT AUDIT

### 3.1 Core Component Inventory (DETAILED)
**Status:** 🔴 MASSIVELY INCOMPLETE IN PLAN

Create detailed component spec for **50+ components**:

#### Typography Components
- [ ] `Heading1` (font-size, weight, line-height)
- [ ] `Heading2`
- [ ] `Heading3`
- [ ] `Body` (regular, medium, semibold)
- [ ] `Caption` (small, subtle)
- [ ] `Label` (for form fields)
- [ ] `Error` (red, prominent)
- [ ] `Success` (green, prominent)

#### Layout Components
- [ ] `PageScaffold` (wraps page with status bar, safe area)
- [ ] `GlassCard` (translucent, blurred background)
- [ ] `AppCard` (standard card with padding, border)
- [ ] `Container` (max-width container)
- [ ] `Row` (horizontal flex)
- [ ] `Column` (vertical flex)
- [ ] `Spacer` (fixed spacing)
- [ ] `Divider` (horizontal or vertical line)
- [ ] `Section` (grouped content with title)

#### Input Components
- [ ] `TextInput` (text field, validation, error state)
- [ ] `NumberInput` (numeric field, decimals)
- [ ] `DatePicker` (native or custom)
- [ ] `TimePicker` (native or custom)
- [ ] `Dropdown` (select from list)
- [ ] `MultiSelect` (select multiple options)
- [ ] `Checkbox` (on/off toggle)
- [ ] `Radio` (single-select from group)
- [ ] `Toggle` (switch on/off)
- [ ] `SearchInput` (search field with clear button)
- [ ] `TagInput` (enter multiple tags)

#### Button Components
- [ ] `Button` (primary, secondary, tertiary variants)
- [ ] `IconButton` (icon-only button)
- [ ] `FloatingActionButton` (FAB)
- [ ] `ButtonGroup` (horizontal button group)

#### List & Table Components
- [ ] `List` (virtualized list)
- [ ] `ListItem` (single list item, customizable)
- [ ] `Table` (data table with columns)
- [ ] `DataGrid` (large table with sorting, filtering)

#### Modal & Overlay Components
- [ ] `Modal` (centered dialog)
- [ ] `BottomSheet` (slide-up overlay)
- [ ] `Popover` (small floating menu)
- [ ] `Tooltip` (hover/tap info)
- [ ] `Notification` (toast notification)
- [ ] `Alert` (alert dialog)
- [ ] `ConfirmDialog` (confirmation modal)

#### Navigation Components
- [ ] `BottomTabBar` (bottom navigation)
- [ ] `TopTabBar` (horizontal tabs)
- [ ] `BreadcrumbNavigation` (navigation path)
- [ ] `DrawerNavigation` (slide-in menu)

#### Data Display Components
- [ ] `Badge` (small label, colored)
- [ ] `Chip` (removable tag)
- [ ] `ProgressBar` (linear progress)
- [ ] `ProgressRing` (circular progress)
- [ ] `Skeleton` (loading placeholder)
- [ ] `Avatar` (user/merchant image)
- [ ] `Icon` (icon library)

#### Domain-Specific Components
- [ ] `TransactionCard` (shows transaction item)
- [ ] `BudgetProgressCard` (shows budget progress)
- [ ] `MetricCard` (shows KPI with comparison)
- [ ] `CategoryChip` (shows category with color)
- [ ] `MerchantCard` (shows merchant info)
- [ ] `TaskItem` (shows task with completion state)
- [ ] `EventItem` (shows event with time)
- [ ] `GoalProgressCard` (shows goal progress)
- [ ] `RecurringRuleCard` (shows rule info)
- [ ] `ChartContainer` (wraps chart with title, legend)
- [ ] `EmptyState` (shows when list is empty)
- [ ] `ErrorState` (shows when error occurred)
- [ ] `LoadingState` (shows loading indicator)

#### Animation Components
- [ ] `FadeIn` (fade-in animation)
- [ ] `SlideIn` (slide-in animation)
- [ ] `ScaleIn` (scale animation)
- [ ] `Spinner` (loading spinner)
- [ ] `Shimmer` (shimmer loading effect)

#### Chart Components
- [ ] `LineChart` (line graph)
- [ ] `BarChart` (bar graph)
- [ ] `PieChart` (pie/doughnut chart)
- [ ] `AreaChart` (area graph)

### 3.2 Component State Matrix
For each component, document:
- [ ] Default state (rendering)
- [ ] Hover state (if applicable)
- [ ] Active state (if applicable)
- [ ] Disabled state (if applicable)
- [ ] Loading state (if applicable)
- [ ] Error state (if applicable)
- [ ] Success state (if applicable)

### 3.3 Responsive Design Breakpoints
```
Mobile: < 768px
Tablet: 768px – 1024px
Desktop: > 1024px
```

For each screen, document layout for:
- [ ] Mobile (primary)
- [ ] Tablet (if applicable)
- [ ] Landscape (rotate handling)

### 3.4 Animation & Transitions
Document all animations:
- [ ] Tab change: crossfade (150ms)
- [ ] Modal open: slide-in from bottom (200ms)
- [ ] Transaction added: slide-in + fade (300ms)
- [ ] Button press: scale feedback (100ms)
- [ ] Loading spinner: continuous rotation

### 3.5 Typography Scale
```
Heading 1: 32px, weight 700, line-height 40px
Heading 2: 24px, weight 700, line-height 32px
Heading 3: 18px, weight 600, line-height 24px
Body: 16px, weight 400, line-height 24px
Body Medium: 16px, weight 500, line-height 24px
Small: 14px, weight 400, line-height 20px
Caption: 12px, weight 400, line-height 16px
```

### 3.6 Color Palette (Light & Dark Modes)
```
Primary: #007AFF
Secondary: #5AC8FA
Success: #34C759
Warning: #FF9500
Danger: #FF3B30
Neutral Light: #F2F2F7
Neutral Dark: #1C1C1E
Text Primary (light): #000000
Text Secondary (light): #999999
Text Primary (dark): #FFFFFF
Text Secondary (dark): #8E8E93
```

### 3.7 Spacing Scale (8px grid)
```
0: 0px
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
xxl: 48px
```

---

## 4. DATA MODEL & SCHEMA AUDIT

### 4.1 Complete Schema Mapping (DETAILED)
**Status:** 🔴 MISSING FROM PLAN

For each of the **25 SQLDelight schemas**, document:

#### Example: Transaction Table
```typescript
Table: transactions

Fields:
- id: String (Primary Key)
- user_id: String (FK to users.id)
- amount: Decimal (stored as INTEGER cents)
- currency: String (default "KES")
- counterparty: String
- category: String (enum or FK to categories.id)
- transaction_type: String ("INCOME" or "EXPENSE")
- mpesa_code: String (unique per transaction)
- description: String (optional)
- notes: String (optional)
- timestamp: Int (Unix timestamp, milliseconds)
- balance_after: Decimal (optional, from SMS parsing)
- is_pending: Boolean
- is_reversed: Boolean
- reversal_reason: String (optional)
- imported_from: String ("MPESA_SMS", "MANUAL", "CSV")
- confidence_score: Float (0–1, for parsed transactions)
- semantic_hash: String (for deduplication)
- created_at: Int (Unix timestamp)
- updated_at: Int (Unix timestamp)
- deleted_at: Int (Unix timestamp, soft delete)
- sync_state: String ("LOCAL", "PENDING", "SYNCED", "FAILED", "CONFLICT")
- revision: Int (for sync conflict resolution)

Indexes:
- PRIMARY KEY (id)
- UNIQUE (user_id, mpesa_code) [composite unique]
- INDEX (user_id, timestamp DESC)
- INDEX (category, timestamp DESC)
- INDEX (balance_after) [for analytics]
- INDEX (deleted_at)

Constraints:
- amount > 0
- timestamp <= NOW()
- user_id must exist in users table
- category must exist in categories table (if using FK)

Views:
- v_daily_spend: SUM(amount) GROUP BY DATE(timestamp)
- v_category_spend: SUM(amount) GROUP BY category
- v_pending_transactions: WHERE is_pending = true
```

#### Repeat for Each of 25 Tables:
1. transactions
2. tasks
3. events
4. budgets
5. incomes
6. recurring_rules
7. bills
8. fuliza_loans
9. goals
10. learning_sessions
11. assistant_conversations
12. assistant_messages
13. merchants (or merchant_categories?)
14. categories
15. import_audit
16. import_audit_entries
17. export_history
18. user_profile
19. notifications
20. reminder_settings
21. notification_history
22. currency_rates (if multi-currency)
23. merchant_default_category (mapping table)
24. budget_alerts
25. sync_metadata

---

### 4.2 Composite Key Strategy (DETAILED)
**Status:** 🟡 VAGUE IN PLAN

For each composite key table, document encoding:

#### Example: Transaction with (user_id, mpesa_code)
**Option A: Combine in ID**
```sql
id = user_id + "_" + mpesa_code
// "user123_LN987654321A"
// Pros: Simple, human-readable
// Cons: ID is long, might break indexing assumptions
```

**Option B: Separate fields + UNIQUE constraint**
```
id: String (generated UUID or auto-increment)
user_id: String
mpesa_code: String
UNIQUE (user_id, mpesa_code)
```

**RECOMMENDATION:** Use Option B (separate fields + UNIQUE constraint)

---

### 4.3 Data Type Mappings (DETAILED)
**Status:** 🟡 PARTIALLY SPECIFIED

| Kotlin Type | SQLDelight | WatermelonDB | RN TypeScript |
|---|---|---|---|
| `Int` | INTEGER | INTEGER | `number` |
| `Long` | INTEGER | INTEGER | `number` (BigInt for >2^53) |
| `Float` | REAL | REAL | `number` |
| `Double` | REAL | REAL | `number` |
| `Decimal` | TEXT or REAL | TEXT or REAL | `Decimal` library |
| `String` | TEXT | TEXT | `string` |
| `Boolean` | INTEGER (0/1) | BOOLEAN | `boolean` |
| `LocalDate` | TEXT (ISO8601) | TEXT (ISO8601) | `Date` or `string` |
| `LocalTime` | TEXT (HH:mm:ss) | TEXT (HH:mm:ss) | `string` |
| `LocalDateTime` | INTEGER (Unix ms) | INTEGER (Unix ms) | `number` |
| `Enum` | TEXT | TEXT | `string` (discriminated union) |
| `ByteArray` | BLOB | BLOB | `Uint8Array` |

**CRITICAL:** Amounts (prices, budgets) should be stored as **INTEGER (cents)** not REAL to avoid floating-point precision errors.

```kotlin
// Kotlin
val amount: Long = 100050 // 1000.50 KES

// SQLDelight
CREATE TABLE transactions (
  amount INTEGER NOT NULL -- stored as 100050
)

// WatermelonDB
@json('amount')
amount: number // stored as 100050

// TypeScript
const amount = 100050; // cents
const amountKES = amount / 100; // 1000.50
```

---

### 4.4 Migration Strategy (DETAILED)
**Status:** 🟡 PARTIALLY SPECIFIED

#### Initial Schema Creation
```
Version 0 (empty database):
- Create tables for: transactions, tasks, events, budgets, incomes, recurring_rules, ...
- Create indexes for: user_id, timestamp, category, ...
- Initialize schema_version = 0

Version 1 (first production version):
- schema_version = 1
- All tables as designed
```

#### Migration Process
```
function migrateDatabase(oldVersion, newVersion):
  for version in range(oldVersion + 1, newVersion + 1):
    runMigrationScript(version)
    updateSchemaVersion(version)

// Example migration: add column
function migrate_v1_to_v2():
  ALTER TABLE transactions ADD COLUMN confidence_score REAL DEFAULT 1.0
  ALTER TABLE transactions ADD COLUMN semantic_hash TEXT
```

#### Schema Versioning
```
// WatermelonDB schema versioning
const schema = appSchema({
  version: 1, // increment on schema change
  tables: [
    tableSchema({
      name: 'transactions',
      columns: [...]
    }),
    // ... more tables
  ]
})

const migrations = schemaMigrations({
  migrations: [
    {
      toVersion: 1,
      steps: [
        // migration steps
      ]
    },
    {
      toVersion: 2,
      steps: [
        // add column, rename, etc.
      ]
    }
  ]
})
```

#### Backward Compatibility
- Never drop columns (mark as deprecated instead)
- Always provide defaults for new columns
- Test migrations with real data before release
- Create migration test suite

---

## 5. NAVIGATION & ROUTING AUDIT

### 5.1 Route Tree (All ~30 Routes)
**Status:** 🟡 PARTIALLY SPECIFIED

Document every route with:
- Route name (constant)
- Path (if deep-linking)
- Params (if any)
- Deep link URL (if applicable)

```typescript
// Root Navigator
Routes = {
  // Root level
  ONBOARDING: "Onboarding",
  MAIN: "Main",
  AUTH: "Auth",
  
  // Main (tab bar)
  MAIN: {
    HOME: "Home",
    FINANCE: "Finance",
    CALENDAR: "Calendar",
    ASSISTANT: "Assistant",
    PROFILE: "Profile"
  },
  
  // Home stack
  HOME: "Home",
  HOME_DETAIL: { name: "HomeDetail", params: { transactionId: string } },
  
  // Finance stack
  FINANCE: "Finance",
  FINANCE_DETAIL: { name: "FinanceDetail", params: { transactionId: string } },
  FINANCE_ADD: "FinanceAdd",
  FINANCE_EDIT: { name: "FinanceEdit", params: { transactionId: string } },
  FINANCE_IMPORT: "FinanceImport",
  MERCHANT_DETAIL: { name: "MerchantDetail", params: { merchantId: string } },
  CATEGORY_DETAIL: { name: "CategoryDetail", params: { category: string } },
  
  // Calendar stack
  CALENDAR: "Calendar",
  CALENDAR_EVENT_DETAIL: { name: "EventDetail", params: { eventId: string } },
  CALENDAR_EVENT_ADD: "EventAdd",
  CALENDAR_EVENT_EDIT: { name: "EventEdit", params: { eventId: string } },
  CALENDAR_TASK_DETAIL: { name: "TaskDetail", params: { taskId: string } },
  CALENDAR_TASK_ADD: "TaskAdd",
  CALENDAR_TASK_EDIT: { name: "TaskEdit", params: { taskId: string } },
  
  // Assistant stack
  ASSISTANT: "Assistant",
  ASSISTANT_DETAIL: { name: "ConversationDetail", params: { conversationId: string } },
  
  // Planner stack
  PLANNER: "Planner",
  PLANNER_BUDGET: "PlannerBudget",
  PLANNER_BUDGET_DETAIL: { name: "BudgetDetail", params: { budgetId: string } },
  PLANNER_BUDGET_ADD: "BudgetAdd",
  PLANNER_BUDGET_EDIT: { name: "BudgetEdit", params: { budgetId: string } },
  PLANNER_INCOME: "PlannerIncome",
  PLANNER_INCOME_DETAIL: { name: "IncomeDetail", params: { incomeId: string } },
  PLANNER_INCOME_ADD: "IncomeAdd",
  PLANNER_INCOME_EDIT: { name: "IncomeEdit", params: { incomeId: string } },
  PLANNER_RECURRING: "PlannerRecurring",
  PLANNER_RECURRING_DETAIL: { name: "RecurringDetail", params: { ruleId: string } },
  PLANNER_RECURRING_ADD: "RecurringAdd",
  PLANNER_RECURRING_EDIT: { name: "RecurringEdit", params: { ruleId: string } },
  PLANNER_BILLS: "PlannerBills",
  PLANNER_BILLS_DETAIL: { name: "BillDetail", params: { billId: string } },
  PLANNER_LOANS: "PlannerLoans",
  PLANNER_LOANS_DETAIL: { name: "LoanDetail", params: { loanId: string } },
  PLANNER_GOALS: "PlannerGoals",
  PLANNER_GOALS_DETAIL: { name: "GoalDetail", params: { goalId: string } },
  PLANNER_EXPORT: "PlannerExport",
  PLANNER_SEARCH: "PlannerSearch",
  
  // Settings stack
  SETTINGS: "Settings",
  SETTINGS_THEME: "SettingsTheme",
  SETTINGS_NOTIFICATIONS: "SettingsNotifications",
  SETTINGS_LOCK: "SettingsLock",
  
  // Analytics stack
  ANALYTICS: "Analytics",
  ANALYTICS_DETAIL: { name: "AnalyticsDetail", params: { metric: string } },
  
  // Modals
  MODAL_SEARCH: "ModalSearch",
  MODAL_FILTER: "ModalFilter",
  MODAL_CONFIRM: "ModalConfirm",
}
```

### 5.2 Deep Linking (DETAILED)
Document deep link scheme for each major route:

```
# Transaction detail
beltech://transaction/{id}

# Budget detail
beltech://budget/{id}

# SMS import result
beltech://finance/import?source=sms&count=5

# Notification tap
beltech://notification/{notificationId}?action=view

# Recurring rule execution
beltech://transaction/create?from_rule={ruleId}&amount={amount}&category={category}
```

### 5.3 Navigation Guard Logic
```typescript
// Biometric lock overlay
if (biometricLockEnabled && timeSinceLastUnlock > lockTimeout):
  showBiometricLockOverlay()
  blockNavigation()
  onUnlockSuccess() => resumeNavigation()

// Force update overlay
if (updateAvailable && updateRequired):
  showUpdateOverlay()
  blockNavigation()
  onUpdateComplete() => resumeNavigation()

// Onboarding guard
if (!userData.onboardingComplete):
  navigate(ONBOARDING)
  blockNavigation()
```

---

## 6. PLATFORM-SPECIFIC FEATURES

### 6.1 Android-Only Features (DETAILED)
- [ ] SMS reading (permissions, content provider)
- [ ] Precise alarms (exact-time reminders)
- [ ] WorkManager (background tasks)
- [ ] AlarmManager (alarm clock)
- [ ] NotificationManager (notification channels)
- [ ] Download manager (OTA updates)

### 6.2 iOS-Only Features (DETAILED)
- [ ] UserNotifications (APNs)
- [ ] EventKit (calendar integration)
- [ ] HealthKit (if activity tracking in app)
- [ ] Keychain (secure storage)
- [ ] Background fetch (limited, unpredictable)

### 6.3 iOS Limitations vs. Android (DETAILED)
| Feature | Android | iOS | Mitigation |
|---|---|---|---|
| SMS Reading | ✅ Full access | ❌ No API | Manual entry form |
| Exact Alarms | ✅ AlarmManager | ⚠️ Approximate | Local notifications |
| Background Tasks | ✅ WorkManager | ⚠️ Unpredictable | Best-effort fetch |
| Biometrics | ✅ Face + Fingerprint | ✅ Face + Fingerprint | Use expo-local-authentication |
| Persistent Widgets | ✅ Available | ❌ Not available | Home screen shortcuts |

### 6.4 Capabilities Check (App Startup)
```typescript
function checkCapabilities() {
  on Android:
    - Check SMS permission (READ_SMS)
    - Check notification permission (POST_NOTIFICATIONS)
    - Check location permission (if used)
  on iOS:
    - Check notification permission (UNAuthorizationOptionAlert)
    - Check calendar permission (EKEventStore)
  
  StoreCapabilities {
    canReadSMS: boolean,
    canSendNotifications: boolean,
    canAccessCalendar: boolean,
    canUseBiometrics: boolean
  }
}
```

---

## 7. STATE MANAGEMENT & DATA FLOW

### 7.1 State Architecture (DETAILED)
**Status:** 🟡 VAGUE IN PLAN

```typescript
// WatermelonDB: Persistent Data (Source of Truth)
interface DatabaseState {
  transactions: Transaction[]
  tasks: Task[]
  events: Event[]
  budgets: Budget[]
  // ... all persistent entities
}

// Zustand: Ephemeral Global UI State
interface UIState {
  currentUser: User | null
  theme: "light" | "dark" | "system"
  biometricLockActive: boolean
  biometricLockTimeout: number
  updateAvailableOverlay: boolean
  isOnline: boolean
  lastSyncTime: number
}

// React Component State: Local UI State
interface ComponentState {
  isLoading: boolean
  selectedTransactionId: string | null
  editingBudgetForm: BudgetFormData | null
  searchQuery: string
  filterOptions: FilterState
}

// TanStack Query: Async Operations
interface AsyncState {
  transactions: QueryState<Transaction[]>
  parseSMS: MutationState<ParsedTransaction>
  createTransaction: MutationState<Transaction>
  exportData: MutationState<ExportData>
}
```

### 7.2 Data Flow Example: Add Transaction
```
1. User taps "Add Transaction" button
   → ComponentState.showAddModal = true

2. User fills form and taps "Save"
   → createTransactionMutation.mutate(formData)

3. TanStack Query validates input
   → Validate amount > 0, category valid, etc.

4. Save to WatermelonDB
   → DatabaseState.transactions += newTransaction
   → sync_state = "LOCAL"

5. UI updates (optimistic)
   → FinanceScreen re-renders with new transaction

6. (Optional) Sync to backend
   → UI shows "Syncing..." indicator
   → TanStack Query sends to Supabase
   → DatabaseState.sync_state = "SYNCED"

7. Update analytics
   → Zustand invalidateAnalytics()
   → HomeScreen metrics re-fetch

8. Show notification
   → "Transaction added successfully"
```

### 7.3 State Synchronization Rules
```
Rule 1: WatermelonDB is source of truth
  → Never duplicate data in Zustand/React state
  
Rule 2: UI updates from WatermelonDB
  → Use Watermelon observable subscriptions
  → React components subscribe via custom hooks
  
Rule 3: Mutations always hit WatermelonDB first
  → Optimistic UI update
  → Background sync if needed
  
Rule 4: Clear separation of concerns
  → Zustand: global UI state only
  → TanStack Query: async data + loading states
  → React: local component state
  
Rule 5: Invalidate caches on mutation
  → After creating transaction → invalidateQueries('transactions')
  → After budget change → invalidateQueries('budgets')
```

---

## 8. PERFORMANCE & OPTIMIZATION

### 8.1 Target Performance Metrics
- [ ] App startup time: < 3 seconds
- [ ] Transaction list (1000 items): scroll 60 FPS
- [ ] Filter transactions: < 500ms
- [ ] Analytics chart render: < 1 second
- [ ] Search results: < 300ms
- [ ] Export data: < 5 seconds
- [ ] Import data (1000 items): < 10 seconds

### 8.2 List Virtualization Requirements
- [ ] Transaction list: FlatList with `maxToRenderPerBatch=20`
- [ ] Task list: FlatList with `initialNumToRender=20`
- [ ] Event list: FlatList with same settings
- [ ] Calendar: Virtualized month view
- [ ] Search results: Virtualized list

### 8.3 Image Optimization
- [ ] Avatar images: max 100x100px, compressed
- [ ] Category icons: SVG (prefer) or PNG 48x48px
- [ ] Background images (glass-morphism): cached, preloaded

### 8.4 Bundle Size Optimization
- [ ] Tree-shaking: remove unused code
- [ ] Code splitting: lazy-load feature modules
- [ ] Chart library: use lightweight option (gifted-charts < 500KB)
- [ ] Target: App size < 50MB (uncompressed)

### 8.5 Database Optimization
- [ ] Indexes: on every foreign key + frequently filtered column
- [ ] Lazy queries: don't load all data upfront
- [ ] Pagination: load 50 items at a time
- [ ] Query caching: cache expensive queries (daily spend, monthly trends)

### 8.6 Memory Management
- [ ] Subscription cleanup: unsubscribe from Watermelon observables on unmount
- [ ] Image caching: use React Native image cache, set max size
- [ ] Listener cleanup: remove event listeners, timers on component unmount
- [ ] Periodic memory audit: monitor heap size in development

---

## 9. TESTING & VALIDATION

### 9.1 Unit Test Coverage (DETAILED)
- [ ] **Parser:** 100% coverage
  - [ ] Normal transactions
  - [ ] Fuliza transactions
  - [ ] Reversals
  - [ ] Edge cases (typos, special chars)
  
- [ ] **Repositories:** 80%+ coverage
  - [ ] CRUD operations
  - [ ] Soft delete
  - [ ] Composite key lookups
  - [ ] Query with filters
  - [ ] Pagination
  
- [ ] **Business Logic:** 80%+ coverage
  - [ ] Recurring rule execution
  - [ ] Budget alert calculation
  - [ ] Categorization logic
  - [ ] Deduplication
  
- [ ] **Validators:** 100% coverage
  - [ ] Amount validation
  - [ ] Date validation
  - [ ] Field required validation

### 9.2 Integration Tests
- [ ] Parser + Database: parse SMS, save to DB, verify record
- [ ] Recurring rules + Notifications: execute rule, create transaction, trigger notification
- [ ] Export + Import: export data, import into fresh DB, verify parity

### 9.3 E2E Test Scenarios (DETAILED)
**Scenario 1: New User Onboarding**
```
1. Launch app → see onboarding
2. Complete setup (theme, notifications, etc.)
3. Skip data import
4. See empty home screen
5. Add transaction manually
6. See transaction in finance screen
7. Set budget
8. See budget card in home screen
```

**Scenario 2: MPESA SMS Import (Android)**
```
1. Send SMS from Safaricom with transaction details
2. App reads SMS in background
3. Parse SMS → categorize → dedup
4. Create transaction
5. Show notification: "New MPESA transaction"
6. Tap notification → see transaction detail
7. Edit category if needed
8. Approve → save
9. See in analytics
```

**Scenario 3: Recurring Rule Execution**
```
1. Create recurring rule: salary on 1st of month
2. Wait for 1st of month (simulate with clock override)
3. App executes recurring rule
4. Transaction created automatically
5. Notification sent (if enabled)
6. Metrics updated
```

**Scenario 4: Data Export & Import**
```
1. Add multiple transactions (50+)
2. Export data → get JSON file
3. Uninstall app
4. Reinstall app
5. Import JSON → see all transactions
6. Verify record count matches
7. Verify amounts match
8. Verify categories match
```

**Scenario 5: Biometric Lock**
```
1. Enable biometric lock
2. Set timeout to 5 min
3. Lock and unlock device
4. Attempt to open app → biometric prompt
5. Unlock with biometric → access granted
6. Wait 5 min without interaction → lock
7. Attempt to open app → prompt again
```

### 9.4 Parser Parity Testing
```
// Parity test framework
test("Parser parity: normal transaction", () => {
  const sms = "LN123456789A sent to John Doe Ksh1000.00 on 30/06/2026 14:30"
  const kotlinOutput = runKotlinParser(sms)
  const rnOutput = runRNParser(sms)
  
  expect(rnOutput).toEqual(kotlinOutput)
  expect(rnOutput.confidence).toBe(0.95)
  expect(rnOutput.category).toBe("TRANSFER")
  expect(rnOutput.semanticHash).toBeDefined()
})

// Corpus testing: run 500+ SMS samples through both parsers
// Track: perfect match rate (should be 100%), divergence points, edge cases
```

### 9.5 UI Snapshot Testing
```
// Capture screenshots and compare to baseline
test("HomeScreen snapshot", () => {
  const { takeScreenshot } = render(<HomeScreen />)
  const screenshot = takeScreenshot()
  expect(screenshot).toMatchSnapshot()
})

// Visual regression: compare pixel-by-pixel to Kotlin app screenshot
expect(screenshot).toMatchSnapshot("HomeScreen_light_mode")
expect(screenshot).toMatchSnapshot("HomeScreen_dark_mode")
```

### 9.6 Accessibility Testing
- [ ] Screen reader: all interactive elements have labels
- [ ] Color contrast: all text meets WCAG AA (4.5:1)
- [ ] Touch targets: all buttons min 48x48pt
- [ ] Text scaling: app readable at 200% text size
- [ ] Dark mode: works properly, no contrast issues

### 9.7 Localization Testing
- [ ] Currency: all amounts display with correct symbol (KES, USD, etc.)
- [ ] Numbers: decimal separator varies by locale (KES: 1,000.50; some locales: 1.000,50)
- [ ] Dates: format matches user locale (DD/MM/YYYY vs. MM/DD/YYYY)
- [ ] Text overflow: all UI works with longer text (German, French)

---

## 10. MIGRATION & UPGRADE PATH

### 10.1 Data Migration from Kotlin App (DETAILED)
**Tool:** JSON export → RN import

**Pre-Migration (Kotlin App)**
- [ ] Add export feature to Kotlin app (if not present)
- [ ] Export schema: JSON array of all entities
- [ ] Include metadata: app version, export date, record count, checksum

**Export Format**
```json
{
  "metadata": {
    "app": "BELTECH",
    "version": "1.0.0",
    "exportDate": "2026-06-30T12:00:00Z",
    "recordCounts": {
      "transactions": 5420,
      "tasks": 234,
      "events": 145,
      "budgets": 12,
      "incomes": 8,
      "recurringRules": 15,
      "goals": 5
    },
    "checksum": "sha256..."
  },
  "data": {
    "transactions": [
      { "id": "uuid", "amount": 100050, "counterparty": "John Doe", ... },
      ...
    ],
    "tasks": [...],
    "events": [...],
    ...
  }
}
```

**Import Process (RN App, First Launch)**
```
1. Check if data exists locally
   if yes: resume app, skip import
   if no: show import prompt

2. Show file picker → select export JSON

3. Validate JSON
   - Check metadata present
   - Verify checksum
   - Check version compatibility

4. Import into WatermelonDB
   - Batch insert (1000 at a time)
   - Show progress: "Importing 5,420 transactions... 45%"

5. Post-import validation
   - Count records: expect 5420 transactions
   - Check referential integrity: all category FKs valid
   - Verify amounts: spot-check 10 random transactions

6. Success screen
   - "Successfully imported 5,420 transactions!"
   - "Go to home" button

7. Error handling
   if validation fails: show error, offer retry or skip import
```

### 10.2 Upgrade Path: Kotlin → RN App
```
User on Kotlin App v1.0.0:
1. Export data (backup)
2. Uninstall Kotlin app
3. Install RN app from Play Store / App Store
4. RN app detects first launch
5. Show "Import data?" prompt
6. Select export file from step 1
7. Import completes
8. User sees all data in RN app
```

### 10.3 Dual-App Migration (Optional Parallel Run)
```
If user wants to run both apps simultaneously:
- Kotlin app can export daily
- RN app can import latest export on launch
- Conflict resolution: RN transaction takes precedence (newer)
- Transition: user stops using Kotlin app, continues with RN app
```

---

## 11. ERROR HANDLING & EDGE CASES

### 11.1 Network Error Handling
- [ ] **No internet:** Show banner "You're offline", cache data locally
- [ ] **Slow network:** Show loading spinner if operation > 2 seconds
- [ ] **Timeout (30s):** Show error "Request timed out", offer retry
- [ ] **Server 5xx error:** Show error "Server error", offer retry
- [ ] **Rate limiting:** Show error "Too many requests", wait before retry

### 11.2 Database Error Handling
- [ ] **Schema mismatch:** Show error, offer reinstall
- [ ] **Corruption:** Attempt recovery, if failed, offer factory reset
- [ ] **Out of disk space:** Show warning, offer to delete old records
- [ ] **Database locked:** Retry operation, show spinner

### 11.3 Permission Errors (Platform-Specific)
- [ ] **SMS permission denied (Android):** Explain why needed, show permission prompt
- [ ] **Notification permission denied:** Explain, show settings link
- [ ] **Calendar permission denied:** Explain, show settings link
- [ ] **Biometric not available:** Fall back to PIN

### 11.4 Transaction Edge Cases
- [ ] **Amount = 0:** Validate, reject with error "Amount must be > 0"
- [ ] **Amount > 10M:** Accept, but warn "Very large amount"
- [ ] **Date in future:** Accept, but warn "Future-dated transaction"
- [ ] **Date > 1 year ago:** Accept, but show warning
- [ ] **Duplicate (exact match):** Warn "This looks like a duplicate", show original
- [ ] **Missing category:** Show modal "Choose a category", require selection

### 11.5 Budget Edge Cases
- [ ] **Budget = 0:** Interpret as "no spending allowed", set to strict
- [ ] **Spent > budget:** Show warning "Over budget by X", highlight in red
- [ ] **Budget < 100:** Allow, but show warning "Very low budget"
- [ ] **Multiple budgets:** Prevent overspending across all budgets

### 11.6 Recurring Rule Edge Cases
- [ ] **Rule: February 30th:** Convert to Feb 28/29 (last day of month)
- [ ] **Rule: weekends:** Skip if skipWeekends = true
- [ ] **Rule: DST transition:** Handle gracefully (duplicate execution or skip)
- [ ] **Rule: past due date:** Execute immediately on next app open (no catch-up)
- [ ] **Rule: user timezone change:** Recalculate next run with new timezone

---

## 12. ACCESSIBILITY & LOCALIZATION

### 12.1 Accessibility Requirements
- [ ] **Screen Reader:** All interactive elements labeled with `accessibilityLabel`
- [ ] **Color Contrast:** WCAG AA minimum (4.5:1 for text, 3:1 for UI elements)
- [ ] **Touch Targets:** All buttons min 48x48 pixels
- [ ] **Text Scaling:** App readable at 150%, 200% text size
- [ ] **Dark Mode:** High contrast, no hard-to-read colors
- [ ] **Keyboard Navigation:** All screens navigable without touch (Tab, Enter)
- [ ] **Focus Indicators:** Clear visual focus on keyboard navigation

### 12.2 Localization (i18n)
- [ ] **Languages:** English (en), Swahili (sw), possibly others (decide)
- [ ] **Currency:** KES, USD, other currencies (decide which to support)
- [ ] **Numbers:** Locale-specific decimal separator, thousands separator
- [ ] **Dates:** Locale-specific format (DD/MM/YYYY vs. MM/DD/YYYY)
- [ ] **Time:** 12h vs. 24h format (user preference)

### 12.3 RTL (Right-to-Left) Languages
- [ ] If supporting Arabic/Hebrew: test RTL layout
- [ ] Mirror navigation, buttons, animations
- [ ] Test on RTL device or emulator

---

## 13. SECURITY & PRIVACY

### 13.1 Data Encryption
- [ ] **At Rest:** All sensitive data encrypted (amount, counterparty, auth tokens)
- [ ] **In Transit:** All API calls over HTTPS/TLS 1.3
- [ ] **Local Storage:** Use MMKV with encryption for auth data

### 13.2 Biometric Security
- [ ] **Biometric Lock:** Require unlock to access app
- [ ] **Fallback:** PIN if biometric fails
- [ ] **Timeout:** Lock after configurable inactivity (1, 5, 15, 30 min)
- [ ] **Jailbreak/Root Detection:** Warn user if device is jailbroken (optional)

### 13.3 Authentication
- [ ] **Session Management:** Track login state, handle expiration
- [ ] **Logout:** Clear all sensitive data on logout
- [ ] **Multi-Device:** Clear other device sessions on logout (if supported)

### 13.4 Privacy
- [ ] **Data Collection:** Document what data is collected (transaction amounts, dates, counterparties)
- [ ] **Privacy Policy:** Link to privacy policy in app
- [ ] **Third-Party Libraries:** Vet for data collection (analytics, crash reporting)
- [ ] **No Tracking:** Unless explicitly opted in by user

### 13.5 SMS Permissions
- [ ] **Android:** Request READ_SMS permission only if SMS feature enabled
- [ ] **Explain Purpose:** "We read SMS to auto-import MPESA transactions"
- [ ] **Minimal Scope:** Request only read permission, not send/delete

---

## 14. BUILD, RELEASE & DEPLOYMENT

### 14.1 Build System
- [ ] **Expo Build:** Use EAS Build for Android/iOS builds
- [ ] **Custom Dev Client:** For SMS, biometrics, background work
- [ ] **CI/CD:** GitHub Actions → trigger EAS Build on push to main
- [ ] **Versioning:** Semantic versioning (1.0.0, 1.0.1, 1.1.0, etc.)

### 14.2 Release Channels
- [ ] **Development:** `main` branch → EAS develop channel
- [ ] **Beta:** `beta` branch → EAS preview channel (TestFlight/Google Play Beta)
- [ ] **Production:** `release` branch → EAS production channel (App Store/Play Store)

### 14.3 OTA Updates
- [ ] **Expo Updates:** Use `expo-updates` for JavaScript code updates
- [ ] **Version Checking:** App checks for updates on startup
- [ ] **Auto-Download:** Download in background, notify user
- [ ] **Staged Rollout:** Deploy to 5% of users first, monitor crashes, then 100%

### 14.4 Release Checklist
- [ ] Bump version number (versionCode, versionName)
- [ ] Update changelog
- [ ] Run tests (unit, E2E)
- [ ] Create GitHub release tag
- [ ] Build APK/IPA
- [ ] Upload to Play Console / App Store Connect
- [ ] Write release notes
- [ ] Submit for review
- [ ] Monitor crash reports post-release

### 14.5 App Store Guidelines Compliance
- [ ] **Play Store:** Follow Android app quality guidelines
- [ ] **App Store:** Follow App Store Review Guidelines (no private APIs, etc.)
- [ ] **Permissions:** Justify all permissions (SMS, notifications, etc.)
- [ ] **Privacy:** Transparent about data collection
- [ ] **Age Rating:** Get appropriate rating for content

---

## 15. DOCUMENTATION REQUIREMENTS

### 15.1 Architecture Documentation
- [ ] High-level architecture diagram (layers, components)
- [ ] Data flow diagram (how data flows through app)
- [ ] Database schema diagram (tables, relationships)
- [ ] Navigation graph (routes, transitions)
- [ ] State management architecture (Zustand, WatermelonDB, TanStack Query)

### 15.2 API Documentation
- [ ] Repositories: all methods, params, return types
- [ ] Services: business logic functions
- [ ] Hooks: custom React hooks (data fetching, state management)
- [ ] Components: all components with props, examples

### 15.3 Developer Guide
- [ ] Setup instructions (install dependencies, run dev client)
- [ ] Project structure (how files are organized)
- [ ] Coding standards (naming conventions, patterns)
- [ ] Git workflow (branch naming, commit messages)
- [ ] Testing guide (how to write tests, run test suite)
- [ ] Debugging guide (common issues, how to debug)

### 15.4 User Documentation
- [ ] Getting started guide
- [ ] Feature overview (screenshots, descriptions)
- [ ] FAQ (common questions)
- [ ] Troubleshooting (common issues, solutions)
- [ ] Privacy policy
- [ ] Terms of service

### 15.5 Release Notes
- [ ] What's new in this version
- [ ] Bug fixes
- [ ] Known issues
- [ ] Upgrade instructions (data migration if needed)

---

## SUMMARY OF CRITICAL GAPS

### 🔴 **CRITICAL (BLOCKING)** — Fix Before Phase 0
1. **Feature inventory spreadsheet** — All 30+ screens mapped to phases
2. **MPESA parser rules document** — All 11 rules documented with examples
3. **Parser test corpus** — 500+ SMS samples with expected outputs
4. **Component inventory** — 30–50 custom components cataloged
5. **Database schema mapping** — All 25 tables with fields, constraints, indexes
6. **Search feature allocation** — 2–3 weeks assigned to Phase 4 or 5
7. **Timeline revision** — 24 → 28–30 weeks
8. **iOS limitations documentation** — Explicit acknowledgment of background work constraints

### 🟡 **HIGH** — Fix Before Phase 1
9. **WatermelonDB pattern examples** — Show repository, query, subscription patterns
10. **State management decision matrix** — Clear Zustand vs. WatermelonDB split
11. **Recurring rule algorithm** — Timezone, DST, skip logic documented
12. **Budget alert logic** — Trigger conditions, frequency, edge cases
13. **Soft delete strategy** — Query patterns, retention period
14. **Sync state model** — For future Supabase sync
15. **SMS manual entry (iOS) UI design** — Wireframes, field validation
16. **Data migration validation** — Pre/post import checks
17. **Expanded risks section** — 15+ risks with mitigations
18. **Callback/hook patterns** — How component state syncs with Watermelon

### 🟠 **MEDIUM** — Clarify Before Phase 2
19. **Bills/Loans/Goals scope** — MVP vs. defer decision
20. **Learning sessions** — Unclear if in scope
21. **Merchant categorization ML** — Rule-based or ML-based?
22. **Timezone handling** — User timezone, transaction timezone
23. **Dual-app migration conflict** — What if both apps write simultaneously?
24. **Component state persistence** — Which component state survives app restart?
25. **Notification deep linking** — How do notification taps route to correct screen?

---

## ⚠️ SECTION 16 — GAPS FOUND BY DIRECT KOTLIN CODEBASE INSPECTION
### (Added after scanning all 415 source files — these are CONFIRMED real gaps, not estimates)

This section was added after a full inventory of the actual Kotlin codebase. Every item below is a **confirmed feature, screen, table, or behaviour that exists in the Kotlin app today** but is either completely absent or materially under-specified in both the original plan and the comprehensive audit above.

---

### 16.1 MISSING SCREENS (Confirmed in Kotlin, Absent from Plan)

#### 🔴 CategorizeScreen — ENTIRELY MISSING FROM PLAN
**Kotlin file:** `features/categorize/presentation/CategorizeScreen.kt`  
**ViewModel:** `CategorizeViewModel`  
**Route:** `categorize`

This is a **dedicated screen** for correcting and assigning transaction categories. It is separate from the transaction detail edit screen. Users reach it when a transaction is auto-categorized with low confidence or when they want to bulk-reclassify.

**Required deliverables:**
- [ ] Show transaction with current (inferred) category
- [ ] Category picker grid/list (all categories with icons, colors)
- [ ] Confidence indicator for inferred category
- [ ] Save → updates `category`, `inferred_category`, `inference_source`, `userCorrected` in merchant_categories table
- [ ] Back → cancel without saving
- [ ] "Apply to all from this merchant" toggle (bulk update)
- [ ] Navigation: reachable from TransactionDetail, ReviewQueue, and Import pipeline

---

#### 🔴 SmsImportHealthScreen — ENTIRELY MISSING FROM PLAN
**Kotlin file:** `features/settings/presentation/SmsImportHealthScreen.kt`  
**ViewModel:** `SmsImportHealthViewModel`  
**Route:** `sms_import_health`

A **diagnostic dashboard** for the SMS import pipeline. Users can see exactly what is happening with their M-Pesa SMS import — how many messages were processed, how many failed, why they failed, and overall pipeline health.

**Required deliverables:**
- [ ] Total SMS messages scanned
- [ ] Messages successfully parsed
- [ ] Messages quarantined (low confidence)
- [ ] Messages failed (parse error)
- [ ] Last import timestamp
- [ ] Per-message failure reasons (list)
- [ ] "Re-scan" button → trigger full historical SMS re-import
- [ ] "Clear audit log" button → purge import_audit table
- [ ] Link to ReviewQueue for pending items
- [ ] Visual health indicator (green/amber/red)

---

#### 🔴 ReviewQueueScreen — UNDER-SPECIFIED (treated as minor; it is a full screen)
**Kotlin file:** `features/settings/presentation/ReviewQueueScreen.kt`  
**ViewModel:** `ReviewQueueViewModel`  
**Route:** `review_queue`

The plan mentions "review queue" but only as a bullet in Phase 3. In the Kotlin app this is a **full dedicated screen** with complex state per transaction entry.

**ImportAudit outcome states (6 distinct values — all must be handled):**
```
needs_review          — parsed but confidence too low, user must approve
quarantine_for_review — failed parse, sent to quarantine
imported_quarantine   — quarantined but auto-imported with flag
candidate_pending     — candidate for import, awaiting batch confirmation
defer_to_batch        — deferred to next batch processing run
imported_batch_pending — batch-imported, pending final confirmation
```

**Required deliverables:**
- [ ] List of all import_audit entries filterable by outcome state
- [ ] Filter chips: "Needs Review", "Quarantined", "Pending", "Deferred"
- [ ] Per-entry: raw SMS text, parsed data, confidence score, failure reason
- [ ] Approve action → create Transaction, mark outcome = imported
- [ ] Reject action → mark outcome = rejected, remove from queue
- [ ] Edit before approve → open CategorizeScreen or TransactionEditScreen
- [ ] Bulk approve (all needs_review)
- [ ] Bulk reject
- [ ] Confidence score display per entry
- [ ] Empty state per filter

---

#### 🔴 FeeAnalyticsScreen — TREATED AS OPTIONAL, IS CONFIRMED CORE FEATURE
**Kotlin file:** `features/feeanalytics/presentation/FeeAnalyticsScreen.kt`  
**ViewModel:** `FeeAnalyticsViewModel`  
**Route:** `fee_analytics`

The plan says "fee analytics (if shown in Kotlin app)" — it IS confirmed in the Kotlin app as a **dedicated screen**, not just a section within Analytics.

**Fee categories tracked (from Kotlin source):**
- Airtime charges
- Fuliza charges (interest + fees)
- Bank charges (withdrawal fees)
- Subscription fees
- Withdrawal fees

**Required deliverables:**
- [ ] Total fees this month (summed across all types)
- [ ] Breakdown by fee type (pie chart or bar chart)
- [ ] Trend: this month vs. last month per fee type
- [ ] List of individual fee transactions (filterable by type)
- [ ] Total fees this year
- [ ] "Reduce fees" tips (if present in Kotlin app)
- [ ] Tap fee type → filter transactions by that fee type

---

#### 🔴 AuthScreen — MISSING FROM PLAN ENTIRELY
**Kotlin file:** `features/auth/presentation/AuthScreen.kt`  
**ViewModel:** `AuthViewModel`  
**Route:** `auth`

A dedicated authentication/login screen. The plan mentions "auth/onboarding placeholder flow" in Phase 1 but never plans it as a real screen with real logic.

**Required deliverables:**
- [ ] Login form (email/username + password OR phone number)
- [ ] Validation: required fields, email format
- [ ] Submit → authenticate user
- [ ] Error states: wrong credentials, account not found, network error
- [ ] "Forgot password" link (if supported)
- [ ] Transition to onboarding (first time) or home (returning user)
- [ ] Biometric login shortcut (if user has enrolled biometric)
- [ ] Navigation guard: if not authenticated → show AuthScreen

---

#### 🔴 ReviewScreen — UNDER-SPECIFIED (it is a full weekly/monthly digest screen)
**Kotlin file:** `features/review/presentation/ReviewScreen.kt`  
**ViewModel:** `ReviewViewModel`  
**Route:** `review`  
**Database:** `review_snapshots` table (with JSON payload)

The plan mentions "Review digest screens" in 4 words under Phase 4.6. This is a **substantial feature** — a structured personal productivity and finance digest.

**Required deliverables:**
- [ ] Weekly view: tasks completed, events attended, spending summary, mood/energy (if tracked)
- [ ] Monthly view: monthly spending vs. budget, goal progress, income vs. expenses
- [ ] ReviewSnapshot: snapshot is stored as a JSON payload in `review_snapshots.payload`
- [ ] Snapshot generation: triggered weekly (Sunday evening) by background worker
- [ ] View history: browse past weekly/monthly reviews
- [ ] "Weekly Ritual" card on HomeScreen links to ReviewScreen
- [ ] Export review as text/PDF

**ReviewSnapshot schema:**
```typescript
interface ReviewSnapshot {
  id: string
  userId: string
  periodStart: ISO8601
  periodEnd: ISO8601
  payload: string // JSON blob with review data
  createdAt: ISO8601
}
```

---

#### 🟡 StatementExportScreen — SEPARATE FROM REGULAR EXPORT
**Kotlin route:** `statement_export`

The Kotlin app has a separate `statement_export` route in addition to the regular `export` route. This is likely a formatted financial statement (PDF) rather than a raw data export.

**Required deliverables:**
- [ ] Select date range (from/to)
- [ ] Select export format (PDF statement vs. CSV data)
- [ ] Preview first page
- [ ] Generate and share
- [ ] Distinguish from general JSON/CSV export in Phase 7

---

#### 🟡 ProfileSubScreens (3 sub-screens, not 1)
**Kotlin file:** `features/profile/presentation/ProfileSubScreens.kt`  
**Routes:** `profile_info`, `profile_security`, `profile_preferences`

The plan says "ProfileScreen" — in reality this is **4 screens**:

- **ProfileScreen** — Main hub (name, avatar, stats, navigation to sub-screens)
- **ProfileInfoScreen** — Edit name, email, username, avatar (with photo picker on Android)
- **ProfileSecurityScreen** — Change password, biometric toggle
- **ProfilePreferencesScreen** — Notification toggles, theme (light/dark/system)

**Required deliverables for ProfileInfoScreen:**
- [ ] Edit display name
- [ ] Edit email address
- [ ] Edit username
- [ ] Change avatar (photo picker — Android uses Activity result contract for gallery/camera)
- [ ] Save changes → update users table

**Required deliverables for ProfileSecurityScreen:**
- [ ] Change password (current password, new password, confirm)
- [ ] Biometric toggle (enable/disable)
- [ ] Session management (logout all devices, if supported)

**Required deliverables for ProfilePreferencesScreen:**
- [ ] Notification toggles (per-type: reminders, budgets, digest)
- [ ] Theme selector (light/dark/system) — NOTE: this exists BOTH in Settings AND Profile
- [ ] Any other user preference from the Kotlin app

---

### 16.2 MISSING DATABASE TABLES (Confirmed in Kotlin, Absent from Audit)

#### 🔴 paybill_registry — COMPLETELY MISSING FROM AUDIT DOCUMENT
**Kotlin file:** `PaybillRegistry.sq`

This table tracks frequency-based paybill suggestions. When a user sends money to a paybill number multiple times, the app learns to suggest it.

```typescript
Table: paybill_registry

Fields:
- paybill_number: String (Primary Key)
- user_id: String (FK)
- display_name: String (human-readable name, e.g. "KPLC Prepaid")
- last_seen_at: Int (Unix timestamp)
- usage_count: Int (how many times used)
- last_amount_kes: Int (last amount sent, in cents)

Indexes:
- PRIMARY KEY (paybill_number, user_id)
- INDEX (user_id, usage_count DESC) -- for "most used" suggestions
- INDEX (last_seen_at DESC) -- for "recently used" suggestions

Use cases:
- Auto-suggest paybill when user types in Finance add screen
- Rank suggestions by usage_count (most used first)
- Show last amount as default when selected
```

---

#### 🔴 task_time_entries — MISSING FROM AUDIT DOCUMENT'S TABLE LIST
**Kotlin file:** `TaskTimeEntry.sq`

```typescript
Table: task_time_entries

Fields:
- id: String (Primary Key)
- user_id: String (FK)
- task_id: String (FK to tasks.id)
- started_at: Int (Unix timestamp ms)
- ended_at: Int (Unix timestamp ms, nullable if timer running)
- duration_minutes: Int (computed: (ended_at - started_at) / 60000)

Indexes:
- PRIMARY KEY (id)
- INDEX (task_id) -- for sum per task
- INDEX (user_id, started_at DESC)

Views / Derived queries:
- Total time per task: SUM(duration_minutes) WHERE task_id = ?
- Time this week: SUM(duration_minutes) WHERE started_at >= startOfWeek
- Most time-spent tasks: ORDER BY SUM(duration_minutes) DESC
```

**Impact:** The Tasks screen's time-tracking feature (start/stop timer) writes to this table. The Analytics screen's "productivity" view reads from it. The audit doc described the feature but omitted the table.

---

### 16.3 WRONG/INCOMPLETE FIELD SPECIFICATIONS (Confirmed from .sq files)

These are fields the audit document got wrong or omitted. The correct schema comes directly from the `.sq` source files.

#### Transactions table — field corrections
```
WRONG in audit:   counterparty: String
CORRECT:          merchant: String  ← field is named "merchant", not "counterparty"

MISSING fields:
- source_hash: String (hash of raw SMS source, for dedup)
- inferred_category: String (category assigned by ML/rules, before user override)
- inference_source: String ("rule", "merchant_map", "ml", "user")

WRONG in audit:   transaction_type: "INCOME" | "EXPENSE"
CORRECT transaction_type enum:
  SENT | AIRTIME | PAYBILL | BUY_GOODS | WITHDRAW | PAID | WITHDRAWN | FULIZA_CHARGE
  ← These are M-Pesa specific transaction types, NOT generic income/expense
```

#### Budgets table — field corrections
```
MISSING field:
- period: String ("MONTHLY" | "YEARLY")  ← budgets are period-aware, not just category limits
```

#### Events table — missing fields
```
MISSING fields:
- time_zone_id: String  ← timezone of the event (critical for calendar correctness)
- repeat_rule: String   ← recurrence rule (iCal RRULE format or custom)
- guests: String        ← JSON array of guest names/emails
- reminder_offsets: String  ← JSON array of reminder offsets in minutes (e.g. [15, 60, 1440])
- importance: String    ← event importance level
```

#### Tasks table — missing fields
```
MISSING fields:
- reminder_offsets: String  ← JSON array of reminder offsets (same as events)
- alarm_enabled: Boolean    ← whether AlarmManager alarm is set for this task
```

#### Goals table — field corrections
```
WRONG in audit:   target_amount, current_savings
CORRECT:          target_value, current_value  ← generic value, not just money
MISSING:          unit: String  ← "KES", "km", "books", "hours", etc. Goals are not just financial
                  status: String  ← "active", "completed", "archived", "paused"
```

#### Recurring rules table — field corrections
```
WRONG in audit:   frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY"
                  description: String
CORRECT:          cadence: String  ← field is named "cadence" not "frequency"
                  title: String    ← field is named "title" not "description"
```

#### Incomes table — missing field
```
MISSING:
- is_recurring: Boolean  ← whether this income is recurring (links to recurring_rules)
```

#### InsightCards table — missing fields
```
MISSING:
- fresh_until: Int  ← Unix timestamp when this insight expires and should be regenerated
- is_ai_generated: Boolean  ← distinguishes deterministic vs. ML-generated insights
```

#### MerchantCategories table — missing field
```
MISSING:
- userCorrected: Boolean  ← whether user has manually corrected this category
                             (if true, never auto-override with inference)
```

#### AssistantMessages table — missing field
```
MISSING:
- action_payload: String  ← JSON payload for action proposals
                            (e.g. {type: "ADD_TASK", title: "...", deadline: "..."})
                            This is how the assistant proposes actionable items
```

#### Users table — missing field
```
MISSING:
- username: String  ← separate from name and email (display handle)
```

---

### 16.4 MISSING BUSINESS LOGIC (Confirmed from Source Files)

#### 🔴 Offline Assistant Engine — Massively Under-Specified
**Kotlin files:**
- `OfflineAssistantEngine.kt` — Core NLP engine
- `IntentDetector.kt` — Classifies user intent
- `WorkspaceLoader.kt` — Loads user data context for the assistant
- `AssistantWorkspace.kt` — Snapshot of all user data the assistant can reason over
- `TemporalParser.kt` — NLP date/time parsing ("last week", "this month", "yesterday")
- `DataContextBuilder.kt` — Constructs context from WatermelonDB for reasoning
- `AssistantActionPayloads.kt` — Typed action payloads
- `BuildAssistantActionProposalUseCase.kt` — Builds proposed actions from user messages

The plan says "Port offline rule-based engine and action proposals" in one bullet. The actual engine is a **multi-component NLP system**:

**Required components to port:**
- [ ] **IntentDetector**: classify message into intents (QUERY_SPEND, ADD_TASK, SET_BUDGET, QUERY_BALANCE, etc.)
- [ ] **TemporalParser**: parse natural language dates ("last week", "in 3 days", "this month") into date ranges
- [ ] **WorkspaceLoader**: load snapshot of user's transactions, tasks, budgets, goals for context
- [ ] **AssistantWorkspace**: in-memory snapshot of user data (avoid DB calls per message)
- [ ] **OfflineAssistantEngine**: match intent → generate response from workspace data
- [ ] **AssistantActionPayloads**: typed payloads for each action type (ADD_TASK, FILTER_TRANSACTIONS, SET_BUDGET, etc.)
- [ ] **BuildAssistantActionProposalUseCase**: propose 1-3 actions based on detected intent
- [ ] **DefaultAssistantActionExecutor**: execute confirmed actions (write to DB, navigate, etc.)

**Intent categories to support:**
```
QUERY_SPEND        → "How much did I spend on food?" → load transactions, filter, sum
QUERY_BALANCE      → "What's my Fuliza balance?" → load fuliza_loans
QUERY_BUDGET       → "Am I over budget on transport?" → load budgets + transactions
ADD_TASK           → "Remind me to pay rent tomorrow" → propose AddTask action
FILTER_TRANSACTION → "Show me all Safaricom transactions" → navigate with filter
SET_BUDGET         → "Set a budget of 5000 for food" → propose SetBudget action
UNKNOWN            → fallback response with suggestions
```

---

#### 🔴 BiometricRelockCoordinator — Missing from Plan
**Kotlin file:** `bootstrap/BiometricRelockCoordinator.kt`

This coordinator manages app re-locking when the app goes to background. It is lifecycle-aware — it tracks when the app was last foregrounded and triggers the biometric lock when `lockTimeout` is exceeded.

**Required RN equivalent:**
- [ ] Listen to `AppState` changes (active/background/inactive)
- [ ] Record timestamp when app goes to background
- [ ] On foreground, check if time elapsed > lockTimeout
- [ ] If yes → show biometric lock overlay (Zustand: `biometricLockActive = true`)
- [ ] If no → allow navigation to continue
- [ ] On successful biometric unlock → clear lock state, record unlock timestamp
- [ ] On biometric failure → show retry or PIN fallback
- [ ] Edge case: app killed and reopened → treat as full timeout, require unlock

---

#### 🔴 OtaUpdatePromptHost — Missing from Plan
**Kotlin file:** `core/update/presentation/OtaUpdatePromptHost.kt`

A host composable that wraps the entire app and shows the update overlay when required. The plan mentions "OTA check" and "update blocker" in navigation guards but does not plan the prompt UI component.

**Required deliverables:**
- [ ] `UpdatePromptHost` wrapper component (React Native equivalent)
- [ ] On startup → `UpdateCheckCoordinator.checkForUpdate()`
- [ ] If `updateAvailable && updateRequired` → show blocking overlay
- [ ] Blocking overlay: version info, "Update Now" button, progress bar for download
- [ ] If `updateAvailable && !updateRequired` → show non-blocking banner
- [ ] Non-blocking banner: "Update available", "Later" / "Update" buttons
- [ ] SHA-256 checksum verification before install
- [ ] AppUpdateInfo table (`app_update_info`) for tracking checked/downloaded versions

---

#### 🔴 PaybillRegistry Smart Suggestions — Missing from Plan
**Kotlin files:** `PaybillRegistry.sq` + paybill suggestion logic in Finance add flow

When a user adds a new manual transaction with a paybill number, the app:
1. Checks `paybill_registry` for matching numbers
2. Returns ranked suggestions (by usage_count DESC, last_seen_at DESC)
3. When user selects a suggestion, pre-fills amount with `last_amount_kes`
4. After confirmed transaction, increments `usage_count` and updates `last_seen_at`

**Required deliverables:**
- [ ] `PaybillRepository.getSuggestions(userId)` — return top 5 most-used paybills
- [ ] `PaybillRepository.recordUsage(paybillNumber, amount)` — update after transaction
- [ ] Autocomplete in Finance add screen's paybill number field
- [ ] "Most used" section in Finance add screen (if user taps paybill field)

---

#### 🔴 InsightCard Freshness/Expiration — Missing from Plan
**Kotlin file:** `InsightCard.sq` (`fresh_until` column)

Insight cards have a `fresh_until` expiration timestamp. When `fresh_until < NOW()`, the card is stale and should be regenerated by the insights engine.

**Required deliverables:**
- [ ] `InsightRepository.getFreshInsights()` — only return cards where `fresh_until > NOW()`
- [ ] Background worker: check for stale insights, regenerate
- [ ] `InsightRepository.markStale(id)` — force regenerate
- [ ] `is_ai_generated` flag: different visual treatment for AI vs. rule-based insights
- [ ] Freshness indicator on card (optional, if shown in Kotlin app)

---

#### 🔴 Temporal Parser for Assistant — Missing from Plan
**Kotlin file:** `features/assistant/domain/TemporalParser.kt`

The assistant can answer questions like:
- "How much did I spend **last week**?"
- "Show me transactions from **this month**"
- "Remind me **tomorrow at 9am**"
- "What happened **in March**?"

This requires a **natural language date parser** that converts phrases to date ranges. The plan says nothing about this.

**Required deliverables:**
- [ ] Port or recreate TemporalParser in TypeScript
- [ ] Support: "today", "yesterday", "this week", "last week", "this month", "last month", "this year", "last year"
- [ ] Support: "in 3 days", "next Monday", "tomorrow at 9am", "March 2026"
- [ ] Return: `{ from: Date, to: Date }` date range
- [ ] Integrate into IntentDetector (for QUERY_SPEND, QUERY_BUDGET intents)
- [ ] Unit tests: cover 20+ phrase patterns

---

#### 🔴 Budget `period` Field Logic — Missing from Plan
**Kotlin:** `Budget.sq` has `period: TEXT` with values `MONTHLY | YEARLY`

Budgets are period-aware, not just category limits. A budget can be:
- Monthly: resets on 1st of each month
- Yearly: resets on Jan 1st

**Required deliverables:**
- [ ] Budget schema includes `period: "MONTHLY" | "YEARLY"`
- [ ] Monthly budget: calculate spend for current calendar month only
- [ ] Yearly budget: calculate spend for current calendar year only
- [ ] Budget reset logic: at period boundary, `spent` resets to 0 (or re-calculated fresh)
- [ ] UI shows "Monthly Budget" vs "Yearly Budget" label
- [ ] Add/edit budget form has period selector

---

#### 🔴 Transaction Type Enum — Plan Used Wrong Values
The plan assumed `transaction_type: "INCOME" | "EXPENSE"`. The actual Kotlin enum is M-Pesa-specific:

```
SENT          → Money sent to a person
AIRTIME       → Airtime purchase
PAYBILL       → Payment to a paybill number (utilities, etc.)
BUY_GOODS     → Payment via Buy Goods till number
WITHDRAW      → Cash withdrawal from agent
PAID          → Payment received
WITHDRAWN     → Withdrawal from bank to M-Pesa
FULIZA_CHARGE → Fuliza interest/fee charge
```

**Impact:** All transaction filtering, categorization logic, fee analytics, and display logic depends on this enum. Using the wrong values will break everything.

**Required deliverables:**
- [ ] Port exact enum values to TypeScript discriminated union
- [ ] Update all repository queries that filter by transaction_type
- [ ] Update FeeAnalyticsScreen to filter by FULIZA_CHARGE, WITHDRAW, AIRTIME
- [ ] Update categorization rules to use correct types
- [ ] Update display labels (PAYBILL → "Paybill", BUY_GOODS → "Buy Goods", etc.)

---

### 16.5 MISSING NAVIGATION ROUTES (Confirmed from Screen.kt)

The following routes exist in the Kotlin `Screen.kt` but are not in the RN plan's route tree:

| Route | Kotlin status | RN Plan status |
|---|---|---|
| `auth` | ✅ Real auth screen | ❌ Missing |
| `review` | ✅ Weekly review screen | ❌ Missing |
| `events` | ✅ Dedicated events list | ⚠️ Partially planned |
| `categorize` | ✅ Full screen | ❌ Missing entirely |
| `fee_analytics` | ✅ Full screen | ❌ Missing entirely |
| `sms_import_health` | ✅ Full screen | ❌ Missing entirely |
| `review_queue` | ✅ Full screen | ❌ Missing entirely |
| `statement_export` | ✅ Separate from `export` | ❌ Missing |
| `profile_info` | ✅ Sub-screen | ⚠️ Not detailed |
| `profile_security` | ✅ Sub-screen | ⚠️ Not detailed |
| `profile_preferences` | ✅ Sub-screen | ⚠️ Not detailed |
| `events?eventId&eventDate` | ✅ Deep link | ❌ Missing |

**Confirmed total routes: ~40+ (not ~30 as the plan states)**

---

### 16.6 ARCHITECTURE GAPS (Confirmed from Source)

#### expect/actual Pattern (Kotlin KMP → RN Platform)
The Kotlin app uses `expect/actual` to provide platform-specific implementations. In RN this becomes platform checks + native modules. The following platform-specific modules need explicit RN equivalents:

| Kotlin expect/actual | Android actual | RN equivalent |
|---|---|---|
| `MpesaSmsParserPlatform` | Full parser | TypeScript port |
| `BiometricAuth` | BiometricPrompt | `expo-local-authentication` |
| `OtaUpdateLauncher` | DownloadManager | `expo-updates` + custom |
| `BackgroundScheduler` | WorkManager | `expo-background-fetch` |
| `NotificationManager` | NotificationCompat | `notifee` |
| `CalendarAddScreen` | Android Activity | RN Modal |
| `ExportScreen` | Android Share sheet | `expo-sharing` |
| `ProfileScreen` | Android Activity | RN Screen |

Each of these needs explicit implementation planning in the RN project.

---

### 16.7 REVISED SCREEN COUNT

The plan says "~30 routes." The actual count from the Kotlin codebase:

| Category | Count |
|---|---|
| Primary tab screens | 5 |
| Home/Dashboard stack | 2 |
| Finance stack | 6 (Finance, Expenses, Categorize, MerchantDetail, FeeAnalytics, StatementExport) |
| Calendar stack | 4 (Calendar, Events, CalendarAdd, EventDetail) |
| Tasks stack | 2 (Tasks, TaskDetail) |
| Planner stack | 6 (Planner, Budget, Income, Recurring, Loans, Bills) |
| Analytics/Insights stack | 3 (Analytics, Insights, Review) |
| Search | 1 |
| Assistant | 1 |
| Settings stack | 5 (Settings, NotificationSettings, ScreenLock, SmsImportHealth, ReviewQueue) |
| Profile stack | 4 (Profile, ProfileInfo, ProfileSecurity, ProfilePreferences) |
| Auth/Onboarding | 3 (Auth, Onboarding, Changelog) |
| Export/OTA | 2 (Export, StatementExport) |
| Goals, Learning | 2 |
| **Total** | **~46 routes** |

**The plan must be updated from "~30 routes" to "~46 routes."** This is a +53% increase in navigation scope, which has a direct impact on Phase 1 (Navigation) and Phase 4 (UI) timeline estimates.

---

## FINAL UPDATED SUMMARY

### 🔴 CRITICAL CONFIRMED GAPS (From Actual Codebase)
1. **CategorizeScreen** — full screen + ViewModel, not in plan at all
2. **SmsImportHealthScreen** — full screen + ViewModel, not in plan at all
3. **ReviewQueueScreen** — full screen with 6 outcome states, massively under-specified
4. **FeeAnalyticsScreen** — confirmed core feature, treated as optional
5. **AuthScreen** — dedicated login screen, completely absent
6. **paybill_registry table** — missing from all 25-table schema lists
7. **task_time_entries table** — missing from all schema lists
8. **Transaction type enum wrong** — plan uses INCOME/EXPENSE; Kotlin uses SENT/AIRTIME/PAYBILL/BUY_GOODS/WITHDRAW/PAID/WITHDRAWN/FULIZA_CHARGE
9. **Route count wrong** — plan says ~30; actual is ~46
10. **Offline assistant engine depth** — IntentDetector, TemporalParser, WorkspaceLoader, ActionPayloads — multi-component NLP system, not one "rule-based engine"

### 🔴 CRITICAL FROM EARLIER AUDIT (Still Unresolved)
11. **Feature inventory spreadsheet** — All ~46 screens mapped to phases
12. **MPESA parser rules document** — All 11 rules documented with examples
13. **Parser test corpus** — 500+ SMS samples with expected outputs
14. **Component inventory** — 50+ custom components cataloged
15. **Database schema mapping** — All 27 tables (added paybill_registry + task_time_entries)
16. **Search feature allocation** — 2–3 weeks assigned
17. **Timeline revision** — 24 → 30–34 weeks (increased due to confirmed screen count)
18. **iOS limitations** — Background work constraints documented

### 🟡 HIGH GAPS (Still Unresolved)
19–28. (Same as earlier HIGH list, all still unresolved)

### 🟠 MEDIUM GAPS CONFIRMED
29. **Bills/Loans/Goals scope** — All confirmed as real screens in Kotlin, must be in plan
30. **Learning sessions** — Confirmed real screen (`LearningScreen.kt`), must be in plan
31. **ReviewScreen** — Confirmed real screen with JSON snapshot storage
32. **ProfileSubScreens** — 3 sub-screens confirmed, not 1 screen

---

## REVISED CONFIDENCE ASSESSMENT

| Aspect | Previous | After Codebase Scan | Notes |
|---|---|---|---|
| **Architecture** | 85% | 80% | expect/actual patterns add complexity |
| **Feature completeness** | 65% | 45% | 6+ confirmed missing screens |
| **Business logic parity** | 60% | 40% | Transaction type enum wrong; NLP engine depth missed |
| **Database parity** | 70% | 50% | 2 missing tables, multiple wrong/missing fields |
| **Timeline realism** | 55% | 40% | ~46 routes not ~30; CategorizeScreen/ReviewQueue etc. unplanned |
| **Testing rigor** | 70% | 70% | No change |
| **iOS platform** | 50% | 50% | No change |
| **Overall 1:1 Parity** | **65%** | **48%** | Codebase inspection revealed material new gaps |

## REVISED TIMELINE ESTIMATE

| Phase | Original | Revised | Reason |
|---|---|---|---|
| Phase 0 | 1 week | 2 weeks | Component catalog, planning docs |
| Phase 1 | 1 week | 2 weeks | ~46 routes not ~30 |
| Phase 2 | 3 weeks | 4 weeks | 27 tables not 25, complex field specs |
| Phase 3 | 3 weeks | 5 weeks | NLP engine (TemporalParser, IntentDetector, Workspace) |
| Phase 4 | 6 weeks | 10 weeks | 6 extra confirmed screens, deeper feature specs |
| Phase 5 | 2 weeks | 3 weeks | 3 profile sub-screens, biometric relock coordinator |
| Phase 6 | 3 weeks | 4 weeks | Review snapshot generation, paybill registry |
| Phase 7 | 2 weeks | 2 weeks | No change |
| Phase 8 | 3 weeks | 4 weeks | More screens = more E2E tests |
| **Total** | **24 weeks** | **36 weeks** | |

**Revised total: ~34–36 weeks for 2–3 senior engineers for true 100% parity.**

---

## RECOMMENDATION (UPDATED)

**DO NOT START WORK until ALL CRITICAL gaps are resolved.**

Pre-Phase-0 work required (2 weeks minimum):
1. ✅ Run through actual Kotlin source and extract exact field names for all 27 tables
2. ✅ Document all 11 MPESA parser rules with real regex from source
3. ✅ Map all 46 routes to phases with time estimates
4. ✅ Decide: Bills/Loans/Goals/Learning/Review — in MVP or Phase 9?
5. ✅ Design CategorizeScreen, ReviewQueueScreen, SmsImportHealthScreen
6. ✅ Document OfflineAssistantEngine full component breakdown
7. ✅ Fix transaction_type enum to match Kotlin exactly

---

*Audit v3.0 — 2026-06-30*  
*Confidence: 48% → Target after all fixes: 92%+*  
*Status: NOT READY to start. Pre-Phase-0 planning work required.*
