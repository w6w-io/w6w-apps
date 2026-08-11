import { assert, assertEquals } from "@std/assert";
import runAbort from "../../actions/run-abort.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("run-abort: POSTs to /v2/actor-runs/{id}/abort", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1", status: "ABORTED" }) }]);
  const out = await runAbort.execute({ runId: "r1" }, ctx) as { status: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/actor-runs/r1/abort");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.status, "ABORTED");
});

Deno.test("run-abort: gracefully is sent only when set", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "r1" }) },
    { body: envelope({ id: "r1" }) },
  ]);
  await runAbort.execute({ runId: "r1", gracefully: false }, ctx);
  assert(!("gracefully" in queryOf(calls[0].url)));

  await runAbort.execute({ runId: "r1", gracefully: true }, ctx);
  assertEquals(queryOf(calls[1].url).gracefully, "1");
});

/** Apify: aborting an already-finished run "does nothing" — safe to retry. */
Deno.test("run-abort: is declared idempotent", () => {
  assertEquals(runAbort.idempotent, true);
});
