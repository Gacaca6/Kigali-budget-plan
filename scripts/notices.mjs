import { readFile, writeFile } from "node:fs/promises";
const packages = [
  "react",
  "react-dom",
  "scheduler",
  "dexie",
  "dexie-react-hooks",
  "lucide-react",
  "lottie-web",
  "workbox-window",
  "workbox-core",
  "workbox-precaching",
  "workbox-routing",
  "workbox-strategies",
  "workbox-expiration",
  "workbox-cacheable-response",
  "@fontsource/dm-sans",
  "@fontsource/manrope",
];
const notices = await Promise.all(
  packages.map(async (name) => {
    const metadata = JSON.parse(
      await readFile(`node_modules/${name}/package.json`, "utf8"),
    );
    const license = await readFile(
      `node_modules/${name}/${name === "lottie-web" ? "LICENSE.md" : "LICENSE"}`,
      "utf8",
    );
    return `${name} ${metadata.version}\n${"=".repeat(64)}\n${license}`;
  }),
);
await writeFile(
  "public/third-party-notices.txt",
  `KoraBudget — third-party licenses and notices\n\n${notices.join("\n\n")}`,
);
