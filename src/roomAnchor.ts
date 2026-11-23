import type { Triple } from "./model";

// Plane origins and centres can change as ARCore merges detected surfaces.
// Retain the first floor pose in session coordinates until the user re-places.
export interface RoomAnchor { position: Triple; rotation: Triple; center: Triple }
function vector(value: unknown): value is Triple {
  return Array.isArray(value) && value.length === 3 && value.every(Number.isFinite);
}
export function lockRoomAnchor(current: RoomAnchor | null, plane: { position?: unknown; rotation?: unknown; center?: unknown }): RoomAnchor | null {
  if (current || !vector(plane.position) || !vector(plane.rotation)) return current;
  return { position: [...plane.position], rotation: [...plane.rotation], center: vector(plane.center) ? [...plane.center] : [0,0,0] };
}
