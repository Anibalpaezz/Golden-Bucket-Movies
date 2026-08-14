# 🎬 MovieSearch

A movie search web app built with **Astro**, powered by the **TMDB API** and backed by a personal **Supabase** database used as a cache and future multi-source aggregator.

---

## 🚀 Features

- 🔍 Search movies by name in real time
- ⌨️ Search on button click or pressing `Enter`
- 🖼️ Display movie poster, title, and release date
- 🗄️ Cache results in a personal Supabase database
- 🔁 Fallback to local DB when TMDB is unavailable
- 🧩 Designed for future multi-source expansion (IMDb, Letterboxd, etc.)

---

## 🛠️ Tech Stack

| Layer       | Technology          |
|-------------|---------------------|
| Framework   | [Astro](https://astro.build) (static output) |
| Movie data  | [TMDB API](https://www.themoviedb.org/documentation/api) + OMDB |
| Database    | [Supabase](https://supabase.com) (PostgreSQL) |

---

## 📁 Project Structure

```
├── astro.config.mjs      # Configuración de Astro
├── package.json
├── .env                  # Variables de entorno (NO se sube a git)
├── public/
│   └── Images/           # Assets estáticos (poster fallback, favicon)
└── src/
    ├── layouts/
    │   └── Base.astro    # Layout base (head, meta, favicon)
    ├── lib/
    │   ├── supabase.ts   # Cliente Supabase + claves de API
    │   └── types.ts      # Tipos de película
    ├── pages/
    │   ├── index.astro   # Buscador
    │   └── movies.astro  # Detalle de película (movies.html)
    ├── scripts/
    │   ├── index.ts      # Lógica del buscador
    │   └── movies.ts     # Lógica del detalle
    └── styles/
        ├── index.css
        └── movies.css
```

---

## ⚙️ Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure your API keys

Copia `.env.example` a `.env` y rellena tus credenciales:

```bash
cp .env.example .env
```

```bash
PUBLIC_SUPABASE_URL=...
PUBLIC_SUPABASE_ANON_KEY=...
PUBLIC_TMDB_API_KEY=...
PUBLIC_OMDB_API_KEY=...
```

> ⚠️ Nunca subas el archivo `.env` a git (ya está en `.gitignore`). Las variables con prefijo `PUBLIC_` quedan expuestas en el cliente, igual que antes.

### 3. Ejecutar en desarrollo

```bash
npm run dev
```

Para generar el build estático y previsualizarlo:

```bash
npm run build
npm run preview
```

### 4. Set up the Supabase table

Run this SQL in your Supabase SQL editor:

```sql
CREATE TABLE movies (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tmdb_id INTEGER UNIQUE,
    title TEXT NOT NULL,
    overview TEXT,
    poster TEXT,
    release_date TEXT
);
```

### 5. Open in browser

Ya no hace falta servir `index.html` con Live Server: abre `http://localhost:4321` en tu navegador tras ejecutar `npm run dev` o `npm run preview`.

---

## 🔄 Cache / Fallback Flow

```
User searches a movie
    ↓
Check Supabase for existing results
    ├── Found → Render from local DB
    └── Not found → Fetch from TMDB API
                        ↓
                   Render results
                        ↓
                   Save to Supabase (upsert)
```

---

## 🗺️ Roadmap

- [ ] Fallback rendering from Supabase when TMDB is down
- [ ] Add vote scores and ratings per source
- [ ] Integrate additional sources (IMDb, Letterboxd)
- [ ] Cross-source data comparison view
- [ ] User favorites list
- [ ] Search history

---

## 📜 License

MIT — feel free to use, modify and expand.

---

> This project is a work in progress, built as a learning exercise in frontend development, REST APIs, and database integration.
