import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-refresh-history.ts";

Deno.test("list-refresh-history: GETs /datasets/{id}/refreshes", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ status: "Completed" }] } }]);
  const out = await action.execute({ datasetId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/datasets/d1/refreshes");
  assertEquals(out.value, [{ status: "Completed" }]);
});

Deno.test("list-refresh-history: Max entries rides as $top", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ datasetId: "d1", top: 5 }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("$top"), "5");
});

Deno.test("list-refresh-history: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ groupId: "w1", datasetId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/datasets/d1/refreshes");
});
