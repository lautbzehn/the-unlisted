-- Suggestions now come from a fixed list of US cities (src/data/city-options.json).
-- Mexico City was a starter-board pick outside that list, so it comes off the board.
UPDATE cities SET status = 'rejected' WHERE slug = 'mexico-city';
