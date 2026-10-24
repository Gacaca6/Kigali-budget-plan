import { mkdir, writeFile } from "node:fs/promises";
// Original vector animations, authored locally. No remote animation assets.
const fixed = (k) => ({ a: 0, k });
const tween = (a, b, start = 0, end = 36) => ({
  a: 1,
  k: [
    { t: start, s: a, e: b, i: { x: [0.2], y: [1] }, o: { x: [0.2], y: [0] } },
    { t: end, s: b },
  ],
});
const transform = (extra = {}) => ({
  o: fixed(100),
  r: fixed(0),
  p: fixed([128, 128, 0]),
  a: fixed([0, 0, 0]),
  s: fixed([100, 100, 100]),
  ...extra,
});
const path = (points, close = false) => ({
  ty: "sh",
  ks: fixed({
    i: points.map(() => [0, 0]),
    o: points.map(() => [0, 0]),
    v: points,
    c: close,
  }),
  nm: "Original vector path",
});
const stroke = (color, width = 5) => ({
  ty: "st",
  c: fixed(color),
  o: fixed(100),
  w: fixed(width),
  lc: 2,
  lj: 2,
});
const fill = (color) => ({ ty: "fl", c: fixed(color), o: fixed(100) });
const green = [0.071, 0.239, 0.188, 1],
  lime = [0.835, 0.957, 0.471, 1];
const rect = (position, size, r = 12) => ({
  ty: "rc",
  p: fixed(position),
  s: fixed(size),
  r: fixed(r),
});
const layer = (shapes, ks = transform()) => ({
  ddd: 0,
  ind: 1,
  ty: 4,
  nm: "KoraBudget original animation",
  sr: 1,
  ks,
  ao: 0,
  shapes,
  ip: 0,
  op: 72,
  st: 0,
  bm: 0,
});
const animation = (layers) => ({
  v: "5.12.2",
  fr: 60,
  ip: 0,
  op: 72,
  w: 256,
  h: 256,
  nm: "KoraBudget",
  ddd: 0,
  assets: [],
  layers,
  markers: [],
});
const rise = transform({
  p: tween([128, 150, 0], [128, 128, 0], 0, 42),
  s: tween([86, 86, 100], [100, 100, 100], 0, 42),
  r: tween([-8], [0], 0, 42),
  o: tween([0], [100], 0, 18),
});
const badge = transform({
  p: fixed([184, 184, 0]),
  s: tween([0, 0, 100], [100, 100, 100], 24, 52),
});
// Lottie layers run from foreground to background. Keep fills separate from
// strokes, so the tile cannot cover the wallet or its checkmark.
const wallet = animation([
  {
    ...layer(
      [
        path([
          [-10, 0],
          [-2, 8],
          [12, -9],
        ]),
        stroke(green, 4),
      ],
      badge,
    ),
    ind: 1,
  },
  { ...layer([rect([0, 0], [48, 48], 15), fill(lime)], badge), ind: 2 },
  {
    ...layer(
      [
        path([
          [-42, -35],
          [27, -35],
          [27, -22],
        ]),
        path([
          [-42, -35],
          [-42, 38],
          [42, 38],
          [42, -22],
          [-42, -22],
        ]),
        rect([34, 7], [35, 24], 8),
        stroke(lime, 4),
      ],
      rise,
    ),
    ind: 3,
  },
  { ...layer([rect([0, 0], [150, 150], 40), fill(green)], rise), ind: 4 },
]);
const growth = animation([
  layer(
    [rect([-47, 23], [24, 40], 7), fill(green)],
    transform({
      s: tween([100, 0, 100], [100, 100, 100], 0, 36),
      a: fixed([0, 43, 0]),
      p: fixed([128, 171, 0]),
    }),
  ),
  {
    ...layer(
      [rect([0, 7], [24, 72], 7), fill(green)],
      transform({
        s: tween([100, 0, 100], [100, 100, 100], 8, 44),
        a: fixed([0, 43, 0]),
        p: fixed([128, 171, 0]),
      }),
    ),
    ind: 2,
  },
  {
    ...layer(
      [rect([47, -10], [24, 106], 7), fill(lime)],
      transform({
        s: tween([100, 0, 100], [100, 100, 100], 16, 52),
        a: fixed([0, 43, 0]),
        p: fixed([128, 171, 0]),
      }),
    ),
    ind: 3,
  },
]);
const success = animation([
  layer(
    [{ ty: "el", p: fixed([0, 0]), s: fixed([170, 170]) }, fill(lime)],
    transform({
      s: tween([70, 70, 100], [100, 100, 100], 0, 26),
      o: tween([0], [100], 0, 18),
    }),
  ),
  {
    ...layer(
      [
        path([
          [-37, 1],
          [-10, 29],
          [42, -31],
        ]),
        stroke(green, 10),
        {
          ty: "tm",
          s: fixed(0),
          e: tween([0], [100], 10, 44),
          o: fixed(0),
          m: 1,
        },
      ],
      transform(),
    ),
    ind: 2,
  },
]);
success.layers.reverse();
await mkdir("src/animations", { recursive: true });
await Promise.all(
  Object.entries({ wallet, growth, success }).map(([name, data]) =>
    writeFile(`src/animations/${name}.json`, JSON.stringify(data)),
  ),
);
