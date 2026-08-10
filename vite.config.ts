import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Config mínima del shell POS (React + TypeScript). Tauri se incorporará
// más adelante como adaptador adicional; por ahora esto sirve para ver y
// tipear la ventana en el navegador (`npm run ui:dev`).
export default defineConfig({
  plugins: [react()],
  // dist/ ya lo usa el build del backend (tsc --outDir ./dist/); se separa
  // para que ninguno de los dos build se pise con el otro.
  build: {
    outDir: "dist-ui",
  },
  // El proyecto vive dentro de una carpeta sincronizada por Dropbox, que
  // bloquea intermitentemente los archivos temporales que Vite usa para
  // optimizar dependencias (EBUSY al renombrar node_modules/.vite/deps_temp_*
  // -> deps), dejando la página en blanco (504 "Outdated Optimize Dep").
  // Se saca la caché fuera de Dropbox para evitar el conflicto de locks.
  cacheDir: "C:/Users/ADRIAZOLA REPUESTOS/.cache/pos-vite",
  // En dev, el shell React (puerto Vite) llama rutas relativas (/users,
  // /employe) que se proxean al backend Express (ver src/main.ts) para
  // evitar CORS y mantener el mismo path que usará un reverse proxy en prod.
  server: {
    proxy: {
      "/users": "http://localhost:3000",
      "/employe": "http://localhost:3000",
      "/departments": "http://localhost:3000",
      "/subsidiaries": "http://localhost:3000",
      "/auth": "http://localhost:3000",
    },
  },
});
