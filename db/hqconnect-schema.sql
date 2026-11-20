-- SQLite-compatible HQconnect intake schema. Founder-only access; no public reads.
CREATE TABLE IF NOT EXISTS hqconnect_requests (
 id TEXT PRIMARY KEY,
 created_at TEXT NOT NULL,
 request_type TEXT NOT NULL CHECK (request_type IN ('Build a product','Long-term partnership','Other')),
 name TEXT NOT NULL,
 email TEXT NOT NULL,
 project TEXT NOT NULL DEFAULT '',
 message TEXT NOT NULL,
 timeline TEXT NOT NULL DEFAULT '',
 budget TEXT NOT NULL DEFAULT '',
 consent_at TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','responded','closed'))
);
CREATE INDEX IF NOT EXISTS hqconnect_requests_recent ON hqconnect_requests(created_at DESC);
-- Data minimization: review and purge old submissions under the owner's retention policy.
-- Example manual purge (do not automate before confirming legal/operational needs):
-- DELETE FROM hqconnect_requests WHERE created_at < datetime('now', '-180 days');
