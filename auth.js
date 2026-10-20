// Phase 5 authentication helpers for the TBTA web app.
// No public self-registration is exposed. Teacher/admin accounts are provisioned
// by an administrator in Firebase Authentication during the pilot.
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

function getAuth() {
  const auth = window.TBTA_FIREBASE?.auth;
  if (!auth) throw new Error("Firebase Authentication is not ready.");
  return auth;
}

export async function tbtaSignIn(email, password) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail || !password) throw new Error("Email and password are required.");
  return signInWithEmailAndPassword(getAuth(), normalizedEmail, password);
}

export async function tbtaSignOut() {
  return signOut(getAuth());
}

export async function tbtaSendPasswordReset(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) throw new Error("Email is required.");
  return sendPasswordResetEmail(getAuth(), normalizedEmail);
}

export function tbtaObserveAuth(callback) {
  return onAuthStateChanged(getAuth(), callback);
}

// Expose a small API so the existing non-module application can adopt Firebase
// Authentication incrementally without rewriting app.js in one step.
window.TBTA_AUTH = Object.freeze({
  signIn: tbtaSignIn,
  signOut: tbtaSignOut,
  sendPasswordReset: tbtaSendPasswordReset,
  observe: tbtaObserveAuth
});

window.dispatchEvent(new CustomEvent("tbta-auth-ready"));
