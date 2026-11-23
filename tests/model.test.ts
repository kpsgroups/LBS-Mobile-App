import assert from "node:assert/strict";
import test from "node:test";
import { initialDesign, limits, wardrobe } from "../src/model.ts";

test("all parts fit the physical envelope, including door pulls and the base", () => {
  for (const width of limits.width.slice(0, 2)) {
    for (const height of limits.height.slice(0, 2)) {
      for (const depth of limits.depth.slice(0, 2)) {
        for (const bays of [2, 3, 4]) {
          const parts = wardrobe({
            ...initialDesign,
            width,
            height,
            depth,
            bays,
          });
          const epsilon = 1e-9;
          const low = [-width / 2000, 0, -depth / 2000],
            high = [width / 2000, height / 1000, depth / 2000];
          for (let axis = 0; axis < 3; axis++) {
            const left = Math.min(
              ...parts.map((p) => p.center[axis] - p.size[axis] / 2),
            );
            const right = Math.max(
              ...parts.map((p) => p.center[axis] + p.size[axis] / 2),
            );
            assert.ok(
              Math.abs(left - low[axis]) < epsilon &&
                Math.abs(right - high[axis]) < epsilon,
            );
          }
          assert.equal(
            parts.filter((p) => p.id.startsWith("door ")).length,
            bays,
          );
          assert.equal(new Set(parts.map((p) => p.id)).size, parts.length);
        }
      }
    }
  }
});
test("interior view exposes the specified storage layout", () => {
  for (const layout of ["Mixed", "Shelves", "Hanging"] as const) {
    const design = { ...initialDesign, layout };
    const parts = wardrobe(design, true);
    assert.deepEqual(
      parts,
      wardrobe(design).filter(
        (p) => !p.id.startsWith("door ") && !p.id.startsWith("pull "),
      ),
    );
    const rails =
      layout === "Mixed" ? 1 : layout === "Hanging" ? design.bays : 0;
    assert.equal(parts.filter((p) => p.id.startsWith("rail ")).length, rails);
    assert.equal(
      parts.filter((p) => p.id.startsWith("shelf ")).length,
      rails + (design.bays - rails) * 4,
    );
  }
});
