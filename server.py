"""Small shared persistence API for Attendance Tracker.

Run:  ATTENDANCE_API_TOKEN=change-me python server.py 8080
Deploy this service to any HTTPS Python host, then set sync-config.js apiUrl.
"""
import hashlib
import json
import os
import sqlite3
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

DB_PATH = os.environ.get("ATTENDANCE_DB", "attendance-sync.sqlite3")
TOKEN = os.environ.get("ATTENDANCE_API_TOKEN", "")

def database():
    conn = sqlite3.connect(DB_PATH)
    conn.execute("CREATE TABLE IF NOT EXISTS app_state (id INTEGER PRIMARY KEY CHECK(id=1), revision TEXT NOT NULL, payload TEXT NOT NULL)")
    return conn

def current_state(conn):
    row = conn.execute("SELECT revision, payload FROM app_state WHERE id=1").fetchone()
    return (row[0], json.loads(row[1])) if row else (None, None)

class API(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        print("%s - %s" % (self.address_string(), fmt % args))
    def send_json(self, status, data):
        body = json.dumps(data, separators=(",", ":")).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", os.environ.get("ATTENDANCE_ALLOWED_ORIGIN", "*"))
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")
        self.end_headers(); self.wfile.write(body)
    def authorized(self):
        return not TOKEN or self.headers.get("Authorization", "") == "Bearer " + TOKEN
    def do_OPTIONS(self): self.send_json(204, {})
    def do_GET(self):
        if self.path != "/api/state": return self.send_json(404, {"error":"Not found"})
        if not self.authorized(): return self.send_json(401, {"error":"Unauthorized"})
        with database() as conn:
            revision, state = current_state(conn)
        self.send_json(200, {"revision": revision, "state": state})
    def do_PUT(self):
        if self.path != "/api/state": return self.send_json(404, {"error":"Not found"})
        if not self.authorized(): return self.send_json(401, {"error":"Unauthorized"})
        try:
            size = int(self.headers.get("Content-Length", "0"))
            if size <= 0 or size > 10_000_000: raise ValueError("invalid request size")
            data = json.loads(self.rfile.read(size))
            state = data["state"]
            if not isinstance(state, dict): raise ValueError("state must be an object")
        except (ValueError, KeyError, json.JSONDecodeError) as exc:
            return self.send_json(400, {"error": str(exc)})
        with database() as conn:
            revision, saved = current_state(conn)
            if revision != data.get("revision"):
                return self.send_json(409, {"error":"State changed; retrying merge", "revision":revision, "state":saved})
            payload = json.dumps(state, separators=(",", ":"), ensure_ascii=False)
            next_revision = hashlib.sha256((payload + os.urandom(16).hex()).encode()).hexdigest()[:20]
            conn.execute("INSERT OR REPLACE INTO app_state (id, revision, payload) VALUES (1, ?, ?)", (next_revision, payload))
        self.send_json(200, {"revision": next_revision})

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else int(os.environ.get("PORT", "8080"))
    print(f"Attendance sync API listening on http://0.0.0.0:{port}")
    ThreadingHTTPServer(("0.0.0.0", port), API).serve_forever()
