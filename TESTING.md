# Testing & Deployment Instructions (V4 - Master Lock Bypass)

This guide explains how to test the updated Tamil School Attendance Portal on Windows and how to transfer/use it on your Android tablet or mobile device.

---

## 🔑 Security PIN Setup for Testing
The app implements a security gate overlay. You must enter one of the following **4-digit authorization PINs** to access the dashboard or submit attendance:

| Personnel Role | Authorized 4-digit PIN | Name | School Assignment / Location |
| :--- | :--- | :--- | :--- |
| **President** | `9900` | Senthamil Arasan | Committee President (Global view) |
| **Principal (Cholai)** | `9001` | Kavin Selvam | Chennai Cholai |
| **Principal (Malar)** | `9002` | Ezhil Tamilarasan | Madurai Malar |
| **Principal (Kani)** | `9003` | Kailash Balan | Kovai Kani |
| **Principal (Neer)** | `9004` | Mugilan Pugazh | Nellai Neer |
| **VP (Cholai)** | `9101` | Amudha Kumar | Chennai Cholai |
| **VP (Malar)** | `9102` | Kamali Chitra | Madurai Malar |
| **VP (Kani)** | `9103` | Yazhini Nila | Kovai Kani |
| **VP (Neer)** | `9104` | Oviya Thenmozhi | Nellai Neer |
| **Committee Member 2** | `1001` | Bharathi Raja | Global Staff |
| **Committee Member 3** | `1002` | Elango Mani | Global Staff |
| *Others (up to Member 8)* | `1003` to `1007` | (Various Members) | Global Staff |

*Note: The committee is formed of 8 members total: 1 President + 7 Committee Members.*

---

## 💻 1. How to Test on Windows

Since this is a lightweight, frontend-only application (HTML + CSS + JavaScript + SheetJS), you can test it directly on Windows:

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
You can also simply double-click the [index.html](file:///c:/Users/maniv/all_ide_code_ws/apps/attendance-tracker/index.html) file to open it in Chrome, Edge, or Firefox.

---

## 📱 2. How to Transfer and Run on an Android Tab / Mobile

To run the app on Android:

### Option A: Transfer Files & Run via Android Web Browser (Offline-capable)
1. Copy the entire `attendance-tracker` folder from your PC to your tablet's storage (e.g., in a folder named `AttendanceApp` on your internal storage).
2. On your Android device, open a local file browser (like *CX File Explorer* or *Files by Google*).
3. Open the folder, tap on `index.html`, and select Chrome or your preferred browser to run the app.

### Option B: Local Web Server App on Android (Best Experience)
1. Download a free app such as **"Simple HTTP Server"** from the Google Play Store.
2. Select the copied `attendance-tracker` directory in the app and press **Start**.
3. It will give you a local IP address (e.g., `http://127.0.0.1:8080`). Open this address in Chrome on your tablet.

---

## 🧪 3. Validation Scenarios

Use the **Testing & Date Simulation Dashboard** at the top of the app to validate these key scenarios:

### Scenario 1: Clean Names Format
1. Log in with PIN `9900` (President).
2. Check the students list. Notice that name formatting contains only clean First and Last names without middle initials (e.g. "Aadhavan Kumar" instead of "Aadhavan A. Kumar").
3. Inspect the Committee tab to confirm the 8-member setup (1 President + 7 members).

### Scenario 2: Master Lock Correction Bypass (Principal/VP)
1. Select a simulated date (e.g. Friday, 7:30 PM).
2. Check attestations and submit attendance using a Principal PIN (e.g., `9001`). This locks the date records.
3. Log out, then log in using a regular Committee Member PIN (e.g., `1001`).
4. Select the locked date and verify that you **cannot** make edits. The buttons are disabled.
5. Log out again, then log in using a Principal PIN (e.g., `9001`) or VP PIN (e.g., `9101`).
6. Select the locked date. Verify that the attendance toggles are **enabled** and interactive.
7. Change a student's status. Open the **Audit Logs** at the bottom and verify it has logged a special lock correction entry starting with `LOCKED CORRECTION: ...`.
8. Click **Re-Submit Attendance (Correction)** to finalize.
