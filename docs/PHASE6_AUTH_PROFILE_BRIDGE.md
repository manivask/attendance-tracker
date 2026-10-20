# Firebase auth-profile bridge

The web build requires Firebase authentication and a server-read user profile before enabling the existing portal. Local-storage roles and the old shared PIN handler cannot unlock the migration build.

For teachers, `users/{uid}` must have `active: true`, `role: "teacher"`, a nonempty `location`, and a nonempty array of unique class document IDs in `assignedClassIds`. Each assigned class is read individually from the server; it must exist, be active, have a name, and match the profile location. Missing assignments never default to Nilai 1. Failed reads leave the portal locked with an error and a sign-out button.

The legacy class picker contains only resolved assignments, using document IDs as values and class names/rooms as labels. A single assignment disables the picker. Switching between multiple valid assignments updates the legacy grade filter. Location is locked, administrator tabs remain hidden, and the existing header Logout button signs out of Firebase. The gate also offers sign-out during loading or profile errors. Restored Firebase logins repeat profile validation; role data is not restored from local storage. Superseded profile loads cannot unlock a different or signed-out account.

An active `admin` profile maps to the existing Principal role, preserving existing administrative controls. Unknown roles fail closed.

Attendance, homework, tests, workbook loading, and local persistence retain their existing behavior. No Firestore writes or roster migration are introduced. Legacy Google Sheets/Drive synchronization remains disabled by the web build. These UI restrictions do not replace Firestore security rules.

## Validation

After profile and class validation, the web app reads `/students` from the Firestore server, constrained by the teacher's assigned `classId` values. It maps active records into the existing student-table shape and fails with an administrator-facing message if no active assigned students are found. Required fields follow `docs/PHASE4_FIRESTORE_DATA_MODEL.md`; student document IDs should use the existing stable roster ID. No student documents are created by the app.

Run `npm test` (Node 20+): profile, assignment, roster mapping, and legacy handler tests, followed by the static web build. No dependency installation is needed for these tests.

Additional browser validation used the built site with mocked Firebase modules: teacher01 sign-in loaded an assigned student roster and unlocked Nilai 1 / Riverview / room 118, the class picker contained one disabled option, logout locked the portal and returned to sign-in, and an empty class assignment kept the portal locked with a visible error and working sign-out. There were no browser page errors.

Live Firebase credentials were not used. The Firestore `students` collection must be populated with active docs for `classId: "nilai-1"` before teacher01 can see students; deploy the app after that import. Then verify fresh and restored login against the published rules, and confirm a query for an unassigned class is denied. This implementation does not deploy Firestore rules or write student documents.
