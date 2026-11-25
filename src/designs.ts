import type { Point, Surface, Triple } from "./model";

// Feature walls, TV units, archways and designer wardrobes. Every design is
// built from boxes so the editor preview, native AR and WebXR share one model.
// Units are metres; the origin is the centre of the footprint at floor level,
// the front faces +Z and wall-mounted designs sit against the plane z = -depth/2.

export type Add = (id: string, size: Triple, center: Triple, surface?: Surface, outline?: Point[]) => void;
export interface Shape { w: number; h: number; z: number; n: number; open: boolean }

const LED = 0.012;

// Vertical slats on a backing board between x0..x1 and y0..y1.
function slats(add: Add, id: string, x0: number, x1: number, y0: number, y1: number, wall: number,
  { pitch = 0.06, width = 0.032, depth = 0.03, surface = "finish" as Surface, backing = true } = {}) {
  const span = x1 - x0, count = Math.max(1, Math.round(span / pitch)), step = span / count;
  if (backing) add(id + " backing", [span, y1 - y0, 0.012], [(x0 + x1) / 2, (y0 + y1) / 2, wall + 0.006], surface);
  for (let i = 0; i < count; i++)
    add(id + " slat " + i, [Math.min(width, step * 0.8), y1 - y0, depth], [x0 + (i + 0.5) * step, (y0 + y1) / 2, wall + 0.012 + depth / 2], surface);
  return wall + 0.012 + depth;
}

// Extruded outline given in absolute XY coordinates, centred on its bounding box.
function shape(add: Add, id: string, points: Point[], z: number, depth: number, surface: Surface) {
  const xs = points.map((p) => p[0]), ys = points.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.max(0, Math.min(...ys)), y1 = Math.max(...ys);
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
  add(id, [x1 - x0, y1 - y0, depth], [cx, cy, z], surface, points.map(([x, y]) => [x - cx, Math.max(0, y) - cy] as Point));
}

// Points along a circular arc, angles in radians measured from +X anticlockwise.
function arc(cx: number, cy: number, r: number, from: number, to: number, segments: number): Point[] {
  return Array.from({ length: segments + 1 }, (_, i) => {
    const a = from + ((to - from) * i) / segments;
    return [cx + r * Math.cos(a), cy + r * Math.sin(a)] as Point;
  });
}

function archPoints(cx: number, width: number, yBase: number, yTop: number, down: boolean): Point[] {
  const r = width / 2, spring = down ? yBase + r : yTop - r;
  return down
    ? [[cx - r, yTop], ...arc(cx, spring, r, Math.PI, 2 * Math.PI, 24), [cx + r, yTop]]
    : [[cx + r, yBase], ...arc(cx, spring, r, 0, Math.PI, 24), [cx - r, yBase]];
}

// Arch (round top) from yBase to yTop. `down` hangs it from the top instead.
// With `glow`, a slightly larger LED arch sits just behind it.
function arch(add: Add, id: string, cx: number, width: number, yBase: number, yTop: number, z: number, depth: number,
  surface: Surface, { down = false, glow = false } = {}) {
  shape(add, id, archPoints(cx, width, yBase, yTop, down), z, depth, surface);
  if (glow) shape(add, id + " glow", archPoints(cx, width + 2 * LED, down ? yBase - LED : yBase, down ? yTop : yTop + LED, down), z - depth / 2 - 0.002, 0.003, "glow");
}

// Disc facing the viewer.
function disc(add: Add, id: string, cx: number, cy: number, r: number, z: number, depth: number, surface: Surface) {
  shape(add, id, arc(cx, cy, r, 0, 2 * Math.PI, 48).slice(0, -1), z, depth, surface);
}

// Open box (shelf cube or niche) with a light strip under its top.
function niche(add: Add, id: string, cx: number, cy: number, w: number, h: number, wall: number, depth: number,
  frame: Surface, inside: Surface = "interior", t = 0.02) {
  const z = wall + depth / 2;
  add(id + " back", [w - 2 * t, h - 2 * t, 0.01], [cx, cy, wall + 0.005], inside);
  for (const s of [-1, 1]) {
    add(id + " side " + s, [t, h, depth], [cx + s * (w - t) / 2, cy, z], frame);
    add(id + " rim " + s, [w - 2 * t, t, depth], [cx, cy + s * (h - t) / 2, z], frame);
  }
  add(id + " light", [w * 0.6, LED / 2, LED], [cx, cy + h / 2 - t - LED / 4, wall + depth - 0.02], "glow");
}

// Rectangular LED outline just behind a panel's edges.
function outline(add: Add, id: string, cx: number, cy: number, w: number, h: number, z: number) {
  for (const s of [-1, 1]) {
    add(id + " v " + s, [LED, h + 2 * LED, LED], [cx + s * (w / 2 + LED / 2), cy, z], "glow");
    add(id + " h " + s, [w, LED, LED], [cx, cy + s * (h / 2 + LED / 2), z], "glow");
  }
}

// TV screen (16:9) no taller than a third of the wall, centred at 48% of the height.
function screen(add: Add, id: string, cx: number, h: number, width: number, wall: number) {
  const sw = Math.min(width, (h * 0.34) / 0.5625);
  add(id, [sw, sw * 0.5625, 0.03], [cx, h * 0.48, wall + 0.05], "screen");
}

// Floating console against the wall, no deeper than the design, with a light below.
function console_(add: Add, id: string, width: number, height: number, y0: number, wall: number, z: number, lines: number) {
  const cd = Math.min(0.42, z * 0.95);
  add(id, [width, height, cd], [0, y0 + height / 2, wall + cd / 2], "finish");
  for (let i = 1; i < lines; i++) add(id + " line " + i, [0.004, height - 0.04, 0.004], [-width / 2 + (i * width) / lines, y0 + height / 2, wall + cd + 0.002], "hardware");
  add(id + " light", [width - 0.02, LED, cd * 0.8], [0, y0 - LED / 2, wall + cd * 0.45], "glow");
  return cd;
}

// Carcass for wall-to-wall wardrobes: back, sides, top, base and toe kick.
function carcass(add: Add, s: Shape, toe = 0.08) {
  const { w, h, z } = s;
  add("carcass back", [w, h - toe, 0.018], [0, (h + toe) / 2, -z / 2 + 0.009], "interior");
  for (const side of [-1, 1]) add("carcass side " + side, [0.018, h - toe, z - 0.02], [side * (w - 0.018) / 2, (h + toe) / 2, -0.01], "finish");
  add("carcass roof", [w, 0.018, z - 0.02], [0, h - 0.009, -0.01], "finish");
  add("carcass floor", [w, 0.018, z - 0.02], [0, toe + 0.009, -0.01], "interior");
  add("recessed base", [w - 0.04, toe, z - 0.06], [0, toe / 2, -0.03], "plinth");
}

type Builder = (add: Add, s: Shape) => void;

export const builders: Record<string, Builder> = {
  // Sage slatted partition with arched bronze mirrors, alternately standing and hanging.
  archMirror(add, { w, h, z, n }) {
    const post = 0.12, x0 = -w / 2 + post, x1 = w / 2 - post, top = h - post;
    for (const s of [-1, 1]) add("frame post " + s, [post, h, z], [s * (w - post) / 2, h / 2, 0], "accent");
    add("frame header", [w - 2 * post, post, z], [0, h - post / 2, 0], "accent");
    add("core", [x1 - x0, top, 0.018], [0, top / 2, 0], "finish");
    const front = slats(add, "front", x0, x1, 0, top, 0.009, { pitch: 0.07, width: 0.035, depth: 0.025, backing: false });
    slats(add, "rear", x0, x1, 0, top, -0.009 - 0.037, { pitch: 0.07, width: 0.035, depth: 0.025, backing: false });
    const count = n * 2, gap = (x1 - x0) / count, width = Math.min(gap * 0.62, 0.42);
    for (let i = 0; i < count; i++) {
      const cx = x0 + (i + 0.5) * gap, down = i % 2 === 1;
      arch(add, "mirror " + i, cx, width, down ? top * 0.4 : 0.05, down ? top - 0.05 : top * 0.68, front + 0.004, 0.006, "mirror", { down, glow: true });
    }
  },

  // Walnut archway: display niches and a mirror on the left, lattice and shelves on the right.
  jaaliArch(add, { w, h, z }) {
    const header = 0.22, left = 0.5, right = 0.55, wall = -z / 2;
    add("left pier", [0.3, h - header, z], [-w / 2 + 0.15, (h - header) / 2, 0], "finish");
    add("mirror frame", [0.2, h - header, 0.03], [-w / 2 + 0.4, (h - header) / 2, z / 2 - 0.05], "accent");
    add("mirror", [0.15, h - header - 0.2, 0.006], [-w / 2 + 0.4, (h - header) / 2 + 0.05, z / 2 - 0.032], "mirror");
    for (let i = 0; i < 3; i++) niche(add, "left niche " + i, -w / 2 + 0.15, h * (0.38 + i * 0.16), 0.22, 0.22, z / 2 - 0.16, 0.16, "accent");
    add("header", [w, header, z], [0, h - header / 2, 0], "finish");
    add("header light", [w - left - right, LED, LED], [0, h - header - LED / 2, z / 2 - 0.03], "glow");
    for (const x of [w / 2 - 0.04, w / 2 - right + 0.04]) add("right post " + x.toFixed(2), [0.08, h - header, z], [x, (h - header) / 2, 0], "finish");
    const jx0 = w / 2 - right + 0.08, jx1 = w / 2 - 0.08, jy0 = 0.62, jy1 = h - header;
    add("lattice glow", [jx1 - jx0, jy1 - jy0, LED], [(jx0 + jx1) / 2, (jy0 + jy1) / 2, wall + 0.02], "glow");
    for (let x = jx0 + 0.035; x < jx1; x += 0.07) add("lattice v " + x.toFixed(3), [0.014, jy1 - jy0, 0.02], [x, (jy0 + jy1) / 2, wall + 0.05], "accent");
    for (let y = jy0 + 0.035; y < jy1; y += 0.07) add("lattice h " + y.toFixed(3), [jx1 - jx0, 0.014, 0.02], [(jx0 + jx1) / 2, y, wall + 0.05], "accent");
    for (let i = 0; i < 4; i++) add("display shelf " + i, [0.2, 0.02, Math.min(0.18, z * 0.5)], [jx0 + 0.1, jy0 + ((i + 1) * (jy1 - jy0)) / 5, z / 2 - Math.min(0.1, z * 0.28)], "accent");
    add("planter base", [jx1 - jx0, jy0, z], [(jx0 + jx1) / 2, jy0 / 2, 0], "finish");
    for (const y of [0.18, 0.32]) add("base stripe " + y, [jx1 - jx0, 0.03, 0.005], [(jx0 + jx1) / 2, y, z / 2 + 0.0025], "accent");
  },

  // Alternating fluted wood and stone sections separated by LED reveals.
  flutedStone(add, { w, h, z, n }) {
    const sections = 2 * n - 1, gap = 0.03, wall = -z / 2, sw = (w - (sections - 1) * gap) / sections;
    for (let i = 0; i < sections; i++) {
      const x0 = -w / 2 + i * (sw + gap), x1 = x0 + sw;
      if (i % 2 === 0) slats(add, "flute " + i, x0, x1, 0, h, wall, { pitch: 0.05, width: 0.032, depth: 0.035 });
      else add("stone " + i, [sw, h, 0.02], [(x0 + x1) / 2, h / 2, wall + 0.01], "accent");
      if (i < sections - 1) add("reveal light " + i, [gap * 0.5, h - 0.04, LED], [x1 + gap / 2, h / 2, wall + 0.01], "glow");
    }
    add("cove light", [w, LED, LED * 2], [0, h - LED / 2, wall + 0.06], "glow");
  },

  // Marble slab framed by slats with LED edges.
  marbleSlat(add, { w, h, z }) {
    const wall = -z / 2, sw = w * 0.42;
    add("marble slab", [sw, h - 0.06, 0.02], [0, (h + 0.06) / 2, wall + 0.01], "accent");
    add("slab skirting", [sw, 0.06, 0.025], [0, 0.03, wall + 0.0125], "finish");
    for (const s of [-1, 1]) {
      slats(add, "side " + s, s < 0 ? -w / 2 : sw / 2 + 0.02, s < 0 ? -sw / 2 - 0.02 : w / 2, 0, h, wall, { pitch: 0.045, width: 0.025, depth: 0.03 });
      add("slab light " + s, [LED, h - 0.06, LED], [s * (sw / 2 + 0.01), (h + 0.06) / 2, wall + 0.012], "glow");
    }
  },

  // Full-height marble laminate slabs joined by gold inlay strips.
  slabGold(add, { w, h, z, n }) {
    const wall = -z / 2, panels = n + 1, inlay = 0.012, pw = (w - (panels + 1) * inlay) / panels;
    for (let i = 0; i < panels; i++) add("slab " + i, [pw, h - 0.08, 0.012], [-w / 2 + inlay + pw / 2 + i * (pw + inlay), (h + 0.08) / 2, wall + 0.006], "finish");
    for (let i = 0; i <= panels; i++) add("inlay " + i, [inlay, h, 0.016], [-w / 2 + inlay / 2 + i * (pw + inlay), h / 2, wall + 0.008], "trim");
    add("gold skirting", [w, 0.08, 0.016], [0, 0.04, wall + 0.008], "trim");
  },

  // Black marble centre with gold lines, wood slats and wall lights either side.
  neroWall(add, { w, h, z }) {
    const wall = -z / 2, cw = w * 0.5;
    add("nero panel", [cw, h - 0.05, 0.02], [0, (h + 0.05) / 2, wall + 0.01], "accent");
    for (const x of [0.06, 0.1]) add("gold line " + x, [0.012, h - 0.05, 0.024], [cw * x * 2.2, (h + 0.05) / 2, wall + 0.012], "trim");
    add("panel skirting", [cw, 0.05, 0.022], [0, 0.025, wall + 0.011], "hardware");
    for (const s of [-1, 1]) {
      const x0 = s < 0 ? -w / 2 : cw / 2, x1 = s < 0 ? -cw / 2 : w / 2, cx = (x0 + x1) / 2;
      const front = slats(add, "wing " + s, x0, x1, 0, h, wall, { pitch: 0.075, width: 0.045, depth: Math.min(0.04, z * 0.4) });
      const sd = Math.max(0.02, Math.min(0.06, z / 2 + 0.03 - front));
      add("sconce " + s, [0.16, 0.1, sd], [cx, h * 0.66, front + sd / 2], "hardware");
      for (const y of [-1, 1]) add("sconce light " + s + " " + y, [0.12, LED, sd * 0.7], [cx, h * 0.66 + y * 0.056, front + sd / 2], "glow");
    }
    add("cove light", [w, LED, LED * 2], [0, h - LED / 2, wall + 0.06], "glow");
  },

  // Full slatted wall with a staggered cluster of lit display niches.
  nicheSlat(add, { w, h, z, n }) {
    const wall = -z / 2, front = slats(add, "wall", -w / 2, w / 2, 0, h, wall, { pitch: 0.06, width: 0.035, depth: 0.03 });
    const nw = Math.min(0.48, (w * 0.5) / n), gap = 0.06, span = n * nw + (n - 1) * gap;
    for (let c = 0; c < n; c++) for (let r = 0; r < 2; r++) {
      const nh = (r === 0 ? 0.5 : 0.4) * Math.min(1, h / 2.7), cx = -span / 2 + nw / 2 + c * (nw + gap);
      const cy = h * (0.32 + (c % 2) * 0.07 + r * 0.24);
      niche(add, "niche " + c + " " + r, cx, cy, nw, nh, front, Math.max(0.05, z / 2 - front - 0.005), "finish", "finish");
    }
  },

  // Slatted TV wall with a backlit wood disc and open shelf towers.
  haloTv(add, { w, h, z }) {
    const wall = -z / 2, cw = w * 0.56, tw = (w - cw) / 2 - 0.04;
    add("plinth strip", [w, 0.08, z], [0, 0.04, 0], "plinth");
    const front = slats(add, "centre", -cw / 2, cw / 2, 0.08, h - 0.25, wall, { pitch: 0.05, width: 0.03, depth: 0.03 });
    const r = Math.min(cw * 0.34, h * 0.21), cy = h * 0.5;
    disc(add, "halo", 0, cy, r + 0.03, front + 0.01, LED, "glow");
    disc(add, "disc", 0, cy, r, front + 0.035, 0.04, "finish");
    add("disc niche", [r * 1.1, r * 0.42, 0.004], [0, cy, front + 0.057], "interior");
    add("disc shelf", [r * 1.1, 0.02, 0.06], [0, cy - r * 0.21, front + 0.06], "finish");
    for (const s of [-1, 1]) {
      const cx = s * (cw / 2 + 0.04 + tw / 2), depth = z - 0.02;
      for (const e of [-1, 1]) add("tower side " + s + " " + e, [0.025, h - 0.25, depth], [cx + e * (tw - 0.025) / 2, (h - 0.25) / 2 + 0.04, 0], "finish");
      for (let i = 0; i <= 5; i++) add("tower shelf " + s + " " + i, [tw - 0.05, 0.025, depth], [cx, 0.09 + i * (h - 0.36) / 5, 0], "finish");
      add("tower light " + s, [LED, h - 0.4, LED], [cx - s * (tw / 2 - 0.035), (h - 0.25) / 2 + 0.06, z / 2 - 0.03], "glow");
    }
  },

  // Wood archway with a column of lit, staggered niches.
  nicheArch(add, { w, h, z }) {
    const header = 0.18, lw = w * 0.42, post = 0.12;
    add("niche pier", [lw, h - header, z], [-w / 2 + lw / 2, (h - header) / 2, 0], "finish");
    add("header", [w, header, z], [0, h - header / 2, 0], "finish");
    add("right post", [post, h - header, z], [w / 2 - post / 2, (h - header) / 2, 0], "finish");
    add("header light", [w - lw - post, LED, LED], [(lw - post) / 2, h - header - LED / 2, 0], "glow");
    const cols = [-w / 2 + lw * 0.3, -w / 2 + lw * 0.72];
    for (let i = 0; i < 6; i++) {
      const cx = cols[i % 2], cy = 0.35 + i * (h - header - 0.6) / 6 + (i % 2) * 0.12, nw = lw * 0.36, nh = 0.3;
      add("niche face " + i, [nw, nh, 0.004], [cx, cy, z / 2 + 0.002], "accent");
      add("niche shelf " + i, [nw, 0.02, 0.03], [cx, cy - nh / 2 + 0.01, z / 2 + 0.015], "finish");
      add("niche light " + i, [0.05, LED / 2, LED], [cx, cy + nh / 2 - 0.02, z / 2 + 0.006], "glow");
    }
  },

  // Cream wardrobe with arc panels, lit open shelves and a central dressing mirror.
  arcWardrobe(add, s) {
    const { w, h, z, open } = s, toe = 0.08, loft = 0.5, body = h - loft, front = z / 2;
    carcass(add, s, toe);
    const col = w * 0.15, dress = w * 0.2, mod = (w - col - dress) / 2;
    const x0 = -w / 2, xa = x0 + col, xd = xa + mod, xb = xd + dress;
    for (let i = 0; i < 6; i++) {
      const dw = w / 6, cx = x0 + dw * (i + 0.5);
      if (!open) add("door loft " + i, [dw - 0.006, loft - 0.01, 0.018], [cx, body + loft / 2, front - 0.009], "finish");
      add("pull loft " + i, [0.012, 0.12, 0.02], [cx + (i % 2 ? -1 : 1) * (dw / 2 - 0.05), body + 0.1, front + 0.01], "trim");
    }
    const mh = body - toe, table = toe + mh * 0.36, dh = (table - toe) / 3;
    for (let i = 0; i < 3; i++) {
      add("drawer " + i, [col - 0.01, dh - 0.01, 0.018], [x0 + col / 2, toe + (i + 0.5) * dh, front - 0.009], "finish");
      add("drawer pull " + i, [col * 0.5, 0.012, 0.02], [x0 + col / 2, toe + (i + 0.75) * dh, front + 0.01], "trim");
    }
    for (let i = 0; i < 3; i++) {
      const y = table + i * (body - table) / 3;
      add("open shelf " + i, [col - 0.03, 0.025, z * 0.8], [x0 + col / 2, y, 0], "finish");
      add("shelf light " + i, [col - 0.05, LED / 2, LED], [x0 + col / 2, y - 0.016, front - 0.06], "glow");
    }
    for (const [m, mx] of [[0, xa], [1, xd + dress]] as const) {
      const cx = mx + mod / 2;
      if (open) for (let i = 1; i < 4; i++) add("module shelf " + m + " " + i, [mod - 0.03, 0.018, z - 0.05], [cx, toe + (i * mh) / 4, 0], "interior");
      else {
        for (const e of [-1, 1]) add("door " + m + " " + e, [mod / 2 - 0.004, mh - 0.01, 0.018], [cx + e * mod / 4, toe + mh / 2, front - 0.009], "finish");
        // Half disc of fluted wood with its flat side on the dressing unit, edged with LED.
        const r = Math.min(mod * 0.9, mh * 0.42), flat = m === 0 ? mx + mod : mx, cy = toe + mh / 2;
        const half = (radius: number) => m === 0 ? arc(flat, cy, radius, Math.PI / 2, 1.5 * Math.PI, 32) : arc(flat, cy, radius, -Math.PI / 2, Math.PI / 2, 32);
        shape(add, "door arc light " + m, half(r + LED), front + 0.002, 0.003, "glow");
        shape(add, "door arc " + m, half(r), front + 0.006, 0.008, "detail");
        for (let i = 1; i < 10; i++) {
          const dx = (r * i) / 10, fh = 2 * Math.sqrt(r * r - dx * dx) * 0.97;
          add("door arc flute " + m + " " + i, [0.012, fh, 0.006], [m === 0 ? flat - dx : flat + dx, cy, front + 0.013], "detail");
        }
        for (const e of [-1, 1]) add("pull " + m + " " + e, [0.018, Math.min(0.5, mh * 0.3), 0.03], [cx + e * 0.03, toe + mh * 0.48, front + 0.015], "trim");
      }
    }
    const dc = xd + dress / 2;
    add("dressing back", [dress - 0.02, body - toe, 0.01], [dc, (body + toe) / 2, -z / 2 + 0.03], "detail");
    add("dressing top", [dress - 0.02, 0.03, z * 0.85], [dc, table, 0], "finish");
    add("dressing drawer", [dress - 0.03, mh * 0.08, 0.018], [dc, table - mh * 0.05, front - 0.009], "finish");
    add("dressing pull", [dress * 0.4, 0.012, 0.02], [dc, table - mh * 0.05, front + 0.01], "trim");
    const mirrorY = toe + mh * 0.66, mirrorH = mh * 0.42;
    add("mirror", [dress * 0.5, mirrorH, 0.006], [dc, mirrorY, -z / 2 + 0.04], "mirror");
    outline(add, "mirror light", dc, mirrorY, dress * 0.5, mirrorH, -z / 2 + 0.037);
    for (const e of [-1, 1]) for (let i = 0; i < 3; i++)
      add("dressing shelf " + e + " " + i, [dress * 0.16, 0.02, z * 0.5], [dc + e * dress * 0.38, table + mh * (0.14 + i * 0.16), -z / 4], "finish");
    add("gold base line", [w, 0.012, 0.01], [0, toe + 0.006, front + 0.005], "trim");
  },

  // Sculpted, backlit wave layers around a stone backdrop and floating console.
  waveTv(add, { w, h, z }) {
    const wall = -z / 2, y0 = Math.min(0.6, h * 0.22), top = h - 0.2, samples = 32;
    add("stone backdrop", [w * 0.7, top - y0, 0.02], [0, (top + y0) / 2, wall + 0.01], "accent");
    // Two stacked layers on each side whose inner edges follow a wave; LED behind each edge.
    const reach = (s: number, t: number) => w * (s < 0 ? 0.16 + 0.12 * Math.sin(Math.PI * t) : 0.14 + 0.1 * Math.sin(Math.PI * (t + 0.25)));
    for (const s of [-1, 1]) for (const layer of [0, 1]) {
      const depth = 0.05 + layer * 0.04, zc = wall + 0.03 + layer * 0.05 + depth / 2;
      const band = (extra: number): Point[] => [
        [s * w / 2, y0],
        ...Array.from({ length: samples + 1 }, (_, i) => {
          const t = i / samples;
          return [s * (w / 2 - Math.max(0.02, reach(s, t) - layer * 0.12 + extra)), y0 + t * (h - y0)] as Point;
        }),
        [s * w / 2, h],
      ];
      shape(add, "wave light " + s + " " + layer, band(LED), zc - depth / 2 - 0.002, 0.003, "glow");
      shape(add, "wave " + s + " " + layer, band(0), zc, depth, "finish");
    }
    add("canopy", [w, 0.2, 0.12], [0, h - 0.1, wall + 0.06], "finish");
    add("canopy light", [w * 0.7, LED, LED], [0, h - 0.2 - LED / 2, wall + 0.1], "glow");
    screen(add, "tv screen", 0, h, Math.min(1.43, w * 0.42), wall);
    console_(add, "console", w * 0.7, 0.3, 0.2, wall, z, 4);
    arch(add, "side niche", w * 0.38, 0.22, h * 0.28, h * 0.48, wall + 0.11, 0.01, "interior", { glow: true });
  },

  // Marble arch TV wall on slats with arched display niches and a floating console.
  archTv(add, { w, h, z }) {
    const wall = -z / 2;
    const front = slats(add, "backdrop", -w / 2, w / 2, 0, h - 0.2, wall, { pitch: 0.05, width: 0.03, depth: 0.025, surface: "detail" });
    const aw = w * 0.5, top = h - 0.2;
    arch(add, "arch frame", 0, aw, 0.55, top, front + 0.03, 0.04, "finish", { glow: true });
    arch(add, "arch marble", 0, aw - 0.16, 0.6, top - 0.08, front + 0.056, 0.012, "accent");
    screen(add, "tv screen", 0, h, Math.min(1.43, aw * 0.8), front);
    const sd = Math.max(0.06, Math.min(0.22, z / 2 - front - 0.06)), sy = h * 0.72;
    add("arch shelf", [aw * 0.7, 0.05, sd], [0, sy, front + 0.05 + sd / 2], "detail");
    add("arch shelf light", [aw * 0.66, LED, sd * 0.8], [0, sy - 0.025 - LED / 2, front + 0.05 + sd / 2], "glow");
    const lx = -w * 0.38, lw = w * 0.16;
    add("niche tower", [lw, top - 0.55, 0.08], [lx, (top + 0.55) / 2, front + 0.04], "finish");
    for (let i = 0; i < 4; i++) {
      const y0 = 0.62 + i * (top - 0.62) / 4;
      arch(add, "left niche " + i, lx, lw * 0.7, y0, y0 + (top - 0.62) / 4 - 0.08, front + 0.088, 0.004, "detail", { glow: true });
    }
    arch(add, "right niche", w * 0.38, w * 0.12, 0.6, top - 0.4, front + 0.01, 0.01, "detail", { glow: true });
    const cd = console_(add, "console", w * 0.86, 0.32, 0.22, wall, z, 1);
    add("console top", [w * 0.86, 0.025, cd + 0.01], [0, 0.5525, wall + (cd + 0.01) / 2], "screen");
    for (const s of [-1, 1]) add("console glass " + s, [w * 0.14, 0.18, 0.004], [s * w * 0.09, 0.38, wall + cd + 0.002], "glow");
  },

  // Organic glowing frame on a stone wall with shelves and a low console.
  glowTv(add, { w, h, z }) {
    const wall = -z / 2, y0 = Math.min(0.55, h * 0.2), y1 = h - 0.2, cx = w * 0.06, samples = 40;
    add("stone wall", [w, h, 0.02], [0, h / 2, wall + 0.01], "accent");
    // Organic outline: a rounded, slightly drifting blob; the stone panel inside is inset.
    const blob = (inset: number): Point[] => {
      const side = (sign: number) => Array.from({ length: samples + 1 }, (_, i) => {
        const t = sign > 0 ? i / samples : 1 - i / samples;
        const round = Math.pow(Math.max(0, 1 - Math.pow(2 * t - 1, 6)), 0.5);
        const half = Math.max(0.01, w * (0.26 + 0.05 * Math.sin(Math.PI * t * 1.6)) * round - inset);
        const yi = y0 + inset + t * (y1 - y0 - 2 * inset);
        return [cx + w * 0.04 * Math.sin(Math.PI * t * 1.3) + sign * half, yi] as Point;
      });
      return [...side(1), ...side(-1)];
    };
    shape(add, "glow field", blob(0), wall + 0.025, 0.01, "glow");
    shape(add, "inner panel", blob(0.16), wall + 0.045, 0.03, "accent");
    screen(add, "tv screen", cx + 0.02, h, Math.min(1.3, w * 0.36), wall + 0.03);
    const fd = Math.min(0.25, z * 0.7);
    for (let i = 0; i < 5; i++) {
      const y = h * (0.28 + i * 0.13);
      add("float shelf " + i, [w * 0.15, 0.03, fd], [-w * 0.4, y, wall + fd / 2], "finish");
      add("float light " + i, [w * 0.14, LED, fd * 0.8], [-w * 0.4, y - 0.015 - LED / 2, wall + fd / 2], "glow");
    }
    console_(add, "console", w * 0.86, 0.35, 0.05, wall, z, 5);
  },

  // Arched niches with travertine and floating shelves between slat strips.
  archShelves(add, { w, h, z }) {
    const wall = -z / 2;
    add("plaster wall", [w, h, 0.02], [0, h / 2, wall + 0.01], "finish");
    for (const s of [-1, 1]) slats(add, "edge " + s, s < 0 ? -w / 2 : w / 2 - 0.2, s < 0 ? -w / 2 + 0.2 : w / 2, 0, h, wall + 0.02, { pitch: 0.04, width: 0.022, depth: 0.03, surface: "detail" });
    arch(add, "stone niche", -w * 0.28, w * 0.2, 0.5, h - 0.55, wall + 0.03, 0.01, "accent", { glow: true });
    const rx = w * 0.16, rw = w * 0.42;
    arch(add, "shelf recess", rx, rw, 0.5, h - 0.25, wall + 0.025, 0.006, "interior", { glow: true });
    const fd = Math.min(0.24, z * 0.6);
    for (let i = 0; i < 3; i++) {
      const y = h * (0.35 + i * 0.155);
      add("float shelf " + i, [rw * 0.82, 0.04, fd], [rx, y, wall + 0.02 + fd / 2], "detail");
      add("shelf light " + i, [rw * 0.8, LED, fd * 0.8], [rx, y - 0.02 - LED / 2, wall + 0.02 + fd / 2], "glow");
    }
    const cd = Math.min(0.38, z * 0.95);
    add("console", [w * 0.75, 0.3, cd], [0, 0.3, wall + cd / 2], "detail");
    add("console light", [w * 0.73, LED, cd * 0.85], [0, 0.15 - LED / 2, wall + cd / 2], "glow");
  },

  // High-gloss lacquer wardrobe with gold profiles around a window opening.
  glossWardrobe(add, s) {
    const { w, h, z, open } = s, toe = 0.06, cols = 7, cw = (w - 0.04) / cols, front = z / 2;
    const split = toe + (h - toe) * 0.7, x = (i: number) => -w / 2 + 0.02 + cw * (i + 0.5);
    carcass(add, s, toe);
    const winY0 = toe + (h - toe) * 0.3, winX0 = x(5) - cw / 2;
    for (let c = 0; c < cols; c++) {
      const isWindow = c >= 5;
      const panels: [number, number][] = [[split, h - 0.01]];
      if (isWindow) panels.push([toe, winY0]);
      else if (c === 2) panels.push([toe, toe + (h - toe) * 0.3], [toe + (h - toe) * 0.42, split]);
      else panels.push([toe, split]);
      for (const [i, [y0, y1]] of panels.entries()) {
        if (!open) add("door " + c + " " + i, [cw - 0.008, y1 - y0 - 0.008, 0.018], [x(c), (y0 + y1) / 2, front - 0.009], "finish");
        add("pull " + c + " " + i, [0.012, Math.min(0.3, (y1 - y0) * 0.4), 0.025], [x(c) + (c % 2 ? -1 : 1) * (cw / 2 - 0.04), y0 + Math.min(0.55, (y1 - y0) / 2), front + 0.014], "hardware");
      }
      if (c === 2) for (let d = 0; d < 2; d++) {
        const y = toe + (h - toe) * (0.33 + d * 0.06);
        add("drawer " + d, [cw - 0.008, (h - toe) * 0.055, 0.018], [x(c), y, front - 0.009], "finish");
        add("drawer pull " + d, [cw * 0.5, 0.012, 0.02], [x(c), y, front + 0.01], "hardware");
      }
      if (open) for (let i = 1; i < 4; i++) add("shelf " + c + " " + i, [cw - 0.02, 0.018, z - 0.05], [x(c), toe + (i * (split - toe)) / 4, 0], "interior");
    }
    add("window reveal", [cw * 2 - 0.02, split - winY0, 0.01], [winX0 + cw, (winY0 + split) / 2, -z / 2 + 0.02], "interior");
    for (let i = 1; i < 4; i++) add("window grille " + i, [0.02, split - winY0, 0.02], [winX0 + (i * cw * 2) / 4, (winY0 + split) / 2, -z / 2 + 0.04], "hardware");
    for (const y of [winY0, split]) add("window sill " + y.toFixed(2), [cw * 2, 0.025, z], [winX0 + cw, y, 0], "interior");
    for (let c = 0; c <= cols; c++) add("profile v " + c, [0.008, h - toe, 0.006], [-w / 2 + 0.02 + c * cw, (h + toe) / 2, front + 0.003], "trim");
    add("profile h", [w - 0.04, 0.008, 0.006], [0, split, front + 0.003], "trim");
    add("profile base", [w - 0.04, 0.008, 0.006], [0, toe, front + 0.003], "trim");
  },
};
