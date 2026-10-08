import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const source = await readFile(new URL("../public/og-image.svg", import.meta.url));
await sharp(source).resize(1200, 630).png().toFile(fileURLToPath(new URL("../public/og-image.png", import.meta.url)));
