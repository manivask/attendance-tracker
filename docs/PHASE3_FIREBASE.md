# Phase 3: Firebase Foundation

Firebase project: `tbta-attendance-tracker`

## Scope

Phase 3 establishes the Firebase project configuration and a locked Firestore foundation. It does not migrate attendance records and does not enable Firebase synchronization.

## Added to this branch

- `firebase-config.js` — Firebase web project configuration.
- `firebase.js` — Firebase App + Firestore initialization module for later integration.
- `firestore.rules` — deny-all safety baseline.
- `firebase.json` — Firebase CLI mapping for the default Firestore database.
- Cloudflare web build includes the Firebase foundation files.

## Security baseline

Firestore must remain deny-by-default until Authentication and role-based authorization are implemented. The Firebase web configuration identifies the Firebase project and is not a service-account credential. Never commit service-account JSON, private keys, passwords, or admin credentials.

## Migration status

- Existing production branch/backend: unchanged.
- Legacy Google Sheets sync in the migration deployment: disabled.
- Firestore attendance reads/writes: disabled.
- Firebase Authentication: not enabled in the application yet.
- Data migration: not started.

## Required Firebase Console rule

The default Firestore database should use this rule until the authentication/security-rule phases:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

Do not create production student/attendance collections during Phase 3.
