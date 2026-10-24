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

  // Finish setting up persistent auth before auth.js registers its observer.
  // This avoids a startup race and keeps teachers signed in on their own phone/browser.
  try {
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    // Do not block access to the app if the browser disallows persistent storage.
    console.error("Unable to configure Firebase Auth persistence:", error);
  }

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
