import os
import re

index_path = os.path.join(os.path.dirname(__file__), "..", "index.html")

with open(index_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Clean up System Tools section: replace old GitHub sync admin card with Master Excel Generator & Google Sheets Sync Card
old_system_tools_marker = r'<!-- GitHub Sync Admin Section -->.*?<section class="file-operations card"'

new_system_tools = """<!-- Google Sheets & Master Excel Management Section -->
                <section class="card" id="admin-excel-generator-card" style="padding: 20px; margin-bottom: 20px; background: var(--card-bg); border-left: 4px solid var(--accent-color);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                        <h3 style="margin: 0; display: flex; align-items: center; gap: 8px;">📊 Master Excel Spreadsheet &amp; Attendance Reports</h3>
                        <span class="badge" id="admin-sync-badge" style="background: rgba(16, 185, 129, 0.15); color: var(--success-color); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem; font-weight: 600;">Google Sheets Connected</span>
                    </div>
                    <p style="color: var(--text-secondary); font-size: 0.88rem; margin-bottom: 16px;">
                        Generate the complete school attendance spreadsheet with all recorded student and teacher attendance, homework evaluations, and test marks populated across all dates, then download or email the report.
                    </p>

                    <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 16px;">
                        <button class="btn btn-primary" onclick="generateMasterExcelWithAttendanceAndEmail()" style="padding: 12px 18px; font-weight: 700; font-size: 0.95rem; background: var(--accent-color); border-color: var(--accent-color); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);">
                            📊 Generate Master Excel &amp; Send Email Report
                        </button>
                        <button class="btn btn-secondary" onclick="exportExcel()" style="padding: 12px 18px; font-weight: 600; font-size: 0.9rem;">
                            💾 Download Master Excel (.xlsx)
                        </button>
                        <button class="btn btn-secondary" onclick="openGitHubSyncModal()" style="padding: 12px 16px; font-size: 0.88rem;">
                            ☁️ Google Sheets Sync Settings
                        </button>
                    </div>

                    <div style="font-size: 0.82rem; color: var(--text-muted); background: var(--bg-primary); padding: 10px 14px; border-radius: 8px; border: 1px solid var(--border-color);">
                        💡 <strong>Note:</strong> All attendance data submitted by teachers is saved in real time to Google Sheets &amp; Google Drive. Clicking "Generate Master Excel" bundles all class sheets into an offline Excel file.
                    </div>
                </section>

                <section class="file-operations card\""""

content = re.sub(old_system_tools_marker, new_system_tools, content, flags=re.DOTALL)

# 2. Update the header badge text
content = content.replace("☁️ Cloud Sync: Ready", "📊 Google Sheets: Live")

# 3. Clean up the Cloud Sync Modal to be strictly Google Sheets & Drive
clean_modal = """    <!-- Cloud & Google Sheets Sync Modal -->
    <div id="github-sync-modal-overlay" class="student-modal-overlay" style="display:none;" onclick="closeGitHubSyncModal(event)">
        <div class="student-modal-card" style="max-width: 540px; text-align: left;" onclick="event.stopPropagation()">
            <button class="modal-close-btn" onclick="closeGitHubSyncModal(event)">✕</button>
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
                <span style="font-size: 2.2rem;">📊</span>
                <div>
                    <h2 style="margin: 0; font-size: 1.3rem;">Google Sheets &amp; Drive Sync</h2>
                    <p style="margin: 0; color: var(--text-secondary); font-size: 0.85rem;">Central school attendance spreadsheet webhook</p>
                </div>
            </div>

            <div style="background: rgba(16, 185, 129, 0.08); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px; margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong style="color: var(--success-color); font-size: 0.95rem;">Google Sheets Live Webhook</strong>
                    <span style="font-size: 0.75rem; background: var(--success-color); color: #fff; padding: 2px 8px; border-radius: 10px; font-weight: 700;">Active</span>
                </div>
                <p style="font-size: 0.82rem; color: var(--text-secondary); margin: 0 0 10px 0; line-height: 1.4;">
                    All class attendance submissions from teachers on their phones are automatically synchronized to this Google Sheets endpoint in real time.
                </p>
                <div style="display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap;">
                    <input type="text" id="modal-gdrive-url-input" placeholder="https://script.google.com/macros/s/.../exec" style="flex: 1; min-width: 220px; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--bg-secondary); color: var(--text-primary); font-size: 0.85rem;">
                    <button class="btn btn-primary" onclick="saveGoogleDriveUrlFromModal()" style="background: var(--success-color); border-color: var(--success-color); padding: 10px 14px; font-weight: 600;">💾 Save</button>
                    <button class="btn btn-secondary" onclick="testGoogleDriveConnectionModal()" style="padding: 10px 12px;">🧪 Test</button>
                </div>
                <div id="modal-gdrive-status" style="font-size: 0.8rem; color: var(--text-muted);">
                    Status: Connected to Google Sheets
                </div>
            </div>

            <div style="display: flex; gap: 10px; margin-bottom: 16px; flex-wrap: wrap;">
                <button class="btn btn-secondary" onclick="forceSyncFromCloud()" style="flex: 1; padding: 10px; font-size: 0.88rem; justify-content: center;">
                    ⬇️ Pull Latest Attendance Now
                </button>
                <button class="btn btn-secondary" onclick="forcePushToCloud()" style="flex: 1; padding: 10px; font-size: 0.88rem; justify-content: center;">
                    ⬆️ Push Local Data to Sheets
                </button>
            </div>

            <div style="text-align: right; border-top: 1px solid var(--border-color); padding-top: 12px;">
                <button class="btn btn-secondary" onclick="closeGitHubSyncModal(event)">Close</button>
            </div>
        </div>
    </div>"""

content = re.sub(r'<div id="github-sync-modal-overlay".*?</div>\s*</div>\s*</div>', clean_modal, content, flags=re.DOTALL)

# 4. Cache-bust scripts to v14
content = re.sub(r'sync-config\.js(\?v=\d+)?', 'sync-config.js?v=14', content)
content = re.sub(r'sync\.js(\?v=\d+)?', 'sync.js?v=14', content)
content = re.sub(r'app\.js(\?v=\d+)?', 'app.js?v=14', content)

with open(index_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Successfully updated index.html with Master Excel Generator card and clean Google Sheets modal")
