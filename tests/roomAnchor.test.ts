import assert from "node:assert/strict";
import test from "node:test";
import {lockRoomAnchor} from "../src/roomAnchor.ts";
test("the placement keeps its first world pose across replacement planes",()=>{
  const pose = {position:[2,-1,3],rotation:[0,25,0],center:[0.2,0,0.1]};
  const first = lockRoomAnchor(null,pose);
  assert.ok(first);
  pose.position[0]=7;
  assert.equal(first.position[0],2);
  assert.equal(lockRoomAnchor(first,pose),first);
  assert.equal(lockRoomAnchor(null,{position:[0,NaN,0]}),null);
});
