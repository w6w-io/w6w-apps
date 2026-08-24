import { assertEquals } from "@std/assert";
import monitorUpdate from "../../actions/monitor-update.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("monitor-update: PATCHes only the fields that were set", async () => {
  const monitor = { id: "m1", name: "Watch", status: "paused" };
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("monitor", monitor) }]);
  const out = await monitorUpdate.execute(
    { robotId: "r1", monitorId: "m1", status: "paused" },
    ctx,
  ) as typeof monitor;

  assertEquals(calls[0].method, "PATCH");
  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/monitors/m1");
  assertEquals(JSON.parse(calls[0].body!), { status: "paused" });
  assertEquals(out.status, "paused");
});

Deno.test("monitor-update: an inputParameters override is parsed and included", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("monitor", { id: "m1" }) }]);
  await monitorUpdate.execute(
    { robotId: "r1", monitorId: "m1", inputParameters: { limit: 5 } },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { inputParameters: { limit: 5 } });
});

Deno.test("monitor-update: is declared idempotent — the same body always lands on the same state", () => {
  assertEquals(monitorUpdate.idempotent, true);
});
