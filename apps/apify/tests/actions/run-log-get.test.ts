import { assert, assertEquals } from "@std/assert";
import runLogGet from "../../actions/run-log-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const LOG = "2026-08-11T06:00:49.733Z Application started.\n" +
  "2026-08-11T06:00:49.741Z Input: { test: 123 }\n";

/**
 * The endpoint answers `text/plain`, not JSON. Parsing it as JSON is the obvious
 * mistake and fails on the first line, so this asserts the body comes back as
 * text.
 */
Deno.test("run-log-get: reads a text/plain body without parsing it", async () => {
  const { ctx, calls } = mockCtx([
    { body: LOG, headers: { "content-type": "text/plain; charset=utf-8" } },
  ]);
  const out = await runLogGet.execute({ runId: "r1" }, ctx) as {
    log: string;
    length: number;
    truncated: boolean;
  };

  assertEquals(pathOf(calls[0].url), "/v2/actor-runs/r1/log");
  assertEquals(calls[0].headers.accept, "text/plain");
  assertEquals(out.log, LOG);
  assertEquals(out.length, LOG.length);
  assertEquals(out.truncated, false);
});

Deno.test("run-log-get: a log longer than the cap is truncated and says so", async () => {
  const big = "x".repeat(5000);
  const { ctx } = mockCtx([{ body: big, headers: { "content-type": "text/plain" } }]);
  const out = await runLogGet.execute({ runId: "r1", maxBytes: 1000 }, ctx) as {
    log: string;
    length: number;
    truncated: boolean;
  };

  assertEquals(out.truncated, true);
  assertEquals(out.length, 5000);
  assert(out.log.length < 5000);
  assert(out.log.includes("truncated"), out.log.slice(-60));
});

Deno.test("run-log-get: ANSI stripping is left on unless raw is requested", async () => {
  const { ctx, calls } = mockCtx([
    { body: "", headers: { "content-type": "text/plain" } },
    { body: "", headers: { "content-type": "text/plain" } },
  ]);
  await runLogGet.execute({ runId: "r1" }, ctx);
  assert(!("raw" in queryOf(calls[0].url)));

  await runLogGet.execute({ runId: "r1", raw: true }, ctx);
  assertEquals(queryOf(calls[1].url).raw, "1");
});

/**
 * `stream` holds the connection open for the life of the run. An Action returns
 * one value, so exposing it would only produce a request that hangs.
 */
Deno.test("run-log-get: does not expose the streaming parameter", () => {
  assertEquals(runLogGet.params?.some((p) => p.key === "stream"), false);
});
