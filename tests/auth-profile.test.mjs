import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { resolveAuthProfile } from '../auth-profile.mjs';
import { mapFirestoreAttendance, mapFirestoreStudents, requireStudentRoster } from '../auth-roster.mjs';

const teacher = { role: 'teacher', active: true, location: 'Riverview', assignedClassIds: ['nilai-1'] };
const cls = { name: 'Nilai 1', location: 'Riverview', room: '118', active: true, teacherNames: [' Kohila Kandasamy ', 'Sharmila Mathivannan'] };
const assignedClasses = [{ id: 'nilai-1', ...cls }];
function resolve(profile = teacher, classes = { 'nilai-1': cls }) {
  const reads = [];
  return { reads, result: resolveAuthProfile('teacher-uid', async (collection, id) => {
    reads.push(`${collection}/${id}`);
    return collection === 'users' ? profile : classes[id];
  }) };
}

test('teacher01 resolves only its profile and assigned class', async () => {
  const { reads, result } = resolve();
  const session = await result;
  assert.deepEqual(reads, ['users/teacher-uid', 'classes/nilai-1']);
  assert.equal(session.grade, 'Nilai 1');
  assert.equal(session.location, 'Riverview');
  assert.equal(session.role, 'Teacher');
  assert.equal(session.classes[0].room, '118');
  assert.deepEqual(session.classes[0].teacherNames, ['Kohila Kandasamy', 'Sharmila Mathivannan']);
});

for (const [label, profile] of Object.entries({
  missing: null, inactive: { ...teacher, active: false }, invalidActive: { ...teacher, active: 'true' },
  unsupportedRole: { ...teacher, role: 'Teacher' }, noAssignments: { ...teacher, assignedClassIds: [] },
  missingAssignments: { ...teacher, assignedClassIds: undefined }, malformed: { ...teacher, assignedClassIds: ['classes/nilai-1'] },
  duplicate: { ...teacher, assignedClassIds: ['nilai-1', 'nilai-1'] }, missingLocation: { ...teacher, location: '' }
})) test(`fails closed for ${label} profile`, async () => {
  const { result, reads } = resolve(profile);
  await assert.rejects(result);
  assert.deepEqual(reads, ['users/teacher-uid']);
});

for (const [label, value] of Object.entries({ missing: null, inactive: { ...cls, active: false }, mismatched: { ...cls, location: 'Elsewhere' }, unnamed: { ...cls, name: '' } })) {
  test(`fails closed for ${label} class`, async () => { await assert.rejects(resolve(teacher, { 'nilai-1': value }).result); });
}
test('permission/network errors propagate without fallback', async () => {
  await assert.rejects(resolveAuthProfile('uid', async () => { throw new Error('permission-denied'); }), /permission-denied/);
});
test('multiple assignments resolve explicitly; one invalid class denies the session', async () => {
  const profile = { ...teacher, assignedClassIds: ['nilai-1', 'nilai-2'] };
  const classes = { 'nilai-1': cls, 'nilai-2': { ...cls, name: 'Nilai 2A' } };
  assert.equal((await resolve(profile, classes).result).classes.length, 2);
  await assert.rejects(resolve(profile).result);
});
test('only an active admin gets the legacy admin role', async () => {
  const { result, reads } = resolve({ role: 'admin', active: true });
  assert.equal((await result).role, 'Principal');
  assert.deepEqual(reads, ['users/teacher-uid']);
});

test('admin profile loads active class names for the Firebase teacher directory', async () => {
  const session = await resolveAuthProfile('admin-uid', async (collection, id) => {
    assert.equal(collection, 'users');
    assert.equal(id, 'admin-uid');
    return { role: 'admin', active: true, name: 'Admin' };
  }, async collection => {
    assert.equal(collection, 'classes');
    return [
      { id: 'nilai-1', name: 'Nilai 1', location: 'Riverview', room: '118', active: true, teacherNames: ['Teacher One'] },
      { id: 'inactive', name: 'Inactive Class', location: 'Riverview', active: false, teacherNames: ['Hidden Teacher'] }
    ];
  });
  assert.equal(session.role, 'Principal');
  assert.deepEqual(session.classes.map(cls => cls.name), ['Nilai 1']);
  assert.deepEqual(session.classes[0].teacherNames, ['Teacher One']);
});

test('maps only active, assigned Firestore students into the legacy table shape', () => {
  const roster = mapFirestoreStudents([
    { id: 'S001', classId: 'nilai-1', name: ' Student One ', active: true },
    { id: 'S002', classId: 'nilai-2', name: 'Other Class', active: true },
    { id: 'S003', classId: 'nilai-1', name: 'Inactive', active: false },
    { id: 'S004', classId: 'nilai-1', name: 'Legacy Location', location: 'Elsewhere', active: true }
  ], assignedClasses, 'Riverview');
  assert.deepEqual(roster, [
    { ID: 'S001', Name: 'Student One', Location: 'Riverview', Grade: 'Nilai 1', 'Date of Birth': '', Gender: '', 'Parent Name': '', 'Parent Phone': '', 'Parent Email': '', 'Tamil Name': '' },
    { ID: 'S004', Name: 'Legacy Location', Location: 'Riverview', Grade: 'Nilai 1', 'Date of Birth': '', Gender: '', 'Parent Name': '', 'Parent Phone': '', 'Parent Email': '', 'Tamil Name': '' }
  ]);
});
test('legacy roster requires at least one active student', () => {
  assert.throws(() => requireStudentRoster([]), /No active student records/);
  assert.deepEqual(requireStudentRoster([{ ID: 'S001' }]), [{ ID: 'S001' }]);
});

test('maps valid Firestore student and teacher history into the date view', () => {
  assert.deepEqual(mapFirestoreAttendance([
    { studentId: 'S001', date: '2026-10-16', status: 'present' },
    { studentId: 'S002', date: '2026-10-16', status: 'L' },
    { studentId: 'S003', date: 'invalid', status: 'absent' },
    { studentId: 'S004', date: '2026-10-16', status: 'unknown' }
  ], [
    { teacherName: 'Teacher One', date: '2026-10-16', status: 'A' },
    { teacherName: '', date: '2026-10-16', status: 'present' }
  ]), {
    Students: { '2026-10-16': { S001: 'present', S002: 'late' } },
    Teachers: { '2026-10-16': { 'Teacher One': 'absent' } }
  });
});

test('assigned teacher label uses class teacher names from Firestore', () => {
  const { run } = legacyHarness();
  assert.equal(run('getAssignedTeacherNames({ classId: "nilai-1", grade: "Nilai 1", location: "Riverview", classes: [{ id: "nilai-1", teacherNames: ["Kohila Kandasamy", "Sharmila Mathivannan"] }] }, [])'), 'Kohila Kandasamy & Sharmila Mathivannan');
});

test('Firebase Teachers tab roster comes from the selected assigned class', () => {
  const { run } = legacyHarness();
  const roster = JSON.parse(run(`JSON.stringify(getFirebaseAssignedTeacherRoster({
    role: "Teacher", classId: "nilai-2", classes: [
      { id: "nilai-1", name: "Nilai 1", location: "Riverview", teacherNames: ["Wrong Class Teacher"] },
      { id: "nilai-2", name: "Nilai 2", location: "Riverview", teacherNames: [" Teacher A ", "Teacher B", "teacher a"] }
    ]
  }))`));
  assert.deepEqual(roster.map(teacher => teacher.Name), ['Teacher A', 'Teacher B']);
  assert.ok(roster.every(teacher => teacher['Class Assignment'] === 'Nilai 2'));
});

test('Firebase admin teacher roster combines class assignments without duplicate names', () => {
  const { run } = legacyHarness();
  const roster = JSON.parse(run('JSON.stringify(getFirebaseAssignedTeacherRoster({ role: "Principal", classes: [{ name: "Nilai 1", location: "Riverview", teacherNames: ["Teacher A"] }, { name: "Nilai 2", location: "Riverview", teacherNames: [" teacher a ", "Teacher B"] }] }, "Riverview"))'));
  assert.deepEqual(roster.map(teacher => teacher.Name), ['Teacher A', 'Teacher B']);
  assert.equal(roster[0]['Class Assignment'], 'Nilai 1, Nilai 2');
  assert.equal(roster[1]['Class Assignment'], 'Nilai 2');
});

// Exercise the actual legacy handlers without workbook/network dependencies.
function legacyHarness() {
  const elements = new Map();
  const element = id => {
    if (!elements.has(id)) elements.set(id, { style: {}, value: '', classList: { toggle() {}, contains() { return false; } }, replaceChildren(...options) { this.options = options; }, querySelector() { return null; } });
    return elements.get(id);
  };
  const context = vm.createContext({ console, window: { TBTA_FIREBASE_REQUIRED: true, addEventListener() {} },
    document: { getElementById: element, querySelector: element, querySelectorAll() { return []; }, addEventListener() {}, createElement: () => ({}) },
    localStorage: { getItem() { return null; }, setItem() {} }, alert() {} });
  vm.runInContext(fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8'), context);
  vm.runInContext('renderList = () => {}; updateDateTimeAndRules = () => {}; updateActiveDateBar = () => {}; initializeDefaultAttendanceForClass = () => {}; renderAuditLogs = () => {};', context);
  return { context, element, run: code => vm.runInContext(code, context) };
}

test('legacy UI stays locked until validated session, rejects cached roles and old PIN', async () => {
  const { context, run, element } = legacyHarness();
  run('applyPersistedState({currentUserRole: {role:"Developer"}}, true); handlePinInput(); checkAccessGate();');
  assert.equal(run('appState.currentUserRole'), null);
  assert.equal(element('main-app-container').inert, true);
  context.session = await resolve().result;
  context.roster = mapFirestoreStudents([{ id: 'S001', name: 'Student One', classId: 'nilai-1', active: true }], assignedClasses, 'Riverview');
  context.attendance = { Students: { '2026-10-16': { S001: 'present' } }, Teachers: {} };
  run('appState.activeDate = "2026-10-23"');
  run('appState.currentMode = "Homework"');
  run('window.applyFirebaseSession(session, roster, attendance)');
  assert.equal(run('appState.currentMode'), 'Attendance');
  assert.equal(element('main-app-container').inert, false);
  assert.equal(element('main-class-select').value, 'nilai-1');
  assert.equal(element('main-class-select').disabled, true);
  assert.equal(element('main-class-select').options.length, 1);
  assert.equal(run('appState.students[0].Name'), 'Student One');
  assert.equal(run('appState.attendance.Students["2026-10-16"].S001'), 'present');
  assert.equal(run('appState.activeDate'), '2026-10-16');
  assert.equal(element('location-select').disabled, true);
  element('main-class-select').value = 'nilai-2';
  run('handleMainClassChange(); switchTab("Dashboard");');
  assert.equal(run('appState.currentUserRole.grade'), 'Nilai 1');
  assert.equal(run('appState.currentTab'), 'Students');
  assert.equal(run('getPersistedState().currentUserRole'), null);
  run('window.applyFirebaseSession(null)');
  assert.equal(element('main-app-container').inert, true);
  assert.deepEqual(JSON.parse(JSON.stringify(run('appState.attendance'))), { Students: {}, Teachers: {} });
});
test('legacy UI permits switching only between resolved assignments', async () => {
  const { context, run, element } = legacyHarness();
  context.session = await resolve({ ...teacher, assignedClassIds: ['nilai-1', 'nilai-2'] }, { 'nilai-1': cls, 'nilai-2': { ...cls, name: 'Nilai 2A', room: '122' } }).result;
  run('window.applyFirebaseSession(session)');
  element('main-class-select').value = 'nilai-2';
  run('handleMainClassChange()');
  assert.equal(run('appState.currentUserRole.grade'), 'Nilai 2A');
  assert.equal(run('appState.currentUserRole.classId'), 'nilai-2');
});
test('visible legacy logout invokes Firebase sign-out and locks immediately', async () => {
  const { context, run, element } = legacyHarness();
  context.session = await resolve().result;
  let calls = 0;
  context.window.TBTA_AUTH = { signOut: async () => { calls++; } };
  run('window.applyFirebaseSession(session)');
  await run('lockAppAccess()');
  assert.equal(calls, 1);
  assert.equal(run('appState.currentUserRole'), null);
  assert.equal(element('main-app-container').inert, true);
});
