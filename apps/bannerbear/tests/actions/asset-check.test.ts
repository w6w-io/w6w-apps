import { assertEquals } from "@std/assert";
import assetCheck from "../../actions/asset-check.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("asset-check: POST /assets/check with the hash list", async () => {
  const { ctx, calls } = mockCtx([{ body: { abc123: null, def456: { uid: "a1" } } }]);
  const out = await assetCheck.execute({ contentHashes: "abc123, def456" }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/assets/check");
  assertEquals(JSON.parse(calls[0].body!), { content_hashes: ["abc123", "def456"] });
  assertEquals(out.abc123, null);
});

Deno.test("asset-check: requires at least one hash", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => assetCheck.execute({ contentHashes: "" }, ctx));
});

Deno.test("asset-check: rejects more than 100 hashes", async () => {
  const { ctx } = mockCtx([]);
  const hashes = Array.from({ length: 101 }, (_, i) => `h${i}`).join(",");
  await assertRejects(() => assetCheck.execute({ contentHashes: hashes }, ctx));
});
