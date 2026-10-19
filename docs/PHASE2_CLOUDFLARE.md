# Phase 2: Cloudflare Deployment Foundation

The `main-firebase` branch is prepared for a Cloudflare Pages preview deployment. This phase does not change the current production Google Sheets application.

## Build contract

- Build command: `npm run build:web`
- Build output directory: `dist`
- Production branch for the migration site: `main-firebase`
- The build uses an explicit allowlist. Repository scripts, Android sources, docs, Git metadata, private data, and local configuration are not copied to `dist`.
- `sync-config.js` is generated during the build with legacy Google Sheets synchronization disabled. Do not enter the production Apps Script URL into the migration preview.

## Cloudflare Pages setup

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Create a **Pages** application and choose **Connect to Git**.
3. Authorize GitHub and select `manivask/attendance-tracker`.
4. Set project name to `tbta-attendance-firebase` (or another available name).
5. Set **Production branch** to `main-firebase`.
6. Set **Build command** to `npm run build:web`.
7. Set **Build output directory** to `dist`.
8. Save and deploy.

Cloudflare will assign a `*.pages.dev` URL. Do not distribute that URL to teachers as the production application yet.

## Preview workflow

After the first deployment, create feature branches from `main-firebase`. Cloudflare Pages can create preview deployments for non-production branches and pull requests. Test there first, then merge approved changes into `main-firebase`.

Recommended flow:

`feature branch -> Cloudflare preview -> test -> merge to main-firebase -> migration site`

The existing Google Sheets production branch remains separate until Firebase authentication, Firestore security rules, data migration, concurrency testing, and pilot rollout are complete.

## Phase 2 verification checklist

After Cloudflare creates the URL, verify:

- Home/login UI loads over HTTPS.
- CSS and fonts load correctly.
- Browser console has no missing local asset errors other than expected disabled legacy sync behavior.
- `manifest.json` loads.
- Excel template download works.
- Desktop and mobile layouts render correctly.
- No student roster, attendance JSON, production attendance spreadsheet, keystore, Apps Script URL, or repository-only file is reachable from the deployed site.
- The sync engine reports local/offline behavior because the migration build intentionally contains no legacy webhook URL.

## Security note

The current PIN/password gate is client-side code and must not be treated as strong authentication on a public website. The migration URL should remain a test environment until Firebase Authentication and Firestore security rules are implemented.
