/**
 * TBTA Attendance Tracker - Google Sheets & Google Drive Live Cloud Sync Client
 * Version: 2.0 (High Concurrency Safe, Deep Multi-Device Merge, Auto-Recovery)
 * 1. Automatic Live Realtime Sync with Google Sheets & Drive Webhook (Zero tokens required)
 * 2. Background multi-device polling & live state synchronization
 * 3. Offline-first local storage fallback with non-destructive 3-way merge
 */
(function () {
    const config = window.ATTENDANCE_SYNC_CONFIG || {};

    let baseState = null;
    let timer = null;
    let pending = null;
    let isSending = false;
    let sendingStartTime = 0;
    let lastSyncStatus = "ready";
    let lastSyncMessage = "";
    let lastSyncTime = null;
    let pollTimer = null;

    function legacySyncDisabled() {
        return String(config.mode || "").toLowerCase() === "disabled";
    }

    function getGoogleDriveUrl() {
        // Migration/preview builds explicitly disable the legacy backend. Do not
        // fall back to a production URL that may remain in this browser's storage.
        if (legacySyncDisabled()) return "";
        return (config.googleDriveUrl || "").trim() ||
               (localStorage.getItem("tbta_google_drive_url") || "").trim();
    }

    function setGoogleDriveUrl(url) {
        if (legacySyncDisabled()) {
            localStorage.removeItem("tbta_google_drive_url");
            return;
        }
        if (url) {
            localStorage.setItem("tbta_google_drive_url", url.trim());
        } else {
            localStorage.removeItem("tbta_google_drive_url");
        }
    }

    function enabled() {
        return !legacySyncDisabled() && Boolean(getGoogleDriveUrl());
    }

    function dispatchStatus(status, message) {
        lastSyncStatus = status;
        lastSyncMessage = message;
        if (status === "saved") lastSyncTime = new Date();
        window.dispatchEvent(new CustomEvent("attendance-sync-status", {
            detail: {
                status: status,
                message: message,
                time: lastSyncTime,
                hasGdrive: Boolean(getGoogleDriveUrl()),
                mode: legacySyncDisabled() ? "disabled" : "google_drive"
            }
        }));
    }

    function clone(value) {
        return value ? JSON.parse(JSON.stringify(value)) : value;
    }

    function same(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    function threeWay(base, remote, local) {
        if (same(local, base)) return clone(remote);
        if (same(remote, base)) return clone(local);
        if (!base || !remote || !local || typeof base !== "object" || typeof remote !== "object" || typeof local !== "object") {
            return clone(local !== undefined ? local : remote);
        }
        if (Array.isArray(local) || Array.isArray(remote) || Array.isArray(base)) {
            const arrRemote = Array.isArray(remote) ? remote : [];
            const arrLocal = Array.isArray(local) ? local : [];
            const combined = [...arrLocal];
            arrRemote.forEach(item => {
                const strItem = JSON.stringify(item);
                if (!combined.some(c => JSON.stringify(c) === strItem)) combined.push(item);
            });
            return combined;
        }
        const result = {};
        const allKeys = new Set([...Object.keys(base || {}), ...Object.keys(remote || {}), ...Object.keys(local || {})]);
        allKeys.forEach(key => { result[key] = threeWay(base ? base[key] : undefined, remote ? remote[key] : undefined, local ? local[key] : undefined); });
        return result;
    }

    function applyRemoteStateToApp(remoteState) {
        if (!remoteState || !window.appState) return false;
        let changed = false;
        if (remoteState.attendance?.Students) {
            if (!window.appState.attendance) window.appState.attendance = { Teachers: {}, Students: {} };
            if (!window.appState.attendance.Students) window.appState.attendance.Students = {};
            for (const [dt, map] of Object.entries(remoteState.attendance.Students)) {
                if (!window.appState.attendance.Students[dt]) window.appState.attendance.Students[dt] = {};
                for (const [sId, st] of Object.entries(map)) {
                    const pendingVal = pending?.attendance?.Students?.[dt]?.[sId];
                    const targetVal = pendingVal !== undefined ? pendingVal : st;
                    if (window.appState.attendance.Students[dt][sId] !== targetVal) { window.appState.attendance.Students[dt][sId] = targetVal; changed = true; }
                }
            }
        }
        if (remoteState.attendance?.Teachers) {
            if (!window.appState.attendance) window.appState.attendance = { Teachers: {}, Students: {} };
            if (!window.appState.attendance.Teachers) window.appState.attendance.Teachers = {};
            for (const [dt, map] of Object.entries(remoteState.attendance.Teachers)) {
                if (!window.appState.attendance.Teachers[dt]) window.appState.attendance.Teachers[dt] = {};
                for (const [tId, st] of Object.entries(map)) {
                    const pendingVal = pending?.attendance?.Teachers?.[dt]?.[tId];
                    const targetVal = pendingVal !== undefined ? pendingVal : st;
                    if (window.appState.attendance.Teachers[dt][tId] !== targetVal) { window.appState.attendance.Teachers[dt][tId] = targetVal; changed = true; }
                }
            }
        }
        if (remoteState.homework) {
            if (!window.appState.homework) window.appState.homework = {};
            for (const [dt, map] of Object.entries(remoteState.homework)) {
                if (!window.appState.homework[dt]) window.appState.homework[dt] = {};
                for (const [sId, hw] of Object.entries(map)) {
                    const pendingVal = pending?.homework?.[dt]?.[sId];
                    const targetVal = pendingVal !== undefined ? pendingVal : hw;
                    if (JSON.stringify(window.appState.homework[dt][sId]) !== JSON.stringify(targetVal)) { window.appState.homework[dt][sId] = targetVal; changed = true; }
                }
            }
        }
        if (remoteState.tests) {
            if (!window.appState.tests) window.appState.tests = {};
            for (const [dt, map] of Object.entries(remoteState.tests)) {
                if (!window.appState.tests[dt]) window.appState.tests[dt] = {};
                for (const [sId, ts] of Object.entries(map)) {
                    const pendingVal = pending?.tests?.[dt]?.[sId];
                    const targetVal = pendingVal !== undefined ? pendingVal : ts;
                    if (JSON.stringify(window.appState.tests[dt][sId]) !== JSON.stringify(targetVal)) { window.appState.tests[dt][sId] = targetVal; changed = true; }
                }
            }
        }
        if (remoteState.submittedClasses) {
            if (!window.appState.submittedClasses) window.appState.submittedClasses = {};
            for (const [dt, map] of Object.entries(remoteState.submittedClasses)) {
                if (!window.appState.submittedClasses[dt]) window.appState.submittedClasses[dt] = {};
                for (const [cls, val] of Object.entries(map)) if (window.appState.submittedClasses[dt][cls] !== val) { window.appState.submittedClasses[dt][cls] = val; changed = true; }
            }
        }
        if (remoteState.teacherCutoffTime && window.appState.teacherCutoffTime !== remoteState.teacherCutoffTime) { window.appState.teacherCutoffTime = remoteState.teacherCutoffTime; changed = true; }
        if (remoteState.lockedDates && Array.isArray(remoteState.lockedDates)) {
            const currentLocked = window.appState.lockedDates || [];
            const mergedLocked = Array.from(new Set([...currentLocked, ...remoteState.lockedDates]));
            if (mergedLocked.length !== currentLocked.length) { window.appState.lockedDates = mergedLocked; changed = true; }
        }
        if (remoteState.attestations) window.appState.attestations = Object.assign({}, window.appState.attestations, remoteState.attestations);
        if (remoteState.teachers && Array.isArray(remoteState.teachers) && window.appState.teachers) {
            remoteState.teachers.forEach(remT => {
                const localT = window.appState.teachers.find(t => t.ID === remT.ID);
                if (localT) {
                    if (remT.Room && localT.Room !== remT.Room) { localT.Room = remT.Room; changed = true; }
                    if (remT["Class Assignment"] && localT["Class Assignment"] !== remT["Class Assignment"]) { localT["Class Assignment"] = remT["Class Assignment"]; changed = true; }
                }
            });
            if (typeof window.syncClassRoomsFromTeachers === "function") window.syncClassRoomsFromTeachers();
        }
        if (remoteState.classRooms && window.CLASS_ROOMS) {
            for (const [cls, rm] of Object.entries(remoteState.classRooms)) if (rm && window.CLASS_ROOMS[cls] !== rm) { window.CLASS_ROOMS[cls] = rm; changed = true; }
        }
        if (changed) {
            try { if (typeof window.getPersistedState === "function") localStorage.setItem("attendance_tracker_state_v8", JSON.stringify(window.getPersistedState())); } catch (e) {}
            window.dispatchEvent(new CustomEvent("attendance-remote-updated", { detail: remoteState }));
        }
        return changed;
    }

    async function syncToGoogleDrive(localState) {
        const gUrl = getGoogleDriveUrl();
        if (!gUrl) { dispatchStatus("offline", legacySyncDisabled() ? "Migration preview: legacy cloud sync disabled." : "📱 Saved locally (Google Drive URL not configured)."); return false; }
        dispatchStatus("saving", "⏳ Syncing attendance to Google Sheets...");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);
        try {
            const remote = baseState || {};
            const mergedAttendance = { Teachers: {}, Students: {} };
            if (remote.attendance) {
                if (remote.attendance.Students) for (const [dt, map] of Object.entries(remote.attendance.Students)) mergedAttendance.Students[dt] = Object.assign({}, map);
                if (remote.attendance.Teachers) for (const [dt, map] of Object.entries(remote.attendance.Teachers)) mergedAttendance.Teachers[dt] = Object.assign({}, map);
            }
            if (localState.attendance) {
                if (localState.attendance.Students) for (const [dt, map] of Object.entries(localState.attendance.Students)) { if (!mergedAttendance.Students[dt]) mergedAttendance.Students[dt] = {}; Object.assign(mergedAttendance.Students[dt], map); }
                if (localState.attendance.Teachers) for (const [dt, map] of Object.entries(localState.attendance.Teachers)) { if (!mergedAttendance.Teachers[dt]) mergedAttendance.Teachers[dt] = {}; Object.assign(mergedAttendance.Teachers[dt], map); }
            }
            const payload = {
                version: "2.0", activeDate: localState.activeDate, updatedAt: new Date().toISOString(),
                updatedBy: (window.appState && window.appState.currentUserRole) ? `${window.appState.currentUserRole.name} (${window.appState.currentUserRole.role || 'Teacher'})` : "Teacher",
                attendance: mergedAttendance, homework: localState.homework || {}, tests: localState.tests || {}, submittedClasses: localState.submittedClasses || {},
                teacherCutoffTime: localState.teacherCutoffTime || (window.appState && window.appState.teacherCutoffTime) || "20:30", lockedDates: localState.lockedDates || [], attestations: localState.attestations || {}, classRooms: window.CLASS_ROOMS || {},
                students: (localState.students || []).map(s => ({ ID: s.ID, Name: s.Name, Grade: s.Grade, Location: s.Location })),
                teachers: (localState.teachers || []).map(t => ({ ID: t.ID, Name: t.Name, Location: t.Location, "Class Assignment": t["Class Assignment"] || t.Grade, Section: t.Section || "A", Room: t.Room || (window.CLASS_ROOMS && window.CLASS_ROOMS[t["Class Assignment"]]) || "", Email: t.Email || "", Phone: t.Phone || "" }))
            };
            const response = await fetch(gUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(payload), signal: controller.signal });
            clearTimeout(timeoutId);
            const result = await response.json().catch(() => ({ status: "success" }));
            if (result.status === "error") { dispatchStatus("error", "❌ Google Sheets sync: " + (result.message || "Unknown error")); return false; }
            if (result.state) { baseState = clone(result.state); applyRemoteStateToApp(result.state); } else baseState = clone(localState);
            dispatchStatus("saved", "☁️ Synced with Google Sheets"); return true;
        } catch (e) {
            clearTimeout(timeoutId); console.error("Google Drive sync failed", e);
            dispatchStatus(e.name === "AbortError" ? "error" : "offline", e.name === "AbortError" ? "⏳ Google Sheets sync timed out. Retrying in background..." : "📱 Saved locally. (Google Sheets webhook unreachable)"); return false;
        }
    }

    async function loadGoogleDriveState() {
        const gUrl = getGoogleDriveUrl(); if (!gUrl) return null;
        const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), 15000);
        try {
            const response = await fetch(gUrl + (gUrl.includes("?") ? "&" : "?") + "action=read&_t=" + Date.now(), { signal: controller.signal });
            clearTimeout(timeoutId);
            const data = await response.json().catch(() => null);
            if (data && data.state) { baseState = clone(data.state); dispatchStatus("ready", "☁️ Loaded latest attendance from Google Sheets"); applyRemoteStateToApp(data.state); return data.state; }
        } catch (e) { clearTimeout(timeoutId); console.warn("Could not fetch initial state from Google Drive", e); }
        return null;
    }

    async function flush() {
        if (!enabled() || !pending) return false;
        if (isSending) { if (Date.now() - sendingStartTime > 30000) isSending = false; else return false; }
        isSending = true; sendingStartTime = Date.now(); const local = pending; pending = null;
        try { return await syncToGoogleDrive(local); } finally { isSending = false; if (pending) setTimeout(flush, 300); }
    }

    function scheduleSync(state) {
        if (!enabled()) { if (legacySyncDisabled()) dispatchStatus("offline", "Migration preview: legacy cloud sync disabled."); return; }
        pending = clone(state); clearTimeout(timer); timer = setTimeout(flush, 800);
    }

    function startPolling(intervalMs) {
        if (!enabled()) return;
        stopPolling();
        pollTimer = setInterval(async () => { if (!isSending && !pending) await loadGoogleDriveState(); }, intervalMs || 15000);
    }

    function stopPolling() { if (pollTimer) { clearInterval(pollTimer); pollTimer = null; } }

    if (legacySyncDisabled()) localStorage.removeItem("tbta_google_drive_url");

    window.AttendanceSync = {
        enabled, getGoogleDriveUrl, setGoogleDriveUrl, scheduleSync, flush, loadGoogleDriveState, startPolling, stopPolling,
        applyRemoteStateToApp,
        getStatus: () => ({ status: lastSyncStatus, message: lastSyncMessage, time: lastSyncTime, enabled: enabled() })
    };
})();
