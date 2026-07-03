# RFINAL Gap-Closure Plan — REACT parity and beyond

Goal: close 100% of the engineering-infrastructure gap versus REACT (`Music\REACT`)
and end with RFINAL superior in every category it currently trails. RFINAL already
wins on parser accuracy, dedupe, Import Health observability, and app wiring —
this plan protects that lead while transplanting REACT's discipline.

Ordering principle: correctness safety nets first (tests), then durability, then
resilience, then process. Each phase is independently shippable and leaves the
app releasable.

---

## Phase 1 — Parser test harness + fixture corpus (highest value)

**Gap:** REACT has ~160 real M-Pesa fixtures + JUnit tests; RFINAL has zero tests.
**Better-than target:** larger corpus, tested against a stronger parser, run in CI.

1. Copy `REACT/apps/mobile/plugins/android/src/test/java/com/personalos/app/mpesa/MpesaParserFixtures.kt`
   into `modules/lifeos-sms/android/src/test/java/com/lifeos/sms/`, re-namespaced.
2. Write `SmsParserTest.kt` asserting, per fixture: parse success, category,
   amount, mpesa code, transaction type, counterparty, confidence ≥ expected,
   and parseRoute (direct/review/quarantine).
3. Add dedupe tests: same message twice → SOURCE_HASH dup; reworded same txn →
   SEMANTIC dup; same code different body → CODE dup; 5-min heuristic window.
4. Add regression tests for known edge cases: comma amounts ("Ksh 1,234.56"),
   Swahili (umepokea/umetuma), Fuliza charge with/without fee, reversal
   direction flip, 2- vs 4-digit years, lowercase/9-char codes, multiline bodies.
5. Grow the corpus past REACT's: harvest additional raw messages from the
   quarantine/audit tables of a real device export (Import Health → audit log).
6. Wire `./gradlew :lifeos-sms:testDebugUnitTest` as `npm run test:parser`.

Exit criteria: ≥170 fixtures green; dedupe matrix green; runs in one command.

## Phase 2 — Durable SMS ingestion queue (crash-proof realtime)

**Gap:** REACT persists incoming SMS to `sms_import_queue` with `next_retry_at`
retry scheduling; RFINAL processes in-flight — a crash between receive and
insert can drop a message until manual reconcile.
**Better-than target:** durable queue + RFINAL's existing WorkManager retry.

1. `DbWriter`: add `sms_ingest_queue(id, body, received_at, status
   [pending|done|failed], attempts, next_retry_at, last_error)`.
2. `SmsReceiver.onReceive`: FIRST persist the raw body to the queue (fast,
   crash-safe), THEN enqueue `SmsProcessWorker` keyed by queue row id.
3. `SmsProcessWorker`: read from queue → parse/dedupe/insert → mark done.
   On exception: attempts++, exponential `next_retry_at`, Result.retry().
4. Add a periodic sweep (WorkManager periodic, 6h) that drains any
   pending/failed rows older than a threshold — self-healing without user action.
5. Surface queue depth + oldest pending age in Import Health.

Exit criteria: kill the process between receive and insert → message still
imports on next sweep/launch; queue visible in Import Health.

## Phase 3 — Reboot resilience + degraded-mode parsing

**Gap:** REACT/Kotlin have boot handling and a JS fallback parser.

1. `BootReceiver` (BOOT_COMPLETED + MY_PACKAGE_REPLACED) in the lifeos-sms
   module: drains the ingest queue and pings a flag JS reads on next launch to
   run `syncAllNotifications` (reboot wipes scheduled notifications).
2. Port REACT's `native-mpesa-parser.ts` (352 lines) as
   `src/services/fallbackSmsParser.ts`, used only when
   `isSmsModuleAvailable() === false` (Expo Go / module failure) for
   `parseSmsPreview` and CSV-of-SMS imports. Keep native as sole realtime path.
3. Tighten `CODE_RE` to require ≥1 digit (`(?=[A-Za-z]*\d)[A-Za-z0-9]{9,10}`)
   — kills rare false codes the looser pattern can match; validate in Phase 1 tests.

Exit criteria: reboot → reminders re-armed on first unlock/launch; Expo Go
preview parses via fallback; fixture suite still green.

## Phase 4 — JS unit tests for domain logic

**Gap:** REACT has 26 JS test files; RFINAL has none.

1. Add jest + jest-expo. Test pure logic first (no UI):
   - `notificationSyncService`: `nextOccurrenceISO` (monthly 31st clamp,
     Feb 29 yearly), `advanceCadencePastNow` (all 7 cadences, DST-adjacent).
   - Bill cycle advance logic (BillFormScreen helper — extract to
     `src/utils/billCycle.ts` so it's testable).
   - `budgetAlertService` threshold matrix (3 levels, month rollover, re-fire
     after threshold change).
   - `searchService` ranking/filtering; formatters; dedupe of recent searches.
2. Extract any logic currently trapped in components into `src/utils/` or
   services as needed — testability doubles as architecture cleanup.
3. Target: ≥30 test files / ≥200 assertions (beats REACT's 26 files).

Exit criteria: `npm test` green locally and in CI.

## Phase 5 — CI gates + repo hygiene

**Gap:** REACT has turbo caching, architecture/file-size/route gates; RFINAL
ships build artifacts in git and has no CI.

1. `.gitignore`: add `modules/lifeos-sms/android/build/`, `android/`, `.expo/`;
   `git rm -r --cached` the tracked build outputs (shrinks the repo massively —
   the last commits carried thousands of .dex/.class files).
2. GitHub Actions workflow: install → `tsc --noEmit` → `npm test` →
   `test:parser` (Gradle) → `expo prebuild --no-install` sanity.
3. Lightweight gates (node scripts, mirroring REACT's): max file size (fail
   >400 lines for new screens), no `NativeModulesProxy`, no `console.log` in
   src, import-boundary check (screens must not import repositories of other
   feature areas directly).
4. Husky pre-push: typecheck + tests.

Exit criteria: PR to master cannot merge red; repo free of build artifacts.

## Phase 6 — Data-layer hardening (surpass, don't copy)

REACT's React Query layer is its last advantage; a full migration is high-risk,
low-reward given RFINAL's working zustand+dataVersion pattern. Instead:

1. Migration tests (port REACT's `db.migrations.test.ts` idea): open a v1 DB
   snapshot, run all migrations, assert schema — protects every future ALTER.
2. Repository contract tests against in-memory SQLite (create/update/soft-
   delete/revision/sync_state round-trips for each repo).
3. Single `useLiveQuery(loader)` hook that wraps the
   dataVersion-subscribe/focus-reload/loadedVersion-ref boilerplate now
   duplicated across ~8 screens — one tested implementation, less drift.
4. Nightly `db.checkpoint()` + integrity_check surfaced in Import Health.

Exit criteria: migrations and repos covered; screens use the shared hook.

## Phase 7 — Final parity audit + burn-down

1. Re-run a three-way feature diff (KOTLIN / REACT / RFINAL) with fresh eyes;
   file anything found as issues.
2. Device pass: import 90d history, kill-app realtime capture, reboot test,
   Doze test (adb `deviceidle force-idle`), notification matrix (task, event,
   birthday, anniversary, countdown, recurring, bill, digest, 3 thresholds).
3. Tag `v1.1.0` when the burn-down list is empty.

---

## Sequencing & effort (rough)

| Phase | Scope | Est. sessions |
|---|---|---|
| 1 | Fixtures + parser JUnit | 1–2 |
| 2 | Durable ingest queue | 1 |
| 3 | Boot receiver + JS fallback + CODE_RE | 1 |
| 4 | JS domain tests | 1–2 |
| 5 | CI + gitignore cleanup | 1 |
| 6 | Data-layer hardening | 1–2 |
| 7 | Audit + device burn-down | 1 |

Phases 1→3 are the "never lose a shilling" tier — do these before anything else.
Phases 4→5 make regressions impossible to ship. Phases 6→7 finish the lead.
After Phase 7, RFINAL beats REACT on every axis it currently trails: test
count and corpus size, ingestion durability, reboot resilience, CI rigor —
while keeping the parser, dedupe, and observability lead it already has.
