-- Synthetic-only disposable SQLite fixture; no visitor data, keys or Cloudflare access.
CREATE TABLE daily_pageviews(day TEXT NOT NULL,route TEXT NOT NULL,views INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,route));
CREATE TABLE daily_completions(day TEXT NOT NULL,url TEXT NOT NULL,completions INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(day,url));
CREATE TABLE visitor_sessions(session_hash TEXT PRIMARY KEY,first_seen TEXT NOT NULL,last_seen TEXT NOT NULL);
CREATE TABLE event_dedupe(digest TEXT PRIMARY KEY,day TEXT NOT NULL);
CREATE TABLE cleanup_log(name TEXT PRIMARY KEY,day TEXT NOT NULL);
INSERT INTO daily_pageviews(day,route,views) VALUES('2026-11-17','/',7);
INSERT INTO daily_completions(day,url,completions) VALUES('2026-11-17','tools/word-counter/',2);
