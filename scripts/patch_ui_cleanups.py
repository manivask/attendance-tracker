import os
import re

index_path = os.path.join(os.path.dirname(__file__), "..", "index.html")

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Remove iPhone modal if present
content = re.sub(r'<!-- iPhone & Mobile Access Guide Modal -->.*?<!-- Cloud & GitHub Sync Modal -->', '<!-- Cloud & Sync Modal -->', content, flags=re.DOTALL)
content = re.sub(r'<div id="iphone-modal-overlay".*?</div>\s*</div>\s*</div>', '', content, flags=re.DOTALL)

# 2. Update Header: remove iPhone button and time-window-status
old_header_right_pattern = r'<div class="header-right">.*?<button class="btn btn-secondary btn-logout"'
new_header_right = """<div class="header-right">
                <div class="sync-status-badge" id="sync-status-badge" title="Cloud Sync Status (Click to configure)" onclick="openGitHubSyncModal()" style="display: flex; align-items: center; gap: 6px; padding: 6px 14px; border-radius: 20px; font-size: 0.82rem; font-weight: 600; cursor: pointer; background: rgba(59, 130, 246, 0.12); color: var(--accent-color); border: 1px solid rgba(59, 130, 246, 0.3);">
                    <span class="sync-dot" id="sync-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-color); display: inline-block;"></span>
                    <span id="sync-text">☁️ Cloud Sync: Ready</span>
                </div>
                <button class="btn btn-secondary" id="theme-toggle-btn" onclick="toggleTheme()" title="Toggle Dark/Light Mode" style="font-size: 1.15rem; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); cursor: pointer; display: flex; align-items: center; justify-content: center; height: 38px; line-height: 1;">🌙</button>
                <button class="btn btn-secondary btn-logout" """

content = re.sub(old_header_right_pattern, new_header_right, content, flags=re.DOTALL)

# 3. Remove School Location dropdown inside the app
old_loc_picker = """                <div class="location-picker">
                    <label for="location-select">📍 School Location:</label>
                    <select id="location-select" onchange="handleLocationChange()">
                        <option value="Riverview">Riverview</option>
                    </select>
                </div>"""

# replace it with empty string or hidden
if old_loc_picker in content:
    content = content.replace(old_loc_picker, '<div class="location-picker" style="display: none;"><select id="location-select"><option value="Riverview">Riverview</option></select></div>')

# 4. Update the Cloud Sync Modal to prominently feature Google Drive & Sheets URL
cloud_sync_modal = """    <!-- Cloud & Sync Modal (Google Drive, Google Sheets, GitHub) -->
    <div id="github-sync-modal-overlay" class="student-modal-overlay" style="display:none;" onclick="closeGitHubSyncModal(event)">
        <div class="student-modal-card" style="max-width: 580px; text-align: left;" onclick="event.stopPropagation()">
            <button class="modal-close-btn" onclick="closeGitHubSyncModal(event)">✕</button>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 2.2rem;">☁️</span>
                <div>
                    <h2 style="margin: 0; font-size: 1.3rem;">Live Cloud &amp; Google Drive Sync</h2>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">Connect to Google Drive &amp; Sheets or GitHub</p>
                </div>
            </div>

            <!-- Tab 1: Google Drive / Google Sheets (Recommended) -->
            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: var(--success-color); font-size: 0.95rem;">📊 Google Drive / Google Sheets (Recommended)</strong>
                    <span style="font-size: 0.75rem; background: var(--success-color); color: #fff; padding: 2px 8px; border-radius: 10px; font-weight: 700;">Zero Tokens for Teachers</span>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 10px 0; line-height: 1.4;">
                    Paste your Google Apps Script Web App URL below to automatically save and sync all attendance directly into your school's Google Sheet &amp; Google Drive:
                </p>
                <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <input type="text" id="modal-gdrive-url-input" placeholder="https://script.google.com/macros/s/.../exec" style="flex: 1; min-width: 220px; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
                    <button class="btn btn-primary" onclick="saveGoogleDriveUrlFromModal()" style="background: var(--success-color); border-color: var(--success-color); padding: 10px 14px; font-weight: 600;">💾 Save URL</button>
                    <button class="btn btn-secondary" onclick="testGoogleDriveConnectionModal()" style="padding: 10px 12px;">🧪 Test</button>
                </div>
                <div id="modal-gdrive-status" style="font-size: 0.8rem; color: var(--text-muted);">
                    See <code>google_apps_script_setup.js</code> in the repo for the 1-minute setup code.
                </div>
            </div>

            <!-- Tab 2: GitHub Direct Commit -->
            <div style="background: var(--bg-primary); padding: 14px; border-radius: 10px; border: 1px solid var(--border-color); margin-bottom: 16px;">
                <strong style="font-size: 0.9rem; display: block; margin-bottom: 6px;">🐙 GitHub Repository Sync (Optional)</strong>
                <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <input type="password" id="modal-github-token-input" placeholder="ghp_... or github_pat_..." style="flex: 1; min-width: 220px; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-family: monospace; font-size: 0.85rem;">
                    <button class="btn btn-secondary" onclick="saveGitHubTokenFromModal()" style="padding: 10px 14px; font-weight: 600;">💾 Save Token</button>
                    <button class="btn btn-secondary" onclick="testGitHubSyncConnectionModal()" style="padding: 10px 12px;">🧪 Test</button>
                </div>
                <div id="modal-github-token-status" style="font-size: 0.8rem; color: var(--text-muted);">
                    Requires <code>contents:write</code> permission on repository <code>manivask/attendance-tracker</code>.
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="forceSyncFromCloud()" style="flex: 1; padding: 10px; font-size: 0.88rem; justify-content: center;">
                    ⬇️ Pull Latest Attendance Now
                </button>
                <button class="btn btn-secondary" onclick="forcePushToCloud()" style="flex: 1; padding: 10px; font-size: 0.88rem; justify-content: center;">
                    ⬆️ Push All Local Data Now
                </button>
            </div>

            <div style="text-align: right; border-top: 1px solid var(--border-color); padding-top: 12px;">
                <button class="btn btn-secondary" onclick="closeGitHubSyncModal(event)">Close</button>
            </div>
        </div>
    </div>"""

# Replace the sync modal overlay in content
content = re.sub(r'<div id="github-sync-modal-overlay".*?</div>\s*</div>\s*</div>', cloud_sync_modal, content, flags=re.DOTALL)

# 5. Cache-bust scripts to v12
content = re.sub(r'sync-config\.js(\?v=\d+)?', 'sync-config.js?v=12', content)
content = re.sub(r'sync\.js(\?v=\d+)?', 'sync.js?v=12', content)
content = re.sub(r'app\.js(\?v=\d+)?', 'app.js?v=12', content)

with open(index_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully cleaned up index.html (removed iPhone link, time window, school location inside app, enhanced Google Drive modal)")
