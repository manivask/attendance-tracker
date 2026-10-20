// Phase 5 authentication for the TBTA web app.
// Accounts are provisioned by an administrator; there is no public sign-up.
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

import {
  collection,
  doc,
  getDocFromServer,
  getDocsFromServer,
  query,
  where
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import { resolveAuthProfile } from "./auth-profile.mjs";
import { mapFirestoreAttendance, mapFirestoreStudents, requireStudentRoster } from "./auth-roster.mjs";

function getAuth() {
  const auth = window.TBTA_FIREBASE?.auth;
  if (!auth) throw new Error("Firebase Authentication is not ready.");
  return auth;
}

function normalizeTeacherId(value) {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
}

// Teachers use a short ID in the UI. Firebase still receives an email-shaped
// identifier, so pilot accounts should be created as teacher01@tbta.local, etc.
function teacherIdToEmail(teacherId) {
  const id = normalizeTeacherId(teacherId);
  if (!id) throw new Error("Teacher ID is required.");
  return `${id}@tbta.local`;
}

function friendlyAuthError(error) {
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Teacher ID or password is incorrect.";
    case "auth/too-many-requests":
      return "Too many login attempts. Please wait and try again.";
    case "auth/network-request-failed":
      return "Network unavailable. Check your connection and try again.";
    default:
      return "Unable to sign in. Please try again or contact the administrator.";
  }
}

export async function tbtaSignInWithTeacherId(teacherId, password) {
  const cleanPassword = String(password || "");
  if (cleanPassword.length < 6) throw new Error("Enter your password (at least 6 characters).");
  return signInWithEmailAndPassword(getAuth(), teacherIdToEmail(teacherId), cleanPassword);
}

export async function tbtaSignOut() {
  return signOut(getAuth());
}

export function tbtaObserveAuth(callback) {
  return onAuthStateChanged(getAuth(), callback);
}

function installFirebaseGate() {
  const overlay = document.getElementById("pin-gate-overlay");
  const card = overlay?.querySelector(".pin-gate-card");
  if (!overlay || !card) return;

  card.innerHTML = `
    <span class="pin-gate-icon">🏫</span>
    <h2>TBTA Attendance</h2>
    <p>Teacher / Administrator Sign In</p>
    <form id="firebase-login-form" autocomplete="on" style="text-align:left; margin-top:18px;">
      <div class="form-group" style="margin-bottom:14px;">
        <label for="firebase-teacher-id" style="font-weight:600; display:block; margin-bottom:6px;">👤 Teacher ID</label>
        <input id="firebase-teacher-id" name="username" autocomplete="username" autocapitalize="none" spellcheck="false" required
          placeholder="Example: teacher01" style="width:100%; box-sizing:border-box; padding:12px; border-radius:8px; border:2px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); font-size:1rem;">
      </div>
      <div class="form-group" style="margin-bottom:14px;">
        <label for="firebase-pin" style="font-weight:600; display:block; margin-bottom:6px;">🔑 Password</label>
        <input id="firebase-pin" name="password" type="password" minlength="6" maxlength="128" autocomplete="current-password" required
          placeholder="Enter your password" style="width:100%; box-sizing:border-box; padding:12px; border-radius:8px; border:2px solid var(--border-color); background:var(--bg-primary); color:var(--text-primary); font-size:1rem;">
      </div>
      <button id="firebase-login-btn" class="btn btn-primary" type="submit" style="width:100%; padding:12px; font-weight:700; justify-content:center;">Sign In</button>
      <div id="firebase-login-error" role="alert" style="display:none; margin-top:10px; color:var(--danger-color); font-weight:600; font-size:.85rem;"></div>
      <p style="margin:14px 0 0; color:var(--text-muted); font-size:.78rem; text-align:center;">Use the Teacher ID and password provided by the school administrator.</p>
    </form>`;

  const form = document.getElementById("firebase-login-form");
  const button = document.getElementById("firebase-login-btn");
  const errorBox = document.getElementById("firebase-login-error");
  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.style.display = "none";
    button.disabled = true;
    button.textContent = "Signing in…";
    try {
      await tbtaSignInWithTeacherId(
        document.getElementById("firebase-teacher-id").value,
        document.getElementById("firebase-pin").value
      );
    } catch (error) {
      errorBox.textContent = error?.message === "Enter your password (at least 6 characters)." ? error.message : friendlyAuthError(error);
      errorBox.style.display = "block";
    } finally {
      button.disabled = false;
      button.textContent = "Sign In";
    }
  });

  const signOutButton = document.createElement('button');
  signOutButton.type = 'button';
  signOutButton.className = 'btn btn-secondary';
  signOutButton.textContent = 'Sign out';
  signOutButton.hidden = true;
  card.appendChild(signOutButton);
  signOutButton.addEventListener('click', () => tbtaSignOut().catch(() => {
    errorBox.textContent = 'Unable to sign out. Check your connection and try again.';
    errorBox.style.display = 'block';
  }));

  let generation = 0;
  tbtaObserveAuth(async (user) => {
    const request = ++generation;
    window.applyFirebaseSession(null);
    document.body.dataset.authenticated = 'false';
    signOutButton.hidden = !user;
    form.hidden = !!user;
    errorBox.style.display = 'none';
    // Keep status outside the hidden login form for failed profile loads.
    card.appendChild(errorBox);
    if (!user) {
      window.dispatchEvent(new CustomEvent('tbta-user-signed-out'));
      return;
    }
    errorBox.textContent = 'Loading your profile and assigned classes…';
    errorBox.style.display = 'block';
    try {
      const session = await resolveAuthProfile(user.uid, async (collectionName, id) => {
        const snapshot = await getDocFromServer(doc(window.TBTA_FIREBASE.db, collectionName, id));
        return snapshot.exists() ? snapshot.data() : null;
      }, async (collectionName) => {
        const snapshot = await getDocsFromServer(collection(window.TBTA_FIREBASE.db, collectionName));
        return snapshot.docs.map(item => ({ ...item.data(), id: item.id }));
      });
      errorBox.textContent = 'Loading your assigned student roster…';
      const rawStudents = [];
      const classIds = session.role === 'Teacher' ? session.assignedClassIds : null;
      const idBatches = classIds ? Array.from({ length: Math.ceil(classIds.length / 30) }, (_, i) => classIds.slice(i * 30, (i + 1) * 30)) : [null];
      for (const ids of idBatches) {
        const studentsRef = collection(window.TBTA_FIREBASE.db, 'students');
        const studentQuery = ids ? query(studentsRef, where('classId', 'in', ids)) : studentsRef;
        const result = await getDocsFromServer(studentQuery);
        rawStudents.push(...result.docs.map(student => ({ id: student.id, ...student.data() })));
      }
      const roster = requireStudentRoster(mapFirestoreStudents(rawStudents, session.classes, session.location || ''));
      errorBox.textContent = 'Loading attendance history…';
      const attendanceClassIds = session.role === 'Teacher'
        ? session.assignedClassIds
        : session.classes.map(cls => cls.id);
      const studentAttendance = [];
      const attendanceBatches = Array.from({ length: Math.ceil(attendanceClassIds.length / 30) }, (_, i) => attendanceClassIds.slice(i * 30, (i + 1) * 30));
      for (const ids of attendanceBatches) {
        if (!ids.length) continue;
        const attendanceRef = collection(window.TBTA_FIREBASE.db, 'attendance');
        const attendanceQuery = query(attendanceRef, where('classId', 'in', ids));
        const result = await getDocsFromServer(attendanceQuery);
        studentAttendance.push(...result.docs.map(record => ({ id: record.id, ...record.data() })));
      }
      const teacherAttendanceRef = collection(window.TBTA_FIREBASE.db, 'teacherAttendance');
      const teacherAttendanceQuery = session.role === 'Teacher'
        ? query(teacherAttendanceRef, where('teacherUid', '==', user.uid))
        : teacherAttendanceRef;
      const teacherAttendanceResult = await getDocsFromServer(teacherAttendanceQuery);
      const teacherAttendance = teacherAttendanceResult.docs.map(record => ({ id: record.id, ...record.data() }));
      const attendance = mapFirestoreAttendance(studentAttendance, teacherAttendance);
      if (request !== generation || getAuth().currentUser?.uid !== user.uid) return;
      window.applyFirebaseSession(session, roster, attendance);
      document.body.dataset.authenticated = 'true';
      document.getElementById('firebase-pin').value = '';
      errorBox.style.display = 'none';
      window.dispatchEvent(new CustomEvent('tbta-user-signed-in', { detail: { uid: user.uid } }));
    } catch (error) {
      if (request !== generation) return;
      errorBox.textContent = error?.code
        ? 'Unable to read your profile or assigned classes. Check your connection and contact the administrator.'
        : error.message;
      errorBox.style.display = 'block';
    }
  });
}

window.TBTA_AUTH = Object.freeze({
  signInWithTeacherId: tbtaSignInWithTeacherId,
  signOut: tbtaSignOut,
  observe: tbtaObserveAuth
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", installFirebaseGate, { once: true });
} else {
  installFirebaseGate();
}

window.dispatchEvent(new CustomEvent("tbta-auth-ready"));
