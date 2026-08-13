CREATE TABLE IF NOT EXISTS join_requests (
  id TEXT PRIMARY KEY,
  ign TEXT NOT NULL,
  class TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
