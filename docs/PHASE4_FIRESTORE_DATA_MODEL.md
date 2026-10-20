# Phase 4: Firestore Data Model

Status: design-only. Do not create production student/attendance records yet.

## Goals

- Replace the legacy giant synchronized state object with small independent Firestore documents.
- Avoid a single hot document when multiple teachers submit at the same time.
- Make teacher/class/date queries straightforward.
- Keep personally identifying information out of document IDs.
- Preserve an audit trail for important attendance changes.
- Prepare for Firebase Authentication and role-based Firestore rules in Phases 5-6.

## Top-level collections

### `users/{uid}`
Authentication-linked application profile. Document ID is the Firebase Auth UID.

Fields:
- `displayName`: string
- `email`: string
- `role`: `admin` | `teacher`
- `teacherId`: string | null
- `locationId`: string
- `active`: boolean
- `createdAt`: timestamp
- `updatedAt`: timestamp

Do not store passwords or PINs here.

### `teachers/{teacherId}`
Teacher directory/profile used by the attendance application.

Fields:
- `name`: string
- `locationId`: string
- `classIds`: string[]
- `email`: string (only if required by the application)
- `phone`: string (only if required by the application)
- `active`: boolean
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `students/{studentId}`
Student master record. Use the existing stable internal student ID when suitable; never use the student's name/email as the document ID.

Fields:
- `name`: string
- `grade`: string
- `locationId`: string
- `classId`: string
- `active`: boolean
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `classes/{classId}`
Class/section definition.

Fields:
- `name`: string
- `grade`: string
- `section`: string
- `locationId`: string
- `room`: string
- `teacherIds`: string[]
- `active`: boolean
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `attendance/{attendanceId}`
One student attendance record per student + class/session/date. Do not store an entire class or entire school day in one document.

Recommended deterministic ID: a non-sensitive stable combination such as `<date>_<classId>_<studentId>`. If any component contains sensitive information, use an opaque generated ID instead.

Fields:
- `studentId`: string
- `classId`: string
- `locationId`: string
- `date`: string (`YYYY-MM-DD`, school-local calendar date)
- `status`: `present` | `absent` | `late` | `excused`
- `markedByUid`: string
- `markedByTeacherId`: string | null
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `teacherAttendance/{attendanceId}`
Teacher attendance is separate from student attendance so its authorization and reporting can evolve independently.

Fields:
- `teacherId`: string
- `locationId`: string
- `date`: string (`YYYY-MM-DD`)
- `status`: string
- `markedByUid`: string
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `homework/{homeworkId}`
Homework record. Prefer one record per class/date/subject or assignment rather than embedding all homework into a shared state document.

Fields:
- `classId`: string
- `locationId`: string
- `date`: string (`YYYY-MM-DD`)
- `subject`: string
- `title`: string
- `description`: string
- `createdByUid`: string
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `tests/{testId}`
Test/exam definition.

Fields:
- `classId`: string
- `locationId`: string
- `date`: string (`YYYY-MM-DD`)
- `subject`: string
- `title`: string
- `maxScore`: number
- `createdByUid`: string
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `testResults/{resultId}`
One student's result for one test.

Fields:
- `testId`: string
- `studentId`: string
- `classId`: string
- `score`: number
- `updatedByUid`: string
- `createdAt`: timestamp
- `updatedAt`: timestamp

### `classSubmissions/{submissionId}`
Tracks whether a teacher/class/date has completed/submitted attendance.

Fields:
- `classId`: string
- `locationId`: string
- `date`: string (`YYYY-MM-DD`)
- `submitted`: boolean
- `submittedByUid`: string
- `submittedAt`: timestamp
- `updatedAt`: timestamp

### `settings/{settingId}`
Small, infrequently changed application configuration only. Examples: teacher cutoff time and application schema version. Do not put growing attendance/history arrays in settings documents.

### `auditEvents/{eventId}`
Append-only audit metadata for important actions. Do not duplicate full student profiles or other unnecessary personal data in audit documents.

Fields:
- `action`: string
- `entityType`: string
- `entityId`: string
- `actorUid`: string
- `locationId`: string
- `occurredAt`: timestamp
- `metadata`: map containing only non-sensitive fields needed for auditing

## Query plan

Primary application queries should be scoped and bounded:

- Class roster: `students` where `classId == ...` and `active == true`
- Daily class attendance: `attendance` where `classId == ...` and `date == ...`
- Student history: `attendance` where `studentId == ...`, ordered by date
- Teacher's classes: `classes` where `teacherIds` contains the teacher ID
- Homework by class/date: `homework` where `classId == ...` and date range as needed
- Test results: `testResults` where `testId == ...`

Create composite indexes only when Firestore reports that a required query needs one. Keep queries aligned with future security-rule constraints; Firestore rules are not post-query filters.

## Concurrency strategy

Each student's attendance is an independent document. Two teachers/classes therefore do not continuously overwrite one shared state document. Use server timestamps for authoritative update times. Where a workflow requires read-modify-write consistency, use Firestore transactions or atomic batched writes as appropriate.

## Offline strategy

Offline persistence will be implemented later, after authentication and security rules. Because school computers may be shared, persistent browser caching must be enabled deliberately rather than automatically. The application must sign users out cleanly and avoid leaving sensitive cached data accessible to the next user.

## Security-rule preparation

Phase 4 does not relax the current deny-all Firestore rules. Future rules should use Firebase Authentication UID + `users/{uid}` role/location/teacher mapping and explicitly secure every collection/subcollection. Expected policy direction:

- inactive/unauthenticated users: no access
- teachers: only the classes/locations assigned to them and only permitted fields/actions
- admins: broader school/location administration access
- audit events: controlled creation; no ordinary client update/delete
- settings: restricted writes

## Migration mapping from legacy state

- `appState.teachers` -> `teachers`
- `appState.students` -> `students`
- `appState.attendance.Students` -> `attendance`
- `appState.attendance.Teachers` -> `teacherAttendance`
- `appState.homework` -> `homework`
- `appState.tests` -> `tests` + `testResults`
- `appState.submittedClasses` -> `classSubmissions`
- `appState.teacherCutoffTime` -> `settings/attendance`
- `appState.lockedDates` -> later policy/settings representation after authorization design
- `appState.attestations` -> later dedicated records after current semantics are reviewed
- `CLASS_ROOMS` -> `classes.room`

No migration is performed in Phase 4.

## Phase 4 acceptance criteria

- Data model documented and committed to `main-firebase`.
- No production/student data added to Firestore.
- Deny-all Firestore rules remain in force.
- No legacy Google Sheets synchronization is re-enabled.
- Model is ready for Phase 5 Authentication and Phase 6 role-based security rules.
