import { assertEquals } from "@std/assert";
import assetGet from "../../actions/asset-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-get: fetches by id and returns the asset unwrapped", async () => {
  const { ctx, calls } = mockCtx([
    { body: envelope({ id: "asset_1", name: "hello.png", type: "image", owner: "acme" }) },
  ]);
  const out = await assetGet.execute({ assetId: "asset_1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v3/assets/asset_1");
  assertEquals(out, { id: "asset_1", name: "hello.png", type: "image", owner: "acme" });
});
