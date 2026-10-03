// TBTA Attendance Tracker - Shared Cloud & Sync Configuration
// Mode "google_drive": Direct Google Sheets & Google Drive Live Sync (Zero tokens needed for teachers!)
window.ATTENDANCE_SYNC_CONFIG = window.ATTENDANCE_SYNC_CONFIG || {
    // Set to "google_drive" or "github"
    mode: "google_drive",

    // Live Google Sheets & Google Drive Webhook URL
    // Works automatically across all teachers' phones and laptops without tokens or logins!
    googleDriveUrl: "https://script.google.com/macros/s/AKfycbw_v-oyFIx4VWVsdkfTL7x0iykVJ34uK6HnzBZP0bxyenYBWX301vkN2c97ixSBDlW8ZA/exec",

    // GitHub Sync Configuration (Optional fallback)
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
