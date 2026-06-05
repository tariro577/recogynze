# Recognyze

Recognyze is Econet’s employee recognition platform for celebrating the people who move teams forward. The app ships as an Angular 17+ Microsoft Teams tab with a Node.js + Express API backed by SharePoint via Microsoft Graph.

## ✨ Highlights

- Animated landing page with live stats counters and a prominent “Start Recognising” CTA.
- Recognition form with people picker, badge templates, moderation, confetti, sound toggle, and character counter.
- Recognition wall with infinite scroll, spotlight card, filters, reactions, and toast notifications.
- Profile tab featuring badge shelf, recognitions given/received, and streaks.
- Leaderboard tab with top recogniser, most recognised, badge breakdown, and department stats.
- Dark/light mode, micro-animations, and mobile responsiveness.

## Project structure

```
recognyze/
├── frontend/   # Angular app
├── backend/    # Node.js + Express API
└── teams/      # Teams manifest + icons
```

## 1) Azure AD app registration (SSO)

1. Create a new Azure AD app registration.
2. Add redirect URIs:
   - `http://localhost:4200`
   - `https://YOUR_FRONTEND_STATIC_APP_URL`
3. Enable Microsoft Graph delegated permissions:
   - `User.Read`
   - `User.ReadBasic.All`
   - `Sites.ReadWrite.All`
4. Grant admin consent.
5. Copy the **Application (client) ID** and **Directory (tenant) ID** into the frontend environment files.

## 2) SharePoint lists

Create the following lists in `https://econetzimbabwe.sharepoint.com/sites/recognyze`:

### Recognitions

| Column | Type |
| --- | --- |
| Sender | Single line of text |
| SenderEmail | Single line of text |
| Receiver | Single line of text |
| ReceiverEmail | Single line of text |
| Badge | Single line of text |
| Message | Multiple lines of text |
| Date | Date and time |
| Reactions | Multiple lines of text |
| Department | Single line of text |

### Badges

| Column | Type |
| --- | --- |
| BadgeName | Single line of text |
| Description | Multiple lines of text |
| Template | Multiple lines of text |
| Emoji | Single line of text |
| Color | Single line of text |

### Reactions

| Column | Type |
| --- | --- |
| RecognitionId | Single line of text |
| UserId | Single line of text |
| Type | Single line of text |

Copy the **site ID** and **list IDs** into the backend environment variables.

## 3) Backend configuration

Copy `backend/.env.example` to `backend/.env` and fill in the values:

```
PORT=3000
CORS_ORIGIN=http://localhost:4200
RECOGNYZE_SITE_ID=YOUR_SITE_ID
RECOGNYZE_RECOGNITIONS_LIST_ID=YOUR_RECOGNITIONS_LIST_ID
RECOGNYZE_BADGES_LIST_ID=YOUR_BADGES_LIST_ID
RECOGNYZE_REACTIONS_LIST_ID=YOUR_REACTIONS_LIST_ID
```

The server validates these at boot and exits with a clear message if any are missing.

### Optional: enable the trust boundary (On-Behalf-Of)

By default the backend runs in **passthrough** mode — it forwards the caller's
Microsoft Graph token straight to Graph. To make the backend a real trust
boundary, set all three AAD variables and it switches to **OBO** mode: it
validates the incoming API token against your tenant's keys and exchanges it for
a Graph token server-side.

```
AAD_TENANT_ID=YOUR_TENANT_ID
AAD_CLIENT_ID=YOUR_BACKEND_APP_CLIENT_ID
AAD_CLIENT_SECRET=YOUR_BACKEND_APP_CLIENT_SECRET
# AAD_API_AUDIENCE=api://YOUR_BACKEND_APP_CLIENT_ID   # optional override
```

For OBO you must also: (1) **Expose an API** on the app registration with a scope
such as `access_as_user`, (2) add a client secret, (3) grant the same Graph
delegated permissions to that app, and (4) point the frontend's `apiScopes` at
`['api://YOUR_CLIENT_ID/access_as_user']` (see below).

## 4) Frontend configuration

Update `frontend/src/environments/environment.ts` and `environment.prod.ts` with
your Azure AD app IDs and API URLs. Two scope arrays control auth:

- `azure.scopes` — Graph scopes for the user's own profile/photo (default `['User.Read']`).
- `azure.apiScopes` — scopes used when calling the backend.
  - **Passthrough mode:** keep the Graph scopes (default).
  - **OBO mode:** set to `['api://YOUR_CLIENT_ID/access_as_user']`.

## 5) Run locally

```bash
cd backend
npm install
npm run dev
```

```bash
cd ../frontend
npm install
npm start
```

Then browse to `http://localhost:4200`.

## Testing

```bash
# Backend unit tests (Jest) — moderation + aggregation logic
cd backend && npm test

# Frontend unit tests (Karma/Jasmine, headless Chrome)
cd frontend && npm test -- --watch=false --browsers=ChromeHeadless
```

CI runs both build + test suites on every push/PR via
[`.github/workflows/ci.yml`](.github/workflows/ci.yml) (uses `ChromeHeadlessCI`).

## 6) Teams app package

1. Replace the placeholder IDs and `YOUR_FRONTEND_DOMAIN` / `YOUR_BACKEND_DOMAIN` in `teams/manifest.json`.
2. The manifest already references PNG icons (`teams/color.png` 192x192, `teams/outline.png` 32x32). These were rasterised from the SVG sources — swap in designer-made PNGs if you have them.
3. Zip `manifest.json`, `color.png`, and `outline.png` (the `.svg` sources are not needed in the package).
4. Upload the package in the Teams developer portal.

## 7) Azure deployment

### Frontend → Azure Static Web Apps

1. Create a Static Web App.
2. Set the app location to `frontend` and output location to `dist/recognyze`.
3. Add the frontend environment variables as app settings.

### Backend → Azure App Service (Linux, Node 18+)

The backend is a standard Express server, so it runs natively on App Service or
Azure Container Apps (no Functions adapter required).

1. Create a Linux Node 18+ App Service (or Container App).
2. Deploy the `backend` folder. The platform sets `PORT`, which the app reads
   automatically via `getConfig()`.
3. Add the `.env` values (`RECOGNYZE_SITE_ID`, the three list ids, `CORS_ORIGIN`)
   as application settings. The server validates these at boot and exits with a
   clear message if any are missing.
4. Build + start commands: `npm install && npm run build` then `npm start`.

## Notes

- The frontend uses MSAL for **silent SSO** (`ssoSilent` / `acquireTokenSilent`)
  and the Teams JS SDK for tab initialization. There is intentionally no redirect
  login screen, so routes are not behind a redirecting `MsalGuard`; every API call
  ensures an account silently before acquiring a token.
- The backend forwards the caller's Microsoft Graph token straight to Graph
  (delegated permissions). Because the SPA already holds `Sites.ReadWrite.All`,
  the backend's value is server-side moderation, aggregation, and caching rather
  than a privilege boundary. To make it a true trust boundary, switch the SPA to
  request a custom API scope and add an On-Behalf-Of exchange in the backend.
- Recognition reads are cached briefly in-memory (10s) and the badge catalog for
  60s to remove the per-request N+1 Graph calls. Reaction counts are aggregated
  from the **Reactions** list (the source of truth) and de-duplicated one-per-type
  per user.
- Content moderation runs on both frontend and backend to block appearance-based
  comments.
- Replace the SVG icons with PNGs (192×192 color, 32×32 outline) before publishing
  to Teams — Teams does not accept SVG icons.