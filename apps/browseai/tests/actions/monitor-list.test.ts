import { assertEquals } from "@std/assert";
import monitorList from "../../actions/monitor-list.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("monitor-list: GETs /robots/{robotId}/monitors and unwraps monitors", async () => {
  const monitors = { totalCount: 1, items: [{ id: "m1", name: "Watch" }] };
  const { ctx, calls } = mockCtx([{ status: 200, body: envelope("monitors", monitors) }]);
  const out = await monitorList.execute({ robotId: "r1" }, ctx) as typeof monitors;

  assertEquals(pathOf(calls[0].url), "/v2/robots/r1/monitors");
  assertEquals(out.items[0].id, "m1");
});
