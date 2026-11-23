import assert from "node:assert/strict";
import test from "node:test";
import { checkRoomTracking } from "../src/arSupport.ts";

test("waits for a temporary ARCore availability check", async () => {
  let n = 0;
  const result = await checkRoomTracking(
    async () => {
      if (++n === 1) throw Error("TRANSIENT");
      return { isARSupported: true };
    },
    () => false,
    async () => {},
  );
  assert.equal(result, "ready");
  assert.equal(n, 2);
});
test("unsupported phones get an immediate alternative and unknown checks end", async () => {
  for (const reason of ["UNSUPPORTED", "UNKNOWN"]) {
    let count = 0;
    const result = await checkRoomTracking(
      async () => {
        count++;
        throw Error(reason);
      },
      () => false,
      async () => {},
    );
    assert.equal(
      result,
      reason === "UNSUPPORTED" ? "unsupported" : "unavailable",
    );
    assert.equal(count, reason === "UNSUPPORTED" ? 1 : 12);
  }
});
