import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-asset.ts";

Deno.test("get-asset: GETs /rest/v1/assets/{id} and unwraps the asset envelope", async () => {
  const { ctx, calls } = mockCtx([{ body: { asset: { id: "A1", type: "image" } } }]);
  const result = await action.execute({ assetId: "A1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/rest/v1/assets/A1");
  assertEquals(result, { id: "A1", type: "image" });
});
