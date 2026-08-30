import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-dashboards.ts";

Deno.test("list-dashboards: no Workspace ID means My workspace", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "db1" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/dashboards");
  assertEquals(out.value, [{ id: "db1" }]);
});

Deno.test("list-dashboards: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "w1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/dashboards");
});
