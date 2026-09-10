# Testing & Deployment Instructions (TBTA Attendance Portal)

This guide explains how to test the TBTA Attendance Portal on Windows, how to use it on your mobile devices/tablets, how Attendance and Homework evaluation sheets are maintained in GitHub, and how to build and install the Android APK package.

---

## 🔑 Login Access Gate Credentials

The app implements a role-based security gate. Select **Riverview** school location and your role:

| Personnel Role | Role Selection | Password | Access Level & Features |
| :--- | :--- | :--- | :--- |
| **Teacher** | Teacher | `teacher` | - Restricted to selected class view (Ilanthalir through Nilai 8)<br>- Grade column omitted in teacher table to maximize Name, ID & action button spacing<br>- Both **Attendance (P/A)** and **Homework (4 Categories)** evaluation modes<br>- Student details profile modal popup<br>- One-click class attendance submission |
| **Administrator** | Administrator / Admin | `admin` | - Full school-wide access across all classes<br>- Students, Teachers, Committee, Admin Roster, Dashboard & System Tools tabs<br>- Developer date simulation panel & admin date picker<br>- Principal & Vice Principal attestation controls<br>- Real-time activity audit logs<br>- Excel spreadsheet export and Google Drive sharing |

---

## 📱 1. Android App Package (APK)

The Android app package is built with Capacitor and Gradle:
- **Location in repo**: `apk/TBTA-Attendance-Tracker.apk` and `apk/app-debug.apk`
- **Package name**: `com.tbta.attendance`
- **File size**: ~4.52 MB

### How to Install on Android Device / Tablet:
1. Transfer `apk/TBTA-Attendance-Tracker.apk` to your Android device (via USB cable, Google Drive, email, or WhatsApp).
2. Open the file on your device and tap **Install** (enable "Install unknown apps" if prompted).
3. Open **TBTA Attendance** from your app drawer!

### How to Rebuild APK:
```powershell
npm run build:apk
```

---

## 📊 2. Attendance + Homework Excel Sheets in GitHub

All class Attendance and Homework evaluation sheets are maintained directly in GitHub for offline viewing, archiving, and editing:

| File Name | Purpose & Contents |
| :--- | :--- |
| **`TBTA-2026-2027- RHS-Student_Attendance.xlsx`** | Complete school year attendance and homework workbook with all 10 classes (`illanthalir` to `Nilai-8`), `HW_illanthalir` to `HW_Nilai-8`, `Homework_Summary`, `Teacher`, `Committee`, and `Summary_Dashboard`. |
| **`TBTA-2026-2027-RHS-Attendance-And-Homework-Template.xlsx`** | Master template containing formatted columns for ID, Names, DOB, Class, Friday dates, and Homework evaluation matrices. |
| **`attendance_template.xlsx`** | Blank downloadable template for administrators. |
| **`generate_template.py`** | Automated Python script to regenerate/refresh all 10 class sheets with custom dates and roster mappings. |

### To regenerate sheets at any time:
```powershell
npm run generate:sheets
```

---

## 💻 3. How to Test on Windows Browser

### Option A: Local Python Web Server (Recommended)
1. Open PowerShell and navigate to the directory:
   ```powershell
   cd c:\Users\maniv\all_ide_code_ws\apps\attendance-tracker
   ```
2. Start Python's built-in HTTP server:
   ```powershell
   python -m http.server 8000
   ```
3. Open your browser and go to: `http://localhost:8000/`

### Option B: Open `index.html` Directly
Double-click [index.html](file:///c:/Users/maniv/all_ide_code_ws/apps/attendance-tracker/index.html) to open in Chrome, Edge, or Firefox.

---

## 🧪 4. Validation Scenarios

### Scenario 1: Teacher Experience
1. On the gate screen, select **Riverview** -> select **Teacher**.
2. Type password `teacher`.
3. Verify that the **Class / Grade** selector appears (defaulting to *Nilai 1*).
4. **Verify Grade Column Optimization**: Observe that the redundant Grade column is removed from the table, giving maximum clear width to Student ID, Student Name, and Attendance/Homework buttons.
5. Switch **Activity** dropdown between **📝 Attendance (P / A)** and **📚 Homework (4 Categories)**:
   - In Attendance mode: verify quick P / A buttons and counters.
   - In Homework mode: verify Ontime, Perfection, Handwriting, and Effort toggles with batch mark buttons.
6. Click any **Student ID** (e.g. `S001`) to open the **Student Profile Modal**.
7. Click **✉️ Submit Class Attendance** and verify submission.

### Scenario 2: Administrator Experience
1. On the gate screen, select **Riverview** -> select **Administrator / Admin**.
2. Type password `admin`.
3. Verify tabs: **Students**, **Teachers**, **Committee**, **Admin Roster**, **Dashboard**, **System Tools**.
4. Observe that for Administrator, the **Grade / Class Assignment** column remains visible when viewing the whole school roster.
5. Verify **Admin Roster** inline editing and saving.
6. Check the **Official Verification & Attestation** checkboxes (VP and Principal sign-offs).
7. Click **💾 Export Excel Sheet** to verify complete export with all Attendance and Homework sheets.
