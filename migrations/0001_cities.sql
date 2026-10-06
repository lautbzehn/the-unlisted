-- City board: suggestions, review status and votes.
CREATE TABLE cities (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  region TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'coming')),
  votes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- One vote per city per person. `voter` is a keyed hash of the visitor's IP address, never the address itself.
CREATE TABLE votes (
  city_id INTEGER NOT NULL REFERENCES cities(id),
  voter TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (city_id, voter)
);

-- Used only to cap suggestions per person per day.
CREATE TABLE suggestion_log (
  voter TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX suggestion_log_voter ON suggestion_log (voter, created_at);

-- Next on the card (already chosen) and a starter board so it isn't empty on day one.
INSERT INTO cities (slug, name, region, status) VALUES
  ('san-diego-ca', 'San Diego', 'CA', 'coming'),
  ('austin-tx', 'Austin', 'TX', 'coming'),
  ('new-york-ny', 'New York', 'NY', 'coming'),
  ('los-angeles-ca', 'Los Angeles', 'CA', 'approved'),
  ('chicago-il', 'Chicago', 'IL', 'approved'),
  ('new-orleans-la', 'New Orleans', 'LA', 'approved'),
  ('portland-or', 'Portland', 'OR', 'approved'),
  ('seattle-wa', 'Seattle', 'WA', 'approved'),
  ('philadelphia-pa', 'Philadelphia', 'PA', 'approved'),
  ('houston-tx', 'Houston', 'TX', 'approved'),
  ('mexico-city', 'Mexico City', 'Mexico', 'approved');
