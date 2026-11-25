import assert from "node:assert/strict";
import test from "node:test";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { builders } from "../src/designs.ts";
import { designLimits, furnitureParts, newDesign, products, sectionLabel, type Design, type FurnitureKind } from "../src/model.ts";

const root = path.resolve(import.meta.dirname, "..");
const featureKinds = Object.keys(builders) as FurnitureKind[];

function variants(base: Design) {
  const l = designLimits(base);
  const sizes = [
    { width: l.width[0], height: l.height[0], depth: l.depth[0] },
    { width: base.width, height: base.height, depth: base.depth },
    { width: l.width[1], height: l.height[1], depth: l.depth[1] },
  ];
  return sizes.flatMap((size) => [2, 3, 4].map((bays) => ({ ...base, ...size, bays })));
}

test("every new design has a catalog product with an image", () => {
  const images = readFileSync(path.join(root, "src/productImages.ts"), "utf8");
  for (const kind of featureKinds) assert.ok(products.some((p) => p.design.kind === kind), kind);
  for (const p of products) {
    assert.ok(images.includes(`"${p.key}": require("../assets/products/${p.key}.jpg")`), p.key + " image entry");
    assert.ok(existsSync(path.join(root, `assets/products/${p.key}.jpg`)), p.key + " image file");
  }
});

test("feature designs stay inside their dimensions at every size and section count", () => {
  for (const kind of featureKinds) for (const design of variants(newDesign(kind))) for (const open of [false, true]) {
    const parts = furnitureParts(design, open);
    const w = design.width / 1000, h = design.height / 1000, z = design.depth / 1000, slack = 0.035;
    assert.ok(parts.length > 0 && parts.length <= 400, `${kind}: ${parts.length} parts`);
    for (const p of parts) {
      const label = `${kind} ${design.width}x${design.height}x${design.depth} n${design.bays} ${p.id}`;
      assert.ok(p.size.every((v) => Number.isFinite(v) && v >= 0), label + " size");
      assert.ok(p.center.every(Number.isFinite), label + " centre");
      const lo = p.center.map((c, i) => c - p.size[i] / 2), hi = p.center.map((c, i) => c + p.size[i] / 2);
      assert.ok(lo[0] >= -w / 2 - slack && hi[0] <= w / 2 + slack, label + " width");
      assert.ok(lo[1] >= -0.001 && hi[1] <= h + slack, label + " height");
      assert.ok(lo[2] >= -z / 2 - slack && hi[2] <= z / 2 + slack, label + " depth");
      if (p.outline) {
        assert.ok(p.outline.length >= 3, label + " outline");
        for (const [x, y] of p.outline)
          assert.ok(Math.abs(x) <= p.size[0] / 2 + 1e-6 && Math.abs(y) <= p.size[1] / 2 + 1e-6, label + " outline point");
      }
    }
  }
});

test("part ids are unique so renderers can key them", () => {
  for (const kind of featureKinds) {
    const ids = furnitureParts(newDesign(kind)).map((p) => p.id);
    assert.equal(new Set(ids).size, ids.length, kind);
  }
});

test("wardrobes hide doors when opened and laminate slots get defaults", () => {
  for (const kind of ["arcWardrobe", "glossWardrobe"] as FurnitureKind[]) {
    const closed = furnitureParts(newDesign(kind)), open = furnitureParts(newDesign(kind), true);
    assert.ok(closed.some((p) => p.id.startsWith("door")) && !open.some((p) => p.id.startsWith("door")), kind);
  }
  for (const kind of featureKinds) {
    const d = newDesign(kind), used = new Set(furnitureParts(d).map((p) => p.surface));
    if (used.has("accent")) assert.notEqual(d.accent, undefined, kind + " accent");
    if (used.has("detail")) assert.notEqual(d.detail, undefined, kind + " detail");
  }
  assert.equal(sectionLabel(newDesign("flutedStone")), "Wood sections");
  assert.equal(sectionLabel(newDesign("archTv")), null);
  assert.equal(sectionLabel({ ...newDesign("wardrobe"), kind: undefined }), "Door count");
});
