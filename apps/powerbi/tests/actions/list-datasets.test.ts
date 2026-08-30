import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-datasets.ts";

Deno.test("list-datasets: no Workspace ID means My workspace", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "d1" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/datasets");
  assertEquals(out.value, [{ id: "d1" }]);
});

Deno.test("list-datasets: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "w1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/datasets");
});
