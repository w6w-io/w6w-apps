import { assertEquals } from "@std/assert";
import toolRemoveBg from "../../actions/tool-remove-bg.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-remove-bg: POST /tools/remove_bg", async () => {
  const { ctx, calls } = mockCtx([
    { status: 202, body: { uid: "j1", tool: "remove_bg", status: "pending" } },
  ]);
  const out = await toolRemoveBg.execute(
    { imageUrl: "https://x/in.png" },
    ctx,
  ) as unknown as Record<
    string,
    unknown
  >;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/tools/remove_bg");
  assertEquals(JSON.parse(calls[0].body!), { image_url: "https://x/in.png" });
  assertEquals(out.tool, "remove_bg");
});

Deno.test("tool-remove-bg: requires imageUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolRemoveBg.execute({ imageUrl: "" }, ctx));
});
