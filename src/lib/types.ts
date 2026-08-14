export interface Movie {
  id?: number;
  tmdb_id: number;
  popularity: number | null;
  original_title: string | null;
  title: string;
  overview: string | null;
  poster: string | null;
  release_date: string | null;
  adult: boolean | null;
  vote_average: number | null;
  vote_count: number | null;
  imdb_id: string | null;
  omdb_rating: number | null;
  omdb_votes: number | null;
  bayesian_score: number | null;
}