# Testing & Deployment Instructions (TBTA Attendance Portal)

This guide explains how to test the TBTA Attendance Portal on Windows and how to use it on your mobile devices/tablets.

---

## 🔑 Login Access Gate Credentials

The app implements a simplified role-based security gate. Select **Riverview** school location and your role:

| Personnel Role | Role Selection | Password | Access Level & Features |
| :--- | :--- | :--- | :--- |
| **Teacher** | Teacher | `teacher` | - Restricted to assigned class view with grade picker (Ilanthalir through Nilai 8)<br>- Student roster & assigned teachers display<br>- Interactive P/A attendance toggling<br>- Student details profile modal popup<br>- One-click class attendance submission |
| **Administrator** | Administrator / Admin | `admin` | - Full school-wide access across all classes<br>- Students, Teachers, and Committee tabs<br>- Developer date simulation panel & admin date picker<br>- Principal & Vice Principal attestation controls<br>- Real-time activity audit logs<br>- Excel spreadsheet export and email submission |

---

## 💻 1. How to Test on Windows

### Option A: Local Python Web Server (Recommended)
1. Open PowerShell and navigate to the directory:
   ```powershell
   cd c:\Users\maniv\all_ide_code_ws\apps\attendance-tracker
   ```
2. Start Python's built-in HTTP server:
   ```powershell
   python -m http.server 8000
   ```
3. Open your browser and go to:
   ```
   http://localhost:8000/
   ```

### Option B: Open `index.html` Directly
You can also double-click the [index.html](file:///c:/Users/maniv/all_ide_code_ws/apps/attendance-tracker/index.html) file to open it directly in Chrome, Edge, or Firefox.

---

## 📱 2. How to Transfer and Run on an Android Tablet / Mobile

### Option A: Transfer Files & Run via Android Web Browser (Offline-capable)
1. Copy the entire `attendance-tracker` folder to your tablet's internal storage (e.g., `AttendanceApp`).
2. Open a local file browser app (like *CX File Explorer* or *Files by Google*).
3. Tap on `index.html` and select Chrome or your preferred browser.

### Option B: Local Web Server App on Android (Best Experience)
1. Download **"Simple HTTP Server"** from Google Play Store.
2. Select the `attendance-tracker` directory in the app and press **Start**.
3. Open the displayed local IP address (e.g., `http://127.0.0.1:8080`) in Chrome on your tablet.

---

## 🧪 3. Complete Validation Scenarios

### Scenario 1: Teacher Experience
1. On the gate screen, select **Riverview** -> select **Teacher**.
2. Type password `teacher`.
3. Verify that the **Class / Grade** selector appears (defaulting to *Nilai 1*).
4. Verify the student list and assigned teachers load cleanly.
5. Click any **Student ID** (e.g. `S001` or `S033`) to open the **Student Profile Modal** displaying avatar, Tamil name, parent contacts, DOB, and room number.
6. Toggle attendance (click **P** or **A**), and confirm Present/Absent counters update immediately.
7. Click **✉️ Submit Class Attendance** and verify submission.
8. Click **🔒 Logout** to return to the gate screen.

### Scenario 2: Administrator Experience
1. On the gate screen, select **Riverview** -> select **Administrator / Admin**.
2. Type password `admin`.
3. Verify all three tabs are visible: **Students**, **Teachers**, and **Committee**.
4. Test search bar filtering (e.g. search by student name) and status filters (**All**, **Present**, **Absent**, **Unmarked**).
5. Check the **Official Verification & Attestation** checkboxes (Vice Principal and Principal sign-offs).
6. Toggle Theme button (☀️ / 🌙) to switch between Light and Dark mode.
7. Expand the **📋 Real-Time Activity Audit Logs** at the bottom to verify complete history of operations.
8. Click **💾 Export Excel Sheet** to verify SheetJS export functionality.

