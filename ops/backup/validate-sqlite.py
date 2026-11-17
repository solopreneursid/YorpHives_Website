#!/usr/bin/env python3
"""Validate a LOCAL SQLite restore. Never opens Cloudflare or modifies D1."""
import os
import sqlite3
import sys
EXPECTED = ("daily_completions","daily_pageviews","visitor_sessions","event_dedupe","cleanup_log")
if len(sys.argv) != 2: raise SystemExit("Usage: validate-sqlite.py /private/restore.sqlite")
path = sys.argv[1]
if not os.path.isfile(path): raise SystemExit("Restore file not found")
db = sqlite3.connect(f"file:{path}?mode=ro", uri=True)
try:
    result = db.execute("PRAGMA integrity_check").fetchone()
    if not result or result[0] != "ok": raise RuntimeError("SQLite integrity check did not pass")
    tables = {row[0] for row in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
    missing = sorted(set(EXPECTED)-tables)
    if missing: raise RuntimeError("Missing required tables: "+", ".join(missing))
    for name in EXPECTED:
        rows = db.execute(f"SELECT COUNT(*) FROM {name}").fetchone()[0]
        if not isinstance(rows,int) or rows<0: raise RuntimeError(f"Invalid {name} row count")
    print("PASS: SQLite restore integrity, five expected table schemas and queries")
finally:
    db.close()
