import { db, TMDB_API_KEY, OMDB_API_KEY } from "../lib/supabase";
import type { Movie } from "../lib/types";

// ── DOM ───────────────────────────────────────────────────────────────────────
const buscar = document.getElementById("movieSearch") as HTMLInputElement;
const boton = document.getElementById("searchButton") as HTMLButtonElement;
const resultados = document.getElementById("movieResults") as HTMLDivElement;

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

buscar.addEventListener("keypress", function (event) {
  if (event.key === "Enter") boton.click();
});

// ── Utilidades matemáticas ────────────────────────────────────────────────────
const avg = (arr: number[]) => arr.reduce((s, v) => s + v, 0) / arr.length;
const percentile75 = (arr: number[]) => arr[Math.floor(arr.length * 0.75)];

// ── Parámetros Bayesianos dinámicos ───────────────────────────────────────────
type BayesianParams = {
  tmdb: { m: number; C: number };
  omdb: { m: number; C: number };
};

async function getBayesianParams(): Promise<BayesianParams> {
  const { data: rows } = await db
    .from("movies")
    .select("vote_average, vote_count, omdb_rating, omdb_votes");

  const list = (rows ?? []) as Partial<Movie>[];

  const tmdbScores = list.map((r) => r.vote_average).filter((v): v is number => typeof v === "number");
  const tmdbVotes = list
    .map((r) => r.vote_count)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);

  const omdbScores = list.map((r) => r.omdb_rating).filter((v): v is number => typeof v === "number");
  const omdbVotes = list
    .map((r) => r.omdb_votes)
    .filter((v): v is number => typeof v === "number")
    .sort((a, b) => a - b);

  return {
    tmdb: {
      m: tmdbScores.length ? avg(tmdbScores) : 6.5,
      C: tmdbVotes.length ? percentile75(tmdbVotes) : 300,
    },
    omdb: {
      m: omdbScores.length ? avg(omdbScores) : 6.5,
      C: omdbVotes.length ? percentile75(omdbVotes) : 100,
    },
  };
}

// ── Fórmula Bayesiana multi-fuente ────────────────────────────────────────────
type Source = { R?: number | null; n?: number | null; m?: number; C?: number };

function bayesianScore(sources: Source[]): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const { R, n, m, C } of sources) {
    if (!R || !n || !m || !C) continue;

    const BA = (C * m + n * R) / (C + n);
    const w = n / (n + C);

    weightedSum += w * BA;
    totalWeight += w;
  }

  if (totalWeight === 0) return null;
  return Math.round((weightedSum / totalWeight) * 100) / 100;
}

// ── Consulta a OMDB ───────────────────────────────────────────────────────────
async function fetchOMDB(imdbId: string | null): Promise<{ rating: number | null; votes: number | null } | null> {
  if (!imdbId) return null;
  try {
    const res = await fetch(`https://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
    const data = await res.json();
    if (data.Response === "False") return null;

    return {
      rating: parseFloat(data.imdbRating) || null,
      votes: parseInt(data.imdbVotes?.replace(/,/g, "")) || null,
    };
  } catch {
    return null;
  }
}

// ── Render de una tarjeta ─────────────────────────────────────────────────────
function renderCard(pelicula: Movie): void {
  const adultBadge = pelicula.adult ? `<span class="badge-adult">18+</span>` : "";
  const displayScore = pelicula.bayesian_score ?? pelicula.vote_average;
  const voteAvg = displayScore ? displayScore.toFixed(1) : "N/A";
  const voteCount = pelicula.vote_count ? `(${pelicula.vote_count.toLocaleString()})` : "";

  resultados.insertAdjacentHTML(
    "beforeend",
    `<a href="/movies.html?tmdb_id=${pelicula.tmdb_id}">
      <div class="card">
        <div class="poster-wrap">
          <img class="poster" src="${pelicula.poster}" alt="${escapeHtml(pelicula.title)}" loading="lazy" width="300" height="450">
          ${adultBadge}
        </div>
        <div class="card-body">
          <h3>${escapeHtml(pelicula.title)}</h3>
          <p class="date">${pelicula.release_date || "Unknown date"}</p>
          <div class="rating">
            <span class="star">★</span>
            <span class="score">${voteAvg}</span>
            <span class="votes">${voteCount}</span>
          </div>
        </div>
      </div>
    </a>`
  );
}

// ── Búsqueda en TMDB + enriquecimiento con OMDB ───────────────────────────────
async function buscarPeliculas(query: string): Promise<void> {
  const link = `https://api.themoviedb.org/3/search/movie?query=${encodeURIComponent(query)}&api_key=${TMDB_API_KEY}`;
  const respuesta = await fetch(link);
  const datos = await respuesta.json();

  const params = await getBayesianParams();

  for (const pelicula of datos.results as Record<string, any>[]) {
    const poster = pelicula.poster_path
      ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
      : "/Images/poster_null.jpg";

    let imdbId: string | null = null;
    try {
      const extRes = await fetch(`https://api.themoviedb.org/3/movie/${pelicula.id}/external_ids?api_key=${TMDB_API_KEY}`);
      const extData = await extRes.json();
      imdbId = extData.imdb_id || null;
    } catch {
      /* si falla, seguimos sin imdb_id */
    }

    const omdb = await fetchOMDB(imdbId);

    const score = bayesianScore([
      { R: pelicula.vote_average, n: pelicula.vote_count, ...params.tmdb },
      { R: omdb?.rating, n: omdb?.votes, ...params.omdb },
    ]);

    await db
      .from("movies")
      .upsert(
        {
          tmdb_id: pelicula.id,
          popularity: pelicula.popularity,
          original_title: pelicula.original_title,
          title: pelicula.title,
          overview: pelicula.overview,
          poster,
          release_date: pelicula.release_date,
          adult: pelicula.adult,
          vote_average: pelicula.vote_average,
          vote_count: pelicula.vote_count,
          imdb_id: imdbId,
          omdb_rating: omdb?.rating ?? null,
          omdb_votes: omdb?.votes ?? null,
          bayesian_score: score,
        },
        { onConflict: "tmdb_id" }
      );

    renderCard({ ...pelicula, poster, bayesian_score: score, tmdb_id: pelicula.id } as unknown as Movie);
  }
}

// ── Evento principal ──────────────────────────────────────────────────────────
boton.addEventListener("click", async () => {
  const query = buscar.value.trim();
  resultados.innerHTML = "";
  if (!query) return;

  const { data } = await db
    .from("movies")
    .select("*")
    .ilike("title", `%${query}%`)
    .order("popularity", { ascending: false });

  const rows = (data ?? []) as Movie[];

  if (rows.length > 0) {
    const completas = rows.filter((p) => p.omdb_rating !== null);
    const sinEnriquecer = rows.filter((p) => p.omdb_rating === null);

    if (completas.length > 0) {
      completas.forEach(renderCard);
    }

    if (sinEnriquecer.length > 0) {
      const params = await getBayesianParams();

      for (const pelicula of sinEnriquecer) {
        const imdbId = pelicula.imdb_id || null;
        const omdb = await fetchOMDB(imdbId);

        const score = bayesianScore([
          { R: pelicula.vote_average, n: pelicula.vote_count, ...params.tmdb },
          { R: omdb?.rating, n: omdb?.votes, ...params.omdb },
        ]);

        await db
          .from("movies")
          .upsert(
            {
              ...pelicula,
              omdb_rating: omdb?.rating ?? null,
              omdb_votes: omdb?.votes ?? null,
              bayesian_score: score,
            },
            { onConflict: "tmdb_id" }
          );

        renderCard({ ...pelicula, bayesian_score: score });
      }
    }
  } else {
    await buscarPeliculas(query);
  }
});