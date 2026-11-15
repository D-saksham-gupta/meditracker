# Stillness - Meditation Tracker

A personal meditation tracker built with **Next.js 16** (frontend + backend in one app) and **MongoDB**.

## Features
- Two sessions per day: **morning** and **evening** minutes.
- A session counts only if it is **15+ minutes** (change `MIN_SESSION_MINUTES` in `src/lib/rules.ts`).
- Calendar colours: **fully green** = both sessions counted, **half green** = one session
  (top half = morning, bottom half = evening), **red** = nothing counted (missed), today is outlined.
- Streaks: a day keeps your streak alive if **at least one** session counts. To require both,
  change `dayCounts` in `src/lib/rules.ts`. Also shows longest streak and a "new personal record" message.
- Forgot to log a day? Tap it on the calendar and add it; streaks are recalculated.
- Browse any previous month. Download any **month** or **year** as **Excel (.xlsx)** or **CSV**
  (status, morning/evening minutes, total, streak, note).
- Data from the first version (a single "minutes" value) is read as a morning session automatically, so existing streaks are kept.

## Run it

Requirements: Node.js 20.9+ and a MongoDB database.

```bash
npm install
cp .env.example .env.local      # then set MONGODB_URI
npm run dev                     # http://localhost:3000
```

MongoDB options:
- **Docker (local):** `docker compose up -d` and keep the default `MONGODB_URI` in `.env.example`.
- **MongoDB Atlas (free cloud):** create a cluster and paste its connection string into `MONGODB_URI`.
- **Installed locally:** `mongodb://127.0.0.1:27017/meditation-tracker`.

Production: `npm run build && npm start`.
Other scripts: `npm test` (streak/report logic tests), `npm run typecheck`.

> **No login:** this is a single-user app, so anyone who can open the URL can edit your data.
> Fine on your own machine. If you deploy it publicly, add authentication first (see below).

## How it works
- Every day you meditated = one document `{ date: "YYYY-MM-DD", morningMinutes, eveningMinutes, note }`. No document = missed day.
- Dates are plain `YYYY-MM-DD` strings. Your **browser** decides what "today" is, so streaks follow your timezone.
- Streaks are computed from the dates on demand (`src/lib/streak.ts`), so backfilling or deleting a day always gives the right result.

## Project layout
```
src/
  app/
    page.tsx, layout.tsx, globals.css
    api/entries/route.ts          GET  ?month=YYYY-MM
    api/entries/[date]/route.ts   PUT (log / edit / backfill), DELETE
    api/stats/route.ts            GET  ?today=YYYY-MM-DD  -> streaks
    api/export/route.ts           GET  ?scope=month|year&value=...&format=csv|xlsx
  components/  Tracker (state), StreakPanel, Calendar, DayModal, ExportPanel
  lib/         rules.ts (15-min rule), db.ts, dates.ts, clientDates.ts, streak.ts, report.ts, stats.ts, api.ts
  models/      Entry.ts           (Mongoose schema)
scripts/test-streaks.ts
```

## Adding features later
- **A new field per day** (mood, tags): add it to `src/models/Entry.ts` and `normalizeEntry` in `src/lib/rules.ts`, accept it in the `PUT` handler,
  show it in `DayModal.tsx`, and add a column in `src/lib/report.ts`.
- **A new stat** (weekly average, best month): add it in `src/lib/streak.ts` / `computeStats`, show it in `StreakPanel.tsx`.
  Add a case to `scripts/test-streaks.ts`.
- **A new page** (e.g. year heatmap): create `src/app/<name>/page.tsx` and a route under `src/app/api/`.
- **Login / multiple users:** add a `userId` to the model, filter every query by it, and put auth (e.g. Auth.js) in front of the API routes.
