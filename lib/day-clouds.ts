const WIDE_CLOUD = [
  "..........HHHH...........",
  "........HHBBBBHH.........",
  ".......HBBBBBBBBH.HH.....",
  "....HHHBBBBBBBBBBHBBH....",
  "...HBBBBBBBBBBBBBBBBBH...",
  ".HHBBBBBBBBBBBBBBBBBBBH..",
  "HBBBBBBBBBBBBBBBBBBBBBBH.",
  ".SBBBBBBBBBBBBBBBBBBBBBS.",
  "..SSSSSSSSSSSSSSSSSSSSS..",
] as const;

const PUFF_CLOUD = [
  "............HH.......",
  "..........HHBBHH.....",
  ".....HH..HBBBBBBH....",
  "...HHBBHHBBBBBBBBH...",
  "..HBBBBBBBBBBBBBBBH..",
  ".HBBBBBBBBBBBBBBBBBH.",
  ".SBBBBBBBBBBBBBBBBBS.",
  "..SSSSSSSSSSSSSSSSS..",
] as const;

const WISP_CLOUD = [
  ".......HHH......",
  ".....HHBBBHH....",
  "..HHHBBBBBBBH...",
  ".HBBBBBBBBBBBHH.",
  "..SSSSSSSSSSSSS.",
] as const;

const COLORS: Record<string, string> = {
  H: "#fcfdff",
  B: "#f6faff",
  S: "#e8f1fa",
};

type CloudPlacement = readonly [sprite: readonly string[], centerX: number, topY: number];

const DESKTOP_CLOUDS: readonly CloudPlacement[] = [
  [WIDE_CLOUD, 0.075, 0.17],
  [PUFF_CLOUD, 0.935, 0.12],
  [WISP_CLOUD, 0.25, 0.065],
  [WISP_CLOUD, 0.59, 0.025],
  [WIDE_CLOUD, 0.91, 0.37],
];

const MOBILE_CLOUDS: readonly CloudPlacement[] = [
  [PUFF_CLOUD, 0.68, 0.025],
  [WISP_CLOUD, 0.12, 0.15],
  [WIDE_CLOUD, 0.99, 0.28],
  [WISP_CLOUD, 0.23, 0.39],
];

/** Paint onto the same low-resolution grid as the sky gradient. */
export function paintDayClouds(context: CanvasRenderingContext2D, width: number, height: number) {
  const clouds = width < 90 ? MOBILE_CLOUDS : DESKTOP_CLOUDS;

  context.save();
  for (const [sprite, centerX, topY] of clouds) {
    const x = Math.round(centerX * width - sprite[0].length / 2);
    const y = Math.round(topY * height);

    sprite.forEach((row, offsetY) => {
      for (let offsetX = 0; offsetX < row.length; offsetX += 1) {
        const color = COLORS[row[offsetX]];
        if (!color) continue;
        context.fillStyle = color;
        context.fillRect(x + offsetX, y + offsetY, 1, 1);
      }
    });
  }
  context.restore();
}
