#!/usr/bin/env node
// Scans ./public/food-dataset and writes ./public/food-dataset/dataset.json
// Usage: `node ./scripts/generate_dataset_manifest.js`
import { readdir, stat, writeFile } from "fs/promises";
import { join } from "path";

async function generate() {
  const base = join(process.cwd(), "public", "food-dataset");
  try {
    const categories = await readdir(base, { withFileTypes: true });
    const manifest = {};
    for (const dirent of categories) {
      if (!dirent.isDirectory()) continue;
      const catName = dirent.name;
      const dirPath = join(base, catName);
      const files = await readdir(dirPath);
      const images = [];
      for (const f of files) {
        const full = join(dirPath, f);
        const s = await stat(full);
        if (s.isFile()) {
          // only include common image extensions
          if (/\.(jpe?g|png|webp|gif|bmp)$/i.test(f)) images.push(f);
        }
      }
      manifest[catName] = images;
    }
    const out = join(base, "dataset.json");
    await writeFile(out, JSON.stringify(manifest, null, 2), "utf8");
    console.log("Wrote", out);
  } catch (e) {
    console.error("Failed to generate dataset manifest", e);
    process.exit(1);
  }
}

generate();
