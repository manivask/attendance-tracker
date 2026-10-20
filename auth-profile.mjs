// Resolve access from server documents only. Never infer a class from a name/ID.
export async function resolveAuthProfile(uid, readDocument) {
  const profile = await readDocument('users', uid);
  if (!profile) throw new Error('User profile is missing. Contact the administrator.');
  if (profile.active !== true) throw new Error('This account is inactive. Contact the administrator.');
  if (!['teacher', 'admin'].includes(profile.role)) throw new Error('This account has an unsupported role. Contact the administrator.');
  const name = typeof profile.name === 'string' && profile.name.trim() ? profile.name.trim() : uid;
  if (profile.role === 'admin') return { uid, name, role: 'Principal', classes: [] };
  const ids = profile.assignedClassIds;
  if (!Array.isArray(ids) || !ids.length || ids.some(id => typeof id !== 'string' || !id.trim() || id.includes('/')) || new Set(ids).size !== ids.length) {
    throw new Error('No valid class assignment. Contact the administrator.');
  }
  if (typeof profile.location !== 'string' || !profile.location.trim()) throw new Error('Account location is missing. Contact the administrator.');
  const classes = await Promise.all(ids.map(async id => {
    const cls = await readDocument('classes', id);
    if (!cls || cls.active !== true || typeof cls.name !== 'string' || !cls.name.trim() || cls.location !== profile.location) {
      throw new Error('An assigned class is missing, inactive, or has a different location. Contact the administrator.');
    }
    const teacherNames = Array.isArray(cls.teacherNames)
      ? cls.teacherNames.filter(value => typeof value === 'string' && value.trim()).map(value => value.trim())
      : [];
    return { id, name: cls.name.trim(), location: cls.location, room: String(cls.room ?? ''), teacherNames };
  }));
  if (new Set(classes.map(cls => cls.name)).size !== classes.length) throw new Error('Assigned class names are ambiguous. Contact the administrator.');
  return { uid, name, role: 'Teacher', location: profile.location, assignedClassIds: [...ids], classes, classId: classes[0].id, grade: classes[0].name };
}
