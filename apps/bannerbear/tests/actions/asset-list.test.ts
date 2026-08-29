import { assertEquals } from "@std/assert";
import assetList from "../../actions/asset-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-list: GET /assets", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ uid: "a1", url: "https://cdn/a1.png" }] }]);
  const out = await assetList.execute({}, ctx) as unknown[];

  assertEquals(pathOf(calls[0].url), "/assets");
  assertEquals(out, [{ uid: "a1", url: "https://cdn/a1.png" }]);
});
