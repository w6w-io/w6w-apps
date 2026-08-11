import { assert, assertEquals } from "@std/assert";
import runGet from "../../actions/run-get.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("run-get: calls GET /v2/actor-runs/{id} and unwraps data", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "r1", status: "SUCCEEDED", defaultDatasetId: "d1" }) },
  ]);
  const out = await runGet.execute({ runId: "r1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/v2/actor-runs/r1");
  assertEquals(queryOf(calls[0].url), {});
  assertEquals(out.status, "SUCCEEDED");
});

Deno.test("run-get: waitForFinish is sent and capped at Apify's 60-second ceiling", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "r1", status: "RUNNING" }) }]);
  await runGet.execute({ runId: "r1", waitForFinish: 30 }, ctx);
  assertEquals(queryOf(calls[0].url).waitForFinish, "30");
  assertEquals(runGet.params?.find((p) => p.key === "waitForFinish")?.validation?.max, 60);
});

/**
 * The vendor warns that costs read straight after completion are preliminary.
 * The output declaration is where a workflow author sees that, so it is pinned.
 */
Deno.test("run-get: the output warns that the cost figure is preliminary", () => {
  const field = (runGet.output as Array<{ key: string; label: string }>)
    .find((o) => o.key === "usageTotalUsd");
  assert(/preliminary/i.test(field?.label ?? ""), field?.label);
});
