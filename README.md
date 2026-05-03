# 🎬 MovieSearch

A movie search web app built with vanilla JavaScript, powered by the **TMDB API** and backed by a personal **Supabase** database used as a cache and future multi-source aggregator.

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
| Frontend    | HTML, CSS, JavaScript (Vanilla) |
| Movie data  | [TMDB API](https://www.themoviedb.org/documentation/api) |
| Database    | [Supabase](https://supabase.com) (PostgreSQL) |

---

## 📁 Project Structure

```
├── index.html        # Main UI — search input, button, results container
├── script.js         # App logic — fetch, cache, render
├── styles.css        # Styles
└── Images/
    └── poster_null.jpg   # Fallback poster for movies without image
```

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-username/moviesearch.git
cd moviesearch
```

### 2. Configure your API keys

In `script.js`, replace the placeholders with your own credentials:

```javascript
const TMDB_API_KEY = "YOUR_TMDB_API_KEY";
const supabaseUrl = "YOUR_SUPABASE_URL";
const supabaseKey = "YOUR_SUPABASE_ANON_KEY";
```

> ⚠️ Never commit real API keys to a public repository. Consider using environment variables or a `.env` file.

### 3. Set up the Supabase table

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

### 4. Open in browser

Simply open `index.html` in your browser or use a local server like [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer).

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
