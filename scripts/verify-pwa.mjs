import { existsSync, readFileSync, readdirSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
const assets = readdirSync(new URL("assets/", dist));
const sw = readFileSync(new URL("sw.js", dist), "utf8");
const assetList = sw.match(/const STATIC_ASSETS = \[([\s\S]*?)\];/);
if (!assetList) throw new Error("Service worker asset list is missing");
const precachedPaths = JSON.parse(`[${assetList[1].replace(/,\s*$/, "")}]`);

for (const path of precachedPaths) {
  const file = path === "/" ? "index.html" : path.slice(1);
  if (!existsSync(new URL(file, dist))) {
    throw new Error(`Service worker precache target is missing: ${path}`);
  }
}

for (const asset of assets) {
  const url = `/assets/${asset}`;
  if (!sw.includes(JSON.stringify(url))) {
    throw new Error(`Service worker does not precache ${url}`);
  }
}

if (sw.includes('vakt-i-serif-v1')) {
  throw new Error("Service worker cache version did not change with the build");
}

console.log(`PWA precache verified: ${assets.length} build assets`);
