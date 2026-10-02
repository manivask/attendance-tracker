import os

app_path = os.path.join(os.path.dirname(__file__), "..", "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Update Teacher submit block
old_teacher_submit = """        logActivity(`Class attendance submitted for ${cls} at ${loc} by Teacher`);
        saveStateToLocalStorage();
        alert(`Class attendance for ${cls} at ${loc} has been submitted successfully! Please click Logout to log out.`);
        return;"""

new_teacher_submit = """        logActivity(`Class attendance submitted for ${cls} at ${loc} by Teacher`);
        saveStateToLocalStorage();
        if (window.AttendanceSync?.enabled()) {
            window.AttendanceSync.forceSync(getSharedPersistedState());
        }
        const hasToken = Boolean(window.AttendanceSync?.getGitHubToken && window.AttendanceSync.getGitHubToken());
        if (hasToken) {
            alert(`✅ Class attendance for ${cls} at ${loc} has been submitted & committed to GitHub!\n\nAll teachers and administrators can now see this class attendance live.`);
        } else {
            alert(`✅ Class attendance for ${cls} at ${loc} has been saved!\n\n(Saved to this device. For automatic multi-device cloud sync, please ensure GitHub Token is active in System Tools).`);
        }
        return;"""

if old_teacher_submit in code:
    code = code.replace(old_teacher_submit, new_teacher_submit)

# 2. Add Sync Event Listeners and System Tools Handlers at the end
sync_helpers = """
// ==========================================
// Cloud & GitHub Sync UI Integrations
// ==========================================
window.addEventListener("attendance-sync-status", (e) => {
    const badge = document.getElementById("sync-status-badge");
    const dot = document.getElementById("sync-dot");
    const text = document.getElementById("sync-text");
    const adminBadge = document.getElementById("admin-sync-badge");
    if (!badge || !dot || !text) return;

    const { status, message, hasToken, mode } = e.detail;
    if (status === "saving") {
        dot.style.background = "#eab308";
        text.textContent = "⏳ Syncing...";
        badge.style.borderColor = "rgba(234, 179, 8, 0.4)";
        badge.style.color = "#eab308";
    } else if (status === "saved") {
        dot.style.background = "#10b981";
        text.textContent = "☁️ Synced to GitHub";
        badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
        badge.style.color = "#10b981";
        if (adminBadge) {
            adminBadge.textContent = "Synced (" + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ")";
            adminBadge.style.background = "rgba(16, 185, 129, 0.15)";
            adminBadge.style.color = "var(--success-color)";
        }
    } else if (status === "auth_required") {
        dot.style.background = "#f59e0b";
        text.textContent = "⚠️ Token Needed";
        badge.style.borderColor = "rgba(245, 158, 11, 0.4)";
        badge.style.color = "#f59e0b";
        if (adminBadge) {
            adminBadge.textContent = "Token Needed";
            adminBadge.style.background = "rgba(245, 158, 11, 0.15)";
            adminBadge.style.color = "#f59e0b";
        }
    } else if (status === "offline") {
        dot.style.background = "#94a3b8";
        text.textContent = "📱 Local (Offline)";
        badge.style.borderColor = "rgba(148, 163, 184, 0.3)";
        badge.style.color = "#94a3b8";
    } else if (status === "ready") {
        dot.style.background = hasToken ? "#10b981" : "#3b82f6";
        text.textContent = hasToken ? "☁️ GitHub: Connected" : "☁️ GitHub: Ready";
    }
});

function showSyncStatusInfo() {
    if (!window.AttendanceSync) return;
    const st = window.AttendanceSync.getSyncStatus();
    let msg = `Cloud & GitHub Sync Status:\\n\\n`;
    msg += `• Mode: ${st.mode === "github" ? "GitHub Repository Auto-Commit" : "Custom Server"}\\n`;
    msg += `• Token Configured: ${st.hasToken ? "Yes ✅" : "No ⚠️ (Only saving locally)"}\\n`;
    msg += `• Status: ${st.status}\\n`;
    if (st.lastSyncTime) msg += `• Last Sync: ${new Date(st.lastSyncTime).toLocaleTimeString()}\\n`;
    if (st.message) msg += `• Details: ${st.message}\\n\\n`;
    msg += `Admins can configure the GitHub Token under System Tools to enable automatic live sync across all teachers' phones and laptops.`;
    alert(msg);
}

function initSyncUI() {
    const input = document.getElementById("github-token-input");
    if (input && window.AttendanceSync) {
        input.value = window.AttendanceSync.getGitHubToken() || "";
    }
}

function saveGitHubTokenFromUI() {
    const input = document.getElementById("github-token-input");
    if (!input || !window.AttendanceSync) return;
    const token = input.value.trim();
    window.AttendanceSync.setGitHubToken(token);
    alert(token ? "GitHub Token saved successfully!" : "GitHub Token cleared.");
    testGitHubSyncConnection();
}

async function testGitHubSyncConnection() {
    if (!window.AttendanceSync) return;
    const statusDiv = document.getElementById("github-token-status");
    if (statusDiv) statusDiv.textContent = "Testing connection to GitHub repository...";
    const res = await window.AttendanceSync.testConnection();
    if (statusDiv) {
        statusDiv.textContent = res.message;
        statusDiv.style.color = res.success ? "var(--success-color)" : "var(--danger-color)";
    }
    alert(res.message);
}

async function forceSyncFromGitHub() {
    if (!window.AttendanceSync) return;
    const statusDiv = document.getElementById("github-token-status");
    if (statusDiv) statusDiv.textContent = "Pulling latest data from GitHub...";
    try {
        const shared = await window.AttendanceSync.load();
        if (shared) {
            applyPersistedState(shared, false);
            renderList();
            alert("Successfully pulled latest attendance from GitHub!");
            if (statusDiv) {
                statusDiv.textContent = "Successfully synced from GitHub at " + new Date().toLocaleTimeString();
                statusDiv.style.color = "var(--success-color)";
            }
        } else {
            alert("No remote state found or repository is empty.");
        }
    } catch (e) {
        alert("Could not load from GitHub: " + e.message);
    }
}

async function forcePushToGitHub() {
    if (!window.AttendanceSync) return;
    const statusDiv = document.getElementById("github-token-status");
    if (statusDiv) statusDiv.textContent = "Pushing local state to GitHub...";
    try {
        await window.AttendanceSync.forceSync(getSharedPersistedState());
        alert("Push initiated to GitHub repository!");
    } catch (e) {
        alert("Push failed: " + e.message);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    setTimeout(initSyncUI, 500);
});
"""

if "initSyncUI" not in code:
    code += "\n" + sync_helpers

with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully updated app.js with sync handlers and UI tools")
