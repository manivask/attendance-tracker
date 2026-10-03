import os

app_path = os.path.join(os.path.dirname(__file__), "..", "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

# 1. Null-safe updateDateTimeAndRules
old_timer_logic = """    timeWindowStatusDiv.className = "time-window-status";
    handleAttestationChange();

    if (isDateLocked) {
        timeWindowStatusDiv.classList.add("locked");
        statusTitleSpan.textContent = "Attendance Locked";
        if (canBypassLock()) {
            statusTimeSpan.textContent = "Principal Bypass Mode";
        } else {
            statusTimeSpan.textContent = `${dateStr} Submitted`;
        }
    } else {
        timeWindowStatusDiv.classList.add("active");
        statusTitleSpan.textContent = "Weekly Record Open";
        statusTimeSpan.textContent = formatDateForDisplay(dateStr);
    }"""

new_timer_logic = """    if (timeWindowStatusDiv) timeWindowStatusDiv.className = "time-window-status";
    handleAttestationChange();

    if (isDateLocked) {
        if (timeWindowStatusDiv) timeWindowStatusDiv.classList.add("locked");
        if (statusTitleSpan) statusTitleSpan.textContent = "Attendance Locked";
        if (statusTimeSpan) {
            statusTimeSpan.textContent = canBypassLock() ? "Principal Bypass Mode" : `${dateStr} Submitted`;
        }
    } else {
        if (timeWindowStatusDiv) timeWindowStatusDiv.classList.add("active");
        if (statusTitleSpan) statusTitleSpan.textContent = "Weekly Record Open";
        if (statusTimeSpan) statusTimeSpan.textContent = formatDateForDisplay(dateStr);
    }"""

if old_timer_logic in code:
    code = code.replace(old_timer_logic, new_timer_logic)

# 2. Update Sync badge listener
old_sync_listener = """window.addEventListener("attendance-sync-status", (e) => {
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
});"""

new_sync_listener = """window.addEventListener("attendance-sync-status", (e) => {
    const badge = document.getElementById("sync-status-badge");
    const dot = document.getElementById("sync-dot");
    const text = document.getElementById("sync-text");
    const adminBadge = document.getElementById("admin-sync-badge");
    if (!badge || !dot || !text) return;

    const { status, message, hasToken, hasGdrive, mode } = e.detail;
    const isConnected = hasGdrive || hasToken;
    const serviceName = hasGdrive ? "Google Drive" : "GitHub";

    if (status === "saving") {
        dot.style.background = "#eab308";
        text.textContent = "⏳ Syncing...";
        badge.style.borderColor = "rgba(234, 179, 8, 0.4)";
        badge.style.color = "#eab308";
    } else if (status === "saved") {
        dot.style.background = "#10b981";
        text.textContent = `☁️ Synced (${serviceName})`;
        badge.style.borderColor = "rgba(16, 185, 129, 0.4)";
        badge.style.color = "#10b981";
        if (adminBadge) {
            adminBadge.textContent = "Synced (" + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) + ")";
            adminBadge.style.background = "rgba(16, 185, 129, 0.15)";
            adminBadge.style.color = "var(--success-color)";
        }
    } else if (status === "auth_required") {
        dot.style.background = "#3b82f6";
        text.textContent = "📱 Saved Locally";
        badge.style.borderColor = "rgba(59, 130, 246, 0.4)";
        badge.style.color = "#3b82f6";
    } else if (status === "offline") {
        dot.style.background = "#94a3b8";
        text.textContent = "📱 Local (Offline)";
        badge.style.borderColor = "rgba(148, 163, 184, 0.3)";
        badge.style.color = "#94a3b8";
    } else if (status === "ready") {
        dot.style.background = isConnected ? "#10b981" : "#3b82f6";
        text.textContent = isConnected ? `☁️ ${serviceName}: Connected` : "☁️ Cloud Sync: Ready";
    }
});"""

if old_sync_listener in code:
    code = code.replace(old_sync_listener, new_sync_listener)

# 3. Update Modal Handlers for Google Drive & GitHub
old_modal_fns = """function openGitHubSyncModal() {
    const modal = document.getElementById("github-sync-modal-overlay");
    if (modal) {
        modal.style.display = "flex";
        const input = document.getElementById("modal-github-token-input");
        if (input && window.AttendanceSync) {
            input.value = window.AttendanceSync.getGitHubToken() || "";
        }
    }
}

function closeGitHubSyncModal(event) {
    if (event && event.target !== document.getElementById("github-sync-modal-overlay") && !event.target.classList.contains("modal-close-btn") && event.target.tagName !== "BUTTON") return;
    const modal = document.getElementById("github-sync-modal-overlay");
    if (modal) modal.style.display = "none";
}

function saveGitHubTokenFromModal() {
    const input = document.getElementById("modal-github-token-input");
    if (!input || !window.AttendanceSync) return;
    const token = input.value.trim();
    window.AttendanceSync.setGitHubToken(token);
    alert(token ? "✅ GitHub Token saved successfully!" : "GitHub Token cleared.");
    testGitHubSyncConnectionModal();
}

async function testGitHubSyncConnectionModal() {
    if (!window.AttendanceSync) return;
    const statusDiv = document.getElementById("modal-github-token-status");
    if (statusDiv) statusDiv.textContent = "Testing connection to GitHub repository...";
    const res = await window.AttendanceSync.testConnection();
    if (statusDiv) {
        statusDiv.textContent = (res.success ? "✅ " : "❌ ") + res.message;
        statusDiv.style.color = res.success ? "var(--success-color)" : "var(--danger-color)";
    }
    alert((res.success ? "✅ " : "❌ ") + res.message);
}"""

new_modal_fns = """function openGitHubSyncModal() {
    const modal = document.getElementById("github-sync-modal-overlay");
    if (modal) {
        modal.style.display = "flex";
        const gInput = document.getElementById("modal-gdrive-url-input");
        if (gInput && window.AttendanceSync) {
            gInput.value = window.AttendanceSync.getGoogleDriveUrl() || "";
        }
        const ghInput = document.getElementById("modal-github-token-input");
        if (ghInput && window.AttendanceSync) {
            ghInput.value = window.AttendanceSync.getGitHubToken() || "";
        }
    }
}

function closeGitHubSyncModal(event) {
    if (event && event.target !== document.getElementById("github-sync-modal-overlay") && !event.target.classList.contains("modal-close-btn") && event.target.tagName !== "BUTTON") return;
    const modal = document.getElementById("github-sync-modal-overlay");
    if (modal) modal.style.display = "none";
}

function saveGoogleDriveUrlFromModal() {
    const input = document.getElementById("modal-gdrive-url-input");
    if (!input || !window.AttendanceSync) return;
    const url = input.value.trim();
    window.AttendanceSync.setGoogleDriveUrl(url);
    alert(url ? "✅ Google Drive & Sheets Webhook URL saved successfully!" : "Google Drive URL cleared.");
    testGoogleDriveConnectionModal();
}

async function testGoogleDriveConnectionModal() {
    if (!window.AttendanceSync) return;
    const statusDiv = document.getElementById("modal-gdrive-status");
    if (statusDiv) statusDiv.textContent = "Testing connection to Google Drive...";
    const res = await window.AttendanceSync.testConnection();
    if (statusDiv) {
        statusDiv.textContent = (res.success ? "✅ " : "❌ ") + res.message;
        statusDiv.style.color = res.success ? "var(--success-color)" : "var(--danger-color)";
    }
    alert((res.success ? "✅ " : "❌ ") + res.message);
}

function saveGitHubTokenFromModal() {
    const input = document.getElementById("modal-github-token-input");
    if (!input || !window.AttendanceSync) return;
    const token = input.value.trim();
    window.AttendanceSync.setGitHubToken(token);
    alert(token ? "✅ GitHub Token saved successfully!" : "GitHub Token cleared.");
    testGitHubSyncConnectionModal();
}

async function testGitHubSyncConnectionModal() {
    if (!window.AttendanceSync) return;
    const statusDiv = document.getElementById("modal-github-token-status");
    if (statusDiv) statusDiv.textContent = "Testing connection to GitHub repository...";
    const res = await window.AttendanceSync.testConnection();
    if (statusDiv) {
        statusDiv.textContent = (res.success ? "✅ " : "❌ ") + res.message;
        statusDiv.style.color = res.success ? "var(--success-color)" : "var(--danger-color)";
    }
    alert((res.success ? "✅ " : "❌ ") + res.message);
}

async function forceSyncFromCloud() {
    if (!window.AttendanceSync) return;
    try {
        const shared = await window.AttendanceSync.load();
        if (shared) {
            applyPersistedState(shared, false);
            renderList();
            alert("✅ Successfully pulled latest attendance from Cloud!");
        } else {
            alert("No remote state found or repository is empty.");
        }
    } catch (e) {
        alert("Could not load from Cloud: " + e.message);
    }
}

async function forcePushToCloud() {
    if (!window.AttendanceSync) return;
    try {
        await window.AttendanceSync.forceSync(getSharedPersistedState());
        alert("✅ Push initiated to Cloud (Google Drive / GitHub)!");
    } catch (e) {
        alert("Push failed: " + e.message);
    }
}"""

if old_modal_fns in code:
    code = code.replace(old_modal_fns, new_modal_fns)

with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully updated app.js with Google Drive handlers and cleanups")
