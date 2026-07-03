# Phased Plan: React → 1:1 Parity with Kotlin (Source of Truth)

Scope: all main screens + deeper pages (forms, modals, sub-flows). Excludes SMS parser/pipeline and Supabase cloud sync per earlier decisions. Built from the two verified audits (main screens + deep screens) — every item below traces back to a cited file:line finding.

Before starting, two things need your call (see "Open Decisions" at the bottom) — everything else is ready to execute in order.

\---

## Phase 0 — Design System Foundation

*Build first: every later phase leans on these shared components, so building them once here avoids rework.*

* \[ ] `PageScaffold` — universal screen wrapper (eyebrow/title/subtitle/back/actions/contentPadding)
* \[ ] `HeroSurface` — gradient hero header w/ eyebrow/title/subtitle/leading/action/footer slots
* \[ ] `TopBanner` — floating alert, tone variants (ERROR/SUCCESS/INFO)
* \[ ] `InlineBanner` — inline alert, tone variants (WARNING/SUCCESS/INFO)
* \[ ] `ShimmerLoadingState` — animated skeleton loader (replace bare spinners)
* \[ ] `LifeOSSwitch` — custom-styled toggle (replace native Switch)
* \[ ] Promote existing narrow components to shared, generic versions:

  * `CalendarEmptyState` → generic `EmptyState`
  * `SearchFilterBar` → extract generic `SearchField`
  * `CalendarTaskItem` → extract generic `TaskRow`
  * `BudgetStatusWidget` → extract standalone `BudgetProgressIndicator`
  * `CalendarEventItem` → extract simple `CalendarEventChip`

**Exit criteria:** components exist and are used by at least one screen; no visual regression on that screen.

\---

## Phase 1 — Auth \& Onboarding (biggest single gap found)

* \[ ] **AuthScreen**: add Full Name + Username fields, branding/logo header, loading state w/ spinner, snackbar host for errors/success. Current React screen is a title+button stub — needs full rebuild against `AuthScreen.kt`.
* \[ ] **OnboardingScreen**: rebuild as 5-step wizard matching `OnboardingScreen.kt`:

  1. Welcome (3 feature rows)
  2. 3 Pillars (Productivity / Calendar / Finance)
  3. Name + Goal selection (3 options)
  4. Background permission request
  5. Confirmation ("All set")
  * Progress dots (5, active state)
  * Context-aware CTA text ("Let's Begin" → "Continue" → "Start My Journey")
  * Inline error banner

**Exit criteria:** fresh install walks through all 5 steps with matching copy and flow logic.

\---

## Phase 2 — Missing Full Screens

* \[ ] **CategorizeScreen** (entirely absent in React) — build from `CategorizeScreen.kt`:

  * Counter "X transactions need a category"
  * Merchant group cards (animated, swipe-out on assign)
  * Card: merchant name, transaction count badge, latest date, total amount
  * Category dropdown (16 categories)
  * Success/error banners, empty state when all categorized
* \[ ] **Transaction Add/Edit form** (confirmed missing — React only has a read-only `TransactionDetailScreen`) — build from `FinanceDialogs.kt:68-168`:

  * Add: Amount, Merchant/Description, Category (opens picker)
  * `CategoryPickerBottomSheet` equivalent — icon + color per category
  * Wire into existing "Edit Transaction" button in `TransactionDetailScreen.tsx` (button exists but has nothing to open)

**Exit criteria:** a transaction can be added, edited, and categorized end-to-end without going through SMS import.

\---

## Phase 3 — Finance Screen (main + cards)

* \[ ] Add missing cards to `FinanceScreen.tsx`:

  * Fuliza Outstanding card (loan count, limit, interest warning)
  * Service Charges/Fees card
  * Spending Pace/Velocity card (with projections)
  * Review Queue card ("Open" button)
  * Export Nudge card
  * Uncategorized transactions banner ("Organize" button → Phase 2's Categorize screen)
* \[ ] Add "Month" metric to summary strip (currently Today/Week only)
* \[ ] Fix label: "Export" → "Export Data"

**Exit criteria:** Finance screen shows all 6 insight cards + 3-metric strip matching Kotlin.

\---

## Phase 4 — Planner Group: List Screens + Forms

Work screen-by-screen; each has a list-screen pass and a form-screen pass.

**Budget**

* \[ ] List: add period label (Daily/Weekly/Monthly) and status dot to category cards
* \[ ] Form: reconcile fields — Kotlin has Category/Period/Limit + daily-equivalent helper text; React adds a Threshold slider not in Kotlin (see Open Decisions)

**Income**

* \[ ] List: add entry-count subtitle, delete button on card, notes field display
* \[ ] Form: reconcile fields — Kotlin is Source(dropdown)/Amount/Note only; React adds Date, Recurring toggle, Frequency (see Open Decisions)

**Bills**

* \[ ] List: add eyebrow "Recurring Obligations", active-bill count subtitle, notes field display, "Mark Paid" action button, delete button; convert cycle/due-date plain text back to styled chips with overdue color-coding
* \[ ] Empty state: use full `EmptyState` component instead of plain text
* \[ ] Form: reconcile fields — Kotlin is Title/Amount/Cycle/NextDueDate/Notes; React adds Paid-status + Is-active toggles (see Open Decisions); Cycle dropdown should use the full `BillCycle` enum, not a hardcoded 4-item list

**Goals**

* \[ ] List: add eyebrow "Personal Growth", goal-count subtitle, category label, description text, deadline as styled chip, "Mark Complete" button, delete button; replace header-button add-action with ExtendedFAB "Add Goal"
* \[ ] Form: reconcile fields — Kotlin is Title/Description/Target/Unit/Category/Deadline; React adds Current-value + explicit Status segment (see Open Decisions)

**Recurring**

* \[ ] List: add eyebrow "Automation", subtitle, styled empty state, enable/disable toggle switch on card, delete button; replace header-button add-action with ExtendedFAB "Add rule"
* \[ ] Form: reconcile fields — Kotlin is Title/Amount/Type/Cadence; React adds Next-run-date + conditional Category + Enabled toggle (see Open Decisions); Cadence list should include Kotlin's BIWEEKLY and MON\_FRI options (React currently swaps these for HOURLY)

**Exit criteria:** every planner list screen shows the same fields/actions as Kotlin's card; every form has the same field set (pending Open Decisions resolution).

\---

## Phase 5 — Loans / Fuliza Screen

* \[ ] Add Outstanding summary card at top (Net Outstanding, color-coded warning/success)
* \[ ] Add "Open Draws" / "Repaid" section grouping with divider
* \[ ] Fix title: "Loans" → "Loans \& Fuliza"; add eyebrow "Finance Tools" + subtitle
* \[ ] Fix card field: "Remaining" → "Repaid: KES X" in the same slot
* \[ ] Fuliza limit modal: align copy/labels with Kotlin's `FulizaLimitDialog` (debt-tracking framing, "Later" vs "Cancel" button wording) — decide which wording is canonical

**Exit criteria:** Loans screen visually and structurally matches Kotlin including the summary card and section grouping.

\---

## Phase 6 — Tasks Screen

* \[ ] Add swipe-to-dismiss interaction (left = delete, right = complete)
* \[ ] Add Completed Tasks section (top 20, collapsible)
* \[ ] Add delete confirmation dialog
* \[ ] Task form: confirm/align with `CalendarAddScreenOverlay`'s task fields once Phase 8's investigation resolves what Kotlin's real implementation contains (see Open Decisions)

**Exit criteria:** swipe gestures work, completed section renders and collapses, delete requires confirmation.

\---

## Phase 7 — Calendar Screen

* \[ ] Add event-kind grouping in day view: Events / Birthdays / Anniversaries / Countdowns as separate sections with colored headers (currently one flat list)
* \[ ] Event form: confirm/align fields once Kotlin's actual (non-stub) implementation is located (see Open Decisions)

**Exit criteria:** day view groups items by kind with matching section headers.

\---

## Phase 8 — Settings Screen (incl. deep sub-screens)

* \[ ] Convert Notifications from separate-screen navigation to inline toggles (Budget alerts / Daily digest / Background activity) to match `SettingsScreen.kt:400-434`
* \[ ] Rebuild `NotificationsScreen` content to match `NotificationSettingsScreen.kt`: Enable-notifications toggle, Budget-threshold alerts (toggle + high/medium/low slider trio), Daily digest (toggle + time picker)
* \[ ] Add biometric relock row (toggle + timeout dropdown: 1/5/15/30 min)
* \[ ] Add Advanced Permissions section
* \[ ] Add success info banner (auto-dismiss 3s)
* \[ ] Security section: render full inline card instead of always using nav-only rows
* \[ ] SMS Import Health screen: show true receiver status (Active/Inactive/Unknown) instead of hardcoded "Active"; add the "last error" details card when present

**Exit criteria:** Settings screen and its Notifications/SMS-health sub-screens match Kotlin's inline structure and real-status reporting.

\---

## Phase 9 — Home Screen

* \[ ] Add "Month" metric to summary strip
* \[ ] Add error banner (TopBanner, ERROR tone)
* \[ ] Add shimmer loading state (replace spinner-only RefreshControl)

**Exit criteria:** Home shows 3 metrics, surfaces load errors, and shows skeleton content while loading.

\---

## Phase 10 — Profile Screen (incl. edit flow)

* \[ ] **Remove** Account Statistics section (React-only, not in Kotlin)
* \[ ] **Remove** "Reset onboarding" button (React-only, not in Kotlin)
* \[ ] Add photo management bottom sheet (View / Choose from gallery / Remove)
* \[ ] Add success snackbar
* \[ ] Profile edit flow: Kotlin's actual implementation wasn't locatable in this audit (`ProfileComponents.kt` reads empty) — needs a targeted follow-up read before reconciling `PersonalInformationScreen.tsx`'s field-level-modal pattern against it (see Open Decisions)

**Exit criteria:** Profile screen shows only Kotlin-equivalent sections; photo management and snackbar work.

\---

## Phase 11 — Search Screen

* \[ ] **Remove** Advanced filter panel (min/max amount, date range) — not in Kotlin
* \[ ] **Remove** Merchant result type — not in Kotlin
* \[ ] Add missing filter types to match Kotlin's 8: Birthday, Anniversary, Countdown, Recurring (React currently has 6)

**Exit criteria:** filter chip set and result types match Kotlin's `SearchResultFilter` enum exactly.

\---

## Phase 12 — Weekly Review Screen

* \[ ] **Remove** "Chat with Assistant" button — not in Kotlin
* \[ ] Make the Momentum/Ritual card conditional (only render if a ritual exists), matching Kotlin — currently React always shows it

**Exit criteria:** Review screen shows only Kotlin-equivalent cards/buttons.

\---

## Phase 13 — Analytics / Insights Screens

* \[ ] Fix title: "Insights" → "Analytics"; add subtitle "Productivity and finance trends in one place"
* \[ ] Add Weekly Spending Bar Chart
* \[ ] Add Weekly Spend-by-Category stacked chart
* \[ ] Add AI-generated Insight Cards section
* \[ ] Add Productivity Card
* \[ ] Trim period-range options from 5 (This Month/Last Month/3M/6M/Year) down to Kotlin's 2 (This Week/This Month) — or confirm you want to keep the extra ranges (see Open Decisions)
* \[ ] Decide whether to split into two screens (Analytics + Insights) to match Kotlin's structure, or keep merged and just match content (see Open Decisions)

**Exit criteria:** Analytics screen title, charts, and cards match Kotlin; period options resolved per decision.

\---

## Phase 14 — Full Re-Verification Pass

* \[ ] Re-run the same evidence-based audit methodology (file:line citations, no assumptions) across every screen touched in Phases 0–13
* \[ ] Confirm every "confirmed match" item from the original audits is still true (no regressions introduced while building the above)
* \[ ] Produce a final parity percentage with citations

**Exit criteria:** re-audit reports 0 confirmed gaps (or only the explicitly-accepted exceptions from Open Decisions below).

\---

## Open Decisions (need your call before or during the relevant phase)

1. **Form fields React has that Kotlin doesn't** (Income date/recurring, Bills paid/active toggles, Goals current-value/status, Recurring next-run-date/category, Budget threshold slider). Strict 1:1 means removing these. But they look like genuine functionality improvements, not accidental drift. Remove them, or keep and treat as an accepted exception?
2. **Transaction Add/Edit form** — confirmed missing in React entirely. Build it to match Kotlin's dialog+bottomsheet pattern (Phase 2)?
3. **Kotlin's real Calendar/Task overlay implementation** — the commonMain file is a platform-specific no-op; the actual logic lives in an Android/iOS-specific file not yet located. Needs a follow-up read before Phases 6–7 can fully reconcile form fields.
4. **Kotlin's Profile edit implementation** — not locatable in this audit pass (file appears empty). Needs a follow-up read before Phase 10 can fully reconcile.
5. **Analytics screen structure** — merge (current React approach) or split into two screens like Kotlin?
6. **Two items point the other way** (Kotlin is behind React, not the reverse) — flag to whoever owns the Kotlin codebase rather than downgrading React:

   * Planner Hub is missing the "Goals" tool
   * Export screen is an unimplemented desktop stub

\---

## Suggested Execution Order

Phase 0 → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14

Phases 3, 9, 11, 12 are small/fast and could be parallelized with the Planner-group work in Phase 4 if you want faster wall-clock progress rather than strict sequencing.

