import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);
const swPath = new URL("sw.js", dist);
const assetNames = readdirSync(new URL("assets/", dist)).sort();
const coreAssets = [];
const optionalAssets = [];

for (const name of assetNames) {
  const url = `/assets/${name}`;
  if (name.includes("-legacy-")) {
    optionalAssets.push(url);
  } else {
    coreAssets.push(url);
  }
}

const original = readFileSync(swPath, "utf8");
const hash = createHash("sha256");
hash.update(readFileSync(new URL("index.html", dist)));
hash.update(readFileSync(new URL("manifest.json", dist)));
hash.update(original);
for (const name of assetNames) {
  hash.update(name);
  hash.update(readFileSync(new URL(`assets/${name}`, dist)));
}
const version = hash.digest("hex").slice(0, 12);

const coreMarker = "const STATIC_ASSETS = [";
const optionalMarker = "const OPTIONAL_ASSETS = [";

if (
  !original.includes(coreMarker) ||
  !original.includes(optionalMarker) ||
  !original.includes('const CACHE_NAME = "vakt-i-serif-v1";')
) {
  throw new Error("Unexpected service worker template");
}

let injected = original
  .replace('const CACHE_NAME = "vakt-i-serif-v1";', `const CACHE_NAME = "vakt-i-serif-${version}";`)
  .replace(coreMarker, `${coreMarker}\n${coreAssets.map((asset) => `  ${JSON.stringify(asset)},`).join("\n")}`);

if (optionalAssets.length > 0) {
  injected = injected.replace(
    optionalMarker,
    `${optionalMarker}\n${optionalAssets.map((asset) => `  ${JSON.stringify(asset)},`).join("\n")}`
  );
}

writeFileSync(swPath, injected);
