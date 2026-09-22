import { readFile, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import react from "@vitejs/plugin-react";
import { build } from "vite";

const root = resolve(import.meta.dirname, "..");
const outputDirectory = resolve(root, ".standalone-build");
const outputFile = resolve(root, "Solartronics-Bedarfsprognose.html");

await rm(outputDirectory, { recursive: true, force: true });
await build({
  configFile: false,
  root: resolve(root, "pages"),
  base: "./",
  plugins: [react()],
  build: {
    outDir: outputDirectory,
    emptyOutDir: true,
    rollupOptions: { input: resolve(root, "pages/index.html") },
  },
});

const generatedHtmlPath = resolve(outputDirectory, "index.html");
let html = await readFile(generatedHtmlPath, "utf8");
const stylesheetPath = html.match(/href="(\.\/assets\/[^"]+\.css)"/)?.[1];
const scriptPath = html.match(/src="(\.\/assets\/[^"]+\.js)"/)?.[1];

if (!stylesheetPath || !scriptPath) {
  throw new Error("Impossible de trouver les ressources de la version autonome.");
}

const css = await readFile(resolve(outputDirectory, stylesheetPath), "utf8");
const javascript = (await readFile(resolve(outputDirectory, scriptPath), "utf8")).replaceAll("</script", "<\\/script");
html = html
  .replace(/\s*<link rel="stylesheet"[^>]+>/, () => `\n    <style>${css}</style>`)
  .replace(/\s*<script type="module"[^>]+><\/script>/, () => `\n    <script type="module">${javascript}</script>`);

await writeFile(outputFile, html);
await rm(outputDirectory, { recursive: true, force: true });
console.log(`Fichier autonome créé : ${outputFile}`);
