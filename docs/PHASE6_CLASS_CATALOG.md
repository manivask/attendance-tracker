# Phase 6 class catalog

This catalog is derived from the existing `app.js` migration branch and is the source list for creating Firestore `classes/{classId}` documents.

| Class name | Proposed stable classId | Room |
|---|---|---|
| Ilanthalir | `ilanthalir` | 118 |
| Mazhalai | `mazhalai` | 116 |
| Nilai 1 | `nilai-1` | 118 |
| Nilai 2A | `nilai-2a` | 122 |
| Nilai 2B | `nilai-2b` | 125 |
| Nilai 3A | `nilai-3a` | 124 |
| Nilai 3B | `nilai-3b` | 127 |
| Nilai 4A | `nilai-4a` | 123 |
| Nilai 4B | `nilai-4b` | 130 |
| Nilai 5 | `nilai-5` | 120 |
| Nilai 6 | `nilai-6` | 115 |
| Nilai 7 | `nilai-7` | 117 |
| Nilai 8 | `nilai-8` | 111 |

## User assignment schema

Teacher user documents use the field `assignedClassIds` as an array of stable Firestore class IDs. Example after an actual assignment is approved:

```text
users/{firebaseUid}
  role: "teacher"
  active: true
  assignedClassIds: ["nilai-1"]
```

Do not infer a teacher's class. Keep `assignedClassIds` empty until the real assignment is known.

## Security status

The Phase 6 rules in the repository use `assignedClassIds` consistently. The deployed database should remain on the previous deny-all rules until the class reference documents and teacher assignments are ready for an end-to-end rules test.
