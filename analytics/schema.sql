-- Portable SQLite / Cloudflare D1 schema. Identical in staging and production.
-- No IP address, user-agent, identity, file name, tool input, or output columns.
CREATE TABLE IF NOT EXISTS visitor_sessions (
 session_hash TEXT PRIMARY KEY,
 first_seen TEXT NOT NULL,
 last_seen TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_session_last ON visitor_sessions(last_seen);
CREATE TABLE IF NOT EXISTS daily_pageviews (
 day TEXT NOT NULL,
 route TEXT NOT NULL,
 views INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,route)
);
CREATE TABLE IF NOT EXISTS daily_completions (
 day TEXT NOT NULL,
 url TEXT NOT NULL,
 completions INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(day,url)
);
CREATE TABLE IF NOT EXISTS event_dedupe (
 digest TEXT PRIMARY KEY,
 day TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_event_day ON event_dedupe(day);
CREATE TABLE IF NOT EXISTS cleanup_log (
 name TEXT PRIMARY KEY,
 day TEXT NOT NULL
);
