-- One-time migration for existing HQconnect review D1 databases.
-- Add 'Other' while retaining every existing request and all other constraints.
-- D1's SQL batch is atomic; stop if any statement fails.
CREATE TABLE hqconnect_requests_migrated (
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
INSERT INTO hqconnect_requests_migrated (id,created_at,request_type,name,email,project,message,timeline,budget,consent_at,status)
 SELECT id,created_at,request_type,name,email,project,message,timeline,budget,consent_at,status FROM hqconnect_requests;
DROP TABLE hqconnect_requests;
ALTER TABLE hqconnect_requests_migrated RENAME TO hqconnect_requests;
CREATE INDEX IF NOT EXISTS hqconnect_requests_recent ON hqconnect_requests(created_at DESC);
