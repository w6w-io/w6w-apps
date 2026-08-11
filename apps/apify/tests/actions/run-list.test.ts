import { assertEquals } from "@std/assert";
import runList from "../../actions/run-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("run-list: calls GET /v2/actor-runs and unwraps the page", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "r1" }]) }]);
  const out = await runList.execute({ limit: 100 }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/actor-runs");
  assertEquals(out.items, [{ id: "r1" }]);
});

/**
 * The status filter is one comma-separated value, not a repeated key — and the
 * hyphenated spellings (`TIMED-OUT`, not `TIMED_OUT`) must pass through
 * untouched, because the underscored form filters to nothing rather than
 * erroring.
 */
Deno.test("run-list: statuses are comma-joined with their hyphens intact", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await runList.execute({ status: ["FAILED", "TIMED-OUT"] }, ctx);
  assertEquals(queryOf(calls[0].url).status, "FAILED,TIMED-OUT");
});

Deno.test("run-list: a single status arriving as a bare string still works", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await runList.execute({ status: "RUNNING" }, ctx);
  assertEquals(queryOf(calls[0].url).status, "RUNNING");
});

Deno.test("run-list: date filters are passed through as given", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }]);
  await runList.execute(
    { startedAfter: "2026-08-01T00:00:00.000Z", startedBefore: "2026-08-11T00:00:00.000Z" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    startedAfter: "2026-08-01T00:00:00.000Z",
    startedBefore: "2026-08-11T00:00:00.000Z",
  });
});
