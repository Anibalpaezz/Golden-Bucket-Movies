DROP TABLE IF EXISTS movies;

CREATE TABLE movies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    popularity FLOAT,
    original_title TEXT NOT NULL,
    title TEXT NOT NULL,
    overview TEXT,
    poster TEXT,
    release_date TEXT,
    adult BOOLEAN,
    vote_average FLOAT,
    vote_count INT
);

ALTER TABLE movies
  ADD COLUMN IF NOT EXISTS imdb_id        TEXT,
  ADD COLUMN IF NOT EXISTS omdb_rating    NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS omdb_votes     INTEGER,
  ADD COLUMN IF NOT EXISTS bayesian_score NUMERIC(4,2);
