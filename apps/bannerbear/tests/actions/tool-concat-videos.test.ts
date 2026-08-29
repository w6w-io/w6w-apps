import { assertEquals } from "@std/assert";
import toolConcatVideos from "../../actions/tool-concat-videos.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-concat-videos: POST /tools/concat_videos, preserves play order", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "concat_videos" } }]);
  await toolConcatVideos.execute(
    { videoUrls: "https://x/1.mp4, https://x/2.mp4", transition: "fade" },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/concat_videos");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.video_urls, ["https://x/1.mp4", "https://x/2.mp4"]);
  assertEquals(body.transition, "fade");
});

Deno.test("tool-concat-videos: requires at least 2 URLs", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() => toolConcatVideos.execute({ videoUrls: "https://x/1.mp4" }, ctx));
});
