import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { resolveAuthProfile } from '../auth-profile.mjs';
import { mapFirestoreStudents, requireStudentRoster } from '../auth-roster.mjs';

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

test('assigned teacher label uses class teacher names from Firestore', () => {
  const { run } = legacyHarness();
  assert.equal(run('getAssignedTeacherNames({ classId: "nilai-1", grade: "Nilai 1", location: "Riverview", classes: [{ id: "nilai-1", teacherNames: ["Kohila Kandasamy", "Sharmila Mathivannan"] }] }, [])'), 'Kohila Kandasamy & Sharmila Mathivannan');
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
  run('window.applyFirebaseSession(session, roster)');
  assert.equal(element('main-app-container').inert, false);
  assert.equal(element('main-class-select').value, 'nilai-1');
  assert.equal(element('main-class-select').disabled, true);
  assert.equal(element('main-class-select').options.length, 1);
  assert.equal(run('appState.students[0].Name'), 'Student One');
  assert.equal(element('location-select').disabled, true);
  element('main-class-select').value = 'nilai-2';
  run('handleMainClassChange(); switchTab("Dashboard");');
  assert.equal(run('appState.currentUserRole.grade'), 'Nilai 1');
  assert.equal(run('appState.currentTab'), 'Students');
  assert.equal(run('getPersistedState().currentUserRole'), null);
  run('window.applyFirebaseSession(null)');
  assert.equal(element('main-app-container').inert, true);
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
