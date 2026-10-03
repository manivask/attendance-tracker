/**
 * TBTA Attendance Tracker - Google Sheets & Google Drive Live Cloud Sync Client
 * 1. Automatic Live Sync with Google Sheets & Drive Webhook (Zero tokens required)
 * 2. Offline-first local storage fallback
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
            dispatchStatus("saved", "☁️ Successfully synced to Google Drive & Sheets!");
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
            timer = setTimeout(flush, 600);
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
