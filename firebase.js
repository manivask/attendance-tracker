// Phase 3 Firebase foundation. This initializes Firebase + Firestore only.
// Attendance synchronization remains disabled until the later migration phase.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

const config = window.TBTA_FIREBASE_CONFIG;

if (!config || !config.projectId) {
  console.error("Firebase configuration is missing.");
} else {
  const app = initializeApp(config);
  const db = getFirestore(app);

  // Expose only the initialized foundation for later migration modules.
  window.TBTA_FIREBASE = Object.freeze({
    app,
    db,
    projectId: config.projectId,
    phase: 3,
    syncEnabled: false
  });

  window.dispatchEvent(new CustomEvent("tbta-firebase-ready", {
    detail: { projectId: config.projectId, syncEnabled: false }
  }));
}
