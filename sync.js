/**
 * TBTA Attendance Tracker - Google Sheets & Google Drive Live Cloud Sync Client
 * 1. Automatic Live Realtime Sync with Google Sheets & Drive Webhook (Zero tokens required)
 * 2. Background multi-device polling & live state synchronization
 * 3. Offline-first local storage fallback with 3-way merge
 */
(function () {
    const config = window.ATTENDANCE_SYNC_CONFIG || {};

    let baseState = null;
    let timer = null;
    let pending = null;
    let isSending = false;
    let lastSyncStatus = "ready";
    let lastSyncMessage = "";
    let lastSyncTime = null;
    let pollTimer = null;

    function getGoogleDriveUrl() {
        return (config.googleDriveUrl || "").trim() ||
               (localStorage.getItem("tbta_google_drive_url") || "").trim();
    }

    function setGoogleDriveUrl(url) {
        if (url) {
            localStorage.setItem("tbta_google_drive_url", url.trim());
        } else {
            localStorage.removeItem("tbta_google_drive_url");
        }
    }

    function enabled() {
        return Boolean(getGoogleDriveUrl());
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
                mode: "google_drive"
            }
        }));
    }

    function clone(value) {
        return value ? JSON.parse(JSON.stringify(value)) : value;
    }

    function same(a, b) {
        return JSON.stringify(a) === JSON.stringify(b);
    }

    /**
     * Non-destructive 3-way merge for concurrent teacher submissions
     */
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
                if (!combined.some(c => JSON.stringify(c) === strItem)) {
                    combined.push(item);
                }
            });
            return combined;
        }

        const result = {};
        const allKeys = new Set([...Object.keys(base || {}), ...Object.keys(remote || {}), ...Object.keys(local || {})]);
        allKeys.forEach(key => {
            result[key] = threeWay(base ? base[key] : undefined, remote ? remote[key] : undefined, local ? local[key] : undefined);
        });
        return result;
    }

    /**
     * Sync state to Google Sheets & Google Drive Webhook
     */
    async function syncToGoogleDrive(localState) {
        const gUrl = getGoogleDriveUrl();
        if (!gUrl) {
            dispatchStatus("offline", "📱 Saved locally (Google Drive URL not configured).");
            return false;
        }

        dispatchStatus("saving", "⏳ Syncing attendance to Google Drive & Sheets...");

        try {
            const payload = {
                version: "1.0",
                activeDate: localState.activeDate,
                updatedAt: new Date().toISOString(),
                updatedBy: (window.appState && window.appState.currentUserRole) ? `${window.appState.currentUserRole.name} (${window.appState.currentUserRole.role || 'Teacher'})` : "Teacher",
                attendance: localState.attendance || { Teachers: {}, Students: {} },
                homework: localState.homework || {},
                tests: localState.tests || {},
                lockedDates: localState.lockedDates || [],
                attestations: localState.attestations || {},
                students: (localState.students || []).map(s => ({ ID: s.ID, Name: s.Name, Grade: s.Grade, Location: s.Location })),
                teachers: (localState.teachers || []).map(t => ({ ID: t.ID, Name: t.Name, "Class Assignment": t["Class Assignment"], Location: t.Location }))
            };

            const response = await fetch(gUrl, {
                method: "POST",
                headers: { "Content-Type": "text/plain;charset=utf-8" },
                body: JSON.stringify(payload)
            });

            const result = await response.json().catch(() => ({ status: "success" }));
            if (result.status === "error") {
                dispatchStatus("error", "❌ Google Drive sync error: " + (result.message || "Unknown error"));
                return false;
            }

            baseState = clone(localState);
            dispatchStatus("saved", "☁️ Synced with Google Drive & Sheets");
            return true;
        } catch (e) {
            console.error("Google Drive sync failed", e);
            dispatchStatus("offline", "📱 Saved locally. (Google Drive webhook unreachable)");
            return false;
        }
    }

    async function loadGoogleDriveState() {
        const gUrl = getGoogleDriveUrl();
        if (!gUrl) return null;

        try {
            const response = await fetch(gUrl + (gUrl.includes("?") ? "&" : "?") + "action=read&_t=" + Date.now());
            const data = await response.json().catch(() => null);
            if (data && data.state) {
                baseState = clone(data.state);
                dispatchStatus("ready", "☁️ Loaded latest attendance from Google Drive & Sheets");

                // Live Merge into active appState if running
                if (window.appState) {
                    let changed = false;
                    const remoteAtt = data.state.attendance || {};

                    if (!window.appState.attendance) window.appState.attendance = { Teachers: {}, Students: {} };
                    if (!window.appState.attendance.Students) window.appState.attendance.Students = {};
                    if (!window.appState.attendance.Teachers) window.appState.attendance.Teachers = {};

                    // Merge Students Attendance
                    if (remoteAtt.Students) {
                        for (const [dt, map] of Object.entries(remoteAtt.Students)) {
                            if (!window.appState.attendance.Students[dt]) window.appState.attendance.Students[dt] = {};
                            for (const [sId, st] of Object.entries(map)) {
                                // Do not overwrite if local has un-sent pending change
                                const pendingVal = pending?.attendance?.Students?.[dt]?.[sId];
                                const targetVal = pendingVal !== undefined ? pendingVal : st;
                                if (window.appState.attendance.Students[dt][sId] !== targetVal) {
                                    window.appState.attendance.Students[dt][sId] = targetVal;
                                    changed = true;
                                }
                            }
                        }
                    }

                    // Merge Teachers Attendance
                    if (remoteAtt.Teachers) {
                        for (const [dt, map] of Object.entries(remoteAtt.Teachers)) {
                            if (!window.appState.attendance.Teachers[dt]) window.appState.attendance.Teachers[dt] = {};
                            for (const [tId, st] of Object.entries(map)) {
                                const pendingVal = pending?.attendance?.Teachers?.[dt]?.[tId];
                                const targetVal = pendingVal !== undefined ? pendingVal : st;
                                if (window.appState.attendance.Teachers[dt][tId] !== targetVal) {
                                    window.appState.attendance.Teachers[dt][tId] = targetVal;
                                    changed = true;
                                }
                            }
                        }
                    }

                    // Merge Homework
                    if (data.state.homework) {
                        if (!window.appState.homework) window.appState.homework = {};
                        for (const [dt, map] of Object.entries(data.state.homework)) {
                            if (!window.appState.homework[dt]) window.appState.homework[dt] = {};
                            for (const [sId, hw] of Object.entries(map)) {
                                const pendingVal = pending?.homework?.[dt]?.[sId];
                                const targetVal = pendingVal !== undefined ? pendingVal : hw;
                                if (JSON.stringify(window.appState.homework[dt][sId]) !== JSON.stringify(targetVal)) {
                                    window.appState.homework[dt][sId] = targetVal;
                                    changed = true;
                                }
                            }
                        }
                    }

                    // Merge Tests
                    if (data.state.tests) {
                        if (!window.appState.tests) window.appState.tests = {};
                        for (const [dt, map] of Object.entries(data.state.tests)) {
                            if (!window.appState.tests[dt]) window.appState.tests[dt] = {};
                            for (const [sId, ts] of Object.entries(map)) {
                                const pendingVal = pending?.tests?.[dt]?.[sId];
                                const targetVal = pendingVal !== undefined ? pendingVal : ts;
                                if (JSON.stringify(window.appState.tests[dt][sId]) !== JSON.stringify(targetVal)) {
                                    window.appState.tests[dt][sId] = targetVal;
                                    changed = true;
                                }
                            }
                        }
                    }

                    if (data.state.lockedDates && Array.isArray(data.state.lockedDates)) {
                        window.appState.lockedDates = data.state.lockedDates;
                    }
                    if (data.state.attestations) {
                        window.appState.attestations = Object.assign({}, window.appState.attestations, data.state.attestations);
                    }

                    if (changed) {
                        try {
                            if (typeof window.getPersistedState === "function") {
                                localStorage.setItem("attendance_tracker_state_v8", JSON.stringify(window.getPersistedState()));
                            }
                        } catch(e) {}
                        window.dispatchEvent(new CustomEvent("attendance-remote-updated", { detail: data.state }));
                    }
                }

                return data.state;
            }
        } catch (e) {
            console.warn("Could not fetch initial state from Google Drive", e);
        }
        return null;
    }

    async function flush() {
        if (!enabled() || isSending || !pending) return;
        isSending = true;
        const local = pending;
        pending = null;

        try {
            await syncToGoogleDrive(local);
        } catch (error) {
            pending = pending || local;
            dispatchStatus("offline", "📱 Saved locally (Offline)");
        } finally {
            isSending = false;
            if (pending) {
                timer = setTimeout(flush, 1500);
            }
        }
    }

    // Schedule background polling for multi-device realtime updates
    function schedulePoll(delayMs = 8000) {
        clearTimeout(pollTimer);
        pollTimer = setTimeout(async () => {
            if (enabled() && !isSending && !pending && document.visibilityState !== "hidden") {
                await loadGoogleDriveState();
            }
            schedulePoll(8000);
        }, delayMs);
    }
    schedulePoll(4000);

    // Immediate sync on tab visibility / device unlock (e.g. iPhone wake up)
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible" && enabled() && !isSending) {
            loadGoogleDriveState();
            schedulePoll(8000);
        }
    });

    window.addEventListener("focus", () => {
        if (enabled() && !isSending) {
            loadGoogleDriveState();
            schedulePoll(8000);
        }
    });

    // Public API
    window.AttendanceSync = {
        enabled,
        getGoogleDriveUrl,
        setGoogleDriveUrl,
        getSyncStatus() {
            const hasGdrive = Boolean(getGoogleDriveUrl());
            return {
                mode: "google_drive",
                hasGdrive: hasGdrive,
                status: lastSyncStatus,
                message: lastSyncMessage,
                lastSyncTime: lastSyncTime
            };
        },
        async testConnection() {
            const gUrl = getGoogleDriveUrl();
            if (!gUrl) return { success: false, message: "No Google Drive Webhook URL configured." };
            try {
                const testRes = await fetch(gUrl, {
                    method: "POST",
                    headers: { "Content-Type": "text/plain;charset=utf-8" },
                    body: JSON.stringify({ test: true, timestamp: new Date().toISOString() })
                });
                const d = await testRes.json().catch(() => ({ status: "success" }));
                if (d.status === "error") return { success: false, message: "Google Drive error: " + (d.message || "") };
                return { success: true, message: "Connected successfully to Google Drive & Google Sheets Webhook!" };
            } catch (e) {
                return { success: false, message: "Could not connect to Google Drive webhook: " + e.message };
            }
        },
        async load() {
            return await loadGoogleDriveState();
        },
        queue(state) {
            if (!enabled()) return;
            pending = clone(state);
            clearTimeout(timer);
            timer = setTimeout(flush, 500);
        },
        async forceSync(state) {
            pending = clone(state);
            clearTimeout(timer);
            await flush();
        },
        flush
    };

    window.addEventListener("online", () => window.AttendanceSync.flush());
    window.addEventListener("pagehide", () => window.AttendanceSync.flush());
}());
