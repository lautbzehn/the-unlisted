-- People who asked for the newsletter and site updates. Private: never shown on the site, never sold.
-- Everything here is what the person chose to tell us; area and interests are optional.
CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  area TEXT,            -- one key from src/data/signup-options.json
  interests TEXT,       -- comma-separated keys from the same file
  source TEXT,          -- where they signed up: gate, footer, passport, explore
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  unsubscribed_at TEXT
);
