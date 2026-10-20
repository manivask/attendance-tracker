// Phase 5 Firebase foundation: App + Firestore + Authentication.
// Attendance synchronization remains disabled until the later migration phase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";

const config = window.TBTA_FIREBASE_CONFIG;

if (!config || !config.projectId) {
  console.error("Firebase configuration is missing.");
} else {
  const app = initializeApp(config);
  const db = getFirestore(app);
  const auth = getAuth(app);

  // Keep a teacher signed in on their own phone/browser between visits.
  // Shared-computer policy will be handled separately before rollout.
  setPersistence(auth, browserLocalPersistence).catch((error) => {
    console.error("Unable to configure Firebase Auth persistence:", error);
  });

  window.TBTA_FIREBASE = Object.freeze({
    app,
    db,
    auth,
    projectId: config.projectId,
    phase: 5,
    syncEnabled: false
  });

  window.dispatchEvent(new CustomEvent("tbta-firebase-ready", {
    detail: { projectId: config.projectId, phase: 5, syncEnabled: false }
  }));
}
