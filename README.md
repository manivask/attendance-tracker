# Attendance Tracker - Android & Web App

A high-performance, responsive Attendance and Homework Tracking application built for schools and educational institutions. Features seamless Excel spreadsheet import/export, student attendance management, visual analytics, and offline persistence.

## Shared Web and Android Data

The old GitHub Pages version saved only in each device's `localStorage`, so teachers could not see one another's records. This version retains that offline copy and adds a shared service.

1. Deploy `server.py` to an HTTPS-capable Python host with persistent disk.
2. Set `ATTENDANCE_API_TOKEN` and, optionally, `ATTENDANCE_ALLOWED_ORIGIN=https://manivask.github.io` on that host.
3. Set `apiUrl` and the matching `apiToken` in `sync-config.js`, then publish the GitHub Pages files.

Writes are queued to reduce UI lag, unsent edits remain on the device, and simultaneous saves retry after merging. Android uses the same web files after `npm run sync`, so it shares the data after rebuilding.

## Teacher portal

After GitHub Pages is enabled for this repository, teachers use:
`https://manivask.github.io/attendance-tracker/`

Teacher accounts are restricted to the selected class and can use Attendance, Homework, and the weekly **Test** activity. Test marks accept whole numbers from 0 through 100 and are stored separately for each selected week. The portal source is publicly hosted, so do not treat the built-in role gate as secure authentication; configure the shared API above for cross-device records and production access control.

---

## 🚀 Quick Start & Launchers

### 1-Click Windows Launcher
Double-click `start_app.bat` to launch the application locally.

### Command Line Scripts
- **Install Dependencies**: `npm install`
- **Sync Web Assets to Android**: `npm run sync`
- **Build Android APK**: `npm run build:apk` (Saves APK to `apk/` directory)
- **Build Android App Bundle (AAB)**: `npm run build:aab` (Saves AAB for Google Play Store to `aab/` directory)
- **Build Both APK and AAB**: `npm run build:all`

---

## 📦 Google Play Store Release Package (AAB)

To upload this application to the **Google Play Store**, you need the Android App Bundle (`.aab`) file.

### Bundle Location
- `aab/TBTA-Attendance-Tracker.aab`
- `aab/app-release.aab`
- `android/app/build/outputs/bundle/release/app-release.aab`

### Play Store Specifications
- **Package ID / Application ID**: `com.tbta.attendancetracker`
- **Version Code**: `1`
- **Version Name**: `1.0`
- **Target SDK Version**: `36` (Complies with Google Play policy requirements)
- **Min SDK Version**: `24` (Android 7.0+)

---

## 🛠️ Architecture & Project Structure

```
attendance-tracker/
├── index.html                 # Single Page Application UI
├── style.css                  # Modern UI styles & Glassmorphism theme
├── app.js                     # Core application state & logic
├── chart.js                   # Attendance analytics chart component
├── capacitor.config.json      # Capacitor Android runtime config
├── package.json               # Node.js dependencies & build scripts
├── aab/                       # Android App Bundle output directory (.aab)
│   ├── TBTA-Attendance-Tracker.aab
│   └── app-release.aab
├── apk/                       # Android Package output directory (.apk)
│   ├── TBTA-Attendance-Tracker.apk
│   └── app-debug.apk
├── android/                   # Native Android Gradle Project
│   ├── app/
│   │   ├── build.gradle       # App module configuration & versioning
│   │   └── src/main/          # Manifest & Android Native Code
│   └── build.gradle           # Root Gradle build script
└── .github/workflows/         # GitHub Actions CI/CD workflows
    └── build-apk.yml          # Automated APK and AAB build pipeline
```

---

## ✅ Verification & Validation Checklist

- [x] **Web Assets Synced**: `npm run sync` updates Capacitor assets.
- [x] **AAB Build Success**: `./gradlew bundleRelease` completes with 0 errors.
- [x] **SDK Targets**: Target SDK set to API 36 (Android 16).
- [x] **GitHub CI/CD**: Automated GitHub Action compiles both APK and AAB artifacts on push.
