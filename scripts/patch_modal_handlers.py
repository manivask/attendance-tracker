import os

app_path = os.path.join(os.path.dirname(__file__), "..", "app.js")

with open(app_path, "r", encoding="utf-8") as f:
    code = f.read()

modal_helpers = """
function openGitHubSyncModal() {
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
}
"""

if "openGitHubSyncModal" not in code:
    code += "\n" + modal_helpers

with open(app_path, "w", encoding="utf-8") as f:
    f.write(code)

print("Successfully added modal handlers to app.js")
