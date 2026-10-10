-- M0 schema contract. M1 supplies the file-backed migration runner and seed.
-- UTC timestamps are integer Unix milliseconds. IDs are stable strings.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  demo_name TEXT NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id),
  cv_text TEXT NOT NULL CHECK(length(trim(cv_text)) BETWEEN 1 AND 12000),
  cv_hash TEXT NOT NULL,
  preferences_json TEXT NOT NULL CHECK(json_valid(preferences_json) AND json_type(preferences_json) = 'array'),
  updated_at INTEGER NOT NULL
) STRICT;
CREATE TABLE IF NOT EXISTS jobs (
  id TEXT PRIMARY KEY,
  job_key TEXT NOT NULL UNIQUE,
  company TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Technology','Finance','Consulting','Other')),
  description TEXT NOT NULL CHECK(length(trim(description)) BETWEEN 1 AND 20000),
  source_type TEXT NOT NULL CHECK(source_type IN ('synthetic','public')),
  source_url TEXT,
  apply_url TEXT,
  published_at INTEGER,
  last_checked_at INTEGER,
  status TEXT NOT NULL DEFAULT 'UNKNOWN' CHECK(status IN ('OPEN','CLOSED','UNKNOWN')),
  CHECK(source_type != 'public' OR source_url IS NOT NULL)
) STRICT;
CREATE TABLE IF NOT EXISTS assessments (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  input_hash TEXT NOT NULL,
  prompt_version TEXT NOT NULL,
  model_id TEXT NOT NULL,
  result_json TEXT NOT NULL CHECK(json_valid(result_json)),
  created_at INTEGER NOT NULL,
  UNIQUE(user_id, job_id, input_hash, prompt_version, model_id)
) STRICT;
CREATE TABLE IF NOT EXISTS applications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  job_id TEXT NOT NULL REFERENCES jobs(id),
  status TEXT NOT NULL DEFAULT 'SAVED' CHECK(status IN ('SAVED','APPLIED','INTERVIEW','OFFER','REJECTED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(user_id, job_id)
) STRICT;
CREATE TABLE IF NOT EXISTS topics (
  id TEXT PRIMARY KEY,
  job_id TEXT NOT NULL UNIQUE REFERENCES jobs(id)
) STRICT;
CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  topic_id TEXT NOT NULL REFERENCES topics(id),
  author_label TEXT NOT NULL,
  body TEXT NOT NULL CHECK(length(trim(body)) BETWEEN 1 AND 1000),
  is_synthetic INTEGER NOT NULL CHECK(is_synthetic IN (0,1)),
  created_at INTEGER NOT NULL
) STRICT;
CREATE INDEX IF NOT EXISTS comments_topic_order ON comments(topic_id, created_at DESC, id DESC);
CREATE TABLE IF NOT EXISTS purchases (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  expected_amount INTEGER NOT NULL DEFAULT 99 CHECK(expected_amount = 99),
  currency TEXT NOT NULL DEFAULT 'eur' CHECK(currency = 'eur'),
  stripe_session_id TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'CREATING' CHECK(status IN ('CREATING','PENDING','PAID','EXPIRED','FAILED')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE(id, user_id, topic_id),
  CHECK(status != 'PAID' OR stripe_session_id IS NOT NULL)
) STRICT;
CREATE TABLE IF NOT EXISTS entitlements (
  user_id TEXT NOT NULL REFERENCES users(id),
  topic_id TEXT NOT NULL REFERENCES topics(id),
  purchase_id TEXT NOT NULL UNIQUE,
  granted_at INTEGER NOT NULL,
  PRIMARY KEY(user_id, topic_id),
  FOREIGN KEY(purchase_id, user_id, topic_id) REFERENCES purchases(id, user_id, topic_id)
) STRICT;
