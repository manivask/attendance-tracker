// Production shared-data configuration.
// Set apiUrl to the HTTPS address where server.py is deployed, for example:
// window.ATTENDANCE_SYNC_CONFIG = { apiUrl: "https://attendance-api.example.org" };
// Leave it blank to use offline-only storage (the default for local development).
window.ATTENDANCE_SYNC_CONFIG = window.ATTENDANCE_SYNC_CONFIG || {
    apiUrl: "",
    // Set the same value as ATTENDANCE_API_TOKEN on the server when one is used.
    apiToken: ""
};
