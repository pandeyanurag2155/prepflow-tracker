# PrepFlow: interview-prep tracker

A personal tracker for a 3-month backend interview plan: a month-by-month roadmap, the NeetCode 150
grouped by theme and month, the full Striver A2Z sheet (self-paced), topic revision for
JavaScript, Node.js, Go and SQL, a system design syllabus (HLD and LLD), and reading lists for Redis,
Kafka, RabbitMQ and gRPC, and the core CS subjects (OOPs, DBMS, OS, CN). The plan length and
start date are settings.

- **Frontend**: plain HTML, CSS, and vanilla JavaScript ES modules. No framework, no build step.
- **Backend**: Node.js 20, Express 5, PostgreSQL 16. Layered as routes → controllers → services → repositories.
- Single user with a password login (see [Security](#security)).

## Project layout

```
PrepFlow/
├── docker-compose.yml          Postgres (dev) + API image
├── frontend/                   static site, served by the API or any static host
│   ├── index.html
│   ├── css/                    tokens → base → components → views
│   └── js/
│       ├── main.js             event delegation + boot
│       ├── lib/                dom helpers, dates, API client
│       ├── core/               store (state + indexes + tallies), sync, render, plan dates
│       ├── ui/                 widgets, item rows, inline editing, dialog, toast
│       ├── features/           Striver tools (bulk add, filters), toolbar + settings
│       └── views/              dashboard, roadmap, dsa, striver, revision, search
└── backend/
    ├── src/
    │   ├── server.js           listen + graceful shutdown
    │   ├── app.js              middleware stack (helmet/CSP, CORS, logging, JSON, static)
    │   ├── config/env.js       zod-validated environment
    │   ├── db/                 pool, migration runner, seed CLI, migrations/*.sql
    │   ├── domain/             seed data, problem-key matching, bulk parser, migrate/normalise
    │   ├── routes/ controllers/ services/ repositories/
    │   ├── validators/         zod request schemas
    │   └── middlewares/        validate, error handler
    └── tests/                  unit (domain) + API integration tests
```

## Run locally

Needs Node.js ≥ 20.12 and Docker.

```bash
docker compose up -d db                 # Postgres on localhost:5433
cd backend
cp .env.example .env
npm install
npm run setup                           # migrations + seed the starting plan
npm run dev                             # http://localhost:4000 (API + frontend)
```

**Database UI:** `docker compose up -d pgadmin`, then open http://localhost:5051.
The “PrepFlow (local)” server is already added; its password is `prepflow`.
From other tools, connect to `localhost:5433`, database `prepflow`, user `prepflow`, password `prepflow`.

To run the whole stack in containers instead, use `docker compose up --build` and open http://localhost:4000.
On start, the container applies migrations and seeds an empty database.

| Script | What it does |
| --- | --- |
| `npm run dev` | API with auto-restart on file changes |
| `npm start` | API (production) |
| `npm run auth:reset-password` | forgot the password: set a new one from the terminal; logs out every device |
| `npm run db:migrate` | apply pending `src/db/migrations/*.sql` |
| `npm run db:seed` | load the starting plan if the database is empty |
| `npm run db:reset` | wipe groups/items and reload the starting plan (settings kept) |
| `npm run striver:fetch` | re-download takeUforward’s A2Z sheet into `src/domain/striver-sheet.json` |
| `npm run db:striver` | load that file into the Striver section, keeping your ticks |
| `npm run dsa:fetch` | rebuild `src/domain/dsa-links.json` (LeetCode links for the NeetCode problems) |
| `npm run db:dsa-links` | fill empty NeetCode links in the database, keeping your ticks |
| `npm run db:add-section -- sysdesign` | add a seed section that an older database doesn’t have yet |
| `npm test` | unit tests; API tests too when `TEST_DATABASE_URL` is set |

```bash
# one-time: a throwaway database for the API tests (it gets wiped)
docker compose exec db psql -U prepflow -c "CREATE DATABASE prepflow_test"
TEST_DATABASE_URL=postgres://prepflow:prepflow@localhost:5433/prepflow_test npm test
```

## API

Base path `/api/v1`. Success responses are `{ "data": … }`. Errors are
`{ "error": { "code", "message", "details?" } }` with status 400 (validation), 404, 409, 413 or 500.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | liveness + DB check (also at `/health`); public |
| GET | `/auth/status` | `{ setUp }`: has the account been created yet; public |
| POST | `/auth/signup` | create the one account (only while none exists) and log in; public |
| POST | `/auth/login`, `/auth/logout` | log in (sets the session cookie) / out; public |
| GET | `/auth/me` | who is logged in |
| GET, POST | `/resumes` | list resume files / upload one (raw body, `X-File-Name`, optional `X-Label`) |
| GET | `/resumes/:id/file` | open (PDF inline) or `?download=1`; PATCH renames, DELETE removes |
| POST | `/auth/password` | change password (needs the current one); logs out other devices |
| GET | `/tracker` | full snapshot: settings, sections, groups, items |
| GET | `/export` | the snapshot as a JSON file download |
| POST | `/import` | replace everything with an export file (validated + migrated) |
| POST | `/reset` | replace groups/items with the starting plan |
| POST | `/restore` | re-insert deleted groups/items by id (Undo) |
| GET, PATCH | `/settings` | read / update settings |
| POST | `/groups` | add a theme (with its month), Striver step or sub-step, or language |
| PATCH, DELETE | `/groups/:id` | rename / reschedule; delete with children (returns them for Undo) |
| PATCH | `/groups/positions` | reorder: `[{ id, order }]` |
| POST | `/items` | add an item |
| POST | `/items/bulk` | paste `Title \| E/M/H \| URL` lines; `dryRun: true` previews |
| PATCH, DELETE | `/items/:id` | edit / move between groups; delete (returns it for Undo) |
| PATCH | `/items/:id/done` | tick/untick; returns every changed item (linked duplicates) |
| PATCH | `/items/positions` | reorder: `[{ id, order }]` |

## How it works

- **Data model.** Three tables: `settings` (one row, including `plan_start` and `plan_months`),
  `plan_groups` and `plan_items`. Groups are roadmap/NeetCode themes (with `month`: 0 = before you
  start, 1…plan_months), Striver steps and sub-steps (via `parent_id`, no schedule), and revision
  languages. Ids are UUIDs and never array indexes. `position` stores the order.
- **The plan.** Month *n* runs from `plan_start` + (n − 1) months to the day before `plan_start` + n
  months. Revision levels spread over the months (Basic → Intermediate → Advanced). Striver is
  at your own pace: no schedule or deadline, just progress and the next unfinished step.
- **Linked duplicates.** Problems carry a `key`, the normalised title (`domain/problem-key.js`).
  With `linkDuplicates` on, ticking one ticks every problem with the same key, in one transaction.
  A problem pasted into Striver that you already solved in NeetCode arrives ticked.
- **Striver sheet.** `src/domain/striver-sheet.json` holds the 20 chapters and 495 items of
  [takeUforward’s A2Z sheet](https://takeuforward.org/prep-hub/strivers-a2z-dsa-sheet?page=sheet&open=none).
  Each chapter is one step, in the sheet’s order. Items link to LeetCode when the sheet has a
  LeetCode link, and to takeUforward’s practice page otherwise. Notes hold the article and video.
  Difficulty comes from LeetCode when the problem is there; otherwise takeUforward’s level is mapped
  as basic → Easy, core → Medium, pro → Hard.
- **System design.** `src/domain/sysdesign-seed.js` holds 122 topics in two tracks, HLD and LLD, each
  split into Basic / Intermediate / Advanced like the revision languages. It was compiled from
  system-design-primer, karanpratapsingh/system-design, Hello Interview, Alex Xu’s two books and
  AlgoMaster’s HLD/LLD lists. Every topic links to a reading; “Design: …” topics are practice problems.
- **Backend tools.** `src/domain/tools-seed.js` holds 101 topics for Redis, Kafka, RabbitMQ and gRPC,
  split into Basic / Intermediate / Advanced, built from the official docs (redis.io, kafka.apache.org,
  rabbitmq.com, grpc.io, protobuf.dev) and Confluent’s Kafka course. Like system design, it has no schedule.
- **Core subjects.** `src/domain/core-seed.js` holds the full syllabus of OOPs, DBMS, Operating System and
  Computer Networks as subject → chapter → topic (282 topics, no levels or schedule), compiled from
  GeeksforGeeks, tutorialspoint and w3schools and cross-checked against the standard textbooks.
  Chapters are nested groups, like Striver sub-steps (`NESTED_SECTIONS` in `domain/constants.js`).
- **My resume.** Upload PDF/DOC/DOCX files (≤ 10 MB) on the “My resume” tab. They’re stored in the
  `resumes` table (bytea), so they’re private behind the login and backed up with the database (not
  in the JSON export). The type is checked from the file’s bytes, not its name.
- **Revisits.** Ticking a problem sets `revisit_dates` to today + 3 and + 7 days, as calendar days
  in `APP_TIMEZONE`. The dashboard lists problems that are due.
- **Bulk add preview.** The dialog's live preview is a server dry run, so the preview and the
  result always match.
- **Frontend sync.** Ticks are optimistic: the row and its counters update at once, then the
  server's response replaces them. Other edits wait for the server. If a request fails, the app
  shows a toast and reloads the server state. Ticking patches one row and its counters instead
  of re-rendering the view, which keeps it fast with 1,000+ items.
- **Schema changes.** SQL schema: add a new numbered file in `src/db/migrations/` and never edit
  an applied one. Export-file format: bump `SCHEMA_VERSION` and add a `case` in
  `domain/normalise.js → migrate()`, so old backups still import with their progress.

## Deploying the frontend separately

The frontend is static, so it can go on Netlify, Vercel or GitHub Pages:

1. In `frontend/index.html`, set `<meta name="api-base" content="https://your-api.example.com/api/v1">`.
2. On the API, set `SERVE_FRONTEND=false` and `CORS_ORIGIN=https://your-frontend.example.com`.
3. Add the API origin to `connect-src` in the CSP in `backend/src/app.js`.

## Security

- **Account.** One user. On first run the app shows a sign-up page; the first account closes
  sign-up for good (the `account` table allows a single row). The password is stored as a scrypt
  hash, next to a random per-install session secret. Change it under Settings → Account, or, if
  forgotten, run `npm run auth:reset-password` in `backend/` (or, with Docker,
  `docker compose exec api npm run auth:reset-password`).
- **First run on a server.** Until the account exists, anyone who opens the site sees the
  sign-up page. Sign up right after the first deploy (or restore a database that already has
  the account).
- **Sessions.** Logging in sets an HMAC-signed `pf_session` cookie (`HttpOnly`, `SameSite=Strict`,
  `Secure` over HTTPS) valid for `SESSION_DAYS` (30). Nothing is stored server-side; changing the
  password logs out every device. Every `/api/v1` route except `health` and
  `auth/status|signup|login|logout` returns 401 without it.
- **Brute force.** Five wrong passwords from one IP (log-in, sign-up or password change) lock it
  out for 15 minutes.
- **Database port.** Docker publishes Postgres on `127.0.0.1:5433` only, so it isn't reachable
  from the network; use a strong `POSTGRES_PASSWORD` on any shared server.
- **HTTPS.** On plain `http://` (e.g. from your phone on the same Wi-Fi) the password and cookie
  travel unencrypted, so only use it on a network you trust; deploy behind HTTPS for anything else. Requests are validated with zod, SQL is always parameterised, output is HTML-escaped,
links are limited to http(s), and helmet sets a strict CSP.
