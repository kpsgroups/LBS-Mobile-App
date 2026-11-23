export type FinishId = number;
export type Layout = "Shelves" | "Hanging" | "Mixed";
export interface Design {
  width: number;
  height: number;
  depth: number;
  bays: number;
  layout: Layout;
  finish: FinishId;
}
export const limits = {
  width: [900, 3000, 100],
  height: [1800, 2700, 100],
  depth: [450, 750, 50],
  bays: [2, 4, 1],
} as const;
export const initialDesign: Design = {
  width: 1800,
  height: 2200,
  depth: 600,
  bays: 3,
  layout: "Mixed",
  finish: 12073,
};
export type Triple = [number, number, number];
type Surface = "finish" | "interior" | "hardware" | "plinth";
export type Part = {
  id: string;
  center: Triple;
  size: Triple;
  surface: Surface;
};

// Geometry is expressed in metres. The local origin is the centre of the footprint at floor level.
export function wardrobe(d: Design, open = false): Part[] {
  const w = d.width / 1000,
    h = d.height / 1000,
    depth = d.depth / 1000;
  const board = 0.018,
    toe = 0.075;
  const parts: Part[] = [];
  function box(id: string, surface: Surface, size: Triple, center: Triple) {
    parts.push({ id, surface, size, center });
  }
  const bodyDepth = depth - 0.05;
  const z = -depth / 2 + bodyDepth / 2;
  box(
    "recessed base",
    "plinth",
    [w - 0.06, toe, bodyDepth - 0.06],
    [0, toe / 2, z],
  );
  box(
    "back",
    "interior",
    [w, h - toe, board],
    [0, (h + toe) / 2, -depth / 2 + board / 2],
  );
  for (const side of [-1, 1]) {
    box(
      "side " + side,
      "finish",
      [board, h - toe, bodyDepth],
      [(side * (w - board)) / 2, (h + toe) / 2, z],
    );
  }
  box("top", "finish", [w, board, bodyDepth], [0, h - board / 2, z]);
  box("base", "interior", [w, board, bodyDepth], [0, toe + board / 2, z]);
  const bayWidth = (w - board) / d.bays;
  for (let i = 0; i < d.bays; i++) {
    const x = -w / 2 + board / 2 + bayWidth * (i + 0.5);
    if (i > 0)
      box(
        "divider " + i,
        "interior",
        [board, h - toe - 2 * board, bodyDepth - board],
        [x - bayWidth / 2, (h + toe) / 2, z],
      );
    const hanging = d.layout === "Hanging" || (d.layout === "Mixed" && i === 0);
    const levels = hanging ? [0.82] : [0.24, 0.44, 0.64, 0.82];
    for (const level of levels)
      box(
        "shelf " + i + " " + level,
        "interior",
        [bayWidth - board, board, bodyDepth - board],
        [x, h * level, z],
      );
    if (hanging)
      box(
        "rail " + i,
        "hardware",
        [bayWidth - board, 0.02, 0.02],
        [x, h * 0.75, z],
      );
    if (!open) {
      const doorWidth = w / d.bays;
      const dx = -w / 2 + doorWidth * (i + 0.5);
      box(
        "door " + i,
        "finish",
        [doorWidth - 0.004, h - toe - 0.004, board],
        [dx, (h + toe) / 2, depth / 2 - 0.032 - board / 2],
      );
      box(
        "pull " + i,
        "hardware",
        [0.016, 0.25, 0.032],
        [
          dx + (i % 2 ? -1 : 1) * (doorWidth / 2 - 0.045),
          h * 0.48,
          depth / 2 - 0.016,
        ],
      );
    }
  }
  return parts;
}
