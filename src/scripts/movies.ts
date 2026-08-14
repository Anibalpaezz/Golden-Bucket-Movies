import { db } from "../lib/supabase";
import type { Movie } from "../lib/types";

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const searchParams = new URLSearchParams(window.location.search);
const tmdbId = searchParams.get("tmdb_id");

function renderPelicula(p: Movie): string {
  const score = p.bayesian_score ?? p.vote_average;
  const scoreStr = score ? score.toFixed(1) : "N/A";
  const year = p.release_date ? p.release_date.slice(0, 4) : "—";
  const imdbLink = p.imdb_id
    ? `<a class="detail-link" href="https://www.imdb.com/title/${p.imdb_id}" target="_blank" rel="noopener noreferrer">IMDb ↗</a>`
    : "";
  const adultBadge = p.adult ? `<span class="badge-adult">18+</span>` : "";
  const popularity = p.popularity ? Math.round(p.popularity).toLocaleString() : "—";

  return `
    <div class="detail-hero">
        <div class="detail-poster-wrap">
            <img class="detail-poster" src="${p.poster}" alt="${escapeHtml(p.title)}" width="260" height="390">
            ${adultBadge}
        </div>
        <div class="detail-info">
            <h1 class="detail-title">${escapeHtml(p.title)} <span class="detail-year">(${year})</span></h1>
            ${p.original_title !== p.title
              ? `<p class="detail-original">${escapeHtml(p.original_title ?? "")}</p>`
              : ""}

            <div class="detail-scores">
                <div class="score-block score-main">
                    <span class="score-label">Golden Score</span>
                    <span class="score-value">★ ${scoreStr}</span>
                </div>
                <div class="score-block">
                    <span class="score-label">TMDB</span>
                    <span class="score-value">${p.vote_average?.toFixed(1) ?? "—"}</span>
                    <span class="score-votes">${p.vote_count?.toLocaleString() ?? ""} votos</span>
                </div>
                ${p.omdb_rating
                  ? `
                <div class="score-block">
                    <span class="score-label">IMDb</span>
                    <span class="score-value">${p.omdb_rating.toFixed(1)}</span>
                    <span class="score-votes">${p.omdb_votes?.toLocaleString() ?? ""} votos</span>
                </div>` : ""}
            </div>

            <div class="detail-meta">
                <div class="meta-row"><span class="meta-key">Estreno</span><span class="meta-val">${p.release_date || "—"}</span></div>
                <div class="meta-row"><span class="meta-key">Popularidad</span><span class="meta-val">${popularity} pts</span></div>
                ${imdbLink ? `<div class="meta-row"><span class="meta-key">Enlace</span><span class="meta-val">${imdbLink}</span></div>` : ""}
            </div>
        </div>
    </div>

    ${p.overview
      ? `
    <div class="detail-overview">
        <h2 class="section-title">Sinopsis</h2>
        <p>${escapeHtml(p.overview)}</p>
    </div>` : ""}
    `;
}

document.addEventListener("DOMContentLoaded", async () => {
  const container = document.getElementById("resultados") as HTMLDivElement;

  if (!tmdbId) {
    container.innerHTML = "<p class='msg-error'>No se ha proporcionado un ID de película.</p>";
    return;
  }

  container.innerHTML = "<p class='msg-loading'>Cargando detalles...</p>";

  const { data: pelicula, error } = await db
    .from("movies")
    .select("*")
    .eq("tmdb_id", tmdbId)
    .single();

  if (error || !pelicula) {
    container.innerHTML = "<p class='msg-error'>Película no encontrada.</p>";
    return;
  }

  document.title = `${pelicula.title} · Golden Bucket Movies`;
  container.innerHTML = renderPelicula(pelicula as Movie);
});