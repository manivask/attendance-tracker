# Phase 7: Historical Attendance

Historical attendance from `TBTA-2026-2027- RHS-Student_Attendance_2026-10-16.xlsx` was imported to the Firebase project `tbta-attendance-tracker` through October 16, 2026, inclusive.

- Student records: 1,135 across 10 weekly dates (August 14–October 16, 2026).
- Teacher records: 142 across the same dates.
- Student marks: 1,043 present, 8 late, 84 absent.
- Teacher marks: 136 present, 6 absent.
- Blank workbook cells were left unmarked; dates after October 16 were not imported.
- Student records use deterministic date/class/student document IDs. Teacher records use date/class/Firebase UID IDs.
- Workbook entries were matched to the existing Firebase student IDs, active class documents, and teacher profiles before import. Imported rows retain source and import timestamps; the workbook does not identify the person who originally entered each mark, so no original marker is attributed.

The authenticated app reads attendance from Firestore and displays it in the existing date selector and student/teacher views. Teachers read only records for their assigned classes and their own teacher-attendance records; administrators can read the full history. New attendance edits remain local to the app and are not written to Firestore in this phase.
