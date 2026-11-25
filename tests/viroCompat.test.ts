import assert from "node:assert/strict";
import test from "node:test";
import { withDefaultExport } from "../src/viroCompat.ts";

// Mirrors the CommonJS interop helper in ViroReact's compiled ViroMaterials.js.
const importDefault = (mod: any) => (mod && mod.__esModule ? mod : { default: mod });

test("a named-export-only asset registry works through ViroReact's default import", () => {
  const registry: any = {};
  Object.defineProperty(registry, "__esModule", { value: true });
  Object.defineProperty(registry, "getAssetByID", { enumerable: true, get: () => (id: number) => ({ id, type: "jpg" }) });
  assert.equal(importDefault(registry).default, undefined);
  withDefaultExport(registry);
  assert.deepEqual(importDefault(registry).default.getAssetByID(7), { id: 7, type: "jpg" });
});

test("an existing default export is left alone", () => {
  const original = { getAssetByID: () => null };
  const registry = { default: original };
  assert.equal(withDefaultExport(registry).default, original);
});
