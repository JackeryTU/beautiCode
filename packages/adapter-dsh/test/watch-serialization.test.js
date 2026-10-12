import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { DshSession } from "../dist/index.js";

test("watch ticks never open active state while a user transaction owns it", async () => {
  const session = new DshSession({ dataRoot: path.join(os.tmpdir(), "unused-dsh-watch-test"), bundledGallery: false });
  let statusReads = 0, manifestReads = 0;
  // Hold the domain transaction's busy state deterministically, without relying on filesystem timing.
  session.host = { status: async () => {
    statusReads++;
    return { connectedClients: 0, current: { generation: 0, media: "clear" } };
  } };
  session.store.readActiveManifest = async () => { manifestReads++; return { generation: 0, background: null }; };
  session.userBusy = true;
  await session.watchOnce();
  assert.equal(statusReads, 0);
  assert.equal(manifestReads, 0);
  session.userBusy = false;
  await session.watchOnce();
  assert.equal(statusReads, 1);
  assert.equal(manifestReads, 1);
});
