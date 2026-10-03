// TBTA Attendance Tracker - Shared Cloud & Sync Configuration
// Mode "google_drive": Direct Google Sheets & Google Drive Live Sync (Recommended - Zero tokens needed for teachers!)
// Mode "github": Automatically commits attendance updates to GitHub repo.
window.ATTENDANCE_SYNC_CONFIG = window.ATTENDANCE_SYNC_CONFIG || {
    // Set to "google_drive" or "github"
    mode: "google_drive",

    // Google Sheets & Google Drive Webhook URL (from Google Apps Script Deployment)
    // Teachers on any phone or laptop can save & sync without needing a login or token!
    googleDriveUrl: "",

    // GitHub Sync Configuration
    github: {
        owner: "manivask",
        repo: "attendance-tracker",
        branch: "main",
        filePath: "data/attendance-state.json",
        token: ""
    },

    // Optional custom backend (server.py)
    apiUrl: "",
    apiToken: ""
};
