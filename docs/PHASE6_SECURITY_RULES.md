# Phase 6 — Firestore roles and class access

## Goal

Authorize Firebase-authenticated TBTA users by role and assigned class. Authentication answers who the user is; Firestore Security Rules determine what that user may access.

## User profile

Each Firebase Authentication account must have a matching Firestore document at `users/{uid}`.

Teacher example:

```json
{
  "loginId": "teacher01",
  "displayName": "Teacher 01",
  "role": "teacher",
  "location": "Riverview",
  "classIds": ["class-a"],
  "active": true
}
```

Admin example:

```json
{
  "loginId": "admin01",
  "displayName": "Administrator",
  "role": "admin",
  "location": "Riverview",
  "classIds": [],
  "active": true
}
```

The Firestore document ID must be the Firebase Authentication UID, not `teacher01`.

## Access model

- Inactive or unauthenticated users have no application data access.
- Teachers can read their own `users/{uid}` profile.
- Teachers can read only assigned classes and students whose `classId` is assigned to them.
- Teachers can read/write attendance only for assigned classes.
- Teacher attendance writes must identify the authenticated teacher UID.
- Homework, test-result and class-submission writes are restricted to assigned classes and record the authenticated UID.
- Admins have broad application-data access where explicitly permitted by the rules.
- User profiles, class definitions, teacher definitions and test definitions are not client-managed in this first Phase 6 ruleset.
- Audit events are append-only from clients and must record the authenticated actor UID.
- Any collection/path not explicitly allowed remains deny-all.

## Important query rule

Firestore Security Rules are not filters. Teacher queries must include constraints compatible with the rules, such as querying attendance/students for an assigned `classId`; a broad query for every student/attendance document will be denied rather than automatically filtered.

## Rollout safety

Do not publish the Phase 6 rules until the pilot user's `users/{uid}` document exists. Otherwise `teacher01` can authenticate but will correctly have no Firestore application access.

Do not enter production attendance yet. Phase 7 will replace legacy sync paths with Firestore reads/writes and realtime listeners.
