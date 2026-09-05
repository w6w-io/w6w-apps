import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-asset.ts";

Deno.test("update-asset: PATCHes /rest/v1/assets/{id} with name and tags", async () => {
  const { ctx, calls } = mockCtx([{ body: { asset: { id: "A1", name: "New name" } } }]);
  const result = await action.execute({ assetId: "A1", name: "New name", tags: ["a", "b"] }, ctx);
  assertEquals(calls[0].method, "PATCH");
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/assets/A1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New name", tags: ["a", "b"] });
  assertEquals(result, { id: "A1", name: "New name" });
});
