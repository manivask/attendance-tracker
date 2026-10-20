// Convert Firestore student documents to the legacy table's expected row shape.
export function mapFirestoreStudents(records, assignedClasses, teacherLocation = '') {
  const classes = new Map(assignedClasses.map(cls => [cls.id, cls]));
  const students = [];
  const seen = new Set();
  for (const record of records) {
    if (record.active !== true) continue;
    if (typeof record.id !== 'string' || !record.id || typeof record.name !== 'string' || !record.name.trim()) continue;
    if (typeof record.classId !== 'string') continue;
    const cls = classes.get(record.classId);
    if (assignedClasses.length && !cls) continue;
    if (seen.has(record.id)) continue;
    const grade = cls?.name || (typeof record.grade === 'string' ? record.grade.trim() : '');
    const location = cls?.location || (typeof record.location === 'string' ? record.location : teacherLocation);
    if (!grade || !location || (teacherLocation && location !== teacherLocation)) continue;
    seen.add(record.id);
    students.push({
      ID: record.id,
      Name: record.name.trim(),
      Location: location,
      Grade: grade,
      'Date of Birth': record.dateOfBirth || '',
      Gender: record.gender || '',
      'Parent Name': record.parentName || '',
      'Parent Phone': record.parentPhone || '',
      'Parent Email': record.parentEmail || '',
      'Tamil Name': record.tamilName || ''
    });
  }
  return students;
}

export function requireStudentRoster(students) {
  if (!students.length) throw new Error('No active student records are loaded for your assigned class. Ask the administrator to import the student roster into Firebase.');
  return students;
}

// Convert read-only Firestore history into the legacy app's date-keyed view.
export function mapFirestoreAttendance(studentRecords, teacherRecords) {
  const attendance = { Students: {}, Teachers: {} };
  const statuses = new Map([
    ['present', 'present'], ['p', 'present'],
    ['late', 'late'], ['l', 'late'],
    ['absent', 'absent'], ['a', 'absent']
  ]);
  const validDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
  const add = (category, date, id, rawStatus) => {
    const status = typeof rawStatus === 'string' ? statuses.get(rawStatus.trim().toLowerCase()) : null;
    if (!validDate(date) || typeof id !== 'string' || !id.trim() || !status) return;
    (attendance[category][date] ||= {})[id] = status;
  };

  for (const record of studentRecords || []) add('Students', record.date, record.studentId, record.status);
  for (const record of teacherRecords || []) add('Teachers', record.date, record.teacherName, record.status);
  return attendance;
}
