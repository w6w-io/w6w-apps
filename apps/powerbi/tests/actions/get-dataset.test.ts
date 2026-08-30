import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-dataset.ts";

Deno.test("get-dataset: GETs [/groups/{id}]/datasets/{datasetId}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "d1", isRefreshable: true } }]);
  const out = await action.execute({ datasetId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/datasets/d1");
  assertEquals(out.isRefreshable, true);
});

Deno.test("get-dataset: a Workspace ID scopes the call", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute({ groupId: "w1", datasetId: "d1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/myorg/groups/w1/datasets/d1");
});
