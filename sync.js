/* Shared-state client. Keeps the app usable offline and serializes writes. */
(function () {
    const config = window.ATTENDANCE_SYNC_CONFIG || {};
    const baseUrl = String(config.apiUrl || "").replace(/\/$/, "");
    let revision = null;
    let baseState = null;
    let timer = null;
    let pending = null;
    let sending = false;

    function enabled() { return /^https?:\/\//i.test(baseUrl); }
    function headers() {
        const result = { "Content-Type": "application/json" };
        if (config.apiToken) result.Authorization = `Bearer ${config.apiToken}`;
        return result;
    }
    async function request(path, options) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        try {
            const response = await fetch(baseUrl + path, { ...options, headers: headers(), signal: controller.signal });
            const body = await response.json().catch(() => ({}));
            if (!response.ok) {
                const error = new Error(body.error || `Sync request failed (${response.status})`);
                error.status = response.status;
                error.body = body;
                throw error;
            }
            return body;
        } finally { clearTimeout(timeout); }
    }
    function clone(value) { return JSON.parse(JSON.stringify(value)); }
    function same(a, b) { return JSON.stringify(a) === JSON.stringify(b); }
    function threeWay(base, remote, local) {
        if (same(local, base)) return clone(remote);
        if (same(remote, base)) return clone(local);
        if (!base || !remote || !local || typeof base !== "object" || typeof remote !== "object" || typeof local !== "object" || Array.isArray(base) || Array.isArray(remote) || Array.isArray(local)) return clone(local);
        const result = {};
        new Set([...Object.keys(base), ...Object.keys(remote), ...Object.keys(local)]).forEach(key => {
            result[key] = threeWay(base[key], remote[key], local[key]);
        });
        return result;
    }
    async function flush() {
        if (!enabled() || sending || !pending) return;
        sending = true;
        const local = pending;
        pending = null;
        try {
            const result = await request("/api/state", { method: "PUT", body: JSON.stringify({ revision, state: local }) });
            revision = result.revision;
            baseState = clone(local);
            window.dispatchEvent(new CustomEvent("attendance-sync-status", { detail: "saved" }));
        } catch (error) {
            if (error.status === 409 && error.body && error.body.state) {
                revision = error.body.revision;
                pending = threeWay(baseState || {}, error.body.state, local);
                baseState = clone(error.body.state);
            } else {
                pending = pending || local;
                window.dispatchEvent(new CustomEvent("attendance-sync-status", { detail: "offline" }));
            }
        } finally {
            sending = false;
            if (pending) { timer = setTimeout(flush, 750); }
        }
    }
    window.AttendanceSync = {
        enabled,
        async load() {
            if (!enabled()) return null;
            const result = await request("/api/state", { method: "GET" });
            revision = result.revision;
            baseState = result.state ? clone(result.state) : {};
            return result.state || null;
        },
        queue(state) {
            if (!enabled()) return;
            pending = clone(state);
            clearTimeout(timer);
            timer = setTimeout(flush, 350);
        },
        flush
    };
    window.addEventListener("online", () => window.AttendanceSync.flush());
    window.addEventListener("pagehide", () => window.AttendanceSync.flush());
}());
