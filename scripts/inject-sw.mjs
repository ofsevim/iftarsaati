import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
const swPath = new URL("sw.js", dist);
const assets = readdirSync(new URL("assets/", dist)).sort().map((name) => `/assets/${name}`);
const version = createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 12);
const original = readFileSync(swPath, "utf8");
const marker = "const STATIC_ASSETS = [";

if (!original.includes(marker) || !original.includes('const CACHE_NAME = "vakt-i-serif-v1";')) {
  throw new Error("Unexpected service worker template");
}

const injected = original
  .replace('const CACHE_NAME = "vakt-i-serif-v1";', `const CACHE_NAME = "vakt-i-serif-${version}";`)
  .replace(marker, `${marker}\n${assets.map((asset) => `  ${JSON.stringify(asset)},`).join("\n")}`);
writeFileSync(swPath, injected);
