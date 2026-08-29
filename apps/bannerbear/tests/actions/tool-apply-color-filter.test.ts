import { assertEquals } from "@std/assert";
import toolApplyColorFilter from "../../actions/tool-apply-color-filter.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-apply-color-filter: POST /tools/apply_color_filter, defaults filter to vintage", async () => {
  const { ctx, calls } = mockCtx([{
    status: 202,
    body: { uid: "j1", tool: "apply_color_filter" },
  }]);
  await toolApplyColorFilter.execute({ videoUrl: "https://x/in.mp4" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tools/apply_color_filter");
  assertEquals(JSON.parse(calls[0].body!), { video_url: "https://x/in.mp4", filter: "vintage" });
});

Deno.test("tool-apply-color-filter: requires videoUrl", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolApplyColorFilter.execute({ videoUrl: "" }, ctx));
});
