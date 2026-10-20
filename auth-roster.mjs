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
