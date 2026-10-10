-- Existing records get an honest baseline at upgrade time, not invented history.
CREATE TABLE application_status_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status TEXT CHECK(from_status IN ('SAVED','APPLIED','INTERVIEW','OFFER','REJECTED')),
  to_status TEXT NOT NULL CHECK(to_status IN ('SAVED','APPLIED','INTERVIEW','OFFER','REJECTED')),
  kind TEXT NOT NULL CHECK(kind IN ('CREATED','BASELINE','CHANGED')),
  created_at INTEGER NOT NULL,
  CHECK((kind = 'CHANGED' AND from_status IS NOT NULL AND from_status != to_status)
    OR (kind IN ('CREATED','BASELINE') AND from_status IS NULL))
) STRICT;
CREATE INDEX application_status_events_order ON application_status_events(application_id, id DESC);
INSERT INTO application_status_events(application_id, from_status, to_status, kind, created_at)
SELECT id, NULL, status, 'BASELINE', CAST(unixepoch('subsec') * 1000 AS INTEGER) FROM applications;
