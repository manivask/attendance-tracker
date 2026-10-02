/**
 * TBTA Attendance Tracker - Shared State & GitHub Auto-Commit Client
 * Keeps the portal 100% usable offline while syncing seamlessly across all teacher logins and GitHub.
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

    function isGitHubMode() {
        return (config.mode === "github" || (!config.apiUrl && ghConfig.owner && ghConfig.repo));
    }

    function enabled() {
        if (isGitHubMode()) {
            return Boolean(ghConfig.owner && ghConfig.repo);
        }
        return /^https?:\/\//i.test(config.apiUrl || "");
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
                mode: isGitHubMode() ? "github" : "custom_api"
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

    /**
     * 3-Way Recursive Merge for Attendance, Homework, Tests, and Logs
     * Ensures Teacher A saving Nilai-1 NEVER overwrites Teacher B saving Nilai-2.
     */
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
     * GitHub API Requests
     */
    async function ghRequest(url, options = {}) {
        const token = getGitHubToken();
        const headers = {
            "Accept": "application/vnd.github.v3+json",
            ...(options.headers || {})
        };
        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

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

    /**
     * Load state from GitHub (Raw fallback + GitHub API)
     */
    async function loadGitHubState() {
        const { owner, repo, branch, filePath } = ghConfig;
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}?_nocache=${Date.now()}`;
        
        let loadedData = null;

        // Try raw fast fetch first
        try {
            const rawRes = await fetch(rawUrl, { cache: "no-store" });
            if (rawRes.ok) {
                loadedData = await rawRes.json();
            }
        } catch (e) {
            console.warn("Raw GitHub fetch failed, attempting API fetch...", e);
        }

        // Fetch file SHA and metadata via API
        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&_t=${Date.now()}`;
            const apiRes = await ghRequest(apiUrl);
            if (apiRes.ok && apiRes.data) {
                remoteSha = apiRes.data.sha;
                if (!loadedData && apiRes.data.content) {
                    const text = base64ToUtf8(apiRes.data.content);
                    loadedData = JSON.parse(text);
                }
            } else if (apiRes.status === 404) {
                remoteSha = null; // New file to be created
            }
        } catch (e) {
            console.warn("GitHub API file info check failed", e);
        }

        if (loadedData) {
            baseState = clone(loadedData);
            dispatchStatus("ready", "☁️ Loaded latest state from GitHub");
            return loadedData;
        }

        return null;
    }

    /**
     * Commit state directly to GitHub repository
     */
    async function commitToGitHub(localState) {
        const token = getGitHubToken();
        const { owner, repo, branch, filePath } = ghConfig;

        if (!token) {
            dispatchStatus("auth_required", "⚠️ GitHub Token required to sync online. Attendance saved to this device.");
            return false;
        }

        dispatchStatus("saving", "⏳ Syncing attendance to GitHub repository...");

        // 1. Fetch current remote state & SHA to prevent race conditions
        let currentRemote = null;
        try {
            const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&_t=${Date.now()}`;
            const res = await ghRequest(apiUrl);
            if (res.ok && res.data) {
                remoteSha = res.data.sha;
                if (res.data.content) {
                    const text = base64ToUtf8(res.data.content);
                    currentRemote = JSON.parse(text);
                }
            } else if (res.status === 404) {
                remoteSha = null;
            } else if (res.status === 401 || res.status === 403) {
                dispatchStatus("auth_required", "❌ Invalid or expired GitHub Token. Please update in System Tools.");
                return false;
            }
        } catch (e) {
            console.warn("Could not get current remote SHA, attempting direct commit...", e);
        }

        // 2. Perform non-destructive 3-way merge
        let finalState = localState;
        if (currentRemote) {
            finalState = threeWay(baseState || {}, currentRemote, localState);
            finalState.version = "1.0";
            finalState.updatedAt = new Date().toISOString();
        }

        // 3. Commit to GitHub API
        const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
        const contentStr = JSON.stringify(finalState, null, 2);
        const base64Content = utf8ToBase64(contentStr);

        const payload = {
            message: `Update attendance records [TBTA Portal] (${new Date().toLocaleDateString()}) [skip ci]`,
            content: base64Content,
            branch: branch
        };
        if (remoteSha) {
            payload.sha = remoteSha;
        }

        try {
            const putRes = await ghRequest(apiUrl, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (putRes.ok) {
                remoteSha = putRes.data?.content?.sha || remoteSha;
                baseState = clone(finalState);
                dispatchStatus("saved", "☁️ Successfully committed to GitHub repository!");
                
                // If merged state contains remote entries not in local state, notify app
                if (window.applyPersistedState && !same(finalState, localState)) {
                    window.applyPersistedState(finalState, false);
                    if (window.renderList) window.renderList();
                }
                return true;
            } else {
                const errorMsg = putRes.data?.message || `HTTP ${putRes.status}`;
                console.error("GitHub Commit Failed:", putRes);
                dispatchStatus("error", `❌ GitHub Sync Error: ${errorMsg}`);
                return false;
            }
        } catch (e) {
            console.error("Network error during GitHub commit:", e);
            dispatchStatus("offline", "📱 Network offline. Saved locally on this device.");
            return false;
        }
    }

    /**
     * Flush queued updates
     */
    async function flush() {
        if (!enabled() || isSending || !pending) return;
        isSending = true;
        const local = pending;
        pending = null;

        try {
            if (isGitHubMode()) {
                await commitToGitHub(local);
            } else {
                // Custom server.py API
                const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
                const token = config.apiToken;
                const headers = { "Content-Type": "application/json" };
                if (token) headers["Authorization"] = `Bearer ${token}`;
                
                const response = await fetch(`${baseUrl}/api/state`, {
                    method: "PUT",
                    headers,
                    body: JSON.stringify({ state: local })
                });
                if (response.ok) {
                    baseState = clone(local);
                    dispatchStatus("saved", "☁️ Synced to central server");
                } else {
                    dispatchStatus("offline", "⚠️ Server sync failed. Saved locally.");
                }
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
        isGitHubMode,
        getGitHubToken,
        setGitHubToken,
        getSyncStatus() {
            return {
                mode: isGitHubMode() ? "github" : "custom_api",
                configured: enabled(),
                hasToken: Boolean(getGitHubToken()),
                status: lastSyncStatus,
                message: lastSyncMessage,
                lastSyncTime: lastSyncTime
            };
        },
        async testConnection() {
            const token = getGitHubToken();
            if (!token) return { success: false, message: "No GitHub Token configured." };
            const { owner, repo, branch, filePath } = ghConfig;
            try {
                const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}&_t=${Date.now()}`;
                const res = await ghRequest(url);
                if (res.ok) {
                    return { success: true, message: `Connected successfully to GitHub (${owner}/${repo} @ ${branch})!` };
                } else if (res.status === 404) {
                    return { success: true, message: `Connected to repository! Data file will be created on first commit.` };
                } else {
                    return { success: false, message: `GitHub API error: ${res.data?.message || res.status}` };
                }
            } catch (e) {
                return { success: false, message: `Network error: ${e.message}` };
            }
        },
        async load() {
            if (!enabled()) return null;
            if (isGitHubMode()) {
                return await loadGitHubState();
            } else {
                const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
                const res = await fetch(`${baseUrl}/api/state`);
                const data = await res.json().catch(() => ({}));
                if (data.state) {
                    baseState = clone(data.state);
                    return data.state;
                }
                return null;
            }
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
