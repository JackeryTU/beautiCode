import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { pathToFileURL } from "node:url";
import { stageDshPlugin } from "../../../scripts/pack-dsh-plugin.mjs";
import { stageDesktopAggregate } from "../../../scripts/pack-desktop-aggregate.mjs";

// Exercise the exported Cordis entry and its HTTP endpoint, including the
// native Desktop header fence. A source-text match alone misses stale packs.
async function serve(directory, tokenFile) {
  const { apply } = await import(pathToFileURL(path.join(directory, "index.mjs")));
  const routes = new Map(), contributions = [], effects = [];
  apply({
    webServer: { register(route) { routes.set(route.path, route.handler); return () => routes.delete(route.path); } },
    on(event, contribute) { assert.equal(event, "webserver/index-inject"); contributions.push(contribute); return () => {}; },
    effect(factory) { effects.push(factory()); },
  }, { tokenFile });
  const table = [];
  contributions.forEach(contribute => contribute(table));
  const server = http.createServer(async (req, res) => {
    try { await routes.get(new URL(req.url, "http://localhost").pathname)(req, res); }
    catch (error) { res.writeHead(error.statusCode || 500).end(); }
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  return {
    table, origin: `http://127.0.0.1:${server.address().port}`,
    async close() {
      for (const effect of effects.reverse()) await effect?.();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

test("Web, native Desktop and both packed runtimes serve the same current readability script", async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "beauticode-plugin-reading-"));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const standalone = path.join(root, "standalone"), aggregate = path.join(root, "aggregate");
  await stageDshPlugin(standalone, { build: false, publishName: "beauticode-dsh" });
  await stageDesktopAggregate(aggregate, { build: false });
  const source = path.resolve(import.meta.dirname, "..");
  const readable = await fs.readFile(path.join(source, "readability.js"), "utf8");
  const client = await fs.readFile(path.join(source, "client.js"), "utf8");
  const tokenFile = path.join(root, "token");
  await fs.writeFile(tokenFile, "c".repeat(64));
  for (const directory of [source, standalone, path.join(aggregate, "runtime", "dsh")]) {
    assert.equal(await fs.readFile(path.join(directory, "readability.js"), "utf8"), readable);
    const host = await serve(directory, tokenFile);
    try {
      const endpoint = host.table.find(row => row.kind === "script-src" && row.src.endsWith("/client.js")).src;
      const key = host.table.find(row => row.name === "__BEAUTICODE_DESKTOP_KEY__").value;
      // Static scripts are public; only the control/status routes are fenced.
      assert.equal((await fetch(host.origin + "/__beauticode/ui/status")).status, 403);
      for (const headers of [{ "Sec-Fetch-Site": "same-origin" }, { "X-Beauticode-Desktop-Key": key }]) {
        const response = await fetch(host.origin + endpoint, { headers });
        assert.equal(response.status, 200);
        assert.equal(await response.text(), `${readable}\n${client}`);
        assert.equal((await fetch(host.origin + "/__beauticode/ui/status", { headers })).status, 200);
      }
    } finally { await host.close(); }
  }
});
