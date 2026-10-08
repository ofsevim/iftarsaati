# Prayer Reliability Fixes Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Make displayed prayer times, reminders, Ramadan dates, offline behavior, embed headers, and project checks reliable.

**Architecture:** Keep the existing React and Capacitor structure. Add small date-aware helpers and tests around calendar and notification behavior, then update components and platform configuration to consume them.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Capacitor 8, Android Java, Netlify.

**Spec:** The user's request to fix every issue listed in the prior project review.

## Global Constraints

- Preserve the existing Turkish UI and 81-city selection.
- Keep changes focused on the reviewed defects.
- Verify the web build, type checks, tests, lint, and any Android build that can run locally.

## Review Focus

- A city switch during a slow or failed API request must never label old data as the new city's times.
- An open tab crossing midnight must use the new date's times.
- Test notifications must not replace real alarms; reminders must continue beyond day seven.
- Early-year Ramadan selection must choose the current or next period from actual dates.
- The first installed offline visit must include the application shell and available prayer data.

### Task 1: Date and city aware prayer display

**Files:** `src/pages/Index.tsx`, `src/pages/Widget.tsx`, `src/lib/prayer-api.ts`, `src/test/prayer-display.test.tsx`

- [ ] Add failing tests for city switching and midnight refresh.
- [ ] Make displayed data explicitly keyed by city and date and ignore stale responses.
- [ ] Refresh both pages at day changes and on visibility regain.
- [ ] Run targeted tests, then the full test suite.

### Task 2: Native reminder lifecycle

**Files:** `src/components/NotificationManager.tsx`, `android/app/src/main/java/com/osoft/iftarsaati/ReminderSchedulerPlugin.java`, Android sources, `src/test/notification-logic.test.ts`

- [ ] Add failing tests for test-alarm preservation and schedule renewal.
- [ ] Separate test-alarm scheduling from replacement of regular alarms.
- [ ] Refresh the rolling native schedule and preserve it through reboot.
- [ ] Verify Java integration as far as the local Android toolchain allows.

### Task 3: Calendar and offline correctness

**Files:** `src/lib/prayer-api.ts`, `src/components/Imsakiye.tsx`, `public/sw.js`, `vite.config.ts`, `src/test/ramadan-period.test.ts`

- [ ] Add failing tests for early-year Ramadan selection and offline cached-data behavior.
- [ ] Select a Ramadan period by actual date and derive share text from it.
- [ ] Precache built assets and retain safe date-keyed prayer data for offline use.
- [ ] Verify a fresh install followed by offline reload.

### Task 4: Tooling and deployment configuration

**Files:** `package.json`, `netlify.toml`, `public/_headers`, Android project files, relevant tests and documentation.

- [ ] Make `typecheck` inspect both app and config sources.
- [ ] Resolve widget frame-header conflict.
- [ ] Make the Android project reproducible or clearly isolate unsupported native features.
- [ ] Run full tests, lint, typecheck, web build, and Android build where possible.
