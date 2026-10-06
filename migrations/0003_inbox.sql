-- Messages from the Contact page and places suggested by visitors. Private: never shown on the site.
CREATE TABLE messages (
  id INTEGER PRIMARY KEY,
  name TEXT,
  email TEXT,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'done')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE place_suggestions (
  id INTEGER PRIMARY KEY,
  metro TEXT NOT NULL CHECK (metro IN ('bay-area', 'san-diego')),
  name TEXT NOT NULL,
  area TEXT,
  why TEXT NOT NULL,
  link TEXT,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'researching', 'added', 'declined')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Per-person daily caps for both forms (keyed hash of the IP, never the address itself).
CREATE TABLE form_log (
  voter TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX form_log_voter ON form_log (voter, kind, created_at);
