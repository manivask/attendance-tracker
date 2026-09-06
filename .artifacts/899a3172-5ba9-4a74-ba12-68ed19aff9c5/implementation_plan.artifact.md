# Implementation Plan: Generic Attendance Tracker for Play Store (attendance-tracker-gp)

Create a generic, customizable version of the Attendance Tracker app suitable for public release on the Google Play Store. This involves refactoring the existing code to remove specific institutional data, updating branding, and preparing the project for Android builds.

## Proposed Changes

### 1. Create New Project Module
- Create a copy of `apps/attendance-tracker` into `apps/attendance-tracker-gp`.
- Initialize a new `package.json` and `capacitor.config.json` with generic identifiers.

### 2. Generalize Branding and UI
- Update `index.html`, `manifest.json`, and `app.js` to remove "TBTA" and "Riverview" references.
- Replace institutional logos/icons with generic ones.
- Update headers and labels to be organization-neutral (e.g., "Organization Name" instead of "School Name").

### 3. Remove Hardcoded Data
- In `app.js`, clear out `GRADES`, `CLASS_ROOMS`, and `COMMITTEE_ROSTER`.
- These should be populated dynamically from the imported Excel file or a configuration step.
- Update `TARGET_EMAIL` to be configurable.

### 4. Improve Data Import
- Ensure the Excel import logic is robust enough to handle different organization structures.
- Create a generic `attendance_template.xlsx` that users can download.

### 5. Play Store Readiness
- Update `capacitor.config.json` with a unique `appId` (`com.attendance.tracker.gp`).
- Set up the Android project structure for release.
- Generate a release APK/AAB guide.

## Verification Plan

### Manual Verification
- Verify the new app `attendance-tracker-gp` runs independently of the original.
- Test the Excel import with a generic template.
- Ensure no "TBTA" or specific school names appear in the UI.

### Automated Tests
- Run existing tests if applicable.
- Verify build success for Android.

## Deliverables
- `attendance-tracker-gp` project folder.
- `PlayStore_Publishing_Guide.html` for reference.
