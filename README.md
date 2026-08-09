# Taskline

A small, real task manager: create tasks with a priority and due date, mark them done, filter by status or category, and see what's overdue at a glance. Built as a focused single-page app — no framework, no build step, no third-party payment integration to distract from the core feature.

**Live demo:** https://taskline-self.vercel.app/

## What it does

- Sign up / sign in (Supabase Auth)
- Create, complete, and delete tasks — each scoped to your account via Postgres Row Level Security
- Filter by status (all / active / done) and by category
- Tasks sort automatically: active before done, then by priority, then by soonest due date
- Overdue active tasks are flagged

## Tech stack

- **Frontend:** Vanilla JavaScript, HTML, CSS — no framework, no build step
- **Auth & database:** [Supabase](https://supabase.com) (Postgres + Auth + Row Level Security)
- **Hosting:** Static — works on Vercel, Netlify, GitHub Pages, or any static host, no server config needed

## Project structure

```
.
├── index.html            # markup
├── app.js                # auth, task CRUD, DOM rendering
├── task-utils.js         # pure functions: filter/sort/summarize tasks — unit tested
├── styles.css            # styling
├── tests/
│   └── task-utils.test.js
└── supabase/
    └── migration.sql     # tasks table + RLS policies
```

The split between `task-utils.js` (pure logic) and `app.js` (DOM + network) is deliberate: the parts of the app that decide *what* to show — filtering, sorting, summarizing — have no dependency on the browser or the database, so they're fully covered by unit tests. `app.js` calls into `task-utils.js` rather than re-implementing that logic inline.

## Running locally

1. Clone the repo.
2. Create a free [Supabase](https://supabase.com) project (or reuse an existing one).
3. In the Supabase SQL Editor, run `supabase/migration.sql` to create the `tasks` table and its Row Level Security policies.
4. In `index.html`, set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in the `window.__env` block to your project's values (Project Settings → API).
5. Serve the folder with any static file server:
   ```bash
   npx serve .
   ```
6. Open the page, create an account, and add a task.

## Tests

```bash
npm test
```

12 unit tests covering filtering, sorting (completion state → priority → due date), summary counts, overdue detection, and category extraction — using Node's built-in test runner, no dependencies.

## What I learned building this

The main design decision was separating pure data logic from DOM/network code entirely, rather than interleaving `document.querySelector` calls with the sorting logic the way a first draft naturally tends to. Once `filterTasks`/`sortTasks`/`summarizeTasks` took plain arrays in and returned plain data out, they became trivial to test exhaustively (empty lists, ties in priority, tasks with no due date) without spinning up a browser or a database. I also worked through the sort priority carefully — completion state, then priority, then due date, with "no due date" sorting last rather than first or crashing on `null` — which is the kind of edge case that's easy to get wrong silently.

## Known limitations

- No task editing yet (only create/toggle/delete) — editing would reuse the same form with a pre-filled state.
- No recurring tasks or reminders.
- Auth UI uses simple browser prompts rather than a styled modal, to keep the codebase small and focused on the core task-management logic.
