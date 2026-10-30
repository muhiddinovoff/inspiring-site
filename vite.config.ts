/// <reference types="vitest/config" />
import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works on any static host (GitHub Pages subpath, Netlify, Cloudflare Pages).
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  build: {
    rolldownOptions: {
      output: {
        // Split rarely-changing libraries out so a content edit doesn't bust their cache.
        codeSplitting: {
          groups: [
            { name: "react", test: /node_modules[\\/](react|react-dom|scheduler)[\\/]/, priority: 3 },
            {
              name: "motion",
              test: /node_modules[\\/](framer-motion|motion-dom|motion-utils|lenis)[\\/]/,
              priority: 3,
            },
            // Only the location section's map needs Leaflet; keep it out of the shared vendor chunk.
            { name: "leaflet", test: /node_modules[\\/]leaflet[\\/]/, priority: 2 },
            { name: "vendor", test: /node_modules[\\/]/ },
          ],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "server/**/*.test.ts"],
  },
})
