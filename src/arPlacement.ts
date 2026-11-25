import type { Design, Triple } from "./model";

// Hit-test result types reported by ARKit / ARCore through ViroReact, best first.
// Feature points are skipped: they land on walls and clutter as often as the floor.
const floorTypes = ["ExistingPlaneUsingExtent", "ExistingPlane", "EstimatedHorizontalPlane"];

export interface FloorHit { position: Triple; quality: number }

function vector(value: unknown): value is Triple {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}

// Pick the most reliable floor point under the screen centre. A floor must be
// at least 30 cm below the phone so table tops and shelves are not chosen.
export function pickFloorHit(results: unknown, cameraY: number): FloorHit | null {
  if (!Array.isArray(results)) return null;
  let best: FloorHit | null = null;
  for (const result of results as { type?: unknown; transform?: { position?: unknown } }[]) {
    const quality = floorTypes.indexOf(String(result?.type));
    const position = result?.transform?.position;
    if (quality < 0 || !vector(position)) continue;
    if (Number.isFinite(cameraY) && position[1] > cameraY - 0.3) continue;
    if (!best || quality < best.quality) best = { position: [...position], quality };
  }
  return best;
}

// Yaw in degrees that turns the model's front (+Z) toward the viewer.
export function yawToward(target: Triple, viewer: Triple) {
  const dx = viewer[0] - target[0], dz = viewer[2] - target[2];
  if (!Number.isFinite(dx) || !Number.isFinite(dz) || Math.hypot(dx, dz) < 1e-6) return 0;
  return normalizeYaw((Math.atan2(dx, dz) * 180) / Math.PI);
}

export function normalizeYaw(degrees: number) {
  const value = ((degrees % 360) + 540) % 360 - 180;
  return Object.is(value, -0) ? 0 : value;
}

// Skip React updates for sub-centimetre jitter so the reticle stays smooth
// and the AR scene is not re-rendered on every camera frame.
export function poseChanged(a: { position: Triple; yaw: number } | null, b: { position: Triple; yaw: number }, metres = 0.015, degrees = 3) {
  if (!a) return true;
  const d = Math.hypot(a.position[0] - b.position[0], a.position[1] - b.position[1], a.position[2] - b.position[2]);
  return d > metres || Math.abs(normalizeYaw(a.yaw - b.yaw)) > degrees;
}

// Thin floor-level frame matching the real footprint, so the customer sees
// whether the furniture fits before it is placed.
export function footprintOutline(design: Pick<Design, "width" | "depth">, line = 0.014) {
  const w = design.width / 1000, d = design.depth / 1000, y = 0.003;
  const edges: { size: Triple; center: Triple }[] = [
    { size: [w, 0.004, line], center: [0, y, d / 2 - line / 2] },
    { size: [w, 0.004, line], center: [0, y, -d / 2 + line / 2] },
    { size: [line, 0.004, d - 2 * line], center: [w / 2 - line / 2, y, 0] },
    { size: [line, 0.004, d - 2 * line], center: [-w / 2 + line / 2, y, 0] },
  ];
  return edges;
}

export function formatSize(design: Pick<Design, "width" | "height" | "depth">) {
  return `${design.width} × ${design.height} × ${design.depth} mm`;
}

// ViroReact tracking reasons: 2 = excessive motion, 3 = insufficient features.
export function trackingHint(normal: boolean, reason: number, found: boolean, placed: boolean) {
  if (!normal) {
    if (reason === 2) return "Moving too fast. Slow down and hold the phone steady.";
    if (reason === 3) return "Not enough detail. Turn on more light or aim at a textured floor.";
    return "Move the phone slowly from side to side to start tracking.";
  }
  if (placed) return "Drag to move · two fingers to turn · walk around to see every side.";
  if (found) return "The outline shows the real footprint. Tap Place when it fits.";
  return "Point at the floor where the furniture should stand.";
}
