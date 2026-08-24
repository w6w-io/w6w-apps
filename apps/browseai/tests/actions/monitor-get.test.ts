import { assertEquals } from "@std/assert";
import monitorGet from "../../actions/monitor-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("monitor-get: GETs /robots/{robotId}/monitors/{monitorId} and unwraps monitor", async () => {
  const monitor = { id: "m1", name: "Watch", status: "paused", pausedReason: "lowCredits" };
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("monitor", monitor) }]);
  const out = await monitorGet.execute({ robotId: "r1", monitorId: "m1" }, ctx) as typeof monitor;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/monitors/m1");
  assertEquals(out.pausedReason, "lowCredits");
});
