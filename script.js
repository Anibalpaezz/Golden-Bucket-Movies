// ── Credenciales ──────────────────────────────────────────────────────────────
const supabaseUrl = "https://vkfeqqvkuqwdpsonjhwa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmVxcXZrdXF3ZHBzb25qaHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDI3NzgsImV4cCI6MjA3NTA3ODc3OH0.XO837ibtD38N8xeeiF118JQglG6c5hF4kKbVGjC1R5s";
const TMDB_API_KEY = "54843f74f7e9c45d09f8b170cb4d9a11";
const OMDB_API_KEY = "f960fb84";

const { createClient } = supabase;
const db = createClient(supabaseUrl, supabaseKey);

// ── DOM ───────────────────────────────────────────────────────────────────────
const buscar = document.getElementById("movieSearch");
const boton = document.getElementById("searchButton");
const resultados = document.getElementById("movieResults");

buscar.addEventListener("keypress", function (event) {
    if (event.key === "Enter") boton.click();
});

// ── Utilidades matemáticas ────────────────────────────────────────────────────
const avg = arr => arr.reduce((s, v) => s + v, 0) / arr.length;
const percentile75 = arr => arr[Math.floor(arr.length * 0.75)];

// ── Parámetros Bayesianos dinámicos ───────────────────────────────────────────
// Lee todas las películas cacheadas y calcula m (media global) y C (p75 de votos)
// para cada fuente. Así los valores se adaptan solos a medida que crece la BD.
async function getBayesianParams() {
    const { data: rows } = await db
        .from("movies")
        .select("vote_average, vote_count, omdb_rating, omdb_votes");

    // TMDB
    const tmdbScores = rows.map(r => r.vote_average).filter(Boolean);
    const tmdbVotes = rows.map(r => r.vote_count).filter(Boolean).sort((a, b) => a - b);

    // OMDB
    const omdbScores = rows.map(r => r.omdb_rating).filter(Boolean);
    const omdbVotes = rows.map(r => r.omdb_votes).filter(Boolean).sort((a, b) => a - b);

    return {
        tmdb: {
            m: tmdbScores.length ? avg(tmdbScores) : 6.5,   // fallback razonable
            C: tmdbVotes.length ? percentile75(tmdbVotes) : 300
        },
        omdb: {
            m: omdbScores.length ? avg(omdbScores) : 6.5,
            C: omdbVotes.length ? percentile75(omdbVotes) : 100
        }
    };
}

// ── Fórmula Bayesiana multi-fuente ────────────────────────────────────────────
// sources = [{ R: nota, n: votos, m: media_global, C: umbral }, ...]
// Fuentes con datos incompletos se ignoran automáticamente.
// Para añadir una nueva fuente en el futuro, solo hay que añadir un objeto más al array.
function bayesianScore(sources) {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const { R, n, m, C } of sources) {
        if (!R || !n || !m || !C) continue;         // fuente sin datos → se salta

        const BA = (C * m + n * R) / (C + n);       // media Bayesiana de la fuente
        const w = n / (n + C);                     // peso de credibilidad (0→1)

        weightedSum += w * BA;
        totalWeight += w;
    }

    if (totalWeight === 0) return null;
    return Math.round((weightedSum / totalWeight) * 100) / 100;
}

// ── Consulta a OMDB ───────────────────────────────────────────────────────────
// Recibe el imdb_id (ej: "tt0111161") y devuelve { rating, votes } o null
async function fetchOMDB(imdbId) {
    if (!imdbId) return null;
    try {
        const res = await fetch(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
        const data = await res.json();
        if (data.Response === "False") return null;

        return {
            rating: parseFloat(data.imdbRating) || null,
            votes: parseInt(data.imdbVotes?.replace(/,/g, "")) || null
        };
    } catch {
        return null;
    }
}

// ── Render de una tarjeta ─────────────────────────────────────────────────────
function renderCard(pelicula) {
    const adultBadge = pelicula.adult ? `<span class="badge-adult">18+</span>` : "";
    const displayScore = pelicula.bayesian_score ?? pelicula.vote_average;
    const voteAvg = displayScore ? displayScore.toFixed(1) : "N/A";
    const voteCount = pelicula.vote_count ? `(${pelicula.vote_count.toLocaleString()})` : "";

    resultados.innerHTML += `
        <div class="card">
            <div class="poster-wrap">
                <img class="poster" src="${pelicula.poster}" alt="${pelicula.title}">
                ${adultBadge}
            </div>
            <div class="card-body">
                <h3>${pelicula.title}</h3>
                <p class="date">${pelicula.release_date || "Unknown date"}</p>
                <div class="rating">
                    <span class="star">★</span>
                    <span class="score">${voteAvg}</span>
                    <span class="votes">${voteCount}</span>
                </div>
            </div>
        </div>`;
}

// ── Búsqueda en TMDB + enriquecimiento con OMDB ───────────────────────────────
async function buscarPeliculas() {
    const link = `https://api.themoviedb.org/3/search/movie?query=${buscar.value}&api_key=${TMDB_API_KEY}`;
    const respuesta = await fetch(link);
    const datos = await respuesta.json();

    // Calcular m y C dinámicamente desde lo que ya hay en Supabase
    const params = await getBayesianParams();

    for (const pelicula of datos.results) {
        const poster = pelicula.poster_path
            ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
            : "/Images/poster_null.jpg";

        // 1. Obtener el imdb_id desde TMDB
        let imdbId = null;
        try {
            const extRes = await fetch(`https://api.themoviedb.org/3/movie/${pelicula.id}/external_ids?api_key=${TMDB_API_KEY}`);
            const extData = await extRes.json();
            imdbId = extData.imdb_id || null;
        } catch { /* si falla, seguimos sin imdb_id */ }
        // console.log("imdb_id obtenido:", imdbId);

        // 2. Obtener nota de OMDB usando el imdb_id
        const omdb = await fetchOMDB(imdbId);
        // console.log("respuesta OMDB:", omdb);

        // 3. Calcular nota Bayesiana combinada
        //    → Para añadir Letterboxd u otra fuente: añade { R, n, ...params.nueva } aquí
        const score = bayesianScore([
            { R: pelicula.vote_average, n: pelicula.vote_count, ...params.tmdb },
            { R: omdb?.rating, n: omdb?.votes, ...params.omdb }
        ]);

        // 4. Guardar / actualizar en Supabase
        await db.from("movies").upsert({
            tmdb_id: pelicula.id,
            popularity: pelicula.popularity,
            original_title: pelicula.original_title,
            title: pelicula.title,
            overview: pelicula.overview,
            poster: poster,
            release_date: pelicula.release_date,
            adult: pelicula.adult,
            vote_average: pelicula.vote_average,
            vote_count: pelicula.vote_count,
            imdb_id: imdbId,
            omdb_rating: omdb?.rating ?? null,
            omdb_votes: omdb?.votes ?? null,
            bayesian_score: score
        }, { onConflict: "tmdb_id" });

        // 5. Renderizar con la nota final
        renderCard({ ...pelicula, poster, bayesian_score: score });
    }
}

// ── Evento principal ──────────────────────────────────────────────────────────
boton.addEventListener("click", async function () {
    resultados.innerHTML = "";

    const { data } = await db
        .from("movies")
        .select("*")
        .ilike("title", `%${buscar.value}%`)
        .order("popularity", { ascending: false });

    if (data && data.length > 0) {
        // Separar las que ya tienen OMDB de las que no
        const completas = data.filter(p => p.omdb_rating !== null);
        const sinEnriquecer = data.filter(p => p.omdb_rating === null);

        // Las completas se renderizan directamente desde caché
        if (completas.length > 0) {
            // console.log("Cargando completas desde Supabase 🗄️");
            completas.forEach(renderCard);
        }

        // Las incompletas se enriquecen con OMDB y se actualizan
        if (sinEnriquecer.length > 0) {
            // console.log(`Enriqueciendo ${sinEnriquecer.length} películas con OMDB... 🌐`);
            const params = await getBayesianParams();

            for (const pelicula of sinEnriquecer) {
                const imdbId = pelicula.imdb_id || null;
                const omdb = await fetchOMDB(imdbId);

                // console.log("imdb_id:", imdbId, "→ OMDB:", omdb);

                const score = bayesianScore([
                    { R: pelicula.vote_average, n: pelicula.vote_count, ...params.tmdb },
                    { R: omdb?.rating, n: omdb?.votes, ...params.omdb }
                ]);

                const { id, ...peliculaSinId } = pelicula;   // ← excluimos id
                await db.from("movies").upsert({
                    ...peliculaSinId,
                    omdb_rating: omdb?.rating ?? null,
                    omdb_votes: omdb?.votes ?? null,
                    bayesian_score: score
                }, { onConflict: "tmdb_id" });

                renderCard({ ...pelicula, bayesian_score: score });
            }
        }

    } else {
        // console.log("Cargando desde TMDB 🌐");
        await buscarPeliculas();
    }
});
