CREATE TABLE IF NOT EXISTS regulatory_snapshots (
 sequence INTEGER PRIMARY KEY CHECK(sequence > 0),
 digest TEXT NOT NULL UNIQUE CHECK(length(digest)=64),
 envelope TEXT NOT NULL CHECK(length(envelope)<=300000),
 published_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS regulatory_head (
 id INTEGER PRIMARY KEY CHECK(id=1),
 sequence INTEGER NOT NULL DEFAULT 0 CHECK(sequence>=0),
 digest TEXT,
 envelope TEXT,
 state TEXT NOT NULL CHECK(state IN ('empty','active','blocked'))
);
INSERT OR IGNORE INTO regulatory_head(id,sequence,state) VALUES(1,0,'empty');
CREATE TABLE IF NOT EXISTS regulatory_events (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 sequence INTEGER NOT NULL,
 digest TEXT,
 state TEXT NOT NULL,
 observed_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE TRIGGER IF NOT EXISTS regulatory_head_monotonic BEFORE UPDATE ON regulatory_head
WHEN NEW.sequence<=OLD.sequence
BEGIN SELECT RAISE(ABORT,'non-monotonic sequence'); END;
CREATE TRIGGER IF NOT EXISTS regulatory_head_archive AFTER UPDATE ON regulatory_head
BEGIN
 INSERT INTO regulatory_events(sequence,digest,state) VALUES(NEW.sequence,NEW.digest,NEW.state);
 INSERT INTO regulatory_snapshots(sequence,digest,envelope,published_at)
 SELECT NEW.sequence,NEW.digest,NEW.envelope,strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE NEW.state='active';
END;
