import { assertEquals } from "@std/assert";
import toolOverlayVideo from "../../actions/tool-overlay-video.ts";
import { assertRejects, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("tool-overlay-video: POST /tools/overlay_video", async () => {
  const { ctx, calls } = mockCtx([{ status: 202, body: { uid: "j1", tool: "overlay_video" } }]);
  await toolOverlayVideo.execute(
    {
      baseVideoUrl: "https://x/base.mp4",
      overlayVideoUrl: "https://x/pip.mp4",
      position: "top_right",
    },
    ctx,
  );

  assertEquals(pathOf(calls[0].url), "/tools/overlay_video");
  assertEquals(JSON.parse(calls[0].body!), {
    base_video_url: "https://x/base.mp4",
    overlay_video_url: "https://x/pip.mp4",
    position: "top_right",
  });
});

Deno.test("tool-overlay-video: requires both video URLs", async () => {
  const { ctx } = mockCtx([]);
  await assertRejects(() =>
    toolOverlayVideo.execute({ baseVideoUrl: "https://x/base.mp4", overlayVideoUrl: "" }, ctx)
  );
});
