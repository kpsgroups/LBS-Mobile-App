import assert from "node:assert/strict";
import test from "node:test";
import { checkRoomTracking } from "../src/arSupport.ts";

test("a transient first answer is retried until AR is ready", async () => {
  let n = 0;
  const result = await checkRoomTracking(
    async () => {
      if (++n === 1) throw Error("TRANSIENT");
      return { isARSupported: true };
    },
    () => false,
    async () => {},
  );
  assert.deepEqual(result, { status: "ready", detail: "SUPPORTED" });
  assert.equal(n, 2);
});

test("only a definite unsupported answer blocks AR", async () => {
  let count = 0;
  const unsupported = await checkRoomTracking(async () => { count++; throw Error("UNSUPPORTED"); }, () => false, async () => {});
  assert.equal(unsupported.status, "unsupported");
  assert.equal(count, 1);
});

test("unknown or unexpected answers still let AR open, with the reason kept", async () => {
  let count = 0;
  const unknown = await checkRoomTracking(async () => { count++; throw Error("UNKNOWN"); }, () => false, async () => {});
  assert.deepEqual(unknown, { status: "uncertain", detail: "UNKNOWN" });
  assert.equal(count, 8);
  const odd = await checkRoomTracking(async () => { throw "AR Support Unknown."; }, () => false, async () => {});
  assert.deepEqual(odd, { status: "uncertain", detail: "AR Support Unknown." });
});
