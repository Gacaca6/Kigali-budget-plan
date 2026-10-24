import sharp from "sharp";
import { readFile } from "node:fs/promises";
await Promise.all(
  [192, 512].map((size) =>
    sharp("public/icon.svg")
      .resize(size, size)
      .png()
      .toFile(`public/icon-${size}.png`),
  ),
);
const svg = await readFile("public/icon.svg", "utf8");
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512"><rect width="512" height="512" fill="#123d30"/><g transform="translate(48 48) scale(.8125)">${svg.replace(/<svg[^>]*>/, "").replace("</svg>", "")}</g></svg>`;
await sharp(Buffer.from(maskable)).png().toFile("public/icon-maskable-512.png");
