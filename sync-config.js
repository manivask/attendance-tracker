// TBTA Attendance Tracker - Shared Cloud & GitHub Sync Configuration
// Mode "github": Automatically commits attendance updates to GitHub repo and loads across all devices.
window.ATTENDANCE_SYNC_CONFIG = window.ATTENDANCE_SYNC_CONFIG || {
    mode: "github", // "github" or "custom_api"
    github: {
        owner: "manivask",
        repo: "attendance-tracker",
        branch: "main",
        filePath: "data/attendance-state.json",
        // Personal Access Token (Fine-grained with contents:read/write or classic with repo scope)
        // You can leave this blank here and configure it securely in Admin > System Tools > GitHub Sync Settings
        token: ""
    },
    // Optional custom backend (server.py)
    apiUrl: "",
    apiToken: ""
};
