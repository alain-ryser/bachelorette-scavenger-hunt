import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "bachelorette-scavenger-hunt";
const base = process.env.GITHUB_PAGES === "true" ? `/${repositoryName}/` : "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    target: "es2022",
    sourcemap: true
  }
});
