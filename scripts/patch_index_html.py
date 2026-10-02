import os

index_path = os.path.join(os.path.dirname(__file__), "..", "index.html")

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add Sync badge in header
header_target = '<button class="btn btn-secondary" onclick="openIphoneGuideModal()"'
sync_badge_html = '''<button class="btn btn-secondary" onclick="openIphoneGuideModal()" title="iPhone &amp; Web Link" style="font-size: 0.85rem; padding: 8px 12px; border-radius: 8px; font-weight: 600;">📱 iPhone Link</button>
                <div class="sync-status-badge" id="sync-status-badge" title="Cloud &amp; GitHub Sync Status" onclick="showSyncStatusInfo()" style="display: flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: 600; cursor: pointer; background: rgba(59, 130, 246, 0.12); color: var(--accent-color); border: 1px solid rgba(59, 130, 246, 0.3);">
                    <span class="sync-dot" id="sync-dot" style="width: 8px; height: 8px; border-radius: 50%; background: var(--accent-color); display: inline-block;"></span>
                    <span id="sync-text">☁️ GitHub Sync: Ready</span>
                </div>'''

if 'id="sync-status-badge"' not in content:
    # find and replace the iPhone button line with both
    lines = content.splitlines(True)
    new_lines = []
    for line in lines:
        if header_target in line:
            new_lines.append(line.replace(line.strip(), sync_badge_html))
        else:
            new_lines.append(line)
    content = "".join(new_lines)

# 2. Add GitHub Sync management section inside System Tools
system_tools_marker = '<section class="file-operations card" id="file-operations-section">'
sync_admin_card = '''<!-- GitHub Sync Admin Section -->
                <section class="card" id="github-sync-admin-card" style="padding: 20px; margin-bottom: 20px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                        <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">☁️ GitHub Auto-Commit &amp; Multi-Device Sync</h3>
                        <span class="badge" id="admin-sync-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">Active</span>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 16px;">
                        When teachers save or submit class attendance, records are automatically merged and committed to the GitHub repository (<code>manivask/attendance-tracker</code>) so all teachers and administrators see live updates.
                    </p>

                    <div style="background: var(--bg-primary); padding: 14px; border-radius: 8px; border: 1px solid var(--border-color); margin-bottom: 16px;">
                        <label style="display: block; font-weight: 600; font-size: 0.85rem; margin-bottom: 6px;">🔑 GitHub Personal Access Token (PAT):</label>
                        <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                            <input type="password" id="github-token-input" placeholder="ghp_... or github_pat_..." style="flex: 1; min-width: 240px; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-family: monospace;">
                            <button class="btn btn-primary" onclick="saveGitHubTokenFromUI()" style="padding: 10px 16px; font-weight: 600;">💾 Save Token</button>
                            <button class="btn btn-secondary" onclick="testGitHubSyncConnection()" style="padding: 10px 14px;">🧪 Test Connection</button>
                        </div>
                        <div id="github-token-status" style="font-size: 0.82rem; color: var(--text-muted);">
                            Note: Token requires <code>contents:read</code> and <code>contents:write</code> permissions on <code>manivask/attendance-tracker</code>.
                        </div>
                    </div>

                    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                        <button class="btn btn-secondary" onclick="forceSyncFromGitHub()" style="font-size: 0.85rem;">
                            ⬇️ Pull Latest from GitHub Now
                        </button>
                        <button class="btn btn-secondary" onclick="forcePushToGitHub()" style="font-size: 0.85rem;">
                            ⬆️ Push All Local Data to GitHub Now
                        </button>
                    </div>
                </section>

                <section class="file-operations card" id="file-operations-section">'''

if 'id="github-sync-admin-card"' not in content:
    content = content.replace(system_tools_marker, sync_admin_card)

with open(index_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated index.html with Sync Badge and GitHub Sync Admin Section")
