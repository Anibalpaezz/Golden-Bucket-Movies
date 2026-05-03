const supabaseUrl = "https://vkfeqqvkuqwdpsonjhwa.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZrZmVxcXZrdXF3ZHBzb25qaHdhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk1MDI3NzgsImV4cCI6MjA3NTA3ODc3OH0.XO837ibtD38N8xeeiF118JQglG6c5hF4kKbVGjC1R5s";

const { createClient } = supabase;
const db = createClient(supabaseUrl, supabaseKey);

let buscar = document.getElementById("movieSearch");
let boton = document.getElementById("searchButton");
let resultados = document.getElementById("movieResults");

buscar.addEventListener("keypress", function (event) {
    if (event.key === "Enter") {
        boton.click();
    }
});

boton.addEventListener("click", async function () {
    resultados.innerHTML = "";

    const { data, error } = await db
        .from("movies")
        .select("*")
        .ilike("title", `%${buscar.value}%`)
        .order("popularity", { ascending: false });

    async function buscarPeliculas() {
        const link = `https://api.themoviedb.org/3/search/movie?query=${buscar.value}&api_key=54843f74f7e9c45d09f8b170cb4d9a11`;
        const respuesta = await fetch(link);
        const datos = await respuesta.json();

        for (let i = 0; i < datos.results.length; i++) {
            const pelicula = datos.results[i];
            const titulo = pelicula.title;
            const poster = pelicula.poster_path
                ? `https://image.tmdb.org/t/p/w500${pelicula.poster_path}`
                : "/Images/poster_null.jpg";
            const fecha = pelicula.release_date;

            await db.from("movies").upsert({
                tmdb_id: pelicula.id,
                popularity: pelicula.popularity,
                original_title: pelicula.original_title,
                title: titulo,
                overview: pelicula.overview,
                poster: poster,
                release_date: fecha,
                adult: pelicula.adult,
                vote_average: pelicula.vote_average,
                vote_count: pelicula.vote_count,
            }, { onConflict: "tmdb_id" });

            const adultBadge = pelicula.adult ? `<span class="badge-adult">18+</span>` : "";
            const voteAvg = pelicula.vote_average ? pelicula.vote_average.toFixed(1) : "N/A";
            const voteCount = pelicula.vote_count ? `(${pelicula.vote_count.toLocaleString()})` : "";

            resultados.innerHTML += `<div class="card">
                                        <div class="poster-wrap">
                                            <img class="poster" src="${poster}" alt="${titulo}">
                                            ${adultBadge}
                                        </div>
                                        <div class="card-body">
                                            <h3>${titulo}</h3>
                                            <p class="date">${fecha || "Unknown date"}</p>
                                            <div class="rating">
                                                <span class="star">★</span>
                                                <span class="score">${voteAvg}</span>
                                                <span class="votes">${voteCount}</span>
                                            </div>
                                        </div>
                                    </div>`;
        }
    }

    if (data && data.length > 0) {
        console.log("Cargando desde Supabase 🗄️");
        data.forEach(pelicula => {
            const adultBadge = pelicula.adult ? `<span class="badge-adult">18+</span>` : "";
            const voteAvg = pelicula.vote_average ? pelicula.vote_average.toFixed(1) : "N/A";
            const voteCount = pelicula.vote_count ? `(${pelicula.vote_count.toLocaleString()})` : "";

            resultados.innerHTML += `<div class="card">
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
        });
    } else {
        console.log("Cargando desde TMDB 🌐");
        buscarPeliculas();
    }
});
