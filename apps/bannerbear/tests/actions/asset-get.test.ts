import { assertEquals } from "@std/assert";
import assetGet from "../../actions/asset-get.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-get: GET /assets/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { uid: "a1", url: "https://cdn/a1.png", size: 123 } }]);
  const out = await assetGet.execute({ uid: "a1" }, ctx) as unknown as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/assets/a1");
  assertEquals(out.size, 123);
});

Deno.test("asset-get: requires uid", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => assetGet.execute({ uid: "" }, ctx));
});
