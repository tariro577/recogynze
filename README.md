# Recognyze

Recognyze is Econet's employee recognition platform for celebrating the people who
move teams forward. It ships as an Angular Microsoft Teams tab backed by a small
Node.js + Express API.

**No Azure AD app, no admin consent, no SharePoint required.** The app stores its
own data (in-memory by default, or Postgres for persistence) and identifies the
signed-in user through the Teams JS SDK (`getContext()`). The only admin step to
publish it is enabling custom app upload in Teams.

## ✨ Features

- Animated landing page with live stats counters and a "Start Recognising" CTA.
- Recognition form with people picker, badge templates, content moderation,
  confetti, sound toggle, and character counter.
- Recognition wall with infinite scroll, spotlight card, filters, and reactions.
- Profile tab with badge shelf, given-vs-received chart, and streaks.
- Leaderboard with top recogniser, most recognised, badge breakdown, and
  department stats.
- Dark/light mode, micro-animations, empty states, and mobile responsiveness.

## Project structure

```
recognyze/
├── frontend/   # Angular app (the Teams tab UI)
├── backend/    # Node.js + Express API
└── teams/      # Teams manifest + icons + preview package
```

## How it works

- **Identity:** the Teams client tells the tab who the user is via
  `microsoftTeams.app.getContext()`. No login screen, no token, no consent.
  Outside Teams (local dev / browser preview) it falls back to a guest user.
- **Data:** the backend persists recognitions itself.
  - **No database configured →** an in-memory store seeded with sample data
    (perfect for local dev and the Teams preview; resets on restart).
  - **`POSTGRES_URL` configured →** a Postgres store (durable). On Vercel, adding
    a Postgres store in the project's Storage tab sets this automatically.
- **People picker:** searches the app's own `employees` list (seeded in
  `backend/src/store/seed.ts`, or the `employees` table in Postgres). Edit that to
  match the colleagues you want selectable.

> Trust note: identity is client-asserted (from the Teams context) rather than a
> verified token, which is appropriate for an internal recognition wall. If you
> later want verified SSO, that requires an Azure AD app + one-time admin consent.

## Run locally

```bash
# Backend (in-memory store, no setup)
cd backend
npm install
npm run dev        # http://localhost:3000

# Frontend
cd ../frontend
npm install
npm start          # http://localhost:4200
```

Open http://localhost:4200 — you'll see the app with seeded sample data and a
guest identity.

## Testing

```bash
cd backend  && npm test                                            # Jest
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless # Karma
```

CI builds and tests both projects on every push/PR via
[`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Customising the employees list

Edit `backend/src/store/seed.ts` (`SEED_EMPLOYEES`) with the people you want
selectable in the picker. With Postgres, these seed the `employees` table on first
run; edit the table afterwards.

## Deploy to Vercel (free)

Two projects from the same repo:

### Backend
1. Vercel → **Add New → Project**, import the repo, **Root Directory = `backend`**.
2. Deploy. It runs as a serverless function (see `backend/api/[[...path]].ts`).
3. (Optional, for persistence) In the project → **Storage → Create Database →
   Postgres**. Vercel injects `POSTGRES_URL`; the app switches to Postgres on the
   next deploy and creates its tables automatically.
4. Set `CORS_ORIGIN` to your frontend URL (e.g. `https://recogynze.vercel.app`).

### Frontend
1. Vercel → **Add New → Project**, same repo, **Root Directory = `frontend`**.
2. Set `frontend/src/environments/environment.prod.ts` → `apiBaseUrl` to your
   backend URL + `/api`.
3. Deploy → e.g. `https://recogynze.vercel.app`.

## Add to Microsoft Teams

1. A Teams admin enables **Upload custom apps** (Teams admin center → Teams apps →
   Setup policies → Upload custom apps = On). This is the only admin action needed.
2. Update `teams/manifest.json` URLs/domains to your frontend domain.
3. Zip `manifest.json` + `color.png` + `outline.png` (a ready-made
   `teams/recognyze-teams-preview.zip` is included for quick testing).
4. Teams → **Apps → Manage your apps → Upload a custom app**, then add it as a
   personal app or a channel tab.

> Updates are instant: because the tab just loads your hosted web app, a new
> deploy is reflected in Teams immediately — no re-upload needed unless you change
> the manifest.
