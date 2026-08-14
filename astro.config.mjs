import { defineConfig } from "astro/config";

// https://astro.build/config
export default defineConfig({
  build: {
    // Genera movies.html / index.html como archivos reales (no carpetas),
    // preservando las rutas originales de la web.
    format: "file",
  },
});