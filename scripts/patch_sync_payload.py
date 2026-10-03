import os

sync_path = os.path.join(os.path.dirname(__file__), "..", "sync.js")

with open(sync_path, "r", encoding="utf-8") as f:
    code = f.read()

old_payload = """            const payload = {
                ...localState,
                updatedAt: new Date().toISOString(),
                updatedBy: (window.appState && window.appState.currentUserRole) ? window.appState.currentUserRole.name : "Teacher"
            };"""

new_payload = """            const payload = {
                version: "1.0",
                activeDate: localState.activeDate,
                updatedAt: new Date().toISOString(),
                updatedBy: (window.appState && window.appState.currentUserRole) ? `${window.appState.currentUserRole.name} (${window.appState.currentUserRole.role || 'Teacher'})` : "Teacher",
                attendance: localState.attendance || { Teachers: {}, Students: {} },
                homework: localState.homework || {},
                tests: localState.tests || {},
                lockedDates: localState.lockedDates || [],
                attestations: localState.attestations || {},
                students: (localState.students || []).map(s => ({ ID: s.ID, Name: s.Name, Grade: s.Grade, Location: s.Location })),
                teachers: (localState.teachers || []).map(t => ({ ID: t.ID, Name: t.Name, "Class Assignment": t["Class Assignment"], Location: t.Location }))
            };"""

if old_payload in code:
    code = code.replace(old_payload, new_payload)

with open(sync_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully updated sync.js with clean Google Drive payload")
