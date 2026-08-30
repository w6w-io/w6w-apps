import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-dashboard-tiles.ts";

Deno.test("list-dashboard-tiles: GETs /dashboards/{id}/tiles", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "t1" }] } }]);
  const out = await action.execute({ dashboardId: "db1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/dashboards/db1/tiles");
  assertEquals(out.value, [{ id: "t1" }]);
});

Deno.test("list-dashboard-tiles: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "w1", dashboardId: "db1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/dashboards/db1/tiles");
});
