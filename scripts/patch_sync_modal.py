import os

index_path = os.path.join(os.path.dirname(__file__), "..", "index.html")

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add GitHub Sync Modal
sync_modal_html = """    <!-- Cloud & GitHub Sync Modal -->
    <div id="github-sync-modal-overlay" class="student-modal-overlay" style="display:none;" onclick="closeGitHubSyncModal(event)">
        <div class="student-modal-card" style="max-width: 560px; text-align: left;" onclick="event.stopPropagation()">
            <button class="modal-close-btn" onclick="closeGitHubSyncModal(event)">✕</button>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 2.2rem;">☁️</span>
                <div>
                    <h2 style="margin: 0; font-size: 1.3rem;">GitHub Live Cloud Sync</h2>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">Automatic live multi-teacher sync &amp; GitHub commits</p>
                </div>
            </div>

            <p style="font-size: 0.88rem; line-height: 1.5; color: var(--text-secondary); margin-bottom: 16px;">
                When teachers submit attendance (e.g. Nilai 1, Nilai 2), records are automatically merged and committed to the school's GitHub repository (<code>manivask/attendance-tracker</code>) and shared across all devices in real time.
            </p>

            <div style="background: var(--bg-primary); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 16px;">
                <label style="display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 6px;">🔑 GitHub Personal Access Token (PAT):</label>
                <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <input type="password" id="modal-github-token-input" placeholder="ghp_... or github_pat_..." style="flex: 1; min-width: 220px; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-family: monospace; font-size: 0.9rem;">
                    <button class="btn btn-primary" onclick="saveGitHubTokenFromModal()" style="padding: 10px 16px; font-weight: 600;">💾 Save Token</button>
                    <button class="btn btn-secondary" onclick="testGitHubSyncConnectionModal()" style="padding: 10px 14px;">🧪 Test</button>
                </div>
                <div id="modal-github-token-status" style="font-size: 0.82rem; color: var(--text-muted);">
                    Requires <code>contents:write</code> permission on repository <code>manivask/attendance-tracker</code>.
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="forceSyncFromGitHub()" style="flex: 1; padding: 10px; font-size: 0.88rem; justify-content: center;">
                    ⬇️ Pull Latest from GitHub
                </button>
                <button class="btn btn-secondary" onclick="forcePushToGitHub()" style="flex: 1; padding: 10px; font-size: 0.88rem; justify-content: center;">
                    ⬆️ Push Local Data to GitHub
                </button>
            </div>

            <div style="text-align: right; border-top: 1px solid var(--border-color); padding-top: 12px;">
                <button class="btn btn-secondary" onclick="closeGitHubSyncModal(event)">Close</button>
            </div>
        </div>
    </div>
"""

if 'id="github-sync-modal-overlay"' not in content:
    marker = '<!-- Google Drive Upload Modal -->'
    content = content.replace(marker, sync_modal_html + "\n    " + marker)

# 2. Update Header Sync Badge to open modal on click
old_badge = '<div class="sync-status-badge" id="sync-status-badge" title="Cloud &amp; GitHub Sync Status" onclick="showSyncStatusInfo()"'
new_badge = '<div class="sync-status-badge" id="sync-status-badge" title="Cloud &amp; GitHub Sync Status (Click to configure)" onclick="openGitHubSyncModal()"'
if old_badge in content:
    content = content.replace(old_badge, new_badge)

# 3. Add Sync button to Security Gate tips
gate_marker = '<div class="authorized-roles-tip" id="gate-tips"'
gate_btn = """<div style="margin-top: 14px; text-align: center;">
                <button type="button" class="btn btn-text" onclick="openGitHubSyncModal()" style="font-size: 0.82rem; color: var(--accent-color); text-decoration: underline; cursor: pointer;">☁️ Configure GitHub Cloud Sync</button>
            </div>\n            """ + gate_marker

if 'Configure GitHub Cloud Sync' not in content:
    content = content.replace(gate_marker, gate_btn)

# 4. Cache bust scripts
content = content.replace('<script src="sync-config.js"></script>', '<script src="sync-config.js?v=11"></script>')
content = content.replace('<script src="sync.js"></script>', '<script src="sync.js?v=11"></script>')
content = content.replace('<script src="app.js"></script>', '<script src="app.js?v=11"></script>')

with open(index_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully added GitHub Sync Modal and Gate button to index.html")
