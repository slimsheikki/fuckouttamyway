import { defineConfig } from "vite";

// `base` is set for GitHub Pages project-site hosting (https://<user>.github.io/fuckouttamyway/).
// Override with BASE_PATH=/ for itch.io or root hosting.
export default defineConfig({
  base: process.env.BASE_PATH ?? "/fuckouttamyway/",
  build: {
    target: "es2022",
    assetsInlineLimit: 0, // keep .glb/.ogg as separate cache-bustable files
  },
});
