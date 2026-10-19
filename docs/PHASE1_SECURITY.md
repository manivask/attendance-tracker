# Phase 1: Repository Safety Baseline

This branch is the Firebase migration workspace. Production remains on the existing Google Sheets version until the new backend passes pilot testing.

## Repository rules

- Do not commit real student rosters, attendance exports, teacher contact data, passwords, service-account files, signing keys, or production state JSON.
- `attendance_template.xlsx` and `TBTA-2026-2027-RHS-Attendance-And-Homework-Template.xlsx` are retained only as reusable blank templates.
- `sync-config.js` is local-only. Use `sync-config.example.js` as the tracked template.
- Firebase web configuration will be added in a later phase together with Firestore security rules and authentication.
- Google Sheets remains the production synchronization backend until the Firebase pilot is complete.

## Branches created before cleanup

- `production-google-sheets-v2-2026-10-19` — snapshot from `main` for production rollback.
- `backup-main-firebase-before-phase1` — exact pre-cleanup snapshot of `main-firebase`.

## Important history note

Removing private files from this branch prevents them from being present in future snapshots, but it does not erase copies from older Git commits or other branches. Repository-history cleanup and credential/endpoint rotation must be handled separately before treating the repository as fully sanitized.
