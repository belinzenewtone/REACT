# RFINAL Fix & Build Plan

## Objective
Deliver a hardened, polished LifeOS build with:
- A best-in-class M-Pesa SMS parser (faster, more accurate, more efficient).
- Pixel-perfect UI consistency across onboarding → main pages → deepest detail screens.
- All notification channels wired correctly (quick suggestions, budget thresholds with 3 alert levels, daily digest, task/event/birthday/anniversary/countdown reminders + alarm reminders).
- Every action toggle working (active/inactive, done/undone, paid/unpaid, enabled/disabled) across every page.
- Clean first-launch state with no seed/sample data.
- Spending-by-category pie chart removed (bar chart remains).
- Locally signed split APKs for `arm64-v8a` and `armeabi-v7a` using `local-expo-build`.

---

## Phase 0 — Baseline & Build Infrastructure
1. Confirm current Git state and pre-existing modifications.
2. Verify TypeScript compiles (`npx tsc --noEmit --project tsconfig.json`).
3. Verify Kotlin unit tests (`./gradlew :lifeos-sms:compileDebugKotlin :lifeos-sms:testDebugUnitTest`).
4. Fix Windows long-path build failure by using the existing `X:` subst drive for Gradle builds.
5. Ensure `local-expo-build` scripts are up-to-date and `tsconfig.json` excludes `local-expo-build`.

**Acceptance:** Baseline checks pass; a release Gradle build can run to completion without `ninja mkdir` path errors.

---

## Phase 1 — Immediate UI Polish (Screenshot Issues)
1. **TasksScreen.tsx**
   - Make task checkbox a perfect 24×24 circle with a 2 px border.
   - Ensure checked state uses a filled circular background + checkmark.
   - Reduce swipe delete/complete action width from 80 to 56 and keep it flush with the card radius.
2. **SearchScreen.tsx**
   - Add top padding to the filter chips row so it no longer touches the search bar.
3. **CalendarTaskItem.tsx & TaskRow.tsx**
   - Align checkbox styling with TasksScreen (24×24 circular).

**Acceptance:** Screenshots match the intended design; no clipped or oversized elements.

---

## Phase 2 — Global Design Consistency Audit
1. Define a shared `Checkbox` component (24×24 circle, 2 px border, checked fill) and replace every ad-hoc checkbox.
2. Define shared `SwipeAction` constants and ensure all swipeable rows use the same 56 dp width.
3. Audit every screen for:
   - Text truncation/clipping (titles, descriptions, amounts).
   - Touch targets (min 44×44).
   - Header/subheader spacing.
   - Bottom safe-area / tab-bar insets.
   - Empty-state alignment.
4. Standardize card radius, padding, gap, and shadow/elevation.
5. Audit onboarding → auth → main tabs → list screens → forms → detail screens.

**Acceptance:** Visual walkthrough shows consistent sizing, spacing, and no cut-off text or buttons on all screens.

---

## Phase 3 — SMS Parser 100% Push
1. **Accuracy**
   - Expand detection rule coverage for edge-case M-Pesa formats (old SMS, non-English fragments, truncated receipts).
   - Improve counterparty cleaning (agent floats, Paybill account numbers, Kopokopo, till numbers).
   - Harden date parsing for `dd-MMM-yy`, `MMM dd, yyyy`, and missing-time fallbacks.
   - Add heuristic for received reversals vs outgoing reversals.
2. **Efficiency**
   - Keep all regexes pre-compiled; avoid allocation inside the parse loop.
   - Cache normalised bodies and hashes across batches.
   - Use a single pass over the SMS where possible.
3. **Confidence scoring**
   - Refine the 6-factor weighted score thresholds; add penalty for missing balance on high-value txs.
4. **Observability**
   - Add parse success/rejection metrics accessible from JS.
   - Preserve rejection log with reasons.
5. **Feedback loop (optional but recommended)**
   - Add `merchantLearned` table/API so corrected categories improve future parses.

**Acceptance:** Unit tests cover ≥20 real-world SMS samples with >95% accuracy; parser completes 1,000 SMS in <100 ms on a mid-range device.

---

## Phase 4 — Notification Pipeline End-to-End
1. **Permissions**
   - Request exact alarm + notification permissions on first launch and in Settings.
2. **Quick suggestions → notifications**
   - Toggling "Enable notifications" in quick suggestions correctly registers all channels.
3. **Budget thresholds**
   - 3 alert levels (50%, 80%, 100%) each fire once per budget period.
   - Persist fired alerts and reset on new period.
   - Re-evaluate after SMS import, manual save, CSV import, categorisation, and transaction delete.
4. **Daily digest**
   - Time picker persists and schedules a daily repeating trigger.
   - State (enabled/disabled) cancels or reschedules correctly.
5. **Task reminders**
   - Creating/updating/completing/deleting a task syncs reminders.
6. **Event / birthday / anniversary / countdown reminders**
   - Alarm reminders and regular reminders are scheduled at the right time.
   - Updating date/time/alarm settings updates/cancels stale reminders.
7. **Master toggle**
   - Notifications screen master toggle cancels everything when off and reschedules everything when on.

**Acceptance:** Every notification setting change results in the expected `expo-notifications` schedule/cancel call; no duplicate or stale notifications.

---

## Phase 5 — Action Trigger Audit Across Every Page
1. Identify every toggle/action: task complete, bill paid/unpaid, recurring enabled/disabled, budget active/inactive, event alarm on/off, notification quick suggestions, daily digest toggle.
2. Verify each calls the correct repository method and then refreshes the UI/store.
3. Fix any mismatches where the button toggles state but the database/store is not updated.
4. Ensure optimistic UI updates where appropriate.
5. Audit deeper pages: TaskDetail, EventDetail, BillForm, RecurringForm, BudgetForm, TransactionDetail, CalendarScreen, PlannerScreen, Settings.

**Acceptance:** Every tap that should change state produces the correct DB update and UI reflection; undo/revert works where provided.

---

## Phase 6 — Clean Start & Analytics Cleanup
1. Remove all sample/seed data insertion from first-launch hooks and database initialisation.
2. Remove `CategoryBreakdownChart.tsx` and any references.
3. Update `analyticsService.ts` so `AnalyticsData` no longer contains `categoryBreakdown`; adapt insights to use the existing bar chart data.
4. Ensure onboarding is the only first-launch experience and it leaves the database empty.

**Acceptance:** Fresh install shows empty lists, no sample transactions/tasks/events, and no pie chart anywhere.

---

## Phase 7 — Local Signed Split APK Build
1. Use `local-expo-build` scripts (`npm run build:android:apk`).
2. Build from the `X:` subst drive to avoid Windows long-path errors.
3. Produce signed `app-arm64-v8a-release.apk` and `app-armeabi-v7a-release.apk`.
4. Verify APKs exist in `android/app/build/outputs/apk/release/`.

**Acceptance:** Both APKs are signed, versioned, and ready for install.

---

## Phase 8 — Final QA & Regression
1. Run `npx tsc --noEmit --project tsconfig.json`.
2. Run `./gradlew :lifeos-sms:compileDebugKotlin :lifeos-sms:testDebugUnitTest`.
3. Lint/aesthetic pass on changed files.
4. Update `RFINAL_FIX_LOG.md` with every change.
5. Tag APK output paths and verification commands in the final report.

---

## Verification Commands
```bash
# TypeScript
cd "C:/Users/BELINZE NEWTONE/Music/RFINAL" && npx tsc --noEmit --project tsconfig.json

# SMS parser unit tests
cd "C:/Users/BELINZE NEWTONE/Music/RFINAL/android" && ./gradlew :lifeos-sms:compileDebugKotlin :lifeos-sms:testDebugUnitTest

# Signed split APK build (run from X: subst to avoid long-path failure)
subst X: "C:\Users\BELINZE NEWTONE\Music\RFINAL"
cd X:\ && npm run build:android:apk -- --no-clean
```

## Output Artifacts
- `android/app/build/outputs/apk/release/app-arm64-v8a-release.apk`
- `android/app/build/outputs/apk/release/app-armeabi-v7a-release.apk`
