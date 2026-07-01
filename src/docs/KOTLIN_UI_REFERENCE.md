# Kotlin LifeOS UI Reference

**Screenshot directory:** `C:\Users\BELINZE NEWTONE\Music\REACT ALL`

This document preserves the screenshot analysis so work can resume after context compaction. The goal is 1:1 UI parity between this React Native rewrite and the original Kotlin app shown in the screenshots.

## Screenshot index

| # | File | Screen | Notes |
|---|------|--------|-------|
| 1 | `Screenshot_2026-06-30-17-47-51-94_...` | **Home** | Header "Today" + date + profile icon. "Daily focus" label. Greeting + subtitle. Two metric cards: Today / Week spend. Menu card: Tasks (pending count), Next Event, Insights (Trends), Search (Explore). Weekly reset card. Bottom tabs: Home, Finance, Calendar, AI, Profile. |
| 2 | `Screenshot_2026-06-30-17-47-55-81_...` | **Tasks list** | Header "Tasks" + "3 open · 0 completed". Search tasks. Priority sections: Urgent (red), Important (orange). Task card: priority bar, checkbox, title, description, timer icon. FAB +. |
| 3 | `Screenshot_2026-06-30-17-48-01-78_...` | **Tasks list (timer)** | Same as #2 but one task shows active timer `0:04` and stop-square icon. |
| 4 | `Screenshot_2026-06-30-17-48-11-50_...` | **Events list empty** | Header "Events / Upcoming". Search events. Empty state "No upcoming events". Floating "+ Add event" button. |
| 5 | `Screenshot_2026-06-30-17-48-15-74_...` | **Insights (top)** | Header "Trends / Insights / Spending trends and habits". Weekly Spend by Category stacked bar chart (W-4 to This wk). Legend. Budget vs Actual section. |
| 6 | `Screenshot_2026-06-30-17-48-19-85_...` | **Insights (scrolled)** | Category rows with icon, name, amount. Progress bar for budget. Insight cards: "Overdue tasks need attention", "Month so far: KSh 34,716". |
| 7 | `Screenshot_2026-06-30-17-48-30-24_...` | **Search empty** | Header "Global Lookup / Search". Search bar. No results area. |
| 8 | `Screenshot_2026-06-30-17-48-38-49_...` | **Search results** | Query "delitos". Filter chips: All, Tasks, Events, Birthdays, Anniversary. "15 results". Grouped by Finance. Result card: icon, title, category+amount, date, type label. |
| 9 | `Screenshot_2026-06-30-17-48-45-87_...` | **Weekly Review (top)** | Header "Weekly Ritual / Weekly Review / Week ending Jul 05". Prompt card. Spending card: Total this week, Posture, Week delta, Top category. Tasks card: completed today / still pending. |
| 10 | `Screenshot_2026-06-30-17-48-48-66_...` | **Weekly Review (scrolled)** | Wins, Risks, Top Insights lists. |
| 11 | `Screenshot_2026-06-30-17-48-55-50_...` | **Finance (top)** | Header "Finance". Top action chips: Add, Hub, Import SMS, Import CSV (cut off). Today / Week metric cards. Budget guardrail alert banner. Budget + Month-End Forecast cards. Segment filter: All / Today / Week / Month. Search bar. Transactions section header with date. Transaction card. |
| 12 | `Screenshot_2026-06-30-17-49-07-52_...` | **Finance (scrolled)** | Import SMS / Import CSV / Export Data chips. Week / Month metric cards. Budget guardrail. Month-End Forecast + Service Charge cards. Transactions list. |
| 13 | `Screenshot_2026-06-30-17-49-14-03_...` | **Finance (swipe)** | Transaction card swiped revealing "Category" and "Delete" actions. |
| 14 | `Screenshot_2026-06-30-17-49-20-84_...` | **Finance (more list)** | More transaction cards. |
| 15 | `Screenshot_2026-06-30-17-49-25-13_...` | **Calendar / Calendar tab** | Header "Calendar / June 2026". Segmented tabs: Calendar, Tasks, Events. Month grid Mo-Su. Today highlighted. Selected date. Add FAB. Date label. Empty day state. |
| 16 | `Screenshot_2026-06-30-17-49-29-02_...` | **Calendar / Tasks tab** | Tasks tab selected. "3 Pending · 0 Doing · 0 Done". Search tasks. Task cards. Add FAB. |
| 17 | `Screenshot_2026-06-30-17-49-31-07_...` | **Calendar / Events tab empty** | Events tab selected. Empty state with icon. Add FAB. |
| 18 | `Screenshot_2026-06-30-17-49-36-83_...` | **New Task form** | Header "New Task / Save". Type chips: Task, Event, Birthday, Anniversary. Title input, Description input. Priority chips: Neutral, Important, Urgent. Deadline date/time pickers. Reminders row. Alarm reminders toggle. |
| 19 | `Screenshot_2026-06-30-17-49-39-52_...` | **Reminders list** | Header "Reminders". Toggle. Preset offsets. Custom option. |
| 20 | `Screenshot_2026-06-30-17-49-42-74_...` | **Custom reminder picker** | Modal picker for value + unit (minute/hour). OK/Cancel. |
| 21 | `Screenshot_2026-06-30-17-49-50-70_d2430ff130952fa18bcb18b018f96d60.jpg` | **New Event form (timed)** | Event type chip selected. All-day toggle off. From/To date+time, Repeat, Reminders, Alarm reminders, Guests. |
| 22 | `Screenshot_2026-06-30-17-49-52-73_d2430ff130952fa18bcb18b018f96d60.jpg` | **New Event form (all-day)** | All-day toggle on; date-only From/To rows. |
| 23 | `Screenshot_2026-06-30-17-49-57-52_d2430ff130952fa18bcb18b018f96d60.jpg` | **New Event form (scrolled)** | Guests input, Category chips (Work/Personal/Health/Finance/Other), Priority chips (Neutral/Important/Urgent), Description. |
| 24 | `Screenshot_2026-06-30-17-50-00-45_d2430ff130952fa18bcb18b018f96d60.jpg` | **New Birthday form** | Birthday chip selected. Person's name, date, Add year toggle off, Reminders, Alarm reminders. |
| 25 | `Screenshot_2026-06-30-17-50-02-55_d2430ff130952fa18bcb18b018f96d60.jpg` | **New Anniversary form** | Anniversary chip selected. Anniversary name, date, Reminders, Alarm reminders. |
| 26 | `Screenshot_2026-06-30-17-50-12-48_d2430ff130952fa18bcb18b018f96d60.jpg` | **New Birthday form (Add year on)** | Add year toggle on. Type chips scroll to show Countdown. |
| 27 | `Screenshot_2026-06-30-17-50-15-92_d2430ff130952fa18bcb18b018f96d60.jpg` | **New Countdown form** | Countdown chip selected. Event name, date, Repeat, Remind me at time, Remind 3 days before toggle. |
| 28 | `Screenshot_2026-06-30-17-50-20-50_d2430ff130952fa18bcb18b018f96d60.jpg` | **Repeat selection** | Options: Never, Daily, Mon–Fri, Weekly, Monthly, Yearly. Checkmark selection. |
| 29 | `Screenshot_2026-06-30-17-50-29-35_d2430ff130952fa18bcb18b018f96d60.jpg` | **AI Assistant (empty)** | Header "Assistant" with trash icon. Bot intro, suggestion chip, message input + send. AI tab active. |
| 30 | `Screenshot_2026-06-30-17-50-32-20_d2430ff130952fa18bcb18b018f96d60.jpg` | **AI Assistant (keyboard)** | Message input focused with keyboard visible. |
| 31 | `Screenshot_2026-06-30-17-50-37-18_d2430ff130952fa18bcb18b018f96d60.jpg` | **AI Assistant (response)** | User question bubble; bot markdown response with financial health score, quick stats, key insights. |
| 32 | `Screenshot_2026-06-30-17-50-40-09_d2430ff130952fa18bcb18b018f96d60.jpg` | **AI clear history dialog** | "Clear chat history?" Cancel / Clear. |
| 33 | `Screenshot_2026-06-30-17-50-43-63_d2430ff130952fa18bcb18b018f96d60.jpg` | **Profile main** | Avatar, name, workspace, member since. Edit Profile / Settings buttons. Tool Hub grid (Insights, Review, Search, Recurring, Export, Hub). Security Password row. |
| 34 | `Screenshot_2026-06-30-17-50-46-83_d2430ff130952fa18bcb18b018f96d60.jpg` | **Profile photo sheet** | Bottom sheet: View photo, Choose from gallery, Remove photo. |
| 35 | `Screenshot_2026-06-30-17-50-57-94_d2430ff130952fa18bcb18b018f96d60.jpg` | **Recurring rules + add** | Automation > Recurring empty state. Add Recurring Rule modal: Title, Amount optional, Type dropdown, Cadence Monthly, Cancel/Save. |
| 36 | `Screenshot_2026-06-30-17-51-05-13_d2430ff130952fa18bcb18b018f96d60.jpg` | **Export Center** | Data Portability > Export Center. Format json/csv/pdf, Domain, Date window, Encrypt file toggle + passphrase, Export now. |
| 37 | `Screenshot_2026-06-30-17-51-08-95_d2430ff130952fa18bcb18b018f96d60.jpg` | **Export preview / history** | Preview counts per domain. History list with status. |
| 38 | `Screenshot_2026-06-30-17-51-13-59_d2430ff130952fa18bcb18b018f96d60.jpg` | **Finance Hub** | Finance Tools > Finance Hub. Rows: Budgets, Income, Recurring, Loans & Fuliza, Bills, Search Finance. |
| 39 | `Screenshot_2026-06-30-17-51-15-58_d2430ff130952fa18bcb18b018f96d60.jpg` | **Finance Hub (scrolled)** | Same rows plus Export at bottom. |
| 40 | `Screenshot_2026-06-30-17-51-22-06_d2430ff130952fa18bcb18b018f96d60.jpg` | **Budgets list** | Spending Guardrails > Budgets. This Month summary over-budget. Per-category budget cards with progress, status badge, edit/delete. |
| 41 | `Screenshot_2026-06-30-17-51-27-71_d2430ff130952fa18bcb18b018f96d60.jpg` | **Income + Add Income** | Income screen empty. Add Income modal: Category, Amount (KES), Note, Cancel/Save. |
| 42 | `Screenshot_2026-06-30-17-51-36-27_d2430ff130952fa18bcb18b018f96d60.jpg` | **Loans & Fuliza** | Net Outstanding KSh 0. No history; import M-Pesa messages hint. |
| 43 | `Screenshot_2026-06-30-17-51-41-13_d2430ff130952fa18bcb18b018f96d60.jpg` | **Bills + Add Bill** | Bills empty state. Add Bill modal: Title, Amount, Cycle Monthly, Next Due Date, Notes, Cancel/Add. |
| 44 | `Screenshot_2026-06-30-17-51-58-15_d2430ff130952fa18bcb18b018f96d60.jpg` | **Settings (top)** | Appearance Light/Auto/Dark. Security: Screen lock PIN, Haptic feedback. Notifications, Assistant Quick suggestions. |
| 45 | `Screenshot_2026-06-30-17-52-01-49_d2430ff130952fa18bcb18b018f96d60.jpg` | **Settings (scrolled)** | Finance Fuliza credit limit KSh 900. Import SMS Import Health, Review Queue. What's new, About Version, Clear all local data. |
| 46 | `Screenshot_2026-06-30-17-52-04-72_d2430ff130952fa18bcb18b018f96d60.jpg` | **Settings (app updates)** | What's new, About Version, Clear all local data, App Updates check/download buttons. |
| 47 | `Screenshot_2026-06-30-17-52-08-54_d2430ff130952fa18bcb18b018f96d60.jpg` | **Screen Lock (Biometric)** | Biometric/PIN tabs. Fingerprint / Face unlock toggle. |
| 48 | `Screenshot_2026-06-30-17-52-11-66_d2430ff130952fa18bcb18b018f96d60.jpg` | **Screen Lock (PIN)** | PIN tab. PIN lock toggle. Current PIN, New PIN, Confirm PIN, Save PIN. |
| 49 | `Screenshot_2026-06-30-17-52-20-54_d2430ff130952fa18bcb18b018f96d60.jpg` | **Notifications settings** | Enable notifications, Budget threshold alerts toggles, High/Medium/Low alert sliders, Daily Digest section. |
| 50 | `Screenshot_2026-06-30-17-52-23-65_d2430ff130952fa18bcb18b018f96d60.jpg` | **Notifications (scrolled)** | Alert sliders and Daily Digest Morning summary toggle + Delivery time. |
| 51 | `Screenshot_2026-06-30-17-52-26-95_d2430ff130952fa18bcb18b018f96d60.jpg` | **Delivery time picker** | Clock picker set to 06:30 AM. Cancel/Set. |
| 52 | `Screenshot_2026-06-30-17-52-33-74_d2430ff130952fa18bcb18b018f96d60.jpg` | **Fuliza Credit Limit modal** | Enter Safaricom Fuliza M-PESA credit limit. Input 900. Cancel/Save. |
| 53 | `Screenshot_2026-06-30-17-52-39-65_d2430ff130952fa18bcb18b018f96d60.jpg` | **What's New** | v1.0.0 May 2026 release notes list. |
| 54 | `Screenshot_2026-06-30-17-52-45-19_d2430ff130952fa18bcb18b018f96d60.jpg` | **SMS Import Health (top)** | Receiver Status Active, Lifetime Counters, Activity timestamps, Last M-Pesa code. |
| 55 | `Screenshot_2026-06-30-17-52-48-33_d2430ff130952fa18bcb18b018f96d60.jpg` | **SMS Import Health (scrolled)** | Activity, Last Activity Details, Actions Reconcile/Retry Queue, Import Audit Log. |
| 56 | `Screenshot_2026-06-30-17-52-57-43_d2430ff130952fa18bcb18b018f96d60.jpg` | **Review Queue** | 0 pending, "Queue clear" empty state. |
| 57 | `Screenshot_2026-06-30-17-53-14-85_d2430ff130952fa18bcb18b018f96d60.jpg` | **Add Transaction modal** | Amount (KES), Merchant/Description, Category dropdown Other, Cancel/Add. |
| 58 | `Screenshot_2026-06-30-17-53-18-58_d2430ff130952fa18bcb18b018f96d60.jpg` | **Import M-Pesa SMS sheet** | Bottom sheet: select time period Last 24h / 7 days / 30 days / 90 days. |
| 59 | `Screenshot_2026-06-30-17-53-23-37_d2430ff130952fa18bcb18b018f96d60.jpg` | **Import from CSV sheet** | Bottom sheet with CSV column instructions and Choose File button. |
| 60 | `Screenshot_2026-06-30-17-53-36-16_d2430ff130952fa18bcb18b018f96d60.jpg` | **Personal Information** | Name, Email, Username rows with edit icon. |

## Common UI patterns

- Dark theme with near-black background (`#0B0E14` equivalent).
- Rounded cards with subtle border (`borderRadius: ~24`, `borderColor` from theme).
- Primary accent is bright blue (`#4DB8FF`).
- Warning/salmon color for budget overruns.
- Floating rounded bottom tab bar with 5 tabs.
- Floating blue pill "+ Add" buttons.
- Section headers with optional blue action link on the right.
- Inputs are large rounded dark fields with placeholder text.
- Priority colors: red = Urgent, orange = Important, blue = Neutral.

## Navigation model from screenshots

Bottom tabs: Home, Finance, Calendar, AI, Profile.

Top-level stack/modal screens reached from Home:
- Tasks (from Home Tasks row)
- Next Event / Calendar (from Next Event row)
- Insights (from Insights row)
- Search (from Search row)
- Weekly Review (from Weekly reset card)

## Next steps for parity

1. Home (done) — match screenshot #1.
2. Bottom tab bar — floating rounded style (all screenshots).
3. Finance main — match screenshots #11-#14, #57-#59.
4. Finance Hub / Budgets / Income / Loans / Bills — match screenshots #38-#43.
5. Calendar — match screenshots #15-#17.
6. Search — match screenshots #7-#8.
7. Insights — match screenshots #5-#6.
8. Tasks list — match screenshots #2-#3.
9. New Task / Event / Birthday / Anniversary / Countdown forms — match screenshots #18-#28.
10. AI Assistant — match screenshots #29-#32.
11. Profile — match screenshots #33-#34, #60.
12. Settings / Screen Lock / Notifications — match screenshots #44-#52.
13. Recurring / Export / Finance Hub / SMS Import Health / Review Queue — match screenshots #35-#37, #53-#56.
