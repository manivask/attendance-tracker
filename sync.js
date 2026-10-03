/**
 * TBTA Attendance Tracker - Shared State, Google Drive & GitHub Auto-Sync Client
 * Supports:
 * 1. Google Drive & Google Sheets Live Webhook (Zero tokens required for teachers)
 * 2. GitHub Auto-Commit Engine
 * 3. Offline-first local storage
 */
(function () {
    const config = window.ATTENDANCE_SYNC_CONFIG || {};
    const ghConfig = config.github || {
        owner: "manivask",
        repo: "attendance-tracker",
        branch: "main",
        filePath: "data/attendance-state.json"
    };

    let remoteSha = null;
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

    function getGitHubToken() {
        return (config.github && config.github.token) ||
               localStorage.getItem("tbta_github_sync_token") ||
               localStorage.getItem("attendance_github_token") ||
               "";
    }

    function setGitHubToken(token) {
        if (token) {
            localStorage.setItem("tbta_github_sync_token", token.trim());
        } else {
            localStorage.removeItem("tbta_github_sync_token");
        }
    }

    function isGoogleDriveMode() {
        return Boolean(getGoogleDriveUrl()) || config.mode === "google_drive";
    }

    function isGitHubMode() {
        return (!isGoogleDriveMode() && (config.mode === "github" || (ghConfig.owner && ghConfig.repo)));
    }

    function enabled() {
        return Boolean(getGoogleDriveUrl()) || Boolean(ghConfig.owner && ghConfig.repo) || /^https?:\/\//i.test(config.apiUrl || "");
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
                hasToken: Boolean(getGitHubToken()),
                hasGdrive: Boolean(getGoogleDriveUrl()),
                mode: isGoogleDriveMode() ? "google_drive" : (isGitHubMode() ? "github" : "custom_api")
            }
        }));
    }

    function utf8ToBase64(str) {
        return window.btoa(unescape(encodeURIComponent(str)));
    }

    function base64ToUtf8(str) {
        return decodeURIComponent(escape(window.atob(str.replace(/\s/g, ''))));
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
            const arrBase = Array.isArray(base) ? base : [];
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
     * Google Drive & Google Sheets Sync
     */
    async function syncToGoogleDrive(localState) {
        const gUrl = getGoogleDriveUrl();
        if (!gUrl) {
            dispatchStatus("auth_required", "⚠️ Google Drive or GitHub not connected yet. Saved locally.");
            return false;
        }

        dispatchStatus("saving", "⏳ Syncing attendance to Google Drive & Sheets...");

        try {
            const payload = {
                ...localState,
                updatedAt: new Date().toISOString(),
                updatedBy: (window.appState && window.appState.currentUserRole) ? window.appState.currentUserRole.name : "Teacher"
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
                dispatchStatus("ready", "☁️ Loaded latest attendance from Google Drive");
                return data.state;
            }
        } catch (e) {
            console.warn("Could not fetch initial state from Google Drive", e);
        }
        return null;
    }

    /**
     * GitHub Commit Sync
     */
    async function ghRequest(url, options = {}) {
        const token = getGitHubToken();
        const headers = {
            "Accept": "application/vnd.github.v3+json",
            ...(options.headers || {})
        };
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 12000);
        try {
            const response = await fetch(url, { ...options, headers, signal: controller.signal });
            const data = await response.json().catch(() => ({}));
            return { ok: response.ok, status: response.status, data };
        } finally {
            clearTimeout(timeout);
        }
    }

    async function loadGitHubState() {
        const { owner, repo, branch, filePath } = ghConfig;
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?_nocache=${Date.now()}`;
        let loadedData = null;

        try {
            const rawRes = await fetch(rawUrl, { cache: "no-store" });
            if (rawRes.ok) loadedData = await rawRes.json();
        } catch (e) {
            console.warn("Raw GitHub fetch failed", e);
        }

        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&_t=${Date.now()}`;
            const apiRes = await ghRequest(apiUrl);
            if (apiRes.ok && apiRes.data) {
                remoteSha = apiRes.data.sha;
                if (!loadedData && apiRes.data.content) {
                    loadedData = JSON.parse(base64ToUtf8(apiRes.data.content));
                }
            } else if (apiRes.status === 404) {
                remoteSha = null;
            }
        } catch (e) {}

        if (loadedData) {
            baseState = clone(loadedData);
            dispatchStatus("ready", "☁️ Loaded latest state from GitHub");
            return loadedData;
        }
        return null;
    }

    async function commitToGitHub(localState) {
        const token = getGitHubToken();
        const { owner, repo, branch, filePath } = ghConfig;

        if (!token) {
            dispatchStatus("auth_required", "⚠️ Token needed for GitHub sync. Attendance saved locally.");
            return false;
        }

        dispatchStatus("saving", "⏳ Syncing attendance to GitHub...");

        let currentRemote = null;
        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&_t=${Date.now()}`;
            const res = await ghRequest(apiUrl);
            if (res.ok && res.data) {
                remoteSha = res.data.sha;
                if (res.data.content) currentRemote = JSON.parse(base64ToUtf8(res.data.content));
            } else if (res.status === 404) {
                remoteSha = null;
            }
        } catch (e) {}

        let finalState = localState;
        if (currentRemote) {
            finalState = threeWay(baseState || {}, currentRemote, localState);
            finalState.version = "1.0";
            finalState.updatedAt = new Date().toISOString();
        }

        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
        const base64Content = utf8ToBase64(JSON.stringify(finalState, null, 2));

        const payload = {
            message: `Update attendance records [TBTA Portal] (${new Date().toLocaleDateString()}) [skip ci]`,
            content: base64Content,
            branch: branch
        };
        if (remoteSha) payload.sha = remoteSha;

        try {
            const putRes = await ghRequest(apiUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (putRes.ok) {
                remoteSha = putRes.data?.content?.sha || remoteSha;
                baseState = clone(finalState);
                dispatchStatus("saved", "☁️ Successfully committed to GitHub!");
                if (window.applyPersistedState && !same(finalState, localState)) {
                    window.applyPersistedState(finalState, false);
                    if (window.renderList) window.renderList();
                }
                return true;
            } else {
                dispatchStatus("error", `❌ GitHub Sync Error: ${putRes.data?.message || putRes.status}`);
                return false;
            }
        } catch (e) {
            dispatchStatus("offline", "📱 Network offline. Saved locally.");
            return false;
        }
    }

    async function flush() {
        if (!enabled() || isSending || !pending) return;
        isSending = true;
        const local = pending;
        pending = null;

        try {
            if (getGoogleDriveUrl()) {
                await syncToGoogleDrive(local);
            } else if (isGitHubMode()) {
                await commitToGitHub(local);
            }
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
        isGoogleDriveMode,
        isGitHubMode,
        getGoogleDriveUrl,
        setGoogleDriveUrl,
        getGitHubToken,
        setGitHubToken,
        getSyncStatus() {
            const hasGdrive = Boolean(getGoogleDriveUrl());
            const hasToken = Boolean(getGitHubToken());
            return {
                mode: hasGdrive ? "google_drive" : (isGitHubMode() ? "github" : "offline"),
                hasGdrive: hasGdrive,
                hasToken: hasToken,
                status: lastSyncStatus,
                message: lastSyncMessage,
                lastSyncTime: lastSyncTime
            };
        },
        async testConnection() {
            const gUrl = getGoogleDriveUrl();
            if (gUrl) {
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
            }

            const token = getGitHubToken();
            if (!token) return { success: false, message: "No Google Drive Webhook URL or GitHub Token configured." };
            const { owner, repo, branch, filePath } = ghConfig;
            try {
                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&_t=${Date.now()}`;
                const res = await ghRequest(url);
                if (res.ok || res.status === 404) {
                    return { success: true, message: `Connected successfully to GitHub (${owner}/${repo} @ ${branch})!` };
                } else {
                    return { success: false, message: `GitHub API error: ${res.data?.message || res.status}` };
                }
            } catch (e) {
                return { success: false, message: `Network error: ${e.message}` };
            }
        },
        async load() {
            if (getGoogleDriveUrl()) {
                const gd = await loadGoogleDriveState();
                if (gd) return gd;
            }
            if (isGitHubMode()) {
                return await loadGitHubState();
            }
            return null;
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
