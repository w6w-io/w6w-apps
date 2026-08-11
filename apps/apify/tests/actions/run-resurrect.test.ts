import { assertEquals } from "@std/assert";
import runResurrect from "../../actions/run-resurrect.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("run-resurrect: POSTs to /v2/actor-runs/{id}/resurrect", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1", status: "RUNNING" }) }]);
  const out = await runResurrect.execute({ runId: "r1" }, ctx) as { status: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/actor-runs/r1/resurrect");
  assertEquals(out.status, "RUNNING");
});

Deno.test("run-resurrect: an explicit build overrides the run's original one", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1" }) }]);
  await runResurrect.execute({ runId: "r1", build: "latest" }, ctx);
  assertEquals(queryOf(calls[0].url), { build: "latest" });
});

/**
 * A resurrected run appends to the *same* storages, so a second resurrection is
 * not a no-op — it can add items a previous step already read.
 */
Deno.test("run-resurrect: is declared non-idempotent", () => {
  assertEquals(runResurrect.idempotent, false);
});
