import assert from "node:assert/strict";
import test from "node:test";
import { footprintOutline, normalizeYaw, pickFloorHit, poseChanged, trackingHint, yawToward } from "../src/arPlacement.ts";

test("floor hits prefer measured planes and ignore surfaces near phone height", () => {
  const hits = [
    { type: "FeaturePoint", transform: { position: [0, -1.4, -1] } },
    { type: "EstimatedHorizontalPlane", transform: { position: [0.1, -1.4, -1] } },
    { type: "ExistingPlaneUsingExtent", transform: { position: [0.2, -0.1, -1] } },
    { type: "ExistingPlane", transform: { position: [0.3, -1.4, -1] } },
    { type: "ExistingPlaneUsingExtent", transform: { position: [0.4, NaN, -1] } },
  ];
  assert.deepEqual(pickFloorHit(hits, 0)?.position, [0.3, -1.4, -1]);
  assert.equal(pickFloorHit([{ type: "FeaturePoint", transform: { position: [0, -1, 0] } }], 0), null);
  assert.equal(pickFloorHit(undefined, 0), null);
});

test("placement turns the front of the furniture toward the viewer", () => {
  assert.equal(yawToward([0, 0, 0], [0, 1.5, 2]), 0);
  assert.equal(Math.round(yawToward([0, 0, 0], [2, 1.5, 0])), 90);
  assert.equal(Math.abs(Math.round(yawToward([0, 0, 0], [0, 1.5, -2]))), 180);
  assert.equal(normalizeYaw(370), 10);
  assert.equal(normalizeYaw(-190), 170);
});

test("small tracking jitter does not trigger a re-render", () => {
  const a = { position: [0, -1, -1] as [number, number, number], yaw: 10 };
  assert.equal(poseChanged(a, { position: [0.005, -1, -1], yaw: 11 }), false);
  assert.equal(poseChanged(a, { position: [0.05, -1, -1], yaw: 10 }), true);
  assert.equal(poseChanged(a, { position: [0, -1, -1], yaw: 20 }), true);
  assert.equal(poseChanged(null, a), true);
});

test("the footprint outline matches the design width and depth", () => {
  const edges = footprintOutline({ width: 1800, depth: 600 });
  const xs = edges.flatMap((e) => [e.center[0] - e.size[0] / 2, e.center[0] + e.size[0] / 2]);
  const zs = edges.flatMap((e) => [e.center[2] - e.size[2] / 2, e.center[2] + e.size[2] / 2]);
  assert.ok(Math.abs(Math.min(...xs) + 0.9) < 1e-9 && Math.abs(Math.max(...xs) - 0.9) < 1e-9);
  assert.ok(Math.abs(Math.min(...zs) + 0.3) < 1e-9 && Math.abs(Math.max(...zs) - 0.3) < 1e-9);
});

test("tracking guidance explains why tracking is limited", () => {
  assert.match(trackingHint(false, 2, false, false), /too fast/);
  assert.match(trackingHint(false, 3, false, false), /light/);
  assert.match(trackingHint(true, 1, true, false), /Place/);
  assert.match(trackingHint(true, 1, false, true), /Drag/);
});
